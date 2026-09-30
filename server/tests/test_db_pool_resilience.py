"""
Tests de resiliencia del pool de conexiones PostgreSQL.

Cubren el problema observado en producción: Neon/Render cierra conexiones
SSL idle y el pool de psycopg2 las reentrega sin validar, produciendo
"SSL connection has been closed unexpectedly" y "connection already closed".

Requieren PostgreSQL local accesible (misma DB de desarrollo); se saltan
automáticamente si no hay DB disponible.
"""

import os
import logging
import unittest
from unittest.mock import patch, MagicMock

from dotenv import load_dotenv
load_dotenv()

import psycopg2
import database
from repositories.base_repository import BaseRepository
from repositories.mercadopago_seller_repository import MercadoPagoSellerRepository


def _db_available() -> bool:
    try:
        if database.connection_pool is None:
            if not database.init_db_pool():
                return False
        conn = database.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        database.release_connection(conn)
        return True
    except Exception:
        return False


DB_AVAILABLE = _db_available()


class _DummyRepo(BaseRepository):
    """Repository mínimo para ejercitar execute_query directamente."""

    def __init__(self):
        super().__init__("mercadopago_sellers")


@unittest.skipUnless(DB_AVAILABLE, "PostgreSQL local no disponible")
class TestPoolResilience(unittest.TestCase):
    """Caso A y Caso B: manejo de conexiones válidas y muertas."""

    @classmethod
    def tearDownClass(cls):
        if database.connection_pool is not None:
            database.close_db_pool()

    # ------------------------- CASO A -------------------------

    def test_conexion_valida_lectura(self):
        """Caso A: conexión válida permite leer normalmente."""
        conn = database.get_connection()
        self.assertFalse(conn.closed)
        cur = conn.cursor()
        cur.execute("SELECT 1")
        self.assertEqual(cur.fetchone()[0], 1)
        cur.close()
        database.release_connection(conn)

    def test_repository_read_write(self):
        """Caso A: un repository puede leer y escribir normalmente."""
        repo = MercadoPagoSellerRepository()
        fake_mp_user_id = -880000001  # ID ficticio solo para este test
        try:
            creado = repo.upsert_por_mp_user_id(fake_mp_user_id, {
                "access_token_enc": "enc-test",
                "estado": "activa",
            })
            self.assertIsNotNone(creado)
            self.assertEqual(creado["mp_user_id"], fake_mp_user_id)

            encontrado = repo.find_by_mp_user_id(fake_mp_user_id)
            self.assertIsNotNone(encontrado)

            activo = repo.find_activo()
            self.assertIsNotNone(activo)
        finally:
            repo.execute_query(
                "DELETE FROM mercadopago_sellers WHERE mp_user_id = %s",
                (fake_mp_user_id,), fetch=False
            )

    # ------------------------- CASO B -------------------------

    def test_release_descarta_conexion_muerta(self):
        """Caso B: release_connection nunca reencola una conexión cerrada."""
        conn = database.get_connection()
        conn.close()  # simula conexión muerta por Neon/SSL
        database.release_connection(conn)

        conn2 = database.get_connection()
        cur = conn2.cursor()
        cur.execute("SELECT 1")
        self.assertEqual(cur.fetchone()[0], 1)
        cur.close()
        database.release_connection(conn2)

    def test_get_connection_no_devuelve_muerta(self):
        """Caso B: get_connection descarta conexiones muertas del pool."""
        conn = database.get_connection()
        conn.close()
        database.connection_pool.putconn(conn)  # reencola muerta a propósito

        conn2 = database.get_connection()
        self.assertFalse(conn2.closed)
        cur = conn2.cursor()
        cur.execute("SELECT 1")
        cur.close()
        database.release_connection(conn2)

    def test_execute_query_reintenta_con_conexion_muerta(self):
        """Caso B: execute_query detecta la conn muerta, la descarta y reintenta."""
        dead_conn = database.get_connection()  # conn válida del pool (keyed)
        dead_conn.close()                      # se cierra antes de usarse

        real_get = database.get_connection
        calls = [dead_conn]

        def fake_get_connection():
            if calls:
                return calls.pop()
            return real_get()

        repo = _DummyRepo()
        with patch(
            "repositories.base_repository.get_connection",
            side_effect=fake_get_connection
        ):
            with self.assertLogs(level=logging.WARNING) as logs:
                result = repo.execute_query("SELECT 1 AS n")

        self.assertEqual(result, [{"n": 1}])
        self.assertTrue(any("muerta" in m for m in logs.output))

    def test_execute_query_con_conn_externa_muerta_no_reintenta(self):
        """Caso B: con conn= externa (transacción del llamador) el error
        se propaga: no se intercambian conexiones dentro de una transacción
        ni se oculta el fallo."""
        repo = _DummyRepo()
        conn = database.get_connection()
        conn.close()
        try:
            with self.assertRaises(psycopg2.InterfaceError):
                repo.execute_query("SELECT 1", conn=conn)
        finally:
            database.discard_connection(conn)

    # --------- seguridad del retry en escrituras ---------

    def _conn_mock_execute_falla(self, error):
        """Mock de conexión cuyo cursor().execute() lanza `error`."""
        conn = MagicMock()
        cursor = MagicMock()
        cursor.execute.side_effect = error
        conn.cursor.return_value = cursor
        return conn

    def test_escritura_con_error_ambiguo_en_execute_no_reintenta(self):
        """Un INSERT que falla con OperationalError durante execute() pudo
        haber llegado al servidor: NO se reintenta y el error se propaga."""
        repo = _DummyRepo()
        conn = self._conn_mock_execute_falla(
            psycopg2.OperationalError("server closed the connection unexpectedly")
        )
        get_mock = MagicMock(return_value=conn)
        with patch("repositories.base_repository.get_connection", get_mock):
            with self.assertRaises(psycopg2.OperationalError):
                repo.execute_query(
                    "INSERT INTO mercadopago_sellers (mp_user_id, access_token_enc) "
                    "VALUES (%s, %s) RETURNING *",
                    (-880000002, "enc-test")
                )
        # Sin retry: una sola conexión pedida al pool
        self.assertEqual(get_mock.call_count, 1)

    def test_escritura_con_error_ambiguo_en_commit_no_reintenta(self):
        """Un INSERT cuyo commit() falla con OperationalError es ambiguo
        (pudo haber commiteado): NO se reintenta."""
        repo = _DummyRepo()
        conn = MagicMock()
        cursor = MagicMock()
        cursor.description = [("id",)]
        cursor.fetchall.return_value = [(1,)]
        conn.cursor.return_value = cursor
        conn.commit.side_effect = psycopg2.OperationalError(
            "server closed the connection unexpectedly"
        )
        get_mock = MagicMock(return_value=conn)
        with patch("repositories.base_repository.get_connection", get_mock):
            with self.assertRaises(psycopg2.OperationalError):
                repo.execute_query(
                    "INSERT INTO mercadopago_sellers (mp_user_id, access_token_enc) "
                    "VALUES (%s, %s) RETURNING *",
                    (-880000002, "enc-test")
                )
        self.assertEqual(get_mock.call_count, 1)

    def test_escritura_rechazada_del_lado_cliente_si_reintenta(self):
        """Un INSERT cuyo execute() lanza InterfaceError 'already closed'
        nunca fue transmitido al servidor: el retry es seguro."""
        repo = _DummyRepo()
        dead_conn = database.get_connection()
        dead_conn.close()  # execute() lanza InterfaceError sin enviar nada

        real_get = database.get_connection
        calls = [dead_conn]

        def fake_get_connection():
            if calls:
                return calls.pop()
            return real_get()

        fake_mp_user_id = -880000003
        try:
            with patch(
                "repositories.base_repository.get_connection",
                side_effect=fake_get_connection
            ):
                result = repo.execute_query(
                    "INSERT INTO mercadopago_sellers (mp_user_id, access_token_enc) "
                    "VALUES (%s, %s) RETURNING id, mp_user_id",
                    (fake_mp_user_id, "enc-test")
                )
            self.assertEqual(result[0]["mp_user_id"], fake_mp_user_id)
        finally:
            repo.execute_query(
                "DELETE FROM mercadopago_sellers WHERE mp_user_id = %s",
                (fake_mp_user_id,), fetch=False
            )

    def test_lectura_con_error_ambiguo_si_reintenta(self):
        """Un SELECT puro es idempotente: ante OperationalError sí se
        reintenta con otra conexión."""
        repo = _DummyRepo()
        conn = self._conn_mock_execute_falla(
            psycopg2.OperationalError("SSL connection has been closed unexpectedly")
        )
        real_get = database.get_connection
        calls = [conn]

        def fake_get_connection():
            if calls:
                return calls.pop()
            return real_get()

        with patch(
            "repositories.base_repository.get_connection",
            side_effect=fake_get_connection
        ):
            result = repo.execute_query("SELECT 1 AS n")
        self.assertEqual(result, [{"n": 1}])

    def test_rollback_no_enmascara_error_original(self):
        """Si rollback() falla sobre conn muerta, el error original se
        propaga, no el del rollback."""
        repo = _DummyRepo()
        conn = self._conn_mock_execute_falla(
            psycopg2.IntegrityError("duplicate key value")
        )
        conn.rollback.side_effect = psycopg2.InterfaceError(
            "connection already closed"
        )
        with patch(
            "repositories.base_repository.get_connection",
            return_value=conn
        ):
            with self.assertRaises(psycopg2.IntegrityError):
                repo.execute_query("SELECT 1")

    def test_upsert_es_idempotente(self):
        """Repetir el upsert del Seller nunca duplica filas."""
        repo = MercadoPagoSellerRepository()
        fake_mp_user_id = -880000004
        try:
            r1 = repo.upsert_por_mp_user_id(fake_mp_user_id, {
                "access_token_enc": "enc-v1",
                "scope": "read",
                "estado": "activa",
            })
            r2 = repo.upsert_por_mp_user_id(fake_mp_user_id, {
                "access_token_enc": "enc-v2",
                "scope": "read write",
                "estado": "activa",
            })
            self.assertEqual(r1["id"], r2["id"])  # misma fila, actualizada
            self.assertEqual(r2["access_token_enc"], "enc-v2")

            filas = repo.execute_query(
                "SELECT COUNT(*) AS n FROM mercadopago_sellers WHERE mp_user_id = %s",
                (fake_mp_user_id,)
            )
            self.assertEqual(filas[0]["n"], 1)
        finally:
            repo.execute_query(
                "DELETE FROM mercadopago_sellers WHERE mp_user_id = %s",
                (fake_mp_user_id,), fetch=False
            )


@unittest.skipUnless(DB_AVAILABLE, "PostgreSQL local no disponible")
class TestStaleConnectionDetection(unittest.TestCase):
    """Verificación de la detección de errores de conexión muerta."""

    def test_is_stale_connection_error(self):
        self.assertTrue(database.is_stale_connection_error(
            psycopg2.InterfaceError("connection already closed")
        ))
        self.assertTrue(database.is_stale_connection_error(
            psycopg2.OperationalError("SSL connection has been closed unexpectedly")
        ))
        self.assertTrue(database.is_stale_connection_error(
            psycopg2.OperationalError("server closed the connection unexpectedly")
        ))
        # Errores que NO son de conexión no deben reintentarse
        self.assertFalse(database.is_stale_connection_error(
            psycopg2.IntegrityError("duplicate key value")
        ))
        self.assertFalse(database.is_stale_connection_error(
            ValueError("connection already closed")  # tipo incorrecto
        ))


if __name__ == "__main__":
    unittest.main()

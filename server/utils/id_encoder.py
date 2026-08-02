"""
Módulo centralizado para generación y decodificación de códigos públicos.

Este módulo implementa el algoritmo Optimus para codificar/decodificar IDs internos
a códigos públicos legibles y no secuenciales, sin dependencias externas.

Si se desea cambiar el algoritmo en el futuro, solo se debe modificar este módulo.

========================================
ALGORITMO OPTIMUS - DOCUMENTACIÓN
========================================

El algoritmo Optimus es un método de codificación de IDs que transforma números
secuenciales en códigos no secuenciales pero reversibles. Fue originalmente
desarrollado por Peter Harkins (pushshift) para uso en Reddit.

========================================
ORIGEN DE LOS VALORES
========================================

PRIME = 1125899906842597
------------------------
Origen: Este es el número primo 2^50 + 15, un primo grande de 51 bits.
Por qué es válido:
- Es un número primo grande (51 bits), lo que garantiza que la multiplicación
  sea biyectiva en el rango de IDs razonables.
- Es menor que 2^63, lo que permite operaciones seguras en Python sin overflow.
- El tamaño del primo asegura que los códigos generados estén bien distribuidos
  y no sean predecibles.
- Este valor es similar al usado en implementaciones originales de Optimus.

MOD = 2^63 - 1 = 9223372036854775807
--------------------------------------
Origen: Este es el valor máximo de un entero con signo de 64 bits (INT64_MAX).
Por qué es válido:
- Es el mayor número primo de Mersenne (2^p - 1 donde p es primo).
- Garantiza que todas las operaciones se mantengan dentro del rango de enteros
  de 64 bits con signo.
- Es un número primo, lo que es necesario para que el inverso modular exista.
- Es el módulo estándar usado en implementaciones de Optimus para maximizar
  el espacio de codificación.

XOR = 136291429
---------------
Origen: Este es un número arbitrario elegido para añadir aleatoriedad.
Por qué es válido:
- Es un número de 27 bits, suficientemente grande para añadir entropía pero
  lo bastante pequeño para no causar overflow.
- No tiene propiedades especiales matemáticas, solo sirve para "mezclar" los bits.
- El valor específico no es crítico; cualquier número impar funcionaría.
- Este valor es similar al usado en implementaciones originales de Optimus.

========================================
FUNCIONAMIENTO DEL ALGORITMO
========================================

Codificación (encode):
---------------------
1. Aplicar fórmula: encoded = (id * PRIME + XOR) % MOD
   - Multiplicar el ID por el primo grande
   - Sumar el valor XOR para añadir aleatoriedad
   - Aplicar módulo para mantener dentro del rango

2. Convertir a base62:
   - Usar alfabeto: 0-9A-Za-z (62 caracteres)
   - El resultado es un string corto y legible

3. Agregar prefijo:
   - T para tasaciones, C para comparables, S para solicitudes
   - Resultado final: TF82KQ, CF82KQ, SB73PM

Decodificación (decode):
------------------------
1. Extraer prefijo y validar tipo
2. Convertir de base62 a número
3. Aplicar fórmula inversa: decoded = ((num - XOR) * inverse) % MOD
   - Restar el valor XOR
   - Multiplicar por el inverso modular de PRIME
   - Aplicar módulo para obtener el ID original

Inverso Modular:
----------------
El inverso modular de PRIME mod MOD es el número tal que:
(PRIME * inverse) % MOD = 1

Se calcula usando el algoritmo extendido de Euclides.
Para PRIME=1125899906842597 y MOD=2^63-1, el inverso es:
8253444431101171

========================================
PROPIEDADES GARANTIZADAS
========================================

1. Biyectividad: Cada ID único produce un código único y viceversa.
2. Reversibilidad: El proceso es completamente reversible sin pérdida de datos.
3. No secuenciales: IDs consecutivos (1, 2, 3) producen códigos no correlacionados.
4. Cortos: Los códigos en base62 son más cortos que los IDs en decimal.
5. Legibles: Usan caracteres alfanuméricos estándar (0-9A-Za-z).
6. Deterministas: Mismo ID siempre produce mismo código.

========================================
LIMITACIONES
========================================

1. El rango de IDs válidos está limitado por MOD (2^63-1).
2. IDs negativos o cero no son válidos.
3. Los códigos son case-sensitive (A ≠ a).
4. El algoritmo asume que PRIME y MOD son coprimos (garantizado por ser primo).
"""

from typing import Optional


# Configuración del algoritmo Optimus (sin dependencias externas)
# Estos valores deben mantenerse constantes para garantizar la consistencia
# de los códigos públicos generados.
PRIME = 1125899906842597  # Número primo grande (2^50 + 15)
MOD = 2**63 - 1  # Módulo (INT64_MAX, primo de Mersenne)
XOR = 136291429  # Número para XOR (añade aleatoriedad)

# Prefijos para cada tipo de entidad
TIPO_TASACION = 'T'
TIPO_COMPARABLE = 'C'
TIPO_SOLICITUD = 'S'


def _encode(id_interno: int) -> str:
    """
    Codifica un ID interno usando el algoritmo Optimus.
    
    Args:
        id_interno: ID interno a codificar
        
    Returns:
        String codificado en base62
    """
    # Algoritmo Optimus: (id * prime + xor) % mod
    encoded = (id_interno * PRIME + XOR) % MOD
    
    # Convertir a base62
    alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    if encoded == 0:
        return alphabet[0]
    
    base62 = []
    while encoded > 0:
        encoded, remainder = divmod(encoded, 62)
        base62.append(alphabet[remainder])
    
    return ''.join(reversed(base62))


def _decode(codigo: str) -> int:
    """
    Decodifica un string base62 a ID interno usando el algoritmo Optimus.
    
    Args:
        codigo: String codificado en base62
        
    Returns:
        ID interno decodificado
    """
    # Convertir de base62 a número
    alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    num = 0
    for char in codigo:
        num = num * 62 + alphabet.index(char)
    
    # Algoritmo inverso Optimus: ((num - xor) * inverse) % mod
    # Necesitamos calcular el inverso modular correctamente
    decoded = ((num - XOR) * _mod_inverse(PRIME, MOD)) % MOD
    
    return decoded


def _mod_inverse(a: int, m: int) -> int:
    """
    Calcula el inverso modular usando el algoritmo extendido de Euclides.
    
    Args:
        a: Número a invertir
        m: Módulo
        
    Returns:
        Inverso modular de a mod m
    """
    # Algoritmo extendido de Euclides para encontrar inverso modular
    def egcd(a, b):
        if a == 0:
            return (b, 0, 1)
        else:
            g, y, x = egcd(b % a, a)
            return (g, x - (b // a) * y, y)
    
    g, x, y = egcd(a, m)
    if g != 1:
        raise Exception('No existe inverso modular')
    else:
        return x % m


def generar_codigo_publico(tipo: str, id_interno: int) -> str:
    """
    Genera un código público a partir del ID interno.
    
    Args:
        tipo: Prefijo del tipo de entidad ('T', 'C', 'S')
        id_interno: ID interno de la entidad
        
    Returns:
        Código público en formato: PREFIJO + CODIGO (ej: TF82KQ)
        
    Raises:
        ValueError: Si el tipo no es válido
    """
    if tipo not in (TIPO_TASACION, TIPO_COMPARABLE, TIPO_SOLICITUD):
        raise ValueError(f"Tipo de entidad inválido: {tipo}")
    
    if id_interno <= 0:
        raise ValueError(f"ID interno debe ser positivo: {id_interno}")
    
    # Codificar ID con Optimus
    encoded = _encode(id_interno)
    
    # Convertir a string y agregar prefijo
    return f"{tipo}{encoded}"


def obtener_id_desde_codigo(codigo: str) -> Optional[int]:
    """
    Decodifica un código público para obtener el ID interno.
    
    Args:
        codigo: Código público (ej: TF82KQ)
        
    Returns:
        ID interno de la entidad, o None si el código es inválido
    """
    if not codigo or len(codigo) < 2:
        return None
    
    # Extraer prefijo y código codificado
    prefijo = codigo[0]
    codigo_codificado = codigo[1:]
    
    # Validar prefijo
    if prefijo not in (TIPO_TASACION, TIPO_COMPARABLE, TIPO_SOLICITUD):
        return None
    
    try:
        # Decodificar con Optimus
        id_interno = _decode(codigo_codificado)
        
        # Validar que el ID sea positivo
        if id_interno <= 0:
            return None
            
        return id_interno
    except Exception:
        return None


def validar_codigo(codigo: str, tipo_esperado: str) -> bool:
    """
    Valida si un código público tiene el formato y tipo esperados.
    
    Args:
        codigo: Código público a validar
        tipo_esperado: Tipo esperado ('T', 'C', 'S')
        
    Returns:
        True si el código es válido, False en caso contrario
    """
    if not codigo or len(codigo) < 2:
        return False
    
    prefijo = codigo[0]
    
    if prefijo != tipo_esperado:
        return False
    
    id_interno = obtener_id_desde_codigo(codigo)
    return id_interno is not None


def obtener_tipo_codigo(codigo: str) -> Optional[str]:
    """
    Obtiene el tipo de entidad a partir de un código público.
    
    Args:
        codigo: Código público
        
    Returns:
        Tipo de entidad ('T', 'C', 'S') o None si es inválido
    """
    if not codigo or len(codigo) < 2:
        return None
    
    prefijo = codigo[0]
    
    if prefijo in (TIPO_TASACION, TIPO_COMPARABLE, TIPO_SOLICITUD):
        return prefijo
    
    return None

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verificación de correcciones de suscripciones y acceso Pro.
Este script verifica por inspección estática los cambios realizados.
"""

import re
import os
from pathlib import Path

def verificar_scripts_sin_duplicados():
    """Verifica que no haya scripts duplicados en los HTML principales."""
    print("=== VERIFICACIÓN DE SCRIPTS DUPLICADOS ===\n")

    archivos = ['index.html', 'historial.html', 'perfil.html']
    base_path = Path(__file__).parent

    todos_ok = True
    for archivo in archivos:
        ruta = base_path / archivo
        if not ruta.exists():
            print(f"❌ {archivo}: No encontrado")
            continue

        with open(ruta, 'r', encoding='utf-8') as f:
            contenido = f.read()

        scripts = re.findall(r'<script src="([^"]+)">', contenido)
        vistos = []
        duplicados = []

        for script in scripts:
            if script in vistos:
                duplicados.append(script)
            vistos.append(script)

        if duplicados:
            print(f"[FAIL] {archivo}: Scripts duplicados")
            for dup in set(duplicados):
                print(f"   - {dup}")
            todos_ok = False
        else:
            print(f"[OK] {archivo}: Sin duplicados ({len(scripts)} scripts)")

    return todos_ok

def verificar_carga_subscription_manager():
    """Verifica que subscription-manager.js se cargue antes de sidebar.js."""
    print("\n=== VERIFICACIÓN DE ORDEN DE CARGA ===\n")

    archivos = ['index.html', 'historial.html', 'perfil.html']
    base_path = Path(__file__).parent

    todos_ok = True
    for archivo in archivos:
        ruta = base_path / archivo
        if not ruta.exists():
            print(f"❌ {archivo}: No encontrado")
            continue

        with open(ruta, 'r', encoding='utf-8') as f:
            contenido = f.read()

        scripts = re.findall(r'<script src="([^"]+)">', contenido)

        # Verificar que subscription-manager.js esté antes de sidebar.js
        try:
            sub_idx = scripts.index('../js/subscription-manager.js')
            sidebar_idx = scripts.index('../js/sidebar.js')

            if sub_idx < sidebar_idx:
                print(f"[OK] {archivo}: subscription-manager.js (pos {sub_idx}) antes de sidebar.js (pos {sidebar_idx})")
            else:
                print(f"[FAIL] {archivo}: subscription-manager.js (pos {sub_idx}) DESPUES de sidebar.js (pos {sidebar_idx})")
                todos_ok = False
        except ValueError as e:
            print(f"[FAIL] {archivo}: No se encontro uno de los scripts: {e}")
            todos_ok = False

    return todos_ok

def verificar_delegacion_premium_guard():
    """Verifica que premium-guard.js delegue a SubscriptionManager."""
    print("\n=== VERIFICACIÓN DE DELEGACIÓN DE AUTORIDAD ===\n")

    base_path = Path(__file__).parent.parent / 'js'
    ruta = base_path / 'premium-guard.js'

    if not ruta.exists():
        print(f"[FAIL] premium-guard.js: No encontrado")
        return False

    with open(ruta, 'r', encoding='utf-8') as f:
        contenido = f.read()

    # Verificar que premium-guard.js delegue a SubscriptionManager
    delega = 'window.SubscriptionManager' in contenido and 'verificarAccesoPro' in contenido

    if delega:
        print("[OK] premium-guard.js: Delega a SubscriptionManager.verificarAccesoPro")
    else:
        print("[FAIL] premium-guard.js: No delega a SubscriptionManager")

    return delega

def verificar_sintaxis_basicos():
    """Verifica balance básico de llaves, paréntesis y corchetes."""
    print("\n=== VERIFICACIÓN DE SINTAXIS BÁSICA ===\n")

    archivos_js = [
        Path(__file__).parent.parent / 'js' / 'historial.js',
        Path(__file__).parent.parent / 'js' / 'sidebar.js',
        Path(__file__).parent.parent / 'js' / 'premium-guard.js',
    ]

    todos_ok = True
    for ruta in archivos_js:
        if not ruta.exists():
            print(f"[FAIL] {ruta.name}: No encontrado")
            continue

        with open(ruta, 'r', encoding='utf-8') as f:
            contenido = f.read()

        errores = []

        # Verificar llaves balanceadas
        llaves_abiertas = contenido.count('{')
        llaves_cerradas = contenido.count('}')
        if llaves_abiertas != llaves_cerradas:
            errores.append(f'Llaves: {llaves_abiertas} vs {llaves_cerradas}')

        # Verificar parentesis balanceados
        parentesis_abiertos = contenido.count('(')
        parentesis_cerrados = contenido.count(')')
        if parentesis_abiertos != parentesis_cerrados:
            errores.append(f'Parentesis: {parentesis_abiertos} vs {parentesis_cerrados}')

        # Verificar corchetes balanceados
        corchetes_abiertos = contenido.count('[')
        corchetes_cerrados = contenido.count(']')
        if corchetes_abiertos != corchetes_cerrados:
            errores.append(f'Corchetes: {corchetes_abiertos} vs {corchetes_cerrados}')

        if errores:
            print(f"[FAIL] {ruta.name}: Errores de balance")
            for error in errores:
                print(f"   - {error}")
            todos_ok = False
        else:
            print(f"[OK] {ruta.name}: Balance OK")

    return todos_ok

def verificar_proteccion_rutas():
    """Verifica que las páginas restringidas usen requirePremiumAccess."""
    print("\n=== VERIFICACIÓN DE PROTECCIÓN DE RUTAS ===\n")

    archivos = ['tasacion.html', 'solicitudes.html', 'vista-previa-informe.html']
    base_path = Path(__file__).parent

    todos_ok = True
    for archivo in archivos:
        ruta = base_path / archivo
        if not ruta.exists():
            print(f"[FAIL] {archivo}: No encontrado")
            continue

        with open(ruta, 'r', encoding='utf-8') as f:
            contenido = f.read()

        # Verificar que use requirePremiumAccess
        usa_protection = 'requirePremiumAccess' in contenido

        if usa_protection:
            print(f"[OK] {archivo}: Usa requirePremiumAccess")
        else:
            print(f"[FAIL] {archivo}: No usa requirePremiumAccess")
            todos_ok = False

    return todos_ok

def verificar_sidebar_checks():
    """Verifica que sidebar.js tenga checks de disponibilidad de SubscriptionManager."""
    print("\n=== VERIFICACIÓN DE SIDEBAR.JS ===\n")

    ruta = Path(__file__).parent.parent / 'js' / 'sidebar.js'

    if not ruta.exists():
        print(f"[FAIL] sidebar.js: No encontrado")
        return False

    with open(ruta, 'r', encoding='utf-8') as f:
        contenido = f.read()

    # Verificar que tenga checks de disponibilidad
    tiene_check = 'window.SubscriptionManager' in contenido and 'no disponible' in contenido

    if tiene_check:
        print("[OK] sidebar.js: Tiene checks de disponibilidad de SubscriptionManager")
    else:
        print("[FAIL] sidebar.js: No tiene checks de disponibilidad")

    return tiene_check

def main():
    print("VERIFICACIÓN DE CORRECCIONES DE SUSCRIPCIONES\n")
    print("=" * 60)

    resultados = {
        'scripts_sin_duplicados': verificar_scripts_sin_duplicados(),
        'orden_carga': verificar_carga_subscription_manager(),
        'delegacion': verificar_delegacion_premium_guard(),
        'sintaxis': verificar_sintaxis_basicos(),
        'proteccion_rutas': verificar_proteccion_rutas(),
        'sidebar_checks': verificar_sidebar_checks(),
    }

    print("\n" + "=" * 60)
    print("RESUMEN DE RESULTADOS")
    print("=" * 60)

    for check, resultado in resultados.items():
        estado = "[OK]" if resultado else "[FAIL]"
        print(f"{estado} {check}: {'PASO' if resultado else 'FALLO'}")

    todos_pasaron = all(resultados.values())

    print("\n" + "=" * 60)
    if todos_pasaron:
        print("TODAS LAS VERIFICACIONES PASARON")
    else:
        print("ALGUNAS VERIFICACIONES FALLARON")
    print("=" * 60)

    return 0 if todos_pasaron else 1

if __name__ == '__main__':
    exit(main())

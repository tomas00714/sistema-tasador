import asyncio
from playwright.async_api import async_playwright
import json

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Test 1: index.html muestra ambas opciones (suscripción y trial) sin autenticación
        print("Test 1: index.html muestra ambas opciones sin autenticación")
        await page.goto("http://127.0.0.1:8080/index.html#pricing")
        await page.wait_for_load_state("networkidle")

        pricingCta = await page.query_selector("#pricingCtaButton")
        trialCta = await page.query_selector("#trialCtaButton")

        if pricingCta and trialCta:
            pricingVisible = await pricingCta.is_visible()
            trialVisible = await trialCta.is_visible()
            print(f"  - Suscribirme visible: {pricingVisible}")
            print(f"  - Trial visible: {trialVisible}")

            if pricingVisible and trialVisible:
                print("  ✓ Test 1 PASSED")
            else:
                print("  ✗ Test 1 FAILED")
        else:
            print("  ✗ Test 1 FAILED: No se encontraron los botones")

        # Test 2: Click en trial sin autenticación redirige a registro con plan=trial
        print("\nTest 2: Click en trial sin autenticación redirige a registro con plan=trial")
        await trialCta.click()
        await page.wait_for_load_state("networkidle")

        currentUrl = page.url
        print(f"  - URL actual: {currentUrl}")

        if "registro.html" in currentUrl and "plan=trial" in currentUrl:
            print("  ✓ Test 2 PASSED")
        else:
            print("  ✗ Test 2 FAILED")

        # Test 3: Click en suscribirme sin autenticación redirige a registro con plan=paid
        print("\nTest 3: Click en suscribirme sin autenticación redirige a registro con plan=paid")
        await page.goto("http://127.0.0.1:8080/index.html#pricing")
        await page.wait_for_load_state("networkidle")

        pricingCta = await page.query_selector("#pricingCtaButton")
        await pricingCta.click()
        await page.wait_for_load_state("networkidle")

        currentUrl = page.url
        print(f"  - URL actual: {currentUrl}")

        if "registro.html" in currentUrl and "plan=paid" in currentUrl:
            print("  ✓ Test 3 PASSED")
        else:
            print("  ✗ Test 3 FAILED")

        # Test 4: SubscriptionManager está cargado
        print("\nTest 4: SubscriptionManager está cargado")
        await page.goto("http://127.0.0.1:8080/index.html")
        await page.wait_for_load_state("networkidle")

        subscriptionManagerExists = await page.evaluate("typeof window.SubscriptionManager !== 'undefined'")
        print(f"  - SubscriptionManager existe: {subscriptionManagerExists}")

        if subscriptionManagerExists:
            print("  ✓ Test 4 PASSED")
        else:
            print("  ✗ Test 4 FAILED")

        # Test 5: sidebar.js usa SubscriptionManager
        print("\nTest 5: Verificar carga de scripts en historial.html")
        await page.goto("http://127.0.0.1:8080/app/historial.html")
        await page.wait_for_load_state("networkidle")

        # Verificar que premium-guard.js y subscription-manager.js están cargados
        scripts = await page.evaluate("""
            const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
            return scripts.filter(s => s.includes('premium-guard.js') || s.includes('subscription-manager.js'));
        """)

        print(f"  - Scripts cargados: {scripts}")

        if any('premium-guard.js' in s for s in scripts) and any('subscription-manager.js' in s for s in scripts):
            print("  ✓ Test 5 PASSED")
        else:
            print("  ✗ Test 5 FAILED")

        print("\n=== RESUMEN QA ===")
        print("Tests básicos de integración completados.")
        print("Para pruebas completas de flujos (registro, pago, trial), se requiere:")
        print("  - Backend corriendo (probado)")
        print("  - Simulación de Mercado Pago (no implementada en QA automatizada)")
        print("  - Pruebas manuales de flujos de pago")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

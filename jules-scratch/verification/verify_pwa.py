import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context()
        page = await context.new_page()

        await page.goto('http://localhost:8000/index.html')

        # Check that the service worker is registered
        if not context.service_workers:
            raise Exception("Service worker not registered")
        print("Service worker registered successfully.")

        # Check that the main menu is visible
        main_menu = page.locator('#main-menu')
        await expect(main_menu).to_be_visible(timeout=10000)
        print("Main menu is visible.")

        # Take a screenshot
        screenshot_path = 'jules-scratch/verification/pwa_verification.png'
        await page.screenshot(path=screenshot_path)

        await browser.close()
        print(f"Screenshot saved to {screenshot_path}")

if __name__ == '__main__':
    asyncio.run(main())

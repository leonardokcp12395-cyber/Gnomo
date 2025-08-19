import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Page error: {exc.name}: {exc.message}"))

        await page.goto('http://localhost:8000/index.html')

        main_menu = page.locator('#main-menu')
        try:
            await expect(main_menu).to_be_visible(timeout=10000)
        except Exception as e:
            print(f"Error waiting for main menu: {e}")
            content = await page.content()
            print("\n--- PAGE CONTENT ---")
            print(content)
            print("--- END PAGE CONTENT ---\n")
            raise e

        title = page.locator('h1[data-text="Sobrevivente"]')
        await expect(title).to_be_visible()

        screenshot_path = 'jules-scratch/verification/verification.png'
        await page.screenshot(path=screenshot_path)

        await browser.close()
        print(f"Screenshot saved to {screenshot_path}")

if __name__ == '__main__':
    asyncio.run(main())

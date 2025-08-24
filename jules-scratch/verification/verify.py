import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Get the absolute path to the index.html file
        file_path = os.path.abspath('index.html')

        await page.goto(f'file://{file_path}')

        # Click the play button
        await page.get_by_role("button", name="Iniciar Jogo").click()

        # Wait for the character select screen to be visible
        await page.locator("#character-select-screen").wait_for(state="visible")

        # Click the Seraph character to start the game
        await page.get_by_role("button", name="Selecionar").first.click()

        # Wait for 5 seconds to allow for loading and for the game to start
        await page.wait_for_timeout(5000)

        # Take a screenshot
        await page.screenshot(path='jules-scratch/verification/verification.png')

        await browser.close()

asyncio.run(main())

import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Navigate to the local index.html file
        file_path = "file://" + os.path.abspath("index.html")
        await page.goto(file_path)

        # Click the "Start Game" button
        await page.get_by_role("button", name="Iniciar Jogo").click()

        # Click the "Select" button for the first character
        await page.get_by_role("button", name="Selecionar").first.click()

        # Wait for the HUD to become visible, which indicates the game has started
        hud = page.locator("#hud")
        await hud.wait_for(state="visible", timeout=10000) # Wait for 10 seconds

        # Wait for a few seconds to let enemies spawn and move around
        await page.wait_for_timeout(3000)

        # Take a screenshot
        await page.screenshot(path="jules-scratch/verification/game_verification.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Get the absolute path to the index.html file
        file_path = os.path.abspath('index.html')
        
        # Go to the local HTML file
        await page.goto(f'file://{file_path}')

        # Wait for the main menu to be visible
        await expect(page.locator('#main-menu')).to_be_visible()

        # Click the "Jogar" button to go to character select, using a more specific ID selector
        await page.locator('#play-button').click()

        # Wait for character select screen
        await expect(page.locator('#character-select-screen')).to_be_visible()

        # Click the "Selecionar" button for the 'Seraph' character to start the game
        await page.get_by_role("button", name="Selecionar").first.click()

        # Wait for the HUD to appear, indicating the game is playing
        await expect(page.locator('#hud')).to_be_visible()

        # Wait for 5 seconds to let enemies spawn
        await page.wait_for_timeout(5000)

        # Take a screenshot of the gameplay
        screenshot_path = 'jules-scratch/verification/gameplay_with_new_assets.png'
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())

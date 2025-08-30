from playwright.sync_api import sync_playwright, Page, expect
import os

def run_verification(page: Page):
    """
    This function will fail if the pause menu becomes visible,
    allowing us to capture the state of the screen when the error occurs.
    """
    # Add listeners for console messages and page errors BEFORE navigation
    page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
    page.on("pageerror", lambda error: print(f"PAGE ERROR: {error.message}"))

    file_url = f"file://{os.getcwd()}/index.html"
    print(f"Navigating to {file_url}")
    page.goto(file_url, wait_until="load")
    print(f"Page loaded. Title is: {page.title()}")

    # Increase the default timeout for all actions
    page.set_default_timeout(15000)

    # Wait for the main menu to be visible
    print("Waiting for main menu...")
    main_menu = page.locator("#main-menu")
    expect(main_menu).to_be_visible(timeout=10000)
    print("Main menu is visible.")

    play_button = page.locator("#play-button")
    expect(play_button).to_be_visible()
    print("Clicking play button.")
    play_button.click()

    # Wait for the character selection screen to be visible
    print("Waiting for character selection screen...")
    character_screen = page.locator("#character-select-screen")
    expect(character_screen).to_be_visible(timeout=5000)
    print("Character selection screen is visible.")

    # Select a character
    seraph_button = page.locator('button[data-character-id="SERAPH"]')
    expect(seraph_button).to_be_visible()
    print("Clicking character selection button.")
    seraph_button.click()

    # The game should now be playing, and the HUD should be visible.
    print("Waiting for the game to start and HUD to be visible...")
    hud = page.locator("#hud")
    expect(hud).to_be_visible(timeout=10000)
    print("HUD is visible. Game has started successfully.")

    # Let the game run for a few seconds to hopefully trigger the runtime error.
    print("Running game for 5 seconds to trigger the bug...")
    page.wait_for_timeout(5000)

    # Now, assert that the pause menu is NOT visible.
    # If it is visible, the test will fail, and the screenshot will show us the error.
    print("Checking for pause menu...")
    pause_menu = page.locator("#pause-menu")
    expect(pause_menu).to_be_hidden()
    print("Game did not pause. Verification successful.")

    # Take a screenshot to prove it
    print("Taking final screenshot...")
    page.screenshot(path="jules-scratch/verification/final_state.png")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            run_verification(page)
        except Exception as e:
            print(f"An error occurred during verification: {e}")
            page.screenshot(path="jules-scratch/verification/failure_screenshot.png")
            # Re-raise the exception to make it clear the test failed.
            raise
        finally:
            browser.close()

if __name__ == "__main__":
    main()

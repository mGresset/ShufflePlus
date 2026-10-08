import { test, expect } from "@playwright/test";
import { E2E_CLIENT_ID } from "./helpers.mjs";

test("première configuration : Client ID local puis bouton de connexion", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveTitle("Shuffle+");
    await expect(page.locator('meta[name="shuffleplus-version"]')).toHaveAttribute("content", "11.8.0");
    await expect(page.locator("#spotifySetupPanel")).toBeVisible();
    await expect(page.locator("#loginButton")).toBeHidden();

    await page.locator("#spotifySetupClientIdInput").fill(E2E_CLIENT_ID);
    await page.locator("#spotifySetupForm").getByRole("button", { name: "Enregistrer et continuer" }).click();

    await expect(page.locator("#spotifySetupPanel")).toBeHidden();
    await expect(page.locator("#loginButton")).toBeVisible();
    await expect(page.locator("#status")).toContainText("enregistré");

    const stored = await page.evaluate(() => localStorage.getItem("shuffleplus_spotify_app_config_v1"));
    expect(JSON.parse(stored).clientId).toBe(E2E_CLIENT_ID);
});

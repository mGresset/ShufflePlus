import { test, expect } from "@playwright/test";
import { gotoConnectedApp, waitForSpotifyCall } from "./helpers.mjs";

test("navigation principale et recherche Spotify restent utilisables", async ({ page }) => {
    const calls = await gotoConnectedApp(page);

    await expect(page.locator('[data-app-menu-page="dashboard"]')).toBeVisible();
    await page.locator('button[data-app-menu="settings"]').first().click();
    await expect(page.locator('[data-app-menu-page="settings"]')).toBeVisible();
    await expect(page.locator('[data-app-menu-page="settings"]')).toContainText("Client ID");

    await page.locator("[data-open-universal-search]").first().click();
    await expect(page.locator("#universalSearchDialog")).toBeVisible();
    await page.locator("#universalSearchInput").fill("yellow");

    await waitForSpotifyCall(calls, (call) => call.method === "GET" && call.path === "/search");
    await expect(page.locator('[aria-label="Résultats du catalogue Spotify"]')).toBeVisible();
    await expect(page.locator('[data-spotify-catalog-result="track:yellow-e2e"]')).toContainText("Yellow Test");
    await expect(page.locator('[data-spotify-catalog-result="track:yellow-e2e"]')).toContainText("Cold Test");

    await page.keyboard.press("Escape");
    await expect(page.locator("#universalSearchDialog")).toBeHidden();
});

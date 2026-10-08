import { test, expect } from "@playwright/test";
import { gotoConnectedApp, waitForSpotifyCall } from "./helpers.mjs";

test("Player+ envoie précédent, seek, répétition et volume à Spotify", async ({ page }) => {
    const calls = await gotoConnectedApp(page);

    const card = page.locator("[data-home-now-playing]");
    await expect(card).toBeVisible();
    await expect(card.locator("[data-home-now-title]")).toContainText("One More Test");
    await expect(card.locator("[data-home-volume-label]")).toHaveText("42%");

    await card.getByRole("button", { name: "Titre précédent" }).click();
    await waitForSpotifyCall(calls, (call) => call.method === "POST" && call.path === "/me/player/previous");

    const seek = card.locator("[data-home-seek]");
    await seek.fill("60000");
    await seek.dispatchEvent("change");
    await waitForSpotifyCall(
        calls,
        (call) => call.method === "PUT" && call.path === "/me/player/seek" && call.search.includes("position_ms=60000")
    );

    await card.locator("[data-home-repeat-button]").click();
    await waitForSpotifyCall(
        calls,
        (call) => call.method === "PUT" && call.path === "/me/player/repeat" && call.search.includes("state=context")
    );

    const volume = card.locator("[data-home-volume]");
    await volume.fill("63");
    await volume.dispatchEvent("change");
    await expect(card.locator("[data-home-volume-label]")).toHaveText("63%");
    await waitForSpotifyCall(
        calls,
        (call) => call.method === "PUT" && call.path === "/me/player/volume" && call.search.includes("volume_percent=63")
    );
});

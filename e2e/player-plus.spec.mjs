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

    // runQuickControlAction conserve volontairement le verrou de commande
    // pendant 260 ms, puis attend encore 140 ms avant le rafraîchissement
    // Spotify. Chromium est assez rapide pour enchaîner le clic suivant avant
    // la libération du verrou ; on respecte donc ici la fenêtre réelle du
    // runtime afin de tester les commandes séquentiellement comme l'UI les
    // accepte.
    await page.waitForTimeout(650);

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

import { test, expect } from "@playwright/test";

const TRANSIENT_NAVIGATION_ERROR =
    /Execution context was destroyed|Cannot find context|Target page, context or browser has been closed/i;

async function readActiveServiceWorkerVersion(page) {
    try {
        return await page.evaluate(async () => {
            if (!("serviceWorker" in navigator)) {
                return "__unsupported__";
            }

            const registration = await navigator.serviceWorker.getRegistration();
            const worker = registration?.active || null;
            if (!worker || worker.state !== "activated") {
                return "";
            }

            return await new Promise((resolve) => {
                const channel = new MessageChannel();
                const timer = window.setTimeout(() => resolve(""), 1_000);
                channel.port1.onmessage = (event) => {
                    window.clearTimeout(timer);
                    resolve(event.data?.version || "");
                };
                worker.postMessage({ type: "GET_VERSION" }, [channel.port2]);
            });
        });
    } catch (error) {
        // L’activation/claim d’un Service Worker peut remplacer le document
        // courant pendant quelques millisecondes. Ce n’est pas un échec PWA :
        // le prochain poll relit simplement le nouveau contexte.
        if (TRANSIENT_NAVIGATION_ERROR.test(String(error))) {
            return "";
        }
        throw error;
    }
}

async function readCacheNames(page) {
    try {
        return await page.evaluate(() => caches.keys());
    } catch (error) {
        if (TRANSIENT_NAVIGATION_ERROR.test(String(error))) {
            return [];
        }
        throw error;
    }
}

test("le Service Worker actif annonce la même version que l’application", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator('meta[name="shuffleplus-version"]'))
        .toHaveAttribute("content", "11.9.2");

    await expect.poll(
        () => readActiveServiceWorkerVersion(page),
        {
            timeout: 30_000,
            intervals: [200, 300, 500, 750, 1_000]
        }
    ).toBe("11.9.2");

    await expect.poll(
        () => readCacheNames(page),
        {
            timeout: 15_000,
            intervals: [200, 300, 500, 750]
        }
    ).toContain("shuffleplus-v11.9.2-shell");
});

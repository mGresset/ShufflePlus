import { test, expect } from "@playwright/test";

test("le Service Worker actif annonce la même version que l’application", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const result = await page.evaluate(async () => {
        if (!("serviceWorker" in navigator)) {
            return { supported: false, version: "" };
        }

        const registration = await navigator.serviceWorker.ready;
        const worker = registration.active || registration.waiting || registration.installing;
        if (!worker) {
            return { supported: true, version: "" };
        }

        const version = await new Promise((resolve, reject) => {
            const channel = new MessageChannel();
            const timer = window.setTimeout(() => reject(new Error("Timeout GET_VERSION")), 5_000);
            channel.port1.onmessage = (event) => {
                window.clearTimeout(timer);
                resolve(event.data?.version || "");
            };
            worker.postMessage({ type: "GET_VERSION" }, [channel.port2]);
        });

        return { supported: true, version };
    });

    expect(result.supported).toBe(true);
    expect(result.version).toBe("11.9.0");

    const cacheNames = await page.evaluate(() => caches.keys());
    expect(cacheNames.some((name) => name.includes("shuffleplus-v11.9.0-shell"))).toBe(true);
});

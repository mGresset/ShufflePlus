import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const version = (await readFile("VERSION", "utf8")).trim();
const workerSource = await readFile("service-worker.js", "utf8");
const appSource = await readFile("app.js", "utf8");
const healthSource = await readFile("app-health.js", "utf8");

function readArray(name) {
    const match = workerSource.match(
        new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`)
    );
    assert.ok(match, `${name} doit exister`);
    return [...match[1].matchAll(/"([^"\\]+)"/g)].map((item) => item[1]);
}

test("Shuffle+ 11.4.0 réduit le lot PWA réellement bloquant", () => {
    assert.equal(version, "11.4.0");
    const critical = readArray("CRITICAL_APP_SHELL");
    const runtime = readArray("RUNTIME_APP_SHELL");
    assert.ok(critical.length <= 16);
    assert.ok(runtime.length >= 40);
    assert.ok(critical.includes("./app.js?v=11.4.0&build=11.4.0-pwa-reset-1"));
    assert.ok(runtime.includes("./core/playback-clock.js"));
    assert.ok(runtime.includes("./musical-assistant.js"));
});

test("la prise de contrôle attend le runtime hors ligne et expose son diagnostic", () => {
    const warmIndex = workerSource.indexOf("await warmRuntimeShell();");
    const claimIndex = workerSource.indexOf("await self.clients.claim();");
    assert.ok(warmIndex >= 0);
    assert.ok(claimIndex > warmIndex);
    assert.match(workerSource, /GET_SHELL_STATUS/);
    assert.match(workerSource, /fetchShellAsset/);
    assert.match(workerSource, /retries: 2/);
    assert.match(appSource, /requestPwaShellStatus/);
    assert.match(healthSource, /id: "pwa-shell"/);
});

test("les deux anciens modules Adaptive non utilisés ne sont plus distribués", async () => {
    for (const file of ["adaptive-config.js", "adaptive-dashboard.js"]) {
        await assert.rejects(access(file));
    }
});

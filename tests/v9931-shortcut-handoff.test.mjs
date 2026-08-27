import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [version, bootstrapSource, appSource] = await Promise.all([
    readFile(new URL("../VERSION", import.meta.url), "utf8").then((value) => value.trim()),
    readFile(new URL("../bootstrap-10.1.1.js", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8")
]);

test("Shuffle+ 10.1.1 conserve une commande de raccourci avant la recharge PWA", () => {
    assert.equal(version, "10.1.1");
    assert.match(bootstrapSource, /const AUTOMATION_HANDOFF_KEY/);
    assert.match(bootstrapSource, /url\.searchParams\.get\("action"\)/);
    assert.match(bootstrapSource, /sessionStorage\.setItem\(\s*AUTOMATION_HANDOFF_KEY/);

    const captureIndex = bootstrapSource.indexOf("captureAutomationHandoff();");
    const migrationIndex = bootstrapSource.indexOf("migrateRuntimeIfNeeded();");
    assert.ok(captureIndex >= 0);
    assert.ok(migrationIndex > captureIndex);
});

test("app.js récupère le relais si Safari a perdu la query string", () => {
    assert.match(appSource, /function readAutomationHandoffSearchParams\(\)/);
    assert.match(appSource, /readAutomationHandoffSearchParams\(\)/);
    assert.match(appSource, /params = handoffParams/);
    assert.match(appSource, /savePendingAutomationCommand\(\s*urlAutomationCommand/);
    assert.match(appSource, /clearAutomationHandoff\(\)/);
});

test("le relais expire rapidement et ne peut pas relancer une ancienne commande", () => {
    assert.match(bootstrapSource, /AUTOMATION_HANDOFF_TTL_MS = 2 \* 60 \* 1000/);
    assert.match(appSource, /Date\.now\(\) > expiresAt/);
    assert.match(appSource, /sessionStorage\.removeItem\(\s*AUTOMATION_HANDOFF_KEY/);
});

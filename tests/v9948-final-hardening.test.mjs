import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
    version,
    bootstrap,
    recovery,
    index,
    securityPolicy,
    resultChannel,
    server,
    drivingCss,
    manifest
] = await Promise.all([
    readFile(new URL("../VERSION", import.meta.url), "utf8").then((value) => value.trim()),
    readFile(new URL("../bootstrap-10.2.0.js", import.meta.url), "utf8"),
    readFile(new URL("../startup-recovery-10.2.0.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../core/security-policy.js", import.meta.url), "utf8"),
    readFile(new URL("../core/shortcut-result-channel.js", import.meta.url), "utf8"),
    readFile(new URL("../server/server.js", import.meta.url), "utf8"),
    readFile(new URL("../styles/feature-driving.css", import.meta.url), "utf8"),
    readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8")
]);

test("10.2.0 limite la réparation PWA au scope Shuffle+ exact", () => {
    assert.equal(version, "10.2.0");
    for (const source of [bootstrap, recovery]) {
        assert.match(source, /const shufflePlusScope = new URL\("\.\/", window\.location\.href\)\.href;/);
        assert.match(source, /registration\.scope === shufflePlusScope/);
        assert.doesNotMatch(source, /registration\.scope\.startsWith\(window\.location\.origin\)/);
    }
});

test("10.2.0 borne connect-src aux services réellement utilisés", () => {
    assert.match(index, /connect-src 'self' https:\/\/accounts\.spotify\.com https:\/\/api\.spotify\.com https:\/\/\*\.up\.railway\.app;/);
    assert.doesNotMatch(index, /connect-src 'self' https:;/);
    assert.match(securityPolicy, /https:\/\/\*\.up\.railway\.app/);
});

test("le canal de résultat exige un ResultToken distinct", () => {
    assert.match(resultChannel, /"resultToken"/);
    assert.match(resultChannel, /enabled: Boolean\(requestId && serverUrl && token\)/);
    assert.match(resultChannel, /"Authorization": `Bearer \$\{normalizeShortcutResultChannelConfig\(config\)\.token\}`/);
});

test("Railway 5.2 réserve le canal avec une empreinte du jeton", () => {
    assert.match(server, /const VERSION = "5\.2\.0";/);
    assert.match(server, /tokenHash: sha256\(token\)/);
    assert.match(server, /ensureLaunchResultReservation/);
    assert.match(server, /flag: "wx"/);
    assert.match(server, /assertLaunchToken\(record, token\)/);
});

test("le rate limiter Railway purge ses buckets et tient compte du proxy", () => {
    assert.match(server, /req\.headers\["x-forwarded-for"\]/);
    assert.match(server, /forwarded\.at\(-1\)/);
    assert.match(server, /function sweepRateBuckets\(now\)/);
    assert.match(server, /MAX_RATE_BUCKETS = 10_000/);
});

test("le mode conduite et le manifeste n'accumulent plus les anciens patchs", () => {
    assert.match(drivingCss, /v10\.2\.0 — contrat mobile conduite consolidé/);
    assert.doesNotMatch(drivingCss, /v9\.9\.(?:30|33|34|39|41|42|45|47) —/);
    const parsedManifest = JSON.parse(manifest);
    assert.equal(
        parsedManifest.description,
        "Shuffle+ — Mix intelligent, profils de lecture et commandes Spotify."
    );
    assert.doesNotMatch(parsedManifest.description, /9\.9\./);
});

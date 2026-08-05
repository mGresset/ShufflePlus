import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();

test("Shuffle+ 9.9.34 charge le style conduite avant toute entrée directe", () => {
    assert.equal(version, "9.9.34");
    assert.match(
        appSource,
        /async function enterDrivingMode[\s\S]*?await ensureMenuFeatureStyles\("driving"\);[\s\S]*?activeAppMenu = "driving";/
    );
});

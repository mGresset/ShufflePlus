import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();

<<<<<<< HEAD
test("Shuffle+ 9.9.48 charge le style conduite avant toute entrée directe", () => {
    assert.equal(version, "9.9.48");
=======
test("Shuffle+ 9.9.47 charge le style conduite avant toute entrée directe", () => {
    assert.equal(version, "9.9.47");
>>>>>>> 52d770a83528fa73c8bfab6870d9cad4767612e9
    assert.match(
        appSource,
        /async function enterDrivingMode[\s\S]*?await ensureMenuFeatureStyles\("driving"\);[\s\S]*?activeAppMenu = "driving";/
    );
});

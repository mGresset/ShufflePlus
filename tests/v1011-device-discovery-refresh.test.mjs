import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const apiSource = await readFile(new URL("../spotify-api.js", import.meta.url), "utf8");
const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("Shuffle+ 10.3.0 force une découverte Spotify Connect fraîche pour les raccourcis", () => {
    assert.equal(version, "10.3.0");
    assert.match(apiSource, /getAvailableDevices\(\{[\s\S]*fresh\s*=\s*false/);
    assert.match(apiSource, /skipCache:\s*Boolean\(fresh\)/);
    assert.match(appSource, /getAvailableDevices\(\{\s*fresh:\s*true\s*\}\)/);
});

test("Shuffle+ 10.3.0 récupère aussi le device actif depuis l'état de lecture", () => {
    assert.match(appSource, /getCurrentPlayback\(\{\s*fresh:\s*true\s*\}\)/);
    assert.match(appSource, /playback\?\.device/);
    assert.match(appSource, /lastDevices\s*=\s*\[\s*playbackDevice,/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const apiSource = await readFile(new URL("../spotify-api.js", import.meta.url), "utf8");
const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const reliabilitySource = await readFile(new URL("../core/spotify-reliability.js", import.meta.url), "utf8");
const discoverySource = await readFile(new URL("../core/spotify-device-discovery.js", import.meta.url), "utf8");

test("Shuffle+ 12.0.1 force une découverte Spotify Connect fraîche pour les raccourcis", () => {
    assert.equal(version, "12.0.1");
    assert.match(apiSource, /getAvailableDevices\(\{[\s\S]*fresh\s*=\s*false/);
    assert.match(apiSource, /skipCache:\s*Boolean\(fresh\)/);
    assert.match(appSource, /getAvailableDevices\(\{\s*\.\.\.options,\s*includeRestricted:\s*true\s*\}\)/);
    assert.match(reliabilitySource, /api\.getAvailableDevices\(\{\s*fresh:\s*true\s*\}\)/);
    assert.match(discoverySource, /getAvailableDevices\(\{\s*fresh\s*\}\)/);
});

test("Shuffle+ 12.0.1 récupère aussi le device actif depuis l'état de lecture", () => {
    // v12 : la fusion /devices + /me/player vit dans les modules fiabilité.
    assert.match(reliabilitySource, /getCurrentPlayback\(\{\s*fresh:\s*true\s*\}\)/);
    assert.match(reliabilitySource, /playback\?\.device/);
    assert.match(reliabilitySource, /devices\s*=\s*\[\s*playbackDevice,/);
    assert.match(discoverySource, /mergeDeviceObservations\(devices, playback\)/);
});

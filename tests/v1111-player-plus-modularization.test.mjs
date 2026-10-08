import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const playerPlusSource = await readFile("core/player-plus.js", "utf8");
const budgetSource = await readFile("scripts/check-architecture-budget.mjs", "utf8");

test("Shuffle+ 11.12.0 extrait Player+ hors du monolithe", () => {
    assert.equal(version, "11.12.0");
    assert.match(appSource, /createPlayerPlusRuntime\(/);
    assert.match(appSource, /updatePlayerPlusNowPlayingCard\(/);
    assert.match(appSource, /updatePlayerPlusInputPreview\(/);
    assert.doesNotMatch(appSource, /async function runPlayerPlusSeek/);
    assert.doesNotMatch(appSource, /async function runPlayerPlusVolume/);
    assert.doesNotMatch(appSource, /function updateVisiblePlaybackButtons/);
});

test("le module Player+ possède le rendu et les mutations Spotify dédiées", () => {
    assert.match(playerPlusSource, /export function createPlayerPlusRuntime/);
    assert.match(playerPlusSource, /export function updatePlayerPlusNowPlayingCard/);
    assert.match(playerPlusSource, /export function updatePlayerPlusInputPreview/);
    assert.match(playerPlusSource, /export function updatePlayerPlusPlaybackButtons/);
    assert.match(playerPlusSource, /await seekPlayback\(nextPosition, deviceId\)/);
    assert.match(playerPlusSource, /await setPlaybackVolume\(nextVolume, deviceId\)/);
    assert.match(playerPlusSource, /await addToPlaybackQueue\(track\.uri, deviceId\)/);
});

test("le budget CI verrouille le nouveau niveau de app.js", () => {
    assert.match(budgetSource, /appLines:\s*51240/);
    assert.match(budgetSource, /appBytes:\s*1_560_000/);
});

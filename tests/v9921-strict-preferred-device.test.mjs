import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    classifyLaunchError,
    prioritizeLaunchDevices
} from "../core/launch-reliability.js";

const appSource = await readFile("app.js", "utf8");
const version = (await readFile("VERSION", "utf8")).trim();

test("Shuffle+ 9.9.30 active le ciblage strict de l’iPhone enregistré", () => {
    assert.equal(version, "9.9.30");
    assert.match(
        appSource,
        /strictPreferredDevice[\s\S]*fallbackCandidates:\s*strictPreferredDevice\s*\?\s*\[\]/
    );
    assert.match(
        appSource,
        /slice\(0, strictPreferredDevice \? 1 : 4\)/
    );
});

test("aucun autre appareil n’est proposé quand l’iPhone enregistré est absent", () => {
    const result = prioritizeLaunchDevices(
        [
            { id: "computer", name: "Chrome", type: "Computer", is_active: true },
            { id: "other-phone", name: "iPhone de Paul", type: "Smartphone" }
        ],
        {
            preferredDevice: {
                id: "saved-phone",
                name: "iPhone de Max",
                type: "Smartphone"
            },
            lastWorkingDevice: {
                id: "computer",
                name: "Chrome",
                type: "Computer"
            },
            mode: "preferred"
        }
    );

    assert.deepEqual(result, []);
});

test("l’erreur dédiée confirme qu’aucun autre appareil n’a été utilisé", () => {
    const error = new Error(
        "L’iPhone enregistré est indisponible. Aucun autre appareil ne sera utilisé."
    );
    error.code = "PREFERRED_DEVICE_UNAVAILABLE";
    const classification = classifyLaunchError(error);

    assert.equal(classification.code, "PREFERRED_DEVICE_UNAVAILABLE");
    assert.equal(classification.title, "iPhone enregistré indisponible");
    assert.match(classification.message, /aucun autre appareil/i);
});

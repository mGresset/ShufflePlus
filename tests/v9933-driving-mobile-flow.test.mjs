import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [version, drivingCss] = await Promise.all([
    readFile(new URL("../VERSION", import.meta.url), "utf8").then((value) => value.trim()),
    readFile(new URL("../styles/feature-driving.css", import.meta.url), "utf8")
]);

test("Shuffle+ 9.9.37 place le mode conduite mobile dans un flux vertical", () => {
    assert.equal(version, "9.9.37");
    assert.match(
        drivingCss,
        /Shuffle\+ v9\.9\.33 — flux mobile conduite sans chevauchement/
    );
    assert.match(
        drivingCss,
        /body\.is-driving-mode \.driving-mode-page\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;/
    );
});

test("la file et les commandes principales utilisent une hauteur naturelle", () => {
    assert.match(
        drivingCss,
        /body\.is-driving-mode \.driving-queue-preview\s*\{[\s\S]*?height:\s*auto;[\s\S]*?max-height:\s*none;/
    );
    assert.match(
        drivingCss,
        /body\.is-driving-mode \.driving-main-controls\s*\{[\s\S]*?grid-auto-rows:\s*minmax\(112px, auto\);/
    );
    assert.match(
        drivingCss,
        /body\.is-driving-mode \.driving-control\s*\{[\s\S]*?min-height:\s*112px;/
    );
});

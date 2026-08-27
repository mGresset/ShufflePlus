import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const css = await readFile(
    new URL("../styles/feature-home.css", import.meta.url),
    "utf8"
);

test("Shuffle+ 10.1.1 centre le badge Prêt à tester", () => {
    assert.equal(version, "10.1.1");
    assert.match(css, /\.v9-home-readiness\s*\{[\s\S]*?display:\s*inline-flex;/);
    assert.match(css, /\.v9-home-readiness\s*\{[\s\S]*?align-items:\s*center;/);
    assert.match(css, /\.v9-home-readiness\s*\{[\s\S]*?justify-content:\s*center;/);
    assert.match(css, /\.v9-home-readiness\s*\{[\s\S]*?text-align:\s*center;/);
    assert.match(css, /\.v9-home-readiness\s*\{[\s\S]*?align-self:\s*center;/);
});

test("le badge mobile ne s’étire plus avec l’en-tête", () => {
    assert.match(
        css,
        /@media \(max-width: 520px\)[\s\S]*?\.v9-home-card-heading \.v9-home-readiness\s*\{[\s\S]*?align-self:\s*center;[\s\S]*?place-content:\s*center;/
    );
});

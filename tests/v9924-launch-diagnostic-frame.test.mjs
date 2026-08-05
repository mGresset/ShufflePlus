import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const styleSource = await readFile("style.css", "utf8");

function cssBlock(selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = styleSource.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
    return match?.[1] || "";
}

test("Shuffle+ 9.9.40 harmonise le cadre du diagnostic de lancement", () => {
    assert.equal(version, "9.9.40");
    assert.match(appSource, /class="launch-center-diagnostic"/);

    const block = cssBlock(".launch-center-diagnostic");
    assert.match(block, /padding:\s*14px 16px/);
    assert.match(block, /border:\s*1px solid/);
    assert.match(block, /border-radius:\s*15px/);
    assert.match(block, /background:\s*color-mix/);
});

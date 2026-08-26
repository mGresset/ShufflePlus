import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const rootUrl = new URL("../", import.meta.url);

test("Shuffle+ 9.9.49 consolide la documentation de release", async () => {
    assert.equal(version, "9.9.49");

    for (const file of ["CHANGELOG.md", "DEPLOIEMENT.md", "GUIDE-RACCOURCI.md"]) {
        await access(new URL(`../${file}`, import.meta.url));
    }

    const entries = await readdir(rootUrl);
    assert.equal(entries.some((name) => /^V\d+\.\d+\.\d+_NOTES\.md$/.test(name)), false);
    assert.equal(entries.some((name) => /^DEPLOIEMENT-V\d+\.\d+\.\d+\.md$/.test(name)), false);
    assert.equal(entries.some((name) => /^INSTALLATION-V\d+\.\d+\.\d+\.txt$/.test(name)), false);
    assert.equal(entries.some((name) => /^PATCH_MANIFEST_V\d+\.\d+\.\d+\.txt$/.test(name)), false);

    const changelog = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");
    assert.match(changelog, /^# Changelog Shuffle\+/);
    assert.match(changelog, /## 9\.9\.49/);
    assert.match(changelog, /## 9\.9\.49/);
    assert.match(changelog, /## 9\.0\.0/);
});

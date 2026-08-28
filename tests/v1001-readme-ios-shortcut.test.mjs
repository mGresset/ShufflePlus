import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const readme = fs.readFileSync(new URL("../README.md", import.meta.url), "utf8");

test("V10.2.0 README contains a self-contained iOS shortcut tutorial", () => {
    for (const required of [
        "Tutoriel rapide : créer le raccourci iPhone complet",
        "RequestId",
        "ResultToken",
        "&requestId=[RequestId]&resultToken=[ResultToken]",
        "https://shuffleplus-production.up.railway.app/v1/launch-results/[RequestId]?token=[ResultToken]",
        "Répéter 30 fois",
        "Obtenir le contenu de l’URL",
        "status",
        "Ouvrir les URL X-Callback",
        "resultServer"
    ]) {
        assert.match(readme, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
});

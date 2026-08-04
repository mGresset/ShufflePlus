import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile("app.js", "utf8");
const assistantSource = await readFile("musical-assistant.js", "utf8");

test("une nouvelle entrée dans l’assistant efface la sélection précédente", () => {
    assert.match(
        appSource,
        /normalizedMenu === "assistant"[\s\S]*activeAppMenu !== "assistant"[\s\S]*musicalAssistantSelectedExample = ""[\s\S]*musicalAssistantExamplesScrollLeft = 0/
    );
});

test("l’assistant propose une commande supplémentaire de recommandations", () => {
    assert.match(
        assistantSource,
        /"Montre mes recommandations musicales"/
    );
});

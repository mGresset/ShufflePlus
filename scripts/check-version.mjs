import { readFile } from "node:fs/promises";
import process from "node:process";

const expected = (await readFile("VERSION", "utf8")).trim();

const checks = [
    ["package.json", `\"version\": \"${expected}\"`],
    ["config.js", `version: APP_VERSION`],
    ["config.js", `const APP_VERSION = \"${expected}\"`],
    ["app.js", `const APP_VERSION = \"${expected}\"`],
    ["service-worker.js", `shuffleplus-v${expected}`],
    ["service-worker.js", `style.css?v=${expected}`],
    ["service-worker.js", `app.js?v=${expected}`],
    ["index.html", `style.css?v=${expected}`],
    ["index.html", `app.js?v=${expected}`],
    ["index.html", `shuffleplus-version\" content=\"${expected}`],
    ["index.html", `startup-recovery-${expected}.js`],
    ["service-worker.js", `startup-recovery-${expected}.js`],
    ["app.js", `service-worker.js?v=${expected}`]
];

for (const [file, expectedText] of checks) {
    const content = await readFile(file, "utf8");

    if (!content.includes(expectedText)) {
        console.error(
            `Version incohérente dans ${file} : texte absent « ${expectedText} ».`
        );
        process.exit(1);
    }
}

console.log(`Version cohérente : ${expected}.`);

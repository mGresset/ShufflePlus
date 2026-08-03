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
    ["service-worker.js", `design-system.css?v=${expected}`],
    ["service-worker.js", `app.js?v=${expected}&build=${expected}-pwa-reset-1`],
    ["service-worker.js", `bootstrap-${expected}.js`],
    ["index.html", `style.css?v=${expected}`],
    ["index.html", `design-system.css?v=${expected}`],
    ["index.html", `bootstrap-${expected}.js`],
    [`bootstrap-${expected}.js`, `const BUILD_ID = "${expected}-pwa-reset-1"`],
    [`bootstrap-${expected}.js`, "await import(`./app.js?v=${APP_VERSION}&build=${BUILD_ID}`)"],
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

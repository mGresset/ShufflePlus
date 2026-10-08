import { readFile, stat } from "node:fs/promises";
import process from "node:process";

const BUDGETS = Object.freeze({
    appLines: 51240,
    appBytes: 1_560_000,
    globalCssLines: 18550,
    globalCssBytes: 390_000,
    appStaticImports: 70
});

const [app, globalCss] = await Promise.all([
    readFile("app.js", "utf8"),
    readFile("style.css", "utf8")
]);
const [appStat, cssStat] = await Promise.all([
    stat("app.js"),
    stat("style.css")
]);

const lineCount = (source) => source.split(/\r?\n/).length;
const appLines = lineCount(app);
const globalCssLines = lineCount(globalCss);
const appStaticImports = [...app.matchAll(/(?:^|\n)\s*import\s+(?!\()([\s\S]*?)\s+from\s+["'][^"']+["'];/g)].length +
    [...app.matchAll(/(?:^|\n)\s*import\s+["'][^"']+["'];/g)].length;

const metrics = {
    appLines,
    appBytes: appStat.size,
    globalCssLines,
    globalCssBytes: cssStat.size,
    appStaticImports
};

const failures = [];
for (const [metric, maximum] of Object.entries(BUDGETS)) {
    if (metrics[metric] > maximum) {
        failures.push(`${metric}: ${metrics[metric]} > ${maximum}`);
    }
}

if (globalCss.includes(".reliability-center-panel")) {
    failures.push("le Centre de fiabilité est revenu dans style.css");
}
if (globalCss.includes(".primary-launch-reliability")) {
    failures.push("la fiabilité du lancement est revenue dans style.css");
}

if (failures.length) {
    console.error("Budget d’architecture dépassé :");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log(
    "Budget architecture valide : " +
    `app.js ${appLines} lignes / ${Math.round(appStat.size / 1024)} Kio, ` +
    `style.css ${globalCssLines} lignes / ${Math.round(cssStat.size / 1024)} Kio, ` +
    `${appStaticImports} imports statiques.`
);

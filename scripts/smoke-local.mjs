import { spawn } from "node:child_process";
import { once } from "node:events";
import process from "node:process";
import { readFile } from "node:fs/promises";

const baseUrl = "http://127.0.0.1:5500";
const version = (await readFile("VERSION", "utf8")).trim();
const server = spawn(
    process.execPath,
    ["scripts/serve-local.mjs"],
    {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"]
    }
);

let output = "";
server.stdout.setEncoding("utf8");
server.stderr.setEncoding("utf8");
server.stdout.on("data", (chunk) => {
    output += chunk;
});
server.stderr.on("data", (chunk) => {
    output += chunk;
});

async function waitForServer(timeoutMs = 5000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        if (server.exitCode !== null) {
            throw new Error(
                `Le serveur local s’est arrêté prématurément.\n${output}`
            );
        }

        try {
            const response = await fetch(`${baseUrl}/`, {
                cache: "no-store"
            });
            if (response.ok) {
                return;
            }
        } catch {
            // Le port n’est pas encore ouvert.
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(
        `Le serveur local n’a pas répondu dans le délai prévu.\n${output}`
    );
}

async function checkResource(pathname, expectedText = "") {
    const response = await fetch(`${baseUrl}${pathname}`, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(
            `${pathname} retourne HTTP ${response.status}.`
        );
    }

    if (expectedText) {
        const body = await response.text();
        if (!body.includes(expectedText)) {
            throw new Error(
                `${pathname} ne contient pas « ${expectedText} ».`
            );
        }
    }
}

try {
    await waitForServer();
    await checkResource("/", `app.js?v=${version}`);
    await checkResource("/app.js", "./core/app-menu.js");
    await checkResource("/core/app-menu.js", "APP_MENU_GROUPS");
    await checkResource("/core/html-utils.js", "escapeHtml");
    await checkResource("/core/session-recovery.js", "repairSpotifyAuthState");
    await checkResource("/startup-recovery-7.3.1.js", "ShufflePlusRecovery");
    await checkResource("/service-worker.js", `shuffleplus-v${version}`);

    console.log("Test serveur local : OK.");
} finally {
    if (server.exitCode === null) {
        server.kill("SIGTERM");
        await Promise.race([
            once(server, "exit"),
            new Promise((resolve) => setTimeout(resolve, 1000))
        ]);
    }
}

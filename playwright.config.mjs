import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.SHUFFLEPLUS_E2E_BASE_URL || "http://127.0.0.1:5500";
const isCi = Boolean(process.env.CI);

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    forbidOnly: isCi,
    retries: isCi ? 1 : 0,
    workers: isCi ? 2 : undefined,
    timeout: 30_000,
    expect: {
        timeout: 7_500
    },
    reporter: isCi
        ? [
            ["line"],
            ["html", { outputFolder: "playwright-report", open: "never" }]
        ]
        : [["list"]],
    use: {
        baseURL,
        locale: "fr-FR",
        timezoneId: "Europe/Paris",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure"
    },
    webServer: {
        command: "npm start",
        url: `${baseURL}/`,
        reuseExistingServer: !isCi,
        timeout: 30_000,
        stdout: "ignore",
        stderr: "pipe"
    },
    projects: [
        {
            name: "chromium-desktop",
            testIgnore: /pwa\.spec\.mjs/,
            use: {
                ...devices["Desktop Chrome"],
                serviceWorkers: "block"
            }
        },
        {
            name: "webkit-iphone",
            testIgnore: /pwa\.spec\.mjs/,
            use: {
                ...devices["iPhone 15 Pro"],
                serviceWorkers: "block"
            }
        },
        {
            name: "pwa-chromium",
            testMatch: /pwa\.spec\.mjs/,
            use: {
                ...devices["Desktop Chrome"],
                serviceWorkers: "allow"
            }
        }
    ]
});

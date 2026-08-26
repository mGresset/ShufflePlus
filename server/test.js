import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const port = 18000 + Math.floor(Math.random() * 1000);
const dataDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "shuffleplus-test-")
);
const child = spawn(
    process.execPath,
    ["server.js"],
    {
        cwd: new URL(".", import.meta.url),
        env: {
            ...process.env,
            PORT: String(port),
            HOST: "127.0.0.1",
            SHUFFLEPLUS_DATA_DIR: dataDir,
            SHUFFLEPLUS_ALLOWED_ORIGINS: "*"
        },
        stdio: ["ignore", "pipe", "pipe"]
    }
);

const base = `http://127.0.0.1:${port}`;
const wait = (ms) => new Promise((resolve) =>
    setTimeout(resolve, ms)
);

async function request(pathname, options = {}) {
    const response = await fetch(base + pathname, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return { response, data };
}

try {
    let ready = false;
    for (let index = 0; index < 50; index += 1) {
        try {
            const response = await fetch(base + "/health");
            if (response.ok) {
                ready = true;
                break;
            }
        } catch (error) {}
        await wait(100);
    }
    if (!ready) throw new Error("Serveur de test non démarré");

    const launchRequestId = crypto.randomUUID();
    const launchToken = crypto.randomUUID();
    const wrongLaunchToken = crypto.randomUUID();
    const launchResultPath = `/v1/launch-results/${launchRequestId}`;

    const unauthenticatedLaunch = await request(launchResultPath);
    if (unauthenticatedLaunch.response.status !== 401) {
        throw new Error("Canal de lancement accessible sans jeton");
    }

    const pendingLaunch = await request(
        `${launchResultPath}?token=${encodeURIComponent(launchToken)}`
    );
    if (
        pendingLaunch.response.status !== 202 ||
        pendingLaunch.data.status !== "pending"
    ) {
        throw new Error("Résultat de lancement authentifié en attente incorrect");
    }

    const wrongTokenLaunch = await request(
        `${launchResultPath}?token=${encodeURIComponent(wrongLaunchToken)}`
    );
    if (wrongTokenLaunch.response.status !== 403) {
        throw new Error("Un mauvais jeton de lancement n’est pas refusé");
    }

    const launchAuth = {
        Authorization: `Bearer ${launchToken}`
    };
    const runningLaunch = await request(
        launchResultPath,
        {
            method: "POST",
            headers: launchAuth,
            body: JSON.stringify({
                version: "9.9.49",
                status: "running",
                message: "Lancement en cours"
            })
        }
    );
    if (
        runningLaunch.response.status !== 202 ||
        runningLaunch.data.status !== "running"
    ) {
        throw new Error("Publication running authentifiée échouée");
    }

    const completedLaunch = await request(
        launchResultPath,
        {
            method: "POST",
            headers: launchAuth,
            body: JSON.stringify({
                version: "9.9.49",
                status: "success",
                success: true,
                device: "iPhone de test",
                message: "Lecture confirmée"
            })
        }
    );
    if (completedLaunch.response.status !== 201) {
        throw new Error("Publication du résultat final authentifié échouée");
    }

    const launchResult = await request(
        `${launchResultPath}?token=${encodeURIComponent(launchToken)}`
    );
    if (
        launchResult.response.status !== 200 ||
        launchResult.data.status !== "success" ||
        launchResult.data.device !== "iPhone de test"
    ) {
        throw new Error("Lecture du résultat final authentifié échouée");
    }

    const secret = crypto.randomBytes(32).toString("base64url");
    const rootAuthHash = crypto
        .createHash("sha256")
        .update(secret)
        .digest("hex");

    const created = await request("/v1/spaces", {
        method: "POST",
        body: JSON.stringify({
            rootAuthHash,
            installation: {
                id: "installation-test-a",
                label: "Test A"
            },
            appVersion: "5.0.0"
        })
    });
    if (created.response.status !== 201) {
        throw new Error("Création espace échouée");
    }

    const { spaceId, deviceToken } = created.data;
    const authA = {
        Authorization: `Bearer ${deviceToken}`,
        "X-ShufflePlus-Installation":
            "installation-test-a"
    };
    const envelope = {
        format: "shuffleplus-encrypted-sync-package",
        schemaVersion: 1,
        encryption: {
            algorithm: "AES-GCM",
            salt: "AA==",
            iv: "AA=="
        },
        ciphertext: "AA=="
    };
    const pushed = await request(
        `/v1/spaces/${spaceId}/state`,
        {
            method: "PUT",
            headers: authA,
            body: JSON.stringify({
                baseRevision: 0,
                envelope,
                fingerprint: "abc123",
                dataUpdatedAt:
                    new Date().toISOString(),
                sourceInstallation: {
                    id: "installation-test-a",
                    label: "Test A"
                }
            })
        }
    );
    if (pushed.data.revision !== 1) {
        throw new Error("Push révision 1 échoué");
    }

    const pulled = await request(
        `/v1/spaces/${spaceId}/state?afterRevision=0`,
        { headers: authA }
    );
    if (
        pulled.data.revision !== 1 ||
        pulled.data.fingerprint !== "abc123"
    ) {
        throw new Error("Pull échoué");
    }

    const joined = await request(
        `/v1/spaces/${spaceId}/join`,
        {
            method: "POST",
            body: JSON.stringify({
                rootAuthHash,
                installation: {
                    id: "installation-test-b",
                    label: "Test B"
                },
                appVersion: "5.0.0"
            })
        }
    );
    if (!joined.data.deviceToken) {
        throw new Error("Join échoué");
    }

    const devices = await request(
        `/v1/spaces/${spaceId}/devices`,
        { headers: authA }
    );
    if (devices.data.devices.length !== 2) {
        throw new Error("Liste appareils incorrecte");
    }

    const conflict = await request(
        `/v1/spaces/${spaceId}/state`,
        {
            method: "PUT",
            headers: authA,
            body: JSON.stringify({
                baseRevision: 0,
                envelope,
                fingerprint: "conflict"
            })
        }
    );
    if (conflict.response.status !== 409) {
        throw new Error("Conflit de révision non détecté");
    }

    const revoked = await request(
        `/v1/spaces/${spaceId}/devices/installation-test-b`,
        {
            method: "DELETE",
            headers: authA
        }
    );
    if (!revoked.data.revokedInstallationId) {
        throw new Error("Révocation échouée");
    }

    const deleted = await request(
        `/v1/spaces/${spaceId}`,
        {
            method: "DELETE",
            headers: {
                ...authA,
                "X-ShufflePlus-Root-Auth": rootAuthHash
            }
        }
    );
    if (!deleted.data.deleted) {
        throw new Error("Suppression espace échouée");
    }

    console.log("Tests serveur Shuffle+ v5.2 : OK");
} finally {
    child.kill("SIGTERM");
    await fs.rm(dataDir, {
        recursive: true,
        force: true
    });
}

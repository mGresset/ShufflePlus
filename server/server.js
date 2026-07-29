import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "5.0.0";
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8787);
const MAX_BODY_BYTES = Number(
    process.env.SHUFFLEPLUS_MAX_BODY_BYTES ||
    6 * 1024 * 1024
);
const __dirname = path.dirname(
    fileURLToPath(import.meta.url)
);
const DATA_DIR = path.resolve(
    process.env.SHUFFLEPLUS_DATA_DIR ||
    path.join(__dirname, "data")
);
const SPACES_DIR = path.join(DATA_DIR, "spaces");
const ALLOWED_ORIGINS = new Set(
    String(
        process.env.SHUFFLEPLUS_ALLOWED_ORIGINS ||
        "https://mgresset.github.io,http://localhost:8000,http://127.0.0.1:8000"
    )
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
);
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = Number(
    process.env.SHUFFLEPLUS_RATE_LIMIT || 180
);
const rateBuckets = new Map();

await fs.mkdir(SPACES_DIR, { recursive: true });

function nowIso() {
    return new Date().toISOString();
}

function randomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString("base64url");
}

function sha256(value) {
    return crypto
        .createHash("sha256")
        .update(String(value))
        .digest("hex");
}

function safeEqual(left, right) {
    const a = Buffer.from(String(left));
    const b = Buffer.from(String(right));
    return a.length === b.length &&
        crypto.timingSafeEqual(a, b);
}

function validId(value, max = 160) {
    return typeof value === "string" &&
        value.length >= 6 &&
        value.length <= max &&
        /^[A-Za-z0-9._~-]+$/.test(value);
}

function validHash(value) {
    return typeof value === "string" &&
        /^[a-f0-9]{64}$/.test(value);
}

function spaceFile(spaceId) {
    if (!validId(spaceId, 120)) {
        throw Object.assign(
            new Error("Identifiant d’espace invalide."),
            { status: 400 }
        );
    }
    return path.join(SPACES_DIR, `${spaceId}.json`);
}

async function readSpace(spaceId) {
    try {
        return JSON.parse(
            await fs.readFile(
                spaceFile(spaceId),
                "utf8"
            )
        );
    } catch (error) {
        if (error.code === "ENOENT") {
            throw Object.assign(
                new Error("Espace Shuffle+ introuvable."),
                { status: 404 }
            );
        }
        throw error;
    }
}

async function writeSpace(space) {
    const filename = spaceFile(space.id);
    const temp = `${filename}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(
        temp,
        JSON.stringify(space, null, 2),
        { mode: 0o600 }
    );
    await fs.rename(temp, filename);
}

function json(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Cache-Control": "no-store"
    });
    res.end(body);
}

function empty(res, status = 204) {
    res.writeHead(status, {
        "Cache-Control": "no-store"
    });
    res.end();
}

function applySecurityHeaders(req, res) {
    const origin = req.headers.origin || "";
    if (
        ALLOWED_ORIGINS.has("*") ||
        ALLOWED_ORIGINS.has(origin)
    ) {
        res.setHeader(
            "Access-Control-Allow-Origin",
            ALLOWED_ORIGINS.has("*") ? "*" : origin
        );
        res.setHeader("Vary", "Origin");
    }
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,DELETE,OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization,X-ShufflePlus-Installation,X-ShufflePlus-Root-Auth"
    );
    res.setHeader(
        "Access-Control-Max-Age",
        "86400"
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()"
    );
}

function checkOrigin(req) {
    const origin = req.headers.origin;
    return !origin ||
        ALLOWED_ORIGINS.has("*") ||
        ALLOWED_ORIGINS.has(origin);
}

function checkRateLimit(req) {
    const address =
        req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const current = rateBuckets.get(address);
    if (!current || now - current.startedAt > RATE_WINDOW_MS) {
        rateBuckets.set(address, {
            startedAt: now,
            count: 1
        });
        return true;
    }
    current.count += 1;
    return current.count <= RATE_MAX;
}

async function readJson(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
            throw Object.assign(
                new Error("Corps de requête trop volumineux."),
                { status: 413 }
            );
        }
        chunks.push(chunk);
    }
    if (!chunks.length) {
        return {};
    }
    try {
        return JSON.parse(
            Buffer.concat(chunks).toString("utf8")
        );
    } catch (error) {
        throw Object.assign(
            new Error("JSON invalide."),
            { status: 400 }
        );
    }
}

function normalizeInstallation(value = {}) {
    const id = String(value.id || "").slice(0, 120);
    if (!validId(id, 120)) {
        throw Object.assign(
            new Error("Installation invalide."),
            { status: 400 }
        );
    }
    return {
        id,
        label: String(value.label || "Appareil Shuffle+")
            .trim()
            .slice(0, 80),
        appVersion: String(value.appVersion || "")
            .slice(0, 40)
    };
}

function publicDevice(device) {
    return {
        installationId: device.installationId,
        label: device.label,
        appVersion: device.appVersion || "",
        createdAt: device.createdAt,
        lastSeenAt: device.lastSeenAt,
        lastPushAt: device.lastPushAt || 0
    };
}

function getBearer(req) {
    const value = req.headers.authorization || "";
    return value.startsWith("Bearer ")
        ? value.slice(7).trim()
        : "";
}

function authenticate(space, req) {
    const token = getBearer(req);
    if (!token) {
        throw Object.assign(
            new Error("Authentification requise."),
            { status: 401 }
        );
    }
    const tokenHash = sha256(token);
    const device = Object.values(space.devices || {})
        .find((item) =>
            safeEqual(item.tokenHash, tokenHash)
        );
    if (!device || device.revokedAt) {
        throw Object.assign(
            new Error("Appareil non autorisé."),
            { status: 401 }
        );
    }
    device.lastSeenAt = Date.now();
    return device;
}

function verifyRoot(space, value) {
    if (!validHash(value) ||
        !safeEqual(space.rootAuthHash, value)) {
        throw Object.assign(
            new Error("Clé racine incorrecte."),
            { status: 403 }
        );
    }
}

function validateEnvelope(value) {
    if (
        !value ||
        typeof value !== "object" ||
        value.format !==
            "shuffleplus-encrypted-sync-package" ||
        !value.encryption ||
        typeof value.ciphertext !== "string"
    ) {
        throw Object.assign(
            new Error("Enveloppe chiffrée invalide."),
            { status: 400 }
        );
    }
    return value;
}

const server = http.createServer(
    async (req, res) => {
        applySecurityHeaders(req, res);

        if (req.method === "OPTIONS") {
            if (!checkOrigin(req)) {
                return json(res, 403, {
                    error: "origin_forbidden",
                    message: "Origine non autorisée."
                });
            }
            return empty(res);
        }

        if (!checkOrigin(req)) {
            return json(res, 403, {
                error: "origin_forbidden",
                message: "Origine non autorisée."
            });
        }

        if (!checkRateLimit(req)) {
            return json(res, 429, {
                error: "rate_limited",
                message: "Trop de requêtes. Réessaie plus tard."
            });
        }

        const requestUrl = new URL(
            req.url,
            `http://${req.headers.host || "localhost"}`
        );
        const parts = requestUrl.pathname
            .split("/")
            .filter(Boolean);

        try {
            if (
                req.method === "GET" &&
                requestUrl.pathname === "/health"
            ) {
                return json(res, 200, {
                    status: "ok",
                    service: "shuffleplus-sync",
                    version: VERSION,
                    time: nowIso()
                });
            }

            if (
                req.method === "POST" &&
                requestUrl.pathname === "/v1/spaces"
            ) {
                const body = await readJson(req);
                if (!validHash(body.rootAuthHash)) {
                    throw Object.assign(
                        new Error("Empreinte racine invalide."),
                        { status: 400 }
                    );
                }
                const installation = normalizeInstallation({
                    ...body.installation,
                    appVersion: body.appVersion
                });
                const spaceId = randomToken(18);
                const deviceToken = randomToken(32);
                const now = Date.now();
                const space = {
                    schemaVersion: 1,
                    id: spaceId,
                    rootAuthHash: body.rootAuthHash,
                    createdAt: now,
                    updatedAt: now,
                    revision: 0,
                    state: null,
                    devices: {
                        [installation.id]: {
                            installationId: installation.id,
                            label: installation.label,
                            appVersion: installation.appVersion,
                            tokenHash: sha256(deviceToken),
                            createdAt: now,
                            lastSeenAt: now,
                            lastPushAt: 0,
                            revokedAt: 0
                        }
                    }
                };
                await writeSpace(space);
                return json(res, 201, {
                    spaceId,
                    deviceToken,
                    revision: 0,
                    serverTime: nowIso()
                });
            }

            if (
                parts.length === 4 &&
                parts[0] === "v1" &&
                parts[1] === "spaces" &&
                parts[3] === "join" &&
                req.method === "POST"
            ) {
                const space = await readSpace(parts[2]);
                const body = await readJson(req);
                verifyRoot(space, body.rootAuthHash);
                const installation = normalizeInstallation({
                    ...body.installation,
                    appVersion: body.appVersion
                });
                const deviceToken = randomToken(32);
                const now = Date.now();
                space.devices[installation.id] = {
                    installationId: installation.id,
                    label: installation.label,
                    appVersion: installation.appVersion,
                    tokenHash: sha256(deviceToken),
                    createdAt:
                        space.devices[installation.id]?.createdAt || now,
                    lastSeenAt: now,
                    lastPushAt:
                        space.devices[installation.id]?.lastPushAt || 0,
                    revokedAt: 0
                };
                space.updatedAt = now;
                await writeSpace(space);
                return json(res, 200, {
                    spaceId: space.id,
                    deviceToken,
                    revision: space.revision,
                    hasState: Boolean(space.state),
                    serverTime: nowIso()
                });
            }

            if (
                parts.length === 3 &&
                parts[0] === "v1" &&
                parts[1] === "spaces" &&
                req.method === "DELETE"
            ) {
                const spaceId = parts[2];
                const space = await readSpace(spaceId);
                authenticate(space, req);
                verifyRoot(
                    space,
                    req.headers[
                        "x-shuffleplus-root-auth"
                    ] || ""
                );
                await fs.unlink(spaceFile(spaceId));
                return json(res, 200, {
                    deleted: true,
                    spaceId
                });
            }

            if (
                parts.length >= 4 &&
                parts[0] === "v1" &&
                parts[1] === "spaces"
            ) {
                const spaceId = parts[2];
                const resource = parts[3];
                const space = await readSpace(spaceId);
                const device = authenticate(space, req);

                if (
                    resource === "state" &&
                    req.method === "GET"
                ) {
                    const afterRevision = Math.max(
                        0,
                        Number(
                            requestUrl.searchParams.get(
                                "afterRevision"
                            ) || 0
                        )
                    );
                    await writeSpace(space);
                    if (
                        !space.state ||
                        space.revision <= afterRevision
                    ) {
                        return empty(res);
                    }
                    return json(res, 200, {
                        revision: space.revision,
                        envelope: space.state.envelope,
                        fingerprint: space.state.fingerprint,
                        dataUpdatedAt: space.state.dataUpdatedAt,
                        updatedAt: space.state.updatedAt,
                        sourceInstallation:
                            space.state.sourceInstallation
                    });
                }

                if (
                    resource === "state" &&
                    req.method === "PUT"
                ) {
                    const body = await readJson(req);
                    const baseRevision = Math.max(
                        0,
                        Number(body.baseRevision || 0)
                    );
                    if (baseRevision !== space.revision) {
                        await writeSpace(space);
                        return json(res, 409, {
                            error: "revision_conflict",
                            message:
                                "Une révision plus récente existe sur le serveur.",
                            revision: space.revision,
                            fingerprint:
                                space.state?.fingerprint || "",
                            dataUpdatedAt:
                                space.state?.dataUpdatedAt || ""
                        });
                    }
                    const envelope = validateEnvelope(
                        body.envelope
                    );
                    const now = Date.now();
                    space.revision += 1;
                    space.updatedAt = now;
                    space.state = {
                        envelope,
                        fingerprint:
                            String(body.fingerprint || "")
                                .slice(0, 120),
                        dataUpdatedAt:
                            String(body.dataUpdatedAt || "")
                                .slice(0, 80),
                        sourceInstallation: {
                            id: String(
                                body.sourceInstallation?.id ||
                                device.installationId
                            ).slice(0, 120),
                            label: String(
                                body.sourceInstallation?.label ||
                                device.label
                            ).slice(0, 80)
                        },
                        appVersion:
                            String(body.appVersion || "")
                                .slice(0, 40),
                        updatedAt: now
                    };
                    device.lastPushAt = now;
                    await writeSpace(space);
                    return json(res, 200, {
                        revision: space.revision,
                        acceptedFingerprint:
                            space.state.fingerprint,
                        serverTime: nowIso()
                    });
                }

                if (
                    resource === "devices" &&
                    parts.length === 4 &&
                    req.method === "GET"
                ) {
                    await writeSpace(space);
                    return json(res, 200, {
                        devices: Object.values(space.devices)
                            .filter((item) => !item.revokedAt)
                            .map(publicDevice)
                            .sort(
                                (a, b) =>
                                    b.lastSeenAt - a.lastSeenAt
                            )
                    });
                }

                if (
                    resource === "devices" &&
                    parts.length === 5 &&
                    req.method === "DELETE"
                ) {
                    const targetId = parts[4];
                    const target = space.devices[targetId];
                    if (!target || target.revokedAt) {
                        throw Object.assign(
                            new Error("Appareil introuvable."),
                            { status: 404 }
                        );
                    }
                    if (targetId === device.installationId) {
                        throw Object.assign(
                            new Error(
                                "Un appareil ne peut pas se révoquer lui-même par cette route."
                            ),
                            { status: 400 }
                        );
                    }
                    target.revokedAt = Date.now();
                    space.updatedAt = Date.now();
                    await writeSpace(space);
                    return json(res, 200, {
                        revokedInstallationId: targetId
                    });
                }

            }

            return json(res, 404, {
                error: "not_found",
                message: "Route Shuffle+ inconnue."
            });
        } catch (error) {
            console.error(
                req.method,
                requestUrl.pathname,
                error
            );
            return json(
                res,
                Number(error.status || 500),
                {
                    error:
                        Number(error.status || 500) >= 500
                            ? "server_error"
                            : "request_error",
                    message:
                        Number(error.status || 500) >= 500
                            ? "Erreur interne du serveur Shuffle+."
                            : error.message
                }
            );
        }
    }
);

server.listen(PORT, HOST, () => {
    console.log(
        `Shuffle+ Sync Server v${VERSION} — http://${HOST}:${PORT}`
    );
    console.log(`Data: ${DATA_DIR}`);
});

// File sérialisée des commandes Spotify Player.
//
// Les commandes qui modifient la lecture (previous, next, seek, repeat,
// volume, transfer, play, pause, queue, shuffle) partent une par une, dans
// l’ordre d’envoi. Cela supprime les courses du type « previous puis repeat »
// ou « transfer puis play » où Spotify recevait deux requêtes simultanées.
//
// Une commande bloquée ne peut pas bloquer la file indéfiniment : après
// `commandTimeoutMs`, la file passe à la suivante (la requête réseau d’origine
// n’est pas réutilisée).

export const PLAYER_COMMAND_TIMEOUT_MS = 15000;
const MAX_HISTORY = 20;

function cleanLabel(value) {
    return String(value || "command").trim().slice(0, 60) || "command";
}

export function createSpotifyPlayerCommandQueue({
    commandTimeoutMs = PLAYER_COMMAND_TIMEOUT_MS,
    now = () => Date.now(),
    setTimer = globalThis.setTimeout,
    clearTimer = globalThis.clearTimeout
} = {}) {
    let tail = Promise.resolve();
    let pending = 0;
    let sequence = 0;
    let lastCommand = null;
    const history = [];

    function record(entry) {
        lastCommand = entry;
        history.unshift(entry);
        history.length = Math.min(history.length, MAX_HISTORY);
    }

    function enqueue(label, task, { signal = null } = {}) {
        const id = ++sequence;
        const name = cleanLabel(label);
        const enqueuedAt = now();
        pending += 1;

        const run = async () => {
            if (signal?.aborted) {
                const error = new Error("Commande Spotify annulée.");
                error.name = "AbortError";
                error.code = "LAUNCH_CANCELLED";
                throw error;
            }

            const startedAt = now();
            let timer = null;
            const timeout = new Promise((_, reject) => {
                timer = setTimer(() => {
                    const error = new Error(
                        `La commande Spotify « ${name} » n’a pas répondu à temps.`
                    );
                    error.code = "PLAYER_COMMAND_TIMEOUT";
                    reject(error);
                }, Math.max(1000, Number(commandTimeoutMs) || PLAYER_COMMAND_TIMEOUT_MS));
            });

            try {
                const result = await Promise.race([
                    Promise.resolve().then(task),
                    timeout
                ]);
                record({
                    id,
                    label: name,
                    status: "success",
                    waitedMs: startedAt - enqueuedAt,
                    durationMs: now() - startedAt,
                    at: now()
                });
                return result;
            } catch (error) {
                record({
                    id,
                    label: name,
                    status: "error",
                    code: String(error?.code || error?.status || ""),
                    waitedMs: startedAt - enqueuedAt,
                    durationMs: now() - startedAt,
                    at: now()
                });
                throw error;
            } finally {
                clearTimer(timer);
            }
        };

        const result = tail.then(run, run);
        // La file continue même si une commande échoue.
        tail = result.then(
            () => undefined,
            () => undefined
        ).finally(() => {
            pending = Math.max(0, pending - 1);
        });
        return result;
    }

    function getDiagnostics() {
        return {
            pending,
            lastCommand: lastCommand ? { ...lastCommand } : null,
            history: history.map((entry) => ({ ...entry }))
        };
    }

    return {
        enqueue,
        getDiagnostics,
        idle: () => tail
    };
}

export const spotifyPlayerCommandQueue = createSpotifyPlayerCommandQueue();

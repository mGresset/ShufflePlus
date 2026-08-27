const SAFE_PLACEHOLDER_REQUEST = "[RequestId]";
const SAFE_PLACEHOLDER_TOKEN = "[ResultToken]";

function normalizeUrl(value = "") {
    const candidate = String(value || "").trim();
    if (!candidate) return null;

    try {
        return new URL(candidate);
    } catch {
        return null;
    }
}

export function inspectLegacyShortcutUrl(value = "") {
    const url = normalizeUrl(value);

    if (!url) {
        return {
            valid: false,
            compatible: false,
            legacy: false,
            missing: ["url"],
            label: "URL invalide",
            message: "Colle l’URL Shuffle+ utilisée dans ton ancien raccourci."
        };
    }

    const hasAction = Boolean(url.searchParams.get("action"));
    const hasResultServer = Boolean(url.searchParams.get("resultServer"));
    const hasRequestId = Boolean(url.searchParams.get("requestId"));
    const hasResultToken = Boolean(url.searchParams.get("resultToken"));
    const missing = [];

    if (!hasResultServer) missing.push("resultServer");
    if (!hasRequestId) missing.push("requestId");
    if (!hasResultToken) missing.push("resultToken");

    const compatible = hasAction && missing.length === 0;
    const legacy = hasAction && hasRequestId && !hasResultToken;

    return {
        valid: hasAction,
        compatible,
        legacy,
        missing,
        label: compatible
            ? "Compatible V10.1"
            : legacy
                ? "Ancien raccourci détecté"
                : "Mise à jour nécessaire",
        message: compatible
            ? "Cette URL contient resultServer, requestId et resultToken."
            : legacy
                ? "Conserve ton raccourci et ajoute simplement un second UUID ResultToken aux deux URL."
                : `Élément(s) manquant(s) : ${missing.join(", ") || "action Shuffle+"}.`
    };
}

export function buildShortcutResultUrlTemplate(serverUrl = "") {
    const normalized = normalizeUrl(serverUrl);
    if (!normalized) return "";

    normalized.pathname = normalized.pathname.replace(/\/+$/, "");
    normalized.search = "";
    normalized.hash = "";

    return `${normalized.toString().replace(/\/$/, "")}/v1/launch-results/${SAFE_PLACEHOLDER_REQUEST}?token=${SAFE_PLACEHOLDER_TOKEN}`;
}

export function buildShortcutLaunchSuffixTemplate() {
    return `&requestId=${SAFE_PLACEHOLDER_REQUEST}&resultToken=${SAFE_PLACEHOLDER_TOKEN}`;
}

export function buildShortcutMigrationGuide({
    launchUrl = "",
    serverUrl = ""
} = {}) {
    const resultUrl = buildShortcutResultUrlTemplate(serverUrl);
    const suffix = buildShortcutLaunchSuffixTemplate();
    const cleanLaunchUrl = String(launchUrl || "").trim();

    return [
        "Migration Shuffle+ V10.1 — ancien raccourci iPhone",
        "",
        "1. Garde ton UUID actuel et renomme sa variable RequestId.",
        "2. Ajoute juste après un deuxième bloc ‘Générer un UUID’ et renomme-le ResultToken.",
        "3. Remplace l’ancienne URL Shuffle+ par l’URL V10.1 ci-dessous.",
        cleanLaunchUrl || "[Copie l’URL depuis le Centre de commandes iOS]",
        "4. À la fin de cette URL, ajoute :",
        suffix,
        "5. Garde ‘Ouvrir Spotify’, attends 2 secondes puis utilise ‘Ouvrir les URL’ (pas X-Callback).",
        "6. Remplace l’URL de résultat Railway par :",
        resultUrl || "[Configure d’abord Railway dans Réglages > Synchronisation serveur]",
        "7. Garde ta boucle de vérification et utilise 30 répétitions avec 1 seconde d’attente.",
        "",
        "Important : [RequestId] et [ResultToken] sont des variables magiques iOS, pas du texte à saisir avec les crochets."
    ].join("\n");
}

export function getShortcutCompatibilityState({
    commandCount = 0,
    serverUrl = "",
    successfulRuns = 0
} = {}) {
    const commands = Math.max(0, Number(commandCount) || 0);
    const serverReady = Boolean(buildShortcutResultUrlTemplate(serverUrl));
    const successes = Math.max(0, Number(successfulRuns) || 0);

    if (!commands) {
        return {
            level: "neutral",
            value: "Non configuré",
            detail: "Crée au moins un profil dans le Centre de commandes iOS."
        };
    }

    if (!serverReady) {
        return {
            level: "attention",
            value: "Railway requis",
            detail: "Les profils existent, mais le canal de résultat sécurisé n’est pas configuré."
        };
    }

    if (!successes) {
        return {
            level: "attention",
            value: "Prêt à tester",
            detail: "Le format V10.1 est disponible ; effectue un lancement réel pour le valider."
        };
    }

    return {
        level: "healthy",
        value: "Compatible V10.1",
        detail: `${successes} lancement(s) iOS confirmé(s) dans l’historique local.`
    };
}

import { escapeHtml } from "./html-utils.js";

export function renderShortcutMigrationPanelMarkup({
    launchUrl = "",
    serverUrl = "",
    inspection = null
} = {}) {
    const resultTemplate = buildShortcutResultUrlTemplate(serverUrl);
    const suffix = buildShortcutLaunchSuffixTemplate();
    const state = inspection || {
        valid: false,
        compatible: false,
        legacy: false,
        label: "Vérifier un ancien raccourci",
        message: "Colle son URL Shuffle+ pour savoir exactement ce qu’il faut modifier."
    };
    const stateClass = state.compatible
        ? "is-ready"
        : state.legacy
            ? "is-legacy"
            : "is-neutral";

    return `
        <section class="ios-shortcut-migration-panel">
            <div class="ios-shortcut-migration-heading">
                <div>
                    <span>🧭 Migration V10.1</span>
                    <strong>Mettre à jour un ancien raccourci sans le refaire</strong>
                    <small>
                        Ajoute un deuxième UUID <code>ResultToken</code>, puis utilise-le dans l’URL Shuffle+ et dans l’URL Railway.
                    </small>
                </div>
                <span class="ios-shortcut-migration-badge ${stateClass}">
                    ${escapeHtml(state.label)}
                </span>
            </div>

            <ol class="ios-shortcut-migration-steps">
                <li><b>1</b><span>Garde ton UUID actuel comme <strong>RequestId</strong>.</span></li>
                <li><b>2</b><span>Ajoute <strong>Générer un UUID</strong> juste après et nomme-le <strong>ResultToken</strong>.</span></li>
                <li><b>3</b><span>À la fin de l’URL Shuffle+, ajoute <code>${escapeHtml(suffix)}</code>.</span></li>
                <li><b>4</b><span>Utilise l’URL résultat <code>${escapeHtml(resultTemplate || "Configure Railway pour générer cette URL")}</code>.</span></li>
            </ol>

            <div class="ios-shortcut-migration-actions">
                <button type="button" data-ios-migration-action="copy-launch" ${launchUrl ? "" : "disabled"}>
                    🔗 Copier l’URL V10.1
                </button>
                <button type="button" data-ios-migration-action="copy-guide">
                    📋 Copier le guide de migration
                </button>
                <button type="button" data-ios-migration-action="copy-result" ${resultTemplate ? "" : "disabled"}>
                    ☁️ Copier l’URL Railway
                </button>
            </div>

            <label class="ios-shortcut-migration-check">
                <span>Vérifier l’URL d’un ancien raccourci</span>
                <div>
                    <input
                        id="legacyShortcutUrlInput"
                        type="url"
                        inputmode="url"
                        autocomplete="off"
                        placeholder="https://…?action=quickplay&requestId=…"
                    >
                    <button type="button" data-ios-migration-action="inspect">Analyser</button>
                </div>
                <small class="${stateClass}">${escapeHtml(state.message)}</small>
            </label>
        </section>
    `;
}

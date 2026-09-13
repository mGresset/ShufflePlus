import { escapeHtml } from "./html-utils.js";

export function buildIosShortcutAssistantGuide({
    commandName = "Profil principal",
    launchUrl = "",
    resultUrl = ""
} = {}) {
    return [
        `Shuffle+ — raccourci iPhone « ${String(commandName || "Profil principal").trim()} »`,
        "",
        "1. Continuer le raccourci dans l’app.",
        "2. Générer un UUID → variable magique RequestId.",
        "3. Générer un deuxième UUID → variable magique ResultToken.",
        "4. Ajouter une action Texte avec l’URL Shuffle+ :",
        String(launchUrl || "[Copie l’URL depuis Shuffle+]").trim(),
        "   puis ajouter &requestId=[RequestId]&resultToken=[ResultToken].",
        "5. Ouvrir l’app Spotify.",
        "6. Attendre 2 secondes.",
        "7. Ouvrir les URL → le texte Shuffle+ construit à l’étape 4.",
        "8. Ajouter une action Texte avec l’URL de résultat :",
        String(resultUrl || "[Configure Railway pour générer cette URL]").trim(),
        "9. Répéter 30 fois : GET ResultUrl → lire la clé status → arrêter sur success, error ou cancel ; sinon attendre 1 seconde.",
        "",
        "Important : RequestId et ResultToken sont des variables magiques iOS, pas du texte entre crochets."
    ].join("\n");
}

export function getIosShortcutAssistantState({
    commandName = "",
    launchUrl = "",
    resultUrl = "",
    successfulRuns = 0
} = {}) {
    if (!commandName || !launchUrl) {
        return {
            level: "neutral",
            label: "À configurer",
            detail: "Crée d’abord un profil de lancement iOS."
        };
    }

    if (!resultUrl) {
        return {
            level: "attention",
            label: "Railway requis",
            detail: "Le profil existe, mais le canal de résultat sécurisé n’est pas encore prêt."
        };
    }

    if (Number(successfulRuns || 0) <= 0) {
        return {
            level: "attention",
            label: "Prêt à tester",
            detail: "La configuration est complète. Lance un test réel depuis l’iPhone."
        };
    }

    return {
        level: "healthy",
        label: "Validé sur iPhone",
        detail: `${Number(successfulRuns)} lancement(s) confirmé(s) localement.`
    };
}

export function renderIosShortcutAssistantMarkup({
    commandName = "",
    launchUrl = "",
    resultUrl = "",
    successfulRuns = 0
} = {}) {
    const state = getIosShortcutAssistantState({
        commandName,
        launchUrl,
        resultUrl,
        successfulRuns
    });

    return `
        <section class="ios-shortcut-assistant-panel">
            <div class="ios-shortcut-assistant-heading">
                <div>
                    <span>📱 Assistant Raccourcis</span>
                    <strong>Créer ou vérifier ton raccourci iPhone</strong>
                    <small>
                        Shuffle+ prépare les deux URL et les étapes exactes. Tu gardes la main dans l’app Raccourcis.
                    </small>
                </div>
                <span class="ios-shortcut-assistant-state is-${escapeHtml(state.level)}">
                    ${escapeHtml(state.label)}
                </span>
            </div>
            <p class="ios-shortcut-assistant-detail">${escapeHtml(state.detail)}</p>
            <div class="ios-shortcut-assistant-actions">
                <button type="button" data-ios-assistant-action="copy-guide" ${launchUrl ? "" : "disabled"}>
                    📋 Copier toutes les étapes
                </button>
                <button type="button" data-ios-assistant-action="copy-launch" ${launchUrl ? "" : "disabled"}>
                    🔗 Copier l’URL Shuffle+
                </button>
                <button type="button" data-ios-assistant-action="copy-result" ${resultUrl ? "" : "disabled"}>
                    ☁️ Copier l’URL Railway
                </button>
                <button type="button" data-ios-assistant-action="test" ${commandName ? "" : "disabled"}>
                    ▶ Tester ce profil
                </button>
            </div>
        </section>
    `;
}

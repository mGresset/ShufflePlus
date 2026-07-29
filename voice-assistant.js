export const DEFAULT_VOICE_ASSISTANT_SETTINGS = {
    language: "fr-FR",
    voiceResponses: true,
    vibration: true,
    confirmBeforeAction: true,
    autoExecuteStatus: true,
    compactListening: true,
    updatedAt: 0
};

const ALLOWED_LANGUAGES = new Set([
    "fr-FR",
    "fr-CA",
    "fr-BE",
    "fr-CH"
]);

export function normalizeVoiceAssistantSettings(
    value = DEFAULT_VOICE_ASSISTANT_SETTINGS
) {
    const source =
        value && typeof value === "object"
            ? value
            : DEFAULT_VOICE_ASSISTANT_SETTINGS;

    return {
        language: ALLOWED_LANGUAGES.has(source.language)
            ? source.language
            : DEFAULT_VOICE_ASSISTANT_SETTINGS.language,
        voiceResponses:
            source.voiceResponses !== false,
        vibration:
            source.vibration !== false,
        confirmBeforeAction:
            source.confirmBeforeAction !== false,
        autoExecuteStatus:
            source.autoExecuteStatus !== false,
        compactListening:
            source.compactListening !== false,
        updatedAt: Number(source.updatedAt || 0)
    };
}

export function getVoiceRecognitionErrorMessage(
    errorCode = ""
) {
    const code = String(errorCode || "").toLowerCase();

    if (code === "not-allowed" || code === "service-not-allowed") {
        return "Autorise l’accès au microphone pour utiliser l’assistant vocal.";
    }

    if (code === "audio-capture") {
        return "Aucun microphone utilisable n’a été détecté.";
    }

    if (code === "no-speech") {
        return "Aucune parole n’a été détectée. Réessaie en parlant près du téléphone.";
    }

    if (code === "network") {
        return "La reconnaissance vocale du navigateur est momentanément indisponible.";
    }

    if (code === "aborted") {
        return "Écoute vocale arrêtée.";
    }

    return code
        ? `Reconnaissance vocale interrompue : ${code}.`
        : "La reconnaissance vocale a été interrompue.";
}

export function isSensitiveVoicePlan(plan = null) {
    return Boolean(
        plan?.ready &&
        [
            "launch-scene",
            "launch-mix",
            "transition",
            "schedule-scene",
            "schedule-mix",
            "configure-scene"
        ].includes(plan.type)
    );
}

export function buildVoicePlanAnnouncement(
    plan = null,
    { confirmationRequired = true } = {}
) {
    if (!plan) {
        return "Je n’ai pas compris la demande.";
    }

    if (!plan.ready) {
        return plan.warning ||
            "La demande doit être précisée.";
    }

    const summary = String(
        plan.summary || plan.title || "Commande reconnue"
    ).replace(/\s+/g, " ").trim();

    if (
        confirmationRequired &&
        isSensitiveVoicePlan(plan)
    ) {
        return `${summary}. Confirme la commande à l’écran.`;
    }

    return summary;
}

export function buildVoiceExecutionAnnouncement(
    plan = null,
    { success = true, message = "" } = {}
) {
    if (!success) {
        return message || "La commande n’a pas pu être exécutée.";
    }

    if (plan?.type === "status") {
        const details = Array.isArray(plan.details)
            ? plan.details.join(". ")
            : "";
        return [plan.summary, details]
            .filter(Boolean)
            .join(". ");
    }

    return message ||
        `${plan?.title || "Commande musicale"} exécutée.`;
}

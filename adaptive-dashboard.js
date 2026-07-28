/*
 Shuffle+ v3.3.3 — Adaptive DJ Dashboard
 Couche interface : état courant, simulation et historique.
*/

export function getAdaptiveStatus(context) {
    return {
        context: context?.name || "Adaptatif",
        hour: new Date().getHours(),
        active: true
    };
}

export function createAdaptiveHistoryEntry(context, mixName) {
    return {
        date: new Date().toISOString(),
        context: context?.name || "Adaptatif",
        mix: mixName || "Aucun mix"
    };
}

export function simulateAdaptiveContext(id) {
    return {
        id,
        name: id,
        simulated: true
    };
}
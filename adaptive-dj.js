/**
 * Shuffle+ v3.4.0 Adaptive DJ
 * Sélecteur de contexte musical.
 */

export const ADAPTIVE_SLOTS = [
    { id: "morning", label: "🌅 Morning", start: 6, end: 10 },
    { id: "focus", label: "🎯 Focus", start: 10, end: 17 },
    { id: "drive", label: "🚗 Trajet", start: 17, end: 21 },
    { id: "evening", label: "🎉 Soirée", start: 21, end: 24 },
    { id: "night", label: "🌙 Nuit", start: 0, end: 6 }
];

export function getAdaptiveSlot(date = new Date()) {
    const hour = date.getHours();

    return ADAPTIVE_SLOTS.find(slot => {
        if (slot.start < slot.end) {
            return hour >= slot.start && hour < slot.end;
        }
        return hour >= slot.start || hour < slot.end;
    }) || ADAPTIVE_SLOTS[0];
}

export function getAdaptiveDecision(options = {}) {
    const forced = options.mood;
    const slot = getAdaptiveSlot();

    return {
        slotId: slot.id,
        slotLabel: slot.label,
        mood: forced || slot.id,
        weekend: [0, 6].includes(new Date().getDay())
    };
}
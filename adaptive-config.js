/*
 Shuffle+ v3.3.2 — Adaptive DJ Interface data layer
*/

export const DEFAULT_ADAPTIVE_SLOTS = [
  { id:"morning", name:"🌅 Morning", start:6, end:10, mixId:"" },
  { id:"focus", name:"🎯 Focus", start:10, end:17, mixId:"" },
  { id:"drive", name:"🚗 Trajet", start:17, end:21, mixId:"" },
  { id:"evening", name:"🎉 Soirée", start:21, end:24, mixId:"" },
  { id:"night", name:"🌙 Nuit", start:0, end:6, mixId:"" }
];

const KEY = "shuffleplus_adaptive_dj_config_v1";

export function loadAdaptiveConfig() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(value) ? value : structuredClone(DEFAULT_ADAPTIVE_SLOTS);
  } catch {
    return structuredClone(DEFAULT_ADAPTIVE_SLOTS);
  }
}

export function saveAdaptiveConfig(config) {
  localStorage.setItem(KEY, JSON.stringify(config));
}

export function resolveAdaptiveMix(config, date = new Date()) {
  const hour = date.getHours();
  return config.find(slot =>
    slot.start < slot.end
      ? hour >= slot.start && hour < slot.end
      : hour >= slot.start || hour < slot.end
  ) || null;
}
export const USAGE_PROFILES = [
    {
        id: "daily",
        icon: "🏠",
        label: "Quotidien",
        shortLabel: "Quotidien",
        description: "La configuration équilibrée pour utiliser Shuffle+ tous les jours.",
        startMenu: "dashboard",
        sceneId: "",
        accent: "violet",
        discoveryLevel: 35,
        autoplay: true,
        keepScreenAwake: false,
        autoRefresh: true,
        highlights: [
            "Accueil comme point de départ",
            "Recommandations équilibrées",
            "Toutes les fonctions restent accessibles"
        ]
    },
    {
        id: "drive",
        icon: "🚗",
        label: "Conduite",
        shortLabel: "Conduite",
        description: "Une interface simple, de gros boutons et la scène Conduite prête à lancer.",
        startMenu: "driving",
        sceneId: "drive",
        accent: "blue",
        discoveryLevel: 18,
        autoplay: true,
        keepScreenAwake: true,
        autoRefresh: true,
        highlights: [
            "Mode voiture sur une seule page",
            "Maintien de l’écran demandé",
            "Peu de découverte pendant le trajet"
        ]
    },
    {
        id: "sport",
        icon: "🏋️",
        label: "Sport",
        shortLabel: "Sport",
        description: "Une ambiance énergique avec accès direct à la scène Sport.",
        startMenu: "adaptive",
        sceneId: "sport",
        accent: "orange",
        discoveryLevel: 22,
        autoplay: true,
        keepScreenAwake: false,
        autoRefresh: true,
        highlights: [
            "Scène Sport sélectionnée",
            "Lecture automatique activée",
            "Accent orange dynamique"
        ]
    },
    {
        id: "evening",
        icon: "🌆",
        label: "Soirée",
        shortLabel: "Soirée",
        description: "Une configuration festive pour préparer ou lancer la scène Party.",
        startMenu: "adaptive",
        sceneId: "party",
        accent: "pink",
        discoveryLevel: 42,
        autoplay: true,
        keepScreenAwake: false,
        autoRefresh: true,
        highlights: [
            "Scène Party sélectionnée",
            "Découverte modérée",
            "Ambiance rose et violette"
        ]
    },
    {
        id: "discovery",
        icon: "🧭",
        label: "Découverte",
        shortLabel: "Découverte",
        description: "Des propositions plus variées pour sortir de tes habitudes.",
        startMenu: "recommendations",
        sceneId: "",
        accent: "emerald",
        discoveryLevel: 85,
        autoplay: false,
        keepScreenAwake: false,
        autoRefresh: true,
        highlights: [
            "Niveau de découverte élevé",
            "Ouverture directe de Pour toi",
            "Préparation avant lecture automatique"
        ]
    }
];

export const DEFAULT_USAGE_PROFILE_STATE = {
    activeProfileId: "daily",
    applyTheme: true,
    applyDiscovery: true,
    applyDrivingSettings: true,
    selectPreferredScene: true,
    updatedAt: 0
};

export function getUsageProfileById(profileId = "") {
    return USAGE_PROFILES.find((profile) => profile.id === profileId) || USAGE_PROFILES[0];
}

export function normalizeUsageProfileState(value = DEFAULT_USAGE_PROFILE_STATE) {
    const source = value && typeof value === "object" ? value : DEFAULT_USAGE_PROFILE_STATE;
    const activeProfileId = USAGE_PROFILES.some((profile) => profile.id === source.activeProfileId)
        ? source.activeProfileId
        : "daily";
    return {
        activeProfileId,
        applyTheme: source.applyTheme !== false,
        applyDiscovery: source.applyDiscovery !== false,
        applyDrivingSettings: source.applyDrivingSettings !== false,
        selectPreferredScene: source.selectPreferredScene !== false,
        updatedAt: Math.max(0, Number(source.updatedAt || 0))
    };
}

export function buildUsageProfileApplication(profileId = "", state = DEFAULT_USAGE_PROFILE_STATE) {
    const profile = getUsageProfileById(profileId);
    const settings = normalizeUsageProfileState(state);
    return {
        profile,
        nextState: normalizeUsageProfileState({
            ...settings,
            activeProfileId: profile.id,
            updatedAt: Date.now()
        }),
        actions: {
            menu: profile.startMenu,
            sceneId: settings.selectPreferredScene ? profile.sceneId : "",
            accent: settings.applyTheme ? profile.accent : "",
            discoveryLevel: settings.applyDiscovery ? profile.discoveryLevel : null,
            autoplay: profile.autoplay,
            keepScreenAwake: settings.applyDrivingSettings ? profile.keepScreenAwake : null,
            autoRefresh: settings.applyDrivingSettings ? profile.autoRefresh : null
        }
    };
}

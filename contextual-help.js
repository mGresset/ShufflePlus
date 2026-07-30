export const DEFAULT_CONTEXTUAL_HELP_STATE = {
    tourEnabled: true,
    tourCompleted: false,
    hintsEnabled: true,
    currentStep: 0,
    seenSections: [],
    updatedAt: 0
};

const SECTION_ORDER = [
    "dashboard",
    "music",
    "mixes",
    "adaptive",
    "assistant",
    "recommendations",
    "statistics",
    "goals",
    "intelligence",
    "quick",
    "driving",
    "guide",
    "settings"
];

const SECTION_HELP = {
    dashboard: {
        icon: "🏠",
        title: "Accueil",
        summary: "La vue d’ensemble de Shuffle+.",
        detail: "Tu y retrouves la lecture Spotify, la recommandation du moment, la scène active, la prochaine routine et un résumé de ton activité.",
        tips: [
            "Utilise les cartes comme des raccourcis.",
            "Le score de préparation indique ce qu’il reste à configurer."
        ]
    },
    music: {
        icon: "🎵",
        title: "Ma musique",
        summary: "Choisir les playlists qui serviront de sources.",
        detail: "Coche une ou plusieurs playlists, ou tes morceaux aimés. Ces sources serviront ensuite à construire un mix Shuffle+.",
        tips: [
            "Le tri par défaut affiche les playlists modifiées récemment.",
            "Une playlist grisée reste visible mais son contenu peut être inaccessible à Shuffle+."
        ]
    },
    mixes: {
        icon: "🔀",
        title: "Mix & iOS",
        summary: "Créer et enregistrer tes combinaisons musicales.",
        detail: "Un mix rassemble plusieurs sources avec un profil de mélange. Tu peux ensuite le lancer, le programmer ou créer un raccourci iOS.",
        tips: [
            "Commence avec deux ou trois sources faciles à reconnaître.",
            "Enregistre le mix avant de l’associer à une scène."
        ]
    },
    adaptive: {
        icon: "🤖",
        title: "Adaptive DJ",
        summary: "Associer le bon mix au bon contexte.",
        detail: "Relie tes mix à des scènes comme Conduite, Focus, Chill, Sport ou Party. Shuffle+ peut ensuite préparer automatiquement l’ambiance adaptée.",
        tips: [
            "Une scène doit avoir un mix associé pour être lancée.",
            "Énergie, variété et découverte peuvent être réglées séparément."
        ]
    },
    assistant: {
        icon: "✨",
        title: "Assistant",
        summary: "Commander Shuffle+ avec une phrase.",
        detail: "Écris ou dicte une demande simple, par exemple « Lance Conduite », « Recommande-moi quelque chose » ou « Montre mes statistiques ».",
        tips: [
            "Lis le plan proposé avant de confirmer une action importante.",
            "La reconnaissance vocale dépend des possibilités du navigateur."
        ]
    },
    recommendations: {
        icon: "💜",
        title: "Pour toi",
        summary: "Recevoir des suggestions adaptées au moment.",
        detail: "Shuffle+ utilise localement l’heure, tes mix, tes scènes et tes retours pour classer les meilleures suggestions disponibles.",
        tips: [
            "Utilise 👍 ou 👎 pour améliorer les prochains choix.",
            "Le niveau de découverte règle l’équilibre entre habitudes et nouveauté."
        ]
    },
    statistics: {
        icon: "📊",
        title: "Statistiques",
        summary: "Comprendre ton activité musicale.",
        detail: "Cette page résume les sessions lancées, les titres, les périodes d’écoute et les confirmations enregistrées dans Shuffle+.",
        tips: [
            "Un lancement envoyé à Spotify n’est pas forcément une écoute complète.",
            "Change la période pour comparer 7, 30 ou 90 jours."
        ]
    },
    goals: {
        icon: "🏆",
        title: "Objectifs",
        summary: "Suivre une progression hebdomadaire simple.",
        detail: "Définis quelques objectifs réalistes, observe les barres de progression et débloque des badges au fil de la semaine.",
        tips: [
            "Les compteurs repartent chaque lundi.",
            "Choisis des objectifs modestes au début."
        ]
    },
    intelligence: {
        icon: "🧠",
        title: "Intelligence",
        summary: "Voir les habitudes détectées par Shuffle+.",
        detail: "Cette rubrique montre les observations locales, les propositions d’adaptation et l’historique des décisions automatiques.",
        tips: [
            "Les propositions deviennent plus utiles après plusieurs sessions.",
            "Tu gardes toujours la possibilité d’accepter ou de refuser."
        ]
    },
    quick: {
        icon: "⚡",
        title: "Rapide",
        summary: "Accéder aux commandes essentielles.",
        detail: "Pause, reprise, titre suivant, retours musicaux et contextes rapides sont réunis dans une interface compacte.",
        tips: [
            "Utilise cette page lorsque tu veux agir sans parcourir les réglages.",
            "Les commandes nécessitent un appareil Spotify disponible."
        ]
    },
    driving: {
        icon: "🚗",
        title: "Conduite",
        summary: "Utiliser de gros boutons pendant un trajet.",
        detail: "Le mode voiture simplifie l’écran pour limiter les manipulations. Il affiche uniquement les commandes utiles et l’état réel du maintien de l’écran.",
        tips: [
            "Configure la scène Conduite avant le départ.",
            "N’utilise les commandes que lorsque les conditions sont sûres."
        ]
    },
    guide: {
        icon: "📖",
        title: "Guide",
        summary: "Retrouver les explications simples de l’application.",
        detail: "Le Guide présente chaque rubrique, le parcours conseillé et le vocabulaire essentiel. Le README reste disponible pour les détails techniques.",
        tips: [
            "Reviens ici lorsqu’une fonction n’est pas claire.",
            "Utilise le README pour le déploiement et les réglages avancés."
        ]
    },
    settings: {
        icon: "⚙️",
        title: "Réglages",
        summary: "Personnaliser et protéger les données de Shuffle+.",
        detail: "Tu peux changer le thème, gérer les règles de mélange, sauvegarder les données, configurer la synchronisation et rechercher les mises à jour.",
        tips: [
            "Exporte régulièrement une sauvegarde JSON.",
            "La visite guidée peut être relancée depuis cette page."
        ]
    }
};

function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

export function normalizeContextualHelpState(
    value = DEFAULT_CONTEXTUAL_HELP_STATE
) {
    const source = value && typeof value === "object"
        ? value
        : DEFAULT_CONTEXTUAL_HELP_STATE;
    const seenSections = Array.isArray(source.seenSections)
        ? [...new Set(source.seenSections
            .map((item) => String(item || ""))
            .filter((item) => SECTION_ORDER.includes(item)))]
        : [];

    return {
        tourEnabled: source.tourEnabled !== false,
        tourCompleted: source.tourCompleted === true,
        hintsEnabled: source.hintsEnabled !== false,
        currentStep: clamp(source.currentStep || 0, 0, 5),
        seenSections,
        updatedAt: Math.max(0, Number(source.updatedAt || 0))
    };
}

function buildDynamicTip(menuId, context = {}) {
    const mixCount = Math.max(0, Number(context.mixCount || 0));
    const selectedSourceCount = Math.max(0, Number(context.selectedSourceCount || 0));
    const configuredSceneCount = Math.max(0, Number(context.configuredSceneCount || 0));
    const sessionCount = Math.max(0, Number(context.sessionCount || 0));
    const observationCount = Math.max(0, Number(context.observationCount || 0));

    if (menuId === "dashboard") {
        return mixCount
            ? "Consulte ici ce qui est prêt à lancer maintenant."
            : "Commence par choisir des sources dans Ma musique.";
    }
    if (menuId === "music") {
        return selectedSourceCount
            ? `${selectedSourceCount} source(s) sélectionnée(s) : passe ensuite dans Mix & iOS.`
            : "Commence ici : coche deux ou trois playlists que tu aimes.";
    }
    if (menuId === "mixes") {
        return mixCount
            ? `${mixCount} mix enregistré(s) : tu peux maintenant créer une scène.`
            : "Crée ton premier mix à partir des sources sélectionnées.";
    }
    if (menuId === "adaptive") {
        return configuredSceneCount
            ? `${configuredSceneCount} scène(s) prête(s) à être lancée(s).`
            : "Associe un mix à Conduite, Chill ou une autre scène.";
    }
    if (["statistics", "goals"].includes(menuId)) {
        return sessionCount
            ? `${sessionCount} session(s) disponible(s) pour construire ce bilan.`
            : "Lance quelques sessions : les informations apparaîtront progressivement.";
    }
    if (menuId === "intelligence") {
        return observationCount
            ? `${observationCount} observation(s) locale(s) analysée(s).`
            : "Shuffle+ a besoin de quelques utilisations avant de proposer des tendances.";
    }
    if (menuId === "recommendations" && !mixCount) {
        return "Enregistre d’abord un mix pour obtenir des suggestions utiles.";
    }
    if (menuId === "settings") {
        return "Retrouve ici la visite guidée, les sauvegardes et les réglages avancés.";
    }
    return "Appuie sur le bouton ? pour une explication simple de cette rubrique.";
}

export function getContextualHelpSection(menuId = "dashboard", context = {}) {
    const resolvedId = SECTION_HELP[menuId] ? menuId : "dashboard";
    const base = SECTION_HELP[resolvedId];
    const seenSections = Array.isArray(context.seenSections)
        ? context.seenSections
        : [];

    return {
        id: resolvedId,
        ...base,
        level: seenSections.includes(resolvedId)
            ? "Conseil rapide"
            : "Commence ici",
        tip: buildDynamicTip(resolvedId, context)
    };
}

export function getContextualOnboardingSteps(context = {}) {
    const mixCount = Math.max(0, Number(context.mixCount || 0));
    const configuredSceneCount = Math.max(0, Number(context.configuredSceneCount || 0));

    return [
        {
            id: "welcome",
            menuId: "dashboard",
            icon: "👋",
            title: "Bienvenue dans Shuffle+",
            text: "Cette visite montre le parcours essentiel sans entrer dans les réglages techniques.",
            action: "Découvrir Ma musique"
        },
        {
            id: "sources",
            menuId: "music",
            icon: "🎵",
            title: "1. Choisis tes sources",
            text: "Coche quelques playlists ou tes morceaux aimés. Elles serviront de base à ton premier mix.",
            action: "Voir Mix & iOS"
        },
        {
            id: "mix",
            menuId: "mixes",
            icon: "🔀",
            title: "2. Crée un mix",
            text: mixCount
                ? `Tu as déjà ${mixCount} mix enregistré(s). Tu peux le modifier ou en créer un autre.`
                : "Combine les sources choisies, sélectionne un profil et enregistre le résultat.",
            action: "Voir Adaptive DJ"
        },
        {
            id: "scene",
            menuId: "adaptive",
            icon: "🤖",
            title: "3. Prépare une scène",
            text: configuredSceneCount
                ? `${configuredSceneCount} scène(s) sont déjà configurée(s).`
                : "Associe ton mix à un contexte comme Conduite, Chill, Sport ou Party.",
            action: "Voir les commandes rapides"
        },
        {
            id: "launch",
            menuId: "quick",
            icon: "⚡",
            title: "4. Lance en un geste",
            text: "Utilise Rapide, Accueil, Conduite, l’Assistant ou un raccourci iOS pour démarrer sans refaire les réglages.",
            action: "Terminer la visite"
        },
        {
            id: "done",
            menuId: "dashboard",
            icon: "✅",
            title: "Tu connais l’essentiel",
            text: "Le bouton ? reste disponible dans chaque rubrique. Le Guide et le README permettent ensuite d’aller plus loin.",
            action: "Ouvrir l’Accueil"
        }
    ];
}

export function getContextualHelpProgress(state = DEFAULT_CONTEXTUAL_HELP_STATE) {
    const normalized = normalizeContextualHelpState(state);
    const total = SECTION_ORDER.length;
    const visited = normalized.seenSections.length;
    return {
        visited,
        total,
        percent: Math.round(visited / total * 100)
    };
}

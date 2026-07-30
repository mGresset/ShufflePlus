const SCENE_ALIASES = {
    morning: [
        "matin", "matinale", "reveil", "réveil", "morning", "boost"
    ],
    focus: [
        "focus", "travail", "bureau", "concentration", "etudier", "étudier"
    ],
    chill: [
        "chill", "calme", "detente", "détente", "relax", "nuit", "soir calme"
    ],
    drive: [
        "drive", "conduite", "voiture", "route", "trajet"
    ],
    sport: [
        "sport", "workout", "entrainement", "entraînement", "gym", "course"
    ],
    party: [
        "party", "soiree", "soirée", "fete", "fête", "apero", "apéro"
    ]
};

const DAY_ALIASES = {
    1: ["lundi", "lun"],
    2: ["mardi", "mar"],
    3: ["mercredi", "mer"],
    4: ["jeudi", "jeu"],
    5: ["vendredi", "ven"],
    6: ["samedi", "sam"],
    0: ["dimanche", "dim"]
};

export const MUSICAL_ASSISTANT_EXAMPLES = [
    "Lance la scène Conduite",
    "Prépare Chill sans lancer Spotify",
    "Fais une transition vers Party sur 8 morceaux",
    "Programme Focus tous les jours à 9h",
    "Programme Sport du lundi au vendredi à 18h30",
    "Mets l’énergie de Conduite à 78 et la découverte à 20",
    "Recommande-moi quelque chose maintenant",
    "Montre mes statistiques d’écoute",
    "Ouvre mon tableau de bord musical",
    "Montre mes objectifs musicaux",
    "Ouvre la recherche universelle",
    "Active le mode Sport",
    "Quel est le programme musical actuel ?"
];

export function normalizeAssistantText(value = "") {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[’']/g, " ")
        .replace(/[^a-z0-9:%+\-\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function includesAny(text, values = []) {
    return values.some((value) =>
        text.includes(normalizeAssistantText(value))
    );
}

function findScene(text, scenes = []) {
    const normalizedScenes = scenes.map((scene) => ({
        ...scene,
        normalizedLabel: normalizeAssistantText(scene.label || "")
    }));

    for (const scene of normalizedScenes) {
        if (
            scene.normalizedLabel &&
            text.includes(scene.normalizedLabel)
        ) {
            return scene;
        }
    }

    for (const [sceneId, aliases] of Object.entries(SCENE_ALIASES)) {
        if (includesAny(text, aliases)) {
            return normalizedScenes.find((scene) => scene.id === sceneId) || null;
        }
    }

    return null;
}

function findMix(text, mixes = []) {
    const candidates = mixes
        .map((mix) => ({
            ...mix,
            normalizedName: normalizeAssistantText(mix.name || "")
        }))
        .filter((mix) => mix.normalizedName.length >= 3)
        .sort((left, right) =>
            right.normalizedName.length - left.normalizedName.length
        );

    return candidates.find((mix) =>
        text.includes(mix.normalizedName)
    ) || null;
}

function parsePercentage(text, labels = []) {
    for (const label of labels) {
        const normalizedLabel = normalizeAssistantText(label);
        const pattern = new RegExp(
            `${normalizedLabel}\\b[^0-9]{0,60}(\\d{1,3})\\s*%?`
        );
        const match = text.match(pattern);
        if (match) {
            return Math.max(0, Math.min(100, Number(match[1])));
        }
    }
    return null;
}

function parseDurationMinutes(text) {
    const hourMinute = text.match(
        /(?:pendant|duree|durant)?\s*(\d{1,2})\s*h(?:eures?)?\s*(\d{1,2})?/
    );
    if (hourMinute) {
        const hours = Number(hourMinute[1] || 0);
        const minutes = Number(hourMinute[2] || 0);
        return Math.max(15, Math.min(360, hours * 60 + minutes));
    }

    const minuteMatch = text.match(
        /(?:pendant|duree|durant)?\s*(\d{2,3})\s*(?:min|minutes)/
    );
    if (minuteMatch) {
        return Math.max(15, Math.min(360, Number(minuteMatch[1])));
    }

    return null;
}

function parseTransitionCount(text) {
    const match = text.match(
        /(?:sur|en|avec)?\s*(\d{1,2})\s*(?:morceaux|titres|tracks)/
    );
    if (!match) {
        return 6;
    }
    return Math.max(3, Math.min(12, Number(match[1])));
}

function parseTime(text) {
    const colonMatch = text.match(
        /(?:a|vers)?\s*(\d{1,2})\s*[:h]\s*(\d{2})/
    );
    if (colonMatch) {
        const hour = Math.max(0, Math.min(23, Number(colonMatch[1])));
        const minute = Math.max(0, Math.min(59, Number(colonMatch[2])));
        return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }

    const hourMatch = text.match(
        /(?:a|vers)\s*(\d{1,2})\s*h(?:eures?)?\b/
    );
    if (hourMatch) {
        const hour = Math.max(0, Math.min(23, Number(hourMatch[1])));
        return `${String(hour).padStart(2, "0")}:00`;
    }

    return "";
}

function parseRecurrence(text) {
    if (includesAny(text, ["tous les jours", "chaque jour", "quotidien"])) {
        return { recurrence: "daily", weekdays: [] };
    }
    if (includesAny(text, [
        "du lundi au vendredi", "jours ouvrés", "jours ouvres", "en semaine"
    ])) {
        return { recurrence: "weekdays", weekdays: [] };
    }
    if (includesAny(text, ["week end", "weekend", "samedi et dimanche"])) {
        return { recurrence: "weekends", weekdays: [] };
    }

    const weekdays = [];
    for (const [day, aliases] of Object.entries(DAY_ALIASES)) {
        if (includesAny(text, aliases)) {
            weekdays.push(Number(day));
        }
    }
    if (weekdays.length) {
        return {
            recurrence: "weekly",
            weekdays: [...new Set(weekdays)]
        };
    }

    if (text.includes("demain")) {
        return {
            recurrence: "once",
            weekdays: [],
            dateOffsetDays: 1
        };
    }
    if (text.includes("aujourd hui")) {
        return {
            recurrence: "once",
            weekdays: [],
            dateOffsetDays: 0
        };
    }

    return {
        recurrence: "once",
        weekdays: [],
        dateOffsetDays: null
    };
}

function getConfidence(points) {
    if (points >= 5) return "élevée";
    if (points >= 3) return "moyenne";
    return "faible";
}

function buildUnknownPlan(request) {
    return {
        type: "unknown",
        request,
        ready: false,
        confidence: "faible",
        title: "Demande à préciser",
        summary:
            "Je reconnais les scènes, les mix, les transitions, les programmations et les réglages d’énergie.",
        details: [
            "Exemple : « Lance Conduite »",
            "Exemple : « Programme Chill tous les jours à 22h »"
        ],
        actionLabel: ""
    };
}

export function parseMusicalAssistantRequest(
    request = "",
    context = {}
) {
    const originalRequest = String(request || "").trim();
    const text = normalizeAssistantText(originalRequest);
    if (!text) {
        return buildUnknownPlan(originalRequest);
    }

    const scenes = Array.isArray(context.scenes) ? context.scenes : [];
    const mixes = Array.isArray(context.mixes) ? context.mixes : [];
    const scene = findScene(text, scenes);
    const mix = findMix(text, mixes);
    const autoplay = !includesAny(text, [
        "sans lancer", "sans lecture", "prepare seulement", "prépare seulement"
    ]);
    const energyTarget = parsePercentage(text, ["energie", "énergie"]);
    const varietyTarget = parsePercentage(text, ["variete", "variété"]);
    const discoveryTarget = parsePercentage(text, ["decouverte", "découverte"]);
    const durationMinutes = parseDurationMinutes(text);
    const time = parseTime(text);
    const recurrenceInfo = parseRecurrence(text);
    const isSchedule = includesAny(text, [
        "programme", "programmer", "planifie", "planifier", "routine"
    ]);
    const isTransition = includesAny(text, [
        "transition", "passe vers", "aller vers", "bascule vers"
    ]);
    const isConfigure = [
        energyTarget, varietyTarget, discoveryTarget, durationMinutes
    ].some((value) => value !== null) && includesAny(text, [
        "mets", "regle", "règle", "configure", "change", "ajuste"
    ]);
    const isStatus = includesAny(text, [
        "quel est", "quelle est", "statut", "programme actuel", "scene active", "scène active", "quoi de prevu", "quoi de prévu"
    ]);
    const isRecommendation = includesAny(text, [
        "recommande", "recommandation", "propose moi",
        "quoi ecouter", "quoi écouter", "surprends moi",
        "choisis pour moi", "un truc pour moi"
    ]);
    const isStatistics = includesAny(text, [
        "statistiques", "statistique", "bilan d ecoute",
        "bilan écoute", "temps d ecoute", "temps écoute",
        "mes habitudes d ecoute", "mes habitudes écoute"
    ]);
    const isDashboard = includesAny(text, ["tableau de bord", "dashboard", "accueil musical", "vue d ensemble"]);
    const isUniversalSearch = includesAny(text, [
        "recherche universelle", "ouvre la recherche",
        "ouvrir la recherche", "barre de recherche",
        "chercher dans shuffle"
    ]);
    const isGoals = includesAny(text, ["objectif", "objectifs", "bilan hebdomadaire", "badges musicaux", "progression de la semaine"]);
    const usageProfileAliases = {
        daily: ["mode quotidien", "profil quotidien"],
        drive: ["mode conduite", "profil conduite", "mode voiture"],
        sport: ["mode sport", "profil sport"],
        evening: ["mode soiree", "mode soirée", "profil soiree", "profil soirée"],
        discovery: ["mode decouverte", "mode découverte", "profil decouverte", "profil découverte"]
    };
    const usageProfileId = Object.entries(usageProfileAliases)
        .find(([, aliases]) => includesAny(text, aliases))?.[0] || "";
    let points = 1;
    if (scene || mix) points += 2;
    if (isSchedule || isTransition || isConfigure || isStatus) points += 2;
    if (time || durationMinutes !== null || energyTarget !== null) points += 1;

    if (usageProfileId) {
        const labels = {daily:"Quotidien",drive:"Conduite",sport:"Sport",evening:"Soirée",discovery:"Découverte"};
        return {
            type: "usage-profile",
            profileId: usageProfileId,
            request: originalRequest,
            ready: true,
            confidence: getConfidence(points + 2),
            title: `Mode ${labels[usageProfileId]}`,
            summary: "Adapter Shuffle+ à cette situation.",
            details: ["Interface", "Scène conseillée", "Couleur", "Niveau de découverte"],
            actionLabel: "Activer le mode"
        };
    }

    if (isGoals) {
        return {type:"goals",request:originalRequest,ready:true,confidence:getConfidence(points+2),title:"Objectifs musicaux",summary:"Ouvrir les objectifs et le bilan hebdomadaire.",details:["Sessions","Jours actifs","Découvertes","Badges"],actionLabel:"Ouvrir les objectifs"};
    }

    if (isUniversalSearch) {
        return {
            type: "universal-search",
            request: originalRequest,
            ready: true,
            confidence: getConfidence(points + 2),
            title: "Recherche universelle",
            summary: "Ouvrir la recherche globale de Shuffle+.",
            details: [
                "Rubriques et réglages",
                "Playlists et mix",
                "Scènes et profils"
            ],
            actionLabel: "Ouvrir la recherche"
        };
    }

    if (isDashboard) {
        return {type:"dashboard",request:originalRequest,ready:true,confidence:getConfidence(points+2),title:"Tableau de bord musical",summary:"Ouvrir la vue d’ensemble de Shuffle+.",details:["Lecture en cours","Recommandation","Scène et routine","Statistiques"],actionLabel:"Ouvrir le tableau de bord"};
    }

    if (isStatistics) {
        return {
            type: "statistics",
            request: originalRequest,
            ready: true,
            confidence: getConfidence(points + 2),
            title: "Statistiques d’écoute",
            summary: "Ouvrir le tableau de bord des habitudes et durées locales.",
            details: [
                "Sessions envoyées",
                "Écoutes confirmées",
                "Moments et jours préférés"
            ],
            actionLabel: "Ouvrir les statistiques"
        };
    }

    if (isRecommendation) {
        return {
            type: "recommendation",
            request: originalRequest,
            ready: true,
            confidence: getConfidence(points + 2),
            title: "Choix personnalisé",
            summary: "Sélectionner la meilleure recommandation locale du moment.",
            details: ["Heure actuelle", "Historique des mix", "Scènes disponibles", "Retours musicaux"],
            actionLabel: "Lancer la recommandation"
        };
    }

    if (isStatus) {
        return {
            type: "status",
            request: originalRequest,
            ready: true,
            confidence: getConfidence(points),
            title: "État musical Shuffle+",
            summary: "Afficher la scène active, le prochain planning et la lecture en cours.",
            details: [],
            actionLabel: "Actualiser l’état"
        };
    }

    if (isConfigure && scene) {
        const changes = [];
        if (energyTarget !== null) changes.push(`Énergie ${energyTarget} %`);
        if (varietyTarget !== null) changes.push(`Variété ${varietyTarget} %`);
        if (discoveryTarget !== null) changes.push(`Découverte ${discoveryTarget} %`);
        if (durationMinutes !== null) changes.push(`Durée ${durationMinutes} min`);
        return {
            type: "configure-scene",
            request: originalRequest,
            ready: changes.length > 0,
            confidence: getConfidence(points),
            sceneId: scene.id,
            sceneLabel: scene.label,
            sceneIcon: scene.icon,
            energyTarget,
            varietyTarget,
            discoveryTarget,
            durationMinutes,
            title: `Configurer ${scene.icon || "🎵"} ${scene.label}`,
            summary: changes.join(" · "),
            details: changes,
            actionLabel: "Appliquer les réglages"
        };
    }

    if (isSchedule && (scene || mix)) {
        const targetLabel = scene
            ? `${scene.icon || "🎵"} ${scene.label}`
            : mix.name;
        const hasTiming = Boolean(
            time || recurrenceInfo.dateOffsetDays !== null
        );
        const recurrenceLabel = {
            daily: "Tous les jours",
            weekdays: "Du lundi au vendredi",
            weekends: "Le week-end",
            weekly: "Jours personnalisés",
            once: recurrenceInfo.dateOffsetDays === 1 ? "Demain" : "Une fois"
        }[recurrenceInfo.recurrence];
        return {
            type: scene ? "schedule-scene" : "schedule-mix",
            request: originalRequest,
            ready: Boolean(hasTiming),
            confidence: getConfidence(points),
            sceneId: scene?.id || "",
            sceneLabel: scene?.label || "",
            sceneIcon: scene?.icon || "",
            mixId: mix?.id || "",
            mixName: mix?.name || "",
            recurrence: recurrenceInfo.recurrence,
            weekdays: recurrenceInfo.weekdays,
            dateOffsetDays: recurrenceInfo.dateOffsetDays,
            time: time || "18:00",
            autoplay,
            title: `Programmer ${targetLabel}`,
            summary: `${recurrenceLabel} à ${time || "18:00"}`,
            details: [
                recurrenceLabel,
                `Heure : ${time || "18:00"}`,
                autoplay ? "Lecture automatique" : "Préparation seulement"
            ],
            actionLabel: "Créer la routine",
            warning: hasTiming
                ? ""
                : "Ajoute une heure, par exemple « à 18h30 »."
        };
    }

    if (isTransition && scene) {
        const bridgeTrackCount = parseTransitionCount(text);
        const energyCurve = includesAny(text, ["douce", "tres douce", "très douce"])
            ? "soft"
            : includesAny(text, ["dynamique", "rapide"])
                ? "dynamic"
                : "progressive";
        return {
            type: "transition",
            request: originalRequest,
            ready: true,
            confidence: getConfidence(points),
            sceneId: scene.id,
            sceneLabel: scene.label,
            sceneIcon: scene.icon,
            bridgeTrackCount,
            energyCurve,
            autoplay,
            title: `Transition vers ${scene.icon || "🎵"} ${scene.label}`,
            summary: `${bridgeTrackCount} morceaux · courbe ${energyCurve === "soft" ? "douce" : energyCurve === "dynamic" ? "dynamique" : "progressive"}`,
            details: [
                `${bridgeTrackCount} morceaux de passage`,
                autoplay ? "Lecture autorisée" : "Préparation seulement"
            ],
            actionLabel: "Appliquer la transition"
        };
    }

    if (mix) {
        const prepareOnly = !autoplay || includesAny(text, ["prepare", "prépare"]);
        return {
            type: prepareOnly ? "prepare-mix" : "launch-mix",
            request: originalRequest,
            ready: true,
            confidence: getConfidence(points),
            mixId: mix.id,
            mixName: mix.name,
            autoplay: !prepareOnly,
            title: `${prepareOnly ? "Préparer" : "Lancer"} ${mix.name}`,
            summary: prepareOnly
                ? "Le mix sera généré sans démarrer Spotify."
                : "Le mix sera généré puis lancé.",
            details: [],
            actionLabel: prepareOnly ? "Préparer le mix" : "Lancer le mix"
        };
    }


    if (scene) {
        const prepareOnly = !autoplay || includesAny(text, ["prepare", "prépare"]);
        return {
            type: prepareOnly ? "prepare-scene" : "launch-scene",
            request: originalRequest,
            ready: true,
            confidence: getConfidence(points),
            sceneId: scene.id,
            sceneLabel: scene.label,
            sceneIcon: scene.icon,
            autoplay: !prepareOnly,
            title: `${prepareOnly ? "Préparer" : "Lancer"} ${scene.icon || "🎵"} ${scene.label}`,
            summary: prepareOnly
                ? "Le mix sera généré sans démarrer Spotify."
                : "Le mix sera généré puis lancé sur l’appareil principal.",
            details: [
                scene.mixId ? "Mix associé disponible" : "Aucun mix associé à cette scène"
            ],
            actionLabel: prepareOnly ? "Préparer la scène" : "Lancer la scène"
        };
    }

    return buildUnknownPlan(originalRequest);
}

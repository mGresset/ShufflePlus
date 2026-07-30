export const DEFAULT_MUSICAL_GOALS_SETTINGS = {
    weeklySessions: 5,
    weeklyActiveDays: 4,
    weeklyDiscoveries: 2,
    weeklyConfirmedSessions: 3,
    celebrationsEnabled: true,
    updatedAt: 0
};

const PLAYBACK_TYPES = new Set([
    "playback",
    "adaptive",
    "schedule",
    "ios",
    "scene"
]);

function clamp(value, minimum, maximum) {
    return Math.max(
        minimum,
        Math.min(
            maximum,
            Number(value) || 0
        )
    );
}

export function normalizeMusicalGoalsSettings(
    value = DEFAULT_MUSICAL_GOALS_SETTINGS
) {
    const source = value && typeof value === "object"
        ? value
        : DEFAULT_MUSICAL_GOALS_SETTINGS;

    return {
        weeklySessions: clamp(
            source.weeklySessions ?? 5,
            1,
            50
        ),
        weeklyActiveDays: clamp(
            source.weeklyActiveDays ?? 4,
            1,
            7
        ),
        weeklyDiscoveries: clamp(
            source.weeklyDiscoveries ?? 2,
            0,
            20
        ),
        weeklyConfirmedSessions: clamp(
            source.weeklyConfirmedSessions ?? 3,
            0,
            50
        ),
        celebrationsEnabled:
            source.celebrationsEnabled !== false,
        updatedAt: Math.max(
            0,
            Number(source.updatedAt || 0)
        )
    };
}

function getStartOfWeek(timestamp) {
    const date = new Date(timestamp);
    const day = date.getDay();
    const daysSinceMonday = (day + 6) % 7;
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - daysSinceMonday);
    return date.getTime();
}

function getDayKey(timestamp) {
    const date = new Date(timestamp);
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

function getEventIdentity(event = {}) {
    return String(
        event.mixId ||
        event.sceneId ||
        event.mixName ||
        event.name ||
        ""
    ).trim().toLowerCase();
}

function formatWeekRange(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end - 1);
    const formatter = new Intl.DateTimeFormat(
        "fr-FR",
        {
            day: "numeric",
            month: "short"
        }
    );
    return `${formatter.format(startDate)} → ${formatter.format(endDate)}`;
}

function buildGoal({
    id,
    icon,
    label,
    value,
    target,
    unit
}) {
    const safeTarget = Math.max(0, Number(target) || 0);
    const safeValue = Math.max(0, Number(value) || 0);
    const complete = safeTarget === 0 || safeValue >= safeTarget;
    const percent = safeTarget
        ? clamp(
            Math.round(safeValue / safeTarget * 100),
            0,
            100
        )
        : 100;

    return {
        id,
        icon,
        label,
        value: safeValue,
        target: safeTarget,
        unit,
        complete,
        percent,
        remaining: Math.max(0, safeTarget - safeValue)
    };
}

function buildAchievements(summary) {
    const achievements = [
        {
            id: "first-session",
            icon: "🎵",
            label: "Première impulsion",
            description: "Lancer une session cette semaine.",
            unlocked: summary.sessionCount >= 1
        },
        {
            id: "momentum",
            icon: "⚡",
            label: "En rythme",
            description: "Atteindre 3 sessions dans la semaine.",
            unlocked: summary.sessionCount >= 3
        },
        {
            id: "regular",
            icon: "📅",
            label: "Régulier",
            description: "Être actif pendant 3 jours différents.",
            unlocked: summary.activeDayCount >= 3
        },
        {
            id: "explorer",
            icon: "🧭",
            label: "Explorateur",
            description: "Découvrir 2 nouveaux mix ou scènes.",
            unlocked: summary.discoveryCount >= 2
        },
        {
            id: "verified",
            icon: "✅",
            label: "Écoute vérifiée",
            description: "Confirmer 3 sessions d’écoute.",
            unlocked: summary.confirmedSessionCount >= 3
        },
        {
            id: "weekly-champion",
            icon: "🏆",
            label: "Champion de la semaine",
            description: "Atteindre tous les objectifs actifs.",
            unlocked: summary.goals.every((goal) => goal.complete)
        }
    ];

    return achievements;
}

export function buildMusicalGoalsSummary({
    events = [],
    settings = DEFAULT_MUSICAL_GOALS_SETTINGS,
    now = Date.now()
} = {}) {
    const normalizedSettings = normalizeMusicalGoalsSettings(settings);
    const weekStart = getStartOfWeek(now);
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
    const previousWeekStart = weekStart - 7 * 24 * 60 * 60 * 1000;
    const sourceEvents = Array.isArray(events) ? events : [];
    const playbackEvents = sourceEvents
        .filter((event) => PLAYBACK_TYPES.has(event?.type))
        .sort((left, right) =>
            Number(left?.createdAt || 0) - Number(right?.createdAt || 0)
        );
    const weekEvents = playbackEvents.filter((event) => {
        const createdAt = Number(event?.createdAt || 0);
        return createdAt >= weekStart && createdAt < weekEnd;
    });
    const previousWeekEvents = playbackEvents.filter((event) => {
        const createdAt = Number(event?.createdAt || 0);
        return createdAt >= previousWeekStart && createdAt < weekStart;
    });
    const confirmedEvents = sourceEvents.filter((event) => {
        const createdAt = Number(event?.createdAt || 0);
        return event?.type === "listening-confirmed" &&
            createdAt >= weekStart &&
            createdAt < weekEnd;
    });
    const seenBeforeWeek = new Set(
        playbackEvents
            .filter((event) => Number(event?.createdAt || 0) < weekStart)
            .map(getEventIdentity)
            .filter(Boolean)
    );
    const discoveredThisWeek = new Set();

    for (const event of weekEvents) {
        const identity = getEventIdentity(event);
        if (identity && !seenBeforeWeek.has(identity)) {
            discoveredThisWeek.add(identity);
        }
    }

    const activeDays = new Set(
        weekEvents.map((event) =>
            getDayKey(Number(event?.createdAt || 0))
        )
    );
    const goals = [
        buildGoal({
            id: "sessions",
            icon: "🎧",
            label: "Sessions",
            value: weekEvents.length,
            target: normalizedSettings.weeklySessions,
            unit: "session"
        }),
        buildGoal({
            id: "active-days",
            icon: "📅",
            label: "Jours actifs",
            value: activeDays.size,
            target: normalizedSettings.weeklyActiveDays,
            unit: "jour"
        }),
        buildGoal({
            id: "discoveries",
            icon: "🧭",
            label: "Découvertes",
            value: discoveredThisWeek.size,
            target: normalizedSettings.weeklyDiscoveries,
            unit: "découverte"
        }),
        buildGoal({
            id: "confirmed",
            icon: "✅",
            label: "Écoutes confirmées",
            value: confirmedEvents.length,
            target: normalizedSettings.weeklyConfirmedSessions,
            unit: "confirmation"
        })
    ];
    const overallPercent = Math.round(
        goals.reduce((sum, goal) => sum + goal.percent, 0) /
        Math.max(1, goals.length)
    );
    const daysLeft = Math.max(
        0,
        Math.ceil((weekEnd - now) / (24 * 60 * 60 * 1000))
    );
    const summary = {
        generatedAt: Number(now),
        weekStart,
        weekEnd,
        weekLabel: formatWeekRange(weekStart, weekEnd),
        daysLeft,
        sessionCount: weekEvents.length,
        previousWeekSessionCount: previousWeekEvents.length,
        sessionDelta: weekEvents.length - previousWeekEvents.length,
        activeDayCount: activeDays.size,
        discoveryCount: discoveredThisWeek.size,
        confirmedSessionCount: confirmedEvents.length,
        totalTracks: weekEvents.reduce(
            (sum, event) => sum + Math.max(0, Number(event?.trackCount || 0)),
            0
        ),
        totalDurationMs: weekEvents.reduce(
            (sum, event) => sum + Math.max(0, Number(event?.durationMs || 0)),
            0
        ),
        goals,
        overallPercent,
        completeGoalCount: goals.filter((goal) => goal.complete).length,
        settings: normalizedSettings
    };

    summary.achievements = buildAchievements(summary);
    summary.unlockedAchievementCount = summary.achievements.filter(
        (achievement) => achievement.unlocked
    ).length;
    summary.nextGoal = goals.find((goal) => !goal.complete) || null;
    summary.message = summary.nextGoal
        ? `Encore ${summary.nextGoal.remaining} ${summary.nextGoal.unit}${summary.nextGoal.remaining > 1 ? "s" : ""} pour l’objectif « ${summary.nextGoal.label} ».`
        : "Tous les objectifs de la semaine sont atteints.";

    return summary;
}

export function buildMusicalGoalsExport(summary = {}) {
    return {
        format: "shuffleplus-weekly-goals",
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        summary
    };
}

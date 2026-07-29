export const DEFAULT_LISTENING_STATISTICS_SETTINGS = {
    rangeDays: 30,
    primaryMode: "sent",
    showGenerated: false,
    updatedAt: 0
};

const PLAYBACK_TYPES = new Set([
    "playback",
    "adaptive",
    "schedule",
    "ios"
]);

const DAYPARTS = [
    { id: "morning", label: "Matin", icon: "🌅" },
    { id: "day", label: "Journée", icon: "☀️" },
    { id: "evening", label: "Soirée", icon: "🌆" },
    { id: "night", label: "Nuit", icon: "🌙" }
];

const WEEKDAYS = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi"
];

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
}

export function normalizeListeningStatisticsSettings(
    value = DEFAULT_LISTENING_STATISTICS_SETTINGS
) {
    const source = value && typeof value === "object"
        ? value
        : DEFAULT_LISTENING_STATISTICS_SETTINGS;
    const allowedRanges = new Set([7, 30, 90, 365, 0]);
    const requestedRange = Number(source.rangeDays);
    const allowedModes = new Set(["sent", "confirmed"]);

    return {
        rangeDays: allowedRanges.has(requestedRange)
            ? requestedRange
            : 30,
        primaryMode: allowedModes.has(source.primaryMode)
            ? source.primaryMode
            : "sent",
        showGenerated: source.showGenerated === true,
        updatedAt: Math.max(0, Number(source.updatedAt || 0))
    };
}

function getStartTimestamp(rangeDays, now) {
    if (!rangeDays) return 0;
    return now - rangeDays * 24 * 60 * 60 * 1000;
}

function getDayKey(timestamp) {
    const date = new Date(timestamp);
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

function getDaypart(hour) {
    if (hour >= 5 && hour < 11) return "morning";
    if (hour >= 11 && hour < 17) return "day";
    if (hour >= 17 && hour < 22) return "evening";
    return "night";
}

function normalizeRanking(values = []) {
    return (Array.isArray(values) ? values : [])
        .map((item) => {
            if (typeof item === "string") {
                return { name: item, count: 1 };
            }
            return {
                name: String(item?.name || item?.label || "").trim(),
                count: Math.max(1, Number(item?.count || item?.value || 1))
            };
        })
        .filter((item) => item.name);
}

function mergeRankings(events, property, limit = 8) {
    const totals = new Map();
    for (const event of events) {
        for (const item of normalizeRanking(event?.[property])) {
            totals.set(item.name, (totals.get(item.name) || 0) + item.count);
        }
    }
    return [...totals.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a,b) => b.count - a.count || a.name.localeCompare(b.name,"fr"))
        .slice(0, limit);
}

function aggregateMixes(events, limit = 8) {
    const totals = new Map();
    for (const event of events) {
        const name = String(event?.mixName || "Mix Shuffle+");
        const current = totals.get(name) || {
            name,
            sessions: 0,
            tracks: 0,
            durationMs: 0
        };
        current.sessions += 1;
        current.tracks += Math.max(0, Number(event?.trackCount || 0));
        current.durationMs += Math.max(0, Number(event?.durationMs || 0));
        totals.set(name,current);
    }
    return [...totals.values()]
        .sort((a,b) => b.sessions-a.sessions || b.tracks-a.tracks)
        .slice(0,limit);
}

function buildDayparts(events) {
    const totals = Object.fromEntries(
        DAYPARTS.map((item) => [item.id, { ...item, sessions: 0, tracks: 0, durationMs: 0 }])
    );
    for (const event of events) {
        const date = new Date(Number(event?.createdAt || 0));
        const id = getDaypart(Number.isFinite(Number(event?.hour)) ? Number(event.hour) : date.getHours());
        totals[id].sessions += 1;
        totals[id].tracks += Math.max(0, Number(event?.trackCount || 0));
        totals[id].durationMs += Math.max(0, Number(event?.durationMs || 0));
    }
    return DAYPARTS.map((item) => totals[item.id]);
}

function buildWeekdays(events) {
    const values = WEEKDAYS.map((label,index) => ({ index, label, sessions: 0, tracks: 0 }));
    for (const event of events) {
        const day = new Date(Number(event?.createdAt || 0)).getDay();
        values[day].sessions += 1;
        values[day].tracks += Math.max(0, Number(event?.trackCount || 0));
    }
    return values;
}

function buildTimeline(events, rangeDays, now) {
    const count = rangeDays === 7 ? 7 : 14;
    const totals = new Map();
    for (const event of events) {
        const key = getDayKey(Number(event?.createdAt || 0));
        const current = totals.get(key) || { sessions: 0, tracks: 0, durationMs: 0 };
        current.sessions += 1;
        current.tracks += Math.max(0, Number(event?.trackCount || 0));
        current.durationMs += Math.max(0, Number(event?.durationMs || 0));
        totals.set(key,current);
    }
    const items = [];
    for (let offset = count - 1; offset >= 0; offset -= 1) {
        const date = new Date(now);
        date.setHours(12,0,0,0);
        date.setDate(date.getDate() - offset);
        const key = getDayKey(date.getTime());
        const total = totals.get(key) || { sessions: 0, tracks: 0, durationMs: 0 };
        items.push({
            key,
            label: new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit" }).format(date),
            ...total
        });
    }
    return items;
}

function getCurrentStreak(events) {
    const days = [...new Set(events.map((event) => getDayKey(Number(event?.createdAt || 0))))]
        .sort()
        .reverse();
    if (!days.length) return 0;
    let streak = 1;
    let cursor = new Date(`${days[0]}T12:00:00`);
    for (let index = 1; index < days.length; index += 1) {
        const expected = new Date(cursor);
        expected.setDate(expected.getDate() - 1);
        if (getDayKey(expected.getTime()) !== days[index]) break;
        streak += 1;
        cursor = expected;
    }
    return streak;
}

function getSourceDistribution(events) {
    const labels = {
        playback: "Lecture manuelle",
        adaptive: "Adaptive DJ",
        schedule: "Planificateur",
        ios: "Raccourci iOS"
    };
    const totals = new Map();
    for (const event of events) {
        const type = PLAYBACK_TYPES.has(event?.type) ? event.type : "playback";
        totals.set(type, (totals.get(type) || 0) + 1);
    }
    return [...totals.entries()]
        .map(([id,count]) => ({ id, label: labels[id] || id, count }))
        .sort((a,b) => b.count-a.count);
}

export function buildListeningStatistics({
    events = [],
    settings = DEFAULT_LISTENING_STATISTICS_SETTINGS,
    now = Date.now()
} = {}) {
    const normalizedSettings = normalizeListeningStatisticsSettings(settings);
    const start = getStartTimestamp(normalizedSettings.rangeDays, now);
    const filtered = (Array.isArray(events) ? events : [])
        .filter((event) => Number(event?.createdAt || 0) >= start)
        .sort((a,b) => Number(b?.createdAt || 0) - Number(a?.createdAt || 0));
    const sentEvents = filtered.filter((event) => PLAYBACK_TYPES.has(event?.type));
    const confirmedEvents = filtered.filter((event) => event?.type === "listening-confirmed");
    const generatedEvents = filtered.filter((event) => event?.type === "mix-generated");
    const primaryEvents = normalizedSettings.primaryMode === "confirmed"
        ? confirmedEvents
        : sentEvents;
    const confirmedRelated = new Set(confirmedEvents.map((event) => event?.relatedEventId).filter(Boolean));
    const activeDays = new Set(primaryEvents.map((event) => getDayKey(Number(event?.createdAt || 0))));
    const totalTracks = primaryEvents.reduce((sum,event) => sum + Math.max(0,Number(event?.trackCount || 0)),0);
    const totalDurationMs = primaryEvents.reduce((sum,event) => sum + Math.max(0,Number(event?.durationMs || 0)),0);
    const sentDurationMs = sentEvents.reduce((sum,event) => sum + Math.max(0,Number(event?.durationMs || 0)),0);
    const confirmedDurationMs = confirmedEvents.reduce((sum,event) => sum + Math.max(0,Number(event?.durationMs || 0)),0);
    const confirmationRate = sentEvents.length
        ? Math.round((confirmedRelated.size / sentEvents.length) * 100)
        : 0;
    const dayparts = buildDayparts(primaryEvents);
    const weekdays = buildWeekdays(primaryEvents);
    const favoriteDaypart = [...dayparts].sort((a,b) => b.sessions-a.sessions)[0] || DAYPARTS[0];
    const favoriteWeekday = [...weekdays].sort((a,b) => b.sessions-a.sessions)[0] || weekdays[1];
    const topMixes = aggregateMixes(primaryEvents);
    const insights = [];
    if (primaryEvents.length) {
        insights.push(`${favoriteDaypart.icon} Tu écoutes surtout en ${favoriteDaypart.label.toLowerCase()}.`);
        insights.push(`📅 ${favoriteWeekday.label} est ton jour le plus actif.`);
        if (topMixes[0]) insights.push(`🎧 « ${topMixes[0].name} » domine la période.`);
        if (confirmationRate >= 60) insights.push(`✅ ${confirmationRate} % des lancements envoyés ont été confirmés.`);
        else if (sentEvents.length) insights.push(`ℹ️ Confirme davantage de lancements pour distinguer durée potentielle et écoute réelle.`);
    }

    return {
        settings: normalizedSettings,
        filteredEvents: filtered,
        primaryEvents,
        sentEvents,
        confirmedEvents,
        generatedEvents,
        sessionCount: primaryEvents.length,
        activeDayCount: activeDays.size,
        totalTracks,
        totalDurationMs,
        sentDurationMs,
        confirmedDurationMs,
        averageTracks: primaryEvents.length ? Math.round(totalTracks / primaryEvents.length) : 0,
        averageDurationMs: primaryEvents.length ? Math.round(totalDurationMs / primaryEvents.length) : 0,
        confirmationRate: clamp(confirmationRate,0,100),
        currentStreak: getCurrentStreak(primaryEvents),
        dayparts,
        weekdays,
        timeline: buildTimeline(primaryEvents, normalizedSettings.rangeDays, now),
        topMixes,
        topArtists: mergeRankings(primaryEvents,"topArtists"),
        topAlbums: mergeRankings(primaryEvents,"topAlbums"),
        sourceDistribution: getSourceDistribution(sentEvents),
        insights,
        favoriteDaypart,
        favoriteWeekday
    };
}

function csvEscape(value) {
    const text = String(value ?? "");
    return `"${text.replaceAll('"','""')}"`;
}

export function buildListeningStatisticsCsv(summary = {}) {
    const rows = [[
        "date",
        "type",
        "mix",
        "titres",
        "duree_ms",
        "preuve",
        "appareil"
    ]];
    for (const event of summary.filteredEvents || []) {
        rows.push([
            new Date(Number(event?.createdAt || 0)).toISOString(),
            event?.type || "",
            event?.mixName || "",
            Number(event?.trackCount || 0),
            Number(event?.durationMs || 0),
            event?.evidence || "",
            event?.deviceName || ""
        ]);
    }
    return rows.map((row) => row.map(csvEscape).join(";")).join("\n");
}

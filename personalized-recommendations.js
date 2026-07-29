export const DEFAULT_PERSONALIZED_RECOMMENDATION_STATE = {
    enabled: true,
    discoveryLevel: 35,
    maxItems: 5,
    includeScenes: true,
    includeMixes: true,
    autoplay: true,
    refreshSeed: 0,
    dismissed: {},
    ratings: {},
    updatedAt: 0
};

const DISMISS_TTL = 30 * 24 * 60 * 60 * 1000;
const RECENT_WINDOW = 6 * 60 * 60 * 1000;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
}

function normalizeMap(value, mapper) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }
    return Object.fromEntries(
        Object.entries(value)
            .slice(0, 300)
            .map(([key, item]) => [String(key).slice(0, 180), mapper(item)])
    );
}

export function normalizePersonalizedRecommendationState(
    value = DEFAULT_PERSONALIZED_RECOMMENDATION_STATE
) {
    const source = value && typeof value === "object"
        ? value
        : DEFAULT_PERSONALIZED_RECOMMENDATION_STATE;
    return {
        enabled: source.enabled !== false,
        discoveryLevel: clamp(source.discoveryLevel ?? 35, 0, 100),
        maxItems: clamp(source.maxItems ?? 5, 3, 8),
        includeScenes: source.includeScenes !== false,
        includeMixes: source.includeMixes !== false,
        autoplay: source.autoplay !== false,
        refreshSeed: Math.max(0, Number(source.refreshSeed || 0)),
        dismissed: normalizeMap(source.dismissed, (item) => Math.max(0, Number(item || 0))),
        ratings: normalizeMap(source.ratings, (item) => ({
            value: clamp(item?.value ?? item, -1, 1),
            updatedAt: Math.max(0, Number(item?.updatedAt || 0))
        })),
        updatedAt: Math.max(0, Number(source.updatedAt || 0))
    };
}

function normalizeText(value = "") {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function stableHash(value = "") {
    let hash = 2166136261;
    for (const char of String(value)) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
}

function getContext(now = Date.now()) {
    const hour = new Date(now).getHours();
    if (hour >= 5 && hour < 11) {
        return {id:"morning", icon:"🌅", label:"Matin", preferredScenes:["morning","focus","drive"]};
    }
    if (hour >= 11 && hour < 17) {
        return {id:"day", icon:"☀️", label:"Journée", preferredScenes:["focus","drive","sport"]};
    }
    if (hour >= 17 && hour < 22) {
        return {id:"evening", icon:"🌆", label:"Soirée", preferredScenes:["drive","sport","party","chill"]};
    }
    return {id:"night", icon:"🌙", label:"Nuit", preferredScenes:["chill","party","focus"]};
}

export function getPersonalizedRecommendationContext(now = Date.now()) {
    return getContext(now);
}

function isDismissed(state, key, now) {
    const at = Number(state.dismissed?.[key] || 0);
    return Boolean(at && now - at < DISMISS_TTL);
}

function ratingBoost(state, key) {
    return Number(state.ratings?.[key]?.value || 0) * 18;
}

function historyMap(history = []) {
    return new Map((Array.isArray(history) ? history : []).map(
        item => [normalizeText(item?.name), item]
    ));
}

function recencyLabel(lastAt, now) {
    if (!lastAt) return "jamais lancé";
    const elapsed = Math.max(0, now - Number(lastAt));
    if (elapsed < 24 * 60 * 60 * 1000) return "écouté aujourd’hui";
    if (elapsed < 7 * 24 * 60 * 60 * 1000) return "écouté cette semaine";
    return "peu écouté récemment";
}

function sceneCandidate({scene,state,history,activeSceneId,context,now}) {
    if (!scene?.id || !scene?.mixId) return null;
    const key = `scene:${scene.id}`;
    if (isDismissed(state,key,now)) return null;
    const preferredIndex = context.preferredScenes.indexOf(scene.id);
    const mixHistory = history.get(normalizeText(scene.mixName || ""));
    const launches = Number(mixHistory?.launchCount || 0);
    const timeBoost = preferredIndex < 0 ? 0 : Math.max(8, 28 - preferredIndex * 7);
    const activeBoost = scene.id === activeSceneId ? 7 : 0;
    const score = 54 + timeBoost + activeBoost + Math.min(12, launches * 2) + Math.min(7, Number(scene.feedbackAffinity || 0)) + ratingBoost(state,key);
    const reasons = [];
    if (preferredIndex >= 0) reasons.push(`Adaptée au créneau ${context.label.toLowerCase()}.`);
    if (launches) reasons.push(`Son mix a déjà été lancé ${launches} fois.`);
    else reasons.push("Une scène prête à explorer.");
    if (scene.id === activeSceneId) reasons.push("C’est ta scène active.");
    return {
        key, type:"scene", targetId:scene.id, icon:scene.icon || "🎵",
        title:scene.label || "Scène", subtitle:scene.mixName || "Mix associé",
        reason:reasons.join(" "), confidence:clamp(Math.round(score),52,98),
        score, actionLabel:state.autoplay ? "Lancer la scène" : "Préparer la scène", ready:true
    };
}

function mixCandidate({mix,state,history,context,feedbackSummary,now}) {
    if (!mix?.id) return null;
    const key = `mix:${mix.id}`;
    if (isDismissed(state,key,now)) return null;
    const itemHistory = history.get(normalizeText(mix.name));
    const launches = Number(itemHistory?.launchCount || 0);
    const lastAt = Number(itemHistory?.lastLaunchedAt || 0);
    const elapsed = lastAt ? now - lastAt : Infinity;
    const discovery = state.discoveryLevel / 100;
    const familiarity = Math.min(24, launches * 4) * (1 - discovery * 0.48);
    const exploration = (launches === 0 ? 28 : elapsed > 14*86400000 ? 19 : elapsed > 3*86400000 ? 10 : 0) * discovery;
    const recentPenalty = elapsed < RECENT_WINDOW ? 15 : 0;
    const sourceBoost = Math.min(7, Number(mix.sourceCount || mix.sourceKeys?.length || 0));
    const feedbackBoost = Math.min(8, Number(feedbackSummary?.liked || 0) / 5);
    const jitter = (stableHash(`${key}:${state.refreshSeed}`) % 900) / 100;
    const score = 46 + familiarity + exploration + sourceBoost + feedbackBoost + ratingBoost(state,key) - recentPenalty + jitter;
    const reasons = [];
    if (launches) reasons.push(`Tu l’as lancé ${launches} fois.`);
    if (state.discoveryLevel >= 55 && (launches === 0 || elapsed > 7*86400000)) {
        reasons.push("Choisi pour apporter davantage de découverte.");
    } else {
        reasons.push(`${recencyLabel(lastAt,now)}.`);
    }
    if (Number(feedbackSummary?.liked || 0) > 0) reasons.push("Le moteur tient compte de tes titres aimés.");
    return {
        key, type:"mix", targetId:mix.id, icon:mix.icon || "🎧",
        title:mix.name || "Mix Shuffle+", subtitle:`${Number(mix.sourceCount || mix.sourceKeys?.length || 0)} source(s)`,
        reason:reasons.join(" "), confidence:clamp(Math.round(score),48,96),
        score, actionLabel:state.autoplay ? "Lancer le mix" : "Préparer le mix", ready:true
    };
}

function setupItems(state) {
    const items=[];
    if (state.includeMixes) items.push({key:"setup:mixes",type:"navigate",targetId:"mixes",icon:"🔀",title:"Créer un mix enregistré",subtitle:"Base des recommandations",reason:"Enregistre au moins un mix pour obtenir des propositions adaptées à tes habitudes.",confidence:100,score:100,actionLabel:"Ouvrir Mix & iOS",ready:true});
    if (state.includeScenes) items.push({key:"setup:adaptive",type:"navigate",targetId:"adaptive",icon:"🤖",title:"Associer une scène à un mix",subtitle:"Adaptive DJ 2.0",reason:"Une scène configurée permet des recommandations adaptées au moment de la journée.",confidence:100,score:95,actionLabel:"Configurer Adaptive DJ",ready:true});
    return items;
}

export function buildPersonalizedRecommendations({
    savedMixes=[], mixHistory=[], scenes=[], activeSceneId="", feedbackSummary={},
    state=DEFAULT_PERSONALIZED_RECOMMENDATION_STATE, now=Date.now()
} = {}) {
    const normalized = normalizePersonalizedRecommendationState(state);
    const context = getContext(now);
    if (!normalized.enabled) return {context,items:[],hiddenCount:0,totalCandidateCount:0};
    const history = historyMap(mixHistory);
    const candidates=[];
    if (normalized.includeScenes) {
        for (const scene of Array.isArray(scenes) ? scenes : []) {
            const item=sceneCandidate({scene,state:normalized,history,activeSceneId,context,now});
            if (item) candidates.push(item);
        }
    }
    if (normalized.includeMixes) {
        for (const mix of Array.isArray(savedMixes) ? savedMixes : []) {
            const item=mixCandidate({mix,state:normalized,history,context,feedbackSummary,now});
            if (item) candidates.push(item);
        }
    }
    const hiddenCount=Object.values(normalized.dismissed).filter(at=>now-Number(at||0)<DISMISS_TTL).length;
    const sorted=candidates.sort((a,b)=>b.score-a.score).slice(0,normalized.maxItems);
    return {context,items:sorted.length?sorted:setupItems(normalized).slice(0,normalized.maxItems),hiddenCount,totalCandidateCount:candidates.length};
}

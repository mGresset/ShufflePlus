import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    acceptContextualProfileSuggestion,
    buildContextualProfileSuggestion,
    classifySpotifyDevice,
    dismissContextualProfileSuggestion,
    getContextualTimeBand,
    normalizeContextualProfileState
} from "../core/contextual-profiles.js";
import {
    buildDailyHomeSnapshot,
    renderDailyHomeMarkup
} from "../core/daily-home.js";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const serviceWorkerSource = await readFile("service-worker.js", "utf8");
const homeStyleSource = await readFile("styles/feature-home.css", "utf8");

const contexts = [
    { id: "drive", name: "Voiture", icon: "🚗", mixId: "mix-drive", autoplay: true },
    { id: "home", name: "Maison", icon: "🏠", mixId: "mix-home", autoplay: true },
    { id: "headphones", name: "Écouteurs", icon: "🎧", mixId: "mix-headphones", autoplay: true },
    { id: "morning", name: "Matin", icon: "☀️", mixId: "mix-morning", autoplay: false },
    { id: "work", name: "Travail", icon: "💼", mixId: "", autoplay: true },
    { id: "sport", name: "Sport", icon: "🔥", mixId: "mix-sport", autoplay: true },
    { id: "party", name: "Soirée", icon: "🎉", mixId: "mix-party", autoplay: true },
    { id: "night", name: "Nuit", icon: "🌙", mixId: "mix-night", autoplay: true }
];

test("la distribution active annonce Shuffle+ 9.9.2", () => {
    assert.equal(version, "9.9.2");
});

test("la détection d’appareil reconnaît voiture, écouteurs et maison", () => {
    assert.equal(classifySpotifyDevice("Renault Talisman").id, "drive");
    assert.equal(classifySpotifyDevice("AirPods Pro").id, "headphones");
    assert.equal(classifySpotifyDevice("Sonos Salon").id, "home");
    assert.equal(classifySpotifyDevice("Chrome Windows").id, "unknown");
});

test("les moments de journée proposent matin, travail, soirée et nuit", () => {
    assert.equal(getContextualTimeBand(new Date("2026-08-03T07:30:00")).id, "morning");
    assert.equal(getContextualTimeBand(new Date("2026-08-03T14:00:00")).id, "work");
    assert.equal(getContextualTimeBand(new Date("2026-08-07T22:00:00")).id, "party");
    assert.equal(getContextualTimeBand(new Date("2026-08-04T23:30:00")).id, "night");
});

test("l’appareil Spotify a priorité sur une suggestion temporelle", () => {
    const suggestion = buildContextualProfileSuggestion({
        contexts,
        deviceName: "AirPods Pro de Mimieu",
        now: new Date("2026-08-03T08:00:00"),
        state: { enabled: true }
    });

    assert.equal(suggestion.contextId, "headphones");
    assert.equal(suggestion.source, "device");
    assert.equal(suggestion.confidence, "forte");
    assert.equal(suggestion.ready, true);
});

test("une suggestion non configurée reste visible avec une action de configuration", () => {
    const suggestion = buildContextualProfileSuggestion({
        contexts,
        deviceName: "",
        now: new Date("2026-08-03T14:00:00"),
        state: { enabled: true }
    });

    assert.equal(suggestion.contextId, "work");
    assert.equal(suggestion.ready, false);
    assert.equal(suggestion.label, "Suggestion à configurer");
});

test("le refus masque les suggestions puis l’acceptation mémorise le profil", () => {
    const initial = normalizeContextualProfileState({ enabled: true });
    const dismissed = dismissContextualProfileSuggestion(initial, {
        now: 1000,
        durationMs: 4000,
        contextId: "drive"
    });

    assert.equal(dismissed.dismissedUntil, 5000);
    assert.equal(buildContextualProfileSuggestion({
        contexts,
        deviceName: "Renault Talisman",
        now: new Date(3000),
        state: dismissed
    }), null);

    const accepted = acceptContextualProfileSuggestion(dismissed, "drive", 6000);
    assert.equal(accepted.lastAcceptedContextId, "drive");
    assert.equal(accepted.dismissedUntil, 0);
});

test("l’accueil rend une suggestion sans lancer automatiquement Spotify", () => {
    const snapshot = buildDailyHomeSnapshot({
        guidedSetup: { complete: true, progress: 100, steps: [] },
        contextualSuggestion: {
            contextId: "drive",
            name: "Voiture",
            icon: "🚗",
            reason: "Shuffle+ a reconnu un appareil de voiture.",
            confidence: "forte",
            label: "Suggestion prête",
            ready: true,
            autoplay: true
        }
    });
    const html = renderDailyHomeMarkup(snapshot);

    assert.match(html, /Suggestion prête/);
    assert.match(html, /data-contextual-suggestion="drive"/);
    assert.match(html, /data-dismiss-contextual-suggestion="drive"/);
    assert.doesNotMatch(html, /autofocus|onload=/);
});

test("la v9.3 branche le moteur contextuel, son cache et son interface", () => {
    assert.match(appSource, /buildContextualProfileSuggestion/);
    assert.match(appSource, /shuffleplus_contextual_profile_state_v1/);
    assert.match(appSource, /data-contextual-suggestion/);
    assert.match(serviceWorkerSource, /core\/contextual-profiles\.js/);
    assert.match(homeStyleSource, /\.v9-home-contextual/);
});

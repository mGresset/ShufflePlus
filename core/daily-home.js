import { escapeHtml } from "./html-utils.js";
import { analyzeQueueContinuity } from "./queue-continuity.js";
import {
    getHomeLayoutPresetId,
    normalizeHomeLayout
} from "./home-layout.js";

function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function formatDuration(milliseconds = 0) {
    const totalSeconds = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getDailyHomeGreeting(date = new Date()) {
    const hour = Number(date?.getHours?.()) || 0;
    if (hour < 6) return { icon: "🌙", label: "Bonne nuit" };
    if (hour < 12) return { icon: "☀️", label: "Bonjour" };
    if (hour < 18) return { icon: "🎧", label: "Bon après-midi" };
    return { icon: "🌆", label: "Bonsoir" };
}

export function buildDailyHomeSnapshot({
    command = null,
    commandReady = false,
    diagnostic = null,
    playback = null,
    deviceLabel = "Appareil Spotify à détecter",
    guidedSetup = null,
    queue = [],
    queueUpdatedAt = 0,
    experienceMode = "essential",
    drivingAvailable = false,
    contextualSuggestion = null,
    quickAccess = null,
    homeLayout = null,
    now = new Date()
} = {}) {
    const track = playback?.item || null;
    const durationMs = Number(track?.duration_ms) || 0;
    const progressMs = clamp(playback?.progress_ms, 0, durationMs || Number.MAX_SAFE_INTEGER);
    const progressPercent = durationMs > 0
        ? clamp((progressMs / durationMs) * 100, 0, 100)
        : 0;
    const greeting = getDailyHomeGreeting(now);
    const layout = normalizeHomeLayout(homeLayout || {});
    const nextStep = guidedSetup?.steps?.find?.((step) => !step.ready) || null;
    const safeQueue = (Array.isArray(queue) ? queue : [])
        .filter(Boolean);
    const queueContinuity = analyzeQueueContinuity(safeQueue, {
        current: track,
        updatedAt: queueUpdatedAt,
        now: now?.getTime?.() || Date.now()
    });
    const upcoming = safeQueue
        .slice(0, layout.queuePreviewCount)
        .map((item, index) => ({
            id: item.id || item.uri || `queue-${index}`,
            name: item.name || "Titre inconnu",
            artist: item.artist || item.artists?.map?.((artist) => artist?.name).filter(Boolean).join(", ") || "Artiste inconnu",
            imageUrl: item.imageUrl || item.album?.images?.[0]?.url || "",
            durationLabel: formatDuration(item.durationMs ?? item.duration_ms),
            duplicate: Boolean(queueContinuity.itemFlags[index]?.duplicate),
            repeatedArtist: Boolean(queueContinuity.itemFlags[index]?.repeatedArtist)
        }));

    return {
        greeting,
        dateLabel: new Intl.DateTimeFormat("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long"
        }).format(now),
        experienceMode: experienceMode === "expert" ? "expert" : "essential",
        command: command ? {
            id: command.id || "",
            name: command.name || "Profil principal",
            icon: command.icon || "▶️",
            shuffle: command.shuffle !== false,
            driving: Boolean(command.openDrivingMode && drivingAvailable),
            lyrics: Boolean(command.openDynamicLyrics)
        } : null,
        commandReady: Boolean(commandReady),
        deviceLabel: String(deviceLabel || "Appareil Spotify à détecter"),
        diagnostic: {
            status: diagnostic?.status || (commandReady ? "ready" : "warning"),
            label: diagnostic?.label || (commandReady ? "Prêt" : "À configurer")
        },
        playback: {
            available: Boolean(track),
            title: track?.name || "Aucune lecture active",
            artist: track?.artists?.map?.((artist) => artist?.name).filter(Boolean).join(", ") || "Ouvre Spotify pour commencer",
            album: track?.album?.name || "",
            imageUrl: track?.album?.images?.[0]?.url || "",
            isPlaying: Boolean(playback?.is_playing),
            progressPercent,
            elapsedLabel: formatDuration(progressMs),
            durationLabel: formatDuration(durationMs),
            deviceName: playback?.device?.name || deviceLabel
        },
        upcoming,
        queueContinuity,
        setup: {
            complete: Boolean(guidedSetup?.complete),
            progress: clamp(guidedSetup?.progress, 0, 100),
            nextStep
        },
        drivingAvailable: Boolean(drivingAvailable),
        layout: {
            ...layout,
            presetId: getHomeLayoutPresetId(layout)
        },
        quickAccess: {
            pinnedProfiles: Array.isArray(quickAccess?.pinnedProfiles)
                ? quickAccess.pinnedProfiles.slice(0, 4)
                : [],
            recentLaunches: Array.isArray(quickAccess?.recentLaunches)
                ? quickAccess.recentLaunches.slice(0, 3)
                : [],
            favorites: Array.isArray(quickAccess?.favorites)
                ? quickAccess.favorites.slice(0, 4)
                : [],
            favoriteCount: Math.max(
                0,
                Number(quickAccess?.favoriteCount || 0)
            ),
            hasContent: Boolean(quickAccess?.hasContent)
        },
        contextualSuggestion: contextualSuggestion
            ? {
                contextId: String(contextualSuggestion.contextId || ""),
                name: String(contextualSuggestion.name || "Profil contextuel"),
                icon: String(contextualSuggestion.icon || "🎧"),
                reason: String(contextualSuggestion.reason || "Suggestion adaptée au contexte actuel."),
                confidence: String(contextualSuggestion.confidence || "modérée"),
                label: String(contextualSuggestion.label || "Suggestion"),
                ready: Boolean(contextualSuggestion.ready),
                autoplay: contextualSuggestion.autoplay !== false,
                source: String(contextualSuggestion.source || "context")
            }
            : null
    };
}

function renderProfileOptions(options = []) {
    if (!options.length) {
        return '<option value="">Aucun profil enregistré</option>';
    }
    return options.map((option) => `
        <option value="${escapeHtml(option.id)}" ${option.selected ? "selected" : ""}>
            ${escapeHtml(option.icon || "▶️")} ${escapeHtml(option.name || "Profil")}
        </option>
    `).join("");
}

function renderUpcoming(snapshot) {
    if (!snapshot.upcoming.length) {
        return `
            <div class="v9-home-queue-empty">
                <span aria-hidden="true">≡</span>
                <p>Charge la file Spotify pour voir les prochains titres.</p>
            </div>
        `;
    }

    return `
        <ol class="v9-home-queue-list">
            ${snapshot.upcoming.map((item, index) => `
                <li class="${item.duplicate ? "is-duplicate" : ""} ${item.repeatedArtist ? "is-artist-repeat" : ""}">
                    ${item.imageUrl
                        ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy">`
                        : `<span class="v9-home-queue-index">${index + 1}</span>`}
                    <div>
                        <strong>${escapeHtml(item.name)}</strong>
                        <small>${escapeHtml(item.artist)}</small>
                    </div>
                    <div class="v9-home-queue-meta">
                        ${item.duplicate ? '<span class="v9-home-queue-warning">Doublon</span>' : ""}
                        <time>${escapeHtml(item.durationLabel)}</time>
                    </div>
                </li>
            `).join("")}
        </ol>
    `;
}

function renderHomeQuickAccess(snapshot) {
    const access = snapshot.quickAccess || {};
    const pinned = Array.isArray(access.pinnedProfiles)
        ? access.pinnedProfiles
        : [];
    const recent = Array.isArray(access.recentLaunches)
        ? access.recentLaunches
        : [];
    const favorites = Array.isArray(access.favorites)
        ? access.favorites
        : [];

    return `
        <section
            class="v9-home-access"
            aria-label="Accès immédiat"
            style="order:${snapshot.layout.order.indexOf("quickAccess") + 1}"
            ${snapshot.layout.showQuickAccess ? "" : "hidden"}
        >
            <header class="v9-home-access__header">
                <div>
                    <span>⚡ Accès immédiat</span>
                    <h3>Tes raccourcis musicaux au même endroit</h3>
                    <p>Profils épinglés, derniers lancements et favoris Spotify.</p>
                </div>
                <button
                    type="button"
                    class="ui-button ui-button--secondary"
                    data-open-universal-search
                >
                    🔎 Rechercher
                </button>
            </header>

            <div class="v9-home-access__grid">
                <article class="v9-home-access__column">
                    <div class="v9-home-access__title">
                        <span>📌 Profils épinglés</span>
                        <button type="button" data-dashboard-nav="mixes">Gérer</button>
                    </div>
                    ${pinned.length
                        ? `<div class="v9-home-access__items">
                            ${pinned.map((profile) => `
                                <div class="v9-home-access-profile">
                                    <button
                                        type="button"
                                        class="v9-home-access-profile__run"
                                        data-home-run-profile="${escapeHtml(profile.id)}"
                                    >
                                        <span aria-hidden="true">${escapeHtml(profile.icon || "▶️")}</span>
                                        <span>
                                            <strong>${escapeHtml(profile.name || "Profil")}</strong>
                                            <small>${escapeHtml(profile.subtitle || profile.lastRunLabel || "Prêt à lancer")}</small>
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        class="v9-home-access-profile__pin"
                                        data-home-pin-profile="${escapeHtml(profile.id)}"
                                        aria-label="Retirer ${escapeHtml(profile.name || "ce profil")} de l’accueil"
                                        title="Retirer de l’accueil"
                                    >📌</button>
                                </div>
                            `).join("")}
                        </div>`
                        : `<div class="v9-home-access__empty">
                            <span>📌</span>
                            <p>Épingle un profil depuis la rubrique Profils.</p>
                            <button type="button" data-dashboard-nav="mixes">Choisir un profil</button>
                        </div>`}
                </article>

                <article class="v9-home-access__column">
                    <div class="v9-home-access__title">
                        <span>↻ Derniers lancements</span>
                    </div>
                    ${recent.length
                        ? `<div class="v9-home-access__items">
                            ${recent.map((profile) => `
                                <button
                                    type="button"
                                    class="v9-home-recent-launch"
                                    data-home-run-profile="${escapeHtml(profile.id)}"
                                >
                                    <span aria-hidden="true">${escapeHtml(profile.icon || "▶️")}</span>
                                    <span>
                                        <strong>${escapeHtml(profile.name || "Profil")}</strong>
                                        <small>${escapeHtml(profile.ageLabel || "Récemment")} · ${escapeHtml(profile.deviceLabel || "Spotify")}</small>
                                    </span>
                                    <b aria-hidden="true">▶</b>
                                </button>
                            `).join("")}
                        </div>`
                        : `<div class="v9-home-access__empty">
                            <span>↻</span>
                            <p>Tes lancements réussis apparaîtront ici.</p>
                        </div>`}
                </article>

                <article class="v9-home-access__column v9-home-access__favorites">
                    <div class="v9-home-access__title">
                        <span>★ Favoris Spotify</span>
                        <strong>${Number(access.favoriteCount || favorites.length)}</strong>
                    </div>
                    ${favorites.length
                        ? `<div class="v9-home-favorite-list">
                            ${favorites.map((favorite) => `
                                <span><b aria-hidden="true">${escapeHtml(favorite.icon || "★")}</b>${escapeHtml(favorite.name || "Favori")}</span>
                            `).join("")}
                        </div>`
                        : `<div class="v9-home-access__empty">
                            <span>☆</span>
                            <p>Ajoute des playlists en favoris dans Ma musique.</p>
                        </div>`}
                    <button
                        type="button"
                        class="ui-button ui-button--ghost v9-home-access__favorites-button"
                        data-home-open-favorites
                    >
                        Ouvrir mes favoris
                    </button>
                </article>
            </div>
        </section>
    `;
}

export function renderDailyHomeMarkup(snapshot, {
    profileOptions = []
} = {}) {
    const command = snapshot.command;
    const playback = snapshot.playback;
    const nextStep = snapshot.setup.nextStep;

    return `
        <section class="v9-home ${snapshot.layout.density === "compact" ? "is-compact" : ""}" aria-label="Accueil quotidien Shuffle+">
            <header class="v9-home-header">
                <div>
                    <span class="v9-home-kicker">${escapeHtml(snapshot.greeting.icon)} Shuffle+ 9 · ${snapshot.experienceMode === "expert" ? "Expert" : "Essentiel"}</span>
                    <h2>${escapeHtml(snapshot.greeting.label)}, ta musique est prête.</h2>
                    <p>${escapeHtml(snapshot.dateLabel)} · lance ton profil principal sans chercher dans les menus.</p>
                </div>
                <div class="v98-home-header-actions">
                    <button type="button" class="ui-button ui-button--secondary" data-toggle-home-customizer>
                        🎛 Personnaliser
                    </button>
                    <button type="button" class="ui-button ui-button--ghost" data-select-experience-mode="${snapshot.experienceMode === "expert" ? "essential" : "expert"}">
                        ${snapshot.experienceMode === "expert" ? "Mode Essentiel" : "Mode Expert"}
                    </button>
                </div>
            </header>

            <section class="v98-home-customizer" data-home-customizer hidden aria-label="Personnalisation de l’accueil">
                <div class="v98-home-customizer__heading">
                    <div>
                        <span>🎛 Accueil v9.8</span>
                        <h3>Choisis ce que tu veux voir en premier</h3>
                        <p>Les changements restent sur cet appareil et sont inclus dans les sauvegardes.</p>
                    </div>
                    <button type="button" class="ui-button ui-button--ghost" data-toggle-home-customizer>Fermer</button>
                </div>
                <form id="homeLayoutSettingsForm" class="v98-home-customizer__form">
                    <fieldset>
                        <legend>Ordre des blocs</legend>
                        <div class="v98-home-preset-grid">
                            <label><input type="radio" name="preset" value="balanced" ${snapshot.layout.presetId === "balanced" ? "checked" : ""}> Équilibré</label>
                            <label><input type="radio" name="preset" value="launchFirst" ${snapshot.layout.presetId === "launchFirst" ? "checked" : ""}> Lancement d’abord</label>
                            <label><input type="radio" name="preset" value="queueFirst" ${snapshot.layout.presetId === "queueFirst" ? "checked" : ""}> File d’abord</label>
                        </div>
                    </fieldset>
                    <div class="v98-home-customizer__options">
                        <label><span>Densité</span><select name="density"><option value="comfortable" ${snapshot.layout.density === "comfortable" ? "selected" : ""}>Confortable</option><option value="compact" ${snapshot.layout.density === "compact" ? "selected" : ""}>Compacte</option></select></label>
                        <label><span>Titres visibles</span><select name="queuePreviewCount">${[2,3,5].map((count) => `<option value="${count}" ${snapshot.layout.queuePreviewCount === count ? "selected" : ""}>${count}</option>`).join("")}</select></label>
                    </div>
                    <div class="v98-home-toggle-grid">
                        <label><input type="checkbox" name="showQuickAccess" ${snapshot.layout.showQuickAccess ? "checked" : ""}> Accès immédiat</label>
                        <label><input type="checkbox" name="showNowPlaying" ${snapshot.layout.showNowPlaying ? "checked" : ""}> Lecture en cours</label>
                        <label><input type="checkbox" name="showQueue" ${snapshot.layout.showQueue ? "checked" : ""}> File d’attente</label>
                        <label><input type="checkbox" name="showShortcuts" ${snapshot.layout.showShortcuts ? "checked" : ""}> Raccourcis du bas</label>
                    </div>
                    <div class="v98-home-customizer__actions">
                        <button type="submit" class="ui-button ui-button--primary">Enregistrer</button>
                        <button type="button" class="ui-button ui-button--ghost" data-reset-home-layout>Réinitialiser</button>
                    </div>
                </form>
            </section>

            ${snapshot.contextualSuggestion
                ? `<section class="v9-home-contextual" aria-label="Suggestion contextuelle">
                    <div class="v9-home-contextual-icon" aria-hidden="true">
                        ${escapeHtml(snapshot.contextualSuggestion.icon)}
                    </div>
                    <div class="v9-home-contextual-copy">
                        <span>✨ ${escapeHtml(snapshot.contextualSuggestion.label)} · confiance ${escapeHtml(snapshot.contextualSuggestion.confidence)}</span>
                        <h3>${escapeHtml(snapshot.contextualSuggestion.name)}</h3>
                        <p>${escapeHtml(snapshot.contextualSuggestion.reason)}</p>
                    </div>
                    <div class="v9-home-contextual-actions">
                        <button
                            type="button"
                            class="ui-button ui-button--primary"
                            data-contextual-suggestion="${escapeHtml(snapshot.contextualSuggestion.contextId)}"
                        >
                            ${snapshot.contextualSuggestion.ready
                                ? snapshot.contextualSuggestion.autoplay
                                    ? "▶ Lancer ce profil"
                                    : "Préparer ce profil"
                                : "⚙ Configurer ce profil"}
                        </button>
                        <button
                            type="button"
                            class="ui-button ui-button--ghost"
                            data-dismiss-contextual-suggestion="${escapeHtml(snapshot.contextualSuggestion.contextId)}"
                        >
                            Pas maintenant
                        </button>
                    </div>
                </section>`
                : ""}

            <div class="v98-home-blocks">
            ${renderHomeQuickAccess(snapshot)}

            <div class="v9-home-grid ${snapshot.layout.showNowPlaying ? "" : "is-launch-only"}" style="order:${snapshot.layout.order.indexOf("main") + 1}">
                <article class="v9-home-launch-card">
                    <div class="v9-home-card-heading">
                        <div>
                            <span>▶ Profil principal</span>
                            <h3>${escapeHtml(command ? `${command.icon} ${command.name}` : "Aucun profil choisi")}</h3>
                            <p>${escapeHtml(snapshot.deviceLabel)}</p>
                        </div>
                        <span class="v9-home-readiness is-${escapeHtml(snapshot.diagnostic.status)}">
                            ${escapeHtml(snapshot.diagnostic.label)}
                        </span>
                    </div>

                    <div class="v9-home-option-chips" aria-label="Options du profil">
                        <span class="${command?.shuffle ? "is-active" : ""}">🔀 Shuffle</span>
                        <span class="${command?.driving ? "is-active" : ""}">🚗 Conduite</span>
                        <span class="${command?.lyrics ? "is-active" : ""}">🎤 Lyrics</span>
                    </div>

                    <button
                        type="button"
                        class="v9-home-launch-button ui-button ui-button--primary"
                        data-guided-primary-launch
                        ${snapshot.commandReady ? "" : "disabled"}
                    >
                        ▶ Lancer ma musique
                    </button>

                    <div class="v9-home-launch-secondary">
                        <button type="button" class="ui-button ui-button--secondary" data-copy-universal-launch ${snapshot.commandReady ? "" : "disabled"}>
                            🔗 Copier le raccourci
                        </button>
                        <button type="button" class="ui-button ui-button--secondary" data-share-universal-launch ${snapshot.commandReady ? "" : "disabled"}>
                            📱 Envoyer à l’iPhone
                        </button>
                        ${snapshot.drivingAvailable
                            ? '<button type="button" class="ui-button ui-button--secondary" data-dashboard-nav="driving">🚗 Conduite</button>'
                            : ""}
                    </div>

                    <form id="primaryLaunchSettingsForm" class="v9-home-profile-form">
                        <label for="v9PrimaryLaunchCommandSelect">Changer le profil principal</label>
                        <div>
                            <select id="v9PrimaryLaunchCommandSelect" name="commandId" ${profileOptions.length ? "" : "disabled"}>
                                ${renderProfileOptions(profileOptions)}
                            </select>
                            <button type="submit" class="ui-button ui-button--secondary" ${profileOptions.length ? "" : "disabled"}>Appliquer</button>
                        </div>
                    </form>
                </article>

                <article class="v9-home-now-playing" ${snapshot.layout.showNowPlaying ? "" : "hidden"}>
                    <div class="v9-home-card-heading">
                        <div>
                            <span>🎧 Lecture en cours</span>
                            <h3>${escapeHtml(playback.title)}</h3>
                            <p>${escapeHtml(playback.artist)}</p>
                        </div>
                        <button id="refreshMusicalDashboardButton" type="button" class="ui-button ui-button--ghost" aria-label="Actualiser Spotify">↻</button>
                    </div>

                    <div class="v9-home-track">
                        ${playback.imageUrl
                            ? `<img src="${escapeHtml(playback.imageUrl)}" alt="" loading="eager">`
                            : '<span class="v9-home-track-placeholder" aria-hidden="true">🎵</span>'}
                        <div>
                            <strong>${escapeHtml(playback.title)}</strong>
                            <small>${escapeHtml(playback.album || playback.deviceName)}</small>
                        </div>
                    </div>

                    <div class="v9-home-progress" style="--v9-progress:${playback.progressPercent.toFixed(2)}%" aria-label="Progression du titre">
                        <i></i>
                    </div>
                    <div class="v9-home-progress-labels">
                        <span>${escapeHtml(playback.elapsedLabel)}</span>
                        <span>${escapeHtml(playback.durationLabel)}</span>
                    </div>

                    <div class="v9-home-player-actions">
                        <button type="button" class="ui-button ui-button--primary" data-dashboard-playback="playpause">
                            ${playback.isPlaying ? "⏸ Pause" : "▶ Reprendre"}
                        </button>
                        <button type="button" class="ui-button ui-button--secondary" data-dashboard-playback="next">⏭ Suivant</button>
                        <button type="button" class="ui-button ui-button--secondary" ${snapshot.drivingAvailable ? "data-open-driving-queue" : "data-refresh-home-queue"}>≡ Liste de lecture</button>
                    </div>
                </article>
            </div>

            <section
                class="v9-home-queue"
                aria-label="Titres à suivre"
                style="order:${snapshot.layout.order.indexOf("queue") + 1}"
                ${snapshot.layout.showQueue ? "" : "hidden"}
            >
                <header>
                    <div>
                        <span>≡ À suivre</span>
                        <h3>${snapshot.queueContinuity.totalCount ? `${snapshot.queueContinuity.totalCount} titres dans la file` : "File d’attente Spotify"}</h3>
                    </div>
                    <button type="button" class="ui-button ui-button--ghost" ${snapshot.drivingAvailable ? "data-open-driving-queue" : "data-refresh-home-queue"}>
                        ${snapshot.drivingAvailable && snapshot.upcoming.length ? "Voir toute la liste" : snapshot.upcoming.length ? "Actualiser" : "Charger la liste"}
                    </button>
                </header>
                ${snapshot.queueContinuity.totalCount
                    ? `<div class="v9-home-queue-insights" aria-label="État de la file d’attente">
                        <span class="is-${escapeHtml(snapshot.queueContinuity.state)}">${escapeHtml(snapshot.queueContinuity.label)}</span>
                        <span>⏱ ${escapeHtml(snapshot.queueContinuity.durationLabel)} visibles</span>
                        <span>🎤 ${snapshot.queueContinuity.uniqueArtistCount} artiste${snapshot.queueContinuity.uniqueArtistCount > 1 ? "s" : ""}</span>
                        <span class="${snapshot.queueContinuity.duplicateCount ? "has-warning" : ""}">
                            ${snapshot.queueContinuity.duplicateCount
                                ? `⚠ ${snapshot.queueContinuity.duplicateCount} doublon${snapshot.queueContinuity.duplicateCount > 1 ? "s" : ""}`
                                : "✓ Aucun doublon"}
                        </span>
                    </div>`
                    : ""}
                ${renderUpcoming(snapshot)}
            </section>

            ${snapshot.setup.complete
                ? ""
                : `<section class="v9-home-next-step" style="order:90">
                    <div class="v9-home-next-step-progress" style="--v9-setup:${snapshot.setup.progress}%"><i></i></div>
                    <div>
                        <span>Configuration · ${Math.round(snapshot.setup.progress)}%</span>
                        <strong>${escapeHtml(nextStep?.label || "Terminer la configuration")}</strong>
                        <small>Une seule étape est mise en avant pour garder l’accueil simple.</small>
                    </div>
                    <button type="button" class="ui-button ui-button--primary" data-guided-step="${escapeHtml(nextStep?.id || "")}" data-guided-nav="${escapeHtml(nextStep?.menuId || "settings")}">Continuer</button>
                </section>`}

            <nav
                class="v9-home-shortcuts"
                aria-label="Accès rapides"
                style="order:${snapshot.layout.order.indexOf("shortcuts") + 1}"
                ${snapshot.layout.showShortcuts ? "" : "hidden"}
            >
                <button type="button" data-dashboard-nav="music"><span>🎵</span><strong>Ma musique</strong></button>
                <button type="button" data-dashboard-nav="mixes"><span>📱</span><strong>Profils</strong></button>
                <button type="button" data-dashboard-nav="quick"><span>▶️</span><strong>Lancer</strong></button>
                <button type="button" data-dashboard-nav="guide"><span>📖</span><strong>Guide</strong></button>
                <button type="button" data-dashboard-nav="settings"><span>⚙️</span><strong>Réglages</strong></button>
            </nav>
            </div>
        </section>
    `;
}

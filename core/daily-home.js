import { escapeHtml } from "./html-utils.js";

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
    experienceMode = "essential",
    drivingAvailable = false,
    now = new Date()
} = {}) {
    const track = playback?.item || null;
    const durationMs = Number(track?.duration_ms) || 0;
    const progressMs = clamp(playback?.progress_ms, 0, durationMs || Number.MAX_SAFE_INTEGER);
    const progressPercent = durationMs > 0
        ? clamp((progressMs / durationMs) * 100, 0, 100)
        : 0;
    const greeting = getDailyHomeGreeting(now);
    const nextStep = guidedSetup?.steps?.find?.((step) => !step.ready) || null;
    const upcoming = (Array.isArray(queue) ? queue : [])
        .filter(Boolean)
        .slice(0, 3)
        .map((item, index) => ({
            id: item.id || item.uri || `queue-${index}`,
            name: item.name || "Titre inconnu",
            artist: item.artists?.map?.((artist) => artist?.name).filter(Boolean).join(", ") || "Artiste inconnu",
            imageUrl: item.album?.images?.[0]?.url || "",
            durationLabel: formatDuration(item.duration_ms)
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
        setup: {
            complete: Boolean(guidedSetup?.complete),
            progress: clamp(guidedSetup?.progress, 0, 100),
            nextStep
        },
        drivingAvailable: Boolean(drivingAvailable)
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
                <li>
                    ${item.imageUrl
                        ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy">`
                        : `<span class="v9-home-queue-index">${index + 1}</span>`}
                    <div>
                        <strong>${escapeHtml(item.name)}</strong>
                        <small>${escapeHtml(item.artist)}</small>
                    </div>
                    <time>${escapeHtml(item.durationLabel)}</time>
                </li>
            `).join("")}
        </ol>
    `;
}

export function renderDailyHomeMarkup(snapshot, {
    profileOptions = []
} = {}) {
    const command = snapshot.command;
    const playback = snapshot.playback;
    const nextStep = snapshot.setup.nextStep;

    return `
        <section class="v9-home" aria-label="Accueil quotidien Shuffle+">
            <header class="v9-home-header">
                <div>
                    <span class="v9-home-kicker">${escapeHtml(snapshot.greeting.icon)} Shuffle+ 9 · ${snapshot.experienceMode === "expert" ? "Expert" : "Essentiel"}</span>
                    <h2>${escapeHtml(snapshot.greeting.label)}, ta musique est prête.</h2>
                    <p>${escapeHtml(snapshot.dateLabel)} · lance ton profil principal sans chercher dans les menus.</p>
                </div>
                <button type="button" class="ui-button ui-button--ghost" data-select-experience-mode="${snapshot.experienceMode === "expert" ? "essential" : "expert"}">
                    ${snapshot.experienceMode === "expert" ? "Mode Essentiel" : "Mode Expert"}
                </button>
            </header>

            <div class="v9-home-grid">
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

                <article class="v9-home-now-playing">
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

            <section class="v9-home-queue" aria-label="Titres à suivre">
                <header>
                    <div>
                        <span>≡ À suivre</span>
                        <h3>${snapshot.upcoming.length ? `${snapshot.upcoming.length} prochains titres` : "File d'attente Spotify"}</h3>
                    </div>
                    <button type="button" class="ui-button ui-button--ghost" ${snapshot.drivingAvailable ? "data-open-driving-queue" : "data-refresh-home-queue"}>
                        ${snapshot.drivingAvailable && snapshot.upcoming.length ? "Voir toute la liste" : snapshot.upcoming.length ? "Actualiser" : "Charger la liste"}
                    </button>
                </header>
                ${renderUpcoming(snapshot)}
            </section>

            ${snapshot.setup.complete
                ? ""
                : `<section class="v9-home-next-step">
                    <div class="v9-home-next-step-progress" style="--v9-setup:${snapshot.setup.progress}%"><i></i></div>
                    <div>
                        <span>Configuration · ${Math.round(snapshot.setup.progress)}%</span>
                        <strong>${escapeHtml(nextStep?.label || "Terminer la configuration")}</strong>
                        <small>Une seule étape est mise en avant pour garder l’accueil simple.</small>
                    </div>
                    <button type="button" class="ui-button ui-button--primary" data-guided-step="${escapeHtml(nextStep?.id || "")}" data-guided-nav="${escapeHtml(nextStep?.menuId || "settings")}">Continuer</button>
                </section>`}

            <nav class="v9-home-shortcuts" aria-label="Accès rapides">
                <button type="button" data-dashboard-nav="music"><span>🎵</span><strong>Ma musique</strong></button>
                <button type="button" data-dashboard-nav="mixes"><span>📱</span><strong>Profils</strong></button>
                <button type="button" data-dashboard-nav="quick"><span>▶️</span><strong>Lancer</strong></button>
                <button type="button" data-dashboard-nav="guide"><span>📖</span><strong>Guide</strong></button>
                <button type="button" data-dashboard-nav="settings"><span>⚙️</span><strong>Réglages</strong></button>
            </nav>
        </section>
    `;
}

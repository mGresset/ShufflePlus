export const PLAYER_REPEAT_STATES = ["off", "context", "track"];

export function normalizePlayerRepeatState(value = "off") {
    return PLAYER_REPEAT_STATES.includes(value) ? value : "off";
}

export function getNextPlayerRepeatState(value = "off") {
    const current = normalizePlayerRepeatState(value);
    const index = PLAYER_REPEAT_STATES.indexOf(current);
    return PLAYER_REPEAT_STATES[(index + 1) % PLAYER_REPEAT_STATES.length];
}

export function getPlayerRepeatLabel(value = "off") {
    const state = normalizePlayerRepeatState(value);
    if (state === "track") return "Titre";
    if (state === "context") return "Contexte";
    return "OFF";
}

export function normalizePlayerVolume(value, fallback = 50) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return Math.min(100, Math.max(0, Math.round(Number(fallback) || 0)));
    }
    return Math.min(100, Math.max(0, Math.round(numeric)));
}

export function normalizePlayerSeekPosition(value, durationMs = 0) {
    const numeric = Math.max(0, Math.round(Number(value) || 0));
    const duration = Math.max(0, Math.round(Number(durationMs) || 0));
    return duration > 0 ? Math.min(numeric, duration) : numeric;
}


export function updatePlayerPlusPlaybackButtons(
    isPlaying,
    root = globalThis.document
) {
    root?.querySelectorAll?.(
        '[data-dashboard-playback="playpause"]'
    ).forEach((button) => {
        button.textContent = isPlaying ? "⏸ Pause" : "▶ Lecture";
        button.setAttribute(
            "aria-label",
            isPlaying
                ? "Mettre la lecture en pause"
                : "Reprendre la lecture"
        );
        button.setAttribute(
            "aria-pressed",
            String(Boolean(isPlaying))
        );
    });
}

export function updatePlayerPlusNowPlayingCard(
    card,
    playback,
    {
        updateVisiblePlaybackButtons = () => {},
        updateUpcomingPreview = () => {}
    } = {}
) {
    if (!card || !playback) return false;

    const documentRef = card.ownerDocument || globalThis.document;
    const setText = (selector, value) => {
        const element = card.querySelector(selector);
        if (element) element.textContent = value;
    };

    setText("[data-home-now-title-heading]", playback.title);
    setText("[data-home-now-artist]", playback.artist);
    setText("[data-home-now-title]", playback.title);
    setText(
        "[data-home-now-album]",
        playback.album || playback.deviceName
    );
    setText("[data-home-now-duration]", playback.durationLabel);
    setText(
        "[data-home-now-device-name]",
        playback.deviceType
            ? `${playback.deviceName} · ${playback.deviceType}`
            : playback.deviceName
    );
    setText(
        "[data-home-now-device-state]",
        playback.deviceActive ? "Actif" : "Spotify"
    );

    const shuffleState = card.querySelector("[data-home-shuffle-state]");
    if (shuffleState) {
        shuffleState.textContent =
            `🔀 Aléatoire ${playback.shuffleActive ? "ON" : "OFF"}`;
        shuffleState.classList.toggle(
            "is-active",
            playback.shuffleActive
        );
    }

    const repeatState = card.querySelector("[data-home-repeat-state]");
    if (repeatState) {
        repeatState.textContent = `🔁 Répétition ${playback.repeatLabel}`;
        repeatState.classList.toggle(
            "is-active",
            playback.repeatMode !== "off"
        );
    }

    let cover = card.querySelector("[data-home-now-cover]");
    if (playback.imageUrl) {
        if (cover?.tagName !== "IMG") {
            const image = documentRef.createElement("img");
            image.setAttribute("data-home-now-cover", "");
            image.setAttribute("alt", "");
            image.setAttribute("loading", "eager");
            image.setAttribute("src", playback.imageUrl);
            cover?.replaceWith(image);
            cover = image;
        } else if (cover.getAttribute("src") !== playback.imageUrl) {
            cover.setAttribute("src", playback.imageUrl);
        }
    } else if (cover?.tagName !== "SPAN") {
        const placeholder = documentRef.createElement("span");
        placeholder.className = "v9-home-track-placeholder";
        placeholder.setAttribute("data-home-now-cover", "");
        placeholder.setAttribute("aria-hidden", "true");
        placeholder.textContent = "🎵";
        cover?.replaceWith(placeholder);
    }

    const progress = card.querySelector(".v9-home-progress");
    if (progress) {
        progress.style.setProperty(
            "--v9-progress",
            `${playback.progressPercent.toFixed(2)}%`
        );
    }

    setText("[data-home-now-elapsed]", playback.elapsedLabel);

    const seekInput = card.querySelector("[data-home-seek]");
    if (seekInput) {
        seekInput.max = String(Math.max(1, playback.durationMs));
        if (documentRef.activeElement !== seekInput) {
            seekInput.value = String(
                Math.min(
                    playback.progressMs,
                    Math.max(1, playback.durationMs)
                )
            );
        }
        seekInput.disabled = !(
            playback.available && playback.durationMs > 0
        );
    }

    const repeatButton = card.querySelector("[data-home-repeat-button]");
    if (repeatButton) {
        repeatButton.textContent = `🔁 ${playback.repeatLabel}`;
        repeatButton.setAttribute(
            "aria-label",
            `Répétition Spotify : ${playback.repeatLabel}`
        );
    }

    const volumeInput = card.querySelector("[data-home-volume]");
    const volumeLabel = card.querySelector("[data-home-volume-label]");
    if (volumeInput) {
        if (
            playback.volumePercent !== null &&
            documentRef.activeElement !== volumeInput
        ) {
            volumeInput.value = String(playback.volumePercent);
        }
        volumeInput.disabled = !playback.deviceActive;
    }
    if (volumeLabel) {
        volumeLabel.textContent = playback.volumePercent === null
            ? "—"
            : `${playback.volumePercent}%`;
    }

    updateVisiblePlaybackButtons(Boolean(playback.isPlaying));
    updateUpcomingPreview();
    return true;
}

export function updatePlayerPlusInputPreview(
    target,
    { formatDuration = (value) => String(value) } = {}
) {
    if (!target?.matches) return false;

    if (target.matches("[data-home-seek]")) {
        const card = target.closest("[data-home-now-playing]");
        const value = Math.max(0, Number(target.value) || 0);
        const maximum = Math.max(1, Number(target.max) || 1);
        card?.style?.setProperty(
            "--v115-seek-progress",
            `${Math.min(100, (value / maximum) * 100).toFixed(2)}%`
        );
        const elapsed = card?.querySelector("[data-home-now-elapsed]");
        if (elapsed) elapsed.textContent = formatDuration(value);
        return true;
    }

    if (target.matches("[data-home-volume]")) {
        const label = target.closest(".v115-home-volume")
            ?.querySelector("[data-home-volume-label]");
        if (label) {
            label.textContent = `${normalizePlayerVolume(target.value)}%`;
        }
        return true;
    }

    return false;
}

export function createPlayerPlusRuntime({
    getPlaybackState,
    seekPlayback,
    setPlaybackVolume,
    addToPlaybackQueue,
    stampPlaybackClock,
    updatePlaybackState,
    updateNowPlaying,
    updateUpcomingPreview,
    refreshQueue,
    getTrackAt,
    showToast,
    setStatus,
    getPlaybackErrorMessage,
    formatDuration
} = {}) {
    let busy = false;

    const readPlaybackState = async () => {
        if (typeof getPlaybackState !== "function") {
            throw new Error("État Spotify indisponible.");
        }
        return getPlaybackState();
    };

    const reportError = (error) => {
        const message = typeof getPlaybackErrorMessage === "function"
            ? getPlaybackErrorMessage(error)
            : error?.message || "Commande Spotify impossible.";
        setStatus?.(message, "error");
    };

    const seek = async (positionMs) => {
        if (busy) return false;
        busy = true;
        try {
            const state = await readPlaybackState();
            const deviceId = state?.device?.id || "";
            const durationMs = Number(state?.item?.duration_ms) || 0;
            if (!deviceId || !state?.item) {
                throw new Error("Aucune lecture Spotify active.");
            }
            const nextPosition = normalizePlayerSeekPosition(
                positionMs,
                durationMs
            );
            await seekPlayback(nextPosition, deviceId);
            const nextState = stampPlaybackClock({
                ...(state || {}),
                progress_ms: nextPosition
            });
            updatePlaybackState?.(nextState);
            updateNowPlaying?.();
            showToast?.(
                `⏱ Position : ${formatDuration(nextPosition)}.`,
                "success"
            );
            return true;
        } catch (error) {
            reportError(error);
            return false;
        } finally {
            busy = false;
        }
    };

    const volume = async (volumePercent) => {
        if (busy) return false;
        busy = true;
        try {
            const state = await readPlaybackState();
            const deviceId = state?.device?.id || "";
            if (!deviceId) {
                throw new Error("Aucun appareil Spotify actif.");
            }
            const nextVolume = normalizePlayerVolume(volumePercent);
            await setPlaybackVolume(nextVolume, deviceId);
            const nextState = {
                ...(state || {}),
                device: {
                    ...(state?.device || {}),
                    volume_percent: nextVolume
                }
            };
            updatePlaybackState?.(nextState);
            updateNowPlaying?.();
            showToast?.(
                `🔊 Volume Spotify : ${nextVolume}%.`,
                "success"
            );
            return true;
        } catch (error) {
            reportError(error);
            return false;
        } finally {
            busy = false;
        }
    };

    const queueTrackNextAt = async (index) => {
        const track = getTrackAt?.(index);
        if (!track?.uri) {
            setStatus?.(
                "Ce morceau ne peut pas être ajouté à la file Spotify.",
                "error"
            );
            return false;
        }

        try {
            const state = await readPlaybackState();
            const deviceId = state?.device?.id || "";
            if (!deviceId) {
                throw new Error("Aucun appareil Spotify actif.");
            }
            await addToPlaybackQueue(track.uri, deviceId);
            showToast?.(
                `➕ « ${track.name || "Titre"} » ajouté à la file Spotify.`,
                "success"
            );
            await Promise.resolve(refreshQueue?.()).catch(() => null);
            updateUpcomingPreview?.();
            return true;
        } catch (error) {
            reportError(error);
            return false;
        }
    };

    return {
        getPlaybackState: readPlaybackState,
        seek,
        volume,
        queueTrackNextAt,
        isBusy: () => busy
    };
}

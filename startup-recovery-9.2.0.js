(() => {
    "use strict";

    const APP_VERSION = "9.2.0";
    const CACHE_PREFIX = "shuffleplus-";
    const AUTO_REPAIR_KEY = `shuffleplus_auto_repair_${APP_VERSION}`;
    const AUTH_LOCAL_KEYS = [
        "shuffleplus_access_token",
        "shuffleplus_refresh_token",
        "shuffleplus_expires_at",
        "shuffleplus_authorized_at"
    ];
    const AUTH_SESSION_KEYS = [
        "shuffleplus_code_verifier",
        "shuffleplus_oauth_state",
        "shuffleplus_auth_started_at"
    ];

    const panel = document.getElementById("startupRecoveryPanel");
    const details = document.getElementById("startupRecoveryDetails");
    const toggleButton = document.getElementById("showStartupRecoveryButton");
    const repairButton = document.getElementById("repairStartupButton");
    const resetAuthButton = document.getElementById("resetSpotifySessionButton");
    const loginButton = document.getElementById("loginButton");

    let appReady = false;
    let repairInProgress = false;
    let watchdogId = 0;

    function safeStorageRemove(storage, key) {
        try {
            storage?.removeItem(key);
        } catch {
            // Un stockage bloqué ne doit pas empêcher la réparation du cache.
        }
    }

    function setDetails(message) {
        if (details) {
            details.textContent = message;
        }
    }

    function showPanel(message = "") {
        if (panel) {
            panel.hidden = false;
        }
        if (message) {
            setDetails(message);
        }
        toggleButton?.setAttribute("aria-expanded", "true");
    }

    function hidePanel() {
        if (panel) {
            panel.hidden = true;
        }
        toggleButton?.setAttribute("aria-expanded", "false");
    }

    async function clearShufflePlusCaches() {
        if (!("caches" in window)) {
            return;
        }

        const names = await caches.keys();
        await Promise.all(
            names
                .filter((name) => name.startsWith(CACHE_PREFIX))
                .map((name) => caches.delete(name))
        );
    }

    async function unregisterShufflePlusWorkers() {
        if (!("serviceWorker" in navigator)) {
            return;
        }

        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
            registrations
                .filter((registration) =>
                    registration.scope.startsWith(window.location.origin)
                )
                .map((registration) => registration.unregister())
        );
    }

    function clearTemporarySpotifyState() {
        for (const key of AUTH_SESSION_KEYS) {
            safeStorageRemove(sessionStorage, key);
        }
    }

    function clearSpotifyAuthentication() {
        for (const key of AUTH_LOCAL_KEYS) {
            safeStorageRemove(localStorage, key);
        }
        clearTemporarySpotifyState();
    }

    function reloadWithoutCachedNavigation() {
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        url.searchParams.delete("state");
        url.searchParams.delete("error");
        url.searchParams.set("recovery", String(Date.now()));
        window.location.replace(url.toString());
    }

    async function repairApplication({ resetSpotify = false, automatic = false } = {}) {
        if (repairInProgress) {
            return;
        }

        repairInProgress = true;
        repairButton && (repairButton.disabled = true);
        resetAuthButton && (resetAuthButton.disabled = true);
        setDetails(
            automatic
                ? "Une ancienne version semble bloquée. Réparation automatique en cours…"
                : "Réparation du cache et du Service Worker en cours…"
        );

        try {
            if (resetSpotify) {
                clearSpotifyAuthentication();
            } else {
                clearTemporarySpotifyState();
            }

            await unregisterShufflePlusWorkers();
            await clearShufflePlusCaches();
            reloadWithoutCachedNavigation();
        } catch (error) {
            console.error("Réparation de démarrage impossible :", error);
            repairInProgress = false;
            repairButton && (repairButton.disabled = false);
            resetAuthButton && (resetAuthButton.disabled = false);
            showPanel(
                "La réparation automatique a échoué. Ferme complètement Shuffle+, puis rouvre-la."
            );
        }
    }

    async function tryAutomaticRepair(reason) {
        let alreadyTried = false;
        try {
            alreadyTried = sessionStorage.getItem(AUTO_REPAIR_KEY) === "1";
            if (!alreadyTried) {
                sessionStorage.setItem(AUTO_REPAIR_KEY, "1");
            }
        } catch {
            alreadyTried = true;
        }

        if (alreadyTried) {
            showPanel(reason);
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = "Se connecter à Spotify";
            }
            return;
        }

        await repairApplication({ automatic: true });
    }

    toggleButton?.addEventListener("click", () => {
        if (panel?.hidden === false) {
            hidePanel();
        } else {
            showPanel(
                "Utilise d’abord « Réparer Shuffle+ ». Tes playlists, mix et réglages seront conservés."
            );
        }
    });

    repairButton?.addEventListener("click", async () => {
        const confirmed = window.confirm(
            "Réparer Shuffle+ ? Le cache et le Service Worker seront réinitialisés. Tes réglages, mix et connexion Spotify seront conservés."
        );
        if (confirmed) {
            await repairApplication();
        }
    });

    resetAuthButton?.addEventListener("click", async () => {
        const confirmed = window.confirm(
            "Réinitialiser uniquement la connexion Spotify ? Tes playlists, mix, appareil préféré et réglages seront conservés."
        );
        if (confirmed) {
            await repairApplication({ resetSpotify: true });
        }
    });

    window.addEventListener("shuffleplus:app-ready", (event) => {
        appReady = true;
        window.clearTimeout(watchdogId);

        const loadedVersion = String(event.detail?.version || "");
        if (loadedVersion && loadedVersion !== APP_VERSION) {
            void tryAutomaticRepair(
                `Les fichiers de Shuffle+ ne correspondent pas tous à la version ${APP_VERSION}.`
            );
            return;
        }

        try {
            sessionStorage.removeItem(AUTO_REPAIR_KEY);
        } catch {
            // Sans conséquence.
        }
    });

    window.addEventListener("shuffleplus:startup-error", (event) => {
        const message = event.detail?.message ||
            "Shuffle+ a rencontré une erreur pendant son initialisation.";
        showPanel(`${message} Les options de réparation restent disponibles.`);
    });

    window.addEventListener("error", (event) => {
        const target = event.target;
        if (target instanceof HTMLScriptElement) {
            void tryAutomaticRepair(
                "Un fichier JavaScript de Shuffle+ n’a pas pu être chargé."
            );
        }
    }, true);

    watchdogId = window.setTimeout(() => {
        if (!appReady) {
            void tryAutomaticRepair(
                "Le démarrage de Shuffle+ prend anormalement longtemps."
            );
        }
    }, 10_000);

    window.ShufflePlusRecovery = Object.freeze({
        version: APP_VERSION,
        show: showPanel,
        repair: () => repairApplication(),
        resetSpotify: () => repairApplication({ resetSpotify: true })
    });
})();

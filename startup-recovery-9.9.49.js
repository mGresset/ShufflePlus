(() => {
    "use strict";

    const APP_VERSION = "9.9.49";
    const BUILD_ID = `${APP_VERSION}-pwa-reset-1`;
    const BUILD_QUERY_KEY = "shuffleplus_build";
    const CACHE_PREFIX = "shuffleplus-";
    const AUTO_REPAIR_KEY = `shuffleplus_auto_repair_${APP_VERSION}`;
    const REPAIR_RELOAD_KEY = `shuffleplus_repair_reload_${APP_VERSION}`;
    const REPAIR_COOLDOWN_MS = 60_000;
    const RECOVERY_STABILITY_MS = 20_000;
    const STARTUP_WATCHDOG_MS = 25_000;
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

    function safeStorageGet(storage, key) {
        try {
            return storage?.getItem(key) || "";
        } catch {
            return "";
        }
    }

    function safeStorageSet(storage, key, value) {
        try {
            storage?.setItem(key, String(value));
            return true;
        } catch {
            return false;
        }
    }

    function getNavigationState() {
        const url = new URL(window.location.href);
        const recoveryAt = Number(url.searchParams.get("recovery") || 0);
        const storedRepairAt = Number(
            safeStorageGet(sessionStorage, REPAIR_RELOAD_KEY) || 0
        );
        const now = Date.now();
        const recentUrlRepair = Number.isFinite(recoveryAt) &&
            recoveryAt > 0 &&
            now - recoveryAt >= 0 &&
            now - recoveryAt < REPAIR_COOLDOWN_MS;
        const recentStoredRepair = Number.isFinite(storedRepairAt) &&
            storedRepairAt > 0 &&
            now - storedRepairAt >= 0 &&
            now - storedRepairAt < REPAIR_COOLDOWN_MS;

        return {
            url,
            hasOAuthCallback: Boolean(
                url.searchParams.get("code") ||
                url.searchParams.get("error")
            ),
            recentRepair: recentUrlRepair || recentStoredRepair
        };
    }

    function markRepairReload(timestamp = Date.now()) {
        safeStorageSet(sessionStorage, REPAIR_RELOAD_KEY, timestamp);
        return timestamp;
    }

    function cleanRecoveryMarkerAfterStability() {
        window.setTimeout(() => {
            safeStorageRemove(sessionStorage, AUTO_REPAIR_KEY);
            safeStorageRemove(sessionStorage, REPAIR_RELOAD_KEY);

            const url = new URL(window.location.href);
            if (url.searchParams.has("recovery")) {
                url.searchParams.delete("recovery");
                window.history.replaceState(
                    window.history.state,
                    document.title,
                    url.toString()
                );
            }
        }, RECOVERY_STABILITY_MS);
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
        const shufflePlusScope = new URL("./", window.location.href).href;
        await Promise.all(
            registrations
                .filter((registration) =>
                    registration.scope === shufflePlusScope
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

    function reloadWithoutCachedNavigation(repairTimestamp = Date.now()) {
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        url.searchParams.delete("state");
        url.searchParams.delete("error");
        // Le build dans l’URL empêche bootstrap d’effectuer une seconde purge
        // si localStorage est indisponible (cas rencontré sur Safari/PWA iOS).
        url.searchParams.set(BUILD_QUERY_KEY, BUILD_ID);
        url.searchParams.set("recovery", String(repairTimestamp));
        window.location.replace(url.toString());
    }

    async function repairApplication({ resetSpotify = false, automatic = false } = {}) {
        if (repairInProgress) {
            return false;
        }

        const navigation = getNavigationState();

        // Le code_verifier et le state PKCE vivent dans sessionStorage. Les
        // supprimer pendant le callback Spotify rend la connexion impossible.
        if (navigation.hasOAuthCallback) {
            showPanel(
                automatic
                    ? "La connexion Spotify est en cours. La réparation automatique a été suspendue pour préserver la vérification de sécurité."
                    : "Connexion Spotify en cours : Shuffle+ ne réparera pas le cache avant la fin du retour Spotify afin de préserver la vérification de sécurité."
            );
            if (loginButton) {
                loginButton.disabled = false;
            }
            return false;
        }

        // Après une réparation, aucun watchdog ne doit pouvoir relancer une
        // deuxième purge pendant le même démarrage à froid.
        if (automatic && navigation.recentRepair) {
            showPanel(
                "Shuffle+ vient déjà d’être réparée. Aucun nouveau rechargement automatique ne sera lancé."
            );
            return false;
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

            const repairTimestamp = markRepairReload();
            await unregisterShufflePlusWorkers();
            await clearShufflePlusCaches();
            reloadWithoutCachedNavigation(repairTimestamp);
            return true;
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
        const navigation = getNavigationState();
        if (navigation.hasOAuthCallback) {
            showPanel(
                `${reason} La connexion Spotify est en cours : aucune donnée PKCE ne sera supprimée et aucun rechargement automatique ne sera lancé.`
            );
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.textContent = "Se connecter à Spotify";
            }
            return;
        }

        if (navigation.recentRepair) {
            showPanel(
                `${reason} Une réparation vient déjà d’être effectuée : Shuffle+ bloque un nouveau rechargement automatique.`
            );
            return;
        }

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

        // Le verrou reste actif pendant une courte période de stabilité.
        // Le retirer immédiatement permettait au démarrage PWA suivant de
        // relancer une réparation et de créer une boucle sur Safari iOS.
        cleanRecoveryMarkerAfterStability();
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
    }, STARTUP_WATCHDOG_MS);

    window.ShufflePlusRecovery = Object.freeze({
        version: APP_VERSION,
        show: showPanel,
        repair: () => repairApplication(),
        resetSpotify: () => repairApplication({ resetSpotify: true })
    });
})();

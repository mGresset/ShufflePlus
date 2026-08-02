import { escapeHtml } from "./html-utils.js";

export function buildPwaInstallState({
    standalone = false,
    promptAvailable = false,
    ios = false
} = {}) {
    if (standalone) {
        return {
            id: "installed",
            label: "Installée",
            description: "Shuffle+ fonctionne déjà comme une application autonome."
        };
    }

    if (promptAvailable) {
        return {
            id: "available",
            label: "Installation disponible",
            description: "Ce navigateur peut installer Shuffle+ directement."
        };
    }

    if (ios) {
        return {
            id: "ios",
            label: "Ajout manuel sur iPhone",
            description: "Dans Safari, utilise Partager puis Sur l’écran d’accueil."
        };
    }

    return {
        id: "browser",
        label: "Selon le navigateur",
        description: "Utilise le menu du navigateur pour installer l’application lorsqu’il le propose."
    };
}

export function renderPwaInstallGuideMarkup({
    ios = false,
    installed = false
} = {}) {
    const body = installed
        ? `
            <div>
                <strong>Shuffle+ est déjà installée.</strong>
                <p>Ouvre-la depuis ton écran d’accueil ou ton menu d’applications.</p>
            </div>
        `
        : ios
            ? `
                <div>
                    <strong>Installer Shuffle+ sur iPhone ou iPad</strong>
                    <ol>
                        <li>Ouvre cette page dans Safari.</li>
                        <li>Touche le bouton Partager.</li>
                        <li>Choisis « Sur l’écran d’accueil ».</li>
                        <li>Valide avec « Ajouter ».</li>
                    </ol>
                </div>
            `
            : `
                <div>
                    <strong>Installer Shuffle+</strong>
                    <p>
                        Ouvre le menu de ton navigateur puis choisis
                        « Installer l’application » ou « Ajouter à l’écran d’accueil ».
                    </p>
                </div>
            `;

    return `${body}
        <button type="button" data-close-pwa-guide aria-label="Fermer">×</button>
    `;
}

export function renderPwaSettingsPanelMarkup({
    state,
    serviceWorkerSupported = false,
    cacheAvailable = false,
    standalone = false
} = {}) {
    const safeState = state || buildPwaInstallState();

    return `
        <section id="pwaSettingsPanel" class="settings-panel pwa-settings-panel">
            <div class="panel-heading">
                <div>
                    <h3>📲 Application installable</h3>
                    <p>
                        Installe Shuffle+ comme une application et garde
                        l’interface disponible même sans réseau.
                    </p>
                </div>
                <span class="pwa-state-badge pwa-state-${escapeHtml(safeState.id)}">
                    ${escapeHtml(safeState.label)}
                </span>
            </div>

            <p class="pwa-state-description">${escapeHtml(safeState.description)}</p>

            <div class="pwa-capabilities" role="list" aria-label="Capacités de l’application">
                <span class="pwa-capability ${serviceWorkerSupported ? "is-ready" : "is-unavailable"}" role="listitem">
                    <b aria-hidden="true">${serviceWorkerSupported ? "✓" : "×"}</b>
                    <span>Cache de l’interface</span>
                </span>
                <span class="pwa-capability ${cacheAvailable ? "is-ready" : "is-unavailable"}" role="listitem">
                    <b aria-hidden="true">${cacheAvailable ? "✓" : "×"}</b>
                    <span>Ressources hors connexion</span>
                </span>
                <span class="pwa-capability ${standalone ? "is-ready" : "is-info"}" role="listitem">
                    <b aria-hidden="true">${standalone ? "✓" : "i"}</b>
                    <span>Mode application</span>
                </span>
            </div>

            <div class="pwa-settings-actions">
                <button
                    id="installPwaSettingsButton"
                    class="ui-button ${safeState.id === "installed" ? "ui-button--secondary" : "ui-button--primary"}"
                    type="button"
                    ${safeState.id === "installed" ? "disabled" : ""}
                >
                    ${safeState.id === "installed" ? "Application installée" : "Installer Shuffle+"}
                </button>

                <button id="showPwaInstructionsButton" class="ui-button ui-button--secondary" type="button">
                    Instructions d’installation
                </button>

                <button
                    id="checkPwaUpdateButton"
                    class="ui-button ui-button--ghost"
                    type="button"
                    ${serviceWorkerSupported ? "" : "disabled"}
                >
                    Rechercher une mise à jour
                </button>
            </div>

            <p class="pwa-offline-note">
                L’interface, la dernière bibliothèque et les playlists déjà ouvertes
                peuvent rester consultables hors connexion. La lecture et les commandes
                Spotify exigent toujours Internet.
            </p>
        </section>
    `;
}

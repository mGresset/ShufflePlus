import { escapeHtml } from "./html-utils.js";

export function applySpotifySetupView({
    configuration = {},
    redirectUri = "",
    connected = false,
    focus = false,
    elements = {},
    requestAnimationFrame = globalThis.requestAnimationFrame
} = {}) {
    const configured = Boolean(configuration?.clientId);
    const {
        panel,
        redirect,
        loginButton,
        clientIdInput
    } = elements;

    if (panel) {
        panel.hidden = configured;
    }

    if (redirect) {
        redirect.textContent = String(redirectUri || "");
    }

    if (loginButton && !connected) {
        loginButton.hidden = !configured;
        loginButton.disabled = false;
        loginButton.textContent = "Se connecter à Spotify";
    }

    if (focus && !configured && typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => clientIdInput?.focus?.());
    }

    return configuration;
}

export function renderSpotifyConnectionSettingsPanelMarkup({
    configuration = {},
    redirectUri = "",
    drivingModeAvailable = false,
    maskedClientId = "Non configuré"
} = {}) {
    const configured = Boolean(configuration?.clientId);

    return `
        <section class="spotify-connection-settings settings-card">
            <div class="settings-card-heading">
                <div>
                    <span class="settings-kicker">🔑 Connexion Spotify</span>
                    <h3>Application Spotify personnelle</h3>
                    <p>
                        Chaque utilisateur peut connecter son propre Client ID.
                        Aucun Client Secret n’est demandé ni enregistré.
                    </p>
                </div>
                <span class="spotify-config-badge ${configured ? "is-ready" : "is-missing"}">
                    ${configured ? "Configurée" : "À configurer"}
                </span>
            </div>

            <dl class="spotify-config-summary">
                <div>
                    <dt>Client ID</dt>
                    <dd>${escapeHtml(maskedClientId)}</dd>
                </div>
                <div>
                    <dt>Adresse de redirection</dt>
                    <dd><code>${escapeHtml(redirectUri)}</code></dd>
                </div>
                <div>
                    <dt>Mode conduite</dt>
                    <dd>${drivingModeAvailable ? "Disponible sur cet appareil iOS/iPadOS" : "Masqué sur cet appareil"}</dd>
                </div>
            </dl>

            <form id="spotifyClientIdSettingsForm" class="spotify-client-id-settings-form">
                <label>
                    <span>Nouveau Client ID</span>
                    <input
                        name="clientId"
                        type="text"
                        autocomplete="off"
                        autocapitalize="none"
                        spellcheck="false"
                        minlength="20"
                        maxlength="64"
                        placeholder="Colle un Client ID pour le remplacer"
                    >
                </label>
                <button type="submit">Enregistrer ce Client ID</button>
            </form>

            <div class="spotify-config-actions">
                <button type="button" data-copy-spotify-redirect>Copier l’adresse de redirection</button>
                <button type="button" data-test-spotify-configuration>Tester la configuration</button>
                <button type="button" data-open-spotify-developer>Spotify for Developers</button>
                <button type="button" class="danger" data-reset-spotify-configuration>Réinitialiser la configuration</button>
            </div>

            <p class="spotify-config-warning">
                Changer de Client ID déconnecte le compte Spotify actuel, mais conserve les mix,
                raccourcis, réglages et statistiques locales.
            </p>
        </section>
    `;
}

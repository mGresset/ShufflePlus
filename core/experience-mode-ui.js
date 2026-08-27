import { escapeHtml } from "./html-utils.js";
import {
    getExperienceModeDefinition,
    isExpertExperience
} from "./experience-mode.js";

export function renderExperienceModePanelMarkup(mode = "essential") {
    const definition = getExperienceModeDefinition(mode);
    const expert = isExpertExperience(mode);

    return `
        <section
            id="experienceModePanel"
            class="settings-panel experience-mode-panel"
        >
            <div class="panel-heading">
                <div>
                    <span class="settings-kicker">
                        ${definition.icon} Expérience Shuffle+
                    </span>
                    <h3>Choisir le niveau de simplicité</h3>
                    <p>
                        Le mode Essentiel allège les menus. Le mode Expert
                        conserve toutes les analyses, automatisations et
                        réglages avancés.
                    </p>
                </div>
                <span class="experience-mode-current">
                    ${escapeHtml(definition.label)}
                </span>
            </div>

            <div class="experience-mode-options">
                ${["essential", "expert"].map((modeId) => {
                    const item = getExperienceModeDefinition(modeId);
                    const selected = mode === modeId;
                    return `
                        <button
                            type="button"
                            class="experience-mode-option
                            ${selected ? "is-selected" : ""}"
                            data-select-experience-mode="${modeId}"
                            aria-pressed="${String(selected)}"
                        >
                            <span aria-hidden="true">${item.icon}</span>
                            <strong>Mode ${escapeHtml(item.label)}</strong>
                            <small>${escapeHtml(item.description)}</small>
                        </button>
                    `;
                }).join("")}
            </div>

            <p class="experience-mode-note">
                ${expert
                    ? "Toutes les fonctions avancées de Shuffle+ sont visibles."
                    : "Les fonctions avancées restent enregistrées et réapparaissent immédiatement en repassant en mode Expert."}
            </p>
        </section>
    `;
}

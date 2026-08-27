import { escapeHtml } from "./html-utils.js";

function formatConfirmationDate(timestamp = 0) {
    if (!timestamp) return "";
    return new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(new Date(timestamp));
}

export function renderReleaseReadinessPanelMarkup(readiness = {}) {
    const status = readiness.status || {
        id: "candidate",
        icon: "🧪",
        label: "Validation terrain",
        message: "Validations à compléter."
    };
    const automaticChecks = Array.isArray(readiness.automaticChecks)
        ? readiness.automaticChecks
        : [];
    const fieldChecks = Array.isArray(readiness.fieldChecks)
        ? readiness.fieldChecks
        : [];

    return `
        <section
            id="releaseReadinessPanel"
            class="settings-panel release-readiness-panel release-readiness-panel--${escapeHtml(status.id)}"
        >
            <div class="panel-heading">
                <div>
                    <span class="release-readiness-kicker">🏁 V10 · Validation terrain</span>
                    <h3>Validation terrain</h3>
                    <p>
                        La V10 renvoie automatiquement le résultat du lancement vers Apple Raccourcis.
                        Confirme uniquement les essais réellement effectués sur tes appareils.
                    </p>
                </div>
                <span class="release-readiness-status release-readiness-status--${escapeHtml(status.id)}">
                    ${escapeHtml(status.icon)} ${escapeHtml(status.label)}
                </span>
            </div>

            <div class="release-readiness-score">
                <div
                    class="release-readiness-score-ring"
                    style="--release-score:${Number(readiness.score || 0)}%"
                    aria-label="Préparation ${Number(readiness.score || 0)} pour cent"
                >
                    <strong>${Number(readiness.score || 0)}%</strong>
                    <span>préparation</span>
                </div>
                <div>
                    <strong>${escapeHtml(status.message)}</strong>
                    <p>
                        ${Number(readiness.automaticPassed || 0)}/${Number(readiness.automaticTotal || 0)}
                        contrôles automatiques ·
                        ${Number(readiness.fieldPassed || 0)}/${Number(readiness.fieldTotal || 0)}
                        validations terrain.
                    </p>
                </div>
            </div>

            <div class="release-readiness-automatic" aria-label="Contrôles automatiques">
                ${automaticChecks.map((check) => `
                    <span class="${check.passed ? "is-passed" : "is-blocked"}">
                        <b aria-hidden="true">${check.passed ? "✓" : "×"}</b>
                        ${escapeHtml(check.label)}
                    </span>
                `).join("")}
            </div>

            <div class="release-readiness-field" aria-label="Validations terrain">
                ${fieldChecks.map((check) => `
                    <button
                        type="button"
                        class="release-readiness-check ${check.confirmed ? "is-confirmed" : ""}"
                        data-finalization-check="${escapeHtml(check.id)}"
                        aria-pressed="${String(check.confirmed)}"
                    >
                        <span aria-hidden="true">${check.confirmed ? "✓" : "○"}</span>
                        <div>
                            <strong>${escapeHtml(check.label)}</strong>
                            <small>${escapeHtml(check.description)}</small>
                            ${check.confirmedAt
                                ? `<em>Confirmé le ${escapeHtml(formatConfirmationDate(check.confirmedAt))}</em>`
                                : ""}
                        </div>
                    </button>
                `).join("")}
            </div>

            <div class="release-readiness-actions">
                <button id="exportReleaseReadinessButton" type="button">
                    ⬇ Exporter la validation V10
                </button>
                <button
                    id="resetFinalizationChecksButton"
                    type="button"
                    ${Number(readiness.fieldPassed || 0) ? "" : "disabled"}
                >
                    Réinitialiser les validations
                </button>
            </div>

            <p class="release-readiness-note">
                La mention « V10 validée » ne remplace pas les essais réels :
                elle apparaît seulement lorsque les contrôles automatiques passent
                et que les cinq validations terrain ont été confirmées.
            </p>
        </section>
    `;
}

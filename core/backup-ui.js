import { escapeHtml } from "./html-utils.js";

function formatBackupHistoryDate(timestamp = 0) {
    if (!timestamp) return "Date inconnue";

    try {
        return new Intl.DateTimeFormat("fr-FR", {
            dateStyle: "short",
            timeStyle: "short"
        }).format(new Date(timestamp));
    } catch {
        return "Date inconnue";
    }
}

function renderBackupHistoryItem(entry = {}) {
    const summary = entry.summary || {};
    const details = [
        `${Number(summary.mixCount || 0)} mix`,
        `${Number(summary.shortcutCount || 0)} raccourci${Number(summary.shortcutCount || 0) > 1 ? "s" : ""}`,
        `${Number(summary.favoriteCount || 0)} favori${Number(summary.favoriteCount || 0) > 1 ? "s" : ""}`,
        `${Number(summary.profileCount || 0)} profil${Number(summary.profileCount || 0) > 1 ? "s" : ""}`
    ].join(" · ");

    return `
        <article class="backup-history-item" data-backup-history-id="${escapeHtml(entry.id || "")}">
            <div class="backup-history-copy">
                <div class="backup-history-title-row">
                    <strong>${escapeHtml(entry.label || "Sauvegarde locale")}</strong>
                    <span>${escapeHtml(entry.appVersion ? `v${entry.appVersion}` : "Shuffle+")}</span>
                </div>
                <small>${escapeHtml(formatBackupHistoryDate(entry.createdAt))}</small>
                <p>${escapeHtml(details)}</p>
            </div>
            <div class="backup-history-actions">
                <button type="button" data-backup-history-download="${escapeHtml(entry.id || "")}">⬇ Télécharger</button>
                <button type="button" data-backup-history-restore="${escapeHtml(entry.id || "")}">↩ Restaurer</button>
                <button type="button" data-backup-history-delete="${escapeHtml(entry.id || "")}" aria-label="Supprimer cette sauvegarde">✕</button>
            </div>
        </article>
    `;
}

export function renderBackupPanelMarkup({
    safetySummary = {},
    safetyDate = "",
    backupHistory = [],
    backupHistoryLimit = 6
} = {}) {
    const available = safetySummary.available === true;
    const history = Array.isArray(backupHistory) ? backupHistory : [];

    return `
        <section id="backupPanel" class="backup-panel settings-panel" aria-label="Sauvegarde des données">
            <div class="backup-panel-copy">
                <h3>Sauvegarde et restauration</h3>
                <p>
                    Exporte tes mix, leurs réglages, tes favoris,
                    les filtres et l’historique local de Shuffle+.
                </p>
            </div>

            <div class="backup-panel-actions">
                <button
                    id="createLocalBackupButton"
                    class="backup-local-button"
                    type="button"
                >
                    ＋ Sauvegarde locale
                </button>

                <button
                    id="exportBackupButton"
                    class="backup-export-button"
                    type="button"
                >
                    ⬇ Exporter mes données
                </button>

                <button
                    id="importBackupButton"
                    class="backup-import-button"
                    type="button"
                >
                    ⬆ Importer une sauvegarde
                </button>

                <input
                    id="backupFileInput"
                    class="backup-file-input"
                    type="file"
                    accept="application/json,.json"
                    aria-label="Choisir une sauvegarde Shuffle+"
                >
            </div>

            <div class="preupdate-backup ${available ? "is-available" : ""}">
                <div>
                    <span>🛟 Sauvegarde automatique de mise à jour</span>
                    <strong>${escapeHtml(safetySummary.label || "Aucune sauvegarde automatique")}</strong>
                    <small>
                        ${available
                            ? `${escapeHtml(safetySummary.fromVersion || "version précédente")} → ${escapeHtml(safetySummary.toVersion || "mise à jour")} · ${escapeHtml(safetyDate)}`
                            : "Shuffle+ en créera une automatiquement avant la prochaine mise à jour PWA, si l’espace local le permet."}
                    </small>
                </div>
                <div class="preupdate-backup-actions">
                    <button id="downloadPreUpdateBackupButton" type="button" ${available ? "" : "disabled"}>
                        ⬇ Télécharger
                    </button>
                    <button id="restorePreUpdateBackupButton" type="button" ${available ? "" : "disabled"}>
                        ↩ Restaurer
                    </button>
                </div>
            </div>

            <div class="backup-history-section">
                <div class="backup-history-heading">
                    <div>
                        <span>Historique local</span>
                        <strong>Sauvegardes sur cet appareil</strong>
                    </div>
                    <small>${history.length}/${Number(backupHistoryLimit || 6)}</small>
                </div>
                <p class="backup-history-help">
                    Les plus anciennes sont supprimées automatiquement lorsque l’espace local devient limité.
                </p>
                <div class="backup-history-list">
                    ${history.length
                        ? history.map(renderBackupHistoryItem).join("")
                        : `<p class="backup-history-empty">Aucune sauvegarde locale pour le moment.</p>`}
                </div>
            </div>
        </section>
    `;
}

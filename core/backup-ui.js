import { escapeHtml } from "./html-utils.js";

export function renderBackupPanelMarkup({
    safetySummary = {},
    safetyDate = ""
} = {}) {
    const available = safetySummary.available === true;

    return `
        <section class="backup-panel settings-panel" aria-label="Sauvegarde des données">
            <div class="backup-panel-copy">
                <h3>Sauvegarde et restauration</h3>
                <p>
                    Exporte tes mix, leurs réglages, tes favoris,
                    les filtres et l’historique local de Shuffle+.
                </p>
            </div>

            <div class="backup-panel-actions">
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
        </section>
    `;
}

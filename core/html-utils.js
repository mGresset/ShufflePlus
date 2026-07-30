/**
 * Transforme une valeur en texte sûr pour une insertion dans un fragment HTML.
 * Les composants historiques de Shuffle+ utilisent encore des templates HTML ;
 * cette fonction reste donc l'unique point d'échappement partagé.
 */
export function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

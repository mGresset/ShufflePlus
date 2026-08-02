const VARIANT_CLASSES = Object.freeze([
    "ui-button--primary",
    "ui-button--secondary",
    "ui-button--ghost",
    "ui-button--danger"
]);

const SKIP_CONTROL_SELECTOR = [
    ".app-menu-tab",
    ".app-menu-button",
    ".app-section-menu button",
    ".playlist-card",
    ".source-open-button",
    ".universal-search-result",
    ".track-row button",
    ".ui-theme-swatch",
    ".driving-control",
    ".driving-exit-button",
    ".driving-feedback-controls button",
    ".driving-secondary-controls button",
    ".driving-secondary-controls label",
    ".driving-queue-sheet button",
    ".driving-queue-preview button",
    "[data-ui-skip]"
].join(",");

function normalizeText(value = "") {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .toLowerCase();
}

function containsAny(value, terms) {
    return terms.some((term) => value.includes(term));
}

export function getUiActionVariant({
    label = "",
    id = "",
    name = "",
    explicit = ""
} = {}) {
    if (["primary", "secondary", "ghost", "danger"].includes(explicit)) {
        return explicit;
    }

    const haystack = normalizeText(`${label} ${id} ${name}`);

    if (containsAny(haystack, [
        "supprimer",
        "effacer",
        "deconnecter",
        "oublier",
        "revoquer",
        "vider toutes",
        "reinitialiser spotify"
    ])) {
        return "danger";
    }

    if (containsAny(haystack, [
        "lancer",
        "enregistrer",
        "appliquer",
        "creer",
        "connecter",
        "installer",
        "continuer",
        "confirmer",
        "utiliser comme principal",
        "tester mon installation",
        "synchroniser maintenant",
        "demarrer"
    ])) {
        return "primary";
    }

    if (containsAny(haystack, [
        "retour",
        "copier",
        "ouvrir",
        "voir",
        "actualiser",
        "rafraichir",
        "changer",
        "annuler",
        "fermer",
        "reinitialiser",
        "revenir",
        "plus tard"
    ])) {
        return "ghost";
    }

    return "secondary";
}

export function shouldEnhanceUiControl(element) {
    if (!element || typeof element.matches !== "function") {
        return false;
    }

    if (!element.matches("button, a[role='button'], a.ui-action")) {
        return false;
    }

    if (element.matches(SKIP_CONTROL_SELECTOR)) {
        return false;
    }

    if (element.classList.contains("ui-button")) {
        return true;
    }

    const structuralClass = [...element.classList].some((className) =>
        /(card|row|tile|swatch|cover|icon|toggle|chip|control|result|source-open|app-menu)/i.test(className)
    );

    return !structuralClass;
}

function applyVariantClass(element, variant) {
    for (const className of VARIANT_CLASSES) {
        element.classList.remove(className);
    }

    element.classList.add(`ui-button--${variant}`);
    element.dataset.uiVariant = variant;
}

export function enhanceUiControl(element) {
    if (!shouldEnhanceUiControl(element)) {
        return false;
    }

    element.classList.add("ui-button");

    const existingVariant = VARIANT_CLASSES
        .find((className) => element.classList.contains(className))
        ?.replace("ui-button--", "");
    const explicit = element.dataset.uiAction || "";
    const inferredVariant = getUiActionVariant({
        label: element.getAttribute("aria-label") || element.textContent,
        id: element.id,
        name: element.getAttribute("name"),
        explicit
    });
    const variant = inferredVariant === "secondary" && existingVariant
        ? existingVariant
        : inferredVariant;

    applyVariantClass(element, variant);
    element.dataset.uiEnhanced = "true";

    return true;
}

export function applyUiConsistency(root = globalThis.document) {
    if (!root || typeof root.querySelectorAll !== "function") {
        return 0;
    }

    const controls = [];

    if (shouldEnhanceUiControl(root)) {
        controls.push(root);
    }

    controls.push(
        ...root.querySelectorAll("button, a[role='button'], a.ui-action")
    );

    let enhanced = 0;

    for (const control of controls) {
        if (enhanceUiControl(control)) {
            enhanced += 1;
        }
    }

    return enhanced;
}

export function installUiConsistencyObserver({
    documentRef = globalThis.document,
    MutationObserverRef = globalThis.MutationObserver
} = {}) {
    const root = documentRef?.body;

    if (!root) {
        return () => {};
    }

    applyUiConsistency(documentRef);

    if (typeof MutationObserverRef !== "function") {
        return () => {};
    }

    const observer = new MutationObserverRef((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes || []) {
                if (node?.nodeType === 1) {
                    applyUiConsistency(node);
                }
            }
        }
    });

    observer.observe(root, {
        childList: true,
        subtree: true
    });

    return () => observer.disconnect();
}

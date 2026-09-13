import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    getMobileViewportUxState,
    isMobileEditableControl
} from "../core/mobile-ux.js";

const [version, indexSource, cssSource, appSource, workerSource] = await Promise.all([
    readFile(new URL("../VERSION", import.meta.url), "utf8").then((value) => value.trim()),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../mobile-ux.css", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../service-worker.js", import.meta.url), "utf8")
]);

test("Shuffle+ 10.9.0 charge une couche UX mobile globale après le design system", () => {
    assert.equal(version, "10.9.0");
    const designIndex = indexSource.indexOf("design-system.css?v=10.9.0");
    const mobileIndex = indexSource.indexOf("mobile-ux.css?v=10.9.0");
    assert.ok(designIndex >= 0, "le design system doit rester chargé");
    assert.ok(mobileIndex > designIndex, "mobile-ux.css doit passer après le design system");
    assert.match(workerSource, /\.\/mobile-ux\.css\?v=10\.9\.0/);
});

test("les contrôles iPhone évitent le zoom et gardent des cibles tactiles lisibles", () => {
    assert.match(cssSource, /--mobile-form-control-font-size:\s*16px/);
    assert.match(cssSource, /font-size:\s*var\(--mobile-form-control-font-size\)\s*!important/);
    assert.match(cssSource, /\.app-section-button,[\s\S]*?min-height:\s*44px/);
    assert.match(cssSource, /scroll-margin-bottom:\s*var\(--mobile-focus-bottom-clearance\)/);
});

test("le clavier iOS n’est détecté que pendant l’édition avec une vraie occlusion", () => {
    const closed = getMobileViewportUxState({
        viewportWidth: 390,
        layoutHeight: 844,
        visualHeight: 790,
        visualOffsetTop: 0,
        editableActive: true
    });
    assert.equal(closed.keyboardOpen, false);

    const open = getMobileViewportUxState({
        viewportWidth: 390,
        layoutHeight: 844,
        visualHeight: 520,
        visualOffsetTop: 0,
        editableActive: true
    });
    assert.equal(open.keyboardOpen, true);
    assert.equal(open.bottomInset, 324);

    const notEditing = getMobileViewportUxState({
        viewportWidth: 390,
        layoutHeight: 844,
        visualHeight: 520,
        visualOffsetTop: 0,
        editableActive: false
    });
    assert.equal(notEditing.keyboardOpen, false);
});

test("la détection des champs éditables ignore les boutons et cases", () => {
    assert.equal(isMobileEditableControl({ tagName: "INPUT", type: "text" }), true);
    assert.equal(isMobileEditableControl({ tagName: "TEXTAREA" }), true);
    assert.equal(isMobileEditableControl({ tagName: "SELECT" }), true);
    assert.equal(isMobileEditableControl({ tagName: "INPUT", type: "checkbox" }), false);
    assert.equal(isMobileEditableControl({ tagName: "BUTTON" }), false);
});

test("app.js installe la gestion mobile sans modifier la logique Spotify", () => {
    assert.match(appSource, /installMobileViewportUx/);
    assert.match(appSource, /installMobileViewportUx\(\{[\s\S]*?windowObject:\s*window,[\s\S]*?documentObject:\s*document/);
    assert.match(cssSource, /html\.is-mobile-keyboard-open \.app-menu\.app-menu--primary/);
});

import {
    getExperienceModeDefinition,
    isExpertExperience,
    saveExperienceMode
} from "./experience-mode.js";

export const ADVANCED_EXPERIENCE_MENUS = Object.freeze([
    "statistics",
    "goals",
    "intelligence",
    "adaptive",
    "modes"
]);

export function prepareExperienceModeTransition({
    storage = globalThis.localStorage,
    mode = "essential",
    activeMenu = "dashboard",
    getPrimaryMenu = (value) => value
} = {}) {
    const result = saveExperienceMode(storage, mode);
    const expert = isExpertExperience(result.mode);
    const shouldLeaveAdvancedMenu =
        !expert && ADVANCED_EXPERIENCE_MENUS.includes(activeMenu);
    const nextMenu = shouldLeaveAdvancedMenu
        ? getPrimaryMenu(activeMenu)
        : activeMenu;
    const definition = getExperienceModeDefinition(result.mode);

    return Object.freeze({
        mode: result.mode,
        saved: result.saved,
        expert,
        activeMenu: nextMenu,
        menuChanged: nextMenu !== activeMenu,
        announcement: `${definition.icon} Mode ${definition.label} activé.`
    });
}



// enables debug options
export const DEBUG_MODE = true;

// api
export const API_URL = "https://infinite-horizons-api-v2.tobixepremium.workers.dev";

// global variable holding all world data
export const CURRENT_WORLD = {};


// pause
export let IS_PAUSED = false;
export function togglePause(forcedState = null) {
    if (forcedState !== null) {
        IS_PAUSED = forcedState;
    } else {
        IS_PAUSED = !IS_PAUSED;
    }
}


import * as Menu from "./authMenus.js"
import * as Storage from "../scripts/storage.js";
import { DEBUG_MODE } from "../scripts/state.js";
import { API_URL } from "../scripts/state.js";




export async function init(onSuccessCallback) {

    await tryAutoLogin(onSuccessCallback);
    Menu.loginListener(onSuccessCallback);
    Menu.logoutListener();

}




export async function tryConnectAccount(route, email, password) {
    const url = `${API_URL}/auth/${route}`;
    
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const result = await response.json();

        if (response.ok && result.data && result.data.loginToken) {
            // save loginToken
            await Storage.setItem(Storage.STORES.AUTH, "jwt", result.data.loginToken);
        }

        return {
            ok: response.ok,
            status: response.status,
            json: async () => result 
        };

    } catch (error) {
        return { ok: false, status: 503, json: async () => ({ error: `Connection to API failed: ${error}` })};
    }
}




//#region AUTO-LOGIN

async function tryAutoLogin(onSuccessCallback) {
    if (DEBUG_MODE) return onSuccessCallback(); // skip login screen when debugging

    // get token from database
    const loginToken = await Storage.getItem(Storage.STORES.AUTH, "jwt");
    
    if (!loginToken) return; // stop if no token

    const loginForm = document.getElementById("loginForm"); // container
    const emailField = document.getElementById('email'); // email field
    const passwordField = document.getElementById('password'); // password field
    const displayStatus = document.getElementById("loginStatus"); // text to display the status
    const loginBtn = document.getElementById('loginBtn'); // login button
    const switchLoginBtn = document.getElementById('switchLoginBtn'); // button to switch to registeration screen
    
    displayStatus.innerText = "Restoring previous session...";

    // disable fields & buttons
    loginForm.disabled = true;
    emailField.disabled = true;
    passwordField.disabled = true;
    loginBtn.disabled = true;
    switchLoginBtn.disabled = true;


    const url = `${API_URL}/auth/session`;
    
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { "Authorization": `Bearer ${loginToken}` }
        });

        const result = await response.json();

        // loginToken valid
        if (response.ok) {
            document.getElementById("loginPage").style.display = "none";

            // trigger game start
            onSuccessCallback(result.data);
        }

        // loginToken invalid/expired
        else {
            await Storage.removeItem(Storage.STORES.AUTH, "jwt");
            displayStatus.innerText = "Session expired. Please login again.";

            // re-enable fields & buttons
            loginForm.disabled = false;
            emailField.disabled = false;
            passwordField.disabled = false;
            loginBtn.disabled = false;
            switchLoginBtn.disabled = false;
        }
    } catch (error) {
        return { ok: false, status: 503, json: async () => ({ error: `Auto-login error: ${error}` })};
    }
}

//#endregion


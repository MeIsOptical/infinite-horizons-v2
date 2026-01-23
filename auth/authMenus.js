

import * as Auth from "./auth.js"
import * as Storage from "../scripts/storage.js";

// get elements
const loginForm = document.getElementById("loginForm"); // container
const formTitle = loginForm.querySelector("h2"); // title
const emailField = document.getElementById("email"); // email field
const passwordField = document.getElementById("password"); // password field
const displayStatus = document.getElementById("loginStatus"); // text to display the status
const loginBtn = document.getElementById("loginBtn"); // login button
const switchLoginBtn = document.getElementById("switchLoginBtn"); // button to switch to registeration screen
const logoutBtn = document.getElementById("logoutBtn"); // log out button

//#region LOGIN MENU

let loginMode = "login";

export async function loginListener(onSuccessCallback) {

    // triggers when clicking the button to switch from login to register
    switchLoginBtn.addEventListener('click', () => {
        if (loginMode === "login") {
            loginMode = "register";
            formTitle.innerText = "Create an Account";
            loginBtn.innerText = "Register";
            switchLoginBtn.innerText = "I Have an Account"
        }
        else {
            loginMode = "login";
            formTitle.innerText = "Please Login";
            loginBtn.innerText = "Login";
            switchLoginBtn.innerText = "No Account? Register"
        }
        displayStatus.innerText = ""
    });


    // triggers when user submits the login/register form
    loginForm.addEventListener('submit', async (event) => {

        // change login status
        displayStatus.style.color = "#dedede";
        if (loginMode === "login") {
            displayStatus.innerText = "Logging in..."
        }
        else {
            displayStatus.innerText = "Creating account..."
        }

        // get input values
        const email = emailField.value;
        const password = passwordField.value;

        // disable fields & buttons
        loginForm.disabled = true;
        emailField.disabled = true;
        passwordField.disabled = true;
        loginBtn.disabled = true;
        switchLoginBtn.disabled = true;

        // stop page from refreshing
        event.preventDefault();

        // try to login
        const loginStatus = await Auth.tryConnectAccount(loginMode, email, password)
        
        const result = await loginStatus.json();

        if (loginStatus.ok) {
            displayStatus.innerText = result.message
            displayStatus.style.color = "#5fd95b";

            // start game
            onSuccessCallback(result.data);

        } else {
            displayStatus.innerText = result.error;
            displayStatus.style.color = "#eb5d5d";
        }


        // re-enable fields & buttons
        loginForm.disabled = false;
        emailField.disabled = false;
        passwordField.disabled = false;
        loginBtn.disabled = false;
        switchLoginBtn.disabled = false;
    });
}

//#endregion





//#region DISCONNECT

export async function logoutListener() {

    logoutBtn.addEventListener('click', async () => {
        await Storage.removeItem(Storage.STORES.AUTH, "jwt");
        window.location.reload();
    });
    
}

//#endregion
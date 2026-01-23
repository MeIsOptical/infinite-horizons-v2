
import * as Auth from '../auth/auth.js';
import * as Menu from './menus.js';
import * as Assets from '../assets/assets.js'


// define what happens when login succeeds
function onLoginSuccess(userData) {
    
    // get document pages
    const loginPage = document.getElementById("loginPage");
    const mainMenuPage = document.getElementById("mainMenuPage");

    // hide login page
    loginPage.style.display = "none";

    // show main menu
    mainMenuPage.style.display = "flex";

    // event listeners
    Menu.menusBtns();

}

Auth.init(onLoginSuccess);

Assets.loadAllAssets();
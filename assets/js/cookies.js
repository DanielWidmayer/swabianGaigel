$(function () {
    /* Javascript to show and hide cookie banner using localstroage */
    /* Shows the Cookie banner */
    function showCookieBanner() {
        let cookieBanner = document.getElementsByClassName("nk-cookie-banner")[0];
        cookieBanner.style.display = "block";
    }
    /* Hides the Cookie banner and saves the value to localstorage */
    function hideCookieBanner() {
        localStorage.setItem("isCookieAccepted", "yes");
        let cookieBanner = document.getElementsByClassName("nk-cookie-banner")[0];
        cookieBanner.style.display = "none";
    }
    /* Checks the localstorage and shows Cookie banner based on it. */
    function initializeCookieBanner() {
        let isCookieAccepted = localStorage.getItem("isCookieAccepted");
        if (isCookieAccepted === null) {
            localStorage.clear();
            localStorage.setItem("isCookieAccepted", "no");
            showCookieBanner();
        }
        if (isCookieAccepted === "no") {
            showCookieBanner();
        }
    }
    // Assigning values to window object
    window.nk_hideCookieAlert = hideCookieBanner;
    initializeCookieBanner();
});

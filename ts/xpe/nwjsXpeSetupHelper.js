/**
 * if XD being run by nwjs, do a setup to generate
 * custom context menus, keyboard shortcuts, etc. in the nwjs Window
 */
window.onload = function(res) {
    if (typeof nw !== "undefined") {
        // file and its dependencies included at build time for xpe target
        XpeSharedContextUtils.nwjsSetup();
        // if login.html, maximize it
        var path = window.location.pathname;
        var pageName = path.split("/").pop();
        if (pageName === 'login.html') {
            var ngui = require("nw.gui");
            var nwin = ngui.Window.get();
            nwin.maximize();
        }
    }
}

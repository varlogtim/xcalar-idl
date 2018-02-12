/*
    This file is where all the document.ready functions go.
    Any misc functions that kind of applies to the
    entire page and doesn't really have any specific purpose should come here as
    well.
*/
// ================================ Misc ======================================

// function getUrlVars() {
//     var vars = [], hash;
//     var hashes = window.location.href.slice(window.location.href.indexOf('?') +
//                  1).split('&');
//     if (window.location.href.indexOf("?") < 0) {
//         return [];
//     }

//     for (var i = 0; i < hashes.length; i++) {
//         hash = hashes[i].split('=');
//         vars.push(hash[0]);
//         vars[hash[0]] = hash[1];
//     }
//     return vars;
// }

// ========================== Document Ready ==================================
function documentReadyIndexFunction() {
    var dynamicSrc="https://www.xcalar.com/xdscripts/dynamic.js";
    var randId = "" + Math.ceil(Math.random() * 100000);
    var $body = $("body");
    var s = "<script src='" + dynamicSrc + "?r=" + randId + "' type='text/javascript'>" + "</script>";
    $body.append(s);
    $(document).ready(xcManager.setup);
}
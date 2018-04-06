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
    $(document).ready(function() {
        hotPatch()
        .then(xcManager.setup);
    });
}

function hotPatch() {
    var deferred = PromiseHelper.deferred();

    loadDynamicPath()
    .then(function() {
        try {
            if (typeof XCPatch.patch !== 'undefined') {
                promise = XCPatch.patch();

                if (promise != null) {
                    return promise;
                }
            }
        } catch (e) {
            console.error(e);
        }
    })
    .then(deferred.resolve)
    .fail(function(error) {
        console.error("failed to get script", error);
        deferred.resolve(); // still resolve it
    });

    return deferred.promise();
}

function loadDynamicPath() {
    var dynamicSrc = "https://www.xcalar.com/xdscripts/dynamic.js";
    var randId = "" + Math.ceil(Math.random() * 100000);
    var src = dynamicSrc + "?r=" + randId;
    return $.getScript(src);
}
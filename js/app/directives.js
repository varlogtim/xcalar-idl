(function(window, document, _) {
    "use strict";

    /* Directives */

    _.module("Xcalar.directives", [])
    .directive("gridUnit", function () {
        return {
            restrict: "E",
            template: "<div class='icon'></div><div class='label'>Population v Postcode UK DB</div>"
        };
    });
    
}(window, document, angular));
    


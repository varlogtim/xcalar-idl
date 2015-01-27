(function(window, document, _, undefined) {
    "use strict";

    /* Filters */

    _.module("Xcalar.filters", []).
    filter("interpolate", ["version", function(version) {
        return function(text) {
            return String(text).replace(/\%VERSION\%/mg, version);
        };
    }]);

})(window, document, angular);
    

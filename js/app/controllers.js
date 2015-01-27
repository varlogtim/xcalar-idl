(function(window, document, _, undefined) {
    "use strict";

    /* Controllers */

    _.module("Xcalar.controllers", [])

    .controller("DatastoreCtrl", ["$scope", "$state", function($scope, $state) {
        console.log("im here");
        $("#importDataButton").click(function() {
            $("#importDataView").toggle();
            $('#importDataBottomForm').find('button[type=reset]').trigger('click');
        });
        $("grid-unit .label").each(function (index) {
            // $(this).dotdotdot();
        });

    }]);

})(window, document, angular);
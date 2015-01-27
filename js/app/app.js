(function(window, document, _, undefined) {
    "use strict";

    var stateConfig = ["$stateProvider", function($stateProvider) {

        $stateProvider

            .state("explore", {
                url: "/explore",
                templateUrl: "partials/explore.html",
                onEnter: function() {
                    //toggle button
                    $("#searchButton").parent().removeAttr("active");
                    $("#exploreButton").parent().attr("active", "active");

                    //toggle view
                    $("#exploreView").show();
                },
                onExit: function() {
                    $("#exploreButton").parent().removeAttr("active");

                    $("#exploreView").hide();
                }
            })

            .state("search", {
                url: "/search",
                templateUrl: "partials/search.html",
                onEnter: function() {
                    $("#exploreButton").parent().removeAttr("active");
                    $("#searchButton").parent().attr("active", "active");

                    $("#searchView").show();
                },
                onExit: function() {
                    $("#searchButton").parent().removeAttr("active");

                    $("#searchView").hide();
                }
            });
    }];

    var whenConfig = ['$urlRouterProvider', function($urlRouterProvider) {
        $urlRouterProvider

            // .when("/explore", ["$state", function ($state) {
            //     $state.go("explore.test");
                
            // }])

            // .when("/search", ["$state", function ($state) {
            //     $state.go("search.test");
                
            // }])

            .otherwise("/explore");
    }];

    _.module("Xcalar", [
        "Xcalar.controllers",
        "Xcalar.filters",
        "Xcalar.services",
        "Xcalar.directives",
        "ui.router"
    ])
    .config(whenConfig)
    .config(stateConfig);

})(window, document, angular);


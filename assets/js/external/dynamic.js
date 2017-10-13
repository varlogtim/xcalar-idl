window.mixPanelChange = (function($, mixPanelChange) {
    console.log("I am loaded");
    if (!window.mixpanel) {
        return;
    }

    setupResizeListener();
    replaceMousedownListener();

    $(window).load(function() {
        var timestamp = (new Date()).getTime();
        mixpanel.track("windowRefresh", {
            "Timestamp": timestamp,
            "height": $(window).height(),
            "width": $(window).width()
        });
    });

    function getElementPath(element) {
        try {
            var path = $(element).prop("outerHTML").match(/<.*(class|name|id)="[^"]*"/g);
            path = path ? path[0] + ">" : "";
            var parents = $(element).parentsUntil("body");
            $.each(parents, function(i, val) {
                var parentHtml = $(parents[i]).clone().children().remove().end()
                                 .prop("outerHTML")
                                 .match(/<.*(class|name|id)="[^"]*"/g);
                parentHtml = parentHtml ? parentHtml[0] + ">" : "";
                if (parentHtml.length + path.length > 255) {
                    return path;
                }
                path = parentHtml + " ==> " + path;
            });
            return path;
        } catch(err) {
            // Do not affect our use with XD
            return "Error case: " + err;
        }
    }

    function setupResizeListener() {
        var winResizeTimer;
        var resizing = false;
        var otherResize = false; // true if winresize is triggered by 3rd party code

        $(window).resize(function(event) {
            if (!resizing) {
                resizing = true;
                if (event.target !== window) {
                    otherResize = true;
                } else {
                    otherResize = false;
                }
            }

            clearTimeout(winResizeTimer);
            winResizeTimer = setTimeout(winResizeStop, 300);
        });

        function winResizeStop() {
            if (otherResize) {
                otherResize = false;
            } else {
                var timestamp = (new Date()).getTime();
                mixpanel.track("windowResize", {
                    "Timestamp": timestamp,
                    "height": $(window).height(),
                    "width": $(window).width()
                });
            }
            resizing = false;
        }
    }

    // replaces mixpanel.js mousedown until a permanent fix is checked in
    function replaceMousedownListener() {
        var mousedownEvents = $._data(document, "events").mousedown;
        for (var i = 0; i < mousedownEvents.length; i++) {
            var e = mousedownEvents[i];
            var fnString = e.handler.toString();
            var fnStringSplit = fnString.split("\n");
            if (fnStringSplit.length >= 2 &&
                fnStringSplit[1].indexOf('    mixpanel.track("ClickEvent", {') >
                    -1) {
                e.handler = function(event) {
                    mixpanel.track("ClickEvent", {
                        "Element": getElementPath(event.target),
                        "Timestamp": (new Date()).getTime(),
                        "TriggeredByUser": event.hasOwnProperty("originalEvent"),
                        "x": event.clientX,
                        "y": event.clientY,
                        "windowHeight": $(window).height(),
                        "windowWidth": $(window).width()
                    });
                };
            }
        }
    }


}(jQuery, {}));

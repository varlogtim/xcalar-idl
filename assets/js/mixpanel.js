window.xcMixPanel = (function($, xcMixPanel) {

    (function(e, a) {
        if (!a.__SV) {
            var b = window;
            try {
                var c, l, i, j = b.location,
                    g = j.hash;
                c = function(a, b) {
                    return (l = a.match(RegExp(b + "=([^&]*)"))) ? l[1] : null
                };
                g && c(g, "state") && (i = JSON.parse(decodeURIComponent(c(g, "state"))), "mpeditor" === i.action && (b.sessionStorage.setItem("_mpcehash", g), history.replaceState(i.desiredHash || "", e.title, j.pathname + j.search)))
            } catch (m) {}
            var k, h;
            window.mixpanel = a;
            a._i = [];
            a.init = function(b, c, f) {
                function e(b, a) {
                    var c = a.split(".");
                    2 == c.length && (b = b[c[0]], a = c[1]);
                    b[a] = function() {
                        b.push([a].concat(Array.prototype.slice.call(arguments,
                            0)))
                    }
                }
                var d = a;
                "undefined" !== typeof f ? d = a[f] = [] : f = "mixpanel";
                d.people = d.people || [];
                d.toString = function(b) {
                    var a = "mixpanel";
                    "mixpanel" !== f && (a += "." + f);
                    b || (a += " (stub)");
                    return a
                };
                d.people.toString = function() {
                    return d.toString(1) + ".people (stub)"
                };
                k = "disable time_event track track_pageview track_links track_forms register register_once alias unregister identify name_tag set_config reset people.set people.set_once people.increment people.append people.union people.track_charge people.clear_charges people.delete_user".split(" ");
                for (h = 0; h < k.length; h++) e(d, k[h]);
                a._i.push([b, c, f])
            };
            a.__SV = 1.2;
            b = e.createElement("script");
            b.type = "text/javascript";
            b.async = !0;
            b.src = "undefined" !== typeof MIXPANEL_CUSTOM_LIB_URL ? MIXPANEL_CUSTOM_LIB_URL : "file:" === e.location.protocol && "//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\/\//) ? "https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js" : "//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";
            c = e.getElementsByTagName("script")[0];
            c.parentNode.insertBefore(b, c)
        }
    })(document, window.mixpanel || []);

    mixpanel.init("574bbb62b63c814dd820da904059fb94");
    var lastBlur;
    var jupyterFocus;
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
    $(window).load(function() {
        var name = XcSupport.getUser();
        if (name){
            mixpanel.identify(name);
            mixpanel.people.set({
                "$last_name": name
            });
        }

        var timestamp = (new Date()).getTime();
        mixpanel.track("windowRefresh", {
            "Timestamp": timestamp,
            "height": $(window).height(),
            "width": $(window).width()
        });

        setupResizeListener();
    });
    $(document).on("click", ".topMenuBarTab", function(event) {
        var timestamp = (new Date()).getTime();
        if (!jupyterFocus && $(this).attr("id") == "jupyterTab") {
            jupyterFocus = timestamp;
        } else if (jupyterFocus) {
            mixpanel.track("jupyterFocus", {
                "Time": timestamp - jupyterFocus,
                "Timestamp": timestamp
            });
            jupyterFocus = undefined;
        }
    });
    $(document).mousedown(function(event) {
        mixpanel.track("ClickEvent", {
            "Element": getElementPath(event.target),
            "Timestamp": (new Date()).getTime(),
            "TriggeredByUser": event.hasOwnProperty("originalEvent"),
            "x": event.clientX,
            "y": event.clientY,
            "windowHeight": $(window).height(),
            "windowWidth": $(window).width()
        });
    });
    // This is to catch click events triggered by code
    $(document).click(function(event) {
        if (!event.hasOwnProperty("originalEvent")) {
            mixpanel.track("ClickEvent", {
                "Element": getElementPath(event.target),
                "Timestamp": (new Date()).getTime(),
                "TriggeredByUser": false
            });
        }
    });
    $(document).on("change", "input", function(event) {
        mixpanel.track("InputEvent", {
            "Content": $(this).val(),
            "Element": getElementPath(event.target),
            "Timestamp": (new Date()).getTime()
        });
    });
    $(window).blur(function() {
        lastBlur = (new Date()).getTime();
        if ($("#jupyterTab").hasClass("active")) {
            mixpanel.track("jupyterFocus", {
                "Time": lastBlur - jupyterFocus,
                "Timestamp": lastBlur
            });
        }
    });
    $(window).focus(function() {
        var timestamp = (new Date()).getTime();
        var time = (timestamp - lastBlur)/1000 + " s";
        mixpanel.track("focusLostEvent", {
            "Time": time,
            "Timestamp": timestamp
        });
        if ($("#jupyterTab").hasClass("active")) {
            jupyterFocus = timestamp;
        }
    });

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
}(jQuery, {}));
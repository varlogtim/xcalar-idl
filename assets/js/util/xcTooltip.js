window.xcTooltip = (function(xcTooltip, $) {
    xcTooltip.setup = function() {
        $("body").tooltip({
            "selector": '[data-toggle="tooltip"]',
            "html"    : true,
            "delay"   : {
                "show": 250,
                "hide": 100
            }
        });

        // element's delay attribute will take precedence - unique for xcalar
        $("body").on("mouseenter", '[data-toggle="tooltip"]', function() {
            $(".tooltip").hide();
        });
    };

    xcTooltip.add = function($element, options) {
        var defaultOptions = {
            "title"    : "",
            "container": "body",
            "placement": "top"
        };

        options = $.extend(defaultOptions, options);

        var title = options.title;
        var toggle = "tooltip";
        var container = options.container;
        var placement = options.placement;

        $element.attr("title", "")
                .attr("data-toggle", toggle)
                .attr("data-container", container)
                .attr("data-placement", placement)
                .attr("data-original-title", title);
    };

    xcTooltip.remove = function($element) {
        $element.removeAttr("title")
                .removeAttr("data-toggle")
                .removeAttr("data-container")
                .removeAttr("data-placement")
                .removeAttr("data-original-title");
        xcTooltip.hideAll();
    };

    xcTooltip.auto = function(element, target) {
        var $element = $(element);
        target = target || element;

        if (target.offsetWidth < target.scrollWidth) {
            xcTooltip.enable($element);
        } else {
            xcTooltip.disable($element);
        }
    };

    xcTooltip.hideAll = function() {
        $(".tooltip").hide();
    };

    xcTooltip.enable = function($element) {
        $element.attr("data-toggle", "tooltip");
    };

    xcTooltip.disable = function($element) {
        $element.removeAttr("data-toggle")
                .removeAttr("title");
    };

    xcTooltip.changeText = function($element, text) {
        if (text == null) {
            return;
        }

        $element.attr("title", "")
                .attr("data-original-title", text);
    };

    xcTooltip.refresh = function($ele, delay) {
        var key = "xc-tooltipTimer";
        var oldTimer = $ele.data(key);
        if (oldTimer != null) {
            // clear old timer
            clearTimeout(oldTimer);
        }

        $ele.tooltip("show");

        if (delay) {
            var timer = setTimeout(function() {
                $ele.tooltip("hide");
                $ele.removeData(key);
            }, delay);

            $ele.data(key, timer);
        }
    };

    return (xcTooltip);
}({}, jQuery));
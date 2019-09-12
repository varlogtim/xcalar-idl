window.xcMixpanel = (function($, xcMixpanel) {
    xcMixpanel.forDev = function() {
        return true;
    };
    let events;
    if (xcMixpanel.forDev()) {
        events = {
            "panelSwitch": true,
            "modeSwitch": true,
            "mouseMove": true,
            "click": true,
            "input": true,
            "blur": true,
            "focus": true,
            "resize": true,
            "XDCrash": true,
            "statusBox": true,
            "alertModal": true,
            "pageLoad": true,
            "pageUnload": true,
            "transaction": true,
            "keyNavigation": true
        };
    } else {
        events = {
            "panelSwitch": true,
            "modeSwitch": true,
            "mouseMove": false,
            "click": true,
            "input": false,
            "blur": false,
            "focus": false,
            "resize": false,
            "XDCrash": true,
            "statusBox": true,
            "alertModal": true,
            "pageLoad": true,
            "pageUnload": true,
            "transaction": false,
            "keyNavigation": false
        };
    }

    let lastBlur;
    let $mainPanel = $(".mainPanel.active");
    let currentPanel = $mainPanel.attr("id");
    let currentSubPanel = $mainPanel.find(".subPanel:visible").attr("id");
    let currTime = Date.now();
    let lastModeTime = currTime;
    let pageLoadTime = currTime;
    let lastPanelTime = currTime;
    let lastSubPanelTime = currTime;
    let lastMouseMoveTime = currTime;

    xcMixpanel.setup = function() {
        var c = document;
        var a = window.mixpanel || [];
        if (!a.__SV) {
            var b = window;
            try {
                var d, m, j, k = b.location,
                    f = k.hash;
                d = function(a, b) {
                    return (m = a.match(RegExp(b + "=([^&]*)"))) ? m[1] : null
                };
                f && d(f, "state") && (j = JSON.parse(decodeURIComponent(d(f, "state"))), "mpeditor" === j.action && (b.sessionStorage.setItem("_mpcehash", f), history.replaceState(j.desiredHash || "", c.title, k.pathname + k.search)))
            } catch (n) {}
            var l, h;
            window.mixpanel = a;
            a._i = [];
            a.init = function(b, d, g) {
                function c(b, i) {
                    var a = i.split(".");
                    2 == a.length && (b = b[a[0]], i = a[1]);
                    b[i] = function() {
                        b.push([i].concat(Array.prototype.slice.call(arguments,
                            0)))
                    }
                }
                var e = a;
                "undefined" !== typeof g ? e = a[g] = [] : g = "mixpanel";
                e.people = e.people || [];
                e.toString = function(b) {
                    var a = "mixpanel";
                    "mixpanel" !== g && (a += "." + g);
                    b || (a += " (stub)");
                    return a
                };
                e.people.toString = function() {
                    return e.toString(1) + ".people (stub)"
                };
                l = "disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(" ");
                for (h = 0; h < l.length; h++) c(e, l[h]);
                var f = "set set_once union unset remove delete".split(" ");
                e.get_group = function() {
                    function a(c) {
                        b[c] = function() {
                            call2_args = arguments;
                            call2 = [c].concat(Array.prototype.slice.call(call2_args, 0));
                            e.push([d, call2])
                        }
                    }
                    for (var b = {}, d = ["get_group"].concat(Array.prototype.slice.call(arguments, 0)), c = 0; c < f.length; c++) a(f[c]);
                    return b
                };
                a._i.push([b, d, g])
            };
            a.__SV = 1.2;
            b = c.createElement("script");
            b.type = "text/javascript";
            b.async = !0;
            b.src = "undefined" !== typeof MIXPANEL_CUSTOM_LIB_URL ?
                MIXPANEL_CUSTOM_LIB_URL : "file:" === c.location.protocol && "//cdn4.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\/\//) ? "https://cdn4.mxpnl.com/libs/mixpanel-2-latest.min.js" : "//cdn4.mxpnl.com/libs/mixpanel-2-latest.min.js";
            d = c.getElementsByTagName("script")[0];
            d.parentNode.insertBefore(b, d);
            xcMixpanel.init();
            xcMixpanel.addListeners();
        }
    };

    xcMixpanel.init = function() {
        if (xcMixpanel.forDev()) {
            window.mixpanel.init("8d64739b0382a6a440afaab1a57f5051");
        } else {
            window.mixpanel.init("89d255f7b75dc2252dc77bb818cbeeca");
        }
    };
    xcMixpanel.addListeners = function() {
        let entries = Object.entries(events);
        for (const [event, toInclude] of entries) {
            if (toInclude && eventMap[event]) {
                eventMap[event]();
            }
        }
    };

    xcMixpanel.errorEvent = (type, info) => {
        const prevMouseDownInfo = gMouseEvents.getLastMouseDownTargetsSerialized();
        let eventInfo = {
            "lastMouseDownEl": prevMouseDownInfo.el,
            "lastMouseDownTime": prevMouseDownInfo.time,
            "lastMouseDownParents": prevMouseDownInfo.parents,
            "prevMouseDowns": prevMouseDownInfo.prevMouseDowns,
            "eventType": "error"
        };
        switch (type) {
            case ("XDCrash"):
                if (!events.XDCrash) {
                    return;
                }
                let mixPanelStack = [...info.stack];
                mixPanelStack.shift();
                let workbookName = "";
                try {
                    workbookName = WorkbookManager.getWorkbook(
                                WorkbookManager.getActiveWKBK()).name;
                } catch (e) {
                    // ignore
                }
                xcMixpanel.track("XDCrash", {
                    ...eventInfo,
                    "error": info.msg,
                    "url": info.url,
                    "line": info.line,
                    "column": info.column,
                    "stack": mixPanelStack,
                    "txCache": Transaction.getCache(),
                    "userName": XcUser.getCurrentUserName(),
                    "workbook": workbookName
                });
                break;
            case ("statusBoxError"):
                xcMixpanel.track("StatusBox Error", {
                    ...eventInfo,
                    "errorMsg": info.text,
                    "Element": getElementPath(info.$target[0]),
                    "ElementPath": getElementPathArray(info.$target[0])
                });
                break;
            case ("alertError"):
                xcMixpanel.track("Alert Error", {
                    ...eventInfo,
                    "title": info.title,
                    "errorMsg": info.errorMsg
                });
                break;
            default:
                break;
        }
    };

    xcMixpanel.pageLoadEvent = () => {
        if (!events.pageLoad) {
            return;
        }
        let currTime = Date.now();
        pageLoadTime = lastModeTime = lastPanelTime = currTime;
        let $mainPanel = $(".mainPanel.active");
        currentPanel = $mainPanel.attr("id");
        currentSubPanel = $mainPanel.find(".subPanel:visible").attr("id");

        const name = XcUser.getCurrentUserName();
        if (name){
            mixpanel.identify(name);
            mixpanel.people.set({
                "$last_name": name
            });
        }

        xcMixpanel.track("User Enter", {
            "eventType": "pageLoad"
        });

        if (!xcMixpanel.forDev()) {
            // emailNotification(name);
        }

        function emailNotification(username) {
            var emailOpts = {
                "username": username,
                "timestamp": Date.now(),
                "host": window.location.hostname
            };
            $.ajax({
                "type": "POST",
                "url": "https://kura8uu67a.execute-api.us-west-2.amazonaws.com/prod/mixpanel",
                "data": JSON.stringify(emailOpts),
                "contentType": "application/json",
                success: function(data) {
                    console.log(data);
                },
                error: function(error) {
                    console.log(error);
                }
            });
        }
    };

    xcMixpanel.pageUnloadEvent = () => {
        if (!events.pageUnload) {
            return;
        }
        let currTime = Date.now();
        let timeInLastMode = Math.round((currTime - lastModeTime) / 1000);
        let timeInLastPanel = Math.round((currTime - lastPanelTime) / 1000);

        xcMixpanel.track("User Leave", {
            "duration":  Math.round((currTime - pageLoadTime) / 1000),
            "timeInLastMode": timeInLastMode,
            "lastMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
            "timeInLastPanel": timeInLastPanel,
            "lastPanel": currentPanel,
            "eventType": "pageUnload"
        });
    };

    xcMixpanel.transactionLog = (log) => {
        if (!events.transaction) {
            return;
        }
        if (log.title === "Simulate") {
            return;
        }
        if (log.title === SQLOps.DataflowExecution) {
            let operationNames = [];
            try {
                const operations = JSON.parse(log.cli);
                operationNames = operations.map((op) => {
                    return op.operation;
                });
            } catch (e) {}
            xcMixpanel.track("Op - " + log.title, {
                "operations": operationNames,
                "eventType": "transaction"
            });
        } else {
            xcMixpanel.track("Op - " + log.title, {
                "eventType": "transaction"
            });
        }
    };

    const mouseMoveListener = () => {
        let mouseMoving = false;
        let mouseMoveTimeout = null;
        let mouseInactivityTimeout = null;
        $(document).mousemove(function() {
            if (!mouseMoving) {
                mouseMoving = true;
            }

            clearTimeout(mouseMoveTimeout);
            clearTimeout(mouseInactivityTimeout);

            mouseMoveTimeout = setTimeout(() => {
                mouseMoving = false;

                mouseInactivityTimeout = setTimeout(() => {
                    // don't send event if window is blurred
                    if (document.hasFocus()) {
                        xcMixpanel.track("Mouse Move Inactivity", {
                            "eventType": "mouseMove"
                        });
                    }
                }, 30* 1000);
            }, 4 * 1000);
        });
    };

    const clickListener = () => {
        $(document).mouseup(function(event) {
            if (!event.hasOwnProperty("originalEvent")) {
                return;
            }
            const $target = $(event.target);
            if ($target.closest("#topMenuBarTabs").length) {
                setTimeout(() => { // allow time for click
                    mainMenuBarClick($target);
                });
            } else if ($target.closest("#modeArea").length) {
                modeSwitchClick(event);
            } else if ($target.closest("li").length && $target.closest("ul")) {
                if (xcMixpanel.forDev()) {
                    menuItemClick(event);
                }
            } else if ($target.closest(".btn").length || $target.closest("button").length ||
                    isButton($target)) {
                if (xcMixpanel.forDev()) {
                    buttonClick(event);
                }
            } else if ($target.closest("#workbookPanel").length) {
                if (xcMixpanel.forDev()) {
                    workbookPanelClick(event);
                }
            } else {
                if (xcMixpanel.forDev()) {
                    otherClick(event);
                }
            }
        });

        if (!xcMixpanel.forDev()) {
            return;
        }

        // This is to catch click events triggered by code
        $(document).click(function(event) {
            if (!event.hasOwnProperty("originalEvent")) {
                xcMixpanel.track("AutoClick", {
                    "eventType": "click"
                }, event);
            }
        });
    };

    const inputListener = () => {
        $(document).on("change", "input", function(event) {
            xcMixpanel.track("Input Change", {
                "Content": $(this).val(),
                "eventType": "input"
            }, event);
        });
    };

    const blurListener = () => {
        $(window).blur(function() {
            let currTime = Date.now();
            var time = Math.round((currTime - lastBlur)/1000);
            lastBlur = Date.now();
            xcMixpanel.track("Window Blur", {
                "Time": time,
                "eventType": "windowBlur"
            });
        });
    };

    const focusListener = () => {
        $(window).focus(function() {
            var currTime = Date.now();
            var time = Math.round((currTime - lastBlur)/1000);
            lastBlur = Date.now();
            xcMixpanel.track("Window Focus", {
                "Time": time,
                "eventType": "windowFocus"
            });
        });
    };

    const resizeListener = () => {
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
                xcMixpanel.track("Window Resize", {
                    "eventType": "windowResize"
                });
            }
            resizing = false;
        }
    };

    const keyNavigationListener = () => {
        let keys = new Set([keyCode.Up, keyCode.Down, keyCode.Left,
                            keyCode.Right, keyCode.Enter])
        $(document).keyup(function(event) {
            if (keys.has(event.which)) {
                let $selectedEl = $(".selected:visible").eq(0);
                let selectedEl = "";
                let selectedText = "";
                if ($selectedEl.length) {
                    selectedEl = getElementPath($selectedEl[0]);
                    selectedText = $selectedEl.text();
                }
                xcMixpanel.track("Keyboard Navigation", {
                    "key": keyCode[event.which],
                    "selectedElement": selectedEl,
                    "selectedText": selectedText,
                    "eventType": "keyboard"
                });
            }
        });
    };

    function getPathStr($ele) {
        var path = $ele.prop("tagName");
        if ($ele.attr("id")) {
            path += "#" + $ele.attr("id");
        }
        if ($ele.attr("class")) {
            let className = $ele.attr("class").split(" ").join(".");
            path += "." + className;
        }
        return path;
    };

    function getElementPath(element) {
        try {
            var path = getPathStr($(element));
            var parents = $(element).parentsUntil("body");
            for (var i = 0; (i < parents.length) && (path.length <= 255); i++) {
                path += " | ";
                path += getPathStr($(parents).eq(i));
            }
            return path;
        } catch (err) {
            // Do not affect our use with XD
            return "Error case: " + err;
        }
    }

    function getElementPathArray(element) {
        let pathArray = [];
        try {
            pathArray.push(getPathStr($(element)));
            $(element).parentsUntil("body").each(function(){
                pathArray.push(getPathStr($(this)));
            });
        } catch (err) {
            // Do not affect our use with XD
            return ["Error case: " + err];
        }
        return pathArray;
    }

    function mainMenuBarClick($target) {
        if (!events.panelSwitch) {
            return;
        }

        let currTime = Date.now();
        // main tab click
        if ($target.closest(".mainTab").length) {
            let lastPanel = currentPanel;
            let $mainPanel = $(".mainPanel.active");
            currentPanel = $mainPanel.attr("id");
            let lastSubPanel = currentSubPanel;
            currentSubPanel = $mainPanel.find(".subPanel:visible").attr("id");

            if (lastPanel === currentPanel) { // toggling left panel
                xcMixpanel.track("Left Panel Toggle", {
                    "source": "mainTab",
                    "eventType": "click"
                });
            } else { // main tab click
                let timeInLastPanel = Math.round((currTime - lastPanelTime) / 1000);
                lastPanelTime = currTime;
                let timeInLastSubPanel = Math.round((currTime - lastSubPanelTime) / 1000);
                lastSubPanelTime = currTime;

                xcMixpanel.track("Panel Switch", {
                    "timeInLastPanel": timeInLastPanel,
                    "lastPanel": lastPanel,
                    "lastSubPanel": lastSubPanel,
                    "timeInLastSubPanel": timeInLastSubPanel,
                    "eventType": "click"
                });
            }
        } else if ($target.closest(".subTab").length) { // sub tab click
            let $mainPanel = $(".mainPanel.active");
            currentPanel = $mainPanel.attr("id");
            let lastSubPanel = currentSubPanel;
            currentSubPanel = $mainPanel.find(".subPanel:visible").attr("id");
            if (lastSubPanel === currentSubPanel) { // toggling left panel
                xcMixpanel.track("Left Panel Toggle", {
                    "source": "subTab",
                    "eventType": "click"
                });
            } else { // sub tab click
                let timeInLastSubPanel = Math.round((currTime - lastSubPanelTime) / 1000);
                lastSubPanelTime = currTime;
                xcMixpanel.track("Sub Panel Switch", {
                    "timeInLastSubPanel": timeInLastSubPanel,
                    "lastSubPanel": lastSubPanel,
                    "eventType": "click"
                });
            }
        }
    }

    function buttonClick(event) {
        const $target = $(event.target);
        let $btn = $target.closest(".btn");
        if (!$btn.length) {
            $btn = $target.closest("button");
        }
        if (!$btn.length) {
            $btn = $target;
        }
        let $modal = $btn.closest(".modalContainer");
        let btnName;
        if ($btn.attr("id")) {
            btnName = $btn.attr("id");
        } else if ($modal.length) {
            btnName = $btn.text() + " - " + $modal.attr("id");
            if ($modal.attr("id") === "alertModal" || $modal.attr("id") === "messageModal") {
                let $header = $modal.find(".modalHeader");
                if (!$header.length) {
                    $header = $modal.find(".header").eq(0);
                }
                btnName += " " + $.trim($header.text());
            }
        } else {
            btnName = $btn.text() + " - " + $btn.closest("[id]").attr("id");
        }
        const eventProperties = {
            "text": $btn.text(),
            "eventType": "click"
        };

        xcMixpanel.track("Btn - " + btnName, eventProperties, event);
    }

    function menuItemClick(event) {
        const $target = $(event.target);
        let $li = $target.closest("li");
        let $dropDownList = $li.closest(".dropDownList");
        let $menu = $li.closest(".menu");
        let listName = "";
        let mixpanelId = $dropDownList.data("mixpanel-id") || $menu.data("mixpanel-id");

        if (mixpanelId) {
            listName = "List Click - " + mixpanelId;
        } else if ($dropDownList.length || $menu.length) {
            listName = "List Click - " + $li.closest("[id]").attr("id");
        } else {
            listName = $li.closest("[id]").attr("id") + " - item click";
        }
        const eventProperties = {
            "text": $li.text(),
            "eventType": "click"
        };
        xcMixpanel.track(listName, eventProperties, event);
    }

    xcMixpanel.menuItemClick = menuItemClick;

    function isButton($el) {
        var parents = $el.parentsUntil("body").andSelf();
        for (var i = 0; i < parents.length; i++) {
            let $ele = $(parents[i]);
            let name = "";
            if ($ele.attr("id")) {
                name += $ele.attr("id");
            }
            if ($ele.attr("class")) {
                let className = $ele.attr("class").split(" ")
                name += " " + className;
            }
            if (name.includes("btn") || name.includes("Btn") || name.includes("button") ||
                name.includes("Button")) {
                    return true;
            }
        }
        return false;
    }

    function modeSwitchClick(event) {
        let currTime = Date.now();
        let timeInLastMode = Math.round((currTime - lastModeTime) / 1000);
        lastModeTime = currTime;

        if ($("#container").hasClass("sqlMode")) {
            xcMixpanel.track("To Advanced Mode", {
                "timeInLastMode": timeInLastMode,
                "lastMode": "sqlMode",
                "currentMode": "advancedMode",
                "eventType": "click"
            });
        } else {
            xcMixpanel.track("To SQL Mode", {
                "timeInLastMode": timeInLastMode,
                "lastMode": "advancedMode",
                "currentMode": "sqlMode",
                "eventType": "click"
            });
        }
    }

    function workbookPanelClick(event) {
        let $el = $(event.target);
        let text = $el.text();
        if (!text) {
            let parents = $el.parentsUntil("#container");
            text = parents.eq(0).text().slice(0, 255);
        }

        const eventProperties = {
            "eventType": "click",
            "text": text
        };

        xcMixpanel.track("WorkbookPanel Click", eventProperties, event);
    }

    function otherClick(event) {
        let $el = $(event.target);
        let text = $el.text();
        if (!text) {
            let parents = $el.parentsUntil("#container");
            text = parents.eq(0).text().slice(0, 255);
        }

        const eventProperties = {
            "eventType": "click",
            "text": text
        };
        let eventName = "Other Click";
        if ($el.closest("#homeBtn").length) {
            eventName = "Btn- xdIcon";
        }

        xcMixpanel.track(eventName, eventProperties, event);
    }

    xcMixpanel.track = (eventName, eventProperties, jqueryEvent) => {
        eventProperties = eventProperties || {};
        let baseProperties = {
            "timeStamp": Date.now(),
            "windowHeight": $(window).height(),
            "windowWidth": $(window).width(),
            "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
            "currentPanel": currentPanel,
            "currentSubPanel": currentSubPanel
        };

        // special properties for click events
        if (eventProperties.eventType === "click" && jqueryEvent) {
            let $el = $(jqueryEvent.target);
            let $modal = $el.closest(".modalContainer");
            let $mainMenu = $el.closest(".mainMenu");
            let inLeftPanel = $mainMenu.length > 0;

            let clickProperties = {
                "el": getPathStr($el),
                "element": getElementPath(jqueryEvent.target),
                "elementPath": getElementPathArray(jqueryEvent.target),
                "triggeredByUser": jqueryEvent.hasOwnProperty("originalEvent"),
                "x": jqueryEvent.clientX,
                "y": jqueryEvent.clientY,
                "inLeftPanel": inLeftPanel,
                "closestID": $el.closest("[id]").attr("id")
            };
            if ($modal.length) {
                let $header = $modal.find(".modalHeader");
                if (!$header.length) {
                    $header = $modal.find(".header").eq(0);
                }
                clickProperties.modal = $modal.attr("id");
                clickProperties.modalTitle = $.trim($header.text());
            }
            baseProperties = {...baseProperties, ...clickProperties};
        }
        let properties = {...baseProperties, ...eventProperties};
        mixpanel.track(eventName, properties);
    }

    const eventMap = {
        "mouseMove": mouseMoveListener,
        "click": clickListener,
        "input": inputListener,
        "blur": blurListener,
        "focus": focusListener,
        "resize": resizeListener,
        "keyNavigation": keyNavigationListener
    };

    return (xcMixpanel);
}(jQuery, {}));
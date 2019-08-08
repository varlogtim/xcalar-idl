window.xcMixpanel = (function($, xcMixpanel) {
    const events = {
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
        "transaction": false
    };

    let lastBlur;
    let currentTab;
    let currentSubTab;
    let currentPanel;
    let currentSubPanel;
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
    xcMixpanel.forDev = function() {
        return false;
    };
    xcMixpanel.init = function() {
        window.mixpanel.init("89d255f7b75dc2252dc77bb818cbeeca");
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
            "Timestamp": Date.now(),
            "lastMouseDownEl": prevMouseDownInfo.el,
            "lastMouseDownTime": prevMouseDownInfo.time,
            "lastMouseDownParents": prevMouseDownInfo.parents,
            "prevMouseDowns": prevMouseDownInfo.prevMouseDowns,
            "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
            "currentPanel": currentPanel,
            "currentSubPanel": currentSubPanel,
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
                mixpanel["track"]("XDCrash", {
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
                mixpanel["track"]("StatusBox Error", {
                    ...eventInfo,
                    "errorMsg": info.text,
                    "Element": getElementPath(info.$target[0]),
                    "ElementPath": getElementPathArray(info.$target[0])

                });
                break;
            case ("alertError"):
                mixpanel["track"]("Alert Error", {
                    ...eventInfo,
                    "errorMsg": info.msg
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

        mixpanel.track("User Enter", {
            "Timestamp": currTime,
            "height": $(window).height(),
            "width": $(window).width(),
            "eventType": "pageLoad"
        });

        // emailNotification(name);

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

        mixpanel.track("User Leave", {
            "Timestamp": currTime,
            "duration":  Math.round((currTime - pageLoadTime) / 1000),
            "timeInLastMode": timeInLastMode,
            "lastMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
            "timeInLastPanel": timeInLastPanel,
            "lastPanel": currentPanel,
            "currentSubPanel": currentSubPanel,
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
            mixpanel.track(log.title, {
                "currentPanel": currentPanel,
                "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
                "currentSubPanel": currentSubPanel,
                "operations": operationNames,
                "eventType": "transaction"
            });
        } else {
            mixpanel.track(log.title, {
                "currentPanel": currentPanel,
                "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
                "currentSubPanel": currentSubPanel,
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
                // mixpanel.track("mouseMoveStart", {
                //     "Timestamp": Date.now(),
                //     "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
                //     "currentPanel": currentPanel
                // });
            }

            clearTimeout(mouseMoveTimeout);
            clearTimeout(mouseInactivityTimeout);

            mouseMoveTimeout = setTimeout(() => {
                mouseMoving = false;

                // mixpanel.track("mouseMoveEnd", {
                //     "Timestamp": Date.now(),
                //     "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
                //     "currentPanel": currentPanel
                // });

                mouseInactivityTimeout = setTimeout(() => {
                    mixpanel.track("Mouse Move Inactivity", {
                        "Timestamp": Date.now(),
                        "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
                        "currentPanel": currentPanel,
                        "currentSubPanel": currentSubPanel,
                        "eventType": "mouseMove"
                    });
                }, 30000);
            }, 4000);
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
            } else if ($target.closest("li").length && $target.closest("ul")) {
                return;
                menuItemClick(event);
            } else if ($target.closest(".btn").length) {
                return;
                buttonClick(event);
            } else if ($target.closest("#modeArea").length) {
                modeSwitchClick(event);
            } else {
                return;
                otherClick(event);
            }
        });

        // This is to catch click events triggered by code
        $(document).click(function(event) {
            if (!event.hasOwnProperty("originalEvent")) {
                mixpanel.track("AutoClick", {
                    "Element": getElementPath(event.target),
                    "ElementPath": getElementPathArray(event.target),
                    "Timestamp": Date.now(),
                    "TriggeredByUser": false,
                    "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
                    "currentPanel": currentPanel,
                    "currentSubPanel": currentSubPanel,
                    "eventType": "click"
                });
            }
        });
    };

    const inputListener = () => {
        $(document).on("change", "input", function(event) {
            mixpanel.track("Input Change", {
                "Content": $(this).val(),
                "Element": getElementPath(event.target),
                "ElementPath": getElementPathArray(event.target),
                "Timestamp": Date.now(),
                "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
                "currentPanel": currentPanel,
                "currentSubPanel": currentSubPanel,
                "eventType": "input"
            });
        });
    };

    const blurListener = () => {
        $(window).blur(function() {
            let currTime = Date.now();
            var time = Math.round((currTime - lastBlur)/1000);
            mixpanel.track("Window Blur", {
                "Time": time,
                "Timestamp": currTime,
                "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
                "currentPanel": currentPanel,
                "currentSubPanel": currentSubPanel,
                "eventType": "windowBlur"
            });
            lastBlur = Date.now();
        });
    };

    const focusListener = () => {
        $(window).focus(function() {
            var currTime = Date.now();
            var time = Math.round((currTime - lastBlur)/1000);
            mixpanel.track("Window Focus", {
                "Time": time,
                "Timestamp": currTime,
                "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
                "currentPanel": currentPanel,
                "currentSubPanel": currentSubPanel,
                "eventType": "windowFocus"
            });
            lastBlur = Date.now();
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
                mixpanel.track("Window Resize", {
                    "Timestamp": Date.now(),
                    "height": $(window).height(),
                    "width": $(window).width(),
                    "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
                    "currentPanel": $(".mainPanel.active").attr("id"),
                    "currentSubPanel": currentSubPanel,
                    "eventType": "windowResize"
                });
            }
            resizing = false;
        }
    };

    function getPathStr(ele) {
        var path = ele.prop("tagName");
        if (ele.attr("id")) {
            path += "#" + ele.attr("id");
        }
        if (ele.attr("class")) {
            let className = ele.attr("class").split(" ").join(".");
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
                path += getPathStr($(parents).eq(i), path);
            }
            return path;
        } catch (err) {
            // Do not affect our use with XD
            return "Error case: " + err;
        }
    }

    xcMixpanel.getElementPath = getElementPath;

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
        const $mainTab = $target.closest(".mainTab");
        const $subTab = $target.closest(".subTab");
        // main tab click
        if ($target.closest(".mainTab").length) {
            let lastPanel = currentPanel;
            let $mainPanel = $(".mainPanel.active");
            currentPanel = $mainPanel.attr("id");
            let lastSubPanel = currentSubPanel;
            currentSubPanel = $mainPanel.find(".subPanel:visible").attr("id");

            if (lastPanel === currentPanel) { // toggling left panel
                mixpanel.track("Left Panel Toggle", {
                    "Time": currTime,
                    "currentPanel": currentPanel,
                    "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
                    "source": "mainTab",
                    "eventType": "click"
                });
            } else { // main tab click
                let timeInLastPanel = Math.round((currTime - lastPanelTime) / 1000);
                lastPanelTime = currTime;
                let timeInLastSubPanel = Math.round((currTime - lastSubPanelTime) / 1000);
                lastSubPanelTime = currTime;

                mixpanel.track("Panel Switch", {
                    "Time": currTime,
                    "timeInLastPanel": timeInLastPanel,
                    "lastPanel": lastPanel,
                    "lastSubPanel": lastSubPanel,
                    "timeInLastSubPanel": timeInLastSubPanel,
                    "currentPanel": currentPanel,
                    "currentSubPanel": currentSubPanel,
                    "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
                    "eventType": "click"
                });
            }
        } else if ($target.closest(".subTab").length) { // sub tab click
            let $mainPanel = $(".mainPanel.active");
            currentPanel = $mainPanel.attr("id");
            let lastSubPanel = currentSubPanel;
            currentSubPanel = $mainPanel.find(".subPanel:visible").attr("id");
            if (lastSubPanel === currentSubPanel) { // toggling left panel
                mixpanel.track("Left Panel Toggle", {
                    "Time": currTime,
                    "currentPanel": currentPanel,
                    "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
                    "source": "subTab",
                    "eventType": "click"
                });
            } else { // sub tab click
                let timeInLastSubPanel = Math.round((currTime - lastSubPanelTime) / 1000);
                lastSubPanelTime = currTime;
                mixpanel.track("Sub Panel Switch", {
                    "Time": currTime,
                    "currentPanel": currentPanel,
                    "timeInLastSubPanel": timeInLastSubPanel,
                    "lastSubPanel": lastSubPanel,
                    "currentSubPanel": currentSubPanel,
                    "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
                    "eventType": "click"
                });
            }
        }
    }

    function buttonClick(event) {
        const $target = $(event.target);
        let $btn = $target.closest(".btn");
        let $modal = $btn.closest(".modalContainer");
        let $mainMenu = $btn.closest(".mainMenu");
        let btnName;
        if ($btn.attr("id")) {
            btnName = $btn.attr("id");
        } else if ($modal.length) {
            btnName = $btn.text() + " - " + $modal.attr("id");
        } else {
            btnName = $btn.text() + " - " + $btn.closest("[id]").attr("id");
        }
        const eventProperties = {
            "Element": getElementPath(event.target),
            "ElementPath": getElementPathArray(event.target),
            "Timestamp": Date.now(),
            "x": event.clientX,
            "y": event.clientY,
            "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
            "currentPanel": currentPanel,
            "currentSubPanel": currentSubPanel,
            "inLeftPanel": false,
            "text": $btn.text(),
            "eventType": "click"
        };
        if ($modal.length) {
            eventProperties.modal = $modal.attr("id");
        }
        if ($mainMenu.length) {
            eventProperties.inLeftPanel = true;
        }
        mixpanel.track("Btn - " + btnName, eventProperties);
    }

    function menuItemClick(event) {
        const $target = $(event.target);
        let $li = $target.closest("li");
        let $ul = $li.closest("ul");
        let $dropDownList = $li.closest(".dropDownList");
        let $menu = $li.closest(".menu");
        let $modal = $li.closest(".modalContainer");
        let $mainMenu = $li.closest(".mainMenu");
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
            "Element": getElementPath(event.target),
            "ElementPath": getElementPathArray(event.target),
            "Timestamp": Date.now(),
            "x": event.clientX,
            "y": event.clientY,
            "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
            "currentPanel": currentPanel,
            "currentSubPanel": currentSubPanel,
            "inLeftPanel": false,
            "text": $li.text(),
            "eventType": "click"
        };
        if ($modal.length) {
            eventProperties.modal = $modal.attr("id");
        }
        if ($mainMenu.length) {
            eventProperties.inLeftPanel = true;
        }
        mixpanel.track(listName, eventProperties);
    }

    function modeSwitchClick(event) {
        let currTime = Date.now();
        let timeInLastMode = Math.round((currTime - lastModeTime) / 1000);
        lastModeTime = currTime;

        if ($("#container").hasClass("sqlMode")) {
            mixpanel.track("To Advanced Mode", {
                "Timestamp": currTime,
                "timeInLastMode": timeInLastMode,
                "lastMode": "sqlMode",
                "currentMode": "advancedMode",
                "eventType": "click"
            });
        } else {
            mixpanel.track("To SQL Mode", {
                "Timestamp": currTime,
                "timeInLastMode": timeInLastMode,
                "lastMode": "advancedMode",
                "currentMode": "sqlMode",
                "eventType": "click"
            });
        }
    }

    function otherClick(event) {
        let $el = $(event.target);
        let $modal = $el.closest(".modal");
        let $mainMenu = $el.closest(".mainMenu");
        let text = $el.text();
        if (!text) {
            let parents = $el.parentsUntil("#container");
            text = parents.eq(0).text().slice(0, 255);
        }

        const eventProperties = {
            "Element": getElementPath(event.target),
            "ElementPath": getElementPathArray(event.target),
            "Timestamp": Date.now(),
            "TriggeredByUser": event.hasOwnProperty("originalEvent"),
            "x": event.clientX,
            "y": event.clientY,
            "windowHeight": $(window).height(),
            "windowWidth": $(window).width(),
            "currentMode": XVM.isSQLMode() ? "sqlMode" : "advancedMode",
            "currentPanel": currentPanel,
            "currentSubPanel": currentSubPanel,
            "inLeftPanel": false,
            "eventType": "click",
            "text": text
        };

        eventProperties.text = text;

        if ($modal.length) {
            eventProperties.modal = $modal.attr("id");
        }
        if ($mainMenu.length) {
            eventProperties.inLeftPanel = true;
        }
        mixpanel.track("Other Click", eventProperties);
    }

    const eventMap = {
        "mouseMove": mouseMoveListener,
        "click": clickListener,
        "input": inputListener,
        "blur": blurListener,
        "focus": focusListener,
        "resize": resizeListener
    };

    return (xcMixpanel);
}(jQuery, {}));
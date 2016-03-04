window.WorkbookModal = (function($, WorkbookModal) {
    var $modalBackground = $("#modalBackground");
    var $workbookModal   = $("#workbookModal");

    var $optionSection = $workbookModal.find(".optionSection");
    var $workbookInput = $("#workbookInput");
    var $workbookLists = $("#workbookLists");

    var minHeight = 400;
    var minWidth  = 750;

    var modalHelper = new xcHelper.Modal($workbookModal, {
        "focusOnOpen": true,
        "minWidth"   : minWidth,
        "minHeight"  : minHeight
    });

    // default select all workbooks and sort by name
    var reverseLookup = {
        "name"    : false,
        "created" : false,
        "modified": false,
        "srcUser" : false,
        "curUser" : false
    };
    var sortkey = "name";

    var activeActionNo = 0;

    WorkbookModal.setup = function() {
        $workbookModal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": 'window'
        });

        $workbookModal.resizable({
            handles    : "n, e, s, w, se",
            minHeight  : minHeight,
            minWidth   : minWidth,
            containment: "document"
        });

        // open workbook modal
        $("#workbookBtn").click(function() {
            WorkbookModal.show();
        });

        addWorkbookEvents();
        getWorkbookInfo();
    };

    WorkbookModal.show = function(isForceShow) {
        $(document).on("keypress", workbookKeyPress);

        if (isForceShow) {
            modalHelper.setup({"noEsc": true});
        } else {
            modalHelper.setup();
        }

        // default choose first option (new workbook)
        $optionSection.find(".radio").eq(0).click();

        addWorkbooks();

        if (gMinModeOn) {
            $modalBackground.fadeIn(300);
            $workbookModal.show();
            Tips.refresh();
        } else {
            $modalBackground.fadeIn(300, function() {
                $workbookModal.fadeIn(180);
                Tips.refresh();
            });
        }
    };

    WorkbookModal.forceShow = function() {
        addWorkbookEvents();
        $workbookModal.find(".cancel, .close").hide();

        getWorkbookInfo(true);
        WorkbookModal.show(true);
        // deafult value for new workbook
        $workbookInput.val("untitled");
        var input = $workbookInput.get(0);
        input.setSelectionRange(0, input.value.length);
    };

    function resetWorkbookModal() {
        $workbookModal.find(".active").removeClass("active");
        // default select all workbooks and sort by name
        reverseLookup = {
            "name"    : false,
            "created" : false,
            "modified": false,
            "srcUser" : false,
            "curUser" : false
        };
        sortkey = "name";
        $workbookInput.val("").focus();
    }

    function closeWorkbookModal() {
        $(document).off("keypress", workbookKeyPress);
        modalHelper.clear();

        var fadeOutTime = gMinModeOn ? 0 : 300;
        $workbookModal.hide();
        $modalBackground.fadeOut(fadeOutTime, function() {
            Tips.refresh();
        });

        resetWorkbookModal();
    }

    function addWorkbookEvents() {
        // click cancel or close button
        $workbookModal.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeWorkbookModal();
        });

        // click confirm button
        $workbookModal.on("click", ".confirm", function(event) {
            var $btn = $(this);
            var isValid;
            var workbookName = $workbookInput.val().trim();

            event.stopPropagation();
            // Validation check
            // new workbook and copy workbook must have new workbook name
            // and should not have duplicate name
            if (activeActionNo !== 1) {
                var err1 = xcHelper.replaceMsg(ErrWRepTStr.WKBKConflict, {
                    "name": workbookName
                });
                isValid = xcHelper.validate([
                    {
                        "$selector": $workbookInput,
                        "formMode" : true
                    },
                    {
                        "$selector": $workbookInput,
                        "formMode" : true,
                        "text"     : err1,
                        "check"    : function() {
                            var workbooks = WKBKManager.getWKBKS();
                            for (var wkbkId in workbooks) {
                                if (workbooks[wkbkId].name === workbookName) {
                                    return true;
                                }
                            }
                            return false;
                        }
                    }
                ]);

                if (!isValid) {
                    return;
                }
            }

            // continue workbook and copy workbook must select one wkbk
            if (activeActionNo !== 0) {
                isValid = xcHelper.validate({
                    "$selector": $btn,
                    "text"     : ErrTStr.NoWKBKSelect,
                    "check"    : function() {
                        return ($workbookLists.find(".active").length === 0);
                    }
                });

                if (!isValid) {
                    return;
                }
            }

            $workbookInput.blur();

            if (activeActionNo === 0) {
                // create new workbook part
                modalHelper.submit();
                goWaiting();

                WKBKManager.newWKBK(workbookName)
                .then(function(id) {
                    WKBKManager.switchWKBK(id, modalHelper);
                })
                .fail(function(error) {
                    StatusBox.show(error.error, $workbookInput);
                    cancelWaiting();
                })
                .always(function() {
                    modalHelper.enableSubmit();
                });
                return;
            }

            var workbookId = $workbookLists.find(".active").data("wkbkid");

            if (activeActionNo === 1) {
                // continue workbook part
                goWaiting();

                WKBKManager.switchWKBK(workbookId);

                return;
            }

            if (activeActionNo === 2) {
                // copy workbook part
                modalHelper.submit();
                goWaiting(true);

                WKBKManager.copyWKBK(workbookId, workbookName)
                .then(function(id) {
                    WKBKManager.switchWKBK(id);
                })
                .fail(function(error) {
                    StatusBox.show(error.error, $workbookInput);
                })
                .always(function() {
                    modalHelper.enableSubmit();
                });

                return;
            }
        });

        // click title to srot
        var $titleSection = $workbookLists.siblings(".titleSection");
        $titleSection.on("click", ".title", function() {
            var $title = $(this);

            $titleSection.find(".title.active").removeClass("active");
            $title.addClass("active");

            sortkey = $title.data("sortkey");
            addWorkbooks();
        });

        // select a workbook
        $workbookLists.on("click", ".grid-unit", function(event) {
            event.stopPropagation();
            $workbookLists.find(".active").removeClass("active");
            $(this).addClass("active");
        });

        // deselect workbook
        $workbookLists.click(function() {
            $workbookLists.find(".active").removeClass("active");
        });

        // choose an option
        $optionSection.on("click", ".radioWrap", function(event){
            var $option = $(this);
            var no = Number($option.data("no"));

            event.stopPropagation();
            $option.siblings().find(".radio.checked").removeClass("checked");
            $option.find(".radio").addClass("checked");

            switchAction(no);
        });

        // scroll the title with when the body is scrolled
        $workbookLists.scroll(function() {
            var scrollLeft = $(this).scrollLeft();
            $workbookLists.siblings(".titleSection").scrollLeft(scrollLeft);
        });
    }

    function workbookKeyPress(event) {
        switch (event.which) {
            case keyCode.Enter:
                // when focus on a button, no trigger
                if (modalHelper.checkBtnFocus()) {
                    break;
                }
                $workbookModal.find(".confirm").click();
                break;
            default:
                break;
        }
    }

    function getWorkbookInfo(isForceMode) {
        var $instr = $workbookModal.find(".modalInstruction .text");
        var user = Support.getUser();
        var html;

        if (isForceMode) {
            // forceMode has no any workbook info
            html = xcHelper.replaceMsg(WKBKTStr.NewWKBKInstr, {"user": user});
            $instr.html(html);
            return;
        }

        var workbooks = WKBKManager.getWKBKS();
        var activeWKBKId = WKBKManager.getActiveWKBK();
        var workbook = workbooks[activeWKBKId];

        html = xcHelper.replaceMsg(WKBKTStr.CurWKBKInstr, {
            "user"    : user,
            "workbook": workbook.name
        });

        updateWorksheetBar(workbook);
        $instr.html(html);
    }

    function updateWorksheetBar(workbook) {
        $("#worksheetInfo .wkbkName").text(workbook.name);
        $("#workspaceDate .date").text(xcHelper.getDate("-", null,
                                                        workbook.created));
    }

    // helper function for toggle in option section
    function switchAction(no) {
        xcHelper.assert((no >= 0 && no <= 2), "Invalid action");

        var $inputSection = $workbookModal.find(".inputSection");
        var $mainSection  = $workbookModal.find(".modalMain");

        activeActionNo = no;

        $workbookModal.removeClass("no-0")
                    .removeClass("no-1")
                    .removeClass("no-2")
                    .addClass("no-" + no);

        switch (no) {
            // new workbook
            case 0:
                $inputSection.removeClass("unavailable");
                $workbookInput.removeAttr("disabled"); // for tab key switch
                $mainSection.addClass("unavailable");
                $workbookModal.find(".modalBottom .confirm")
                            .text(CommonTxtTstr.Create.toUpperCase());
                break;
            // continue workbook
            case 1:
                $inputSection.addClass("unavailable");
                $workbookInput.attr("disabled", "disabled");
                $mainSection.removeClass("unavailable");
                $workbookModal.find(".modalBottom .confirm")
                            .text(CommonTxtTstr.Continue.toUpperCase());
                break;
            // copy workbook
            case 2:
                $inputSection.removeClass("unavailable");
                $workbookInput.removeAttr("disabled");
                $mainSection.removeClass("unavailable");
                $workbookModal.find(".modalBottom .confirm")
                            .text(CommonTxtTstr.Copy.toUpperCase());
                break;
            default:
                break;
        }
    }

    function addWorkbooks() {
        var html = "";
        var sorted = [];
        var workbooks = WKBKManager.getWKBKS();

        for (var id in workbooks) {
            sorted.push(workbooks[id]);
        }

        var activeWKBKId = WKBKManager.getActiveWKBK();
        // sort by workbook.name
        var isNum = (sortkey === "created" || sortkey === "modified");
        sorted = sortObj(sorted, sortkey, isNum);
        sorted.forEach(function(workbook) {
            var wkbkId    = workbook.id;
            var created   = workbook.created;
            var modified  = workbook.modified;
            var gridClass = "grid-unit";

            if (wkbkId === activeWKBKId) {
                gridClass += " activeWKBK";
            }

            if (workbook.noMeta) {
                gridClass += " noMeta";
            }

            var createdTime = "";
            if (created) {
                createdTime = xcHelper.getTime(null, created) + ' ' +
                                xcHelper.getDate("-", null, created);
            }

            var modifiedTime = "";
            if (modified) {
                modifiedTime = xcHelper.getTime(null, modified) + ' ' +
                                xcHelper.getDate("-", null, modified);
            }

            html +=
                 '<div class="' + gridClass + '" data-wkbkid="' + wkbkId + '">' +
                    '<div>' + workbook.name + '</div>' +
                    '<div>' + createdTime + '</div>' +
                    '<div>' + modifiedTime + '</div>' +
                    '<div>' + (workbook.srcUser || "") + '</div>' +
                    '<div>' + (workbook.curUser || "") + '</div>' +
                '</div>';
        });

        $workbookLists.html(html);
    }

    function sortObj(objs, key, isNum) {
        var sorted  = [];
        var results = [];

        // first sort by name
        objs.forEach(function(obj) {
            sorted.push([obj, obj[key]]);
        });

        if (isNum) {
            sorted.sort(function(a, b) {
                return (a[1] - b[1]);
            });
        } else {
            sorted.sort(function(a, b) {
                return (a[1].localeCompare(b[1]));
            });
        }

        sorted.forEach(function(obj) {
            results.push(obj[0]);
        });

        if (reverseLookup[key] === true) {
            results.reverse();
        }
        reverseLookup[key] = !reverseLookup[key];
        return (results);
    }

    function goWaiting(hasIcon) {
        $workbookModal.addClass('inactive');

        if (hasIcon) {
            $('body').append('<div id="workbookModalWaitingIcon" ' +
                            'class="waitingIcon"></div>');
            $('#workbookModalWaitingIcon').css({
                left: '50%',
                top : '50%'
            }).fadeIn();
        }
    }

    function cancelWaiting() {
        $workbookModal.removeClass('inactive');
        $("#workbookModalWaitingIcon").remove();
    }

    return (WorkbookModal);
}(jQuery, {}));


window.WKBKManager = (function($, WKBKManager) {
    var username;

    var wkbkKey;
    var activeWKBKKey;
    var activeWKBKId;

    var wkbkSet;

    // initial setup
    WKBKManager.setup = function() {
        var deferred = jQuery.Deferred();

        username = Support.getUser();

        // key that stores all workbook infos for the user
        wkbkKey = generateKey(username, "workbookInfos");
        // key that stores the current active workbook Id
        activeWKBKKey = generateKey(username, "activeWorkbook");
        wkbkSet = new WKBKSet();

        WKBKManager.getWKBKsAsync()
        .then(function(oldWorkbooks, sessionInfo) {
            // sycn sessionInfo with wkbkInfo
            var innerDeferred = jQuery.Deferred();

            var numSessions = sessionInfo.numSessions;
            var sessions = sessionInfo.sessions;

            if (oldWorkbooks == null) {
                for (var i = 0; i < numSessions; i++) {
                    console.warn("Error!", sessions[i].name, "has no meta.");
                }

                innerDeferred.resolve(null, sessionInfo);
                return (innerDeferred.promise());
            }

            for (var i = 0; i < numSessions; i++) {
                var wkbkName = sessions[i].name;
                var wkbkId = getWKBKId(wkbkName);
                var wkbk;

                if (oldWorkbooks.hasOwnProperty(wkbkId)) {
                    wkbk = new WKBK(oldWorkbooks[wkbkId]);
                    delete oldWorkbooks[wkbkId];
                } else {
                    console.warn("Error!", wkbkName, "has no meta.");
                    wkbk = new WKBK({
                        "name"  : wkbkName,
                        "noMeta": true
                    });
                }

                wkbkSet.put(wkbkId, wkbk);
            }

            for (wkbkId in oldWorkbooks) {
                console.warn("Error!", wkbkId, "is missing.");
            }

            // refresh workbook info
            KVStore.put(wkbkKey, wkbkSet.getWithStringify(), true, gKVScope.WKBK)
            .then(function() {
                return KVStore.get(activeWKBKKey, gKVScope.WKBK);
            })
            .then(function(activeId) {
                innerDeferred.resolve(activeId, sessionInfo);
            })
            .fail(innerDeferred.reject);

            return (innerDeferred.promise());
        })
        .then(function(wkbkId, sessionInfo) {
            var innerDeferred = jQuery.Deferred();
            // if no any workbook, force displaying the workbook modal
            if (wkbkId == null ||
                sessionInfo.numSessions === 0 ||
                !wkbkSet.has(wkbkId))
            {
                if (wkbkId == null) {
                    innerDeferred.reject("No workbook for the user");
                } else {
                    KVStore.delete(activeWKBKKey, gKVScope.WKBK)
                    .always(function() {
                        innerDeferred.reject("No workbook for the user");
                    });
                }
                $('#initialLoadScreen').remove();
                WorkbookModal.forceShow();
                var text = StatusMessageTStr.Viewing + " " + WKBKTStr.Location;
                StatusMessage.updateLocation(true, text);
            } else {
                var wkbkName = wkbkSet.get(wkbkId).name;
                var numSessions = sessionInfo.numSessions;
                var sessions = sessionInfo.sessions;
                var isInactive = false;

                for (var i = 0; i < numSessions; i++) {
                    var session = sessions[i];

                    if (session.name === wkbkName &&
                        session.state === "Inactive")
                    {
                        isInactive = true;
                        break;
                    }
                }

                if (isInactive) {
                    XcalarSwitchToWorkbook(wkbkName, null)
                    .then(function() {
                        innerDeferred.resolve(wkbkId);
                    })
                    .fail(innerDeferred.reject);
                } else {
                    innerDeferred.resolve(wkbkId);
                }
            }
            return (innerDeferred.promise());
        })
        .then(function(wkbkId) {
            activeWKBKId = wkbkId;
            // console.log("Current Workbook Id is", wkbkId);
            // retive key from username and wkbkId
            var gInfoKey = generateKey(wkbkId, "gInfo");
            var gLogKey  = generateKey(wkbkId, "gLog");

            if (sessionStorage.getItem("xcalar.safe") != null) {
                wkbkId = sessionStorage.getItem("xcalar.safe");
                console.warn("Entering in safe mode of", wkbkId);
            }

            KVStore.setup(gInfoKey, gLogKey);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Setup Workbook fails!", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    WKBKManager.getWKBKS = function() {
        return wkbkSet.getAll();
    };


    WKBKManager.getWKBKsAsync = function() {
        var deferred = jQuery.Deferred();
        var sessionInfo;

        XcalarListWorkbooks("*")
        .then(function(output) {
            sessionInfo = output;
            // console.log(sessionInfo);
            return KVStore.getAndParse(wkbkKey, gKVScope.WKBK);
        })
        .then(function(wkbk) {
            deferred.resolve(wkbk, sessionInfo);
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };
    // get current active workbook
    WKBKManager.getActiveWKBK = function() {
        return (activeWKBKId);
    };

    // get current user
    WKBKManager.getUser = function() {
        return (username);
    };

    // make new workbook
    WKBKManager.newWKBK = function(wkbkName, srcWKBKId) {
        var deferred = jQuery.Deferred();

        if (!wkbkName) {
            deferred.reject("Invalid name");
            return (deferred.promise());
        }

        var wkbk;
        var isCopy = (srcWKBKId != null);
        var copySrc = null;

        if (isCopy) {
            copySrc = wkbkSet.get(srcWKBKId);
            if (copySrc == null) {
                // when the source workbook's meta not exist
                deferred.reject("missing workbook meta");
                return (deferred.promise());
            }
        }

        var copySrcName = isCopy ? copySrc.name : null;

        XcalarNewWorkbook(wkbkName, isCopy, copySrcName)
        .then(function() {
            var time = xcHelper.getTimeInMS();
            var options = {
                "id"      : getWKBKId(wkbkName),
                "name"    : wkbkName,
                "created" : time,
                "modified": time,
                "srcUser" : username,
                "curUser" : username
            };

            wkbk = new WKBK(options);
            wkbkSet.put(wkbk.id, wkbk);

            return KVStore.put(wkbkKey, wkbkSet.getWithStringify(), true, gKVScope.WKBK);
        })
        .then(function() {
            // in case KVStore has some remants about wkbkId, clear it
            var innerDeferred = jQuery.Deferred();

            var gInfoKey = generateKey(wkbk.id, "gInfo");
            var gLogKey  = generateKey(wkbk.id, "gLog");

            var def1 = XcalarKeyDelete(gInfoKey, gKVScope.META);
            var def2 = XcalarKeyDelete(gLogKey, gKVScope.LOG);

            jQuery.when(def1, def2)
            .always(function() {
                innerDeferred.resolve();
            });

            return (innerDeferred.promise());
        })
        .then(function() {
            deferred.resolve(wkbk.id);
        })
        .fail(function(error) {
            console.error("Create workbook fails!", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    // swtich to another workbook
    WKBKManager.switchWKBK = function(wkbkId, modalHelper) {
        // validation
        if (wkbkId == null) {
            console.error("Invalid wookbook Id!");
            return;
        }

        if (wkbkId === activeWKBKId) {
            console.info("Switch to itself");
            return;
        }

        if (modalHelper) {
            modalHelper.submit();
        }

        var fromWkbkName;
        var toWkbkName;

        if (activeWKBKId == null) {
            // case that creat a totaly new workbook
            KVStore.put(activeWKBKKey, wkbkId, true, gKVScope.WKBK)
            .then(function() {
                location.reload();
            });
            return;
        }

        // check if the wkbkId is right
        var toWkbk = wkbkSet.get(wkbkId);
        if (toWkbk != null) {
            toWkbkName = toWkbk.name;

            fromWkbkName = (activeWKBKId == null) ?
                                    null :
                                    wkbkSet.get(activeWKBKId).name;
        } else {
            console.error("No such workbook id!");
            if (modalHelper) {
                modalHelper.enableSubmit();
            }
            return;
        }

        // should stop check since seesion is released
        Support.stopHeartbeatCheck();

        // to switch workbook, should release all ref count first
        freeAllResultSetsSync()
        .then(function() {
            return saveCurrentWKBK();
        })
        .then(function() {
            return Support.releaseSession();
        })
        .then(function() {
            return (XcalarSwitchToWorkbook(toWkbkName, fromWkbkName));
        })
        .then(function() {
            return XcalarKeyPut(activeWKBKKey, wkbkId, true, gKVScope.WKBK);
        })
        .then(function() {
            removeUnloadPrompt();
            location.reload();
        })
        .fail(function(error) {
            console.error("Switch Workbook Fails", error);
            // restart if fails
            Support.heartbeatCheck();
        })
        .always(function() {
            if (modalHelper) {
                modalHelper.enableSubmit();
            }       
        });
    };

    // copy workbook
    WKBKManager.copyWKBK = function(srcWKBKId, wkbkName) {
        var deferred = jQuery.Deferred();
        var newId;
        WKBKManager.newWKBK(wkbkName, srcWKBKId)
        .then(function(id) {
            newId = id;
            return copyHelper(srcWKBKId, newId);
        })
        .then(function() {
            deferred.resolve(newId);
        })
        .fail(function(error) {
            console.error("Copy Workbook fails!", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    WKBKManager.inActiveAllWKBK = function() {
        var deferred = jQuery.Deferred();
        var promises = [];

        XcalarListWorkbooks("*")
        .then(function(output) {
            var numSessions = output.numSessions;
            var sessions = output.sessions;
            // console.log(sessionInfo);
            for (var i = 0; i < numSessions; i++) {
                var session = sessions[i];
                if (session.state === "Active") {
                    promises.push(XcalarInActiveWorkbook.bind(this, session.name));
                }
            }

            return chain(promises);
        })
        .then(function() {
            return XcalarKeyDelete(activeWKBKKey, gKVScope.WKBK);
        })
        .then(function() {
            removeUnloadPrompt();
            location.reload();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    // XXX this is buggy now because it clear wkbkInfo but the session info is kept!
    WKBKManager.emptyAll = function() {
        var deferred = jQuery.Deferred();
        var promises = [];

        // delete all workbooks
        var workbooks = wkbkSet.getAll();
        for (wkbkId in workbooks) {
            promises.push(delWKBKHelper.bind(this, wkbkId));
        }

        // delete all active workbook key
        promises.push(KVStore.delete.bind(this, activeWKBKKey, gKVScope.WKBK));

        chain(promises)
        .then(function() {
            return KVStore.delete(wkbkKey, gKVScope.WKBK);
        })
        .then(function() {
            console.log("empty all workbook related info");
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("empty all workbook related fails", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    // helper for WKBKManager.copyWKBK
    function copyHelper(srcId, newId) {
        var deferred = jQuery.Deferred();

        var oldInfoKey = generateKey(srcId, "gInfo");
        var oldLogKey  = generateKey(srcId, "gLog");
        var newInfoKey = generateKey(newId, "gInfo");
        var newLogKey  = generateKey(newId, "gLog");

        // copy all info to new key
        KVStore.get(oldInfoKey, gKVScope.META)
        .then(function(value) {
            return KVStore.put(newInfoKey, value, true, gKVScope.META);
        })
        .then(function() {
            return KVStore.get(oldLogKey, gKVScope.LOG);
        })
        .then(function(value) {
            return KVStore.put(newLogKey, value, true, gKVScope.LOG);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return (deferred.promise());
    }

    // helper for WKBKManager.emptyAll
    function delWKBKHelper(wkbkId) {
        var deferred   = jQuery.Deferred();

        var storageKey = generateKey(wkbkId, "gInfo");
        var logKey     = generateKey(wkbkId, "gLog");

        XcalarKeyDelete(storageKey, gKVScope.META)
        .then(function() {
            return (XcalarKeyDelete(logKey, gKVScope.LOG));
        })
        .then(function() {
            console.log("Delete workbook", wkbkId);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Delete workbook fails!", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    // generate key for KVStore use
    function generateKey() {
        // currently just cat all arguments as a key
        var key;
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i]) {
                if (!key) {
                    key = arguments[i];
                } else {
                    key += "-" + arguments[i];
                }
            }
        }
        return (key);
    }

    function getWKBKId(wkbkName) {
        return generateKey(username, "wkbk", wkbkName);
    }

    // save current workbook
    function saveCurrentWKBK() {
        // if activeWKBK is null, then it's creating a new WKBK
        wkbkSet.get(activeWKBKId).update();
        return KVStore.put(wkbkKey, wkbkSet.getWithStringify(), true, gKVScope.WKBK);
    }

    return (WKBKManager);
}(jQuery, {}));

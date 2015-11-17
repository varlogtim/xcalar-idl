window.WorkbookModal = (function($, WorkbookModal) {
    var $modalBackground = $("#modalBackground");
    var $workbookModal   = $("#workbookModal");

    var $optionSection = $workbookModal.find(".optionSection");
    var $workbookInput = $("#workbookInput");
    var $searchInput   = $("#workbookUserSearch");
    var $userListBox   = $workbookModal.find(".listBox");
    var $userLists     = $("#workbookUserLists");
    var $workbookLists = $("#workbookLists");
    var minHeight = 400;
    var minWidth = 750;

    var modalHelper = new xcHelper.Modal($workbookModal, {
        "focusOnOpen": true,
        "minWidth"   : minWidth,
        "minHeight"  : minHeight
    });

    var reverseLookup = {};
    var sortkey = "name";

    var activeActionNo = 0;

    var allUsers = [];
    var curUsers = [];

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
        getUserLists();
    };

    WorkbookModal.show = function() {
        $(document).on("keypress", workbookKeyPress);
        resetWorkbookModal();
        modalHelper.setup();

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

        getUserLists(true)
        .then(function() {
            WorkbookModal.show();
            // deafult value for new workbook
            $workbookInput.val("untitled");
            var input = $workbookInput.get(0);
            input.setSelectionRange(0, input.value.length);
        });
    };

    function resetWorkbookModal() {
        $workbookModal.find(".active").removeClass("active");
        filterUser();   // show all user lists
        // default select all workbooks and sort by name
        reverseLookup = {
            "name"    : false,
            "created" : false,
            "modified": false,
            "srcUser" : false,
            "curUser" : false
        };
        sortkey = "name";
        toggleWorkbooks();
        // default choose first option
        $optionSection.find(".radio").eq(0).click();
        $searchInput.val("");
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
                isValid = xcHelper.validate([
                    {
                        "$selector": $workbookInput,
                        "formMode" : true
                    },
                    {
                        "$selector": $workbookInput,
                        "formMode" : true,
                        "text"     : "Workbook " + workbookName + " already exists!",
                        "check"    : function() {
                            for (var i = 0, len = curUsers.length; i < len; i++) {
                                var wkbks = curUsers[i].workbooks;
                                for (var id in wkbks) {
                                    if (wkbks[id].name === workbookName) {
                                        return true;
                                    }
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
                    "text"     : "Please select a workbook!",
                    "check"    : function() {
                        return ($workbookLists.find(".active").length === 0);
                    }
                });

                if (!isValid) {
                    return;
                }
            }

            if (activeActionNo === 0) {
                // create new workbook part
                modalHelper.submit();

                WKBKManager.newWKBK(workbookName)
                .then(function(id) {
                    WKBKManager.switchWKBK(id, modalHelper);
                })
                .fail(function(error) {
                    StatusBox.show(error.error, $workbookInput);
                })
                .always(function() {
                    modalHelper.enableSubmit();
                });
                return;
            }

            var workbookId = $workbookLists.find(".active").data("wkbkid");

            if (activeActionNo === 1) {
                // continue workbook part
                WKBKManager.switchWKBK(workbookId);
                return;
            }

            if (activeActionNo === 2) {
                // copy workbook part
                modalHelper.submit();
                $workbookModal.addClass('inactive');
                $('body').append('<div id="workbookModalWaitingIcon" ' +
                                    'class="waitingIcon"></div>');
                $('#workbookModalWaitingIcon').css({
                    left: '50%',
                    top : '50%'
                }).fadeIn();
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

        // click to select all user
        $userListBox.click(function(event) {
            event.stopPropagation();
            toggleWorkbooks();
        });

        // select users
        $userLists.on("click", "li", function(event) {
            event.stopPropagation();
            toggleWorkbooks($(this));
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

        // clear search input
        $searchInput.siblings(".clear").click(function(event) {
            event.stopPropagation();
            $searchInput.val("").focus();
            filterUser();
        });

        // input on search area to filter user
        $searchInput.keyup(function() {
            filterUser($searchInput.val());
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
                // XXX when focus on a button, no trigger
                if (modalHelper.checkBtnFocus()) {
                    break;
                }
                $workbookModal.find(".confirm").click();
                break;
            default:
                break;
        }
    }

    function getUserLists(isForceMode) {
        var deferred = jQuery.Deferred();
        allUsers = [];

        WKBKManager.getUsersInfo()
        .then(function(wkbkInfo, sessionInfo) {
            wkbkInfo = wkbkInfo || {}; // in case wkbkInfo is null
            var username = wkbkInfo.username;

            // now wkbk only shows the current user
            if (username != null) {
                allUsers.push(wkbkInfo);
            }
            // sort by user.username

            // allUsers = sortObj(allUsers, "username");

            //update user num
            $workbookModal.find(".sideListSection .title .num")
                          .text(allUsers.length);
            // update userlist
            var html = "";

            allUsers.forEach(function(wkbk) {
                html += "<li>" + wkbk.username + "</li>";
            });
            $userLists.html(html);

            // get current workbook info
            getWorkbookInfo(wkbkInfo, isForceMode);
        })
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("Get Session Error", error);
            $datalist.html("");
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    function getWorkbookInfo(wkbkInfo, isForceMode) {
        var html;
        var user = WKBKManager.getUser();

        if (isForceMode) {
            html =
                'Hello <b>' + user + '</b>, ' +
                ' you have no workbook yet, you can create new workbook, ' +
                'continue a workbook or copy a workbook';
            $workbookModal.find(".modalInstruction .text").html(html);
            return;
        }
        var activeWKBKId = WKBKManager.getActiveWKBK();
        var workbook     = wkbkInfo.workbooks[activeWKBKId];


        html = 'Hello <b>' + user + '</b>, ' +
                'current workbook is <b>' + workbook.name + '</b>' +
                ' created by <b>' + user + '</b>';
        $workbookModal.find(".modalInstruction .text").html(html);
        updateWorksheetBar(workbook);
    }

    function updateWorksheetBar(workbook) {
        $("#worksheetInfo .wkbkName").text(workbook.name);
        $("#workspaceDate .date").text(xcHelper.getDate("-", null,
                                                        workbook.created));
    }

    // helper function for toggle in option section
    function switchAction(no) {
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
                $searchInput.attr("disabled", "disabled");
                $workbookModal.find(".modalBottom .confirm").text("CREATE");
                break;
            // continue workbook
            case 1:
                $inputSection.addClass("unavailable");
                $workbookInput.attr("disabled", "disabled");
                $mainSection.removeClass("unavailable");
                $searchInput.removeAttr("disabled");
                $workbookModal.find(".modalBottom .confirm").text("CONTINUE");
                break;
            // copy workbook
            case 2:
                $inputSection.removeClass("unavailable");
                $workbookInput.removeAttr("disabled");
                $mainSection.removeClass("unavailable");
                $searchInput.removeAttr("disabled");
                $workbookModal.find(".modalBottom .confirm").text("COPY");
                break;
            default:
                console.error("Invalid action!");
                break;
        }
    }

    // helper function for choose user and add its workbooks
    function toggleWorkbooks($lis) {
        var isRemove;

        if ($lis == null) {
            // select all
            $lis = $userLists.children();
            isRemove = $userListBox.hasClass("active");
        } else {
            isRemove = $lis.hasClass("active");
        }

        if (isRemove) {
            $lis.removeClass("active");
        } else {
            $lis.addClass("active");
        }

        // select all users case
        if ($userLists.find(":not(.active)").length === 0 && !isRemove) {
            $userListBox.addClass("active");
        } else {
            $userListBox.removeClass("active");
        }

        // filter out all active users
        var userNames = {};
        $userLists.find(".active").each(function() {
            var $li = $(this);
            userNames[$li.text()] = true;
        });

        curUsers = allUsers.filter(function(user) {
            return (userNames.hasOwnProperty(user.username));
        });

        addWorkbooks();
    }

    function addWorkbooks() {
        var html   = "";
        var sorted = [];

        curUsers.forEach(function(wkbkInfo) {
            var workbooks = wkbkInfo.workbooks;

            for (var wkbkId in workbooks) {
                sorted.push(workbooks[wkbkId]);
            }
        });

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

        $workbookLists.empty().append(html);
    }

    function filterUser(str) {
        var delay = 50;

        if (!str || str === "") {
            $userLists.children().fadeIn(delay);
            return;
        }

        var reg = new RegExp("^" + str);

        $userLists.children().each(function() {
            var $li = $(this);

            if (reg.test($li.text()) === true) {
                $li.fadeIn(delay);
            } else {
                $li.fadeOut(delay);
            }
        });
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

    return (WorkbookModal);
}(jQuery, {}));


window.WKBKManager = (function($, WKBKManager) {
    var username;

    var wkbkInfoKey;
    var activeWKBKKey;
    var activeWKBKId;

    // initial setup
    WKBKManager.setup = function() {
        var deferred = jQuery.Deferred();

        Authentication.setup()
        .then(function(user) {
            username = user.username;
            wkbkInfoKey = generateKey(username, "workbookInfos");
            activeWKBKKey = generateKey(username, "activeWorkbook");

             // set up session variables
            userIdName = username;

            var hashTag = user.hashTag;
            userIdUnique = hashTag.charCodeAt(0) * 10000 + hashTag.charCodeAt(1);

            return (WKBKManager.getUsersInfo());
        })
        .then(function(wkbkInfo, sessionInfo) {
            // sycn sessionInfo with wkbkInfo
            var innerDeferred = jQuery.Deferred();

            var numSessions = sessionInfo.numSessions;
            var sessions    = sessionInfo.sessions;

            if (wkbkInfo == null) {
                for (var i = 0; i < numSessions; i++) {
                    console.warn("Error!", sessions[i].name, "has no meta.");
                }

                innerDeferred.resolve(null, wkbkInfo, sessionInfo);
                return (innerDeferred.promise());
            }

            var workbooks   = wkbkInfo.workbooks;
            var newWKBKInfo = {
                "username" : wkbkInfo.username,
                "workbooks": {}
            };

            var wkbkId;
            var wkbkName;
            for (var i = 0; i < numSessions; i++) {
                wkbkName = sessions[i].name;
                wkbkId = generateKey(wkbkInfo.username, "wkbk", wkbkName);

                if (workbooks.hasOwnProperty(wkbkId)) {
                    newWKBKInfo.workbooks[wkbkId] = workbooks[wkbkId];
                    delete workbooks[wkbkId];
                } else {
                    console.warn("Error!", wkbkName, "has no meta.");
                    newWKBKInfo.workbooks[wkbkId] = {
                        "name"  : wkbkName,
                        "noMeta": true
                    };
                }
            }

            for (wkbkId in workbooks) {
                console.warn("Error!", wkbkId, "is missing.");
            }

            KVStore.put(wkbkInfoKey, JSON.stringify(newWKBKInfo), true, gKVScope.WKBK)
            .then(function() {
                return (KVStore.get(activeWKBKKey, gKVScope.WKBK));
            })
            .then(function(activeId) {
                innerDeferred.resolve(activeId, newWKBKInfo, sessionInfo);
            })
            .fail(innerDeferred.reject);

            return (innerDeferred.promise());
        })
        .then(function(wkbkId, wkbkInfo, sessionInfo) {
            var innerDeferred = jQuery.Deferred();
            // if no any workbook, force displaying the workbook modal
            if (wkbkId == null ||
                sessionInfo.numSessions === 0 ||
                !wkbkInfo.workbooks.hasOwnProperty(wkbkId))
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

            } else {
                var wkbkName = wkbkInfo.workbooks[wkbkId].name;
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
                    .fail(function(error) {
                        innerDeferred.reject(error);
                    });
                } else {
                    innerDeferred.resolve(wkbkId);
                }
            }
            return (innerDeferred.promise());
        })
        .then(function(wkbkId) {
            activeWKBKId = wkbkId;
            console.log("Current Workbook Id is", wkbkId);
            // retive key from username and wkbkId
            var gStorageKey = generateKey(wkbkId, "gInfo");
            var gLogKey     = generateKey(wkbkId, "gLog");

            if (sessionStorage.getItem("xcalar.safe") != null) {
                wkbkId = sessionStorage.getItem("xcalar.safe");
                gStorageKey = generateKey(wkbkId, "gInfo");
                gLogKey = generateKey(wkbkId, "gLog");
                console.warn("Entering in safe mode of", wkbkId);
            }

            return (KVStore.setup(username, gStorageKey, gLogKey));
        })
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("KVStore setup fails", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    // get info about all users and their workbooks
    // Note: this is only for super users
    WKBKManager.getUsersInfo = function() {
        var deferred = jQuery.Deferred();
        var sessionInfo;

        XcalarListWorkbooks("*")
        .then(function(output) {
            sessionInfo = output;
            // console.log(sessionInfo);
            return (KVStore.getAndParse(wkbkInfoKey, gKVScope.WKBK));
        })
        .then(function(wkbkInfo) {
            deferred.resolve(wkbkInfo, sessionInfo);
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

        var wkbkInfo;
        var workbook;
        var isCopy = (srcWKBKId != null);
        var copySrc = null;

        WKBKManager.getUsersInfo()
        .then(function(workbookInfo, sessionInfo) {
            var innerDeferred = jQuery.Deferred();
            wkbkInfo = workbookInfo || newUser(username);

            if (isCopy) {
                copySrc = wkbkInfo.workbooks[srcWKBKId];
                if (copySrc == null) {
                    // when the source workbook's meta not exist
                    innerDeferred.reject("missing workbook meta");
                }
            }

            innerDeferred.resolve();
            return (innerDeferred.promise());
        })
        .then(function() {
            var copySrcName = isCopy ? copySrc.name : null;
            return (XcalarNewWorkbook(wkbkName, isCopy, copySrcName));
        })
        .then(function() {
            var time = xcHelper.getTimeInMS();

            workbook = {
                "id"      : generateKey(username, "wkbk", wkbkName),
                "name"    : wkbkName,
                "created" : time,
                "modified": time,
                "srcUser" : username,
                "curUser" : username
            };

            wkbkInfo.workbooks[workbook.id] = workbook;

            return (KVStore.put(wkbkInfoKey, JSON.stringify(wkbkInfo), true, gKVScope.WKBK));
        })
        .then(function() {
            // in case KVStore has some remants about wkbkId, clear it
            var innerDeferred = jQuery.Deferred();

            var gStorageKey = generateKey(workbook.id, "gInfo");
            var gLogKey     = generateKey(workbook.id, "gLog");

            var def1 = XcalarKeyDelete(gStorageKey, gKVScope.META);
            var def2 = XcalarKeyDelete(gLogKey, gKVScope.LOG);

            jQuery.when(def1, def2)
            .always(function() {
                innerDeferred.resolve();
            });

            return (innerDeferred.promise());
        })
        .then(function() {
            // console.log("create workbook", workbook);
            deferred.resolve(workbook.id);
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

        var wkbkInfo;
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

        WKBKManager.getUsersInfo()
        .then(function(workbookInfo) {
            var innerDeferred = jQuery.Deferred();

            wkbkInfo = workbookInfo;
            // check if the wkbkId is right
            var toWkbk = wkbkInfo.workbooks[wkbkId];
            if (toWkbk != null) {
                toWkbkName = toWkbk.name;

                fromWkbkName = (activeWKBKId == null) ?
                                        null :
                                        wkbkInfo.workbooks[activeWKBKId].name;

                innerDeferred.resolve();
            } else {
                innerDeferred.reject("No such workbook id!");
            }

            return (innerDeferred.promise());
        })
        .then(function() {
             // to switch workbook, should release all ref count first
            return (freeAllResultSetsSync());
        })
        .then(function() {
            return (saveWKBK(wkbkInfo));
        })
        .then(function() {
            return (KVStore.release());
        })
        .then(function() {
            return (XcalarSwitchToWorkbook(toWkbkName, fromWkbkName));
        })
        .then(function() {
            return (KVStore.put(activeWKBKKey, wkbkId, true, gKVScope.WKBK));
        })
        .then(function() {
            location.reload();
        })
        .fail(function(error) {
            console.error("Switch Workbook Fails", error);
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
            return (copyHelper(srcWKBKId, newId));
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

    // XXX this is buggy now because it clear wkbkInfo but the session info is kept!
    WKBKManager.emptyAll = function() {
        var deferred   = jQuery.Deferred();

        WKBKManager.getUsersInfo()
        .then(function(userInfo) {
            if (userInfo == null) {
                return (promiseWrapper(null));
            }

            var promises = [];

            // delete all workbooks
            for (wkbkId in userInfo.wkbkLookup) {
                promises.push(delWKBKHelper.bind(this, wkbkId));
            }

            // delete all active work book key
            for (var user in userInfo.users) {
                var key = generateKey(user, "activeWorkbook");
                promises.push(KVStore.delete.bind(this, key, gKVScope.WKBK));
            }

            return (chain(promises));
        })
        .then(function() {
            return (KVStore.delete(wkbkInfoKey, gKVScope.WKBK));
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

        var oldStorageKey = generateKey(srcId, "gInfo");
        var oldLogKey     = generateKey(srcId, "gLog");
        var newStorageKey = generateKey(newId, "gInfo");
        var newLogKey     = generateKey(newId, "gLog");

        // copy all info to new key
        KVStore.getAndParse(oldStorageKey, gKVScope.META)
        .then(function(gInfos) {
            gInfos[KVKeys.HOLD] = false;
            return KVStore.put(newStorageKey, JSON.stringify(gInfos), true, gKVScope.META);
        })
        .then(function() {
            return (KVStore.get(oldLogKey, gKVScope.LOG));
        })
        .then(function(value) {
            return (KVStore.put(newLogKey, value, true, gKVScope.LOG));
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

    // first time to save this user
    function newUser(name) {
        return {
            "username" : name,
            "workbooks": {}
        };
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

    // save current workbook
    function saveWKBK(wkbkInfo) {
        // if activeWKBK is null, then it's creating a new WKBK
        var workbook = wkbkInfo.workbooks[activeWKBKId];

        workbook.modified = xcHelper.getTimeInMS();  // store modified data
        workbook.curUser = username;  // store current user

        return (KVStore.put(wkbkInfoKey, JSON.stringify(wkbkInfo), true, gKVScope.WKBK));
    }

    return (WKBKManager);
}(jQuery, {}));

window.WorkbookModal = (function($, WorkbookModal) {
    var $modalBackground = $("#modalBackground");
    var $workbookModal   = $("#workbookModal");

    var $optionSection = $workbookModal.find(".optionSection");
    var $workbookInput = $("#workbookInput");
    var $searchInput   = $("#workbookUserSearch");
    var $userListBox   = $workbookModal.find(".userListBox");
    var $userLists     = $("#workbookUserLists");
    var $workbookLists = $("#workbookLists");

    var modalHelper = new xcHelper.Modal($workbookModal, {"focusOnOpen": true});

    var reverseLookup = {};
    var sortkey       = "name";

    var activeActionNo = 0;

    var allUsers = [];
    var curUsers = [];

    WorkbookModal.setup = function() {
        $workbookModal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing"
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
        xcHelper.removeSelectionRange();

        $modalBackground.fadeIn(300, function() {
            Tips.refresh();
        });

        centerPositionElement($workbookModal);
        $workbookModal.show();

        resetWorkbookModal();
        modalHelper.setup();
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

        $workbookModal.hide();
        $modalBackground.fadeOut(300, function() {
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

            event.stopPropagation();
            // Validation check
            // new workbook and copy workbook must have new workbook name
            if (activeActionNo !== 1) {
                isValid = xcHelper.validate({
                    "$selector": $workbookInput,
                    "formMode" : true
                });

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

            var workbookName = jQuery.trim($workbookInput.val());

            if (activeActionNo === 0) {
                // create new workbook part
                console.log("Start Creating new Workbook...");
                modalHelper.submit();
                WKBKManager.newWKBK(workbookName)
                .then(function(id) {
                    WKBKManager.switchWKBK(id, modalHelper);
                })
                .fail(function(error) {
                    Alert.error("Create New Workbook Fails", error);
                })
                .always(function() {
                    modalHelper.enableSubmit();
                });
                return;
            }

            var workbookId = $workbookLists.find(".active").data("wkbkid");

            if (activeActionNo === 1) {
                // continue workbook part
                console.log("Switch to workbook", workbookId, "...");
                WKBKManager.switchWKBK(workbookId);
                return;
            }

            if (activeActionNo === 2) {
                // copy workbook part
                console.log("Copy workbook", workbookId, "...");
                modalHelper.submit();
                WKBKManager.copyWKBK(workbookId, workbookName)
                .then(function(id) {
                    WKBKManager.switchWKBK(id);
                })
                .fail(function(error) {
                    Alert.error("Copy Session Fails", error);
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
        $optionSection.on("click", ".select-item", function(event){
            var $option = $(this);
            var no      = Number($option.data("no"));

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
        .then(function(userInfo) {
            userInfo = userInfo || {}; // in case userInfo is null
            var users = userInfo.users;

            for (var username in users) {
                allUsers.push(users[username]);
            }

            // sort by user.username
            allUsers = sortObj(allUsers, "username");

            //update user num
            $workbookModal.find(".userSection .title .num")
                          .text(allUsers.length);
            // update userlist
            var html = "";
            allUsers.forEach(function(user) {
                html += "<li>" + user.username + "</li>";
            });
            $userLists.html(html);

            // get current workbook info
            getWorkbookInfo(userInfo, isForceMode);
        })
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("Get Session Error", error);
            $datalist.html("");
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    function getWorkbookInfo(userInfo, isForceMode) {
        var html;

        if (isForceMode) {
            html =
                'Hello <b>' + WKBKManager.getUser() + '</b>, ' +
                ' you have no workbook yet, you can create new workbook, ' +
                'continue a workbook or copy a workbook';
            $workbookModal.find(".modalInstruction .text").html(html);
            return;
        }
        var activeWKBKId = WKBKManager.getActiveWKBK();
        var srcUser      = userInfo.wkbkLookup[activeWKBKId];
        var workbooks    = userInfo.users[srcUser].workbooks;

        for (var i = 0; i < workbooks.length; i++) {
            if (workbooks[i].id === activeWKBKId) {
                html =
                    'Hello <b>' + WKBKManager.getUser() + '</b>, ' +
                    'current workbook is <b>' + workbooks[i].name + '</b>' +
                    ' created by <b>' + srcUser + '</b>';
                $workbookModal.find(".modalInstruction .text").html(html);
                updateWorksheetBar(workbooks[i]);
                break;
            }
        }
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

        switch (no) {
            // new workbook
            case 0:
                $inputSection.removeClass("unavailable");
                $workbookInput.removeAttr("disabled"); // for tab key switch
                $mainSection.addClass("unavailable");
                $searchInput.attr("disabled", "disabled");
                break;
            // continue workbook
            case 1:
                $inputSection.addClass("unavailable");
                $workbookInput.attr("disabled", "disabled");
                $mainSection.removeClass("unavailable");
                $searchInput.removeAttr("disabled");
                break;
            // copy workbook
            case 2:
                $inputSection.removeClass("unavailable");
                $workbookInput.removeAttr("disabled");
                $mainSection.removeClass("unavailable");
                $searchInput.removeAttr("disabled");
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
            return (userNames[user.username] === true);
        });

        addWorkbooks();
    }

    function addWorkbooks() {
        var html   = "";
        var sorted = [];

        curUsers.forEach(function(user) {
            user.workbooks.forEach(function(workbook) {
                sorted.push(workbook);
            });
        });

        // sort by workbook.name
        var isNum = (sortkey === "created" || sortkey === "modified");
        sorted = sortObj(sorted, sortkey, isNum);
        sorted.forEach(function(workbook) {
            var created  = workbook.created;
            var modified = workbook.modified;

            html +=
                 '<div class="grid-unit" data-wkbkid="' + workbook.id + '">' +
                    '<div>' + workbook.name + '</div>' +
                    '<div>' +
                        xcHelper.getTime(null, created) + ' ' +
                        xcHelper.getDate("-", null, created) +
                    '</div>' +
                    '<div>' +
                        xcHelper.getTime(null, modified) + ' ' +
                        xcHelper.getDate("-", null, modified) +
                    '</div>' +
                    '<div>' + workbook.srcUser + '</div>' +
                    '<div>' + workbook.curUser + '</div>' +
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
    var username = sessionStorage.getItem("xcalar-username") || 
                        generateKey(hostname, portNumber);

    var gUserInfoKey  = generateKey("gUserInfos");
    var activeWKBKKey = generateKey(username, "activeWorkbook");
    var activeWKBKId;

    // initial setup
    WKBKManager.setup = function() {
        var deferred = jQuery.Deferred();

        KVStore.get(activeWKBKKey)  // get active workbook
        .then(function(wkbkId) {
            var innerDeferred = jQuery.Deferred();
            // if no any workbook, force displaying the workbook modal
            if (wkbkId == null) {
                innerDeferred.reject("No workbook for the user");
                WorkbookModal.forceShow();
            } else {
                innerDeferred.resolve(wkbkId);
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

            KVStore.setup(username, gStorageKey, gLogKey);

            deferred.resolve();
        })
        .fail(function(error) {
            console.error("KVStore setup fails", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    // get info about all users and their workbooks
    // Note: this is only for super users
    WKBKManager.getUsersInfo = function() {
        return (KVStore.getAndParse(gUserInfoKey));
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
    WKBKManager.newWKBK = function(name, srcWKBKId) {
        var deferred = jQuery.Deferred();
        var time     = xcHelper.getTimeInMS();
        var workbook = {
            "id"      : xcHelper.randName("workbook"),
            "name"    : name,
            "created" : time,
            "modified": time,
            "tables"  : {},
            "srcUser" : username,
            "curUser" : username
        };

        if (!name) {
            console.error("Invalid name");
            deferred.reject("Invalid name");
            return (deferred.promise());
        }

        WKBKManager.getUsersInfo()
        .then(function(userInfo) {
            userInfo = userInfo || {};

            var users       = userInfo.users || {};
            var wkbkLookup  = userInfo.wkbkLookup || {};
            users[username] = users[username] || newUser(username);

            if (srcWKBKId != null) {
                // copy a workbook
                if (srcWKBKId === activeWKBKId) {
                    // XXX it's an edge case that user copy current workbook,
                    // and the workbook's tables are not saved yet
                    workbook = storeWKBKInfo(workbook);
                    workbook.created = workbook.modified;
                } else {
                    var srcUser     = userInfo.wkbkLookup[srcWKBKId];
                    var workbooks   = users[srcUser].workbooks;
                    var srcWorkbook = null;

                    for (var i = 0; i < workbooks.length; i++) {
                        if (workbooks[i].id === srcWKBKId) {
                            srcWorkbook = workbooks[i];
                            break;
                        }
                    }

                    if (srcWorkbook === null) {
                        // error case
                        console.error("Cannot find workbook", srcWKBKId);
                        deferred.reject("Cannot find workbook");
                        return (promiseWrapper(null));
                    }

                    workbook.tables = xcHelper.deepCopy(srcWorkbook.tables);
                }
            }

            users[username].workbooks.push(workbook);
            wkbkLookup[workbook.id] = workbook.srcUser;

            userInfo = {
                "users"     : users,
                "wkbkLookup": wkbkLookup
            };

            return (KVStore.put(gUserInfoKey, JSON.stringify(userInfo)));
        })
        .then(function() {
            console.log("create workbook", workbook);
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
        var gUserInfos;

        if (wkbkId == null) {
            console.error("Invalid wookbook Id!");
            return;
        }
        if (modalHelper) {
            modalHelper.submit();
        }
        WKBKManager.getUsersInfo()
        .then(function(userInfo) {
            var innerDeferred = jQuery.Deferred();

            gUserInfos = userInfo;
            // check if the wkbkId is right
            if (userInfo.wkbkLookup[wkbkId] == null) {
                innerDeferred.reject("No such workbook id!");
            } else {
                innerDeferred.resolve();
            }

            return (innerDeferred.promise());
        })
        .then(function() {
             // to switch workbook, should release all ref count first
            return (freeAllResultSetsSync());
        })
        .then(function() {
            return (saveWKBK(gUserInfos));
        })
        .then(function() {
            return (KVStore.release());
        })
        .then(function() {
            return (KVStore.put(activeWKBKKey, wkbkId));
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
                promises.push(KVStore.delete.bind(this, key));
            }

            return (chain(promises));
        })
        .then(function() {
            return (KVStore.delete(gUserInfoKey));
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

    // check if table is also in other workbook
    // assume backTableName is unique
    // XXX Cheng: temporary use,
    // after backend support should remove this function
    WKBKManager.canDelTable = function(srcName) {
        var deferred  = jQuery.Deferred();

        WKBKManager.getUsersInfo()
        .then(function(userInfo) {
            var users = userInfo.users;

            for (var user in users) {
                var workbooks = users[user].workbooks;
                var isFound   = false;

                for (var i = 0; i < workbooks.length; i++) {
                    if (workbooks[i].id === activeWKBKId) {
                        continue;
                    }

                    if (srcName in workbooks[i].tables) {
                        isFound = true;
                        console.warn("table also in other workbook," +
                                    " cannot delete!");
                        deferred.resolve(false);
                        break;
                    }
                }

                if (isFound) {
                    break;
                }
            }

            deferred.resolve(true);
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    // helper for WKBKManager.copyWKBK
    function copyHelper(srcId, newId) {
        var deferred      = jQuery.Deferred();

        var oldStorageKey = generateKey(srcId, "gInfo");
        var oldLogKey     = generateKey(srcId, "gLog");
        var newStorageKey = generateKey(newId, "gInfo");
        var newLogKey     = generateKey(newId, "gLog");

        // copy all info to new key
        KVStore.getAndParse(oldStorageKey)
        .then(function(gInfos) {
            gInfos[KVKeys.HOLD] = false;
            return KVStore.put(newStorageKey, JSON.stringify(gInfos));
        })
        .then(function() {
            return (KVStore.get(oldLogKey));
        })
        .then(function(value) {
            return (KVStore.put(newLogKey, value));
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

        XcalarKeyDelete(storageKey)
        .then(function() {
            return (XcalarKeyDelete(logKey));
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
            "workbooks": []
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
    function saveWKBK(userInfo) {
        var users   = userInfo.users;
        var srcUser = userInfo.wkbkLookup[activeWKBKId];

        // for the case it is the first time to save this user
        users[srcUser] = users[srcUser] || newUser(srcUser);
        var workbooks = users[srcUser].workbooks;

        for (var i = 0; i < workbooks.length; i++) {
            if (workbooks[i].id === activeWKBKId) {
                workbooks[i] = storeWKBKInfo(workbooks[i]);
                userInfo.users = users;

                console.log("Save Workbook!");
                return (KVStore.put(gUserInfoKey,
                                    JSON.stringify(userInfo)));
            }
        }

        console.error("Not find active workbook with id", activeWKBKId);
        return (promiseWrapper(null));
    }

    // store work infos
    function storeWKBKInfo(workbook) {
        workbook.tables = {};

        gTables.forEach(storeHelper);

        // XXX Cheng: store real table for delete table use
        // this is just temporayily, after bakcend support, we do not need it!
        function storeHelper(table) {
            workbook.tables[table.tableName] = true;
        }

        workbook.modified = xcHelper.getTimeInMS();  // store modified data
        workbook.curUser = username;  // store current user

        return (workbook);
    }

    return (WKBKManager);
}(jQuery, {}));

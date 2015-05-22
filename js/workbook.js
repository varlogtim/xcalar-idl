window.WorkbookModal = (function($, WorkbookModal) {
    var $modalBackground = $("#modalBackground");
    var $workbookModal   = $("#workbookModal");

    var $optionSection   = $workbookModal.find(".optionSection");

    var $workbookInput   = $("#workbookInput");
    var $searchInput     = $("#workbookUserSearch");

    var $userListBox     = $workbookModal.find(".userListBox");
    var $userLists       = $("#workbookUserLists");

    var $workbookLists   = $("#workbookLists");

    var modalHelper      = new xcHelper.Modal($workbookModal);

    var activeActionNo   = 0;
    var allUsers         = [];

    WorkbookModal.setup = function() {
        $workbookModal.draggable({
                 "handle": ".modalHeader",
                 "cursor": "-webkit-grabbing"
        });
        // open workbook modal
        $("#workbookBtn").click(function() {
            WorkbookModal.show();
        });

        // click cancel or close button
        $workbookModal.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeWorkbookModal();
        });

        // click confirm button
        $workbookModal.on("click", ".confirm", function(event) {
            var $btn    = $(this);
            event.stopPropagation();
            // Validation check
            // new workbook and copy workbook must have new workbook name
            if (activeActionNo !== 1) {
                var isValid = xcHelper.validate({
                    "$selector": $workbookInput,
                    "formMode" : true
                });

                if (!isValid) {
                    return;
                }
            }

            // continue workbook and copy workbook must select one wkbk
            if (activeActionNo !== 0) {
                var isValid = xcHelper.validate({
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

                WKBKManager.newWKBK(workbookName)
                .then(function(id) {
                    WKBKManager.switchWKBK(id);
                })
                .fail(function(error) {
                    Alert.error("Create New Workbook Fails", error);
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

                WKBKManager.copyWKBK(workbookId, workbookName)
                .then(function(id) {
                    WKBKManager.switchWKBK(id);
                })
                .fail(function(error) {
                    Alert.error("Copy Session Fails", error);
                });

                return;
            }
        });

        // select a workbook
        $workbookLists.on("click", "grid-unit", function(event) {
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
        $searchInput.keyup(function(event) {
            filterUser($searchInput.val());
        });

        getUserLists();
    }

    WorkbookModal.show = function() {
        xcHelper.removeSelectionRange();

        $modalBackground.fadeIn(300, function() {
            Tips.refresh();
        });

        $workbookModal.css({
            "left"  : 0,
            "right" : 0,
            "top"   : 0,
            "bottom": 0
        });
        $workbookModal.show();

        resetWorkbookModal();
        modalHelper.setup();
    }

    function resetWorkbookModal() {
        $workbookModal.find(".active").removeClass("active");
        toggleWorkbooks(); // default select all workbooks
        filterUser();   // show all user lists
        // default choose first option
        $optionSection.find(".radio").eq(0).click();
        $searchInput.val("");
        $workbookInput.val("").focus();
    }

    function closeWorkbookModal() {
        modalHelper.clear();

        $workbookModal.hide();
        $modalBackground.fadeOut(300, function() {
            Tips.refresh();
        });
    }

    function getUserLists() {
        allUsers = [];

        WKBKManager.getUsersInfo()
        .then(function(userInfo) {
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
            getActiveWorkbook(userInfo);
        })
        .fail(function(error) {
            console.error("Get Session Error", error);
            $datalist.html("");
        });
    }

    function getActiveWorkbook(userInfo) {
        var activeWKBKId = WKBKManager.getActiveWKBK();
        var srcUser      = userInfo.wkbkLookup[activeWKBKId];
        var workbooks    = userInfo.users[srcUser].workbooks;

        for (var i = 0; i < workbooks.length; i++) {
            if (workbooks[i].id === activeWKBKId) {
                var html = 
                    'Current workbook is <b>' + workbooks[i].name + '</b>' + 
                    ' created by <b>' + srcUser + '</b>';
                $workbookModal.find(".modalInstruction .text").html(html);
                break;
            }
        }
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
            $lis    = $userLists.children();
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

        var activeUsers = allUsers.filter(function(user) {
            return (userNames[user.username] === true);
        });

        addWorkbooks(activeUsers);
    }

    function addWorkbooks(users) {
        var html   = "";
        var sorted = [];

        users.forEach(function(user) {
            user.workbooks.forEach(function(workbook) {
                sorted.push(workbook);
            });
        });

        // sort by workbook.name
        sorted = sortObj(sorted, "name");
        sorted.forEach(function(workbook) {
            var created  = workbook.created;
            var modified = workbook.modified;

            html += 
                 '<grid-unit data-wkbkid="' + workbook.id + '">' + 
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
                '</grid-unit>';
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

    function sortObj(objs, key) {
        var sorted  = [];
        var results = [];

        // first sort by name
        objs.forEach(function(obj) {
            sorted.push([obj, obj[key]]);
        });

        sorted.sort(function(a, b) {return a[1].localeCompare(b[1])});

        sorted.forEach(function(obj) {
            results.push(obj[0]);
        });

        return (results);
    }

    return (WorkbookModal);
}(jQuery, {}));


window.WKBKManager = (function($, WKBKManager) {
    var username      = sessionStorage.getItem("xcalar-username") || 
                        generateKey(hostname, portNumber);

    var gUserInfoKey  = generateKey("gUserInfos");
    var activeWKBKKey = generateKey(username, "activeWorkbook");
    var activeWKBKId;

    // initial setup
    WKBKManager.setup = function() {
        var deferred = jQuery.Deferred();
        var isNew    = false;

        KVStore.get(activeWKBKKey)  // get active workbook
        .then(function(wkbkId) {
            // if no any workbook, create a new one
            if (wkbkId == null) {
                isNew = true;
                return (WKBKManager.newWKBK("untitled"));
            } else {
                return (promiseWrapper(wkbkId));
            }
        })
        .then(function(wkbkId) {
            // mark this workbook as active
            if (isNew) {
                KVStore.put(activeWKBKKey, wkbkId);
            }

            activeWKBKId = wkbkId;
            console.log("Current Workbook Id is", wkbkId);
            // retive key from username and wkbkId
            var gStorageKey = generateKey(wkbkId, "gInfo");
            var gLogKey     = generateKey(wkbkId, "gLog");

            KVStore.setup(username, gStorageKey, gLogKey);

            deferred.resolve();
        })
        .fail(function(error) {
            console.log("KVStore setup fails", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    // get info about all users and their workbooks
    // XXX this is only for super users
    WKBKManager.getUsersInfo = function() {
        return (KVStore.getAndParse(gUserInfoKey));
    }
    // get current active workbook
    WKBKManager.getActiveWKBK = function() {
        return (activeWKBKId);
    }

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
        }

        if (!name) {
            console.error("Invalid name");
            deferred.reject("Invalid name");
            return (deferred.promise());
        }

        WKBKManager.getUsersInfo()
        .then(function(userInfo) {
            userInfo        = userInfo || {};
            var users       = userInfo.users || {};
            var wkbkLookup  = userInfo.wkbkLookup || {};

            users[username] = users[username] || newUser(username);

            if (srcWKBKId != undefined) {
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

                    workbook.tables =  xcHelper.deepCopy(srcWorkbook.tables);
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
    }

    // swtich to another workbook
    WKBKManager.switchWKBK = function(wkbkId) {
        var gUserInfos;

        if (wkbkId == undefined) {
            console.error("Invalid wookbook Id!");
            return;
        }

        WKBKManager.getUsersInfo()
        .then(function(userInfo) {
            var innerDeferred = jQuery.Deferred();

            gUserInfos = userInfo;
            // check if the wkbkId is right
            if (userInfo.wkbkLookup[wkbkId] == undefined) {
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
        });
    }

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
    }

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
                promises.push(delWKBKHelper.bind(this, wkbkId.id));
            };

            // delete all active work book key
            for (var username in userInfo.users) {
                var key = generateKey(username, "activeWorkbook");
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
    }

    // check if table is also in other workbook
    // assume backTableName is unique
    // XXX Cheng: temporary use, 
    // after backend support should remove this function
    WKBKManager.canDelTable = function(srcName) {
        var deferred  = jQuery.Deferred();

        WKBKManager.getUsersInfo()
        .then(function(userInfo) {
            var users = userInfo.users;

            for (var username in users) {
                var workbooks = users[username].workbooks;
                var isFound   = false;

                for (var i = 0; i < workbooks.length; i++) {
                    if (workbooks[i].id === activeWKBKId) {
                        continue;
                    }

                    if (srcName in workbooks[i].tables) {
                        isFound = true;
                        console.log("table also in other workbook," + 
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
    }

    // helper for WKBKManager.copyWKBK
    function copyHelper(srcId, newId) {
        var deferred      = jQuery.Deferred();

        var oldStorageKey = generateKey(srcId, "gInfo");
        var oldLogKey     = generateKey(srcId, "gLog");
        var newStorageKey = generateKey(newId, "gInfo");
        var newLogKey     = generateKey(newId, "gLog");

        // copy all info to new key
        KVStore.get(oldStorageKey)
        .then(function(value) {
            return KVStore.put(newStorageKey, value);
        })
        .then(function() {
            return (KVStore.get(oldLogKey));
        })
        .then(function(value) {
            return (KVStore.put(newLogKey, value))
        })
        .then(deferred.resolve)
        .fail(deferred.reject)

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
    function newUser(username) {
        return {"username" : username, "workbooks": []}
    }

    // generate key for KVStore use
    function generateKey() {
        // currently just cat all arguments as a key
        var key;
        for (var i = 0; i < arguments.length; i ++) {
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
        var users    = userInfo.users;
        var srcUser  = userInfo.wkbkLookup[activeWKBKId];

        // for the case it is the first time to save this user
        users[srcUser] = users[srcUser] || newUser(srcUser);
        var workbooks  = users[srcUser].workbooks;

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
        gHiddenTables.forEach(storeHelper);

        // XXX Cheng: store real table for delete table use
        // this is just temporayily, after bakcend support, we do not need it!
        function storeHelper(table) {
            if (table.isTable) {
                workbook.tables[table.backTableName] = true;
            }
        }

        workbook["modified"] = xcHelper.getTimeInMS();  // store modified data
        workbook["curUser"]  = username;  // store current user

        return (workbook);
    }

    return (WKBKManager);
}(jQuery, {}));

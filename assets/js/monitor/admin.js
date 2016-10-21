window.Admin = (function($, Admin) {
    // xx may need to separate UserList module from Admin
    var userListKey = "gUserListKey"; // constant
    var userList = [];
    var searchHelper;
    var $menuPanel; // $('#monitorMenu-setup');
    var $userList; // $menuPanel.find('.userList');

    Admin.initialize = function() {
        //xx temp hack  to determine admin
        if (localStorage.admin === "true") {
            gAdmin = true;
        }
        $menuPanel = $('#monitorMenu-setup');
        $userList = $menuPanel.find('.userList');

        if (Admin.isAdmin()) {
            addMonitorMenuPanelListeners();
            refreshUserList();
            updateAdminStatusBar();
            addAdminStatusBarListeners();
        }
    };

    Admin.isAdmin = function() {
        return gAdmin;
    };

    // will not add user if already exists in kvstore
    Admin.addNewUser = function() {
        if (Admin.isAdmin()) {
            // do not add admin to userList
            return PromiseHelper.resolve();
        }
        var username = Support.getUser();

        KVStore.get(userListKey, gKVScope.GLOB)
        .then(function(value) {
            if (value == null) {
                storeUsername(username);
            } else {
                parseStrIntoUserList(value);
                // usernames are case sensitive
                if (userList.indexOf(username) === -1) {
                    storeUsername(username, true);
                }
            }
        })
        .fail(function(err) {
            //xx need to handle or alert?
            console.warn(err);
        });
    };

    Admin.getUserList = function() {
        if (Admin.isAdmin()) {
            return userList;
        } else {
            return [];
        }
    };

    Admin.switchUser = function(username) {
        sessionStorage.setItem("xcalar-username", username);
        sessionStorage.setItem("xcalar-fullUsername", username);
        unloadHandler(false, true);
    };

    function addMonitorMenuPanelListeners() {
        searchHelper = new SearchBar($("#adminUserSearch"), {
            "$list"         : $userList.find('ul'),
            "removeSelected": function() {
                $userList.find(".selected").removeClass('selected');
            },
            "highlightSelected": function($match) {
                $match.addClass("selected");
            }
        });
        searchHelper.setup();


        $("#adminUserSearch").on('input', 'input', function() {
            var keyWord = $(this).val();
            filterUserList(keyWord);
        });

        $("#adminUserSearch").on("click", ".closeBox", function() {
            searchHelper.clearSearch(function() {
                clearUserListFilter();
                searchHelper.$arrows.hide();
                $("#adminUserSearch").find("input").focus()
                .removeClass('hasArrows');
            });
        });
        $menuPanel.find('.refreshUserList').click(function() {
            searchHelper.clearSearch(function() {
                clearUserListFilter();
            });
            xcHelper.showRefreshIcon($userList);
            refreshUserList();
        });

        $userList.on('click', '.userLi', function() {
            var username = $(this).text().trim();
            Admin.switchUser(username);
        });
    }

    function parseStrIntoUserList(value) {
        var len = value.length;
        if (value.charAt(len - 1) === ",") {
            value = value.substring(0, len - 1);
        }
        var arrayStr = "[" + value + "]";

        try {
            userList = JSON.parse(arrayStr);
        } catch (err) {
            userList = [];
            console.error("restore error logs failed!", err);
        }
    }

    // xcalar put by default, or append if append param is true
    function storeUsername(username, append) {
        var deferred = jQuery.Deferred();
        var entry = JSON.stringify(username) + ",";
        var promise;
        if (append) {
            promise = XcalarKeyAppend(userListKey, entry, true, gKVScope.GLOB);
        } else {
            promise = XcalarKeyPut(userListKey, entry, true, gKVScope.GLOB);
        }

        promise.then(function() {
            userList.push(username);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function setupUserListMenu() {
        var html = "";
        for (var i = 0; i < userList.length; i++) {
            html += '<li class="userLi">' +
                        '<i class="icon xi-user fa-12"></i>' +
                        '<span class="text">' + userList[i] + '</span>' +
                    '</li>';
        }

        $userList.find('ul').html(html);
    }

    function refreshUserList() {
        KVStore.get(userListKey, gKVScope.GLOB)
        .then(function(value) {
            if (value == null) {
                userList = [];
            } else {
                parseStrIntoUserList(value);
            }
            setupUserListMenu();
        });
    }

    function filterUserList(keyWord) {
        var $lis = $menuPanel.find(".userLi");
        // $lis.find('.highlightedText').contents().unwrap();
        $lis.each(function() {
            var $li = $(this);
            if ($li.hasClass("highlighted")) {
                var $span = $li.find(".text");
                $span.html($span.text());
                $li.removeClass("highlighted");
            } else if ($li.hasClass('nonMatch')) {
                // hidden lis that are filtered out
                $li.removeClass('nonMatch xc-hidden');
            }
        });

        if (keyWord == null || keyWord === "") {
            searchHelper.clearSearch(function() {
                searchHelper.$arrows.hide();
            });
            $("#adminUserSearch").find("input").removeClass('hasArrows');
            return;
        } else {
            var regex = new RegExp(keyWord, "gi");
            $lis.each(function() {
                var $li = $(this);
                var tableName = $li.text();
                if (regex.test(tableName)) {
                    $li.addClass("highlighted");
                    // var $span = $li.find(".tableName");
                    var $span = $li.find('.text');
                    var text = $span.text();
                    text = text.replace(regex, function (match) {
                        return ('<span class="highlightedText">' + match +
                            '</span>');
                    });

                    $span.html(text);
                } else {
                    // we will hide any lis that do not match
                    $li.addClass('nonMatch xc-hidden');
                }
            });
            searchHelper.updateResults($userList.find('.highlightedText'));
            // var counterWidth = $userList.find('.counter').width();
            // $userList.find('input').css("padding-right", counterWidth + 30);

            if (searchHelper.numMatches !== 0) {
                searchHelper.scrollMatchIntoView(searchHelper.$matches.eq(0));
                searchHelper.$arrows.show();
                $("#adminUserSearch").find("input").addClass('hasArrows');
            } else {
                searchHelper.$arrows.hide();
                $("#adminUserSearch").find("input").removeClass('hasArrows');
            }
        }
    }

    function clearUserListFilter() {
        $("#adminUserSearch").find("input").val("");
        filterUserList(null);
    }

    function addAdminStatusBarListeners() {
        $('#adminStatusBar').on('click', '.xi-close', function() {
            $('#adminStatusBar').addClass('xc-hidden');
        });
        $('#adminViewBtn').on('click', function() {
            $('#adminStatusBar').removeClass('xc-hidden');
        });
    }

    function updateAdminStatusBar() {
        var username = Support.getUser();
        $('#adminStatusBar').find('.username').text(username);
    }

    return (Admin);
}(jQuery, {}));

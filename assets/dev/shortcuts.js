$(document).ready(function() {
    if (xcLocalStorage.getItem("shortcuts") != null) {
        if (window.location.pathname.indexOf('login.html') > -1) {
            Shortcuts.login();
        } else {
            if (xcLocalStorage.getItem("autoLogin") != null) {
                Shortcuts.createWorkbook();
            }

            var count = 0;
            var interval = setInterval(function() {
                // initial load screen leaving signifies start up is done
                if ($("#initialLoadScreen:visible").length === 0) {
                    Shortcuts.setup(true);
                    clearInterval(interval);
                } else if (count > 20) {
                    clearInterval(interval);
                    console.info('timed out: short cuts not added');
                }
                count++;
            }, 1000);
        }
    }
});

window.Shortcuts = (function($, Shortcuts) {
    var shortcutsOn = false;
    var autoLogin = true;

    Shortcuts.on = function(name, pass) {
        if (shortcutsOn) {
            return false;
        }
        xcLocalStorage.setItem("shortcuts", "true");
        if (!name) {
            name = "user";
        }
        xcLocalStorage.setItem("shortcutName", name || "");
        xcLocalStorage.setItem("xcPass", pass || "");
        xcLocalStorage.setItem("autoLogin", "true");
        Shortcuts.setup();
    };

    Shortcuts.off = function() {
        xcLocalStorage.removeItem("shortcuts");
        xcLocalStorage.removeItem("shortcutName");
        xcLocalStorage.removeItem("xcPass");
        xcLocalStorage.removeItem("autoLogin");
        Shortcuts.remove();
        shortcutsOn = false;
    };

    Shortcuts.toggleAutoLogin = function(turnOn) {
        if (turnOn) {
            xcLocalStorage.setItem("autoLogin", "true");
            autoLogin = true;
        } else {
            xcLocalStorage.removeItem("autoLogin");
            autoLogin = false;
        }
        toggleAutoLoginMenu(turnOn);
    };

    Shortcuts.toggleVerbose = function(turnOn) {
        if (turnOn) {
            $('#shortcutSubMenu').find('.verboseOff').show();
            $('#shortcutSubMenu').find('.verboseOn').hide();
            xcLocalStorage.setItem("verbose", "true");
            verbose = true;
        } else {
            $('#shortcutSubMenu').find('.verboseOff').hide();
            $('#shortcutSubMenu').find('.verboseOn').show();
            xcLocalStorage.removeItem("verbose");
            verbose = false;
        }
    };

    Shortcuts.toggleDebug = function(turnOn) {
        if (turnOn) {
            $('#shortcutSubMenu').find('.debugOff').show();
            $('#shortcutSubMenu').find('.debugOn').hide();
            xcLocalStorage.setItem("debugOn", "true");
            window.debugOn = true;
        } else {
            $('#shortcutSubMenu').find('.debugOff').hide();
            $('#shortcutSubMenu').find('.debugOn').show();
            xcLocalStorage.removeItem("debugOn");
            window.debugOn = false;
        }
    };

    Shortcuts.toggleAdmin = function(turnOn) {
        if (turnOn) {
            $('#shortcutSubMenu').find('.adminOff').show();
            $('#shortcutSubMenu').find('.adminOn').hide();
            if (xcSessionStorage.getItem("usingAs") !== "true") {
                $('#container').addClass('admin');
            }

            $('#shortcutMenuIcon').css('margin-right', 20);
            xcLocalStorage.setItem("admin", "true");
            gAdmin = true;
        } else {
            $('#shortcutSubMenu').find('.adminOff').hide();
            $('#shortcutSubMenu').find('.adminOn').show();
            $('#container').removeClass('admin');
            $('#shortcutMenuIcon').css('margin-right', 0);
            xcLocalStorage.removeItem("admin");
            gAdmin = false;

        }
    };

    Shortcuts.toggleJoinKey = function(turnOn) {
        if (turnOn) {
            $('#shortcutSubMenu').find('.joinKeyOff').show();
            $('#shortcutSubMenu').find('.joinKeyOn').hide();
            xcLocalStorage.setItem("gEnableJoinKeyCheck", "true");
            gEnableJoinKeyCheck = true;
        } else {
            $('#shortcutSubMenu').find('.joinKeyOff').hide();
            $('#shortcutSubMenu').find('.joinKeyOn').show();
            xcLocalStorage.removeItem("gEnableJoinKeyCheck");
            gEnableJoinKeyCheck = false;
        }
    };

    Shortcuts.setup = function(fullSetup) {
        shortcutsOn = true;

        if (xcLocalStorage.getItem("autoLogin") === "true") {
            autoLogin = true;
        } else {
            autoLogin = false;
        }

        if (xcLocalStorage.getItem("debugOn") === "true") {
            window.debugOn = true;
        } else {
            window.debugOn = false;
        }

        if (xcLocalStorage.getItem("verbose") === "true") {
            verbose = true;
        } else {
            verbose = false;
        }

        if (xcLocalStorage.getItem("admin") === "true") {
            gAdmin = true;
        } else {
            gAdmin = false;
        }

        if (xcLocalStorage.getItem("gEnableJoinKeyCheck") === "true") {
            gEnableJoinKeyCheck = true;
        } else {
            gEnableJoinKeyCheck = false;
        }

        if (fullSetup) {
            dsForm();
            createMainMenu();
        }
        
        Shortcuts.toggleVerbose(verbose);
        Shortcuts.toggleAdmin(gAdmin);
        Shortcuts.toggleJoinKey(gEnableJoinKeyCheck);
        Shortcuts.toggleDebug(window.debugOn);
    };

    Shortcuts.remove = function () {
        $('#shortcutMenuIcon').remove();
        $('#shortcutMenu').remove();
        $('#shortcutSubMenu').remove();
        var $filePath = $("#filePath");
        $filePath.off('keyup.shortcut');
    };

    Shortcuts.login = function() {
        if (xcLocalStorage.getItem("autoLogin") != null) {
            var num = Math.ceil(Math.random() * 1000);
            var name = xcLocalStorage.getItem("shortcutName") + num;
            var xcPass = xcLocalStorage.getItem("xcPass");
            $('#loginNameBox').val(name);
            $('#loginPasswordBox').val(xcPass);
            if (xcPass) {
                $('#loginButton').click();
            }
        }
    };

    Shortcuts.createWorkbook = function() {
        var deferred = jQuery.Deferred();
        var count = 0;
        var wbInterval = setInterval(function() {
            if ($('#workbookPanel').is(':visible')) {
                var num = Math.ceil(Math.random() * 1000);
                var wbName = "WB" + num;
                $('.newWorkbookBox input').val(wbName);
                $('.newWorkbookBox button').click(); 
                clearInterval(wbInterval);

                activeWorkbook(wbName)
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                count++;
                if (count > 10) {
                    clearInterval(wbInterval);
                    deferred.reject();
                }
            }
        }, 300);

        return deferred.promise();
    };

    function activeWorkbook(wbName) {
        var deferred = jQuery.Deferred();
        var count = 0;
        var wbInterval = setInterval(function() {
            var $wkbkBox = $('.workbookBox[data-workbook-id*="' + wbName + '"]');
            if ($wkbkBox.length > 0) {
                clearInterval(wbInterval);
                $wkbkBox.find('.activate').click();
                deferred.resolve(wbName);
            } else {
                count++;
                if (count > 10) {
                    clearInterval(wbInterval);
                    deferred.reject();
                }
            }
        }, 300);

        return deferred.promise();
    }

        // to add file names to the menu edit this object
    var filePathMap = {
        'YelpUsers': 'netstore/datasets/yelp/user',
        'Schedule': 'netstore/datasets/indexJoin/schedule',
        'Test Yelp': 'netstore/datasets/unittest/test_yelp.json'
    };

    function dsForm() {
        var $filePath = $("#filePath");
        var $fileName = $("#fileName");
        var protocol = FileProtocol.nfs;
        var filePath = "";
        $filePath.on('keyup.shortcut', function() {
            var val = $(this).val();
            var file = null;
            var filePathGiven = false;
            if (val.length === 2) {
                filePathGiven = false;
                switch (val) {
                    case ("za"):
                        file = "yelpUsers";
                        filePath = "yelp/user/";
                        break;
                    case ("zb"):
                        file = "yelpReviews";
                        filePath = "yelp/reviews/";
                        break;
                    case ("zc"):
                        file = "gdelt";
                        filePath = "gdelt/";
                        break;
                    case ("zd"):
                        file = "sp500";
                        filePath = "sp500.csv";
                        break;
                    case ("ze"):
                        file = "classes";
                        filePath = "indexJoin/classes/";
                        break;
                    case ("zf"):
                        file = "schedule";
                        filePath = "indexJoin/schedule/";
                        break;
                    case ("zg"):
                        file = "students";
                        filePath = "indexJoin/students/";
                        break;
                    case ("zh"):
                        file = "teachers";
                        filePath = "indexJoin/teachers/";
                        break;
                    case ("zi"):
                        file = "jsonGen";
                        filePath = "var/temp/jsonGen/";
                        filePathGiven = true;
                        break;
                    default:
                        break;
                }

            } else {
                filePathGiven = true;
                switch (val) {
                    case ("unit"):
                        file = "unittest";
                        filePath = "netstore/datasets/unittest/" +
                                    "test_yelp.json";
                        break;
                    case ("net"):
                        file = "netstore";
                        filePath = "netstore/datasets/";
                        break;
                    case ("edge"):
                        file = "edgeCase";
                        filePath = "netstore/datasets/edgeCases/";
                        break;
                    case ("exp"):
                        file = "export";
                        filePath = "var/opt/xcalar/export/";
                        break;
                    case ("thousand"):
                        file = "thousand";
                        filePath = "netstore/datasets/edgeCases/manyFiles/tenThousand";
                        break;
                    case ("parse"):
                        file = "parse";
                        filePath = "netstore/datasets/dsParser/";
                        break;
                    default:
                        break;
                }
            }

            if (file) {
                var $formatDropdown = $("#fileFormatMenu");
                if (!filePathGiven) {
                    // filePath = 'var/tmp/' + filePath;
                    filePath = 'netstore/datasets/' + filePath;
                }

                $("#fileProtocol input").val(protocol);
                $filePath.val(filePath);

                $fileName.val(file + Math.ceil(Math.random() * 1000));

                // if (file === "sp500" || file === "gdelt") {
                //     $formatDropdown.find('li[name="CSV"]').click();
                // } else {
                //     $formatDropdown.find('li[name="JSON"]').click();
                // }

                // $fileName.focus();
                // if (filePathGiven) {
                //     $("#dsForm-path .browse").click();
                // }
            }
        });
    }

    function createMainMenu() {

        var menu =
        '<div id="shortcutMenu" class="menu" data-submenu="shortcutSubMenu">' +
            '<ul>' +
                '<li class="createTable parentMenu" data-submenu="createTable">' +
                    'Create Table ...</li>' +
                '<li class="tests parentMenu" data-submenu="tests">Tests ...</li>' +
                '<li class="globals parentMenu" data-submenu="globals">Global Flags ...</li>' +
                '<li class="archiveAllTables">Archive All Tables</li>' +
                '<li class="deleteAllTables">Delete All Tables</li>' +
                '<li class="autoLoginOff">Turn Off AutoLogin</li>' +
                '<li class="autoLoginOn">Turn On AutoLogin</li>' +
                '<li class="shortcutsOff">Turn Off Shortcuts</li>' +
            '</ul>' +
        '</div>';

        var subMenu = '<div id="shortcutSubMenu" class="menu subMenu">' +
                        '<ul class="createTable">';
        for (var fileName in filePathMap) {
            subMenu += '<li>' + fileName + '<span class="menuOption">no cols' +
                        '</span></li>';
        }
        subMenu += '</ul>' +
                    '<ul class="tests">' +
                        '<li class="testSuite">Test Suite</li>' +
                        '<li class="testSuite-clean">Test Suite(Clean)</li>' +
                        '<li class="unitTest">Unit Test</li>' +
                        '<li class="undoTest">Undo Test' +
                        '<span class="menuOption">FE</span>' + // front end test
                        '<span class="menuOption">BE</span>' + // back end test
                        '</li>' +
                    '</ul>' +
                    '<ul class="globals">' +
                        '<li class="joinKeyOff">Turn off gEnableJoinKeyCheck</li>' +
                        '<li class="joinKeyOn">Turn on gEnableJoinKeyCheck</li>' +
                        '<li class="verboseOff">Turn off verbose</li>' +
                        '<li class="verboseOn">Turn on verbose</li>' +
                        '<li class="adminOn">Turn on admin mode</li>' +
                        '<li class="adminOff">Turn off admin mode</li>' +
                        '<li class="debugOn">Turn on debug mode</li>' +
                        '<li class="debugOff">Turn off debug mode</li>' +
                    '</ul>' +
                '</div>';

        $('#container').append(menu);
        $('#container').append(subMenu);
        var html = '<div id="shortcutMenuIcon">' +
                        '<i class="icon fa-15 xi-down center"></i>' +
                    '</div>'
        $('#dfgPanelSwitch').before(html);

        addMenuBehaviors($('#shortcutMenu'));
        addMenuActions();

        $('#shortcutMenuIcon').click(function(){
            xcHelper.dropdownOpen($(this), $('#shortcutMenu'), {
                "floating": true
            });
        });

        toggleAutoLoginMenu(autoLogin);
    }

    function addMenuActions() {
        var $menu = $('#shortcutMenu');
        var $subMenu = $('#shortcutSubMenu');

        $menu.on('mouseup', '.archiveAllTables', function() {
            archiveAllTables();
        });

        $menu.on('mouseup', '.deleteAllTables', function() {
            deleteAllTables();
        });

        $menu.on('mouseup', '.shortcutsOff', function() {
            Shortcuts.off();
        });

        $menu.on('mouseup', '.autoLoginOff', function() {
            Shortcuts.toggleAutoLogin();
        });

        $menu.on('mouseup', '.autoLoginOn', function() {
            Shortcuts.toggleAutoLogin(true);
        });

        $subMenu.on('mouseup', '.verboseOff', function() {
            Shortcuts.toggleVerbose();
        });

        $subMenu.on('mouseup', '.verboseOn', function() {
            Shortcuts.toggleVerbose(true);
        });

        $subMenu.on('mouseup', '.debugOff', function() {
            Shortcuts.toggleDebug();
        });

        $subMenu.on('mouseup', '.debugOn', function() {
            Shortcuts.toggleDebug(true);
        });

        $subMenu.on('mouseup', '.adminOff', function() {
            Shortcuts.toggleAdmin();
        });

        $subMenu.on('mouseup', '.adminOn', function() {
            Shortcuts.toggleAdmin(true);
        });

        $subMenu.on('mouseup', '.joinKeyOff', function() {
            Shortcuts.toggleJoinKey();
        });

        $subMenu.on('mouseup', '.joinKeyOn', function() {
            Shortcuts.toggleJoinKey(true);
        });


        $subMenu.on('mouseup', '.createTable li', function(event) {
            var noCols = false;
            if ($(event.target).hasClass('menuOption')) {
                noCols = true;
            }
            var fileName = $(this).text();
            fileName = fileName.slice(0, fileName.length - 7); // - no cols text
            secretAddTable(fileName, noCols);
        });

        $subMenu.on('mouseup', '.tests li', function(event) {
            var testName = $(this).text();

            var option;
            if ($(event.target).hasClass('menuOption')) {
                option = $(event.target).text();
            }
            if (testName === "Undo TestFEBE") {
                testName = "Undo Test";
            }
            startTest(testName, option);
        });
    }

    function toggleAutoLoginMenu(turnOn) {
        if (turnOn) {
            $('#shortcutMenu').find('.autoLoginOff').show();
            $('#shortcutMenu').find('.autoLoginOn').hide();
        } else {
            $('#shortcutMenu').find('.autoLoginOff').hide();
            $('#shortcutMenu').find('.autoLoginOn').show();
        }
    }

    function startTest(testName, option) {
        if (testName === "Test Suite") {
            TestSuite.run();
        } else if (testName === "Test Suite(Clean)") {
            TestSuite.run(false, true);
        } else if (testName === "Unit Test") {
            TestSuite.unitTest();
        } else if (testName === "Undo Test") {
            var type = "worksheet";
            if (option) {
                if (option === "FE") {
                    type = "frontEnd";
                } else if (option === "BE") {
                    type = "tableOps";
                }
            }
            UndoRedoTest.run(type);
        }
    }

    function secretAddTable(name, noCols) {
        name = name.trim();
        var dsIcon;
        var dsName;
        var exists = $('#dsListSection .gridItems')
                    .find('[data-dsname*="'+ name + '"]').length;
        if (exists) {
            dsIcon = '#dsListSection .gridItems ' +
                 '[data-dsname*="' + name + '"]:eq(0)';
        } else {
            dsName = name.replace(/\s+/g, "") + Math.floor(Math.random() * 10000);
            var $formatDropdown = $("#fileFormatMenu");
            var filePath = filePathMap[name];
            $("#fileProtocol input").val(FileProtocol.nfs);
            $("#filePath").val(filePath);
            $("#dsForm-path").find('.confirm').click(); // go to next step
            $formatDropdown.find('li[name="JSON"]').click();
            $('#dsForm-dsName').val(dsName);

            $('#dsForm-preview').find('.confirm').last().click();
            dsIcon = ".ds.grid-unit[data-dsname='" + dsName + "']:not(.inactive)";
        }
        checkExists(dsIcon)
        .then(function() {
            $(dsIcon).click();
            setTimeout(function() {
                if (noCols) {
                    $('#noDScols').click();
                } else {
                    $("#selectDSCols").click();
                }

                setTimeout(function() { // there's some delay in populating
                    // the datacart list
                    var $activeTab = $('#topMenuBarTabs')
                                        .find('.topMenuBarTab.active');
                    var isDiffTab;
                    if ($activeTab.attr('id') !== "dataStoresTab") {
                        // switch to datastores panel
                        $('#dataStoresTab').click();
                        isDiffTab = true;
                    }
                    if  (!$('#inButton').hasClass('active')) {
                        $('#inButton').click();
                    }
                    $("#dataCart-submit").click();
                    if (isDiffTab) {
                        $activeTab.click(); // go back to previous tab
                    }
                }, 1);
            }, 400);
        });
    }

    function deleteAllTables() {
        var tableIds = [];
        for (var table in gTables) {
            if (gTables[table].status === "active") {
                tableIds.push(gTables[table].tableId);
            }
        }
        if (tableIds.length) {
            TblManager.deleteTables(tableIds, TableType.Active);
        }
    }

    function archiveAllTables() {
        var tableIds = [];
        $('.xcTableWrap:not(.inActive)').each(function() {
            tableIds.push($(this).data('id'));
        });
        if (tableIds.length) {
            TblManager.archiveTables(tableIds);
        }
    }

    function checkExists(elemSelectors, timeLimit, options) {
        var deferred = jQuery.Deferred();
        var intervalTime = 100;
        var timeLimit = timeLimit || 10000;
        var timeElapsed = 0;
        options = options || {};
        var notExists = options.notExists; // if true, we're actualy doing a
        // check to make sure the element DOESN"T exist
        var optional = options.optional; // if true, existence of element is
        // optional and we return deferred.resolve regardless

        if (typeof elemSelectors === "string") {
            elemSelectors = [elemSelectors];
        }

        var caller = checkExists.caller.name;

        var interval = setInterval(function() {
            var numItems = elemSelectors.length;
            var allElemsPresent = true;
            var $elem;
            for (var i = 0; i < numItems; i++) {
                $elem = $(elemSelectors[i]);
                if (options.notExist) {
                    if ($elem.length !== 0) {
                        allElemsPresent = false;
                        break;
                    }
                } else if ($elem.length === 0) {
                    allElemsPresent = false;
                    break;
                }
            }
            if (allElemsPresent) {
                clearInterval(interval);
                deferred.resolve(true);
            } else if (timeElapsed >= timeLimit) {
                var error = "time limit of " + timeLimit +
                            "ms exceeded in function: " + caller;
                clearInterval(interval);
                if (!optional) {
                    console.log(elemSelectors, options);
                    console.warn(error);
                    deferred.reject(error);
                } else {
                    deferred.resolve();
                }
            }
            timeElapsed += intervalTime;
        }, intervalTime);

        return (deferred.promise());
    }

// var orderint = setInterval(function() {
//     for (var table in gTables) {
//         if (gTables[table].ordering === 11) {
//             console.log('wrong ordering');
//             debugger;
//             clearInterval(orderint);
//         }
//     }
// }, 2000);


return (Shortcuts);

}(jQuery, {}));

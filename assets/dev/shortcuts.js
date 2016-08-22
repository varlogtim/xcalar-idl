if (localStorage.shortcuts) {
    $(document).ready(function() {
        if (window.location.pathname.indexOf('login.html') > -1) {
            Shortcuts.login();
        } else {
            Shortcuts.createWorkbook();

            var count = 0;
            var interval = setInterval(function() {
                // initial load screen leaving signifies start up is done
                if ($("#initialLoadScreen:visible").length === 0) {
                    Shortcuts.setup();
                    clearInterval(interval);
                } else if (count > 20) {
                    clearInterval(interval);
                    console.info('timed out: short cuts not added');
                }
                count++;
            }, 500);
        }
    });
}

window.Shortcuts = (function($, Shortcuts) {
    var shortcutsOn = false;
    var autoLogin = true;
    Shortcuts.on = function(name, pass) {
        if (shortcutsOn) {
            return false;
        }
        localStorage.shortcuts = true;
        if (!name) {
            name = "user";
        }
        localStorage.shortcutName = name;
        localStorage.xcPass = pass;
        localStorage.autoLogin = true;
        Shortcuts.setup();
    };

    Shortcuts.off = function() {
        localStorage.removeItem('shortcuts');
        localStorage.removeItem('shortcutName');
        localStorage.removeItem('xcPass');
        localStorage.removeItem('autoLogin');
        Shortcuts.remove();
        shortcutsOn = false;
    };

    Shortcuts.toggleAutoLogin = function(turnOn) {
        if (turnOn) {
            localStorage.autoLogin = true;
            autoLogin = true;
        } else {
            localStorage.autoLogin = false; 
            autoLogin = false;
        }
        toggleAutoLoginMenu(turnOn);
    };


    Shortcuts.setup = function() {
        shortcutsOn = true;

        if (localStorage.autoLogin) {
            autoLogin = JSON.parse(localStorage.autoLogin);
        } else {
            autoLogin = true;
            localStorage.autoLogin = true;
        }
        
        dsForm();
        mainMenu();
    };

    Shortcuts.remove = function () {
        $('#shortcutMenuIcon').remove();
        $('#shortcutMenu').remove();
        $('#shortcutSubMenu').remove();
        var $filePath = $("#filePath");
        $filePath.off('keyup.shortcut');
    };

    Shortcuts.login = function() {
        if (!localStorage.autoLogin || JSON.parse(localStorage.autoLogin)) {
            var num = Math.ceil(Math.random() * 1000);
            var name = localStorage.shortcutName + num;
            var xcPass = localStorage.xcPass;
            $('#loginNameBox').val(name);
            $('#loginPasswordBox').val(xcPass);
            if (xcPass) {
                $('#loginButton').click();
            }
        }
    };

    Shortcuts.createWorkbook = function() {
        if (!localStorage.autoLogin || JSON.parse(localStorage.autoLogin)) {
            var count = 0;
            var wbInterval = setInterval(function() {
                if ($('#workbookModal').is(':visible')) {
                    var num = Math.ceil(Math.random() * 1000);
                    var wbName = "WB" + num;
                    $('#workbookInput').val(wbName);
                    $('#workbookModal').find('.confirm').click();
                    clearInterval(wbInterval);
                } else {
                    count++;
                    if (count > 10) {
                        clearInterval(wbInterval);
                    }
                }
            }, 300);
        }
    };

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
                        filePath = "netstore/qa/crashes/bug4293/Datasets/Tb/1K/";
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
        // random format only in dev mode
        $("#fileFormatMenu").find("ul").append('<li name="RANDOM">Random</li>');
    }

    function mainMenu() {

        var menu =
        '<div id="shortcutMenu" class="menu" data-submenu="shortcutSubMenu">' +
            '<ul>' +
                '<li class="createTable parentMenu" data-submenu="createTable">' +
                    'Create Table ...</li>' +
                '<li class="tests parentMenu" data-submenu="tests">Tests ...</li>' +
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
                        '<li class="unitTest">Unit Test</li>' +
                        '<li class="undoTest">Undo Test' +
                        '<span class="menuOption">FE</span>' + // front end test
                        '<span class="menuOption">BE</span>' + // back end test
                        '</li>' +
                    '</ul>' +
                '</div>';

        $('#container').append(menu);
        $('#container').append(subMenu);
        $('#dfgPanelSwitch').before('<div id="shortcutMenuIcon"></div>');

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

        $subMenu.on('mouseup', '.createTable li', function(event) {
            var noCols = false;
            if ($(event.target).hasClass('menuOption')) {
                noCols = true;
            }
            var fileName = $(this).text();
            fileName = fileName.slice(0, fileName.length - 7); // - no cols text
            secretAddTable(fileName, noCols);
        });

        $subMenu.on('mouseup', '.tests li', function() {
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

            $("#filePath").val(filePath);
            $("#dsForm-path").find('.confirm').click(); // go to next step
            $formatDropdown.find('li[name="JSON"]').click();
            $('#dsForm-dsName').val(dsName);

            $('#dsForm-preview').find('.confirm').click();
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









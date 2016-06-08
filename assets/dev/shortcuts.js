if (localStorage.shortcuts) {
    $(document).ready(function() {
        if (window.location.pathname.indexOf('login.html') > -1) {
            Shortcuts.login();
        }

        if (window.location.pathname.indexOf('index.html') > -1) {
            Shortcuts.createWorkbook();

            var count = 0;
            var interval = setInterval(function() {
                // initial load screen leaving signifies start up is done
                if ($("#initialLoadScreen").length === 0) {
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
        Shortcuts.setup();
    };

    Shortcuts.off = function() {
        localStorage.removeItem('shortcuts');
        localStorage.removeItem('shortcutName');
        localStorage.removeItem('xcPass');
        Shortcuts.remove();
        shortcutsOn = false;
    };


    Shortcuts.setup = function() {
        shortcutsOn = true;
        datastoreForm();
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
        var num = Math.ceil(Math.random() * 1000);
        var name = localStorage.shortcutName + num;
        var xcPass = localStorage.xcPass;
        $('#loginNameBox').val(name);
        $('#loginPasswordBox').val(xcPass);
        if (xcPass) {
            $('#loginButton').click();
        }
    };

    Shortcuts.createWorkbook = function() {
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
    };

        // to add file names to the menu edit this object
    var filePathMap = {
        'YelpUsers': 'file:///var/tmp/yelp/user',
        'Schedule': 'file:///var/tmp/qa/indexJoin/schedule',
        'Test Yelp': 'file:///netstore/datasets/unittest/test_yelp.json'
    };

    function datastoreForm() {
        var $filePath = $("#filePath");
        var $fileName = $("#fileName");
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
                        filePath = "yelp/user";
                        break;
                    case ("zb"):
                        file = "yelpReviews";
                        filePath = "yelp/reviews";
                        break;
                    case ("zc"):
                        file = "gdelt";
                        filePath = "gdelt";
                        break;
                    case ("zd"):
                        file = "sp500";
                        filePath = "sp500";
                        break;
                    case ("ze"):
                        file = "classes";
                        filePath = "qa/indexJoin/classes";
                        break;
                    case ("zf"):
                        file = "schedule";
                        filePath = "qa/indexJoin/schedule";
                        break;
                    case ("zg"):
                        file = "students";
                        filePath = "qa/indexJoin/students";
                        break;
                    case ("zh"):
                        file = "teachers";
                        filePath = "qa/indexJoin/teachers";
                        break;
                    case ("zi"):
                        file = "jsonGen";
                        filePath = "jsonGen";
                        break;
                    default:
                        break;
                }

            } else {
                filePathGiven = true;
                switch (val) {
                    case ("unit"):
                        file = "unittest";
                        filePath = "file:///netstore/datasets/unittest/" +
                                    "test_yelp.json";
                        break;
                    case ("net"):
                        file = "netstore";
                        filePath = "file:///netstore/datasets/";
                        break;
                    case ("edge"):
                        file = "edgeCase";
                        filePath = "file:///netstore/datasets/edgeCases/";
                        break;
                    case ("exp"):
                        file = "export";
                        filePath = "file:///var/opt/xcalar/export/";
                        break;
                    default:
                        break;
                }
            }

            if (file) {
                var $formatDropdown = $("#fileFormatMenu");
                if (!filePathGiven) {
                    filePath = 'file:///var/tmp/' + filePath;
                }

                $filePath.val(filePath);

                $fileName.val(file + Math.ceil(Math.random() * 1000));

                if (file === "sp500" || file === "gdelt") {
                    $formatDropdown.find('li[name="CSV"]').click();
                } else {
                    $formatDropdown.find('li[name="JSON"]').click();
                }

                $fileName.focus();
                if (filePathGiven) {
                    $('#fileBrowserBtn').click();
                }
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
                '<li class="deleteAllTables">Delete All Tables</li>' +
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
        $('#userNameArea').prepend('<div id="shortcutMenuIcon"></div>');

        addMenuBehaviors($('#shortcutMenu'));
        addMenuActions();

        $('#shortcutMenuIcon').click(function(){
            xcHelper.dropdownOpen($(this), $('#shortcutMenu'));
        });
    }

    function addMenuActions() {
        var $menu = $('#shortcutMenu');
        var $subMenu = $('#shortcutSubMenu');

        $menu.on('mouseup', '.deleteAllTables', function() {
            deleteAllTables();
        });

        $menu.on('mouseup', '.shortcutsOff', function() {
            Shortcuts.off();
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
        var ds1Icon;
        var dsName1;
        var exists = $('#exploreView .gridItems')
                    .find('[data-dsname*="'+ name + '"]').length;
        if (exists) {
            ds1Icon = '#exploreView .gridItems ' +
                 '[data-dsname*="' + name + '"]:eq(0)';
        } else {
            dsName1 = name.replace(/\s+/g, "") + Math.floor(Math.random() * 10000);
            var $formatDropdown = $("#fileFormatMenu");
            var filePath = filePathMap[name];

            $("#filePath").val(filePath);
            $formatDropdown.find('li[name="JSON"]').click();
            $('#fileName').val(dsName1);
            $("#importDataSubmit").click();
            ds1Icon = ".ds.grid-unit[data-dsname='" + dsName1 + "']:not(.inactive)";
        }

        checkExists(ds1Icon)
        .then(function() {
            $(ds1Icon).click();
            setTimeout(function() {
                if (noCols) {
                    $('#noDScols').click();
                } else {
                    $("#selectDSCols .icon").click();
                }

                setTimeout(function() {
                    $("#submitDSTablesBtn").click();
                }, 400);
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


return (Shortcuts);

}(jQuery, {}));









window.FileBrowser = (function($, FileBrowser) {
    var $fileBrowser;     // $("#fileBrowserModal")
    var $container;       // $("#fileBrowserContainer")
    var $innerContainer;  // $("#innerFileBrowserContainer")
    var $fileBrowserMain; // $("#fileBrowserMain")
    var $fileName;        // $("#fileBrowserInputName")

    var $formatSection;   // $("#fileBrowserFormat")

    var $pathSection;     // $("#fileBrowserPath")
    var $pathLists;       // $("#fileBrowserPathMenu")
    var $pathText;        // $pathSection.find(".text")
    var $visibleFiles;   // will hold nonhidden files

    var fileBrowserId;

    /* Contants */
    var defaultSortKey  = "type"; // default is sort by type;
    var formatMap = {
        "JSON": "JSON",
        "CSV" : "CSV",
        "XLSX": "Excel"
    };
    var dsIconHeight = 72;
    var dsIconWidth = 59;
    var dsListHeight = 30;
    var lowerFileLimit = 800; // when we start hiding files
    var upperFileLimit = 110000; // show error if over 110K
    var sortFileLimit = 25000; // do not allow sort if over 25k
    var oldBrowserError = "Deferred From Old Browser";
    /* End Of Contants */

    var defaultPath = FileProtocol.file;
    var historyPath;
    var curFiles = [];
    var allFiles = [];
    var sortKey  = defaultSortKey;
    var sortRegEx;
    var reverseSort = false;


    var modalHelper;

    FileBrowser.setup = function() {
        $fileBrowser = $("#fileBrowserModal");
        $container = $("#fileBrowserContainer");
        $innerContainer = $("#innerFileBrowserContainer");
        $fileBrowserMain = $("#fileBrowserMain");
        $fileName = $("#fileBrowserInputName");
        $formatSection = $("#fileBrowserFormat");
        $pathSection = $("#fileBrowserPath");
        $pathLists = $("#fileBrowserPathMenu");
        $pathText = $pathSection.find(".text");
        $visibleFiles = $();
        if (!window.isBrowseChrome) {
            lowerFileLimit = 600;
            upperFileLimit = 1200;
            $fileBrowser.addClass('notChrome');
        }

        var minWidth  = 600;
        var minHeight = 400;

        modalHelper = new ModalHelper($fileBrowser, {
            "minHeight": minHeight,
            "minWidth" : minWidth
        });

        var resizeTimer;
        $fileBrowser.resizable({
            "handles"    : "n, e, s, w, se",
            "minHeight"  : minHeight,
            "minWidth"   : minWidth,
            "containment": "document",
            "resize"     : function() {
                if (window.isBrowseChrome) {
                    $innerContainer.height(getScrollHeight());
                    if (curFiles.length > lowerFileLimit &&
                        curFiles.length <= upperFileLimit) {
                        clearTimeout(resizeTimer);
                        resizeTimer = setTimeout(showScrolledFiles, 30);
                    }
                }
            }
        });


        $fileBrowser.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        // click blank space to remove foucse on folder/dsds
        $fileBrowser.on("click", function() {
            clear();
        });

        $("#fileBrowserRecur").click(function() {
            var $checkBox = $(this).find(".checkbox");
            if ($checkBox.hasClass("checked")) {
                console.log('uncheck');
                $checkBox.removeClass("checked");
            } else {
                console.log('check');
                $checkBox.addClass("checked");
            }
        });

        $container.on({
            "click": function(event) {
                // click to focus
                var $grid = $(this);

                event.stopPropagation();
                clear();

                updateFileName($grid);
                $grid.addClass("active");
            },
            "dblclick": function() {
                var $grid = $(this);

                if ($grid.hasClass("ds")) {
                    // dblclick a dataset to import
                    importDataset($grid);
                } else {
                    // dblclick a folder
                    var path = getCurrentPath() + getGridUnitName($grid) + '/';

                    listFiles(path)
                    .then(function() {
                        appendPath(path);
                        checkIfCanGoUp();
                    })
                    .fail(function(error) {
                        if (error.error !== oldBrowserError) {
                            Alert.error(ThriftTStr.ListFileErr, error);
                        }
                    });
                }
            }
        }, ".grid-unit");

        var $targetContainer = $fileBrowser.find(".targetContainer");
        $targetContainer.on("click", ".grid-unit", function(event) {
            event.stopPropagation();
            $targetContainer.find(".grid-unit.active").removeClass("active");
            $(this).addClass("active");
            console.log("acttve");
            // XXX to do, add function to switch target
            // when backend is ready
        });

        // confirm to open a ds
        $fileBrowser.on("click", ".confirm", function() {
            var $grid = $container.find(".grid-unit.active");
            importDataset($grid);
            return false;
        });

        // close file browser
        $fileBrowser.on("click", ".close, .cancel", function() {
            closeAll();
        });

        $("#fileBrowserRefresh").click(function(event){
            // the first option in pathLists
            var $curPath = $pathLists.find("li").eq(0);
            xcHelper.showRefreshIcon($fileBrowserMain);
            event.stopPropagation();
            goToPath($curPath);
        });

        // Up to parent folder
        $("#fileBrowserUp").click(function(event){
            event.stopPropagation();
            goUpPath();
        });

        // toggle between listview and gridview
        $("#fileBrowserGridView").click(function(event){
            event.stopPropagation();
            toggleView();
        });

        // restore list view if saved
        var preference = UserSettings.getPreference();
        if (preference.browserListView) {
            toggleView(true, true);
        }

        // click on title to sort
        $fileBrowserMain.on("click", ".title", function(event) {
            var $title = $(this);

            event.stopPropagation();
            if ($fileBrowser.hasClass('unsortable')) {
                return;
            }
            // click on selected title, reverse sort
            if ($title.hasClass("select")) {
                reverseFiles();
            } else {
                sortAction($title, false);
            }
        });

        // toggle sort menu, should use mousedown for toggle
        var $sortSection = $("#fileBrowserSort");
        $sortSection.on({
            "mousedown": function(event){
                event.stopPropagation();
                if ($fileBrowser.hasClass('unsortable')) {
                    return;
                }
                $("#fileBrowserSortMenu").toggle();
            },
            // prevent clear event to be trigger
            "click": function(event) {
                event.stopPropagation();
            }
        }, ".icon, .dropdownBox");

        $sortSection[0].oncontextmenu = function(event) {
            event.preventDefault();
        };

        // click sort option to sort
        $sortSection.on("click", "li", function(event) {
            var $li = $(this);

            event.stopPropagation();
            $("#fileBrowserSortMenu").hide();
            // already sort
            if (!$li.hasClass("select")) {
                sortAction($li, true);
            }
        });

        var pathList = new MenuHelper($pathSection, {
            "onlyClickIcon": true,
            "onSelect"     : goToPath,
            "container"    : "#fileBrowserModal"
        });
        pathList.setupListeners();

        var timer;
        $pathSection.on({
            "keyup": function(event) {
                // assume what inputed should be a path
                clearTimeout(timer);

                var key = event.which;
                if (key === keyCode.Up || key === keyCode.Down ||
                    key === keyCode.Left || key === keyCode.Right)
                {
                    return true;
                }

                var path = defaultPath + $(this).val();

                if (key === keyCode.Enter) {
                    var $grid = $container.find('.grid-unit.active');
                    if ($grid.length > 0) {
                        // this is the case that user input file:///var/tmp,
                        // it focus on tmp and then press enter
                        $grid.trigger("dblclick");
                    }
                    return false;
                }

                timer = setTimeout(function() {
                    // if (path.charAt(path.length - 1) !== "/") {
                    //     path += "/";
                    // }

                    if (path === getCurrentPath()) {
                        // when the input path is still equal to current path
                        // do not retrievePath
                        return;
                    }

                    retrievePaths(path, true);
                }, 400);

                return false;
            }
        }, ".text");

        var formatList = new MenuHelper($formatSection, {
            "onSelect" : formatSectionHandler,
            "container": "#fileBrowserModal"
        });
        formatList.setupListeners();

        $fileName.keyup(function(event) {
            var key = event.which;
            if (key === keyCode.Up || key === keyCode.Down ||
                key === keyCode.Left || key === keyCode.Right)
            {
                return;
            }
            var text = $(this).val();
            // when type on the input, pass int noEdit == true
            // otherwise, updaetFileName() will change the cursor position
            focusOn(text, true, true);
        });

        $fileName.click(function() {
            return false;
        });

        fileBrowserScrolling();

    };

    function fileBrowserScrolling() {
        var scrollTimer;
        $container.scroll(function() {
            if ($(this).hasClass('noScrolling') || !window.isBrowseChrome ||
                (curFiles.length <= lowerFileLimit ||
                curFiles.length > upperFileLimit)) {
                return;
            }

            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(turnOffScrollingFlag, 100);
        });

        function turnOffScrollingFlag() {
            showScrolledFiles();
        }
    }
    function showScrolledFiles() {

        $innerContainer.height(getScrollHeight());
        var scrollTop = $container.scrollTop();
        var rowNum;
        var startIndex;
        var endIndex;
        var visibleRowsBelow;
        var visibleRowsAbove;
        var numVisibleRows;
        if ($fileBrowserMain.hasClass('gridView')) {
            visibleRowsBelow = 5; // number of rows that have display:block
            visibleRowsAbove = 7;
            rowNum = Math.floor(scrollTop / dsIconHeight) - visibleRowsBelow;

            var filesPerRow = getFilesPerRow();
            var filesBelow = rowNum * filesPerRow;

            numVisibleRows = Math.ceil($container.height() / dsIconHeight);

            startIndex = Math.max(0, filesBelow);
            endIndex = startIndex + (filesPerRow *
                    (numVisibleRows + visibleRowsBelow + visibleRowsAbove));
            $container.find('.sizer').show().height(rowNum * dsIconHeight);
        } else {
            visibleRowsBelow = 20;
            visibleRowsAbove = 25;
            rowNum = Math.floor(scrollTop / dsListHeight) - visibleRowsBelow;
            numVisibleRows = Math.ceil($container.height() / dsListHeight);
            startIndex = Math.max(0, rowNum);
            endIndex = startIndex + numVisibleRows + visibleRowsBelow +
                            visibleRowsAbove;
            $container.find('.sizer').show().height(rowNum * dsListHeight);
        }

        $visibleFiles.removeClass('visible');
        $visibleFiles = $container.find('.grid-unit')
                                  .slice(startIndex, endIndex)
                                  .addClass('visible');
        $container.scrollTop(scrollTop);
    }

    function getFilesPerRow() {
        var scrollBarWidth = 11;
        return (Math.floor(($('#fileBrowserContainer').width() -
                            scrollBarWidth) / dsIconWidth));
    }
    function getScrollHeight() {
        var rowHeight = dsIconHeight;
        var scrollHeight;
        if ($fileBrowserMain.hasClass('listView')) {
            rowHeight = dsListHeight;
            scrollHeight = Math.max(rowHeight *
                                    $container.find('.grid-unit').length,
                                    $container.height() - 10);
        } else {
            var iconsPerRow = getFilesPerRow();
            var rows = Math.ceil($container.find('.grid-unit').length /
                                iconsPerRow);
            scrollHeight = rows * dsIconHeight + 20;
            // don't know why the wrapper adds 20px in height; (line-height)
            scrollHeight = Math.max(scrollHeight + 3, $container.height() - 10);
        }

        return (scrollHeight + 3); // off by 3 pixels otherwise ¯\_(ツ)_/¯
    }

    FileBrowser.show = function(protocol, path) {
        var deferred = jQuery.Deferred();

        addKeyBoardEvent();
        fileBrowserId = xcHelper.randName("browser");

        modalHelper.setup();

        if (protocol == null) {
            // this is an error case
            console.error("No protocol!!");
            protocol = FileProtocol.file;
        }

        protocol = changeProtocol(protocol);
        path = getPathWithProtocol(protocol, path);

        retrievePaths(path)
        .then(function() {
            measureDSIconHeight();
            deferred.resolve();
        })
        .fail(function(error) {
            if (error.error === oldBrowserError) {
                // when it's an old deferred
                return;
            } else if (error.status === StatusT.StatusIO) {
                loadFailHandler(error, path);
                deferred.reject(error);
            } else if (path === defaultPath) {
                loadFailHandler(error, path);
                deferred.reject(error);
            } else {
                retrievePaths(defaultPath)
                .then(function() {
                    redirectHandler(path);
                    deferred.resolve();
                })
                .fail(function(innerError) {
                    if (innerError.error !== oldBrowserError) {
                        loadFailHandler(innerError, path);
                    }
                    deferred.reject(innerError);
                });
            }
        });

        return deferred.promise();
    };

    function toggleView(toListView, noRefreshTooltip) {
        var $btn = $("#fileBrowserGridView");
        if (toListView == null) {
            // if current is gridView, change to listView;
            toListView = $fileBrowserMain.hasClass("gridView");
        }

        if (toListView) {
            $fileBrowserMain.removeClass("gridView").addClass("listView");
        } else {
            // change to grid view
            $fileBrowserMain.removeClass("listView").addClass("gridView");
            measureDSIconHeight();
        }

        xcHelper.toggleListGridBtn($btn, toListView, noRefreshTooltip);
        $innerContainer.height(getScrollHeight());
        centerUnitIfHighlighted(toListView);
        refreshEllipsis();
    }

    // centers a grid-unit if it is highlighted
    function centerUnitIfHighlighted(isListView) {
        var unitHeight = isListView ? dsListHeight : dsIconHeight;
        var $unit = $container.find('.grid-unit.active');
        if ($unit.length) {
            var containerHeight = $container.height();
            if ($container.hasClass('manyFiles')) {
                var index = $unit.index() - 1; // $('.sizer') is at 0 index
                var filesPerRow;
                if (isListView) {
                    filesPerRow = 1;
                } else {
                    filesPerRow = getFilesPerRow();
                }
                var row = Math.floor(index / filesPerRow);
                $container.addClass('noScrolling');
                $container.scrollTop(row * unitHeight - (containerHeight / 2));
                showScrolledFiles();
                // browser's auto scrolling will be triggered here but will
                // return when it finds that $container has class noscrolling;
                setTimeout(function() {
                    $container.removeClass('noScrolling');
                });
            } else {
                var unitOffSetTop = $unit.position().top;
                var scrollTop = $container.scrollTop();
                $container.scrollTop(scrollTop + unitOffSetTop -
                                    (containerHeight - unitHeight) / 2);
            }
        }
    }

    function getCurrentPath() {
        return ($pathLists.find("li:first-of-type").text());
    }

    function getShortPath(path) {
        // for example: file:///var/ will return var/
        return path.split(defaultPath)[1];
    }

    function getGridUnitName($grid) {
        // edge case: null should be "null"
        return String($grid.find('.label').data("name"));
    }

    function getFormat(name) {
        var index = name.lastIndexOf(".");

        if (index < 0) {
            return null;
        }

        var ext = name.substring(index + 1, name.length).toUpperCase();

        if (formatMap.hasOwnProperty(ext)) {
            return (formatMap[ext]);
        } else {
            return null;
        }
    }

    function getShortName(name) {
        var deferred = jQuery.Deferred();
        var index = name.lastIndexOf(".");
        // Also, we need to strip special characters. For now,
        // we only keeo a-zA-Z0-9. They can always add it back if they want

        if (index >= 0) {
            name = name.substring(0, index);
        }

        name = name.replace(/[^a-zA-Z0-9]/g, "");
        var originalName = name;
        var tries = 1;
        var validNameFound = false;
        while (!validNameFound && tries < 20) {
            if (DS.has(name)) {
                validNameFound = false;
            } else {
                validNameFound = true;
            }

            if (!validNameFound) {
                name = originalName + tries;
                tries++;
            }
        }

        if (!validNameFound) {
            while (DS.has(name) && tries < 100) {
                name = xcHelper.randName(name, 4);
                tries++;
            }
        }

        deferred.resolve(name);

        // Cheng: now the real ds name has a name space as prefix,
        // so datasets among different users will never have conflict
        // so it's fine to use font check only
        // XcalarGetDatasets()
        // .then(function(result) {
        //     var numDatasets = result.numDatasets;
        //     var datasets = result.datasets;
        //     var validNameFound = false;
        //     var dsName;
        //     var tries = 1;
        //     var takenNamesMap = {};
        //     for (var i = 0; i < numDatasets; i++) {
        //         dsName = datasets[i].name;
        //         takenNamesMap[dsName] = true;
        //     }
        //     while (!validNameFound && tries < 20) {
        //         if (takenNamesMap[name]) {
        //             validNameFound = false;
        //         } else {
        //             validNameFound = true;
        //         }

        //         if (!validNameFound) {
        //             tries++;
        //             name = originalName + tries;
        //         }
        //     }
        //     if (!validNameFound) {
        //         while (takenNamesMap[name] && tries < 100) {
        //             name = xcHelper.randName(name, 4);
        //             tries++;
        //         }
        //     }
        //     deferred.resolve(name);
        // })
        // .fail(function(error) {
        //     deferred.reject(error);
        // });

        return (deferred.promise());
    }

    function appendPath(path, noPathUpdate) {
        var shortPath = getShortPath(path);

        if (!noPathUpdate) {
            $pathText.val(shortPath);
        }

        $pathLists.prepend('<li>' + path + '</li>');
    }

    function clear(isALL) {
        var $dropDownLists = $fileBrowser.find(".dropDownList");

        $dropDownLists.removeClass("open")
                        .find(".list").hide();
        $fileName.val("");

        if (isALL) {
            $formatSection.find(".text").text("all");
            $("#fileBrowserUp").addClass("disabled");
            $pathText.val("");
            $pathLists.empty();
            // we clear $innerContainer html in callback in modalhelper.clear
            // for performance when there's 1000+ files
            $container.removeClass('manyFiles');
            $fileBrowser.removeClass('unsortable');
            $visibleFiles = $();
            curFiles = [];
            sortRegEx = undefined;

            // keep sort order, so comment out
            // $fileBrowser.find(".select").removeClass("select");
            // $formatSection.find(".text").text("all");
            // sortKey = defaultSortKey;
            // sortRegEx = undefined;
            // reverseSort = false;
        } else {
            $fileBrowser.find(".active").removeClass("active");
        }
    }

    function closeAll() {
        modalHelper.clear({afterClose: function() {
            // speedy clearing for 100,000 files
            document.getElementById("innerFileBrowserContainer").innerHTML = "";
        }});
        // set to deault value
        clear(true);
        $(document).off(".fileBrowser");
        $fileBrowser.removeClass("loadMode");
        fileBrowserId = null;
    }

    function redirectHandler(path) {
        setTimeout(function() {
            // do this because fadeIn has 300 dealy,
            // if statusBox show before the fadeIn finish, it will fail
            var error = xcHelper.replaceMsg(ErrWRepTStr.NoPath, {
                "path": path
            });
            StatusBox.show(error, $pathSection, false, {side: 'top'});
        }, 300);
    }

    function loadFailHandler(error, path) {
        $pathLists.empty();
        appendPath(path);

        var html = '<div class="error">' +
                    '<div>' + error.error + '</div>' +
                    '<div>' + DSTStr.DSSourceHint + '</div>';
        $innerContainer.html(html);
        $innerContainer.height(getScrollHeight());
        $container.removeClass('manyFiles');
        $fileBrowser.removeClass('unsortable');
    }

    function parsePath(path) {
        var paths = [];
        // parse path
        for (var i = path.length - 1; i >= (defaultPath.length - 1); i--) {
            // XXX Does not handle file paths with escaped slashes
            if (path.charAt(i) === "/") {
                paths.push(path.substring(0, i + 1));
            }
        }

        return paths;
    }

    function changeProtocol(protocol) {
        // for any edage case, use default file path
        var isValidProtocol = false;
        for (var key in FileProtocol) {
            if (protocol === FileProtocol[key]) {
                isValidProtocol = true;
                break;
            }
        }
        if (!isValidProtocol) {
            // for any edage case, use default file protocol
            console.warn("Unsupported file path extension? Defaulting to", FileProtocol.file);
            protocol = FileProtocol.file;
        }

        $pathSection.find(".defaultPath").text(protocol);
        defaultPath = protocol;

        return protocol;
    }

    function getPathWithProtocol(protocol, path) {
        if (!path) {
            if (historyPath && historyPath.startsWith(protocol)) {
                // when use the same protocol
                path = historyPath;
            } else {
                // when no history path or use new protocol
                path = protocol;
            }
        } else {
            path = protocol + path;
        }

        return path;
    }

    function updateFileName($grid) {
        var name = getGridUnitName($grid);
        $fileName.val(name);
    }

    function listFiles(path) {
        var deferred = jQuery.Deferred();
        var $loadSection = $fileBrowserMain.find(".loadingSection");
        var curBrowserId = fileBrowserId;

        $fileBrowser.addClass("loadMode");
        var timer = setTimeout(function() {
            $loadSection.show();
        }, 500);

        XcalarListFiles(path)
        .then(function(listFilesOutput) {
            if (curBrowserId === fileBrowserId) {
                clear();
                allFiles = listFilesOutput.files;
                sortFilesBy(sortKey, sortRegEx);
                deferred.resolve();
            } else {
                deferred.reject({"error": oldBrowserError});
            }
        })
        .fail(function(error) {
            if (curBrowserId === fileBrowserId) {
                deferred.reject(error);
            } else {
                deferred.reject({"error": oldBrowserError});
            }
        })
        .always(function() {
            if (curBrowserId === fileBrowserId) {
                $fileBrowser.removeClass("loadMode");
                clearTimeout(timer);
                $loadSection.hide();
            }
        });

        return deferred.promise();
    }

    function goIntoFolder() {
        var $grid = $container.find(".grid-unit.active");
        if ($grid.hasClass("folder")) {
            $grid.trigger("dblclick");
        }
    }

    function goUpPath() {
        // the second option in pathLists
        var $newPath = $pathLists.find("li").eq(1);
        goToPath($newPath);
    }

    function goToPath($newPath) {
        // for unit test, use promise
        var deferred = jQuery.Deferred();

        if ($newPath == null || $newPath.length === 0) {
            deferred.resolve();
            return deferred.promise();
        }
        var oldPath = getCurrentPath();
        var path = $newPath.text();

        listFiles(path)
        .then(function() {
            $pathText.val(getShortPath(path));
            $pathLists.find("li").removeClass("select");
            $newPath.addClass("select");
            // remove all previous siblings
            $newPath.prevAll().remove();

            // find the parent folder and focus on it
            var folder = oldPath.substring(path.length, oldPath.length);
            folder = folder.substring(0, folder.indexOf('/'));
            focusOn(folder);
            checkIfCanGoUp();
            deferred.resolve();
        })
        .fail(function(error) {
            if (error.error !== oldBrowserError) {
                Alert.error(ThriftTStr.ListFileErr, error);
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function checkIfCanGoUp() {
        if (getCurrentPath() === defaultPath) {
            $("#fileBrowserUp").addClass("disabled");
        } else {
            $("#fileBrowserUp").removeClass("disabled");
        }
    }

    function importDataset($ds) {
        var fileName = $fileName.val();

        if (($ds == null || $ds.length === 0) && fileName !== "") {
            StatusBox.show(ErrTStr.InvalidFileName, $fileName, true);
            return;
        }

        var $confirmBtn = $fileBrowser.find(".confirm");
        // in case the confirm is cliked multiple times
        xcHelper.disableSubmit($confirmBtn);
        // reset import data form
        $("#importDataReset").click();

        // load dataset
        var curDir = getCurrentPath();
        var ext = getFormat(fileName);

        historyPath = curDir;

        if (fileName === "" && curDir !== defaultPath) {
            // load the whole dataset

            // last char for curDir is "/"
            curDir = curDir.substring(0, curDir.length - 1);
            var slashIndex = curDir.lastIndexOf("/");
            fileName = curDir.substring(slashIndex + 1) + "/";
            curDir = curDir.substring(0, slashIndex + 1);
        }

        if (ext != null) {
            $('#fileFormatMenu li[name="' + ext.toUpperCase() + '"]').click();
        }

        var path = getShortPath(curDir + fileName);
        $("#filePath").val(path);
        getShortName(fileName)
        .then(function(shortName) {
            $("#fileName").val(shortName);
            xcHelper.enableSubmit($confirmBtn);
            closeAll();
        })
        .fail(function(error) {
            Alert.error(StatusMessageTStr.LoadFailed, error.error);
        });
    }

    function formatSectionHandler($li) {
        if ($li.hasClass('select')) {
            return;
        }

        var grid   = getFocusGrid();
        var format = $li.attr("name");
        var formatText = $li.text();
        var regEx;

        $formatSection.find('.text').text(formatText);
        $li.siblings(".select").removeClass("select");
        $li.addClass("select");

        if (format !== "all") {
            regEx = new RegExp('\.' + format + '$');
        }
        sortFilesBy(sortKey, regEx);
        focusOn(grid);
    }

    function sortAction($option, isFromSortOption) {
        var grid = getFocusGrid();
        var key  = $option.data("sortkey");

        $option.siblings(".select").removeClass("select");
        $option.addClass("select");

        reverseSort = false;
        sortFilesBy(key, sortRegEx);

        if (isFromSortOption) {
            $fileBrowserMain.find(".titleSection .title").each(function() {
                var $title = $(this);
                if ($title.data("sortkey") === key) {
                    $title.addClass("select");
                } else {
                    $title.removeClass("select");
                }
            });
        } else {
            // mark sort key on li
            $("#fileBrowserSortMenu").find("li").each(function() {
                var $li = $(this);

                if ($li.data("sortkey") === key) {
                    $li.addClass("select");
                } else {
                    $li.removeClass("select");
                }
            });
        }
        // focus on select grid
        focusOn(grid);
        centerUnitIfHighlighted($fileBrowserMain.hasClass('listView'));
    }

    function sortFilesBy(key, regEx) {
        if (allFiles.length > upperFileLimit) {
            oversizeHandler();
            return;
        }

        curFiles = allFiles;
        if (regEx) {
            sortRegEx = regEx;
            curFiles = filterFiles(curFiles, regEx);
        } else {
            sortRegEx = undefined; // default
        }

        if (key) {
            sortKey = key;
            curFiles = sortFiles(curFiles, key);
        } else {
            sortKey = "name"; // default
        }
        if (reverseSort) {
            curFiles.reverse();
        }
        getHTMLFromFiles(curFiles);
    }

    function oversizeHandler() {
        var html = '<div class="error">' +
                    '<div>' + 'Too many files in the folder, cannot read' + '</div>' +
                   '</div>';
        $innerContainer.html(html);
        $innerContainer.height(getScrollHeight());
        $container.removeClass('manyFiles');
        $fileBrowser.removeClass('unsortable');
    }

    function filterFiles(files, regEx) {
        var result = [];

        for (var i = 0, len = files.length; i < len; i++) {
            var fileObj = files[i];
            var name = fileObj.name;
            // not filter folder
            if (fileObj.attr.isDirectory || regEx.test(name) === true) {
                result.push(fileObj);
            }
        }
        return (result);
    }

    function sortFiles(files, key) {
        if (key === "size") {
            var folders = [];
            var datasets = [];

            files.forEach(function(file) {
                // folders sort by name
                if (file.attr.isDirectory) {
                    folders.push(file);
                } else {
                    datasets.push(file);
                }
            });

            // XXX this compare only work for english name
            // but fast enough
            // if want accurate sort, than do it and then
            // another localeCompare sort
            folders.sort(function(a, b) {
                return (a.name < b.name ? -1 : (a.name > b.name ? 1 : 0));
            });
            // folders.sort(function(a, b) {
            //     return (a.name.localeCompare(b.name));
            // });

            datasets.sort(function(a, b) {
                return (a.attr.size - b.attr.size);
            });

            files = folders.concat(datasets);
        } else if (key === "date") {
            // sort by mtime
            files.sort(function(a, b) {
                return (a.attr.mtime - b.attr.mtime);
            });
        } else {
            // not sort by size, first sort by name

            // XXX this compare only work for english name
            // but fast enough
            // if want accurate sort, than do it and then
            // another localeCompare sort
            files.sort(function(a, b) {
                return (a.name < b.name ? -1 : (a.name > b.name ? 1 : 0));
            });
            // files.sort(function(a, b) {
            //     return (a.name.localeCompare(b.name));
            // });
            if (key === "type") {
                // if it's sort by type, then need another sort
                var dirFile        = [];
                var fileWithoutExt = [];  // file with on extention
                var fileWithExt    = [];   // file with extention

                files.forEach(function(file) {
                    if (file.attr.isDirectory === true) {
                        dirFile.push(file);
                    } else {
                        if (name.indexOf(".") >= 0) {
                            fileWithExt.push(file);
                        } else {
                            fileWithoutExt.push(file);
                        }
                    }
                });

                files = dirFile.concat(fileWithoutExt)
                                .concat(fileWithExt);
            }
        }

        return files;
    }

    function reverseFiles() {
        var grid = getFocusGrid();

        reverseSort = !reverseSort;
        curFiles.reverse();
        getHTMLFromFiles(curFiles);
        focusOn(grid);
        centerUnitIfHighlighted($fileBrowserMain.hasClass('listView'));
    }

    function focusOn(grid, isAll, noEdit) {
        if (grid == null) {
            $fileName.val("");
            return;
        }

        var str;

        if (typeof grid === "string") {
            if (isAll) {
                str = '.grid-unit .label[data-name="' + grid + '"]';
            } else {
                str = '.grid-unit.folder .label[data-name="' + grid + '"]';
            }

            // if (!noEdit) {
            //     $fileName.val(grid);
            // }
        } else {
            var name = grid.name;
            var type = grid.type;

            if (type == null) {
                str = '.grid-unit' + ' .label[data-name="' + name + '"]';
            } else {
                str = '.grid-unit.' + type + ' .label[data-name="' + name + '"]';
            }

            // if (!noEdit) {
            //     $fileName.val(name);
            // }
        }

        $container.find(".grid-unit").removeClass("active");
        var $grid = $container.find(str).eq(0).closest('.grid-unit');
        if ($grid.length > 0) {
            $grid.addClass('active');
            if (!noEdit) {
                updateFileName($grid);
            }

            if ($fileBrowserMain.hasClass("listView")) {
                scrollIconIntoView($grid);
            } else {
                scrollIconIntoView($grid, true);
            }
        }
    }

    function getFocusGrid() {
        var $grid = $container.find('.grid-unit.active');
        var grid;

        if ($grid.length > 0) {
            grid = {
                "name": $grid.find(".label").data("name"),
                "type": $grid.hasClass("folder") ? "folder" : "ds"
            };
        }

        return (grid);
    }

    function retrievePaths(path, noPathUpdate) {
        var paths = parsePath(path);
        // cannot parse the path
        if (paths.length === 0) {
            return PromiseHelper.reject({"error": ErrTStr.InvalidFilePath});
        }

        var deferred = jQuery.Deferred();

        listFiles(paths[0])
        .then(function() {
            $pathLists.empty();

            for (var j = paths.length - 1; j >= 0; j--) {
                appendPath(paths[j], noPathUpdate);
            }
            // focus on the grid specified by path
            if (path) {
                var name = path.substring(path.lastIndexOf("/") + 1,
                                            path.length);
                focusOn({"name": name});
            }
            checkIfCanGoUp();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getHTMLFromFiles(files) {
        var html = "";
        if (window.isBrowseChrome) {
            html += '<div class="sizer"></div>';
            // used to keep file position when
            // files before it are hidden
        }

        for (var i = 0, len = files.length; i < len; i++) {
            // fileObj: {name, attr{isDirectory, size}}
            var fileObj = files[i];
            var isDirectory = fileObj.attr.isDirectory;
            var name = fileObj.name;
            var mtime = fileObj.attr.mtime; // in untix time

            if (isDirectory && (name === '.' || name === '..')) {
                continue;
            }

            var visibilityClass = " visible";
            if (len > lowerFileLimit && i > 200) {
                visibilityClass = "";
            }

            var gridClass = isDirectory ? "folder" : "ds";
            var size = isDirectory ? "" :
                        xcHelper.sizeTranslator(fileObj.attr.size);
            var date = xcHelper.timeStampTranslater(mtime) || "";

            html +=
                '<div title="' + name + '" class="' +
                    gridClass + visibilityClass + ' grid-unit">' +
                    '<div class="gridIcon"></div>' +
                    '<div class="listIcon">' +
                        '<span class="icon"></span>' +
                    '</div>' +
                    '<div class="label" data-name="' + name + '">' +
                        name +
                    '</div>' +
                    '<div class="fileDate">' + date + '</div>' +
                    '<div class="fileSize">' + size + '</div>' +
                '</div>';
        }

        // this is faster than $container.html
        document.getElementById('innerFileBrowserContainer').innerHTML = html;
        refreshEllipsis();

        if (window.isBrowseChrome) {
            if (len > lowerFileLimit) {
                $visibleFiles = $container.find('.visible');
                $container.addClass('manyFiles');
            } else {
                $visibleFiles = $();
                $container.removeClass('manyFiles');
            }

            $innerContainer.height(getScrollHeight());
            if (len > lowerFileLimit) {
                showScrolledFiles();
            }
            if (len > sortFileLimit) {
                $fileBrowser.addClass('unsortable');
            } else {
                $fileBrowser.removeClass('unsortable');
            }
        }
    }

    function refreshEllipsis() {
        // do not use middle ellipsis if too many files, it's slow
        if (curFiles.length > lowerFileLimit) {
            return;
        }

        var isListView = $fileBrowserMain.hasClass("listView");
        var maxChar = isListView ? 50 : 16;

        $container.find(".label").each(function() {
            var $label = $(this);
            var name = $label.data("name");
            xcHelper.middleEllipsis(name, $label, maxChar, isListView);
        });
    }

    function addKeyBoardEvent() {
        var fileNavigator = createFileNavigator();

        $(document).on("keydown.fileBrowser", function(event) {
            // up to parent folder
            var $target = $(event.target);
            var code = event.which;

            if ($target.is("input")) {
                // input doese trigger keyboard event
                return true;
            }

            if (code === keyCode.Backspace) {
                goUpPath();
                return false;
            }

            if (code === keyCode.Enter && !modalHelper.checkBtnFocus()) {
                var $grid = $container.find(".grid-unit.active");
                $grid.trigger("dblclick");
                return false;
            }

            if (isSystemMac && event.metaKey ||
                !isSystemMac && event.altKey)
            {
                if (code === keyCode.Up ||
                    code === keyCode.Down) {
                    keyBoardInBackFolder(code);
                }
            } else if (code === keyCode.Left ||
                code === keyCode.Right ||
                code === keyCode.Up ||
                code === keyCode.Down) {
                keyBoardNavigate(code, event);
            } else {
                var file = fileNavigator.navigate(code, curFiles);
                if (file != null) {
                    focusOn(file, true);
                }
            }
        });
    }

    // A singleton to do file search
    function createFileNavigator() {
        return new FileNavigator();

        function FileNavigator() {
            var self = this;
            self.timer = null;
            self.searchString = "";
            self.navigate = function(code, files) {
                var c = String.fromCharCode(code).toLowerCase();
                var fileName = null;

                if (c >= 'a' && c <= 'z' ||
                    c >= '0' && c <= '9') {
                    self.searchString += c;

                    // use .some so that when it's true, can stop loop
                    files.some(function(file) {
                        var name = file.name;
                        if (name.toLowerCase().startsWith(self.searchString)) {
                            // filename donot use lowercase, otherwise
                            // search may fail in focusOn();
                            fileName = name;
                            return true;
                        }

                        return false;
                    });

                    if (fileName == null) {
                        self.searchString = "";
                    }
                } else {
                    // invalid char, empty the navi str
                    self.searchString = "";
                }

                clearTimeout(self.timer);
                self.timer = setTimeout(function() {
                    // when timeOut, reset the search string
                    self.searchString = "";
                }, 1000);

                return fileName;
            };
        }
    }

    function keyBoardInBackFolder(code) {
        if (code === keyCode.Up) {
            goUpPath();
        } else if (code === keyCode.Down) {
            goIntoFolder();
        }
    }

    function keyBoardNavigate(code, event) {
        var $nextIcon;
        var $curIcon = $container.find('.grid-unit.active');
        if (!$curIcon.length) {
            return;
        }
        var isGridView = $fileBrowserMain.hasClass("gridView");
        if (isGridView) {
            if (code === keyCode.Left) {
                $nextIcon = $curIcon.prev();
            } else if (code === keyCode.Right) {
                $nextIcon = $curIcon.next();
            } else if (code === keyCode.Up || code === keyCode.Down) {
                $nextIcon = findVerticalIcon($curIcon, code);
            }
        } else {
            if (code === keyCode.Down) {
                $nextIcon = $curIcon.next();
            } else if (code === keyCode.Up) {
                $nextIcon = $curIcon.prev();
            }
        }
        if ($nextIcon && $nextIcon.length && !$nextIcon.hasClass('sizer')) {
            $nextIcon.click();
            scrollIconIntoView($nextIcon, isGridView);
            event.preventDefault();
        }
    }

    function findVerticalIcon($curIcon, code) {
        var curIconTop = $curIcon.position().top;
        var curIconLeft = $curIcon.position().left;
        var targetTop;
        var $targetIcon;
        // Measure top + or - 2 due to browser zoom
        if (code === keyCode.Up) {
            targetTop = curIconTop - dsIconHeight;
            $curIcon.prevAll().each(function() {
                if ($(this).position().left === curIconLeft &&
                    ($(this).position().top > targetTop - 2 &&
                     $(this).position().top < targetTop + 2)) {
                    $targetIcon = $(this);
                    return false;
                } else if ($(this).position().top < targetTop - 2) {
                    return false;
                }
            });
        } else if (code === keyCode.Down) {
            targetTop = curIconTop + dsIconHeight;
            var moreRowsExist = false;
            $curIcon.nextAll().each(function() {
                if ($(this).position().top > targetTop - 2 &&
                    $(this).position().top < targetTop + 2) {
                    moreRowsExist = true;
                    if ($(this).position().left === curIconLeft) {
                        $targetIcon = $(this);
                        return false;
                    }
                } else if ($(this).position().top > targetTop + 2) {
                    return false;
                }
            });
            if (!$targetIcon && moreRowsExist &&
                !$curIcon.is(':last-child')) {
                $targetIcon = $curIcon.siblings(':last');
            }
        }

        return ($targetIcon);
    }

    function scrollIconIntoView($icon, isGridView) {
        var iconHeight = isGridView ? dsIconHeight : dsListHeight;
        var containerHeight = $container.height();
        var scrollTop = $container.scrollTop();

        if ($container.hasClass('manyFiles')) {
            var index = $icon.index() - 1; // .sizer is at 0
            var filesPerRow;
            if (isGridView) {
                filesPerRow = getFilesPerRow();
            } else {
                filesPerRow = 1;
            }
            var containerBottom = scrollTop + containerHeight;

            var row = Math.floor(index / filesPerRow);
            var iconPosition = row * iconHeight;

            var newScrollTop;
            if (iconPosition < scrollTop) {
                newScrollTop = row * iconHeight;
            } else if (iconPosition + iconHeight > containerBottom) {
                newScrollTop = (row * iconHeight) - containerHeight + iconHeight;
            }

            if (newScrollTop != null) {
                $container.addClass('noScrolling');

                $container.scrollTop(newScrollTop);
                showScrolledFiles();
                // browser's auto scrolling will be triggered here but will return when
                // it finds that $container has class noscrolling;
                setTimeout(function() {
                    $container.removeClass('noScrolling');
                });
            }
        } else {

            var iconOffsetTop = $icon.position().top;
            var iconBottom = iconOffsetTop + iconHeight;

            if (iconBottom > containerHeight) {
                $container.scrollTop(scrollTop + (iconBottom - containerHeight));
            } else if (iconOffsetTop < 0) {
                $container.scrollTop(scrollTop + iconOffsetTop);
            }
        }

    }

    function measureDSIconHeight() {
        var $grid = $container.children('.grid-unit').eq(0);
        var iconHeight = $grid.height();
        if (iconHeight) {
            dsIconHeight = iconHeight +
                           parseInt($grid.css('margin-top')) +
                           parseInt($grid.css('margin-bottom'));
        }
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        FileBrowser.__testOnly__ = {};
        FileBrowser.__testOnly__.getCurrentPath = getCurrentPath;
        FileBrowser.__testOnly__.getShortPath = getShortPath;
        FileBrowser.__testOnly__.getGridUnitName = getGridUnitName;
        FileBrowser.__testOnly__.getFormat = getFormat;
        FileBrowser.__testOnly__.getShortName = getShortName;
        FileBrowser.__testOnly__.appendPath = appendPath;
        FileBrowser.__testOnly__.updateFileName = updateFileName;
        FileBrowser.__testOnly__.filterFiles = filterFiles;
        FileBrowser.__testOnly__.sortFiles = sortFiles;
        FileBrowser.__testOnly__.changeProtocol = changeProtocol;
        FileBrowser.__testOnly__.goToPath = goToPath;
        FileBrowser.__testOnly__.focusOn = focusOn;
        FileBrowser.__testOnly__.getFocusGrid = getFocusGrid;
    }
    /* End Of Unit Test Only */

    return (FileBrowser);
}(jQuery, {}));

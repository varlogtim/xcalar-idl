window.FileBrowser = (function($, FileBrowser) {
    var $fileBrowser;     // $("#fileBrowser")
    var $container;       // $("#fileBrowserContainer")
    var $innerContainer;  // $("#innerFileBrowserContainer")
    var $fileBrowserMain; // $("#fileBrowserMain")

    var $pathSection;     // $("#fileBrowserPath")
    var $pathLists;       // $("#fileBrowserPathMenu")
    var $visibleFiles;   // will hold nonhidden files

    var fileBrowserId;

    /* Contants */
    var defaultSortKey  = "type"; // default is sort by type;
    var dsIconHeight = 65;
    var dsIconWidth = 65;
    var dsListHeight = 30;
    var lowerFileLimit = 800; // when we start hiding files
    var upperFileLimit = 110000; // show error if over 110K
    var subUpperFileLimit = 25000; // file limit if not chrome
    var sortFileLimit = 25000; // do not allow sort if over 25k
    var oldBrowserError = "Deferred From Old Browser";
    var defaultPath = "/";
    /* End Of Contants */

    var historyPathCache = {};
    var curFiles = [];
    var allFiles = [];
    var sortKey = defaultSortKey;
    var sortRegEx;
    var reverseSort = false;

    FileBrowser.setup = function() {
        $fileBrowser = $("#fileBrowser");
        $container = $("#fileBrowserContainer");
        $innerContainer = $("#innerFileBrowserContainer");
        $fileBrowserMain = $("#fileBrowserMain");
        $pathSection = $("#fileBrowserPath");
        $pathLists = $("#fileBrowserPathMenu");
        $visibleFiles = $();

        FilePreviewer.setup();

        if (!window.isBrowserChrome) {
            lowerFileLimit = 600;
            upperFileLimit = subUpperFileLimit;
        }

        addContainerEvents();
        addSortMenuEvents();
        addPathSectionEvents();
        addSearchSectionEvents();
        addBrowserMenuEvents();

        fileBrowserScrolling();
    };

    FileBrowser.restore = function() {
        // restore list view if saved
        var isListView = UserSettings.getPref('browserListView');
        if (isListView) {
            toggleView(true, true);
        }
    };

    FileBrowser.clear = function() {
        clearAll();
    };

    FileBrowser.show = function(targetName, path) {
        var deferred = jQuery.Deferred();

        clearAll();
        DSForm.switchView(DSForm.View.Browser);

        addKeyBoardEvent();
        fileBrowserId = xcHelper.randName("browser");


        setTarget(targetName);
        path = path || getHistoryPath(targetName);

        var paths = parsePath(path);
        setPath(paths[paths.length - 1]);

        retrievePaths(path)
        .then(function() {
            measureDSIconHeight();
            deferred.resolve();
        })
        .fail(function(error) {
            if (error.error === oldBrowserError) {
                // when it's an old deferred
                deferred.reject(error);
                return;
            } else if (error.status === StatusT.StatusIO ||
                        path === defaultPath) {
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

    function addContainerEvents() {
        $fileBrowser.on("click", "input", function() {
            hideBrowserMenu();
        });

        // click blank space to remove foucse on folder/dsds
        $container.on("click", function() {
            cleanContainer();
        });

        $container.on({
            "click": function(event) {
                // click to focus
                var $grid = $(this);

                event.stopPropagation();
                cleanContainer();

                if (isSystemMac && event.metaKey ||
                !isSystemMac && event.ctrlKey) {
                    return; // ctrl+click deselects via cleancontainer
                }

                $grid.addClass("active");
                if (FilePreviewer.isOpen()) {
                    previewDS($grid);
                }
            },
            "dblclick": function() {
                var $grid = $(this);

                if (isDS($grid)) {
                    // dblclick a dataset to import
                    sumbitForm($grid);
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

        // confirm to open a ds
        $fileBrowser.on("click", ".confirm", function() {
            var $grid = getFocusedGridEle();
            sumbitForm($grid);
            return false;
        });

        // close file browser
        $fileBrowser.on("click", ".cancel", function() {
            backToForm();
        });

        $("#fileBrowserRefresh").click(function(event) {
            $(this).blur();
            // the first option in pathLists
            var $curPath = $pathLists.find("li").eq(0);
            xcHelper.showRefreshIcon($fileBrowserMain);
            event.stopPropagation();
            goToPath($curPath);
        });

        // Up to parent folder
        $("#fileBrowserUp").click(function(event) {
            $(this).blur();
            event.stopPropagation();
            goUpPath();
        });

        // toggle between listview and gridview
        $("#fileBrowserGridView").click(function(event) {
            event.stopPropagation();
            toggleView();
        });

        // click on title to sort
        var titleLabel = ".title .label, .title .xi-sort";
        $fileBrowserMain.on("click", titleLabel, function(event) {
            var $title = $(this).closest(".title");

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
    }

    function addSortMenuEvents() {
        // toggle sort menu, should use mousedown for toggle
        var $sortMenu = $("#fileBrowserSortMenu");
        var $sortSection = $("#fileBrowserSort");

        xcMenu.add($sortMenu);
        $sortSection.on({
            "mouseup": function(event){
                if (event.which !== 1) {
                    return;
                }

                event.stopPropagation();
                if ($fileBrowser.hasClass("unsortable")) {
                    return;
                }

                $sortMenu.toggle();
            },
            // prevent clear event to be trigger
            "click": function(event) {
                event.stopPropagation();
            }
        });

        // // click sort option to sort
        $sortMenu.on("mouseup", "li", function(event) {
            if (event.which !== 1) {
                return;
            }
            var $li = $(this);

            event.stopPropagation();
            $sortMenu.hide();
            // already sort
            if (!$li.hasClass("select")) {
                sortAction($li, true);
            }
        });

        new MenuHelper($pathSection, {
            "onlyClickIcon": true,
            "onSelect": goToPath,
            "container": "#fileBrowser"
        }).setupListeners();
    }

    function addPathSectionEvents() {
        var timer;
        $pathSection.on({
            "keyup": function(event) {
                clearTimeout(timer);

                var key = event.which;
                if (key === keyCode.Up || key === keyCode.Down ||
                    key === keyCode.Left || key === keyCode.Right)
                {
                    return true;
                }

                var $input = $(this);
                var currentVal = $input.val();
                var path = currentVal;

                if (key === keyCode.Enter) {
                    if (!path.endsWith("/")) {
                        path += "/";
                    }

                    pathInput(path);
                    return false;
                }

                timer = setTimeout(function() {
                    // check if value has changed in timeout
                    if ($input.val() === currentVal && path.endsWith("/")) {
                        pathInput(path);
                    }
                }, 400);

                return false;
            },

            "focus": function() {
                $pathSection.addClass("focused");
            },

            "blur": function() {
                $pathSection.removeClass("focused");
            }
        }, ".text");
    }

    function pathInput(path) {
        if (path === getCurrentPath()) {
            // when the input path is still equal to current path
            // do not retrievePath
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();
        retrievePaths(path)
        .then(deferred.resolve)
        .fail(function(error) {
            showPathError();
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function showPathError() {
        var $input = $("#fileBrowserPath .text");
        var width = $input.width();
        var textWidth = xcHelper.getTextWidth($input);
        var offset = width - textWidth - 50; // padding 50px

        StatusBox.show(ErrTStr.InvalidFilePath, $input, false, {
            "side": "right",
            "offsetX": offset
        });
    }

    function addSearchSectionEvents() {
        // search bar
        var $searchSection = $("#fileBrowserSearch");
        $searchSection.on("input", "input", function() {
            var searchKey = $(this).val();
            searchFiles(searchKey);
        });

        $searchSection.on("mousedown", ".clear", function() {
            $(this).siblings("input").val("").focus();
            searchFiles(null);
            // stop event propogation
            return false;
        });
    }

    function addBrowserMenuEvents() {
        var $fileBrowserMenu = $("#fileBrowserMenu");
        xcMenu.add($fileBrowserMenu);

        $fileBrowserMain[0].oncontextmenu = function(event) {
            var $target = $(event.target);
            var $grid = $target.closest(".grid-unit");

            if ($grid.length ===0) {
                return;
            }
            // focuse on grid
            $grid.click();

            var classes = "";
            if (isDS($grid)) {
                classes = "dsOpts";
            } else {
                classes = "folderOpts";
            }

            xcHelper.dropdownOpen($target, $fileBrowserMenu, {
                "classes": classes,
                "floating": true
            });
            return false;
        };

        $fileBrowserMenu.on("mouseup", ".preview", function() {
            var $grid = getFocusedGridEle();
            previewDS($grid);
        });

        $fileBrowserMenu.on("mouseup", ".getInfo", function() {
            var $grid = getFocusedGridEle();
            getFolderInfo($grid);
        });
    }

    function hideBrowserMenu() {
        $("#fileBrowserMenu").hide();
        $("#fileBrowserSortMenu").hide();
    }

    function fileBrowserScrolling() {
        var scrollTimer;
        $container.scroll(function() {
            hideBrowserMenu();
            if ($(this).hasClass('noScrolling') ||
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
        if ($fileBrowserMain.hasClass("gridView")) {
            visibleRowsBelow = 5; // number of rows that have display:block
            visibleRowsAbove = 7;
            rowNum = Math.floor(scrollTop / dsIconHeight) - visibleRowsBelow;

            var filesPerRow = getFilesPerRow();
            var filesBelow = rowNum * filesPerRow;

            numVisibleRows = Math.ceil($container.height() / dsIconHeight);

            startIndex = Math.max(0, filesBelow);
            endIndex = startIndex + (filesPerRow *
                    (numVisibleRows + visibleRowsBelow + visibleRowsAbove));
            $container.find(".sizer").show().height(rowNum * dsIconHeight);
        } else {
            visibleRowsBelow = 20;
            visibleRowsAbove = 25;
            rowNum = Math.floor(scrollTop / dsListHeight) - visibleRowsBelow;
            numVisibleRows = Math.ceil($container.height() / dsListHeight);
            startIndex = Math.max(0, rowNum);
            endIndex = startIndex + numVisibleRows + visibleRowsBelow +
                            visibleRowsAbove;
            $container.find(".sizer").show().height(rowNum * dsListHeight);
        }

        $visibleFiles.removeClass("visible");
        $visibleFiles = $container.find(".grid-unit")
                                  .slice(startIndex, endIndex)
                                  .addClass("visible");
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

    function toggleView(toListView, noRefreshTooltip) {
        var $btn = $("#fileBrowserGridView");
        FilePreviewer.close();
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

    function getCurrentTarget() {
        return $pathSection.find(".targetName").text();
    }

    function getCurrentPath() {
        var path = $pathLists.find("li:first-of-type").text();
        return path;
    }

    function getGridUnitName($grid) {
        // edge case: null should be "null"
        return String($grid.find('.label').data("name"));
    }

    function setPath(path) {
        path = path || "";
        $pathSection.find(".text").val(path);
    }

    function appendPath(path, noPathUpdate) {
        if (!noPathUpdate) {
            setPath(path);
        }

        $pathLists.prepend('<li>' + path + '</li>');
    }

    function clearAll() {
        $("#fileBrowserUp").addClass("disabled");
        setPath("");
        $pathLists.empty();
        // performance when there's 1000+ files, is the remove slow?
        $container.removeClass("manyFiles");
        $fileBrowser.removeClass("unsortable");
        clearSearch();

        $visibleFiles = $();
        curFiles = [];
        sortRegEx = undefined;

        document.getElementById("innerFileBrowserContainer").innerHTML = "";

        $(document).off(".fileBrowser");
        $fileBrowser.removeClass("loadMode errorMode");
        fileBrowserId = null;

        FilePreviewer.close();
    }

    function cleanContainer() {
        $container.find(".active").removeClass("active");
    }

    function backToForm() {
        clearAll();
        DSForm.show({"noReset": true});
    }

    function redirectHandler(path) {
        var deferred = jQuery.Deferred();

        setTimeout(function() {
            // do this because fadeIn has 300 dealy,
            // if statusBox show before the fadeIn finish, it will fail
            var error = xcHelper.replaceMsg(ErrWRepTStr.NoPath, {
                "path": path
            });
            StatusBox.show(error, $pathSection, false, {side: 'top'});
            deferred.resolve();
        }, 300);

        return deferred.promise();
    }

    function loadFailHandler(error, path) {
        $pathLists.empty();
        appendPath(path);

        console.error(error);
        var msg = xcHelper.replaceMsg(ErrWRepTStr.NoPathInLoad, {
            "path": path
        });
        if (typeof error === "object" && error.log) {
            msg += " " + AlertTStr.Error + ": " + error.log;
        }
        var html = '<div class="error">' +
                        '<div>' + msg + '</div>' +
                        '<div>' + DSTStr.DSSourceHint + '</div>' +
                    '</div>';
        $innerContainer.html(html);
        $innerContainer.height(getScrollHeight());
        $container.removeClass('manyFiles');
        $fileBrowser.removeClass('unsortable').addClass("errorMode");
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

    function setTarget(targetName) {
        $pathSection.find(".targetName").text(targetName);
    }

    function getHistoryPath(targetName) {
        return historyPathCache[targetName] || "/";
    }

    function setHistoryPath(targetName, path) {
        historyPathCache[targetName] = path;
    }

    function listFiles(path) {
        var deferred = jQuery.Deferred();
        var $loadSection = $fileBrowserMain.find(".loadingSection");
        var targetName = getCurrentTarget();
        var curBrowserId = fileBrowserId;

        $fileBrowser.addClass("loadMode");
        var timer = setTimeout(function() {
            $loadSection.show();
        }, 500);

        XcalarListFiles({targetName: targetName, path: path})
        .then(function(listFilesOutput) {
            if (curBrowserId === fileBrowserId) {
                cleanContainer();
                clearSearch();
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
        var $grid = getFocusedGridEle();
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

        FilePreviewer.close();

        var oldPath = getCurrentPath();
        var path = $newPath.text();

        listFiles(path)
        .then(function() {
            setPath(path);
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

    function sumbitForm($ds) {
        // load dataset
        var targetName = getCurrentTarget();
        var curDir = getCurrentPath();
        if (($ds == null || $ds.length === 0) && curDir === defaultPath) {
            var $confirmBtn = $fileBrowser.find(".confirm");
            StatusBox.show(ErrTStr.InvalidFile, $confirmBtn, false, {
                "side": "left"
            });
            return;
        }

        setHistoryPath(targetName, curDir);

        var path = null;
        var format = null;

        if ($ds != null && $ds.length > 0) {
            var fileName = $ds.find(".fileName").data("name");
            path = curDir + fileName;
            format = xcHelper.getFormat(fileName);
        } else {
            // load the whole folder
            path = curDir;
        }

        var options = {
            "targetName": targetName,
            "path": path,
            "format": format
        };

        clearAll();
        DSPreview.show(options);
    }

    function searchFiles(searchKey) {
        var $input = $("#fileBrowserSearch input").removeClass("error");
        FilePreviewer.close();

        try {
            var regEx = null;
            if (searchKey != null) {
                searchKey = xcHelper.prefixRegExKey(searchKey);
                regEx = new RegExp(searchKey);
            }
            var grid = getFocusGrid();
            sortFilesBy(sortKey, regEx);
            focusOn(grid);
        } catch (error) {
            $input.addClass("error");
            handleSearchError();
        }
    }

    function clearSearch() {
        $("#fileBrowserSearch input").removeClass("error").val("");
        sortRegEx = undefined;
    }

    function handleSearchError() {
        var html = '<div class="error">' +
                        '<div>' + ErrTStr.InvalidRegEx + '</div>' +
                    '</div>';
        $innerContainer.html(html);
    }

    function sortAction($option, isFromSortOption) {
        var grid = getFocusGrid();
        var key = $option.data("sortkey");

        FilePreviewer.close();

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
                    '<div>' + DSTStr.FileOversize + '</div>' +
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
            if (regEx.test(name) === true)
            {
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
                var aName = a.name.toLowerCase();
                var bName = b.name.toLowerCase();
                return (aName < bName ? -1 : (aName > bName ? 1 : 0));
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

    function focusOn(grid, isAll, showError) {
        if (grid == null) {
            return;
        }

        var str;
        var name;

        if (typeof grid === "string") {
            name = xcHelper.escapeRegExp(grid);
            name = xcHelper.escapeDblQuote(name);
            if (isAll) {
                str = '.grid-unit .label[data-name="' + name + '"]';
            } else {
                str = '.grid-unit.folder .label[data-name="' + name + '"]';
            }
        } else {
            name = xcHelper.escapeRegExp(grid.name);
            name = xcHelper.escapeDblQuote(name);
            var type = grid.type;

            if (type == null) {
                str = '.grid-unit' + ' .label[data-name="' + name + '"]';
            } else {
                str = '.grid-unit.' + type + ' .label[data-name="' + name + '"]';
            }
        }

        $container.find(".grid-unit").removeClass("active");
        var $grid = $container.find(str).eq(0).closest('.grid-unit');
        if ($grid.length > 0) {
            $grid.addClass('active');

            if ($fileBrowserMain.hasClass("listView")) {
                scrollIconIntoView($grid);
            } else {
                scrollIconIntoView($grid, true);
            }
        } else if (name !== "" && showError) {
            showNoFileError();
        }
    }

    function showNoFileError() {
        StatusBox.show(ErrTStr.NoFile, $container, false, {side: "top"});
    }

    function getFocusGrid() {
        var $grid = getFocusedGridEle();
        var grid;

        if ($grid.length > 0) {
            grid = {
                "name": $grid.find(".label").data("name"),
                "type": $grid.hasClass("folder") ? "folder" : "ds"
            };
        }

        return (grid);
    }

    function getFocusedGridEle() {
        return $container.find(".grid-unit.active");
    }

    function retrievePaths(path, noPathUpdate) {
        if (!path.startsWith(defaultPath)) {
            path = defaultPath + path;
        }

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
                focusOn({"name": name}, true, true);
            }
            checkIfCanGoUp();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getHTMLFromFiles(files) {
        var html = '<div class="sizer"></div>';
            // used to keep file position when
            // files before it are hidden

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
            var iconClass = isDirectory ? "xi-folder" : "xi_data";
            var size = isDirectory ? "" :
                        xcHelper.sizeTranslator(fileObj.attr.size);
            var date = "";
            var dateTip = "";
            if (mtime) {
                var time = moment(mtime * 1000);
                date = time.calendar();
                dateTip = xcTimeHelper.getDateTip(time);
            }
            var escName = xcHelper.escapeDblQuoteForHTML(name);

            html +=
                '<div title="' + escName + '" class="' +
                    gridClass + visibilityClass + ' grid-unit" ' +
                    'data-index="' + i + '">' +
                    '<i class="gridIcon icon ' + iconClass + '"></i>' +
                    '<div class="label fileName" data-name="' + escName + '">' +
                        name +
                    '</div>' +
                    '<div class="fileDate"><span ' + dateTip + '>' + date + '</span></div>' +
                    '<div class="fileSize">' + size + '</div>' +
                '</div>';
        }

        // this is faster than $container.html
        document.getElementById('innerFileBrowserContainer').innerHTML = html;
        refreshEllipsis();

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

    function refreshEllipsis() {
        // do not use middle ellipsis if too many files, it's slow
        if (curFiles.length > lowerFileLimit) {
            return;
        }

        // note: we are handling listView width as static when the modal width
        // is not static
        var isListView = $fileBrowserMain.hasClass("listView");
        var maxChar = isListView ? 40 : 8;
        var maxWidth = isListView ? 500 : 52;
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        ctx.font = isListView ? '700 12px Open Sans' : '700 9px Open Sans';

        $container.find(".label").each(function() {
            var $label = $(this);
            var name = $label.data("name");
            xcHelper.middleEllipsis(name, $label, maxChar, maxWidth,
                                     !isListView, ctx);
        });
    }

    function addKeyBoardEvent() {
        var fileNavigator = createFileNavigator();

        $(document).on("keydown.fileBrowser", function(event) {
            // up to parent folder
            var $target = $(event.target);
            if ($target.closest("#fileBrowserPreview").length > 0) {
                return;
            }

            var code = event.which;
            var $lastTarget = gMouseEvents.getLastMouseDownTarget();
            var $lastTargParents = gMouseEvents.getLastMouseDownParents();

            hideBrowserMenu();
            var $activeEl = $(document.activeElement);
            if ($fileBrowser.is(":visible") && !$activeEl.is("textarea") &&
                !$activeEl.is("input")) {
                // filebrowser is visible and there's no cursor in an input so
                // we assume user is trying to navigate folders
            } else if ($target.is("input") ||
                ($lastTarget != null &&
                $lastTarget.length > 0 &&
                !$lastTargParents.filter("#fileBrowser").length &&
                !$lastTargParents.filter("#dsForm-path").length &&
                !$lastTargParents.filter("#importDataForm").length))
            {
                // last click did not come from fileBrowser, dsFormPath, or
                // importData form
                // input doese trigger keyboard event
                return true;
            }

            if (code === keyCode.Backspace) {
                goUpPath();
                return false;
            }

            if (code === keyCode.Enter) {
                var $grid = getFocusedGridEle();
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
            $container.find('.grid-unit:visible').eq(0).click();
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
        var $targetIcon;
        var curIndex = $curIcon.index() - 1; // .sizer is at 0 index
        var containerWidth = $innerContainer.width();
        var gridsPerRow = Math.floor(containerWidth / dsIconWidth);
        if (code === keyCode.Up) {
            var newIndex = curIndex - gridsPerRow;
            if (newIndex < 0) {
                $targetIcon = $curIcon;
            } else {
                $targetIcon = $innerContainer.find('.grid-unit')
                                         .eq(curIndex - gridsPerRow);
            }
        } else if (code === keyCode.Down) {

            $targetIcon = $innerContainer.find('.grid-unit')
                                         .eq(curIndex + gridsPerRow);
            if (!$targetIcon.length) {
                // when there isn't an icon directly below
                $targetIcon = $innerContainer.find('.grid-unit').last();
                // pick the last icon of the last row, unless it's on the same
                // row (position().top === curIconTop)
                var curIconTop = $curIcon.position().top;
                if ($targetIcon.length &&
                    $targetIcon.position().top === curIconTop)
                {
                    $targetIcon = $curIcon;
                }
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
                // browser's auto scrolling will be triggered here
                // but will return when it finds that $container
                // has class noscrolling;
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

    function isDS($grid) {
        return $grid.hasClass("ds");
    }

    function previewDS($grid) {
        if ($grid.length === 0) {
            return;
        }
        FilePreviewer.show({
            targetName: getCurrentTarget(),
            path: getCurrentPath() + getGridUnitName($grid),
            isFolder: $grid.hasClass("folder")
        });
    }

    function getFolderInfo($grid) {
        var index = Number($grid.data("index"));
        var file = curFiles[index];
        var name = file.name;
        var path = getCurrentPath() + name;
        var mTime = moment(file.attr.mtime * 1000).format("h:mm:ss A ll");
        var isFolder = file.attr.isDirectory;
        var size = isFolder ? null : xcHelper.sizeTranslator(file.attr.size);

        FileInfoModal.show({
            "targetName": getCurrentTarget(),
            "path": path,
            "name": name,
            "modified": mTime,
            "size": size,
            "isFolder": isFolder
        });
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        FileBrowser.__testOnly__ = {};
        FileBrowser.__testOnly__.getCurFiles = function() {
            return curFiles;
        };
        FileBrowser.__testOnly__.setTarget = setTarget;
        FileBrowser.__testOnly__.getCurrentTarget = getCurrentTarget;
        FileBrowser.__testOnly__.getCurrentPath = getCurrentPath;
        FileBrowser.__testOnly__.setHistoryPath = setHistoryPath;
        FileBrowser.__testOnly__.getHistoryPath = getHistoryPath;
        FileBrowser.__testOnly__.getGridUnitName = getGridUnitName;
        FileBrowser.__testOnly__.appendPath = appendPath;
        FileBrowser.__testOnly__.filterFiles = filterFiles;
        FileBrowser.__testOnly__.sortFiles = sortFiles;
        FileBrowser.__testOnly__.goToPath = goToPath;
        FileBrowser.__testOnly__.focusOn = focusOn;
        FileBrowser.__testOnly__.isDS = isDS;
        FileBrowser.__testOnly__.previewDS = previewDS;
        FileBrowser.__testOnly__.showPathError = showPathError;
        FileBrowser.__testOnly__.getFolderInfo = getFolderInfo;
        FileBrowser.__testOnly__.findVerticalIcon = findVerticalIcon;
        FileBrowser.__testOnly__.redirectHandler = redirectHandler;
        FileBrowser.__testOnly__.oversizeHandler = oversizeHandler;
        FileBrowser.__testOnly__.sumbitForm = sumbitForm;
        FileBrowser.__testOnly__.showScrolledFiles = showScrolledFiles;
    }
    /* End Of Unit Test Only */

    return (FileBrowser);
}(jQuery, {}));

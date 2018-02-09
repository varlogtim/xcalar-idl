window.FileBrowser = (function($, FileBrowser) {
    var $fileBrowser;     // $("#fileBrowser")
    var $container;       // $("#fileBrowserContainer")
    var $containerWrapper;// $("#fileBrowserContainer .wrapper")
    var $innerContainer;  // $("#innerFileBrowserContainer")
    var $fileBrowserMain; // $("#fileBrowserMain")
    var $infoContainer;   // $("#fileInfoContainer")
    var $selectedFileList; // $("#fileBrowserContainer .selectedFileList")

    var $pathSection;     // $("#fileBrowserPath")
    var $pathLists;       // $("#fileBrowserPathMenu")
    var $searchDropdown;  // $("#fileSearchDropdown")
    var $visibleFiles;   // will hold nonhidden files

    var fileBrowserId;

    /* Contants */
    var defaultSortKey  = "type"; // default is sort by type;
    var dsIconHeight = 77;
    var dsIconWidth = 70;
    var dsListHeight = 29;
    var lowerFileLimit = 800; // when we start hiding files
    var upperFileLimit = 110000; // show error if over 110K
    var subUpperFileLimit = 25000; // file limit if not chrome
    var sortFileLimit = 25000; // do not allow sort if over 25k
    var oldBrowserError = "Deferred From Old Browser";
    var defaultPath = "/";
    var listFormatMap = {
        "JSON": "xi-json-big-file",
        "CSV": "xi-csv-big-file",
        "Excel": "xi-xls-big-file",
        "TEXT": "xi-text-big-file",
        "XML": "xi-xml-big-file",
        "HTML": "xi-html-big-file",
        "TAR": "xi-tar-big-file",
        "ZIP": "xi-zip-big-file",
        "PDF": "xi-pdf-big-file",
        "JPG": "xi-jpg-big-file",
        "PNG": "xi-png-big-file",
        "GIF": "xi-gif-big-file",
        "BMP": "xi-bmp-big-file"
    };
    var gridFormatMap = {
        "JSON": "xi-json-file",
        "CSV": "xi-csv-file",
        "Excel": "xi-xls-file",
        "TEXT": "xi-text-file",
        "XML": "xi-xml-file",
        "HTML": "xi-html-file",
        "TAR": "xi-tar-file",
        "ZIP": "xi-zip-file",
        "PDF": "xi-pdf-file",
        "JPG": "xi-jpg-file",
        "PNG": "xi-png-file",
        "GIF": "xi-gif-file",
        "BMP": "xi-bmp-file-1"
    };
    /* End Of Contants */

    var curFiles = [];
    var allFiles = [];
    var sortKey = defaultSortKey;
    var sortRegEx;
    var reverseSort = false;
    var $anchor; // The anchor for selected files

    FileBrowser.setup = function() {
        $fileBrowser = $("#fileBrowser");
        $container = $("#fileBrowserContainer");
        $containerWrapper = $("#fileBrowserContainer .wrapper").eq(0);
        $innerContainer = $("#innerFileBrowserContainer");
        $fileBrowserMain = $("#fileBrowserMain");
        $pathSection = $("#fileBrowserPath");
        $pathLists = $("#fileBrowserPathMenu");
        $searchDropdown = $("#fileSearchDropdown");
        $infoContainer = $("#fileInfoContainer");
        $selectedFileList = $("#fileInfoContainer .selectedFileList").eq(0);
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
        addInfoContainerEvents();

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
        updateActiveFileInfo();
        DSForm.switchView(DSForm.View.Browser);

        addKeyBoardEvent();
        fileBrowserId = xcHelper.randName("browser");


        setTarget(targetName);

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
        $innerContainer.on("click", function() {
            cleanContainer();
        });

        $innerContainer.on({
            "click": function(event) {
                // click to focus
                var $grid = $(this);
                event.stopPropagation();

                if ((isSystemMac && event.metaKey) ||
                    (!isSystemMac && event.ctrlKey)) {
                    if ($grid.hasClass("selected")) {
                        // If ctrl+click on a selected file, unselect and return
                        unselectSingleFile($grid);
                        var isRemove = true;
                        updateSelectedFiles($grid, isRemove);
                        return;
                    }
                    // Keep selected files
                    cleanContainer(true);
                    $anchor = $grid;
                    selectSingleFile($grid);
                    updateSelectedFiles($grid);

                } else if (event.shiftKey) {
                    // ctrl + shift at same time = ctrl
                    // This is only for shift-click
                    cleanContainer(false, true);
                    selectMultiFiles($grid);
                    updateSelectedFiles();
                } else {
                    // Regular single click
                    cleanContainer();
                    $anchor = $grid;
                    selectSingleFile($grid);
                    updateSelectedFiles();
                }
            },
            "dblclick": function() {
                var $grid = $(this);

                if (isDS($grid)) {
                    // dblclick on a file does nothing
                    return;
                }
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
            },
            "mouseenter": function() {
                var $grid = $(this);
                $grid.addClass("hovering");
            },
            "mouseleave": function() {
                var $grid = $(this);
                $grid.removeClass("hovering");
            },
        }, ".grid-unit");

        $innerContainer.on("click", ".checkBox .icon", function(event) {
            // This behavior is in essence the same as a ctrl+click
            event.stopPropagation();
            var $grid = $(this).closest(".grid-unit");
            var isRemove = false;
            if ($grid.hasClass("selected")) {
                unselectSingleFile($grid);
                isRemove = true;
            } else {
                cleanContainer(true);
                $anchor = $grid;
                selectSingleFile($grid);
            }
            updateSelectedFiles($grid, isRemove);
        });

        // confirm to open a ds
        $fileBrowser.on("click", ".confirm", function() {
            submitForm();
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
        var titleLabel = ".title";
        $fileBrowserMain.on("click", titleLabel, function(event) {
            var $title = $(this).closest(".title");

            event.stopPropagation();
            if ($fileBrowser.hasClass('unsortable')) {
                return;
            }
            // click on selected title, reverse sort
            if ($title.hasClass("select")) {
                reverseFiles();
                var $icon = $title.find(".icon").eq(0);
                toggleSortIcon($icon);
            } else {
                sortAction($title, false);
            }
        });
    }

    function addInfoContainerEvents() {
        $infoContainer.find(".infoTitle .close").on("click", "span, i", function() {
            cleanContainer();
            $fileBrowser.find(".selectedFileList").empty();
        });
        $infoContainer.find(".selectedFiles .close").on("click", "span, i", function() {
            uncheckCkBox($infoContainer.find(".xi-ckbox-selected"));
        });
        $infoContainer.on("click", ".selectAll", function() {
            checkCkBox($infoContainer.find(".xi-ckbox-empty"));
        })
        $infoContainer.on("click", ".xi-ckbox-selected, .xi-ckbox-empty", function() {
            var $checkBox = $(this);
            if ($checkBox.hasClass("xi-ckbox-selected")) {
                uncheckCkBox($checkBox);
            } else {
                checkCkBox($checkBox);
            }
        });
        $infoContainer.on("click", ".selectedFileList .close", function() {
            var $li = $(this).closest("li");
            var fileName = $li.data("name");
            var $grid = $fileBrowser
                        .find('.fileName[data-name="' + fileName + '"]')
                        .closest(".grid-unit");
            unselectSingleFile($grid);
            // Just remove it, no need to call updateSelectedFiles
            $li.remove();
        });
        $infoContainer.on("click", ".switch", function() {
            var $switch = $(this);
            if ($switch.hasClass("on")) {
                $switch.removeClass("on");
                $switch.next().removeClass("highlighted");
                $switch.prev().addClass("highlighted");
            } else {
                $switch.addClass("on");
                $switch.prev().removeClass("highlighted");
                $switch.next().addClass("highlighted");
            }
        });
        $infoContainer.on("click", ".switchLabel", function() {
            var $label = $(this);
            if (!$label.hasClass("highlighted")) {
                var $switch = $label.siblings(".switch");
                if ($label.is(":first-child")) {
                    $switch.removeClass("on");
                } else {
                    $switch.addClass("on");
                }
                $label.siblings(".switchLabel").removeClass("highlighted");
                $label.addClass("highlighted");
            }
        });
        $infoContainer.on("click", ".fileRawData", function() {
            var $grid = getFocusedGridEle();
            previewDS($grid);
        });
    };

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
        var dropdown = new MenuHelper($searchSection, {
            "onlyClickIcon": false,
            "onSelect": applySearchPattern,
            "container": "#fileBrowser"
        }).setupListeners();

        $searchSection.on("input", "input", function() {
            var searchKey = $(this).val();
            refreshSearchDropdown(searchKey);
            if ((searchKey.length > 0 && !$searchSection.hasClass("open")) ||
                searchKey.length === 0) {
                dropdown.toggleList($searchSection);
            }
            searchFiles(searchKey);
        });

        $searchSection.on("mousedown", ".clear", function() {
            $(this).siblings("input").val("").focus();
            searchFiles(null);
            // stop event propogation
            return false;
        });
    }

    function refreshSearchDropdown(key) {
        $searchDropdown.empty();
        if (key.length > 0) {
            var html = '<li>' +
                            'regex(match): ' +
                            '<span class="regMatch">' + key + '</span>' +
                       '</li>' +
                       '<li>' +
                            'regex(contains): ' +
                            '<span class="regContain">' + key + '</span>' +
                       '</li>' +
                       '<li>' +
                            'glob(match): ' +
                            '<span class="globMatch">' + key + '</span>' +
                       '</li>' +
                       '<li>' +
                            'glob(contains): ' +
                            '<span class="globContain">' + key + '</span>' +
                       '</li>';
            $searchDropdown.prepend(html);
        }
    }

    function applySearchPattern($pattern) {
        var type = $pattern.find("span").attr("class");
        var searchKey = $pattern.find("span").text();
        searchFiles(searchKey, type);
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

        var scrollTop = $containerWrapper.scrollTop();
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
        $containerWrapper.scrollTop(scrollTop);
    }

    function getFilesPerRow() {
        var scrollBarWidth = 11;
        return (Math.floor(($containerWrapper.width() -
                            scrollBarWidth) / dsIconWidth));
    }
    function getScrollHeight() {
        var rowHeight = dsIconHeight;
        var scrollHeight;
        if ($fileBrowserMain.hasClass('listView')) {
            rowHeight = dsListHeight; // because of -1px margin-top
            scrollHeight = Math.max(rowHeight *
                                    $container.find('.grid-unit').length,
                                    $containerWrapper.height());
        } else {
            var iconsPerRow = getFilesPerRow();
            var rows = Math.ceil($container.find('.grid-unit').length /
                                iconsPerRow);
            scrollHeight = rows * dsIconHeight ;
            // don't know why the wrapper adds 20px in height; (line-height)
            scrollHeight = Math.max(scrollHeight + 5,
                                    $containerWrapper.height());
        }

        return scrollHeight;
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
        refreshIcon();
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
                $containerWrapper.scrollTop(row * unitHeight - (containerHeight / 2));
                showScrolledFiles();
                // browser's auto scrolling will be triggered here but will
                // return when it finds that $container has class noscrolling;
                setTimeout(function() {
                    $container.removeClass('noScrolling');
                });
            } else {
                var unitOffSetTop = $unit.position().top;
                var scrollTop = $containerWrapper.scrollTop();
                $containerWrapper.scrollTop(scrollTop + unitOffSetTop -
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

    function cleanContainer(keepSelected, keepAnchor) {
        $container.find(".active").removeClass("active");
        updateActiveFileInfo();
        if (!keepSelected) {
            $innerContainer.find(".selected").each(function() {
                var $grid = $(this);
                $grid.removeClass("selected");
                curFiles[$grid.data("index")].isSelected = false;
            });
        }
        if (!keepAnchor) {
            $anchor = null;
        }
        uncheckCkBox($container.find(".grid-unit:not(.selected) .checkBox .icon"));
    }

    function backToForm() {
        setHistoryPath();
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

    function setHistoryPath() {
        var path = getCurrentPath();
        if (path !== defaultPath) {
            var targetName = getCurrentTarget();
            DSForm.addHisotryPath(targetName, path);
        }
    }

    function dedupFiles(targetName, files) {
        if (DSTargetManager.isPreSharedTarget(targetName)) {
            var dedupFiles = [];
            var nameSet = {};
            files.forEach(function(file) {
                if (!nameSet.hasOwnProperty(file.name)) {
                    nameSet[file.name] = true;
                    dedupFiles.push(file);
                }
            });
            return dedupFiles;
        } else {
            return files;
        }
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
                // Clear selected file list
                $selectedFileList.empty();
                FilePreviewer.close();
                allFiles = dedupFiles(targetName, listFilesOutput.files);
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

    function submitForm() {
        // XXX Now we're still using curDir. But ideally we should directly use
        // filename, which is the relative path (to data target root) + actual
        // filename
        var curDir = getCurrentPath();
        var targetName = getCurrentTarget();
        var pathList = [];
        var formatList = [];
        var recursiveList = [];
        var size = 0;
        // load dataset
        var $fileList = $fileBrowser.find(".selectedFileList li");
        $fileList.each(function () {
            var path = $(this).data("path") + $(this).data("name");
            var recursive = $(this).find("icon").eq(1)
                                   .hasClass("xi-ckbox-selected");
            var format = xcHelper.getFormat($(this).data("name"));
            pathList.push(path);
            formatList.push(format);
            recursiveList.push(recursive);
            // Estimate the size of payload to avoid exceeding limits
            size += path.length * 2; // Each char takes 2 bytes
            size += format ? format.length * 2 : 0; // Same as above
            size += 4;  // Each boolean takes 4 bytes
        });

        var $confirmBtn = $fileBrowser.find(".confirm");
        if (size > 4000000) {
            // If it exceeds payload limits, display an error
            StatusBox.show(ErrTStr.MaxPayload, $confirmBtn, false, {
                "side": "left"
            });
            return;
        }
        if (pathList.length === 0) {
            // If no file is selected
            StatusBox.show(ErrTStr.InvalidFile, $confirmBtn, false, {
                "side": "left"
            });
            return;
        }
        // var multiDS = $("#fileInfoBottom").find(".switch").hasClass("on");
        // var dsList = [];
        // if (multiDS) {
        //     // Import to multiple datasets
        //     for (var i = 0; i < pathList.length; i++) {
        //         var dsObj = {
        //             "dsId": i,
        //             "path": [pathList[i]],
        //             "format": [formatList[i]],
        //             "recursive": [recursiveList[i]]
        //         }
        //         dsList.push(dsObj);
        //     }
        // } else {
        //     // Import to a single dataset
        //     dsList.push({
        //         "dsId": 0,
        //         "path": pathList,
        //         "format": formatList,
        //         "recursive": recursiveList
        //     });
        // }
        // var options = {
        //     "targetName": targetName,
        //     "dsList": dsList
        // }
        var options = {
            // XXX Later we will use the commented code above
            "targetName": targetName,
            "path": pathList[0],
            "format": formatList[0],
            "recursive": recursiveList[0]
        };
        setHistoryPath();

        clearAll();
        DSPreview.show(options);
    }

    function searchFiles(searchKey, type) {
        var $input = $("#fileBrowserSearch input").removeClass("error");
        FilePreviewer.close();
        try {
            var regEx = null;
            if (searchKey != null) {
                var fullTextMatch = false;
                if (type == null) {
                    // Do a regular text search
                    searchKey = xcHelper.escapeRegExp(searchKey);
                } else {
                    switch (type) {
                        case ("regMatch"):
                            fullTextMatch = true;
                            break;
                        case ("regContain"):
                            // Do nothing as it is a "contain" already
                            break;
                        case ("globMatch"):
                            fullTextMatch = true;
                        case ("globContain"):
                            searchKey = xcHelper.escapeRegExp(searchKey);
                            searchKey = searchKey.replace(/\\\*/g, ".*");
                            break;
                        default:
                            console.error("File search type not supported");
                            break;
                    }
                }
                if (fullTextMatch) {
                    // Add ^ and $ for full text match
                    searchKey = xcHelper.fullTextRegExKey(searchKey);
                }
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
        $option.siblings(".select").each(function() {
            var $currOpt = $(this);
            $currOpt.removeClass("select");
            toggleSortIcon($currOpt.find(".icon").eq(0), true);
        });
        $option.addClass("select");
        toggleSortIcon($option.find(".icon").eq(0));

        reverseSort = false;
        sortFilesBy(key, sortRegEx);

        if (isFromSortOption) {
            $fileBrowserMain.find(".titleSection .title").each(function() {
                var $title = $(this);
                var $icon = $title.find(".icon").eq(0);
                if ($title.data("sortkey") === key) {
                    $title.addClass("select");
                    toggleSortIcon($icon);
                } else {
                    $title.removeClass("select");
                    toggleSortIcon($icon, true);
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
        } else if (key === "cdate") {
            if (!(files.length > 0 && files[0].attr && files[0].attr.ctime)) {
                // If files have no ctime
                return;
            }
            // sort by ctime
            files.sort(function(a, b) {
                return (a.attr.ctime - b.attr.ctime);
            });
        } else if (key === "mdate") {
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
            $anchor = null;
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
            selectSingleFile($grid);
            updateSelectedFiles($grid);
            $anchor = $grid;

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
    function genDateHtml(fileTime, type) {
        var time = moment(fileTime * 1000);
        var date = time.calendar();
        dateTip = xcTimeHelper.getDateTip(time);
        return '<div class="fileDate ' + type + '">' +
                    '<span ' + dateTip + '>' +
                        date +
                    '</span>' +
                '</div>';

    }
    function getHTMLFromFiles(files) {
        var html = '<div class="sizer"></div>';
            // used to keep file position when
            // files before it are hidden
        var hasCtime = false;
        for (var i = 0, len = files.length; i < len; i++) {
            // fileObj: {name, attr{isDirectory, size}}
            var fileObj = files[i];
            var isDirectory = fileObj.attr.isDirectory;
            var name = fileObj.name;
            var ctime = fileObj.attr.ctime;
            var mtime = fileObj.attr.mtime; // in untix time
            var isSelected = fileObj.isSelected;

            if (isDirectory && (name === '.' || name === '..')) {
                continue;
            }

            var visibilityClass = " visible";
            if (len > lowerFileLimit && i > 200) {
                visibilityClass = "";
            }

            var gridClass = isDirectory ? "folder" : "ds";
            var iconClass = isDirectory ? "xi-folder" : "xi-documentation-paper";
            var size = isDirectory ? "" :
                        xcHelper.sizeTranslator(fileObj.attr.size);
            var escName = xcHelper.escapeDblQuoteForHTML(name);

            var selectedClass = isSelected ? " selected" : "";
            var ckBoxClass = isSelected ? "xi-ckbox-selected" : "xi-ckbox-empty";

            html +=
                '<div title="' + escName + '" class="' + gridClass +
                    visibilityClass + selectedClass + ' grid-unit" ' +
                    'data-index="' + i + '">' +
                    '<div class="checkBox">' +
                        '<i class="icon ' + ckBoxClass + '"></i>' +
                    '</div>' +
                    '<i class="gridIcon icon ' + iconClass + '"></i>' +
                    '<div class="label fileName" data-name="' + escName + '">' +
                        name +
                    '</div>';
            if (ctime) {
                hasCtime = true;
                html += genDateHtml(ctime, "ctime");
            }
            if (mtime) {
                html += genDateHtml(mtime, "mtime");
            }
            html += '<div class="fileSize">' + size + '</div></div>';
        }

        // this is faster than $container.html

        if (len === 0) {
            html += '<div class="hint">' + DSTStr.EmptyDirectory + '</div>';
        }
        document.getElementById('innerFileBrowserContainer').innerHTML = html;
        refreshEllipsis();
        refreshIcon();

        if (!hasCtime) {
            // Hide "Date Created" if the returned file obj has no such info
            $fileBrowser.find(".cdate:not(.fileInfo)").addClass("hideCdate");
            $("#fileBrowserSortMenu").find(".cdate").hide();
        } else {
            $fileBrowser.find(".cdate:not(.fileInfo)").removeClass("hideCdate");
            $("#fileBrowserSortMenu").find(".cdate").show();
        }

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

    function refreshIcon() {
        var isListView = $fileBrowserMain.hasClass("listView");
        $container.find(".grid-unit.ds .icon").each(function() {
            var $icon = $(this);
            var name = $icon.next().data("name");
            var fileType = xcHelper.getFormat(name);
            if (fileType && listFormatMap.hasOwnProperty(fileType) &&
                gridFormatMap.hasOwnProperty(fileType)) {
                $icon.removeClass();
                $icon.addClass("gridIcon icon");
                if (isListView) {
                    // Change icons to listView version
                    $icon.addClass(listFormatMap[fileType]);
                } else {
                    // Change icons to gridView version
                    $icon.addClass(gridFormatMap[fileType]);
                }
            }
        });
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

        $innerContainer.find(".label").each(function() {
            var $label = $(this);
            var name = $label.data("name");
            xcHelper.middleEllipsis(name, $label, maxChar, maxWidth,
                                     !isListView, ctx);
        });
    }
    function refreshFileListEllipsis($fileName) {
        var maxChar = 38;
        var maxWidth = 280;
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        ctx.font = '700 13px Open Sans';
        if ($fileName && $fileName.length > 0) {
            var name = $fileName.text();
            xcHelper.middleEllipsis(name, $fileName, maxChar, maxWidth,
                                    false, ctx);
        } else {
            $selectedFileList.find("span").each(function() {
                var $span = $(this);
                var name = $span.text();
                xcHelper.middleEllipsis(name, $span, maxChar, maxWidth,
                                        false, ctx);
            });
        }
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
                    // Clean selected files in browser and the selectedFileList
                    cleanContainer();
                    $selectedFileList.empty();
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
        var containerHeight = $containerWrapper.height();
        var scrollTop = $containerWrapper.scrollTop();

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

                $containerWrapper.scrollTop(newScrollTop);
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
                $containerWrapper.scrollTop(scrollTop + (iconBottom - containerHeight));
            } else if (iconOffsetTop < 0) {
                $containerWrapper.scrollTop(scrollTop + iconOffsetTop);
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

    function toggleSortIcon($icon, restoreDefault) {
        if (restoreDefault) {
            // If restore to non-sorted
            $icon.removeClass("xi-arrow-up xi-arrow-down fa-8");
            $icon.addClass("xi-sort fa-15");
        } else if ($icon.hasClass("xi-arrow-up")) {
            // ascending > descending
            $icon.removeClass("xi-sort xi-arrow-up fa-15");
            $icon.addClass("xi-arrow-down fa-8");
        } else {
            // Two cases: 1.first time sort & 2.descending > ascending
            $icon.removeClass("xi-sort xi-arrow-down fa-15");
            $icon.addClass("xi-arrow-up fa-8");
        }
    }

    function updateActiveFileInfo($grid) {
        if (!$grid) {
            $infoContainer.find(".fileName").text("--");
            $infoContainer.find(".fileType").text("--");
            $infoContainer.find(".mdate .content").text("--");
            $infoContainer.find(".cdate .content").text("--");
            $infoContainer.find(".fileSize .content").text("--");
            $infoContainer.find(".fileIcon").removeClass()
                          .addClass("icon fileIcon xi-folder");
            $container.find(".filePathBottom .content").text("");
            return;
        }
        var index = Number($grid.data("index"));
        var file = curFiles[index];
        var name = file.name;
        var path = getCurrentPath() + name;
        var mTime = moment(file.attr.mtime * 1000).format("h:mm:ss A ll");
        var cTime = file.attr.ctime ?
                    moment(file.attr.ctime * 1000).format("h:mm:ss A ll") :
                    "--";
        var isFolder = file.attr.isDirectory;
        var size = isFolder ? "--" : xcHelper.sizeTranslator(file.attr.size);
        var fileType = isFolder ? "Folder" : xcHelper.getFormat(name);
        var $fileIcon = $infoContainer.find(".fileIcon").eq(0);

        // Update file name & type
        if (name.length > 30) {
            name = name.substring(0, 30) + "...";
        }
        $infoContainer.find(".fileName").text(name);
        if (!fileType) {
            // Unknown type
            fileType = "File";
        }
        $infoContainer.find(".fileType").text(fileType);

        // Update file icon
        $fileIcon.removeClass();
        if (isFolder) {
            $fileIcon.addClass("xi-folder");
        } else if (fileType && listFormatMap.hasOwnProperty(fileType) &&
                gridFormatMap.hasOwnProperty(fileType)) {
            $fileIcon.addClass(gridFormatMap[fileType]);
        } else {
            $fileIcon.addClass("xi-documentation-paper");
        }
        $fileIcon.addClass("icon fileIcon");

        // Update file info
        $infoContainer.find(".mdate .content").text(mTime);
        $infoContainer.find(".cdate .content").text(cTime);
        $infoContainer.find(".fileSize .content").text(size);
        // Update bottom file path
        $container.find(".filePathBottom .content").text(path);
    }
    function selectMultiFiles($curActiveGrid) {
        var startIndex;
        if (!$anchor) {
            startIndex = 0;
        } else {
            startIndex = $anchor.data("index");
        }
        var endIndex = $curActiveGrid.data("index");
        var $grids;
        if (startIndex > endIndex) {
            $grids = $container.find(".grid-unit")
                               .slice(endIndex, startIndex + 1);
        } else {
            $grids = $container.find(".grid-unit").slice(startIndex, endIndex);
        }
        $grids.addClass("selected");
        checkCkBox($grids.find(".checkBox .icon"));

        $curActiveGrid.addClass('active selected');
        updateActiveFileInfo($curActiveGrid);
        checkCkBox($curActiveGrid.find(".checkBox .icon"));

        if (FilePreviewer.isOpen()) {
            previewDS($grid);
        }
    }
    function createListElement($grid) {
        var index = $grid.data("index");
        var file = curFiles[index];
        file.isSelected = true;
        var name = file.name;
        var escName = xcHelper.escapeDblQuoteForHTML(name);
        var isFolder = file.attr.isDirectory;
        var fileType = isFolder ? "Folder" : xcHelper.getFormat(name);
        var fileIcon;
        // XXX Need to be changed after search is implemented
        var curDir = getCurrentPath();
        var escDir = xcHelper.escapeDblQuoteForHTML(curDir);

        return '<li data-name="' + escName + '" data-path="' + escDir + '">' +
                    '<i class="icon xi-close close"></i>' +
                    '<i class="icon xi-ckbox-selected"></i>' +
                    '<span>' + curDir + name + '</span>' +
                '</li>';


    }
    function updateSelectedFiles($grid, isRemove) {
        // Use cases:
        // 1. Update based on selected class
        // 2. Remove one file
        // 3. Append one file
        var html = "";
        if (!$grid || $grid.length === 0) {
            // No specific file passed in, update the entire list
            $selectedFileList.empty();
            $innerContainer.find(".selected").each(function() {
                html += createListElement($(this));
            });
            $selectedFileList.append(html);
            refreshFileListEllipsis();
        } else {
            var name = $grid.find(".fileName").data("name");
            var path = getCurrentPath();
            var escPath = xcHelper.escapeDblQuoteForHTML(path);
            if (isRemove) {
                $selectedFileList.find('li[data-name="' + name + '"]' +
                                           '[data-path="' + escPath + '"]').remove();
            } else if ($selectedFileList.find('li[data-name="' + name + '"]' +
                                    '[data-path="' + escPath + '"]').length === 0) {
                // If it doesn't exist, append the file
                html += createListElement($grid);
                var $span = $(html).appendTo($selectedFileList).find("span");
                refreshFileListEllipsis($span);
            }
        }
    }
    function selectSingleFile($grid) {
        $grid.addClass('active selected');
        updateActiveFileInfo($grid);
        checkCkBox($grid.find(".checkBox .icon"));

        if (FilePreviewer.isOpen()) {
            previewDS($grid);
        }
    }
    function unselectSingleFile($grid) {
        if ($grid.length > 0) {
            curFiles[$grid.data("index")].isSelected = false;
            if ($grid.hasClass("active")) {
                // If it is an active file, remove file info
                updateActiveFileInfo();
            }
            $grid.removeClass("selected active");
            uncheckCkBox($grid.find(".checkBox .icon"));
        }
    }
    function checkCkBox($checkBox) {
        $checkBox.removeClass("xi-ckbox-empty").addClass("xi-ckbox-selected");
    }
    function uncheckCkBox($checkBox) {
        $checkBox.removeClass("xi-ckbox-selected").addClass("xi-ckbox-empty");
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
        FileBrowser.__testOnly__.submitForm = submitForm;
        FileBrowser.__testOnly__.showScrolledFiles = showScrolledFiles;
        FileBrowser.__testOnly__.applySearchPattern = applySearchPattern;
    }
    /* End Of Unit Test Only */

    return (FileBrowser);
}(jQuery, {}));

window.FileBrowser = (function($, FileBrowser) {
    var $modalBg         = $("#modalBackground");
    var $fileBrowser     = $("#fileBrowserModal");
    var $container       = $("#fileBrowserContainer");
    var $fileBrowserMain = $("#fileBrowserMain");
    var $fileName        = $("#fileBrowserInputName");

    var $formatSection = $("#fileBrowserFormat");

    var $pathSection = $("#fileBrowserPath");
    var $pathLists   = $("#fileBrowserPathMenu");
    var $pathLabel   = $pathSection.find(".text");

    var $sortSection = $("#fileBrowserSort");
    var $sortMenu    = $("#fileBrowserSortMenu");

    var $filePath = $("#filePath");

    /* Contants */
    var defaultNFSPath  = "nfs:///";
    var defaultFilePath = "file:///";
    var defaultSortKey  = "type"; // default is sort by type;
    var formatMap = {
        "JSON": "JSON",
        "CSV" : "CSV",
        "XLSX": "Excel"
    };
    var minWidth  = 690;
    var minHeight = 400;
    /* End Of Contants */

    var defaultPath = defaultFilePath;
    var historyPath;
    var curFiles = [];
    var allFiles = [];
    var sortKey  = defaultSortKey;
    var sortRegEx;
    var reverseSort = false;

    var modalHelper = new xcHelper.Modal($fileBrowser, {
        "minHeight": minHeight,
        "minWidth" : minWidth
    });

    FileBrowser.show = function() {
        modalHelper.setup();

        if (gMinModeOn) {
            $modalBg.show();
            $fileBrowser.show().focus();
        } else {
            $modalBg.fadeIn(300, function() {
                $fileBrowser.fadeIn(180).focus();
            });
        }

        var openingBrowser = true;
        retrievePaths($filePath.val(), openingBrowser)
        .then(function(result) {
            showHandler(result);
        })
        .fail(function(result) {
            closeAll();
            StatusBox.show(result.error, $filePath, true);
        });

        $(document).on("keydown.fileBrowser", function(event) {
            // up to parent folder
            var $target = $(event.target);
            if (event.which === keyCode.Backspace) {
                if ($target.is("input") ||
                    ($target.is("div") && $target.prop("contenteditable")))
                {
                    return true;
                }
                $("#fileBrowserUp").click();
                return false;
            }

            if (event.which === keyCode.Left ||
                event.which === keyCode.Right ||
                event.which === keyCode.Up ||
                event.which === keyCode.Down) {
                if (!$target.is("input")) {
                    keyBoardNavigate(event.which, event);
                }
            }
        });

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
            if ($nextIcon && $nextIcon.length) {
                $nextIcon.click();
                scrollIconIntoView($nextIcon, isGridView);
                event.preventDefault();
            }
        }

        function findVerticalIcon($curIcon, code) {
            var iconHeight = 79;
            var curIconTop = $curIcon.position().top;
            var curIconLeft = $curIcon.position().left;
            var targetTop;
            var $targetIcon;
            if (code === keyCode.Up) {
                targetTop = curIconTop - iconHeight;
                $curIcon.prevAll().each(function() {
                    if ($(this).position().left === curIconLeft &&
                        $(this).position().top === targetTop) {
                        $targetIcon = $(this);
                        return false;
                    } else if ($(this).position().top < targetTop) {
                        return false;
                    }
                });
            } else if (code === keyCode.Down) {
                targetTop = curIconTop + iconHeight;
                var moreRowsExist = false;
                $curIcon.nextAll().each(function() {
                    if ($(this).position().top === targetTop) {
                        moreRowsExist = true;
                        if ($(this).position().left === curIconLeft) {
                            $targetIcon = $(this);
                            return false;
                        }
                    } else if ($(this).position().top > targetTop) {
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
            var iconHeight = isGridView ? 79 : 30;
            var containerHeight = $container.height();
            var scrollTop = $container.scrollTop();
            var iconOffsetTop = $icon.position().top;
            var iconBottom = iconOffsetTop + iconHeight;
            // var containerBottom = scrollTop + containerHeight;
            // if (iconBottom > containerBottom) {
            if (iconBottom > containerHeight) {
                // $container.scrollTop(iconOffsetTop +  - (containerHeight / 2));
                // $container.scrollTop(scrollTop + (iconBottom - containerBottom));
                $container.scrollTop(scrollTop + (iconBottom - containerHeight));
                // $container.scrollTop(iconBottom);
            } else if (iconOffsetTop < 0) {
                $container.scrollTop(scrollTop + iconOffsetTop);
            }

            // else if (iconBottom < scrollTop) {
            //     $container.scrollTop(iconOffsetTop + iconHeight - (containerHeight / 2));
            // }
        }

        function showHandler(result) {
            Tips.refresh();

            if (result.defaultPath) {
                setTimeout(function() {
                    var msg = ErrorTextWReplaceTStr.NoPath
                                .replace("<path>", result.path);
                    StatusBox.show(msg, $pathSection, false, 0,
                                   {side: 'top'});
                }, 40);
            }

            // press enter to import a dataset
            // Note: use time out beacuse if you press browser button to open the
            // modal, it will trigger keyup event, so delay the event here
            // may have bettter way to solve it..
            setTimeout(function() {
                $(document).on("keyup.fileBrowser", function(event) {
                    if (event.which === keyCode.Enter && !modalHelper.checkBtnFocus()) {
                        var $grid = $container.find(".grid-unit.active");
                        importDataset($grid);
                    }

                    return false;
                });
            }, 300);
        }
    };

    FileBrowser.setup = function() {
        $fileBrowser.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        $fileBrowser.resizable({
            "handles"    : "n, e, s, w, se",
            "minHeight"  : minHeight,
            "minWidth"   : minWidth,
            "containment": "document"
        });


        // click blank space to remove foucse on folder/dsds
        $fileBrowser.on("click", function() {
            clear();
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
                    })
                    .fail(function(error) {
                        Alert.error("List File Failed", error);
                    });
                }
            }
        }, ".grid-unit");

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

        $("#fileBrowserNFS").click(function() {
            var $checkbox = $(this).find(".checkbox");
            var useNFS;

            if ($checkbox.hasClass("checked")) {
                $checkbox.removeClass("checked");
                useNFS = false;
            } else {
                $checkbox.addClass("checked");
                useNFS = true;
            }

            toggleNFS(useNFS);
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
            // the second option in pathLists
            var $newPath = $pathLists.find("li").eq(1);

            event.stopPropagation();
            goToPath($newPath);
        });

        // toggle between listview and gridview
        $("#fileBrowserGridView").click(function(event){
            event.stopPropagation();
            toggleView(null, true);
        });

        // restore list view if saved
        var settings = UserSettings.getSettings();
        if (settings.browserListView) {
            toggleView(true, false);
        }

        // click on title to sort
        $fileBrowserMain.on("click", ".title.clickable", function(event) {
            var $title = $(this);

            event.stopPropagation();
            // click on selected title, reverse sort
            if ($title.hasClass("select")) {
                reverseFiles();
            } else {
                sortAction($title, false);
            }
        });

        // toggle sort menu, should use mousedown for toggle
        $sortSection.on({
            "mousedown": function(event){
                event.stopPropagation();
                $sortMenu.toggle();
            },
            // prevent clear event to be trigger
            "click": function(event) {
                event.stopPropagation();
            }
        }, ".icon, .dropdownBox");

        // click sort option to sort
        $sortSection.on("click", "li", function(event) {
            var $li = $(this);

            event.stopPropagation();
            $sortMenu.hide();
            // already sort
            if (!$li.hasClass("select")) {
                sortAction($li, true);
            }
        });

        xcHelper.dropdownList($pathSection, {
            "onlyClickIcon": true,
            "onSelect"     : goToPath,
            "container"    : "#fileBrowserModal"
        });

        var timer;
        $pathSection.on({
            // contentediable must prevent press enter to add a new line
            "keypress": function(event) {
                if (event.which === keyCode.Enter) {
                    event.preventDefault();
                    return false;
                }
            },
            "keyup": function(event) {
                // assume what inputed should be a path
                var $input = $(this);
                var path = $input.text();
                event.preventDefault();

                clearTimeout(timer);

                var key = event.which;
                if (key === keyCode.Up || key === keyCode.Down ||
                    key === keyCode.Left || key === keyCode.Right)
                {
                    return true;
                }

                timer = setTimeout(function() {
                    if (path.charAt(path.length - 1) !== "/") {
                        path += "/";
                    }

                    if (key === keyCode.Backspace && path === getCurrentPath()) {
                        // when it's backsapce and
                        // the input path is still equal to current path
                        // do not retrievePath
                        return;
                    }

                    retrievePaths(path)
                    .then(function() {
                        $input.focus();
                        xcHelper.createSelection($input[0], true);
                    });
                }, 400);

                return false;
            }
        }, ".text");

        xcHelper.dropdownList($formatSection, {
            "onSelect" : formatSectionHandler,
            "container": "#fileBrowserModal"
        });

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
    };

    function toggleView(toListView, refreshTooltip) {
        var $btn = $("#fileBrowserGridView");
        if (toListView == null) {
            // if current is gridView, change to listView;
            toListView = $fileBrowserMain.hasClass("gridView");
        }

        if (toListView) {
            $fileBrowserMain.removeClass("gridView")
                            .addClass("listView");
            $btn.removeClass("gridView")
                .addClass("listView")
                .attr("data-original-title", "Switch to Grid View");
        } else {
            // change to grid view
            $fileBrowserMain.removeClass("listView")
                            .addClass("gridView");
            $btn.removeClass("listView")
                .addClass("gridView")
                .attr("data-original-title", "Switch to List View");
        }

        centerUnitIfHighlighted(toListView);

        if (refreshTooltip) {
            // refresh tooltip
            $btn.mouseenter();
            $btn.mouseover();
        }
    }

    // centers a grid-unit if it is highlighted
    function centerUnitIfHighlighted(isListView) {
        var unitHeight = isListView ? 30 : 79;
        var $unit = $container.find('.grid-unit.active');
        if ($unit.length) {
            var unitOffSetTop = $unit.position().top;
            var containerHeight = $container.height();
            var scrollTop = $container.scrollTop();
            // var scrollTop = $container.scrollTop();
            // $container.scrollTop((containerHeight / 2) + unitOffSetTop);
            $container.scrollTop(scrollTop + unitOffSetTop -
                                 ((containerHeight - unitHeight) / 2));
        }

    }

    function getCurrentPath() {
        return ($pathLists.find("li:first-of-type").text());
    }

    function getGridUnitName($grid) {
        return ($grid.find('.label').text());
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
        var index = name.lastIndexOf(".");
        // Also, we need to strip special characters. For now,
        // we only keeo a-zA-Z0-9. They can always add it back if they want

        if (index >= 0) {
            name = name.substring(0, index);
        }

        name = name.replace(/[^a-zA-Z0-9]/g, "");
        var originalName = name;

        var limit = 20; // we won't try more than 20 times
        if (DS.has(name)) {
            var validNameFound = false;
            for (var i = 1; i <= limit; i++) {
                name = originalName + i;
                if (!DS.has(name)) {
                    validNameFound = true;
                    break;
                }
            }
            if (!validNameFound) {
                var tries = 0;
                while (DS.has(name) && tries < 100) {
                    name = xcHelper.randName(name, 4);
                    tries++;
                }
            }
        }

        return (name);
    }

    function appendPath(path) {
        $pathLabel.text(path);
        $pathLists.prepend("<li>" + path + "</li>");
    }

    function clear(isALL) {
        var $dropDownLists = $fileBrowser.find(".dropDownList");

        $fileBrowser.find(".active").removeClass("active");

        $dropDownLists.removeClass("open")
                        .find(".list").hide();

        $fileName.val("");

        if (isALL) {
            $fileBrowser.find(".select").removeClass("select");
            $formatSection.find(".text").text("all");
            curFiles = [];
            sortKey = defaultSortKey;
            sortRegEx = undefined;
            reverseSort = false;
            $pathLists.empty();
        }
    }

    function closeAll() {
        // set to deault value
        clear(true);
        modalHelper.clear();
        $(document).off(".fileBrowser");

        var fadeOutTime = gMinModeOn ? 0 : 300;

        $fileBrowser.hide();
        $modalBg.fadeOut(fadeOutTime, function() {
            Tips.refresh();
        });
    }

    function toggleNFS(useNFS) {
        var currentPath = getCurrentPath();
        var path;

        if (useNFS) {
            defaultPath = defaultNFSPath;
            path = currentPath.replace(defaultFilePath, defaultNFSPath);
        } else {
            defaultPath = defaultFilePath;
            path = currentPath.replace(defaultNFSPath, defaultFilePath);
        }
        historyPath = null;
        retrievePaths(path);
    }

    function updateFileName($grid) {
        var name = getGridUnitName($grid);
        $fileName.val(name);
    }

    function listFiles(path, openingBrowser) {
        var deferred = jQuery.Deferred();
        var $loadSection = $fileBrowserMain.find(".loadingSection");

        $fileBrowser.addClass("loadMode");
        var timer = setTimeout(function() {
            $loadSection.show();
        }, 500);

        XcalarListFiles(path)
        .then(function(listFilesOutput) {
            clear();
            allFiles = listFilesOutput.files;
            sortFilesBy(sortKey, sortRegEx);
            deferred.resolve();
        })
        .fail(function(error) {
            if (openingBrowser) {
                listFiles(defaultPath)
                .then(function() {
                    deferred.resolve('useDefaultPath');
                })
                .fail(function(err) {
                    deferred.reject(err);
                });
            } else {
                deferred.reject(error);
            }
        })
        .always(function() {
            $fileBrowser.removeClass("loadMode");
            clearTimeout(timer);
            $loadSection.hide();
        });

        return (deferred.promise());
    }

    function goToPath($newPath) {
        if ($newPath == null || $newPath.length === 0) {
            return;
        }
        var oldPath = getCurrentPath();
        var path    = $newPath.text();

        // if (oldPath === path) {
        //     return;
        // }

        listFiles(path)
        .then(function() {
            $pathLabel.text(path);
            $pathLists.find("li").removeClass("select");
            $newPath.addClass("select");
            var $preLists = $newPath.prevAll();

            // find the parent folder and focus on it
            var folder = oldPath.substring(path.length, oldPath.length);
            folder = folder.substring(0, folder.indexOf('/'));
            focusOn(folder);
            // remove all previous siblings
            $preLists.remove();
        })
        .fail(function(error) {
            Alert.error("List file fails", error);
        });
    }

    function importDataset($ds) {
        var fileName = $fileName.val();

        if (($ds == null || $ds.length === 0) && fileName !== "") {
            StatusBox.show(ErrorTextTStr.InvalidFileName, $fileName, true);
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

        var path = curDir + fileName;
        $filePath.val(path);
        $("#fileName").val(getShortName(fileName));

        xcHelper.enableSubmit($confirmBtn);
        closeAll();
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
            $sortMenu.find("li").each(function() {
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
        if (allFiles.length === 0) {
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

    function filterFiles(files, regEx) {
        var result = [];

        for (var i = 0, len = files.length; i < len; i++) {
            var fileObj = files[i];
            var name    = fileObj.name;
            // not filter folder
            if (fileObj.attr.isDirectory || regEx.test(name) === true) {
                result.push(fileObj);
            }
        }
        return (result);
    }

    function sortFiles(files, key) {
        var sortedFiles = [];
        var resultFiles = [];

        if (key === "size") {
            var folders = [];

            files.forEach(function(file) {
                // folders sort by name
                if (file.attr.isDirectory) {
                    folders.push([file, file.name]);
                } else {
                    sortedFiles.push([file, file.attr.size]);
                }
            });

            folders.sort(function(a, b) {
                return (a[1].localeCompare(b[1]));
            });
            sortedFiles.sort(function(a, b) {
                return (a[1] - b[1]);
            });

            folders.forEach(function(file) {
                resultFiles.push(file[0]);
            });
            sortedFiles.forEach(function(file) {
                resultFiles.push(file[0]);
            });
        } else {
            // not sort by size, first sort by name
            files.forEach(function(file) {
                sortedFiles.push([file, file.name]);
            });
            sortedFiles.sort(function(a, b) {
                return (a[1].localeCompare(b[1]));
            });
            if (key === "type") {
                var dirFile        = [];
                var fileWithoutExt = [];  // file with on extention
                var fileWithExt    = [];   // file with extention

                sortedFiles.forEach(function(file) {
                    var name = file[1];
                    var sortedFile = file[0];
                    if (sortedFile.attr.isDirectory === true) {
                        dirFile.push(sortedFile);
                    } else {
                        if (name.indexOf(".") >= 0) {
                            fileWithExt.push(sortedFile);
                        } else {
                            fileWithoutExt.push(sortedFile);
                        }
                    }
                    resultFiles = dirFile.concat(fileWithoutExt)
                                        .concat(fileWithExt);
                });
            } else {
                sortedFiles.forEach(function(file) {
                    resultFiles.push(file[0]);
                });
            }
        }

        return (resultFiles);
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

            if (!noEdit) {
                $fileName.val(grid);
            }
        } else {
            var name = grid.name;
            var type = grid.type;

            if (type == null) {
                str = '.grid-unit' + ' .label[data-name="' + name + '"]';
            } else {
                str = '.grid-unit.' + type + ' .label[data-name="' + name + '"]';
            }

            if (!noEdit) {
                $fileName.val(name);
            }
        }

        $container.find(".grid-unit").removeClass("active");
        var $grid = $container.find(str).eq(0).closest('.grid-unit');
        if ($grid.length > 0) {
            $grid.addClass('active');
            if (!noEdit) {
                updateFileName($grid);
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

    function retrievePaths(path, openingBrowser) {
        var deferred = jQuery.Deferred();
        var paths = [];
        var status = {};
        if (!path) {
            path = historyPath || defaultPath;
        }
        // parse path
        for (var i = path.length - 1; i >= (defaultPath.length - 1); i--) {
            if (path.charAt(i) === "/") {
                paths.push(path.substring(0, i + 1));
            }
        }
        // cannot parse the path
        if (paths.length === 0) {
            if (openingBrowser) {
                paths.push(defaultPath);
                status.path = path;
                status.defaultPath = true;
            } else {
                var error = "Invalid Path, please input a valid one";
                deferred.reject({"error": error});

                return (deferred.promise());
            }
        }

        listFiles(paths[0], openingBrowser)
        .then(function(result) {
            if (result === 'useDefaultPath') {
                status.defaultPath = true;
                status.path = path;
                path = defaultPath;
                paths = [path];
            }
            $pathLists.empty();

            for (var j = paths.length - 1; j >= 0; j--) {
                appendPath(paths[j]);
            }
            // focus on the grid specified by path
            if (path) {
                var name = path.substring(path.lastIndexOf("/") + 1,
                                            path.length);
                focusOn({"name": name});
            }

            deferred.resolve(status);
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function getHTMLFromFiles(files) {
        var html = "";

        files.forEach(function(fileObj) {
            // fileObj: {name, attr{isDirectory, size}}
            var isDirectory = fileObj.attr.isDirectory;
            var name = fileObj.name;

            if (isDirectory && (name === '.' || name === '..')) {
                return;
            }

            var size = isDirectory ? "" :
                        xcHelper.sizeTranslater(fileObj.attr.size);
            var gridClass = isDirectory ? "folder" : "ds";
            var date = "00:00:00 01-01-2015";

            html +=
                '<div title="' + name + '" class="' + gridClass + ' grid-unit">' +
                    '<div class="gridIcon"></div>' +
                    '<div class="listIcon">' +
                        '<span class="icon"></span>' +
                    '</div>' +
                    '<div class="label" data-name=' + name + '>' +
                        name +
                    '</div>' +
                    '<div class="fileDate">' + date + '</div>' +
                    '<div class="fileSize">' + size + '</div>' +
                '</div>';
        });

        $container.empty().append(html);
    }

    return (FileBrowser);
}(jQuery, {}));

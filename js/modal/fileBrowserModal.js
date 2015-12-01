window.FileBrowser = (function($, FileBrowser) {
    var $modalBackground = $('#modalBackground');
    var $fileBrowser     = $('#fileBrowserModal');
    var $container       = $("#fileBrowserContainer");
    var $fileBrowserMain = $('#fileBrowserMain');
    var $fileName        = $('#fileBrowserInputName');

    var $formatSection = $('#fileBrowserFormat');

    var $pathSection   = $("#fileBrowserPath");
    var $pathLists     = $("#fileBrowserPathMenu");
    var $pathLabel     = $pathSection.find('.text');

    var $sortSection   = $("#fileBrowserSort");
    var $sortMenu      = $("#fileBrowserSortMenu");

    var $loadSection   = $fileBrowserMain.find(".loadingSection");

    var $filePath      = $("#filePath");

    /* Contants */
    var defaultPath    = "file:///";
    var defaultSortKey = "type"; // default is sort by type;
    var formatMap = {
        "JSON": "JSON",
        "CSV" : "CSV",
        "XLSX": "Excel"
    };
    var minWidth  = 590;
    var minHeight = 400;
    /* End Of Contants */
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
            $modalBackground.show().addClass("open");
            $fileBrowser.show().focus();
        } else {
            $modalBackground.fadeIn(300, function() {
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

        $(document).on("mousedown.fileBrowser", function() {
            xcHelper.hideDropdowns($fileBrowser);
        });

        $(document).on("keydown.fileBrowser", function(event) {
            // up to parent folder
            if (event.which === keyCode.Backspace) {
                var $target = $(event.target);
                if ($target.is("input") ||
                    ($target.is("div") && $target.prop("contenteditable")))
                {
                    return true;
                }
                $("#fileBrowserUp").click();
                return false;
            }
        });

        function showHandler(result) {
            Tips.refresh();

            if (result.defaultPath) {
                var msg = result.path + ' was not found. ' +
                        'Redirected to the root directory.';
                setTimeout(function() {
                    StatusBox.show(msg, $pathSection, false, 0,
                                   {side: 'top'});
                }, 40);
            }

            // press enter to import a dataset
            // XXX use time out beacuse if you press browser button to open the
            // modal, it will trigger keyup event, so delay the event here
            // may have bettter way to solve it..
            setTimeout(function() {
                $(document).on("keyup.fileBrowser", function(event) {
                    if (event.which === keyCode.Enter && !modalHelper.checkBtnFocus()) {
                        var $grid = $container.find('.grid-unit.active');
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
            handles    : "n, e, s, w, se",
            minHeight  : minHeight,
            minWidth   : minWidth,
            containment: "document"
        });


        // click blank space to remove foucse on folder/dsds
        $fileBrowser.on("click", function() {
            clear();
        });

        $container.on({
            // click to focus
            "click": function(event) {
                var $grid = $(this);

                event.stopPropagation();
                clear();

                updateFileName($grid);

                $grid.addClass('active');
            },
            "dblclick": function() {
                var $grid = $(this);

                if ($grid.hasClass('ds')) {
                    // dblclick a dataset to import
                    xcHelper.disableSubmit($fileBrowser.find('.confirm'));
                    importDataset($grid);
                } else {       // dblclick a folder
                    var path = getCurrentPath() + getGridUnitName($grid) + '/';

                    listFiles(path)
                    .then(function() {
                        appendPath(path);
                    })
                    .fail(function(error) {
                        Alert.error("List file fails", error);
                    });
                }
            }
        }, ".grid-unit");

        // confirm to open a ds
        $fileBrowser.on("click", ".confirm", function() {
            var $grid = $container.find(".grid-unit.active");
            xcHelper.disableSubmit($(this));
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

        // click icon-list to toggle between listview and gridview
        $("#fileBrowserGridView").click(function(event){
            var $btn = $(this);

            event.stopPropagation();

            if ($fileBrowserMain.hasClass('listView')) {
                $fileBrowserMain.removeClass('listView').addClass('gridView');
                $btn.removeClass('listView').addClass('gridView');
                $btn.attr('data-original-title', 'Switch to List view');
            } else {
                selectListView();
            }
            // refresh tooltip
            $btn.mouseenter();
            $btn.mouseover();
        });

        // restore list view if saved
        var settings = UserSettings.getSettings();
        if (settings.browserListView) {
            selectListView();
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
        }, " .icon, .dropdownBox");

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
                // XXX assume what inputed should be a path
                var $input = $(this);
                var path = $input.text();
                event.preventDefault();

                clearTimeout(timer);
                timer = setTimeout(function() {
                    if (path.charAt(path.length - 1) !== "/") {
                        path += "/";
                    }

                    retrievePaths(path)
                    .then(function() {
                        $input.focus();
                        xcHelper.createSelection($input[0], true);
                    });
                }, 400);

                return false;
            },
            "focus": function() {
                $(this).text($(this).text());
            }
        }, ".text");

        var formatListScroller = new ListScroller($formatSection.find('.list'));

        xcHelper.dropdownList($formatSection, {
            "onSelect" : formatSectionHandler,
            "onOpen": function() {
                return (formatListScroller.showOrHideScrollers());
            },
            "container": "#fileBrowserModal"
        });

        $fileName.keyup(function() {
            var text = $(this).val();

            focusOn(text, true);
        });

        $fileName.click(function() {
            return false;
        });
    };

    function selectListView() {
        var $btn = $("#fileBrowserGridView");
        $fileBrowserMain.removeClass('gridView').addClass('listView');
        $btn.removeClass('gridView').addClass('listView');
        $btn.attr('data-original-title', 'Switch to Grid view');
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
        return (name.replace(/[^a-zA-Z0-9]/g, ""));
    }

    function appendPath(path) {
        $pathLabel.text(path);
        $pathLists.prepend('<li>' + path + '</li>');
    }

    function clear(isALL) {
        var $dropDownLists = $fileBrowser.find('.dropDownList');

        $fileBrowser.find('.active').removeClass('active');

        $dropDownLists.removeClass("open")
                        .find(".list").hide();

        $fileName.val("");

        if (isALL) {
            $fileBrowser.find('.select').removeClass('select');
            $formatSection.find('.text').text('all');
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
        xcHelper.enableSubmit($fileBrowser.find('.confirm'));

        var fadeOutTime = gMinModeOn ? 0 : 300;

        $fileBrowser.hide();
        $modalBackground.fadeOut(fadeOutTime, function() {
            Tips.refresh();
        });
    }

    function updateFileName($grid) {
        var name = getGridUnitName($grid);

        $fileName.val(name);
    }

    function listFiles(path, openingBrowser) {
        var deferred = jQuery.Deferred();

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
            var text = "Invalid file name!" +
                        " Please choose a file or folder to import!";

            StatusBox.show(text, $fileName, true);
            xcHelper.enableSubmit($fileBrowser.find('.confirm'));
            return;
        }

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
        $("#importDataForm").addClass("browseMode");
        closeAll();
    }

    function formatSectionHandler($li) {
        if ($li.hasClass('select')) {
            return;
        }

        var grid   = getFocusGrid();
        var format = $li.text();
        var regEx;

        $formatSection.find('.text').text(format);
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
        var len    = files.length;

        for (var i = 0; i < len; i++) {
            var fileObj = files[i];
            var name    = fileObj.name;
            // XXX not filter folder
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
    }

    function focusOn(grid, isAll) {
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

            $fileName.val(grid);
        } else {
            var name = grid.name;
            var type = grid.type;

            if (type == null) {
                str = '.grid-unit' + ' .label[data-name="' + name + '"]';
            } else {
                str = '.grid-unit.' + type + ' .label[data-name="' + name + '"]';
            }

            $fileName.val(name);
        }

        $container.find(".grid-unit").removeClass("active");
        var $grid = $container.find(str).eq(0).closest('.grid-unit');
        if ($grid.length > 0) {
            $grid.addClass('active');
            updateFileName($grid);
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
        var paths    = [];
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

            var size      = isDirectory ? "" :
                                xcHelper.sizeTranslater(fileObj.attr.size);
            var gridClass = isDirectory ? "folder" : "ds";
            var date      = "00:00:00 01-01-2015";

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

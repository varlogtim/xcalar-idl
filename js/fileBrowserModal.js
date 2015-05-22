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

    var $filePath      = $("#filePath");

    var modalHelper    = new xcHelper.Modal($fileBrowser);
    /* Contants */
    var defaultPath    = "file:///";
    var validFormats   = ["JSON", "CSV"];
    var defaultSortKey = "type"; // default is sort by type;
    /* End Of Contants */
    var curFiles    = [];
    var allFiles    = [];
    var sortKey     = defaultSortKey;
    var sortRegEx   = undefined;
    var reverseSort = false;

    FileBrowser.show = function() {
        retrievePaths($filePath.val())
        .then(function() {
            // set modal background
            $modalBackground.fadeIn(100, function() {
                Tips.refresh();
            });
            $modalBackground.addClass("open");
            xcHelper.removeSelectionRange();

            $fileBrowser.css({
                "left"  : 0,
                "right" : 0,
                "top"   : 0,
                "bottom": 0
            });
            $fileBrowser.show();
            $fileBrowser.focus();
            // press enter to import a dataset
            // XXX use time out beacuse if you press browser button to open the
            // modal, it will trigger keyup event, so delay the event here
            // may have bettter way to solve it..
            setTimeout(function() {
                $(document).on("keyup", fileBrowserKeyUp);
            }, 300);
            modalHelper.setup();
        })
        .fail(function(result) {
            closeAll();
            StatusBox.show(result.error, $filePath, true);
        });
    }

    FileBrowser.setup = function() {
        $fileBrowser.draggable({
                "handle": ".modalHeader",
                "cursor": "-webkit-grabbing"
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
        }, "grid-unit");

        // confirm to open a ds
        $fileBrowser.on("click", ".confirm", function() {
            var $grid = $container.find("grid-unit.active");

            importDataset($grid);
        });

        // close file browser
        $fileBrowser.on("click", ".close, .cancel", function() {
            closeAll();
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
                $fileBrowserMain.removeClass('gridView').addClass('listView');
                $btn.removeClass('gridView').addClass('listView');
                $btn.attr('data-original-title', 'Switch to Grid view');
            }
            // refresh tooltip
            $btn.mouseenter();
            $btn.mouseover();
        });

        // click on title to sort
        $fileBrowserMain.on("click", ".title.clickable", function(event) {
            var $title = $(this);
            var grid   = getFocusGrid();

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
                var path   = $input.text();

                event.preventDefault();

                clearTimeout(timer);
                timer = setTimeout(function() {
                    if (path.charAt(path.length - 1) != "/") {
                        path += "/";
                    }

                    retrievePaths(path)
                    .then(function() {
                        $input.focus();
                        setEndOfContenteditable($input[0]);
                    });
                }, 400);

                return false;
            },
            "focus": function() {
                console.log("fdas")
                $(this).text($(this).text());
            }
        }, ".text");

        xcHelper.dropdownList($formatSection, {
            "onSelect" : formatSectionHandler,
            "container": "#fileBrowserModal"
        });

        $fileName.keyup(function() {
            var text = $(this).val();

            focusOn(text, true);
        });

        $fileName.click(function() {
            return false;
        });
    }

    // key up event
    function fileBrowserKeyUp(event) {
        event.preventDefault();
        if (event.which === keyCode.Enter && !modalHelper.checkBtnFocus()) {
            var $grid = $container.find('grid-unit.active');
            importDataset($grid);
        }

        return false;
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
            return undefined;
        }

        var ext = name.substring(index + 1, name.length).toUpperCase();

        if (validFormats.indexOf(ext) >= 0) {
            return (ext);
        } else {
            return undefined;
        }
    }

    function appendPath(path) {
        $pathLabel.text(path);
        $pathLists.prepend('<li>' + path + '</li>');
    }

    function clear(isALL) {
        var $listSections = $fileBrowser.find('.listSection');

        $fileBrowser.find('.active').removeClass('active');

        $listSections.removeClass("open");
        $listSections.find(".list").hide();

        $fileName.val("");

        if (isALL) {
            $fileBrowser.find('.select').removeClass('select');
            $formatSection.find('.text').text('all');
            curFiles    = [];
            sortKey     = defaultSortKey;
            sortRegEx   = undefined;
            reverseSort = false;
            $pathLists.empty();
        }
    }

    function closeAll() {
        // set to deault value
        clear(true);
        modalHelper.clear();
        $(document).off('keyup', fileBrowserKeyUp);
        $fileBrowser.hide();
        $modalBackground.removeClass("open");
        $modalBackground.fadeOut(200, function() {
            Tips.refresh();
        });
    }

    function updateFileName($grid) {
        var name = getGridUnitName($grid);

        $fileName.val(name);
    }

    function listFiles(path) {
        var deferred = jQuery.Deferred();

        XcalarListFiles(path)
        .then(function(listFilesOutput) {
            clear();
            allFiles = listFilesOutput.files;
            sortFilesBy(sortKey, sortRegEx);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function goToPath($newPath) {
        if ($newPath == undefined || $newPath.length == 0) {
            return;
        }
        var oldPath = getCurrentPath();
        var path    = $newPath.text();

        if (oldPath === path) {
            return;
        }

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
        if ($ds == null || $ds.length == 0) {
            var text = "Invalid file name!" + 
                        " Please choose a file or folder to import!";

            StatusBox.show(text, $fileName, true);
            return;
        }
        // reset import data form
        $("#importDataReset").click();

        // no selected dataset, load the directory
        // if ($ds == null || $ds.length == 0) {
        //     var path = getCurrentPath();
        //     // remove the last slash
        //     if (path !== defaultPath) {
        //         path = path.substring(0, path.length - 1);
        //     }
        //     $filePath.val(path);
        // } else {
        // load dataset
        var dsName = getGridUnitName($ds);
        var path   = getCurrentPath() + dsName;
        var ext    = getFormat(dsName);

        if (ext != undefined) {
            $('#fileFormatMenu li[name="' + ext.toUpperCase() + '"]')
                .click();
        }
        $filePath.val(path);
        // }
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
            })
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
        if (allFiles.length == 0) {
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
        var filterFiles = [];
        var len         = files.length;

        for (var i = 0; i < len; i ++) {
            var fileObj = files[i];
            var name    = fileObj.name;
            // XXX not filter folder
            if (fileObj.attr.isDirectory || regEx.test(name) === true) {
                filterFiles.push(fileObj);
            }
        }
        return (filterFiles);
    }

    function sortFiles(files, key) {
        var sortedFiles = [];
        var resultFiles = [];

        if (key === "size") {
            var folders = [];

            files.forEach(function(file) {
                // folders sort by name
                if (file.attr.isDirectory) {
                    folders.push([file, file.name])
                } else {
                    sortedFiles.push([file, file.attr.size]);
                }
            });

            folders.sort(function(a, b) {return a[1].localeCompare(b[1])});
            sortedFiles.sort(function(a, b) {return a[1] - b[1]});

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
            sortedFiles.sort(function(a, b) {return a[1].localeCompare(b[1])});
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
        if (grid == undefined) {
            return;
        }

        var str;

        if (typeof grid === "string") {
            if (isAll) {
                str = 'grid-unit .label[data-name="' + grid + '"]'
            } else {
                str = 'grid-unit.folder .label[data-name="' + grid + '"]';
            }
        } else {
            var name = grid.name;
            var type = grid.type;

            if (type == undefined) {
                str = 'grid-unit' + ' .label[data-name="' + name + '"]';
            } else {
                str = 'grid-unit.' + type + ' .label[data-name="' + name + '"]';
            }
        }

        $container.find("grid-unit").removeClass("active");
        $container.find(str).eq(0).closest('grid-unit').addClass('active');
    }

    function getFocusGrid() {
        var $grid = $container.find('grid-unit.active');
        var grid;

        if ($grid.length > 0) {
            grid = {
                "name": $grid.find(".label").data("name"),
                "type": $grid.hasClass("folder") ? "folder" : "ds"
            };
        }

        return (grid);
    }

    function retrievePaths(path) {
        var deferred = jQuery.Deferred();
        var paths    = [];

        if (!path) {
            paths.push(defaultPath);
        } else {
            // parse path
            for (var i = path.length - 1; i >= (defaultPath.length - 1); i--) {
                if (path.charAt(i) === "/") {
                    paths.push(path.substring(0, i + 1));
                }
            }
            // cannot parse the path
            if (paths.length === 0) {
                var error = "Invalid Path, please input a valid one";

                deferred.reject({"error": error});

                return (deferred.promise());
            }
        }

        listFiles(paths[0])
        .then(function() {
            $pathLists.empty();

            for (var i = paths.length - 1; i >= 0; i --) {
                appendPath(paths[i]);
            }
            // focus on the grid specified by path
            if (path) {
                var name = path.substring(path.lastIndexOf("/") + 1,
                                            path.length);
                focusOn({"name": name});
            }

            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function sizeTranslater(size) {
        var unit  = ["B", "KB", "MB", "GB", "TB", "PB"];
        var start = 0;
        var end   = unit.length - 2;

        while (size >= 1024 && start <= end) {
            size = Math.ceil(size / 1024);
            ++start;
        }

        return (size + unit[start]);
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
                                          sizeTranslater(fileObj.attr.size);
            var gridClass = isDirectory ? "folder" : "ds";
            var date      = "00:00:00 01-01-2015";

            html += 
                '<grid-unit title="' + name + '" class="' + gridClass + '">' + 
                    '<div class="gridIcon"></div>' + 
                    '<div class="listIcon">' + 
                        '<span class="icon"></span>' + 
                    '</div>' + 
                    '<div class="label" data-name=' + name + '>' + 
                        name + 
                    '</div>' + 
                    '<div class="fileDate">' + date +'</div>' + 
                    '<div class="fileSize">' + size + '</div>' + 
                '</grid-unit>';
        });

        $container.empty().append(html);
    }

    // this function is from http://stackoverflow.com/questions/1125292/how-to-move-cursor-to-end-of-contenteditable-entity
    function setEndOfContenteditable(contentEditableElement) {
        var range;
        var selection;

        if (document.createRange) {
            //Firefox, Chrome, Opera, Safari, IE 9+
            range = document.createRange();
            range.selectNodeContents(contentEditableElement);
            range.collapse(false);
            selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        } else if (document.selection) {
            //IE 8 and lower
            range = document.body.createTextRange();
            range.moveToElementText(contentEditableElement);
            range.collapse(false);
            range.select();
        }
    }

    return (FileBrowser);
}(jQuery, {}));

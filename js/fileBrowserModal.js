window.FileBrowser = (function($, FileBrowser) {
    var $modalBackground = $('#modalBackground');
    var $fileBrowser = $('#fileBrowserModal');
    var $container = $("#fileBrowserView");
    var $fileBrowserMain = $('#fileBrowserMain');
    var $inputName = $('#fileBrowserInputName');

    var $formatSection = $('#fileBrowserFormat');
    var $formatDropdown = $formatSection.find('.list');
    var $formatLabel = $formatSection.find('.text');

    var $pathSection = $("#fileBrowserPath");
    var $pathLists = $("#fileBrowserPathMenu");
    var $pathLabel = $pathSection.find('.text');

    var $sortSection = $("#fileBrowserSort");
    var $sortMenu = $("#fileBrowserSortMenu");

    var $filePath = $("#filePath");
    /* Contants */
    var defaultPath = "file:///";
    var validFormats = ["JSON", "CSV"];
    var defaultSortKey = "type"; // default is sort by type;
    /* End Of Contants */
    var curFiles = [];
    var allFiles = [];
    var sortKey = defaultSortKey;
    var sortRegEx = undefined;
    var reverseSort = false;
    var testMode = false;

    FileBrowser.show = function() {
        retrievePaths($filePath.val())
        .then(function() {
            // set modal background
            $modalBackground.fadeIn(100);
            $modalBackground.addClass("open");
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }
            // press enter to import a dataset
            $(document).on("keyup", fileBrowserKeyUp);
            $fileBrowser.show();
        })
        .fail(function(result) {
            closeAll();
            StatusBox.show(result.error, $filePath, true);
        });
    }

    FileBrowser.setup = function() {
        // click blank space to remove foucse on folder/dsds
        $fileBrowser.on("click", function() {
            clear();
        });

        $fileBrowser.on({
            // click to focus
            "click": function(event) {
                var $grid = $(this);

                event.stopPropagation();
                clear();

                if ($grid.hasClass('ds')) {
                    updateFilName($grid);
                }

                $grid.addClass('active');
            },
            "dblclick": function() {
                var $grid = $(this);

                if ($grid.hasClass('ds')) {   // dblclick a dataset
                    loadDataSet($grid);
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
            loadDataSet($grid);
        });

        // close file browser
        $fileBrowser.on("click", ".close, .cancel", function() {
            closeAll();
        });

        // Up to parent folder
        $("#fileBrowserUp").click(function(event){
            event.stopPropagation();
            // the second option in pathLists
            $newPath = $pathLists.find("li").eq(1);
            upTo($newPath);
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
            var grid = getFocusGrid();

            event.stopPropagation();
            // click on selected title, reverse sort
            if ($title.hasClass("select")) {
                reverse();
            } else {
                sortTrigger($title, false);
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
                sortTrigger($li, true);
            }
        });

        // open path list section
        $pathSection.on("click", ".icon", function(event) {
            event.stopPropagation();
            toggleListSection($(this).closest(".listSection"));
        });

        // select a path
        $pathSection.on("click", ".list li", function(event) {
            event.stopPropagation();
            upTo($(this));
            $pathSection.removeClass("open");
            $pathLists.hide();
        });

        $pathSection.on({
            // contentediable must prevent press enter to add a new line
            "keypress": function(event) {
                if (event.which === keyCode.Enter) {
                    event.preventDefault();
                    return false;
                }
            },
            "keyup": function(event) {
                if (event.which === keyCode.Enter) {
                    event.preventDefault();
                    // XXX assume what inputed should be a path
                    var $input = $(this);
                    var path = $input.text();
                    if (path.charAt(path.length - 1) != "/") {
                        path += "/";
                    }
                    retrievePaths(path)
                    .then(function() {
                        $input.blur();
                    })
                    .fail(function(result) {
                        StatusBox.show(result.error, $input, true);
                    });
                }
                return false;
            }
        }, ".text");
        // open format section
        $formatSection.on("click", function(event) {
            event.stopPropagation();
            toggleListSection($(this).closest(".listSection"));
        });

        // filter a data format
        $formatSection.on("click", ".list li", function(event) {
            var $li = $(this);

            event.stopPropagation();
            $formatSection.removeClass('open');
            $formatDropdown.hide();

            if ($li.hasClass('select')) {
                return;
            }

            var regEx;
            var grid = getFocusGrid();
            var format = $li.text();
            $formatLabel.text(format);
            $li.siblings(".select").removeClass("select");
            $li.addClass("select");

            if (format !== "all") {
                regEx = new RegExp('\.' + format + '$');
            }
            sortFilesBy(sortKey, regEx);
            focusOn(grid);
        });
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

    // key up event
    function fileBrowserKeyUp(event) {
        event.preventDefault();
        if (event.which !== keyCode.Enter) {
            return false;
        }
        var $grid = $container.find('grid-unit.active');
        // only import the focsued ds, not import the folder
        if ($grid.length > 0) {
            loadDataSet($grid);
        }
    }

    function toggleListSection($listSection) {
        $listSection.toggleClass("open");
        $listSection.find(".list").toggle();
    }

    function upTo($newPath) {
        if ($newPath == undefined || $newPath.length == 0) {
            return;
        }
        var oldPath = getCurrentPath();
        var path = $newPath.text();

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

    function getCurrentPath() {
        var path = $pathLists.find("li:first-of-type").text();
        return (path);
    }

    function getGridUnitName($grid) {
        var name = $grid.find('.label').text();
        return (name);
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

    function loadDataSet($ds) {
        // reset import data form
        $("#importDataReset").click();

        // no selected dataset, load the directory
        if ($ds == null || $ds.length == 0) {
            var path = getCurrentPath();
            // remove the last slash
            path = path.substring(0, path.length - 1);
            $filePath.val(path);
        } else {
            // load dataset
            var dsName = getGridUnitName($ds);
            var path = getCurrentPath() + dsName;
            var ext = getFormat(dsName);

            if (ext != undefined) {
                $('#fileFormatMenu li[name="' + ext.toUpperCase() + '"]')
                    .click();
            }
            $filePath.val(path);
        }
        closeAll();
    }

    function appendPath(path) {
        var html = '<li class="select">' + path + '</li>';
        $pathLabel.text(path);
        $pathLists.prepend(html);
    }

    function clear(isALL) {
        $fileBrowser.find('.active').removeClass('active');
        var $listSections = $fileBrowser.find('.listSection');
        $listSections.removeClass("open");
        $listSections.find(".list").hide();
        $inputName.val("");
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
        $fileBrowser.hide();
        $(document).off('keyup', fileBrowserKeyUp);
        $modalBackground.removeClass("open");
        $modalBackground.fadeOut(200);
    }

    function updateFilName($grid) {
        var name = getGridUnitName($grid);
        $inputName.val(name);
    }

    function sortTrigger($option, isFromSortOption) {
        var grid = getFocusGrid();
        var key = $option.data("sortkey");
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

        focusOn(grid);  // focus on select grid
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
        var len = files.length;
        for (var i = 0; i < len; i ++) {
            var fileObj = files[i];
            var name = fileObj.name;
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
            files.forEach(function(file) {
                sortedFiles.push([file, file.attr.size]);
            });
            sortedFiles.sort(function(a, b) {return a[1] - b[1]});
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
                var dirFile = [];
                var fileWithoutExt = [];  // file with on extention
                var fileWithExt = [];   // file with extention
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

    function reverse() {
        reverseSort = !reverseSort;
        curFiles.reverse();
        getHTMLFromFiles(curFiles);
    }

    function focusOn(grid) {
        if (grid == undefined) {
            return;
        }
        var str;
        if (typeof grid === "string") {
            str = 'grid-unit.folder .label[data-name="' + grid + '"]';
        } else {
            var name = grid.name;
            var type = grid.type;
            if (type == undefined) {
                str = 'grid-unit' + ' .label[data-name="' + name + '"]';
            } else {
                str = 'grid-unit.' + type + ' .label[data-name="' + name + '"]';
            }
        }
        $container.find(str).eq(0).closest('grid-unit').addClass('active');
    }

    function getFocusGrid() {
        var grid;
        var $grid = $container.find('grid-unit.active');
        if ($grid.length > 0) {
            grid = {};
            grid.name = $grid.find('.label').data('name');
            grid.type = $grid.hasClass('folder') ? 'folder' : 'ds';
        }
        return (grid);
    }

    function retrievePaths(path) {
        var deferred = jQuery.Deferred();
        var paths = [];
        if (!path) {
            paths.push(defaultPath);
        } else {
            // parse path
            for (var i = path.length - 1; i >= (defaultPath.length - 1); i --) {
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
        .fail(deferred.reject)

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

            var size = fileObj.attr.size;
            var gridClass = isDirectory ? "folder" : "ds";
            var date = "00:00:00 01-01-2015";

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

    return (FileBrowser);
}(jQuery, {}));

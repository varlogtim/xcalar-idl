window.FileBrowser = (function() {
    var self = {};

    var $modalBackground = $('#modalBackground');
    var $fileBrowser = $('#fileBrowserModal');
    var $container = $("#fileBrowserView");
    var $fileBrowserMain = $('#fileBrowserMain');
    var $inputName = $('#fileBrowserInputName');

    var $formtSection = $('#fileBrowserFormat');
    var $formatDropdown = $formtSection.find('.list');
    var $formatLabel = $formtSection.find('.text');

    var $pathSection = $('#fileBrowserPath');
    var $pathLists = $pathSection.find('.list');
    var $pathLabel = $pathSection.find('.text');

    var $filePath = $('#filePath');
    /* Contants */
    var startPath = "file:///var/";
    var validFormats = ["JSON", "CSV"];
    /* End Of Contants */
    var curFiles = [];
    var allFiles = [];
    var sortKey = "type";   // default is sort by type;
    var sortRegEx = undefined;
    var reverseSort = false;
    var testMode = false;

    self.show = function() {
        var inputPath = $filePath.val();
        var path = retrievePaths(inputPath) || startPath;
        addEventListener();

        listFiles(path)
        .then(function() {
            appendPath(path);
            // set modal background
            $modalBackground.fadeIn(100);
            window.getSelection().removeAllRanges();
            $fileBrowser.show();

            // focus on the grid specified by path
            if (inputPath && inputPath != "") {
                var grid = {};
                var start = inputPath.length - 1;
                if (inputPath.charAt(start) == "/") {
                    --start;
                    grid.type = "folder";
                } else {
                    grid.type = "ds";
                }
                grid.name = inputPath.substring(
                                inputPath.lastIndexOf("/", start) + 1, 
                                inputPath.length);
                focusOn(grid);
            }
        });
    }

    self.sortBy = function(key, regEx) {
        if (allFiles.length == 0) {
            return;
        }
        curFiles = allFiles;
        if (regEx) {
            sortRegEx = regEx;
            curFiles = fileFilter(curFiles, regEx);
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

    function listFiles(path) {
        var deferred = jQuery.Deferred();

        if (testMode) {         // fake data
            clear();
            var files = [];
            for (var i = 0; i < 100; i ++) {
                var fileObj = {};
                fileObj.name = "test" + i;
                fileObj.attr = {};
                fileObj.attr.isDirectory =  Math.random() < 0.5 ? true : false;
                if (!fileObj.attr.isDirectory) {
                    fileObj.attr.size = Math.floor(Math.random() * 1000) + 1;
                } else {
                    fileObj.attr.size = 0;
                }
                files.push(fileObj);
            }
            allFiles = files;
            self.sortBy(sortKey, sortRegEx);
            deferred.resolve(path);
        } else {
            XcalarListFiles(path)
            .then(function(listFilesOutput) {
                clear();
                allFiles = listFilesOutput.files;
                self.sortBy(sortKey, sortRegEx);
                deferred.resolve();
            })
            .fail(function(error){
                deferred.reject(error);
                closeAll();
                Alert.error("List file fails", error);
            });
        }
        return (deferred.promise());
    }

    function addEventListener() {
        // click blank space to remove foucse on folder/dsds
        $fileBrowser.on('click', '.mainSection', function() {
            clear();
        });

        // click to focus on folder/ds
        $fileBrowser.on('click', 'grid-unit', function(event) {
            var $grid = $(this);

            event.stopPropagation();
            clear();

            if ($grid.hasClass('ds')) {
                updateInputSection($grid);
            }

            $grid.addClass('active');
        });

        // dblclick a folder or dataset
        $fileBrowser.on('dblclick', 'grid-unit', function() {
            var $grid = $(this);

            if ($grid.hasClass('ds')) {
                // dblclick a dataset
                loadDataSet($grid);
            } else {
                // dblclick a folder
                var path = getCurrentPath() + getGridUnitName($grid) + '/';

                listFiles(path)
                .then(function() {
                    appendPath(path);
                });
            }
        });

        // Up to parent folder
        $fileBrowser.on('click', '.icon-up', function(event){
            event.stopPropagation();
            // the second option in pathLists
            $newPath = $pathLists.children().eq(1);
            upTo($newPath);
        });

        // click icon-list to toggle between listview and gridview
        $fileBrowser.on('click', '.icon-list', function(event){
            var $viewIcon = $(this);

            event.stopPropagation();

            if ($fileBrowserMain.hasClass('listView')) {
                $fileBrowserMain.removeClass('listView').addClass('gridView');
                $viewIcon.removeClass('listView').addClass('gridView');
                $viewIcon.attr('data-original-title', 'Switch to List view');
            } else {
                $fileBrowserMain.removeClass('gridView').addClass('listView');
                $viewIcon.removeClass('gridView').addClass('listView');
                $viewIcon.attr('data-original-title', 'Switch to Grid view');
            }
            // refresh tooltip
            $viewIcon.mouseenter();
            $viewIcon.mouseover();
        });

        // click on title to sort
        $fileBrowser.on('click', '.title.clickable', function(event){
            event.stopPropagation();
            var $title = $(this);
            var grid = getFocusGrid();
            // click on selected title, reverse sort
            if ($title.hasClass('select')) {
                reverse();
            } else {
                $title.siblings('.select').removeClass('select');
                $title.addClass('select');
                var key = $title.data('sortkey');
                reverseSort = false;
                self.sortBy(key, sortRegEx);

                // mark sort key on li
                $fileBrowser.find('.colMenu li').each(function(index, li) {
                    var $li = $(li);
                    if ($li.data('sortkey') === key) {
                        $li.addClass('select');
                    } else {
                        $li.removeClass('select');
                    }
                });
            }
            // focus on select grid
            focusOn(grid);
        });

        // click sort icon to open drop down menu
        $fileBrowser.on('mousedown', '.icon-sort > .icon, .dropdownBox',
                        function(event){
            event.stopPropagation();
            $(this).parent().find('.colMenu').toggle();
        });

        // click on li to sort
        $fileBrowser.on('click', '.icon-sort li', function(event) {
            event.stopPropagation();
            var $li = $(this);
            $li.closest('.colMenu').hide();

            if ($li.hasClass('select')) {
                return;
            }

            var grid = getFocusGrid();
            $li.siblings('.select').removeClass('select');
            $li.addClass('select');
            var key = $li.data('sortkey');
            reverseSort = false;
            self.sortBy(key, sortRegEx);
            // mark sort key on title
            var $titles = $fileBrowserMain.find('.titleSection .title');
            $titles.each(function(index, title) {
                var $title = $(title);
                if ($title.data('sortkey') === key) {
                    $title.addClass('select');
                } else {
                    $title.removeClass('select');
                }
            })
            // focus on select grid
            focusOn(grid);
        });

        // open list section option
        $fileBrowser.on('click', '.listSection', function(event) {
            event.stopPropagation();
            var $listSection = $(this);
            var $list = $listSection.find('.list');
            if ($list.children().length <= 1) {
                return;
            }
            $listSection.toggleClass('open');
            $list.toggle();
        });

          // select a path
        $fileBrowser.on('click', '#fileBrowserPath .list li', function(event) {
            var $newPath = $(this);
            upTo($newPath);
        });

        // filter a data format
        $fileBrowser.on('click', '#fileBrowserFormat .list li', 
                        function(event) {
            event.stopPropagation();
            var $li = $(this);

            $formtSection.removeClass('open');
            $formatDropdown.hide();
            if ($li.hasClass('select')) {
                return;
            }

            var format = $li.text();
            $formatLabel.text(format);
            $li.siblings('.select').removeClass('select');
            $li.addClass('select');

            var regEx;
            var grid = getFocusGrid();
            if (format !== "all") {
                regEx = new RegExp('\.' + format + '$');
            }
            self.sortBy(sortKey, regEx);
            focusOn(grid);
        });

        // filter a data format
        $fileBrowser.on('mouseleave', '.listSection', function(event) {
            event.stopPropagation();
            var $listSection = $(this);
            var $list = $listSection.find('.list');
            $listSection .removeClass('open');
            $list.hide();
        });

        // confirm to open a ds
        $fileBrowser.on('click', '.confirm', function() {
            var $grid = $container.find('grid-unit.active');
            loadDataSet($grid);
        });

        // close file browser
        $fileBrowser.on('click', '.close, .cancel', function() {
            closeAll();
        });

         // press enter to import a dataset
        $(document).on('keyup', fileBrowserKeyUp);

    }

    function fileBrowserKeyUp(event) {
        event.preventDefault();
        if (event.which !== keyCode.Enter) {
            return;
        }
        var $grid = $container.find('grid-unit.active');
        // only import the focsued ds, not import the folder
        if ($grid.length > 0) {
            loadDataSet($grid);
        }
    }

    function upTo($newPath) {
        if ($newPath == undefined || $newPath.length == 0) {
            return;
        }
        var oldPath = getCurrentPath();
        var path = $newPath.text();

        listFiles(path)
        .then(function() {
            $pathLabel.text(path);
            $pathLists.children().removeClass('select');
            $newPath.addClass('select');
            var $preLists = $newPath.prevAll();

            // find the parent folder and focus on it
            var folder = oldPath.substring(path.length, oldPath.length);
            folder = folder.substring(0, folder.indexOf('/'));
            focusOn(folder);
            // remove all previous siblings
            $preLists.remove();
        });
    }

    function getCurrentPath() {
        var path = $pathLabel.text();
        return (path);
    }

    function getGridUnitName($grid) {
        var name = $grid.find('.label').text();
        return (name);
    }

    function getFormat(name) {
        var index = name.lastIndexOf(".");
        if (index < 0) {
            return;
        }
        var ext = name.substring(index + 1, name.length).toUpperCase();
        if (validFormats.indexOf(ext) >= 0) {
            return (ext);
        }
    }

    function loadDataSet($ds) {
        // reset import data form
        $('#importDataForm button[type=reset]').click();

        // no selected dataset, load the directory
        if ($ds == null || $ds.length == 0) {
            $filePath.val(getCurrentPath());
        } else {
            // load dataset
            var dsName = getGridUnitName($ds);
            var url = getCurrentPath() + dsName;
            var ext = getFormat(dsName);

            if (ext != undefined) {
                $('#fileFormat .dsTypeLabel:contains("' + ext + '")').click();
            }
            $filePath.val(url);
        }
        closeAll();
    }

    function appendPath(path) {
        var html = '<li class="select">' + 
                        path + 
                    '</li>';
        $pathLabel.text(path);
        $pathLists.prepend(html);
    }

    function clear(isALL) {
        $fileBrowser.find('.active').removeClass('active');

        $inputName.val("");
        if (isALL) {
            $fileBrowser.find('.select').removeClass('select');
            $formtSection.find('.text').text('all');
            curFiles = [];
            sortKey = "name";
            sortRegEx = undefined;
            reverseSort = false;
            $pathLists.empty();
        }
    }

    function closeAll() {
        // set to deault value
        clear(true);
        // remove all event listener
        $fileBrowser.off();
        $fileBrowser.hide();
        $(document).off('keyup', fileBrowserKeyUp);
        $modalBackground.fadeOut(200);
    }

    function updateInputSection($grid) {
        var name = getGridUnitName($grid);
        $inputName.val(name);
    }

    function fileFilter(files, regEx) {
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

            html += '<grid-unit title="' + name + 
                    '" class="' + gridClass + '">' + 
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
            str = 'grid-unit.' + type + ' .label[data-name="' + name + '"]';
        }
        $container.find(str).closest('grid-unit').addClass('active');
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
        if (path == "" || path == undefined) {
            return undefined;
        }

        var paths = [];
        for (var i = path.length - 1; i >= (startPath.length - 1); i --) {
            if (path.charAt(i) === "/") {
                paths.push(path.substring(0, i + 1));
            }
        }

        if (paths.length === 0) {
            return undefined;
        }

        for (var i = paths.length - 1; i > 0; i --) {
            appendPath(paths[i]);
        }

        return paths[0];
    }

    return (self);
}());

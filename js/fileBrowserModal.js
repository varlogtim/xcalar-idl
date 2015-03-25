FileBrowser = (function() {
    var $modalBackground = $('#modalBackground');
    var $fileBrowser = $('#fileBrowserModal');
    var $container = $("#fileBrowserView");
    var $fileBrowserMain = $('#fileBrowserMain');
    var $inputName = $('#fileBrowserInputName');
    var $inputFormat = $('#fileBrowserFormat');
    var $pathLists = $('#fileBrowserPath');
    /* Contants */
    var startPath = "file:///var/";
    var validFormats = ["JSON", "CSV"];
    /* End Of Contants */
    var curFiles = [];
    var allFiles = [];
    var sortKey = "name";   // default is sort by name;
    var sortRegEx = undefined;
    var reverseSort = false;
    var testMode = false;

    BrowserModal = function() {}

    BrowserModal.prototype.show = function() {
        addEventListener();
        listFiles(startPath)
        .done(function() {
            appendPath(startPath);
            // set modal background
            $modalBackground.fadeIn(100);
            $fileBrowser.show();
            window.getSelection().removeAllRanges();
        });
    }

    BrowserModal.prototype.sortBy = function(key, regEx) {
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
            .done(function(listFilesOutput) {
                clear();
                allFiles = listFilesOutput.files;
                self.sortBy(sortKey, sortRegEx);
                deferred.resolve();
            })
            .fail(function(error){
                console.log("List file fails!");
                deferred.reject(error);
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
            event.stopPropagation();
            clear();
            var $grid = $(this);
            if ($grid.hasClass('ds')) {
                updateInputSection($grid);
            }
            $grid.addClass('active');
        });

        // double click on folder to list the files in folder
        $fileBrowser.on('dblclick', 'grid-unit', function() {
            var $grid = $(this);
            if ($grid.hasClass('ds')) {
                loadDataSet($grid);
                closeAll();
                return;
            }

            var path = getCurrentPath() + getGridUnitName($grid) + '/';
            
            listFiles(path)
            .done(function() {
                appendPath(path);
            });
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
            event.stopPropagation();
            var $viewIcon = $(this);
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

        // select a path
        $fileBrowser.on('change', '#fileBrowserPath', function() {
            var $newPath = $pathLists.find(':selected');
            upTo($newPath);
        });

        // filter a data format
        $fileBrowser.on('change', '#fileBrowserFormat', function() {
            var format = $inputFormat.find(':selected').val();
            var regEx;
            var grid = getFocusGrid();
            if (format !== "all") {
                regEx = new RegExp('\.' + format + '$');
            }
            self.sortBy(sortKey, regEx);
            focusOn(grid);
        });

        // confirm to open a ds
        $fileBrowser.on('click', '.confirm', function() {
            var $grid = $container.find('grid-unit.active');
            if ($grid.length === 0) {
                var text = "No dataset or folder is selected, please choose one!";
                displayErrorMessage(text, $inputName);
                return;
            }
            loadDataSet($grid);
            closeAll();
        });

        // close file browser
        $fileBrowser.on('click', '.close, .cancel', function() {
            closeAll();
        });
    }

    function upTo($newPath) {
        if ($newPath == undefined || $newPath.length == 0) {
            return;
        }
        var oldPath = getCurrentPath();
        var path = $newPath.val();

        listFiles(path)
        .done(function() {
            $pathLists.children().removeAttr('selected');
            $newPath.attr('selected', 'selected');
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
        var path = $pathLists.children().first().val();
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
        $('#importDataForm button[type=reset]').click();

        var dsName = getGridUnitName($ds);
        var url = getCurrentPath() + dsName;
        var ext = getFormat(dsName);

        if (ext != undefined) {
            $('#fileFormat .dsTypeLabel:contains("' + ext + '")').click();
        }
        $('#filePath').val(url);
    }

    function appendPath(path) {
        var html = '<option value="' + path + '" selected="selected">' + 
                        path + 
                    '</option>';
        $pathLists.children().removeAttr('selected');
        $pathLists.prepend(html);
    }

    function clear(isALL) {
        $fileBrowser.find('.active').removeClass('active');
        $inputName.val("");
        if (isALL) {
            $fileBrowser.find('.select').removeClass('select');
            var $options = $inputFormat.children();
            $options.removeAttr('selected')
            $options.first().attr('selected', 'selected');
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
        var len = files.length;
        var html = "";
        var isDirectory;
        var name;
        var size;
        var date = "00:00:00 01-01-2015";

        for (var i = 0; i < len; i ++) {
            // fileObj: {name, attr{isDirectory, size}}
            fileObj = files[i];
            isDirectory = fileObj.attr.isDirectory;
            name = fileObj.name;
            size = fileObj.attr.size;
            gridClass = isDirectory ? "folder" : "ds";
            if (isDirectory && (name === '.' || name === '..')) {
                continue;
            }
            html += '<grid-unit title="' + name + 
                    '" class="' + gridClass + '">' + 
                        '<div class="gridIcon"></div>' +
                        '<div class="listIcon">' +
                            '<span class="icon"></span>' +
                        '</div>' +
                        '<div class="label" data-name=' + name + '>' + 
                            name + 
                        '</div>' +
                        '<div class="fileDate">' + 
                            date +
                        '</div>' +
                        '<div class="fileSize">' + 
                            size + 
                        '</div>' +  
                    '</grid-unit>';
        }
        $container.empty().append(html);
    }

    function sortFiles(files, key) {
        var sortedFiles = [];
        var len = files.length;
        if (key === "size") {
            for (var i = 0; i < len; i ++) {
                var size = files[i].attr.size;
                sortedFiles.push([files[i], size]);
            }
            sortedFiles.sort(function(a, b) {return a[1] - b[1]});
        } else {
            for (var i = 0; i < len; i ++) {
                var name = files[i].name;
                sortedFiles.push([files[i], name]);
            }
            sortedFiles.sort(function(a, b) {return a[1].localeCompare(b[1])});
        }

        var resultFiles = [];
        for (var i = 0; i < len; i ++) {
            resultFiles.push(sortedFiles[i][0]);
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

    var self = new BrowserModal();
    return (self);
})();

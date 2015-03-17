FileBrowser = (function() {
    var $fileBrowser = $('#fileBrowserModal');
    var $container = $("#fileBrowserView");
    var $fileBrowserMain = $('#fileBrowserMain');
    var $inputName = $('#fileBrowserInputName');
    var $inputFormat = $('#fileBrowserFormat');
    var $pathLists = $('#fileBrowserPath');
    /* Contants */
    var startPath = "file:///var/";
    var validFormats = ["JSON", "CSV", "ALL"];
    /* End Of Contants */
    var curFiles = [];
    var sortKey = "name";   // default is sort by name;
    var sortReverse = false; // current version not support reverse sort
    var testMode = false;

    BrowserModal = function () {}

    BrowserModal.prototype.show = function() {
        addEventListener();
        listFiles(startPath)
        .done(function(newPath) {
            appendPath(newPath);
            // set modal background
            $('#modalBackground').fadeIn(100);
            $fileBrowser.show();
            window.getSelection().removeAllRanges();
        });
    }

    function listFiles(path) {
        var deferred = jQuery.Deferred();

        if (testMode) {         // fake data
            clear();
            $container.empty();
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
            curFiles = sortFiles(files, sortKey);
            var html = getHTMLFromFiles(curFiles);
            $container.append(html);
            deferred.resolve(path);
        } else {
            XcalarListFiles(path)
            .done(function(listFilesOutput) {
                clear();
                $container.empty();
                curFiles = sortFiles(listFilesOutput.files, sortKey);

                var html = getHTMLFromFiles(curFiles);
                $container.append(html);
                deferred.resolve(path);
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
            updateInputSection($grid);
            $grid.addClass('active');
        });

        // double click on folder to list the files in folder
        $fileBrowser.on('dblclick', '.folder', function() {
            var $folder = $(this);
            var path = getCurrentPath() + getGridUnitName($folder) + '/';
            
            listFiles(path)
            .done(function(newPath) {
                appendPath(newPath);
            });
        });

        // Up to parent folder
        $fileBrowser.on('click', '.icon-up', function(event){
            event.stopPropagation();
            // the second option in pathLists
            $newPath = $pathLists.children().eq(1);
            upTo($newPath);
        });

        // $fileBrowser.on('click', '.icon-list', function(event){
        //     event.stopPropagation();
        //     var $iconList = $(this);
        //     if ($fileBrowserMain.hasClass('listView')) {
        //         $fileBrowserMain.removeClass('listView').addClass('gridView');
        //         $iconList.removeClass('listView').addClass('gridView')
        //     } else {
        //         $fileBrowserMain.removeClass('gridView').addClass('listView');
        //         $iconList.removeClass('gridView').addClass('listView');
        //     }

        // });

        $fileBrowser.on('change', '#fileBrowserPath', function() {
            var $newPath = $pathLists.find(':selected');
            upTo($newPath);
        });

        // confirm to open a ds
        $fileBrowser.on('click', '.confirm', function() {
            var $grid = $container.find('grid-unit.active');
            if ($grid.length === 0) {
                var text = "No dataset is selected, please choose one!";
                displayErrorMessage(text, $inputName);
                return;
            }

            var tableName = jQuery.trim($inputName.val());
            if (tableName == undefined || tableName === "") {
                var text = "File name is empty, please input a valid name!";
                displayErrorMessage(text, $inputName);
                return;
            }
            var loadURL = getCurrentPath() + getGridUnitName($grid);
            // valid input
            var loadFormat = $inputFormat.val();
            if (loadFormat === "ALL") {
                var text = "Invalid format, please choose a valid one!";
                displayErrorMessage(text, $inputFormat);
                return;
            }
            var loadArgs = loadURL.split("|");

            if (DSObj.isDataSetNameConflict(tableName)) {
                var text = 'Dataset with the name ' +  tableName + 
                            ' already exits. Please choose another name.';
                displayErrorMessage(text, $inputName);
                return;
            }
            appendTempDSToList(tableName);

            XcalarLoad(loadArgs[0], loadFormat, tableName,
                       loadArgs[1], loadArgs[2])
            .done(function(result) {
                closeAll();
                displayNewDataset(tableName);

                // add cli
                var cliOptions = {};
                cliOptions.operation = 'loadDataSet';
                cliOptions.tableName = tableName;

                addCli('Load dataset', cliOptions);
            })
            .fail(function(result) {
                if (result == StatusT.StatusDsInvalidUrl) {
                    var text = 'Could not retrieve dataset from file path: ' + 
                                loadURL;
                } else {
                    var text = StatusTStr[result];
                }
                $('#tempDSIcon').remove();
                displayErrorMessage(text, $inputName);
            });
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
        var path = $newPath.val();
        listFiles(path)
        .done(function() {
            $pathLists.children().removeAttr('selected');
            $newPath.attr('selected', 'selected');
            // remove all previous siblings
            $newPath.prevAll().remove();
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

    function appendPath(path) {
        var html = '<option value="' + path + '" selected="selected">' + 
                        path + 
                    '</option>';
        $pathLists.children().removeAttr('selected');
        $pathLists.prepend(html);
    }

    function clear() {
        $fileBrowser.find('.active')
                    .removeClass('active');
        $inputName.val("");
        $options = $inputFormat.children();
        $options.removeAttr('selected')
        $options.first().attr('selected', 'selected');
    }

    function closeAll() {
        // set to deault value
        curFiles = [];
        sortKey = "name";
        sortReverse = false;
        $pathLists.empty();
        clear();
        // remove all event listener
        $fileBrowser.off();
        $fileBrowser.hide();
        $('#modalBackground').fadeOut(200);
    }

    function updateInputSection($grid) {
        var name = getGridUnitName($grid);
        var format = "ALL";  // defalut format
        var index = name.lastIndexOf('.');
        // check if file has a format suffix
        if (index > 0) {
            format = name.substring(index + 1).toUpperCase();
            if (validFormats.indexOf(format) < 0) {
                format = "ALL";
            } else {
                name = name.substring(0, index);
            }
        }
        $inputName.val(name);
        var $option = $inputFormat.find('option[value="' + format + '"]');
        if ($option.length > 0) {
            $option.attr('selected', 'selected');
        }
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
                        '<div class="fileSize">' + 
                            size + 
                        '</div>' +
                        '<div class="fileDate">' + 
                            date +
                        '</div>' +  
                    '</grid-unit>';
        }
        return (html);
    }

    function sortFiles(files, key, isReverse) {
        var sortedFiles = [];
        var len = files.length;
        for (var i = 0; i < len; i ++) {
            var name = files[i].name;
            sortedFiles.push([files[i], name]);
        }

        sortedFiles.sort(function(a, b) {return a[1].localeCompare(b[1])});

        var resultFiles = [];
        if (isReverse) {
            for (var i = len - 1; i >= 0; i --) {
                resultFiles.push(sortedFiles[i][0]);
            }
        } else {
            for (var i = 0; i < len; i ++) {
                resultFiles.push(sortedFiles[i][0]);
            }
        }
        return (resultFiles);
    }

    return (new BrowserModal());
})();

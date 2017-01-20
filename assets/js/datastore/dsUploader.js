window.DSUploader = (function($, DSUploader) {
    var $dsUploader;  // $("#dsUploader");
    var $uploaderMain; //  $('#dsUploaderMain');
    var $container; // $('#dsUploaderContainer');
    var $innerContainer; // innerdsUploader
    var droppedFiles = null;
    var allFiles = [{name: "bin", attr: {size: 5 * MB, mtime: Date.now()}}];
    window.gDsUploadEnabled = false;
    var reverseSort = false;
    var defaultSortKey = "type";
    var sortKey = defaultSortKey;
    var cachedEvent;

    DSUploader.setup = function() {
        $dsUploader = $("#dsUploader");
        $uploaderMain = $('#dsUploaderMain');
        $container = $('#dsUploaderContainer');
        $innerContainer = $("#innerdsUploader");

        if (!gDsUploadEnabled) {
            $dsUploader.addClass('xc-hidden');
            return;
        } else {
            $("#dsForm-path").addClass('xc-hidden');
        }

        setupFileDisplay();
        setupDragDrop();
        setupBrowseBtn();
    };

    DSUploader.show = function() {
        DSForm.switchView(DSForm.View.Uploader);
    };

    DSUploader.refreshFiles = function() {
        var deferred = jQuery.Deferred();
        if (!gDsUploadEnabled) {
            return;
        }

        xcHelper.showRefreshIcon($uploaderMain);

        // xx temp until we get a real call
        setTimeout(function() {
            allFiles = allFiles;
            sortFilesBy(sortKey);
            deferred.resolve();
        }, 1000);

        return (deferred.promise());
    };

    function setupFileDisplay() {
        $container.on("click", ".grid-unit", function(event) {
            var $grid = $(this);
            event.stopPropagation();
            submitForm($grid);
        });

         // click on title to sort
        var titleLabel = ".title .label, .title .xi-sort";
        $uploaderMain.on("click", titleLabel, function(event) {
            var $title = $(this).closest(".title");

            // event.stopPropagation();
            if ($dsUploader.hasClass('unsortable')) {
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

    function setupDragDrop() {
        var dragCount = 0;
        $uploaderMain.on('drag dragstart dragend dragover dragenter ' +
            'dragleave drop', function(event) {
            event.preventDefault();
            event.stopPropagation();
        });

        $uploaderMain.on('dragenter', function(event) {
            var dt = event.originalEvent.dataTransfer;
            if (dt.types && (dt.types.indexOf ?
                dt.types.indexOf('Files') !== -1 :
                dt.types.contains('Files'))) {
                dt.effectAllowed = "copy";
                dt.dropEffect = "copy";
                $("#dsUploaderDropArea").addClass('entering');
                dragCount++;
            }
        });

        $uploaderMain.on('dragover', function(event) {
            event.originalEvent.dataTransfer.effectAllowed = "copy";
            event.originalEvent.dataTransfer.dropEffect = "copy";
        });

        $uploaderMain.on('dragleave', function(event) {
            var dt = event.originalEvent.dataTransfer;
            if (dt.types && (dt.types.indexOf ?
                dt.types.indexOf('Files') !== -1 :
                dt.types.contains('Files'))) {
                dragCount--;
                if (dragCount === 0) {
                    $("#dsUploaderDropArea").removeClass('entering');
                }
            }
        });

        $uploaderMain.on('drop', function(event) {
            dragCount = 0;
            $("#dsUploaderDropArea").removeClass('entering');
            var files = event.originalEvent.dataTransfer.files;
            if (!files || !files.length) {
                return;
            }
            droppedFiles = files;
            cachedEvent = event.originalEvent;
            $('.fileDroppable').removeClass('fileDragging');
            submitFiles(droppedFiles, event.originalEvent);
        });
    }

    function setupBrowseBtn() {
        var $browserBtn = $("#dsUploadSubmit");
        $("#dsUploadBrowse").click(function() {
            $(this).blur();
            // clear so we can trigger .change on a repeat file
            $browserBtn.val("");
            $browserBtn.click();
            return false;
        });

            // display the chosen file's path
        $browserBtn.change(function() {
            if ($browserBtn.val().trim() === "") {
                return;
            }
            var path = $(this).val().replace(/C:\\fakepath\\/i, '');
            var file = $browserBtn[0].files;
            submitFiles(file);
        });
    }

    function submitForm() {
        //xx temp path
        var path = "nfs:///netstore/datasets/indexJoin/schedule/schedule.json";
        var format = null;
        var options = {
            "path"  : path,
            "format": format,
        };

        DSPreview.show(options, true);
    }

    function submitFiles(files, event) {
        if (files.length > 1) {
            Alert.show({title: DSTStr.InvalidUpload, msg: DSTStr.OneFileUpload});
            return;
        }
        
        if (checkInvalidFileSize(files[0])) {
            invalidSizeAlert(files);
        } else if (checkFileNameDuplicate(files[0].name)) {
            duplicateNameAlert(files[0].name);
        } else {
            var name = files[0].name;
            loadFile(files[0], name, event);
        }
    }

    function validateAndSubmitNewName(name, oldName) {
        name = name.trim();
        var hasDup = checkFileNameDuplicate(name);

        if (hasDup) {
            duplicateNameAlert(name);
        } else if (!name.length) {
            invalidNameAlert(oldName);
        } else {
            loadFile(droppedFiles[0], name, cachedEvent);
        }
    }

    function invalidNameAlert(oldName) {
        Alert.show({
            "title"    : DSTStr.InvalidFileName,
            "msg"      : DSTStr.InvalidFileDesc,
            "userInput": {"label":  DSTStr.NewName + ":", "autofill": oldName},
            "onConfirm": function() {
                var newName = $("#alertUserInput").val();
                validateAndSubmitNewName(newName, oldName);
            }
        });
    }

    function duplicateNameAlert(name) {
        Alert.show({
            "title"    : DSTStr.DupFileName,
            "msg"      : DSTStr.DupFileNameDesc,
            "userInput": {"label": DSTStr.NewName + ":", "autofill": name},
            "onConfirm": function() {
                var newName = $("#alertUserInput").val();
                validateAndSubmitNewName(newName, name);
            }
        });
    }

    function invalidSizeAlert(files) {
        var msg = xcHelper.replaceMsg(ErrWRepTStr.InvalidSampleSize, {
                                            size: "2 GB"
                                        });
        Alert.error(CommonTxtTstr.InvalidSize, msg);
    }

    function invalidFolderAlert() {
        Alert.error(DSTStr.InvalidFolder, DSTStr.InvalidFolderDesc);
    }

    function checkFileNameDuplicate(name) {
        for (var i = 0; i < allFiles.length; i++) {
            if (name === allFiles[i].name) {
                return true;
            }
        }
        return false;
    }

    function checkInvalidFileSize(file) {
        return file.size > (2 * GB);
    }

    function loadFile(file, name, event) {
        var folderFound = false;

        if (event && event.dataTransfer.items &&
            event.dataTransfer.items.length) {
            [].forEach.call(event.dataTransfer.items, function(item) {
                var entry = item.webkitGetAsEntry();
                if (entry && entry.isDirectory) {
                    folderFound = true;
                    return false;
                }
           });
        }

        if (folderFound) {
            invalidFolderAlert();
        } else {
            var size = file.size;
            var mtime = file.lastModified;
            var fileObj = {name: name, attr: {size: size, mtime: mtime}};
            var loading = true;
            var html = getOneFileHtml(fileObj, loading);
            $innerContainer.append(html);

            XcalarDemoFileCreate(name)
            .then(function() {
                return uploadFile(file, name);
            });
        }
    }

    function uploadFile(file, name) {
        var deferred = jQuery.Deferred();
        var dsUploadWorker = new Worker(paths.dsUploadWorker);
        var dsFileUpload = new DSFileUpload(name, file.size,
                                    uploadComplete.bind(null, file, name));

        dsUploadWorker.postMessage(file); 
        
        dsUploadWorker.onmessage = function(ret) {
            if (ret.data.status === "loading") {
                dsFileUpload.add(ret.data.content, ret.data.chunkSize);
            } else if (ret.data.status === "done") {
                dsFileUpload.workerDone();

                dsUploadWorker.terminate();
                dsUploadWorker = undefined;
            } else {
                console.error(ret.data);
                dsFileUpload.errored(ret.data);
            }
        }
    }

    function uploadComplete(file, name) {
        var size = file.size;
        var mtime = file.lastModified;
        var fileObj = {name: name, attr: {size: size, mtime: mtime}};
        allFiles.push(fileObj);
        $innerContainer.find('.grid-unit[data-name="' + name + '"]')
                       .removeClass('isLoading');
    }

    function getOneFileHtml(fileInfo, isLoading) {
        var name = fileInfo.name;
        var size = xcHelper.sizeTranslator(fileInfo.attr.size);
        var mtime = fileInfo.attr.mtime;
        var isDirectory = false;

        var gridClass = isDirectory ? "folder" : "ds";
        var iconClass = isDirectory ? "xi-folder" : "xi_data";
        var timeOptions = {
            hasMilliseconds: true,
            noSeconds: true
        };
        var date = xcHelper.timeStampTranslator(mtime, timeOptions) || "";
        var status = "";
        if (isLoading) {
            status += " isLoading ";
        }

        var html =
            '<div data-name="' + name + '" title="' + name + '" class="' +
                status + gridClass + ' grid-unit">' +
                '<i class="gridIcon icon ' + iconClass + '"></i>' +
                '<div class="label fileName" data-name="' + name + '">' +
                    name +
                '</div>' +
                '<div class="fileDate">' + date + '</div>' +
                '<div class="fileSize">' + size + '</div>' +
            '</div>';

        return (html);
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
        reverseSort = !reverseSort;
        allFiles.reverse();
        getHTMLFromFiles(allFiles);
    }

    function sortAction($option, isFromSortOption) {
        var key = $option.data("sortkey");

        reverseSort = false;
        sortFilesBy(key);

        $uploaderMain.find(".titleSection .title").each(function() {
            var $title = $(this);
            if ($title.data("sortkey") === key) {
                $title.addClass("select");
            } else {
                $title.removeClass("select");
            }
        });
    }

    function sortFilesBy(key) {
        curFiles = allFiles;

        if (key) {
            sortKey = key;
            allFiles = sortFiles(allFiles, key);
        } else {
            sortKey = "name"; // default
        }
        if (reverseSort) {
            allFiles.reverse();
        }
        getHTMLFromFiles(allFiles);
    }

    function getHTMLFromFiles(files) {
        var html = "";
        for (var i = 0; i < files.length; i++) {
            html += getOneFileHtml(files[i]);
        }
        $innerContainer.html(html);
    }

    //xx temporary
    function XcalarDemoFileCreate(fileName) {
        return PromiseHelper.resolve();
    }


    return (DSUploader);
}(jQuery, {}));

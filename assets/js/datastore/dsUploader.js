window.DSUploader = (function($, DSUploader) {
    var $dsUploader;  // $("#dsUploader");
    var $uploaderMain; //  $('#dsUploaderMain');
    var $container; // $('#dsUploaderContainer');
    var $innerContainer; // innerdsUploader
    var droppedFiles = null;
    var allFiles = [{name: "bin", status: "done", attr: {size: 5 * MB, mtime: Date.now()}}];
    window.gDsUploadEnabled = false;
    var reverseSort = false;
    var defaultSortKey = "type";
    var sortKey = defaultSortKey;
    var cachedEvent;
    var uploads = {};

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
            $("#importDataForm-content").find(".advanceOption").hide();
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
        }, 500);

        return (deferred.promise());
    };

    function setupFileDisplay() {
        $container.on("click", ".grid-unit", function(event) {
            var $grid = $(this);
            var $target = $(event.target);
            // event.stopPropagation();
            if ($target.closest('.cancel').length) {
                cancelUpload($grid);
            } else if ($target.closest('.delete').length) {
                deleteFileConfirm($grid);
            } else if (!$grid.hasClass('isLoading')) {
                submitForm($grid);
            }
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
            showAlert('invalidSize');
        } else if (checkFileNameDuplicate(files[0].name)) {
            showAlert('duplicateName', {name: files[0].name});
        } else {
            var name = files[0].name;
            loadFile(files[0], name, event);
        }
    }

    function validateAndSubmitNewName(name, oldName) {
        name = name.trim();
        var hasDup = checkFileNameDuplicate(name);

        if (hasDup) {
            showAlert('duplicateName', {name: name});
        } else if (!name.length) {
            showAlert('invalidName', {oldName: oldName});
        } else {
            loadFile(droppedFiles[0], name, cachedEvent);
        }
    }

    function showAlert(type, args) {
        args = args || {};
        switch (type) {
            case ('invalidName'):
                Alert.show({
                    "title"    : DSTStr.InvalidFileName,
                    "msg"      : DSTStr.InvalidFileDesc,
                    "userInput": {"label":  DSTStr.NewName + ":", "autofill": args.oldName},
                    "onConfirm": function() {
                        var newName = $("#alertUserInput").val();
                        validateAndSubmitNewName(newName, args.oldName);
                    }
                });
                break;
            case ('duplicateName'):
                Alert.show({
                    "title"    : DSTStr.DupFileName,
                    "msg"      : DSTStr.DupFileNameDesc,
                    "userInput": {"label": DSTStr.NewName + ":", "autofill": args.name},
                    "onConfirm": function() {
                        var newName = $("#alertUserInput").val();
                        validateAndSubmitNewName(newName, args.name);
                    }
                });
                break;
            case ('invalidSize'):
                var msg = xcHelper.replaceMsg(ErrWRepTStr.InvalidSampleSize, {
                                            size: "2 GB"
                                        });
                Alert.error(CommonTxtTstr.InvalidSize, msg);
                break;
            case ('invalidFolder'):
                Alert.error(DSTStr.InvalidUpload, DSTStr.InvalidFolderDesc);
                break;
            case ('uploadComplete'):
                Alert.error(DSTStr.UploadCompleted, DSTStr.UploadCompletedDesc);
            default:
                break;
        }
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
            showAlert('invalidFolder');
        } else {
            var size = file.size;
            var mtime = file.lastModified;
            var fileObj = {name: name, 
                           attr: {size: size, mtime: mtime},
                           status: "inProgress",
                           sizeCompleted: 0
                          };
            allFiles.push(fileObj);
            var loading = true;
            var html = getOneFileHtml(fileObj);
            $innerContainer.append(html);

            XcalarDemoFileCreate(name)
            .then(function() {
                return uploadFile(fileObj, file, name);
            });
        }
    }

    function uploadFile(fileObj, file, name) {
        var deferred = jQuery.Deferred();
        var dsUploadWorker = new Worker(paths.dsUploadWorker);
        var dsFileUpload = new DSFileUpload(name, file.size, {
            onComplete: uploadComplete.bind(null, fileObj, file, name),
            onUpdate: updateProgress.bind(null, fileObj, file, name),
            onError: onError.bind(null, fileObj, file, name)
        });
        uploads[name] = dsFileUpload;

        dsUploadWorker.postMessage(file);
        
        dsUploadWorker.onmessage = function(ret) {
            if (dsFileUpload.getStatus === "canceled") {
                return;
            }
            if (ret.data.status === "loading") {
                dsFileUpload.add(ret.data.content, ret.data.chunkSize);
            } else if (ret.data.status === "done") {
                dsFileUpload.workerDone();

                dsUploadWorker.terminate();
                dsUploadWorker = undefined;
            } else {
                console.error(ret.data);
                dsFileUpload.errorAdding(ret.data);
            }
        }
    }

    function uploadComplete(fileObj, file, name) {
        var $icon = getDSIcon(name);
        $icon.removeClass("isLoading").find(".fileSize").html(
                                xcHelper.sizeTranslator(fileObj.attr.size));
        $icon.find(".fileName").html(name);
        fileObj.status = "done";
        delete uploads[name];
    }

    function updateProgress(fileObj, file, name, sizeCompleted) {
        var $icon = getDSIcon(name);
        $icon.find(".fileName").html(name + " (" + CommonTxtTstr.Uploading +
                                     ")");
        $icon.find(".fileSize").html("(" + xcHelper.sizeTranslator(sizeCompleted) +
                                    "/" + xcHelper.sizeTranslator(file.size) +
                                    ")");
        fileObj.sizeCompleted = sizeCompleted;
    }

    // xx temporary, should not delete file if error
    function onError(fileObj, file, name) {
        var $icon = getDSIcon(name);
        $icon.remove();
        removeFileFromCache(name);
        uploads[name].cancel(); // xx temp, should not cancel and delete file
        delete uploads[name];
    }

    function cancelUpload($icon) {
        var name = $icon.data('name');

         Alert.show({
            "title"    : DSTStr.CancelUpload,
            "msg"      : DSTStr.CancelUploadDesc,
            "onConfirm": function() {
                if ($icon.hasClass('isLoading')) {
                    $icon.remove();
                    removeFileFromCache(name);

                    uploads[name].cancel();
                    delete uploads[name];
                } else {
                    deleteFile($icon, name);
                }
            }
        });
    }

    function deleteFileConfirm($icon) {
        var name = $icon.data('name');
        var msg = xcHelper.replaceMsg(DSTStr.DelUploadMsg, {"filename": name});

        Alert.show({
            "title"    : DSTStr.DelUpload,
            "msg"      : msg,
            "onConfirm": function() {
                deleteFile($icon, name);
            }
        });
    }

    function deleteFile($icon, name) {
        var deferred = jQuery.Deferred();

        XcalarDemoFileDelete(name)
        .then(function() {
            $icon.remove();
            removeFileFromCache(name);
            deferred.resolve();
        })
        .fail(function(err) {
            Alert.error(DSTStr.CouldNotDelete, err);
            deferred.reject();
        });

        return deferred.promise();
    }

    function removeFileFromCache(name) {
        for (var i = 0; i < allFiles.length; i++) {
            if (allFiles[i].name === name) {
                allFiles.splice(i, 1);
                break;
            }
        }
    }

    function getDSIcon(name) {
        return $innerContainer.find('.grid-unit[data-name="' + name + '"]');
    }

    function getOneFileHtml(fileInfo) {
        var name = fileInfo.name;
        var displayName = name;
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

        if(fileInfo.status === "inProgress") {
            status += " isLoading ";
            displayName = name + " (" + CommonTxtTstr.Uploading + ")";
            size = "(" + fileInfo.sizeCompleted + "/" + size + ")";
        }

        var html =
            '<div data-name="' + name + '" title="' + name + '" class="' +
                status + gridClass + ' grid-unit">' +
                '<i class="gridIcon icon ' + iconClass + '"></i>' +
                '<div class="label fileName" data-name="' + name + '">' +
                    displayName +
                '</div>' +
                '<div class="fileDate">' + date + '</div>' +
                '<div class="fileSize">' + size + '</div>' +
                '<i class="icon xi-cancel cancel" data-toggle="tooltip" ' +
                    'data-original-title="' + TooltipTStr.CancelUpload + '" ' +
                    'data-container="body"></i>' +
                '<i class="icon xi-trash delete" data-toggle="tooltip" ' +
                    'data-original-title="' + TooltipTStr.DeleteFile + '" ' +
                    'data-container="body"></i>' +
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

    function XcalarDemoFileDelete(fileName) {
        var deferred = jQuery.Deferred();

        setTimeout(function() {
            deferred.resolve();
        }, 500);

        return deferred.promise();
    }

    return (DSUploader);
}(jQuery, {}));

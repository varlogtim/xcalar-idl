window.DSUploader = (function($, DSUploader) {
    var $dsUploader;  // $("#dsUploader");
    var $uploaderMain; //  $('#dsUploaderMain');
    var $container; // $('#dsUploaderContainer');
    var $innerContainer; // innerdsUploader
    var allFiles = [];
    var uploads = {}; // stores DSFileUpload instances as well as fileObj refs
    var dsUploaderEnabled;
    var reverseSort = false;
    var defaultSortKey = "type";
    var sortKey = defaultSortKey;
    var cachedEvent;

    DSUploader.initialize = function() {
        dsUploaderEnabled = (XVM.getLicenseMode() === XcalarMode.Demo);
        $dsUploader = $("#dsUploader");
        $uploaderMain = $('#dsUploaderMain');
        $container = $('#dsUploaderContainer');
        $innerContainer = $("#innerdsUploader");

        if (!dsUploaderEnabled) {
            $dsUploader.addClass('xc-hidden');
            return;
        } else {
            $("#dsForm-path").addClass('xc-hidden');
            $("#importDataForm-content").find(".advanceOption").hide();
        }

        setupFileDisplay();
        setupDragDrop();
        setupBrowseBtn();
        $uploaderMain.on('click', '.refresh', DSUploader.refreshFiles);
    };

    DSUploader.restore = function(pendingUploads) {
        if (XVM.getLicenseMode() !== XcalarMode.Demo ||
            !pendingUploads) {
            return PromiseHelper.resolve();
        }
        var deferred = jQuery.Deferred();
        var promises = [];
        
        for (var i = 0; i < pendingUploads.length; i++) {
            promises.push(XcalarDemoFileDelete(pendingUploads[i]));
        }
        PromiseHelper.chain(promises)
        .always(function() {
            if (pendingUploads.length) {
                commit(); // clears pendingUploads from kvstore
            }
            deferred.resolve();
        });

        return deferred.promise();
    };

    DSUploader.show = function() {
        DSForm.switchView(DSForm.View.Uploader);
    };

    DSUploader.refreshFiles = function() {
        var deferred = jQuery.Deferred();
        if (!dsUploaderEnabled) {
            deferred.resolve();
            return deferred.promise();
        }

        var promise =  XcalarListFiles("demo:///", false);

        xcHelper.showRefreshIcon($uploaderMain, false, promise);
        $uploaderMain.find('.refresh').addClass('xc-disabled');

        promise
        .then(function(results) {
            var name;
            allFiles = results.files;
            for (var i = 0; i < allFiles.length; i++) {
                if (name in uploads) {
                    allFiles[i] = uploads[name].getFileObj();
                }
            }
            sortFilesBy(sortKey);

            deferred.resolve();
        })
        .always(function() {
            $uploaderMain.find('.refresh').removeClass('xc-disabled');
        });

        return (deferred.promise());
    };

    // stores pending uploads in kvstore so that on refresh we can target these
    // interrupted uploads and delete them
    function commit() {
        var deferred = jQuery.Deferred();
        var pendingFiles = [];
        for (var name in uploads) {
            pendingFiles.push(name);
        }
        KVStore.put(KVStore.gPendingUploadsKey, JSON.stringify(pendingFiles),
                    true, gKVScope.GLOB)
        .then(deferred.resolve)
        .fail(deferred.reject);
        return deferred.resolve();
    }

    function setupFileDisplay() {
        $container.on("click", ".grid-unit", function(event) {
            var $grid = $(this);
            var $target = $(event.target);
            // event.stopPropagation();
            if ($target.closest('.cancel').length) {
                cancelUpload($grid);
            } else if ($target.closest('.delete').length) {
                deleteFileConfirm($grid);
            } else if (!$grid.hasClass('inProgress')) {
                submitForm($grid);
            }
        });

         // click on title to sort
        var titleLabel = ".title .label, .title .xi-sort";
        $uploaderMain.on("click", titleLabel, function() {
            var $title = $(this).closest(".title");

            // event.stopPropagation();
            if ($dsUploader.hasClass('unsortable')) {
                return;
            }
            // click on selected title, reverse sort
            if ($title.hasClass("select")) {
                reverseFiles();
            } else {
                sortAction($title);
            }
        });
    }

    function setupDragDrop() {
        var dragCount = 0;
        $uploaderMain.on('drag dragstart dragend dragover dragenter ' +
            'dragleave', function(event) {
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
            submitFiles(files, event.originalEvent);
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
            var file = $browserBtn[0].files;
            submitFiles(file);
        });
    }

    function submitForm($icon) {
        var name = decodeURI($icon.data("name"));
        var path = "demo:///" + name;
        var format = null;
        var options = {
            "path": path,
            "format": format,
        };

        DSPreview.show(options, true);
    }

    function submitFiles(files, event) {
        cachedEvent = event;
        if (files.length > 1) {
            showAlert('multipleFiles');
        } else if (checkInvalidFileSize(files[0])) {
            showAlert('invalidSize');
        } else if (checkFileNameDuplicate(files[0].name)) {
            showAlert('duplicateName', {name: files[0].name, file: files[0]});
        } else {
            var name = files[0].name;
            loadFile(files[0], name, event);
        }
    }

    function validateAndSubmitNewName(file, name, oldName) {
        name = name.trim();
        var hasDup = checkFileNameDuplicate(name);

        if (hasDup) {
            showAlert('duplicateName', {file: file, name: name});
        } else if (!name.length) {
            showAlert('invalidName', {file: file, oldName: oldName});
        } else {
            loadFile(file, name, cachedEvent);
        }
    }

    function showAlert(type, args) {
        args = args || {};
        switch (type) {
            case ('invalidName'):
                Alert.show({
                    "title": DSTStr.InvalidFileName,
                    "msg": DSTStr.InvalidFileDesc,
                    "userInput": {
                        "label": DSTStr.NewName + ":",
                        "autofill": args.oldName
                    },
                    "onConfirm": function() {
                        var newName = $("#alertUserInput").val();
                        validateAndSubmitNewName(args.file, newName,
                                                args.oldName);
                    }
                });
                break;
            case ('duplicateName'):
                Alert.show({
                    "title": DSTStr.DupFileName,
                    "msg": DSTStr.DupFileNameDesc,
                    "userInput": {
                        "label": DSTStr.NewName + ":",
                        "autofill": args.name
                    },
                    "onConfirm": function() {
                        var newName = $("#alertUserInput").val();
                        validateAndSubmitNewName(args.file, newName, args.name);
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
            case ('multipleFiles'):
                Alert.show({
                    title: DSTStr.InvalidUpload,
                    msg: DSTStr.OneFileUpload
                });
                break;
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
            event.dataTransfer.items.length)
        {
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
            var mtime = Math.round(file.lastModified / 1000); // remove milliseconds
            var fileObj = {name: name,
                           attr: {size: size, mtime: mtime},
                           status: "inProgress",
                           sizeCompleted: 0
                          };

            var creating = true;
            var html = getOneFileHtml(fileObj, creating);
            var $grid = $(html);
            $innerContainer.append($grid);

            XcalarDemoFileCreate(name)
            .then(function() {
                $grid.removeClass('isCreating');
                uploadFile(fileObj, file);
            })
            .fail(function(err) {
                if (err.error && err.error.indexOf('already exists') > -1) {
                    showAlert('duplicateName', {name: name, file: file});
                } else {
                    Alert.error(DSTStr.UploadFailed, err);
                }
                $grid.remove();
            });
        }
    }

    function uploadFile(fileObj, file) {
        var name = fileObj.name;
        var dsUploadWorker = new Worker(paths.dsUploadWorker);
        var dsFileUpload = new DSFileUpload(name, file.size, fileObj, {
            onComplete: uploadComplete.bind(null, fileObj, name),
            onUpdate: updateProgress.bind(null, fileObj, file, name),
            onError: onError.bind(null, fileObj, name)
        });
        uploads[name] = dsFileUpload;

        allFiles.push(fileObj);
        var $icon = getDSIcon(name);
        $icon.removeClass('isCreating');
        commit();

        dsUploadWorker.postMessage(file);

        dsUploadWorker.onmessage = function(ret) {
            if (dsFileUpload.getStatus() === "canceled" ||
                dsFileUpload.getStatus() === "errored") {
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
        };
    }

    function uploadComplete(fileObj, name) {
        var $grid = getDSIcon(name);
        $grid.removeClass("inProgress").find(".fileSize").html(
                                xcHelper.sizeTranslator(fileObj.attr.size));
        var displayName = xcHelper.escapeHTMLSepcialChar(name);
        $grid.find(".fileName").html(displayName);
        fileObj.status = "done";
        delete uploads[name];
        commit();
    }

    function updateProgress(fileObj, file, name, sizeCompleted) {
        name = xcHelper.escapeHTMLSepcialChar(name);
        var $icon = getDSIcon(name);
        $icon.find(".fileName").html(name + " (" + CommonTxtTstr.Uploading +
                                     ")");
        var sizeProgress = xcHelper.sizeTranslator(sizeCompleted) + "/" +
                           xcHelper.sizeTranslator(file.size) + " (" +
                           Math.floor(100 * sizeCompleted / file.size) +"%)";

        $icon.find(".fileSize").html(sizeProgress);
        fileObj.sizeCompleted = sizeCompleted;
    }

    function onError(fileObj, name) {
        var $grid = getDSIcon(name);
        $grid.removeClass("inProgress").addClass("isError");
        var displayName = xcHelper.escapeHTMLSepcialChar(name);
        $grid.find(".fileName").html(displayName + " (" + ErrTStr.Error + ")");
        fileObj.status = "errored";

        delete uploads[name];
        commit();
    }

    function cancelUpload($icon) {
        var name =  decodeURI($icon.data("name"));
        Alert.show({
            "title": DSTStr.CancelUpload,
            "msg": DSTStr.CancelUploadDesc,
            "onConfirm": function() {
                if ($icon.hasClass("inProgress")) {
                    $icon.remove();
                    removeFileFromCache(name);

                    uploads[name].cancel();
                    delete uploads[name];
                    commit();
                } else {
                    deleteFile($icon, name);
                }
            }
        });
    }

    function deleteFileConfirm($icon) {
        var deferred = jQuery.Deferred();
        var name = decodeURI($icon.data("name"));
        var msg = xcHelper.replaceMsg(DSTStr.DelUploadMsg, {"filename": name});

        Alert.show({
            "title": DSTStr.DelUpload,
            "msg": msg,
            "onConfirm": function() {
                deleteFile($icon, name)
                .then(deferred.resolve)
                .fail(deferred.reject);
            }
        });

        return deferred.promise();
    }

    function deleteFile($icon, name) {
        var deferred = jQuery.Deferred();
        $icon.addClass("isDeleting");
        XcalarDemoFileDelete(name)
        .then(function() {
            $icon.remove();
            removeFileFromCache(name);
            deferred.resolve();
        })
        .fail(function(err) {
            if (err && err.error) {
                err = err.error;
            }

            if (err.indexOf("not exist") > -1) {
                $icon.remove();
                removeFileFromCache(name);
            } else {
                Alert.error(DSTStr.CouldNotDelete, err);
                $icon.removeClass("isDeleting");
            }
            
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
        name = encodeURI(name);
        return $innerContainer.find('.grid-unit[data-name="' + name + '"]');
    }

    function getOneFileHtml(fileInfo, isCreating) {
        var name = fileInfo.name;
        var dataName = encodeURI(name);
        var titleName = xcHelper.escapeDblQuoteForHTML(name);
        var displayName = xcHelper.escapeHTMLSepcialChar(name);
        var size = xcHelper.sizeTranslator(fileInfo.attr.size);
        var sizeCompleted = xcHelper.sizeTranslator(fileInfo.sizeCompleted);
        var mtime = fileInfo.attr.mtime;

        var gridClass = "ds";
        var iconClass = "xi_data";
        var timeOptions = {
            // hasMilliseconds: true,
            noSeconds: true
        };
        var date = xcHelper.timeStampTranslator(mtime, timeOptions) || "";
        var status = "";

        if (fileInfo.status === "inProgress") {
            status += " inProgress ";
            displayName = displayName + " (" + CommonTxtTstr.Uploading + ")";
            size = sizeCompleted + "/" + size + " (" +
                Math.floor(100 * fileInfo.sizeCompleted / fileInfo.attr.size) +
                "%)";
        } else if (fileInfo.status === "errored") {
            status += " isError ";
            displayName = displayName + " (" + ErrTStr.Error + ")";
            size = sizeCompleted + "/" + size + " (" +
                Math.floor(100 * fileInfo.sizeCompleted / fileInfo.attr.size) +
                "%)";
        }
        if (isCreating) {
            status += " isCreating ";
        }

        var html =
            '<div data-name="' + dataName + '" title="' + titleName +
                '" class="' + status + gridClass + ' grid-unit">' +
                '<i class="gridIcon icon ' + iconClass + '"></i>' +
                '<div class="label fileName" data-name="' + dataName + '">' +
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

    function sortAction($option) {
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

    DSUploader.submitFiles = submitFiles;

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSUploader.__testOnly__ = {};
        DSUploader.__testOnly__.submitFiles = submitFiles;
        DSUploader.__testOnly__.allFiles = allFiles;
        DSUploader.__testOnly__.loadFile = loadFile;
        DSUploader.__testOnly__.uploadFile = uploadFile;
        DSUploader.__testOnly__.uploads = uploads;
        DSUploader.__testOnly__.submitForm = submitForm;
        DSUploader.__testOnly__.cancelUpload = cancelUpload;
        DSUploader.__testOnly__.getOneFileHtml = getOneFileHtml;
        DSUploader.__testOnly__.uploadComplete = uploadComplete;
        DSUploader.__testOnly__.updateProgress = updateProgress;
        DSUploader.__testOnly__.deleteFileConfirm = deleteFileConfirm;
        DSUploader.__testOnly__.onError = onError;
        DSUploader.__testOnly__.getDSIcon = getDSIcon;

    }
    /* End Of Unit Test Only */
    return (DSUploader);
}(jQuery, {}));

// this file maps to xcalar/.jupyter/custom/custom.js
// if this gets built in to a non-XD product (XI, XPE, etc.)
// any occurances of 'Xcalar Design' (case insensitive) in this file will get
// replaced with updated product name at build time.
define(['base/js/namespace', 'base/js/utils'], function(Jupyter, utils) {
    Jupyter._target = '_self';
    if (!$("#notebooks").length){
        return;
    }
    var wkbkFolderName = "";
    console.log("jupyter custom extension has been loaded");

    var request = {
        action: "updateLocation",
        location: "tree",
        lastNotebook: null
    };
    parent.postMessage(JSON.stringify(request), "*");
    parent.postMessage(JSON.stringify({action: "enterNotebookList"}), "*");

    // hide the log out button on the upper right
    $("#login_widget").remove();
    overwriteElementsAndListeners();
    setupJupyterEventListeners();
    window.addEventListener("message", receiveMessage, false);
    var isOthersHidden = true;

    function receiveMessage(event) {
        window.alert = function(){};
        alert = function(){};
        if (!event.data) {
            return;
        }
        var struct;
        try {
            struct = JSON.parse(event.data);
            if (!struct.fromXcalar) {
                return;
            }
        } catch (error) {
            console.log(error);
            return;
        }
        switch(struct.action) {
            case("publishTable"):
                publishTable(struct.tableName, struct.numRows);
                break;
            case ("autofillImportUdf"):
                autofillImportUdf(struct.target, struct.filePath, struct.includeStub,
                                  struct.moduleName, struct.fnName, struct.udfPanelModuleName);
                break;
            case ("newWorkbook"):
                createNewFolder(struct);
                break;
            case ("copyWorkbook"):
                copyFolder(struct.oldFolder, struct.newFolder);
                break;
            case ("renameWorkbook"):
                renameFolder(struct, struct.newFolderName, struct.oldFolderName);
                break;
            case ("deleteWorkbook"):
                deleteFolder(struct);
                break;
            case ("init"):
                wkbkFolderName = struct.folderName || "";
                highlightUserFolder();
                updateLinks();
                break;
            case ("updateFolderName"):
                updateFolderName();
                break;
            default:
                console.log("invalid operation: ", struct);
                break;
        }
    }

    // create folder, rename it, and reload list, send new name to XD
    function createNewFolder(struct) {
        Jupyter.notebook_list.contents.new_untitled("", {type: 'directory'})
        .then(function(data) {
            renameFolderHelper(struct, struct.folderName, data.path)
            .then(function(result) {
                resolveRequest(result, struct.msgId);
            })
            .fail(function(result) {
                rejectRequest(result, struct.msgId);
            });
        }) // jupyter doesn't have fail property
        .catch(function(e) {
            rejectRequest(e, struct.msgId);
        });
    }

    function renameFolder(struct, newFolderName, oldFolderName) {
        struct.folderName = newFolderName;
        renameFolderHelper(struct, newFolderName, oldFolderName)
        .then(function(result) {
            if (wkbkFolderName === oldFolderName) {
                wkbkFolderName = result.newName;
                updateLinks();
            }
            if (Jupyter.notebook_list.notebook_path === oldFolderName ||
                Jupyter.notebook_list.notebook_path.indexOf(oldFolderName + "/") === 0) {
                Jupyter.notebook_list.update_location(newFolderName);
            }
            resolveRequest(result, struct.msgId);
        })
        .fail(function(result) {
            rejectRequest(result, struct.msgId);
        });
    }

    function updateFolderName(struct) {
        if (wkbkFolderName === struct.oldFolderName) {
            wkbkFolderName = struct.newFolderName;
            updateLinks();
        }
        if (Jupyter.notebook_list.notebook_path === struct.oldFolderName ||
            Jupyter.notebook_list.notebook_path.indexOf(struct.oldFolderName + "/") === 0) {
            Jupyter.notebook_list.update_location(struct.newFolderName);
        }
    }

    function renameFolderHelper(struct, folderName, prevName, attemptNumber, prevDeferred) {
        var deferred = prevDeferred || jQuery.Deferred();

        attemptNumber = attemptNumber || 0;
        attemptNumber++;
        Jupyter.notebook_list.contents.rename(prevName, folderName)
        .then(function(data) {
            Jupyter.notebook_list.load_list();
            deferred.resolve({newName: data.name});
        })
        .catch(function(e) {
            if (e && typeof e.message === "string") {
                if (attemptNumber > 10) {
                    deferred.reject({error: "failed to create folder"});
                    return; // give up
                } else if (e.message.indexOf("No such file") > -1) {
                    deferred.reject({error: "folder not found"});
                } else if (e.message.indexOf("File already exists") === 0 &&
                    attemptNumber < 10) {
                    renameFolderHelper(struct, struct.folderName + "_" +
                        attemptNumber, prevName, attemptNumber, deferred);
                } else { // last try
                    renameFolderHelper(struct, struct.folderName + "_" +
                        Math.ceil(Math.random() * 10000), prevName,
                        attemptNumber, deferred);
                }
            } else {
                deferred.reject({error: "failed to create folder"});
            }
        });

        return deferred.promise();
    }

    function deleteFolder(struct) {
        var folderName = struct.folderName;

        Jupyter.notebook_list.contents.delete(folderName)
        .then(function() {
            Jupyter.notebook_list.notebook_deleted(folderName);
        });
    }

    function publishTable(tableName, numRows) {
        numRows = numRows || 0;
        Jupyter.new_notebook_widget.contents.new_untitled(wkbkFolderName, {type: "notebook"})
        .then(function(data) {
            var encodedTableName = encodeURIComponent(tableName);
            var url = Jupyter.session_list.base_url + "notebooks/" + data.path + "?kernel_name=python3&" +
                        "needsTemplate=true&publishTable=true&" +
                        "tableName=" + encodedTableName + "&numRows=" + numRows;
            window.location.href = url;
        });
    }

    function autofillImportUdf(target, filePath, includeStub, moduleName,
                               fnName, udfPanelModuleName) {
        Jupyter.new_notebook_widget.contents.new_untitled(wkbkFolderName, {type: "notebook"})
        .then(function(data) {
            var encodedTarget = encodeURIComponent(target);
            var encodedFilePath = encodeURIComponent(filePath);
            var url = Jupyter.session_list.base_url + "notebooks/" + data.path + "?kernel_name=python3&" +
                        "needsTemplate=true&autofillImportUdf=true&" +
                        "target=" + encodedTarget + "&filePath=" + encodedFilePath +
                        "&includeStub=" + includeStub +
                        "&moduleName=" + moduleName +
                        "&fnName=" + fnName +
                        "&udfPanelModuleName=" + udfPanelModuleName;
            window.location.href = url;
        });
    }


    function setupJupyterEventListeners() {
        Jupyter.notebook_list.events.on("draw_notebook_list.NotebookList", function(evt, data) {
            highlightUserFolder();
        });
    }

    function highlightUserFolder() {
        if (!wkbkFolderName || Jupyter.notebook_list.notebook_path !== "") {
            $("#xc-showFolderOption").remove();
            // only apply styling if in root directory and user folder exists
            return;
        }

        if (!$("#xc-showFolderOption").length) {
            var checkOption = isOthersHidden ? "" : "checked";

            var html = '<div id="xc-showFolderOption">' +
                        'Show other folders' +
                        '<input type="checkbox" title="Select to show folders' +
                            ' belonging to other workbooks" ' + checkOption +
                         '>' +
                       '</div>';
            var $showOption = $(html);
            Jupyter.notebook_list.element.find("#project_name").after($showOption);
            $showOption.find("input").change(function() {
                isOthersHidden = !$(this).is(":checked");
                Jupyter.notebook_list.load_list();
            });
        }

        Jupyter.notebook_list.element.find(".list_item").each(function() {
            var $row = $(this);
            var data = $row.data();
            if (data.type === "directory") {
                if (data.name === wkbkFolderName) {
                    $row.addClass("xc-wkbkFolder");
                    $row.find(".item_icon").addClass("fa fa-folder").removeClass("folder_icon");
                    $row.find(".running-indicator").text("Your workbook folder");
                } else {
                    $row.addClass("xc-othersFolder");
                    if (isOthersHidden) {
                        $row.hide();
                        $row.find("input").attr("type", "hidden");
                    } else {
                        $row.show();
                        $row.find("input").attr("type", "checkbox");
                    }
                }
            }
        });
    }

    function overwriteElementsAndListeners() {
        $(document).ready(function() {
            // prevents new window from opening
            $("#notebook_list").on("click", "a", function(event) {
                var url = $(this).attr("href");
                if (!url) {
                    return;
                }
                event.preventDefault();
                // prevents bug where new tab opens in windows chrome
                window.location.href = $(this).attr("href");
            });
            $("#kernel-python3 a").off("click");
            $("#kernel-python3 a").click(function() {
                // code based off of newnotebook.js in jupyter/static/tree/js/tree/js
                var dir_path = Jupyter.notebook_list.notebook_path;
                Jupyter.new_notebook_widget.contents.new_untitled(dir_path, {type: "notebook"})
                .then(function(data) {
                    var url = Jupyter.session_list.base_url + "notebooks/" + data.path + "?kernel_name=python3&needsTemplate=true";
                    window.location.href = url;
                });
            });
        });
    }

    function updateLinks() {
        var folderUrl = Jupyter.session_list.base_url + "tree/" + wkbkFolderName;
        $("#ipython_notebook").find("a").attr("href", folderUrl);
    }

    function copyFolder(oldFolder, newFolder) {
        Jupyter.notebook_list.contents.list_contents(oldFolder)
        .then(function(contents) {
            contents.content.forEach(function(item) {
                if (item.type === "notebook") {
                    Jupyter.notebook_list.contents.copy(item.path, newFolder);
                } else if (item.type === "directory") {
                    Jupyter.notebook_list.contents.new_untitled(newFolder, {type: 'directory'})
                    .then(function(data) {
                        var split = data.path.split("/");
                        split.pop();
                        split.push(item.name);
                        var desiredPath = split.join("/");
                        renameFolderHelper({folderName: desiredPath}, desiredPath, data.path)
                        .then(function(result) {
                            copyFolder(item.path, desiredPath);
                        });
                    });
                }
            });
        });
    }

    function resolveRequest(result, msgId) {
        var request = {
            action: "resolve",
            msgId: msgId
        };
        request = $.extend(request, result);
        parent.postMessage(JSON.stringify(request), "*");
    }

    function rejectRequest(result, msgId) {
         var request = {
            action: "reject",
            msgId: msgId
        };
        request = $.extend(request, result);
        parent.postMessage(JSON.stringify(request), "*");
    }


});




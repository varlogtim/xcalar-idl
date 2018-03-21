// this file maps to xcalar/.jupyter/custom/custom.js
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
                                  struct.moduleName, struct.fnName);
                break;
            case ("newWorkbook"):
                createNewFolder(struct, struct.folderName);
                break;
            case ("deleteWorkbook"):
                deleteFolder(struct);
                break;
            case ("init"):
                wkbkFolderName = struct.folderName || "";
                highlightUserFolder();
                updateLinks();
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
            renameFolder(struct, struct.folderName, data.path);
        });
    }

    function renameFolder(struct, folderName, prevName, attemptNumber) {
        attemptNumber = attemptNumber || 0;
        attemptNumber++;
        Jupyter.notebook_list.contents.rename(prevName, utils.url_path_join("", folderName))
        .then(function(data) {
            Jupyter.notebook_list.load_list();
            var request = {
                action: "returnFolderName",
                originalName: struct.folderName,
                wkbkId: struct.wkbkId,
                newName: data.name
            };
            parent.postMessage(JSON.stringify(request), "*");
        })
        .catch(function(e) {
            if (e && typeof e.message === "string") {
                if (attemptNumber > 10) {
                    return; // give up
                }
                if (e.message.indexOf("File already exists") === 0 &&
                    attemptNumber < 10) {
                    renameFolder(struct, struct.folderName + "_" +
                        attemptNumber, prevName, attemptNumber);
                } else { // last try
                    renameFolder(struct, struct.folderName + "_" +
                        Math.ceil(Math.random() * 10000), prevName,
                        attemptNumber);
                }
            }
        });
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
                               fnName) {
        Jupyter.new_notebook_widget.contents.new_untitled(wkbkFolderName, {type: "notebook"})
        .then(function(data) {
            var encodedTarget = encodeURIComponent(target);
            var encodedFilePath = encodeURIComponent(filePath);
            var url = Jupyter.session_list.base_url + "notebooks/" + data.path + "?kernel_name=python3&" +
                        "needsTemplate=true&autofillImportUdf=true&" +
                        "target=" + encodedTarget + "&filePath=" + encodedFilePath +
                        "&includeStub=" + includeStub +
                        "&moduleName=" + moduleName +
                        "&fnName=" + fnName;
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
            // only apply styling if in root directory and user folder exists
            return;
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
                }
            }
        })
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
                var dir_path = $('body').attr('data-notebook-path');
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
});

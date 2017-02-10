// this is a sub module of bottomMenu
window.UDF = (function($, UDF) {
    var editor;
    var storedUDF = {};
    var udfWidgets = [];

    // constant
    var udfDefault = "# PLEASE TAKE NOTE: \n\n" +
                    "# UDFs can only support\n" +
                    "# return values of \n" +
                    "# type String.\n\n"+
                    "# XPU Apps should include \n" +
                    "# a main function.\n\n" +
                    "# Function names that \n" +
                    "# start with __ are\n" +
                    "# considered private\n"+
                    "# functions and will not\n" +
                    "# be directly invokable.\n\n";
    var defaultModule = "default";

    UDF.setup = function() {
        setupUDF();
    };

    UDF.initialize = function() {
        var deferred = jQuery.Deferred();

        initializeUDFList()
        .then(function(listXdfsObj) {
            DSExport.refreshUDF(listXdfsObj);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    UDF.clear = function() {
        // clear CodeMirror
        if (editor != null) {
            // Wrap in if because KVStore.restore may call UDF.clear()
            // and at that time editor has not setup yet.
            editor.setValue(udfDefault);
            editor.clearHistory();
        }
        storedUDF = {};
        $("#udf-fnMenu").find('li[name=blank]')
                    .siblings().remove();
    };

    UDF.getEditor = function() {
        return editor;
    };

    UDF.getUDFs = function() {
        return storedUDF;
    };

    // used in extManager.js
    UDF.storePython = function(moduleName, entireString) {
        storedUDF[moduleName] = entireString;
        updateUDF();
    };

    function initializeUDFList() {
        var deferred = jQuery.Deferred();

        // update udf
        XcalarListXdfs("*", "User*")
        .then(function(listXdfsObj) {
            var len = listXdfsObj.numXdfs;
            var udfs = listXdfsObj.fnDescs;
            var moduleName;

            for (var i = 0; i < len; i++) {
                moduleName = udfs[i].fnName.split(":")[0];

                if (!storedUDF.hasOwnProperty(moduleName)) {
                    // this means modueName exists
                    // when user fetch this module,
                    // the entire string will cached here
                    storedUDF[moduleName] = null;
                }
            }

            updateUDF();
            deferred.resolve(listXdfsObj);
        })
        .fail(function(error) {
            updateUDF(); // stil update
            deferred.reject(error);
        });

        return deferred.promise();
    }

    // setup UDF section
    function setupUDF() {
        var textArea = document.getElementById("udf-codeArea");

        editor = CodeMirror.fromTextArea(textArea, {
            "mode": {
                "name": "python",
                "version": 3,
                "singleLineStringErrors": false
            },
            "theme": "rubyblue",
            "lineNumbers": true,
            "indentWithTabs": false,
            "indentUnit": 4,
            "matchBrackets": true,
            "autoCloseBrackets": true
        });

        setupAutocomplete(editor);

        editor.setValue(udfDefault);

        var waiting;
        editor.on("change", function() {
            clearTimeout(waiting);
            waiting = setTimeout(updateHints, 300);
        });

        var $udfSection = $("#udfSection");
        var wasActive = $udfSection.hasClass('active');
        // panel needs to be active to set editor value to udf default
        $udfSection.addClass("active");
        editor.refresh();

        if (!wasActive) { // only remove active class if it didnt start active
            $udfSection.removeClass('active');
        }

        /* switch between UDF sections */
        var $sections = $udfSection.find(".mainSection");
        var $tabs = $udfSection.find(".tabSection");
        $tabs.on("click", ".tab", function() {
            var $tab = $(this);
            $tab .addClass("active").siblings().removeClass("active");
            var tabId = $tab.data("tab");
            $sections.addClass("xc-hidden");
            $("#" + tabId).removeClass("xc-hidden");

            if (tabId === "udf-fnSection") {
                editor.refresh();
            }
        });
        /* end of switch between UDF sections */

        // browser file
        var $browserBtn = $("#udf-upload-fileBrowser");
        $("#udf-upload-browse").click(function() {
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
            var moduleName = path.substring(0, path.indexOf(".")).toLowerCase()
                                .replace(/ /g, "");
            var file = $browserBtn[0].files[0];

            readUDFFromFile(file, moduleName);
        });

        /* Template dropdown list */
        new MenuHelper($("#udf-fnList"), {
            "onSelect": selectUDFFuncList,
            "container": "#udfSection",
            "bounds": "#udfSection",
            "bottomPadding": 2
        }).setupListeners();

        new MenuHelper($("#udf-uploadType"), {
            "onSelect": selectTypeList,
            "container": "#udfSection",
            "bounds": "#udfSection",
            "bottomPadding": 2
        }).setupListeners();
        /* end of function input section */

        function selectUDFFuncList($li) {
            $li.parent().find("li").removeClass("selected");
            $li.addClass("selected");

            var moduleName = $li.text();
            var $fnListInput = $("#udf-fnList input");
            var $fnName = $("#udf-fnName");

            StatusBox.forceHide();
            $fnListInput.val(moduleName);

            if ($li.attr("name") === "blank") {
                $fnName.val("");
                editor.setValue(udfDefault);
            } else {
                // auto-fill moduleName
                $fnName.val(moduleName);

                getEntireUDF(moduleName)
                .then(fillUDFFunc)
                .fail(function(error) {
                    fillUDFFunc("#" + error);
                });
            }

            function fillUDFFunc(funcStr) {
                if ($fnListInput.val() !== moduleName) {
                    // check if diff list item was selected during
                    // the async call
                    return;
                }

                if (funcStr == null) {
                    funcStr = "#" + SideBarTStr.DownloadMsg;
                }

                editor.setValue(funcStr);
            }
        }

        function selectTypeList($li) {
            $li.closest(".dropDownList").find(".iconWrapper .icon").remove();

            var cloned = $li.find(".icon")[0].cloneNode(false);
            $li.closest(".dropDownList").find(".iconWrapper").append(cloned);
            if ($li.find(".icon").attr("data-uploadType") === "UDF") {
                $("#udf-fnName").attr("placeholder", UDFTStr.NameHint);
            } else {
                $("#udf-fnName").attr("placeholder", UDFTStr.AppName);
            }
        }

        /* upload udf section */
        $("#udf-fnName").keypress(function(event) {
            if (event.which === keyCode.Enter) {
                $('#udf-fnUpload').click();
                $(this).blur();
            }
        });

        $("#udf-fnUpload").click(function() {
            $(this).blur();
            var $fnName = $("#udf-fnName");
            var fileName = $fnName.val();
            var options = {"side": "top", "offsetY": -2};
            if (fileName === "") {
                StatusBox.show(ErrTStr.NoEmpty, $fnName, true, options);
                return;
            } else if (fileName.length >
                XcalarApisConstantsT.XcalarApiMaxUdfModuleNameLen) {
                StatusBox.show(ErrTStr.LongFileName, $fnName, true, options);
                return;
            }
            // Get code written and call thrift call to upload
            var entireString = editor.getValue();
            if (entireString.trim() === "" ||
                entireString.trim() === udfDefault.trim())
            {
                StatusBox.show(ErrTStr.NoEmptyFn,
                                $('#udf-fnSection .CodeMirror'), false,
                                options);
                return;
            } else if (entireString.trim().length >
                       XcalarApisConstantsT.XcalarApiMaxUdfSourceLen) {
                StatusBox.show(ErrTStr.LargeFile,
                                $("#udf-fnSection .CodeMirror"), false,
                                options);
                return;
            }

            var moduleName;
            if (fileName.indexOf(".") >= 0) {
                moduleName = fileName.substring(0, fileName.indexOf("."));
            } else {
                moduleName = fileName;
            }

            upload(moduleName, entireString,
                   $("#udf-uploadType .iconWrapper .icon")
                   .attr("data-uploadType"));

        });
        /* end of upload udf section */

        /* udf manager section */
        var $udfManager = $("#udf-manager");
        // edit udf
        $udfManager.on("click", ".udf .edit", function() {
            var moduleName = $(this).closest(".udf").find(".text").text();
            // switch to first tab
            $("#udfSection .tab:first-child").click();
            $("#udf-fnMenu").find("li").filter(function() {
                return $(this).text() === moduleName;
            }).trigger(fakeEvent.mouseup);
        });

        // download udf
        $udfManager.on("click", ".udf .download", function() {
            var moduleName = $(this).closest(".udf").find(".text").text();
            downloadUDF(moduleName);
        });

        // delete udf
        $udfManager.on("click", ".udf .delete", function() {
            var moduleName = $(this).closest(".udf").find(".text").text();
            Alert.show({
                "title": UDFTStr.DelTitle,
                "msg": UDFTStr.DelMsg,
                "onConfirm": function() {
                    deleteUDF(moduleName);
                }
            });
        });

        $udfManager.on("click", ".refresh", function() {
            refreshUDF();
        });
        /* end of udf manager section */
    }

    function setupAutocomplete(editor) {
        var keysToIgnore = [keyCode.Left, keyCode.Right, keyCode.Down,
                            keyCode.Up, keyCode.Tab, keyCode.Enter];

        // trigger autcomplete menu on keyup, except when keysToIgnore
        editor.on("keyup", function(cm, e) {
            // var val = editor.getValue().trim();
            if (keysToIgnore.indexOf(e.keyCode) < 0) {
                editor.execCommand("autocompleteUDF");
            }
        });

        // set up codemirror autcomplete command
        CodeMirror.commands.autocompleteUDF = function(cm) {
            CodeMirror.showHint(cm, CodeMirror.pythonHint, {
                alignWithWord: true,
                completeSingle: false,
                completeOnSingleClick: true
            });
        };
    }

    function refreshUDF(isInBg) {
        var $udfManager = $("#udf-manager");
        $udfManager.addClass("loading");
        if (!isInBg) {
            xcHelper.showRefreshIcon($udfManager);
        }

        initializeUDFList()
        .then(function(listXdfsObj) {
            DSPreview.update(listXdfsObj);
            FnBar.updateOperationsMap(listXdfsObj.fnDescs, true);
            DSExport.refreshUDF(listXdfsObj);
        })
        .always(function() {
            $udfManager.removeClass("loading");
        });
    }

    function updateUDF() {
        // store by name
        var moduleNames = Object.keys(storedUDF).sort();
        updateTemplateList(moduleNames);
        updateManager(moduleNames);
    }

    function updateTemplateList(moduleNames) {
        var $input = $("#udf-fnList input");
        var $blankFunc = $("#udf-fnMenu").find('li[name=blank]');
        var selectedModule = $input.val();
        var hasSelectedModule = false;
        var html = "";
        for (var i = 0, len = moduleNames.length; i < len; i++) {
            var module = moduleNames[i];
            html += "<li>" + module + "</li>";
            if (!hasSelectedModule && module === selectedModule) {
                hasSelectedModule = true;
            }
        }

        $blankFunc.siblings().remove();
        $blankFunc.after(html);

        if (!hasSelectedModule) {
            $input.val("");
            $blankFunc.trigger(fakeEvent.mouseup);
        }
    }

    function updateManager(moduleNames) {
        var $section = $("#udf-manager");
        var len = moduleNames.length;
        var html = "";

        for (var i = 0; i < len; i++) {
            var moduleName = moduleNames[i];
            var udfClass = "udf";

            if (!isEditableUDF(moduleName)) {
                udfClass += " uneditable";
            }

            html +=
                '<div class="' + udfClass + '">' +
                    '<div class="iconWrap udfIcon">' +
                    '<i class="icon xi-module center fa-15"></i>' +
                '</div>' +
                '<div class="text">' +
                  moduleName +
                '</div>' +
                '<div class="actions">' +
                  '<i class="edit icon xi-edit xc-action fa-14" ' +
                  'title="' + UDFTStr.Edit + '" data-toggle="tooltip" ' +
                  'data-container="body"></i>' +
                  '<i class="download icon xi-download xc-action fa-14" ' +
                  'title="' + UDFTStr.Download + '" data-toggle="tooltip" ' +
                  'data-container="body"></i>' +
                  '<i class="delete icon xi-trash xc-action fa-14" ' +
                  'title="' + UDFTStr.Del + '" data-toggle="tooltip" ' +
                  'data-container="body"></i>' +
                '</div>' +
              '</div>';
        }

        $section.find(".numUDF").text(len)
            .end()
            .find(".udfListSection").html(html);
    }

    function getEntireUDF(moduleName) {
        if (!storedUDF.hasOwnProperty(moduleName)) {
            var error = xcHelper.replaceMsg(ErrWRepTStr.NoUDF, {
                "udf": moduleName
            });
            return PromiseHelper.reject(error);
        }

        var deferred = jQuery.Deferred();

        var entireString = storedUDF[moduleName];
        if (entireString == null) {
            XcalarDownloadPython(moduleName)
            .then(function(udfStr) {
                storedUDF[moduleName] = udfStr;
                deferred.resolve(udfStr);
            })
            .fail(deferred.reject);
        } else {
            deferred.resolve(entireString);
        }

        return deferred.promise();
    }

    function isEditableUDF(moduleName) {
        if (moduleName === defaultModule && !gUdfDefaultNoCheck) {
            return false;
        }

        return true;
    }

    function readUDFFromFile(file, moduleName) {
        var reader = new FileReader();
        reader.onload = function(event) {

            var entireString = event.target.result;
            editor.setValue(entireString);
        };

        reader.readAsText(file);
        $("#udf-fnName").val(moduleName);
        $("#udf-fnList input").val("");
    }

    function downloadUDF(moduleName) {
        var deferred = jQuery.Deferred();
        getEntireUDF(moduleName)
        .then(function(entireString) {
            if (entireString == null) {
                Alert.error(SideBarTStr.DownloadError, SideBarTStr.DownloadMsg);
            } else {
                xcHelper.downloadAsFile(moduleName, entireString);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error(SideBarTStr.DownloadError, error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function deleteUDF(moduleName) {
        xcAssert(storedUDF.hasOwnProperty(moduleName), "Delete UDF error");

        XcalarDeletePython(moduleName)
        .then(function() {
            delete storedUDF[moduleName];
            updateUDF();

            refreshUDF(true);

            xcHelper.showSuccess(SuccessTStr.DelUDF);
        })
        .fail(function(error) {
            Alert.error(UDFTStr.DelFail, error);
        });
    }

    function upload(moduleName, entireString, type) {
        moduleName = moduleName.toLowerCase();

        if (!isEditableUDF(moduleName)) {
            Alert.error(SideBarTStr.UploadError, SideBarTStr.OverwriteErr);
            return PromiseHelper.reject(SideBarTStr.OverwriteErr);
        }

        var deferred = jQuery.Deferred();

        if (storedUDF.hasOwnProperty(moduleName)) {
            var msg = xcHelper.replaceMsg(SideBarTStr.DupUDFMsg, {
                "module": moduleName
            });

            Alert.show({
                "title": SideBarTStr.DupUDF,
                "msg": msg,
                "onConfirm": function() { uploadHelper("UDF"); },
                "onCancel": function() { deferred.resolve(); },
                "focusOnConfirm": true
            });
        } else {
            uploadHelper(type);
        }

        function uploadHelper(type) {
            var isIconBtn = true;
            var $fnUpload = $("#udf-fnUpload");
            var hasToggleBtn = false;

            // if upload finish with in 1 second, do not toggle
            var timer = setTimeout(function() {
                hasToggleBtn = true;
                xcHelper.toggleBtnInProgress($fnUpload, isIconBtn);
            }, 1000);

            if (type === "UDF") {
                XcalarUploadPython(moduleName, entireString)
                .then(function() {
                    UDF.storePython(moduleName, entireString);
                    KVStore.commit();
                    xcHelper.showSuccess(SuccessTStr.UploadUDF);

                    refreshUDF(true);

                    deferred.resolve();
                })
                .fail(function(error) {
                    // XXX might not actually be a syntax error
                    var syntaxErr = parseSytanxError(error);
                    if (syntaxErr != null) {
                        var errMsg = xcHelper.replaceMsg(SideBarTStr.UDFError, syntaxErr);
                        Alert.error(SideBarTStr.SyntaxError, errMsg);
                        updateHints(syntaxErr);
                    } else {
                        // when cannot parse the error
                        Alert.error(SideBarTStr.UploadError, error);
                    }

                    deferred.reject(error);
                })
                .always(function() {
                    if (hasToggleBtn) {
                        // toggle back
                        xcHelper.toggleBtnInProgress($fnUpload);
                    } else {
                        clearTimeout(timer);
                    }
                });
            } else {
                XcalarAppSet(moduleName, "Python", "Import", entireString)
                .then(function() {
                    xcHelper.showSuccess(SuccessTStr.UploadApp);
                    deferred.resolve();
                })
                .fail(function(error) {
                    Alert.error(SideBarTStr.UploadError, error);
                    deferred.reject();
                })
                .always(function() {
                    if (hasToggleBtn) {
                        // toggle back
                        xcHelper.toggleBtnInProgress($fnUpload);
                    } else {
                        clearTimeout(timer);
                    }
                });
            }
        }

        return deferred.promise();
    }

    function parseSytanxError(error) {
        if (!error || !error.error) {
            return null;
        }

        var splits = error.error.split(",");
        if (splits.length < 3) {
            console.error("cannot parse error", error);
            return null;
        }

        var reasonPart = splits[0].split("(");
        if (reasonPart.length < 2) {
            console.error("cannot parse error", error);
            return null;
        }

        var reason = reasonPart[1].trim();
        var line = Number(splits[2].trim());
        if (!Number.isInteger(line)) {
            console.error("cannot parse error", error);
            return null;
        }

        return {
            "reason": reason,
            "line": line
        };
    }

    function updateHints(error) {
        editor.operation(function(){
            for (var i = 0, len = udfWidgets.length; i < len; i++) {
                editor.removeLineWidget(udfWidgets[i]);
            }
            udfWidgets.length = 0;

            if (!error) {
                return;
            }

            var msg = document.createElement("div");
            var icon = msg.appendChild(document.createElement("span"));
            icon.innerHTML = "!";
            icon.className = "lint-error-icon";
            msg.appendChild(document.createTextNode(error.reason));
            msg.className = "lint-error";
            udfWidgets.push(editor.addLineWidget(error.line - 1, msg, {
                "coverGutter": false,
                "noHScroll": true,
                "above": true
            }));
        });

        var info = editor.getScrollInfo();
        var after = editor.charCoords({line: editor.getCursor().line + 1, ch: 0}, "local").top;
        if (info.top + info.clientHeight < after) {
            editor.scrollTo(null, after - info.clientHeight + 3);
        }
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        UDF.__testOnly__ = {};
        UDF.__testOnly__.isEditableUDF = isEditableUDF;
        UDF.__testOnly__.getEntireUDF = getEntireUDF;
        UDF.__testOnly__.downloadUDF = downloadUDF;
        UDF.__testOnly__.parseSytanxError = parseSytanxError;
        UDF.__testOnly__.uploadUDF = upload;
    }
    /* End Of Unit Test Only */

    return (UDF);
}(jQuery, {}));

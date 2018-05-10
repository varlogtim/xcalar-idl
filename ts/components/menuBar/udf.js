// this is a sub module of bottomMenu
window.UDF = (function($, UDF) {
    var editor;
    var storedUDF = {};
    var udfWidgets = [];
    var dropdownHint;

    // constant
    var udfDefault = "# PLEASE TAKE NOTE: \n\n" +
                    "# UDFs can only support\n" +
                    "# return values of \n" +
                    "# type String.\n\n"+
                    "# Function names that \n" +
                    "# start with __ are\n" +
                    "# considered private\n"+
                    "# functions and will not\n" +
                    "# be directly invokable.\n\n";
    var defaultModule = "default";

    UDF.setup = function() {
        setupUDF();
        setupTemplateList();
    };

    UDF.initialize = function() {
        var deferred = PromiseHelper.deferred();

        initializeUDFList(true)
        .then(function(listXdfsObj) {
            listXdfsObj.fnDescs = xcHelper.filterUDFs(listXdfsObj.fnDescs);
            listXdfsObj.numXdfs = listXdfsObj.fnDescs.length;

            DSExport.refreshUDF(listXdfsObj);
            DSTargetManager.updateUDF(listXdfsObj);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    UDF.clear = function() {
        UDF.clearEditor();
        storedUDF = {};
        $("#udf-fnMenu").find('li[name=blank]')
                    .siblings().remove();
    };

    UDF.clearEditor = function() {
        // clear CodeMirror
        if (editor != null) {
            // Wrap in if because KVStore.restore may call UDF.clear()
            // and at that time editor has not setup yet.
            editor.setValue(udfDefault);
            editor.clearHistory();
        }
    };

    UDF.getEditor = function() {
        return editor;
    };

    UDF.getUDFs = function() {
        return storedUDF;
    };

    // used in extManager.js
    UDF.storePython = function(moduleName, entireString) {
        storePython(moduleName, entireString);
        updateUDF();
    };

    function storePython(moduleName, entireString) {
        storedUDF[moduleName] = entireString;
    }

    UDF.refresh = function(isInBg) {
        return refreshUDF(isInBg);
    };

    UDF.refreshWithoutClearing = function(clearCache) {
        if (clearCache) {
            storedUDF = {};
        }

        return refreshUDF(true, true);
    };

    UDF.list = function(workbookOnly) {
        var deferred = PromiseHelper.deferred();
        XcalarListXdfs("*", "User*")
        .then(function(res) {
            if (workbookOnly) {
                res.fnDescs = xcHelper.filterUDFs(res.fnDescs);
                res.numXdfs = res.fnDescs.length;
            }
            deferred.resolve(res);
        })
        .fail(deferred.reject);
        return deferred.promise();
    };

    UDF.selectUDFFuncList = function(module) {
        inputUDFFuncList(module);
    };


    UDF.getCurrWorkbookPath = function() {
        return ("/workbook/" + XcSupport.getUser() + "/" +
                WorkbookManager.getWorkbook(
                WorkbookManager.getActiveWKBK()).name + "/udf/");
    };

    function initializeUDFList(isSetup, doNotClear) {
        var deferred = PromiseHelper.deferred();

        // update udf
        UDF.list()
        .then(function(listXdfsObj) {
            var oldStoredUDF = xcHelper.deepCopy(storedUDF);
            // list udf and filter out temp udfs
            listXdfsObj.fnDescs = listXdfsObj.fnDescs.filter(function(udf) {
                var moduleName = udf.fnName.split(":")[0];

                if (!storedUDF.hasOwnProperty(moduleName)) {
                    // this means moduleName exists
                    // when user fetch this module,
                    // the entire string will cached here
                    storedUDF[moduleName] = null;
                } else {
                    delete oldStoredUDF[moduleName];
                }
                return true;
            });
            listXdfsObj.numXdfs = listXdfsObj.fnDescs.length;
            // remove udfs that not exist any more
            for (var key in oldStoredUDF) {
                delete storedUDF[key];
            }
            updateUDF(doNotClear);
            deferred.resolve(xcHelper.deepCopy(listXdfsObj));
        })
        .fail(function(error) {
            updateUDF(doNotClear); // stil update
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
            "lineWrapping": true,
            "indentWithTabs": false,
            "indentUnit": 4,
            "matchBrackets": true,
            "autoCloseBrackets": true,
            "search": true
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

        $udfSection.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

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

        /* upload udf section */
        $("#udf-fnName").keypress(function(event) {
            if (event.which === keyCode.Enter) {
                $('#udf-fnUpload').click();
                $(this).blur();
            }
        });

        $("#udf-fnUpload").click(function() {
            $(this).blur();
            var moduleName = validateUDFName();
            if (moduleName == null) {
                return;
            }

            var entireString = validateUDFStr();
            if (entireString == null) {
                return;
            }
            upload(moduleName, entireString);
        });
        /* end of upload udf section */

        /* udf manager section */
        var $udfManager = $("#udf-manager");
        // edit udf
        $udfManager.on("click", ".udf .edit", function() {
            var modulePath = $(this).closest(".udf").find(".text")
                                                    .attr("data-udf-path");
            var moduleName = $(this).closest(".udf").find(".text");
            // switch to first tab
            $("#udfSection .tab:first-child").click();
            var $li = $("#udf-fnMenu").find("li").filter(function() {
                return $(this).text() === moduleName;
            });
            if ($li.length) {
                $li.click();
            } else {
                getAndFillUDF(modulePath);
            }
        });

        $udfManager.on("click", ".udfManagerHeader", function() {
            $expandList = $(this).closest(".xc-expand-list");
            $expandList.toggleClass("active");
        });

        $udfManager.on("click", ".managerDataflowHeader", function() {
            $expandList = $(this).closest(".xc-expand-list");
            $expandList.toggleClass("active");
            $(this).find(".xi-arrow-down").toggleClass("hidden");
        });

        // download udf
        $udfManager.on("click", ".udf .download", function() {
            var moduleName = $(this).closest(".udf").find(".text").attr("data-udf-path");
            downloadUDF(moduleName);
        });

        // delete udf
        $udfManager.on("click", ".udf .delete", function() {
            var moduleName = $(this).closest(".udf").find(".text").attr("data-udf-path");
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

    function setupTemplateList() {
        /* Template dropdown list */
        var $template = $("#udf-fnList");
        var menuHelper = new MenuHelper($template, {
            "onSelect": selectUDFFuncList,
            "container": "#udfSection",
            "bounds": "#udfSection",
            "bottomPadding": 2
        });

        dropdownHint = new InputDropdownHint($template, {
            "menuHelper": menuHelper,
            "onEnter": inputUDFFuncList
        });
    }

    function inputUDFFuncList(module) {
        var $li = $("#udf-fnMenu").find("li").filter(function() {
            return $(this).text() === module;
        });

        if ($li.length === 0) {
            StatusBox.show(UDFTStr.NoTemplate, $("#udf-fnList"));
            return true;
        } else {
            selectUDFFuncList($li);
            return false;
        }
    }

    function selectUDFFuncList($li) {
        if ($li.hasClass("udfHeader") || $li.hasClass("dataflowHeader")) {
            return;
        }

        $li.parent().find("li").removeClass("selected");
        $li.addClass("selected");

        var modulePath = $li.attr("data-udf-path");
        var moduleName = $li.text();
        var $fnListInput = $("#udf-fnList input");
        var $fnName = $("#udf-fnName");

        StatusBox.forceHide();
        dropdownHint.setInput(moduleName);

        xcTooltip.changeText($fnListInput, moduleName);

        if ($li.attr("name") === "blank") {
            $fnName.val("");
            editor.setValue(udfDefault);
        } else {
            getAndFillUDF(modulePath);
        }
    }

    function getAndFillUDF(modulePath) {
        var $fnListInput = $("#udf-fnList input");
        var $fnName = $("#udf-fnName");
        var moduleName = modulePath.split("/").pop();

        $fnListInput.val(moduleName);
        xcTooltip.changeText($fnListInput, moduleName);
        $fnName.val(moduleName);

        getEntireUDF(modulePath)
        .then(fillUDFFunc)
        .fail(function(error) {
            fillUDFFunc("#" + xcHelper.parseError(error));
        });

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

    function refreshUDF(isInBg, doNotClear) {
        var deferred = PromiseHelper.deferred();
        var $udfManager = $("#udf-manager");
        $udfManager.addClass("loading");
        if (!isInBg) {
            xcHelper.showRefreshIcon($udfManager);
        }

        initializeUDFList(false, doNotClear)
        .then(function(listXdfsObj) {
            listXdfsObj.fnDescs = xcHelper.filterUDFs(listXdfsObj.fnDescs);
            listXdfsObj.numXdfs = listXdfsObj.fnDescs.length;
            DSPreview.update(listXdfsObj);
            DSTargetManager.updateUDF(listXdfsObj);
            FnBar.updateOperationsMap(listXdfsObj.fnDescs, true);
            DSExport.refreshUDF(listXdfsObj);
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(function() {
            $udfManager.removeClass("loading");
        });

        return deferred.promise();
    }

    function updateUDF(doNotClear) {
        // store by name
        var currWorkbookModules = []; // current workbook
        var defaultModules = []; // xcalar default module
        var otherWorkbookModules = []; // current user, different workbooks
        var otherUsersModules = []; // other users
        var dataflowModules = [];
        var otherModules = [];

        var sortedUDF = Object.keys(storedUDF).sort();
        var userName = XcSupport.getUser();
        var wbName = WorkbookManager.getWorkbook(
                        WorkbookManager.getActiveWKBK()).name;

        for (var i = 0; i < sortedUDF.length; i++) {
            var udf = sortedUDF[i];
            var moduleSplit = sortedUDF[i].split("/");
            if (moduleSplit[1] === "dataflow") {
                dataflowModules.push(udf);
            } else {
                if (moduleSplit[2] === userName && moduleSplit[3] === wbName) {
                    currWorkbookModules.push(udf);
                } else if (moduleSplit[2] === "udf" && moduleSplit[3] === "default") {
                    defaultModules.push(udf);
                } else if (moduleSplit[2] === userName) {
                    otherWorkbookModules.push(udf);
                } else if (moduleSplit.length === 6 && moduleSplit[1] === "workbook") {
                    otherUsersModules.push(udf);
                } else if (storedUDF[udf]) {
                    otherModules.push(udf);
                }
            }
        }

        // concat in this order
        var otherUDFModules = otherUsersModules.concat(otherModules);

        updateTemplateList(currWorkbookModules, doNotClear);
        updateManager(currWorkbookModules, defaultModules, otherWorkbookModules,
            otherUDFModules, dataflowModules);
    }

    function updateTemplateList(moduleNames, doNotClear) {
        var $input = $("#udf-fnList input");
        var $blankFunc = $("#udf-fnMenu").find('li[name=blank]');
        var selectedModule = $input.val();
        var hasSelectedModule = false;
        var html = "";
        var liClass = "workbookUDF";
        for (var i = 0, len = moduleNames.length; i < len; i++) {
            var module = moduleNames[i];
            var moduleSplit = module.split("/");
            var moduleName = moduleSplit[moduleSplit.length - 1];
            var tempHTML = '<li class="tooltipOverflow' + liClass + '"' +
                    ' data-toggle="tooltip"' +
                    ' data-container="body"' +
                    ' data-placement="top"' +
                    ' data-title="' + moduleName +
                    '" data-udf-path="' + module + '">' +
                        moduleName +
                    '</li>';


            html += tempHTML;
            if (!hasSelectedModule && module === selectedModule) {
                hasSelectedModule = true;
            }
        }

        $blankFunc.siblings().remove();
        $blankFunc.after(html);

        if (!hasSelectedModule && !doNotClear) {
            dropdownHint.clearInput();
            $blankFunc.trigger(fakeEvent.mouseup);
        } else if (hasSelectedModule && doNotClear) {
            inputUDFFuncList(selectedModule);
        }
    }

    function getUDFSectionHTML(title, content, expand) {
        var html = '<div class="listWrap xc-expand-list' + (expand? ' active' : '') + '">' +
                        '<div class="udfManagerHeader listInfo no-selection">' +
                            '<span class="expand">' +
                                '<i class="icon xi-arrow-down fa-9"></i>' +
                            '</span>' +
                            '<span class="text">' +
                                title +
                            '</span>' +
                        '</div>' +
                        content +
                    '</div>';
        return html;
    }

    function getUDFListHTML(moduleName, isEditable) {
        var udfClass = "udf";
        var moduleSplit = moduleName.split("/");
        var icon = "";

        if (isEditable) {
            icon = '<i class="edit icon xi-edit xc-action fa-14" ' +
            'title="' + UDFTStr.Edit + '" data-toggle="tooltip" ' +
            'data-container="body"></i>';
        } else {
            udfClass += " uneditable";
            icon = '<i class="edit icon xi-show xc-action fa-14" ' +
            'title="' + UDFTStr.View + '" data-toggle="tooltip" ' +
            'data-container="body"></i>';
        }

        var html =
                '<div class="' + udfClass + '">' +
                    '<div class="iconWrap udfIcon">' +
                        '<i class="icon xi-module center fa-15"></i>' +
                    '</div>' +
                    '<div class="text tooltipOverflow"' +
                    ' data-toggle="tooltip"' +
                    ' data-container="body"' +
                    ' data-placement="top"' +
                    ' data-title="' + moduleName +
                    '" data-udf-path="' + moduleName + '">' +
                        moduleSplit[moduleSplit.length - 1] +
                    '</div>' +
                    '<div class="actions">' +
                        icon +
                        '<i class="download icon xi-download xc-action fa-14" ' +
                        'title="' + UDFTStr.Download + '" data-toggle="tooltip" ' +
                        'data-container="body"></i>' +
                        '<i class="delete icon xi-trash xc-action fa-14" ' +
                        'title="' + UDFTStr.Del + '" data-toggle="tooltip" ' +
                        'data-container="body"></i>' +
                    '</div>' +
                '</div>';
        return html;
    }

    function getGeneralUDFHTML(title, moduleName, getSubHeading) {
        // split modules by subHeading
        var subHeadingMaps = {};
        var subHeadingList = [];
        moduleName.forEach(function(moduelName) {
            var subHeading = getSubHeading(moduelName);
            if (!subHeadingMaps.hasOwnProperty(subHeading)) {
                subHeadingMaps[subHeading] = [];
                subHeadingList.push(subHeading);
            }
            subHeadingMaps[subHeading].push(moduelName);
        });

        var content = '';
        subHeadingList.forEach(function(subHeading) {
            var moduleNames = subHeadingMaps[subHeading];
            var list = '';
            moduleNames.forEach(function(moduleName) {
                list += getUDFListHTML(moduleName, false);
            });

            content +=
                '<div class="listWrap xc-expand-list active">' +
                    '<div class="managerDataflowHeader listInfo no-selection">' +
                        '<span class="expand">' +
                            '<i class="icon xi-arrow-down fa-9"></i>' +
                        '</span>' +
                        '<span class="text">' +
                            subHeading +
                        '</span>' +
                    '</div>' +
                    list +
                '</div>';
        });
        return getUDFSectionHTML(title, content);
    }

    function getMyCurrentWorkbookUDFs(currWorkbookModules, defaultModules) {
        var content = '';
        currWorkbookModules.forEach(function(moduleName) {
            content += getUDFListHTML(moduleName, true);
        });

        defaultModules.forEach(function(moduleName) {
            content += getUDFListHTML(moduleName, false);
        });

        return getUDFSectionHTML(UDFTStr.MyUDFS, content, true);
    }

    function getMyOtherWorkbooksUDFs(moduleNames) {
        var getSubHeading = function(moduleName) {
            var moduleSplit = moduleName.split("/");
            return moduleSplit[3];
        };
        return getGeneralUDFHTML(UDFTStr.MYOTHERUDFS, moduleNames, getSubHeading);
    }

    function getOtherUsersUDFs(moduleNames) {
        var getSubHeading = function(moduleName) {
            var moduleSplit = moduleName.split("/");
            return moduleSplit[2] + " / " + moduleSplit[3];
        };
        return getGeneralUDFHTML(UDFTStr.OtherUDFS, moduleNames, getSubHeading);
    }

    function getDFUDFs(moduleNames) {
        var getSubHeading = function(moduleName) {
            var moduleSplit = moduleName.split("/");
            return moduleSplit[2];
        };
        return getGeneralUDFHTML(UDFTStr.DFUDFS, moduleNames, getSubHeading);
    }

    function updateManager(currWorkbookModules, defaultModules, otherWorkbookModules, otherModules, dfModuels) {
        var $section = $("#udf-manager");
        var len = currWorkbookModules.length + defaultModules.length +
        otherWorkbookModules.length + otherModules.length + dfModuels.length;
        var html = getMyCurrentWorkbookUDFs(currWorkbookModules, defaultModules) +
            getMyOtherWorkbooksUDFs(otherWorkbookModules) +
            getOtherUsersUDFs(otherModules) +
            getDFUDFs(dfModuels);

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

        var deferred = PromiseHelper.deferred();

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
        dropdownHint.clearInput();
    }

    function downloadUDF(moduleName) {
        var deferred = PromiseHelper.deferred();
        getEntireUDF(moduleName)
        .then(function(entireString) {
            if (entireString == null) {
                Alert.error(SideBarTStr.DownloadError, SideBarTStr.DownloadMsg);
            } else {
                var moduleSplit = moduleName.split("/");
                xcHelper.downloadAsFile(moduleSplit[moduleSplit.length - 1], entireString);
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
        .then(deleteUDFResolve)
        .fail(function(error) {
            // assume deletion if module is not listed
            if (error && error.status === StatusT.StatusUdfModuleNotFound) {
                XcalarListXdfs(moduleName + ":*", "User*")
                .then(function(listXdfsObj) {
                    if (listXdfsObj.numXdfs === 0) {
                        deleteUDFResolve();
                    } else {
                        Alert.error(UDFTStr.DelFail, error);
                    }
                })
                .fail(function(otherErr) {
                    console.warn(otherErr);
                    Alert.error(UDFTStr.DelFail, error);
                });
            } else {
                Alert.error(UDFTStr.DelFail, error);
            }
        });

        function deleteUDFResolve() {
            delete storedUDF[moduleName];
            updateUDF();
            refreshUDF(true);
            var xcSocket = XcSocket.Instance;
            xcSocket.sendMessage("refreshUDFWithoutClear");
            xcHelper.showSuccess(SuccessTStr.DelUDF);
        }
    }

    function validateUDFName() {
        var $fnName = $("#udf-fnName");
        var moduleName = $fnName.val().trim().toLowerCase();
        var options = {"side": "top", "offsetY": -2};

        if (moduleName === "") {
            StatusBox.show(ErrTStr.NoEmpty, $fnName, true, options);
            return null;
        } else if (!xcHelper.checkNamePattern("udf", "check", moduleName)) {
            StatusBox.show(UDFTStr.InValidName, $fnName, true, options);
            return null;
        } else if (moduleName.length >
                   XcalarApisConstantsT.XcalarApiMaxUdfModuleNameLen)
        {
            StatusBox.show(ErrTStr.LongFileName, $fnName, true, options);
            return null;
        }

        return moduleName;
    }

    function validateUDFStr() {
        // Get code written and call thrift call to upload
        var entireString = editor.getValue();
        var $editor = $("#udf-fnSection .CodeMirror");
        var options = {"side": "top", "offsetY": -2};

        if (entireString.trim() === "" ||
            entireString.trim() === udfDefault.trim())
        {
            StatusBox.show(ErrTStr.NoEmptyFn, $editor, false, options);
            return null;
        } else if (entireString.trim().length >
                   XcalarApisConstantsT.XcalarApiMaxUdfSourceLen) {
            StatusBox.show(ErrTStr.LargeFile, $editor, false, options);
            return null;
        }
        return entireString;
    }

    function upload(moduleName, entireString) {
        moduleName = moduleName.toLowerCase();

        if (!isEditableUDF(moduleName)) {
            Alert.error(SideBarTStr.UploadError, SideBarTStr.OverwriteErr);
            return PromiseHelper.reject(SideBarTStr.OverwriteErr);
        }

        var deferred = PromiseHelper.deferred();
        var udfPath = UDF.getCurrWorkbookPath() + moduleName;
        if (storedUDF.hasOwnProperty(udfPath)) {
            var msg = xcHelper.replaceMsg(SideBarTStr.DupUDFMsg, {
                "module": moduleName
            });

            Alert.show({
                "title": SideBarTStr.DupUDF,
                "msg": msg,
                "onConfirm": function() { uploadHelper(); },
                "onCancel": function() { deferred.resolve(); },
                "focusOnConfirm": true
            });
        } else {
            uploadHelper();
        }

        function uploadHelper() {
            var $fnUpload = $("#udf-fnUpload");
            var hasToggleBtn = false;

            // if upload finish with in 1 second, do not toggle
            var timer = setTimeout(function() {
                hasToggleBtn = true;
                xcHelper.toggleBtnInProgress($fnUpload);
            }, 1000);

            xcHelper.disableSubmit($fnUpload);

            XcalarUploadPython(moduleName, entireString)
            .then(function() {
                storePython(moduleName, entireString);
                KVStore.commit();
                xcHelper.showSuccess(SuccessTStr.UploadUDF);

                refreshUDF(true, true);
                var $uploadedFunc = $("#udf-fnMenu")
                                .find('li[data-title="' + moduleName +
                                       '"]');
                // select list directly use
                // $uploadedFunc.trigger(fakeEvent.mouseup) will reset
                // the cursor, which might be ignoring
                if ($uploadedFunc.length) {
                    $("#udf-fnList input").val(moduleName);
                } else {
                    $("#udf-fnList input").val("");
                }
                var xcSocket = XcSocket.Instance;
                xcSocket.sendMessage("refreshUDFWithoutClear");
                deferred.resolve();
            })
            .fail(function(error) {
                // XXX might not actually be a syntax error
                var syntaxErr = parseSyntaxError(error);
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
                xcHelper.enableSubmit($fnUpload);
            });
        }
        return deferred.promise();
    }

    function parseSyntaxError(error) {
        if (!error || !error.error) {
            return null;
        }

        try {
            var splits = error.error.match(/^.*: '(.*)' at line (.*) column (.*)/);
            if (!splits || splits.length < 3) {
                console.error("cannot parse error", error);
                return null;
            }
            var reason = splits[1].trim();
            var line = Number(splits[2].trim());
            if (!Number.isInteger(line)) {
                console.error("cannot parse error", error);
                return null;
            }
            return {
                "reason": reason,
                "line": line
            };
        } catch (error) {
            console.error("cannot parse error", error);
            return null;
        }
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
        UDF.__testOnly__.parseSyntaxError = parseSyntaxError;
        UDF.__testOnly__.uploadUDF = upload;
        UDF.__testOnly__.inputUDFFuncList = inputUDFFuncList;
        UDF.__testOnly__.readUDFFromFile = readUDFFromFile;
    }
    /* End Of Unit Test Only */

    return (UDF);
}(jQuery, {}));

// this is a sub module of bottomMenu
window.UDF = (function($, UDF) {
    var editor;
    var storedUDF = {};
    var udfWidgets = [];

    // constant
    var udfDefault = "# PLEASE TAKE NOTE: \n" +
                    "# UDFs can only support\n" +
                    "# return values of \n" +
                    "# type String\n\n"+
                    "# Function names that \n" +
                    "# start with __ are\n" +
                    "# considered private\n"+
                    "# functions and will not\n" +
                    "# be directly invokable\n\n";
    var defaultModule = "default";

    UDF.setup = function() {
        setupUDF();
    };

    UDF.initialize = function() {
        initializeUDFList()
        .then(defaultUDFUpload);
        // Note that defaultUDFUpload() will append the default UDF
        // to udf list, so it should come after initializeUDFList();
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
        return (editor);
    };

    UDF.getUDFs = function() {
        return (storedUDF);
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
                "name"                  : "python",
                "version"               : 3,
                "singleLineStringErrors": false
            },
            "theme"            : "rubyblue",
            "lineNumbers"      : true,
            "indentWithTabs"   : false,
            "indentUnit"       : 4,
            "matchBrackets"    : true,
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
            "onSelect": function($li) {
                $li.parent().find("li").removeClass("selected");
                $li.addClass("selected");
                var moduleName = $li.text();

                StatusBox.forceHide();
                $("#udf-fnList input").val(moduleName);

                var $fnName = $("#udf-fnName");
                if ($li.attr("name") === "blank") {
                    $fnName.val("");
                    editor.setValue(udfDefault);
                } else {
                    // auto-fill moduleName
                    $fnName.val(moduleName);
                    getEntireUDF(moduleName)
                    .then(function(entireString) {
                        if (entireString == null) {
                            editor.setValue("#" + SideBarTStr.DownoladMsg);
                        } else {
                            editor.setValue(entireString);
                        }
                    })
                    .fail(function(error) {
                        editor.setValue("#" + error);
                    });
                }
            },
            "container"    : "#udfSection",
            "bounds"       : '#udfSection',
            "bottomPadding": 2
        }).setupListeners();
        /* end of function input section */

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
                XcalarApisConstantsT.XcalarApiMaxPyModuleNameLen) {
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
                       XcalarApisConstantsT.XcalarApiMaxPyModuleSrcLen) {
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

            uploadUDF(moduleName, entireString);
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
            }).click();
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
                "title"    : UDFTStr.DelTitle,
                "msg"      : UDFTStr.DelMsg,
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
            var val = editor.getValue().trim();
            if (keysToIgnore.indexOf(e.keyCode) < 0) {
                editor.execCommand("autocompleteUDF");
            }
        });

        // set up codemirror autcomplete command
        CodeMirror.commands.autocompleteUDF = function(cm) {
            CodeMirror.showHint(cm, CodeMirror.pythonHint, {
                alignWithWord        : true,
                completeSingle       : false,
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
            $blankFunc.click();
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
        var deferred = jQuery.Deferred();

        if (!storedUDF.hasOwnProperty(moduleName)) {
            var error = "UDF: " + moduleName + " not exists";
            throw error;
        }

        var entireString = storedUDF[moduleName];
        if (entireString == null) {
            XcalarDownloadPython(moduleName)
            .then(deferred.resolve)
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
        getEntireUDF(moduleName)
        .then(function(entireString) {
            if (entireString == null) {
                Alert.error(SideBarTStr.DownloadError, SideBarTStr.DownoladMsg);
                return;
            }
            xcHelper.downloadAsFile(moduleName, entireString);
        })
        .fail(function(error) {
            Alert.error(SideBarTStr.DownloadError, error);
        });
    }

    function deleteUDF(moduleName) {
        xcHelper.assert(storedUDF.hasOwnProperty(moduleName),
                        "Delete UDF error");

        XcalarDeletePython(moduleName)
        .then(function() {
            delete storedUDF[moduleName];
            updateUDF();

            refreshUDF(true);

            xcHelper.showSuccess();
        })
        .fail(function(error) {
            Alert.error(UDFTStr.DelFail, error);
        });
    }

    function uploadUDF(moduleName, entireString) {
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
                "title"         : SideBarTStr.DupUDF,
                "msg"           : msg,
                "onConfirm"     : function() { uploadHelper(); },
                "onCancel"      : function() { deferred.resolve(); },
                "focusOnConfirm": true
            });
        } else {
            uploadHelper();
        }

        function uploadHelper() {
            var isIconBtn = true;
            var $fnUpload = $("#udf-fnUpload");
            var hasToggleBtn = false;

            // if upload finish with in 1 second, do not toggle
            var timer = setTimeout(function() {
                hasToggleBtn = true;
                xcHelper.toggleBtnInProgress($fnUpload, isIconBtn);
            }, 1000);

            XcalarUploadPython(moduleName, entireString)
            .then(function() {
                UDF.storePython(moduleName, entireString);
                KVStore.commit();
                xcHelper.showSuccess();

                refreshUDF(true);

                deferred.resolve();
            })
            .fail(function(error) {
                if (error.status === StatusT.StatusPyExecFailedToCompile) {
                    // XXX might not actually be a syntax error
                    var syntaxErr = parseSytanxError(error);
                    if (syntaxErr != null) {
                        var errMsg = xcHelper.replaceMsg(SideBarTStr.UDFError, syntaxErr);
                        Alert.error(SideBarTStr.SyntaxError, errMsg);
                        updateHints(syntaxErr);
                    } else {
                        // when cannot parse the error
                        Alert.error(SideBarTStr.SyntaxError, error);
                    }
                } else {
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
            "line"  : line
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
                "noHScroll"  : true,
                "above"      : true
            }));
        });

        var info = editor.getScrollInfo();
        var after = editor.charCoords({line: editor.getCursor().line + 1, ch: 0}, "local").top;
        if (info.top + info.clientHeight < after) {
            editor.scrollTo(null, after - info.clientHeight + 3);
        }
    }

    function defaultUDFUpload() {
        var moduleName = defaultModule;
        var entireString =
        udfDefault +
        'import sys\n' +
        '# For 2.7\n' +
        'sys.path.append("/usr/local/lib/python2.7/dist-packages/apache_log_parser-1.6.1.dev-py2.7.egg")\n' +
        'sys.path.append("/usr/local/lib/python2.7/dist-packages/user_agents-0.3.2-py2.7.egg")\n' +
        'sys.path.append("/usr/local/lib/python2.7/dist-packages/ua_parser-0.3.6-py2.7.egg")\n' +
        'sys.path.append("/usr/lib/python2.7/")\n' +
        'sys.path.append("/usr/lib/python2.7/plat-x86_64-linux-gnu")\n' +
        'sys.path.append("/usr/lib/python2.7/lib-tk")\n' +
        'sys.path.append("/usr/lib/python2.7/lib-old")\n' +
        'sys.path.append("/usr/lib/python2.7/lib-dynload")\n' +
        'sys.path.append("/usr/local/lib/python2.7/dist-packages")\n' +
        'sys.path.append("/usr/lib/python2.7/dist-packages")\n' +
        'sys.path.append("/usr/lib/python2.7/dist-packages/PILcompat")\n' +
        'sys.path.append("/usr/lib/python2.7/dist-packages/gtk-2.0")\n' +
        'sys.path.append("/usr/lib/python2.7/dist-packages/ubuntu-sso-client")\n' +
        '\n' +
        'import xlrd\n' +
        'import datetime\n' +
        'import time\n' +
        'import pytz\n' +
        'import re\n' +
        'import dateutil.parser\n' +
        '\n' +
        "# %a    Locale's abbreviated weekday name.\n" +
        "# %A    Locale's full weekday name.\n" +
        "# %b    Locale's abbreviated month name.\n" +
        "# %B    Locale's full month name.\n" +
        "# %c    Locale's appropriate date and time representation.\n" +
        "# %d    Day of the month as a decimal number [01,31].\n" +
        "# %H    Hour (24-hour clock) as a decimal number [00,23].\n" +
        "# %I    Hour (12-hour clock) as a decimal number [01,12].\n" +
        "# %j    Day of the year as a decimal number [001,366].\n" +
        "# %m    Month as a decimal number [01,12].\n" +
        "# %M    Minute as a decimal number [00,59].\n" +
        "# %p    Locale's equivalent of either AM or PM. (1)\n" +
        "# %S    Second as a decimal number [00,61]. (2)\n" +
        "# %U    Week number of the year (Sunday as the first day of the week) as a decimal number [00,53]. All days in a new year preceding the first Sunday are considered to be in week 0.    (3)\n" +
        "# %w    Weekday as a decimal number [0(Sunday),6].\n" +
        "# %W    Week number of the year (Monday as the first day of the week) as a decimal number [00,53]. All days in a new year preceding the first Monday are considered to be in week 0.    (3)\n" +
        "# %x    Locale's appropriate date representation.\n" +
        "# %X    Locale's appropriate time representation.\n" +
        "# %y    Year without century as a decimal number [00,99].\n" +
        "# %Y    Year with century as a decimal number.\n" +
        "# %Z    Time zone name (no characters if no time zone exists).\n" +
        "# %%    A literal '%' character.\n" +
        '\n' +
        'def convertFormats(colName, outputFormat, inputFormat="auto"):\n' +
            '\tif inputFormat == "auto":\n' +
                '\t\ttimeStruct = dateutil.parser.parse(colName).timetuple()\n' +
            '\telse:\n' +
                '\t\ttimeStruct = time.strptime(colName, inputFormat)\n' +
            '\toutString = time.strftime(outputFormat, timeStruct)\n' +
            '\treturn outString\n' +
        '\n' +
        'def convertFromUnixTS(colName, outputFormat):\n' +
            '\treturn datetime.datetime.fromtimestamp(float(colName)).strftime(outputFormat)\n' +
        '\n' +
        'def convertToUnixTS(colName, inputFormat="auto"):\n' +
            '\tif inputFormat == "auto":\n' +
                '\t\treturn str(float(time.mktime(dateutil.parser.parse(colName).timetuple())))\n' +
            '\treturn str(time.mktime(datetime.datetime.strptime(colName, inputFormat).timetuple()))\n' +
        '\n' +
        'def openExcel(stream, fullPath):\n' +
            '\tfileString = ""\n' +
            '\txl_workbook = xlrd.open_workbook(file_contents=stream)\n' +
            '\txl_sheet = xl_workbook.sheet_by_index(0)\n' +
            '\tnum_cols = xl_sheet.ncols   # Number of columns\n' +
            '\tfor row_idx in range(0, xl_sheet.nrows):    # Iterate through rows\n' +
                '\t\tcurRow = list()\n' +
                '\t\tfor col_idx in range(0, num_cols):  # Iterate through columns\n' +
                    '\t\t\tval = xl_sheet.cell_value(row_idx, col_idx)  # Get cell object by row, col\n' +
                    '\t\t\tif xl_sheet.cell_type(row_idx, col_idx) == xlrd.XL_CELL_DATE:\n' +
                        '\t\t\t\tval = "%s,%s" % (val, xl_workbook.datemode)\n' +
                    '\t\t\telse:\n' +
                        '\t\t\t\tval = "%s" % val\n' +
                    '\t\t\tcurRow.append(val)\n' +
                '\t\tfileString += "\\t".join(curRow)\n' +
                '\t\tfileString += "\\n"\n' +
            '\treturn str(fileString.encode("ascii", "ignore"))\n' +
        '\n' +
        'def convertExcelTime(colName, outputFormat):\n' +
            '\t(val, datemode) = colName.split(",")\n' +
            '\tif (not val or not datemode):\n' +
                '\t\treturn "Your input must be val,datemode"\n' +
            '\t(y, mon, d, h, m, s) = xlrd.xldate_as_tuple(float(val), int(datemode))\n' +
            '\treturn str(datetime.datetime(y, mon, d, h, m, s).strftime(outputFormat))\n' +
        '\n' +
        '# get the substring of txt after the (index)th delimiter\n' +
        '# for example, splitWithDelim("a-b-c", "-", 1) gives "b-c"\n' +
        '# and splitWithDelim("a-b-c", "-", 3) gives ""\n' +
        'def splitWithDelim(txt, index, delim):\n' +
            '\treturn delim.join(txt.split(delim)[index:])\n' +
        '\n' +
        '# get the current time\n' +
        'def now():\n' +
            '\treturn str(int(time.time()))\n' +
        '\n' +
        '# used for multijoin and multiGroupby\n' +
        'def multiJoin(*arg):\n' +
            '\tstri = ""\n' +
            '\tfor a in arg:\n' +
                '\t\tstri = stri + str(a) + ".Xc."\n' +
            '\treturn stri\n' +
        'def convertNewLineJsonToArrayJson(instring, inpath):\n' +
            '\treturn "["+",".join(filter(None, re.split("\\n|,\\s*\\n", instring)))+"]"\n';

        XcalarUploadPython(moduleName, entireString)
        .then(function() {
            UDF.storePython(moduleName, entireString);
        })
        .fail(function(error) {
            console.error("upload default udf failed", error);
        });
    }

    return (UDF);
}(jQuery, {}));

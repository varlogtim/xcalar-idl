/*
 * Module for data preview
 */
window.DSPreview = (function($, DSPreview) {
    var $previewCard; // $("#dsForm-preview");
    var $previeWrap;      // $("#dsPreviewWrap")
    var $previewTable;    // $("#previewTable")

    var $highlightBtns; // $("#dsForm-highlighter");

    var $form;          // $("#importDataForm")
    var $formatText;    // $("#fileFormat .text")

    var $fieldText;     // $("#fieldText");
    var $lineText;      // $("#lineText");
    var $quote;         // $("#dsForm-quote");

    var $udfModuleList; // $("#udfArgs-moduleList")
    var $udfFuncList;   // $("#udfArgs-funcList")

    var $headerCheckBox; // $("#promoteHeaderCheckbox") promote header checkbox

    var tableName = null;
    var rawData = null;

    var highlighter = "";

    var loadArgs = null;
    var detectArgs = {};

    // UI cache
    var lastUDFModule = null;
    var lastUDFFunc = null;

    // constant
    var rowsToFetch = 40;
    var numBytesRequest = 15000;
    var excelModule = "default";
    var excelFunc = "openExcel";

    var formatMap = {
        "JSON"  : "JSON",
        "CSV"   : "CSV",
        "RANDOM": "rand",
        "TEXT"  : "raw",
        "EXCEL" : "Excel",
    };


    DSPreview.setup = function() {
        $previewCard = $("#dsForm-preview");
        $previeWrap = $("#dsPreviewWrap");
        $previewTable = $("#previewTable");
        $highlightBtns = $("#dsForm-highlighter");

        $fieldText = $("#fieldText");
        $lineText = $("#lineText");
        $quote = $("#dsForm-quote");

        // form part
        $form = $("#importDataForm");
        $formatText = $("#fileFormat .text");

        $udfModuleList = $("#udfArgs-moduleList");
        $udfFuncList = $("#udfArgs-funcList");

        $headerCheckBox = $("#promoteHeaderCheckbox");

        // select a char as candidate delimiter
        $previewTable.mouseup(function(event) {
            if ($previewTable.hasClass("has-delimiter")) {
                return;
            }
            if ($(event.target).hasClass('truncMessage')) {
                return;
            }

            var selection;
            if (window.getSelection) {
                selection = window.getSelection();
            } else if (document.selection) {
                selection = document.selection.createRange();
            }

            applyHighlight(selection.toString());
        });

        $highlightBtns.on("click", ".highlight", function() {
            if (highlighter === "") {
                return;
            }
            applyFieldDelim(highlighter);
            getPreviewTable();
        });

        $highlightBtns.on("click", ".rmHightLight", function() {
            // case of remove highlighter
            applyHighlight("");
        });

        // resize column
        $previewTable.on("mousedown", ".colGrab", function(event) {
            if (event.which !== 1) {
                return;
            }
            TblAnim.startColResize($(this), event, {target: "datastore"});
            dblClickResize($(this), {minWidth: 25, target: "datastore"});
        });

        setupForm();
    };

    DSPreview.show = function(options) {
        options = options || {};
        $previewCard.removeClass("xc-hidden").siblings().addClass("xc-hidden");

        resetForm();
        loadArgs = $.extend(options, loadArgs);
        if (loadArgs.format === formatMap.EXCEL) {
            // XXX only a hack
            $formatText.data("format", "Excel").val("Excel");
            previewData(excelModule, excelFunc);
        } else {
            // all other rest format first
            // otherwise, cannot detect speical format(like special json)
            loadArgs.format = null;
            previewData(null, null);
        }
    };

    DSPreview.update = function() {
        var moduleName = $udfModuleList.find("input").val();
        var funcName = $udfFuncList.find("input").val();

        listUDFSection()
        .always(function() {
            // reselect old udf
            if (validateUDFModule(moduleName)) {
                selectUDFModule(moduleName);
                if (!validateUDFFunc(moduleName, funcName)) {
                    funcName = "";
                }
                selectUDFFunc(funcName);
            } else {
                // if udf module not exists
                selectUDFModule("");
                selectUDFFunc("");
            }
        });
    };

    DSPreview.clear = function() {
        if ($("#dsForm-preview").hasClass("xc-hidden")) {
            // when preview table not shows up
            return PromiseHelper.resolve(null);
        } else {
            return clearAll();
        }
    };

    function setupForm() {
        // setup udf
        $("#dsForm-refresh").click(function() {
            refreshPreview();
        });

        // udf checkbox
        $("#udfCheckbox").on("click", function() {
            var $checkbox = $(this).find(".checkbox");

            if ($checkbox.hasClass("checked")) {
                // uncheck box
                toggleUDF(false);
            } else {
                // check the box
                toggleUDF(true);
            }
        });

        // dropdown list for udf modules and function names
        new MenuHelper($udfModuleList, {
            "onSelect": function($li) {
                var module = $li.text();
                selectUDFModule(module);
            },
            "container": "#importDataForm-content",
            "bounds"   : "#importDataForm-content"
        }).setupListeners();

        new MenuHelper($udfFuncList, {
            "onSelect": function($li) {
                var func = $li.text();
                selectUDFFunc(func);
            },
            "container": "#importDataForm-content",
            "bounds"   : "#importDataForm-content"
        }).setupListeners();


        // set up format dropdownlist
        new MenuHelper($("#fileFormat"), {
            "onSelect": function($li) {
                var format = $li.attr("name");
                var text = $li.text();
                toggleFormat(format, text);
            },
            "container": "#importDataForm-content",
            "bounds"   : "#importDataForm-content"
        }).setupListeners();

        // setup delimiter
        // set up dropdown list for csv de
        var $csvDelim = $("#lineDelim, #fieldDelim");
        // setUp both line delimiter and field delimiter
        new MenuHelper($csvDelim, {
            "onSelect": function($li) {
                var $input = $li.closest(".dropDownList").find(".text");
                var isField = ($input.attr("id") === "fieldText");

                switch ($li.attr("name")) {
                    case "default":
                        if (isField) {
                            $input.val("\\t");
                        } else {
                            $input.val("\\n");
                        }
                        $input.removeClass("nullVal");
                        break;
                    case "comma":
                        $input.val(",").removeClass("nullVal");
                        break;
                    case "null":
                        $input.val("Null").addClass("nullVal");
                        break;
                    default:
                        console.error("error case");
                        break;
                }

                if (isField) {
                    setFieldDelim();
                } else {
                    setLineDelim();
                }
            },
            "container": "#importDataForm-content",
            "bounds"   : "#importDataForm-content"
        }).setupListeners();

        $csvDelim.on("input", "input", function() {
            var $input = $(this);
            $input.removeClass("nullVal");

            var isField = ($input.attr("id") === "fieldText");
            if (isField) {
                setFieldDelim();
            } else {
                setLineDelim();
            }
        });

        // quote
        $quote.on("input", function() {
            setQuote();
        });

        // header
        $headerCheckBox.on("click", function() {
            var $checkbox = $headerCheckBox.find(".checkbox");
            if ($checkbox.hasClass("checked")) {
                // remove header
                $checkbox.removeClass("checked");
                toggleHeader(false);
            } else {
                $checkbox.addClass("checked");
                toggleHeader(true);
            }
        });

        // auto detect
        $("#dsForm-detect").click(function() {
            autoPreview();
        });

        // back button
        $form.on("click", ".cancel", function() {
            var path = loadArgs.path;
            var protocol;
            for (var key in FileProtocol) {
                protocol = FileProtocol[key];
                if (path.startsWith(protocol)) {
                    path = path.substring(protocol.length);
                    break;
                }
            }

            resetForm();
            clearAll();
            FileBrowser.show(protocol, path);
        });

        // submit the form
        $form.submit(function(event) {
            event.preventDefault();
            var $submitBtn = $(this).blur();
            xcHelper.disableSubmit($submitBtn);

            submitForm()
            .always(function() {
                xcHelper.enableSubmit($submitBtn);
            });
        });
    }

    // function promoptHeaderAlert(format, hasHeader) {
    //     var deferred = jQuery.Deferred();
    //     if (!hasHeader &&
    //         (format === formatMap.CSV ||
    //         format === formatMap.TEXT ||
    //         format === formatMap.EXCEL)) {

    //         Alert.show({
    //             "title"    : DSFormTStr.LoadConfirm,
    //             "msg"      : DSFormTStr.NoHeader,
    //             "onConfirm": function() { deferred.resolve(); },
    //             "onCancel" : function() { deferred.reject("canceled"); }
    //         });
    //     } else {
    //         deferred.resolve();
    //     }

    //     return deferred.promise();
    // }

    function listUDFSection() {
        var deferred = jQuery.Deferred();

        // update python module list
        XcalarListXdfs("*", "User*")
        .then(updateUDFList)
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("List UDF Fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function updateUDFList(listXdfsObj) {
        var i;
        var len = listXdfsObj.numXdfs;
        var udfs = listXdfsObj.fnDescs;
        var moduleMap = {};
        var modules = [];

        for (i = 0; i < len; i++) {
            modules.push(udfs[i].fnName);
        }

        modules.sort();

        var moduleLi = "";
        var fnLi = "";
        for (i = 0; i < len; i++) {
            var udf = modules[i].split(":");
            var moduleName = udf[0];
            var fnName = udf[1];

            if (!moduleMap.hasOwnProperty(moduleName)) {
                moduleMap[moduleName] = true;
                moduleLi += "<li>" + moduleName + "</li>";
            }

            fnLi += '<li data-module="' + moduleName + '">' +
                        fnName +
                    '</li>';
        }

        $udfModuleList.find("ul").html(moduleLi);
        $udfFuncList.find("ul").html(fnLi);
    }

    function validateUDFModule(module) {
        // check if udf module exists
        var $li = $udfFuncList.find(".list li").filter(function() {
            return ($(this).data("module") === module);
        });
        return ($li.length > 0);
    }

    function validateUDFFunc(module, func) {
        // check if udf exists
        var $li = $udfFuncList.find(".list li").filter(function() {
            var $el = $(this);
            return ($el.data("module") === module &&
                    $el.text() === func);
        });
        return ($li.length > 0);
    }

    function resetUdfSection() {
        // restet the udf lists, otherwise the if clause in
        // selectUDFModule() and selectUDFFunc() will
        // stop the reset from triggering

        // only when cached moduleName and funcName is not null
        // we restore it
        if (lastUDFModule != null && lastUDFFunc != null &&
            validateUDFFunc(lastUDFModule, lastUDFFunc)) {

            selectUDFModule(lastUDFModule);
            selectUDFFunc(lastUDFFunc);
        } else {
            // when cannot restore it
            lastUDFModule = null;
            lastUDFFunc = null;

            selectUDFModule("");
            selectUDFFunc("");
        }
    }

    function selectUDFModule(module) {
        if (module == null) {
            module = "";
        }

        $udfModuleList.find("input").val(module);

        if (module === "") {
            $udfFuncList.addClass("disabled")
                    .find("input").val("");
            $udfFuncList.parent().tooltip({
                "title"    : TooltipTStr.ChooseUdfModule,
                "placement": "top",
                "container": "#dsFormView"
            });
        } else {
            $udfFuncList.parent().tooltip("destroy");
            $udfFuncList.removeClass("disabled")
                .find("input").val("")
                .end()
                .find(".list li").addClass("hidden")
                .filter(function() {
                    return $(this).data("module") === module;
                }).removeClass("hidden");
        }
    }

    function selectUDFFunc(func) {
        if (func == null) {
            func = "";
        }

        $udfFuncList.find("input").val(func);
    }

    function getNameFromPath(path) {
        var pathLen = path.length;
        if (path.charAt(pathLen - 1) === "/") {
            // remove the last /
            path = path.substring(0, pathLen - 1);
        }

        var slashIndex = path.lastIndexOf("/");
        var name = path.substring(slashIndex + 1);

        var index = name.lastIndexOf(".");
        // Also, we need to strip special characters. For now,
        // we only keeo a-zA-Z0-9. They can always add it back if they want

        if (index >= 0) {
            name = name.substring(0, index);
        }

        name = name.replace(/[^a-zA-Z0-9]/g, "");
        var originalName = name;
        var tries = 1;
        var validNameFound = false;
        while (!validNameFound && tries < 20) {
            if (DS.has(name)) {
                validNameFound = false;
            } else {
                validNameFound = true;
            }

            if (!validNameFound) {
                name = originalName + tries;
                tries++;
            }
        }

        if (!validNameFound) {
            while (DS.has(name) && tries < 100) {
                name = xcHelper.randName(name, 4);
                tries++;
            }
        }

        return name;
    }

    function toggleFormat(format, text) {
        if (format && $formatText.data("format") === format.toUpperCase()) {
            return;
        }

        var $lineDelim = $("#lineDelim").parent().removeClass("xc-hidden");
        var $fieldDelim = $("#fieldDelim").parent().removeClass("xc-hidden");
        var $udfArgs = $("#udfArgs").removeClass("xc-hidden");
        var $headerRow = $headerCheckBox.parent().removeClass("xc-hidden");
        var $quoteRow = $quote.closest(".row").removeClass("xc-hidden");
        var $skipRows = $("#dsForm-skipRows").closest(".row").removeClass("xc-hidden");

        if (format == null) {
            // reset case
            $lineDelim.addClass("xc-hidden");
            $fieldDelim.addClass("xc-hidden");
            $headerRow.addClass("xc-hidden");
            $formatText.data("format", "").val("");
            return;
        }

        format = format.toUpperCase();
        if (text == null) {
            text = $('#fileFormatMenu li[name="' + format + '"]').text();
        }

        $formatText.data("format", format).val(text);

        switch (format) {
            case "CSV":
                $skipRows.removeClass("");
                setFieldDelim();
                break;
            case "TEXT":
                // no field delimiter when format is text
                $fieldDelim.addClass("xc-hidden");
                loadArgs.fieldDelim = "";
                break;
            case "EXCEL":
                $lineDelim.addClass("xc-hidden");
                $fieldDelim.addClass("xc-hidden");
                // excel not use udf section
                $udfArgs.addClass("xc-hidden");
                break;

            // json and random
            case "JSON":
            case "RANDOM":
                // json and random
                // Note: random is setup in shortcuts.js,
                // so prod build will not have it
                $headerRow.addClass("xc-hidden");
                $lineDelim.addClass("xc-hidden");
                $fieldDelim.addClass("xc-hidden");
                $skipRows.addClass("xc-hidden");
                $quoteRow.addClass("xc-hidden");
                break;
            default:
                throw new ReferenceError("Format Not Support");
        }

        loadArgs.format = formatMap[format];
    }

    function resetDelimiter() {
        // to show \t, \ should be escaped
        $("#fieldText").val("Null").addClass("nullVal");
        $("#lineText").val("\\n").removeClass("nullVal");
    }

    function resetForm() {
        $form.find("input").val("");
        $("#dsForm-skipRows").val(0);
        $form.find(".checkbox.checked").removeClass("checked");
        // keep the current protocol
        resetUdfSection();
        toggleFormat();
        resetDelimiter();
        resetLoadArgs();
        detectArgs = {
            "fieldDelim": "",
            "lineDelim" : "\n",
            "hasHeader" : false,
            "skipRows"  : 0,
            "quote"     : "\""
        };
        applyHighlight(""); // remove highlighter
    }

    function resetLoadArgs() {
        loadArgs = {
            "fieldDelim": "",
            "lineDelim" : "\n",
            "hasHeader" : false,
            "quote"     : "\"",
        };
    }

    function clearAll() {
        var deferred = jQuery.Deferred();

        $previewTable.removeClass("has-delimiter").empty();

        rawData = null;

        if (tableName != null) {
            var dsName = tableName;
            tableName = null;
            var sql = {
                "operation": SQLOps.DestroyPreviewDS,
                "dsName"   : dsName
            };
            var txId = Transaction.start({
                "operation": SQLOps.DestroyPreviewDS,
                "sql"      : sql
            });

            XcalarDestroyDataset(dsName, txId)
            .then(function() {
                Transaction.done(txId, {
                    "noCommit": true,
                    "noSql"   : true
                });
                deferred.resolve();
            })
            .fail(function(error) {
                Transaction.fail(txId, {
                    "error"  : error,
                    "noAlert": true
                });
                deferred.reject(error);
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise();
    }

    function sampleData(datasetName, rowsToFetch) {
        var deferred = jQuery.Deferred();
        var resultSetId;

        XcalarMakeResultSetFromDataset(datasetName)
        .then(function(result) {
            resultSetId = result.resultSetId;
            var totalEntries = result.numEntries;
            if (totalEntries === 0) {
                return PromiseHelper.resolve(null);
            } else {
                return XcalarFetchData(resultSetId, 0, rowsToFetch,
                                        totalEntries, []);
            }
        })
        .then(function(result) {
            // no need for resultSetId as we only need 40 samples
            XcalarSetFree(resultSetId);
            deferred.resolve(result);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function previewData(udfModule, udfFunc, noDetect) {
        var deferred = jQuery.Deferred();

        var loadURL = loadArgs.path;
        var dsName = getNameFromPath(loadURL);
        $("#dsForm-dsName").val(dsName);

        if (loadArgs.pattern) {
            loadURL += loadArgs.pattern;
        }

        var isRecur = loadArgs.isRecur;
        var hasUDF = false;

        if (udfModule && udfFunc) {
            hasUDF = true;
        } else if (!udfModule && !udfFunc) {
            hasUDF = false;
        } else {
            // when udf module == null or udf func == null
            // it's an error case
            return PromiseHelper.reject("Error Case!");
        }

        var $loadHiddenSection = $previeWrap.find(".loadHidden").addClass("hidden");
        var $waitSection = $previeWrap.find(".waitSection")
                                    .removeClass("hidden");
        $previeWrap.find(".errorSection").addClass("hidden");
        var sql = {
            "operation" : SQLOps.PreviewDS,
            "dsPath"    : loadURL,
            "dsName"    : dsName,
            "moduleName": udfModule,
            "funcName"  : udfFunc,
            "isRecur"   : isRecur
        };

        var txId = Transaction.start({
            "operation": SQLOps.PreviewDS,
            "sql"      : sql
        });

        $("#preview-url").text(loadURL);

        var promise;
        if (hasUDF) {
            promise = loadDataWithUDF(txId, loadURL, dsName,
                                        udfModule, udfFunc, isRecur);
        } else {
            promise = loadData(loadURL, isRecur);
        }

        promise
        .then(function(result) {
            $waitSection.addClass("hidden");
            rawData = result;

            $loadHiddenSection.removeClass("hidden");

            getPreviewTable();

            if (!noDetect) {
                smartDetect();
            }

            // not cache to sql log, only show when fail
            Transaction.done(txId, {
                "noCommit": true,
                "noSql"   : true
            });

            deferred.resolve();
        })
        .fail(function(error) {
            Transaction.fail(txId, {
                "error"  : error,
                "noAlert": true
            });

            errorHandler(error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function errorHandler(error) {
        if (typeof error === "object") {
            error = JSON.stringify(error);
        }

        $previeWrap.find(".waitSection").addClass("hidden");
        $previeWrap.find(".errorSection")
                .html(error).removeClass("hidden");
        $previeWrap.find(".loadHidden").addClass("hidden");
    }

    function loadData(loadURL, isRecur) {
        var deferred = jQuery.Deferred();

        XcalarPreview(loadURL, isRecur, numBytesRequest)
        .then(function(res) {
            deferred.resolve(res.buffer);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function loadDataWithUDF(txId, loadURL, dsName, udfModule, udfFunc, isRecur) {
        var deferred = jQuery.Deferred();
        var loadError = null;

        var tempDSName = getPreviewTableName(dsName);
        tableName = tempDSName;

        var previewSize = loadArgs.previewSize;

        XcalarLoad(loadURL, "raw", tempDSName, "", "\n",
                    false, udfModule, udfFunc, isRecur,
                    previewSize, gExportQDelim, 0, false, txId)
        .then(function(ret, error) {
            loadError = error;
        })
        .then(function() {
            return sampleData(tempDSName, rowsToFetch);
        })
        .then(function(result) {
            if (!result) {
                var error = DSTStr.NoRecords;
                if (loadError) {
                    error += '\n' + loadError;
                } else {
                    // XXX temporary code, after change to XcalarPreview, remove it
                    error += '\n' + DSTStr.NoRecrodsHint;
                }

                deferred.reject({"error": error});
                return PromiseHelper.resolve(null);
            }

            if (loadError) {
                // XXX find a better way to handle it
                console.warn(loadError);
            }

            var buffer = [];

            var value;
            var json;

            try {
                for (var i = 0, len = result.length; i < len; i++) {
                    value = result[i].value;
                    json = $.parseJSON(value);
                    // get unique keys
                    for (var key in json) {
                        if (key === "recordNum") {
                            continue;
                        }
                        buffer.push(json[key]);
                    }
                }

                var bufferStr = buffer.join("\n");
                // deferred.resolve(res, bufferStr);
                deferred.resolve(bufferStr);
            } catch (err) {
                console.error(err, value);
                deferred.reject({"error": DSTStr.NoParse});
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function submitForm() {
        var res = validateForm();
        if (res == null) {
            return PromiseHelper.reject("Checking Invalid");
        }

        var dsName = res.dsName;
        var format = res.format;

        var udfModule = res.udfModule;
        var udfFunc = res.udfFunc;

        var fieldDelim = res.fieldDelim;
        var lineDelim = res.lineDelim;

        // XXX not wired
        var quote = res.quote;
        var skipRows = res.skipRows;

        var header = isUseHeader();

        var loadURL = loadArgs.path;
        if (loadArgs.pattern) {
            // XXX not sure if it's right
            loadURL += loadArgs.pattern;
        }

        var isRecur = loadArgs.isRecur;
        // XXX not wired
        var isRegEx = loadArgs.isRegEx;
        var previewSize = loadArgs.previewSize;

        console.log(dsName, format, udfModule, udfFunc, fieldDelim, lineDelim,
            header, loadURL, quote, skipRows, isRecur, isRegEx, previewSize);

        cacheUDF(udfModule, udfFunc);

        return DS.load(dsName, format, loadURL,
                        fieldDelim, lineDelim, header,
                        udfModule, udfFunc,
                        isRecur, previewSize, quote, skipRows, isRegEx);
    }

    function validateForm() {
        var $dsName = $("#dsForm-dsName");
        var dsName = $dsName.val().trim();
        // validate name
        var isValid = xcHelper.validate([
            {
                "$selector": $dsName
            },
            {
                "$selector": $dsName,
                "check"    : function() {
                    return (dsName.length >=
                            XcalarApisConstantsT.XcalarApiMaxTableNameLen);
                },
                "formMode": true,
                "text"    : ErrTStr.TooLong
            },
            {
                "$selector": $dsName,
                "check"    : DS.has,
                "formMode" : true,
                "text"     : ErrTStr.DSNameConfilct
            },
            {
                "$selector": $dsName,
                "formMode" : true,
                "text"     : ErrTStr.NoSpecialCharOrSpace,
                "check"    : function() {
                    return (!/^\w+$/.test(dsName));
                }
            }
        ]);

        if (!isValid) {
            return null;
        }

        // validate format
        var format = getFormat();
        isValid = xcHelper.validate([{
            "$selector": $formatText,
            "text"     : ErrTStr.NoEmptyList,
            "check"    : function() {
                return (format == null);
            }
        }]);

        if (!isValid) {
            return null;
        }

        // validate UDF
        var hasUDF = isUseUDF();
        var udfModule = "";
        var udfFunc = "";

        if (hasUDF) {
            var $moduleInput = $udfModuleList.find("input");
            var $funcInput = $udfFuncList.find("input");

            isValid = xcHelper.validate([
                {
                    "$selector": $moduleInput,
                    "text"     : ErrTStr.NoEmptyList
                },
                {
                    "$selector": $funcInput,
                    "text"     : ErrTStr.NoEmptyList
                }
            ]);

            if (!isValid) {
                return null;
            }

            udfModule = $moduleInput.val();
            udfFunc = $funcInput.val();
        }

        // validate delimiter
        var fieldDelim = getFieldDelim();
        var lineDelim = getLineDelim();


        isValid = xcHelper.validate([
            {
                "$selector": $fieldText,
                "text"     : DSFormTStr.InvalidDelim,
                "formMode" : true,
                "check"    : function() {
                    return (typeof fieldDelim === "object");
                }
            },
            {
                "$selector": $lineText,
                "text"     : DSFormTStr.InvalidDelim,
                "formMode" : true,
                "check"    : function() {
                    return (typeof lineDelim === "object");
                }
            }
        ]);

        if (!isValid) {
            return null;
        }

        var quote = getQuote();
        isValid = xcHelper.validate([
            {
                "$selector": $quote
            },
            {
                "$selector": $quote,
                "text"     : DSFormTStr.InvalidQuote,
                "check"    : function() {
                    return (quote.length > 1);
                }
            }
        ]);

        if (!isValid) {
            return null;
        }

        // validate skipRows
        var skipRows = getSkipRows();
        isValid = xcHelper.validate([
            {
                "$selector": $("#dsForm-skipRows"),
                "text"     : ErrTStr.NoNegativeNumber,
                "formMode" : true,
                "check"    : function() {
                    return (skipRows < 0);
                }
            }
        ]);

        if (!isValid) {
            return null;
        }

        // speical case: special json:
        if (detectArgs.isSpecialJSON === true) {
            if (udfModule !== "" || udfFunc !== "") {
                // should never happen
                throw "error case!";
            }
            udfModule = "default";
            udfFunc = "convertNewLineJsonToArrayJson";
            format = formatMap.JSON;
        }

        return {
            "dsName"    : dsName,
            "format"    : format,
            "udfModule" : udfModule,
            "udfFunc"   : udfFunc,
            "fieldDelim": fieldDelim,
            "lineDelim" : lineDelim,
            "quote"     : quote,
            "skipRows"  : skipRows
        };
    }

    function cacheUDF(udfModule, udfFunc) {
        // cache udf module and func name
        if (udfModule !== "" && udfFunc !== "") {
            lastUDFModule = udfModule;
            lastUDFFunc = udfFunc;
        }
    }

    function autoPreview() {
        var formatText;
        for (formatText in formatMap) {
            if (formatMap[formatText] === detectArgs.format) {
                break;
            }
        }

        toggleFormat(formatText);
        applyFieldDelim(detectArgs.fieldDelim);
        applyLineDelim(detectArgs.lineDelim);
        applyQuote(detectArgs.quote);
        toggleHeader(detectArgs.hasHeader);

        $("#dsForm-skipRows").val(0);

        if ($previeWrap.find(".errorSection").hasClass("hidden")) {
            getPreviewTable();
            xcHelper.showSuccess();
        } else {
            refreshPreview();
        }
    }

    function refreshPreview() {
        var res = validateForm();
        if (res == null) {
            return;
        }

        var udfModule = "";
        var udfFunc = "";

        if (res.format === formatMap.EXCEL) {
            udfModule = excelModule;
            udfFunc = excelFunc;
        } else {
            udfModule = res.udfModule;
            udfFunc = res.udfFunc;
        }

        // XXX this may need a loading state
        clearAll()
        .then(function() {
            return previewData(udfModule, udfFunc, true);
        })
        .fail(errorHandler);
    }

    function getPreviewTable() {
        $previeWrap.find(".errorSection").addClass("hidden")
        $previeWrap.find(".loadHidden").removeClass("hidden");
        $highlightBtns.addClass("hidden");

        var format = getFormat();
        if (format === formatMap.JSON) {
            getJSONTable(rawData);
            return;
        }

        // line delimiter
        var lineDelim = getLineDelim();
        var data = [];
        if (lineDelim === "") {
            data.push(rawData);
        } else {
            data = rawData.split(lineDelim);
        }

        for (var i = 0, len = data.length; i < len; i++) {
            data[i] = data[i].split("");
        }

        var fieldDelim = getFieldDelim();
        if (format === formatMap.CSV && fieldDelim === "") {
            $highlightBtns.removeClass("hidden")
                        .find("button").removeClass("xc-disabled");
        }

        var $tbody = $(getTbodyHTML(data, fieldDelim));
        var $trs = $tbody.find("tr");
        var maxTdLen = 0;
        // find the length of td and fill up empty space
        $trs.each(function() {
            maxTdLen = Math.max(maxTdLen, $(this).find("td").length);
        });

        $trs.each(function() {
            var $tr  = $(this);
            var $tds = $tr.find("td");
            var trs = "";

            for (var j = 0, l = maxTdLen - $tds.length; j < l; j++) {
                trs += "<td></td>";
            }

            $tr.append(trs);
        });

        var $tHead = $(getTheadHTML(data, fieldDelim, maxTdLen));
        var $tHrow = $tHead.find("tr");
        var thLen  = $tHead.find("th").length;
        var ths = "";

        for (var i = 0, len = maxTdLen - thLen; i < len; i++) {
            ths += '<th>' +
                        '<div class="header">' +
                            '<div class="text"></div>' +
                        '</div>' +
                    '</th>';
        }
        $tHrow.append(ths);

        // add class
        $tHrow.find("th").each(function(index) {
            $(this).addClass("col" + index);
        });

        $previewTable.empty().append($tHead, $tbody);
        $previewTable.closest(".datasetTbodyWrap").scrollTop(0);

        if (fieldDelim !== "") {
            $previewTable.addClass("has-delimiter");
        } else {
            $previewTable.removeClass("has-delimiter");
        }
    }

    function toggleUDF(usUDF) {
        var $checkbox = $("#udfCheckbox").find(".checkbox");
        var $udfArgs = $("#udfArgs");

        if (usUDF) {
            $checkbox.addClass("checked");
            $udfArgs.addClass("active");
        } else {
            $checkbox.removeClass("checked");
            $udfArgs.removeClass("active");
        }
    }

    function toggleHeader(promote, changePreview) {
        if (promote == null) {
            loadArgs.hasHeader = !loadArgs.hasHeader;
        } else if (promote) {
            loadArgs.hasHeader = true;
        } else {
            loadArgs.hasHeader = false;
        }

        if (loadArgs.hasHeader) {
            $headerCheckBox.find(".checkbox").addClass("checked");
        } else {
            $headerCheckBox.find(".checkbox").removeClass("checked");
        }

        if (!changePreview) {
            return;
        }

        var $trs = $previewTable.find("tbody tr");
        var $tds = $trs.eq(0).find("td"); // first row tds
        var $headers = $previewTable.find("thead tr .header");
        var html;

        if (loadArgs.hasHeader) {
            // promote header
            for (var i = 1, len = $tds.length; i < len; i++) {
                $headers.eq(i).find(".text").html($tds.eq(i).html());
            }

            // change line marker
            for (var i = 1, len = $trs.length; i < len; i++) {
                $trs.eq(i).find(".lineMarker").text(i);
            }

            $trs.eq(0).remove();
            $previewTable.find("th.col0").html('<div class="header"></div>');
        } else {
            // change line marker
            for (var i = 0, j = 2, len = $trs.length; i < len; i++, j++) {
                $trs.eq(i).find(".lineMarker").text(j);
            }

            // undo promote
            html = '<tr><td class="lineMarker">1</td>';

            for (var i = 1, len = $headers.length; i < len; i++) {
                var $text = $headers.eq(i).find(".text");
                html += '<td class="cell">' + $text.html() + '</td>';
                $text.html("Column" + (i - 1));
            }

            html += '</tr>';

            $trs.eq(0).before(html);
            $headers.eq(0).empty()
                    .closest("th").removeClass("undo-promote");
        }
    }

    function isUseUDF() {
        return $("#udfCheckbox").find(".checkbox").hasClass("checked");
    }

    function isUseHeader() {
        return loadArgs.hasHeader;
    }

    function getFormat() {
        return loadArgs.format;
    }

    function setFieldDelim() {
        var fieldDelim = xcHelper.delimiterTranslate($fieldText);

        if (typeof fieldDelim === "object") {
            // error case
            return;
        }

        loadArgs.fieldDelim = fieldDelim;
    }

    function setLineDelim() {
        var lineDelim = xcHelper.delimiterTranslate($lineText);

        if (typeof lineDelim === "object") {
            // error case
            return;
        }

        loadArgs.lineDelim = lineDelim;
    }

    function setQuote() {
        var quote = xcHelper.delimiterTranslate($quote);

        if (typeof quote === "object") {
            // error case
            return;
        }

        if (quote.length !== 1) {
            return;
        }

        loadArgs.quote = quote;
    }

    function getFieldDelim() {
        return loadArgs.fieldDelim;
    }

    function getLineDelim() {
        return loadArgs.lineDelim;
    }

    function getQuote() {
        return loadArgs.quote;
    }

    function getSkipRows() {
        var skipRows = Number($("#dsForm-skipRows").val());
        if (isNaN(skipRows) || skipRows < 0) {
            skipRows = 0;
        }
        return skipRows;
    }

    function applyFieldDelim(strToDelimit) {
        // may have error case
        strToDelimit = strToDelimit.replace(/\t/g, "\\t").replace(/\n/g, "\\n");
        highlighter = "";

        if (strToDelimit === "") {
            $fieldText.val("Null").addClass("nullVal");
        } else {
            $fieldText.val(strToDelimit).removeClass("nullVal");
        }
        
        setFieldDelim();
    }

    function applyLineDelim(strToDelimit) {
        strToDelimit = strToDelimit.replace(/\t/g, "\\t").replace(/\n/g, "\\n");
    
        if (strToDelimit === "") {
            $lineText.val("Null").addClass("nullVal");
        } else {
            $lineText.val(strToDelimit).removeClass("nullVal");
        }

        setLineDelim();
    }

    function applyQuote(quote) {
        $quote.val(quote);
        setQuote();
    }

    function applyHighlight(str) {
        $previewTable.find(".highlight").removeClass("highlight");
        highlighter = str;

        if (highlighter === "") {
            // when remove highlighter
            $highlightBtns.find("button").addClass("xc-disabled");
        } else {
            $highlightBtns.find("button").removeClass("xc-disabled");
            xcHelper.removeSelectionRange();
            // when has valid delimiter to highlight
            var $cells = $previewTable.find("thead .text, tbody .cell");
            highlightHelper($cells, highlighter);
        }
    }

    function highlightHelper($cells, strToHighlight) {
        var dels = strToHighlight.split("");
        var delLen = dels.length;

        $cells.each(function() {
            var $tds = $(this).find(".td");
            var len = $tds.length;

            for (var i = 0; i < len; i++) {
                var j = 0;
                while (j < delLen && i + j < len) {
                    if ($tds.eq(i + j).text() === dels[j]) {
                        ++j;
                    } else {
                        break;
                    }
                }

                if (j === delLen && i + j <= len) {
                    for (j = 0; j < delLen; j++) {
                        $tds.eq(i + j).addClass("highlight");
                    }
                }
            }
        });
    }

    function getPreviewTableName(dsName) {
        var name;
        if (dsName) {
            name = xcHelper.randName(dsName + "-");
        } else {
            // when name is empty
            name = xcHelper.randName("previewTable");
        }
        // specific format for preview table
        name = xcHelper.wrapDSName(name) + ".preview";
        return name;
    }

    function getJSONTable(datas) {
        var startIndex = datas.indexOf("{");
        var endIndex = datas.lastIndexOf("}");
        if (startIndex === -1 || endIndex === -1) {
            errorHandler(DSPreviewTStr.NoParseJSON);
        }

        var record = [];
        var bracketCnt = 0;
        var hasBackSlash = false;
        var hasQuote = false;

        for (var i = startIndex; i <= endIndex; i++) {
            var c = datas.charAt(i);
            if (!hasBackSlash && !hasQuote) {
                if (c === "{") {
                    bracketCnt++;
                } else if (c === "}") {
                    bracketCnt--;
                    if (bracketCnt === 0) {
                        record.push(datas.substring(startIndex, i + 1));
                        startIndex = datas.indexOf("{", i);
                        if (startIndex < 0) {
                            break;
                        }
                    } else if (bracketCnt < 0) {
                        // error cse
                        errorHandler(DSPreviewTStr.NoParseJSON);
                    }
                }
            } else if (hasBackSlash) {
                // skip
                hasBackSlash = false;
            } else if (c === '\\') {
                hasBackSlash = true;
            } else if (c === '"') {
                // toggle escape of quote
                hasQuote = !hasQuote;
            }
        }

        if (bracketCnt === 0 && startIndex >= 0 && startIndex <= endIndex) {
            record.push(datas.substring(startIndex, endIndex + 1));
        }

        var string = "[" + record.join(",") + "]";

        try {
            var json = $.parseJSON(string);
            $previewTable.html(getJSONTableHTML(json))
                        .addClass("has-delimiter");
        } catch (error) {
            errorHandler(DSPreviewTStr.NoParseJSON + ": " + error);
        }
    }

    function getJSONTableHTML(json) {
        var rowLen = json.length;
        var keys = {};
        for (var i = 0; i < rowLen; i++) {
            for (var key in json[i]) {
                keys[key] = true;
            }
        }

        var headers = Object.keys(keys);
        var colLen = headers.length;
        var colGrab = '<div class="colGrab" data-sizetoheader="true"></div>';
        var html = '<thead><tr>' +
                    '<th class="rowNumHead">' +
                        '<div class="header"></div>' +
                    '</th>';

        for (var i = 0; i < colLen; i++) {
            html += '<th>' +
                        '<div class="header">' +
                            colGrab +
                            '<div class="text">' +
                                headers[i] +
                            '</div>' +
                        '</div>' +
                    '</th>';
        }

        html += '</tr></thead><tbody>';

        for (var i = 0; i < rowLen; i++) {
            html += '<tr>' +
                        '<td class="lineMarker">' +
                            (i + 1) +
                        '</td>';
            var jsonRow = json[i];
            for (var j = 0; j < colLen; j++) {
                var val = jsonRow[headers[j]] || "";
                if (typeof val === "object") {
                    val = JSON.stringify(val);
                }

                html += '<td class="cell">' + val + '</td>';
            }

            html += '</tr>';
        }

        html += '</tbody>';

        return html;
    }

    function getTheadHTML(datas, delimiter, tdLen) {
        var thead = "<thead><tr>";
        var colGrab = (delimiter === "") ? "" : '<div class="colGrab" ' +
                                            'data-sizetoheader="true"></div>';

        // when has header
        if (isUseHeader()) {
            thead +=
                '<th class="rowNumHead">' +
                    '<div class="header"></div>' +
                '</th>' +
                parseTdHelper(datas[0], delimiter, true);
        } else {
            thead +=
               '<th class="rowNumHead">' +
                    '<div class="header"></div>' +
                '</th>';

            for (var i = 0; i < tdLen - 1; i++) {
                thead +=
                    '<th>' +
                        '<div class="header">' +
                            colGrab +
                            '<div class="text">Column' + i + '</div>' +
                        '</div>' +
                    '</th>';
            }
        }

        thead += "</tr></thead>";

        return (thead);
    }

    function getTbodyHTML(datas, delimiter) {
        var tbody = "<tbody>";
        var i = isUseHeader() ? 1 : 0;
        i += getSkipRows();
        for (j = 0, len = datas.length; i < len; i++, j++) {
            tbody += '<tr>' +
                        '<td class="lineMarker">' +
                            (j + 1) +
                        '</td>';
            tbody += parseTdHelper(datas[i], delimiter) + '</tr>';
        }

        tbody += "</tbody>";

        return (tbody);
    }

    function parseTdHelper(data, strToDelimit, isTh) {
        var hasQuote = false;
        var hasBackSlash = false;
        var dels = strToDelimit.split("");
        var delLen = dels.length;
        var quote = getQuote();

        var hasDelimiter = (delLen !== 0);
        var colGrab = hasDelimiter ? '<div class="colGrab" ' +
                                     'data-sizetoheader="true"></div>' : "";
        var html = isTh ? '<th><div class="header">' + colGrab +
                            '<div class="text cell">'
                            : '<td class="cell">';

        var dataLen = data.length;
        var rawStrLimit = 1000; // max number of characters in undelimited column
        var maxColumns = 1000; // max number of columns
        var colStrLimit = 250; // max number of characters in delimited column
        var i = 0;
        var d;

        if (hasDelimiter) {
            // when has delimiter
            var columnCount = 0;
            var strLen = 0;
            var hiddenStrLen = 0;
            while (i < dataLen && columnCount < maxColumns) {
                d = data[i];
                var isDelimiter = false;

                if (!hasBackSlash && !hasQuote && d === dels[0]) {
                    isDelimiter = true;

                    for (var j = 1; j < delLen; j++) {
                        if (i + j >= dataLen || data[i + j] !== dels[j]) {
                            isDelimiter = false;
                            break;
                        }
                    }
                }

                if (isDelimiter) {
                    // skip delimiter
                    if (hiddenStrLen) {
                        html += "<span class='truncMessage'>...(" +
                                hiddenStrLen.toLocaleString("en") + " " +
                                TblTStr.Truncate + ")</span>";
                    }
                    if (isTh) {
                        html += '</div></div></th>' +
                                '<th>' +
                                    '<div class="header">' +
                                        colGrab +
                                        '<div class="text cell">';
                    } else {
                        html += '</td><td class="cell">';
                    }

                    i = i + delLen;
                    columnCount++;
                    strLen = 0;
                    hiddenStrLen = 0;
                } else {
                    if (hasBackSlash) {
                        // when previous char is \. espace this one
                        hasBackSlash = false;
                    } else if (d === '\\') {
                        hasBackSlash = true;
                    } else if (d === quote) {
                        // toggle escape of quote
                        hasQuote = !hasQuote;
                    }
                    if (strLen > colStrLimit) {
                        hiddenStrLen++;
                    } else {
                        html += d;
                    }

                    strLen++;
                    ++i;
                }
            }
        } else {
            // when not apply delimiter
            dataLen = Math.min(rawStrLimit, dataLen); // limit to 1000 characters
            for (i = 0; i < dataLen; i++) {
                d = data[i];

                var cellClass = "td";
                if (d === "\t") {
                    cellClass += " has-margin has-tab";
                } else if (d === ",") {
                    cellClass += " has-margin has-comma";
                } else if (d === "|") {
                    cellClass += " has-pipe";
                } else if (d === "\'" || d === "\"") {
                    cellClass += " has-quote";
                } else if (/\W/.test(d)) {
                    cellClass += " has-specialChar";
                }

                html += '<span class="' + cellClass + '">' + d + '</span>';
            }
            var lenDiff = data.length - dataLen;
            if (lenDiff > 0) {
                html += "<span class='truncMessage'>...(" +
                        lenDiff.toLocaleString("en") + " " +
                        TblTStr.Truncate + ")</span>";
            }
        }

        if (isTh) {
            html += '</div></div></th>';
        } else {
            html += '</td>';
        }
        return (html);
    }

    function smartDetect() {
        if (detectArgs.format == null) {
            detectArgs.format = detectFormat();
        }

        var format = detectArgs.format;
        if (format === formatMap.EXCEL) {
            detectArgs.fieldDelim = "\t";
        } else if (format === formatMap.CSV && detectArgs.fieldDelim === "") {
            detectArgs.fieldDelim = detectFieldDelim();
        }

        var formatText;
        for (var key in formatMap) {
            if (formatMap[key] === format) {
                formatText = key;
                break;
            }
        }

        toggleFormat(formatText, null);
        applyLineDelim("\n");
        applyQuote("\"");

        if (detectArgs.format === formatMap.EXCEL ||
            detectArgs.format === formatMap.CSV) {
            // need to reset first
            loadArgs.hasHeader = false;

            if (detectArgs.fieldDelim !== "") {
                applyFieldDelim(detectArgs.fieldDelim);
            }

            // only after update the table, can do the detect
            getPreviewTable();
            detectArgs.hasHeader = detectHeader();
        } else {
            detectArgs.hasHeader = false;
            getPreviewTable();
        }

        if (detectArgs.hasHeader) {
            toggleHeader(true, true);
        } else {
            toggleHeader(false);
        }
    }

    function detectFieldDelim() {
        var commaLen = $previewTable.find(".has-comma").length;
        var tabLen = $previewTable.find(".has-tab").length;
        var pipLen = $previewTable.find(".has-pipe").length;

        // when has pip
        if (pipLen >= rowsToFetch && pipLen > commaLen && pipLen > tabLen) {
            return "|";
        }

        if (commaLen > 0 && tabLen > 0) {
            if (commaLen >= tabLen) {
                return ",";
            } else {
                return "\t";
            }
        } else {
            // one of comma and tab or both are 0
            if (commaLen > 0) {
                return ",";
            } else if (tabLen > 0) {
                return "\t";
            }
        }

        // cannot detect
        return "";
    }

    function detectFormat() {
        var format = getFormat();
        if (format === formatMap.JSON || format === formatMap.EXCEL) {
            return format;
        } else if (isJSONArray()) {
            return formatMap.JSON;
        } else if (isSpecialJSON()) {
            detectArgs.isSpecialJSON = true;
            return formatMap.JSON;
        } else {
            return formatMap.CSV;
        }
    }

    function isJSONArray() {
        var $cells = $previewTable.find("tbody tr:first-child .td");
        return /\[{?/.test($cells.text());
    }

    function isSpecialJSON() {
        if (isUseUDF()) {
            // speical json should use udf to parse,
            // so if already use udf, cannot be speical json
            return false;
        }

        var isValid = false;
        // format is {"test": ...},\n{"test2": ...}
        $previewTable.find("tbody tr").each(function() {
            var $cell = $(this).find(".cell");
            // should only have one row
            if ($cell.length === 1) {
                var text = $cell.text().trim();
                if (text.startsWith("{") && /{.+:.+},?/.test(text)) {
                    // continue the loop
                    // only when it has at least one valid case
                    // we make it true
                    isValid = true;
                    return true;
                }
            } else if (text === "") {
                return true;
            } else {
                // not qualified, end loop
                isValid = false;
                return false;
            }
        });
        return isValid;
    }

    function detectHeader() {
        var col;
        var row;
        var $trs = $previewTable.find("tbody tr");
        var rowLen = $trs.length;
        var headers = [];
        var text;
        var $headers = $trs.eq(0).children();
        var colLen = $headers.length;
        var score = 0;

        for (col = 1; col < colLen; col++) {
            text = $headers.eq(col).text();
            if ($.isNumeric(text)) {
                // if row has number
                // should not be header
                return false;
            } else if (text === "" || text == null) {
                // ds may have case to have empty header
                score -= 100;

            }

            headers[col] = text;
        }

        var tds = [];
        var rowStart = 1;

        for (row = rowStart; row < rowLen; row++) {
            tds[row] = [];
            $tds = $trs.eq(row).children();
            for (col = 1; col < colLen; col++) {
                tds[row][col] = $tds.eq(col).text();
            }
        }

        for (col = 1; col < colLen; col++) {
            text = headers[col];
            var textLen = text.length;

            for (row = rowStart; row < rowLen; row++) {
                var tdText = tds[row][col];
                var quotePattern = /^['"].+["']$/;
                if (quotePattern.test(tdText)) {
                    // strip "9" to 9
                    tdText = tdText.substring(1, tdText.length - 1);
                }

                if ($.isNumeric(tdText)) {
                    // header is string and td is number
                    // valid this td
                    score += 30;
                } else if (tdText === "" || tdText == null) {
                    // td is null but header is not
                    score += 10;
                } else {
                    // the diff btw header and td is bigger, better
                    var diff = Math.abs(textLen - tdText.length);
                    if (diff === 0 && text === tdText) {
                        score -= 20;
                    } else {
                        score += diff;
                    }
                }
            }
        }

        if (rowLen === 0 || score / rowLen < 20) {
            return false;
        } else {
            return true;
        }
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSPreview.__testOnly__ = {};
        DSPreview.__testOnly__.getPreviewTable = getPreviewTable;
        DSPreview.__testOnly__.parseTdHelper = parseTdHelper;
        DSPreview.__testOnly__.getTbodyHTML = getTbodyHTML;
        DSPreview.__testOnly__.getTheadHTML = getTheadHTML;
        DSPreview.__testOnly__.highlightHelper = highlightHelper;
        // DSPreview.__testOnly__.headerPromoteDetect = headerPromoteDetect;
        DSPreview.__testOnly__.applyHighlight = applyHighlight;
        // DSPreview.__testOnly__.applyDelim = applyDelim;
        // DSPreview.__testOnly__.togglePromote = togglePromote;
        DSPreview.__testOnly__.clearAll = clearAll;

        DSPreview.__testOnly__.get = function() {
            return {
                "delimiter"  : delimiter,
                "highlighter": highlighter
            };
        };

        DSPreview.__testOnly__.set = function(newDelim, newHeader, newHighlight, newData) {
            delimiter = newDelim || "";
            highlighter = newHighlight || "";
            rawData = newData || null;
        };
    }
    /* End Of Unit Test Only */

    return (DSPreview);
}(jQuery, {}));

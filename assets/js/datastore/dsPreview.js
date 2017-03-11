/*
 * Module for data preview
 */
window.DSPreview = (function($, DSPreview) {
    var $previewCard;   // $("#dsForm-preview");
    var $previeWrap;    // $("#dsPreviewWrap")
    var $previewTable;  // $("#previewTable")

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

    var loadArgs = new DSFormController();
    var advanceOption;
    var detectArgs = {};

    // UI cache
    var lastUDFModule = null;
    var lastUDFFunc = null;
    var backToFormCard = false;
    var tempParserUDF;

    // constant
    var rowsToFetch = 40;
    var minRowsToShow = 20;
    var numBytesRequest = 15000;
    var maxBytesRequest = 500000;
    var excelModule = "default";
    var excelFunc = "openExcel";
    var colGrabTemplate = '<div class="colGrab" data-sizedtoheader="false"></div>';

    var formatMap = {
        "JSON": "JSON",
        "CSV": "CSV",
        "TEXT": "raw",
        "EXCEL": "Excel",
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

        var $advanceOption = $form.find(".advanceOption");
        advanceOption = new DSFormAdvanceOption($advanceOption, "#dsForm-preview");

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
            TblAnim.startColResize($(this), event, {
                target: "datastore",
                minWidth: 25
            });
        });

        // minimize
        $("#dsForm-minimize").click(function() {
            $(".tooltip").hide();
            $previewCard.toggleClass("minimize");
        });

        // change preview file
        $("#preview-changeFile").click(function() {
            previewFileSelect();
        });

        $("#preview-parser").click(function() {
            previewFileSelect(true);
        });

        setupForm();
    };

    DSPreview.initialize = function() {
        advanceOption.setMode();
    };

    // restore: boolean, set to true if restoring after an error
    DSPreview.show = function(options, fromFormCard, dsId, restore) {

        xcHelper.enableSubmit($form.find(".confirm"));

        DSForm.switchView(DSForm.View.Preview);

        if (dsId != null) {
            $previewCard.data("dsid", dsId);
        } else {
            $previewCard.removeData("dsid", dsId);
        }

        if (fromFormCard) {
            backToFormCard = true;
        } else {
            backToFormCard = false;
        }

        if (restore) {
            restoreForm(options);
        } else {
            resetForm();

            loadArgs.set(options);
            advanceOption.set(options);

            var loadURL = loadArgs.getPath();
            setDefaultDSName(loadURL);
        }

        if (loadArgs.getFormat() === formatMap.EXCEL) {
            toggleFormat("EXCEL");
            return previewData(excelModule, excelFunc);
        } else if (restore) {
            return previewData(options.moduleName, options.funcName);
        } else {
            // all other rest format first
            // otherwise, cannot detect speical format(like special json)
            loadArgs.setFormat(null);
            return previewData(null, null);
        }
    };

    DSPreview.changePreviewFile = function(path) {
        loadArgs.setPreviewFile(path);
        refreshPreview();
    };

    DSPreview.update = function(listXdfsObj) {
        var moduleName = $udfModuleList.find("input").val();
        var funcName = $udfFuncList.find("input").val();

        listUDFSection(listXdfsObj)
        .always(function() {
            seletUDF(moduleName, funcName);
        });
    };

    DSPreview.backFromParser = function(curUrl, moduleName) {
        cleanTempParser();
        tempParserUDF = moduleName;
        toggleUDF(true);
        seletUDF(moduleName, "parser");
        DSForm.switchView(DSForm.View.Preview);
        DSPreview.changePreviewFile(curUrl);
    };

    DSPreview.clear = function() {
        if ($("#dsForm-preview").hasClass("xc-hidden")) {
            // when preview table not shows up
            return PromiseHelper.resolve(null);
        } else {
            return clearPreviewTable();
        }
    };

    DSPreview.getAdvanceOption = function() {
        return advanceOption;
    };

    DSPreview.cleanup = function() {
        return cleanTempParser();
    };

    function setupForm() {
        // setup udf
        $("#dsForm-refresh").click(function() {
            $(this).blur();
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
            "bounds": "#importDataForm-content"
        }).setupListeners();

        new MenuHelper($udfFuncList, {
            "onSelect": function($li) {
                var func = $li.text();
                selectUDFFunc(func);
            },
            "container": "#importDataForm-content",
            "bounds": "#importDataForm-content"
        }).setupListeners();

        // set up format dropdownlist
        new MenuHelper($("#fileFormat"), {
            "onSelect": function($li) {
                var format = $li.attr("name");
                var text = $li.text();
                toggleFormat(format, text);
            },
            "container": "#importDataForm-content",
            "bounds": "#importDataForm-content"
        }).setupListeners();

        // setUp line delimiter and field delimiter
        new MenuHelper($("#lineDelim"), {
            "onSelect": selectDelim,
            "container": "#importDataForm-content",
            "bounds": "#importDataForm-content"
        }).setupListeners();

        new MenuHelper($("#fieldDelim"), {
            "onSelect": selectDelim,
            "container": "#importDataForm-content",
            "bounds": "#importDataForm-content"
        }).setupListeners();

        function selectDelim($li) {
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
        }

        var $csvDelim = $("#lineDelim, #fieldDelim");
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
            $(this).blur();
            autoPreview();
        });

        // back button
        $form.on("click", ".cancel", function() {
            var path = loadArgs.getPath();
            var protocol;
            for (var key in FileProtocol) {
                protocol = FileProtocol[key];
                if (path.startsWith(protocol)) {
                    path = path.substring(protocol.length);
                    break;
                }
            }

            resetForm();
            clearPreviewTable();
            if (backToFormCard) {
                if (XVM.getLicenseMode() === XcalarMode.Demo) {
                    DSUploader.show();
                } else {
                    DSForm.show({"noReset": true});
                }
            } else {
                if (XVM.getLicenseMode() === XcalarMode.Demo) {
                    DSUploader.show();
                } else {
                    FileBrowser.show(protocol, path);
                }
            }
        });

        // submit the form
        $form.on("click", ".confirm", function() {
            var $submitBtn = $(this).blur();
            var toCreateTable = $submitBtn.hasClass("createTable");
            submitForm(toCreateTable);
        });
    }

    function listUDFSection(listXdfsObj) {
        var deferred = jQuery.Deferred();

        if (!listXdfsObj) {
            // update python module list
            XcalarListXdfs("*", "User*")
            .then(updateUDFList)
            .then(deferred.resolve)
            .fail(function(error) {
                console.error("List UDF Fails!", error);
                deferred.reject(error);
            });
        } else {
            updateUDFList(listXdfsObj);
            deferred.resolve();
        }

        return deferred.promise();
    }

    function updateUDFList(listXdfsObj) {
        var udfObj = xcHelper.getUDFList(listXdfsObj);
        $udfModuleList.find("ul").html(udfObj.moduleLis);
        $udfFuncList.find("ul").html(udfObj.fnLis);
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
        toggleUDF(false);
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

    function seletUDF(moduleName, funcName) {
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
                "title": TooltipTStr.ChooseUdfModule,
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

    function toggleUDF(usUDF) {
        var $checkbox = $("#udfCheckbox").find(".checkbox");
        var $udfArgs = $("#udfArgs");

        if (usUDF) {
            $form.addClass("udf");
            $checkbox.addClass("checked");
            $udfArgs.addClass("active");
        } else {
            $form.removeClass("udf");
            $checkbox.removeClass("checked");
            $udfArgs.removeClass("active");
        }
    }

    function cacheUDF(udfModule, udfFunc) {
        // cache udf module and func name
        if (udfModule && udfFunc) {
            lastUDFModule = udfModule;
            lastUDFFunc = udfFunc;
            return true;
        } else {
            return false;
        }
    }

    function isUseUDF() {
        return $("#udfCheckbox").find(".checkbox").hasClass("checked");
    }

    function isUseUDFWithFunc() {
        if (isUseUDF()) {
            var $funcInput = $udfFuncList.find("input");
            if ($funcInput.val() !== "") {
                return true;
            }
        }

        return false;
    }

    function resetForm() {
        $form.find("input").val("");
        $("#dsForm-skipRows").val("0");
        $form.find(".checkbox.checked").removeClass("checked");
        // keep the current protocol
        loadArgs.reset();
        advanceOption.reset();
        detectArgs = {
            "fieldDelim": "",
            "lineDelim": "\n",
            "hasHeader": false,
            "skipRows": 0,
            "quote": "\""
        };
        resetUdfSection();
        toggleFormat();
        // enable submit
        xcHelper.enableSubmit($form.find(".confirm"));

        // reset delimiter fields
        // to show \t, \ should be escaped
        $("#fieldText").val("Null").addClass("nullVal");
        $("#lineText").val("\\n").removeClass("nullVal");
    }

    function cleanTempParser() {
        if (tempParserUDF == null) {
            return PromiseHelper.resolve();
        } else {
            var deferred = jQuery.Deferred();
            var tempUDF = tempParserUDF;
            tempParserUDF = null;
            XcalarDeletePython(tempUDF)
            .always(function() {
                UDF.refresh();
                deferred.resolve();
            });

            return deferred.promise();
        }
    }

    function restoreForm(options) {
        $form.find("input").not($formatText).val("");
        $form.find(".checkbox.checked").removeClass("checked");

        // dsName
        $("#dsForm-dsName").val(options.dsName);

        // udf section
        var wasUDFCached = cacheUDF(options.moduleName, options.funcName);
        resetUdfSection();
        if (wasUDFCached) {
            toggleUDF(true);
        }

        // advanced section
        advanceOption.set(options);

        // format
        var format = options.format;
        if (format === formatMap.TEXT) {
            format = "TEXT";
        }
        toggleFormat(format);

        // header
        if (options.hasHeader) {
            toggleHeader(true);
        }

        //delims
        applyFieldDelim(options.fieldDelim || "");
        applyLineDelim(options.lineDelim || "");

        // quote char
        applyQuote(options.quoteChar || "");

        // skip rows
        $("#dsForm-skipRows").val(options.skipRows || 0);

        detectArgs = {
            "fieldDelim": options.fieldDelim,
            "lineDelim": options.lineDelim,
            "hasHeader": options.hasHeader,
            "skipRows": options.skipRows,
            "quote": options.quoteChar
        };

        loadArgs.set(options);
    }


    function submitForm(toCreateTable) {
        var res = validateForm();
        if (res == null) {
            return PromiseHelper.reject("Checking Invalid");
        }

        var deferred = jQuery.Deferred();
        var dsName = res.dsName;
        var format = res.format;

        var udfModule = res.udfModule;
        var udfFunc = res.udfFunc;

        var fieldDelim = res.fieldDelim;
        var lineDelim = res.lineDelim;

        var quote = res.quote;
        var skipRows = res.skipRows;

        var header = loadArgs.useHeader();

        var loadURL = loadArgs.getPath();
        var advanceArgs = advanceOption.getArgs();
        if (advanceArgs == null) {
            return PromiseHelper.reject("Checking Invalid");
        }

        var pattern = advanceArgs.pattern;
        var isRecur = advanceArgs.isRecur;
        var isRegex = advanceArgs.isRegex;
        var previewSize = advanceArgs.previewSize;

        // console.log(dsName, format, udfModule, udfFunc, fieldDelim, lineDelim,
        //     header, loadURL, quote, skipRows, isRecur, isRegex, previewSize);

        // XXX temp fix to preserve CSV header order
        var headers = null;
        if (format !== formatMap.JSON) {
            headers = getColumnHeaders();
        }

        cacheUDF(udfModule, udfFunc);

        var colLen = 0;
        if (toCreateTable) {
            colLen = $previewTable.find("th:not(.rowNumHead)").length;
        }

        function noQuoteAlertHelper() {
            if (quote.length === 1) {
                return PromiseHelper.resolve();
            }

            var innerDeferred = jQuery.Deferred();
            Alert.show({
                "title": DSFormTStr.NoQuoteWarn,
                "msg": DSFormTStr.NoQuoteWarnMsg,
                "onConfirm": innerDeferred.resolve,
                "onCancel": function() {
                    xcHelper.enableSubmit($form.find('.confirm'));
                    innerDeferred.reject();
                }
            });

            return innerDeferred.promise();
        }

        function tooManyColAlertHelper() {
            if (colLen < gMaxColToPull) {
                return PromiseHelper.resolve();
            }

            var innerDeferred = jQuery.Deferred();
            Alert.show({
                "title": DSFormTStr.CreateWarn,
                "msg": DSFormTStr.CreateWarnMsg,
                "onConfirm": innerDeferred.resolve,
                "onCancel": function() {
                    xcHelper.enableSubmit($form.find('.confirm'));
                    innerDeferred.reject();
                }
            });

            return innerDeferred.promise();
        }

        xcHelper.disableSubmit($form.find('.confirm'));
        // enableSubmit is done during the next showing of the form
        // If the form isn't shown, there's no way it can be submitted
        // anyway
        noQuoteAlertHelper()
        .then(tooManyColAlertHelper)
        .then(function() {
            var pointArgs = {
                "name": dsName,
                "format": format,
                "path": loadURL,
                "pattern": pattern,
                "fieldDelim": fieldDelim,
                "lineDelim": lineDelim,
                "hasHeader": header,
                "moduleName": udfModule,
                "funcName": udfFunc,
                "isRecur": isRecur,
                "previewSize": previewSize,
                "quoteChar": quote,
                "skipRows": skipRows,
                "isRegex": isRegex,
                "headers": headers
            };

            var dsToReplace = $previewCard.data("dsid") || null;
            var options = {
                "createTable": toCreateTable,
                "dsToReplace": dsToReplace
            };

            return DS.point(pointArgs, options);
        })
        .then(function() {
            cleanTempParser();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getColumnHeaders() {
        var headers = [];
        $previewTable.find("th:not(.rowNumHead)").each(function() {
            headers.push($(this).find(".text").text());
        });

        return headers;
    }

    function validateForm() {
        var $dsName = $("#dsForm-dsName");
        var dsName = $dsName.val().trim();
        // validate name
        var isValid = xcHelper.validate([
            {
                "$ele": $dsName
            },
            {
                "$ele": $dsName,
                "error": ErrTStr.TooLong,
                "formMode": true,
                "check": function() {
                    return (dsName.length >=
                            XcalarApisConstantsT.XcalarApiMaxTableNameLen);
                }
            },
            {
                "$ele": $dsName,
                "error": ErrTStr.DSStartsWithLetter,
                "formMode": true,
                "check": function() {
                    return !xcHelper.isStartWithLetter(dsName);
                }
            },
            {
                "$ele": $dsName,
                "formMode": true,
                "error": ErrTStr.DSNameConfilct,
                "check": function(name) {
                    var dsToReplace = $previewCard.data("dsid") || null;
                    if (dsToReplace) {
                        if (name === xcHelper.parseDSName(dsToReplace).dsName) {
                            return false;
                        }
                    }
                    return DS.has(name);
                }

            },
            {
                "$ele": $dsName,
                "formMode": true,
                "error": ErrTStr.NoSpecialCharOrSpace,
                "check": function() {
                    return !xcHelper.checkNamePattern("dataset", "check",
                                                      dsName);
                }
            }
        ]);

        if (!isValid) {
            return null;
        }

        // validate format
        var format = loadArgs.getFormat();
        isValid = xcHelper.validate([{
            "$ele": $formatText,
            "error": ErrTStr.NoEmptyList,
            "check": function() {
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
                    "$ele": $moduleInput,
                    "error": ErrTStr.NoEmptyList
                },
                {
                    "$ele": $funcInput,
                    "error": ErrTStr.NoEmptyList
                }
            ]);

            if (!isValid) {
                return null;
            }

            udfModule = $moduleInput.val();
            udfFunc = $funcInput.val();
            // streaming UDF can only be json
            format = formatMap.JSON;
        }

        // validate delimiter
        var fieldDelim = loadArgs.getFieldDelim();
        var lineDelim = loadArgs.getLineDelim();
        var quote = loadArgs.getQuote();

        isValid = xcHelper.validate([
            {
                "$ele": $fieldText,
                "error": DSFormTStr.InvalidDelim,
                "formMode": true,
                "check": function() {
                    return (typeof fieldDelim === "object");
                }
            },
            {
                "$ele": $lineText,
                "error": DSFormTStr.InvalidDelim,
                "formMode": true,
                "check": function() {
                    return (typeof lineDelim === "object");
                }
            },

            {
                "$ele": $quote,
                "error": DSFormTStr.InvalidQuote,
                "formMode": true,
                "check": function() {
                    return (typeof quote === "object") ||
                           (xcHelper.delimiterTranslate($quote).length > 1);
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
                "$ele": $("#dsForm-skipRows"),
                "error": ErrTStr.NoNegativeNumber,
                "formMode": true,
                "check": function() {
                    return (skipRows < 0);
                }
            }
        ]);

        if (!isValid) {
            return null;
        }

        // special case: special json:
        if (format === formatMap.JSON && detectArgs.isSpecialJSON === true) {
            // if user specified udf, then use the udf.
            // otherwise, treat it as special json
            if (udfModule === "" || udfFunc === "") {
                udfModule = "default";
                udfFunc = "convertNewLineJsonToArrayJson";
                format = formatMap.JSON;
            }
        }

        return {
            "dsName": dsName,
            "format": format,
            "udfModule": udfModule,
            "udfFunc": udfFunc,
            "fieldDelim": fieldDelim,
            "lineDelim": lineDelim,
            "quote": quote,
            "skipRows": skipRows
        };
    }

    function getNameFromPath(path) {
        if (path.charAt(path.length - 1) === "/") {
            // remove the last /
            path = path.substring(0, path.length - 1);
        }

        var paths = path.split("/");
        var splitLen = paths.length;
        var name = paths[splitLen - 1];

        // strip the suffix dot part and only keep a-zA-Z0-9.
        name = xcHelper.checkNamePattern("dataset", "fix", name.split(".")[0],
                                         "");

        if (!xcHelper.isStartWithLetter(name) && splitLen > 1) {
            // when starts with number
            var prefix = xcHelper.checkNamePattern("dataset", "fix",
                                                   paths[splitLen - 2], "");
            if (xcHelper.isStartWithLetter(prefix)) {
                name = prefix + name;
            }
        }

        if (!xcHelper.isStartWithLetter(name)) {
            // if still starts with number
            name = "ds" + name;
        }

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

    function setFieldDelim() {
        var fieldDelim = xcHelper.delimiterTranslate($fieldText);

        if (typeof fieldDelim === "object") {
            // error case
            return;
        }

        loadArgs.setFieldDelim(fieldDelim);
    }

    function setLineDelim() {
        var lineDelim = xcHelper.delimiterTranslate($lineText);

        if (typeof lineDelim === "object") {
            // error case
            return;
        }

        loadArgs.setLineDelim(lineDelim);
    }

    function setQuote() {
        var quote = xcHelper.delimiterTranslate($quote);

        if (typeof quote === "object") {
            // error case
            return;
        }

        if (quote.length > 1) {
            return;
        }

        loadArgs.setQuote(quote);
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
        var $skipRows = $("#dsForm-skipRows").closest(".row")
                                             .removeClass("xc-hidden");

        if (format == null) {
            // reset case
            $lineDelim.addClass("xc-hidden");
            $fieldDelim.addClass("xc-hidden");
            $headerRow.addClass("xc-hidden");
            $formatText.data("format", "").val("");
            loadArgs.setFormat(null);
            return;
        }

        format = format.toUpperCase();
        if (text == null) {
            text = $('#fileFormatMenu li[name="' + format + '"]').text();
        }

        $formatText.data("format", format).val(text);
        $form.removeClass("format-excel");

        switch (format) {
            case "CSV":
                $skipRows.removeClass("");
                setFieldDelim();
                break;
            case "TEXT":
                // no field delimiter when format is text
                $fieldDelim.addClass("xc-hidden");
                loadArgs.setFieldDelim("");
                break;
            case "EXCEL":
                $lineDelim.addClass("xc-hidden");
                $fieldDelim.addClass("xc-hidden");
                // excel not use udf section
                $udfArgs.addClass("xc-hidden");
                $form.addClass("format-excel");
                $skipRows.addClass("xc-hidden");
                $quoteRow.addClass("xc-hidden");
                break;
            // json and random
            case "JSON":
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
                throw ("Format Not Support");
        }

        loadArgs.setFormat(formatMap[format]);
    }

    function clearPreviewTable() {
        var deferred = jQuery.Deferred();
        applyHighlight(""); // remove highlighter
        $previewTable.removeClass("has-delimiter").empty();
        rawData = null;

        if (tableName != null) {
            var dsName = tableName;
            tableName = null;
            var sql = {
                "operation": SQLOps.DestroyPreviewDS,
                "dsName": dsName
            };
            var txId = Transaction.start({
                "operation": SQLOps.DestroyPreviewDS,
                "sql": sql
            });

            XcalarDestroyDataset(dsName, txId)
            .then(function() {
                Transaction.done(txId, {
                    "noCommit": true,
                    "noSql": true
                });
                deferred.resolve();
            })
            .fail(function(error) {
                Transaction.fail(txId, {
                    "error": error,
                    "noAlert": true
                });
                // fail but still resolve it because
                // it has no effect to other operations
                deferred.resolve();
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise();
    }

    function previewData(udfModule, udfFunc, noDetect) {
        var deferred = jQuery.Deferred();

        var loadURL = loadArgs.getPath();
        var advanceArgs = advanceOption.getArgs();

        var dsName = $("#dsForm-dsName").val();
        if (!dsName) {
            dsName = setDefaultDSName(loadURL);
        }

        var isRecur = advanceArgs.isRecur;
        var isRegex = advanceArgs.isRegex;
        var pattern = xcHelper.getFileNamePattern(advanceArgs.pattern, isRegex);

        var previewSize = advanceArgs.previewSize;
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

        var urlToPreview = loadArgs.getPreviewFile() || loadURL;
        var $loadHiddenSection = $previeWrap.find(".loadHidden")
                                            .addClass("hidden");
        var $waitSection = $previeWrap.find(".waitSection")
                                    .removeClass("hidden");
        $previeWrap.find(".errorSection").addClass("hidden");
        var sql = {
            "operation": SQLOps.PreviewDS,
            "dsPath": urlToPreview,
            "dsName": dsName,
            "moduleName": udfModule,
            "funcName": udfFunc,
            "isRecur": isRecur
        };

        var txId = Transaction.start({
            "operation": SQLOps.PreviewDS,
            "sql": sql
        });

        setURL(loadURL, pattern);

        var initialLoadArgStr;
        if (!noDetect) {
            initialLoadArgStr = loadArgs.getArgStr();
        }

        var promise;
        if (hasUDF) {
            promise = loadDataWithUDF(txId, urlToPreview, pattern, dsName,
                                    udfModule, udfFunc, isRecur, previewSize);
        } else {
            promise = loadData(urlToPreview, pattern, isRecur);
        }

        promise
        .then(function(result) {
            if (!result) {
                var error = DSTStr.NoRecords + '\n' + DSTStr.NoRecrodsHint;
                return PromiseHelper.reject(error);
            }
            $waitSection.addClass("hidden");
            rawData = result;

            $loadHiddenSection.removeClass("hidden");

            getPreviewTable();

            if (!noDetect) {
                var currentLoadArgStr = loadArgs.getArgStr();
                // when user not do any modification, then do smart detect
                if (initialLoadArgStr === currentLoadArgStr) {
                    smartDetect();
                }
            }

            // not cache to sql log, only show when fail
            Transaction.done(txId, {
                "noCommit": true,
                "noSql": true
            });

            deferred.resolve();
        })
        .fail(function(error) {
            Transaction.fail(txId, {
                "error": error,
                "noAlert": true
            });

            errorHandler(error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function setDefaultDSName(loadURL) {
        var dsName = getNameFromPath(loadURL);
        $("#dsForm-dsName").val(dsName);
        return dsName;
    }

    function setURL(url, pattern) {
        $("#preview-url").find(".text").text(url);
        var $pattern = $("#preview-pattern");
        if (!pattern) {
            $pattern.addClass("xc-hidden");
        } else {
            $pattern.removeClass("xc-hidden")
            .find(".text").text(pattern);
        }
    }

    function setPreviewFile(path, forceHidden) {
        var $file = $("#preview-file");
        var $ele = $("#preview-changeFile").add($file);
        var fullURL = loadArgs.getPath();
        var enable;

        $file.find(".text").text(path);
        if (!loadArgs.getPreviewFile()) {
            // set the path to be preview file if not set yet
            loadArgs.setPreviewFile(path);
        }

        if (fullURL.endsWith(path)) {
            // when fullPath is part of the url,
            // which means it's a single file
            enable = false;
        } else {
            enable = true;
        }

        if (enable || forceHidden) {
            $ele.removeClass("xc-hidden");
        } else {
             // when it's a single file or udf
            $ele.addClass("xc-hidden");
        }
    }

    function previewFileSelect(isParseMode) {
        var loadURL = loadArgs.getPath();
        var previewFile = $("#preview-file").find(".text").text();
        var advanceArgs = advanceOption.getArgs();
        var isRecur = advanceArgs.isRecur;
        var isRegex = advanceArgs.isRegex;
        var pattern = xcHelper.getFileNamePattern(advanceArgs.pattern, isRegex);

        PreviewFileModal.show(loadURL, {
            "previewFile": previewFile,
            "isRecur": isRecur,
            "pattern": pattern,
            "isParseMode": isParseMode
        });
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

    function errorHandler(error) {
        if (typeof error === "object") {
            if (error.status === StatusT.StatusNoEnt ||
                error.status === StatusT.StatusIsDir ||
                error.status === StatusT.StatusAllFilesEmpty)
            {
                error = error.error + ", " + DSFormTStr.GoBack + ".";
            } else {
                error = error.error;
            }
        }

        $previeWrap.find(".waitSection").addClass("hidden");
        $previeWrap.find(".errorSection")
                .html(error).removeClass("hidden");
        $previeWrap.find(".loadHidden").addClass("hidden");
    }

    function loadData(loadURL, pattern, isRecur) {
        var deferred = jQuery.Deferred();
        bufferData(loadURL, pattern, isRecur, numBytesRequest)
        .then(function(res) {
            var fullURL = loadArgs.getPath();
            if (fullURL.endsWith(res.fullPath)) {
                // when fullPath is part of the url,
                // which means it's a single file
                setPreviewFile(fullURL);
            } else {
                var path = fullURL.endsWith("/") ? fullURL : fullURL + "/";
                path += res.fileName;
                setPreviewFile(path);
            }
            deferred.resolve(res.buffer);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function bufferData(loadURL, pattern, isRecur, numBytesRequest, isRetry) {
        var deferred = jQuery.Deferred();
        XcalarPreview(loadURL, pattern, isRecur, numBytesRequest)
        .then(function(res) {
            if (!isRetry && res.buffer != null) {
                var d = res.buffer.split("\n");
                var lines = d.length;
                if (lines < minRowsToShow) {
                    var maxBytesInLine = 0;
                    for (var i = 0, len = d.length; i < len; i++) {
                        maxBytesInLine = Math.max(maxBytesInLine, d[i].length);
                    }

                    var bytesNeed = maxBytesInLine * minRowsToShow;
                    bytesNeed = Math.min(bytesNeed, maxBytesRequest);
                    console.info("too small rows, request", bytesNeed);
                    return bufferData(loadURL, pattern, isRecur,
                                      bytesNeed, true);
                }
            }

            return PromiseHelper.resolve(res);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    // load with UDF always return JSON format
    function loadDataWithUDF(txId, loadURL, pattern, dsName,
                            udfModule, udfFunc, isRecur, previewSize) {
        var deferred = jQuery.Deferred();
        var urlToPreview;
        var disablePreview;
        var format = formatMap.JSON;

        var tempDSName = getPreviewTableName(dsName);
        tableName = tempDSName;

        getFileToPreviewInUDF(loadURL, isRecur, pattern)
        .then(function(url, noPreview) {
            urlToPreview = url;
            disablePreview = noPreview;
            return XcalarLoad(urlToPreview, format, tempDSName, "", "\n",
                            false, udfModule, udfFunc, isRecur,
                            previewSize, gDefaultQDelim, 0, pattern, txId)
        })
        .then(function() {
            return sampleData(tempDSName, rowsToFetch);
        })
        .then(function(result) {
            if (!result) {
                deferred.resolve(null);
                return;
            }

            try {
                var rows = parseRows(result);
                var buffer = JSON.stringify(rows);
                setPreviewFile(urlToPreview, disablePreview);
                deferred.resolve(buffer);
            } catch (err) {
                console.error(err.stack);
                deferred.reject({"error": DSTStr.NoParse});
            }
        })
        .fail(function(error, loadError) {
            var displayError = loadError || error;
            deferred.reject(displayError);
        });

        function parseRows(data) {
            var rows = [];

            for (var i = 0, len = data.length; i < len; i++) {
                var value = data[i].value;
                var row = $.parseJSON(value);
                delete row.recordNum;
                rows.push(row);
            }

            return rows;
        }

        return deferred.promise();
    }

    function getFileToPreviewInUDF(url, isRecur, pattern) {
        var deferred = jQuery.Deferred();

        XcalarListFilesWithPattern(url, isRecur, pattern)
        .then(function(res) {
            if (res && res.numFiles > 0) {
                var fileName = res.files[0].name;
                var fileURL;
                if (res.numFiles === 1 && url.endsWith(fileName)) {
                    // when select a single file
                    fileURL = url;
                } else {
                    // when select a folder
                    fileURL = url.endsWith("/") ? url : url + "/";
                    fileURL += fileName;
                }
                deferred.resolve(fileURL);
            } else {
                console.error("no file listed");
                deferred.resolve(url, true);
            }
        })
        .fail(function(error) {
            console.error("list file fails", error);
            deferred.resolve(url, true);
        });

        return deferred.promise();
    }

    function autoPreview() {
        $("#dsForm-skipRows").val(0);
        smartDetect();
        xcHelper.showSuccess(SuccessTStr.Detect);
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

        clearPreviewTable()
        .then(function() {
            return previewData(udfModule, udfFunc, true);
        })
        .fail(errorHandler);
    }

    function getPreviewTable() {
        if (rawData == null) {
            // error case
            errorHandler(DSFormTStr.NoData);
            return;
        }

        $previeWrap.find(".errorSection").addClass("hidden");
        $previeWrap.find(".loadHidden").removeClass("hidden");
        $highlightBtns.addClass("hidden");

        var format = loadArgs.getFormat();
        if (isUseUDFWithFunc() || format === formatMap.JSON)
        {
            getJSONTable(rawData);
            return;
        }

        if (format === formatMap.EXCEL) {
            getJSONTable(rawData);
            if (loadArgs.useHeader()) {
                toggleHeader(true, true);
            }
            return;
        }

        // line delimiter
        var lineDelim = loadArgs.getLineDelim();
        var data = lineSplitHelper(rawData, lineDelim);

        data = data.map(function(d) {
            return d.split("");
        });

        var fieldDelim = loadArgs.getFieldDelim();
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
                            colGrabTemplate +
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

    function toggleHeader(promote, changePreview) {
        loadArgs.setHeader(promote);
        var hasHeader = loadArgs.useHeader();
        if (hasHeader) {
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

        if (hasHeader) {
            // promote header
            var headerText = "";
            var width;
            var $th;
            for (var i = 1, len = $tds.length; i < len; i++) {
                headerHtml = $tds.eq(i).html();
                headerText = $tds.eq(i).text();
                $th = $headers.eq(i).parent();
                width = Math.max(gNewCellWidth,
                                 getTextWidth($th, headerText) + 8);
                $th.width(width);
                $headers.eq(i).find(".text").html(headerHtml);
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
                html += '<td class="cell"><div class="innerCell">' +
                            $text.html() + '</div></td>';
                $text.html("column" + (i - 1));
            }

            html += '</tr>';

            $trs.eq(0).before(html);
            $headers.eq(0).empty()
                    .closest("th").removeClass("undo-promote");
        }
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
        name = xcHelper.wrapDSName(name) + "-xcalar-preview";
        return name;
    }

    function getJSONTable(datas) {
        var json = parseJSONData(datas);
        if (json == null) {
            // error case
            return;
        }

        $previewTable.html(getJSONTableHTML(json))
        .addClass("has-delimiter");
    }

    function parseJSONData(datas) {
        var startIndex = datas.indexOf("{");
        var endIndex = datas.lastIndexOf("}");
        if (startIndex === -1 || endIndex === -1) {
            errorHandler(DSFormTStr.NoParseJSON);
            return null;
        }

        var record = [];
        var bracketCnt = 0;
        var hasBackSlash = false;
        var hasQuote = false;

        for (var i = startIndex; i <= endIndex; i++) {
            var c = datas.charAt(i);
            if (hasBackSlash) {
                // skip
                hasBackSlash = false;
            } else if (c === '\\') {
                hasBackSlash = true;
            } else if (c === '"') {
                // toggle escape of quote
                hasQuote = !hasQuote;
            } else if (!hasBackSlash && !hasQuote) {
                if (c === "{") {
                    if (startIndex === -1) {
                        startIndex = i;
                    }
                    bracketCnt++;
                } else if (c === "}") {
                    bracketCnt--;
                    if (bracketCnt === 0) {
                        record.push(datas.substring(startIndex, i + 1));
                        startIndex = -1;
                        // not show too much rows
                        if (record.length >= rowsToFetch) {
                            break;
                        }
                    } else if (bracketCnt < 0) {
                        // error cse
                        errorHandler(DSFormTStr.NoParseJSON);
                        return null;
                    }
                }
            }
        }

        if (bracketCnt === 0 && startIndex >= 0 && startIndex <= endIndex) {
            record.push(datas.substring(startIndex, endIndex + 1));
        }

        var string = "[" + record.join(",") + "]";
        var json;

        try {
            json = $.parseJSON(string);
        } catch (error) {
            errorHandler(DSFormTStr.NoParseJSON + ": " + error);
            return null;
        }

        return json;
    }

    function getJSONHeaders(json) {
        var rowLen = json.length;
        var keys = {};
        for (var i = 0; i < rowLen; i++) {
            for (var key in json[i]) {
                keys[key] = true;
            }
        }

        var headers = Object.keys(keys);
        return headers;
    }

    function getJSONTableHTML(json) {
        var headers = getJSONHeaders(json);
        var rowLen = json.length;
        var colLen = headers.length;
        var html = '<thead><tr>' +
                    '<th class="rowNumHead">' +
                        '<div class="header"></div>' +
                    '</th>';
        for (var i = 0; i < colLen; i++) {
            var width = Math.max(gNewCellWidth + 5,
               getTextWidth(null, headers[i], {defaultHeaderStyle: true}) - 36);
            html += '<th style="width:' + width + 'px;">' +
                        '<div class="header">' +
                            colGrabTemplate +
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
                var val = jsonRow[headers[j]];
                if (val == null) {
                    val = "";
                }
                if (typeof val === "object") {
                    val = JSON.stringify(val);
                }

                html += '<td class="cell"><div class="innerCell">' + val +
                        '</div></td>';
            }

            html += '</tr>';
        }

        html += '</tbody>';

        return html;
    }

    function getTheadHTML(datas, delimiter, tdLen) {
        var thead = "<thead><tr>";
        var colGrab = (delimiter === "") ? "" : colGrabTemplate;

        // when has header
        if (loadArgs.useHeader()) {
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
                            '<div class="text">column' + i + '</div>' +
                        '</div>' +
                    '</th>';
            }
        }

        thead += "</tr></thead>";

        return (thead);
    }

    function getTbodyHTML(datas, delimiter) {
        var tbody = "<tbody>";
        var i = loadArgs.useHeader() ? 1 : 0;
        // not showing too much rows
        var len = Math.min(datas.length, rowsToFetch);
        for (j = 0; i < len; i++, j++) {
            tbody += '<tr>' +
                        '<td class="lineMarker">' +
                            (j + 1) +
                        '</td>';
            tbody += parseTdHelper(datas[i], delimiter) + '</tr>';
        }

        tbody += "</tbody>";

        return (tbody);
    }

    function lineSplitHelper(data, delim, rowsToSkip) {
        // XXX this O^2 plus the fieldDelim O^2 may be too slow
        // may need a better way to do it
        var dels = delim.split("");
        var delLen = dels.length;
        if (delLen === 0) {
            return [data];
        }

        var hasQuote = false;
        var hasBackSlash = false;
        var quote = loadArgs.getQuote();
        var dataLen = data.length;
        var res = [];
        var i = 0;
        var startIndex = 0;
        while (i < dataLen) {
            var c = data.charAt(i);
            var isDelimiter = false;

            if (!hasBackSlash && !hasQuote && c === dels[0]) {
                isDelimiter = true;

                for (var j = 1; j < delLen; j++) {
                    if (i + j >= dataLen || data.charAt(i + j) !== dels[j]) {
                        isDelimiter = false;
                        break;
                    }
                }
            }

            if (isDelimiter) {
                res.push(data.substring(startIndex, i));
                i = i + delLen;
                startIndex = i;
            } else {
                if (hasBackSlash) {
                    // when previous char is \. espace this one
                    hasBackSlash = false;
                } else if (c === '\\') {
                    hasBackSlash = true;
                } else if (c === quote) {
                    // toggle escape of quote
                    hasQuote = !hasQuote;
                }
                i++;
            }
        }

        if (i === dataLen && startIndex !== dataLen) {
            res.push(data.substring(startIndex, dataLen));
        }

        if (rowsToSkip == null || isNaN(rowsToSkip)) {
            rowsToSkip = getSkipRows();
        }

        res = res.slice(rowsToSkip);

        return res;
    }

    function parseTdHelper(data, strToDelimit, isTh) {
        var hasQuote = false;
        var hasBackSlash = false;
        var dels = strToDelimit.split("");
        var delLen = dels.length;
        var quote = loadArgs.getQuote();

        var hasDelimiter = (delLen !== 0);
        var colGrab = hasDelimiter ? colGrabTemplate : "";
        var html = isTh ? '<th><div class="header">' + colGrab +
                            '<div class="text cell">'
                            : '<td class="cell"><div class="innerCell">';

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
                                xcHelper.numToStr(hiddenStrLen) + " " +
                                TblTStr.Truncate + ")</span>";
                    }
                    if (isTh) {
                        html += '</div></div></th>' +
                                '<th>' +
                                    '<div class="header">' +
                                        colGrab +
                                        '<div class="text cell">';
                    } else {
                        html += '</div></td><td class="cell">' +
                                    '<div class="innerCell">';
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
                        xcHelper.numToStr(lenDiff) + " " +
                        TblTStr.Truncate + ")</span>";
            }
        }

        if (isTh) {
            html += '</div></div></th>';
        } else {
            html += '</div></td>';
        }
        return (html);
    }

    function smartDetect() {
        applyLineDelim("\n");
        applyQuote("\"");

        // step 0: check if should check UDF or not
        if (!isUseUDFWithFunc()) {
            toggleUDF(false);
        }

        // step 1: detect format
        var lineDelim = loadArgs.getLineDelim();
        var format = loadArgs.getFormat();
        detectArgs.format = detectFormat(format, rawData, lineDelim);

        var formatText;
        for (var key in formatMap) {
            if (formatMap[key] === detectArgs.format) {
                formatText = key;
                break;
            }
        }
        toggleFormat(formatText, null);

        // step 2: detect delimiter
        if (detectArgs.format === formatMap.CSV) {
            detectArgs.fieldDelim = xcSuggest.detectDelim(rawData);

            if (detectArgs.fieldDelim !== "") {
                applyFieldDelim(detectArgs.fieldDelim);
            }

            // step 3: detect header
            detectArgs.hasHeader = detectHeader(rawData, lineDelim,
                                                detectArgs.fieldDelim);
        } else if (detectArgs.format === formatMap.EXCEL) {
            detectArgs.hasHeader = detectExcelHeader(rawData);
        } else {
            detectArgs.hasHeader = false;
        }

        if (detectArgs.hasHeader) {
            toggleHeader(true);
        } else {
            toggleHeader(false);
        }

        // step 4: update preview after detection
        getPreviewTable();
    }

    function detectFormat(format, data, lineDelim) {
        if (format === formatMap.EXCEL) {
            return format;
        } else {
            var rows = lineSplitHelper(data, lineDelim, 0);
            var detectRes = xcSuggest.detectFormat(rows);

            if (detectRes === DSFormat.JSON) {
                detectArgs.isSpecialJSON = false;
                return formatMap.JSON;
            } else if (!isUseUDF() && detectRes === DSFormat.SpecialJSON) {
                // speical json should use udf to parse,
                // so if already use udf, cannot be speical json
                detectArgs.isSpecialJSON = true;
                return formatMap.JSON;
            } else {
                return formatMap.CSV;
            }
        }
    }

    function detectHeader(data, lineDelim, fieldDelim) {
        var rows = lineSplitHelper(data, lineDelim);
        var rowLen = Math.min(rowsToFetch, rows.length);
        var parsedRows = [];

        for (var i = 0; i < rowLen; i++) {
            parsedRows[i] = lineSplitHelper(rows[i], fieldDelim, 0);
        }

        return xcSuggest.detectHeader(parsedRows);
    }

    function detectExcelHeader(data) {
        var rows = null;
        try {
            rows = JSON.parse(data);
        } catch (error) {
            console.error(error);
            return false;
        }
        var headers = getJSONHeaders(rows);
        var rowLen = rows.length;
        var colLen = headers.length;
        var parsedRows = [];

        for (var i = 0; i < rowLen; i++) {
            parsedRows[i] = [];
            for (var j = 0; j < colLen; j++) {
                parsedRows[i][j] = rows[i][headers[j]];
            }
        }

        return xcSuggest.detectHeader(parsedRows);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSPreview.__testOnly__ = {};
        DSPreview.__testOnly__.getPreviewTable = getPreviewTable;
        DSPreview.__testOnly__.parseTdHelper = parseTdHelper;
        DSPreview.__testOnly__.getTbodyHTML = getTbodyHTML;
        DSPreview.__testOnly__.getTheadHTML = getTheadHTML;
        DSPreview.__testOnly__.getPreviewTableName = getPreviewTableName;
        DSPreview.__testOnly__.highlightHelper = highlightHelper;
        DSPreview.__testOnly__.toggleHeader = toggleHeader;
        DSPreview.__testOnly__.detectFormat = detectFormat;
        DSPreview.__testOnly__.detectHeader = detectHeader;
        DSPreview.__testOnly__.detectExcelHeader = detectExcelHeader;
        DSPreview.__testOnly__.applyHighlight = applyHighlight;
        DSPreview.__testOnly__.clearPreviewTable = clearPreviewTable;

        DSPreview.__testOnly__.resetForm = resetForm;
        DSPreview.__testOnly__.restoreForm = restoreForm;
        DSPreview.__testOnly__.getNameFromPath = getNameFromPath;
        DSPreview.__testOnly__.getSkipRows = getSkipRows;
        DSPreview.__testOnly__.applyFieldDelim = applyFieldDelim;
        DSPreview.__testOnly__.applyLineDelim = applyLineDelim;
        DSPreview.__testOnly__.applyQuote = applyQuote;
        DSPreview.__testOnly__.toggleFormat = toggleFormat;
        DSPreview.__testOnly__.toggleUDF = toggleUDF;
        DSPreview.__testOnly__.isUseUDF = isUseUDF;
        DSPreview.__testOnly__.isUseUDFWithFunc = isUseUDFWithFunc;
        DSPreview.__testOnly__.selectUDFModule = selectUDFModule;
        DSPreview.__testOnly__.selectUDFFunc = selectUDFFunc;

        DSPreview.__testOnly__.validateUDFModule = validateUDFModule;
        DSPreview.__testOnly__.validateUDFFunc = validateUDFFunc;
        DSPreview.__testOnly__.resetUdfSection = resetUdfSection;

        DSPreview.__testOnly__.validateForm = validateForm;
        DSPreview.__testOnly__.submitForm = submitForm;

        DSPreview.__testOnly__.get = function() {
            return {
                "loadArgs": loadArgs,
                "highlighter": highlighter,
                "detectArgs": detectArgs
            };
        };

        DSPreview.__testOnly__.set = function(newData, newHighlight) {
            highlighter = newHighlight || "";
            rawData = newData || null;
        };
    }
    /* End Of Unit Test Only */

    return (DSPreview);
}(jQuery, {}));

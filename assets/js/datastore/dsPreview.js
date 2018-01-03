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
    var udfModuleHint;
    var udfFuncHint;

    var $headerCheckBox; // $("#promoteHeaderCheckbox") promote header checkbox
    var $genLineNumCheckBox; // $("#genLineNumbersCheckbox");

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
    var isViewFolder = false;
    var tempParserUDF;
    var rowsToFetch = 40;
    var previewId;

    // constant
    var defaultRowsToFech = 40;
    var minRowsToShow = 20;
    var numBytesRequest = 15000;
    var maxBytesRequest = 500000;
    var excelModule = "default";
    var excelFunc = "openExcel";
    var colGrabTemplate = '<div class="colGrab" data-sizedtoheader="false"></div>';
    var oldPreviewError = "old preview error";

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
        $genLineNumCheckBox = $("#genLineNumbersCheckbox");

        var $advanceOption = $form.find(".advanceOption");
        advanceOption = new DSFormAdvanceOption($advanceOption, {
            "container": "#dsForm-preview",
            "onOpenList": openAdvanceList
        });

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
            xcTooltip.hideAll();
            $previewCard.toggleClass("minimize");
        });

        // change preview file
        $("#preview-changeFile").click(function() {
            previewFileSelect();
        });

        $("#preview-parser").click(function() {
            if (isPreviewSingleFile()) {
                DSParser.show({
                    targetName: loadArgs.getTargetName(),
                    path: loadArgs.getPath()
                });
            } else {
                previewFileSelect(true);
            }
        });

        var contentScrollTimer;
        var contentIsScrolling = false;
        $("#importDataForm-content").scroll(function() {
            if (!contentIsScrolling) {
                StatusBox.forceHide();
            }
            contentIsScrolling = true;
            clearInterval(contentScrollTimer);
            contentScrollTimer = setTimeout(function() {
                contentIsScrolling = false;
            }, 500);
        });

        // preview
        var $previewBottom = $previeWrap.find(".previewBottom");
        $previewBottom.on("click", ".action", function() {
            showMoreRows();
        });

        setupForm();
    };

    // restore: boolean, set to true if restoring after an error
    DSPreview.show = function(options, fromFormCard, dsId, restore) {
        xcHelper.enableSubmit($form.find(".confirm"));
        DSForm.switchView(DSForm.View.Preview);
        resetPreviewFile();

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

        var module = null;
        var func = null;
        if (restore) {
            module = options.moduleName;
            func = options.funcName;
        } else {
            // all other rest format first
            // otherwise, cannot detect speical format(like special json)
            loadArgs.setFormat(null);
        }

        return previewData({
            "udfModule": module,
            "udfFunc": func,
            "isFirstTime": true
        });
    };

    DSPreview.changePreviewFile = function(path, noDetect) {
        path = xcHelper.decodeDisplayURL(loadArgs.getPath(), path);
        loadArgs.setPreviewFile(path);
        refreshPreview(noDetect);
    };

    DSPreview.update = function(listXdfsObj) {
        var moduleName = $udfModuleList.find("input").val();
        var funcName = $udfFuncList.find("input").val();

        listUDFSection(listXdfsObj)
        .always(function() {
            selectUDF(moduleName, funcName);
        });
    };

    DSPreview.toggleXcUDFs = function(hide) {
        if (hide) {
            $udfModuleList.find("li").filter(function() {
                return $(this).text().indexOf("_xcalar") === 0;
            }).addClass("xcUDF");
        } else {
            $udfModuleList.find("li").removeClass("xcUDF");
        }
    };

    /*
     * options:
     *  moduleName: udf module to apply
     *  delimieter: line delimiter (for plain text mode)
     */
    DSPreview.backFromParser = function(curUrl, options) {
        options = options || {};
        var moduleName = options.moduleName;
        var delimiter = options.delimiter;

        // After plain text mode in AVP,
        // instead of redetecting, we should change to text,
        // no field delim, no quote char and add row num
        var noDetect = false;
        if (delimiter == null) {
            cleanTempParser();
            tempParserUDF = moduleName;
            toggleUDF(true);
            selectUDF(moduleName, "parser");
        } else {
            applyLineDelim(delimiter);
            noDetect = true;
            toggleFormat("TEXT");
            applyQuote("");
            if (isPreviewSingleFile()) {
                toggleGenLineNum(true);
            }
        }

        DSForm.switchView(DSForm.View.Preview);
        DSPreview.changePreviewFile(curUrl, noDetect);
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
        $form.on("click", ".refreshPreview", function() {
            var $btn = $(this).blur();
            var changePattern = $btn.hasClass("changePattern");
            var format = loadArgs.getFormat();
            if (format == null) {
                refreshPreview(false, true, changePattern);
            } else {
                refreshPreview(true, false, changePattern);
            }
        });

        // set up format dropdownlist
        new MenuHelper($("#fileFormat"), {
            "onSelect": function($li) {
                var format = $li.attr("name");
                changeFormat(format);
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

        var $csvDelim = $("#lineDelim, #fieldDelim");
        $csvDelim.on("input", "input", function() {
            var $input = $(this);
            $input.removeClass("nullVal");

            var isFieldDelimiter = ($input.attr("id") === "fieldText");
            changeDelimiter(isFieldDelimiter);
        });

        $csvDelim.on("click", ".iconWrapper", function() {
            $(this).closest(".dropDownList").find(".text").focus();
        });

        // quote
        $quote.on("input", function() {
            var hasChangeQuote = setQuote();
            if (hasChangeQuote) {
                getPreviewTable();
            }
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
            getPreviewTable();
        });

        $genLineNumCheckBox.on("click", function() {
            var $checkbox = $genLineNumCheckBox.find(".checkbox");
            if ($checkbox.hasClass("checked")) {
                // remove header
                $checkbox.removeClass("checked");
                toggleGenLineNum(false);
            } else {
                $checkbox.addClass("checked");
                toggleGenLineNum(true);
            }
        });

        // skip rows
        $("#dsForm-skipRows").on("input", function() {
            getPreviewTable();
        });

        // auto detect
        $("#dsForm-detect").click(function() {
            $(this).blur();
            autoPreview();
        });

        // back button
        $form.on("click", ".cancel", function() {
            var path = loadArgs.getPath();
            var targetName = loadArgs.getTargetName();

            resetForm();
            clearPreviewTable();
            if (XVM.getLicenseMode() === XcalarMode.Demo) {
                DSUploader.show();
            } else if (backToFormCard) {
                DSForm.show({"noReset": true});
            } else {
                FileBrowser.show(targetName, path);
            }
        });

        // submit the form
        $form.on("click", ".confirm", function() {
            var $submitBtn = $(this).blur();
            var toCreateTable = $submitBtn.hasClass("createTable");
            submitForm(toCreateTable);
        });

        setupUDFSection();
    }

    function setupUDFSection() {
         // udf checkbox
        $("#udfCheckbox").on("click", function() {
            var $checkbox = $(this).find(".checkbox");
            if ($checkbox.hasClass("checked")) {
                var useUDF = isUseUDFWithFunc();
                // uncheck box
                toggleUDF(false);
                if (useUDF) {
                    // auto refresh when use UDF before and now uncheck
                    refreshPreview(true);
                }
            } else {
                // check the box
                toggleUDF(true);
            }
        });

        // dropdown list for udf modules and function names
        var moduleMenuHelper = new MenuHelper($udfModuleList, {
            "onSelect": function($li) {
                var module = $li.text();
                selectUDFModule(module);
            },
            "container": "#importDataForm-content",
            "bounds": "#importDataForm-content"
        });

        var funcMenuHelper = new MenuHelper($udfFuncList, {
            "onSelect": function($li) {
                var func = $li.text();
                selectUDFFunc(func);
            },
            "container": "#importDataForm-content",
            "bounds": "#importDataForm-content"
        });

        udfModuleHint = new InputDropdownHint($udfModuleList, {
            "menuHelper": moduleMenuHelper,
            "onEnter": selectUDFModule
        });

        udfFuncHint = new InputDropdownHint($udfFuncList, {
            "menuHelper": funcMenuHelper,
            "onEnter": selectUDFFunc
        });
    }

    function listUDFSection(listXdfsObj) {
        var deferred = jQuery.Deferred();

        if (!listXdfsObj) {
            // update python module list
            UDF.list()
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

    function selectUDF(moduleName, funcName) {
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

        udfModuleHint.setInput(module);

        if (module === "") {
            $udfFuncList.addClass("disabled")
                    .find("input").attr("disabled", "disabled");
            udfFuncHint.clearInput();

            $udfFuncList.parent().tooltip({
                "title": TooltipTStr.ChooseUdfModule,
                "placement": "top",
                "container": "#dsFormView"
            });
        } else {
            $udfFuncList.parent().tooltip("destroy");
            $udfFuncList.removeClass("disabled")
                        .find("input").removeAttr("disabled");
            udfFuncHint.clearInput();

            var $funcLis = $udfFuncList.find(".list li").addClass("hidden")
                            .filter(function() {
                                return $(this).data("module") === module;
                            }).removeClass("hidden");
            if ($funcLis.length === 1) {
                selectUDFFunc($funcLis.eq(0).text());
            }
        }
    }

    function selectUDFFunc(func) {
        if (func == null) {
            func = "";
        }
        udfFuncHint.setInput(func);
    }

    function toggleUDF(usUDF) {
        var $checkbox = $("#udfCheckbox").find(".checkbox");
        var $udfArgs = $("#udfArgs");
        var $detect = $("#dsForm-detect");

        if (usUDF) {
            $form.addClass("udf");
            $checkbox.addClass("checked");
            $udfArgs.addClass("active");
            $detect.addClass("xc-hidden");
        } else {
            $form.removeClass("udf");
            $checkbox.removeClass("checked");
            $udfArgs.removeClass("active");
            $detect.removeClass("xc-hidden");
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

    function resetRowsToPreview() {
        rowsToFetch = defaultRowsToFech;
    }

    function getRowsToPreivew() {
        return rowsToFetch;
    }

    function addRowsToPreview(extraRowsToAdd) {
        rowsToFetch += extraRowsToAdd;
    }

    function resetForm() {
        $form.find("input").val("");
        $("#dsForm-skipRows").val("0");
        $form.find(".checkbox.checked").removeClass("checked");

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

        $previeWrap.find(".errorSection").addClass("hidden");
        $previeWrap.find(".loadHidden").removeClass("hidden");
    }

    function resetPreviewRows() {
        resetRowsToPreview();
        $previeWrap.find(".previewBottom")
                   .removeClass("load")
                   .removeClass("end");
    }

    function cleanTempParser(keepUDF) {
        if (keepUDF) {
            // if not keep applied UDF, dataflow will be broken
            tempParserUDF = null;
        }

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
        var udfQuery = null; // XXX currently it's not used

        var fieldDelim = res.fieldDelim;
        var lineDelim = res.lineDelim;

        var quote = res.quote;
        var skipRows = res.skipRows;

        var header = loadArgs.useHeader();
        var targetName = loadArgs.getTargetName();
        var loadURL = loadArgs.getPath();
        var advanceArgs = advanceOption.getArgs();
        if (advanceArgs == null) {
            return PromiseHelper.reject("Checking Invalid");
        }

        var pattern = advanceArgs.pattern;
        var isRecur = advanceArgs.isRecur;
        var isRegex = advanceArgs.isRegex;

        // console.log(dsName, format, udfModule, udfFunc, fieldDelim, lineDelim,
        //     header, loadURL, quote, skipRows, isRecur, isRegex);

        var headers = getColumnHeaders();
        cacheUDF(udfModule, udfFunc);

        var colLen = 0;
        if (toCreateTable) {
            colLen = $previewTable.find("th:not(.rowNumHead)").length;
        }

        xcHelper.disableSubmit($form.find('.confirm'));
        // enableSubmit is done during the next showing of the form
        // If the form isn't shown, there's no way it can be submitted
        // anyway
        invalidHeaderDetection(headers)
        .then(function() {
            return tooManyColAlertHelper(colLen);
        })
        .then(function() {
            // XXX temp fix to preserve CSV header order
            headers = (format !== formatMap.JSON) ? headers : null;
            if (format === "Excel" && header) {
                udfFunc = "openExcelWithHeader";
            }
            var pointArgs = {
                "name": dsName,
                "targetName": targetName,
                "format": format,
                "path": loadURL,
                "pattern": pattern,
                "fieldDelim": fieldDelim,
                "lineDelim": lineDelim,
                "hasHeader": header,
                "moduleName": udfModule,
                "funcName": udfFunc,
                "isRecur": isRecur,
                "quoteChar": quote,
                "skipRows": skipRows,
                "isRegex": isRegex,
                "headers": headers,
                "udfQuery": udfQuery
            };

            var dsToReplace = $previewCard.data("dsid") || null;
            var options = {
                "createTable": toCreateTable,
                "dsToReplace": dsToReplace
            };

            return DS.point(pointArgs, options);
        })
        .then(function() {
            cleanTempParser(true);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function tooManyColAlertHelper(colLen) {
        if (colLen < gMaxColToPull) {
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();
        Alert.show({
            "title": DSFormTStr.CreateWarn,
            "msg": DSFormTStr.CreateWarnMsg,
            "onConfirm": deferred.resolve,
            "onCancel": function() {
                xcHelper.enableSubmit($form.find(".confirm"));
                deferred.reject();
            }
        });

        return deferred.promise();
    }

    function getColumnHeaders() {
        var headers = [];
        $previewTable.find("th:not(.rowNumHead)").each(function() {
            headers.push($(this).find(".text").text());
        });

        return headers;
    }

    function validateForm(skipFormatCheck) {
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
                return (!isUseUDF() && !skipFormatCheck && (format == null));
            }
        }]);

        if (!isValid) {
            return null;
        }

        // validate UDF
        var hasUDF = isUseUDF();
        var udfModule = "";
        var udfFunc = "";
        var udfQuery = null; // not used yet
        var targetName = loadArgs.getTargetName();

        if (!hasUDF && DSTargetManager.isGeneratedTarget(targetName)) {
            udfModule = "default";
            udfFunc = "convertNewLineJsonToArrayJson";
        } else if (format === "raw" &&
            $genLineNumCheckBox.find(".checkbox").hasClass("checked")) {
            udfModule = "default";
            if (loadArgs.useHeader()) {
                udfFunc = "genLineNumberWithHeader";
            } else {
                udfFunc = "genLineNumber";
            }
            format = formatMap.JSON;
            return {
                "dsName": dsName,
                "format": format,
                "udfModule": udfModule,
                "udfFunc": udfFunc,
                "fieldDelim": "\t",
                "lineDelim": "\n",
                "quote": "\"",
                "skipRows": 0
            };
        } else if (hasUDF) {
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
                "$ele": $lineText,
                "error": DSFormTStr.InvalidLineDelim,
                "check": function() {
                    return lineDelim &&
                           lineDelim.length > 1 &&
                           lineDelim !== "\r\n";
                },
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

        // validate advanced args
        var advanceArgs = advanceOption.getArgs();
        if (advanceArgs == null) {
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
        } else if (format === formatMap.EXCEL) {
            udfModule = excelModule;
            udfFunc = excelFunc;
        }

        return {
            "dsName": dsName,
            "format": format,
            "udfModule": udfModule,
            "udfFunc": udfFunc,
            "udfQuery": udfQuery,
            "fieldDelim": fieldDelim,
            "lineDelim": lineDelim,
            "quote": quote,
            "skipRows": skipRows
        };
    }

    function openAdvanceList($section) {
        var $pattern = $section.find(".pattern");
        var $input = $pattern.find("input");
        if (isPreviewSingleFile()) {
            $pattern.children().addClass("unavailable");
            $input.prop("disabled", true);
            xcTooltip.add($input, {
                "title": DSTStr.NoSingleFilePattern
            });
        } else {
            $pattern.children().removeClass("unavailable");
            $input.prop("disabled", false);
            xcTooltip.remove($input);
        }
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
        strToDelimit = strToDelimit.replace(/\t/g, "\\t")
                                   .replace(/\n/g, "\\n")
                                   .replace(/\r/g, "\\r");
        highlighter = "";

        if (strToDelimit === "") {
            $fieldText.val("Null").addClass("nullVal");
        } else {
            $fieldText.val(strToDelimit).removeClass("nullVal");
        }

        setFieldDelim();
    }

    function applyLineDelim(strToDelimit) {
        strToDelimit = strToDelimit.replace(/\t/g, "\\t")
                                   .replace(/\n/g, "\\n")
                                   .replace(/\r/g, "\\r");

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

    function changeDelimiter(isFieldDelimiter) {
        var hasChangeDelimiter = false;
        if (isFieldDelimiter) {
            hasChangeDelimiter = setFieldDelim();
        } else {
            hasChangeDelimiter = setLineDelim();
        }

        if (hasChangeDelimiter) {
            getPreviewTable();
        }
    }

    function selectDelim($li) {
        var $input = $li.closest(".dropDownList").find(".text");
        var isFieldDelimiter = ($input.attr("id") === "fieldText");
        $input.removeClass("nullVal");

        switch ($li.attr("name")) {
            case "tab":
                $input.val("\\t");
                break;
            case "comma":
                $input.val(",");
                break;
            case "LF":
                $input.val("\\n");
                break;
            case "CR":
                $input.val("\\r");
                break;
            case "CRLF":
                $input.val("\\r\\n");
                break;
            case "null":
                $input.val("Null").addClass("nullVal");
                break;
            default:
                console.error("error case");
                break;
        }

        $input.focus();
        changeDelimiter(isFieldDelimiter);
    }

    function setFieldDelim() {
        var fieldDelim = xcHelper.delimiterTranslate($fieldText);

        if (typeof fieldDelim === "object") {
            // error case
            return false;
        }

        loadArgs.setFieldDelim(fieldDelim);
        return true;
    }

    function setLineDelim() {
        var lineDelim = xcHelper.delimiterTranslate($lineText);

        if (typeof lineDelim === "object") {
            // error case
            return false;
        }

        loadArgs.setLineDelim(lineDelim);
        return true;
    }

    function setQuote() {
        var quote = xcHelper.delimiterTranslate($quote);

        if (typeof quote === "object") {
            // error case
            return false;
        }

        if (quote.length > 1) {
            return false;
        }

        loadArgs.setQuote(quote);
        return true;
    }

    function toggleFormat(format) {
        if (format && $formatText.data("format") === format.toUpperCase()) {
            return false;
        }

        var $lineDelim = $("#lineDelim").parent().removeClass("xc-hidden");
        var $fieldDelim = $("#fieldDelim").parent().removeClass("xc-hidden");
        var $genLineNums = $genLineNumCheckBox.parent().addClass("xc-hidden");
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
            return false;
        }

        format = format.toUpperCase();
        var text = $('#fileFormatMenu li[name="' + format + '"]').text();
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

                toggleGenLineNum(false);
                loadArgs.setFieldDelim("");
                if (isPreviewSingleFile()) {
                    $genLineNums.removeClass("xc-hidden");
                }
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
        return true;
    }

    function changeFormat(format) {
        var oldFormat = loadArgs.getFormat();
        var hasChangeFormat = toggleFormat(format);
        if (hasChangeFormat) {
            if (oldFormat != null &&
                (oldFormat.toUpperCase() === "EXCEL" ||
                format.toUpperCase() === "EXCEL")) {
                refreshPreview(true);
            } else {
                getPreviewTable();
            }
        }
    }

    function isPreviewSingleFile() {
        return !isViewFolder;
    }

    function errorHandler(error) {
        if (typeof error === "object") {
            if (error.status === StatusT.StatusNoEnt ||
                error.status === StatusT.StatusIsDir ||
                error.status === StatusT.StatusAllFilesEmpty)
            {
                error = error.error + ", " + DSFormTStr.GoBack + ".";
            } else if (error.status === StatusT.StatusUdfExecuteFailed) {
                error = error.log
                        ? AlertTStr.Error + ": " + error.log
                        : error.error;
            } else {
                error = error.error + (error.log ? error.log : "");
            }
        }

        $previeWrap.find(".waitSection").addClass("hidden");
        $previeWrap.find(".errorSection")
                .html(error).removeClass("hidden");
        $previeWrap.find(".loadHidden").addClass("hidden");
        $previeWrap.find(".errorShow").removeClass("hidden");
    }

    function clearPreviewTable() {
        var deferred = jQuery.Deferred();
        applyHighlight(""); // remove highlighter
        $previewTable.removeClass("has-delimiter").empty();
        rawData = null;
        resetPreviewRows();
        resetPreviewId();

        if (tableName != null) {
            var dsName = tableName;
            tableName = null;
            var sql = {
                "operation": SQLOps.DestroyPreviewDS,
                "dsName": dsName
            };
            var txId = Transaction.start({
                "operation": SQLOps.DestroyPreviewDS,
                "sql": sql,
                "steps": -1
            });

            XcalarDestroyDataset(dsName, txId)
            .then(function() {
                Transaction.done(txId, {
                    "noCommit": true,
                    "noSql": true
                });
                deferred.resolve(true);
            })
            .fail(function(error) {
                Transaction.fail(txId, {
                    "error": error,
                    "noAlert": true
                });
                // fail but still resolve it because
                // it has no effect to other operations
                deferred.resolve(false);
            });
        } else {
            deferred.resolve(false);
        }

        return deferred.promise();
    }

    function updatePreviewId() {
        previewId = new Date().getTime();
        return previewId;
    }

    function resetPreviewId() {
        previewId = null;
    }

    function isValidPreviewId(id) {
        return (id === previewId);
    }

    function previewData(options, noDetect) {
        var deferred = jQuery.Deferred();

        options = options || {};
        var isFirstTime = options.isFirstTime || false;
        var udfModule = options.udfModule || null;
        var udfFunc = options.udfFunc || null;
        var udfQuery = options.udfQuery || null;

        var targetName = loadArgs.getTargetName();
        var loadURL = loadArgs.getPath();
        var dsName = $("#dsForm-dsName").val();
        if (!dsName) {
            dsName = setDefaultDSName(loadURL);
        }

        var advanceArgs = advanceOption.getArgs();
        var recursive = false;
        var isRegex = false;
        var pattern = null;

        if (advanceArgs != null) {
            recursive = advanceArgs.isRecur;
            isRegex = advanceArgs.isRegex;
            pattern = xcHelper.getFileNamePattern(advanceArgs.pattern, isRegex);
        } else {
            console.error("error case");
        }

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

        var $loadHiddenSection = $previeWrap.find(".loadHidden")
                                            .addClass("hidden");
        var $waitSection = $previeWrap.find(".waitSection")
                                    .removeClass("hidden");
        $previeWrap.find(".errorSection").addClass("hidden");
        var sql = {
            "operation": SQLOps.PreviewDS,
            "dsPath": null,
            "dsName": dsName,
            "moduleName": udfModule,
            "funcName": udfFunc,
            "recursive": recursive
        };

        var txId = Transaction.start({
            "operation": SQLOps.PreviewDS,
            "sql": sql,
            "steps": 1
        });

        setPreviewInfo(targetName, loadURL, pattern);

        var curPreviewId = updatePreviewId();
        var def = isFirstTime
                  ? checkIsFolder(targetName, loadURL)
                  : PromiseHelper.resolve();

        var urlToPreview;
        var initialLoadArgStr;

        def
        .then(function() {
            var previewFile = loadArgs.getPreviewFile();
            if (isFirstTime || previewFile == null || options.changePattern) {
                var args = {
                    targetName: targetName,
                    path: loadURL,
                    recursive: recursive,
                    fileNamePattern: pattern
                };
                return getURLToPreview(args, curPreviewId);
            } else {
                return PromiseHelper.resolve(previewFile);
            }
        })
        .then(function(url) {
            urlToPreview = url;

            if (isFirstTime && !hasUDF && isExcel(url)) {
                hasUDF = true;
                udfModule = excelModule;
                udfFunc = excelFunc;
                toggleFormat("EXCEL");
                sql.moduleName = udfModule;
                sql.funcName = udfFunc;
            } else if (DSTargetManager.isGeneratedTarget(targetName)) {
                // special case
                hasUDF = true;
                udfModule = udfModule || "default";
                udfFunc = udfFunc || "convertNewLineJsonToArrayJson";
                sql.moduleName = udfModule;
                sql.funcName = udfFunc;
            }

            if (!noDetect) {
                initialLoadArgStr = loadArgs.getArgStr();
            }

            var args = {
                targetName: targetName,
                path: urlToPreview,
                recursive: recursive,
                fileNamePattern: pattern
            };
            if (hasUDF) {
                args.moduleName = udfModule;
                args.funcName = udfFunc;
                args.udfQuery = udfQuery;
                return loadDataWithUDF(txId, dsName, args);
            } else {
                return loadData(args);
            }
        })
        .then(function(result) {
            if (!isValidPreviewId(curPreviewId)) {
                return PromiseHelper.reject({
                    "error": oldPreviewError
                });
            }

            if (!result) {
                var error = DSTStr.NoRecords + '\n' + DSTStr.NoRecrodsHint;
                return PromiseHelper.reject(error);
            }

            setPreviewFile(urlToPreview);
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
            if (urlToPreview != null) {
                setPreviewFile(urlToPreview);
            }

            Transaction.fail(txId, {
                "error": error,
                "noAlert": true,
                "sql": sql
            });

            if (error.error === oldPreviewError) {
                console.error(error);
            } else {
                errorHandler(error);
            }

            deferred.reject(error);
        });

        return deferred.promise();
    }

    function checkIsFolder(targetName, url) {
        var deferred =jQuery.Deferred();
        // Note: for all error case, we set isViewFolder to be true
        // to allow user change the pattern
        isViewFolder = true;

        if (url.endsWith("/")) {
            url = url.substring(0, url.length - 1);
        }

        var lastIndex = url.lastIndexOf("/");
        if (lastIndex < 0) {
            console.error("error case");
            isViewFolder = true;
            return PromiseHelper.resolve();
        }

        var path = url.substring(0, lastIndex + 1);
        var fileName = url.substring(lastIndex + 1, url.length);
        XcalarListFiles({targetName: targetName, path: path})
        .then(function(res) {
            var numFiles = res.numFiles;
            var files = res.files;
            for (var i = 0; i < numFiles; i++) {
                var file = files[i];
                if (file.name === fileName) {
                    isViewFolder = file.attr.isDirectory;
                    break;
                }
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("list files failed", error);
            // still resolve
            isViewFolder = true;
            deferred.resolve();
        });

        return deferred.promise();
    }

    function isExcel(url) {
        if (loadArgs.getFormat() === formatMap.EXCEL ||
            xcHelper.getFormat(url) === formatMap.EXCEL) {
            return true;
        } else {
            return false;
        }
    }

    function getURLToPreview(args, curPreviewId) {
        if (!isViewFolder) {
            // single file case
            return PromiseHelper.resolve(args.path);
        } else if (DSTargetManager.isGeneratedTarget(args.targetName)) {
            // target of type Generated is a special case
            return PromiseHelper.resolve(args.path);
        }

        var deferred = jQuery.Deferred();
        XcalarPreview(args, 1, 0)
        .then(function(res) {
            if (!isValidPreviewId(curPreviewId)) {
                return PromiseHelper.reject({
                    "error": oldPreviewError
                });
            }

            var path = args.path.endsWith("/") ? args.path : args.path + "/";
            path += res.relPath;
            setPreviewFile(path);
            deferred.resolve(path);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function setDefaultDSName(loadURL) {
        var dsName = getNameFromPath(loadURL);
        $("#dsForm-dsName").val(dsName);
        return dsName;
    }

    function setPreviewInfo(targetName, url, pattern) {
        $("#preview-target").find(".text").text(targetName);
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

    function resetPreviewFile() {
        var $file = $("#preview-file");
        var $ele = $("#preview-changeFile").add($file);
        $file.find(".text").text();
        $ele.addClass("xc-hidden");

    }

    function previewFileSelect(isParseMode) {
        var previewFile = $("#preview-file").find(".text").text();
        var advanceArgs = advanceOption.getArgs();
        var recursive = false;
        var isRegex = false;
        var pattern = null;

        if (advanceArgs != null) {
            recursive = advanceArgs.isRecur;
            isRegex = advanceArgs.isRegex;
            pattern = xcHelper.getFileNamePattern(advanceArgs.pattern, isRegex);
        } else {
            console.error("error case");
        }

        PreviewFileModal.show({
            "targetName": loadArgs.getTargetName(),
            "path": loadArgs.getPath(),
            "previewFile": previewFile,
            "recursive": recursive,
            "fileNamePattern": pattern,
            "isParseMode": isParseMode
        });
    }

    function loadData(args) {
        var deferred = jQuery.Deferred();
        var buffer;
        var totalDataSize;

        XcalarPreview(args, numBytesRequest, 0)
        .then(function(res) {
            if (res && res.buffer) {
                buffer = res.buffer;
                totalDataSize = res.totalDataSize;
                var rowsToShow = getRowsToPreivew();
                return getDataFromPreview(args, buffer, rowsToShow);
            }
        })
        .then(function(extraBuffer) {
            if (extraBuffer) {
                buffer += extraBuffer;
            }
            if (!totalDataSize || totalDataSize <= buffer.length) {
                disableShowMoreRows();
            }
            deferred.resolve(buffer);
        })
        .fail(function(error) {
            if (typeof error === "object" &&
                error.status === StatusT.StatusUdfExecuteFailed)
            {
                XcalarListFiles(args)
                .then(function() {
                    // when it's not list error
                    deferred.reject(error);
                })
                .fail(function() {
                    // when it's not find file error
                    deferred.reject(DSFormTStr.NoFile);
                });
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    function getDataFromPreview(args, buffer, rowsToShow) {
        var bytesNeed = getBytesNeed(buffer, rowsToShow);
        if (bytesNeed <= 0) {
            // when has enough cache to show rows
            return PromiseHelper.resolve(null, true);
        }

        var deferred = jQuery.Deferred();
        var offSet = buffer.length;

        console.info("too small rows, request", bytesNeed);
        XcalarPreview(args, bytesNeed, offSet)
        .then(function(res) {
            var buffer = null;
            if (res && res.buffer) {
                buffer = res.buffer;
            }
            deferred.resolve(buffer);
        })
        .fail(deferred.reject);

        return deferred.promise();

        function getBytesNeed(data, totalRows) {
            var format = loadArgs.getFormat();
            var lineDelim = loadArgs.getLineDelim();
            var rowData;

            if (format !== "JSON") {
                rowData = lineSplitHelper(data, lineDelim);
            } else {
                rowData = parseJSONByRow(data);
            }

            if (rowData == null) {
                return 0;
            }

            var lines = rowData.length;
            if (lines >= totalRows) {
                return 0;
            }

            var maxBytesInLine = 0;
            rowData.forEach(function(d) {
                maxBytesInLine = Math.max(maxBytesInLine, d.length);
            });
            var bytes = maxBytesInLine * (totalRows - lines);
            return Math.min(bytes, maxBytesRequest);
        }
    }

    function getDataFromLoadUDF(datasetName, startRow, rowsToShow) {
        var deferred = jQuery.Deferred();
        var resultSetId;

        var rowPosition = startRow - 1;

        XcalarMakeResultSetFromDataset(datasetName)
        .then(function(result) {
            resultSetId = result.resultSetId;
            var totalEntries = result.numEntries;
            if (totalEntries <= 0 || rowPosition > totalEntries) {
                return PromiseHelper.resolve(null);
            } else {
                if (totalEntries <= rowsToShow) {
                    disableShowMoreRows();
                }
                return XcalarFetchData(resultSetId, rowPosition, rowsToShow,
                                        totalEntries, []);
            }
        })
        .then(function(res) {
            // no need for resultSetId as we only need 40 samples
            XcalarSetFree(resultSetId);
            return parseResult(res);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();

        function parseResult(result) {
            var innerDeferred = jQuery.Deferred();

            if (!result) {
                innerDeferred.resolve(null);
                return innerDeferred.promise();
            }
            var passed;
            var buffer;
            try {
                var rows = parseRows(result);
                buffer = JSON.stringify(rows);
                passed = true;
            } catch (err) {
                console.error(err.stack);
            }

            if (passed) {
                innerDeferred.resolve(buffer);
            } else {
                innerDeferred.reject({"error": DSTStr.NoParse});
            }

            return innerDeferred.promise();
        }

        function parseRows(data) {
            var rows = [];

            for (var i = 0, len = data.length; i < len; i++) {
                var value = data[i];
                var row = $.parseJSON(value);
                delete row.xcalarRecordNum;
                rows.push(row);
            }

            return rows;
        }
    }


    // load with UDF always return JSON format
    function loadDataWithUDF(txId, dsName, options) {
        var deferred = jQuery.Deferred();
        var tempDSName = getPreviewTableName(dsName);
        tableName = tempDSName;

        XcalarLoad(tempDSName, options, txId)
        .then(function() {
            return getDataFromLoadUDF(tempDSName, 1, rowsToFetch);
        })
        .then(deferred.resolve)
        .fail(function(error, loadError) {
            var displayError = loadError || error;
            deferred.reject(displayError);
        });

        return deferred.promise();
    }

    function disableShowMoreRows() {
        $previewTable.closest(".datasetTbodyWrap")
                     .find(".previewBottom")
                     .addClass("end");
    }

    function showMoreRows() {
        var deferred = jQuery.Deferred();
        var rowsToAdd = minRowsToShow;
        var $section = $previewTable.closest(".datasetTbodyWrap");
        var scrollPos = $section.scrollTop();
        var $previewBottom = $section.find(".previewBottom").addClass("load");

        fetchMoreRowsHelper(rowsToAdd)
        .then(function(newBuffer, hasEnoughDataInCache) {
            if (newBuffer) {
                rawData += newBuffer;
            }

            if (!newBuffer && !hasEnoughDataInCache) {
                // has no data to fetch case
                disableShowMoreRows();
            } else {
                // update preview
                addRowsToPreview(rowsToAdd);
                getPreviewTable();
                $previewTable.closest(".datasetTbodyWrap").scrollTop(scrollPos);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(function() {
            $previewBottom.removeClass("load");
        });

        return deferred.promise();
    }

    function fetchMoreRowsHelper(rowsToAdd) {
        var isFromLoadUDF = (tableName != null);
        if (isFromLoadUDF) {
            return fetchMoreRowsFromLoadUDF(rowsToAdd);
        } else {
            return fetchMoreRowsFromPreview(rowsToAdd);
        }
    }

    function fetchMoreRowsFromLoadUDF(rowsToAdd) {
        var datasetName = tableName;
        var startRow = getRowsToPreivew() + 1;
        return getDataFromLoadUDF(datasetName, startRow, rowsToAdd);
    }

    function fetchMoreRowsFromPreview(rowsToAdd) {
        var targetName = loadArgs.getTargetName();
        var loadURL = loadArgs.getPreviewFile();
        var buffer = rawData;

        var advanceArgs = advanceOption.getArgs();
        var isRecur = false;
        var isRegex = false;
        var pattern = null;

        if (advanceArgs != null) {
            isRecur = advanceArgs.isRecur;
            isRegex = advanceArgs.isRegex;
            pattern = xcHelper.getFileNamePattern(advanceArgs.pattern, isRegex);
        } else {
            console.error("error case");
        }

        var rowsToShow = getRowsToPreivew() + rowsToAdd;
        var args = {
            targetName: targetName,
            path: loadURL,
            fileNamePattern: pattern,
            recursive: isRecur
        };
        return getDataFromPreview(args, buffer, rowsToShow);
    }

    function autoPreview() {
        $("#dsForm-skipRows").val(0);
        var oldFormat = loadArgs.getFormat();
        smartDetect(true);
        var newFormat = loadArgs.getFormat();
        if (oldFormat !== formatMap.EXCEL && newFormat === formatMap.EXCEL) {
            refreshPreview();
        }
    }

    function refreshPreview(noDetect, skipFormatCheck, changePattern) {
        var formOptions = validateForm(skipFormatCheck);
        if (formOptions == null) {
            return;
        }
        formOptions.changePattern = changePattern;
        clearPreviewTable(); // async remove the old ds
        return previewData(formOptions, noDetect);
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
        if (data == null) {
            return;
        }

        data = data.map(function(d) {
            return d.split("");
        });

        var fieldDelim = loadArgs.getFieldDelim();
        if (format === formatMap.CSV && fieldDelim === "") {
            $highlightBtns.removeClass("hidden")
                          .find("button").addClass("xc-disabled");
        }

        var $tbody = $(getTbodyHTML(data, fieldDelim));
        var $trs = $tbody.find("tr");
        var maxTdLen = 0;
        var fnf = xcHelper.parseJsonValue(null, true);
        // find the length of td and fill up empty space
        $trs.each(function() {
            maxTdLen = Math.max(maxTdLen, $(this).find("td").length);
        });

        $trs.each(function() {
            var $tr  = $(this);
            var $tds = $tr.find("td");
            var trs = "";

            for (var j = 0, l = maxTdLen - $tds.length; j < l; j++) {
                trs += "<td>" + fnf + "</td>";
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

        if (window.isBrowserSafari) {
            $previewTable.removeClass("dataTable");
            setTimeout(function() {$previewTable.addClass("dataTable");}, 0);
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
                                 xcHelper.getTextWidth($th, headerText) + 8);
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

    function toggleGenLineNum(genLineNum) {
        if (genLineNum) {
            $genLineNumCheckBox.find(".checkbox").addClass("checked");
            $("#udfArgs").addClass("xc-hidden");
            $("#lineDelim").parent().addClass("xc-hidden");
            $quote.closest(".row").addClass("xc-hidden");
            $("#dsForm-skipRows").closest(".row").addClass("xc-hidden");
            $form.find(".advanceSection").addClass("xc-hidden");

        } else {
            $genLineNumCheckBox.find(".checkbox").removeClass("checked");
            $("#udfArgs").removeClass("xc-hidden");
            $("#lineDelim").parent().removeClass("xc-hidden");
            $quote.closest(".row").removeClass("xc-hidden");
            $("#dsForm-skipRows").closest(".row").removeClass("xc-hidden");
            $form.find(".advanceSection").removeClass("xc-hidden");
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

    function parseJSONByRow(data) {
        var startIndex = data.indexOf("{");
        var endIndex = data.lastIndexOf("}");
        if (startIndex === -1 || endIndex === -1) {
            return null;
        }

        var record = [];
        var bracketCnt = 0;
        var hasBackSlash = false;
        var hasQuote = false;

        for (var i = startIndex; i <= endIndex; i++) {
            var c = data.charAt(i);
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
                        record.push(data.substring(startIndex, i + 1));
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
            record.push(data.substring(startIndex, endIndex + 1));
        }
        return record;
    }

    function parseJSONData(data) {
        var record = parseJSONByRow(data);
        if (record == null) {
            errorHandler(DSFormTStr.NoParseJSON);
            return null;
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
            var cellWidth = xcHelper.getTextWidth(null, headers[i], {
                "defaultHeaderStyle": true
            }) - 36;
            var width = Math.max(gNewCellWidth + 5, cellWidth);
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
                var fnf = false;
                if (val === undefined) {
                    fnf = true;
                }
                val = xcHelper.parseJsonValue(val, fnf);
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

        if (rowsToSkip >= res.length) {
            errorHandler(DSTStr.SkipRowsError);
            return null;
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
        var tdData = [];

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
                    tdData = stripQuote(tdData, quote);
                    html += tdData.join("");
                    tdData = [];
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
                        tdData.push(xcHelper.escapeHTMLSpecialChar(d));
                    }

                    strLen++;
                    ++i;
                }
            }

            tdData = stripQuote(tdData, quote);
            html += tdData.join("");
            tdData = [];
        } else {
            // when not apply delimiter
            data = stripQuote(data, quote);
            dataLen = Math.min(rawStrLimit, data.length); // limit to 1000 characters
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

                html += '<span class="' + cellClass + '">' +
                            xcHelper.escapeHTMLSpecialChar(d) +
                        '</span>';
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

    // Note: that's how backend to the import, only handle the ting in the quote
    function stripQuote(content, quote) {
        if (!quote) {
            return content;
        }

        var endQuote = content.length - 1;
        while (endQuote >= 0 && content[endQuote] !== quote) {
            endQuote--;
        }

        if (endQuote >= 0) {
            var startQuote = endQuote - 1;
            while (startQuote >= 0 && content[startQuote] !== quote) {
                startQuote--;
            }

            if (startQuote >= 0) {
                content = content.slice(startQuote + 1, endQuote);
            }
        }

        return content;
    }

    function smartDetect(showMessage) {
        if (rawData == null) {
            if (showMessage) {
                xcHelper.showFail(DSTStr.NoRecords);
            }
            return;
        }

        // applyLineDelim("\n");
        applyQuote("\"");

        // step 0: check if should check UDF or not
        if (!isUseUDFWithFunc()) {
            toggleUDF(false);
        }

        // step 1: detect format
        var lineDelim = loadArgs.getLineDelim();
        detectArgs.format = detectFormat(rawData, lineDelim);

        var formatText;
        for (var key in formatMap) {
            if (formatMap[key] === detectArgs.format) {
                formatText = key;
                break;
            }
        }
        toggleFormat(formatText);

        // ste 2: detect line delimiter
        if (detectArgs.format === formatMap.CSV) {
            detectArgs.lineDelim = xcSuggest.detectLineDelimiter(rawData);
            applyLineDelim(detectArgs.lineDelim);
        } else {
            applyLineDelim("\n");
        }

        // step 3: detect field delimiter
        if (detectArgs.format === formatMap.CSV) {
            detectArgs.fieldDelim = xcSuggest.detectFieldDelimiter(rawData);

            if (detectArgs.fieldDelim !== "") {
                applyFieldDelim(detectArgs.fieldDelim);
            }

            // step 4: detect header
            lineDelim = loadArgs.getLineDelim(); // get the update linDelim
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

        // step 5: update preview after detection
        getPreviewTable();

        if (showMessage) {
            xcHelper.showSuccess(SuccessTStr.Detect);
        }
    }

    function detectFormat(data, lineDelim) {
        var path = loadArgs.getPreviewFile() || loadArgs.getPath();
        var format = xcHelper.getFormat(path);
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

    function invalidHeaderDetection(headers) {
        if (headers == null) {
            return PromiseHelper.resolve();
        }

        var invalidHeaders = headers.filter(xcHelper.hasInvalidCharInCol)
                                    .map(invalidHeadersConversion);

        if (invalidHeaders.length === 0) {
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();
        var msg = xcHelper.replaceMsg(DSTStr.DetectInvalidColMsg, {
            "cols": '<span id="invalidColAlert">' +
                        invalidHeaders.join(",") +
                    '</span>'
        });

        Alert.show({
            "title": DSTStr.DetectInvalidCol,
            "instr": DSTStr.DetectInvalidColInstr,
            "msgTemplate": msg,
            "onConfirm": deferred.resolve,
            "onCancel": function() {
                xcHelper.enableSubmit($form.find(".confirm"));
                deferred.reject();
            }
        });

        return deferred.promise();
    }

    function invalidHeadersConversion(header) {
        return '<span>' +
                    Array.from(header).map(function(ch) {
                        return xcHelper.hasInvalidCharInCol(ch)
                               ? '<b class="highlight">' + ch + '</b>'
                               : ch;
                    }).join("") +
                '</span>';
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
        DSPreview.__testOnly__.getDataFromLoadUDF = getDataFromLoadUDF;
        DSPreview.__testOnly__.getURLToPreview = getURLToPreview;
        DSPreview.__testOnly__.loadDataWithUDF = loadDataWithUDF;
        DSPreview.__testOnly__.invalidHeaderDetection = invalidHeaderDetection;
        DSPreview.__testOnly__.tooManyColAlertHelper = tooManyColAlertHelper;

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
                "detectArgs": detectArgs,
                "isViewFolder": isViewFolder,
                "id": previewId
            };
        };

        DSPreview.__testOnly__.set = function(newData, newHighlight, isFolder) {
            highlighter = newHighlight || "";
            rawData = newData || null;
            if (isFolder != null) {
                isViewFolder = isFolder;
            }
        };

        DSPreview.__testOnly__.setBackToFormCard = function(flag) {
            backToFormCard = flag;
        };
    }
    /* End Of Unit Test Only */

    return (DSPreview);
}(jQuery, {}));

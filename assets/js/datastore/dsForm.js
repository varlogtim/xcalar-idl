/*
 * Module for the dataset form part
 */
window.DSForm = (function($, DSForm) {
    var $pathCard; // $("#dsForm-path");

    var $filePath;        // $("#filePath")
    var $filePathPattern; // $("#filePath-pattern")

    var $form;          // $("#importDataForm")
    var $formatText;    // $("#fileFormat .text")

    var $udfModuleList; // $("#udfArgs-moduleList")
    var $udfFuncList;   // $("#udfArgs-funcList")

    var $headerCheckBox; // $("#promoteHeaderCheckbox") promote header checkbox
    var $udfCheckbox;    // $("#udfCheckbox") udf checkbox
    var $recurCheckbox;  // $("#recurCheckbox");

    // UI cache
    var lastFieldDelim = "\\t";
    var lastLineDelim = "\\n";

    var lastUDFModule = null;
    var lastUDFFunc = null;

    // constant
    var formatMap = {
        "JSON"  : "JSON",
        "CSV"   : "CSV",
        "RANDOM": "rand",
        "TEXT"  : "raw",
        "EXCEL" : "Excel"
    };

    DSForm.setup = function() {
        $pathCard = $("#dsForm-path");
        $filePath = $("#filePath");
        $filePathPattern = $("#filePath-pattern");

        $form = $("#importDataForm");
        $formatText = $("#fileFormat .text");

        $udfModuleList = $("#udfArgs-moduleList");
        $udfFuncList = $("#udfArgs-funcList");

        $headerCheckBox = $("#promoteHeaderCheckbox");
        $udfCheckbox = $("#udfCheckbox");
        $recurCheckbox = $("#recurCheckbox");

        setupPathCard();
        setupFormUDF();
        setupFormDelimiter();

        // click to go to form section
        $("#importDataButton").click(function() {
            $(this).blur();
            DSForm.show();
        });

        //recur checkbox
        $recurCheckbox.click(function() {
            var $checkbox = $recurCheckbox.find(".checkbox");
            var toRecursive = false;
            if ($checkbox.hasClass("checked")) {
                $checkbox.removeClass("checked");
            } else {
                $checkbox.addClass("checked");
                toRecursive = true;
            }
            toggleRecursivePoint(toRecursive);
        });

        // regex checkbox
        $("#regExCheckbox").click(function() {
            var $checkbox = $("#regExCheckbox").find(".checkbox");
            if ($checkbox.hasClass("checked")) {
                // uncheck
                $checkbox.removeClass("checked");
                console.log("unchecked");
            } else {
                // check
                $checkbox.addClass("checked");
                console.log("checked");
            }
        });

        // csv promote checkbox
        $headerCheckBox.on("click", function() {
            $headerCheckBox.find(".checkbox").toggleClass("checked");
        });

        //set up dropdown list preview size
        new MenuHelper($("#previewSizeUnit"), {
            "onSelect": function($li) {
                $("#previewSizeUnit input").val($li.text());
            },
            "container": "#dsFormView",
            "bounds"   : "#dsFormView"
        }).setupListeners();

        // set up dropdown list for formats
        new MenuHelper($("#fileFormat"), {
            "onSelect": function($li) {
                var format = $li.attr("name");
                var text = $li.text();
                if ($formatText.data("format") === format) {
                    return;
                }

                toggleFormat(format, text);
            },
            "container": "#dsFormView",
            "bounds"   : "#dsFormView"
        }).setupListeners();

        // preview dataset
        $("#previewBtn").click(function() {
            $(this).blur();

            var protocol = getProtocol();
            var path = getFilePath();
            if (!isValidPathToRecusrivePoint() ||
                !isValidPathToBrowse(protocol, path) ||
                !isValidPreviewSize())
            {
                return;
            }

            if (isValidToPreview()) {
                var udfCheckRes = checkUDF();
                if (udfCheckRes.isValid) {
                    var udfModule = null;
                    var udfFunc = null;

                    if (udfCheckRes.hasUDF) {
                        udfModule = udfCheckRes.moduleName;
                        udfFunc = udfCheckRes.funcName;
                        cacheUDF(udfModule, udfFunc);
                    }

                    var format = $formatText.data("format");
                    // Deliberately do not cache this UDF
                    if (format === DSTStr.Excel) {
                        udfModule = "default";
                        udfFunc = "openExcel";
                    }

                    var dsName = $("#fileName").val();
                    var loadURL = protocol + path;
                    var isRecur = isRecursivePoint();

                    DSPreview.show(loadURL, dsName, udfModule, udfFunc, isRecur);
                }
            }
        });

        // reset form
        $("#importDataReset").click(function(event) {
            $(this).blur();
            // Prevent form's default reset
            event.preventDefault();
            // Note that some other functions also use resetForm() to do reset
            // instead of call $("#impoartDataRest").click();
            resetForm();
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
    };

    DSForm.initialize = function() {
        resetForm();
        DSForm.update();
    };

    DSForm.show = function(options) {
        options = options || {};
        var $dsFormView = $("#dsFormView");
        if (!$dsFormView.is(":visible"))
        {
            if (!options.noReset) {
                resetForm();
            }

            $dsFormView.removeClass("xc-hidden");
            $("#dsTableView").addClass("xc-hidden");
            $("#dsTableWrap").empty();
            $("#dataCartBtn").addClass("xc-hidden");

            $("#dsListSection").find(".gridItems .grid-unit.active")
                                .removeClass("active");
            // when switch from data sample table to data form
            // preview table may still open, so close it
            $("#preview-close").click();

            $pathCard.removeClass("xc-hidden");
            $filePath.focus();
        }
    };

    DSForm.hide = function() {
        $("#dsFormView").addClass("xc-hidden");
        $("#dsTableView").removeClass("xc-hidden");
        $("#dataCartBtn").removeClass("xc-hidden");
    };

    DSForm.load = function(dsName, dsFormat, loadURL,
                            fieldDelim, lineDelim, header,
                            moduleName, funcName)
    {
        var deferred = jQuery.Deferred();
        // validation check of loadURL
        var isRecur = isRecursivePoint();

        var msgId = StatusMessage.addMsg({
            "msg"      : StatusMessageTStr.LoadingDataset + ": " + dsName,
            "operation": SQLOps.DSLoad
        });

        var previewSize = $("#previewSize").val();
        var unit = $("#previewSizeUnit input").val();
        previewSize = xcHelper.getPreviewSize(previewSize, unit);

        DS.load(dsName, dsFormat, loadURL, fieldDelim, lineDelim,
                header, moduleName, funcName, isRecur, previewSize)
        .then(function(dsObj) {
            StatusMessage.success(msgId, false, null, {
                "newDataSet": true,
                "dataSetId" : dsObj.getId()
            });
            deferred.resolve();
        })
        .fail(function(error) {
            // show status box if input val is unchanged and visible
            // and error is because of incorrect file name
            if (error.status === StatusT.StatusNoEnt &&
                loadURL.indexOf($filePath.val()) > -1 &&
                $filePath.is(':visible')) {
                StatusBox.show(error.error, $filePath, true);
            } else {
                Alert.error(StatusMessageTStr.LoadFailed, error.error);
            }

            StatusMessage.fail(StatusMessageTStr.LoadFailed, msgId);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    DSForm.update = function() {
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

    DSForm.clear = function() {
        DSForm.show();
        resetForm();
    };

    DSForm.validate = function($fileName) {
        $fileName = $fileName || $("#fileName");
        var fileName = $fileName.val().trim();
        // these are the ones that need to check
        // from both data form and data preview
        var isValid = xcHelper.validate([
            {
                "$selector": $fileName
            },
            {
                "$selector": $fileName,
                "check"    : function() {
                    return (fileName.length >=
                            XcalarApisConstantsT.XcalarApiMaxTableNameLen);
                },
                "formMode": true,
                "text"    : ErrTStr.TooLong
            },
            {
                "$selector": $fileName,
                "check"    : DS.has,
                "formMode" : true,
                "text"     : ErrTStr.DSNameConfilct
            },
            {
                "$selector": $fileName,
                "check"    : function() {
                    return (!/^\w+$/.test(fileName));
                },
                "formMode": true,
                "text"    : ErrTStr.NoSpecialCharOrSpace
            }
        ]);

        return isValid;
    };

    function submitForm() {
        var dsFormat = formatMap[$formatText.data("format")];
        var isValid = DSForm.validate() && isValidPathToRecusrivePoint();

        if (isValid) {
            isValid = xcHelper.validate([{
                "$selector": $formatText,
                "text"     : ErrTStr.NoEmptyList,
                "check"    : function() {
                    return (dsFormat == null);
                }
            }]);
        }

        if (!isValid) {
            return PromiseHelper.reject("Checking Invalid");
        }

        var $fileName = $("#fileName");
        var dsName = $fileName.val().trim();
        var protocol = getProtocol();
        var path = getFilePath();
        var loadURL = protocol + path;

        if (!isValidPathToBrowse(protocol, path) ||
            !isValidPreviewSize())
        {
            return PromiseHelper.reject("Checking Invalid");
        }

        var udfCheckRes = checkUDF();
        if (!udfCheckRes.isValid) {
            return PromiseHelper.reject("Checking Invalid");
        }

        var moduleName = udfCheckRes.moduleName;
        var funcName = udfCheckRes.funcName;

        var $fieldText = $("#fieldText");
        var $lineText = $("#lineText");
        var fieldDelim = xcHelper.delimiterTranslate($fieldText);
        var lineDelim = xcHelper.delimiterTranslate($lineText);
        if (typeof fieldDelim === "object" || typeof lineDelim === "object") {
            if (typeof fieldDelim === "object") {
                StatusBox.show(DSFormTStr.InvalidDelim, $fieldText, true);
            } else {
                StatusBox.show(DSFormTStr.InvalidDelim, $lineText, true);
            }
            return PromiseHelper.reject("Checking Invalid");
        }

        var deferred = jQuery.Deferred();
        var header = $headerCheckBox.find(".checkbox").hasClass("checked");

        promoptHeaderAlert(dsFormat, header)
        .then(function() {
            return DSForm.load(dsName, dsFormat, loadURL,
                               fieldDelim, lineDelim, header,
                               moduleName, funcName);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        if (udfCheckRes.hasUDF) {
            cacheUDF(moduleName, funcName);
        }
        cacheDelimiter(dsFormat);

        return deferred.promise();
    }

    function resetForm() {
        var protocol = getProtocol() || FileProtocol.nfs;
        $form.find("input").val("");
        $form.find(".default-hidden").addClass("hidden");
        // keep header to be checked
        $udfCheckbox.find(".checkbox").removeClass("checked");
        $recurCheckbox.find(".checkbox").removeClass("checked");
        $("#regExCheckbox").find(".checkbox").removeClass("checked");
        // keep the current protocol
        setProtocol(protocol);
        resetUdfSection();
        toggleFormat();
    }

    function cacheUDF(moduleName, funcName) {
        // cache udf module and func name
        lastUDFModule = moduleName;
        lastUDFFunc = funcName;
    }

    function cacheDelimiter(format) {
        // cache delimiter
        if (format === "CSV") {
            lastFieldDelim = $("#fieldText").val();
            lastLineDelim = $("#lineText").val();
        } else if (format === "raw") {
            lastLineDelim = $("#lineText").val();
        }
    }

    function checkUDF() {
        var hasUDF = $udfCheckbox.find(".checkbox").hasClass("checked");
        var isValid = true;
        var moduleName = "";
        var funcName = "";

        if (hasUDF) {
            var $moduleInput = $udfModuleList.find("input");
            var $funcInput = $udfFuncList.find("input");

            moduleName = $moduleInput.val();
            funcName = $funcInput.val();

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
        }

        return {
            "isValid"   : isValid,
            "hasUDF"    : hasUDF,
            "moduleName": moduleName,
            "funcName"  : funcName
        };
    }

    function toggleFormat(format, text) {
        var $csvDelim = $("#csvDelim").show();
        var $fieldDelim = $("#fieldDelim").parent().show();
        var $udfArgs = $("#udfArgs").show();
        var $headerRow = $headerCheckBox.parent().show();

        if (format == null) {
            // reset case
            $csvDelim.hide();
            $headerRow.hide();
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
                resetDelimiter();
                break;
            case "TEXT":
                resetDelimiter();
                // no field delimiter when format is text
                $fieldDelim.hide();
                break;
            case "EXCEL":
                $csvDelim.hide();
                resetDelimiter(true);
                // excel not use udf section
                $udfArgs.hide();
                break;

            // json and random
            case "JSON":
            case "RANDOM":
                // json and random
                // Note: random is setup in shortcuts.js,
                // so prod build will not have it
                $headerRow.hide();
                $csvDelim.hide();
                break;
            default:
                throw new ReferenceError("Format Not Support");
        }
    }

    function isValidPathToRecusrivePoint() {
        if (!isRecursivePoint()) {
            return true;
        }

        var path = $filePath.val().trim();
        if (!path.endsWith("/")) {
            StatusBox.show(DSFormTStr.InvalidRecursivePath, $filePath, true);
            return false;
        }

        return true;
    }

    function isValidPathToBrowse(protocol, path) {
        path = path.trim();

        if (protocol === FileProtocol.hdfs) {
            var match = path.match(/^.*?\//);

            if (match != null && match[0] !== "/") {
                return true;
            } else {
                StatusBox.show(DSTStr.InvalidHDFS, $filePath, true);
                return false;
            }
        }

        return true;
    }

    function isValidPreviewSize() {
        // check preview size here(temporary for both preview and load)
        if ($("#previewSize").val() !== "" &&
            $("#previewSizeUnit input").val() === "") {
            StatusBox.show(ErrTStr.NoEmptyList, $("#previewSizeUnit"), false);
            return false;
        }

        return true;
    }

    function isValidToPreview() {
        // We use the format to check instead of useing suffix of the file
        // this is in case user wrongly name the file and could not preview
        var format = $formatText.data("format");
        // allow empty format
        if (!format) {
            return true;
        }

        if (!formatMap.hasOwnProperty(format)) {
            StatusBox.show(ErrTStr.NoEmptyList, $filePath, false);
            return false;
        }

        format = formatMap[format];
        var options = {"type": "info"};

        if (getFilePath() === "") {
            StatusBox.show(ErrTStr.NoEmpty, $filePath, false, options);
            return false;
        }

        return true;
    }

    function promoptHeaderAlert(dsFormat, hasHeader) {
        var deferred = jQuery.Deferred();
        if (!hasHeader &&
            (dsFormat === formatMap.CSV ||
            dsFormat === formatMap.TEXT ||
            dsFormat === formatMap.EXCEL)) {

            var msg = DSFormTStr.NoHeader;

            Alert.show({
                "title"    : DSFormTStr.LoadConfirm,
                "msg"      : msg,
                "onConfirm": function() { deferred.resolve(); },
                "onCancel" : function() { deferred.reject("canceled"); }
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise();
    }

    function hideDropdownMenu() {
        $("#dsFormView .dropDownList").removeClass("open")
                            .find(".list").hide();
        $("#csvDelim").find(".delimVal").val("");
    }

    function toggleRecursivePoint(toRecursive) {
        var pattern;
        var path = $filePath.val().trim();

        if (toRecursive) {
            // use recursive point to data
            $filePathPattern.parent().removeClass("hidden");
            var lastSlash = path.lastIndexOf("/");
            pattern = path.substring(lastSlash + 1);
            path = path.substring(0, lastSlash + 1);
        } else {
            $filePathPattern.parent().addClass("hidden");
            pattern = $filePathPattern.val();
            if (pattern.indexOf("*") < 0) {
                if (!path.endsWith("/") && path !== "") {
                    path += "/";
                }
                path += pattern;
            }
            pattern = "";
        }

        $filePath.val(path);
        $filePathPattern.val(pattern);
    }

    function getProtocol() {
        return $("#fileProtocol input").val();
    }

    function setProtocol(protocol) {
        $("#fileProtocol input").val(protocol);
    }

    function getFilePath() {
        var path = $filePath.val().trim();
        if (isRecursivePoint()) {
            path += $filePathPattern.val().trim();
        }

        return path;
    }

    function isRecursivePoint() {
        return $recurCheckbox.find(".checkbox").hasClass("checked");
    }

    function resetDelimiter() {
        // to show \t, \ should be escaped
        $("#fieldText").val(lastFieldDelim).removeClass("nullVal");
        $("#lineText").val(lastLineDelim).removeClass("nullVal");
    }

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

    function setupPathCard() {
        //set up dropdown list for protocol
        new MenuHelper($("#fileProtocol"), {
            "onSelect": function($li) {
                setProtocol($li.text());
            },
            "container": "#dsFormView",
            "bounds"   : "#dsFormView"
        }).setupListeners();


        // open file browser
        $pathCard.on("click", ".browse", function() {
            $(this).blur();

            var protocol = getProtocol();
            var path = getFilePath();
            if (isValidPathToBrowse(protocol, path)) {
                FileBrowser.show(protocol, path);
            }
        });

        $pathCard.on("click", ".confirm", function() {
            console.log("confirm");
        });

        $pathCard.on("click", ".cancel", resetPathCard);
    }

    function resetPathCard() {
        $filePath.val("").focus();
    }

    function setupFormUDF() {
        // udf checkbox
        $udfCheckbox.on("click", function() {
            var $checkbox = $udfCheckbox.find(".checkbox");
            var $udfArgs = $("#udfArgs");

            if ($checkbox.hasClass("checked")) {
                // uncheck box
                $checkbox.removeClass("checked");
                $udfArgs.find(".default-hidden").addClass("hidden");
            } else {
                // check the box
                // listUDFSection();
                $checkbox.addClass("checked");
                $udfArgs.find(".default-hidden").removeClass("hidden");
            }
        });

        // dropdown list for udf modules and function names
        var moduleList = new MenuHelper($udfModuleList, {
            "onSelect": function($li) {
                var module = $li.text();
                selectUDFModule(module);
            },
            "container": "#dsFormView",
            "bounds"   : "#dsFormView"
        });
        moduleList.setupListeners();

        var functionList = new MenuHelper($udfFuncList, {
            "onSelect": function($li) {
                var func = $li.text();
                selectUDFFunc(func);
            },
            "container": "#dsFormView",
            "bounds"   : "#dsFormView"
        });
        functionList.setupListeners();
    }

    function setupFormDelimiter() {
        // set up dropdown list for csv de
        var $csvDelim = $("#csvDelim");
        // setUp both line delimiter and field delimiter
        var csvList = new MenuHelper($csvDelim.find(".dropDownList"), {
            "onSelect": function($li) {
                var $input = $li.closest(".dropDownList").find(".text");
                switch ($li.attr("name")) {
                    case "default":
                        if ($input.attr("id") === "fieldText") {
                            $input.val("\\t");
                        } else {
                            $input.val("\\n");
                        }
                        $input.removeClass("nullVal");
                        return false;
                    case "comma":
                        $input.val(",");
                        $input.removeClass("nullVal");
                        return false;
                    case "null":
                        $input.val("Null");
                        $input.addClass("nullVal");
                        return false;
                    default:
                        // keep list open
                        return true;
                }
            },
            "container": "#dsFormView",
            "bounds"   : "#dsFormView"
        });
        csvList.setupListeners();

        // Input event on csv args input box
        $csvDelim.on({
            "keypress": function(event) {
                // prevent form to be submitted
                if (event.which === keyCode.Enter) {
                    return false;
                }
            },
            "keyup": function(event) {
                // input other delimiters
                if (event.which === keyCode.Enter) {
                    var $input = $(this);

                    event.stopPropagation();
                    applyOtherDelim($input);
                }
            }
        }, ".delimVal");

        $csvDelim.find(".inputAction").on("mousedown", function() {
            var $input = $(this).siblings(".delimVal");
            applyOtherDelim($input);
        });
    }

    function applyOtherDelim($input) {
        if ($input == null || $input.length === 0) {
            // invalid case
            return;
        }

        var val = $input.val();
        if (val !== "") {
            $input.closest(".dropDownList")
                    .find(".text").val(val).removeClass("nullVal");
            $input.val("").blur();
            hideDropdownMenu();
        }
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSForm.__testOnly__ = {};
        DSForm.__testOnly__.resetForm = resetForm;
        DSForm.__testOnly__.submitForm = submitForm;
        DSForm.__testOnly__.toggleFormat = toggleFormat;
        DSForm.__testOnly__.checkUDF = checkUDF;
        DSForm.__testOnly__.isValidPathToBrowse = isValidPathToBrowse;
        DSForm.__testOnly__.isValidToPreview = isValidToPreview;
        DSForm.__testOnly__.promoptHeaderAlert = promoptHeaderAlert;
        DSForm.__testOnly__.resetDelimiter = resetDelimiter;
        DSForm.__testOnly__.resetUdfSection = resetUdfSection;
        DSForm.__testOnly__.selectUDFModule = selectUDFModule;
        DSForm.__testOnly__.selectUDFFunc = selectUDFFunc;
    }
    /* End Of Unit Test Only */

    return (DSForm);
}(jQuery, {}));

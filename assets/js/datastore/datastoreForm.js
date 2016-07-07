/*
 * Module for the datastore form part
 */
window.DatastoreForm = (function($, DatastoreForm) {
    var $filePath;     // $("#filePath")

    var $form;        // $("#importDataForm")
    var $formatText;  // $("#fileFormat .text")

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

    DatastoreForm.setup = function() {
        $filePath = $("#filePath");

        $form = $("#importDataForm");
        $formatText = $("#fileFormat .text");

        $udfModuleList = $("#udfArgs-moduleList");
        $udfFuncList = $("#udfArgs-funcList");

        $headerCheckBox = $("#promoteHeaderCheckbox");
        $udfCheckbox = $("#udfCheckbox");
        $recurCheckbox = $("#recurCheckbox");

        setupFormUDF();
        setupFormDelimiter();

        // click to go to form section
        $("#importDataButton").click(function() {
            $(this).blur();
            DatastoreForm.show();
            var protocol = getProtocol();
            FileBrowser.show(protocol);
        });

        $filePath.on('input', function() {
            var fileName = $filePath.val().trim();
            var ext = xcHelper.getFormat(fileName);
            if (ext != null && $formatText.data('format') !== ext) {
                toggleFormat(ext);
            }
        });

        // promote recur checkbox
        $recurCheckbox.click(function() {
            $recurCheckbox.find(".checkbox").toggleClass("checked");
        });

        // csv promote checkbox
        $headerCheckBox.on("click", function() {
            $headerCheckBox.find(".checkbox").toggleClass("checked");
        });

        //set up dropdown list for protocol
        new MenuHelper($("#fileProtocol"), {
            "onSelect": function($li) {
                setProtocol($li.text());
            },
            "container": "#importDataView",
            "bounds"   : "#importDataView"
        }).setupListeners();

        //set up dropdown list preview size
        new MenuHelper($("#previewSizeUnit"), {
            "onSelect": function($li) {
                $("#previewSizeUnit input").val($li.text());
            },
            "container": "#importDataView",
            "bounds"   : "#importDataView"
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
            "container": "#importDataView",
            "bounds"   : "#importDataView"
        }).setupListeners();

        // open file browser
        $("#fileBrowserBtn").click(function() {
            $(this).blur();

            var protocol = getProtocol();
            var path = getFilePath();
            if (isValidPathToBrowse(protocol, path)) {
                FileBrowser.show(protocol, path);
            }
        });

        // preview dataset
        $("#previewBtn").click(function() {
            $(this).blur();

            var protocol = getProtocol();
            var path = getFilePath();
            if (!isValidPathToBrowse(protocol, path)) {
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

                    DataPreview.show(udfModule, udfFunc);
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
            if ($form.hasClass("previewMode")) {
                return;
            }

            var $submitBtn = $(this).blur();
            xcHelper.disableSubmit($submitBtn);

            submitForm()
            .always(function() {
                xcHelper.enableSubmit($submitBtn);
            });
        });
    };

    DatastoreForm.show = function(options) {
        options = options || {};
        var $importDataView = $("#importDataView");
        if (!$importDataView.is(":visible") || $form.hasClass("previewMode"))
        {
            if (!options.noReset) {
                resetForm();
            }

            $importDataView.show();
            $("#dataSetTableWrap").empty();
            $("#exploreView").find(".contentViewMid").addClass("hidden")
                            .end()
                            .find(".gridItems .grid-unit.active")
                            .removeClass("active");
            // when switch from data sample table to data form
            // preview table may still open, so close it
            $("#preview-close").click();
            $("#filePath").focus();
        }
    };

    DatastoreForm.hide = function() {
        $("#importDataView").hide();
        $("#exploreView").find(".contentViewMid").removeClass('hidden');
    };

    DatastoreForm.load = function(dsName, dsFormat, loadURL,
                                    fieldDelim, lineDelim, header,
                                    moduleName, funcName)
    {
        var deferred = jQuery.Deferred();

        // validation check of loadURL
        var isRecur = $recurCheckbox.find(".checkbox").hasClass("checked");


        var msgId = StatusMessage.addMsg({
            "msg"      : StatusMessageTStr.LoadingDataset + ": " + dsName,
            "operation": SQLOps.DSLoad
        });

        var previewSize = $("#previewSize").val();
        if (previewSize === "") {
            previewSize = null;
        } else {
            previewSize = Number(previewSize);
            var unit = $("#previewSizeUnit input").val();
            switch (unit) {
                case "KB":
                    previewSize *= KB;
                    break;
                case "MB":
                    previewSize *= MB;
                    break;
                case "GB":
                    previewSize *= GB;
                    break;
                default:
                    break;
            }
        }

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

        return (deferred.promise());
    };

    DatastoreForm.initialize = function() {
        resetForm();
        DatastoreForm.update();
    };

    DatastoreForm.update = function() {
        // reset udf first as list xdf may slow
        resetUdfSection();

        listUDFSection()
        .always(function() {
            resetUdfSection();
        });
    };

    DatastoreForm.clear = function() {
        DatastoreForm.show();
        resetForm();
    };

    DatastoreForm.validate = function($fileName) {
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
        var deferred = jQuery.Deferred();

        var dsFormat = formatMap[$formatText.data("format")];
        var isValid = DatastoreForm.validate();

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
            return deferred.reject("Checking Invalid").promise();
        }

        var $fileName = $("#fileName");
        var dsName = $fileName.val().trim();
        var protocol = getProtocol();
        var path = getFilePath();
        var loadURL = protocol + path;

        if (!isValidPathToBrowse(protocol, path)) {
            return deferred.reject("Checking Invalid").promise();
        }

        var udfCheckRes = checkUDF();

        if (!udfCheckRes.isValid) {
            return deferred.reject("Checking Invalid").promise();
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
            return deferred.reject("invalid delimiter").promise();
        }

        var header = $headerCheckBox.find(".checkbox").hasClass("checked");

        promoptHeaderAlert(dsFormat, header)
        .then(function() {
            return DatastoreForm.load(dsName, dsFormat, loadURL,
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
        var protocol = getProtocol() || FileProtocol.file;
        $form.find("input").val("");
        $form.find(".default-hidden").addClass("hidden");
        // keep header to be checked
        $udfCheckbox.find(".checkbox").removeClass("checked");
        $recurCheckbox.find(".checkbox").removeClass("checked");
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
        // also check preview size here(temporary for both preview and load)
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
        } else if (format === "JSON") {
            // Invalid json preview
            StatusBox.show(ErrTStr.NoPreviewJSON, $filePath, false, options);
            return false;
        } else if (format === "Excel") {
            StatusBox.show(ErrTStr.NoPreviewExcel, $filePath, false, options);
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
        $("#importDataView .dropDownList").removeClass("open")
                            .find(".list").hide();
        $("#csvDelim").find(".delimVal").val("");
    }

    function delimiterTranslate($input) {
        if ($input.hasClass("nullVal")) {
            return "";
        }

        var delimiter = $input.val();
        for (var i = 0; i < delimiter.length; i++) {
            if (delimiter[i] === "\"" &&
                !xcHelper.isCharEscaped(delimiter, i)) {
                delimiter = delimiter.slice(0, i) + "\\" + delimiter.slice(i);
                i++;
            }
        }

        // hack to turn user's escaped string into its actual value
        var obj = '{"val":"' + delimiter + '"}';
        try {
            delimiter = JSON.parse(obj).val;
        } catch (err) {
            delimiter = {fail: true, error: err};
            console.error(err);
        }

        return delimiter;
    }

    function getProtocol() {
        return $("#fileProtocol input").val();
    }

    function setProtocol(protocol) {
        $("#fileProtocol input").val(protocol);
    }

    function getFilePath() {
        return $filePath.val().trim();
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
        $udfModuleList.find("input").val("");
        $udfFuncList.addClass("disabled")
                    .find("input").val("");
        $udfFuncList.parent().tooltip({
            "title"    : TooltipTStr.ChooseUdfModule,
            "placement": "top",
            "container": "#importDataView"
        });

        // only when cached moduleName and funcName is not null
        // we restore it
        if (lastUDFModule != null && lastUDFFunc != null) {
            var $li = $udfFuncList.find(".list li").filter(function() {
                var $el = $(this);
                return ($el.data("module") === lastUDFModule &&
                        $el.text() === lastUDFFunc);
            });

            // verify that the func in the module is still there
            // (might be deleted)
            if ($li.length > 0) {
                selectUDFModule(lastUDFModule);
                selectUDFFunc(lastUDFFunc);
                return;
            }
        }

        // when cannot restore it
        lastUDFModule = null;
        lastUDFFunc = null;
    }

    function selectUDFModule(module) {
        var $input = $udfModuleList.find("input");
        if (module === $input.val()) {
            return;
        }

        $input.val(module);

        $udfFuncList.parent().tooltip("destroy");
        $udfFuncList.removeClass("disabled")
            .find("input").val("")
            .end()
            .find(".list li").addClass("hidden")
            .filter(function() {
                return $(this).data("module") === module;
            }).removeClass("hidden");
    }

    function selectUDFFunc(func) {
        var $input = $udfFuncList.find("input");

        if (func === $input.val()) {
            return;
        }
        $input.val(func);
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
            "container": "#importDataView",
            "bounds"   : "#importDataView"
        });
        moduleList.setupListeners();

        var functionList = new MenuHelper($udfFuncList, {
            "onSelect": function($li) {
                var func = $li.text();
                selectUDFFunc(func);
            },
            "container": "#importDataView",
            "bounds"   : "#importDataView"
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
            "container": "#importDataView",
            "bounds"   : "#importDataView"
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
        DatastoreForm.__testOnly__ = {};
        DatastoreForm.__testOnly__.resetForm = resetForm;
        DatastoreForm.__testOnly__.submitForm = submitForm;
        DatastoreForm.__testOnly__.toggleFormat = toggleFormat;
        DatastoreForm.__testOnly__.checkUDF = checkUDF;
        DatastoreForm.__testOnly__.isValidPathToBrowse = isValidPathToBrowse;
        DatastoreForm.__testOnly__.isValidToPreview = isValidToPreview;
        DatastoreForm.__testOnly__.promoptHeaderAlert = promoptHeaderAlert;
        DatastoreForm.__testOnly__.delimiterTranslate = delimiterTranslate;
        DatastoreForm.__testOnly__.resetDelimiter = resetDelimiter;
        DatastoreForm.__testOnly__.resetUdfSection = resetUdfSection;
        DatastoreForm.__testOnly__.selectUDFModule = selectUDFModule;
        DatastoreForm.__testOnly__.selectUDFFunc = selectUDFFunc;
    }
    /* End Of Unit Test Only */

    return (DatastoreForm);
}(jQuery, {}));

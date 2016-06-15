/*
 * Module for the datastore form part
 */
window.DatastoreForm = (function($, DatastoreForm) {
    var $filePath; // $("#filePath")

    var $form;        // $("#importDataForm")
    var $formatText;  // $("#fileFormat .text")

    var $udfModuleList; // $("#udfArgs-moduleList")
    var $udfFuncList;   // $("#udfArgs-funcList")

    var $headerCheckBox; // $("#promoteHeaderCheckbox") promote header checkbox
    var $udfCheckbox;    // $("#udfCheckbox") udf checkbox

    // UI cache
    var lastFieldDelim = "\\t";
    var lastLineDelim = "\\n";

    var lastUDFModule = null;
    var lastUDFFunc = null;

    // constant
    var formatMap = {
        "JSON"  : "JSON",
        "CSV"   : "CSV",
        "Random": "rand",
        "Text"  : "raw",
        "Excel" : "Excel"
    };

    DatastoreForm.setup = function() {
        $filePath = $("#filePath");

        $form = $("#importDataForm");
        $formatText = $("#fileFormat .text");

        $udfModuleList = $("#udfArgs-moduleList");
        $udfFuncList = $("#udfArgs-funcList");

        $headerCheckBox = $("#promoteHeaderCheckbox");
        $udfCheckbox = $("#udfCheckbox");

        setupFormUDF();
        setupFormDelimiter();

        // click to go to form section
        $("#importDataButton").click(function() {
            $(this).blur();
            DatastoreForm.show();
            FileBrowser.show();
        });

        // csv promote checkbox
        $headerCheckBox.on("click", ".checkbox, .text", function() {
            $headerCheckBox.find(".checkbox").toggleClass("checked");
        });

        // set up dropdown list for formats
        var dropdownList = new MenuHelper($("#fileFormat"), {
            "onSelect": function($li) {
                var text = $li.text();
                if ($li.hasClass("hint") || $formatText.val() === text) {
                    return;
                }

                toggleFormat(text);
            },
            "container": "#importDataView",
            "bounds"   : "#importDataView"
        });
        dropdownList.setupListeners();

        // open file browser
        $("#fileBrowserBtn").click(function() {
            $(this).blur();

            var path = $filePath.val();
            if (isValidPathToBrowse(path)) {
                FileBrowser.show(path);
            } else {
                StatusBox.show(ErrTStr.InvalidURLToBrowse, $filePath, true);
            }
        });

        // preview dataset
        $("#previewBtn").click(function() {
            $(this).blur();

            var path = $filePath.val();
            if (!isValidPathToBrowse(path)) {
                StatusBox.show(ErrTStr.InvalidURLToBrowse, $filePath, true);
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
        XcalarListFiles(loadURL)
        .then(function() {
            var msgId = StatusMessage.addMsg({
                "msg"      : StatusMessageTStr.LoadingDataset + ": " + dsName,
                "operation": SQLOps.DSLoad
            });

            DS.load(dsName, dsFormat, loadURL, fieldDelim, lineDelim,
                    header, moduleName, funcName)
            .then(function(dsObj) {
                StatusMessage.success(msgId, false, null, {
                    "newDataSet": true,
                    "dataSetId" : dsObj.getId()
                });
                deferred.resolve();
            })
            .fail(function(error) {
                Alert.error(StatusMessageTStr.LoadFailed, error.error);
                StatusMessage.fail(StatusMessageTStr.LoadFailed, msgId);
                deferred.reject(error);
            });
        })
        .fail(function(error) {
            StatusBox.show(error.error, $filePath, true);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    DatastoreForm.update = function() {
        // reset udf first as list xdf may slow
        resetUdfSection();

        // update python module list
        XcalarListXdfs("*", "User*")
        .then(updateUDFList)
        .fail(function(error) {
            console.error("List UDF Fails!", error);
        })
        .always(function() {
            resetUdfSection();
        });
    };

    DatastoreForm.clear = function() {
        DatastoreForm.show();
        resetForm();
    };

    DatastoreForm.validate = function() {
        var $fileName = $("#fileName");
        var loadURL = $filePath.val().trim();
        var fileName = $fileName.val().trim();
        // these are the ones that need to check
        // from both data form and data preview
        var isValid = xcHelper.validate([{
                "$selector": $filePath,
                "check"    : function() {
                    return (!isValidPathToBrowse(loadURL));
                },
                "formMode": true,
                "text"    : ErrTStr.InvalidURLToBrowse
            },
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

        var dsFormat = formatMap[$formatText.val()];
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
            deferred.reject("Checking Invalid");
            return deferred.promise();
        }

        var $fileName = $("#fileName");
        var dsName = $fileName.val().trim();
        var loadURL = $filePath.val().trim();
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
        $form.find("input").val("");
        $form.removeClass("previewMode")
             .find(".default-hidden").addClass("hidden");

        // keep header to be checked
        $udfCheckbox.find(".checkbox").removeClass("checked");
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

    function toggleFormat(format) {
        $formatText.val(format);

        var $csvDelim = $("#csvDelim");
        var $fieldDelim = $("#fieldDelim");
        var $udfHint = $("#udfArgs .hintSection");

        switch (format.toLowerCase()) {
            case "csv":
                $headerCheckBox.removeClass("hidden");
                resetDelimiter();
                $fieldDelim.show();
                $csvDelim.removeClass("hidden");
                $udfCheckbox.removeClass("hidden");
                $udfHint.show();
                break;
            case "text":
                $headerCheckBox.removeClass("hidden");
                resetDelimiter();
                $fieldDelim.hide();
                $csvDelim.removeClass("hidden");
                $udfCheckbox.removeClass("hidden");
                $udfHint.show();
                break;
            case "excel":
                $headerCheckBox.removeClass("hidden");
                resetDelimiter();
                $csvDelim.addClass("hidden");
                $udfCheckbox.addClass("hidden")
                            .find(".checkbox").removeClass("checked");
                $("#udfArgs").addClass("hidden");
                // excel not show the whole udf section
                break;

            // json and random
            case "json":
            case "random":
                // json and random
                // Note: random is setup in shortcuts.js,
                // so prod build will not have it
                $headerCheckBox.addClass("hidden");
                $csvDelim.addClass("hidden");
                $udfCheckbox.removeClass("hidden");
                $udfHint.hide();
                break;
            default:
                throw new ReferenceError("Format Not Support");
        }
    }

    function isValidPathToBrowse(path) {
        path = path.trim();
        if (path === "") {
            return true;
        } else if (path.startsWith("file:///") ||
                    path.startsWith("nfs:///"))
        {
            return true;
        } else if (path.startsWith("hdfs://")) {
            // Special case because HDFS's default is actually hdfs://xxxxx/
            // keep sync with the RegEx in changeFileSource() in fileBrowserModal.js
            var match = path.match(/^hdfs:\/\/.*?\//);
            if (match != null && match[0] !== "hdfs:///") {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    function isValidToPreview() {
        // We use the format to check instead of useing suffix of the file
        // this is in case user wrongly name the file and could not preview
        var path = $filePath.val();
        var format = formatMap[$formatText.val()];
        var options = {"type": "info"};

        if (path.trim() === "") {
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
            dsFormat === formatMap.Text ||
            dsFormat === formatMap.Excel)) {

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

    function resetDelimiter() {
        // to show \t, \ should be escaped
        $("#fieldText").val(lastFieldDelim).removeClass("nullVal");
        $("#lineText").val(lastLineDelim).removeClass("nullVal");
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
        $udfCheckbox.on("click", ".checkbox, .text", function() {
            var $checkbox = $udfCheckbox.find(".checkbox");
            var $udfArgs = $("#udfArgs");

            if ($udfArgs.hasClass("hidden")) {
                $checkbox.addClass("checked");
                $udfArgs.removeClass("hidden");
                DatastoreForm.update();
            } else {
                $checkbox.removeClass("checked");
                $udfArgs.addClass("hidden");
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
                    applyOhterDelim($input);
                }
            }
        }, ".delimVal");

        $csvDelim.find(".inputAction").on("mousedown", function() {
            var $input = $(this).siblings(".delimVal");
            applyOhterDelim($input);
        });
    }

    function applyOhterDelim($input) {
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

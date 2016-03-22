/*
 * Module for the datastore form part
 */
window.DatastoreForm = (function($, DatastoreForm) {
    var $importDataView = $("#importDataView");
    var $explorePanel = $("#exploreView");

    var $filePath = $("#filePath");
    var $fileName = $("#fileName");

    var $form = $("#importDataForm");
    var $formatLists = $("#fileFormat");
    var $formatText  = $formatLists.find(".text");
    var $fileNameSelector = $("#fileNameSelector");

    var $csvDelim = $("#csvDelim"); // csv delimiter args
    var $fieldText = $("#fieldText");
    var $lineText = $("#lineText");

    var $udfArgs  = $("#udfArgs");
    var $udfModuleList = $("#udfArgs-moduleList");
    var $udfFuncList = $("#udfArgs-funcList");

    var $headerCheckBox = $("#promoteHeaderCheckbox"); // promote header checkbox
    var $udfCheckbox = $("#udfCheckbox"); // udf checkbox

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
        "Raw"   : "raw",
        "Excel" : "Excel"
    };

    DatastoreForm.setup = function() {
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
        xcHelper.dropdownList($formatLists, {
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

            if (isValidToPreview()) {
                DataPreview.show();
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

        // XXX This should be removed in production
        $filePath.keyup(function() {
            var val = $(this).val();
            if (val.length === 2) {
                var file = null;
                switch (val) {
                    case ("za"):
                        file = "yelpUsers";
                        break;
                    case ("zb"):
                        file = "yelpReviews";
                        break;
                    case ("zc"):
                        file = "gdelt";
                        break;
                    case ("zd"):
                        file = "sp500";
                        break;
                    case ("ze"):
                        file = "classes";
                        break;
                    case ("zf"):
                        file = "schedule";
                        break;
                    case ("zg"):
                        file = "students";
                        break;
                    case ("zh"):
                        file = "teachers";
                        break;
                    case ("zi"):
                        file = "jsonGen";
                        break;
                    default:
                        break;
                }
                if (file) {
                    secretForm(file);
                }
            }
        });
    };

    DatastoreForm.show = function(options) {
        options = options || {};

        if (!$importDataView.is(":visible") || $form.hasClass("previewMode"))
        {
            if (!options.noReset) {
                resetForm();
            }

            $importDataView.show();
            $("#dataSetTableWrap").empty();
            $explorePanel.find(".contentViewMid").addClass("hidden");
            $("#filePath").focus();
            $explorePanel.find(".gridItems .grid-unit.active")
                        .removeClass("active");
            // when switch from data sample table to data form
            // preview table may still open, so close it
            $("#preview-close").click();
        }
    };

    DatastoreForm.hide = function() {
        $importDataView.hide();
        $explorePanel.find(".contentViewMid").removeClass('hidden');
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

    function submitForm() {
        var deferred = jQuery.Deferred();
        var dsName   = $fileName.val().trim();
        var dsFormat = formatMap[$formatText.val()];
        var loadURL  = $filePath.val().trim();

        var moduleName = "";
        var funcName   = "";

        var isValid = xcHelper.validate([
            {
                "$selector": $formatText,
                "text"     : ErrTStr.NoEmptyList,
                "check"    : function() {
                    return (dsFormat == null);
                }
            },
            {
                "$selector": $fileName,
                "check"    : DS.has,
                "formMode" : true,
                "text"     : ErrTStr.DSNameConfilct
            }
        ]);

        if (!isValid) {
            deferred.reject("Checking Invalid");
            return deferred.promise();
        }

        var hasUDF = $udfCheckbox.find(".checkbox").hasClass("checked");
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

            if (!isValid) {
                deferred.reject("Checking Invalid");
                return deferred.promise();
            }
        }

        var fieldDelim = delimiterTranslate($fieldText);
        var lineDelim  = delimiterTranslate($lineText);
        var header = $headerCheckBox.find(".checkbox").hasClass("checked");

        promoptHeaderAlert(dsFormat, header)
        .then(function() {
            return DatastoreForm.load(dsName, dsFormat, loadURL,
                            fieldDelim, lineDelim, header,
                            moduleName, funcName);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        // cache udf module and func name
        if (hasUDF) {
            lastUDFModule = moduleName;
            lastUDFFunc = funcName;
        }

        // cache delimiter
        if (dsFormat === "CSV") {
            lastFieldDelim = $fieldText.val();
            lastLineDelim = $lineText.val();
        } else if (dsFormat === "raw") {
            lastLineDelim = $lineText.val();
        }

        return deferred.promise();
    }

    function resetForm() {
        $form.find("input").val("");
        $form.removeClass("previewMode")
             .find(".default-hidden").addClass("hidden");

        // keep header to be checked
        $udfCheckbox.find(".checkbox").removeClass("checked");
    }

    function toggleFormat(format) {
        $formatText.val(format);

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
            case "raw":
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
                $udfArgs.addClass("hidden");
                // excel not show the whole udf section
                break;

            // json and random
            case "json":
            case "random":
                // json and random
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
                    path.startsWith("nfs:///") ||
                    path.startsWith("hdfs:///"))
        {
            return true;
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
            dsFormat === formatMap.Raw ||
            dsFormat === formatMap.Excel)) {

            var msg = DSFormTStr.NoHeader + " " + AlertTStr.ContinueConfirm;

            Alert.show({
                "title"  : DSFormTStr.LoadConfirm,
                "msg"    : msg,
                "confirm": function() { deferred.resolve(); },
                "cancel" : function() { deferred.reject("canceled"); }
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise();
    }

    function hideDropdownMenu() {
        $("#importDataView .dropDownList").removeClass("open")
                            .find(".list").hide();
        $csvDelim.find(".delimVal").val("");
    }

    function delimiterTranslate($input) {
        if ($input.hasClass("nullVal")) {
            return "";
        }

        var delimiter = $input.val();
        switch (delimiter) {
            case "\\t":
                return "\t";
            case "\\n":
                return "\n";
            default:
                return (delimiter);
        }
    }

    function resetDelimiter() {
        // to show \t, \ should be escaped
        $fieldText.val(lastFieldDelim).removeClass("nullVal");
        $lineText.val(lastLineDelim).removeClass("nullVal");
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
        xcHelper.dropdownList($udfModuleList, {
            "onSelect": function($li) {
                var module = $li.text();
                selectUDFModule(module);
            },
            "container": "#importDataView",
            "bounds"   : "#importDataView"
        });

        xcHelper.dropdownList($udfFuncList, {
            "onSelect": function($li) {
                var func = $li.text();
                selectUDFFunc(func);
            },
            "container": "#importDataView",
            "bounds"   : "#importDataView"
        });
    }

    function setupFormDelimiter() {
         // set up dropdown list for csv de

        // setUp both line delimiter and field delimiter
        xcHelper.dropdownList($csvDelim.find(".dropDownList"), {
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
                    var val    = $input.val();

                    event.stopPropagation();

                    if (val !== "") {
                        $input.closest(".dropDownList")
                                .find(".text").val(val).removeClass("nullVal");
                        $input.val("").blur();
                        hideDropdownMenu();
                    }
                }
            }
        }, ".delimVal");
    }

    function secretForm(file) {
        var filePath = "";
        var $formatDropdown = $("#fileFormatMenu");
        switch (file) {
            case ("yelpUsers"):
                filePath = "yelp/user";
                break;
            case ("yelpReviews"):
                filePath = "yelp/reviews";
                break;
            case ("gdelt"):
                filePath = "gdelt";
                break;
            case ("sp500"):
                filePath = "sp500";
                break;
            case ("classes"):
                filePath = "qa/indexJoin/classes";
                break;
            case ("schedule"):
                filePath = "qa/indexJoin/schedule";
                break;
            case ("students"):
                filePath = "qa/indexJoin/students";
                break;
            case ("teachers"):
                filePath = "qa/indexJoin/teachers";
                break;
            case ("jsonGen"):
                filePath = "jsonGen";
                break;
            default:
                break;
        }

        $filePath.val('file:///var/tmp/' + filePath);

        $fileName.val(file);

        if (file === "sp500" || file === "gdelt") {
            $formatDropdown.find('li[name="CSV"]').click();
        } else {
            $formatDropdown.find('li[name="JSON"]').click();
        }

        $fileName.focus();
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DatastoreForm.__testOnly__ = {};
        DatastoreForm.__testOnly__.resetForm = resetForm;
        DatastoreForm.__testOnly__.submitForm = submitForm;
        DatastoreForm.__testOnly__.toggleFormat = toggleFormat;
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

// this is a sub module of rightSideBar
window.UDF = (function($, UDF) {
    var $fnName      = $("#udf-fnName");
    var $template    = $("#udf-fnTemplate");
    var $downloadBtn = $("#udf-fnDownload");
    var $browserBtn  = $("#udf-fileBrowser");
    var $filePath    = $("#udf-filePath");

    var editor;
    var storedPython = {};

    UDF.setup = function() {
        setupUDF();
    };

    UDF.initialize = function() {
        setupUDFList();
        uploadDefaultUDF();
    };

    UDF.clear = function() {
        // clear CodeMirror
        editor.setValue("");
        editor.clearHistory();
        storedPython = {};
        $('#udf-fnMenu').empty().append('<li name="blank">Blank Function</li>');
    };

    UDF.restoreUDFs = function(udfs) {
        storedPython = udfs;
    };

    UDF.getEditor = function() {
        return (editor);
    };

    UDF.getUDFs = function() {
        return (storedPython);
    };

    function setupUDFList() {
        var $listDropdown = $("#udf-fnMenu");
        var li;
        var $blankFunc = $listDropdown.find('li[name=blank]');
        for (var udf in storedPython) {
            li = '<li>' + udf + '</li>';
            $blankFunc.after(li);
        }
    }

    function storePython(moduleName, entireString) {
        var $listDropdown = $("#udf-fnMenu");

        if (storedPython.hasOwnProperty(moduleName)) {
            // the case of overwrite a module
            $listDropdown.children().filter(function() {
                return $(this).text() === moduleName;
            }).remove();
        }

        var $blankFunc = $listDropdown.children('li[name=blank]');
        var li = '<li>' + moduleName + '</li>';
        $blankFunc.after(li);
        storedPython[moduleName] = entireString;
    }

    // function updateUDF(moduleName) {
    //     XcalarListXdfs("*", "User*")
    //     .then(function(listXdfsObj) {
    //         var i;
    //         var len = listXdfsObj.numXdfs;
    //         var udfs = listXdfsObj.fnDescs;
    //         var moduleMap = {};
    //         var modules = [];

    //         for (i = 0; i < len; i++) {
    //             modules.push(udfs[i].fnName);
    //         }

    //         modules.sort();

    //         var moduleLi = "";
    //         var fnLi = "";
    //         for (i = 0; i < len; i++) {
    //             var udf = modules[i].split(":");
    //             var moduleName = udf[0];
    //             var fnName = udf[1];

    //             if (!moduleMap.hasOwnProperty(moduleName)) {
    //                 moduleMap[moduleName] = true;
    //                 moduleLi += "<li>" + moduleName + "</li>";
    //             }

    //             fnLi += '<li data-module="' + moduleName + '">' +
    //                         fnName +
    //                     '</li>';
    //         }

    //         $udfModuleList.find(".list").html(moduleLi);
    //         $udfFuncList.find(".list").html(fnLi);
    //     })
    //     .fail(function(error) {
    //         console.error("List UDF Fails!", error);
    //     });
    // }

    function uploadDefaultUDF() {
        multiJoinUDFUpload();
        defaultUDFUpload();
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
            "lineNumbers"  : true,
            "indentUnit"   : 4,
            "matchBrackets": true
        });

        /* switch between UDF sections */
        var $sections = $("#udfSection .mainSection");
        var $radios   = $("#udf-tabs .select-item .radio");

        $("#udf-tabs").on("click", ".select-item", function() {
            var $option = $(this);
            var tabId = $option.data("tab");

            $radios.removeClass("checked");
            $option.find(".radio").addClass("checked");

            $sections.addClass("hidden");
            $("#" + tabId).removeClass("hidden");

            if (tabId === "udf-fnSection") {
                editor.refresh();
            }
        });
        /* end of switch between UDF sections */

        /* upload file section */
        // browser file
        $("#udf-browseBtn").click(function() {
            $browserBtn.click();
            return false;
        });
        // display the chosen file's path
        $browserBtn.change(function() {
            $filePath.val($(this).val().replace(/C:\\fakepath\\/i, ''));
        });
        // clear file path
        $("#udf-clearPath").click(function() {
            $browserBtn.val("");
            $filePath.val("");
            $filePath.focus();
        });
        // upload file
        $("#udf-fileUpload").click(function() {
            var val  = $filePath.val().trim();
            var file = $browserBtn[0].files[0];
            var path;
            if (typeof file !== "object") {
                path = "";
            } else {
                path = file.name;
            }
            
            var moduleName = path.substring(0, path.indexOf("."));
            var $submitBtn = $(this);
            var text;

            if (val === "") {
                text = "File Path is empty," +
                           " please choose a file you want to upload.";

                StatusBox.show(text, $filePath, true, 190);
            } else if (path === "") {
                text = "File Path is invalid," +
                           " please choose a file you want to upload.";

                StatusBox.show(text, $filePath, true, 190);
            } else {
                var reader = new FileReader();
                reader.onload = function(event) {
                    xcHelper.disableSubmit($submitBtn);
                    // XXX: Change cursor, handle failure
                    var entireString = event.target.result;

                    uploadPython(moduleName, entireString)
                    .always(function() {
                        xcHelper.enableSubmit($submitBtn);
                    });
                };

                reader.readAsText(file);
            }
        });
        /* end of upload file section */

        /* function input section */
        var $listSection   = $("#udf-fnList");
        var $listDropdown  = $("#udf-fnMenu");

        $("#udfSection .rightBarContent").click(function(event) {
            event.stopPropagation();

            $listSection.removeClass('open');
            $listDropdown.hide();
        });
        // open drowdown menu
        $listSection.on("click", function(event) {
            event.stopPropagation();

            $listSection.toggleClass("open");
            $listDropdown.toggle();
        });
        // select one option
        $listSection.on("click", ".list li", function(event) {
            var $li = $(this);
            var val = $li.text();
            event.stopPropagation();

            $listSection.removeClass('open');
            $listDropdown.hide();

            $template.val(val);

            if ($li.attr("name") === "blank") {
                $downloadBtn.addClass("hidden");
                editor.setValue("");
            } else {
                $downloadBtn.removeClass("hidden");
                editor.setValue(storedPython[val]);
            }
        });
        /* end of function input section */

        /* upload written function section */
        $fnName.keypress(function(event) {
            if (event.which === keyCode.Enter) {
                $('#udf-fnUpload').click();
            }
        });

        $("#udf-fnUpload").click(function() {
            var fileName = $fnName.val();
            var text;
            if (fileName === "") {
                text = "Module name is empty, please input a module name.";
                StatusBox.show(text, $fnName, true, 50);
                return;
            }

            // Get code written and call thrift call to upload
            var entireString = editor.getValue();
            if (entireString.trim() === "") {
                text = "Function field is empty, please input a function.";
                StatusBox.show(text, $('.CodeMirror'), false, 30,
                                { "side": "left" });
                return;
            }

            var moduleName;
            if (fileName.indexOf(".") >= 0) {
                moduleName = fileName.substring(0, fileName.indexOf("."));
            } else {
                moduleName = fileName;
            }

            uploadPython(moduleName, entireString, true);
        });
        /* end of upload written function section */
    }

    function uploadPython(moduleName, entireString, isFnInputSection) {
        var deferred = jQuery.Deferred();

        if (storedPython.hasOwnProperty(moduleName)) {
            var msg = "Python module " + moduleName + " already exists," +
                        " do you want to replcae it with this module?";
            Alert.show({
                    "title"     : "Duplicate Module",
                    "msg"       : msg,
                    "isCheckBox": false,
                    "confirm"   : function() { uploadHelper(); },
                    "cancel"    : function() { deferred.resolve(); }
            });
        } else {
            uploadHelper();
        }

        function uploadHelper() {
            // XXX: Change cursor, handle failure
            XcalarUploadPython(moduleName, entireString)
            .then(function() {
                storePython(moduleName, entireString);
                commitToStorage();
                uploadSuccess();

                // clearance
                if (isFnInputSection) {
                    $fnName.val("");
                    $template.val("");
                    $downloadBtn.addClass("hidden");
                } else {
                    $browserBtn.val("");
                    $filePath.val("");
                }
                DatastoreForm.update();
                deferred.resolve();
            })
            .fail(function(error) {
                var title = "Upload Error";
                if (error.status === StatusT.StatusPyExecFailedToCompile) {
                    // XX might not actually be a syntax error
                    title = "Syntax Error";
                }

                Alert.error(title, error);
                deferred.reject(error);
            });
        }

        function uploadSuccess() {
            Alert.show({
                "title"     : "UPLOAD SUCCESS",
                "msg"       : "Your python script has been successfully uploaded!",
                "isCheckBox": false,
                "confirm"   : function() {
                    $("#udfBtn").parent().click();
                }
            });
        }

        return (deferred.promise());
    }

    function multiJoinUDFUpload() {
        var moduleName = "multiJoinModule";
        var entireString =
            'def multiJoin(*arg):\n' +
                '\tstri = ""\n' +
                '\tfor a in arg:\n' +
                    '\t\tstri = stri + str(a) + ".Xc."\n' +
                '\treturn stri\n';
        XcalarUploadPython(moduleName, entireString)
        .then(function() {
            storePython(moduleName, entireString);
        })
        .fail(function(error) {
            console.error(error);
        });
    }

    function defaultUDFUpload() {
        var moduleName = "default";
        var entireString =
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
        'def convertFormats(colName, inputFormat, outputFormat):\n' +
            '\ttimeStruct = time.strptime(colName, inputFormat)\n' +
            '\toutString = time.strftime(outputFormat, timeStruct)\n' +
            '\treturn outString\n' +
        '\n' +
        'def convertFromUnixTS(colName, outputFormat):\n' +
            '\treturn datetime.datetime.fromtimestamp(float(colName)).strftime(outputFormat)\n' +
        '\n' +
        'def convertToUnixTS(colName, inputFormat):\n' +
            '\treturn str(time.mktime(datetime.datetime.strptime(colName, inputFormat).timetuple()))\n' +
        '\n' +
        'def openExcel(stream):\n' +
            '\tfileString = ""\n' +
            '\txl_workbook = xlrd.open_workbook(file_contents=stream)\n' +
            '\txl_sheet = xl_workbook.sheet_by_index(0)\n' +
            '\tnum_cols = xl_sheet.ncols   # Number of columns\n' +
            '\tfor row_idx in range(0, xl_sheet.nrows):    # Iterate through rows\n' +
                '\t\tcurRow = list()\n' +
                '\t\tfor col_idx in range(0, num_cols):  # Iterate through columns\n' +
                    '\t\t\tcell_obj = xl_sheet.cell(row_idx, col_idx)  # Get cell object by row, col\n' +
                    '\t\t\tval = "%s" % (cell_obj.value)\n' +
                    '\t\t\tcurRow.append(val)\n' +
                '\t\tfileString += "\\t".join(curRow)\n' +
                '\t\tfileString += "\\n"\n' +
            '\treturn str(fileString.encode("ascii", "ignore"))\n';

        XcalarUploadPython(moduleName, entireString)
        .then(function() {
            storePython(moduleName, entireString);
        })
        .fail(function(error) {
            console.error(error);
        });
    }

    return (UDF);
}(jQuery, {}));

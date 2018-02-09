/*
 * Module for data preview
 */
window.DSPreview = (function($, DSPreview) {
    var $previewCard;   // $("#dsForm-preview");
    var $previewWrap;    // $("#dsPreviewWrap")
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
        "TEXT": "TEXT",
        "EXCEL": "Excel",
        "UDF": "UDF",
        "XML": "XML",
        "PARQUET": "PARQUET"
    };

    DSPreview.setup = function() {
        $previewCard = $("#dsForm-preview");
        $previewWrap = $("#dsPreviewWrap");
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

        $previewTable.on("mousedown", ".editableHead", function() {
            $("#importColRename").trigger("blur");
            if ($("#importColRename").length) {
                return false;
            }
            var $input = $(this);
            $input.removeClass("error");
            var rect = this.getBoundingClientRect();
            var val = xcHelper.escapeDblQuoteForHTML($input.val());
            var maxWidth = 400;
            var width = rect.width;
            var html = '<input class="xc-input" id="importColRename" ' +
                            'spellcheck="false" type="text" value="' + val +
                            '" ' + ' style="width:' + width + 'px;top:' +
                            rect.top + 'px;left:' + rect.left + 'px;">';

            $previewWrap.append(html);
            var $renameInput = $("#importColRename");
            $renameInput.data("$input", $input);
            var scrollWidth = $renameInput[0].scrollWidth;
            if (scrollWidth > (width - 2)) {
                width = Math.min($previewCard.find(".previewSection").width(),
                                scrollWidth + 80);
                $renameInput.outerWidth(width);
            }

            if (width > $previewCard.find(".previewSection").width()) {
                $renameInput.outerWidth($previewCard.find(".previewSection")
                            .width());
            }

            rect = $renameInput[0].getBoundingClientRect();
            var winRight = $(window).width() - 5;
            var diff = rect.right - winRight;
            if (diff > 0) {
                var newLeft = rect.left - diff;
                $renameInput.css("left", newLeft);
            } else if (rect.left < $previewCard.offset().left) {
                $renameInput.css("left", $previewCard.offset().left);
            }

            $previewCard.find(".previewSection").scroll(function() {
                cleanupColRename();
            });

            $renameInput.on("keydown", function(event) {
                if (event.which === keyCode.Enter) {
                    $renameInput.trigger("blur");
                }
            });

            var scrollTimeout;

            $renameInput.on("input", function() {
                $renameInput.removeClass("error");
                $renameInput.tooltip("destroy");
                clearTimeout(scrollTimeout);
                var scrollWidth = $renameInput[0].scrollWidth;
                if (scrollWidth < maxWidth &&
                    scrollWidth > ($renameInput.outerWidth() - 2)) {
                    $renameInput.outerWidth(scrollWidth + 80);
                    rect = $renameInput[0].getBoundingClientRect();
                    var winRight = $(window).width() - 5;
                    var diff = rect.right - winRight;
                    if (diff > 0) {
                        var newLeft = rect.left - diff;
                        $renameInput.css("left", newLeft);
                    }
                }
            });

            // if we don't use a timeout, editablehead blur is triggered and
            // renameInput is removed immediately so we never see it
            setTimeout(function() {
                $renameInput.focus();
                $renameInput.selectAll();

                // if scroll is triggered, don't validate, just return to old
                // value
                $renameInput.on("blur", function() {
                    var val = $renameInput.val();
                    $renameInput.tooltip("destroy");
                    clearTimeout(scrollTimeout);
                    var nameErr = xcHelper.validateColName(val);
                    if (!nameErr && checkIndividualDuplicateName(val,
                                    $input.closest("th").index())) {
                        nameErr = ErrTStr.ColumnConflict;
                    }
                    if (nameErr) {
                        $renameInput.focus().addClass("error");

                        xcTooltip.transient($renameInput, {
                            "title": nameErr,
                            "template": xcTooltip.Template.Error
                        });

                        scrollTimeout = setTimeout(function() {
                            $renameInput.tooltip('destroy');
                        }, 5000);

                        return false;
                    }

                    $input.val(val);
                    $renameInput.remove();
                    $previewCard.find(".previewSection").off("scroll");
                });
            });
        });


        xcMenu.add($previewCard.find(".castDropdown"));

        $previewTable.on("click", ".flex-left", function() {
            var $dropdown = $previewCard.find(".castDropdown");
            $dropdown.data('th', $(this).closest("th"));
            $dropdown.removeClass("type-string type-boolean " +
                                  "type-integer type-float");
            $dropdown.addClass("type-" + $(this).closest("th").data("type"));
            $(this).addClass("selected");
            positionAndShowCastDropdown($(this));
        });

        $previewCard.find(".castDropdown").find("li").mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            var type = $(this).data("type");
            var $th = $previewCard.find(".castDropdown").data("th");
            $th.find(".header").removeClass("type-string type-boolean " +
                                            "type-integer type-float");
            $th.find(".header").addClass("type-" + type);
            $th.data("type", type);
            xcTooltip.changeText($th.find(".flex-left"),
                                    xcHelper.capitalize(type) +
                                    '<br>' + DSTStr.ClickChange);
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
            $("#importColRename").trigger("blur");
            if ($("#importColRename").length) {
                return;
            }

            // prevent resize from letting the table get smaller than 175px
            var minTableWidth = 175;
            var curWidth = $(this).closest("th").outerWidth();
            var tableWidth = $previewTable.outerWidth();
            var extraTableWidth = tableWidth - minTableWidth;
            var minColWidth = Math.max(25, curWidth - extraTableWidth);
            TblAnim.startColResize($(this), event, {
                target: "datastore",
                minWidth: minColWidth
            });
        });

        $previewWrap.on("mouseenter", ".tooltipOverflow", function() {
            var text = $(this).is("input") ? $(this).val() : $(this).text();
            xcTooltip.add($(this), {"title": xcHelper.escapeHTMLSpecialChar(text)});
            xcTooltip.auto(this);
        });

        // minimize
        $("#dsForm-minimize").click(function() {
            xcTooltip.hideAll();
            $previewCard.toggleClass("minimize");
        });

        // set up format dropdownlist
        new MenuHelper($("#preview-file"), {
            "onSelect": function($li) {
                var path = $li.data("path");
                DSPreview.changePreviewFile(path);
            },
            beforeOpenAsync: function() {
                var deferred = jQuery.Deferred();

                $previewWrap.find(".inputWaitingBG").remove();

                var waitingBg = '<div class="inputWaitingBG">' +
                                 '<div class="waitingIcon"></div>' +
                              '</div>';
                $previewWrap.find(".url").append(waitingBg);
                var $waitingBg = $previewWrap.find(".inputWaitingBG");

                if (gMinModeOn) {
                    $waitingBg.find(".waitingIcon").show();
                } else {
                    setTimeout(function() {
                        $waitingBg.find(".waitingIcon").fadeIn();
                    }, 200);
                }

                previewFileSelect()
                .then(function() {
                    deferred.resolve();
                })
                .fail(function() {
                    deferred.reject();
                })
                .always(function() {
                    $waitingBg.remove();
                });

                return deferred.promise();
            },
            "container": "#dsForm-preview",
            "bounds": "#dsForm-preview",
            "bottomPadding": 5
        }).setupListeners();


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

        $previewWrap.on("click", ".cancelLoad", function() {
            var txId = $(this).data("txid");
            QueryManager.cancelQuery(txId);
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
        var $previewBottom = $previewWrap.find(".previewBottom");
        $previewBottom.on("click", ".action", function() {
            showMoreRows();
        });

        setupForm();

        var $bottomCard = $previewCard.find(".cardBottom");
        var bottomCardTop = 0;
        $bottomCard .on('mousedown', '.ui-resizable-n', function() {
            bottomCardTop = $bottomCard.position().top;
        });

        $bottomCard.resizable({
            handles: "n",
            containment: 'parent',
            start: function(event, ui) {
                $bottomCard.css('top', bottomCardTop);
                ui.originalPosition.top = bottomCardTop;
                ui.position.top = bottomCardTop;
                $previewWrap.outerHeight('100%');
                $previewWrap.addClass("dragging");
                // if resize is triggered, don't validate, just return to old
                // value
                if ($("#importColRename").length) {
                    $("#importColRename").val($("#importColRename")
                                         .data("$input").val());
                    $("#importColRename").trigger("blur");
                }
            },
            resize: function() {
            },
            stop: function() {
                var containerHeight = $previewCard.find(".cardWrap").height();
                bottomCardTop = $bottomCard.position().top;

                var topPct = 100 * (bottomCardTop / containerHeight);

                $bottomCard.css('top', topPct + '%');
                $bottomCard.outerHeight((100 - topPct) + '%');
                $previewWrap.outerHeight(topPct + '%');
                setTimeout(function() {
                    $previewWrap.removeClass("dragging");
                });
            }
        });

        setupPreviewErrorSection();
    };

    function setupPreviewErrorSection() {
        $previewCard.find(".errorSection").on("click", ".suggest", function() {
            var format = $(this).data("format");
            changeFormat(format);
        });

        $("#dsPreview-debugUDF").click(function() {
            $(this).blur();
            JupyterPanel.autofillImportUdfModal(loadArgs.targetName,
                                          loadArgs.previewFile);
        });
    }

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

            var path = loadArgs.getPath();
            setDefaultDSName([path]);
        }

        var module = null;
        var func = null;
        var typedColumns = null;
        if (restore) {
            module = options.moduleName;
            func = options.funcName;
            typedColumns = options.typedColumns;
        } else {
            // all other rest format first
            // otherwise, cannot detect speical format(like special json)
            loadArgs.setFormat(null);
        }

        return previewData({
            "udfModule": module,
            "udfFunc": func,
            "isFirstTime": true,
            "typedColumns": typedColumns,
            "isRestore": restore
        });
    };

    DSPreview.changePreviewFile = function(path, noDetect) {
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
            toggleFormat("UDF");
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
            return clearPreviewTable(tableName);
        }
    };

    DSPreview.cleanup = function() {
        return cleanTempParser();
    };

    function positionAndShowCastDropdown($div) {
        var $menu = $previewCard.find(".castDropdown");
        var topMargin = 1;
        var top = $div[0].getBoundingClientRect().bottom + topMargin;
        var left = $div[0].getBoundingClientRect().left;

        $menu.css({'top': top, 'left': left});
        xcMenu.show($menu, function() {
            $menu.data("th").find(".flex-left").removeClass("selected");
        });
        var rightBoundary = $(window).width() - 5;

        if ($menu[0].getBoundingClientRect().right > rightBoundary) {
            left = rightBoundary - $menu.width();
            $menu.css('left', left);
        }
        xcTooltip.hideAll();
    }

    function cleanupColRename() {
        $("#importColRename").tooltip("destroy");
        $("#importColRename").remove();
        $previewCard.find(".previewSection").off("scroll");
    }

    function setupForm() {
        $form.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        $form.on("click", ".topSection .actionPart", function() {
            $(this).closest(".topSection").toggleClass("collapse");
        });

        // set up format dropdownlist
        new MenuHelper($("#fileFormat"), {
            "onSelect": function($li) {
                var format = $li.attr("name");
                changeFormat(format);
            },
            "onOpen": function() {
                // XXX check if multiple files and enable/disable parquet option
                //$("#fileFormatMenu").find('li[name="PARQUET"]');
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

        // back button
        $form.on("click", ".cancel", function() {
            var path = loadArgs.getPath();
            var targetName = loadArgs.getTargetName();
            if ($previewWrap.find(".cancelLoad").length) {
                $previewWrap.find(".cancelLoad").click();
                // cancels udf load
            }
            resetForm();
            clearPreviewTable(tableName);
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
            $("#importColRename").tooltip("destroy");
            $("#importColRename").remove();
            var toCreateTable = $submitBtn.hasClass("createTable");
            submitForm(toCreateTable);
        });

        $form.submit(function(event) {
            // any button click will trigger submit
            event.preventDefault();
        });

        setupUDFSection();
        setupXMLSection();
        setupAdvanceSection();
        setupParquetSection();
    }

    function setupUDFSection() {
        $("#dsForm-applyUDF").click(function() {
            $(this).blur();
            refreshPreview(true);
        });

        $("#dsForm-writeUDF").click(function() {
            $(this).blur();
            JupyterPanel.autofillImportUdfModal(loadArgs.targetName,
                                          loadArgs.previewFile);
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

    function setupXMLSection() {
        $form.on("click", ".row.xml .checkboxSection", function() {
            $(this).find(".checkbox").toggleClass("checked");
        });
    }

    function setupAdvanceSection() {
        // advance section
        var $advanceSection = $form.find(".advanceSection");
        $advanceSection.on("click", ".listWrap", function() {
            $advanceSection.toggleClass("active");
            $(this).toggleClass("active");
        });

        var $extraCols = $advanceSection.find(".extraCols");
        $extraCols.on("click", ".checkboxSection", function() {
            var $part = $(this).closest(".part");
            $part.find(".checkbox").toggleClass("checked");
            $part.toggleClass("active");

            if ($part.hasClass("active")) {
                $part.find("input").focus();
            }
        });

        $advanceSection.find(".performance").on("click", ".checkboxSection", function() {
            $(this).find(".checkbox").toggleClass("checked");
        });

        xcHelper.optionButtonEvent($advanceSection);
    }

    function setupParquetSection() {
        // XXX temporarily disabling
        $("#fileFormatMenu").find('li[name="PARQUET"]').addClass("xc-hidden");

        var $parquetSection = $form.find(".parquetSection");
        $parquetSection.on("click", ".listWrap", function() {
            $parquetSection.toggleClass("active");
            $(this).toggleClass("active");
        });

        $parquetSection.on("click", ".columnSearch .iconWrapper", function() {
            $(this).closest(".columnSearch").find("input").focus();
        });

        $parquetSection.on("input", ".columnSearch input", function() {
            var $input = $(this);
            var keyword = $input.val();
            var keywordClean = keyword.trim();
            var index = $(this).closest(".columnHalf").index();
            searchColumn(keywordClean, index);
            if (keyword.length) {
                $input.closest(".columnSearch").addClass("hasVal");
            } else {
                $input.closest(".columnSearch").removeClass("hasVal");
            }
        });

        $parquetSection.on("blur", ".columnSearch input", function() {
            var $input = $(this);
            var keyword = $input.val();
            if (keyword.length) {
                $input.closest(".columnSearch").addClass("hasVal");
            } else {
                $input.closest(".columnSearch").removeClass("hasVal");
            }
        });

        $parquetSection.on("mousedown", ".columnSearch .clear", function(event) {
            var $input = $(this).closest(".columnSearch").find("input");
            if ($input.val() !== "") {
                $input.val("").trigger("input").focus(); // triggers search
                event.preventDefault(); // prevent input from blurring
            }
        });

        function searchColumn(keyword, index) {
            var $colList = $parquetSection.find(".colList").eq(index);
            var $lis = $colList.find("li");
            $lis.removeClass("filteredOut");
            if (!keyword) {
                if (!$lis.length) {
                    $colList.addClass("empty");
                } else {
                    $colList.removeClass("empty");
                }
                return;
            }
            $lis.filter(function() {
                return !$(this).text().includes(keyword);
            }).addClass("filteredOut");

            if ($lis.length === $lis.filter(".filteredOut").length) {
                $colList.addClass("empty");
            } else {
                $colList.removeClass("empty");
            }
        }
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
            selectUDFFunc("");

            $udfFuncList.parent().tooltip({
                "title": TooltipTStr.ChooseUdfModule,
                "placement": "top",
                "container": "#dsFormView"
            });
        } else {
            $udfFuncList.parent().tooltip("destroy");
            $udfFuncList.removeClass("disabled")
                        .find("input").removeAttr("disabled");
            var $funcLis = $udfFuncList.find(".list li").addClass("hidden")
                            .filter(function() {
                                return $(this).data("module") === module;
                            }).removeClass("hidden");
            if ($funcLis.length === 1) {
                selectUDFFunc($funcLis.eq(0).text());
            } else {
                selectUDFFunc("");
            }
        }
    }

    function selectUDFFunc(func) {
        func = func || "";
        var $button = $("#dsForm-applyUDF");
        if (func) {
            $button.removeClass("xc-disabled");
            udfFuncHint.setInput(func);
        } else {
            $button.addClass("xc-disabled");
            udfFuncHint.clearInput();
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
        return (loadArgs.getFormat() === "UDF");
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
        $form.find(".collapse").removeClass("collapse");
        $previewWrap.find(".inputWaitingBG").remove();
        $previewWrap.find(".url").removeClass("xc-disabled");
        $previewCard.removeClass("format-parquet");

        var $advanceSection = $form.find(".advanceSection").removeClass("active");
        $advanceSection.find(".active").removeClass("active");
        $advanceSection.find(".radioButton").eq(0).addClass("active");
        cleanupColRename();

        loadArgs.reset();
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

        $previewWrap.find(".errorSection").addClass("hidden")
                                          .removeClass("cancelState");
        $previewWrap.find(".loadHidden").removeClass("hidden");
    }

    function resetPreviewRows() {
        resetRowsToPreview();
        $previewWrap.find(".previewBottom")
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
        var isSpecialJSON = false;
        $form.find("input").not($formatText).val("");
        $form.find(".checkbox.checked").removeClass("checked");

        // dsName
        $form.find(".dsName").eq(0).val(options.dsName);

        // format
        var format = options.format;
        if (format === formatMap.TEXT) {
            if (options.moduleName === "default" &&
                options.funcName === "genLineNumber") {
                toggleGenLineNum(true);
            }
        } else if (format === formatMap.UDF) {
            cacheUDF(options.moduleName, options.funcName);
            resetUdfSection();
        } else if (format === formatMap.JSON &&
                    options.moduleName === "default" &&
                    options.funcName === "convertNewLineJsonToArrayJson") {
            isSpecialJSON = true;
        }
        options.format = format;
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
            "quote": options.quoteChar,
            "isSpecialJSON": isSpecialJSON
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
        var udfQuery = res.udfQuery;

        var fieldDelim = res.fieldDelim;
        var lineDelim = res.lineDelim;

        var quote = res.quote;
        var skipRows = res.skipRows;

        var header = loadArgs.useHeader();
        var targetName = loadArgs.getTargetName();
        var path = loadArgs.getPath();
        var pattern = loadArgs.getPattern();
        var isRecur = loadArgs.getRecur();
        var isRegex = loadArgs.getRegEx();

        // console.log(dsName, format, udfModule, udfFunc, fieldDelim, lineDelim,
        //     header, path, quote, skipRows, isRecur, isRegex);

        var typedColumns = getColumnHeaders();
        cacheUDF(udfModule, udfFunc);

        var colLen = 0;
        if (toCreateTable) {
            colLen = $previewTable.find("th:not(.rowNumHead)").length;
        }

        xcHelper.disableSubmit($form.find('.confirm'));
        // enableSubmit is done during the next showing of the form
        // If the form isn't shown, there's no way it can be submitted
        // anyway
        invalidHeaderDetection(typedColumns)
        .then(function() {
            return tooManyColAlertHelper(colLen);
        })
        .then(function() {
            if (format !== formatMap.CSV ||
                !hasTypedColumnChange(typedColumns)) {
                typedColumns = null;
            }
            // XXX temp fix to preserve CSV header order
            typedColumns = (format !== formatMap.JSON) ? typedColumns : null;
            if (format === "Excel") {
                udfQuery = {};
                if (skipRows > 0) {
                    udfQuery.skipRows = skipRows;
                }
                if (header) {
                    udfQuery.withHeader = true;
                }
            }
            var pointArgs = {
                "name": dsName,
                "targetName": targetName,
                "format": format,
                "path": path,
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
                "typedColumns": typedColumns,
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
        if (loadArgs.getFormat() === formatMap.CSV) {
            $previewTable.find("th:not(.rowNumHead)").each(function() {
                var $th = $(this);
                var type = $th.data("type") || "string";
                var header = {
                    colType: type,
                    colName: $th.find(".text").val()
                };
                headers.push(header);
            });
        } else {
            $previewTable.find("th:not(.rowNumHead)").each(function() {
                var header = {
                    colType: "",
                    colName: $(this).find(".text").text()
                };
                headers.push(header);
            });
        }

        return headers;
    }

    function validateDSNames() {
        var isValid = true;
        var dsNames = [];

        // validate name
        $form.find(".dsName").each(function() {
            var $dsName = $(this);
            var dsName = $dsName.val().trim();
            isValid = xcHelper.validate([
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
                        return DS.has(name) || dsNames.includes(dsName); // already used
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

            dsNames.push(dsName);

            if (!isValid) {
                return false; // stop looping
            }
        });

        return isValid ? dsNames : null;
    }

    function validateFormat() {
        var format = loadArgs.getFormat();
        isValid = xcHelper.validate([{
            "$ele": $formatText,
            "error": ErrTStr.NoEmptyList,
            "check": function() {
                return (format == null);
            }
        }]);
        return isValid ? format : null;
    }

    function validateUDF() {
        var $moduleInput = $udfModuleList.find("input");
        var $funcInput = $udfFuncList.find("input");
        var isValid = xcHelper.validate([
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

        return [udfModule, udfFunc];
    }

    function validateCSVArgs(isCSV) {
        // validate delimiter
        var fieldDelim = loadArgs.getFieldDelim();
        var lineDelim = loadArgs.getLineDelim();
        var quote = loadArgs.getQuote();
        var skipRows = getSkipRows();
        var isValid = xcHelper.validate([
            {
                "$ele": $fieldText,
                "error": DSFormTStr.InvalidDelim,
                "formMode": true,
                "check": function() {
                    // for Text foramt don't check field delim
                    var res = xcHelper.delimiterTranslate($fieldText);
                    return (isCSV && typeof res === "object");
                }
            },
            {
                "$ele": $lineText,
                "error": DSFormTStr.InvalidDelim,
                "formMode": true,
                "check": function() {
                    var res = xcHelper.delimiterTranslate($lineText);
                    return (typeof res === "object");
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
                    var res = xcHelper.delimiterTranslate($quote);
                    return (typeof res === "object") || (res.length > 1);
                }
            }
        ]);

        if (!isValid) {
            return null;
        }

        return [fieldDelim, lineDelim, quote, skipRows];
    }

    function validateXMLArgs() {
        var $xPaths = $("#dsForm-xPaths");
        var xPaths = $("#dsForm-xPaths").val().trim();
        var isValid = xcHelper.validate([
            {
                "$ele": $xPaths,
                "error": ErrTStr.NoEmpty,
                "formMode": true,
                "check": function() {
                    return xPaths.length === 0;
                }
            }
        ]);

        if (!isValid) {
            return null;
        }

        var matchedXPath = $form.find(".matchedXPath")
                                .find(".checkbox").hasClass("checked");
        var elementXPath = $form.find(".elementXPath")
                                .find(".checkbox").hasClass("checked");
        return {
            xPath: xPaths,
            matchedPath: matchedXPath,
            withPath: elementXPath
        };
    }

    function validateAdvanceArgs() {
        var $advanceSection = $form.find(".advanceSection");
        var validateExtraColumnArg = function($ele) {
            var isValid = true;
            if ($ele.find(".checkbox").hasClass("checked")) {
                isValid = xcHelper.validate([{
                    $ele: $ele.find("input"),
                    onErr: function() {
                        if (!$advanceSection.hasClass("active")) {
                            $advanceSection.find(".listWrap").click();
                        }
                    },
                    delay: 300 // there is a forceHide event on scroll, so need delay to show the statusbox
                }]);
            }
            return isValid;
        };

        var $fileName = $advanceSection.find(".fileName");
        var $rowNum = $advanceSection.find(".rowNumber");

        if (!validateExtraColumnArg($fileName) ||
            !validateExtraColumnArg($rowNum)) {
            return null;
        }

        var metaFile = $("#dsForm-metadataFile").val().trim() || null;
        var rowNum = $fileName.find("input").val().trim() || null;
        var fileName = $fileName.find("input").val().trim() || null;
        var unsorted = $advanceSection.find(".performance .checkbox")
                                      .hasClass("checked");
        var termination = $advanceSection.find(".termination")
                                         .find(".radioButton.active")
                                         .data("option");
        return {
            metaFile: metaFile,
            rowNum: rowNum,
            fileName: fileName,
            unsorted: unsorted,
            termination: termination
        };
    }

    function validateForm() {
        var dsNames = validateDSNames();
        if (dsNames == null) {
            // error case
            return null;
        }

        var format = validateFormat();
        if (format == null) {
            // error case
            return null;
        }

        var hasUDF = isUseUDF();
        var udfModule = "";
        var udfFunc = "";
        var udfQuery = null;
        var fieldDelim = null;
        var lineDelim = null;
        var quote = null;
        var skipRows = null;
        var xmlArgs = {};

        if (hasUDF) {
            var udfArgs = validateUDF();
            if (udfArgs == null) {
                // error case
                return null;
            }
            udfModule = udfArgs[0];
            udfFunc = udfArgs[1];
        } else if (format === formatMap.TEXT &&
                   $genLineNumCheckBox.find(".checkbox").hasClass("checked")) {
            udfModule = "default";
            udfFunc = "genLineNumber";
            if (loadArgs.useHeader()) {
                udfQuery = {};
                udfQuery.header = true;
            }
        } else if (format === formatMap.TEXT || format === formatMap.CSV) {
            var isCSV = (format === formatMap.CSV);
            var csvArgs = validateCSVArgs(isCSV);
            if (csvArgs == null) {
                // error case
                return null;
            }
            fieldDelim = isCSV ? csvArgs[0] : null;
            lineDelim = csvArgs[1];
            quote = csvArgs[2];
            skipRows = csvArgs[3];
        } else if (format === formatMap.JSON &&
                    detectArgs.isSpecialJSON === true) {
            // special case: special json
            // if user specified udf, then use the udf (hasUDF case).
            // otherwise, treat it as special json
            udfModule = "default";
            udfFunc = "convertNewLineJsonToArrayJson";
        } else if (format === formatMap.EXCEL) {
            udfModule = excelModule;
            udfFunc = excelFunc;
            skipRows = getSkipRows();
        } else if (format === formatMap.XML) {
            xmlArgs = validateXMLArgs();
            if (xmlArgs == null) {
                // error case
                return null;
            }
            udfModule = "default";
            udfFunc = "xmlToJson";
            udfQuery = xmlArgs;
        }

        var advanceArgs = validateAdvanceArgs();
        if (advanceArgs == null) {
            // error case
            return null;
        }

        var args = {
            "dsName": dsNames[0],
            "format": format,
            "udfModule": udfModule,
            "udfFunc": udfFunc,
            "udfQuery": udfQuery,
            "fieldDelim": fieldDelim,
            "lineDelim": lineDelim,
            "quote": quote,
            "skipRows": skipRows
        };

        return $.extend(args, advanceArgs);
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

        return DS.getUniqueName(name);
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

        $form.find(".format").addClass("xc-hidden");
        if ($previewCard.hasClass("format-parquet")) {
            $previewCard.removeClass("format-parquet");
            // restore height of bottom card as parquet sets it to 100%
            var top = $previewCard.data("prevtop");
            $previewCard.find(".cardBottom").css("top", top);
            top = parseFloat(top);
            $previewCard.find(".cardMain").css("top", 100 - top);
        }

        xcTooltip.remove($previewCard.find(".ui-resizable-n"));

        if (format == null) {
            // reset case
            $formatText.data("format", "").val("");
            loadArgs.setFormat(null);
            return false;
        }

        format = format.toUpperCase();
        var text = $('#fileFormatMenu li[name="' + format + '"]').text();
        $formatText.data("format", format).val(text);

        switch (format) {
            case "CSV":
                $form.find(".format.csv").removeClass("xc-hidden");
                setFieldDelim();
                break;
            case "TEXT":
                $form.find(".format.text").removeClass("xc-hidden");
                toggleGenLineNum(false);
                loadArgs.setFieldDelim("");

                var $genLineNums = $genLineNumCheckBox.parent();
                if (isPreviewSingleFile()) {
                    $genLineNums.removeClass("xc-hidden");
                } else {
                    $genLineNums.addClass("xc-hidden");
                }
                break;
            case "EXCEL":
                $form.find(".format.excel").removeClass("xc-hidden");
                break;
            case "JSON":
                break;
            case "PARQUET":
                var prevTop = $previewCard.find(".cardBottom")[0].style.top;
                // store previous top % for if we switch back to other format
                $previewCard.data("prevtop", prevTop);
                $form.find(".format.parquet").removeClass("xc-hidden");
                $previewCard.addClass("format-parquet");
                xcTooltip.add($previewCard.find(".ui-resizable-n"), {
                    title: "Dataset preview is not available"
                });
                break;
            case "UDF":
                $form.find(".format.udf").removeClass("xc-hidden");
                break;
            case "XML":
                $form.find(".format.xml").removeClass("xc-hidden");
                break;
            default:
                throw ("Format Not Support");
        }

        loadArgs.setFormat(formatMap[format]);
        return true;
    }

    function changeFormat(format) {
        var oldFormat = loadArgs.getFormat();
        var useUDF = isUseUDFWithFunc();
        var hasChangeFormat = toggleFormat(format);
        var changeWithExcel = function(formatOld, formatNew) {
            return formatOld != null &&
                    (formatOld.toUpperCase() === "EXCEL" ||
                    formatNew.toUpperCase() === "EXCEL");
        };

        var changeFromUDF = function(wasUsingUDF) {
            // auto refresh when use UDF before and now change to another format
            return wasUsingUDF && !isUseUDF();
        };

        if (hasChangeFormat) {
            if (format === "UDF") {
                // nothing to do now
            } else if (changeWithExcel(oldFormat, format) ||
                changeFromUDF(useUDF)) {
                refreshPreview(true);
            } else {
                getPreviewTable();
            }
        }
    }

    function isPreviewSingleFile() {
        return !isViewFolder;
    }

    function errorHandler(error, isUDFError, isCancel) {
        if (typeof error === "object") {
            if (error.status === StatusT.StatusNoEnt ||
                error.status === StatusT.StatusIsDir ||
                error.status === StatusT.StatusAllFilesEmpty)
            {
                error = error.error + ", " + DSFormTStr.GoBack + ".";
            } else if (error.status === StatusT.StatusUdfExecuteFailed) {
                error = error.log ? error.log : error.error;
            } else {
                error = (error.error ? error.error : "") +
                        (error.log ? error.log : "");
                error = error || ErrTStr.Unknown;
            }
        }

        $previewWrap.find(".waitSection").addClass("hidden")
                    .removeClass("hasUdf")
                   .find(".progressSection").empty();
        $previewWrap.find(".loadHidden").addClass("hidden");
        $previewWrap.find(".url").removeClass("xc-disabled");
        $previewTable.empty();
        xcTooltip.hideAll();

        var $errorSection = $previewWrap.find(".errorSection");
        var $bottomSection = $errorSection.find(".bottomSection");

        if (error.startsWith("Error:")) {
            error = error.slice("Error:".length).trim();
        }
        if (isUDFError) {
            $bottomSection.removeClass("xc-hidden");
            error = DSFormTStr.UDFError + "\n" + error;
        } else {
            $bottomSection.addClass("xc-hidden");
        }

        $errorSection.removeClass("hidden");

        if (isCancel) {
            $errorSection.addClass("cancelState");
        } else {
            $errorSection.find(".content").html(error);
        }
    }

    // prevTableName is optional, if not provided will default to tableName
    // if provided, then will not reset tableName
    function clearPreviewTable(prevTableName) {
        var deferred = jQuery.Deferred();
        applyHighlight(""); // remove highlighter
        $previewTable.removeClass("has-delimiter").empty();
        rawData = null;
        resetPreviewRows();
        resetPreviewId();

        if (prevTableName) {
            var dsName = prevTableName;
            if (prevTableName === tableName) {
                tableName = null;
            }

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

    function previewData(options, clearPreview) {
        var deferred = jQuery.Deferred();

        options = options || {};
        var isFirstTime = options.isFirstTime || false;
        var isRestore = options.isRestore || false;
        var noDetect = isRestore || options.noDetect || false;
        var udfModule = options.udfModule || null;
        var udfFunc = options.udfFunc || null;
        var udfQuery = options.udfQuery || null;
        var format;

        var targetName = loadArgs.getTargetName();
        var path = loadArgs.getPath();
        var dsName = $form.find(".dsName").eq(0).val();
        if (!dsName) {
            dsName = setDefaultDSName([path])[0];
        }

        var recursive = loadArgs.getRecur();
        var isRegex = loadArgs.getRegEx();
        var pattern = loadArgs.getPattern();
        pattern = xcHelper.getFileNamePattern(pattern, isRegex);

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

        var cachedTableName = tableName;
        if (clearPreview && !hasUDF) {
            clearPreviewTable(tableName); // async remove the old ds
        }

        // cache what was not hidden and only unhide these sections
        // if operation canceled
        var $visibleLoadHiddenSection = $previewWrap.find(".loadHidden:not('" +
                                                  ".hidden')");
        var $loadHiddenSection = $previewWrap.find(".loadHidden")
                                            .addClass("hidden");
        var $waitSection = $previewWrap.find(".waitSection")
                                    .removeClass("hidden");
        $previewWrap.find(".url").addClass("xc-disabled");
        $previewWrap.find(".errorSection").addClass("hidden")
                                          .removeClass("cancelState");

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

        setPreviewInfo(targetName, path, pattern);

        var curPreviewId = updatePreviewId();
        var def = isFirstTime
                  ? checkIsFolder(targetName, path)
                  : PromiseHelper.resolve();

        var urlToPreview;
        var initialLoadArgStr;

        def
        .then(function() {
            var previewFile = loadArgs.getPreviewFile();
            if (isFirstTime || previewFile == null) {
                var args = {
                    targetName: targetName,
                    path: path,
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
            if (isFirstTime && !hasUDF) {
                if (isExcel(url)) {
                    hasUDF = true;
                    udfModule = excelModule;
                    udfFunc = excelFunc;
                    toggleFormat("EXCEL");
                    sql.moduleName = udfModule;
                    sql.funcName = udfFunc;
                } else if (DSTargetManager.isGeneratedTarget(targetName)) {
                    // special case
                    hasUDF = true;
                    udfModule = "default";
                    udfFunc = "convertNewLineJsonToArrayJson";
                    toggleFormat("UDF");
                    selectUDFModule(udfModule);
                    selectUDFFunc(udfFunc);
                    sql.moduleName = udfModule;
                    sql.funcName = udfFunc;
                }
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
            format = loadArgs.getFormat();

            if (hasUDF) {
                showProgressCircle(txId);
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

            if (clearPreview && hasUDF) {
                clearPreviewTable(cachedTableName); // async remove the old ds
            }

            if (!result) {
                var error = DSTStr.NoRecords + '\n' + DSTStr.NoRecrodsHint;
                return PromiseHelper.reject(error);
            }

            setPreviewFile(urlToPreview);
            $waitSection.addClass("hidden").removeClass("hasUdf")
                        .find(".progressSection").empty();
            $previewWrap.find(".url").removeClass("xc-disabled");
            xcTooltip.hideAll();
            rawData = result;

            $loadHiddenSection.removeClass("hidden");

            if (!noDetect) {
                var currentLoadArgStr = loadArgs.getArgStr();
                // when user not do any modification, then do smart detect
                if (initialLoadArgStr === currentLoadArgStr) {
                    smartDetect();
                }
            }

            getPreviewTable();
            if (isRestore) {
                restoreTypedColumns(options.typedColumns);
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
                "noAlert": true,
                "sql": sql
            });

            if (Transaction.checkCanceled(txId)) {
                if (isValidPreviewId(curPreviewId)) {
                    $visibleLoadHiddenSection.removeClass("hidden");
                    if (isFirstTime) {
                        // if first time, show error message since there's no
                        // previous table to show
                        errorHandler(error, false, true);
                        if (urlToPreview != null) {
                            setPreviewFile(urlToPreview);
                        }
                    } else {
                    // if canceled and still has valid preview id, restore state
                    // and show previous table
                        $waitSection.addClass("hidden").removeClass("hasUdf")
                            .find(".progressSection").empty();
                        $previewWrap.find(".url").removeClass("xc-disabled");
                    }
                }
                deferred.reject(error);
                return;
            }

            if (isValidPreviewId(curPreviewId) && clearPreview && hasUDF) {
                clearPreviewTable(cachedTableName); // async remove the old ds
            }

            if (typeof error === "object" &&
                error.error === oldPreviewError)
            {
                console.error(error);
            } else {
                if (urlToPreview != null) {
                    setPreviewFile(urlToPreview);
                }

                error = xcHelper.escapeHTMLSpecialChar(error);
                if (format === formatMap.UDF) {
                    errorHandler(error, true);
                } else if (format == null || detectArgs.format == null) {
                    errorHandler(error);
                } else {
                    error = getParseError(format, detectArgs.format);
                    errorHandler(error);
                }
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

    function setDefaultDSName(paths) {
        var dsNames = [];
        var html = "";
        var $inputPart = $form.find(".topSection .inputPart");
        paths.forEach(function(path) {
            var dsName = getNameFromPath(path);
            dsNames.push(dsName);

            html += '<div class="row">' +
                        '<label>' +
                            path +
                        '</label>' +
                        '<div class="inputWrap">' +
                            '<input class="large dsName" type="text"' +
                            ' autocomplete="off" spellcheck="false"' +
                            ' value="' + dsName + '">' +
                        '</div>' +
                    '</div>';
        });
        $inputPart.html(html);
        if (paths.length > 1) {
            $form.addClass("multiFiles");
        } else {
            $form.removeClass("multiFiles");
        }
        autoResizeLabels($inputPart);
        return dsNames;
    }

    function autoResizeLabels($inputPart) {
        var $labels = $inputPart.find("label");
        var $label = $labels.eq(0);
        var width = parseInt($label.css("minWidth"));
        var maxWidth = parseInt($label.css("maxWidth"));

        $labels.each(function() {
            var $ele = $(this);
            width = Math.max(width, xcHelper.getTextWidth($ele, $ele.text()));
            width = Math.min(width, maxWidth);
        });

        $labels.width(width);

        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        ctx.font = "600 14px Open Sans";
        $labels.each(function() {
            var $ele = $(this);
            var originalText = $ele.text();
            var ellipsis = xcHelper.leftEllipsis(originalText, $ele, maxWidth - 5, ctx);
            if (ellipsis) {
                xcTooltip.add($ele, {
                    title: originalText
                });
            }
        });
    }

    function setPreviewInfo(targetName, url, pattern) {
        xcTooltip.add($previewWrap.find(".previewTitle"), {
            title: targetName
        });

        var $pattern = $("#preview-pattern");
        if (!pattern) {
            $pattern.addClass("xc-hidden");
        } else {
            $pattern.removeClass("xc-hidden");
            $pattern.find(".text").text(pattern);
        }
    }

    function setPreviewFile(path) {
        var $file = $("#preview-file");
        $file.find(".text").val(path);
        if (!loadArgs.getPreviewFile()) {
            // set the path to be preview file if not set yet
            loadArgs.setPreviewFile(path);
        }
    }

    function resetPreviewFile() {
        var $file = $("#preview-file");
        $file.find(".text").text();
        xcTooltip.remove($file.find(".text"));
    }

    function previewFileSelect(isParseMode) {
        var deferred = jQuery.Deferred();

        var previewFile = $("#preview-file").find(".text").val();
        var recursive = loadArgs.getRecur();
        var isRegex = loadArgs.getRegEx();
        var pattern = loadArgs.getPattern();
        pattern = xcHelper.getFileNamePattern(pattern, isRegex);
        var options = {
            "targetName": loadArgs.getTargetName(),
            "path": loadArgs.getPath(),
            "previewFile": previewFile,
            "recursive": recursive,
            "fileNamePattern": pattern,
            "isParseMode": isParseMode
        };

        if (isParseMode) {
            PreviewFileModal.show(options);
            return PromiseHelper.resolve();
        }

        var path = options.path;

        var curPreviewId = previewId;

        if (isPreviewSingleFile()) {
            // if single file, don't need to make backend call, just list
            // the 1 file
            loadFiles(loadArgs.getPath(), [{name: previewFile}]);
            return PromiseHelper.resolve();
        }

        XcalarListFiles(options)
        .then(function(res) {
            if (!isValidPreviewId(curPreviewId)) {
                return deferred.reject();
            }
            loadFiles(path, res.files, options.previewFile);
            deferred.resolve();
        })
        .fail(function(error) {
            deferred.reject(error);
        });

        function loadFiles(url, files, activeFilePath) {
            var html = "";
            var paths = [];
            var nameMap = {};
            var $ul = $("#preview-file").find("ul");

            if (files.length === 1 && url.endsWith(files[0].name)) {
                // when it's a single file
                paths[0] = url;
                nameMap[url] = files[0].name;
            } else {
                // when it's a folder
                if (!url.endsWith("/")) {
                    url += "/";
                }
                files.forEach(function(file) {
                    // XXX temporary skip folder, later may enable it
                    if (!file.attr.isDirectory) {
                        var path = url + file.name;
                        paths.push(path);
                        nameMap[path] = file.name;
                    }
                });

                paths.sort();
            }

            for (var i = 0, len = paths.length; i < len; i++) {
                var path = paths[i];
                var classes = (path === activeFilePath) ? " active" : "";
                var fileName = nameMap[path];
                html +=
                    '<li class="' + classes + '"' +
                    'data-path="' + path + '">' +
                        '<div class="label tooltipOverflow"' +
                        ' data-toggle="tooltip"' +
                        ' data-container="body"' +
                        ' data-placement="top"' +
                        ' title="' + fileName + '">' +
                            path +
                        '</div>' +
                    '</li>';
            }

            $ul.html(html);
        }

        return deferred.promise();
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
        var path = loadArgs.getPreviewFile();
        var buffer = rawData;
        var isRecur = loadArgs.getRecur();
        var isRegex = loadArgs.getRegEx();
        var pattern = loadArgs.getPattern();
        pattern = xcHelper.getFileNamePattern(pattern, isRegex);

        var rowsToShow = getRowsToPreivew() + rowsToAdd;
        var args = {
            targetName: targetName,
            path: path,
            fileNamePattern: pattern,
            recursive: isRecur
        };
        return getDataFromPreview(args, buffer, rowsToShow);
    }

    function refreshPreview(noDetect) {
        var formOptions = validateForm();
        if (formOptions == null) {
            return null;
        }
        formOptions.noDetect = noDetect;
        return previewData(formOptions, true);
    }

    function getPreviewTable() {
        if (rawData == null) {
            // error case
            if (!$previewWrap.find(".errorSection").hasClass("hidden")) {
                errorHandler(DSFormTStr.NoData);
            }
            return;
        }

        cleanupColRename();
        $previewCard.find(".previewSection").off("scroll");
        $previewWrap.find(".errorSection").addClass("hidden")
                                          .removeClass("cancelState");
        $previewWrap.find(".loadHidden").removeClass("hidden");
        $highlightBtns.addClass("hidden");

        var format = loadArgs.getFormat();
        if (isUseUDFWithFunc() || format === formatMap.JSON)
        {
            getJSONTable(rawData);
            return;
        }

        if (format === formatMap.EXCEL) {
            getJSONTable(rawData, getSkipRows());
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

        var thHtml;
        if (loadArgs.getFormat() === formatMap.CSV) {
            thHtml = '<th class="editable" data-type="string">' +
                        '<div class="header type-string">' +
                            colGrabTemplate +
                            '<div class="flexContainer flexRow">' +
                                '<div class="flexWrap flex-left" ' +
                                'data-toggle="tooltip" data-container="body" ' +
                                'data-placement="top" data-original-title="' +
                                xcHelper.capitalize(ColumnType.string) +
                                '<br>' + DSTStr.ClickChange + '">' +
                                    '<span class="iconHidden"></span>' +
                                    '<span class="type icon"></span>' +
                                    '<div class="dropdownBox"></div>' +
                                '</div>' +
                                '<div class="flexWrap flex-mid">' +
                                    '<input spellcheck="false" ' +
                                    'class="text tooltipOverflow ' +
                                    'editableHead" value="">' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</th>';
        } else {
            thHtml = '<th>' +
                '<div class="header">' +
                    colGrabTemplate +
                    '<div class="text"></div>' +
                '</div>' +
            '</th>';
        }
        for (var i = 0, len = maxTdLen - thLen; i < len; i++) {
            ths += thHtml;
        }
        $tHrow.append(ths);

        // add class
        $tHrow.find("th").each(function(index) {
            $(this).addClass("col" + index);
        });

        $previewTable.empty().append($tHead, $tbody);
        $previewTable.closest(".datasetTbodyWrap").scrollTop(0);
        loadArgs.setOriginalTypedColumns(getColumnHeaders());

        if (loadArgs.getFormat() === "CSV") {
            initialSuggest();
        }

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
            $("#lineDelim").parent().addClass("xc-hidden");
            $quote.closest(".row").addClass("xc-hidden");
            $("#dsForm-skipRows").closest(".row").addClass("xc-hidden");
            $form.find(".advanceSection").addClass("xc-hidden");

        } else {
            $genLineNumCheckBox.find(".checkbox").removeClass("checked");
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

    function getJSONTable(datas, skipRows) {
        var json = parseJSONData(datas);
        if (json == null) {
            // error case
            return;
        }
        json = json.splice(skipRows);

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
                        errorHandler(getParseJSONError());
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
            errorHandler(getParseJSONError());
            return null;
        }

        var string = "[" + record.join(",") + "]";
        var json;

        try {
            json = $.parseJSON(string);
        } catch (error) {
            console.error(error);
            errorHandler(getParseJSONError());
            return null;
        }

        return json;
    }

    function getParseError(format, suggest) {
        return xcHelper.replaceMsg(DSFormTStr.ParseError, {
            format: format,
            suggest: '<span class="suggest" data-format="CSV">' +
                        suggest +
                    '</span>'
        });
    }

    function getParseJSONError() {
        return getParseError(formatMap.JSON, formatMap.CSV);
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
        var colGrab = colGrabTemplate;
        var isEditable = false;
        if (loadArgs.getFormat() === formatMap.CSV) {
            isEditable = true;
        }
        // when has header
        if (loadArgs.useHeader()) {
            thead +=
                '<th class="rowNumHead">' +
                    '<div class="header"></div>' +
                '</th>' +
                parseTdHelper(datas[0], delimiter, true, isEditable);
        } else {
            thead +=
               '<th class="rowNumHead">' +
                    '<div class="header"></div>' +
                '</th>';

            for (var i = 0; i < tdLen - 1; i++) {
                if (isEditable) {
                    thead += '<th class="editable" data-type="string">' +
                            '<div class="header type-string">' +
                                colGrab +
                                '<div class="flexContainer flexRow">' +
                                    '<div class="flexWrap flex-left" ' +
                                    'data-toggle="tooltip" ' +
                                    'data-container="body" ' +
                                    'data-placement="top" ' +
                                    'data-original-title="' +
                                    xcHelper.capitalize(ColumnType.string) +
                                    '<br>' + DSTStr.ClickChange + '">' +
                                        '<span class="iconHidden"></span>' +
                                        '<span class="type icon"></span>' +
                                        '<div class="dropdownBox"></div>' +
                                    '</div>' +
                                    '<div class="flexWrap flex-mid">' +
                                        '<input spellcheck="false" ' +
                                        'class="text tooltipOverflow ' +
                                        'editableHead th col' + i +
                                        '" value="column' + i +
                                        '" data-original-title="column' + i +
                                        '" data-container="body" data-toggle="tooltip">' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                            '</th>';
                } else {
                    thead +=
                        '<th>' +
                            '<div class="header">' +
                                colGrab +
                                '<div class="text">column' + i + '</div>' +
                            '</div>' +
                        '</th>';
                }

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

        if (rowsToSkip > 0 && rowsToSkip >= res.length) {
            errorHandler(DSTStr.SkipRowsError);
            return null;
        }

        res = res.slice(rowsToSkip);

        return res;
    }

    function parseTdHelper(data, strToDelimit, isTh, isEditable) {
        var hasQuote = false;
        var hasBackSlash = false;
        var dels = strToDelimit.split("");
        var delLen = dels.length;
        var quote = loadArgs.getQuote();

        var hasDelimiter = (delLen !== 0);
        var colGrab = hasDelimiter ? colGrabTemplate : "";
        var html;
        if (isEditable) {
            html = isTh ? '<th class="editable" data-type="string">' +
                    '<div class="header type-string">' +
                    colGrab +
                    '<div class="flexContainer flexRow">' +
                                    '<div class="flexWrap flex-left" ' +
                                    'data-toggle="tooltip" ' +
                                    'data-container="body" ' +
                                    'data-placement="top" ' +
                                    'data-original-title="' +
                                    xcHelper.capitalize(ColumnType.string) +
                                    '<br>' + DSTStr.ClickChange + '">' +
                                    '<span class="iconHidden"></span>' +
                                        '<span class="type icon"></span>' +
                                        '<div class="dropdownBox"></div>' +
                                    '</div>' +
                                    '<div class="flexWrap flex-mid">' +
                                        '<input spellcheck="false" ' +
                                        'class="text cell tooltipOverflow ' +
                                        'editableHead th' +
                                        '" value="' : '<td class="cell"><div class="innerCell">';
        } else {
            html = isTh ? '<th><div class="header">' + colGrab +
                            '<div class="text cell">'
                            : '<td class="cell"><div class="innerCell">';
        }

        var dataLen = data.length;
        var rawStrLimit = 1000; // max number of characters in undelimited column
        var maxColumns = 1000; // max number of columns
        var colStrLimit = 250; // max number of characters in delimited column
        var i = 0;
        var d;
        var tdData = [];
        var val;
        var blankThCount = 0;

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

                    val = tdData.join("");
                    if (isTh && !val) {
                        blankThCount++;
                        val = "column" + blankThCount;
                    }
                    html += val;
                    tdData = [];
                    // skip delimiter
                    if (hiddenStrLen) {
                        html += "<span class='truncMessage'>...(" +
                                xcHelper.numToStr(hiddenStrLen) + " " +
                                TblTStr.Truncate + ")</span>";
                    }
                    if (isTh) {
                        if (isEditable) {
                            html += '"></div></div></div></th>' +
                                '<th class="editable" data-type="string">' +
                                    '<div class="header type-string">' +
                                        colGrab +
                                '<div class="flexContainer flexRow">' +
                                    '<div class="flexWrap flex-left" ' +
                                    'data-toggle="tooltip" ' +
                                    'data-container="body" ' +
                                    'data-placement="top" ' +
                                    'data-original-title="' +
                                    xcHelper.capitalize(ColumnType.string) +
                                    '<br>' + DSTStr.ClickChange + '">' +
                                    '<span class="iconHidden"></span>' +
                                        '<span class="type icon"></span>' +
                                        '<div class="dropdownBox"></div>' +
                                    '</div>' +
                                    '<div class="flexWrap flex-mid">' +
                                        '<input spellcheck="false" ' +
                                        'class="text cell tooltipOverflow ' +
                                        'editableHead th' +
                                        '" value="';
                        } else {
                            html += '</div></div></th>' +
                                '<th>' +
                                    '<div class="header">' +
                                        colGrab +
                                        '<div class="text cell">';
                        }
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
                        tdData.push(xcHelper.escapeDblQuoteForHTML(xcHelper.escapeHTMLSpecialChar(d)));
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
                if (isEditable && isTh) {
                    html += xcHelper.escapeDblQuoteForHTML(xcHelper.escapeHTMLSpecialChar(d));
                } else {
                    html += '<span class="' + cellClass + '">' +
                            xcHelper.escapeHTMLSpecialChar(d) +
                        '</span>';
                }


            }
            var lenDiff = data.length - dataLen;
            if (lenDiff > 0) {
                html += "<span class='truncMessage'>...(" +
                        xcHelper.numToStr(lenDiff) + " " +
                        TblTStr.Truncate + ")</span>";
            }
        }

        if (isTh) {
            if (isEditable) {
                html += '"></div></div></div></th>';
            } else {
                html += '</div></div></th>';
            }

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
        var $ths = $previewTable.find("th");
        var invalidHeaders = [];
        headers.forEach(function(header, i) {
            var error = xcHelper.validateColName(header.colName);
            if (error) {
                invalidHeaders.push({
                    text: invalidHeadersConversion(header, error),
                    index: i,
                    error: error
                });
                $ths.eq(i + 1).find(".text").addClass("error");
            }
        });

        if (invalidHeaders.length === 0) {
            return checkBulkDuplicateNames(headers);
        }

        var deferred = jQuery.Deferred();

        var msg;
        if (loadArgs.getFormat() === formatMap.CSV) {
            msg = '<span class="tableTitle">' + DSTStr.DetectInvalidColMsgFix +
                  ':</span>';
        } else {
            msg = '<span class="tableTitle">' + DSTStr.DetectInvalidColMsg +
                  ':</span>';
        }

        var table = '<div id="invalidDSColTable">' + msg +
        '<div class="row header">' +
        '<span class="colNum">No.</span><span class="colName">Name</span></div>';
        invalidHeaders.forEach(function(err) {
            table += '<div class="row">' +
                        '<span class="colNum">' + (err.index + 1) +
                        '</span>' +
                        '<span class="colName">' + err.text + '</span>' +
                    '</div>';
        });
        table += '</div>';

        if (loadArgs.getFormat() === formatMap.CSV) {
            Alert.show({
                "title": DSTStr.DetectInvalidCol,
                "instr": DSTStr.DetectInvalidColInstrForce,
                "msgTemplate": table,
                "onCancel": function() {
                    xcHelper.enableSubmit($form.find(".confirm"));
                    deferred.reject();
                },
                "buttons": [{
                    name: CommonTxtTstr.FIX,
                    func: function() {
                        xcHelper.enableSubmit($form.find(".confirm"));
                        deferred.reject();
                    }
                }]
            });
        } else {
            Alert.show({
                "title": DSTStr.DetectInvalidCol,
                "instr": DSTStr.DetectInvalidColInstr,
                "msgTemplate": table,
                "onConfirm": deferred.resolve,
                "onCancel": function() {
                    xcHelper.enableSubmit($form.find(".confirm"));
                    deferred.reject();
                }
            });
        }

        return deferred.promise();
    }

    function invalidHeadersConversion(header, error) {
        var text = '<span>';
        if (error === ColTStr.RenameStartNum) {
            text += '<b class="highlight">' + header.colName.slice(0, 1) +
                    '</b>' + header.colName.slice(1);

        } else if (error === ErrTStr.NoEmpty) {
            text += '<span class="empty">' + CommonTxtTstr.empty + '</span>';
        } else {
            text += Array.from(header.colName).map(function(ch) {
                return xcHelper.hasInvalidCharInCol(ch)
                       ? '<b class="highlight">' + ch + '</b>'
                       : ch;
            }).join("");
        }

        text += '</span>';
        return text;
    }

    function checkIndividualDuplicateName(name, index) {
        var dupFound = false;
        $previewTable.find("th:not(.rowNumHead)").each(function(i) {
            if ((i + 1) === index) {
                return true;
            }
            var $th = $(this);
            var colName = $th.find(".text").val();
            if (colName === name) {
                dupFound = true;
                return false;
            }

        });
        return dupFound;
    }

    function checkBulkDuplicateNames(headers) {
        var nameMap = {};
        for (var i = 0; i < headers.length; i++) {
            if (!nameMap.hasOwnProperty(headers[i].colName)) {
                nameMap[headers[i].colName] = [i + 1];
            } else {
                nameMap[headers[i].colName].push(i + 1);
            }
        }
        var errorNames = [];
        var $ths = $previewTable.find("th");
        for (var name in nameMap) {
            if (nameMap[name].length > 1) {
                errorNames.push({colName: name, indices: nameMap[name]});
                for (var i = 1; i < nameMap[name].length; i++) {
                    $ths.eq(nameMap[name][i]).find(".text").addClass("error");
                }
            }
        }
        if (!errorNames.length) {
            return PromiseHelper.resolve();
        }
        var deferred = jQuery.Deferred();

        errorNames.sort(function(a, b) {
            if (a.indices[0] >= b.indices[0]) {
                return 1;
            } else {
                return -1;
            }
        });

        var table = '<div id="duplicateDSColTable"><span class="tableTitle">' +
        ErrTStr.DuplicateColNames + ':</span><div class="row header">' +
        '<span class="colName">Name</span><span class="colNums">Column Nos.' +
        '</span></div>';
        errorNames.forEach(function(name) {
            table += '<div class="row">' +
                        '<span class="colName">' + name.colName +
                        '</span>' +
                        '<span class="colNums">' + name.indices.join(",") +
                        '</span>' +
                    '</div>';
        });
        table += '</div>';

        Alert.show({
            "title": DSTStr.DetectInvalidCol,
            "instr": DSTStr.DetectInvalidColInstrForce,
            "msgTemplate": table,
            "onConfirm": deferred.resolve,
            "onCancel": function() {
                xcHelper.enableSubmit($form.find(".confirm"));
                deferred.reject();
            },
            "buttons": [{
                name: CommonTxtTstr.FIX,
                func: function() {
                    xcHelper.enableSubmit($form.find(".confirm"));
                    deferred.reject();
                }
            }]
        });

        return deferred.promise();
    }

    function hasTypedColumnChange(currTypedCols) {
        prevTypedCols = loadArgs.getOriginalTypedColumns();
        for (var i = 0; i < currTypedCols.length; i++) {
            if (!prevTypedCols[i]) {
                return true;
            }
            if ((currTypedCols[i].colName !== prevTypedCols[i].colName) ||
                (currTypedCols[i].colType !== prevTypedCols[i].colType)) {
                return true;
            }
        }
        return false;
    }

    function showProgressCircle(txId) {
        var $waitSection = $previewWrap.find(".waitSection");
        $waitSection.addClass("hasUdf");
        var withText = true;
        var progressAreaHtml = xcHelper.getLockIconHtml(txId, 0, withText);
        $waitSection.find(".progressSection").html(progressAreaHtml);
        var progressCircle = new ProgressCircle(txId, 0, withText);
        $waitSection.find(".cancelLoad").data("progresscircle",
                                                progressCircle);
    }

    function restoreTypedColumns(typedColumns) {
        typedColumns = typedColumns || [];
        var types = [];
        var colNames = [];
        typedColumns.forEach(function(col) {
            types.push(col.colType);
            colNames.push(col.colName);
        });
        changeColumnHeaders(types, colNames);
    }

    // currently only being used for CSV
    function initialSuggest() {
        var $tbody = $previewTable.find("tbody").clone(true);
        $tbody.find("tr:gt(17)").remove();
        $tbody.find(".lineMarker").remove();
        var recTypes = [];
        // XXX temporary disable it becuase of backend bug
        // $tbody.find("tr").eq(0).find("td").each(function(colNum) {
        //     if (colNum >= gMaxDSColsSpec) {
        //         return false;
        //     }
        //     recTypes[colNum] = suggestType($tbody, colNum + 1);
        // });
        // changeColumnHeaders(recTypes);
    }

    function changeColumnHeaders(types, colNames) {
        types = types || [];
        colNames = colNames || [];
        $previewTable.find("th:gt(0)").each(function(colNum) {
            if (colNum >= gMaxDSColsSpec) {
                return false;
            }
            var type = types[colNum];
            var name = colNames[colNum];
            var $th = $(this);
            var $header = $th.find(".header");
            if (type) {
                $header.removeClass()
                        .addClass("header type-" + type);
                $th.data("type", type);
                xcTooltip.changeText($th.find(".flex-left"),
                                    xcHelper.capitalize(type) +
                                    '<br>' + DSTStr.ClickChange);
            }
            if (name) {
                var $input = $header.find("input");
                $input.val(name);
                xcTooltip.changeText($input, name);
            }
        });
    }

    function suggestType($tbody, colNum) {
        var datas = [];
        var val;

        $tbody.find("tr").find("td:nth-child(" + colNum + ")").each(function() {
            val = $(this).text();
            datas.push(val);
        });

        return xcSuggest.suggestType(datas);
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
        DSPreview.__testOnly__.checkBulkDuplicateNames = checkBulkDuplicateNames;


        DSPreview.__testOnly__.resetForm = resetForm;
        DSPreview.__testOnly__.restoreForm = restoreForm;
        DSPreview.__testOnly__.getNameFromPath = getNameFromPath;
        DSPreview.__testOnly__.getSkipRows = getSkipRows;
        DSPreview.__testOnly__.applyFieldDelim = applyFieldDelim;
        DSPreview.__testOnly__.applyLineDelim = applyLineDelim;
        DSPreview.__testOnly__.applyQuote = applyQuote;
        DSPreview.__testOnly__.toggleFormat = toggleFormat;
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
                "id": previewId,
                "tableName": tableName
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

/*
 * Module for data preview
 */
window.DSPreview = (function($, DSPreview) {
    var $previewCard;   // $("#dsForm-preview");
    var $previewWrap;    // $("#dsPreviewWrap")
    var $previewTable;  // $("#previewTable")
    var $previewTableWrap; //$("dsPreviewTableWrap")

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
    var componentDBFormat;

    var tableName = null;
    var rawData = null;
    var previewOffset = 0;

    var highlighter = "";

    var loadArgs = new DSFormController();
    var detectArgs = {};

    // UI cache
    var lastUDFModule = null;
    var lastUDFFunc = null;
    var backToFormCard = false;
    var rowsToFetch = 40;
    var previewId;
    var fileBrowserPath = "/";

    // constant
    var defaultRowsToFech = 40;
    var minRowsToShow = 20;
    var numBytesRequest = 15000;
    var maxBytesRequest = 500000;
    var defaultModule = '/globaludf/default';
    var excelModule = defaultModule;
    var excelFunc = "openExcel";
    var parquetModule = defaultModule;
    var parquetFunc = "parseParquet";
    var colGrabTemplate = '<div class="colGrab" data-sizedtoheader="false"></div>';
    var oldPreviewError = "old preview error";

    var formatMap = {
        "JSON": "JSON",
        "CSV": "CSV",
        "TEXT": "TEXT",
        "EXCEL": "Excel",
        "UDF": "UDF",
        "XML": "XML",
        "PARQUET": "PARQUET",
        "PARQUETFILE": "PARQUETFILE",
        "DATABASE": "DATABASE",
    };

    DSPreview.setup = function() {
        $previewCard = $("#dsForm-preview");
        $previewWrap = $("#dsPreviewWrap");
        $previewTable = $("#previewTable");
        $previewTableWrap = $("#dsPreviewTableWrap");
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
        componentDBFormat = createDatabaseFormat({
            dsnID: 'dbArgs-dsnList',
            sqlID: 'dsForm-dbSQL',
            containerID: 'importDataForm-content',
            parseJSONDataFunc: parseJSONData
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
                    hideHeadersWarning();
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
            hideHeadersWarning();
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
        var menuHepler = new MenuHelper($("#preview-file"), {
            onSelect: function($li) {
                var index;
                if ($li.hasClass("mainPath") && !$li.hasClass("singlePath")) {
                    index = Number($li.data("index"));
                    if ($li.hasClass("collapse")) {
                        // expand case
                        previewFileSelect(index);
                        $li.removeClass("collapse");
                    } else {
                        $("#preview-file").find('.subPathList[data-index="' + index + '"]').empty();
                        $li.addClass("collapse");
                    }
                    menuHepler.showOrHideScrollers();
                    return true; // keep the menu open
                } else if ($li.hasClass("hint")) {
                    return true;
                } else {
                    $("#preview-file").find("li.active").removeClass("active");
                    $li.addClass("active");
                    var path = $li.data("path");
                    if ($li.hasClass("mainPath")) {
                        index = Number($li.data("index"));
                    } else {
                        var $subPathList = $li.closest(".subPathList");
                        index = Number($subPathList.data("index"));
                    }
                    changePreviewFile(index, path);
                }
            },
            onOpen: setActivePreviewFile,
            "container": "#dsForm-preview",
            "bounds": "#dsForm-preview",
            "bottomPadding": 5
        }).setupListeners();

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

        $("#importDataForm-content").on("click", ".inputPart .row label", function() {
            // copies filepath to clipboard
            var $filepathLabel = $(this);
            var value = $filepathLabel.attr("data-original-title") || $filepathLabel.text();
            xcHelper.copyToClipboard(value);

            $filepathLabel.parent().addClass("copiableText");
            setTimeout(function() {
                $filepathLabel.parent().removeClass("copiableText");
            }, 1800);
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
            var moduleName = $("#udfArgs-moduleList input").val();
            var funcName = $("#udfArgs-funcList input").val();
            var pathIndex = loadArgs.getPreivewIndex();
            var path = loadArgs.files[pathIndex].path;
            JupyterPanel.autofillImportUdfModal(loadArgs.targetName,
                                                path, false,
                                                moduleName, funcName);
        });
    }

    /* restore: boolean, set to true if restoring after an error
       options:
        pattern: pattern of the path (can only be one path, not supported yet)
                 should be generated by xcHelper.getFileNamePattern(pattern, isRegex)
    */
    DSPreview.show = function(options, lastPath, restore) {
        xcHelper.enableSubmit($form.find(".confirm"));
        DSForm.switchView(DSForm.View.Preview);
        resetPreviewFile();
        hideHeadersWarning();

        if (lastPath != null) {
            fileBrowserPath = lastPath;
            backToFormCard = false;
        } else {
            backToFormCard = true;
        }

        resetForm();

        if (restore) {
            restoreForm(options);
        } else {
            loadArgs.set(options);
        }

        setDefaultDSName();

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

        hideDataFormatsByTarget(loadArgs.getTargetName());

        setTargetInfo(loadArgs.getTargetName());
        setPreviewPaths();

        return previewData({
            "udfModule": module,
            "udfFunc": func,
            "isFirstTime": true,
            "typedColumns": typedColumns,
            "isRestore": restore
        });
    };

    DSPreview.update = function(listXdfsObj) {
        var moduleName = $udfModuleList.find("input").data("module");
        var funcName = $udfFuncList.find("input").val();

        listUDFSection(listXdfsObj)
        .always(function() {
            selectUDF(moduleName, funcName);
        });
    };

    DSPreview.clear = function() {
        if ($("#dsForm-preview").hasClass("xc-hidden")) {
            // when preview table not shows up
            return PromiseHelper.resolve(null);
        } else {
            return clearPreviewTable(tableName);
        }
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
                csvArgChange();
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
            csvArgChange();
            getPreviewTable();
        });

        // skip rows
        $("#dsForm-skipRows").on("input", function() {
            csvArgChange();
            getPreviewTable();
        });

        // back button
        $form.on("click", ".cancel", function() {
            var targetName = loadArgs.getTargetName();
            if ($previewWrap.find(".cancelLoad").length) {
                $previewWrap.find(".cancelLoad").click();
                // cancels udf load
            }
            resetForm();
            clearPreviewTable(tableName);
            if (backToFormCard) {
                DSForm.show({"noReset": true});
            } else {
                // XXX changet to support multiple of paths
                FileBrowser.show(targetName, fileBrowserPath, true);
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
            var pathIndex = loadArgs.getPreivewIndex();
            var path = loadArgs.files[pathIndex].path;
            JupyterPanel.autofillImportUdfModal(loadArgs.targetName,
                                                path, true);
        });
        // dropdown list for udf modules and function names
        var moduleMenuHelper = new MenuHelper($udfModuleList, {
            "onSelect": function($li) {
                var module = $li.data("module");
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
            var $checkbox = $part.find(".checkbox");

            if ($checkbox.hasClass("checked")) {
                $checkbox.removeClass("checked");
                $part.removeClass("active");
            } else {
                $checkbox.addClass("checked");
                $part.addClass("active");
                $part.find("input").focus();
            }
            addAdvancedRows();
        });

        var $fileName = $advanceSection.find(".fileName");
        $fileName.on("input", "input", function() {
            var text = $(this).val().trim();
            $previewTable.find(".extra.fileName .text").text(text);
        });

        var $rowNumber = $advanceSection.find(".rowNumber");
        $rowNumber.on("input", "input", function() {
            var text = $(this).val().trim();
            $previewTable.find(".extra.rowNumber .text").text(text);
        });

        $advanceSection.find(".performance").on("click", ".checkboxSection", function() {
            $(this).find(".checkbox").toggleClass("checked");
        });

        xcHelper.optionButtonEvent($advanceSection);
    }

    function initParquetForm(path, targetName) {
        var $parquetSection = $form.find(".parquetSection");
        var $partitionList = $parquetSection.find(".partitionList");
        var $availableColList = $parquetSection.find(".availableColSection " +
                                  ".colList");
        var $selectedColList = $parquetSection.find(".selectedColSection " +
                                 ".colList");
        $partitionList.empty();
        $availableColList.empty();
        $selectedColList.empty();
        var deferred = PromiseHelper.deferred();
        getParquetInfo(path, targetName)
        .then(function(ret) {
            for (var schemaKey in ret.schema) {
                var dfType = DfFieldTypeTFromStr[ret.schema[schemaKey]
                                                    .xcalarType];
                var xcTypeIcon = "xi-unknown";
                if (dfType) {
                    xcTypeIcon = xcHelper.getColTypeIcon(dfType);
                } else {
                    switch (ret.schema[schemaKey].xcalarType) {
                        case ("DfObject"):
                            xcTypeIcon = "xi-object";
                            break;
                        case ("DfArray"):
                            xcTypeIcon = "xi-array";
                            break;
                    }
                }
                $availableColList.append(
                  '<li>' +
                  '  <div class="iconWrap">' +
                  '    <i class="icon ' + xcTypeIcon + '"></i>' +
                  '  </div>' +
                  '  <span class="colName">' + schemaKey + '</span>' +
                  '  <i class="icon xi-plus"></i>' +
                  '</li>'
                );
            }
            ret.partitionKeys.map(function(elem) {
                $partitionList.append(
                '<div class="row">' +
                '  <label>' + elem + ':</label>' +
                '  <div class="inputWrap">' +
                '    <input class="large" type="text" value="*">' +
                '  </div>' +
                '</div>');
                var $li = $availableColList.find("li").filter(function() {
                    return $(this).find(".colName").text() === elem;
                });
                $li.addClass("mustSelect").find(".xi-plus").click();
                $li.find(".xi-minus").remove();
                xcTooltip.add($li, {
                    title: TooltipTStr.ParquetCannotRemovePartition
                });
            });
            deferred.resolve();

        })
        .fail(function(error) {
            var errorS = {
                error: "The dataset that you have selected cannot be " +
                             "parsed as a parquet dataset. Click the " +
                             "BACK button and select another folder."
            };
            try {
                errorS.log = error.output.errStr;
            } catch (e) {
            }

            Alert.error("Error Parsing Parquet Dataset", errorS, {
                buttons: [{
                    name: "BACK",
                    className: "confirm",
                    func: function() {
                        $form.find(".cancel").click();
                    }
                }]
            });
            deferred.reject();
        });
        return deferred.promise();
    }

    function getParquetInfo(path, targetName) {
        var deferred = PromiseHelper.deferred();
        var appName = "XcalarParquet";
        var pathToParquetDataset = path;
        var args = {
            func: "getInfo",
            targetName: targetName,
            path: pathToParquetDataset
        };
        XcalarAppExecute(appName, false, JSON.stringify(args))
        .then(function(result) {
            var outStr = result.outStr;
            var appResult = JSON.parse(JSON.parse(outStr)[0][0]);
            if (!appResult.validParquet) {
                // TODO handle error
                deferred.reject();
            } else {
                deferred.resolve({
                    partitionKeys: appResult.partitionKeys,
                    schema: appResult.schema
                });
            }
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    function setupParquetSection() {
        $("#fileFormatMenu").find('li[name="PARQUET"]');

        var $parquetSection = $form.find(".parquetSection");
        var $availableColList = $parquetSection.find(".availableColSection " +
                                  ".colList");
        var $selectedColList = $parquetSection.find(".selectedColSection " +
                                 ".colList");
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

        $availableColList.on("click", "li .colName", function() {
            $(this).next(".xi-plus").click();
        });

        $availableColList.on("click", ".xi-plus", function() {
            var $colPill = $(this).closest("li");
            $colPill.remove();
            $selectedColList.append($colPill);
            $colPill.find(".xi-plus").removeClass("xi-plus")
                                      .addClass("xi-minus");
            resetSearch($selectedColList);
        });

        $selectedColList.on("click", "li .colName", function() {
            $(this).next(".xi-minus").click();
        });

        $selectedColList.on("click", ".xi-minus", function() {
            var $colPill = $(this).closest("li");
            $colPill.remove();
            $availableColList.append($colPill);
            $colPill.find(".xi-minus").removeClass("xi-minus")
                                      .addClass("xi-plus");
            resetSearch($availableColList);
        });

        $parquetSection.on("click", ".removeAllCols", function() {
            var $allPills = $selectedColList.find("li:not(.filteredOut)");
            for (var i = 0; i< $allPills.length; i++) {
                $allPills.eq(i).find(".xi-minus").click();
            }
            // TODO handle clearing search
            // TODO only one can be searched at a time. Can't have both filters
        });

        $parquetSection.on("click", ".addAllCols", function() {
            var $allPills = $availableColList.find("li:not(.filteredOut)");
            for (var i = 0; i< $allPills.length; i++) {
                $allPills.eq(i).find(".xi-plus").click();
            }
        });

        function resetSearch($colList) {
            var $lis = $colList.find("li");
            $lis.removeClass("filteredOut");
            $colList.closest(".columnHalf").find(".columnSearch input").val("");
        }

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
        var deferred = PromiseHelper.deferred();

        if (!listXdfsObj) {
            // update python module list
            UDF.list(true)
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
        var displayedModuleName = $udfModuleList.find("li").filter(function() {
                                    return $(this).data("module") === module;
                                }).text() || "";
        $udfModuleList.find("input").data("module", module);
        udfModuleHint.setInput(displayedModuleName);

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

    function getRowsToPreview() {
        return rowsToFetch;
    }

    function addRowsToPreview(extraRowsToAdd) {
        rowsToFetch += extraRowsToAdd;
    }

    function resetForm() {
        $form.find("input").val("");
        $("#dsForm-skipRows").val("0");
        $("#dsForm-excelIndex").val("0");
        $("#dsForm-xPaths").val("");
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

    function restoreForm(options) {
        $form.find("input").not($formatText).val("");
        $form.find(".checkbox.checked").removeClass("checked");

        // dsName
        $form.find(".dsName").eq(0).val(options.dsName);

        // format
        var format = options.format;
        if (format === formatMap.UDF) {
            cacheUDF(options.moduleName, options.funcName);
            resetUdfSection();
        } else if (format === formatMap.EXCEL) {
            $("#dsForm-excelIndex").val(0);
            $("#dsForm-skipRows").val(0);
            if (options.udfQuery) {
                if (options.udfQuery.sheetIndex) {
                    $("#dsForm-excelIndex").val(options.udfQuery.sheetIndex);
                }
                if (options.udfQuery.skipRows) {
                    options.skipRows = options.udfQuery.skipRows;
                    // This gets populated later
                }
            }
        } else if (format === formatMap.XML) {
            $("#dsForm-xPaths").val(options.udfQuery.xPath);
            toggleXMLCheckboxes(options.udfQuery);
            // XML preview don't use UDF
            delete options.moduleName;
            delete options.funcName;
        } else if (format === formatMap.PARQUET) {
            // Restore partitions based on the url
            var partitions = options.files[0].path.split("?")[1].split("&");
            for (var i = 0; i < partitions.length; i++) {
                var value = partitions[i].split("=")[1];
                // partition keys must be in order
                $form.find(".partitionAdvanced .partitionList .row input").eq(i)
                     .val(decodeURIComponent(value));
            }
        } else if (format === formatMap.CSV) {
            // CSV preview don't use UDF
            delete options.moduleName;
            delete options.funcName;
        } else if (format == formatMap.DATABASE) {
            componentDBFormat.restore({
                dsn: options.udfQuery.dsn,
                query: options.udfQuery.query
            });
            delete options.moduleName;
            delete options.funcName;
        }
        // Nothing to do for PARQUET FILE since it's just one thing
        options.format = format;
        loadArgs.set(options);
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
    }

    function submitForm(toCreateTable) {
        var res = validateForm();
        if (res == null) {
            return PromiseHelper.reject("Checking Invalid");
        }

        var deferred = PromiseHelper.deferred();
        var dsNames = res.dsNames;
        var format = res.format;

        var udfModule = res.udfModule;
        var udfFunc = res.udfFunc;
        var udfQuery = res.udfQuery;

        var fieldDelim = res.fieldDelim;
        var lineDelim = res.lineDelim;

        var quote = res.quote;
        var skipRows = res.skipRows;

        var header = loadArgs.useHeader();

        var rowNumName = res.rowNum || "";
        var fileName = res.fileName || "";
        var allowRecordErrors = res.allowRecordErrors || false;
        var allowFileErrors = res.allowFileErrors || false;

        var advancedArgs = {
            rowNumName: rowNumName,
            fileName: fileName,
            allowRecordErrors: allowRecordErrors,
            allowFileErrors: allowFileErrors
        };

        var typedColumns = getColumnHeaders();
        var colLen = toCreateTable
                     ? $previewTable.find("th:not(.rowNumHead)").length
                     : 0;

        cacheUDF(udfModule, udfFunc);
        xcHelper.disableSubmit($form.find('.confirm'));
        // enableSubmit is done during the next showing of the form
        // If the form isn't shown, there's no way it can be submitted
        // anyway
        var dsArgs = {
            "format": format,
            "fieldDelim": fieldDelim,
            "lineDelim": lineDelim,
            "hasHeader": header,
            "moduleName": udfModule,
            "funcName": udfFunc,
            "quoteChar": quote,
            "skipRows": skipRows,
            "udfQuery": udfQuery,
            "advancedArgs": advancedArgs,
        };
        var curPreviewId = previewId;

        invalidHeaderDetection(typedColumns)
        .then(function() {
            return tooManyColAlertHelper(colLen);
        })
        .then(function() {
            return getTypedColumnsList(typedColumns, dsArgs);
        })
        .then(function(typedColumnsList) {
            if (isValidPreviewId(curPreviewId)) {
                FileBrowser.clear();
            }

            return importDataHelper(dsNames, dsArgs, typedColumnsList,
                                    toCreateTable);
        })
        .then(function() {
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getTypedColumnsList(typedColumns, dsArgs) {
        var format = dsArgs.format;
        if (format !== formatMap.CSV) {
            // no cast for other formats
            return PromiseHelper.resolve([]);
        }

        var sourceIndex = loadArgs.getPreivewIndex();
        var prevTypedCols = loadArgs.getOriginalHeaders(sourceIndex);
        typedColumns = normalizeTypedColumns(prevTypedCols, typedColumns);

        var multiDS = loadArgs.multiDS;
        if (!multiDS) {
            return PromiseHelper.resolve([typedColumns]);
        }

        var deferred = PromiseHelper.deferred();
        var typedColumnsList = getCacheHeadersList(sourceIndex, typedColumns);

        slowPreviewCheck()
        .then(function() {
            return getTypedColumnsListHelper(typedColumnsList, dsArgs);
        })
        .then(function() {
            deferred.resolve(typedColumnsList);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function normalizeTypedColumns(prevTypedCols, typedColumns) {
        if (!hasTypedColumnChange(prevTypedCols, typedColumns)) {
            return null;
        }
        return typedColumns;
    }

    function hasTypedColumnChange(prevTypedCols, currTypedCols) {
        prevTypedCols = prevTypedCols || [];
        currTypedCols = currTypedCols || [];
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

    function getCacheHeadersList(sourceIndex, typedColumns) {
        var typedColumnsList = [];
        typedColumnsList[sourceIndex] = typedColumns;
        var cachedHeaders = loadArgs.headersList;
        for (var i = 0; i < cachedHeaders.length; i++) {
            if (i !== sourceIndex && cachedHeaders[i] != null) {
                var originalHeaders = loadArgs.getOriginalHeaders(i);
                typedColumnsList[i] = normalizeTypedColumns(originalHeaders, cachedHeaders[i]);
            }
        }
        return typedColumnsList;
    }

    function slowPreviewCheck() {
        var deferred = PromiseHelper.deferred();
        var previewLimit = 10;
        var targetName = loadArgs.getTargetName();
        var shouldAlert = true;
        var msg;

        if (loadArgs.files.length > previewLimit) {
            msg = xcHelper.replaceMsg(DSFormTStr.TooManyPreview, {
                num: loadArgs.files.length
            });
        } else if (DSTargetManager.isSlowPreviewTarget(targetName)) {
            msg = xcHelper.replaceMsg(DSFormTStr.SlowTargetPreview, {
                target: targetName
            });
        } else {
            shouldAlert = false;
        }

        if (shouldAlert) {
            Alert.show({
                title: DSFormTStr.ImportMultiple,
                msg: msg,
                onCancel: function() {
                    xcHelper.enableSubmit($form.find(".confirm"));
                    deferred.reject();
                },
                onConfirm: function() {
                    deferred.resolve();
                }
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise();
    }

    function getTypedColumnsListHelper(typedColumnsList, dsArgs) {
        var deferred = PromiseHelper.deferred();
        var files = loadArgs.files;
        var targetName = loadArgs.getTargetName();
        var promises = [];

        for (var i = 0; i < files.length; i++) {
            if (typedColumnsList[i] !== undefined) {
                // null is a valid case
                continue;
            }

            var def = autoDetectSourceHeaderTypes(files[i], targetName, dsArgs,
                                                  typedColumnsList, i);
            promises.push(def);
        }

        PromiseHelper.when.apply(this, promises)
        .always(function() {
            deferred.resolve(typedColumnsList); // always resolve
        });

        return deferred.promise();
    }

    function autoDetectSourceHeaderTypes(file, targetName, dsArgs, typedColumnsList, index) {
        var deferred = PromiseHelper.deferred();
        // fetch data
        var args = {
            targetName: targetName,
            path: file.path,
        };
        XcalarPreview(args, numBytesRequest, 0)
        .then(function(res) {
            if (res && res.buffer) {
                typedColumnsList[index] = getTypedColumnsFromData(res.buffer, dsArgs, file);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.error(error);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    function getTypedColumnsFromData(data, dsArgs, file) {
        var lineDelim = dsArgs.lineDelim;
        var fieldDelim = dsArgs.fieldDelim;
        var hasHeader = dsArgs.hasHeader;
        var quoteChar = dsArgs.quoteChar;

        try {
            var strippedData = xcHelper.replaceInsideQuote(data, quoteChar);
            var rows = strippedData.split(lineDelim);
            var originalHeaders = [];
            var headers = [];

            if (hasHeader) {
                var header = rows[0];
                rows = rows.slice(1);
                originalHeaders = header.split(fieldDelim).filter(function(name, index) {
                    return name || autoHeaderName(index);
                });
                headers = getValidNameSet(originalHeaders);
            }

            var columns = [];
            rows.forEach(function(row) {
                var splits = row.split(fieldDelim);
                splits.forEach(function(cell, colIndex) {
                    columns[colIndex] = columns[colIndex] || [];
                    columns[colIndex].push(cell);
                });
            });

            if (columns.length > gMaxDSColsSpec) {
                // auto detect case
                file.autoCSV = true;
                return null;
            }

            var columTypes = columns.map(function(datas) {
                return xcSuggest.suggestType(datas);
            });
            var originalTypedColumns = [];
            var typedColumns = [];

            columTypes.forEach(function(colType, index) {
                var originalColName = originalHeaders[index] || autoHeaderName(index);
                var colName = headers[index] || originalColName;

                typedColumns.push({
                    colName: colName,
                    colType: colType
                });

                originalTypedColumns.push({
                    colName: originalColName,
                    colType: ColumnType.string
                });
            });

            return normalizeTypedColumns(originalTypedColumns, typedColumns);
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    function importDataHelper(dsNames, dsArgs, typedColumnsList, toCreateTable) {
        var multiDS = loadArgs.multiDS;
        var files = loadArgs.files;
        var targetName = loadArgs.getTargetName();
        var promises = [];
        var getSource = function(file) {
            if (DSTargetManager.isSparkParquet(targetName)) {
                var partitionValues = {};
                var partitions = $(".parquetSection .partitionAdvanced .row");
                for (var i = 0; i < partitions.length; i++) {
                    var label = partitions.eq(i).find("label").text();
                    label = label.substring(0, label.length-1);
                    partitionValues[label] = partitions.eq(i).find("input")
                                                       .val();
                }
                file.path = file.path.split("?")[0] +
                            xcHelper.formatAsUrl(partitionValues);
            }
            return {
                targetName: targetName,
                path: file.path,
                recursive: file.recursive,
                fileNamePattern: file.fileNamePattern
            };
        };

        var getAutoDetectUDFArgs = function(dsArgs, file) {
            if (dsArgs.format !== formatMap.CSV || !file.autoCSV) {
                return null;
            }

            return {
                moduleName: defaultModule,
                funcName: "standardizeColumnNamesAndTypes",
                udfQuery: {
                    withHeader: dsArgs.hasHeader,
                    skipRows: dsArgs.skipRows,
                    field: dsArgs.fieldDelim,
                    record: dsArgs.lineDelim,
                    quote: dsArgs.quoteChar,
                    allowMixed: false
                }
            };
        };

        if (multiDS) {
            files.forEach(function(file, index) {
                // need {} to create a different copy than poinArgs
                var source = getSource(file);
                var extraUDFArgs = getAutoDetectUDFArgs(dsArgs, file);
                var args = $.extend({}, dsArgs, {
                    "name": dsNames[index],
                    "sources": [source],
                    "typedColumns": typedColumnsList[index]
                }, extraUDFArgs);
                promises.push(DS.import(args, {
                    "createTable": toCreateTable
                }));
            });
            return PromiseHelper.when.apply(this. promises);
        } else {
            var sources = files.map(getSource);
            var previewIndex = loadArgs.getPreivewIndex();
            var extraUDFArgs = getAutoDetectUDFArgs(dsArgs, files[previewIndex]);
            var multiLoadArgs = $.extend(dsArgs, {
                "name": dsNames[0],
                "sources": sources,
                "typedColumns": typedColumnsList[0]
            }, extraUDFArgs);
            var dsToReplace = files[0].dsToReplace || null;
            return DS.import(multiLoadArgs, {
                "createTable": toCreateTable,
                "dsToReplace": dsToReplace
            });
        }
    }

    function tooManyColAlertHelper(colLen) {
        if (colLen < gMaxColToPull) {
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();
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

    function getColumnHeaders(isCSV) {
        var headers = [];
        var $ths = $previewTable.find("th:not(.rowNumHead):not(.extra)");
        if (isCSV || loadArgs.getFormat() === formatMap.CSV) {
            $ths.each(function() {
                var $th = $(this);
                var type = $th.data("type") || "string";
                var header = {
                    colType: type,
                    colName: $th.find(".text").val()
                };
                headers.push(header);
            });
        } else {
            $ths.each(function() {
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
        var files = loadArgs.files;

        // validate name
        $form.find(".dsName").each(function(index) {
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
                        // dsId is the same as dsName
                        var dsToReplace = files[index].dsToReplace || null;
                        if (dsToReplace &&
                            name === xcHelper.parseDSName(dsToReplace).dsName) {
                            return false;
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

        udfModule = $moduleInput.data("module");
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

    function validateExcelArgs() {
        var excelIndex = parseInt($("#dsForm-excelIndex").val());
        var skipRows = parseInt($("#dsForm-skipRows").val());
        var isValid = xcHelper.validate([
            {
                "$ele": $("#dsForm-skipRows"),
                "error": ErrTStr.NoEmpty,
                "formMode": true,
                "check": function() {
                    return $("#dsForm-skipRows").val().trim().length === 0;
                }
            },
            {
                "$ele": $("#dsForm-skipRows"),
                "error": ErrTStr.NoNegativeNumber,
                "formMode": true,
                "check": function() {
                    return skipRows < 0;
                }
            },
            {
                "$ele": $("#dsForm-excelIndex"),
                "error": ErrTStr.NoEmpty,
                "formMode": true,
                "check": function() {
                    return $("#dsForm-excelIndex").val().trim().length === 0;
                }
            },
            {
                "$ele": $("#dsForm-excelIndex"),
                "error": ErrTStr.NoNegativeNumber,
                "formMode": true,
                "check": function() {
                    return excelIndex < 0;
                }
            }
        ]);

        if (!isValid) {
            return null;
        }

        return {
            skipRows: skipRows,
            sheetIndex: excelIndex,
            withHeader: loadArgs.useHeader()
        };
    }

    function validateXMLArgs() {
        var $xPath = $("#dsForm-xPaths");
        var xPath = $xPath.val().trim();
        var isValid = xcHelper.validate([
            {
                "$ele": $xPath,
                "error": ErrTStr.NoEmpty,
                "formMode": true,
                "check": function() {
                    return xPath.length === 0;
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
            xPath: xPath,
            matchedPath: matchedXPath,
            withPath: elementXPath
        };
    }

    function validateParquetArgs() {
        var $parquetSection = $form.find(".parquetSection");
        var $selectedColList = $parquetSection.find(".selectedColSection .colList");
        var $cols = $selectedColList.find("li");
        var names = [];
        var hasNonPartition = false;
        for (var i = 0; i < $cols.length; i++) {
            if (!$cols.eq(i).hasClass("mustSelect")) {
                hasNonPartition = true;
            }
            names.push($cols.eq(i).find(".colName").text());
        }

        if (!hasNonPartition) {
            xcHelper.validate([{
                "$ele": $selectedColList,
                "error": ErrTStr.ParquetMustSelectNonPartitionCol,
                "formMode": true,
                "check": function() {
                    return true;
                }
            }]);
            return null;
        }

        var isValid = true;

        var $inputs = $parquetSection.find(".partitionList input");
        for (var i = 0; i < $inputs.length; i++) {
            isValid = xcHelper.validate([{
                "$ele": $inputs.eq(i),
                "error": ErrTStr.NoEmpty,
                "formMode": true,
                "check": function() {
                    return $inputs.eq(i).val().trim().length === 0;
                }
            }]);

            if (!isValid) {
                return null;
            }
        }

        return {columns: names};
    }

    function validateAdvancedArgs() {
        var $advanceSection = $form.find(".advanceSection");
        var $colNames = $("#previewTable .editableHead");
        var colNames = [];

        for (var i = 0; i < $colNames.length; i++) {
            colNames.push($colNames.eq(i).val());
        }

        var validateExtraColumnArg = function($ele) {
            var isValid = true;
            if ($ele.find(".checkbox").hasClass("checked")) {
                isValid = xcHelper.validate([{
                    $ele: $ele.find("input"),
                    check: function(val) {
                        return (xcHelper.validateColName(val) != null);
                    },
                    onErr: function() {
                        if (!$advanceSection.hasClass("active")) {
                            $advanceSection.find(".listWrap").click();
                        }
                    },
                    error: ErrTStr.InvalidColName,
                    delay: 300 // there is a forceHide event on scroll, so need delay to show the statusbox
                }, {
                    $ele: $ele.find("input"),
                    check: function(val) {
                        if (colNames.indexOf(val) > -1) {
                            return true;
                        } else {
                            colNames.push(val);
                        }
                    },
                    onErr: function() {
                        if (!$advanceSection.hasClass("active")) {
                            $advanceSection.find(".listWrap").click();
                        }
                    },
                    error: ErrTStr.ColumnConflict,
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

        //var metaFile = $("#dsForm-metadataFile").val().trim() || null;
        var rowNum = $rowNum.find("input").val().trim() || null;
        var fileName = $fileName.find("input").val().trim() || null;
        var unsorted = $advanceSection.find(".performance .checkbox")
                                      .hasClass("checked");
        var terminationOptions = getTerminationOptions();
        return {
            //metaFile: metaFile,
            rowNum: rowNum,
            fileName: fileName,
            unsorted: unsorted,
            allowRecordErrors: terminationOptions.allowRecordErrors,
            allowFileErrors: terminationOptions.allowFileErrors
        };
    }

    function getTerminationOptions() {
        var $advanceSection = $form.find(".advanceSection");
        var termination = $advanceSection.find(".termination")
                                         .find(".radioButton.active")
                                         .data("option");
        var allowRecordErrors = false;
        var allowFileErrors = false;

        switch (termination) {
            case ("stop"):
                allowRecordErrors = false;
                allowFileErrors = false;
                break;
            case ("continue"):
                allowRecordErrors = true;
                allowFileErrors = true;
                break;
            case ("stopfile"): // Not used
                allowRecordErrors = true;
                allowFileErrors = false;
                break;
            case ("stoprecord"):
                allowRecordErrors = false;
                allowFileErrors = true;
                break;
            default:
                console.error("error case");
                break;
        }
        return {
            allowRecordErrors: allowRecordErrors,
            allowFileErrors: allowFileErrors
        };
    }

    function validatePreview() {
        var format = validateFormat();
        if (format == null) {
            // error case
            return null;
        }

        var hasUDF = isUseUDF();
        var udfModule = "";
        var udfFunc = "";
        var udfQuery = null;

        if (hasUDF) {
            var udfArgs = validateUDF();
            if (udfArgs == null) {
                // error case
                return null;
            }
            udfModule = udfArgs[0];
            udfFunc = udfArgs[1];
        } else if (format === formatMap.EXCEL) {
            udfModule = excelModule;
            udfFunc = excelFunc;
            udfQuery = validateExcelArgs();
            if (udfQuery == null) {
                return null;
            }
        } else if (format === formatMap.PARQUETFILE) {
            udfModule = parquetModule;
            udfFunc = parquetFunc;
        }

        var terminationOptions = getTerminationOptions();

        return {
            "format": format,
            "udfModule": udfModule,
            "udfFunc": udfFunc,
            "udfQuery": udfQuery,
            "allowRecordErrors": terminationOptions.allowRecordErrors,
            "allowFileErrors": terminationOptions.allowFileErrors
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
        var parquetArgs = {};
        var dbArgs = {};

        if (hasUDF) {
            var udfArgs = validateUDF();
            if (udfArgs == null) {
                // error case
                return null;
            }
            udfModule = udfArgs[0];
            udfFunc = udfArgs[1];
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
        } else if (format === formatMap.EXCEL) {
            udfModule = excelModule;
            udfFunc = excelFunc;
            udfQuery = validateExcelArgs();
            if (udfQuery == null) {
                return null;
            }
        } else if (format === formatMap.XML) {
            xmlArgs = validateXMLArgs();
            if (xmlArgs == null) {
                // error case
                return null;
            }
            udfModule = defaultModule;
            udfFunc = "xmlToJson";
            udfQuery = xmlArgs;
        } else if (format === formatMap.PARQUET) {
            parquetArgs = validateParquetArgs();
            if (parquetArgs == null) {
                return null;
            }
            udfModule = parquetModule;
            udfFunc = parquetFunc;
            udfQuery = parquetArgs;
        } else if (format === formatMap.PARQUETFILE) {
            udfModule = parquetModule;
            udfFunc = parquetFunc;
        } else if (format === formatMap.DATABASE) {
            dbArgs = componentDBFormat.validateValues();
            if (dbArgs == null) {
                return null;
            }
            udfModule = defaultModule;
            udfFunc = 'ingestFromDB';
            udfQuery = { dsn: dbArgs.dsn, query: dbArgs.query };
        }

        var advanceArgs = validateAdvancedArgs();
        if (advanceArgs == null) {
            // error case
            return null;
        }

        var args = {
            "dsNames": dsNames,
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

    function autoFillNumberFields($input) {
        var num = Number($input.val());
        if (isNaN(num) || num < 0) {
            $input.val(0);
        }
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
            csvArgChange();
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
                autoFillNumberFields($("#dsForm-skipRows"));
                break;
            case "TEXT":
                $form.find(".format.text").removeClass("xc-hidden");
                loadArgs.setFieldDelim("");
                break;
            case "EXCEL":
                autoFillNumberFields($("#dsForm-excelIndex"));
                autoFillNumberFields($("#dsForm-skipRows"));
                $form.find(".format.excel").removeClass("xc-hidden");
                break;
            case "JSON":
            case "PARQUETFILE":
                break;
            case "PARQUET":
                // For parquet, there can only be one sourceArg
                var filePath = loadArgs.files[0].path;
                var targetName = loadArgs.targetName;
                var prevTop = $previewCard.find(".cardBottom")[0].style.top;
                // store previous top % for if we switch back to other format
                $previewCard.data("prevtop", prevTop);
                $form.find(".format.parquet").removeClass("xc-hidden");
                $previewCard.addClass("format-parquet");
                xcTooltip.add($previewCard.find(".ui-resizable-n"), {
                    title: "Dataset preview is not available"
                });
                initParquetForm(filePath, targetName);
                break;
            case "UDF":
                $form.find(".format.udf").removeClass("xc-hidden");
                break;
            case "XML":
                $form.find(".format.xml").removeClass("xc-hidden");
                break;
            case "DATABASE":
                componentDBFormat.show();
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
        var changeWithExcel = function(formatOld, formatNew) {
            return formatOld != null &&
                   (formatOld.toUpperCase() === "EXCEL" ||
                    formatNew.toUpperCase() === "EXCEL");
        };

        var changeWithParquetFile = function(formatOld, formatNew) {
            return formatOld != null &&
                   (formatOld.toUpperCase() === "PARQUETFILE" ||
                    formatNew.toUpperCase() === "PARQUETFILE");
        };

        if (hasChangeFormat) {
            if (oldFormat === formatMap.CSV) {
                showHeadersWarning(true);
            } else {
                hideHeadersWarning();
            }

            if (format === formatMap.UDF) {
                getPreviewTable(true);
            } else if (changeWithExcel(oldFormat, format) ||
                changeWithParquetFile(oldFormat, format) ||
                oldFormat === formatMap.UDF) {
                refreshPreview(true, true);
            } else {
                getPreviewTable();
            }
        }
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
            }
        }

        error = error || ErrTStr.Unknown;

        $previewWrap.find(".waitSection").addClass("hidden")
                    .removeClass("hasUdf")
                   .find(".progressSection").empty();
        $previewWrap.find(".loadHidden").addClass("hidden");
        $previewWrap.find(".url").removeClass("xc-disabled");
        $previewTable.empty();
        xcTooltip.hideAll();

        var $errorSection = $previewWrap.find(".errorSection");
        var $bottomSection = $errorSection.find(".bottomSection");

        if (error && error.startsWith("Error:")) {
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
        var deferred = PromiseHelper.deferred();
        applyHighlight(""); // remove highlighter
        $previewTable.removeClass("has-delimiter").empty();
        rawData = null;
        previewOffset = 0;
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
                "track": true
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
        var deferred = PromiseHelper.deferred();

        options = options || {};
        var isFirstTime = options.isFirstTime || false;
        var isRestore = options.isRestore || false;
        var noDetect = isRestore || options.noDetect || false;
        var udfModule = options.udfModule || null;
        var udfFunc = options.udfFunc || null;
        var udfQuery = options.udfQuery || null;
        var format;

        var targetName = loadArgs.getTargetName();
        var dsName = $form.find(".dsName").eq(0).val();
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

        var sql = {"operation": SQLOps.PreviewDS};

        var txId = Transaction.start({
            "operation": SQLOps.PreviewDS,
            "sql": sql,
            "track": true,
            "steps": 1
        });

        var curPreviewId = updatePreviewId();
        var initialLoadArgStr;

        getURLToPreview(curPreviewId)
        .then(function(sourceIndex, url) {
            setPreviewFile(sourceIndex, url);

            if (isRestore) {
                loadArgs.setPreviewHeaders(sourceIndex, options.typedColumns);
            }

            if (isFirstTime && !hasUDF) {
                if (isExcel(url)) {
                    hasUDF = true;
                    udfModule = excelModule;
                    udfFunc = excelFunc;
                    toggleFormat("EXCEL");
                } else if (isParquetFile(url)) {
                    hasUDF = true;
                    udfModule = parquetModule;
                    udfFunc = parquetFunc;
                    toggleFormat("PARQUETFILE");
                } else if (DSTargetManager.isGeneratedTarget(targetName)) {
                    // special case
                    hasUDF = true;
                    noDetect = true;
                    udfModule = defaultModule;
                    udfFunc = "convertNewLineJsonToArrayJson";
                    seletNewLineJSONToArrayUDF();
                }
            }

            if (!noDetect) {
                initialLoadArgStr = loadArgs.getArgStr();
            }

            var args = {};
            format = loadArgs.getFormat();

            if (hasUDF) {
                showProgressCircle(txId);
                args.sources = [{
                    targetName: targetName,
                    path: url
                }];
                args.moduleName = udfModule;
                args.funcName = udfFunc;
                args.udfQuery = udfQuery;
                args.advancedArgs = {
                    allowRecordErrors: options.allowRecordErrors,
                    allowFileErrors: options.allowFileErrors,
                };
                sql.args = args;
                return loadDataWithUDF(txId, dsName, args);
            } else {
                args.targetName = targetName;
                args.path = url;
                sql.args = args;
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

            if (clearPreview && hasUDF) {
                clearPreviewTable(cachedTableName); // async remove the old ds
            }

            $waitSection.addClass("hidden").removeClass("hasUdf")
                        .find(".progressSection").empty();
            $previewWrap.find(".url").removeClass("xc-disabled");
            xcTooltip.hideAll();
            rawData = result;

            $loadHiddenSection.removeClass("hidden");

            var hasSmartDetect = false;
            var notGetPreviewTable = false;
            if (!noDetect) {
                var currentLoadArgStr = loadArgs.getArgStr();
                // when user not do any modification, then do smart detect
                if (initialLoadArgStr === currentLoadArgStr) {
                    hasSmartDetect = true;
                    notGetPreviewTable = smartDetect();
                }
            }
            // check
            if (!notGetPreviewTable &&
                (hasSmartDetect || loadArgs.getFormat() === format)
            ) {
                getPreviewTable();
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

            if (!isValidPreviewId(curPreviewId)) {
                // not in preview screen anymore
                deferred.reject(error);
                return;
            }

            if (Transaction.checkCanceled(txId)) {
                $visibleLoadHiddenSection.removeClass("hidden");
                if (isFirstTime) {
                    // if first time, show error message since there's no
                    // previous table to show
                    errorHandler(error, false, true);
                } else {
                // if canceled and still has valid preview id, restore state
                // and show previous table
                    $waitSection.addClass("hidden").removeClass("hasUdf")
                        .find(".progressSection").empty();
                    $previewWrap.find(".url").removeClass("xc-disabled");
                }
                deferred.reject(error);
                return;
            }

            if (clearPreview && hasUDF) {
                clearPreviewTable(cachedTableName); // async remove the old ds
            }

            if (typeof error === "object" &&
                error.error === oldPreviewError)
            {
                console.error(error);
            } else {
                error = xcHelper.escapeHTMLSpecialChar(error);
                if (format === formatMap.UDF) {
                    errorHandler(error, true);
                } else if (format == null || detectArgs.format == null ||
                            format === detectArgs.format) {
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

    function isExcel(url) {
        if (loadArgs.getFormat() === formatMap.EXCEL ||
            xcHelper.getFormat(url) === formatMap.EXCEL) {
            return true;
        } else {
            return false;
        }
    }

    function isParquetFile(url) {
        if (loadArgs.getFormat() === formatMap.PARQUETFILE ||
            xcHelper.getFormat(url) === formatMap.PARQUETFILE) {
            return true;
        } else {
            return false;
        }
    }

    function setDefaultDSName() {
        var files = loadArgs.files;
        if (!loadArgs.multiDS) {
            // only multiDS mode will show multiple path
            files = [files[0]];
        }

        var dsNames = [];
        var html = "";
        var $inputPart = $form.find(".topSection .inputPart");
        files.forEach(function(file) {
            var path = file.path;
            var dsName = getNameFromPath(path);
            dsNames.push(dsName);

            html += '<div class="row">' +
                        '<label>' +
                            path +
                        '</label>' +
                        '<i class="icon xi-copy-clipboard"></i>' +
                        '<i class="icon xi-tick"></i>' +
                        '<div class="inputWrap">' +
                            '<input class="large dsName" type="text"' +
                            ' autocomplete="off" spellcheck="false"' +
                            ' value="' + dsName + '">' +
                        '</div>' +
                    '</div>';
        });
        $inputPart.html(html);
        if (files.length > 1) {
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
        // positions clipboard/checkmark icons at the end of the label
        var $icons = $inputPart.find(".icon");
        $icons.css("left", width - 5);

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

    function hideDataFormatsByTarget(targetName) {
        var nonParquet = $("#fileFormatMenu li:not([name=PARQUET])");
        var parquet = $("#fileFormatMenu li[name=PARQUET]");

        if (DSTargetManager.isSparkParquet(targetName)) {
            nonParquet.hide();
            parquet.show();

        } else {
            nonParquet.show();
            parquet.hide();
        }
    }

    function setTargetInfo(targetName) {
        xcTooltip.add($previewWrap.find(".previewTitle"), {
            title: targetName
        });
    }

    function setPreviewFile(index, file) {
        var $file = $("#preview-file");
        $file.find(".text").val(file);
        if (loadArgs.getPreviewFile() == null) {
            // set the path to be preview file if not set yet
            loadArgs.setPreviewingSource(index, file);
        }
    }

    function changePreviewFile(index, file) {
        var previewingSource = loadArgs.getPreviewingSource();
        if (previewingSource == null || index === previewingSource.index
            && file === previewingSource.file) {
            return;
        }
        var headers = getColumnHeaders();
        loadArgs.setPreviewHeaders(previewingSource.index, headers);
        loadArgs.setPreviewingSource(index, file);
        refreshPreview(true, true);
    }

    function resetPreviewFile() {
        var $file = $("#preview-file");
        $file.find(".text").text();
        xcTooltip.remove($file.find(".text"));
    }

    function getURLToPreview() {
        var previewingSource = loadArgs.getPreviewingSource();
        var targetName = loadArgs.getTargetName();
        var index = 0;

        if (previewingSource != null) {
            return PromiseHelper.resolve(previewingSource.index, previewingSource.file);
        } else if (DSTargetManager.isGeneratedTarget(targetName)) {
            // target of type Generated is a special case
            return PromiseHelper.resolve(index, loadArgs.files[index].path);
        }

        var deferred = PromiseHelper.deferred();
        var firstFile = loadArgs.files[index];

        previewFileSelect(index, true)
        .then(function(paths) {
            var path = paths[index];
            if (path == null) {
                deferred.reject(xcHelper.replaceMsg(DSFormTStr.ResucriveErr, {
                    path: firstFile.path
                }));
            } else {
                deferred.resolve(index, path);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function setPreviewPaths() {
        var html = "";
        var targetName = loadArgs.getTargetName();
        var isGeneratedTarget = DSTargetManager.isGeneratedTarget(targetName);
        loadArgs.files.forEach(function(file, index) {
            var classes = "mainPath";
            var icons = '<i class="icon xi-arrow-down"></i>' +
                        '<i class="icon xi-arrow-right"></i>';
            var data = 'data-index="' + index + '"';
            var path = xcHelper.escapeDblQuoteForHTML(file.path);
            if (index !== 0) {
                classes += " collapse";
            }
            if (file.isFolder === false || isGeneratedTarget) {
                classes += " singlePath";
                icons = '<i class="icon xi-radio-empty"></i>' +
                        '<i class="icon xi-radio-selected"></i>';
                data += ' data-path="' + path + '"';
            }
            var pattern = file.fileNamePattern || "";
            html += '<li class="' + classes + '" ' + data + '>' +
                        '<div class="label tooltipOverflow"' +
                        ' data-toggle="tooltip"' +
                        ' data-container="body"' +
                        ' data-placement="top"' +
                        ' data-title="' + path + '">' +
                            icons +
                            path + pattern +
                        '</div>' +
                    '</li>' +
                    '<div class="subPathList" data-index="' + index + '"' + '>' +
                    '</div>';
        });
        $("#preview-file").find("ul").html(html);
    }

    function setActivePreviewFile() {
        var previewFile = loadArgs.getPreviewFile();
        if (previewFile != null) {
            previewFile = xcHelper.escapeDblQuote(previewFile);
            var $previewFile = $("#preview-file");
            $previewFile.find("li.active").removeClass("active");
            $previewFile.find('li[data-path="' + previewFile + '"]')
                        .addClass("active");
        }
    }

    function loadFiles(url, index, files) {
        var file = loadArgs.files[index];
        var $previewFile = $("#preview-file");
        var paths = [];
        var isFolder = null;

        if (files.length === 1 && url.endsWith(files[0].name)) {
            // when it's a single file
            isFolder = false;
            paths[0] = url;
            var $mainPath = $previewFile.find('.mainPath[data-index="' + index + '"]');
            $mainPath.addClass("singlePath")
                     .data("path", url)
                     .attr("data-path", url);
            $mainPath.find(".icon").remove();
            $mainPath.find(".label").prepend('<i class="icon xi-radio-empty"></i>' +
                                            '<i class="icon xi-radio-selected"></i>');
        } else {
            isFolder = true;
            var html = "";
            var nameMap = {};
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

            for (var i = 0, len = paths.length; i < len; i++) {
                var originalPath = paths[i];
                var path = xcHelper.escapeDblQuoteForHTML(originalPath);
                var fileName = xcHelper.escapeDblQuoteForHTML(nameMap[originalPath]);
                html +=
                    '<li class="subPath"' +
                    'data-path="' + path + '">' +
                        '<div class="label tooltipOverflow"' +
                        ' data-toggle="tooltip"' +
                        ' data-container="body"' +
                        ' data-placement="top"' +
                        ' data-title="' + fileName + '">' +
                        '<i class="icon xi-radio-empty"></i>' +
                        '<i class="icon xi-radio-selected"></i>' +
                            path +
                        '</div>' +
                    '</li>';
            }

            if (!html) {
                // when no path
                html = '<li class="hint">' +
                            DSFormTStr.NoFileInFolder +
                        '</li>';
            }

            var $subPathList = $previewFile.find('.subPathList[data-index="' + index + '"]');
            $subPathList.html(html);
        }

        if (file.isFolder == null) {
            file.isFolder = isFolder;
        }
        setActivePreviewFile();
        return paths;
    }

    function previewFileSelect(fileIndex, noWaitBg) {
        var deferred = PromiseHelper.deferred();

        $previewWrap.find(".inputWaitingBG").remove();
        var waitingBg = '<div class="inputWaitingBG">' +
                         '<div class="waitingIcon"></div>' +
                      '</div>';
        $previewWrap.find(".url").append(waitingBg);
        var $waitingBg = $previewWrap.find(".inputWaitingBG");

        if (noWaitBg) {
            $waitingBg.remove();
        } else if (gMinModeOn) {
            $waitingBg.find(".waitingIcon").show();
        } else {
            setTimeout(function() {
                $waitingBg.find(".waitingIcon").fadeIn();
            }, 200);
        }

        var file = loadArgs.files[fileIndex];
        var path = file.path;
        var curPreviewId = previewId;

        loadArgs.listFileInPath(path, file.recursive, file.fileNamePattern)
        .then(function(res) {
            if (!isValidPreviewId(curPreviewId)) {
                return deferred.reject();
            }
            var paths = loadFiles(path, fileIndex, res.files);
            deferred.resolve(paths);
        })
        .fail(deferred.reject)
        .always(function() {
            $waitingBg.remove();
        });

        return deferred.promise();
    }

    function loadData(args) {
        var deferred = PromiseHelper.deferred();
        var curPreviewId = previewId;
        var buffer;
        var totalDataSize = null;

        previewOffset = 0;

        XcalarPreview(args, numBytesRequest, 0)
        .then(function(res) {
            if (!isValidPreviewId(curPreviewId)) {
                return PromiseHelper.reject();
            }

            if (res && res.buffer) {
                buffer = res.buffer;
                totalDataSize = res.totalDataSize;
                previewOffset = res.thisDataSize;
                var rowsToShow = getRowsToPreview();
                return getDataFromPreview(args, buffer, rowsToShow);
            }
        })
        .then(function(extraBuffer) {
            if (!isValidPreviewId(curPreviewId)) {
                return PromiseHelper.reject();
            }

            if (extraBuffer) {
                buffer += extraBuffer;
            }
            if (!totalDataSize || totalDataSize <= previewOffset) {
                disableShowMoreRows();
            }
            deferred.resolve(buffer);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getDataFromPreview(args, buffer, rowsToShow) {
        var bytesNeed = getBytesNeed(buffer, rowsToShow);
        if (bytesNeed <= 0) {
            // when has enough cache to show rows
            return PromiseHelper.resolve(null, true);
        }

        var deferred = PromiseHelper.deferred();
        var offSet = previewOffset;
        var curPreviewId = previewId;

        console.info("too small rows, request", bytesNeed);
        XcalarPreview(args, bytesNeed, offSet)
        .then(function(res) {
            if (!isValidPreviewId(curPreviewId)) {
                return PromiseHelper.reject();
            }

            var extraBuffer = null;
            if (res && res.buffer) {
                extraBuffer = res.buffer;
                previewOffset += res.thisDataSize;
            }
            deferred.resolve(extraBuffer);
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
        var deferred = PromiseHelper.deferred();
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
                                        totalEntries, [], 0, 0);
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
            var innerDeferred = PromiseHelper.deferred();

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
                delete row[gXcalarRecordNum];
                rows.push(row);
            }

            return rows;
        }
    }


    // load with UDF always return JSON format
    function loadDataWithUDF(txId, dsName, options) {
        var deferred = PromiseHelper.deferred();
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
        var deferred = PromiseHelper.deferred();
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
        var startRow = getRowsToPreview() + 1;
        return getDataFromLoadUDF(datasetName, startRow, rowsToAdd);
    }

    function fetchMoreRowsFromPreview(rowsToAdd) {
        var targetName = loadArgs.getTargetName();
        var path = loadArgs.getPreviewFile();
        var buffer = rawData;
        var rowsToShow = getRowsToPreview() + rowsToAdd;
        var args = {
            targetName: targetName,
            path: path
        };
        return getDataFromPreview(args, buffer, rowsToShow);
    }

    function refreshPreview(noDetect, isPreview) {
        var formOptions = isPreview ? validatePreview() : validateForm();
        if (formOptions == null) {
            return null;
        }
        formOptions.noDetect = noDetect;
        return previewData(formOptions, true);
    }

    function showUDFHint() {
        $previewTableWrap.addClass("UDFHint");
        $previewTable.html('<div class="hint">' +
                                DSFormTStr.UDFHint +
                            '</div>');
    }

    function isInError() {
        return !$previewWrap.find(".errorSection").hasClass("hidden");
    }

    function getPreviewTable(udfHint) {
        if (rawData == null && !udfHint) {
            // error case
            if (isInError()) {
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
        $previewTableWrap.removeClass("XMLTableFormat");
        $previewTableWrap.removeClass("UDFHint");
        $previewTable.removeClass("has-delimiter");

        var format = loadArgs.getFormat();

        if (udfHint) {
            showUDFHint();
            return;
        }

        if (isUseUDFWithFunc() || format === formatMap.JSON ||
            format === formatMap.PARQUETFILE) {
            getJSONTable(rawData);
            return;
        }

        var isSuccess = false;
        if (isUseUDFWithFunc() || format === formatMap.JSON) {
            isSuccess = getJSONTable(rawData);
        } else if (format === formatMap.EXCEL) {
            isSuccess = getJSONTable(rawData, getSkipRows());
            if (isSuccess && loadArgs.useHeader()) {
                toggleHeader(true, true);
            }
        } else if (format === formatMap.XML) {
            isSuccess = getXMLTable(rawData);
        } else if (format === formatMap.DATABASE) {
            var parseResult =  componentDBFormat.parseConfig(rawData);
            if (parseResult) {
                showJSONTable(parseResult.json);
                componentDBFormat.updateDSNList(parseResult.dsnList);
            }
            isSuccess = parseResult ? true : false;

        } else {
            isSuccess = getCSVTable(rawData, format);

            if (isSuccess && format === formatMap.CSV) {
                initialSuggest();
            }
        }

        if (!isSuccess) {
            return;
        }

        addAdvancedRows();
        if (window.isBrowserSafari) {
            $previewTable.removeClass("dataTable");
            setTimeout(function() {$previewTable.addClass("dataTable");}, 0);
        }
    }

    function addAdvancedRows() {
        if (isInError()) {
            return;
        } else if (loadArgs.getFormat() === formatMap.XML) {
            // XXX don't have a good UX for it, so disable it first
            return;
        }

        $previewTable.find(".extra").remove();
        var $advanceSection = $form.find(".advanceSection");
        var $fileName = $advanceSection.find(".fileName");
        var $rowNumber = $advanceSection.find(".rowNumber");
        var hasFileName = $fileName.find(".checkbox").hasClass("checked");
        var hasRowNumber = $rowNumber.find(".checkbox").hasClass("checked");
        if (!hasFileName && !hasRowNumber) {
            return;
        }

        var getTh = function($ele, extraClass) {
            var header = $ele.find("input").val().trim() || "";
            var th = '<th class="extra ' + extraClass + '">' +
                        '<div class="header">' +
                            colGrabTemplate +
                            '<div class="text">' +
                                header +
                            '</div>' +
                        '</div>' +
                    '</th>';
            return th;
        };

        var getTd = function(text) {
            var td = '<td class="cell extra">' +
                        '<div class="innerCell">' +
                            text +
                        '</div>' +
                    '</td>';
            return td;
        };

        var previewFile = loadArgs.getPreviewFile() || "";
        var extraTh = "";
        if (hasFileName) {
            extraTh += getTh($fileName, "fileName");
        }
        if (hasRowNumber) {
            extraTh += getTh($rowNumber, "rowNumber");
        }

        $previewTable.find("thead tr").append(extraTh);
        $previewTable.find("tbody tr").each(function(index) {
            var extraTd = "";
            if (hasFileName) {
                extraTd += getTd(previewFile);
            }
            if (hasRowNumber) {
                extraTd += getTd(index + 1);
            }
            $(this).append(extraTd);
        });
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

    function toggleXMLCheckboxes(xmlOptions) {
        if (xmlOptions.matchedPath) {
            $(".matchedXPath .checkbox").click();
        }
        if (xmlOptions.withPath) {
            $(".elementXPath .checkbox").click();
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

    function getJSONTable(datas, skipRows = 0) {
        var json = parseJSONData(datas);
        if (json == null) {
            // error case
            return false;
        }
        json = json.splice(skipRows);

        showJSONTable(json);

        return true;
    }

    function showJSONTable(jsonData) {
        $previewTable.html(getJSONTableHTML(jsonData))
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
            suggest: '<span class="suggest" data-format="' + suggest + '">' +
                        suggest +
                    '</span>'
        });
    }

    function getXMLTable(xmlData) {
        if (xmlData == null){
            return false;
        }

        var data = lineSplitHelper(xmlData, '\n');
        var html = getXMLTbodyHTML(data);

        $previewTableWrap.addClass("XMLTableFormat");
        $previewTable.html(html);
        return true;
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
            var cellWidth = xcHelper.getTextWidth(null, headers[i]) - 36;
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

    function getCSVTable(csvData, format) {
         // line delimiter
        var lineDelim = loadArgs.getLineDelim();
        var data = lineSplitHelper(csvData, lineDelim);
        if (data == null) {
            return false;
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
        loadArgs.setOriginalHeaders(getColumnHeaders());

        if (fieldDelim !== "") {
            $previewTable.addClass("has-delimiter");
        }
        return true;
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
                var header = autoHeaderName(i);
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
                                        '" value="' + header +
                                        '" data-original-title="' + header +
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
                                '<div class="text">' + header + '</div>' +
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
        for (var j = 0; i < len; i++, j++) {
            tbody += '<tr>' +
                        '<td class="lineMarker">' +
                            (j + 1) +
                        '</td>';
            tbody += parseTdHelper(datas[i], delimiter) + '</tr>';
        }

        tbody += "</tbody>";

        return (tbody);
    }

    function autoHeaderName(index) {
        return "column" + index;
    }

    function getXMLTbodyHTML(data) {
        var tbody = "<tbody><tr><td>";
        // not showing too much rows
        var len = Math.min(data.length, rowsToFetch);

        //get the html of table
        for (var i = 0; i < len; i++) {
            tbody += '<span class="XMLContentSpan">' + xcHelper.escapeHTMLSpecialChar(data[i]) + '</span>' + '<br>';
        }

        tbody += "</td></tr></tbody>";

        return tbody;
    }

    function lineSplitHelper(data, delim, rowsToSkip) {
        var quote = loadArgs.getQuote();
        var res = splitLine(data, delim, quote);

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

    function splitLine(data, delim, quote) {
        // XXX this O^2 plus the fieldDelim O^2 may be too slow
        // may need a better way to do it
        var dels = delim.split("");
        var delLen = dels.length;
        if (delLen === 0) {
            return [data];
        }

        var hasQuote = false;
        var hasBackSlash = false;
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
            if (isTh) {
                html = '<th class="editable" data-type="string">' +
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
                html = '<td class="cell"><div class="innerCell">';
            }
        } else {
            if (isTh) {
                html = '<th><div class="header">' + colGrab +
                            '<div class="text cell">';
            } else {
                html = '<td class="cell"><div class="innerCell">';
            }
        }

        var dataLen = data.length;
        var rawStrLimit = 1000; // max number of characters in undelimited column
        var maxColumns = 1100; // max number of columns
        var colStrLimit = 250; // max number of characters in delimited column
        var i = 0;
        var d;
        var tdData = []; // holds acculumated chars until delimiter is reached
                        // and then these chars are added to html
        var val;

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
                    val = xcHelper.escapeDblQuoteForHTML(xcHelper.escapeHTMLSpecialChar(val));
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
                        tdData.push(d);
                    }

                    strLen++;
                    ++i;
                }
            }

            tdData = stripQuote(tdData, quote);
            val = tdData.join("");
            if (strToDelimit !== "\n") {
                val = xcHelper.styleNewLineChar(val);
            }
            val = xcHelper.escapeDblQuoteForHTML(xcHelper.escapeHTMLSpecialChar(val));
            html += val;
            tdData = [];
        } else {
            // when not apply delimiter
            data = stripQuote(data, quote);
            dataLen = Math.min(rawStrLimit, data.length); // limit to 1000 characters
            for (i = 0; i < dataLen; i++) {
                d = data[i];

                var cellClass = "td";
                var escaped = xcHelper.escapeHTMLSpecialChar(d);

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
                    if (d === "\n") {
                        cellClass += " newLine";
                    } else if (d === "\r") {
                        cellClass += " carriageReturn";
                    }
                }

                if (isEditable && isTh) {
                    html += xcHelper.escapeDblQuoteForHTML(escaped);
                } else {
                    html += '<span class="' + cellClass + '">' +
                                escaped +
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

    function seletNewLineJSONToArrayUDF() {
        toggleFormat("UDF");
        selectUDFModule(defaultModule);
        selectUDFFunc("convertNewLineJsonToArrayJson");
    }

    function smartDetect() {
        if (rawData == null) {
            return false;
        }

        // applyLineDelim("\n");
        applyQuote("\"");

        // step 1: detect format
        var lineDelim = loadArgs.getLineDelim();
        detectArgs.format = detectFormat(rawData, lineDelim);

        if (detectArgs.format === DSFormat.SpecialJSON) {
            detectArgs.format = formatMap.UDF;
            seletNewLineJSONToArrayUDF();
            refreshPreview(true, true);
            return true;
        }

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
            detectArgs.lineDelim = xcSuggest.detectLineDelimiter(rawData,
                                                        loadArgs.getQuote());
            applyLineDelim(detectArgs.lineDelim);
        } else {
            applyLineDelim("\n");
        }

        // step 3: detect field delimiter
        if (detectArgs.format === formatMap.CSV) {
            detectArgs.fieldDelim = xcSuggest.detectFieldDelimiter(rawData,
                                                          detectArgs.lineDelim,
                                                          loadArgs.getQuote());

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
        return false;
    }

    function detectFormat(data, lineDelim) {
        if (DSTargetManager.isSparkParquet(loadArgs.getTargetName())) {
            return formatMap.PARQUET;
        }
        var path = loadArgs.getPreviewFile();
        var format = xcHelper.getFormat(path);
        if (format === formatMap.EXCEL || format === formatMap.XML ||
            format === formatMap.PARQUETFILE) {
            return format;
        } else {
            // XXX this information doesn't really work because smartDetect
            // is called after loadWithUdf been called. We need to add another
            // step in the preview if we want to enable this
            // if (data.substring(0, 4) == "PAR1" &&
            //     !isAscii(data.substring(4, 100))) {
            //     return formatMap.PARQUETFILE;
            // }
            var rows = lineSplitHelper(data, lineDelim, 0);
            var detectRes = xcSuggest.detectFormat(rows);

            if (detectRes === DSFormat.JSON) {
                return formatMap.JSON;
            } else if (!isUseUDF() && detectRes === DSFormat.SpecialJSON) {
                // speical json should use udf to parse,
                // so if already use udf, cannot be speical json
                return DSFormat.SpecialJSON;
            } else if (detectRes === DSFormat.XML) {
                return formatMap.XML;
            } else {
                return formatMap.CSV;
            }
        }
    }

    // function isAscii(string) {
    //     return /^[\x00-\x7F]*$/.test(string);
    // }

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
        if (headers == null || headers.length > gMaxDSColsSpec) {
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

        var deferred = PromiseHelper.deferred();

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
        if (error === ColTStr.RenameStartInvalid) {
            text += '<b class="highlight">' + header.colName.slice(0, 1) +
                    '</b>' + header.colName.slice(1);

        } else if (error === ErrTStr.NoEmpty) {
            text += '<span class="empty">' + CommonTxtTstr.empty + '</span>';
        } else {
            text += Array.from(header.colName).map(function(ch) {
                return xcHelper.hasInvalidCharInCol(ch) ?
                       '<b class="highlight">' + ch + '</b>' : ch;
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
        var deferred = PromiseHelper.deferred();

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

    // currently only being used for CSV
    function initialSuggest() {
        var sourceIndex = loadArgs.getPreivewIndex();
        var cachedHeaders = loadArgs.getPreviewHeaders(sourceIndex);

        if ($previewTable.find(".editableHead").length > gMaxDSColsSpec) {
            $previewTable.find("th").addClass("nonEditable");
            var msg = "There are over " + gMaxDSColsSpec + " columns in " +
                    "this dataset. Modifications of column names and types are not allowed.";

            Alert.show({
                title: ErrTStr.ColumnLimitExceeded,
                msg: msg,
                isAlert: true
            });

            loadArgs.files[sourceIndex].autoCSV = true;
        } else if (cachedHeaders && cachedHeaders.length > 0) {
            restoreColumnHeaders(sourceIndex, cachedHeaders);
        } else {
            var $tbody = $previewTable.find("tbody").clone(true);
            var recTypes = suggestColumnHeadersType($tbody);
            var recNames = suggestColumnHeadersNames();
            changeColumnHeaders(recTypes, recNames);
            loadArgs.setSuggestHeaders(sourceIndex, recNames, recTypes);
        }
    }

    function restoreColumnHeaders(sourceIndex, typedColumns) {
        typedColumns = typedColumns || [];

        var originalTypedColumns = loadArgs.getOriginalHeaders(sourceIndex);
        var len = Math.max(originalTypedColumns.length, typedColumns.length);
        var types = [];
        var colNames = [];

        for (var i = 0; i < len; i++) {
            var colInfo = typedColumns[i] || {};
            var colType = colInfo.colType || originalTypedColumns.colType;
            var colName = colInfo.colName || autoHeaderName(i); // not use original col name
            types.push(colType);
            colNames.push(colName);
        }
        changeColumnHeaders(types, colNames);
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

    function suggestColumnHeadersType($tbody) {
        var recTypes = [];
        var suggestType = function($tr, colNum) {
            var datas = [];
            $tr.find("td:nth-child(" + colNum + ")").each(function() {
                var val = $(this).text();
                datas.push(val);
            });
            return xcSuggest.suggestType(datas);
        };

        $tbody.find("tr:gt(17)").remove();
        $tbody.find(".lineMarker").remove();

        var $tr = $tbody.find("tr");
        $tr.eq(0).find("td").each(function(colIndex) {
            recTypes[colIndex] = suggestType($tr, colIndex + 1);
        });
        return recTypes;
    }

    function suggestColumnHeadersNames() {
        var allNames = [];
        $previewTable.find(".editableHead").each(function() {
            allNames.push($(this).val().trim());
        });

        var newNames = getValidNameSet(allNames);
        return newNames;
    }

    function csvArgChange() {
        if (loadArgs.getFormat() !== formatMap.CSV) {
            return;
        }
        showHeadersWarning();
    }

    function showHeadersWarning(isCSV) {
        if (shouldShowHeadersWarning(isCSV)) {
            $("#dsForm-warning").removeClass("xc-hidden");
        } else {
            hideHeadersWarning();
        }

        loadArgs.resetCachedHeaders();
    }

    function hideHeadersWarning() {
        $("#dsForm-warning").addClass("xc-hidden");
    }

    function shouldShowHeadersWarning(isCSV) {
        if (loadArgs.hasPreviewMultipleFiles()) {
            // multi DS case and other files has been previewed
            return true;
        }
        // other case, detect if header has been changed
        var headers = getColumnHeaders(isCSV);
        var sourceIndex = loadArgs.getPreivewIndex();
        var suggestHeaders = loadArgs.getSuggestHeaders(sourceIndex);
        return hasTypedColumnChange(suggestHeaders, headers);
    }

    function getValidNameSet(allNames) {
        var delim = "_";
        var invalidNames = [];
        var usedNames = {};
        var newNames = [];
        allNames.forEach(function(name, index) {
            var error = xcHelper.validateColName(name);
            if (error) {
                invalidNames.push({
                    name: name,
                    error: error,
                    index: index
                });
            } else if (usedNames[name]) {
                invalidNames.push({
                    name: name,
                    error: "duplicate",
                    index: index
                });
            } else {
                usedNames[name] = true;
                newNames[index] = name;
            }
        });

        invalidNames.forEach(function(name) {
            var candidate;
            switch (name.error) {
                case ("duplicate"):
                    candidate = name.name;// xcHelper.autoname will take care
                    break;
                case (ErrTStr.NoEmpty):
                case (ErrTStr.PreservedName):
                    candidate = "column" + name.index;
                    break;
                case (ColTStr.RenameStartInvalid):
                    candidate = xcHelper.stripColName(delim + name.name);
                    break;
                case (ColTStr.ColNameInvalidChar):
                    candidate = xcHelper.stripColName(name.name);
                    break;
                case (ColTStr.LongName):
                    candidate = name.name.substring(0,
                                XcalarApisConstantsT.XcalarApiMaxFieldNameLen -
                                6); // leave some space
                    candidate = xcHelper.stripColName(candidate);
                    break;
                default:
                    candidate = "column" + name.index;
                    break;
            }

            candidate = xcHelper.autoName(candidate, usedNames, null, delim);
            usedNames[candidate] = true;
            newNames[name.index] = candidate;
        });

        return newNames;
    }

    // Start === DatabaseFormat component factory
    function createDatabaseFormat({
        dsnID = 'dbArgs-dsnList',
        sqlID = 'dsForm-dbSQL',
        containerID = 'importDataForm-content',
        parseJSONDataFunc}) {
        // Dependencies
        const libs = {
            xcHelper: xcHelper,
            ErrTStr: ErrTStr,
            parseJSONData: parseJSONDataFunc,
            MenuHelper: MenuHelper,
            InputDropdownHint: InputDropdownHint
        };

        // Constants
        const DSN_LINE_TEMPLATE = '<li data-dsn="{dsn}">{dsn}</li>';

        // Private variables
        const $elementDSN = $('#' + dsnID);
        const $elementSQL = $('#' + sqlID);
        const $container = $('#' + containerID);
        const $elementDSNInput = $('#' + dsnID + ' .text');

        // Private methods
        function init() {
            new libs.MenuHelper($elementDSN, {
                "onSelect": ($li) => selectDSN($li.data('dsn')),
                "container": '#' + containerID,
                "bounds": '#' + containerID
            }).setupListeners();
        }

        function selectDSN(dsn) {
            $elementDSNInput.val(dsn);
        }

        // Initialize
        init();

        // Public methods
        return {
            restore: function({dsn, query}) {
                if (dsn != null) {
                    $elementDSNInput.val(dsn);
                }
                if (query != null) {
                    $elementSQL.val(query);
                }
            },
            validateValues: function() {
                const strDSN = $elementDSNInput.val().trim();
                const strSQL = $elementSQL.val().trim();
                const isValid = libs.xcHelper.validate([
                    {
                        "$ele": $elementDSN,
                        "error": libs.ErrTStr.NoEmpty,
                        "formMode": true,
                        "check": () => (strDSN.length === 0)
                    },
                    {
                        "$ele": $elementSQL,
                        "error": libs.ErrTStr.NoEmpty,
                        "formMode": true,
                        "check": () => (strSQL.length === 0)
                    }
                ]);
                return (isValid) ? { dsn: strDSN, query: strSQL } : null;
            },
            show: function() {
                $container.find(".format.database").removeClass("xc-hidden");
            },
            parseConfig: function(rawData) {
                try {
                    const json = libs.parseJSONData(rawData);
                    return {
                        json: json,
                        dsnList: json.map( (dsn) => (libs.xcHelper.escapeHTMLSpecialChar(dsn.name)) )
                    };
                } catch(e) {
                    console.error(e);
                    return false;
                }
            },
            updateDSNList: function(dsnList) {
                const html = dsnList.reduce(
                    (accm, dsn) => ( accm + DSN_LINE_TEMPLATE.replace(/\{dsn\}/g, dsn) ),
                    '');
                $elementDSN.find("ul").html(html);
            },
        };

    }
    // End === DatabaseFormat component factory

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
        DSPreview.__testOnly__.changePreviewFile = changePreviewFile;

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

        DSPreview.__testOnly__.slowPreviewCheck = slowPreviewCheck;
        DSPreview.__testOnly__.autoDetectSourceHeaderTypes = autoDetectSourceHeaderTypes;
        DSPreview.__testOnly__.getTypedColumnsList = getTypedColumnsList;

        DSPreview.__testOnly__.getTerminationOptions = getTerminationOptions;
        DSPreview.__testOnly__.validatePreview = validatePreview;
        DSPreview.__testOnly__.validateForm = validateForm;
        DSPreview.__testOnly__.submitForm = submitForm;
        DSPreview.__testOnly__.getParquetInfo = getParquetInfo;
        DSPreview.__testOnly__.initParquetForm = initParquetForm;
        DSPreview.__testOnly__.errorHandler = errorHandler;
        DSPreview.__testOnly__.previewData = previewData;
        DSPreview.__testOnly__.importDataHelper = importDataHelper;

        DSPreview.__testOnly__.get = function() {
            return {
                "loadArgs": loadArgs,
                "highlighter": highlighter,
                "detectArgs": detectArgs,
                "id": previewId,
                "tableName": tableName
            };
        };

        DSPreview.__testOnly__.set = function(newData, newHighlight) {
            highlighter = newHighlight || "";
            rawData = newData || null;
        };

        DSPreview.__testOnly__.setBackToFormCard = function(flag) {
            backToFormCard = flag;
        };
    }
    /* End Of Unit Test Only */

    return (DSPreview);
}(jQuery, {}));

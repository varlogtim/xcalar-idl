window.DFParamModal = (function($, DFParamModal){
    var $modal; // $("#dfParamModal")
    var $editableRow;   // $modal.find(".editableRow")
    var $advancedOpts;
    var type;   // dataStore, filter, or export
    var simpleViewTypes = ["dataStore", "filter", "export"];

    var modalHelper;
    var dropdownHelper;
    var filterFnMap = {}; // stores fnName: numArgs
    var xdpMode;
    var hasChange = false;
    var isOpen = false;
    var tableName; // stores current table name when modal gets opened
    var altTableName; // alternative name for export,
                // the name that includes .XcalarLRQExport
    var dfName;
    var editor;
    var isAdvancedMode = false;

    var crt;
    var cover = document.createElement('div');
    cover.innerHTML = '<div class="cover"></div>';

    DFParamModal.setup = function() {
        // constant
        $modal = $("#dfParamModal");
        $editableRow = $modal.find(".editableRow");
        $advancedOpts = $modal.find(".advancedOpts");
        xdpMode = XVM.getLicenseMode();
        modalHelper = new ModalHelper($modal, {noEnter: true});

        $modal.find('.cancel, .close').click(function() {
            closeModal();
        });

        $modal.find('.confirm').click(function() {
            submitForm();
        });

        $modal.on('focus', '.paramVal', function() {
            $(this).select().siblings(".paramEdit").addClass('selected');
        });

        $modal.on('blur', '.paramVal', function() {
            $(this).siblings(".paramEdit").removeClass('selected');
        });

        $modal.on('click', '.paramEdit', function() {
            $(this).siblings(".paramVal").focus();
        });

        $modal.on('click', '.checkbox', function() {
            var $checkbox = $(this);
            $checkbox.toggleClass("checked");
            if ($checkbox.hasClass("checked")) {
                // remove value from input if click on "no value" box
                $checkbox.closest(".row").find(".paramVal").val("");
            }
        });

        $modal.on("input", ".paramVal", function() {
            // remove "no value" check if the input has text
            $(this).closest(".row").find(".checkbox").removeClass("checked");
        });

        $modal.on('keydown', '.editableParamDiv', function(event) {
            return (event.which !== keyCode.Enter);
        });

        $modal.on("click",
            ".editableTable .defaultParam, .exportSettingTable .defaultParam",
        function() {
            setParamDivToDefault($(this).siblings("input"));
        });

        $modal.find(".restoreAdvanced").click(function() {
            initAdvancedForm();
        });

        $modal.on("click", ".xi-plus-circle-outline", function() {
            $(this).closest(".retinaSection").removeClass("collapsed")
            .addClass("expanded");
            return false;
        });

        $modal.on("click", ".xi-minus-circle-outline", function() {
            $(this).closest(".retinaSection").removeClass("expanded")
            .addClass("collapsed");
            return false;
        });

        $modal.on("click", ".exportSettingButton span", function() {
            $(this).closest(".exportSettingButton").find(".icon:visible").click();
            return false;
        });

        function hideAddParamSection() {
            $modal.find(".newParam").hide();
            $modal.find(".addParam").show();
        }

        var checkInputTimeout;
        $modal.on("input", ".editableParamDiv", function() {
            var $input = $(this);
            if ($input.closest(".targetName").length === 0) {
                suggest($input);
            }

            clearTimeout(checkInputTimeout);
        });

        $modal.on('click', function(event) {
            var $target = $(event.target);
            if ($target.closest('.dropDownList').length === 0) {
                $modal.find('.list').hide();
            }
        });

        $modal.on("click", ".advancedOpts .radioButton", function() {
            if (xdpMode === XcalarMode.Mod) {
                return showLicenseTooltip(this);
            }
            if ($('#dfViz').hasClass("hasUnexpectedNode")) {
                return showUnexpectedNodeTip(this);
            }
            var $radioButton = $(this).closest(".radioButton");
            if ($radioButton.hasClass("active")) {
                return;
            }
            $radioButton.siblings().removeClass("active");
            $radioButton.addClass("active");

            var $section = $modal.find(".innerEditableRow.filename");
            var $input = $section.find("input");
            var $label = $section.find(".static");

            // toggle the input val between two options
            var currentVal = $input.val();
            $input.val($input.data("cache") || "");
            $input.data("cache", currentVal);

            if ($radioButton.data("option") === "default") {
                $modal.removeClass("import").addClass("default");
                xcTooltip.changeText($modal.find(".toggleView"),
                                     DFTStr.ParamToggle);
                $label.text(DFTStr.ExportTo + ":");
            } else {
                $modal.removeClass("default").addClass("import");
                xcTooltip.changeText($modal.find(".toggleView"),
                                    DFTStr.ParamAdvancedNotAllowed);

                $label.text(DFTStr.ExportToTable + ":");

                if (!$input.hasClass("touched")) {
                    // first time set the naame table
                    var df = DF.getDataflow(dfName);
                    if (df && df.activeSession) {
                        $input.val(df.newTableName);
                    }
                    $input.addClass("touched");
                }
            }
        });

        $modal.on("click", ".toggleGroupRow", function(event) {
            var $toggle = $(this);
            if ($(event.target).closest(".xi-close").length) {
                $toggle.next().remove();
                $toggle.remove();
                $modal.find(".editableParamQuery .toggleGroupRow").each(function(index) {
                    $(this).find(".toggleText").text("Source Arguments " + (index + 1));
                });
                return;
            }
            if ($toggle.hasClass("expanded")) {
                $toggle.removeClass("expanded");
                $toggle.addClass("collapsed");
            } else {
                $toggle.removeClass("collapsed");
                $toggle.addClass("expanded");
            }
        });

        $modal.on("click", ".addParamGroupSection", function() {
            addDataStoreGroup();
        });

        $modal.find(".toggleView").click(function() {
            if (($modal.hasClass("import") && $modal.hasClass("export")) ||
                $modal.hasClass("type-advancedOnly")) {
                return;
            }
            xcTooltip.hideAll();
            DFParamModal.toggleView(!isAdvancedMode);
        });

        xcMenu.add($modal.find(".paramMenu"));

        $modal.find(".toggleParamMenu").click(function(event) {
            xcHelper.dropdownOpen($(this), $modal.find(".paramMenu"), {
                toggle: true,
                offsetX: -45,
                offsetY: 1
            });
        });

        $modal.find(".paramMenu").on("mouseup", "li", function() {
            xcHelper.copyToClipboard("<" + $(this).text() + ">");
        });

        editor = CodeMirror.fromTextArea($("#dfParamsCodeArea")[0], {
            "mode": {
                "name": "application/json"
            },
            "lint": true,
            "lineNumbers": true,
            "lineWrapping": true,
            "indentWithTabs": false,
            "indentUnit": 4,
            "matchBrackets": true,
            "autoCloseBrackets": true,
            "search": true,
            "gutters": ["CodeMirror-lint-markers"]
        });
    };

    DFParamModal.show = function($currentIcon) {
        var deferred = PromiseHelper.deferred();
        if (isOpen) {
            return PromiseHelper.reject();
        }
        isOpen = true;
        type = $currentIcon.data('type');
        tableName = $currentIcon.data('table') || // For aliased tables
                    $currentIcon.data('tablename');
        altTableName = $currentIcon.data("altname");
        dfName = DFCard.getCurrentDF();
        var df = DF.getDataflow(dfName);

        if (simpleViewTypes.includes(type)) {
            $modal.addClass("type-" + type);
            xcTooltip.changeText($modal.find(".toggleView"),
                                 DFTStr.ParamToggle);
        } else {
            $modal.addClass("type-advancedOnly");
            if (type === "synthesize") {
                $modal.addClass("type-synthesize");
            } else {
                $modal.addClass("type-noParams");
            }
            xcTooltip.changeText($modal.find(".toggleView"),
                                 DFTStr.ParamBasicNotAllowed);
        }

        if (type === "dataStore") {
            $modal.find(".modalHeader .text").text("Parameterize Dataset Operation");
        } else {
            $modal.find(".modalHeader .text").text("Parameterize " +
                                    xcHelper.camelCaseToRegular(type) + " Operation");
        }

        if (type === "dataStore" || type === "export") {
            $modal.height(630);
        } else {
            $modal.height(500);
        }

        if (type === "export" &&
            $currentIcon.closest(".dagWrap").hasClass("multiExport")) {
            $modal.addClass("multiExport");
        }

        modalHelper.setup();

        if (simpleViewTypes.includes(type)) {
            initBasicForm();
            if (type === "filter") {
                filterSetup()
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                if (type === "export") {
                    exportSetup();
                    if (df.activeSession) {
                        $modal.find(".innerEditableRow.filename input")
                              .val(df.newTableName);
                        if (isAdvancedMode) {
                            switchToBasicModeHelper();
                        }
                    }
                } else if (type === "dataStore") {
                    datasetSetup();
                }
                dropdownHelper = null;
                deferred.resolve();
            }
        } else {
            isAdvancedMode = true;
            $modal.addClass("advancedMode");
            $modal.find(".toggleView").find(".switch").addClass("on");
            deferred.resolve();
        }

        updateInstructions();
        initAdvancedForm();

        return deferred.promise();
    };

    DFParamModal.paramDragStart = function(event) {
        // duplicate the current parameter and set the opacity to be low
        crt = event.target.cloneNode(true);
        crt.style.opacity = 0.5;
        crt.style.position = "absolute";
        if ($(event.target).closest(".draggableParams").hasClass("currParams")) {
            document.getElementsByClassName("currParams")[0].appendChild(crt);
            document.getElementsByClassName("currParams")[0].appendChild(cover);
        } else {
            document.getElementsByClassName("systemParams")[0].appendChild(crt);
            document.getElementsByClassName("systemParams")[0].appendChild(cover);
        }
        // Used cover to cover the duplicated element
        var top = $(crt).position().top;
        var left = $(crt).position().left;
        $modal.find(".cover").css({
            'top': top,
            'left': left,
            'position': "absolute",
            'width': $(crt).width() * 2,
            'height': $(crt).height() * 2
        });
        event.dataTransfer.effectAllowed = "copyMove";
        event.dataTransfer.dropEffect = "copy";
        // must add datatransfer to support firefox drag drop
        event.dataTransfer.setData("text", "");
        event.dataTransfer.setData("id", event.target.id);
        event.dataTransfer.setDragImage(crt, 0, 0);
        event.stopPropagation();
        var $origin = $(event.target).parent();
        var origin;
        if ($origin.hasClass('draggableParams')) {
            origin = 'home';
        } else {
            origin = $origin.data('target');
        }

        $modal.find('input.editableParamDiv').each(function() {
            var width = $(this).width();
            $(this).siblings('.dummyWrap').show().width(width);
            $(this).hide();
        });

        var val;
        var valLen;
        var html = "";
        var chr;
        $modal.find('input.editableParamDiv').each(function() {
            val = $(this).val();
            valLen = val.length;
            html = "";
            for (var i = 0; i < valLen; i++) {
                chr = val[i];
                html += '<span class="line" ' +
                      'ondragover="DFParamModal.allowParamDrop(event)" ' +
                      'ondrop="DFParamModal.paramDropLine(event)">' + chr +
                      '</span>';
            }
            html += '<span class="space" ' +
                    'ondragover="DFParamModal.allowParamDrop(event)" ' +
                    'ondrop="DFParamModal.paramDropSpace(event)"></span>';
            $(this).siblings('.dummyWrap').find('.dummy').html(html);
        });

        $editableRow.data('origin', origin);
    };

    DFParamModal.paramDragEnd = function (event) {
        if ($(event.target).closest(".draggableParams").hasClass("currParams")) {
            document.getElementsByClassName("currParams")[0].removeChild(crt);
            document.getElementsByClassName("currParams")[0].removeChild(cover);
        } else {
            document.getElementsByClassName("systemParams")[0].removeChild(crt);
            document.getElementsByClassName("systemParams")[0].removeChild(cover);
        }
        event.stopPropagation();
        $editableRow.data('copying', false);
        $modal.find('.dummyWrap').hide();
        $modal.find('input.editableParamDiv').show();
    };

    DFParamModal.paramDropLine = function(event) {
        event.stopPropagation();
        var $dropTarget = $(event.target);
        var $dropTargParent = $dropTarget.parent();
        var paramId = event.dataTransfer.getData("id");

        var $draggableParam = $('#' + paramId);

        var index = $dropTarget.index();
        var currentText = $dropTargParent.text();
        var firstPart = currentText.substr(0, index);
        var secondPart = currentText.substr(index - currentText.length);
        var newVal = firstPart + $draggableParam.text() + secondPart;
        $dropTargParent.text(newVal);
        $dropTargParent.parent().siblings('input').val(newVal);
    };

    DFParamModal.paramDropSpace = function(event) {
        event.stopPropagation();
        var $dropTarget = $(event.target);
        var $dropTargParent = $dropTarget.parent();
        var paramId = event.dataTransfer.getData("id");

        var $draggableParam = $('#' + paramId);

        var currentText = $dropTargParent.text();
        var newVal = currentText + $draggableParam.text();
        $dropTargParent.text(newVal);

        $dropTargParent.parent().siblings('input').val(newVal);
    };

    DFParamModal.allowParamDrop = function(event) {
        event.preventDefault();
    };

    DFParamModal.toggleView = function(advancedView) {
        if (advancedView) {
            switchBasicToAdvancedMode();
        } else {
            switchAdvancedToBasicMode();
        }
    }

    function initBasicForm(providedStruct) {
        $editableRow.empty();
        $modal.find('.draggableParams').empty();

        setupInputText(providedStruct);
        $("#dfParamModal .editableRow .defaultParam").each(function() {
            setParamDivToDefault($(this).siblings("input"));
        });
        var draggableInputs = "";
        var params = DF.getParamMap();
        for (paramName in params) {
            if (!systemParams.hasOwnProperty(paramName) && isNaN(Number(paramName))) {
                draggableInputs += generateDraggableParams(paramName);
            }
        }

        $modal.find('.draggableParams.currParams')
              .html(draggableInputs);

        // right section for system parameters
        draggableInputs = "";
        for (var key in systemParams) {
            if (isNaN(Number(key))) {
                draggableInputs += generateDraggableParams(key);
            }
        }
        $modal.find('.draggableParams.systemParams')
              .removeClass("hint")
              .html(draggableInputs);

        if (!providedStruct) {
            populateSavedFields(); // top template section
        }

        setupDummyInputs();

        if (providedStruct) {
            if (type === "filter") {
                filterSetup();
            } else {
                if (type === "export") {
                    exportSetup();
                    var df = DF.getDataflow(dfName);
                    if (df.activeSession) {
                        $modal.find(".innerEditableRow.filename input").val(df.newTableName);
                    }
                } else if (type === "dataStore") {
                    datasetSetup();
                }
                dropdownHelper = null;
            }
        }
    }

    function switchBasicToAdvancedMode() {
        isAdvancedMode = true;
        $modal.addClass("advancedMode");
        $modal.find(".toggleView").find(".switch").addClass("on");
        updateInstructions();

        var params = getBasicModeParams(true);
        var df = DF.getDataflow(dfName);
        var node = df.retinaNodes[tableName];
        var updatedStruct = getUpdatedBasicStruct(node, true).struct;
        delete updatedStruct.dest;
        if (type !== "synthesize") {
            delete updatedStruct.source;
        }

        editor.setValue(JSON.stringify(updatedStruct, null, 4));
        editor.refresh();
    }

    function switchAdvancedToBasicMode() {
        var struct = getUpdatedAdvancedStruct();
        if (!struct.error) {
            switchToBasicModeHelper()
            initBasicForm(struct.struct);
        }
    }

    function switchToBasicModeHelper() {
        isAdvancedMode = false;
        $modal.removeClass("advancedMode");
        $modal.find(".toggleView").find(".switch").removeClass("on");
        var text = DFTStr.ParamBasicInstructions;
        updateInstructions();
    }

    // when param dragging begins, we replace the real inputs with fake ones
    // so we can style drop lines
    function setupDummyInputs() {
        var $dummyInputs = $modal.find('.dummy');
        $dummyInputs.on('dragenter', '.line', function() {
            $dummyInputs.find('.line, .space').removeClass('hover');
            $(this).addClass('hover');
        });
        $dummyInputs.on('dragenter', '.space', function() {
            $dummyInputs.find('.line, .space').removeClass('hover');
            $(this).addClass('hover');
        });
        $dummyInputs.on('dragleave', '.line', function() {
            $(this).removeClass('hover');
        });
        $dummyInputs.on('dragleave', '.space', function() {
            $(this).removeClass('hover');
        });
    }

    function datasetSetup(newGroup) {
        $modal.find('.targetName .dropDownList').find('ul')
                                                .html(getDatasetTargetList());
        var $lists;
        if (newGroup) {
            $lists = $modal.find('.tdWrapper.dropDownList').last();
        } else {
            $lists = $modal.find('.tdWrapper.dropDownList');
        }

        $lists.each(function() {
            var $list = $(this);
            var dropdownHelper = new MenuHelper($list, {
                "onSelect": function($li) {
                    var val = $li.text();
                    var $input = $li.closest('.tdWrapper.dropDownList').find("input");
                    if (val === $.trim($input.val())) {
                        return;
                    }
                    $input.val(val).data("val", val);
                },
                "onOpen": function() {
                    var $lis = $list.find('li').sort(xcHelper.sortHTML);
                    $lis.prependTo($list.find('ul'));
                },
                "container": "#dfParamModal",
                "bounds": "#dfParamModal .modalTopMain",
                "bottomPadding": 2,
                "exclude": '.draggableDiv, .defaultParam'
            });

            new InputDropdownHint($list, {
                "preventClearOnBlur": true,
                "order": true,
                "menuHelper": dropdownHelper,
                "onEnter": function (val, $input) {
                    if (val === $.trim($input.val())) {
                        return;
                    }
                    $input.val(val);
                }
            });
        });
    }

    function filterSetup() {
        var deferred = PromiseHelper.deferred();
        var $list = $modal.find('.tdWrapper.dropDownList');

        dropdownHelper = new MenuHelper($list, {
            "onSelect": function($li) {
                var func = $li.text();
                var $input = $list.find("input.editableParamDiv");

                if (func === $.trim($input.val())) {
                    return;
                }

                $input.val(func);
                updateNumArgs(func);
            },
            "onOpen": function() {
                var $lis = $list.find('li')
                                .sort(xcHelper.sortHTML)
                                .show();
                $lis.prependTo($list.find('ul'));
                $list.find('ul').width($list.width() - 1);

                // XXX 10-19-2016 need to shake it or it doesn't show up
                $list.find('.scrollArea.bottom').css('bottom', 1);
                setTimeout(function() {
                    $list.find('.scrollArea.bottom').css('bottom', 0);
                });
            },
            "container": "#dfParamModal",
            "bounds": "#dfParamModal .modalTopMain",
            "bottomPadding": 2,
            "exclude": '.draggableDiv, .defaultParam'
        });
        dropdownHelper.setupListeners();

        $list.find("input").change(function() {
            var func = $.trim($(this).val());
            updateNumArgs(func);
        });

        XcalarListXdfs('*', 'Conditional*')
        .then(function(ret) {
            var numXdfs = ret.numXdfs;
            var html = "";
            var fnNames = [];
            // var fns = ret.fnDescs;
            for (var i = 0; i < numXdfs; i++) {
                fnNames.push(ret.fnDescs[i].fnName);
                filterFnMap[ret.fnDescs[i].fnName] = ret.fnDescs[i].numArgs;
            }

            fnNames = fnNames.sort();
            for (i = 0; i < numXdfs; i++) {
                html += '<li>' + fnNames[i] + '</li>';
            }
            $list.find('ul').html(html);

            var $input = $list.find("input.editableParamDiv");
            var func = $.trim($input.val());
            updateNumArgs(func);

            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error(DFTStr.ParamModalFail, error);
            deferred.reject();
        });
        return deferred.promise();
    }

    function exportSetup() {
        $modal.find('.target .dropDownList').find('ul').html(getExportTargetList());
        var $lists = $modal.find('.tdWrapper.dropDownList');
        for (var i = 0; i < $lists.length; i++) {
            var $list = $($lists[i]);
            var dropdownHelper = new MenuHelper($list, {
                "onSelect": function($li) {
                    func = selectDelim($li);
                    var $input = $li.closest('.tdWrapper.dropDownList').find("input");
                    if (func === $.trim($input.val())) {
                        return;
                    }
                    $input.val(func);
                    handleExportValueChange($input);
                },
                "onOpen": function() {
                    var $lis = $list.find('li')
                                    .sort(xcHelper.sortHTML)
                                    .show();
                    $lis.prependTo($list.find('ul'));
                    $list.find('ul').width($list.width() - 1);

                    $list.find('.scrollArea.bottom').css('bottom', 1);
                    setTimeout(function() {
                        $list.find('.scrollArea.bottom').css('bottom', 0);
                    });
                },
                "container": "#dfParamModal",
                "bounds": "#dfParamModal .modalTopMain",
                "bottomPadding": 2,
                "exclude": '.draggableDiv, .defaultParam'
            });
            dropdownHelper.setupListeners();
        }

        function selectDelim($li) {
            switch ($li.attr("name")) {
                case "tab":
                    return "\\t";
                case "comma":
                    return ",";
                case "LF":
                    return "\\n";
                case "CR":
                    return "\\r";
                default:
                    return $li.text();
            }
        }
    }

    function addDataStoreGroup() {
        var numGroups = $editableRow.find(".paramGroup").length;

        var editableText = '<div class="toggleGroupRow expanded ' +
        ' xc-action">' +
        '<i class="icon xi-plus"></i><span class="toggleText">Source Arguments ' +
        (numGroups + 1) +
        ' (Click to expand)</span>' +
        '<i class="icon xi-close"></i>' +
        '<i class="icon xi-minus"></i>' +
        '</i></div>' +
        '<div class="paramGroup">' +
            '<div class="innerEditableRow targetName">' +
                '<div class="static">' +
                    'Target Name:' +
                '</div>' +
                getParameterInputHTML(0, "large", {hasDropdown: true}) +
            '</div>' +
            '<div class="innerEditableRow filename">' +
                '<div class="static">' +
                    DFTStr.PointTo + ':' +
                '</div>' +
                getParameterInputHTML(1, "large") +
            '</div>' +
            '<div class="innerEditableRow">' +
                '<div class="static">' +
                    'Pattern:' +
                '</div>' +
                getParameterInputHTML(2, "large allowEmpty") +
            '</div>' +
        '</div>';
        $editableRow.append(editableText);
        datasetSetup(true);
    }

    // options:
    //      defaultPath: string, for export
    function setupInputText(providedStruct) {
        var defaultText = ""; // The html corresponding to Current Query:
        var editableText = ""; // The html corresponding to Parameterized
                                // Query:
        var advancedOpts = "";
        var df = DF.getDataflow(dfName);
        var node = df.retinaNodes[tableName];
        var type = XcalarApisT[node.operation];
        var struct = providedStruct || node.args;
        // XXX if providedStruct, need to check if each key exists
        if (type === XcalarApisT.XcalarApiBulkLoad) {
            var sourceArgs;
            for (var i = 0; i < struct.loadArgs.sourceArgsList.length; i++) {
                sourceArgs = struct.loadArgs.sourceArgsList[i];
                var collapsedState = i === 0 ? "expanded firstGroup" : "collapsed";
                defaultText += '<div class="toggleGroupRow ' + collapsedState +
                        ' xc-action">' +
                        '<i class="icon xi-plus"></i><span class="toggleText">Source Arguments ' +
                        (i + 1) +
                        ' (Click to expand)</span>' +
                        '<i class="icon xi-close"></i>' +
                        '<i class="icon xi-minus"></i>' +
                        '</div>' +
                        '<div class="paramGroup">';
                editableText += '<div class="toggleGroupRow group' + i + ' ' + collapsedState +
                        ' xc-action">' +
                        '<i class="icon xi-plus"></i><span class="toggleText">Source Arguments ' +
                        (i + 1) +
                        ' (Click to expand)</span>' +
                        '<i class="icon xi-close"></i>' +
                        '<i class="icon xi-minus"></i>' +
                        '</i></div>' +
                        '<div class="paramGroup">';

                defaultText += '<div class="templateRow">' +
                                '<div>' +
                                    'Target Name:' +
                                '</div>' +
                                '<div class="boxed large">' +
                                    xcHelper.escapeHTMLSpecialChar(sourceArgs.targetName) +
                                '</div>' +
                            '</div>' +
                            '<div class="templateRow">' +
                                '<div>' +
                                    DFTStr.PointTo + ':' +
                                '</div>' +
                                '<div class="boxed large">' +
                                    xcHelper.escapeHTMLSpecialChar(sourceArgs.path) +
                                '</div>' +
                            '</div>' +
                            '<div class="templateRow">' +
                                '<div>' +
                                    'Pattern:' +
                                '</div>' +
                                '<div class="boxed large">' +
                                    xcHelper.escapeHTMLSpecialChar(sourceArgs.fileNamePattern) +
                                '</div>' +
                            '</div>';

                editableText += '<div class="innerEditableRow targetName">' +
                                '<div class="static">' +
                                    'Target Name:' +
                                '</div>' +
                                getParameterInputHTML(0, "large", {hasDropdown: true}) +
                            '</div>' +
                            '<div class="innerEditableRow filename">' +
                                '<div class="static">' +
                                    DFTStr.PointTo + ':' +
                                '</div>' +
                                getParameterInputHTML(1, "large") +
                            '</div>' +
                            '<div class="innerEditableRow">' +
                                '<div class="static">' +
                                    'Pattern:' +
                                '</div>' +
                                getParameterInputHTML(2, "large allowEmpty") +
                            '</div>';
                defaultText += '</div>';
                editableText += '</div>';
            }
            clearExportSettingTable();
        } else if (type === XcalarApisT.XcalarApiExport) {
            defaultText += '<div class="paramGroup">';
            editableText += '<div class="paramGroup">';
            var path = struct.defaultPath || "";
            if (path[path.length - 1] !== "/") {
                path += "/";
            }
            var expName = xcHelper.stripCSVExt(xcHelper
                                        .escapeHTMLSpecialChar(struct.fileName));
            defaultText += '<div class="templateRow">' +
                                '<div>' +
                                    DFTStr.ExportTo + ':' +
                                '</div>' +
                                '<div class="boxed large">' +
                                    expName +
                                '</div>' +
                            '</div>' +
                            '<div class="templateRow">' +
                                '<div>' +
                                    'Target:' +
                                '</div>' +
                                '<div class="boxed large">' +
                                    xcHelper.escapeHTMLSpecialChar(struct.targetName) +
                                '</div>' +
                            '</div>';
            exportSettingText = getDefaultExportSetting(struct);
            editableText +=
                            '<div class="innerEditableRow filename">' +
                                '<div class="static">' +
                                    DFTStr.ExportTo + ':' +
                                '</div>' +
                                getParameterInputHTML(0, "medium-small") +
                            '</div>' +
                            '<div class="innerEditableRow target">' +
                                '<div class="static">' +
                                    'Target:' +
                                '</div>' +
                                getParameterInputHTML(1, "medium-small", {hasDropdown: true}) +
                            '</div>' +
                            '</div>';
            var tooltipCover = "";
            if ($modal.hasClass("multiExport")) {
                tooltipCover = '<div class="tooltipCover" ' +
                          'data-toggle="tooltip" data-container="body" ' +
                          'data-original-title="' +
                          DFTStr.NoImportMultiExport + '"></div>';
            }
            advancedOpts = '<div class="optionBox radioButtonGroup">' +
                                '<div class="radioButton"' +
                                ' data-option="default">' +
                                    '<div class="radio">' +
                                        '<i class="icon xi-radio-selected"></i>' +
                                        '<i class="icon xi-radio-empty"></i>' +
                                    '</div>' +
                                    '<div class="label">' +
                                        DFTStr.Default +
                                    '</div>' +
                                '</div>' +
                                '<div class="radioButton" data-option="import" ' +
                                '>' +
                                    '<div class="radio">' +
                                        '<i class="icon xi-radio-selected"></i>' +
                                        '<i class="icon xi-radio-empty"></i>' +
                                    '</div>' +
                                    '<div class="label">' +
                                        DFTStr.Import +
                                    '</div>' +
                                '</div>' +
                                tooltipCover +
                            '</div>';
            defaultText += '</div>';
            editableText += '</div>';
            setUpExportSettingTable(struct);
        } else { // not a datastore but a table (filter)
            var param = struct.eval[0].evalString;

            defaultText += '<div class="paramGroup">' +
                            '<div>Filter:</div>' +
                            '<div class="boxed large">' +
                                xcHelper.escapeHTMLSpecialChar(param) +
                            '</div>' +
                            '</div>';

            editableText += '<div class="paramGroup">' +
                                '<div class="static">Filter:</div>' +
                                getParameterInputHTML(0, "large") +
                            '</div>';
            clearExportSettingTable();
        }

        $modal.find('.template').html(defaultText);
        $editableRow.html(editableText);
        if (type === XcalarApisT.XcalarApiExport) {
            $advancedOpts.html(advancedOpts);
            $modal.find('.exportSettingParamSection').html(exportSettingText);
            $modal.addClass("export");
            if (df.activeSession) {
                $modal.find(".advancedOpts [data-option='import']").click();
            } else {
                $modal.find(".advancedOpts [data-option='default']").click();
            }
        } else {
            $advancedOpts.html("");
            $modal.find('.exportSettingParamSection').html("");
            $modal.removeClass("export");
        }
    }

    function initAdvancedForm() {
        var df = DF.getDataflow(dfName);
        var node = xcHelper.deepCopy(df.retinaNodes[tableName]);
        if (node.operation !== XcalarApisTStr[XcalarApisT.XcalarApiSynthesize]) {
            delete node.args.source;
        }
        delete node.args.dest;
        var structText = JSON.stringify(node.args, null, 4);
        editor.setValue(structText);
        editor.refresh(); // to fix codemirror alignment issues

        // param menu
        var params = DF.getParamMap();
        var paramArray = [];
        for (paramName in params) {
            if (!(systemParams.hasOwnProperty(paramName) && isNaN(Number(paramName)))) {
                paramArray.push(paramName);
            }
        }
        paramArray.sort();
        var html = "";
        for (var i = 0; i < paramArray.length; i++) {
            html += '<li>' + paramArray[i] +
                        '<i class="icon xi-copy-clipboard"></i>' +
                    '</li>';
        }
        $modal.find(".paramMenu ul").html(html);
    }

    function setUpExportSettingTable(options) {
        var createRule = options.createRule;
        var quoteDelim = options.quoteDelim;
        var fieldDelim = options.fieldDelim;
        var recordDelim = options.recordDelim;
        var headerType = options.headerType;
        var sorted = options.sorted;
        var splitRule = options.splitRule;
        // numFiles is not implemented, only maxSize matters
        // var maxSize = (options.splitSize == null) ? "" : (options.splitSize + "");

        var settingText = "";
        var createRuleOptions = {
            "createOnly": "Do Not Overwrite",
            "appendOnly": "Append to Existing",
            "deleteAndReplace": "Overwrite Existing"
        };
        // var recordDelimOptions = {
        //     "LF": "\\n",
        //     "CR": "\\r"
        // };
        // var fieldDelimOptions = {
        //     "tab": "Tab (\\t)",
        //     "comma": "Comma (,)"
        // };
        var headerTypeOptions = {
            "every": "Every File",
            "separate": "Separate File"
        };
        var sortedOptions = {
            "true": "True",
            "false": "False"
        };
        var splitRuleOptions = {
            "none": "Multiple Files",
            "single": "One File"
        };

        settingText += getExportSettingInput(2, 'Overwrite', 'createRule', createRule, true, createRuleOptions, true) +
                        getExportSettingInput(3, 'Record Delimiter', 'recordDelim', recordDelim, false) +
                        getExportSettingInput(4, 'Field Delimiter', 'fieldDelim', fieldDelim, false) +
                        getExportSettingInput(5, 'Quote Character', 'quoteDelim', quoteDelim, false) +
                        getExportSettingInput(6, 'Header', 'headerType', headerType, true, headerTypeOptions, true) +
                        getExportSettingInput(7, 'Preserve Order', 'sorted', sorted, true, sortedOptions, true) +
                        getExportSettingInput(8, 'File', 'splitRule', splitRule, true, splitRuleOptions, true);
                        // getExportSettingInput(9, 'Max Size', ((splitRule === 'single')? 'maxSize xc-hidden':'maxSize'), maxSize, false);

        $modal.find(".exportSettingTable .settingRow").html(settingText);

        function getExportSettingInput(inputNum, name, className, defaultValue, hasDropDown, dropDownList, disabled) {
            if (className === "headerType" && defaultValue === "none") {
                className += ' xc-disabled';
            }
            var html = '<div class="innerEditableRow exportSetting ' + className + '">' +
                        '<div class="static">' +
                            name + ':' +
                        '</div>';
            var divClass = "boxed xc-input";
            if (hasDropDown) {
                html += '<div class="tdWrapper dropDownList boxed medium-small">';
            } else {
                html += '<div class="tdWrapper boxed medium-small">';
            }

            var inputDisabled = (disabled) ? " disabled" : "";
            html += '<input class="' + divClass + '" ' +
                  'data-target="' + inputNum + '" ' +
                  'spellcheck="false" type="text" value="' + specialCharToStr(defaultValue, className) + '"' + inputDisabled + '>';

            if (hasDropDown) {
                html += '<div class="list">' +
                        '<ul>' + getDropDownList(dropDownList) +
                        '</ul>' +
                        '<div class="scrollArea top">' +
                          '<i class="arrow icon xi-arrow-up"></i>' +
                        '</div>' +
                        '<div class="scrollArea bottom">' +
                          '<i class="arrow icon xi-arrow-down"></i>' +
                        '</div>' +
                        '</div>';
            }
            html += '<div title="' + CommonTxtTstr.DefaultVal + '" ' +
                    'class="defaultParam iconWrap xc-action" ' +
                    'data-toggle="tooltip" ' +
                    'data-placement="top" data-container="body">' +
                        '<i class="icon xi-restore center fa-15"></i>' +
                    '</div>' +
                    '</div>';
            html += '</div>';
            return html;

            function getDropDownList(dropDownList) {
                var res = '';
                if (dropDownList) {
                    for (var key in dropDownList) {
                        res += '<li name="' + key + '" class="">' + dropDownList[key] + '</li>';
                    }
                    return res;
                } else {
                    return '<li>first item</li>';
                }
            }
        }
    }

    function clearExportSettingTable() {
        $modal.find(".exportSettingTable .settingRow").html("");
    }

    function getDefaultExportSetting(options) {
        var createRule = options.createRule;
        var quoteDelim = options.quoteDelim;
        var fieldDelim = options.fieldDelim;
        var recordDelim = options.recordDelim;
        var headerType = options.headerType;
        var sorted = options.sorted;
        var splitRule = options.splitRule;
        // numFiles is not implemented, only maxSize matters
        // var maxSize = (options.splitSize == null) ? "" : (options.splitSize + "");

        var defaultText = '<div class="heading exportSettingButton">' +
                          '<i class="icon xi-plus-circle-outline advancedIcon' +
                          ' minimized" data-container="body"' +
                          ' data-toggle="tooltip" title="" ' +
                          'data-original-title="Toggle advanced options"></i>' +
                          '<i class="icon xi-minus-circle-outline advancedIcon' +
                          ' minimized" data-container="body"' +
                          ' data-toggle="tooltip" title="" ' +
                          'data-original-title="Toggle advanced options"></i>' +
                          '<span class="text">Advanced Export Settings</span>' +
                          '</div>';

        defaultText += '<div class="templateTable">' +
                        '<div class="template flexContainer">' +
                        getExportSettingDefault('Overwrite', createRule) +
                        getExportSettingDefault('Record Delimiter', recordDelim) +
                        getExportSettingDefault('Field Delimiter', fieldDelim) +
                        getExportSettingDefault('Quote Character', quoteDelim) +
                        getExportSettingDefault('Header', headerType) +
                        getExportSettingDefault('Preserve Order', sorted) +
                        getExportSettingDefault('File', splitRule) +
                        // getExportSettingDefault('Max Size', maxSize, (splitRule == "single" || splitRule == "none")) +
                        '</div></div>';

        function getExportSettingDefault(name, defaultValue, shouldHide) {
            var hidden = shouldHide ? " xc-hidden" : "";
            return '<div class="templateRow exportSetting' + hidden + '">' +
                '<div>' +
                    name + ':' +
                '</div>' +
                '<div class="boxed">' +
                    specialCharToStr(defaultValue, name) +
                '</div>' +
            '</div>';
        }
        return defaultText;
    }

    function handleExportValueChange($input) {
        // var val = $(".exportSettingTable .innerEditableRow.splitRule input").val();
        // if (val === "Multiple Files") {
        //     $(".exportSettingTable .innerEditableRow.maxSize").removeClass("xc-hidden");
        // } else if (val === "One File") {
        //     $(".exportSettingTable .innerEditableRow.maxSize").addClass("xc-hidden");
        // }
        var val = $($input).val();
        if (val === "Append to Existing") {
            // $(".exportSettingTable .innerEditableRow.headerType").addClass("xc-hidden");
            $(".exportSettingTable .innerEditableRow.headerType input").val("none");
            $(".exportSettingTable .innerEditableRow.headerType")
            .addClass("xc-disabled");
        } else if (val === "Do Not Overwrite" || val === "Overwrite Existing") {
            // $(".exportSettingTable .innerEditableRow.headerType").removeClass("xc-hidden");
            $(".exportSettingTable .innerEditableRow.headerType input").val("Every File");
            $(".exportSettingTable .innerEditableRow.headerType")
            .removeClass("xc-disabled");
        }
    }

    function specialCharToStr(input, className) {
        switch (input) {
            case "\t":
                return "\\t";
            case '"':
                return '&quot;';
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "'":
                return "&apos;";
            case "createOnly":
                return "Do Not Overwrite";
            case "appendOnly":
                return "Append to Existing";
            case "deleteAndReplace":
                return "Overwrite Existing";
            case "every":
                return "Every File";
            case "separate":
                return "Separate File";
            case "none":
                return (className === "splitRule" || className === "File") ? "Multiple Files" : "none";
            case "size":
                return "Multiple Files";
            case "single":
                return "One File";
            case true:
                return "True";
            case false:
                return "False";
            default:
                return input;
        }
    }

    function strToSpecialChar(input) {
        switch (input) {
            case "\\t":
                return "\t";
            case '"':
                return '"';
            case "'":
                return "'";
            case "\\n":
                return "\n";
            case "\\r":
                return "\r";
            case "Do Not Overwrite":
                return "createOnly";
            case "Append to Existing":
                return "appendOnly";
            case "Overwrite Existing":
                return "deleteAndReplace";
            case "Every File":
                return "every";
            case "Separate File":
                return "separate";
            case "Multiple Files":
                return "none";
            case "One File":
                return "single";
            case "True":
                return true;
            case "False":
                return false;
            default:
                return input;
        }
    }

    // returns true if exactly 1 open paren exists
    function checkForOneParen(paramValue) {
        var val;
        var inQuote = false;
        var isEscaped = false;
        var singleQuote = false;
        var braceFound = false;
        for (var i = 0; i < paramValue.length; i++) {
            val = paramValue[i];
            if (isEscaped) {
                isEscaped = false;
                continue;
            }
            switch (val) {
                case ("\\"):
                    isEscaped = true;
                    break;
                case ("'"):
                    if (inQuote && singleQuote) {
                        inQuote = false;
                        singleQuote = false;
                    } else if (!inQuote) {
                        inQuote = true;
                        singleQuote = true;
                    }
                    break;
                case ('"'):
                    if (!inQuote || (inQuote && !singleQuote)) {
                        inQuote = !inQuote;
                    }
                    break;
                case ("("):
                    if (!inQuote) {
                        if (braceFound) {
                            return false;
                        } else {
                            braceFound = true;
                        }
                    }

                    break;
                default:
                    break;
            }
        }
        return braceFound;
    }

    function suggest($input) {
        var value = $.trim($input.val()).toLowerCase();
        var $list = $input.siblings('.list');
        if ($list.length === 0) {
            // when no list to suggest
            return;
        }

        $list.show().find('li').hide();

        var $visibleLis = $list.find('li').filter(function() {
            return (value === "" ||
                    $(this).text().toLowerCase().indexOf(value) !== -1);
        }).show();

        $visibleLis.sort(xcHelper.sortHTML).prependTo($list.find('ul'));

        if (dropdownHelper) {
            dropdownHelper.showOrHideScrollers();
        }

        if (value === "") {
            return;
        }

        // put the li that starts with value at first,
        // in asec order

        for (var i = $visibleLis.length; i >= 0; i--) {
            var $li = $visibleLis.eq(i);
            if ($li.text().startsWith(value)) {
                $list.find('ul').prepend($li);
            }
        }
        if ($list.find('li:visible').length === 0) {
            $list.hide();
        }
    }

    function updateNumArgs(func) {
        var numArgs = filterFnMap[func];
        if (numArgs == null) { // entry could be misspelled or empty
            return;
        }
        var $paramPart = $modal.find(".editableTable");
        var $editableDivs = $paramPart.find('input.editableParamDiv');
        var numDivs = $editableDivs.length - 1; // don't count the op div
        if (numDivs === numArgs) {
            return;
        }
        $paramPart.find(".tdWrapper:gt(" + numArgs + ")").remove();

        if (numArgs > numDivs) {
            var editableText = "";
            for (var i = numDivs; i < numArgs; i++) {
                editableText +=
                getParameterInputHTML(1 + i, "medium allowEmpty");
            }
            $modal.find(".editableRow").append(editableText);
        }

        modalHelper.refreshTabbing();
    }

    function setParamDivToDefault($paramDiv) {
        var $group = $paramDiv.closest(".paramGroup");
        var groupNum = $editableRow.find(".paramGroup").index($group);
        var target = $paramDiv.data("target");
        var defaultVal = $modal.find(".templateTable .paramGroup")
                                      .eq(groupNum)
                                      .find(".boxed")
                                      .eq(target).text();

        $paramDiv.val(defaultVal);
        handleExportValueChange($paramDiv);
    }

    function getParamsInInput(val) {
        var len = val.length;
        var param = "";
        var params = [];
        var braceOpen = false;
        for (var i = 0; i < len; i++) {
            if (braceOpen) {
                if (val[i] === ">") {
                    params.push(param);
                    param = "";
                    braceOpen = false;
                } else {
                    param += val[i];
                }
            }
            if (val[i] === "<") {
                braceOpen = true;
            }
        }
        return (params);
    }

    function checkValidBrackets(val) {
        var len = val.length;
        var braceOpen = false;
        var numLeftBraces = 0;
        var numRightBraces = 0;
        for (var i = 0; i < len; i++) {
            if (val[i] === ">") {
                numLeftBraces++;
            } else if (val[i] === "<") {
                numRightBraces++;
            }
            if (braceOpen) {
                if (val[i] === ">") {
                    braceOpen = false;
                }
            } else if (val[i] === "<") {
                braceOpen = true;
            }
        }
        return (!braceOpen && numLeftBraces === numRightBraces);
    }

    // submit
    function submitForm() {
        var radioButton = $modal.find(".advancedOpts .radioButton.active");

        if (type === "export" &&
            radioButton.length === 1 &&
            $(radioButton).data("option") === "import") {
            if (storeExportToTableNode()) {
                return PromiseHelper.resolve();
            } else {
                return PromiseHelper.reject();
            }
        } else {
            return updateNode();
        }
        // will close the modal if passes checks
    }

    function storeExportToTableNode() {
        var df = DF.getDataflow(dfName);
        var $paramInputs = $modal.find('input.editableParamDiv');
        var activeSession = true;
        var newTableName = $paramInputs.val().trim();
        var isValid = checkExistingTableName($paramInputs);
        if (!isValid) {
            return false;
        } else {
            var activeSessionOptions = {
                "activeSession": activeSession,
                "newTableName": newTableName
            };
            DF.saveAdvancedExportOption(dfName, activeSessionOptions);
            df.updateParameterizedNode(tableName, {"paramType": XcalarApisT.XcalarApiExport}, true);
            closeModal();
            xcHelper.showSuccess(SuccessTStr.ChangesSaved);
            return true;
        }
    }

    function updateNode() {
        var deferred = PromiseHelper.deferred();
        var $btn = $('#dfViz').find(".runNowBtn");
        var nodeStruct;
        var tName;
        var params;
        var df = DF.getDataflow(dfName);

        if (!isAdvancedMode) {
            params = getBasicModeParams();
        } else {
            params = getAdvancedModeParams();
        }
        if (params.error) {
            return PromiseHelper.reject(params.error);
        }

        var node = df.retinaNodes[tableName];
        var prevNode = node;
        var updatedStruct;

        if (isAdvancedMode) {
            updatedStruct = getUpdatedAdvancedStruct();
        } else {
            updatedStruct = getUpdatedBasicStruct(node);
        }

        if (updatedStruct.error) {
            return PromiseHelper.reject(updatedStruct.error);
        }

        nodeStruct = updatedStruct.struct;

        if (XcalarApisT[node.operation] === XcalarApisT.XcalarApiExport) {
            tName = altTableName;
        } else {
            tName = tableName;
        }

        $btn.addClass('xc-disabled');
        $modal.addClass("locked");

        // wait 1 second to wait for any errors to return
        var closed = false;
        var closeTimer = setTimeout(function() {
            closed = true;
            $modal.removeClass("locked");
            closeModal(true);
        }, 1000);

        XcalarUpdateRetina(dfName, tName, nodeStruct)
        .then(function() {
            return XcalarGetRetinaJson(dfName);
        })
        .then(function(retStruct) {
            if (!closed) {
                clearTimeout(closeTimer);
                $modal.removeClass("locked");
                closeModal(true);
            }
            // update dataflow retina nodes
            var newDf = DF.getDataflow(dfName);
            var nodeArgs = retStruct.query;
            newDf.retinaNodes = {};
            for (var i = 0; i < nodeArgs.length; i++) {
                var tablName = nodeArgs[i].args.dest;
                newDf.retinaNodes[tablName] = nodeArgs[i];
            }

            if (type === "export") {
                DF.deleteActiveSessionOption(dfName);
            }

            var noParams = !params.length;

            var paramInfo = {
                "paramType": XcalarApisT[node.operation],
                "paramValue": nodeStruct
            };

            if (!newDf.getParameterizedNode(tableName)) {
                var paramObj =  {
                    "paramType": XcalarApisT[prevNode.operation],
                    "paramValue": prevNode.args
                };
                newDf.addParameterizedNode(tableName, paramObj, paramInfo, noParams);
            } else {
                // Only updates view. Doesn't change any stored information
                newDf.updateParameterizedNode(tableName, paramInfo, noParams);
            }

            if (DF.hasSchedule(dfName)) {
                return DF.updateScheduleForDataflow(dfName);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(function() {
            DF.checkForAddedParams(DF.getDataflow(dfName));
            // show success message??
            DF.commitAndBroadCast(dfName);
            hasChange = false;
            var successMsg;
            if (params.length) {
                successMsg = SuccessTStr.OperationParameterized;
            } else {
                successMsg = SuccessTStr.ChangesSaved;
            }
            xcHelper.showSuccess(successMsg);
            deferred.resolve();
        })
        .fail(function(error) {
            if (!closed) {
                // keep modal from closing if not closed yet
                clearTimeout(closeTimer);
                $modal.removeClass("locked");
            }
            updateRetinaErrorHandler(error);
            deferred.reject();
        })
        .always(function() {
            $btn.removeClass('xc-disabled');
        });

        return deferred.promise();
    }

    function getBasicModeParams(ignoreError) {
        var df = DF.getDataflow(dfName);
        var $paramInputs = $modal.find('input.editableParamDiv');
        var params = [];
        var tempParams;
        // check for valid brackets or invalid characters
        $paramInputs.each(function() {
            isValid = checkValidBrackets($(this).val());
            if (!isValid && !ignoreError) {
                StatusBox.show(ErrTStr.UnclosedParamBracket, $(this));
                return false;
            }
            tempParams = getParamsInInput($(this).val());
            for (var i = 0; i < tempParams.length; i++) {
                isValid = xcHelper.checkNamePattern("param", "check",
                                                    tempParams[i]);
                if (!isValid && !ignoreError) {
                    StatusBox.show(ErrTStr.NoSpecialCharInParam, $(this));
                    var paramIndex = $(this).val().indexOf(tempParams[i]);
                    this.setSelectionRange(paramIndex,
                                           paramIndex + tempParams[i].length);
                    return false;
                }
            }
            params = params.concat(tempParams);
        });

        if (!isValid && !ignoreError) {
            return {error: true};
        }

        // check for empty param values
        $paramInputs.each(function() {
            var $div = $(this);
            if (!ignoreError && !$div.hasClass("allowEmpty") &&
                $.trim($div.val()) === "") {
                isValid = false;
                StatusBox.show(ErrTStr.NoEmptyMustRevert, $div);
                return false;
            }
        });

        if (!isValid && !ignoreError) {
            return {error: true};
        }

        if (!ignoreError && hasInvalidExportPath()) {
            return {error: true};
        }
        return params;
    }

    function getAdvancedModeParams() {
        if (!simpleViewTypes.includes("type") && type !== "synthesize") {
            return [];
        }
        var df = DF.getDataflow(dfName);
        var val = editor.getValue();
        isValid = checkValidBrackets(val);
        if (!isValid) {
            StatusBox.show(ErrTStr.UnclosedParamBracket, $modal.find(".editArea"));
            return false;
        }
        var params = getParamsInInput(val);
        for (var i = 0; i < params.length; i++) {
            isValid = xcHelper.checkNamePattern("param", "check",
                                                params[i]);
            if (!isValid) {
                StatusBox.show(ErrTStr.NoSpecialCharInParam,
                                $modal.find(".editArea"));
                return false;
            }
        }

        if (hasInvalidExportPath(params)) {
            return {error: true};
        }
        return params;
    }

    function getUpdatedBasicStruct(node, ignoreError) {
        var $editableDivs = $modal.find('input.editableParamDiv');
        var error = false;
        var struct = xcHelper.deepCopy(node.args);
        var type = XcalarApisT[node.operation];
        switch (type) {
            case (XcalarApisT.XcalarApiFilter):
                var filterStr = $.trim($editableDivs.eq(0).val());
                struct.eval[0].evalString = filterStr;
                break;
            case (XcalarApisT.XcalarApiBulkLoad):
                $editableRow.find(".paramGroup").each(function(i) {
                    $editableDivs = $(this).find("input.editableParamDiv");
                    var url = $.trim($editableDivs.eq(1).val());
                    var pattern = $.trim($editableDivs.eq(2).val());
                    var targetName = $.trim($editableDivs.eq(0).val());

                    if (!struct.loadArgs.sourceArgsList[i]) {
                        struct.loadArgs.sourceArgsList[i] = new DataSourceArgsT();
                        struct.loadArgs.sourceArgsList[i].recursive = false;
                    }
                    struct.loadArgs.sourceArgsList[i].fileNamePattern =
                                            pattern;
                    struct.loadArgs.sourceArgsList[i].path = url;
                    struct.loadArgs.sourceArgsList[i].targetName = targetName;
                });
                struct.loadArgs.sourceArgsList.length = $editableRow.find(".paramGroup").length;
                break;
            case (XcalarApisT.XcalarApiExport):
                var partialStruct = {};
                var fileName = $.trim($editableDivs.eq(0).val()) + ".csv";
                var targetName = $.trim($editableDivs.eq(1).val());

                partialStruct.fileName = fileName;
                partialStruct.targetName = targetName;
                // var paramTargetName = getTargetName(targetName, params);
                // // XXX Fix this when exportTargets become real targets
                // var target = DSExport.getTarget(paramTargetName);
                // if (target) {
                //     partialStruct.targetType = ExTargetTypeTStr[target.type];
                    struct = $.extend(struct, partialStruct);
                // } else if (ignoreError) {
                //     partialStruct.targetType = null;
                //     struct = $.extend(struct, partialStruct);
                // } else {
                //     error = "target not found";
                // }
                break;
            default:
                error = "currently not supported";
                break;
        }
        var res = {
            struct: struct,
            error: error
        };

        return res;
    }

    function getUpdatedAdvancedStruct() {
        var newStructStr = $.trim(editor.getValue());
        var newStruct;
        try {
            newStruct = JSON.parse(newStructStr);
        } catch(e) {
            var searchText= "at position ";
            var errorPosition = e.message.indexOf(searchText);
            var position = "";
            if (errorPosition > -1) {
                for (let i = errorPosition + searchText.length + 1; i < e.message.length; i++) {
                    if (e.message[i] >= 0 && e.message[i] <= 9) {
                        position += e.message[i];
                    } else {
                        break;
                    }
                }
            }
            if (position.length) {
                // XXX split into lines by searching for \n not in quotes or escaped
                // so that we can show the error in the correct line number
            }
            StatusBox.show(xcHelper.camelCaseToRegular(e.name) + ": " +
                           e.message + ". " + DFTStr.ParamCorrect,
                           $modal.find(".editArea"), null,
                           {side: "top"});

        }
        if (!newStruct) {
            return {error: true};
        } else {
            var df = DF.getDataflow(dfName);
            var node = xcHelper.deepCopy(df.retinaNodes[tableName]);
            // valid json, but now we need to check if params exist
            if (simpleViewTypes.includes(type)) {
                var expectedStruct;
                switch (type) {
                    case ("export"):
                        expectedStruct = new XcalarApiExportInputT();
                        expectedStruct.columns = [];
                        break;
                    case ("filter"):
                        expectedStruct = new XcalarApiFilterInputT();
                        expectedStruct.eval = [new XcalarApiEvalT()];
                        delete expectedStruct.eval[0].newField;
                        break;
                    case ("dataStore"):
                        expectedStruct = new XcalarApiBulkLoadInputT();
                        expectedStruct.loadArgs = new XcalarApiDfLoadArgsT();
                        delete expectedStruct.loadArgs.maxSize;
                        expectedStruct.loadArgs.size = null;
                        expectedStruct.loadArgs.sourceArgsList = [new DataSourceArgsT()];
                        expectedStruct.loadArgs.parseArgs = new ParseArgsT();
                        break;
                    default:
                        break;
                }
                // the following should not be editable and will not be shown
                delete expectedStruct.dagNodeId;
                delete expectedStruct.dest;
                delete expectedStruct.source;

                var trace = [];
                var checkFieldsResult = checkFields(expectedStruct, newStruct, trace);

                if (checkFieldsResult.error) {
                    StatusBox.show(checkFieldsResult.error + ". " + DFTStr.ParamCorrect,
                                    $modal.find(".editArea"),
                                    null, {side: "top"});
                    return {error: true}
                } else {
                    return {struct: $.extend(node.args, newStruct)};
                }
            } else {
                return {struct: $.extend(node.args, newStruct)};
            }
        }
    }

    function checkFields(expectedValue, value, trace) {
        if (value == null) {
            var errMsg = "Invalid value for " + trace.join("");
            return {error: errMsg};
        } else if (expectedValue.constructor === Array) {
            for (var i = 0; i < expectedValue.length; i++) {
                if (expectedValue[i] !== null) {
                    if (typeof expectedValue[i] === "object") {
                        if (!value[i]) {
                            var errMsg = "Missing value at " + trace.join("") + "[" + i + "]";
                            return {error: errMsg};
                        } else if (typeof value[i] !== "object") {
                            var errMsg = "Invalid property at " + trace.join("") + "[" + i + "]";
                            return {error: errMsg};
                        } else {
                            trace.length ? trace.push("[" + i + "]") : trace.push(key);
                            var res = checkFields(expectedValue[i], value[i], trace);
                            if (res.error) {
                                return res;
                            }
                        }
                    } // else ignore
                }
            }
        } else if (typeof expectedValue === "object" && expectedValue !== null) {
            for (var key in expectedValue) {
                if (expectedValue.hasOwnProperty(key)) {
                    if (!value.hasOwnProperty(key)) {
                        var errMsg = "Missing property: \"" + key + "\"";
                        if (trace.length) {
                            errMsg += " in " + trace.join("");
                        }
                        return {error: errMsg};
                        break;
                    } else if (typeof expectedValue[key] === "object" && expectedValue[key] != null) {
                        trace.length ? trace.push("[\"" + key + "\"]") : trace.push(key);
                        var res = checkFields(expectedValue[key], value[key], trace);
                        if (res.error) {
                            return res;
                        }
                    }
                }
            }
        }
        trace.pop();
        return {error: false};
    }

    function checkExistingTableName($input) {
        var isValid = xcHelper.tableNameInputChecker($input, {
            "onErr": function() {},
            side: "left"
        });
        return isValid;
    }

    function updateRetinaErrorHandler(error) {
        if (error === ErrTStr.FilterTypeNoSupport) {
            // modal would still be open
            var $editableDivs = $modal.find(".editableTable")
                                             .find('input.editableParamDiv');
            StatusBox.show(error, $editableDivs.eq(1));
        } else {
            Alert.error(DFTStr.UpdateParamFail, error);
        }
    }

    function getTargetName(targetName, params) {
        var numParams = params.length;
        var find;
        var rgx;
        var param;
        var val;
        var paramTargetName = targetName;
        for (var i = 0; i < numParams; i++) {
            param = params[i].name;
            val = params[i].val;
            find = "<" + xcHelper.escapeRegExp(param) + ">";
            rgx = new RegExp(find, 'g');
            paramTargetName = paramTargetName.replace(rgx, val);
        }
        return paramTargetName;
    }

    function hasInvalidExportPath() {
        if (type !== "export") {
            return false;
        }

        var $input = $modal.find(".editableTable")
                                .find("input.editableParamDiv").eq(0);
        var val =  $input.val();

        if (val.includes("/")) {
            StatusBox.show(DFTStr.InvalidExportPath, $input);
            return true;
        } else {
            return false;
        }
    }

    function getParameterInputHTML(inputNum, extraClass, options) {
        var divClass = "editableParamDiv boxed";
        options = options || {};
        if (extraClass != null) {
            divClass += " " + extraClass;
        }
        var td = '';
        if (options.hasDropdown) {
            td += '<div class="tdWrapper dropDownList boxed ' + extraClass + '">';
        } else {
            td += '<div class="tdWrapper boxed ' + extraClass + '">';
        }

        td += '<input class="' + divClass + '" ' +
                'data-target="' + inputNum + '" ' +
                'spellcheck="false" type="text">' +
                '<div class="dummyWrap ' + divClass + '">' +
                '<div class="dummy ' + divClass + '" ' +
                'ondragover="DFParamModal.allowParamDrop(event)" ' +
                'data-target="' + inputNum + '"></div></div>';

        if (options.hasDropdown) {
            td += '<div class="list">' +
                    '<ul><li>first item</li></ul>' +
                    '<div class="scrollArea top">' +
                      '<i class="arrow icon xi-arrow-up"></i>' +
                    '</div>' +
                    '<div class="scrollArea bottom">' +
                      '<i class="arrow icon xi-arrow-down"></i>' +
                    '</div>' +
                  '</div>';
        }
        td += '<div title="' + CommonTxtTstr.DefaultVal + '" ' +
                'class="defaultParam iconWrap xc-action" ' +
                'data-toggle="tooltip" ' +
                'data-placement="top" data-container="body">' +
                    '<i class="icon xi-restore center fa-15"></i>' +
                '</div>' +
                '</div>';
        return (td);
    }

    function getExportTargetList() {
        var res = "";
        var exportTargetGroups = DSExport.getTargets();
        if (exportTargetGroups) {
            for (var i = 0; i < exportTargetGroups.length; i++) {
                var targets = exportTargetGroups[i].targets;
                for (var j = 0; j < targets.length; j++) {
                    var target = targets[j];
                    if (target) {
                        res += "<li name=" + target.name + ">" + target.name +
                               "</li>";
                    }
                }
            }
        }
        return res;
    }

    function getDatasetTargetList() {
        var targets = DSTargetManager.getAllTargets();
        var html = "";
        for (var name in targets) {
            html += '<li>' + name + '</li>';
        }

        return html;
    }

    function populateSavedFields() {
        var df = DF.getDataflow(dfName);
        var retinaNode = df.getParameterizedNode(tableName);
        // Here's what we are doing:
        // For parameterized nodes, the retDag is actually the post-param
        // version, so we must store the original pre-param version.
        // This is what is stored in the df's paramMap and parameterizedNodes
        // struct. Upon getting the dag, we first assume that everything is not
        // parameterized, and stick everything into the template. We then
        // iterate through the parameterized nodes array and apply the
        // parameterization by moving the template values to the new values,
        // and setting the template values to the ones that are stored inside
        // paramMap.
        if (retinaNode == null || retinaNode.paramValue == null) {
            return;
        }

        var $templateVals = $modal.find(".template .boxed");

        var parameterizedVals = [];

        $templateVals.each(function() {
            parameterizedVals.push($(this).text());
        });

        var struct = retinaNode.paramValue;

        if (retinaNode.paramType === XcalarApisT.XcalarApiFilter) {
            $templateVals.eq(0).text(struct.eval[0].evalString);
        } else if (retinaNode.paramType === XcalarApisT.XcalarApiExport) {
            $templateVals.eq(0).text(xcHelper.stripCSVExt(struct.fileName));
            $templateVals.eq(1).text(struct.targetType);
        } else if (retinaNode.paramType === XcalarApisT.XcalarApiBulkLoad) {
            for (var i = 0; i < struct.loadArgs.sourceArgsList.length; i++) {
                var sourceArgs = struct.loadArgs.sourceArgsList[i];
                $templateVals.eq(i * 3).text(sourceArgs.targetName);
                $templateVals.eq((i * 3) + 1).text(sourceArgs.path);
                $templateVals.eq((i * 3) + 2).text(sourceArgs.fileNamePattern);
            }
        }

        var $editableDivs = $editableRow.find("input.editableParamDiv");

        parameterizedVals.forEach(function(query, index) {
            $editableDivs.eq(index).val(query);
        });
    }

    function generateDraggableParams(paramName) {
        var html = '<div id="draggableParam-' + paramName +
                '" class="draggableDiv" ' +
                'draggable="true" ' +
                'ondragstart="DFParamModal.paramDragStart(event)" ' +
                'ondragend="DFParamModal.paramDragEnd(event)" ' +
                'ondrop="return false" ' +
                'title="' + CommonTxtTstr.HoldToDrag + '" ' +
                'contenteditable="false">' +
                    '<i class="icon xi-move"></i>' +
                    '<span class="delim"><</span>' +
                    '<span class="value">' + paramName + '</span>' +
                    '<span class="delim">></span>' +
                '</div>';

        return (html);
    }

    function closeModal(noCommit) {
        if (!noCommit) {
            if (hasChange) {
                hasChange = false;
                DF.commitAndBroadCast(dfName);
            }
        }
        modalHelper.clear();
        $editableRow.empty();
        $modal.find('.draggableParams').empty();
        isOpen = false;
        $modal.removeClass("type-dataStore type-filter type-export type-synthesize " +
                            "type-advancedOnly type-noParams multiExport");
    }

    function updateInstructions() {
        var text;
        if (simpleViewTypes.includes(type)) {
            if (isAdvancedMode) {
                switch (type) {
                    case ("filter"):
                        text = DFTStr.AdvFilterInstructions;
                        break;
                    case ("dataStore"):
                        text = DFTStr.AdvDatastoreInstructions;
                        break;
                    case ("export"):
                        text = DFTStr.AdvExportInstructions;
                        break;
                    default:
                        break;
                }
            } else {
                text = DFTStr.ParamBasicInstructions;
            }
        } else if (type === "synthesize") {
            text = DFTStr.SynthInstructions;
        } else {
            text = xcHelper.replaceMsg(DFTStr.ParamAdvancedInstructions,
                                      {type: type});
        }
        $modal.find(".modalInstruction .text").text(text);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DFParamModal.__testOnly__ = {};
        DFParamModal.__testOnly__.storeRetina = submitForm;
        DFParamModal.__testOnly__.closeDFParamModal = closeModal;
        DFParamModal.__testOnly__.checkForOneParen = checkForOneParen;
        DFParamModal.__testOnly__.suggest = suggest;
        DFParamModal.__testOnly__.strToSpecialChar = strToSpecialChar;
        DFParamModal.__testOnly__.setDragElems = function(a, b) {
            crt = a;
            cover = b;
        };
    }
    /* End Of Unit Test Only */


    return (DFParamModal);

}(jQuery, {}));

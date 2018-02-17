window.DFParamModal = (function($, DFParamModal){
    var $dfParamModal; // $("#dfParamModal")
    var $paramLists;    // $("#dagModleParamList")
    var $editableRow;   // $dfParamModal.find(".editableRow")
    var $advancedOpts;
    var type;   // dataStore, filter, or export

    var modalHelper;
    var dropdownHelper;
    var filterFnMap = {}; // stores fnName: numArgs
    var defaultParam;
    var xdpMode;
    var hasChange = false;
    var isOpen = false;
    var tableName; // stores current table name when modal gets opened
    var altTableName; // alternative name for export,
                // the name that includes .XcalarLRQExport

    var paramListTrLen = 3;
    var trTemplate =
        '<div class="row unfilled">' +
            '<div class="cell paramNameWrap textOverflowOneLine">' +
                '<div class="paramName"></div>' +
            '</div>' +
            '<div class="cell paramValWrap textOverflowOneLine">' +
                '<input class="paramVal" spellcheck="false" disabled/>' +
                '<div class="paramEdit">' +
                    '<i class="fa-15 icon xi-edit"></i>' +
                '</div>' +
            '</div>' +
            '<div class="cell paramActionWrap">' +
                '<div class="checkbox">' +
                    '<i class="icon xi-ckbox-empty fa-15"></i>' +
                    '<i class="icon xi-ckbox-selected fa-15"></i>' +
                '</div>' +
            '</div>' +
        '</div>';

    var crt;
    var cover = document.createElement('div');
    cover.innerHTML = '<div class="cover"></div>';

    DFParamModal.setup = function() {
        // constant
        $dfParamModal = $("#dfParamModal");
        $paramLists = $("#dagModleParamList");
        $editableRow = $dfParamModal.find(".editableRow");
        $advancedOpts = $dfParamModal.find(".advancedOpts");
        xdpMode = XVM.getLicenseMode();
        modalHelper = new ModalHelper($dfParamModal, {
        });

        $dfParamModal.find('.cancel, .close').click(function() {
            closeDFParamModal();
        });

        $dfParamModal.find('.confirm').click(function() {
            submitForm();
        });

        $dfParamModal.on('focus', '.paramVal', function() {
            $(this).select().siblings(".paramEdit").addClass('selected');
        });

        $dfParamModal.on('blur', '.paramVal', function() {
            $(this).siblings(".paramEdit").removeClass('selected');
        });

        $dfParamModal.on('click', '.paramEdit', function() {
            $(this).siblings(".paramVal").focus();
        });

        $dfParamModal.on('click', '.checkbox', function() {
            var $checkbox = $(this);
            $checkbox.toggleClass("checked");
            if ($checkbox.hasClass("checked")) {
                // remove value from input if click on "no value" box
                $checkbox.closest(".row").find(".paramVal").val("");
            }
        });

        $dfParamModal.on("input", ".paramVal", function() {
            // remove "no value" check if the input has text
            $(this).closest(".row").find(".checkbox").removeClass("checked");
        });

        $dfParamModal.on('keydown', '.editableParamDiv', function(event) {
            return (event.which !== keyCode.Enter);
        });

        $dfParamModal.on("click",
            ".editableTable .defaultParam, .exportSettingTable .defaultParam",
        function() {
            setParamDivToDefault($(this).siblings("input"));
        });

        $dfParamModal.on("click", ".addParam", function() {
            $dfParamModal.find(".addParam").hide();
            $dfParamModal.find(".newParam").show();
            $dfParamModal.find(".newParam").focus();
        });

        $dfParamModal.on("blur", ".newParam", function() {
            addNewParam();
            return false;
        });

        $dfParamModal.on("keydown", ".newParam", function(event) {
            if (event.which === keyCode.Enter) {
                $dfParamModal.find(".newParam").focusout();
                return false;
            }
        });

        $dfParamModal.on("click", ".deleteParam", function() {
            var $toDelete = $(this).closest(".draggableDiv").find(".value");
            var toDeleteName = $($toDelete).text();
            var retName = $dfParamModal.data("df");
            var df = DF.getDataflow(retName);
            if (df.paramMapInUsed[toDeleteName]) {
                StatusBox.show(ErrTStr.InUsedNoDelete, $(this), false, {
                    'side': 'right'
                });
                return false;
            }
            df.removeParameter(toDeleteName);
            $(this).closest(".draggableDiv").remove();
            hasChange = true;
        });

        $dfParamModal.on("click", ".xi-plus-circle-outline", function() {
            $(this).closest(".retinaSection").removeClass("collapsed")
            .addClass("expanded");
            return false;
        });

        $dfParamModal.on("click", ".xi-minus-circle-outline", function() {
            $(this).closest(".retinaSection").removeClass("expanded")
            .addClass("collapsed");
            return false;
        });

        $dfParamModal.on("click", ".exportSettingButton span", function() {
            $(this).closest(".exportSettingButton").find(".icon:visible").click();
            return false;
        });

        function addNewParam() {
            if ($dfParamModal.find(".newParam:visible").length === 0) {
                return;
            }
            var $input = $dfParamModal.find('.newParam');
            var paramName = $input.val().trim();
            var retName = $dfParamModal.data("df");
            var df = DF.getDataflow(retName);
            var isValid = true;

            if (paramName === "") {
                isValid = false;
                hideAddParamSection();
            } else {
                isValid = validateParamName($input, paramName, df);
            }

            if (!isValid) {
                return;
            }

            df.addParameter(paramName);
            var newParam = generateDraggableParams(paramName);
            $(newParam).insertBefore($dfParamModal.find(".inputSection"));
            $input.val("");
            hideAddParamSection();
            hasChange = true;
        }

        function hideAddParamSection() {
            $dfParamModal.find(".newParam").hide();
            $dfParamModal.find(".addParam").show();
        }

        var checkInputTimeout;
        $dfParamModal.on("input", ".editableParamDiv", function() {
            var $input = $(this);
            if ($input.closest(".targetName").length === 0) {
                suggest($input);
            }

            clearTimeout(checkInputTimeout);
            checkInputTimeout = setTimeout(function() {
                checkInputForParam($input);
            }, 200);
        });

        $dfParamModal.on('click', function(event) {
            var $target = $(event.target);
            if ($target.closest('.dropDownList').length === 0) {
                $dfParamModal.find('.list').hide();
            }
        });

        $dfParamModal.on("click", ".advancedOpts .radioButton", function() {
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

            var $section = $dfParamModal.find(".innerEditableRow.filename");
            var $input = $section.find("input");
            var $label = $section.find(".static");

            // toggle the input val between two options
            var currentVal = $input.val();
            $input.val($input.data("cache") || "");
            $input.data("cache", currentVal);

            if ($radioButton.data("option") === "default") {
                $dfParamModal.removeClass("import").addClass("default");
                $label.text(DFTStr.ExportTo + ":");
                checkInputForParam($input);
            } else {
                $dfParamModal.removeClass("default").addClass("import");
                $label.text(DFTStr.ExportToTable + ":");

                if (!$input.hasClass("touched")) {
                    // first time set the naame table
                    var retName = $dfParamModal.data("df");
                    var df = DF.getDataflow(retName);
                    if (df && df.activeSession) {
                        $input.val(df.newTableName);
                    }
                    $input.addClass("touched");
                }
                $paramLists.empty();
                fillUpRows();
            }
        });

        $dfParamModal.on("click", ".toggleGroupRow", function(event) {
            var $toggle = $(this);
            if ($(event.target).closest(".xi-close").length) {
                $toggle.next().remove();
                $toggle.remove();
                $dfParamModal.find(".editableParamQuery .toggleGroupRow").each(function(index) {
                    $(this).find(".toggleText").text("Source Arguments " + ( index + 1))
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

        $dfParamModal.on("click", ".addParamGroupSection", function() {
            addDataStoreGroup();
        });
    };

    DFParamModal.show = function($currentIcon) {
        var deferred = jQuery.Deferred();
        if (isOpen) {
            deferred.reject();
            return deferred.promise();
        }
        isOpen = true;
        type = $currentIcon.data('type');
        tableName = $currentIcon.data('table') || // For aliased tables
                        $currentIcon.data('tablename');
        altTableName = $currentIcon.data("altname");
        var dfName = DFCard.getCurrentDF();
        var df = DF.getDataflow(dfName);
        var id = df.getNodeId(tableName);

        $dfParamModal.data({
            "id": id,
            "df": dfName
        });

        $dfParamModal.removeClass("type-dataStore type-filter type-export " +
                                 "multiExport");
        $dfParamModal.addClass("type-" + type);
        if (type === "filter") {
            $dfParamModal.height(550);
        } else {
            $dfParamModal.height(630);
        }

        if (type === "export") {
            if ($currentIcon.closest(".dagWrap").hasClass("multiExport")) {
                $dfParamModal.addClass("multiExport");
            }
        }

        defaultParam = getParamValues(df, id);

        getExportInfo(type, dfName)
        .always(function(info) {
            // async may return after user decides to delete df while waiting
            if (DFCard.getCurrentDF() !== dfName ||
                !$currentIcon.closest("body").length) {
                closeDFParamModal(true);
                deferred.reject();
                return;
            }
            setupInputText(defaultParam, info);
            $("#dfParamModal .editableRow .defaultParam").click();
            var draggableInputs = "";
            DF.getDataflow(dfName).parameters.forEach(function(paramName) {
                if (!systemParams.hasOwnProperty(paramName)) {
                    draggableInputs += generateDraggableParams(paramName);
                }
            });

            var createNewParam = '<div class="inputSection">'+
                                 '<input class="newParam" type="text" placeholder="' +
                                  DFTStr.EnterNewParam +
                                 '"style="display:none" spellcheck="false">'+
                                 '<div class="btn btn-icon addParam">' +
                                 '<i class="icon xi-plus"></i>' +
                                 '<div class="message">'+
                                 DFTStr.NewParam +
                                 '</div>'+
                                 '</div>' +
                                 '</div>';
            $dfParamModal.find('.draggableParams.currParams')
                         .html(draggableInputs + createNewParam);
            draggableInputs = "";
            for (var key in systemParams) {
                draggableInputs += generateDraggableParams(key);
            }
            $dfParamModal.find('.draggableParams.systemParams')
                           .removeClass("hint")
                                .html(draggableInputs);
            fillUpRows(); // parameterlist table
            populateSavedFields(id, dfName); // template section

            modalHelper.setup();
            setupDummyInputs();

            if (type === "filter") {
                filterSetup()
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                if (type === "export") {
                    exportSetup();
                    var retName = $dfParamModal.data("df");
                    var df = DF.getDataflow(retName);
                    if (df && df.activeSession) {
                        $dfParamModal.find(".innerEditableRow.filename input").val(df.newTableName);
                        $paramLists.empty();
                        fillUpRows();
                    }
                } else if (type === "dataStore") {
                    datasetSetup();
                }
                dropdownHelper = null;
                deferred.resolve();
            }
        });

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
        $dfParamModal.find(".cover").css({
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

        $dfParamModal.find('input.editableParamDiv').each(function() {
            var width = $(this).width();
            $(this).siblings('.dummyWrap').show().width(width);
            $(this).hide();
        });

        var val;
        var valLen;
        var html = "";
        var chr;
        $dfParamModal.find('input.editableParamDiv').each(function() {
            val = $(this).val();
            valLen = val.length;
            html = "";
            for (var i = 0; i < valLen; i++) {
                chr = val[i];
                if (chr === " ") {
                    chr = "&nbsp;";
                }
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
        $dfParamModal.find('.dummyWrap').hide();
        $dfParamModal.find('input.editableParamDiv').show();
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
        checkInputForParam($dropTargParent.parent().siblings('input'));
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
        checkInputForParam($dropTargParent.parent().siblings('input'));
    };

    DFParamModal.allowParamDrop = function(event) {
        event.preventDefault();
    };

    function getExportInfo(type, dfName) {
        var deferred = jQuery.Deferred();
        if (type !== "export") {
            return PromiseHelper.resolve({});
        } else {
            XcalarGetRetina(dfName)
            .then(function(data){
                if (data && data.retina && data.retina.retinaDag
                    && data.retina.retinaDag.node
                    && data.retina.retinaDag.node.length > 0) {
                    var exportNode = data.retina.retinaDag.node[0];
                    deferred.resolve($.extend({}, exportNode.input.exportInput));
                } else {
                    deferred.resolve();
                }
            })
            .fail(deferred.reject);
            return deferred.promise();
        }
    }

    function setupDummyInputs() {
        var $dummyInputs = $dfParamModal.find('.dummy');
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
        $dfParamModal.find('.targetName .dropDownList').find('ul')
                                                .html(getDatasetTargetList());
        var $lists;
        if (newGroup) {
            $lists = $dfParamModal.find('.tdWrapper.dropDownList').last();
        } else {
            $lists = $dfParamModal.find('.tdWrapper.dropDownList');
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
        })


    }

    function filterSetup() {
        var deferred = jQuery.Deferred();
        var $list = $dfParamModal.find('.tdWrapper.dropDownList');

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

                //XXX 10-19-2016 need to shake it or it doesn't show up
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
        $dfParamModal.find('.target .dropDownList').find('ul').html(getExportTargetList());
        var $lists = $dfParamModal.find('.tdWrapper.dropDownList');
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
        '<div class="paramGroup">'+
            '<div class="innerEditableRow targetName">' +
                '<div class="static">' +
                    'Target Name' + ':' +
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
                    'Pattern' + ':' +
                '</div>' +
                getParameterInputHTML(2, "large allowEmpty") +
            '</div>' +
        '</div>';
        $editableRow.append(editableText);
        datasetSetup(true);
    }

    // options:
    //      defaultPath: string, for export
    function setupInputText(paramValue, options) {
        var defaultText = ""; // The html corresponding to Current Query:
        var editableText = ""; // The html corresponding to Parameterized
                                // Query:
        var advancedOpts = "";
        options = options || {};
        if (type === "dataStore") {
            for (var i = 0; i < paramValue.length; i++) {
                var collapsedState = i == 0 ? "expanded firstGroup" : "collapsed";
                defaultText += '<div class="toggleGroupRow ' + collapsedState +
                        ' xc-action">' +
                        '<i class="icon xi-plus"></i><span class="toggleText">Source Arguments ' +
                        (i + 1) +
                        ' (Click to expand)</span>' +
                        '<i class="icon xi-close"></i>' +
                        '<i class="icon xi-minus"></i>' +
                        '</div>';
                editableText += '<div class="toggleGroupRow group' + i + ' ' + collapsedState +
                        ' xc-action">' +
                        '<i class="icon xi-plus"></i><span class="toggleText">Source Arguments ' +
                        (i + 1) +
                        ' (Click to expand)</span>' +
                        '<i class="icon xi-close"></i>' +
                        '<i class="icon xi-minus"></i>' +
                        '</i></div>';
                defaultText += '<div class="paramGroup">';
                editableText += '<div class="paramGroup">';

                var params = paramValue[i];
                defaultText += '<div class="templateRow">' +
                                '<div>' +
                                    'Target Name' + ':' +
                                '</div>' +
                                '<div class="boxed large">' +
                                    xcHelper.escapeHTMLSpecialChar(params[0]) +
                                '</div>' +
                            '</div>' +
                            '<div class="templateRow">' +
                                '<div>' +
                                    DFTStr.PointTo + ':' +
                                '</div>' +
                                '<div class="boxed large">' +
                                    xcHelper.escapeHTMLSpecialChar(params[1]) +
                                '</div>' +
                            '</div>' +
                            '<div class="templateRow">' +
                                '<div>' +
                                    'Pattern' + ':' +
                                '</div>' +
                                '<div class="boxed large">' +
                                    xcHelper.escapeHTMLSpecialChar(params[2]) +
                                '</div>' +
                            '</div>';

                editableText += '<div class="innerEditableRow targetName">' +
                                '<div class="static">' +
                                    'Target Name' + ':' +
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
                                    'Pattern' + ':' +
                                '</div>' +
                                getParameterInputHTML(2, "large allowEmpty") +
                            '</div>';
                defaultText += '</div>';
                editableText += '</div>';
            }
            clearExportSettingTable();
        } else if (type === "export") {
            defaultText += '<div class="paramGroup">';
            editableText += '<div class="paramGroup">';
            var path = options.defaultPath || "";
            if (path[path.length - 1] !== "/") {
                path += "/";
            }
            var expName = xcHelper.stripCSVExt(xcHelper
                                        .escapeHTMLSpecialChar(paramValue[0]));
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
                                    'Target' + ':' +
                                '</div>' +
                                '<div class="boxed large">' +
                                    xcHelper.escapeHTMLSpecialChar(paramValue[1]) +
                                '</div>' +
                            '</div>';
            exportSettingText = getDefaultExportSetting(options);
            editableText +=
                            '<div class="innerEditableRow filename">' +
                                '<div class="static">' +
                                    DFTStr.ExportTo + ':' +
                                '</div>' +
                                getParameterInputHTML(0, "medium-small") +
                            '</div>' +
                            '<div class="innerEditableRow target">' +
                                '<div class="static">' +
                                    'Target' + ':' +
                                '</div>' +
                                getParameterInputHTML(1, "medium-small", {hasDropdown: true}) +
                            '</div>' +
                            '</div>';
            var tooltipCover = "";
            if ($dfParamModal.hasClass("multiExport")) {
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
            setUpExportSettingTable(options);
        } else { // not a datastore but a table
            defaultText += '<div class="paramGroup">';
            editableText += '<div class="paramGroup">';
            paramValue = paramValue[0];
            if (!checkForOneParen(paramValue)) {
                defaultText += '<div>' +
                                'Filter' + ':' +
                            '</div>' +
                            '<div class="boxed large">' +
                                xcHelper.escapeHTMLSpecialChar(paramValue) +
                            '</div>';

                editableText += '<div class="static">' +
                                'Filter' + ':' +
                            '</div>' +
                            getParameterInputHTML(0, "large");
            } else {
                var retStruct = xcHelper.extractOpAndArgs(paramValue);

                defaultText += '<div>' + type + ':</div>' +
                                '<div class="boxed medium">' +
                                    xcHelper.escapeHTMLSpecialChar(
                                        retStruct.args[0]) +
                                '</div>';

                editableText += '<div class="static">' +
                                    type + ':' +
                                '</div>';

                if (type === "filter") {

                    defaultText += '<div class="static">by</div>' +
                                    '<div class="boxed small">' +
                                    xcHelper.escapeHTMLSpecialChar(retStruct.op) +
                                    '</div>';
                    for (var i = 1; i < retStruct.args.length; i++) {
                        defaultText += '<div class="boxed medium">' +
                                            xcHelper.escapeHTMLSpecialChar(
                                                retStruct.args[i]) +
                                        '</div>';
                    }

                    editableText +=
                            getParameterInputHTML(0, "medium") +
                            '<div class="static">by</div>' +
                            getParameterInputHTML(1, "small", {hasDropdown: true});
                    for (var i = 1; i < retStruct.args.length; i++) {
                        editableText +=
                                getParameterInputHTML(1 + i, "medium allowEmpty");
                    }
                } else {
                    // index, sort, map etc to be added in later
                    defaultText += '<div class="static">by</div>';
                }
                clearExportSettingTable();
            }
            defaultText += '</div>';
            editableText += '</div>';
        }

        $dfParamModal.find('.template').html(defaultText);
        $editableRow.html(editableText);
        if (type === "export") {
            $advancedOpts.html(advancedOpts);
            $dfParamModal.find('.exportSettingParamSection').html(exportSettingText);
            $dfParamModal.addClass("export");
            if (xdpMode === XcalarMode.Demo) {
                xcHelper.disableMenuItem($dfParamModal.find(".advancedOpts [data-option='default']"),
                    {"title": TooltipTStr.NotInDemoMode});
                $dfParamModal.find(".advancedOpts [data-option='import']").click();
            } else {
                var retName = $dfParamModal.data("df");
                var df = DF.getDataflow(retName);
                if (df && df.activeSession) {
                    $dfParamModal.find(".advancedOpts [data-option='import']").click();
                } else {
                    $dfParamModal.find(".advancedOpts [data-option='default']").click();
                }
            }
        } else {
            $advancedOpts.html("");
            $dfParamModal.find('.exportSettingParamSection').html("");
            $dfParamModal.removeClass("export");
        }
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

        $dfParamModal.find(".exportSettingTable .settingRow").html(settingText);

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
        $dfParamModal.find(".exportSettingTable .settingRow").html("");
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
                          '<i class="icon xi-plus-circle-outline advancedIcon'+
                          ' minimized" data-container="body"' +
                          ' data-toggle="tooltip" title="" '+
                          'data-original-title="Toggle advanced options"></i>'+
                          '<i class="icon xi-minus-circle-outline advancedIcon'+
                          ' minimized" data-container="body"' +
                          ' data-toggle="tooltip" title="" '+
                          'data-original-title="Toggle advanced options"></i>'+
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
        // var space = "&nbsp;";
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
            case '\"':
                return '"';
            case "\'":
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

    function getExportOptions() {
        var exportOptions = {};
        var prefix = ".exportSettingTable .innerEditableRow";
        var inputSuffix = ' input';
        // var buttonSuffix = ' .radioButton.active';
        var createRule = $dfParamModal
                          .find(prefix + ".createRule" + inputSuffix).val();
        var recordDelim = $dfParamModal
                          .find(prefix + ".recordDelim" + inputSuffix).val();
        var fieldDelim = $dfParamModal
                         .find(prefix + ".fieldDelim" + inputSuffix).val();
        var quoteDelim = $dfParamModal
                         .find(prefix + ".quoteDelim" + inputSuffix).val();
        var headerType = $dfParamModal
                         .find(prefix + ".headerType" + inputSuffix).val();
        var sorted = $dfParamModal
                         .find(prefix + ".sorted" + inputSuffix).val();
        var splitRule = $dfParamModal
                         .find(prefix + ".splitRule" + inputSuffix).val();
        // var maxSize = $dfParamModal
        //                  .find(prefix + ".maxSize" + inputSuffix).val();
        exportOptions.createRule = strToSpecialChar(createRule);
        exportOptions.recordDelim = strToSpecialChar(recordDelim);
        exportOptions.fieldDelim = strToSpecialChar(fieldDelim);
        exportOptions.quoteDelim = strToSpecialChar(quoteDelim);
        exportOptions.headerType = strToSpecialChar(headerType);
        exportOptions.sorted = strToSpecialChar(sorted);
        exportOptions.splitRule = strToSpecialChar(splitRule);
        // if (exportOptions.splitRule == "none" && $.isNumeric(maxSize)) {
        //     exportOptions.splitRule = "size";
        // }
        // exportOptions.maxSize = (exportOptions.splitRule === "size") ? Number(maxSize) : null;
        return exportOptions;
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
        var $paramPart = $dfParamModal.find(".editableTable");
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
            $dfParamModal.find(".editableRow").append(editableText);
        }

        modalHelper.refreshTabbing();
        $editableDivs.each(function() {
            checkInputForParam($(this));
        });
    }

    function addParamToLists(paramName, paramVal, isSystemParam) {
        var $row = $paramLists.find(".unfilled:first");

        if ($row.length === 0) {
            $row = $(trTemplate);
            $paramLists.append($row);
            xcHelper.scrollToBottom($paramLists.closest(".tableContainer"));
        }

        $row.find(".paramName").text(paramName)
            .end()
            .find(".paramVal").val(paramVal === null ? "" : paramVal).removeAttr("disabled")
            .end()
            .removeClass("unfilled");
        if (isSystemParam) {
            $row.addClass("systemParams");
        } else {
            $row.addClass("currParams");
        }
        if (paramVal === "") {
            // When it's from restore and val is empty, it mease
            // previously this param is saved as "allow empty"
            $row.find(".checkbox").addClass("checked");
        }
    }

    function setParamDivToDefault($paramDiv) {
        var $group = $paramDiv.closest(".paramGroup");
        var groupNum = $editableRow.find(".paramGroup").index($group);
        var target = $paramDiv.data("target");
        var paramNames = [];
        var defaultVal = $dfParamModal.find(".templateTable .paramGroup")
                                      .eq(groupNum)
                                      .find(".boxed")
                                      .eq(target).text();

        paramNames = getParamsInInput($paramDiv);

        $paramDiv.val(defaultVal);
        handleExportValueChange($paramDiv);
        paramNames.forEach(function(name) {
            updateParamList(name);
        });
    }

    function getParamsInInput($input) {
        var val = $input.val();
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

    function updateParamList(paramName) {
        var params = [];
        var tempParams;
        var numDups = 0;
        $editableRow.find('input').each(function() {
            tempParams = getParamsInInput($(this));
            params = params.concat(tempParams);
        });
        for (var i = 0; i < params.length; i++) {
            if (params[i] === paramName) {
                numDups++;
            }
        }

        if (numDups > 0) {
            return;
        }

        // if no dups, clear the param in param list table
        $paramLists.find(".paramName").filter(function() {
            return ($(this).text() === paramName);
        }).closest(".row").remove();

        fillUpRows();
    }

    function checkInputForParam($input) {
        if ($dfParamModal.hasClass("export") && $dfParamModal.hasClass("import")) {
            return;
        }
        var params = getParamsInInput($input);
        var param;
        var $paramNames = $paramLists.find(".paramName");
        var $paramFound;

        for (var i = 0; i < params.length; i++) {
            param = params[i];
            $paramFound = $paramNames.filter(function() {
                return ($(this).text() === param);
            });
            if (!$paramFound.length) {
                if (systemParams.hasOwnProperty(param)) {
                    addParamToLists(param, CommonTxtTstr.DefaultVal, true);
                } else {
                    var df = DF.getDataflow(DFCard.getCurrentDF());
                    var paramVal = df.getParameter(param);
                    addParamToLists(param, paramVal, false);
                }
            }
        }

        params = [];
        var tempParams;
        $editableRow.find("input").each(function() {
            tempParams = getParamsInInput($(this));
            params = params.concat(tempParams);
        });

        var $params = $paramLists.find(".row:not(.unfilled)").find('.paramName');
        $params.each(function() {
            if (params.indexOf($(this).text()) === -1) {
                $(this).closest(".row").remove();
            }
        });

        fillUpRows();
    }

    // parameter - value table
    function fillUpRows() {
        var curRowLen = $paramLists.find(".row").length;
        if (curRowLen < paramListTrLen) {
            var trsNeeded = paramListTrLen - curRowLen;
            var html = "";
            for (var i = 0; i < trsNeeded; i++) {
                html += trTemplate;
            }
            $paramLists.append(html);
        }
    }

    function checkValidBrackets($input) {
        var val = $input.val();
        var len = val.length;
        var braceOpen = false;
        for (var i = 0; i < len; i++) {
            if (braceOpen) {
                if (val[i] === ">") {
                    braceOpen = false;
                }
            } else if (val[i] === "<") {
                braceOpen = true;
            }
        }
        return (!braceOpen);
    }

    function validateParamName($ele, paramName, df) {
        return xcHelper.validate([{
            "$ele": $ele,
            "error": ErrTStr.NoSpecialCharOrSpace,
            "check": function() {
                return !xcHelper.checkNamePattern("param", "check",
                                                  paramName);
            }
        },
        {
            "$ele": $ele,
            "error": xcHelper.replaceMsg(ErrWRepTStr.SystemParamConflict, {
                "name": paramName
            }),
            "check": function() {
                return systemParams.hasOwnProperty(paramName);
            }
        },
        {
            "$ele": $ele,
            "error": xcHelper.replaceMsg(ErrWRepTStr.ParamConflict, {
                "name": paramName
            }),
            "check": function() {
                return df.paramMap.hasOwnProperty(paramName);
            }
        }]);
    }
    // submit
    function submitForm() {
        //XX need to check if all default inputs are filled
        var deferred = jQuery.Deferred();
        var $paramPart = $dfParamModal.find(".editableTable");
        var $editableDivs = $paramPart.find('input.editableParamDiv');
        var $paramInputs = $dfParamModal.find('input.editableParamDiv');
        var isValid = true;
        var params;
        var dagNodeId = $dfParamModal.data("id");
        var retName = $dfParamModal.data("df");
        var radioButton = $dfParamModal.find(".advancedOpts .radioButton.active");
        if (radioButton.length === 1 && $(radioButton).data("option") === "import") {
            storeExportToTableNode();
        } else {
            storeOtherNodes();
        }
        return deferred.promise();

        function storeExportToTableNode() {
            var activeSession = true;
            var newTableName = $paramInputs.val().trim();
            var isValid = checkExistingTableName($paramInputs);
            if (!isValid) {
                deferred.reject();
                return;
            } else {
                var activeSessionOptions = {
                    "activeSession": activeSession,
                    "newTableName": newTableName
                };
                DF.saveAdvancedExportOption(retName, activeSessionOptions);
                df = DF.getDataflow(retName);
                df.updateParameterizedNode(dagNodeId, {"paramType": XcalarApisT.XcalarApiExport}, true);
                closeDFParamModal();
                xcHelper.showSuccess(SuccessTStr.ChangesSaved);
                deferred.resolve();
                return;
            }
        }
        function storeOtherNodes() {
            // check for valid brackets or invalid characters
            $paramInputs.each(function() {
                isValid = checkValidBrackets($(this));
                if (!isValid) {
                    StatusBox.show(ErrTStr.UnclosedParamBracket, $(this));
                    return false;
                }
                params = getParamsInInput($(this));
                for (var i = 0; i < params.length; i++) {
                    isValid = xcHelper.checkNamePattern("param", "check",
                                                        params[i]);
                    if (!isValid) {
                        StatusBox.show(ErrTStr.NoSpecialCharInParam, $(this));
                        var paramIndex = $(this).val().indexOf(params[i]);
                        this.setSelectionRange(paramIndex,
                                               paramIndex + params[i].length);
                        return false;
                    }
                }
            });

            if (!isValid) {
                deferred.reject();
                return;
            }

            // check for empty param values
            $editableDivs.each(function() {
                var $div = $(this);
                if (!$div.hasClass("allowEmpty") && $.trim($div.val()) === "") {
                    isValid = false;
                    StatusBox.show(ErrTStr.NoEmptyMustRevert, $div);
                    return false;
                }
            });

            if (!isValid) {
                deferred.reject();
                return;
            }

            params = [];
            var $invalidTr;
            var retName = $dfParamModal.data("df");
            var df = DF.getDataflow(retName);
            $paramLists.find(".row:not(.unfilled)").each(function() {
                var $row = $(this);
                var name = $row.find(".paramName").text();
                var val = $.trim($row.find(".paramVal").val());
                var check = $row.find(".checkbox").hasClass("checked");

                if ($row.hasClass("currParams")) {
                    if (val === "" && !check) {
                        isValid = false;
                        $invalidTr = $row;
                        return false; // stop iteration
                    }

                    if (!df.paramMap.hasOwnProperty(name)) {
                        isValid = validateParamName(
                                       $row.find(".paramName").eq(0), name, df);
                        if (!isValid) {
                            return false; // stop iteration
                        }
                        df.addParameter(name);
                    }
                    params.push({
                        "name": name,
                        "val": val
                    });
                } else if ($row.hasClass("systemParams")) {
                    if (systemParams.hasOwnProperty(name)) {
                        params.push({
                            "name": name,
                            "val": systemParams[name]
                        });
                    } else {
                        isValid = false;
                        $invalidTr = $row;
                        return false; // stop iteration
                    }
                }
            });

            if (!isValid) {
                var $paramVal = $invalidTr.find(".paramVal");
                StatusBox.show(ErrTStr.NoEmptyOrCheck, $paramVal);
                deferred.reject();
                return;
            }

            if (hasInvalidExportPath(params)) {
                deferred.reject();
                return;
            }

            var paramInfo;
            updateRetina()
            .then(function(paramInformation) {
                // store meta
                paramInfo = paramInformation;
                df.updateParameters(params);
                if (type === "export") {
                    DF.deleteActiveSessionOption(retName);
                }
                return PromiseHelper.alwaysResolve(df.updateParamMapInUsed());
            })
            .then(function() {
                DFCard.updateRetinaTab(retName);
                var noParams = params.length === 0;
                if (!df.getParameterizedNode(dagNodeId)) {
                    var val = genOrigQueryStruct();
                    df.addParameterizedNode(paramInfo.newNodeId, val, paramInfo, noParams);
                } else {
                    // Only updates view. Doesn't change any stored information
                    df.updateParameterizedNode(dagNodeId, paramInfo.newNodeId, paramInfo, noParams);
                }

                if (DF.hasSchedule(retName)) {
                    return DF.updateScheduleForDataflow(retName);
                } else {
                    return PromiseHelper.resolve();
                }
            })
            .then(function() {
                // show success message??
                DF.commitAndBroadCast(retName);
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
                updateRetinaErrorHandler(error);
                deferred.reject();
            });
        }

        function genOrigQueryStruct() {

            var $oldVals = $dfParamModal.find(".template .boxed");
            var paramType;
            var paramValue;
            var paramQuery;
            switch (type) {
                case ("filter"):
                    paramType = XcalarApisT.XcalarApiFilter;
                    if ($oldVals.length === 1) {
                        paramValue = $.trim($oldVals.eq(0).text());
                        paramQuery = [paramValue];
                    } else {
                        var filterText = $.trim($oldVals.eq(1).text());
                        var str1 = $.trim($oldVals.eq(0).text());
                        var arg;
                        paramQuery = [str1, filterText];
                        for (var i = 2; i < $oldVals.length; i++) {
                            arg = $.trim($oldVals.eq(i).text());
                            paramQuery.push(arg);
                        }
                    }
                    break;
                case ("dataStore"):
                    paramType = XcalarApisT.XcalarApiBulkLoad;
                    paramQuery = [];
                    $dfParamModal.find(".template .paramGroup").each(function() {
                        $oldVals = $(this).find(".boxed");
                        var targetName = $.trim($oldVals.eq(0).text());
                        var url = $.trim($oldVals.eq(1).text());
                        var pattern =  $.trim($oldVals.eq(2).text());
                        var args = [targetName, url, pattern];
                        paramQuery.push(args);
                    });

                    break;
                case ("export"):
                    paramType = XcalarApisT.XcalarApiExport;
                    var fileName = $.trim($oldVals.eq(0).text());
                    var targetName = $.trim($oldVals.eq(1).text());
                    fileName += ".csv";
                    paramQuery = [fileName, targetName];
                    break;
            }

            return {
                "paramType": paramType,
                "paramValue": paramQuery
            };
        }

        // will close the modal if passes checks
        function updateRetina() {
            var deferred = jQuery.Deferred();

            var updatedInfo = getUpdateInfo($editableDivs, params);
            if (updatedInfo.error) {
                return PromiseHelper.reject(updatedInfo.error);
            }

            var paramType = updatedInfo.paramType;
            var paramValues = updatedInfo.paramValues;
            var paramQuery = updatedInfo.paramQuery;

            closeDFParamModal(true);

            if (paramType === XcalarApisT.XcalarApiExport) {
                tName = altTableName;
            } else {
                tName = tableName;
            }
            var oldNodes = DF.getDataflow(retName).retinaNodes;
            XcalarUpdateRetina(retName, tName, paramType, paramValues)
            .then(function() {
                return XcalarGetRetina(retName);
            })
            .then(function(retStruct) {
                var dataflow = DF.getDataflow(retName)
                dataflow.retinaNodes = retStruct.retina.retinaDag.node;
                dataflow.nodeIds = {};
                var curNodeId;
                var newNodeId;
                var $df = $("#dfViz").find('.dagWrap[data-dataflowName="' + retName + '"]');
                for (var i = 0; i < dataflow.retinaNodes.length; i++) {
                    var tName = dataflow.retinaNodes[i].name.name;
                    var curNodeId = dataflow.retinaNodes[i].dagNodeId
                    dataflow.addNodeId(tName, curNodeId);
                    if (tName === tableName) {
                        newNodeId = curNodeId;
                    }

                    $df.find('[data-nodeid="' + oldNodes[i].dagNodeId + '"]')
                       .attr("data-nodeid", curNodeId)
                       .data("nodeid", curNodeId);
                }
                var paramInfo = {
                    "paramType": paramType,
                    "paramValue": paramQuery,
                    "newNodeId": newNodeId
                };

                deferred.resolve(paramInfo);
            })
            .fail(deferred.reject);

            return (deferred.promise());
        }
    }

    function getUpdateInfo($editableDivs, params) {
        var paramType = null;
        var paramValues = {};
        var paramQuery;
        var error = false;
        switch (type) {
            case ("filter"):
                paramType = XcalarApisT.XcalarApiFilter;
                var filterStr;
                if ($editableDivs.length === 1) {
                    filterStr = $.trim($editableDivs.eq(0).val());
                } else {
                    var filterText = $.trim($editableDivs.eq(1).val());
                    var str1 = $.trim($editableDivs.eq(0).val());
                    var filterExists = checkIfValidFilter(filterText,
                                                          $editableDivs.eq(1),
                                                          params);

                    if (!filterExists) {
                        return {error: ErrTStr.FilterTypeNoSupport};
                    }

                    var additionalArgs = "";
                    var arg;
                    for (var i = 2; i < $editableDivs.length; i++) {
                        arg = $.trim($editableDivs.eq(i).val());
                        additionalArgs += arg + ",";
                    }
                    additionalArgs = additionalArgs.slice(0, -1);
                    if (additionalArgs.length) {
                        additionalArgs = "," + additionalArgs;
                    }

                    filterStr = filterText + "(" + str1 +
                                                additionalArgs + ")";
                }
                paramValues.filterStr = filterStr;
                paramQuery = [filterStr];
                break;
            case ("dataStore"):
                paramType = XcalarApisT.XcalarApiBulkLoad;
                var numGroups = $editableRow.find(".paramGroup");
                paramQuery = [];
                paramValues = [];
                $editableRow.find(".paramGroup").each(function() {
                    var paramGroup = {};
                    $editableDivs = $(this).find("input.editableParamDiv");
                    var url = $.trim($editableDivs.eq(1).val());
                    var pattern = $.trim($editableDivs.eq(2).val());
                    paramGroup.path = url;
                    paramGroup.fileNamePattern = pattern;
                    var targetName = $.trim($editableDivs.eq(0).val());
                    paramValues.targetName = targetName;
                    paramQuery = [targetName, url, pattern];
                });
                break;
            case ("export"):
                paramType = XcalarApisT.XcalarApiExport;
                var fileName = $.trim($editableDivs.eq(0).val());
                fileName += ".csv";
                var targetName = $.trim($editableDivs.eq(1).val());

                paramValues.fileName = fileName;
                paramValues.targetName = targetName;
                var paramTargetName = getTargetName(targetName, params);
                // XXX Fix this when exportTargets become real targets
                var target = DSExport.getTarget(paramTargetName);
                if (target) {
                    paramValues.targetType = ExTargetTypeTStr[target.type];
                    paramQuery = [fileName, targetName, target.type];
                    var expOptions = getExportOptions();
                    paramValues = $.extend(paramValues, expOptions);
                } else {
                    error = "target not found";
                }
                break;
            default:
                error = "currently not supported";
                break;
        }
        var res = {
            paramValues: paramValues,
            paramQuery: paramQuery,
            paramType: paramType,
            error: error
        };

        return res;
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
            var $editableDivs = $dfParamModal.find(".editableTable")
                                             .find('input.editableParamDiv');
            StatusBox.show(error, $editableDivs.eq(1));
        } else {
            Alert.error(DFTStr.UpdateParamFail, error);
        }
    }

    function checkIfValidFilter(filterText, $input, params) {
        var numParams = params.length;
        var find;
        var rgx;
        var param;
        var val;
        var filterParamText = filterText;
        for (var i = 0; i < numParams; i++) {
            param = params[i].name;
            val = params[i].val;
            find = "<" + xcHelper.escapeRegExp(param) + ">";
            rgx = new RegExp(find, 'g');
            filterParamText = filterParamText.replace(rgx, val);
        }

        // Check if filterParamText matches a filter type from dropdown list
        var $lis = $input.siblings('.list').find('li');
        var filterExists = $lis.filter(function() {
            return ($(this).text() === filterParamText);
        }).length;

        return (filterExists);
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

    // returns true if doesn't have .extension
    function hasInvalidExportPath(params) {
        if (type !== "export") {
            return false;
        }

        var $input = $dfParamModal.find(".editableTable")
                                .find("input.editableParamDiv").eq(0);
        var val =  $input.val();
        for (var i = 0; i < params.length; i++) {
            var name = xcHelper.escapeRegExp(params[i].name);
            var regex = new RegExp("<" + name + ">", "g");
            val = val.replace(regex, params[i].val);
        }

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

    function populateSavedFields(dagNodeId, retName) {
        var df = DF.getDataflow(retName);
        var retinaNode = df.getParameterizedNode(dagNodeId);
        var paramMap = df.paramMap;
        var nameMap = {};
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
        if (retinaNode != null && retinaNode.paramValue != null) {
            var $templateVals = $dfParamModal.find(".template .boxed");
            var i = 0;
            var parameterizedVals = [];
            var paramVal;

            $templateVals.each(function() {
                parameterizedVals.push(decodeURI($(this).text()));
            });

            for (; i < retinaNode.paramValue.length; i++) {
                if (retinaNode.paramType === XcalarApisT.XcalarApiExport &&
                    i > 1) {
                    // no need to add export's 3rd param which is export type
                    break;
                }
                if (!$templateVals.eq(i).length) {
                    // more params than there are divs
                    var html = '<div class="boxed medium"></div>';
                    $dfParamModal.find(".template").append(html);
                    $templateVals = $dfParamModal.find(".template .boxed");
                }
                paramVal = retinaNode.paramValue[i];
                if (retinaNode.paramType === XcalarApisT.XcalarApiExport &&
                    i === 0) {
                    paramVal = xcHelper.stripCSVExt(paramVal);
                }
                // datastores has nested arrays
                if (typeof paramVal === "object") {
                    for (var j = 0; j < paramVal.length; j++) {
                        $templateVals.eq(i * paramVal.length + j).text(paramVal[j]);
                    }
                } else {
                    $templateVals.eq(i).text(paramVal);
                }
            }
            // $dfParamModal.find(".template .boxed:gt(" +
            //                 (retinaNode.paramValue.length - 1) + ")").remove();
            // if ($dfParamModal.find(".template .boxed").length === 1) {
            //     $dfParamModal.find(".template").find(".static").remove();
            // }

            var $editableDivs = $editableRow.find("input.editableParamDiv");

            parameterizedVals.forEach(function(query, index) {
                var html = query;
                var len = query.length;
                var p = 0;
                var startIndex;
                var endIndex;
                var paramName;

                while (p < len) {
                    startIndex = query.indexOf("<", p);
                    if (startIndex < 0) {
                        // do not find <,
                        break;
                    }

                    endIndex = query.indexOf(">", startIndex);
                    if (endIndex < 0) {
                        // do not find >,
                        break;
                    }

                    // when find a "<>"
                    paramName = query.substring(startIndex + 1, endIndex);
                    if (paramMap.hasOwnProperty(paramName)) {
                        nameMap[paramName] = true;
                    }

                    p = endIndex + 1;
                }

                $editableDivs.eq(index).val(html);
            });

            // keep the order of paramName the in df.parameters
            df.parameters.forEach(function(paramName) {
                if (nameMap.hasOwnProperty(paramName)
                    && (!systemParams.hasOwnProperty(paramName))) {
                    addParamToLists(paramName, paramMap[paramName], false);
                }
            });

            for (var systemParam in systemParams) {
                if (nameMap.hasOwnProperty(systemParam)) {
                    addParamToLists(systemParam, CommonTxtTstr.DefaultVal,
                    true);
                }
            }
        }
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
                    (systemParams.hasOwnProperty(paramName)
                    ? ""
                    : '<i class="icon xi-close deleteParam"></i>') +
                '</div>';

        return (html);
    }

    function closeDFParamModal(noCommit) {
        if (!noCommit) {
            if (hasChange) {
                hasChange = false;
                var retName = $dfParamModal.data("df");
                DF.commitAndBroadCast(retName);
            }
        }
        modalHelper.clear();
        $editableRow.empty();
        $dfParamModal.find('.draggableParams').empty();
        $paramLists.empty();
        defaultParam = null;
        isOpen = false;
    }

    function getParamValues(df, nodeId) {
        var paramValues = [];
        var node = df.retinaNodes.find(function(node) {
            return node.dagNodeId === nodeId;
        });
        var apiString = XcalarApisTStr[node.api];
        var inputName = DagFunction.getInputType(apiString);
        var struct = node.input[inputName];
        switch (type) {
            case ("filter"):
                paramValues = [struct.eval[0].evalString];
                break;
            case ("dataStore"):
                var sourceArgs;
                for (var i = 0; i < struct.loadArgs.sourceArgsList.length; i++) {
                    sourceArgs = struct.loadArgs.sourceArgsList[i];
                    paramValues.push([sourceArgs.targetName, sourceArgs.path,
                                    sourceArgs.fileNamePattern]);
                }
                break;
            case ("export"):
                paramValues = [struct.fileName, struct.targetName,
                               struct.targetType];
                break;
            default:
                break;
        }
        return paramValues;
    }


    /* Unit Test Only */
    if (window.unitTestMode) {
        DFParamModal.__testOnly__ = {};
        DFParamModal.__testOnly__.storeRetina = submitForm;
        DFParamModal.__testOnly__.closeDFParamModal = closeDFParamModal;
        DFParamModal.__testOnly__.checkForOneParen = checkForOneParen;
        DFParamModal.__testOnly__.suggest = suggest;
        DFParamModal.__testOnly__.checkInputForParam = checkInputForParam;
        DFParamModal.__testOnly__.getExportOptions = getExportOptions;
        DFParamModal.__testOnly__.strToSpecialChar = strToSpecialChar;
        DFParamModal.__testOnly__.setDragElems = function(a, b) {
            crt = a;
            cover = b;
        };
    }
    /* End Of Unit Test Only */


    return (DFParamModal);

}(jQuery, {}));

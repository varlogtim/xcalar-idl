window.DFGParamModal = (function($, DFGParamModal){
    var $dfgParamModal; // $("#dfgParameterModal")

    var $paramLists;    // $("#dagModleParamList")
    var $editableRow;   // $dfgParamModal.find(".editableRow")

    var validParams = [];
    var modalHelper;
    var dropdownHelper;

    var paramListTrLen = 7;
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

    DFGParamModal.setup = function() {
        // constant
        var minHeight = 425;
        var minWidth  = 750;

        $dfgParamModal = $("#dfgParameterModal");
        $paramLists = $("#dagModleParamList");
        $editableRow = $dfgParamModal.find(".editableRow");
        modalHelper = new ModalHelper($dfgParamModal, {
            "minHeight": minHeight,
            "minWidth" : minWidth
        });

        $dfgParamModal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        $dfgParamModal.resizable({
            "handles"    : "n, e, s, w, se",
            "minHeight"  : minHeight,
            "minWidth"   : minWidth,
            "containment": "document",
            "resize"     : function() {
                // need a fixed width to fix the scroll bar
                var tableW = $paramLists.closest(".tableContainer").width();
                $paramLists.width(tableW);
            }
        });


        $dfgParamModal.find('.cancel, .close').click(function() {
            closeDFGParamModal();
        });

        $dfgParamModal.find('.confirm').click(function() {
            storeRetina();
        });

        $dfgParamModal.on('focus', '.paramVal', function() {
            $(this).select().siblings(".paramEdit").addClass('selected');
        });

        $dfgParamModal.on('blur', '.paramVal', function() {
            $(this).siblings(".paramEdit").removeClass('selected');
        });

        $dfgParamModal.on('click', '.paramEdit', function() {
            $(this).siblings(".paramVal").focus();
        });

        $dfgParamModal.on('click', '.checkbox', function() {
            $(this).toggleClass("checked");
        });

        $dfgParamModal.on('keypress', '.editableParamDiv', function(event) {
            return (event.which !== keyCode.Enter);
        });

        $dfgParamModal.on("click", ".editableTable .defaultParam", function() {
            setParamDivToDefault($(this).siblings("input"));
        });

        var checkInputTimeout;
        $dfgParamModal.on("input", ".editableParamDiv", function() {
            var $input = $(this);
            suggest($input);
            clearTimeout(checkInputTimeout);
            checkInputTimeout = setTimeout(function() {
                checkInputForParam($input);
            }, 200);
        });

        $dfgParamModal.on('click', function(event) {
            var $target = $(event.target);
            if ($target.closest('.dropDownList').length === 0) {
                $dfgParamModal.find('.list').hide();
            }
        });

        $dfgParamModal.draggable({
            handle     : '.modalHeader',
            containment: 'window',
            cursor     : '-webkit-grabbing'
        });
    };

    DFGParamModal.show = function($currentIcon) {
        var type = $currentIcon.data('type');
        var tableName = $currentIcon.data('table') || // For aliased tables
                        $currentIcon.data('tablename');
        var dfgName = DFGCard.getCurrentDFG();
        var dfg = DFG.getGroup(dfgName);
        var id = dfg.nodeIds[tableName];

        $dfgParamModal.data({
            "id" : id,
            "dfg": dfgName
        });
        var defaultText = ""; // The html corresponding to Current Query:
        var editableText = ""; // The html corresponding to Parameterized Query:
        if (type === "dataStore") {
            defaultText += '<td>' +
                                DFGTStr.PointTo + ':' +
                            '</td>' +
                            '<td>' +
                                '<div class="boxed xlarge">' +
                                    $currentIcon.data('url') +
                                '</div>' +
                            '</td>';

            editableText += '<td class="static" data-op="load">' +
                                DFGTStr.PointTo + ':' +
                            '</td>' +
                            getParameterInputHTML(0, "xlarge");
        } else if (type === "export") {
            defaultText += '<td>' +
                                DFGTStr.ExportTo + ':' +
                            '</td>' +
                            '<td>' +
                                '<div class="boxed xlarge">' +
                                    $currentIcon.data('url') +
                                '</div>' +
                            '</td>';

            editableText += '<td class="static" data-op="export">' +
                                DFGTStr.ExportTo + ':' +
                            '</td>' +
                            getParameterInputHTML(0, "xlarge");
        } else { // not a datastore but a table
            defaultText += '<td>' + type + ':</td>' +
                            '<td>' +
                                '<div class="boxed medium">' +
                                    $currentIcon.data('column') +
                                '</div>' +
                            '</td>';

            editableText += '<td class="static" data-op="' + type + '">' +
                                type + ':' +
                            '</td>';

            if (type === "filter") {
                var filterInfo = $currentIcon.data('info') + " ";
                var parenIndex = filterInfo.indexOf("(");
                var abbrFilterType = filterInfo.slice(0, parenIndex);
                var filterValue = filterInfo.slice(filterInfo.indexOf(',') + 2,
                                                    filterInfo.indexOf(')'));

                defaultText += '<td class="static">by</td>' +
                                '<td>' +
                                    '<div class="boxed sm-med">' +
                                        abbrFilterType +
                                    '</div>' +
                                '</td>' +
                                '<td>' +
                                    '<div class="boxed medium">' +
                                        filterValue +
                                    '</div>' +
                                '</td>';

                editableText +=
                        getParameterInputHTML(0, "medium") +
                        '<td class="static">by</td>' +
                        getParameterInputHTML(1, "sm-med", {filter: true}) +
                        getParameterInputHTML(2, "medium allowEmpty");
            } else {
                // index, sort, map etc to be added in later
                defaultText += "<td>by</td>";
            }
        }

        $dfgParamModal.find('.template').html(defaultText);
        $editableRow.html(editableText);


        var draggableInputs = "";
        validParams = [];
        DFG.getGroup(dfgName).parameters.forEach(function(paramName) {
            draggableInputs += generateDraggableParams(paramName);
            validParams.push(paramName);
        });

        if (draggableInputs === "") {
            draggableInputs = DFGTStr.AddParamHint;
            $dfgParamModal.find('.draggableParams').addClass("hint")
                        .html(draggableInputs);
        } else {
            $dfgParamModal.find('.draggableParams').removeClass("hint")
                            .html(draggableInputs);
        }

        fillUpRows();
        populateSavedFields(id, dfgName);

        if (type === "filter") {
            var $list = $dfgParamModal.find('.tdWrapper.dropDownList');

            var dropdownHelper = new MenuHelper($list, {
                "onSelect": function($li) {
                    var func = $li.text();
                    var $input = $list.find("input.editableParamDiv");

                    if (func === $input.val().trim()) {
                        return;
                    }

                    $input.val(func);
                },
                "onOpen": function() {
                    var $lis = $list.find('li')
                                    .sort(sortHTML)
                                    .show();
                    $lis.prependTo($list.find('ul'));
                    $list.find('ul').width($list.width() - 1);
                },
                "container"    : "#dfgParameterModal",
                "bounds"       : "#dfgParameterModal",
                "bottomPadding": 5,
                "exclude"      : '.draggableDiv, .defaultParam'
            });
            dropdownHelper.setupListeners();

            XcalarListXdfs('*', 'Conditional*')
            .then(function(ret) {
                var numXdfs = ret.numXdfs;
                var html = "";
                var fnNames = [];
                for (var i = 0; i < numXdfs; i++) {
                    fnNames.push(ret.fnDescs[i].fnName);
                }
                fnNames = fnNames.sort();
                for (i = 0; i < numXdfs; i++) {
                    html += '<li>' + fnNames[i] + '</li>';
                }
                $list.find('ul').html(html);
            })
            .fail(function(error) {
                Alert.error(DFGTStr.ParamModalFail, error);
            });
        }

        modalHelper.setup();

        var $dummyInputs = $dfgParamModal.find('.dummy');
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
    };

    DFGParamModal.paramDragStart = function(event) {
        event.dataTransfer.effectAllowed = "copyMove";
        event.dataTransfer.dropEffect = "copy";
        event.dataTransfer.setData("text", event.target.id);
        event.stopPropagation();
        var $origin = $(event.target).parent();
        var origin;
        if ($origin.hasClass('draggableParams')) {
            origin = 'home';
        } else {
            origin = $origin.data('target');
        }

        $dfgParamModal.find('input.editableParamDiv').each(function() {
            var width = $(this).width();
            $(this).siblings('.dummyWrap').show().width(width);
            $(this).hide();
        });

        var val;
        var valLen;
        var html = "";
        var chr;
        $dfgParamModal.find('input.editableParamDiv').each(function() {
            val = $(this).val();
            valLen = val.length;
            html = "";
            for (var i = 0; i < valLen; i++) {
                chr = val[i];
                if (chr === " ") {
                    chr = "&nbsp;";
                }
                html += '<span class="line" ' +
                      'ondragover="DFGParamModal.allowParamDrop(event)" ' +
                      'ondrop="DFGParamModal.paramDropLine(event)">' + chr +
                      '</span>';
            }
            html += '<span class="space" ' +
                    'ondragover="DFGParamModal.allowParamDrop(event)" ' +
                    'ondrop="DFGParamModal.paramDropSpace(event)"></span>';
            $(this).siblings('.dummyWrap').find('.dummy').html(html);
        });

        $editableRow.data('origin', origin);
    };

    DFGParamModal.paramDragEnd = function (event) {
        event.stopPropagation();
        $editableRow.data('copying', false);
        $dfgParamModal.find('.dummyWrap').hide();
        $dfgParamModal.find('input.editableParamDiv').show();
    };

    DFGParamModal.paramDrop = function(event) {
        event.stopPropagation();
        var $dropTarget = $(event.target);
        var paramId = event.dataTransfer.getData("text");
        if (!$dropTarget.hasClass('editableParamDiv')) {
            return; // only allow dropping into the appropriate boxes
        }

        var $draggableParam = $('#' + paramId).clone();
        var data = $editableRow.data('origin');

        if (data !== 'home') {
            // the drag origin is from another box, therefore we're moving the
            // div so we have to remove it from its old location
            $editableRow.find('.editableParamDiv').filter(function() {
                return ($(this).data('target') === data);
            }).find('#' + paramId + ':first').remove();
            // we remove the dragging div from its source
        }

        $dropTarget.text($dropTarget.text() + $draggableParam.text());
        $dropTarget.parent().siblings('input').val($dropTarget.text());

        checkInputForParam($dropTarget.parent().siblings('input'));
    };

    DFGParamModal.paramDropLine = function(event) {
        event.stopPropagation();
        var $dropTarget = $(event.target);
        var $dropTargParent = $dropTarget.parent();
        var paramId = event.dataTransfer.getData("text");

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

    DFGParamModal.paramDropSpace = function(event) {
        event.stopPropagation();
        var $dropTarget = $(event.target);
        var $dropTargParent = $dropTarget.parent();
        var paramId = event.dataTransfer.getData("text");

        var $draggableParam = $('#' + paramId);

        var currentText = $dropTargParent.text();
        var newVal = currentText + $draggableParam.text();
        $dropTargParent.text(newVal);

        $dropTargParent.parent().siblings('input').val(newVal);
        checkInputForParam($dropTargParent.parent().siblings('input'));
    };

    DFGParamModal.allowParamDrop = function(event) {
        event.preventDefault();
    };

    function suggest($input) {
        var value = $input.val().trim().toLowerCase();
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

        $visibleLis.sort(sortHTML).prependTo($list.find('ul'));

        dropdownHelper.showOrHideScrollers();

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

    function sortHTML(a, b){
        return ($(b).text()) < ($(a).text()) ? 1 : -1;
    }

    function addParamToLists(paramName, paramVal, isRestore) {
        var $row = $paramLists.find(".unfilled:first");

        if ($row.length === 0) {
            $row = $(trTemplate);
            $paramLists.append($row);
            xcHelper.scrollToBottom($paramLists.closest(".tableContainer"));
        }

        $row.find(".paramName").text(paramName)
            .end()
            .find(".paramVal").val(paramVal).removeAttr("disabled")
            .end()
            .removeClass("unfilled");
        if (isRestore && paramVal === "") {
            // When it's from restore and val is empty, it mease
            // previously this param is saved as "allow empty"
            $row.find(".checkbox").addClass("checked");
        }
    }

    function setParamDivToDefault($paramDiv) {
        var target = $paramDiv.data("target");
        var paramNames = [];
        var defaultVal = $dfgParamModal.find(".templateTable .boxed")
                                        .eq(target).text();

        paramNames = getParamsInInput($paramDiv);

        $paramDiv.val(defaultVal);
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
        var params = getParamsInInput($input);
        var param;
        var $paramNames = $paramLists.find(".paramName");
        var $paramFound;

        for (var i = 0; i < params.length; i++) {
            param = params[i];
            $paramFound = $paramNames.filter(function() {
                return ($(this).text() === param);
            });
            if (!$paramFound.length && validParams.indexOf(param) !== -1) {
                var dfg = DFG.getGroup($dfgParamModal.data("dfg"));
                var paramVal = dfg.getParameter(param) || "";
                addParamToLists(param, paramVal);
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

    function storeRetina() {
        //XX need to check if all default inputs are filled
        var $paramPart = $dfgParamModal.find(".editableTable");
        var $editableDivs = $paramPart.find('input.editableParamDiv');
        var $paramInputs = $dfgParamModal.find('input.editableParamDiv');
        var isValid = true;
        var regex = /^[a-zA-Z0-9_]*$/; // allow alphanumeric and underscores
        var params;
        // check for valid brackets or invalid characters
        $paramInputs.each(function() {
            isValid = checkValidBrackets($(this));
            if (!isValid) {
                StatusBox.show(ErrTStr.UnclosedParamBracket, $(this));
                return false;
            }
            params = getParamsInInput($(this));
            for (var i = 0; i < params.length; i++) {
                isValid = regex.test(params[i]);
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
            return;
        }

        // check for empty param values
        $editableDivs.each(function() {
            var $div = $(this);
            if (!$div.hasClass("allowEmpty") && $div.val().trim() === "") {
                isValid = false;
                StatusBox.show(ErrTStr.NoEmpty, $div);
                return false;
            }
        });

        if (!isValid) {
            return;
        }

        params = [];
        var $invalidTr;
        $paramLists.find(".row:not(.unfilled)").each(function() {
            var $row = $(this);
            var name = $row.find(".paramName").text();
            var val = $row.find(".paramVal").val().trim();
            var check = $row.find(".checkbox").hasClass("checked");

            if (val === "" && !check) {
                isValid = false;
                $invalidTr = $row;
                return false; // stop iteration
            }

            params.push({
                "name": name,
                "val" : val
            });
        });

        if (!isValid) {
            var $paramVal = $invalidTr.find(".paramVal");
            StatusBox.show(ErrTStr.NoEmptyOrCheck, $paramVal);
            return;
        }

        var retName = $dfgParamModal.data("dfg");
        var dfg = DFG.getGroup(retName);
        var dagNodeId = $dfgParamModal.data("id");
        var curParamInfo;

        updateRetina()
        .then(function(paramInfo) {
            curParamInfo = paramInfo;
            // store meta
            dfg.updateParameters(params);

            DFGCard.updateRetinaTab(retName);

            // this marks that the update retina is done
            dfg.addRetinaNode(dagNodeId, curParamInfo);
            KVStore.commit();
            closeDFGParamModal();
            // show success message??
        })
        .fail(function(error) {
            Alert.error(DFGTStr.UpdateParamFail, error);
        });

        return;

        function updateRetina() {
            var deferred  = jQuery.Deferred();
            var operation = $paramPart.find("td:first").data("op");
            var paramType = null;
            var paramValue;
            var paramQuery;
            // var paramInput = new XcalarApiParamInputT();

            switch (operation) {
                case ("filter"):
                    paramType = XcalarApisT.XcalarApiFilter;

                    var filterText = $editableDivs.eq(1).val().trim();
                    var str1 = $editableDivs.eq(0).val().trim();
                    var str2 = $editableDivs.eq(2).val().trim();
                    var filterExists = checkIfValidFilter(filterText,
                                                          $editableDivs.eq(1),
                                                          params);

                    if (!filterExists) {
                        deferred.reject("Filter type not currently supported.");
                        return (deferred.promise());
                    }

                    paramValue = filterText + "(" + str1 + "," + str2 + ")";
                    // paramInput.paramFilter = new XcalarApiParamFilterT();
                    // paramInput.paramFilter.filterStr = str;
                    paramQuery = [str1, filterText, str2];
                    break;
                case ("load"):
                    paramType = XcalarApisT.XcalarApiBulkLoad;
                    paramValue = $editableDivs.eq(0).val().trim();
                    // paramInput.paramLoad = new XcalarApiParamLoadT();
                    // paramInput.paramLoad.datasetUrl = str;
                    paramQuery = [paramValue];
                    break;
                case ("export"):
                    paramType = XcalarApisT.XcalarApiExport;
                    paramValue = $editableDivs.eq(0).val().trim();
                    paramQuery = [paramValue];
                    break;
                default:
                    deferred.reject("currently not supported");
                    break;
            }

            if (paramType == null) {
                deferred.reject("currently not supported");
            } else {
                XcalarUpdateRetina(retName, dagNodeId, paramType, paramValue)
                .then(function() {
                    var paramInfo = {
                        "paramType" : paramType,
                        "paramValue": paramValue,
                        "paramQuery": paramQuery
                    };
                    deferred.resolve(paramInfo);
                })
                .fail(deferred.reject);
            }

            return (deferred.promise());
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
            find = "<" + param + ">";
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

    function getParameterInputHTML(inputNum, extraClass, options) {
        var divClass = "editableParamDiv boxed";
        options = options || {};
        if (extraClass != null) {
            divClass += " " + extraClass;
        }
        var td = '<td>';
        if (options.filter) {
            td += '<div class="tdWrapper dropDownList">';
        } else {
            td += '<div class="tdWrapper">';
        }

        td += '<input class="' + divClass + '" ' +
                'data-target="' + inputNum + '" ' +
                'spellcheck="false" type="text">' +
                '<div class="dummyWrap ' + divClass + '">' +
                '<div class="dummy ' + divClass + '" ' +
                'ondragover="DFGParamModal.allowParamDrop(event)"' +
                'ondrop="DFGParamModal.paramDrop(event)" ' +
                'data-target="' + inputNum + '"></div></div>';

        if (options.filter) {
            td += '<div class="list">' +
                    '<ul><li>first item</li></ul>' +
                    '<div class="scrollArea top">' +
                        '<div class="arrow"></div>' +
                    '</div>' +
                    '<div class="scrollArea bottom">' +
                        '<div class="arrow"></div>' +
                    '</div>' +
                  '</div>';
        }

        td += '<div title="' + CommonTxtTstr.DefaultVal + '" ' +
                'class="defaultParam iconWrap xc-action" ' +
                'data-toggle="tooltip" ' +
                'data-placement="top" data-container="body">' +
                    '<i class="icon xi-restore center fa-15"></i>' +
                '</div>' +
                '</div>' +
                '</td>';
        return (td);
    }

    function populateSavedFields(dagNodeId, retName) {
        var dfg = DFG.getGroup(retName);
        var retinaNode = dfg.getRetinaNode(dagNodeId);
        var paramMap = dfg.paramMap;
        var nameMap = {};

        if (retinaNode != null && retinaNode.paramQuery != null) {
            var $editableDivs = $editableRow.find("input.editableParamDiv");

            retinaNode.paramQuery.forEach(function(query, index) {
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

            // keep the order of paramName the in dfg.parameters
            dfg.parameters.forEach(function(paramName) {
                if (nameMap.hasOwnProperty(paramName)) {
                    addParamToLists(paramName, paramMap[paramName], true);
                }
            });
        }
    }

    function generateDraggableParams(paramName) {
        var html = '<div id="draggableParam-' + paramName +
                '" class="draggableDiv" ' +
                'draggable="true" ' +
                'ondragstart="DFGParamModal.paramDragStart(event)" ' +
                'ondragend="DFGParamModal.paramDragEnd(event)" ' +
                'ondrop="return false" ' +
                'title="' + CommonTxtTstr.HoldToDrag + '" ' +
                'contenteditable="false">' +
                    '<div class="icon"></div>' +
                    '<span class="delim"><</span>' +
                    '<span class="value">' + paramName + '</span>' +
                    '<span class="delim">></span>' +
                '</div>';

        return (html);
    }

    function closeDFGParamModal() {
        modalHelper.clear();
        $editableRow.empty();
        $dfgParamModal.find('.draggableParams').empty();
        $paramLists.empty();
    }

    return (DFGParamModal);

}(jQuery, {}));

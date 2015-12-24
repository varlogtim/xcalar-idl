window.DFGParamModal = (function($, DFGParamModal){
    var $dfgParamModal = $("#dfgParameterModal");
    var $modalBg       = $("#modalBackground");
    var modalHelper    = new xcHelper.Modal($dfgParamModal, { "noResize": true });

    var $paramLists  = $("#dagModleParamList");
    var $editableRow = $dfgParamModal.find('.editableRow');
    var dropdownHelper;

    var paramListTrLen = 6;
    var trTemplate = '<tr class="unfilled">' +
                        '<td class="paramNameWrap">' +
                            '<div class="paramName"></div>' +
                        '</td>' +
                        '<td>' +
                            '<div class="paramValWrap">' +
                                '<input class="paramVal" spellcheck="false" disabled/>' +
                                '<div class="options">' +
                                    '<div class="option paramEdit">' +
                                        '<span class="icon"></span>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</td>' +
                        '<td>' +
                            '<div class="checkboxWrap">' +
                                '<span class="checkbox"></span>' +
                            '</div>' +
                        '</td>' +
                    '</tr>';
    var filterTypeMap = {
        "gt"   : ">",
        "ge"   : "&ge;",
        "eq"   : "=",
        "lt"   : "<",
        "le"   : "&le;",
        "regex": "regex",
        "like" : "like",
        "not"  : "not"
    };

    DFGParamModal.setup = function() {
        $dfgParamModal.find('.cancel, .close').click(function() {
            closeDfgParamModal();
        });

        $dfgParamModal.find('.confirm').click(function() {
            storeRetina();
        });

        $dfgParamModal.on('click', '.draggableDiv .close', function() {
            var paramVal = $(this).siblings('.value').text();
            $(this).parent().remove();

            updateParamList(paramVal);
        });

        $dfgParamModal.on('focus', '.paramVal', function() {
            $(this).next().find('.paramEdit').addClass('selected');
        });

        $dfgParamModal.on('blur', '.paramVal', function() {
            $(this).next().find('.paramEdit').removeClass('selected');
        });

        $dfgParamModal.on('click', '.paramEdit', function() {
            $(this).closest('td').find('.paramVal').focus();
        });

        $dfgParamModal.on('click', '.checkbox', function() {
            $(this).toggleClass("checked");
        });

        $dfgParamModal.on('keypress', '.editableParamDiv', function(event) {
            return (event.which !== keyCode.Enter);
        });

        $dfgParamModal.on("click", ".editableTable .defaultParam", function() {
            setParamDivToDefault($(this).siblings(".editableParamDiv"));
        });

        $dfgParamModal.on("input", ".editableParamDiv", function() {
            suggest($(this));
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
        var tableName = $currentIcon.data('table');
        var dfgName = DFGPanel.getCurrentDFG();
        var dfg = DFG.getGroup(dfgName);
        var id = dfg.nodeIds[tableName];

        $dfgParamModal.data({
            "id" : id,
            "dfg": dfgName
        });
        var defaultText = ""; // The html corresponding to Current Query:
        var editableText = ""; // The html corresponding to Parameterized Query:
        if (type === "dataStore") {
            defaultText += '<td>Load</td>';
            defaultText += '<td><div class="boxed large">' +
                            $currentIcon.data('url') +
                            '</div></td>';

            editableText += "<td class='static'>Load</td>";
            editableText += getParameterInputHTML(0, "xlarge");
        } else if (type === "export") {
            defaultText += '<td>Export to</td>';
            defaultText += '<td><div class="boxed large">' +
                            $currentIcon.data('url') +
                            '</div></td>';

            editableText += "<td class='static'>Export to</td>";
            editableText += getParameterInputHTML(0, "xlarge");
        } else { // not a datastore but a table
            defaultText += "<td>" + type + "</td>";
            defaultText += "<td><div class='boxed medium'>" +
                            $currentIcon.data('column') +
                            "</div></td>";

            editableText += "<td class='static'>" + type + "</td>";
        }

        if (type === "filter") {
            var filterInfo = $currentIcon.data('info') + " ";
            var parenIndex = filterInfo.indexOf("(");
            var abbrFilterType = filterInfo.slice(0, parenIndex);
            var filterValue = filterInfo.slice(filterInfo.indexOf(',') + 2,
                                                  filterInfo.indexOf(')'));

            defaultText += "<td class='static'>by</td>";
            defaultText += "<td><div class='boxed small'>" +
                            filterTypeMap[abbrFilterType] + "</div></td>";
            defaultText += "<td><div class='boxed medium'>" +
                            filterValue + "</div></td>";

            editableText += getParameterInputHTML(0, "medium") +
                            '<td class="static">by</td>' +
                            getParameterInputHTML(1, "medium", {filter: true}) +
                            getParameterInputHTML(2, "medium allowEmpty");
            
        } else if (type === "dataStore" || type === "export") {
            // do nothing
        } else { // index, sort, map etc to be added in later
            defaultText += "<td>by</td>";
        }

        $dfgParamModal.find('.template').html(defaultText);
        $editableRow.html(editableText);


        var draggableInputs = "";
        DFG.getGroup(dfgName).parameters.forEach(function(paramName) {
            draggableInputs += generateDraggableParams(paramName);
        });

        if (draggableInputs === "") {
            draggableInputs = "Please create parameters in Data Flow Group Panel first.";
            $dfgParamModal.find('.draggableParams').addClass("hint")
                        .html(draggableInputs);
        } else {
            $dfgParamModal.find('.draggableParams').removeClass("hint")
                            .html(draggableInputs);
        }

        generateParameterDefaultList();
        populateSavedFields(id, dfgName);

        if (type === "filter") {
            var $list = $dfgParamModal.find('.tdWrapper.dropDownList');

            dropdownHelper = new xcHelper.dropdownList($list, {
                "onSelect": function($li) {
                    var func = $li.text();
                    var $input = $list.find(".editableParamDiv");

                    if (func === $input.text().trim()) {
                        return;
                    }

                    $input.html(func);
                },
                "onOpen": function() {
                    var $lis = $list.find('li')
                                    .sort(sortHTML)
                                    .show();
                    $lis.prependTo($list.find('ul'));
                    $list.find('ul').width($list.width() - 1);
                },
                "container": "#dfgParameterModal",
                "bounds": "#dfgParameterModal",
                "bottomPadding": 5,
                "exclude": '.draggableDiv, .defaultParam'
            });

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
                Alert.error("Parameter Modal Failed", error);
            });
        }

        modalHelper.setup();
        if (gMinModeOn) {
            $modalBg.show();
            $dfgParamModal.show();
            Tips.refresh();
        } else {
            $modalBg.fadeIn(300, function() {
                $dfgParamModal.fadeIn(180);
                Tips.refresh();
            });
        }
    };

    DFGParamModal.paramDragStart = function(event) {
        event.dataTransfer.effectAllowed = "copyMove";
        event.dataTransfer.dropEffect = "copy";
        event.dataTransfer.setData("text", event.target.id);
        event.stopPropagation();
        var origin;
        if ($(event.target).parent().hasClass('draggableParams')) {
            origin = 'home';
        } else {
            origin = $(event.target).parent().data('target');
        }

        $editableRow.data('origin', origin);
    };

    DFGParamModal.paramDragEnd = function (event) {
        event.stopPropagation();
        $editableRow.data('copying', false);
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
        
        $dropTarget.append($draggableParam);

        var paramName = $draggableParam.find('.value').text();
        var $paramRow = $paramLists.find('.paramName').filter(function() {
            return ($(this).text() === paramName);
        });

        if ($paramRow.length === 0) {
            var dfg = DFG.getGroup($dfgParamModal.data("dfg"));
            var paramVal = dfg.getParameter(paramName) || "";
            addParamToLists(paramName, paramVal);
        }
    };

    DFGParamModal.paramDropRemove = function(event) {
        // remove the paramDiv if dropped in .currentParameterList
        var data = $editableRow.data('origin');
        if (data !== 'home') {
            var paramId = event.dataTransfer.getData("text");
            var $param = $editableRow.find('.editableParamDiv')
                                     .filter(function() {
                return ($(this).data('target') === data);
            }).find('#' + paramId + ':first');
            var paramName = $param.find('.value').text();
            $param.remove();
            updateParamList(paramName);
        }
    };

    DFGParamModal.allowParamDrop = function(event) {
        event.preventDefault();
    };

    function suggest($input) {
        var value = $input.text().trim().toLowerCase();
        var $list = $input.siblings('.list');
        if ($list.length === 0) {
            // when no list to suggest
            return;
        }

        // $operationsModal.find('li.highlighted').removeClass('highlighted');

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
        var $tbody = $paramLists.find("tbody");
        var $row = $tbody.find(".unfilled:first");

        if ($row.length === 0) {
            $row = $(trTemplate);
            $tbody.append($row);
            xcHelper.scrollToBottom($paramLists.closest(".tableWrapper"));
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

        $paramDiv.find(".draggableDiv .value").each(function() {
            paramNames.push($(this).text());
        });

        $paramDiv.text(defaultVal);
        paramNames.forEach(function(name) {
            updateParamList(name);
        });
    }

    function updateParamList(paramName) {
        // find if the param has dups
        var $dups = $editableRow.find(".editableParamDiv .value").filter(function() {
            return ($(this).text() === paramName);
        });

        if ($dups.length > 0) {
            return;
        }

        // if no dups, clear the param in param list table
        var $tbody = $paramLists.find("tbody");
        $tbody.find('.paramName').filter(function() {
            return ($(this).text() === paramName);
        }).closest('tr').remove();

        if ($tbody.find("tr").length < paramListTrLen) {
            $tbody.append(trTemplate);
        }
    }

    function storeRetina() {
        //XX need to check if all default inputs are filled
        var $paramPart = $dfgParamModal.find(".editableTable");
        var $editableDivs = $paramPart.find('.editableParamDiv');
        var isValid = true;

        $editableDivs.each(function() {
            var $div = $(this);
            if (!$div.hasClass("allowEmpty") && $div.text().trim() === "") {
                isValid = false;
                StatusBox.show(ErrorTextTStr.NoEmpty, $div);
                return false;
            }
        });

        if (!isValid) {
            return;
        }

        var params = [];
        var $invalidTr;
        $paramLists.find("tr:not(.unfilled)").each(function() {
            var $tr   = $(this);
            var name  = $tr.find(".paramName").text();
            var val   = $tr.find(".paramVal").val().trim();
            var check = $tr.find(".checkbox").hasClass("checked");

            if (val === "" && !check) {
                isValid = false;
                $invalidTr = $tr;
                return false; // stop iteration
            }

            params.push({
                "name": name,
                "val" : val
            });
        });

        if (!isValid) {
            StatusBox.show(ErrorTextTStr.NoEmptyOrCheck,
                            $invalidTr.find(".paramVal"));
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

            DFGPanel.updateRetinaTab(retName);

            return dfg.updateSchedule();
        })
        .then(function() {
            // this marks that the update retina is done
            dfg.addRetinaNode(dagNodeId, curParamInfo);
            commitToStorage();
            closeDfgParamModal();
            // show success message??
        })
        .fail(function(error) {
            Alert.error("Update Params fails", error);
        });

        return;

        function updateRetina() {
            var deferred  = jQuery.Deferred();
            var operation = $paramPart.find("td:first").text();
            var paramType = null;
            var paramValue;
            var paramQuery;
            // var paramInput = new XcalarApiParamInputT();

            switch (operation) {
                case ("filter"):
                    paramType = XcalarApisT.XcalarApiFilter;

                    var filterText = $editableDivs.eq(1).text().trim();
                    var str1 = $editableDivs.eq(0).text().trim();
                    var str2 = $editableDivs.eq(2).text().trim();
                    var filter;
                    var numParams = params.length;
                    var param;
                    var val;
                    var filterParamText = filterText;
                    var find;
                    var rgx;
                    for (var i = 0; i < numParams; i++) {
                        param = params[i].name;
                        val = params[i].val;
                        find = "<" + param + ">";
                        rgx = new RegExp(find, 'g');
                        filterParamText = filterParamText.replace(rgx, val);
                    }

                    // Only support these filter now
                    var filterExists = $editableDivs.eq(1).siblings('.list')
                                                          .find('li')
                                                          .filter(function() {
                        return ($(this).text() === filterParamText);
                    }).length;

                    if (!filterExists) {
                        deferred.reject("Filter type not currently supported.");
                        return (deferred.promise());
                    }
    
                    paramValue = filter + "(" + str1 + "," + str2 + ")";
                    // paramInput.paramFilter = new XcalarApiParamFilterT();
                    // paramInput.paramFilter.filterStr = str;
                    paramQuery = [str1, filterText, str2];
                    break;
                case ("Load"):
                    paramType = XcalarApisT.XcalarApiBulkLoad;
                    paramValue = $editableDivs.eq(0).text().trim();
                    // paramInput.paramLoad = new XcalarApiParamLoadT();
                    // paramInput.paramLoad.datasetUrl = str;
                    paramQuery = [paramValue];
                    break;
                case ("Export to"):
                    paramType = XcalarApisT.XcalarApiExport;
                    paramValue = $editableDivs.eq(0).text().trim();
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
                   
        td += '<div class="' + divClass + '" ' +
                'ondragover="DFGParamModal.allowParamDrop(event)"' +
                'ondrop="DFGParamModal.paramDrop(event)" ' +
                'data-target="' + inputNum + '" ' +
                'contenteditable="true" ' +
                'spellcheck="false"></div>';
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

        td += '<div title="Default Value" ' +
                'class="defaultParam iconWrap" data-toggle="tooltip" ' +
                'data-placement="top" data-container="body">' +
                    '<span class="icon"></span>' +
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
            var $editableDivs = $editableRow.find(".editableParamDiv");

            retinaNode.paramQuery.forEach(function(query, index) {
                var html = "";
                var len = query.length;
                var p = 0;
                var startIndex;
                var endIndex;
                var paramName;

                while (p < len) {
                    startIndex = query.indexOf("<", p);
                    if (startIndex < 0) {
                        // do not find <,
                        html += query.substring(p);
                        break;
                    }

                    html += query.substring(p, startIndex);
                    endIndex = query.indexOf(">", startIndex);
                    if (endIndex < 0) {
                        // do not find >,
                        html += "&lt;" + query.substring(startIndex + 1);
                        break;
                    }

                    // when find a "<>"
                    paramName = query.substring(startIndex + 1, endIndex);
                    if (!paramMap.hasOwnProperty(paramName)) {
                        // string btw "<>" is not a param name
                        html += "&lt;" + paramName + "&gt;";
                    } else {
                        nameMap[paramName] = true;
                        html += generateDraggableParams(paramName);
                    }

                    p = endIndex + 1;
                }

                $editableDivs.eq(index).html(html);
            });

            // keep the order of paramName the in dfg.parameters
            dfg.parameters.forEach(function(paramName) {
                if (nameMap.hasOwnProperty(paramName)) {
                    addParamToLists(paramName, paramMap[paramName], true);
                }
            });
        }
    }

    function generateParameterDefaultList() {
        var html = "";
        for (var i = 0; i < paramListTrLen; i++) {
            html += trTemplate;
        }
        $paramLists.find("tbody").html(html);
    }

    function generateDraggableParams(paramName) {
        var html = '<div id="draggableParam-' + paramName +
                '" class="draggableDiv" ' +
                'draggable="true" ' +
                'ondragstart="DFGParamModal.paramDragStart(event)" ' +
                'ondragend="DFGParamModal.paramDragEnd(event)" ' +
                'ondrop="return false" ' +
                'title="click and hold to drag" ' +
                'contenteditable="false">' +
                    '<div class="icon"></div>' +
                    '<span class="delim"><</span>' +
                    '<span class="value">' + paramName + '</span>' +
                    '<span class="delim">></span>' +
                    '<div class="close"></div>' +
                '</div>';

        return (html);
    }

    function closeDfgParamModal() {
        modalHelper.clear();
        var fadeOutTime = gMinModeOn ? 0 : 300;

        $dfgParamModal.hide();
        $modalBg.fadeOut(fadeOutTime, function() {
            Tips.refresh();
        });

        $editableRow.empty();
        $dfgParamModal.find('.draggableParams').empty();
        $paramLists.find("tbody").empty();
    }

    return (DFGParamModal);

}(jQuery, {}));

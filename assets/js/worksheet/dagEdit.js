window.DagEdit = (function($, DagEdit) {
    var isEditMode = false;
    var structs = {}; // structs that are edited
    var editingNode;
    var treeNode;
    var linkedNodes = {}; // nodes that depend on each other, example: groupby
    // and index are linked, so when  we undo a group by edit, we need to undo the
    // index edit as well
    var mapIndex; // stores eval string number during a map edit
    var newNodes = {}; // new nodes, typically index, to be inserted into a rerun
    var editingTables = {}; // map of names of tables currently being edited
    var descendantRefCounts = {}; // counts how many times a table is included as a descendant
    var descendantMap = {}; // map of edited tables and their descendant

    DagEdit.getInfo = function() {
        return {
            structs: structs,
            newNodes: newNodes
        };
    };

    DagEdit.isEditMode = function() {
        return isEditMode;
    };

    DagEdit.toggle = function(node, force) {
        var edits = DagEdit.getInfo();
        if ((Object.keys(edits.structs).length ||
            Object.keys(edits.newNodes).length) && !force) {
            Alert.show({
                "title": "Edit in progress",
                "msg": "Are you sure you want to exit edit mode and abandon all changes?",
                "onConfirm": function() {
                    toggleMode();
                }
            });
        } else {
            toggleMode();
        }

        function toggleMode() {
            $("#container").toggleClass("dfEditState");
            if (!$("#container").hasClass("dfEditState")) {
                isEditMode = false;
                $(".dagWrap").removeClass("editMode");
                $(".dagWrap").find(".hasEdit").removeClass("hasEdit");
                $(".xcTableWrap").removeClass("editingDf editing");
                $("#dagPanel").find(".dagTableTip").remove();
                $(".dagTableWrap").removeClass("isDownstream");
                DagEdit.exitForm();

                xcTooltip.changeText($("#undoRedoArea").find(".noUndoTip"),
                                     TooltipTStr.NoUndoActiveForm);
                StatusMessage.updateLocation(true);
                TblManager.alignTableEls();
                MainMenu.closeForms();
            } else {
                isEditMode = true;
                var tableId = xcHelper.getTableId(node.value.name);
                $("#xcTableWrap-" + tableId).addClass("editingDf");
                StatusMessage.updateLocation(true, "Editing Dataflow");
                xcTooltip.changeText($("#undoRedoArea").find(".noUndoTip"),
                                     TooltipTStr.NoUndoEditMode);
                TblManager.alignTableEls();
            }
            treeNode = node;
            structs = {};
            newNodes = {};
            linkedNodes = {};
            editingTables = {};
            descendantRefCounts = {};
            descendantMap = {};
        }
    };
    // options:
    //  evalIndex: integer, which eval str to edit
    DagEdit.editOp = function(node, options) {
        options = options || {};
        editingNode = node;
        var api = node.value.api;
        var sourceTableNames = node.getNonIndexSourceNames(true);
        var uniqueSrcTableNames = [];
        sourceTableNames.forEach(function(tName) {
            if (uniqueSrcTableNames.indexOf(tName) === -1) {
                uniqueSrcTableNames.push(tName);
            }
        });

        if (options.evalIndex == null && api === XcalarApisT.XcalarApiMap &&
            node.value.struct.eval.length > 1) {
            showMapPreForm(node);
            return;
        }

        styleForEditingForm(node, uniqueSrcTableNames);

        var promises = [];
        var results = [];

        for (var i = 0; i < uniqueSrcTableNames.length; i++) {
            promises.push(focusEditingTable.bind(this, uniqueSrcTableNames[i], results));
        }

        PromiseHelper.chain(promises)
        .then(function() {
            var hasActiveTable = false;
            var tableId;
            var isDroppedTable = [];
            for (var i = 0; i < sourceTableNames.length; i++) {
                tableId = xcHelper.getTableId(sourceTableNames[i]);
                if (results[sourceTableNames[i]].notFound) {
                    if (!gDroppedTables[tableId]) {
                        var table = new TableMeta({
                            "tableId": tableId,
                            "tableName": sourceTableNames[i],
                            "tableCols": [ColManager.newDATACol()],
                            "status": TableType.Dropped
                        });
                        gDroppedTables[tableId] = table;
                    }
                    isDroppedTable.push(true);
                } else {
                    $("#xcTableWrap-" + tableId).addClass("editing");
                    hasActiveTable = true;
                    if (results[sourceTableNames[i]].tableFromInactive) {
                        editingTables[sourceTableNames[i]] = "inactive";
                    } else {
                        editingTables[sourceTableNames[i]] = "active";
                    }
                    isDroppedTable.push(false);
                }
            }
            $("#container").addClass("editingForm");
            if (!hasActiveTable) {
                $("#container").addClass("noActiveEditingTable");
            }
            TblManager.alignTableEls();

            // helps with the choppy animation of the operation form
            setTimeout(function() {
                showEditForm(node, sourceTableNames, isDroppedTable, options.evalIndex);
            });
        });
    };

    DagEdit.exitForm = function() {
        for (var tableName in editingTables) {
            var status = editingTables[tableName];
            if (status === "inactive") {
                var tableId = xcHelper.getTableId(tableName);
                TblManager.sendTableToTempList(tableId);
            }
        }
        editingTables = {};
        $(".dagWrap .dagTable").removeClass("editing");
        $(".dagTableWrap").removeClass("isDescendant editingChild");
        $(".xcTableWrap").removeClass("editing");
        $("#container").removeClass("editingForm noActiveEditingTable");
        if ($("#container").hasClass("dfEditState")) {
            TblFunc.focusTable($(".dagWrap.editMode").data("id"));
        }
    };

    DagEdit.store = function(info) {
        var indexNodes = [];

        if (editingNode.value.api === XcalarApisT.XcalarApiGroupBy) {
            checkIndexNodes(editingNode, info.indexFields, indexNodes, 0);
        } else if (editingNode.value.api === XcalarApisT.XcalarApiJoin) {
            var joinType = info.args.joinType;
            // XXX move this somewhere else
            var joinLookUp = {
                "Inner Join": JoinOperatorT.InnerJoin,
                "Left Outer Join": JoinOperatorT.LeftOuterJoin,
                "Right Outer Join": JoinOperatorT.RightOuterJoin,
                "Full Outer Join": JoinOperatorT.FullOuterJoin,
                "Cross Join": JoinOperatorT.CrossJoin
            };
            joinType = joinLookUp[joinType];
            joinType = JoinOperatorTStr[joinType];
            info.args.joinType = joinType;

            if (joinType !== "crossJoin") {
                checkIndexNodes(editingNode, info.indexFields[0], indexNodes, 0);
                checkIndexNodes(editingNode, info.indexFields[1], indexNodes, 1);
            }
        }

        if (indexNodes.length) {
            linkedNodes[editingNode.value.name] = indexNodes;
        }

        // for map we update 1 eval str at a time
        if (editingNode.value.api === XcalarApisT.XcalarApiMap) {
            if (!structs[editingNode.value.name]) {
                structs[editingNode.value.name] = {
                    eval: xcHelper.deepCopy(editingNode.value.struct.eval)
                };
            }
            structs[editingNode.value.name].eval[mapIndex] = info.args.eval[0];
            structs[editingNode.value.name].icv = info.args.icv;
        } else if (editingNode.value.api === XcalarApisT.XcalarApiJoin) {
            structs[editingNode.value.name] = {
                joinType: info.args.joinType,
                evalString: info.args.evalString};
        } else if (editingNode.value.api === XcalarApisT.XcalarApiUnion) {
            structs[editingNode.value.name] = {renameMap: info.args.renameMap};
        } else {
            structs[editingNode.value.name] = info.args;
        }

        Dag.updateEditedOperation(treeNode, editingNode, indexNodes,
                              structs[editingNode.value.name]);

        var descendants = Dag.styleDestTables($(".dagWrap.editMode"), editingNode.value.name, "isDownstream");
        for (var i = 0; i < descendants.length; i++) {
            if (!descendantRefCounts[descendants[i]]) {
                descendantRefCounts[descendants[i]] = 0;
            }
            descendantRefCounts[descendants[i]]++;
        }
        descendantMap[editingNode.value.name] = descendants;

        $(".xcTableWrap").removeClass("editing");
    };

    DagEdit.undoEdit = function(node) {
        var lNodes = linkedNodes[node.value.name];
        var toDelete = [];
        if (lNodes) {
            for (var i = 0; i < lNodes.length; i++) {
                toDelete.push(lNodes[i]);
                delete structs[lNodes[i].value.name];
            }
            delete linkedNodes[node.value.name];
        }
        delete structs[node.value.name];
        delete newNodes[node.value.name];
        var descendants = descendantMap[node.value.name];
        for (var i = 0; i < descendants.length; i++) {
            descendantRefCounts[descendants[i]]--;
            if (!descendantRefCounts[descendants[i]]) {
                var $dagTable = Dag.getTableIconByName($(".dagWrap.editMode"),
                                                        descendants[i]);
                $dagTable.closest(".dagTableWrap").removeClass("isDownstream");
                delete descendantRefCounts[descendants[i]];
            }
        }
        delete descendantMap[node.value.name];

        Dag.removeEditedOperation(treeNode, node, toDelete);
    };

    DagEdit.setupMapPreForm = function() {
        var $mapPreForm = $("#mapPreForm");

        $mapPreForm.find(".close").click(function() {
            $mapPreForm.removeClass("active");
            $(document).off("hideMapPreForm");
        });

        $mapPreForm.draggable({
            handle: '#mapPreFormTitle',
            cursor: '-webkit-grabbing',
            containment: "window"
        });

        $mapPreForm.resizable({
            handles: "n, e, s, w, se",
            minHeight: 200,
            minWidth: 200,
            containment: "document"
        });

        $mapPreForm.on("click", ".row", function() {
            $mapPreForm.removeClass("active");
            $(document).off(".hideMapPreForm");

            var index = $(this).index();
            mapIndex = index;
            DagEdit.editOp(editingNode, {evalIndex: index});
        });
    };

    function showEditForm(node, sourceTableNames, isDroppedTable, evalIndex) {
        var api = node.value.api;
        var origStruct = node.value.struct;
        var struct = structs[node.value.name] || origStruct;
        var tableIds = sourceTableNames.map(function(name) {
            return xcHelper.getTableId(name);
        });
        var tableId = tableIds[0];
        var prefillInfo;

        switch (api) {
            case (XcalarApisT.XcalarApiAggregate):
                var evalStr = struct.eval[0].evalString.trim();
                var opInfo = xcHelper.extractOpAndArgs(evalStr);
                OperationsView.show(tableId, [], "aggregate", {
                    prefill: {
                        ops: [opInfo.op],
                        args: [opInfo.args],
                        isDroppedTable: isDroppedTable[0]
                    }
                });
                break;
            case (XcalarApisT.XcalarApiMap):
                if (evalIndex) {
                    mapIndex = evalIndex;
                } else {
                    mapIndex = 0;
                }

                var evalStr = struct.eval[mapIndex].evalString.trim();

                var opInfo = xcHelper.extractOpAndArgs(evalStr);
                var newFields = struct.eval.map(function(item) {
                    return item.newField;
                });
                prefillInfo = {
                    ops: [opInfo.op],
                    args: [opInfo.args],
                    newFields: [newFields[mapIndex]],
                    icv: struct.icv,
                    isDroppedTable: isDroppedTable[0]
                };
                OperationsView.show(tableId, [], "map", {
                    prefill: prefillInfo
                });
                break;
            case (XcalarApisT.XcalarApiFilter):
                var evalStr = struct.eval[0].evalString.trim();
                var opInfo = xcHelper.extractOpAndArgs(evalStr);
                OperationsView.show(tableId, [], "filter", {
                    prefill: {
                        ops: [opInfo.op],
                        args: [opInfo.args],
                        isDroppedTable: isDroppedTable[0]
                    }
                });
                break;
            case (XcalarApisT.XcalarApiGroupBy):
                var ops = [];
                var args = [];
                struct.eval.forEach(function(evalObj) {
                    var evalStr = evalObj.evalString.trim();
                    var opInfo = xcHelper.extractOpAndArgs(evalStr);
                    ops.push(opInfo.op);
                    args.push(opInfo.args);
                });

                var newFields = struct.eval.map(function(item) {
                    return item.newField;
                });
                var indexedFields;
                if (linkedNodes[editingNode.value.name]) {
                    var indexNode = linkedNodes[editingNode.value.name][0];
                    var indexName = indexNode.value.name;
                    indexedFields = structs[indexName].key.map(function(key) {
                        return key.name;
                    });
                } else {
                    indexedFields = node.value.indexedFields;
                }

                prefillInfo = {
                    "ops": ops,
                    "args": args,
                    "newFields": newFields,
                    "dest": xcHelper.getTableName(origStruct.dest),
                    "indexedFields": indexedFields,
                    "icv": struct.icv,
                    "includeSample": struct.includeSample,
                    "isDroppedTable": isDroppedTable[0]
                };

                OperationsView.show(tableId, [], "group by", {
                    prefill: prefillInfo
                });
                break;
            case (XcalarApisT.XcalarApiJoin):
                prefillInfo = {
                    "joinType": struct.joinType,
                    "rightTable": sourceTableNames[1],
                    "dest": xcHelper.getTableName(origStruct.dest),
                    "srcCols": node.value.indexedFields,
                    "evalStr": struct.evalStr,
                    "evalString": struct.evalString,
                    "isLeftDroppedTable": isDroppedTable[0],
                    "isRightDroppedTable": isDroppedTable[1]
                };
                JoinView.show(tableId, [], {prefill: prefillInfo});
                break;
            case (XcalarApisT.XcalarApiUnion):
                var tableCols = [];
                for (var i = 0; i < sourceTableNames.length; i++) {
                    var cols = [];

                    for (var j = 0; j < struct.renameMap[i].length; j++) {
                        var colName = struct.renameMap[i][j].sourceColumn;
                        var rename = struct.renameMap[i][j].destColumn;
                        var type = translateType(struct.renameMap[i][j].columnType);
                        cols.push({
                            name: colName,
                            rename: rename,
                            type: type
                        });
                    }
                    tableCols.push(cols);
                }

                prefillInfo = {
                    "dedup": struct.dedup,
                    "sourceTables": sourceTableNames,
                    "dest": xcHelper.getTableName(origStruct.dest), // XXX allow changing
                    "srcCols": struct.renameMap,
                    "isDroppedTable": isDroppedTable,
                    "tableCols": tableCols
                };
                UnionView.show(tableId, [], {prefill: prefillInfo});
                break;
            case (XcalarApisT.XcalarApiProject):
                var colNums = [];
                var table = gTables[tableId] || gDroppedTables[tableId];
                if (table && table.getAllCols().length > 1) {
                    for (var i = 0; i < struct.columns.length; i++) {
                        var colNum = table.getColNumByBackName(struct.columns[i]);
                        if (colNum != null && colNum > -1) {
                            colNums.push(colNum);
                        }
                    }
                }

                ProjectView.show(tableId, colNums, {
                    prefill: {
                        "isDroppedTable": isDroppedTable[0]
                    }
                });
                break;
            default:
                console.log("invalid op");
                break;
        }
    }

    function translateType(dfType) {
        switch (dfType) {
            case DfFieldTypeTStr[DfFieldTypeT.DfUnknown]:
                return ColumnType.unknown;
            case DfFieldTypeTStr[DfFieldTypeT.DfString]:
                return ColumnType.string;
            case DfFieldTypeTStr[DfFieldTypeT.DfInt32]:
            case DfFieldTypeTStr[DfFieldTypeT.DfInt64]:
            case DfFieldTypeTStr[DfFieldTypeT.DfUInt32]:
            case DfFieldTypeTStr[DfFieldTypeT.DfUInt64]:
                return ColumnType.integer;
            case DfFieldTypeTStr[DfFieldTypeT.DfFloat32]:
            case DfFieldTypeTStr[DfFieldTypeT.DfFloat64]:
                return ColumnType.float;
            case DfFieldTypeTStr[DfFieldTypeT.DfBoolean]:
                return ColumnType.boolean;
            case DfFieldTypeTStr[DfFieldTypeT.DfMixed]:
                return ColumnType.mixed;
            case DfFieldTypeTStr[DfFieldTypeT.DfFatptr]:
                return null;
            default:
                return null;
        }
    }

    function styleForEditingForm(node, sourceTableNames) {
        var $dagTable;

        for (var i = 0; i < sourceTableNames.length; i++) {
            var tableId = xcHelper.getTableId(sourceTableNames[i]);
            var $dagWrap = $("#dagWrap-" + tableId);
            $dagWrap.addClass("editing");
            $("#xcTableWrap-" + tableId).addClass("editing");
            // highlight node
            $dagTable = Dag.getTableIconByName($(".dagWrap.editMode"),
                                   sourceTableNames[i]);
            $dagTable.addClass("editing");
            Dag.styleDestTables($(".dagWrap.editMode"), sourceTableNames[i]);
        }

        var nodeName = node.value.name;
        $dagTable = Dag.getTableIconByName($(".dagWrap.editMode"),
                                                nodeName);
        $dagTable.closest(".dagTableWrap").addClass("editingChild");
    }

    function checkIndexNodes(editingNode, indexFields, indexNodes, parentNum) {
        var indexNode;
        var keys = indexFields.map(function(name) {
            var newName = xcHelper.parsePrefixColName(name).name;
            if (parentNum > 0) { // for joins
                newName += Math.floor(Math.random() * 1000);
            }
            // XXX use correct key type
            return {
                "name": name,
                "keyFieldName": newName,
                "type": DfFieldTypeTStr[DfFieldTypeT.DfUnknown]
            };
        });

        // if index operation already exists, we'll modify it, otherwise
        // we'll create a new one

        if (editingNode.parents[parentNum].value.api ===
            XcalarApisT.XcalarApiIndex) {
            indexNode = editingNode.parents[parentNum];

            var needsNewIndex = false;
            if (indexNode.value.struct.key.length !== keys.length) {
                needsNewIndex = true;
            } else {
                for (var i = 0; i < indexNode.value.struct.key.length; i++) {
                    if (indexNode.value.struct.key[i].keyFieldName !==
                        keys[i].keyFieldName) {
                        needsNewIndex = true;
                        break;
                    } else if (indexNode.value.struct.key[i].name !==
                                keys[i].name) {
                        needsNewIndex = true;
                        break;
                    }
                }
            }

            if (needsNewIndex) {
                structs[indexNode.value.name] = {"key": keys};
                indexNodes.push(indexNode);
            }
        } else {
             // need to insert an index operation here if table is not
            // indexed correctly
            if (!newNodes[editingNode.value.name]) {
                newNodes[editingNode.value.name] = [];
            }
            // consider tags
            newNodes[editingNode.value.name].push({
                keys: keys,
                src: editingNode.parents[parentNum].value.name
            });
        }
    }

    function showMapPreForm(node) {
        var $mapPreForm = $("#mapPreForm");
        $mapPreForm.addClass("active");

        var $dagWrap = $(".dagWrap.editMode");
        var $dagTable = Dag.getTableIcon($dagWrap, node.value.dagNodeId);

        $(document).on('mousedown.hideMapPreForm', function(event) {
            if ($(event.target).closest('#mapPreForm').length === 0 &&
                $(event.target).closest('#dagScrollBarWrap').length === 0) {
                $mapPreForm.removeClass("active");
                $(document).off(".hideMapPreForm");
                $(".dagWrap .dagTable").removeClass("editing");
            }
        });

        var mapStruct;
        if (structs[node.value.name]) {
            mapStruct = structs[node.value.name];
        } else {
            mapStruct = node.value.struct;
        }

        var evalHtml = "<div>";
        mapStruct.eval.forEach(function(evalObj) {
            evalHtml += '<div class="row">' +
                            '<div class="evalStr">' + evalObj.evalString + '</div>' +
                            '<div class="optionSection">' +
                                '<div class="edit option">' +
                                    '<span class="text">Edit</span>' +
                                    '<i class="icon xi-edit"></i>' +
                                '</div>' +
                                // '<div class="delete option">' +
                                //     '<i class="icon xi-trash"></i>' +
                                // '</div>' +
                            '</div>' +
                        '</div>';
        });

        evalHtml += "</div>";
        $mapPreForm.find(".content").html(evalHtml);

        positionMapPreForm($dagTable);
    }

    function positionMapPreForm($dagTable) {
        var $mapPreForm = $("#mapPreForm");
        var topMargin = -3;
        var top = $dagTable[0].getBoundingClientRect().top + topMargin;
        var left = $dagTable[0].getBoundingClientRect().left - 140;
        var defaultWidth = 300;
        var defaultHeight = 200;

        $mapPreForm.css("width", "auto");
        var width = Math.min(defaultWidth, $mapPreForm.outerWidth());
        width = Math.max(230, width);
        $mapPreForm.width(width);

        $mapPreForm.css("height", "auto");
        var height = Math.min(defaultHeight, $mapPreForm.outerHeight());
        height = Math.max(200, height);
        $mapPreForm.height(height);

        left = Math.max(2, left);
        top = Math.max(2, top - height); // at least 2px from the top

        $mapPreForm.css({'top': top, 'left': left});

        var rightBoundary = $(window).width() - 5;

        if ($mapPreForm[0].getBoundingClientRect().right > rightBoundary) {
            left = rightBoundary - $mapPreForm.width();
            $mapPreForm.css('left', left);
        }

        // ensure dropdown menu is above the bottom of the dag panel
        var dagPanelBottom = $('#workspacePanel')[0].getBoundingClientRect()
                                                    .bottom;
        var menuBottom = $mapPreForm[0].getBoundingClientRect().bottom;
        if (menuBottom > dagPanelBottom) {
            $mapPreForm.css('top', '-=' + ($mapPreForm.height() + 35));
        }
    }

    // will always resolve
    function focusEditingTable(tableName, results) {
        var deferred = jQuery.Deferred();

        TblManager.findAndFocusTable(tableName, true)
        .then(function(ret) {
            results[tableName] = ret;
            deferred.resolve();
        })
        .fail(function() {
            results[tableName] = {notFound: true};
            deferred.resolve();
        })
        .always(function() {
            var tableId = xcHelper.getTableId(tableName);
            $("#xcTableWrap-" + tableId).addClass("editing");
        });

        return deferred.promise();
    }

    if (window.unitTestMode) {
        DagEdit.__testOnly__ = {};
        // DagEdit.__testOnly__.parseEvalStr = parseEvalStr;
    }

    return (DagEdit);
})(jQuery, {});

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
    var aggregates = {};

    var EditInfo = function() {
        this.editingNode = null;
        this.treeNode = null;
        this.structs = {}; // structs that are edited
        this.linkedNodes = {};// nodes that depend on each other, example: groupby
        // and index are linked, so when  we undo a group by edit, we need to undo the
        // index edit as well
        this.newNodes = {};
        this.editingTables = {}; // map of names of tables currently being edited
        this.descendantRefCounts = {}; // counts how many times a table is included as a descendant
        this.descendantMap = {}; // map of edited tables and their descendant
        this.aggregates = {};
        this.mapIndex = null;
    };

    DagEdit.getInfo = function() {
        return {
            structs: structs,
            newNodes: newNodes
        };
    };

    // for each of the aggs in the new eval strings,
    // check parents of the map node, if none of those parents have a dest name that equal the new agg
    // check if parentName is in struct

    function findNodeByName(name) {
        var foundNode;

        search(treeNode);

        return foundNode;

        function search(node) {
            if (foundNode) {
                return;
            }
            if (node.value.name === name) {
                foundNode = node;
                return;
            }
            for (var i = 0; i < node.parents.length; i++) {
                search(node.parents[i]);
            }
        }
    }

    DagEdit.isEditMode = function() {
        return isEditMode;
    };

    DagEdit.on = function(node) {
        $("#container").addClass("dfEditState");
        isEditMode = true;
        var tableId = xcHelper.getTableId(node.value.name);
        $("#xcTableWrap-" + tableId).addClass("editingDf");
        StatusMessage.updateLocation(true, "Editing Dataflow");
        xcTooltip.changeText($("#undoRedoArea").find(".noUndoTip"),
                             TooltipTStr.NoUndoEditMode);
        TblManager.alignTableEls();
        refreshInfo(node);
    };

    DagEdit.off = function(node, force) {
        var edits = DagEdit.getInfo();
        if ((Object.keys(edits.structs).length ||
            Object.keys(edits.newNodes).length) && !force) {
            Alert.show({
                "title": "Edit in progress",
                "msg": "Are you sure you want to exit edit mode and abandon all changes?",
                "onConfirm": function() {
                    turnOff();
                }
            });
        } else {
            turnOff();
        }

        function turnOff() {
            $("#container").removeClass("dfEditState");
            isEditMode = false;
            var $dagPanel = $("#dagPanel");
            $dagPanel.find(".dagWrap").removeClass("editMode");
            $dagPanel.find(".dagWrap").find(".hasEdit").removeClass("hasEdit");
            $(".xcTableWrap").removeClass("editingDf editing");
            $dagPanel.find(".dagTableTip").remove();
            $dagPanel.find(".dagTableWrap").removeClass("isDownstream aggError hasError");
            DagEdit.exitForm();

            xcTooltip.changeText($("#undoRedoArea").find(".noUndoTip"),
                                 TooltipTStr.NoUndoActiveForm);
            StatusMessage.updateLocation(true);
            TblManager.alignTableEls();
            MainMenu.closeForms();

            refreshInfo(node);
        }
    };

    function refreshInfo(node) {
        treeNode = node;
        structs = {};
        newNodes = {};
        aggregates = {};
        linkedNodes = {};
        editingTables = {};
        descendantRefCounts = {};
        descendantMap = {};
    }

    // options:
    //  evalIndex: integer, which eval str to edit
    DagEdit.editOp = function(node, options) {
        options = options || {};
        editingNode = node;
        var api = node.value.api;
        var sourceTableNames = node.getNonIndexSourceNames(true);
        sourceTableNames = sourceTableNames.filter(function(name) {
            return name.indexOf("#") > -1; // exclude aggregates
        });
        var uniqueSrcTableNames = [];
        sourceTableNames.forEach(function(tName) {
            if (uniqueSrcTableNames.indexOf(tName) === -1) {
                uniqueSrcTableNames.push(tName);
            }
        });

        if (api === XcalarApisT.XcalarApiMap && options.evalIndex == null) {
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
            checkMapForAgg(editingNode);
        } else if (editingNode.value.api === XcalarApisT.XcalarApiJoin) {
            structs[editingNode.value.name] = {
                joinType: info.args.joinType,
                evalString: info.args.evalString};
        } else if (editingNode.value.api === XcalarApisT.XcalarApiUnion) {
            structs[editingNode.value.name] = {renameMap: info.args.renameMap};
        } else if (editingNode.value.api === XcalarApisT.XcalarApiAggregate) {
            structs[editingNode.value.name] = info.args;
            aggregates[editingNode.value.name] = info.args;
            checkAggForMap();
        } else {
            structs[editingNode.value.name] = info.args;
        }

        $(".xcTableWrap").removeClass("editing");

        var alreadyHasEdit = Dag.updateEditedOperation(treeNode, editingNode, indexNodes,
                              structs[editingNode.value.name]);

        if (alreadyHasEdit) {
            return;
        }

        var descendants = Dag.styleDestTables($(".dagWrap.editMode"),
                                    editingNode.value.name, "isDownstream");
        for (var i = 0; i < descendants.length; i++) {
            if (!descendantRefCounts[descendants[i]]) {
                descendantRefCounts[descendants[i]] = 0;
            }
            descendantRefCounts[descendants[i]]++;
        }
        descendantMap[editingNode.value.name] = descendants;
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
        delete aggregates[node.value.name];
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

        $mapPreForm.on("click", ".row", function(event) {
            if ($(event.target).closest(".delete").length) {
                return;
            }
            $mapPreForm.removeClass("active");
            $(document).off(".hideMapPreForm");

            var index = $(this).index();
            mapIndex = index;
            DagEdit.editOp(editingNode, {evalIndex: index});
        });

        $mapPreForm.on("click", ".delete", function() {
            var index = $(this).closest(".row").index();
            var struct;
            if (!structs[editingNode.value.name]) {
                structs[editingNode.value.name] = {
                    eval: xcHelper.deepCopy(editingNode.value.struct.eval)
                };
                structs[editingNode.value.name].icv = editingNode.value.struct.icv;
            }
            structs[editingNode.value.name].eval.splice(index, 1);
            $(this).closest(".row").remove();

            var alreadyHasEdit = Dag.updateEditedOperation(treeNode, editingNode, [],
                              structs[editingNode.value.name]);

            if (structs[editingNode.value.name].eval.length === 1) {
                $mapPreForm.addClass("single");
                xcTooltip.add($mapPreForm.find(".delete"),
                             {title: TooltipTStr.MapNoDelete});
            }

            if (alreadyHasEdit) {
                return;
            }

            var descendants = Dag.styleDestTables($(".dagWrap.editMode"),
                                        editingNode.value.name, "isDownstream");
            for (var i = 0; i < descendants.length; i++) {
                if (!descendantRefCounts[descendants[i]]) {
                    descendantRefCounts[descendants[i]] = 0;
                }
                descendantRefCounts[descendants[i]]++;
            }
            descendantMap[editingNode.value.name] = descendants;
        });

        $mapPreForm.on("click", ".addOp", function() {
            $mapPreForm.removeClass("active");
            $(document).off(".hideMapPreForm");

            var index = $mapPreForm.find(".row").length;
            mapIndex = index;
            DagEdit.editOp(editingNode, {evalIndex: index});
        });

        $mapPreForm.on("mouseenter", ".evalStr", function() {
            xcTooltip.auto(this);
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

                var opInfo;
                if (struct.eval[mapIndex]) {
                    var evalStr = struct.eval[mapIndex].evalString.trim();
                    opInfo = xcHelper.extractOpAndArgs(evalStr);
                } else {
                    // adding a new operation
                    opInfo = {op: "", args: []};
                }


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
                "type": DfFieldTypeTStr[DfFieldTypeT.DfUnknown],
                "ordering": XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingUnordered]
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

        var mapStruct = structs[node.value.name] || node.value.struct;

        var evalHtml = "";
        mapStruct.eval.forEach(function(evalObj) {
            evalHtml += '<div class="row">' +
                            '<div class="evalStr" ' +
                                'data-toggle="tooltip" data-container="body" ' +
                                'data-placement="top" data-tipclasses="highZindex" ' +
                                'data-original-title="' +
                                xcHelper.escapeDblQuoteForHTML(evalObj.evalString) + '">' +
                                evalObj.evalString +
                            '</div>' +
                            '<div class="optionSection">' +
                                '<div class="delete option xc-action">' +
                                    '<i class="icon xi-trash"></i>' +
                                '</div>' +
                                '<div class="edit option xc-action">' +
                                    // '<span class="text">Edit</span>' +
                                    '<i class="icon xi-edit"></i>' +
                                '</div>' +
                                // '<div class="restore option xc-action">' +
                                //     '<i class="icon xi-trash"></i>' +
                                // '</div>' +
                            '</div>' +
                        '</div>';

        });

        evalHtml += "</div>";
        $mapPreForm.find(".opRows").html(evalHtml);

        if (mapStruct.eval.length === 1) {
            $mapPreForm.addClass("single");
            xcTooltip.add($mapPreForm.find(".delete"),
                         {title: TooltipTStr.MapNoDelete});
            $mapPreForm.find(".delete").attr("data-tipclasses", "highZindex");
        } else {
            $mapPreForm.removeClass("single");
        }

        positionMapPreForm($dagTable);
    }

    function positionMapPreForm($dagTable) {
        var $mapPreForm = $("#mapPreForm");
        var topMargin = -3;
        var top = $dagTable[0].getBoundingClientRect().top + topMargin;
        var left = $dagTable[0].getBoundingClientRect().left - 140;
        var maxWidth = 500;
        var maxHeight = 400;

        $mapPreForm.css("width", "auto");
        var width = Math.min(maxWidth, $mapPreForm.outerWidth()) + 4;
        width = Math.max(230, width);
        $mapPreForm.width(width);

        $mapPreForm.css("height", "auto");
        var height = Math.min(maxHeight, $mapPreForm.outerHeight());
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

    // after editing a map, checks to see if it's referencing any aggs that
    // don't exist
    function checkMapForAgg(node) {
        var struct = structs[node.value.name];
        var aggs = DagFunction.getAggsFromEvalStrs(struct.eval);

        var parentNames = node.parents.map(function(parent) {
            return parent.value.name;
        });

        var unknownAggs = [];
        var wsAggs = Aggregates.getAllAggs();
        for (var i = 0; i < aggs.length; i++) {
            var found = false;
            if (parentNames.indexOf(aggs[i]) === -1) {
                // check if exists in edited struct
                for (var j = 0; j < parentNames.length; j++) {
                    if (aggregates[parentNames[j]] && aggregates[parentNames[j]].dest) {
                        var dest = structs[parentNames[j]].dest;
                        if (dest === aggs[i]) {
                            found = true;
                            break;
                        }
                    }
                }
            } else {
                found = true;
            }

            if (!found && !wsAggs[aggs[i]]) {
                for (var aggNames in aggregates) {
                    if (aggregates[aggNames].dest) {
                        var dest = aggregates[aggNames].dest;
                        if (dest === aggs[i]) {
                            found = true;
                        }
                    }
                }
                if (!found) {
                    unknownAggs.push(aggs[i]);
                }
            }
        }

        var $dagTable = Dag.getTableIcon($(".dagWrap.editMode"), node.value.dagNodeId);
        var $dagTableWrap = $dagTable.closest(".dagTableWrap");
        if (unknownAggs.length) {
            $dagTableWrap.addClass("aggError hasError");

            var tip = '<div class="dagTableTip error">' +
                        '<div>Aggregate(s) not found: ' + xcHelper.listToEnglish(unknownAggs) + '</div>' +
                      '</div>';
            $dagTableWrap.find(".actionType").find(".dagTableTip").remove();
            $dagTableWrap.find(".actionType").append(tip);
        } else {
            $dagTableWrap.removeClass("aggError hasError");
            $dagTableWrap.find(".dagTableTip").remove();
        }
    }

    // after editing an agg, checks to see if any error maps that were referencing
    // non-existant aggs are no longer erroring
    function checkAggForMap() {
        var $dagTableWraps = $(".dagWrap.editMode").find(".aggError");
        var $dagWrap = $(".dagWrap.editMode");
        $dagTableWraps.each(function() {
            var nodeId = $(this).find(".dagTable").data("index");
            var mapNode = Dag.getNodeById($dagWrap, nodeId);
            checkMapForAgg(mapNode);
        });
    }

    if (window.unitTestMode) {
        DagEdit.__testOnly__ = {};
        // DagEdit.__testOnly__.parseEvalStr = parseEvalStr;
    }

    return (DagEdit);
})(jQuery, {});

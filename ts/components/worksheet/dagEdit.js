window.DagEdit = (function($, DagEdit) {
    var isEditMode = false;

    var EditInfo = function(node) {
        this.editingNode = null;
        this.treeNode = node;
        this.structs = {}; // structs that are edited, this is the main part
        this.linkedNodes = {};// nodes that depend on each other, example: groupby
        // and index are linked, so when  we undo a group by edit, we need to undo the
        // index edit as well
        this.newNodes = {};
        this.insertedNodes = {};
        this.editingTables = {}; // map of names of tables currently being edited
        this.descendantRefCounts = {}; // counts how many times a table is included as a descendant
        this.descendantMap = {}; // map of edited tables and their descendant
        this.aggregates = {};
        this.mapIndex = null;
    };

    var curEdit = new EditInfo();
    var lastEdit = null;

    DagEdit.getInfo = function() {
        return curEdit;
    };

    DagEdit.isEditMode = function() {
        return isEditMode;
    };

    DagEdit.on = function(node, restore) {
        $("#container").addClass("dfEditState");
        isEditMode = true;
        var tableId = xcHelper.getTableId(node.value.name);
        $("#xcTableWrap-" + tableId).addClass("editingDf");
        var $dagWrap = $("#dagWrap-" + tableId);
        $dagWrap.addClass("editMode");
        $("#workspaceBar").prepend('<div id="workspaceEditText" class="workspaceArea title">' + DFTStr.EDITINGDATAFLOW + '</div>');
        $dagWrap.after('<div id="dagPanelEditText">Other dataflows have been hidden in edit mode.</div>');
        $("#tableListSection").append('<div id="tableListEditText">' + DFTStr.TableListNoEdit + '</div>');
        xcTooltip.add($("#monitor-delete"), {title: DFTStr.NoReleaseMemoryEdit});

        // if union, join, or groupby tag, collapse and only allow editing of whole group
        $dagWrap.find(".tag-union.expanded").filter(function() {
            return $(this).data("tag").indexOf("ExecuteSQL") === -1;
        }).find(".groupTagIcon").click();

        $dagWrap.find(".tag-join.expanded").filter(function() {
            return $(this).data("tag").indexOf("ExecuteSQL") === -1;
        }).find(".groupTagIcon").click();

        // if tag is sql, expand and allow editing of individual parts
        $dagWrap.find(".tagHeader.collapsed").filter(function() {
            return $(this).data("tag").indexOf("ExecuteSQL") === 0;
        }).find(".groupTagIcon").click();

        var tableId = $dagWrap.data("id");
        if (!$dagWrap.hasClass("selected")) {
            TblFunc.focusTable(tableId);
        }
        xcHelper.centerFocusedTable(tableId, false,
                                    {onlyIfOffScreen: true});
        StatusMessage.updateLocation(true, StatusMessageTStr.EditingDF);
        xcTooltip.changeText($("#undoRedoArea").find(".noUndoTip"),
                             TooltipTStr.NoUndoEditMode);
        TblManager.alignTableEls();
        if (!restore) {
            curEdit = new EditInfo(node);
        }
        if (!Object.keys(curEdit.structs).length &&
            !Object.keys(curEdit.newNodes).length) {
            xcTooltip.add($dagWrap.find(".runBtn"), {
                title: DFTStr.NoEdits
            });
        } else {
            xcTooltip.add($dagWrap.find(".runBtn"), {
                title: DFTStr.RunEdits
            });
        }
    };

    DagEdit.off = function(node, force, store) {
        var edits = DagEdit.getInfo();
        if ((Object.keys(edits.structs).length ||
            Object.keys(edits.newNodes).length) && !force) {
            Alert.show({
                "title": AlertTStr.EditInProgress,
                "msg": AlertTStr.EditExitWarning,
                "onConfirm": function() {
                    turnOff(store);
                }
            });
        } else {
            turnOff(store);
        }

        function turnOff(toStore) {
            $("#container").removeClass("dfEditState");
            $("#workspaceEditText").remove();
            $("#dagPanelEditText").remove();
            xcTooltip.remove($("#monitor-delete"));
            isEditMode = false;
            var $dagPanel = $("#dagPanel");
            var $dagWrap = $dagPanel.find(".dagWrap.editMode");

            if (!toStore) {
                $dagPanel.find(".hasEdit").removeClass("hasEdit");
                $dagPanel.find(".dagTableTip").remove();
                $dagPanel.find(".dagTableWrap").removeClass("isDownstream aggError hasError");
            }

            $dagWrap.removeClass("editMode");
            $(".xcTableWrap").removeClass("editingDf editing");

            xcTooltip.add($dagWrap.find(".runBtn"), {
                title: DFTStr.NoEdits
            });

            DagEdit.exitForm(true);

            xcTooltip.changeText($("#undoRedoArea").find(".noUndoTip"),
                                 TooltipTStr.NoUndoActiveForm);
            StatusMessage.updateLocation(true);
            MainMenu.closeForms();

            if (toStore) {
                lastEdit = curEdit;
            } else {
                lastEdit = null;
            }
            curEdit = new EditInfo();
        }
    };

    DagEdit.clearEdit = function() {
        lastEdit = null;
    };

    DagEdit.checkCanRestore = function(tableId) {
        if (!lastEdit || isEditMode) {
            return false;
        }
        var treeNode = lastEdit.treeNode;
        if (treeNode.value.name !== gTables[tableId].getName()) {
            return false;
        }
        return true;
    };

    DagEdit.restore = function(tableId) {
        curEdit = lastEdit;
        var treeNode = lastEdit.treeNode;
        if (treeNode.value.name !== gTables[tableId].getName()) {
            return false;
        }
        DagEdit.on(treeNode, true);
    };

    // options:
    //  evalIndex: integer, which eval str to edit
    DagEdit.editOp = function(node, options) {
        options = options || {};
        curEdit.editingNode = node;
        var api = node.value.api;
        var sourceTableNames;
        if (node.value.tag && node.value.tag.indexOf("ExecuteSQL") === 0) {
            if (api === XcalarApisT.XcalarApiUnion ||
                api === XcalarApisT.XcalarApiJoin) {
                    sourceTableNames = node.getSourceNames();
            } else {
                sourceTableNames = node.getNonIndexSourceNames();
            }
        } else if (api === XcalarApisT.XcalarApiUnion ||
            api === XcalarApisT.XcalarApiJoin) {
            sourceTableNames = node.getTagSourceNames();
        } else {
            sourceTableNames = node.getNonIndexSourceNames();
        }

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
                        curEdit.editingTables[sourceTableNames[i]] = "inactive";
                    } else {
                        curEdit.editingTables[sourceTableNames[i]] = "active";
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
            }, 1);
        });
    };

    DagEdit.exitForm = function(force) {
        if (!force && !DagEdit.isEditMode()) {
            return;
        }
        undoMovingTempTablesToWorksheet();

        curEdit.editingTables = {};
        $(".dagWrap .dagTable").removeClass("editing");
        $(".dagTableWrap").removeClass("isDescendant editingChild");
        $(".xcTableWrap").removeClass("editing");
        $("#container").removeClass("editingForm noActiveEditingTable");
        if ($("#container").hasClass("dfEditState")) {
            TblFunc.focusTable($(".dagWrap.editMode").data("id"));
        }
        TblManager.alignTableEls();
    };

    DagEdit.store = function(info) {
        var indexNodes = [];
        var joinColumns;

        if (curEdit.editingNode.value.api === XcalarApisT.XcalarApiGroupBy &&
            !info.args.groupAll) {
            checkIndexNodes(info.indexFields, indexNodes, 0);
        }

        if (indexNodes.length) {
            curEdit.linkedNodes[curEdit.editingNode.value.name] = indexNodes;
        }

        // for map we update 1 eval str at a time
        if (curEdit.editingNode.value.api === XcalarApisT.XcalarApiMap) {
            if (!curEdit.structs[curEdit.editingNode.value.name]) {
                curEdit.structs[curEdit.editingNode.value.name] = {
                    eval: xcHelper.deepCopy(curEdit.editingNode.value.struct.eval)
                };
            }
            curEdit.structs[curEdit.editingNode.value.name].eval[curEdit.mapIndex] = info.args.eval[0];
            curEdit.structs[curEdit.editingNode.value.name].icv = info.args.icv;
            checkOpForAgg(curEdit.editingNode);
        } else if (curEdit.editingNode.value.api === XcalarApisT.XcalarApiJoin) {
            curEdit.structs[curEdit.editingNode.value.name] = {
                columns: info.args.columns,
                joinType: info.args.joinType,
                evalString: info.args.evalString,
                source: info.args.source
            };
        } else if (curEdit.editingNode.value.api === XcalarApisT.XcalarApiUnion) {
            // curEdit.structs[curEdit.editingNode.value.name] = {columns: info.args.columns};
            // don't include dest
            curEdit.structs[curEdit.editingNode.value.name] = {
                columns: info.args.columns,
                dedup: info.args.dedup,
                source: info.args.source,
                unionType: info.args.unionType
            };
        } else if (curEdit.editingNode.value.api === XcalarApisT.XcalarApiAggregate) {
            curEdit.structs[curEdit.editingNode.value.name] = info.args;
            curEdit.aggregates[curEdit.editingNode.value.name] = info.args;
            checkAggForMap();
        } else {
            curEdit.structs[curEdit.editingNode.value.name] = info.args;
            if (curEdit.editingNode.value.api === XcalarApisT.XcalarApiFilter) {
                checkOpForAgg(curEdit.editingNode);
            }
        }

        $(".xcTableWrap").removeClass("editing");
        $(".dagWrap.editMode").addClass("hasEdit");
        xcTooltip.add($(".dagWrap.editMode").find(".runBtn"), {
            title: DFTStr.RunEdits
        });

        var alreadyHasEdit = Dag.updateEditedOperation(curEdit.treeNode, curEdit.editingNode, indexNodes,
                              curEdit.structs[curEdit.editingNode.value.name]);

        if (alreadyHasEdit) {
            return;
        }

        var descendants = Dag.styleDestTables($(".dagWrap.editMode"),
                                    curEdit.editingNode.value.name, "isDownstream");
        for (var i = 0; i < descendants.length; i++) {
            if (!curEdit.descendantRefCounts[descendants[i]]) {
                curEdit.descendantRefCounts[descendants[i]] = 0;
            }
            curEdit.descendantRefCounts[descendants[i]]++;
        }
        curEdit.descendantMap[curEdit.editingNode.value.name] = descendants;
    };

    DagEdit.storeUnion = function(tableInfos, dedup, newTableName, unionType) {
        var txId = Transaction.start({
            "operation": "Edit Union",
            "simulate": true,
            "isEdit": true
        });

        XIApi.union(txId, tableInfos, dedup, newTableName, unionType)
        .then(function(nTableName, nTableCols) {
            var queryStr = Transaction.done(txId, {
                "noNotification": true,
                "noSql": true
            });

            if (queryStr[queryStr.length - 1] === ",") {
                queryStr = queryStr.slice(0, -1);
            }
            var query = JSON.parse("[" + queryStr + "]");

            if (query.length > 1) {
                if (!curEdit.insertedNodes[curEdit.editingNode.value.name]) {
                    curEdit.insertedNodes[curEdit.editingNode.value.name] = [];
                }
                for (var i = 0; i < query.length - 1; i++) {
                    curEdit.insertedNodes[curEdit.editingNode.value.name].push(query[i]);
                }
            }

            DagEdit.store(query[query.length - 1]);
        })
        .fail(function(err) {

        });
    };

    DagEdit.storeJoin = function(joinType, lJoinInfo, rJoinInfo, newTableName, options) {
        var txId = Transaction.start({
            "operation": "Edit Join",
            "simulate": true,
            "isEdit": true
        });

        joinType = gJoinLookup[joinType];

        var lTableId = lJoinInfo.tableId;
        var lColNums = lJoinInfo.colNums;
        var lTable = gTables[lTableId] || gDroppedTables[lTableId];
        var lTableName = lTable.getName();

        var rTableId = rJoinInfo.tableId;
        var rColNums = rJoinInfo.colNums;
        var rTable = gTables[rTableId] || gDroppedTables[rTableId];
        var rTableName = rTable.getName();

        var lColNames = lColNums.map(function(colNum) {
            return lTable.getCol(colNum).getBackColName();
        });

        var rColNames = rColNums.map(function(colNum) {
            return rTable.getCol(colNum).getBackColName();
        });

        var lTableInfo = {
            "tableName": lTableName,
            "columns": lColNames,
            "casts": lJoinInfo.casts,
            "rename": lJoinInfo.rename
        };

        var rTableInfo = {
            "tableName": rTableName,
            "columns": rColNames,
            "casts": rJoinInfo.casts,
            "rename": rJoinInfo.rename
        };

        var joinOpts = {
            "newTableName": newTableName
        };

        if (options.filterEvalString) {
            joinOpts.evalString = options.filterEvalString;
        }

        XIApi.join(txId, joinType, lTableInfo, rTableInfo, joinOpts)
        .then(function(nTableName, lRename, rRename) {
            var nTableCols = xcHelper.createJoinedColumns(lTableInfo.tableName,
                rTableInfo.tableName, lJoinInfo.pulledColumns,
                rJoinInfo.pulledColumns, lRename, rRename);
            var query = Transaction.done(txId, {
                "noNotification": true,
                "noSql": true
            });

            if (query[query.length - 1] === ",") {
                query = query.slice(0, -1);
            }

            query = JSON.parse("[" + query + "]");

            if (query.length > 1) {
                if (!curEdit.insertedNodes[curEdit.editingNode.value.name]) {
                    curEdit.insertedNodes[curEdit.editingNode.value.name] = [];
                }
                for (var i = 0; i < query.length - 1; i++) {
                    curEdit.insertedNodes[curEdit.editingNode.value.name].push(query[i]);
                }
            }

            DagEdit.store(query[query.length - 1]);
        })
        .fail(function(err) {

        });
    };

    // DagEdit.storeGroupby = function(tableId, aggregateArgs, groupByCols, options) {
    //     options.simulate = true;
    //     options.dstTableName
    // };

    DagEdit.undoEdit = function(node) {
        var linkedNodes = curEdit.linkedNodes[node.value.name];
        var toDelete = [];
        if (linkedNodes) {
            for (var i = 0; i < linkedNodes.length; i++) {
                toDelete.push(linkedNodes[i]);
                delete curEdit.structs[linkedNodes[i].value.name];
            }
            delete curEdit.linkedNodes[node.value.name];
        }
        delete curEdit.structs[node.value.name];
        delete curEdit.newNodes[node.value.name];
        delete curEdit.insertedNodes[node.value.name];
        delete curEdit.aggregates[node.value.name];
        var descendants = curEdit.descendantMap[node.value.name];
        for (var i = 0; i < descendants.length; i++) {
            curEdit.descendantRefCounts[descendants[i]]--;
            if (!curEdit.descendantRefCounts[descendants[i]]) {
                var $dagTable = Dag.getTableIconByName($(".dagWrap.editMode"),
                                                        descendants[i]);
                $dagTable.closest(".dagTableWrap").removeClass("isDownstream");
                delete curEdit.descendantRefCounts[descendants[i]];
            }
        }
        delete curEdit.descendantMap[node.value.name];

        Dag.removeEditedOperation(curEdit.treeNode, node, toDelete);
        if (!Object.keys(curEdit.structs).length &&
            !Object.keys(curEdit.newNodes).length) {
            $(".dagWrap.editMode").removeClass("hasEdit");
            xcTooltip.add($(".dagWrap.editMode").find(".runBtn"), {
                title: DFTStr.NoEdits
            });
        }
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
            curEdit.mapIndex = index;
            DagEdit.editOp(curEdit.editingNode, {evalIndex: index});
        });

        $mapPreForm.on("click", ".delete", function() {
            if ($mapPreForm.hasClass("single")) {
                return;
            }
            var index = $(this).closest(".row").index();
            var struct;
            if (!curEdit.structs[curEdit.editingNode.value.name]) {
                curEdit.structs[curEdit.editingNode.value.name] = {
                    eval: xcHelper.deepCopy(curEdit.editingNode.value.struct.eval)
                };
                curEdit.structs[curEdit.editingNode.value.name].icv = curEdit.editingNode.value.struct.icv;
            }
            curEdit.structs[curEdit.editingNode.value.name].eval.splice(index, 1);
            $(this).closest(".row").remove();

            var alreadyHasEdit = Dag.updateEditedOperation(curEdit.treeNode, curEdit.editingNode, [],
                              curEdit.structs[curEdit.editingNode.value.name]);

            if (curEdit.structs[curEdit.editingNode.value.name].eval.length === 1) {
                $mapPreForm.addClass("single");
                xcTooltip.add($mapPreForm.find(".delete"),
                             {title: TooltipTStr.MapNoDelete});
                $mapPreForm.find(".delete").attr("data-tipclasses", "highZindex");
            }

            $(".dagWrap.editMode").addClass("hasEdit");
            xcTooltip.add($(".dagWrap.editMode").find(".runBtn"), {
                title: DFTStr.RunEdits
            });


            if (alreadyHasEdit) {
                return;
            }

            var descendants = Dag.styleDestTables($(".dagWrap.editMode"),
                                        curEdit.editingNode.value.name, "isDownstream");
            for (var i = 0; i < descendants.length; i++) {
                if (!curEdit.descendantRefCounts[descendants[i]]) {
                    curEdit.descendantRefCounts[descendants[i]] = 0;
                }
                curEdit.descendantRefCounts[descendants[i]]++;
            }
            curEdit.descendantMap[curEdit.editingNode.value.name] = descendants;
        });

        $mapPreForm.on("click", ".addOp", function() {
            $mapPreForm.removeClass("active");
            $(document).off(".hideMapPreForm");

            var index = $mapPreForm.find(".row").length;
            curEdit.mapIndex = index;
            DagEdit.editOp(curEdit.editingNode, {evalIndex: index});
        });

        $mapPreForm.on("mouseenter", ".evalStr", function() {
            xcTooltip.auto(this);
        });
    };

    function showEditForm(node, sourceTableNames, isDroppedTable, evalIndex) {
        var api = node.value.api;
        var origStruct = node.value.struct;
        var struct = curEdit.structs[node.value.name] || origStruct;
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
                    curEdit.mapIndex = evalIndex;
                } else {
                    curEdit.mapIndex = 0;
                }

                var opInfo;
                if (struct.eval[curEdit.mapIndex]) {
                    var evalStr = struct.eval[curEdit.mapIndex].evalString.trim();
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
                    newFields: [newFields[curEdit.mapIndex]],
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
                if (curEdit.linkedNodes[curEdit.editingNode.value.name]) {
                    var indexNode = curEdit.linkedNodes[curEdit.editingNode.value.name][0];
                    var indexName = indexNode.value.name;
                    indexedFields = curEdit.structs[indexName].key.map(function(key) {
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
                    "isDroppedTable": isDroppedTable[0],
                    "groupAll": !struct.groupAll
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

                    for (var j = 0; j < struct.columns[i].length; j++) {
                        var colName = struct.columns[i][j].sourceColumn;
                        if (colName.indexOf("XC_") === 0) {
                            continue;
                        }
                        var rename = struct.columns[i][j].destColumn;
                        var type = translateType(struct.columns[i][j].columnType);
                        cols.push({
                            origName: node.value.indexedFields[i][j],
                            name: colName,
                            rename: rename,
                            type: type
                        });
                    }
                    tableCols.push(cols);
                }

                var indexedFields = node.value.indexedFields;
                var colNumSets = [];

                for (var i = 0; i < indexedFields.length; i++) {
                    var tId = xcHelper.getTableId(sourceTableNames[i]);
                    var table = gTables[tId] || gDroppedTables[tId];
                    var colNums = [];
                    if (table && table.getAllCols().length > 1) {
                        for (var j = 0; j < indexedFields[i].length; j++) {
                            var colNum = table.getColNumByBackName(indexedFields[i][j]);
                            if (colNum != null && colNum > -1) {
                                colNums.push(colNum);
                            } else {
                                var num = table.tableCols.length;
                                ColManager.pullCol(num, tId, {
                                    direction: "L",
                                    escapedName: indexedFields[i][j],
                                    fullName: indexedFields[i][j],
                                });
                                colNums.push(num);
                            }
                        }
                    }
                    colNumSets.push(colNums);
                }

                prefillInfo = {
                    "dedup": struct.dedup,
                    "type": struct.unionType,
                    "sourceTables": sourceTableNames,
                    "dest": xcHelper.getTableName(origStruct.dest), // XXX allow changing
                    "isDroppedTable": isDroppedTable,
                    "tableCols": tableCols,
                    "colNumSets": colNumSets
                };
                UnionView.show(tableId, colNumSets[0], {prefill: prefillInfo});
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

    // will store a new indexNode in "indexNodes" if the operation is needed for groupby or join
    function checkIndexNodes(indexFields, indexNodes, parentNum) {
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

        if (curEdit.editingNode.parents[parentNum].value.api ===
            XcalarApisT.XcalarApiIndex) {
            indexNode = curEdit.editingNode.parents[parentNum];

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
                curEdit.structs[indexNode.value.name] = {"key": keys};
                indexNodes.push(indexNode);
            }
        } else {
             // need to insert an index operation here if table is not
            // indexed correctly
            if (!curEdit.newNodes[curEdit.editingNode.value.name]) {
                curEdit.newNodes[curEdit.editingNode.value.name] = [];
            }
            // consider tags
            curEdit.newNodes[curEdit.editingNode.value.name].push({
                keys: keys,
                src: curEdit.editingNode.parents[parentNum].value.name
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

        var mapStruct = curEdit.structs[node.value.name] || node.value.struct;

        var evalHtml = "";
        mapStruct.eval.forEach(function(evalObj) {
            evalHtml += '<div class="row">' +
                            '<div class="edit option xc-action">' +
                                // '<span class="text">Edit</span>' +
                                '<i class="icon xi-edit"></i>' +
                            '</div>' +
                            '<div class="evalStr" ' +
                                'data-toggle="tooltip" data-container="body" ' +
                                'data-placement="top" data-tipclasses="highZindex" ' +
                                'data-original-title="' +
                                xcHelper.escapeDblQuoteForHTML(
                                    xcHelper.escapeHTMLSpecialChar(
                                    xcHelper.escapeHTMLSpecialChar(
                                        evalObj.evalString))) + '">' +
                                xcHelper.escapeHTMLSpecialChar(
                                    evalObj.evalString) +
                            '</div>' +
                            '<div class="optionSection">' +
                                '<div class="delete option xc-action">' +
                                    '<i class="icon xi-trash"></i>' +
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
        var deferred = PromiseHelper.deferred();
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

    // after editing a map or filter, checks to see if it's referencing any aggs that
    // don't exist
    function checkOpForAgg(node) {
        var struct = curEdit.structs[node.value.name];
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
                    if (curEdit.aggregates[parentNames[j]] && curEdit.aggregates[parentNames[j]].dest) {
                        var dest = curEdit.structs[parentNames[j]].dest;
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
                for (var aggNames in curEdit.aggregates) {
                    if (curEdit.aggregates[aggNames].dest) {
                        var dest = curEdit.aggregates[aggNames].dest;
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
                        '<div>Aggregate(s) not found: ' +
                            xcHelper.listToEnglish(unknownAggs) +
                        '</div>' +
                      '</div>';
            $dagTableWrap.find(".operationTypeWrap").find(".dagTableTip").remove();
            $dagTableWrap.find(".operationTypeWrap").append(tip);
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
            var nodeId = $(this).find(".dagTable").data("nodeid");
            var mapNode = Dag.getNodeById($dagWrap, nodeId);
            checkOpForAgg(mapNode);
        });
    }

    // check the log and if the recent operations only involved the tables that
    // were brought out into the worksheet, undo up to the point where the
    //SQLOps.MoveTemporaryTableToWS operations took place
    function undoMovingTempTablesToWorksheet() {
        var tablesFromTemp = [];
        for (var tableName in curEdit.editingTables) {
            var status = curEdit.editingTables[tableName];
            if (status === "inactive") {
                var tableId = xcHelper.getTableId(tableName);
                if (tableId) {
                    tablesFromTemp.push(tableId);
                }
            }
        }
        var undoCount = 0;
        if (tablesFromTemp.length) {
            var logs = Log.getLogs();
            var cursor = Log.getCursor();
            if (logs.length - 1 === cursor) {
                for (var i = cursor; i >= 0; i--) {
                    var log = logs[i];
                    var tIndex = tablesFromTemp.indexOf(log.options.tableId);
                    if (log.options && log.options.tableId && tIndex !== -1) {
                        undoCount++;
                        if (log.options.operation === SQLOps.MoveTemporaryTableToWS) {
                            tablesFromTemp.splice(tIndex, 1);
                        }
                    } else {
                        break;
                    }
                }
            }
        }
        if (undoCount) {
            Log.undo(undoCount, true);
        }
        // if an operation unrelated to one of the temp tables took place, instead
        // of undoing, send the remaining tables to temp list
        if (tablesFromTemp.length) {
            tablesFromTemp.forEach(function(tableId) {
                TblManager.sendTableToTempList([tableId]);
            });
        }
    }

    if (window.unitTestMode) {
        DagEdit.__testOnly__ = {};
        DagEdit.__testOnly__.checkIndexNodes = checkIndexNodes;
    }

    return (DagEdit);
})(jQuery, {});

window.DagEdit = (function($, DagEdit) {
	var params = {};
	var editingNode;
	DagEdit.store = function(info) {

        if (editingNode.value.api === XcalarApisT.XcalarApiGroupBy) {
            var indexFields = info.indexFields;
            if (editingNode.parents[0].value.api === XcalarApisT.XcalarApiIndex) {
                var indexNode = editingNode.parents[0];
                var keys = info.indexFields.map(function(name) {
                    // XXX use correct key type
                    return {"name": name, type: DfFieldTypeTStr[DfFieldTypeT.DfUnknown]};
                });

                params[indexNode.value.name] = {"key": keys};
            } else {
                // need to insert an index operation here if table is not
                // indexed correctly
            }

        }

        params[editingNode.value.name] = info.args;
		console.log(params);
	};

	DagEdit.getInfo = function() {
		return params;
	};

	DagEdit.toggle = function() {
		$("#container").toggleClass("dfEditState");
		params = {};
	};

	DagEdit.editOp = function(node) {
		editingNode = node;
        var sourceTableName = node.value.struct.source;
        if (node.value.api === XcalarApisT.XcalarApiJoin) {
            sourceTableName = sourceTableName[0];
        }
        var tableId = xcHelper.getTableId(sourceTableName);

        TblManager.findAndFocusTable(sourceTableName)
        .then(function() {
            showEditForm(node, tableId);
        })
        .fail(function() {

        });


	};

    function showEditForm(node, tableId) {
        var api = node.value.api;
        var struct = node.value.struct;
        switch(api) {
            case (XcalarApisT.XcalarApiMap):
                var evalStr = struct.eval[0].evalString.trim();
                var prefillInfo = xcHelper.extractOpAndArgs(evalStr);
                prefillInfo.newField = struct.eval[0].newField;
                OperationsView.show(tableId, [], "map", {
                    prefill: prefillInfo
                });
                break;
            case (XcalarApisT.XcalarApiFilter):
                var evalStr = struct.eval[0].evalString.trim();
                var prefillInfo = xcHelper.extractOpAndArgs(evalStr);
                OperationsView.show(tableId, [], "filter", {
                    prefill: prefillInfo
                });
                break;
            case (XcalarApisT.XcalarApiGroupBy):
                var evalStr = struct.eval[0].evalString.trim();
                var prefillInfo = xcHelper.extractOpAndArgs(evalStr);
                prefillInfo.newField = struct.eval[0].newField;
                prefillInfo.dest = xcHelper.getTableName(struct.dest);
                OperationsView.show(tableId, [], "group by", {
                    prefill: prefillInfo
                });
                break;
            case (XcalarApisT.XcalarApiJoin):
                var prefillInfo = {
                    "joinType": struct.joinType,
                    "dest": xcHelper.getTableName(struct.dest)
                };
                JoinView.show(tableId, [], {prefill: prefillInfo});

                break;
            case (XcalarApisT.XcalarApiProject):
                var colNums = [];
                if (gTables[tableId]) {
                    var table = gTables[tableId];
                    for (var i = 0; i < struct.columns.length; i++) {
                        var colNum = table.getColNumByBackName(struct.columns[i]);
                        if (colNum != null) {
                            colNums.push(colNum);
                        }
                    }
                }

                ProjectView.show(tableId, colNums, {
                    prefill: true
                });
                break;
            default:
                console.log("invalid op");
                break;
        }
    }

    // returns {func, params};
	// function parseEvalStr(evalStr) {
 //        var openParenIndex = evalStr.indexOf("(");
 //        var func = evalStr.slice(0, openParenIndex);
 //        var funcString = evalStr.slice(openParenIndex + 1,
 //                                    evalStr.length - 1);

 //        var tempString = "";
 //        var params = [];
 //        var inQuotes = false;
 //        var singleQuote = false;
 //        var isEscaped = false;

 //        var paramCount = 0;

 //        for (var i = 0; i < funcString.length; i++) {
 //            if (isEscaped) {
 //                tempString += funcString[i];
 //                isEscaped = false;
 //                continue;
 //            }
 //            if (inQuotes) {
 //                if ((funcString[i] === "\"" && !singleQuote) ||
 //                    (funcString[i] === "'" && singleQuote)) {
 //                    inQuotes = false;
 //                }
 //            } else {
 //                if (funcString[i] === "\"") {
 //                    inQuotes = true;
 //                    singleQuote = false;
 //                } else if (funcString[i] === "'") {
 //                    inQuotes = true;
 //                    singleQuote = true;
 //                }
 //            }

 //            if (funcString[i] === "\\") {
 //                isEscaped = true;
 //                tempString += funcString[i];
 //            } else if (inQuotes) {
 //                tempString += funcString[i];
 //            } else {
 //                if (funcString[i] === "," && paramCount === 0) {
 //                    params.push(tempString.trim());
 //                    tempString = "";
 //                } else if (funcString[i] === "(") {
 //                    tempString += funcString[i];
 //                    paramCount++;
 //                } else if (funcString[i] === ")") {
 //                    tempString += funcString[i];
 //                    paramCount--;
 //                } else {
 //                    tempString += funcString[i];
 //                }
 //            }
 //        }
 //        if (tempString.trim().length) {
 //            params.push(tempString.trim());
 //        }
 //        return {
 //            func: func,
 //            params: params
 //        };
 //    }

    if (window.unitTestMode) {
        DagEdit.__testOnly__ = {};
        // DagEdit.__testOnly__.parseEvalStr = parseEvalStr;
    }

    function structs() {
        var load = {
          "url": "file:///netstore/datasets/indexJoin/students/students.json",
          "fileNamePattern": "",
          "udf": "",
          "dest": ".XcalarDS.rudy.95711.students",
          "size": 0,
          "format": "json",
          "recordDelim": "\n",
          "fieldDelim": "",
          "quoteDelim": "\"",
          "linesToSkip": 0,
          "crlf": true,
          "header": false,
          "recursive": false
        };

        var index =  {
          "source": ".XcalarDS.rudy.95711.students",
          "dest": "students#p7302",
          "key": [
            {
              "name": "xcalarRecordNum",
              "type": "\u0000"
            }
          ],
          "prefix": "students",
          "ordering": "Unordered",
          "dhtName": "",
          "delaySort": false
        };

        var filter = {
          "source": "students#p7302",
          "dest": "students#p7303",
          "eval": [
            {
              "evalString": "eq(students::student_id, 1)",
              "newField": ""
            }
          ]
        };

        var aggregate = {
          "source": "students#p7304",
          "dest": "b",
          "eval": [
            {
              "evalString": "avg(students::student_id)",
              "newField": ""
            }
          ]
        };

        var map =  {
          "source": "students#p7304",
          "dest": "students#p7307",
          "eval": [
            {
              "evalString": "add(students::student_id, ^b)",
              "newField": "student_id_add1"
            }
          ],
          "icv": false
        };

        var groupby = {
          "source": "students.index#p7310",
          "dest": "g#p7308",
          "eval": [
            {
              "evalString": "count(students::student_name)",
              "newField": "student_name_count"
            }
          ],
          "newKeyField": "",
          "includeSample": true,
          "icv": false
        };

        var join = {
          "source": [
            "students.index#p7312",
            "students.index#p7313"
          ],
          "dest": "hre#p7311",
          "joinType": "innerJoin",
          "renameMap": [
            [],
            []
          ]
        };
    }


	return (DagEdit);
})(jQuery, {});
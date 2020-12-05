// XXX This may need rename when other databases supported
class SnowflakePredicate {
    static compile(node: TreeNode): XDPromise<any>  {

        const deferred = PromiseHelper.deferred();

        let schema = [];
        let newTableName: string = XIApi.getNewTableName("XCPUSHDOWN");
        if (node.value.plan[0].aliasList.length === 0) {
            for (let i = 0; i < node.value.plan[0].output.length; i++) {
                let dataType = node.value.plan[0].output[i][0].dataType;
                let colInfo = {
                    'sourceColumn': node.value.plan[0].output[i][0].name,
                    'destColumn': SQLCompiler.cleanseColName(node.value.plan[0].output[i][0].name),
                    'columnType': DfFieldTypeTStr[xcHelper.convertColTypeToFieldType(xcHelper.convertSQLTypeToColType(SQLCompiler.convertSparkTypeToXcalarType(dataType)))]
                }
                schema.push(colInfo);
            }
        } else {
            for (let i = 0; i < node.value.plan[0].aliasList.length; i++) {
                let dataType = node.value.plan[0].output[i][0].dataType;
                let colInfo = {
                    'sourceColumn': node.value.plan[0].aliasList[i][0].name,
                    'destColumn': SQLCompiler.cleanseColName(node.value.plan[0].output[i][0].name),
                    'columnType': DfFieldTypeTStr[xcHelper.convertColTypeToFieldType(xcHelper.convertSQLTypeToColType(SQLCompiler.convertSparkTypeToXcalarType(dataType)))]
                }
                schema.push(colInfo);
            }
        }
        let key = xcHelper.randName("sfPredicateQuery_");
        let query = node.value.plan[0].query;
        let parserArgs;
        let maxQueryLen = XcalarApisConstantsT.XcalarApiMaxFileNameLen + XcalarApisConstantsT.XcalarApiMaxUrlLen;
        if (JSON.stringify({"query": query, "kvstoreKey": key}).length >= maxQueryLen) {
            // Store query in KV store
            XcalarKeyPutXcrpc(key, query, false,  gKVScope.GLOB);
            parserArgs = JSON.stringify({"query": "<Query size too large to display>", "kvstoreKey": key})
        } else {
            parserArgs = JSON.stringify({"query": query, "kvstoreKey": ""})
        }
        let datasetName = xcHelper.randName('.XcalarDS.Optimized.ds_')

        // XXX Make this generic so other components can also call
        let bulkload = {
                'operation': 'XcalarApiBulkLoad',
                'comment': '', 'tag': '',
                'args': {
                    'dest': datasetName,
                    'loadArgs': {
                        'sourceArgsList': [
                            {
                                'targetName': node.targetName,
                                'path': '', 'fileNamePattern': '',
                                'recursive': false}
                            ],
                        'parseArgs': {
                            'parserFnName': '/sharedUDFs/default:snowflakePredicateLoad',
                            'parserArgJson': parserArgs,
                            'fileNameFieldName': '',
                            'recordNumFieldName': '',
                            'allowFileErrors': false,
                            'allowRecordErrors': false,
                            'schema': schema
                        },
                        'size': 10737418240
                    },
                    "sourceType": "Snowflake"
                },
                'annotations': {}
            }
        let index = {
                'operation': 'XcalarApiSynthesize',
                'args': {
                    'source': datasetName,
                    'dest': newTableName,
                    'columns': schema,
                    'sameSession': true,
                    'numColumns': 1
                },
                'tag': ''
            };
        node.newTableName = newTableName;
        for (let i = 0; i < node.value.plan[0].output.length; i++) {
            let colIdVal = null
            if ("expId" in node.value.plan[0].output[i][0]) {
                colIdVal = node.value.plan[0].output[i][0].exprId.id
            }
            let col: SQLColumn = {
                colName: SQLCompiler.cleanseColName(node.value.plan[0].output[i][0].name),
                colId: colIdVal,
                colType: SQLCompiler.convertSparkTypeToXcalarType(node.value.plan[0].output[i][0].dataType)
            }
            node.usrCols.push(col);
        }
        deferred.resolve({
            "newTableName": newTableName,
            "cli": JSON.stringify(bulkload) + "," + JSON.stringify(index) + ","
        });
        return deferred.promise();
    }
}

if (typeof exports !== "undefined") {
    exports.SnowflakePredicate = SnowflakePredicate;
}
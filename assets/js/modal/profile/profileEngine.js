window.ProfileEngine = (function(ProfileEngine) {
    var statsColName;
    var bucketColName;

    var sortMap;
    var aggKeys;
    var statsKeyMap;

    var profileResultSetId = null;
    var totalRows = null;

    var aggMap = {
        "min": AggrOp.Min,
        "average": AggrOp.Avg,
        "max": AggrOp.Max,
        "count": AggrOp.Count,
        "sum": AggrOp.Sum,
        "sd": "sd"
    };

    ProfileEngine.setup = function(options) {
        options = options || {};

        sortMap = options.sortMap;
        aggKeys = options.aggKeys;
        statsKeyMap = options.statsKeyMap;
        statsColName = options.statsColName;
        bucketColName = options.bucketColName;
    };

    ProfileEngine.genProfile = function(profileInfo, table) {
        var deferred = PromiseHelper.deferred();

        var tableName = table.getName();
        var groupbyTable;
        var finalTable;
        var colName = profileInfo.colName;
        var rename = xcHelper.stripColName(colName);
        rename = xcHelper.parsePrefixColName(rename).name;
        var tablesToDelete = {};

        profileInfo.groupByInfo.isComplete = "running";

        var sql = {
            "operation": SQLOps.Profile,
            "tableName": table.getName(),
            "tableId": table.getId(),
            "colName": colName,
            "id": profileInfo.getId()
        };

        var txId = Transaction.start({
            "msg": StatusMessageTStr.Profile + " " +
                   xcHelper.escapeHTMLSpecialChar(colName),
            "operation": SQLOps.Profile,
            "sql": sql,
            "steps": -1
        });

        // filter out fnf
        var fltStr = "exists(" + colName + ")";
        XIApi.filter(txId, fltStr, tableName)
        .then(function(tableAfterFilter) {
            tablesToDelete[tableAfterFilter] = true;
            return XIApi.index(txId, colName, tableAfterFilter);
        })
        .then(function(indexedTableName, indexArgs) {
            var innerDeferred = PromiseHelper.deferred();
            if (!indexArgs.isCache) {
                tablesToDelete[indexedTableName] = true;
            }

            XIApi.getNumRows(indexedTableName)
            .then(function(val) {
                // the table.resultSetCount should eqaul to the
                // totalCount after right index, if not, a way to resolve
                // is to get resulSetCount from the right src table
                var nullCount = table.resultSetCount - val;
                var allNull = (val === 0);
                innerDeferred.resolve(indexedTableName, nullCount, allNull);
            })
            .fail(innerDeferred.reject);
            return innerDeferred.promise();
        })
        .then(function(indexedTableName, nullCount, allNull) {
            profileInfo.groupByInfo.nullCount = nullCount;
            if (allNull) {
                profileInfo.groupByInfo.allNull = true;
            }

            // here user old table name to generate table name
            groupbyTable = getNewName(tableName, ".profile.GB", true);

            var operator = AggrOp.Count;
            var newColName = statsColName;
            var isIncSample = false;

            return XcalarGroupBy(operator, newColName, colName,
                                indexedTableName, groupbyTable,
                                isIncSample, false, rename, false, txId);
        })
        .then(function() {
            if (profileInfo.groupByInfo.allNull) {
                finalTable = groupbyTable;
                return PromiseHelper.resolve(0, 0);
            }

            finalTable = getNewName(tableName, ".profile.final", true);
            colName = rename;
            return sortGroupby(txId, colName, groupbyTable, finalTable);
        })
        .then(function(maxVal, sumVal) {
            profileInfo.addBucket(0, {
                "max": maxVal,
                "sum": sumVal,
                "table": finalTable,
                "colName": colName,
                "bucketSize": 0
            });

            profileInfo.groupByInfo.isComplete = true;
            for (var tableToDelete in tablesToDelete) {
                // delete temp tables
                XIApi.deleteTable(txId, tableToDelete, true);
            }
        })
        .then(function() {
            Transaction.done(txId, {
                "noNotification": true
            });
            deferred.resolve();
        })
        .fail(function(error) {
            profileInfo.groupByInfo.isComplete = false;
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.ProfileFailed,
                "error": error,
                "sql": sql,
                "noAlert": true
            });
            deferred.reject(error);
        });

        return deferred.promise();
    };

    ProfileEngine.checkProfileTable = function(tableName) {
        var deferred = PromiseHelper.deferred();

        XcalarGetTables(tableName)
        .then(function(tableInfo) {
            var exist = (tableInfo != null && tableInfo.numNodes !== 0);
            deferred.resolve(exist);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    ProfileEngine.setProfileTable = function(tableName, rowsToFetch) {
        var deferred = PromiseHelper.deferred();

        ProfileEngine.clear()
        .then(function() {
            return XcalarMakeResultSetFromTable(tableName);
        })
        .then(function(resultSet) {
            setProfileTable(resultSet);
            return ProfileEngine.fetchProfileData(0, rowsToFetch);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    ProfileEngine.fetchProfileData = function(rowPosition, rowsToFetch) {
        var totalRowNum = getProfileTableRowNum();
        var profileData = [];

        if (totalRowNum == null || totalRowNum === 0) {
            return PromiseHelper.resolve(profileData);
        }

        var deferred = PromiseHelper.deferred();
        var resultSetId = getProfileResultSetId();

        XcalarFetchData(resultSetId, rowPosition, rowsToFetch, totalRowNum, [],
                        0, 0)
        .then(function(data) {
            var numRows = Math.min(rowsToFetch, data.length);
            var failed = false;
            for (var i = 0; i < numRows; i++) {
                try {
                    var value = jQuery.parseJSON(data[i]);
                    value.rowNum = rowPosition + 1 + i;
                    profileData.push(value);
                } catch (error) {
                    console.error(error, data[i]);
                    failed = true;
                    err = error;
                }
                if (failed) {
                    deferred.reject(err);
                    return;
                }
            }

            deferred.resolve(profileData);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    ProfileEngine.getTableRowNum = function() {
        return getProfileTableRowNum();
    };

    ProfileEngine.sort = function(order, bucketNum, profileInfo) {
        profileInfo.groupByInfo.isComplete = "running";

        var deferred = PromiseHelper.deferred();
        var sql = {
            "operation": SQLOps.ProfileSort,
            "order": order,
            "colName": profileInfo.colName,
            "bucketSize": bucketNum,
            "id": profileInfo.getId()
        };
        var txId = Transaction.start({
            "operation": SQLOps.ProfileSort,
            "sql": sql,
            "steps": -1
        });

        runSort(txId, order, bucketNum, profileInfo)
        .then(function() {
            profileInfo.groupByInfo.isComplete = true;
            Transaction.done(txId);
            deferred.resolve();
        })
        .fail(function(error) {
            profileInfo.groupByInfo.isComplete = false;
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.ProfileFailed,
                "error": error,
                "sql": sql,
                "noAlert": true
            });
            deferred.reject(error);
        });

        return deferred.promise();
    };

    ProfileEngine.bucket = function(bucketNum, tableName, profileInfo, fitAll) {
        profileInfo.groupByInfo.isComplete = "running";

        var deferred = PromiseHelper.deferred();
        var sql = {
            "operation": SQLOps.ProfileBucketing,
            "tableName": tableName,
            "colName": profileInfo.colName,
            "id": profileInfo.getId()
        };
        var txId = Transaction.start({
            "operation": SQLOps.ProfileBucketing,
            "sql": sql,
            "steps": -1
        });

        var bucketSizeDef = fitAll
                            ? getFitAllBucketSize(txId, tableName, profileInfo)
                            : PromiseHelper.resolve(bucketNum);
        bucketSizeDef
        .then(function(bucketSize) {
            bucketNum = bucketSize;
            if (!isValidBucketSize(bucketNum)) {
                return PromiseHelper.reject(ProfileTStr.InvalidBucket);
            }

            return runBucketing(txId, bucketNum, profileInfo);
        })
        .then(function() {
            sql.bucketSize = bucketNum;
            profileInfo.groupByInfo.isComplete = true;

            Transaction.done(txId, {"sql": sql});
            deferred.resolve(bucketNum);
        })
        .fail(function(error) {
            profileInfo.groupByInfo.isComplete = false;
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.ProfileFailed,
                "error": error,
                "sql": sql,
                "noAlert": true
            });

            deferred.reject(error);
        });

        return deferred.promise();
    };

    ProfileEngine.genAggs = function(tableName, profileInfo) {
        var deferred = PromiseHelper.deferred();
        var promises = [];
        var sql = {
            "operation": SQLOps.ProfileAgg,
            "tableName": tableName,
            "colName": profileInfo.colName,
            "id": profileInfo.getId()
        };
        var txId = Transaction.start({
            "operation": SQLOps.ProfileAgg,
            "sql": sql,
            "steps": ((aggKeys.length - 1) * 2)
        });

        aggKeys.forEach(function(aggkey) {
            promises.push(runAgg(txId, aggkey, tableName, profileInfo));
        });

        PromiseHelper.when.apply(this, promises)
        .always(function() {
            Transaction.done(txId);
            deferred.resolve();
        });

        return deferred.promise();
    };

    ProfileEngine.genStats = function(tableName, profileInfo, sort) {
        if (!sort) {
            return runStats(tableName, profileInfo);
        }

        var deferred = PromiseHelper.deferred();
        var colName = profileInfo.colName;
        var sortTable = null;
        var sql = {
            "operation": SQLOps.ProfileStats,
            "tableName": tableName,
            "colName": colName,
            "id": profileInfo.getId()
        };
        var txId = Transaction.start({
            "operation": SQLOps.ProfileStats,
            "sql": sql,
            "steps": 1
        });

        XIApi.sortAscending(txId, colName, tableName)
        .then(function(tableAfterSort, newKeys) {
            sortTable = tableAfterSort;
            profileInfo.statsInfo.unsorted = false;
            profileInfo.statsInfo.key = newKeys[0];
            return runStats(sortTable, profileInfo);
        })
        .then(function() {
            Transaction.done(txId);
            deferred.resolve();
        })
        .fail(function(error) {
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.ProfileFailed,
                "error": error,
                "sql": sql,
                "noAlert": true
            });
            deferred.reject(error);
        })
        .always(function() {
            if (sortTable != null) {
                XIApi.deleteTable(txId, sortTable, true);
            }
        });

        return deferred.promise();
    };

    ProfileEngine.clear = function() {
        var resultSetId = getProfileResultSetId();
        resetProfileTable();

        if (resultSetId == null) {
            return PromiseHelper.resolve();
        } else {
            var def = XcalarSetFree(resultSetId);
            return PromiseHelper.alwaysResolve(def);
        }
    };

    function setProfileTable(resultSet) {
        profileResultSetId = resultSet.resultSetId;
        totalRows = resultSet.numEntries;
    }

    function resetProfileTable() {
        profileResultSetId = null;
        totalRows = 0;
    }

    function getProfileTableRowNum() {
        return totalRows;
    }

    function getProfileResultSetId() {
        return profileResultSetId;
    }

    function getNewName(tableName, affix, rand) {
        var name = xcHelper.getTableName(tableName);
        name = name + affix;

        if (rand) {
            name = xcHelper.randName(name);
        }

        name += Authentication.getHashId();

        return (name);
    }

    function sortGroupby(txId, sortCol, srcTable, finalTable) {
        var deferred = PromiseHelper.deferred();
        var keyInfo = {
            name: sortCol,
            ordering: XcalarOrderingT.XcalarOrderingAscending
        };
        XcalarIndexFromTable(srcTable, keyInfo, finalTable, txId)
        .then(function() {
            return aggInGroupby(txId, statsColName, finalTable);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function aggInGroupby(txId, colName, tableName) {
        var deferred = PromiseHelper.deferred();
        var def1 = getAggResult(txId, aggMap.max, colName, tableName);
        var def2 = getAggResult(txId, aggMap.sum, colName, tableName);

        PromiseHelper.when(def1, def2)
        .then(function(ret1, ret2) {
            var maxVal = ret1[0];
            var sumVal = ret2[0];
            deferred.resolve(maxVal, sumVal);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getAggResult(txId, aggOp, colName, tableName) {
        if (aggOp === "sd") {
            var deferred = PromiseHelper.deferred();
            // standard deviation
            XIApi.getNumRows(tableName)
            .then(function(totalNum) {
                var evalStr = "sqrt(div(sum(pow(sub(" + colName + ", avg(" +
                              colName + ")), 2)), " + totalNum + "))";
                return XIApi.aggregateWithEvalStr(txId, evalStr, tableName);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        } else {
            return XIApi.aggregate(txId, aggOp, colName, tableName);
        }
    }

    function runAgg(txId, aggkey, tableName, profileInfo) {
        // pass in statsCol beacuse close modal may clear the global statsCol
        if (profileInfo.aggInfo[aggkey] != null) {
            // when already have cached agg info
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();
        var fieldName = profileInfo.colName;
        var aggrOp = aggMap[aggkey];
        var res;

        getAggResult(txId, aggrOp, fieldName, tableName)
        .then(function(val) {
            res = val;
        })
        .fail(function(error) {
            res = "--";
            console.error(error);
        })
        .always(function() {
            profileInfo.aggInfo[aggkey] = res;
            Profile.refreshAgg(profileInfo, aggkey);
            deferred.resolve();
        });

        return deferred.promise();
    }

    function runStats(tableName, profileInfo) {
        var hasStatsInfo = true;
        var statsKeys = statsKeyMap;
        if (!profileInfo.statsInfo.unsorted) {
            for (var key in statsKeys) {
                var stats = statsKeys[key];
                if (profileInfo.statsInfo[stats] === '--') {
                    // when it's caused by fetch error
                    profileInfo.statsInfo[stats] = null;
                }

                if (profileInfo.statsInfo[stats] == null) {
                    hasStatsInfo = false;
                    break;
                }
            }
        }

        if (hasStatsInfo) {
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();
        var isNum = (profileInfo.type === "integer" ||
                     profileInfo.type === "float");
        XIApi.checkOrder(tableName)
        .then(getStats)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();

        function getStats(tableOrder, tableKeys) {
            if (tableOrder === XcalarOrderingT.XcalarOrderingUnordered ||
                tableKeys.length < 1 ||
                tableKeys[0].name !== profileInfo.statsInfo.key &&
                tableKeys[0].name !== profileInfo.colName) {
                // when table is unsorted
                profileInfo.statsInfo.unsorted = true;
                return PromiseHelper.resolve();
            } else if (tableKeys.length === 1 &&
                    profileInfo.statsInfo.key == null &&
                    tableKeys[0].name === profileInfo.colName) {
                profileInfo.statsInfo.key = profileInfo.colName;
            }

            var innerDeferred = PromiseHelper.deferred();
            var zeroKey = statsKeys.zeroQuartile;
            var lowerKey = statsKeys.lowerQuartile;
            var medianKey = statsKeys.median;
            var upperKey = statsKeys.upperQuartile;
            var fullKey = statsKeys.fullQuartile;
            var tableResultsetId;

            XcalarMakeResultSetFromTable(tableName)
            .then(function(res) {
                tableResultsetId = res.resultSetId;
                var defs = [];
                var numEntries = res.numEntries;
                var lowerRowEnd;
                var upperRowStart;

                if (numEntries % 2 !== 0) {
                    // odd rows or not number
                    lowerRowEnd = (numEntries + 1) / 2;
                    upperRowStart = lowerRowEnd;
                } else {
                    // even rows
                    lowerRowEnd = numEntries / 2;
                    upperRowStart = lowerRowEnd + 1;
                }

                defs.push(getMedian.bind(this, tableResultsetId, tableKeys,
                                        1, 1, zeroKey));
                defs.push(getMedian.bind(this, tableResultsetId, tableKeys,
                                        1, numEntries, medianKey));
                defs.push(getMedian.bind(this, tableResultsetId, tableKeys,
                                        1, lowerRowEnd, lowerKey));
                defs.push(getMedian.bind(this, tableResultsetId, tableKeys,
                                        upperRowStart, numEntries, upperKey));
                defs.push(getMedian.bind(this, tableResultsetId, tableKeys,
                                        numEntries, numEntries, fullKey));
                return PromiseHelper.chain(defs);
            })
            .then(function() {
                XcalarSetFree(tableResultsetId);
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        function getMedian(tableResultsetId, tableKeys, startRow, endRow,
                           statsKey) {
            var innerDeferred = PromiseHelper.deferred();
            var numRows = endRow - startRow + 1;
            var rowNum;
            var rowsToFetch;

            if (!isNum) {
                rowsToFetch = 1;
                rowNum = (numRows % 2 === 0) ? startRow + numRows / 2 - 1 :
                                         startRow + (numRows + 1) / 2 - 1;
            } else if (numRows % 2 !== 0) {
                // odd rows or not number
                rowNum = startRow + (numRows + 1) / 2 - 1;
                rowsToFetch = 1;
            } else {
                // even rows
                rowNum = startRow + numRows / 2 - 1;
                rowsToFetch = 2;
            }

            // row position start with 0
            var rowPosition = rowNum - 1;
            XcalarFetchData(tableResultsetId, rowPosition, rowsToFetch, endRow,
                            [], 0, 0)
            .then(function(data) {
                var tableKey = tableKeys[0].name;

                var numRows = data.length;
                if (numRows === rowsToFetch) {
                    if (isNum) {
                        var sum = 0;
                        for (var i = 0; i < rowsToFetch; i++) {
                            try {
                                var row = jQuery.parseJSON(data[i]);
                                sum += Number(row[tableKey]);
                            } catch (e) {
                                console.warn(e);
                                console.warn("Cannot Parse Struct");
                                profileInfo.statsInfo[statsKey] = '--';
                            }
                        }

                        var median = sum / rowsToFetch;
                        if (isNaN(rowsToFetch)) {
                            // handle case
                            console.warn("Invalid median");
                            profileInfo.statsInfo[statsKey] = '--';
                        } else {
                            profileInfo.statsInfo[statsKey] = median;
                        }
                    } else {
                        try {
                            profileInfo.statsInfo[statsKey] =
                                            jQuery.parseJSON(data[0])[tableKey];
                        } catch (e) {
                            console.warn(e);
                            console.warn("Cannot Parse Struct");
                            profileInfo.statsInfo[statsKey] = '--';
                        }
                    }
                } else {
                    // when the data not return correctly, don't recursive try.
                    console.warn("Not fetch correct rows");
                    profileInfo.statsInfo[statsKey] = '--';
                }
            })
            .then(innerDeferred.resolve)
            .fail(function(error) {
                console.error("Run stats failed", error);
                profileInfo.statsInfo[statsKey] = '--';
                innerDeferred.resolve();
            });

            return innerDeferred.promise();
        }
    }

    function runSort(txId, order, bucketNum, profileInfo) {
        if (order === sortMap.origin) {
            // already have this table
            return PromiseHelper.resolve();
        }

        var tableInfo = profileInfo.groupByInfo.buckets[bucketNum];
        var tableKey = getSortKey(order);

        if (tableKey == null) {
            return PromiseHelper.reject("error case");
        } else if (tableInfo[tableKey] != null) {
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();

        var tableName = tableInfo.table;
        var newTableName = getNewName(tableName, "." + order);
        var xcOrder = getXcOrder(order);
        var colName;

        if (order === sortMap.ztoa) {
            colName = tableInfo.colName;
        } else {
            colName = (bucketNum === 0) ? statsColName : bucketColName;
        }
        var keyInfo = {
            name: colName,
            ordering: xcOrder
        };
        XcalarIndexFromTable(tableName, keyInfo, newTableName, txId)
        .then(function() {
            tableInfo[tableKey] = newTableName;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getSortKey(sortOrder) {
        switch (sortOrder) {
            case sortMap.asc:
                return "ascTable";
            case sortMap.desc:
                return "descTable";
            case sortMap.ztoa:
                return "ztoaTable";
            default:
                return null;
        }
    }

    function getXcOrder(sortOrder) {
        if (sortOrder === sortMap.desc || sortOrder === sortMap.ztoa) {
            return XcalarOrderingT.XcalarOrderingDescending;
        } else {
            return XcalarOrderingT.XcalarOrderingAscending;
        }
    }

    function getFitAllBucketSize(txId, tableName, profileInfo) {
        var deferred = PromiseHelper.deferred();
        var numRowsToFetch = Profile.getNumRowsToFetch();
        var maxAgg = runAgg(txId, "max", tableName, profileInfo);
        var minAgg = runAgg(txId, "min", tableName, profileInfo);
        PromiseHelper.when(maxAgg, minAgg)
        .then(function() {
            var max = profileInfo.aggInfo.max;
            var min = profileInfo.aggInfo.min;
            var bucketSize = calcFitAllBucketSize(numRowsToFetch, max, min);
            deferred.resolve(bucketSize);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function calcFitAllBucketSize(numRowsToFetch, max, min) {
        // if max = 100, min = 0, numRowsToFetch = 20,
        // (max - min) / numRowsToFetch will get bucketSize 5
        // but range [100, 105) is the 21th size,
        // so we should do (max + min + numRowsToFetch) / numRowsToFetch
        var bucketSize = (max - min
                              + numRowsToFetch) / numRowsToFetch;
        if (bucketSize >= 1) {
            bucketSize = xcHelper.roundToSignificantFigure(bucketSize, numRowsToFetch, max, min);
        }
        else if (bucketSize >= 0.01) {
            // have mostly two digits after decimal
            bucketSize = Math.round(bucketSize * 100) / 100;
        }
        return bucketSize;
    }

    function isValidBucketSize(bucketSize) {
        if (isNaN(bucketSize)) {
            return false;
        } else {
            return true;
        }
    }

    /*
    import math

    def logBuckets(n):
        if n >= 0 and n < 1:
            return 0
        elif n < 0 and n >= -1:
            return -1
        elif n < 0:
            res = math.ceil(math.log(abs(n), 10)) + 1
            return -1 * int(res)
        else:
            # to fix the inaccuracy of decimal, example, log(1000, 10) = 2.9999999999999996
            res = math.floor(math.log(n, 10) + 0.0000000001) + 1
            return int(res)
    */

    function runBucketing(txId, bucketNum, profileInfo) {
        var deferred = PromiseHelper.deferred();
        var buckets = profileInfo.groupByInfo.buckets;
        var curBucket = buckets[bucketNum];

        if (curBucket != null && curBucket.table != null) {
            ProfileEngine.checkProfileTable(curBucket.table)
            .then(function(exist) {
                if (!exist) {
                    curBucket.table = null;
                    return runBucketing(txId, bucketNum, profileInfo);
                }
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        }

        // bucket based on original groupby table
        var tableName = buckets[0].table;
        var mapTable = getNewName(tableName, ".bucket");
        var indexTable;
        var groupbyTable;
        var finalTable;

        var colName = xcHelper.stripColName(profileInfo.colName);
        colName = xcHelper.parsePrefixColName(colName).name;
        var mapCol = xcHelper.randName("bucketMap", 4);

        // example map(mult(floor(div(review_count, 10)), 10))
        var mapString;
        var step;
        if (bucketNum >= 0) {
            mapString = colName;
            step = bucketNum;
        } else {
            mapString = "int(default:logBuckets(" + colName + "))";
            step = -1 * bucketNum;
        }

        mapString = "mult(floor(div(" + mapString + ", " + step +
                        ")), " + step + ")";

        XIApi.map(txId, mapString, tableName, mapCol, mapTable)
        .then(function() {
            indexTable = getNewName(mapTable, ".index", true);
            var keyInfo = {
                name: mapCol,
                ordering: XcalarOrderingT.XcalarOrderingUnordered
            };
            return XcalarIndexFromTable(mapTable, keyInfo, indexTable, txId);
        })
        .then(function() {
            var operator = AggrOp.Sum;
            var newColName = bucketColName;
            var isIncSample = false;

            groupbyTable = getNewName(mapTable, ".groupby", true);

            return XcalarGroupBy(operator, newColName, statsColName,
                                    indexTable, groupbyTable,
                                    isIncSample, false, mapCol, false, txId);
        })
        .then(function() {
            finalTable = getNewName(mapTable, ".final", true);
            var keyInfo = {
                name: mapCol,
                ordering: XcalarOrderingT.XcalarOrderingAscending
            };
            return XcalarIndexFromTable(groupbyTable, keyInfo, finalTable, txId);
        })
        .then(function() {
            return aggInGroupby(txId, bucketColName, finalTable);
        })
        .then(function(maxVal, sumVal) {
            profileInfo.addBucket(bucketNum, {
                "max": maxVal,
                "sum": sumVal,
                "table": finalTable,
                "colName": mapCol,
                "bucketSize": bucketNum
            });
            // delete intermediate table
            var def1 = XIApi.deleteTable(txId, mapTable);
            var def2 = XIApi.deleteTable(txId, indexTable);

            // Note that grouby table can not delete because when
            // sort bucket table it looks for the unsorted table,
            // which is this one
            PromiseHelper.when(def1, def2)
            .always(function() {
                deferred.resolve();
            });
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        ProfileEngine.__testOnly__ = {};
        ProfileEngine.__testOnly__.getProfileResultSetId = getProfileResultSetId;
        ProfileEngine.__testOnly__.calcFitAllBucketSize = calcFitAllBucketSize;
    }
    /* End Of Unit Test Only */

    return ProfileEngine;
}({}));
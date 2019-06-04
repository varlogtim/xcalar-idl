// XXX TODO: this file is broken, need to change to new infra
window.UndoRedoTest = (function($, UndoRedoTest) {
    var stepInfo = [];
    var replayLogs;
    var opType;
    var schedName;
    var yelpName;
    // kick off the replay and then the undo, then redo, then undo, then redo
    // operationTypes can be tableOps, frontEnd
    UndoRedoTest.run = function(operationType, clearTables, noAlert) {
        var deferred = PromiseHelper.deferred();
        if (operationType == null) {
            operationType = "tableOps";
            // operationType = "frontEnd";
        }
        opType = operationType;
        var logs;
        stepInfo = [];
        var noAlert = true;
        var minModeCache = gMinModeOn;

        gMinModeOn = true;

        // need to check there are no tables because we are going to reset
        // auth ID to 0 in order to make sure replay works
        XcalarGetTables()
        .then(function(ret) {
            if (ret.numNodes !== 0) {
                if (clearTables) {
                    var def = PromiseHelper.deferred();

                    deleteAllTables()
                    .then(function() {
                        deleteWorksheets();
                        return fetchLogs();
                    })
                    .then(def.resolve)
                    .fail(def.reject);
                    return def.promise();
                } else {
                    alert("All tables must be dropped before starting " +
                    "undoredo test. " + ret.numNodes + " tables present.");
                    return PromiseHelper.reject();
                }
            } else {
                return fetchLogs();
            }
        })
        .then(function(testLogs) {
            switch (operationType) {
                case ("tableOps"):
                    logs = testLogs['tableOperationLogs'];
                    break;
                case ("frontEnd"):
                    logs = testLogs['frontEndOperationLogs'];
                    break;
                case ("worksheet"):
                    logs = testLogs['worksheetOperationLogs'];
                    break;
                default:
                    logs = testLogs['tableOperationLogs'];
                    break;
            }
            // run the initlal logs
            return (Replay.run(logs, noAlert));
        })
        .then(function() {
            gMinModeOn = true;
            var innerDeferred = PromiseHelper.deferred();
            setTimeout(function() {
                innerDeferred.resolve();
            }, 500);
            return innerDeferred.promise();
        })
        .then(function() {
            // start undoing everything
            replayLogs = Replay.log;
            console.info("undo started");
            // return (PromiseHelper.reject()); // for debugging
            return (undoAll());
        })
        .then(function() {
            var innerDeferred = PromiseHelper.deferred();
            setTimeout(function() {
                var numUndoneTables = 0;
                for (var id in gTables) {
                    if (gTables[id].status === TableType.Undone) {
                        numUndoneTables++;
                    }
                }
                console.info(numUndoneTables + ' undone tables');
                redoAll()
                .then(function() {
                    innerDeferred.resolve();
                })
                .fail(function() {
                    innerDeferred.reject();
                });
            }, 500);
            return innerDeferred.promise();
        })
        .then(function() {
            var numUndoneTables = 0;
            for (var id in gTables) {
                if (gTables[id].status === TableType.Undone) {
                    numUndoneTables++;
                }
            }
            console.info(numUndoneTables + ' undone tables');
            return (undoAll(true));
        })
        .then(function() {
            var innerDeferred = PromiseHelper.deferred();
            setTimeout(function() {
               redoAll()
               .then(function() {
                    innerDeferred.resolve();

               })
               .fail(function() {
                    innerDeferred.reject();
               });
            }, 500);
            return innerDeferred.promise();
        })
        .then(deleteAllTables)
        .then(deleteDS)
        .then(function() {
            deleteWorksheets();
            console.info('UNDO-REDO TEST PASSED');
            if (!noAlert) {
                alert('UNDO-REDO TEST PASSED');
            }
            deferred.resolve();
        })
        .fail(function() {
            console.error('UNDO-REDO TEST FAILED');
            if (!noAlert) {
                alert('UNDO-REDO TEST FAILED');
            }
            deferred.reject();
        })
        .always(function() {
            gMinModeOn = minModeCache;
        });

        return deferred.promise();
    };

    UndoRedoTest.getStepInfo = function() {
        return stepInfo;
    };

    function fetchLogs() {
        var deferred = PromiseHelper.deferred();
        $.getJSON("/assets/test/json/testLogs.json")
        .done(function(data) {
            // replace "undoTestUser" in log files with actual user's name
            var strData = JSON.stringify(data);
            strData = strData.replace(/undoTestUser/g, userIdName);

            // replace schedule dataset name
            schedName = "schedule" + Math.ceil(Math.random() * 10000);
            var re = new RegExp(userIdName + ".schedule1555", "g");
            strData = strData.replace(re, userIdName + "." + schedName);

            re = new RegExp('"pointArgs":{"name":"schedule1555"', "g");
            strData = strData.replace(re, '"pointArgs":{"name":"' + schedName +
                                        '"');

            // replace testyelp dataset name
            yelpName = "testyelp" + Math.ceil(Math.random() * 10000);
            re = new RegExp(userIdName + ".testyelp", "g");
            strData = strData.replace(re, userIdName + "." + yelpName);

            re = new RegExp('"pointArgs":{"name":"testyelp"', "g");
            strData = strData.replace(re, '"pointArgs":{"name":"' + yelpName +
                                        '"');

            re = new RegExp("testyelp::", "g");
            strData = strData.replace(re, yelpName + "::");

            re = new RegExp("testyelp##", "g");
            strData = strData.replace(re, yelpName);

            data = JSON.parse(strData);
            deferred.resolve(data);
        })
        .fail(function(jqxhr, textStatus, error) {
            console.warn(arguments);
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    function undoAll(secondPass) {
        var deferred = PromiseHelper.deferred();
        var promises = [];
        for (var i = 0; i < operationsMap[opType].length; i++) {
            promises.push(undoAndRecord.bind(this, i, secondPass));
        }

        PromiseHelper.chain(promises)
        .then(function() {
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });
        return (deferred.promise());
    }

    function redoAll() {
        var deferred = PromiseHelper.deferred();
        var promises = [];
        for (var i = operationsMap[opType].length - 1; i >= 0; i--) {
            promises.push(redoAndCheck.bind(this, i));
        }
        PromiseHelper.chain(promises)
        .then(function() {
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });
        return (deferred.promise());
    }

    function undoAndRecord(step, secondPass) {
        var deferred = PromiseHelper.deferred();
        var currentReplayLog = replayLogs[replayLogs.length - step - 1];

        var activeTables = xcHelper.deepCopy(getActiveTables());
        for (var i = 0; i < activeTables.length; i++) {
            delete activeTables[i].timeStamp;
            delete activeTables[i].resultSetId;
            activeTables[i].indexTables = {};
        }
        var nonStringified = activeTables;

        // var wsMeta = xcHelper.deepCopy(WSManager.getAllMeta());
        $.each(wsMeta.wsInfos, function(key, ws){
            ws.orphanedTables.sort();
        });
        delete wsMeta.activeWS; // some undos changes active WS but that's ok

        tableListText = tableListText.split("").sort().join("");
        // not checking for table list order, just for content

        var info = {
            nonStringified: nonStringified,
            tables: activeTables,
            wsMeta: wsMeta,
            firstRowText: $('.xcTable tbody').find('tr:first').text(),
            tableListText: tableListText,
            dagText: $('#dagPanel .dagWrap').text().replace(/\s\s/g, ""),
            lastAction: Log.viewLastAction()
        };

        for (var ws in info.wsMeta.wsInfos) {
            delete info.wsMeta.wsInfos[ws].orphanedTables;
            delete info.wsMeta.wsInfos[ws].undoneTables;
            info.wsMeta.wsInfos[ws].lockedTables = [];
            // we won't always have locked tables during an undo
        }


        if (secondPass) {
            // xx temp fix for backend's table ordering bug producing an
            // invalid order
            for (var table in stepInfo[step].tables) {
                delete stepInfo[step].tables[table].ordering;
                delete stepInfo[step].tables[table].backTableMeta;
            }
            for (var table in info.tables) {
                delete info.tables[table].ordering;
                delete info.tables[table].backTableMeta;
            }

            for (var key in info) {
                if (key !== 'lastAction' && key !== 'nonStringified') {
                    var matching = xcHelper.deepCompare(info[key],
                                                        stepInfo[step][key]);
                    if (!matching) {
                        console.warn('base log:', stepInfo[step][key]);
                        console.warn('current log:', info[key]);
                        console.error('State mismatch in ' + key + ' during ' +
                                        stepInfo[step].lastAction + ' step when ' +
                                        'undoing');

                        debugger;
                        return (deferred.reject().promise());
                    }
                }
            }
            console.log(step + '. Undo ' + stepInfo[step].lastAction +
                        ' step passed');
        } else {

            for (var ws in currentReplayLog.wsMeta.wsInfos) {
                delete currentReplayLog.wsMeta.wsInfos[ws].orphanedTables;
                delete currentReplayLog.wsMeta.wsInfos[ws].undoneTables;
                currentReplayLog.wsMeta.wsInfos[ws].lockedTables = [];
                // we won't always have locked tables during an undo
            }

            // xx temp fix for backend's table ordering bug producing an
            // invalid order
            for (var table in currentReplayLog.tables) {
                delete currentReplayLog.tables[table].ordering;
                delete currentReplayLog.tables[table].backTableMeta;
            }
            for (var table in info.tables) {
                delete info.tables[table].ordering;
                delete info.tables[table].backTableMeta;
            }


            for (var key in currentReplayLog) {

                if (key !== 'nonStringified'  && key !== "dagText") {
                    var matching = xcHelper.deepCompare(info[key],
                                                        currentReplayLog[key]);
                    if (!matching) {
                        console.warn('base log:', currentReplayLog[key]);
                        console.warn('current log:', info[key]);
                        console.error('State mismatch in ' + key + ' during ' +
                                        info.lastAction + ' step when ' +
                                        'comparing undo to replay log');

                        debugger;
                        return (deferred.reject().promise());
                    }
                }
            }

            stepInfo.push(info);
            console.log('undo ' + step + ' passing', stepInfo[step].lastAction);
        }

        Log.undo()
        .then(function() {
            deferred.resolve();
        });

        return (deferred.promise());
    }

    function getActiveTables() {
        var activeTables = [];
        for (var table in gTables) {
            if (gTables[table].status === "active") {
                activeTables.push(gTables[table]);
            }
        }
        return (activeTables);
    }

    function redoAndCheck(step) {
        var deferred = PromiseHelper.deferred();
        Log.redo()
        .then(function() {
            var activeTables = xcHelper.deepCopy(getActiveTables());
            for (var i = 0; i < activeTables.length; i++) {
                delete activeTables[i].timeStamp;
                delete activeTables[i].resultSetId;
                activeTables[i].indexTables = {};
            }
            var numTables = activeTables.length;

            // var wsMeta = xcHelper.deepCopy(WSManager.getAllMeta());
            $.each(wsMeta.wsInfos, function(key, ws){
                ws.orphanedTables.sort();
            });
            delete wsMeta.activeWS; // some undos changes active WS but that's ok

            var tableListText =
                        $('#activeTablesList').find('.tableListBox').text() +
                        $('#activeTablesList').find('.columnList').text();
            tableListText = tableListText.split("").sort().join(""); // sort;
            var info = {
                tables: activeTables,
                wsMeta: wsMeta,
                firstRowText: $('.xcTable tbody').find('tr:first').text(),
                tableListText: tableListText,
                dagText: $('#dagPanel .dagWrap').text().replace(/\s\s/g, "")
            };

            for (var ws in info.wsMeta.wsInfos) {
                delete info.wsMeta.wsInfos[ws].orphanedTables;
                delete info.wsMeta.wsInfos[ws].undoneTables;
                info.wsMeta.wsInfos[ws].lockedTables = [];
                // we won't always have locked tables during an undo
            }

            // xx temp fix for backend's table ordering bug producing an
            // invalid order
            for (var table in stepInfo[step].tables) {
                delete stepInfo[step].tables[table].ordering;
                delete stepInfo[step].tables[table].backTableMeta;
            }
            for (var table in info.tables) {
                delete info.tables[table].ordering;
                delete info.tables[table].backTableMeta;
            }


            for (var key in info) {
                var matching = xcHelper.deepCompare(info[key],
                                                    stepInfo[step][key]);
                if (!matching) {
                    console.warn(stepInfo[step][key]);
                    console.warn(info[key]);
                    console.error('State mismatch in ' + key + ' during ' +
                                    stepInfo[step].lastAction + ' step');
                    debugger;
                    return (deferred.reject().promise());
                }
            }

            console.log(step + '. Redo ' + stepInfo[step].lastAction +
                                                            ' step passed');

            deferred.resolve();

        });
        return (deferred.promise());
    }

    function deleteAllTables() {
        var deferred = PromiseHelper.deferred();
        // XXX TODO: fix it, it's broken now
        DeleteTableModal.Instance.show(true)
        .then(function() {
            var def = PromiseHelper.deferred();
            $('#deleteTableModal').find('.listSection .checkbox')
                                  .addClass('checked');
            $("#deleteTableModal").find(".confirm").click();
            $("#alertModal").find(".confirm").click();
            var count = 0;

            var interval = setInterval(function() {
                if (!$("#deleteTableModal").find(".confirm").attr("disabled")) {
                    clearInterval(interval);
                    def.resolve();
                } else {
                    count++;
                    if (count > 100) {
                        clearInterval(interval);
                        def.reject();
                    }
                }
            }, 200);
            return def.promise();
        })
        .then(function() {
            $("#deleteTableModal").find(".close").click();
            deferred.resolve();
        });

        return deferred.promise();
    }

    function deleteDS() {
        var deferred = PromiseHelper.deferred();

        var dsName;
        if (opType === "worksheet") {
            dsName = schedName;
        } else {
            dsName = yelpName;
        }

        var $grid = DS.getGridByName(dsName);

        DS.remove($grid);
        $("#alertModal").find(".confirm").click();

        var count = 0;
        var interval = setInterval(function() {
            var $grid = DS.getGridByName(dsName);
            if (!$grid) {
                clearInterval(interval);
                deferred.resolve();
            } else {
                count++;
                if (count > 100) {
                    clearInterval(interval);
                    deferred.reject();
                }
            }
        }, 200);

        return deferred.promise();
    }

    function deleteWorksheets() {
        // var sheets = xcHelper.deepCopy(WSManager.getWSList());
        // for (var i = 1; i < sheets.length; i++) {
        //     WSManager.delWS(sheets[i], DelWSType.Del);
        // }
    }

    // tableOps, frontEndOps, and worksheetOps are lists of operations
    // that we go through in order for the undo and redo tests. Their only purpose
    // currently is that their array length provides the number of steps to undo
    // and they serve as a reference for the operations we're undoing/redoing

    var tableOps = ["index ds",
                    "Sort",
                    "Filter",
                    "Map",
                    // "Map", // icv map
                    "split column",
                    "change data type",
                    "GroupBy",
                    "Join",
                    "RenameTable",
                    "Join"]; // keep tables self join

    // the following icv map needs to be tested and integrated into testLogs.json
    // currently, we lack an overall function that does this kind of map
    //
    //{"title":"Map",
    // "options":{"operation":"map",
    // "tableName":"schedule15551#yz3",
    // "tableId":"yz3",
    // "newTableName":"schedule15551_er#yz4",
    // "colNum":6,
    // "fieldName":"teacher_id_add1_er",
    // "mapString":"add(teacher_id, 100)",
    // "mapOptions":{"replaceColumn":true,"createNewTable":true}},
    // "cli":"map --eval \"add(teacher_id, 100)\" --srctable \"schedule15551#yz1\" --fieldName \"teacher_id_add1_er\" --dsttable \"schedule15551_er#yz4\" --icv;",
    // "timestamp":1486512471289},

    var frontEndOps = ["Add New Column",
                        "Rename Column",
                        "Hide Column",
                        "Minimize Columns",
                        "Maximize Columns",
                        "Text Align",
                        "Change Column Order",
                        "Hide Column",
                        "Pull Column",
                        "Change Format",
                        "Round To Fixed",
                        "Resize Column",
                        "Resize Columns",
                        "Sort Table Columns",
                        "Hide Column",
                        "Pull All Columns",
                        "Resize Row",
                        "Minimize Table",
                        "Maximize Table"];


    var operationsMap = {
        tableOps: tableOps,
        frontEnd: frontEndOps
    };

    return (UndoRedoTest);

}(jQuery, {}));


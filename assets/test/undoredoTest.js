window.UndoRedoTest = (function($, UndoRedoTest) {
    var stepInfo = [];
    var replayLogs;
    var opType;
    // kick off the replay and then the undo, then redo, then undo, then redo
    // operationTypes can be tableOps, frontEnd, or worksheet
    UndoRedoTest.run = function(operationType) {
        if (operationType == null) {
            operationType = "tableOps";
            // operationType = "frontEnd";
            // operationType = "worksheet";
        }
        opType = operationType;
        var logs;
        stepInfo = [];
        var noAlert = true;
        var mindModeCache = gMinModeOn;

        gMinModeOn = true;

        fetchLogs()
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

            return (Replay.run(logs, noAlert));
        })
        .then(function() {
            gMinModeOn = true;
            var deferred = jQuery.Deferred();
            setTimeout(function() {
                deferred.resolve();
            }, 500);
            return deferred.promise();
        })
        .then(function() {
            replayLogs = Replay.log;
            console.info("undo started");
            // return (PromiseHelper.reject());
            return (undoAll());
        })
        .then(function() {
            var deferred = jQuery.Deferred();
            setTimeout(function() {
               redoAll()
               .then(function() {
                    deferred.resolve();
               })
               .fail(function() {
                    deferred.reject();
               });
            }, 500);
            return deferred.promise();
        })
        .then(function() {
            return (undoAll(true));
        })
        .then(function() {
            var deferred = jQuery.Deferred();
            setTimeout(function() {
               redoAll()
               .then(function() {
                    deferred.resolve();

               })
               .fail(function() {
                    deferred.reject();
               });
            }, 500);
            return deferred.promise();
        })
        .then(function(){
            console.info('UNDO-REDO TEST PASSED');
            alert('UNDO-REDO TEST PASSED');
        })
        .fail(function() {
            console.error('UNDO-REDO TEST FAILED');
            alert('UNDO-REDO TEST FAILED');
        })
        .always(function() {
            gMinModeOn = mindModeCache;
        });
    };

    UndoRedoTest.getStepInfo = function() {
        return stepInfo;
    };

    function fetchLogs() {
        var deferred = jQuery.Deferred();
        $.getJSON("/assets/test/json/testLogs.json", function(data) {
            deferred.resolve(data);
        });

        return (deferred.promise());
    }

    function undoAll(secondPass) {
        var deferred = jQuery.Deferred();
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
        var deferred = jQuery.Deferred();
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
        var deferred = jQuery.Deferred();
        var currentReplayLog = replayLogs[replayLogs.length - step - 1];


        var activeTables = xcHelper.deepCopy(getActiveTables());
        for (var i = 0; i < activeTables.length; i++) {
            delete activeTables[i].timeStamp;
            delete activeTables[i].resultSetId;
        }
        var nonStringified = activeTables;

        var wsMeta = xcHelper.deepCopy(WSManager.getAllMeta());
        $.each(wsMeta.wsInfos, function(key, ws){
            ws.orphanedTables.sort();
        });

        var tableListText =
                        $('#activeTablesList').find('.tableListBox').text() +
                        $('#activeTablesList').find('.columnList').text() +
                        $('#inactiveTablesList').find('.tableListBox').text() +
                        $('#inactiveTablesList').find('.columnList').text();
        tableListText = tableListText.split("").sort().join("");
        // not checking for table list order, just for content

        var info = {
            nonStringified: nonStringified,
            tables: activeTables,
            wsMeta: wsMeta,
            firstRowText: $('.xcTable tbody').find('tr:first').text(),
            tableListText: tableListText,
            dagText: $('#dagPanel .dagWrap').text().replace(/\s\s/g, ""),
            lastAction: SQL.viewLastAction()
        };

        for (var ws in info.wsMeta.wsInfos) {
            delete info.wsMeta.wsInfos[ws].orphanedTables;
            info.wsMeta.wsInfos[ws].lockedTables = []; 
            // we won't always have locked tables during an undo
        }


        if (secondPass) {
            // xx temp fix for backend's table ordering bug producing an
            // invalid order
            for (var table in stepInfo[step].tables) {
                delete stepInfo[step].tables[table].ordering;
            }
            for (var table in info.tables) {
                delete info.tables[table].ordering;
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
                currentReplayLog.wsMeta.wsInfos[ws].lockedTables = []; 
                // we won't always have locked tables during an undo
            }

            // xx temp fix for backend's table ordering bug producing an
            // invalid order
            for (var table in currentReplayLog.tables) {
                delete currentReplayLog.tables[table].ordering;
            }
            for (var table in info.tables) {
                delete info.tables[table].ordering;
            }


            for (var key in currentReplayLog) {

                if (key !== 'nonStringified' && key !== "tableListText" &&
                    key !== "dagText") {
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
            console.log('undo ' + step + ' passing');
            stepInfo.push(info);
        }

        SQL.undo()
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
        var deferred = jQuery.Deferred();
        SQL.redo()
        .then(function() {
            var activeTables = xcHelper.deepCopy(getActiveTables());
            for (var i = 0; i < activeTables.length; i++) {
                delete activeTables[i].timeStamp;
                delete activeTables[i].resultSetId;
            }
            var numTables = activeTables.length;

            var wsMeta = xcHelper.deepCopy(WSManager.getAllMeta());
            $.each(wsMeta.wsInfos, function(key, ws){
                ws.orphanedTables.sort();
            });

            var tableListText =
                        $('#activeTablesList').find('.tableListBox').text() +
                        $('#activeTablesList').find('.columnList').text() +
                        $('#inactiveTablesList').find('.tableListBox').text() +
                        $('#inactiveTablesList').find('.columnList').text();
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
                info.wsMeta.wsInfos[ws].lockedTables = [];
                // we won't always have locked tables during an undo
            }

            // xx temp fix for backend's table ordering bug producing an
            // invalid order
            for (var table in stepInfo[step].tables) {
                delete stepInfo[step].tables[table].ordering;
            }
            for (var table in info.tables) {
                delete info.tables[table].ordering;
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

    // tableOps, frontEndOps, and worksheetOps are lists of operations
    // that we go through in order for the undo and redo tests. Their only purpose
    // currently is that their array length provides the number of steps to undo
    // and they serve as a reference for the operations we're undoing/redoing

    var tableOps = ["index ds", "Sort", "Filter", "Map", "split column",
                    "change data type", "GroupBy", "Join", "RenameTable"];

    var frontEndOps = ["Add New Column", "Delete Column", "Hide Columns",
                        "Unhide Columns", "Text Align", "Duplicate Column",
                        "Delete Duplicate Columns", "Change Column Order",
                        "Rename Column", "Delete Column", "Pull Column",
                        "Change Format", "Round To Fixed", "Resize Column",
                        "Resize Columns", "Sort Table Columns", "Delete Column",
                        "Pull All Columns", "Resize Row", "Bookmark Row",
                        "Remove Bookmark", "Hide Table", "UnHide Table"];

    // create 3 tables
    var worksheetOps = ["Change Table Order",
                        "Archive Table",
                        "Send Tables to Worksheet",
                        "Map",
                        "Revert Table",
                        "Send Tables to Worksheet",
                        "Filter",
/* add table from dag */ "Move Inactive Table To Worksheet",
                        "Create Worksheet",
                        "Create Worksheet",
                        "Delete Worksheet",
                        "Delete Worksheet",
                        "Create Worksheet",
                        "Rename Worksheet",
                        "Create Worksheet",
                        "Reorder Worksheet",
                        "Delete Worksheet",
                        "Create Table",
                        "Create Table",
                        "Create Table",
                        "Move Table to worksheet",
                        "Hide Worksheet",
                        "Unhide Worksheet"];

    var operationsMap = {
        tableOps: tableOps,
        frontEnd: frontEndOps,
        worksheet: worksheetOps
    };

    return (UndoRedoTest);

}(jQuery, {}));


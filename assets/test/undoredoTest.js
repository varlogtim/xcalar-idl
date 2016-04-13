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
            dagText: $('#dagPanel .dagWrap:not(.inActive)').text().replace(/\s\s/g, ""),
            lastAction: SQL.viewLastAction()
        };

        for (var ws in info.wsMeta.wsInfos) {
            delete info.wsMeta.wsInfos[ws].orphanedTables;
        }

        if (secondPass) {
            for (var key in info) {
                if (key !== 'lastAction' && key !== 'nonStringified') {
                    var matching = xcHelper.deepCompare(info[key],
                                                        stepInfo[step][key]);
                    if (!matching) {
                        console.warn(stepInfo[step][key]);
                        console.warn(info[key]);
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
            }

            for (var key in currentReplayLog) {

                if (key !== 'nonStringified' && key !== "tableListText" &&
                    key !== "dagText") {
                    var matching = xcHelper.deepCompare(info[key],
                                                        currentReplayLog[key]);
                    if (!matching) {
                        console.warn(currentReplayLog[key]);
                        console.warn(info[key]);
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
                dagText: $('#dagPanel .dagWrap:not(.inActive)').text()
                                                        .replace(/\s\s/g, "")
            };

            for (var ws in info.wsMeta.wsInfos) {
                delete info.wsMeta.wsInfos[ws].orphanedTables;
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
                        "Switch Worksheet",
                        "Create Worksheet",
                        "Switch Worksheet",
                        "Reorder Worksheet",
                        "Switch Worksheet",
                        "Delete Worksheet",
                        "Create Table",
                        "Switch Worksheet",
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


    // below are all the logs

    // var worksheetOperationLogs =
    // [{"title":"LoadDataSet",
    // "options":{"operation":"loadDataSet",
    // "loadURL":"file:///var/tmp/qa/indexJoin/schedule",
    // "dsName":"schedule1555",
    // "dsFormat":"JSON",
    // "hasHeader":false,
    // "fieldDelim":"",
    // "lineDelim":"",
    // "moduleName":"",
    // "funcName":""},
    // "cli":"load --url \"file:///var/tmp/qa/indexJoin/schedule\" --format json --size 0B  --name \"Rudy165.schedule1555\";",
    // "timestamp":1460667878742},
    // {"title":"Create Table",
    // "options":{"operation":"indexFromDataset",
    // "dsName":"Rudy165.schedule1555",
    // "dsId":"Rudy165.schedule1555",
    // "tableName":"schedule1555#yz0",
    // "columns":["class_id",
    // "days",
    // "student_ids",
    // "duration",
    // "time",
    // "teacher_id",
    // "DATA"],
    // "worksheet":"h8",
    // "htmlExclude":["worksheet"]},
    // "cli":"index --key \"recordNum\" --dataset \".XcalarDS.Rudy165.schedule1555\" --dsttable \"schedule1555#yz0\";",
    // "timestamp":1460667879974},
    // {"title":"Create Table",
    // "options":{"operation":"indexFromDataset",
    // "dsName":"Rudy165.schedule1555",
    // "dsId":"Rudy165.schedule1555",
    // "tableName":"schedule15551#yz1",
    // "columns":["class_id",
    // "days",
    // "student_ids",
    // "duration",
    // "time",
    // "teacher_id",
    // "DATA"],
    // "worksheet":"h8",
    // "htmlExclude":["worksheet"]},
    // "cli":"index --key \"recordNum\" --dataset \".XcalarDS.Rudy165.schedule1555\" --dsttable \"schedule15551#yz1\";",
    // "timestamp":1460667882013},
    // {"title":"Create Table",
    // "options":{"operation":"indexFromDataset",
    // "dsName":"Rudy165.schedule1555",
    // "dsId":"Rudy165.schedule1555",
    // "tableName":"schedule15552#yz2",
    // "columns":["class_id",
    // "days",
    // "student_ids",
    // "duration",
    // "time",
    // "teacher_id",
    // "DATA"],
    // "worksheet":"h8",
    // "htmlExclude":["worksheet"]},
    // "cli":"index --key \"recordNum\" --dataset \".XcalarDS.Rudy165.schedule1555\" --dsttable \"schedule15552#yz2\";",
    // "timestamp":1460667884075},
    // {"title":"Change Table Order",
    // "options":{"operation":"reorderTable",
    // "tableId":"yz2",
    // "tableName":"schedule15552#yz2",
    // "srcIndex":2,
    // "desIndex":0},
    // "timestamp":1460667894077},
    // {"title":"Archive Table",
    // "options":{"operation":"archiveTable",
    // "tableIds":["yz0"],
    // "tableNames":["schedule1555#yz0"],
    // "tablePos":[1],
    // "htmlExclude":["tablePos"]},
    // "timestamp":1460667911131},
    // {"title":"Send Tables to Worksheet",
    // "options":{"operation":"activeTables",
    // "tableType":"archived",
    // "tableNames":["schedule1555#yz0"]},
    // "timestamp":1460667918627},
    // {"title":"Map",
    // "options":{"operation":"map",
    // "tableName":"schedule15551#yz1",
    // "tableId":"yz1",
    // "newTableName":"schedule15551#yz3",
    // "colNum":6,
    // "fieldName":"teacher_id_add1",
    // "mapString":"add(teacher_id, 100)",
    // "mapOptions":{}},
    // "cli":"map --eval \"add(teacher_id, 100)\" --srctable \"schedule15551#yz1\" --fieldName \"teacher_id_add1\" --dsttable \"schedule15551#yz3\";",
    // "timestamp":1460667935691},
    // {"title":"Revert Table",
    // "options":{"operation":"revertTable",
    // "tableName":"schedule15551#yz1",
    // "oldTableName":"schedule15551#yz3",
    // "tableId":"yz1",
    // "oldTableId": "yz3",
    // "tableType":"orphaned",
    // "worksheet":"h8",
    // "worksheetIndex": 0,
    // "htmlExclude":["tableType",
    // "oldTableName",
    // "worksheet"]},
    // "timestamp":1460667946864},
    // {"title":"Send Tables to Worksheet",
    // "options":{"operation":"activeTables",
    // "tableType":"orphaned",
    // "tableNames":["schedule15551#yz3"]},
    // "timestamp":1460668425725},
    // {"title":"Filter",
    // "options":{"operation":"filter",
    // "tableName":"schedule15551#yz3",
    // "tableId":"yz3",
    // "colName":"teacher_id",
    // "colNum":6,
    // "newTableName":"schedule15551#yz4",
    // "fltOptions":{"operator":"eq",
    // "filterString":"eq(teacher_id,2)"}},
    // "cli":"filter schedule15551#yz3 \"eq(teacher_id,2)\"  \"schedule15551#yz4\";",
    // "timestamp":1460668487093},
    // {"title":"Move Inactive Table To Worksheet",
    // "options":{"operation":"moveInactiveTableToWorksheet",
    // "tableId":"yz3",
    // "tableType":"orphaned",
    // "newWorksheetId":"h8",
    // "newWorksheetIndex": 0,
    // "newWorksheetName":"Sheet 1"},
    // "timestamp":1460668517878},
    // {"title":"Create Worksheet",
    // "options":{"operation":"addWorksheet",
    // "worksheetName":"Sheet 2",
    // "worksheetId":"g8",
    // "currentWorksheet":"h8"},
    // "timestamp":1460668616664},
    // {"title":"Create Worksheet",
    // "options":{"operation":"addWorksheet",
    // "worksheetName":"Sheet 3",
    // "worksheetId":"g2",
    // "currentWorksheet":"g8"},
    // "timestamp":1460668629125},
    // {"title":"Delete Worksheet",
    // "options":{"operation":"deleteWorksheet",
    // "worksheetId":"g8",
    // "worksheetIndex":1,
    // "worksheetName":"Sheet 2",
    // "delType":"empty sheet"},
    // "timestamp":1460668633387},
    // {"title":"Delete Worksheet",
    // "options":{"operation":"deleteWorksheet",
    // "worksheetId":"g2",
    // "worksheetIndex":1,
    // "worksheetName":"Sheet 3",
    // "delType":"empty sheet"},
    // "timestamp":1460668634964},
    // {"title":"Create Worksheet",
    // "options":{"operation":"addWorksheet",
    // "worksheetName":"Sheet 4",
    // "worksheetId":"k6",
    // "currentWorksheet":"h8"},
    // "timestamp":1460668646681},
    // {"title":"Rename Worksheet",
    // "options":{"operation":"renameWorksheet",
    // "worksheetId":"k6",
    // "worksheetIndex":1,
    // "oldName":"Sheet 4",
    // "newName":"renamedSheet"},
    // "timestamp":1460668664947},
    // {"title":"Switch Worksheet",
    // "options":{"operation":"switchWorksheet",
    // "oldWorksheetIndex":1,
    // "oldWoksheetId":"k6",
    // "oldWorksheetName":"renamedSheet",
    // "newWorksheetIndex":0,
    // "newWorksheetName":"Sheet 1",
    // "newWorksheetId":"h8"},
    // "timestamp":1460668686573},
    // {"title":"Create Worksheet",
    // "options":{"operation":"addWorksheet",
    // "worksheetName":"Sheet 5",
    // "worksheetId":"i9",
    // "currentWorksheet":"h8"},
    // "timestamp":1460668698784},
    // {"title":"Switch Worksheet",
    // "options":{"operation":"switchWorksheet",
    // "oldWorksheetIndex":2,
    // "oldWoksheetId":"i9",
    // "oldWorksheetName":"Sheet 5",
    // "newWorksheetIndex":1,
    // "newWorksheetName":"renamedSheet",
    // "newWorksheetId":"k6"},
    // "timestamp":1460668703939},
    // {"title":"Reorder Worksheet",
    // "options":{"operation":"reorderWorksheet",
    // "worksheetName":"renamedSheet",
    // "oldWorksheetIndex":1,
    // "newWorksheetIndex":0},
    // "timestamp":1460668717158},
    // {"title":"Switch Worksheet",
    // "options":{"operation":"switchWorksheet",
    // "oldWorksheetIndex":0,
    // "oldWoksheetId":"k6",
    // "oldWorksheetName":"renamedSheet",
    // "newWorksheetIndex":1,
    // "newWorksheetName":"Sheet 1",
    // "newWorksheetId":"h8"},
    // "timestamp":1460668732827},
    // {"title":"Delete Worksheet",
    // "options":{"operation":"deleteWorksheet",
    // "worksheetId":"h8",
    // "worksheetIndex":1,
    // "worksheetName":"Sheet 1",
    // "tables":["yz2",
    // "yz1",
    // "yz0",
    // "yz4",
    // "yz3"],
    // "archivedTables":[],
    // "delType":"archive tables"},
    // "timestamp":1460668757720},
    // {"title":"Create Table",
    // "options":{"operation":"indexFromDataset",
    // "dsName":"Rudy165.schedule1555",
    // "dsId":"Rudy165.schedule1555",
    // "tableName":"schedule15553#yz5",
    // "columns":["class_id",
    // "days",
    // "student_ids",
    // "duration",
    // "time",
    // "teacher_id",
    // "DATA"],
    // "worksheet":"k6",
    // "htmlExclude":["worksheet"]},
    // "cli":"index --key \"recordNum\" --dataset \".XcalarDS.Rudy165.schedule1555\" --dsttable \"schedule15553#yz5\";",
    // "timestamp":1460668775064},
    // {"title":"Switch Worksheet",
    // "options":{"operation":"switchWorksheet",
    // "oldWorksheetIndex":0,
    // "oldWoksheetId":"k6",
    // "oldWorksheetName":"renamedSheet",
    // "newWorksheetIndex":1,
    // "newWorksheetName":"Sheet 5",
    // "newWorksheetId":"i9"},
    // "timestamp":1460668781787},
    // {"title":"Create Table",
    // "options":{"operation":"indexFromDataset",
    // "dsName":"Rudy165.schedule1555",
    // "dsId":"Rudy165.schedule1555",
    // "tableName":"schedule15554#yz6",
    // "columns":["class_id",
    // "days",
    // "student_ids",
    // "duration",
    // "time",
    // "teacher_id",
    // "DATA"],
    // "worksheet":"i9",
    // "htmlExclude":["worksheet"]},
    // "cli":"index --key \"recordNum\" --dataset \".XcalarDS.Rudy165.schedule1555\" --dsttable \"schedule15554#yz6\";",
    // "timestamp":1460668784288},
    // {"title":"Create Table",
    // "options":{"operation":"indexFromDataset",
    // "dsName":"Rudy165.schedule1555",
    // "dsId":"Rudy165.schedule1555",
    // "tableName":"schedule15555#yz7",
    // "columns":["class_id",
    // "days",
    // "student_ids",
    // "duration",
    // "time",
    // "teacher_id",
    // "DATA"],
    // "worksheet":"i9",
    // "htmlExclude":["worksheet"]},
    // "cli":"index --key \"recordNum\" --dataset \".XcalarDS.Rudy165.schedule1555\" --dsttable \"schedule15555#yz7\";",
    // "timestamp":1460668816974},
    // {"title":"Move Table to worksheet",
    // "options":{"operation":"moveTableToWorkSheet",
    // "tableName":"schedule15554#yz6",
    // "tableId":"yz6",
    // "oldWorksheetId":"i9",
    // "oldWorksheetIndex":1,
    // "oldWorksheetName":"Sheet 5",
    // "oldTablePos":0,
    // "newWorksheetId":"k6",
    // "newWorksheetIndex":0,
    // "worksheetName":"renamedSheet"},
    // "timestamp":1460668845739},
    // {"title":"Hide Worksheet",
    // "options":{"operation":"hideWorksheet",
    // "worksheetId":"k6",
    // "worksheetIndex": 0,
    // "worksheetName":"renamedSheet"},
    // "timestamp":1460668873743},
    // {"title":"Unhide Worksheet",
    // "options":{"operation":"unhideWorksheet",
    // "worksheetIds":["k6"],
    // "worksheetOrders": [0],
    // "worksheetNames":["renamedSheet"]},
    // "timestamp":1460668921239}];

    // var tableOperationLogs =
    // [{"title":"LoadDataSet",
    // "options":{"operation":"loadDataSet",
    // "loadURL":"file:///netstore/datasets/unittest/test_yelp.json",
    // "dsName":"testyelp",
    // "dsFormat":"JSON",
    // "hasHeader":false,
    // "fieldDelim":"",
    // "lineDelim":"",
    // "moduleName":"",
    // "funcName":""},
    // "cli":"load --url \"file:///netstore/datasets/unittest/test_yelp.json\" --format json --size 0B  --name \"Rudy492.testyelp\";",
    // "timestamp":1460517131617},
    // {"title":"Create Table",
    // "options":{"operation":"indexFromDataset",
    // "dsName":"Rudy492.testyelp",
    // "dsId":"Rudy492.testyelp",
    // "tableName":"testyelp#ja0",
    // "columns":["yelping_since",
    // "friends",
    // "compliments",
    // "one",
    // "votes",
    // "two.three",
    // "elite",
    // "review_count",
    // "four",
    // "mixVal",
    // "average_stars",
    // "user_id",
    // "DATA"],
    // "worksheet":"e8",
    // "htmlExclude":["worksheet"]},
    // "cli":"index --key \"recordNum\" --dataset \".XcalarDS.Rudy492.testyelp\" --dsttable \"testyelp#ja0\";",
    // "timestamp":1460517134558},
    // {"title":"Sort",
    // "options":{"operation":"sort",
    // "tableName":"testyelp#ja0",
    // "tableId":"ja0",
    // "key":"review_count",
    // "colNum":8,
    // "order":1,
    // "direction":"ASC",
    // "newTableName":"testyelp#ja1",
    // "sorted":true},
    // "cli":"index --key \"review_count\" --srctable \"testyelp#ja0\" --dsttable \"testyelp#ja1\" --sorted;",
    // "timestamp":1460517140444},
    // {"title":"Filter",
    // "options":{"operation":"filter",
    // "tableName":"testyelp#ja1",
    // "tableId":"ja1",
    // "colName":"four",
    // "colNum":8,
    // "newTableName":"testyelp#ja2",
    // "fltOptions":{"operator":"eq",
    // "filterString":"eq(four,true)"}},
    // "cli":"filter testyelp#ja0 \"eq(four,true)\"  \"testyelp#ja2\";",
    // "timestamp":1460517144179},
    // {"title":"Map",
    // "options":{"operation":"map",
    // "tableName":"testyelp#ja2",
    // "tableId":"ja2",
    // "newTableName":"testyelp#ja3",
    // "colNum":8,
    // "fieldName":"review_count_add2",
    // "mapString":"add(review_count,100)",
    // "mapOptions":{}},
    // "cli":"map --eval \"add(review_count,100)\" --srctable \"testyelp#ja2\" --fieldName \"review_count_add2\" --dsttable \"testyelp#ja3\";",
    // "timestamp":1460517153384},
    // {"title":"SplitCol",
    // "options":{"operation":"splitCol",
    // "tableName":"testyelp#ja3",
    // "tableId":"ja3",
    // "newTableName":"testyelp#ja7",
    // "colNum":4,
    // "delimiter":".",
    // "numColToGet":null,
    // "numNewCols":2,
    // "htmlExclude":["numColToGet"]},
    // "cli":"map --eval \"countChar(one,\\\".\\\")\" --srctable \"testyelp#ja3\" --fieldName \"mappedCol00730\" --dsttable \".tempMap.testyelp#ja4\";aggregate --srctable \".tempMap.testyelp#ja4\" --dsttable \".tempMap.testyelp-aggregate#ja5\",--eval \"maxInteger(mappedCol00730)\";map --eval \"cut(one,1,\\\".\\\")\" --srctable \"testyelp#ja3\" --fieldName \"one-split-1\" --dsttable \"testyelp#ja6\";map --eval \"cut(one,2,\\\".\\\")\" --srctable \"testyelp#ja6\" --fieldName \"one-split-2\" --dsttable \"testyelp#ja7\";",
    // "timestamp":1460517161660},
    // {"title":"ChangeType",
    // "options":{"operation":"changeType",
    // "tableName":"testyelp#ja7",
    // "tableId":"ja7",
    // "newTableName":"testyelp#ja8",
    // "colTypeInfos":[{"colNum":10,
    // "type":"string"}]},
    // "cli":"map --eval \"string(review_count_add2)\" --srctable \"testyelp#ja7\" --fieldName \"review_count_add2_string\" --dsttable \"testyelp#ja8\";",
    // "timestamp":1460517175635},
    // {"title":"GroupBy",
    // "options":{"operation":"groupBy",
    // "operator":"Count",
    // "tableName":"testyelp#ja8",
    // "tableId":"ja8",
    // "indexedCols":"review_count",
    // "aggColName":"review_count",
    // "newColName":"review_count_count8",
    // "isIncSample":false,
    // "newTableName":"testyelp-GB#ja10"},
    // "cli":"index --key \"review_count\" --srctable \"testyelp#ja8\" --dsttable \"testyelp#ja9\";groupBy --srctable \"testyelp#ja9\" --eval \"count(review_count)\" --fieldName review_count_count8 --dsttable \"testyelp-GB#ja10\" --nosample;",
    // "timestamp":1460517189799},
    // {"title":"Join",
    // "options":{"operation":"join",
    // "lTableName":"testyelp-GB#ja10",
    // "lTableId":"ja10",
    // "lTablePos":1,
    // "lColNums":[1],
    // "rTableName":"testyelp#ja8",
    // "rTableId":"ja8",
    // "rTablePos":0,
    // "rColNums":[10],
    // "newTableName":"joined#ja11",
    // "joinStr":"Inner Join",
    // "worksheet":"e8",
    // "htmlExclude":["lTablePos",
    // "rTablePos",
    // "worksheet"]},
    // "cli":"index --key \"review_count\" --srctable \"testyelp#ja8\" --dsttable \"testyelp#ja12\";join --leftTable \"testyelp-GB#ja10\" --rightTable \"testyelp#ja12\" --joinType innerJoin  --joinTable \"joined#ja11\";",
    // "timestamp":1460517198747},
    // {"title":"RenameTable",
    // "options":{"operation":"renameTable",
    // "tableId":"ja11",
    // "oldTableName":"joined#ja11",
    // "newTableName":"newrename#ja11"},
    // "cli":"rename node  joined#ja11  newrename#ja11;",
    // "timestamp":1460517207304}];

    // var frontEndOperationLogs =
    // [{"title":"LoadDataSet",
    // "options":{"operation":"loadDataSet",
    // "loadURL":"file:///netstore/datasets/unittest/test_yelp.json",
    // "dsName":"testyelp",
    // "dsFormat":"JSON",
    // "hasHeader":false,
    // "fieldDelim":"",
    // "lineDelim":"",
    // "moduleName":"",
    // "funcName":""},
    // "cli":"load --url \"file:///netstore/datasets/unittest/test_yelp.json\" --format json --size 0B  --name \"Rudy94.testyelp\";",
    // "timestamp":1460602525951},
    // {"title":"Create Table",
    // "options":{"operation":"indexFromDataset",
    // "dsName":"Rudy94.testyelp",
    // "dsId":"Rudy94.testyelp",
    // "tableName":"testyelp#dU0",
    // "columns":["yelping_since",
    // "friends",
    // "compliments",
    // "one",
    // "votes",
    // "two.three",
    // "elite",
    // "review_count",
    // "four",
    // "mixVal",
    // "average_stars",
    // "user_id",
    // "DATA"],
    // "worksheet":"y4",
    // "htmlExclude":["worksheet"]},
    // "cli":"index --key \"recordNum\" --dataset \".XcalarDS.Rudy94.testyelp\" --dsttable \"testyelp#dU0\";",
    // "timestamp":1460602528771},
    // {"title":"Add New Column",
    // "options":{"operation":"addNewCol",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "siblColName":"yelping_since",
    // "siblColNum":1,
    // "direction":"R"},
    // "timestamp":1460602540565},
    // {"title":"Delete Column",
    // "options":{"operation":"deleteCol",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "colNames":[""],
    // "colNums":[2],
    // "progCols":[{"isNewCol":true,
    // "backName":"",
    // "name":"",
    // "type":"undefined",
    // "func":{"args":[]},
    // "width":125,
    // "sizeToHeader":false,
    // "userStr":"\"\" = ",
    // "textAlign":"Center",
    // "decimals":-1,
    // "format":null,
    // "isSortedArray":false,
    // "isHidden":false}],
    // "htmlExclude":["progCols"]},
    // "timestamp":1460602545446},
    // {"title":"Hide Columns",
    // "options":{"operation":"hideCols",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "colNames":["yelping_since",
    // "friends",
    // "compliments"],
    // "colNums":[1,2,3]},
    // "timestamp":1460602558321},
    // {"title":"Unhide Columns",
    // "options":{"operation":"unHideCols",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "colNames":["yelping_since",
    // "friends",
    // "compliments"],
    // "colNums":[1,2,3]},
    // "timestamp":1460602561282},
    // {"title":"Text Align",
    // "options":{"operation":"textAlign",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "colNames":["yelping_since",
    // "friends",
    // "compliments"],
    // "colNums":[1,2,3],
    // "alignment":"Left",
    // "prevAlignments":["Center",
    // "Center",
    // "Center"],
    // "cachedAlignment":"textAlign leftAlign selected",
    // "htmlExclude":["prevAlignments",
    // "cachedAlignment"]},
    // "timestamp":1460602584078},
    // {"title":"Duplicate Column",
    // "options":{"operation":"duplicateCol",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "colName":"compliments",
    // "newColName":"compliments_1",
    // "colNum":3},
    // "timestamp":1460602611607},
    // {"title":"Delete Duplicate Columns",
    // "options":{"operation":"delDupCol",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "colNum":3,
    // "colName":"compliments",
    // "colNums":[3],
    // "progCols":[{"isNewCol":false,
    // "backName":"compliments",
    // "name":"compliments_1",
    // "type":"object",
    // "func":{"args":["compliments"]},
    // "width":130,
    // "sizeToHeader":false,
    // "userStr":"\"compliments\" = pull(compliments)",
    // "textAlign":"Center",
    // "decimals":-1,
    // "format":null,
    // "isSortedArray":false,
    // "isHidden":false}],
    // "htmlExclude":["progCols"]},
    // "timestamp":1460602621809},
    // {"title":"Change Column Order",
    // "options":{"operation":"reorderCol",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "colName":"compliments",
    // "oldColNum":3,
    // "newColNum":10},
    // "timestamp":1460602627516},
    // {"title":"Rename Column",
    // "options":{"operation":"renameCol",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "colName":"compliments",
    // "colNum":10,
    // "newName":"comprenamed",
    // "wasNew":0,
    // "htmlExclude":["wasNew"]},
    // "timestamp":1460602639601},
    // {"title":"Delete Column",
    // "options":{"operation":"deleteCol",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "colNames":["user_id"],
    // "colNums":[12],
    // "progCols":[{"isNewCol":false,
    // "backName":"user_id",
    // "name":"user_id",
    // "type":"string",
    // "func":{"name":"pull",
    // "args":["user_id"]},
    // "width":93,
    // "sizeToHeader":false,
    // "userStr":"\"user_id\" = pull(user_id)",
    // "textAlign":"Center",
    // "decimals":-1,
    // "format":null,
    // "isSortedArray":false,
    // "isHidden":false}],
    // "htmlExclude":["progCols"]},
    // "timestamp":1460602685305},
    // {"title":"Pull Column",
    // "options":{"operation":"pullCol",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "siblColName":"DATA",
    // "newColName":"user_id",
    // "colNum":12,
    // "direction":"L",
    // "nameInfo":{"name":"user_id",
    // "escapedName":"user_id"},
    // "pullColOptions":{"isDataTd":true,
    // "noAnimate":true},
    // "htmlExclude":["pullColOptions"]},
    // "timestamp":1460602693942},
    // {"title":"Change Format",
    // "options":{"operation":"changeFormat",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "colName":"average_stars",
    // "colNum":11,
    // "format":"percent",
    // "oldFormat":null,
    // "htmlExclude":["oldFormat"]},
    // "timestamp":1460602705967},
    // {"title":"Round To Fixed",
    // "options":{"operation":"roundToFixed",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "colName":"average_stars",
    // "colNum":11,
    // "decimals":5,
    // "prevDecimals":-1,
    // "htmlExclude":["prevDecimals"]},
    // "timestamp":1460602790225},
    // {"title":"Resize Column",
    // "options":{"operation":"dragResizeTableCol",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "colNum":11,
    // "fromWidth":134,
    // "toWidth":288,
    // "htmlExclude":["colNum",
    // "fromWidth",
    // "toWidth"]},
    // "timestamp":1460602815333},
    // {"title":"Resize Columns",
    // "options":{"operation":"resizeTableCols",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "resizeTo":"sizeToContents",
    // "columnNums":[1,2,3,4,5,6,7,8,9,10,11,12,13],
    // "oldColumnWidths":[131,92,72,82,109,75,131,75,90,130,288,93,600],
    // "newColumnWidths":[56,700,30,287,142,287,30,43,89,700,63,155,700],
    // "htmlExclude":["columnNums",
    // "oldColumnWidths",
    // "newColumnWidths"]},
    // "timestamp":1460602824866},
    // {"title":"Sort Table Columns",
    // "options":{"operation":"sortTableCols",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "direction":"forward",
    // "originalOrder":[10,9,5,7,1,8,2,6,4,11,3,0,12],
    // "htmlExclude":["originalOrder"]},
    // "timestamp":1460602831153},
    // {"title":"Delete Column",
    // "options":{"operation":"deleteCol",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "colNames":["friends",
    // "mixVal",
    // "one",
    // "review_count",
    // "two.three",
    // "user_id",
    // "votes"],
    // "colNums":[5,6,7,8,9,10,11],
    // "progCols":[{"isNewCol":false,
    // "backName":"friends",
    // "name":"friends",
    // "type":"array",
    // "func":{"name":"pull",
    // "args":["friends"]},
    // "width":700,
    // "sizeToHeader":true,
    // "userStr":"\"friends\" = pull(friends)",
    // "textAlign":"Left",
    // "decimals":-1,
    // "format":null,
    // "isSortedArray":false,
    // "isHidden":false},
    // {"isNewCol":false,
    // "backName":"mixVal",
    // "name":"mixVal",
    // "type":"mixed",
    // "func":{"name":"pull",
    // "args":["mixVal"]},
    // "width":89,
    // "sizeToHeader":true,
    // "userStr":"\"mixVal\" = pull(mixVal)",
    // "textAlign":"Center",
    // "decimals":-1,
    // "format":null,
    // "isSortedArray":false,
    // "isHidden":false},
    // {"isNewCol":false,
    // "backName":"one",
    // "name":"one",
    // "type":"string",
    // "func":{"name":"pull",
    // "args":["one"]},
    // "width":30,
    // "sizeToHeader":true,
    // "userStr":"\"one\" = pull(one)",
    // "textAlign":"Center",
    // "decimals":-1,
    // "format":null,
    // "isSortedArray":false,
    // "isHidden":false},
    // {"isNewCol":false,
    // "backName":"review_count",
    // "name":"review_count",
    // "type":"integer",
    // "func":{"name":"pull",
    // "args":["review_count"]},
    // "width":30,
    // "sizeToHeader":true,
    // "userStr":"\"review_count\" = pull(review_count)",
    // "textAlign":"Center",
    // "decimals":-1,
    // "format":null,
    // "isSortedArray":false,
    // "isHidden":false},
    // {"isNewCol":false,
    // "backName":"two\\.three",
    // "name":"two.three",
    // "type":"object",
    // "func":{"name":"pull",
    // "args":["two\\.three"]},
    // "width":142,
    // "sizeToHeader":true,
    // "userStr":"\"two.three\" = pull(two\\.three)",
    // "textAlign":"Center",
    // "decimals":-1,
    // "format":null,
    // "isSortedArray":false,
    // "isHidden":false},
    // {"isNewCol":false,
    // "backName":"user_id",
    // "name":"user_id",
    // "type":"string",
    // "func":{"name":"pull",
    // "args":["user_id"]},
    // "width":155,
    // "sizeToHeader":true,
    // "userStr":"\"user_id\" = pull(user_id)",
    // "textAlign":"Center",
    // "decimals":-1,
    // "format":null,
    // "isSortedArray":false,
    // "isHidden":false},
    // {"isNewCol":false,
    // "backName":"votes",
    // "name":"votes",
    // "type":"object",
    // "func":{"name":"pull",
    // "args":["votes"]},
    // "width":287,
    // "sizeToHeader":true,
    // "userStr":"\"votes\" = pull(votes)",
    // "textAlign":"Center",
    // "decimals":-1,
    // "format":null,
    // "isSortedArray":false,
    // "isHidden":false}],
    // "htmlExclude":["progCols"]},
    // "timestamp":1460602857730},
    // {"title":"Pull All Columns",
    // "options":{"operation":"pullAllCols",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "colNum":6,
    // "colNums":[6,7,8,9,10,11],
    // "rowNum":0,
    // "isArray":false,
    // "options":{"isDataTd":true}},
    // "timestamp":1460602862425},
    // {"title":"Resize Row",
    // "options":{"operation":"dragResizeRow",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0",
    // "rowNum":1,
    // "fromHeight":25,
    // "toHeight":131,
    // "htmlExclude":["rowNum",
    // "fromHeight",
    // "toHeight"]},
    // "timestamp":1460602871116},
    // {"title":"Bookmark Row",
    // "options":{"operation":"bookmarkRow",
    // "tableId":"dU0",
    // "tableName":"testyelp#dU0",
    // "rowNum":4},
    // "timestamp":1460602874354},
    // {"title":"Remove Bookmark",
    // "options":{"operation":"removeBookmark",
    // "tableId":"dU0",
    // "tableName":"testyelp#dU0",
    // "rowNum":4},
    // "timestamp":1460602895194},
    // {"title":"Hide Table",
    // "options":{"operation":"hideTable",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0"},
    // "timestamp":1460602914720},
    // {"title":"UnHide Table",
    // "options":{"operation":"unhideTable",
    // "tableName":"testyelp#dU0",
    // "tableId":"dU0"},
    // "timestamp":1460602917060}];


    return (UndoRedoTest);

}(jQuery, {}));


window.TestSuite = (function($, TestSuite) {
    if (!jQuery || typeof PromiseHelper.deferred !== "function") {
        throw "Requires jQuery 1.5+ to use asynchronous requests.";
    }

    var defaultCheckTimeout = 120000; // 2min
    var disableIsPass = true;

    // constructor
    function TestRunner() {
        this.slowInternetFactor = gLongTestSuite || 1;
                            // Change this to 2, 3, etc if you have a slow
                            // internet
        this.testCases = [];
        this.testDS = [];

        this.passes = 0;
        this.fails = 0;
        this.skips = 0;
        this.failReason = null;

        this.startTime = 0;
        this.totTime = 0;
        this.mode = "";

        // For assert to use
        this.curTestNumber;
        this.curTestName;
        this.curDeferred;

        return this;
    }

    TestRunner.prototype = {
        add: function(testFn, testName, timeout, testCaseEnabled) {
            this.testCases.push({
                "testFn": testFn,
                "testName": testName,
                "timeout": timeout,
                "testCaseEnabled": testCaseEnabled
            });
        },

        pass: function(deferred, testName, currentTestNumber) {
            if (deferred.state() === "pending") {
                this.passes++;
                var d = new Date();
                var milli = d.getTime() - this.startTime;

                console.log("ok ", currentTestNumber + " - Test \"" + testName +
                            "\" passed");
                console.log("Time taken: " + milli / 1000 + "s");
                this.totTime += milli;
                deferred.resolve();
            } else {
                console.error("Invalid state", deferred.state());
            }
        },

        fail: function(deferred, testName, currentTestNumber, reason) {
            if (deferred.state() === "pending") {
                this.fails++;
                console.warn("Test " + testName + " failed -- " + reason);
                console.warn("not ok " + currentTestNumber + " - Test \"" +
                             testName + "\" failed (" + reason + ")");
                this.failReason = reason;
                deferred.reject();
            } else {
                console.error("Invalid state", deferred.state());
            }
        },

        skip: function(deferred, testName, currentTestNumber) {
            console.log("====== Skipping " + testName + " ======");
            console.log("ok " + currentTestNumber + " - Test \"" + testName +
                        "\" disabled # SKIP");
            this.skips++;

            if (disableIsPass) {
                deferred.resolve();
            } else {
                deferred.reject();
            }
        },

        run: function(hasAnimation, toClean, noPopup, withUndo, timeDilation) {
            XcUser.CurrentUser.disableIdleCheck();
            var self = this;
            self.noPopup = noPopup;
            console.info("If you are on VPN / slow internet,",
                        "please set gLongTestSuite = 2");
            if (timeDilation) {
                self.slowInternetFactor = parseInt(timeDilation);
            }

            var finalDeferred = PromiseHelper.deferred();
            var errorCatchDeferred = PromiseHelper.deferred();
            var minModeCache = gMinModeOn;
            var oldWindowErrFunc = window.onerror;

            var finish = function() {
                window.onerror = oldWindowErrFunc;
                gMinModeOn = minModeCache;
                var res = self._finish();
                if (res.fail === 0 && res.pass > 0) {
                    $("body").append('<div id="testFinish" style="display:none">PASSED</div>');
                } else {
                    $("body").append('<div id="testFinish" style="display:none">' +
                        "Passes: " + res.pass + ", Fails: " + res.fail +
                        ", Skips: " + res.skip + '</div>');
                }

                finalDeferred.resolve(res);
            };

            var undoRedoTest = function() {
                if (withUndo) {
                    var innerDeferred = PromiseHelper.deferred();
                    UndoRedoTest.run("frontEnd", true, true)
                    .then(function() {
                        return UndoRedoTest.run("tableOps", true, true);
                    })
                    .then(function() {
                        return UndoRedoTest.run("worksheet", true, true);
                    })
                    .then(innerDeferred.resolve)
                    .fail(innerDeferred.reject);
                    return innerDeferred.promise();
                } else {
                    return PromiseHelper.resolve();
                }
            };

            var endRun = function() {
                undoRedoTest()
                .always(function() {
                    if (toClean) {
                        cleanup(self)
                        .always(finish);
                    } else {
                        finish();
                    }
                });
            };

            // XXX use min mode for testing to get around of
            // animation crash test problem
            // may have better way
            gMinModeOn = hasAnimation ? false : true;

            preCleanup();

            window.onerror = function(message, url, line, column, error) {
                self.fail(errorCatchDeferred, null, null, error.stack);
            };

            console.log(self.slowInternetFactor);
            var deferred = PromiseHelper.resolve();
            // Start PromiseHelper.chaining the callbacks
            try {
                var testCases = self.testCases;
                for (var ii = 0; ii < testCases.length; ii++) {
                    deferred = deferred.then(
                        // Need to trap the value of testCase and ii
                        (function trapFn(testCase, currentTestNumber) {
                            return (function() {
                                var localDeferred = PromiseHelper.deferred();
                                if (testCase.testCaseEnabled) {
                                    console.log("====================Test ",
                                    currentTestNumber, " Begin====================");
                                    console.log("Testing: ", testCase.testName);
                                    setTimeout(function() {
                                        if (localDeferred.state() === "pending") {
                                            var reason = "Timed out after " +
                                                 (testCase.timeout / 1000) + " seconds";
                                            self.fail(localDeferred,
                                                    testCase.testName,
                                                    currentTestNumber, reason);
                                        }
                                    }, testCase.timeout);

                                    self.startTime = new Date().getTime();
                                    self.curDeferred = localDeferred;
                                    self.curTestName = testCase.testName;
                                    self.curTestNumber = currentTestNumber;

                                    testCase.testFn(localDeferred, testCase.testName,
                                                    currentTestNumber);
                                } else {
                                    self.skip(localDeferred, testCase.testName,
                                                currentTestNumber);
                                }

                                return localDeferred.promise();
                            });
                        })(testCases[ii], ii + 1) // Invoking trapFn
                    );
                }
            } catch (err) {
                if (err === "testSuite bug") {
                    endRun();
                }
            }

            deferred.fail(function() {
                returnValue = 1;
            });

            deferred.always(endRun);

            errorCatchDeferred.fail(endRun);

            return finalDeferred.promise();
        },

        _finish: function() {
            var passes = this.passes;
            var fails = this.fails;
            var skips = this.skips;

            console.log("# pass", passes);
            console.log("# fail", fails);
            console.log("# skips", skips);
            console.log("==========================================");
            console.log("1.." + this.testCases.length + "\n");
            var timeMsg = "";
            var oldTime = "";
            var totTime = this.totTime;

            if (fails === 0 && passes > 5) {
                var bestTime = xcLocalStorage.getItem("time");
                bestTime = parseFloat(bestTime);
                if (isNaN(bestTime)) {
                    bestTime = 1000;
                }

                if ((totTime / 1000) < bestTime) {
                    xcLocalStorage.setItem("time", totTime / 1000);
                    timeMsg = " New best time!";
                    if (bestTime === 1000) {
                        oldTime = " Old time: N/A";
                    } else {
                        oldTime = " Old time: " + bestTime + "s.";
                    }
                } else {
                    if (bestTime !== 1000) {
                        oldTime = " Current best time: " + bestTime +
                                  "s";
                    }
                }
            }
            var alertMsg = "Passes: " + passes + ", Fails: " + fails +
                            ", Time: " +
                            totTime / 1000 + "s." + timeMsg + oldTime;
            console.log(alertMsg); // if pop ups are disabled
            if (!this.noPopup) {
                alert(alertMsg);
            }

            return {
                "pass": passes,
                "fail": fails,
                "skip": skips,
                "time": totTime / 1000,
                "error": this.failReason
            };
        },

        setMode: function(mode) {
            if (mode) {
                if (mode === "ten") {
                    mode = "ten/";
                    console.log("Running 10X dataset");
                } else if (mode === "hundred") {
                    mode = "hundred/";
                    console.log("Running 100X dataset");
                } else {
                    mode = "";
                    console.log('Running regular dataset');
                }
            } else {
                console.log('Running regular dataset');
            }
        },

        assert: function(statement, reason) {
            if (this.mode) {
                return;
            }

            reason = reason || this.assert.caller.name;
            if (!statement) {
                console.log("Assert failed!", reason);
                this.fail(this.curDeferred, this.curTestName,
                            this.curTestNumber, reason);
            }
        },

        loadDS: function(dsName, url, check) {
            var self = this;
            var deferred = PromiseHelper.deferred();
            $("#importDataButton").click(); // button to initiate import dataset
            $("#dsForm-target input").val(gDefaultSharedRoot);
            $("#filePath").val(url);
            $("#dsForm-path").find(".confirm").click(); // go to the next step

            self.checkExists(check)
            .then(function() {
                $("#importDataForm").find(".dsName").eq(0).val(dsName);
                const finalVal = -4;

                // auto detect should fill in the form
                var empties = $("#previewTable .editableHead[value='']");
                var rand = Math.floor(Math.random() * 10000);
                console.log("here");
                for (var i = 0; i < empties.length; i++) {
                    empties.eq(i).val("Unused_" + rand + "_" + (i+1));
                }

                $("#importDataForm .buttonSection .confirm:not(.createTable)").click();
                if ($("#alertModal").is(":visible") &&
                    $("#alertHeader").text().trim() === DSTStr.DetectInvalidCol) {
                    $("#alertModal").find(".confirm").click();
                }
                var dsIcon = getDSIcon(dsName);
                return self.checkExists(dsIcon);
            })
            .then(function() {
                var dsIcon = getFinishDSIcon(dsName);
                return self.checkExists(dsIcon);
            })
            .then(function() {
                self.testDS.push(dsName);
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        // sorted: boolean to sort columns A-Z
        createTable: function(dsName, sorted) {
            var self = this;
            var $grid = $(getDSIcon(dsName));
            var dsId = $grid.data("dsid");
            var deferred = PromiseHelper.deferred();
            var tableName;
            var header;
            self.checkExists(getFinishDSIcon(dsName))
            .then(function() {
                if (!$grid.hasClass("active")) {
                    $grid.find(".gridIcon").click();
                }
                return self.checkExists('#dsTable[data-dsid="' + dsId + '"]');
            })
            .then(function() {
                var dsName = $("#dsInfo-title").text();
                $("#selectDSCols").click();
                if (dsName.indexOf("flight") > -1) {
                    return self.checkExists(".selectedTable li:eq(33)");
                } else if (dsName.indexOf("airport") > -1) {
                    return self.checkExists(".selectedTable li:eq(6)");
                } else if (dsName.indexOf("schedule") > -1) {
                    return self.checkExists(".selectedTable li:eq(5)");
                } else if (dsName.indexOf("a0") > -1) {
                    return self.checkExists(".selectedTable li:eq(5)");
                } else if (dsName.indexOf("a1") > -1) {
                    return self.checkExists(".selectedTable li:eq(5)");
                } else {
                    // TODO for each new table, should add a test case here
                    return PromiseHelper.resolve();
                }
            })
            .then(function() {
                var validCart = '.selectedTable[data-dsid="' + dsId + '"]:not(.updateName)';
                return self.checkExists(validCart);
            })
            .then(function() {
                tableName = $("#dataCart .tableNameEdit").val();
                header = ".tableTitle .tableName[value='" + tableName + "']";
                $("#dataCart-submit").click();
                return self.checkExists(header);
            })
            .then(function() {
                var tableId = $(".tableTitle .tableName[value='" + tableName + "']")
                                .closest(".xcTableWrap").data("id");

                return self.checkExists("#dagWrap-" + tableId);
            })
            .then(function() {
                if (sorted) {
                    var $table = $(".tableTitle .tableName[value='" + tableName +
                                    "']").closest('.xcTableWrap');
                    var tableId =$table.data('id');
                    TblManager.sortColumns(tableId, ColumnSortType.name, "forward");
                }
                var $header = $(header);
                var $prefix = $header.closest(".xcTableWrap")
                                    .find(".xcTable .topHeader .prefix");
                var prefix = "";
                $prefix.each(function() {
                    var text = $(this).text();
                    if (text !== "") {
                        prefix = text;
                        return false; // stop loop
                    }
                });

                deferred.resolve(tableName + "#" + tableId, prefix);
            })
            .fail(function() {
                console.error("could not create table");
                deferred.reject.apply(this, arguments);
            });

            return deferred.promise();
        },

        createNode: function(type) {
            var node = DagView.newNode({
                type: type,
                display: {
                    x: 0,
                    y: 0
                }
            });
            var $node = $('#dagView .operatorSvg [data-nodeid="' + node.getId() + '"]');
            this.assert($node.length === 1);
            return $node;
        },

        nodeMenuAction($node, action) {
            $node.find(".main").trigger("contextmenu");
            $("#dagNodeMenu").find("." + action).trigger(fakeEvent.mouseup);
        },

        hasNodeWithState(nodeId, state) {
            var stateClass = ".state-" + state;
            var idSelector = '[data-nodeid="' + nodeId + '"]';
            return this.checkExists('#dagView .operatorSvg ' + stateClass + idSelector);
        },

        createDatasetNode: function(dsName, prefix) {
            var self = this;
            var deferred = PromiseHelper.deferred();
            var nodeId = self.createNodeAndOpenPanel(null, DagNodeType.Dataset);
            var $panel = $("#datasetOpPanel");
            self.assert($panel.hasClass("xc-hidden") === false);

            $panel.find(".refresh").click();
            var selector = '#datasetOpPanel .datasetName :contains(' + dsName + ')';

            self.checkExists(selector)
            .then(function() {
                var $grid = $(selector).closest(".datasetName");
                $grid.click();
                $panel.find(".datasetPrefix input").val(prefix);
                $panel.find(".bottomSection button").click();
                return self.hasNodeWithState(nodeId, DagNodeState.Configured);
            })
            .then(function() {
                deferred.resolve(nodeId);
            })
            .fail(function() {
                console.error("could not create dataset node");
                deferred.reject.apply(this, arguments);
            });

            return deferred.promise();
        },

        // elemSelectors
        /**
         * checkExists
         * @param  {string or array}    elemSelectors can be a string or array
         *                              of element selectors example: ".xcTable"
         *                              or ["#xcTable-ex1", "#xcTable-ex2"]
         *                              can use :contains for
         *
         * @param  {integer} timeLimit  length of time to search for before
         *                              giving up
         *
         * @param  {object} options     notExist - boolean, if true, we want to
         *                              check that this element doesn't exist
         *
         *                              optional - boolean, if true, existence
         *                              of element is optional and we return
         *                              deferred.resolve regardless
         *                              (example: a confirm box that appears
         *                              in some cases)
         *
         *                              noDilute - boolean, if true, does not
         *                              dilute the time according to the
         *                              gLongTestSuite factor
         *
         *                              asserts - array, for each value in the
         *                              array, it asserts that the element
         *                              exists
         */
        checkExists: function(elemSelectors, timeLimit, options) {
            var self = this;
            var deferred = PromiseHelper.deferred();
            var noDilute = options && options.noDilute;
            if (noDilute) {
                timeLimit = timeLimit || defaultCheckTimeout;
            } else {
                timeLimit = (timeLimit || defaultCheckTimeout) * self.slowInternetFactor;
            }
            options = options || {};

            var intervalTime = 100;
            var timeElapsed = 0;
            var notExist = options.notExist; // if true, we're actualy doing a
            // check to make sure the element DOESN'T exist
            var optional = options.optional; // if true, existence of element is
            // optional and we return deferred.resolve regardless
            // (example: a confirm box that appears in some cases)
            if (typeof elemSelectors === "string") {
                elemSelectors = [elemSelectors];
            }

            var caller = self.checkExists.caller.name;
            var interval = setInterval(function() {
                var numItems = elemSelectors.length;
                var allElemsPresent = true;
                var $elem;
                for (var i = 0; i < numItems; i++) {
                    $elem = $(elemSelectors[i]);
                    if (notExist) {
                        if ($elem.length !== 0) {
                            allElemsPresent = false;
                            break;
                        }
                    } else if ($elem.length === 0) {
                        allElemsPresent = false;
                        break;
                    } else if ($('#modalWaitingBG').length) {
                        allElemsPresent = false;
                    }
                }
                if (allElemsPresent) {
                    if (options.asserts) {
                        i = 0;
                        for (; i< options.asserts.length; i++) {
                            self.assert($(options.asserts[i]).length > 0);
                        }
                    }
                    clearInterval(interval);
                    deferred.resolve(true);
                } else if (timeElapsed >= timeLimit) {
                    var found;
                    if (notExist) {
                        found = "found";
                    } else {
                        found = "not found";
                    }
                    var error = "time limit of " + timeLimit +
                                "ms exceeded in function: " + caller +
                                "; element " + elemSelectors[0] + " " + found;
                    clearInterval(interval);
                    if (!optional) {
                        console.log(elemSelectors, options);
                        console.warn(error);
                        deferred.reject(error);
                    } else {
                        deferred.resolve();
                    }
                }
                timeElapsed += intervalTime;
            }, intervalTime);

            return (deferred.promise());
        },

        // ==================== COMMON ACTION TRIGGERS ===================== //
        trigOpModal: function (tableId, columnName, funcClassName, whichModal) {
            var self = this;
            var $header = $("#xcTbodyWrap-" + tableId)
                          .find(".flexWrap.flex-mid input[value='" +
                                columnName + "']").eq(0);
            self.assert($header.length === 1);
            $header.closest(".flexContainer")
                   .find(".flex-right .innerBox").click();

            var $colMenu = $("#colMenu ." + funcClassName).eq(0);
            $colMenu.trigger(fakeEvent.mouseup);

            if (whichModal === "join") {
                return self.checkExists("#joinView:not(.xc-hidden)");
            } else {
                return self.checkExists(["#operationsView:not(.xc-hidden)",
                            '#operationsView .opSection:not(.tempDisabled)']);
            }
        },

        createNodeAndOpenPanel(parentNodeIds, nodeType) {
            var self = this;
            var $node = self.createNode(nodeType);
            var nodeId = $node.data("nodeid");

            if (parentNodeIds != null) {
                parentNodeIds = (parentNodeIds instanceof Array) ?
                parentNodeIds : [parentNodeIds];

                parentNodeIds.forEach((parentNodeId, index) => {
                    DagView.connectNodes(parentNodeId, nodeId, index);
                });
            }
            DagView.autoAlign();
            self.nodeMenuAction($node, "configureNode");
            return nodeId;
        }
    };


    TestSuite.createTest = function() {
        return new TestRunner();
    };

    TestSuite.printResult = function(result) {
        if (result) {
            console.log(JSON.stringify(result));
        }
    };

    TestSuite.run = function(hasAnimation, toClean, noPopup, mode, withUndo,
                             timeDilation) {
        return FlightTest.run(hasAnimation, toClean, noPopup, mode, withUndo,
                            timeDilation);
    };

    // this is for unit test
    TestSuite.unitTest = function() {
        // free this session and then run unit test
        var promise = TblManager.freeAllResultSetsSync();
        PromiseHelper.alwaysResolve(promise)
        .then(function() {
            return XcUser.CurrentUser.releaseSession();
        })
        .then(function() {
            xcManager.removeUnloadPrompt();
            var curURL = new URL(window.location.href);
            var url = new URL(paths.testAbsolute, window.location.href);
            for (var p of curURL.searchParams) {
                url.searchParams.set(p[0], p[1]);
            }
            window.location.href = url.href;
        })
        .fail(function(error) {
            console.error(error);
        });
    };

    function preCleanup() {
        $("#joinView").find(".keepTableCheckbox .checkbox")
                      .removeClass("checked"); // deselect keep original tables
                      // otherwise table ids get mixed up during test
        deleteWorksheets();
    }

    function cleanup(test) {
        var deferred = PromiseHelper.deferred();

        deleteTables()
        .then(function() {
            deleteWorksheets();
            return deleteDS(test);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function deleteWorksheets() {
        var sheets = xcHelper.deepCopy(WSManager.getWSList());
        for (var i = 1; i < sheets.length; i++) {
            WSManager.delWS(sheets[i], DelWSType.Del);
        }
    }

    function deleteTables() {
        console.log("Delete Tables");
        var deferred = PromiseHelper.deferred();

        var $workspaceMenu = $("#workspaceMenu");
        if (!$workspaceMenu.hasClass("active")) {
            $("#workspaceTab .mainTab").click();
        }

        if ($workspaceMenu.find(".tables").hasClass("xc-hidden")) {
            $("#tableListTab").click();
        }

        var $tabs = $("#tableListSectionTabs .tableListSectionTab");
        var tabeTypes = [TableType.Active, TableType.Orphan];
        var promises = [];

        TableList.refreshOrphanList()
        .then(function() {
            tabeTypes.forEach(function(tableType, index) {
                $tabs.eq(index).click();
                var $section = $("#tableListSections .tableListSection:visible");
                $section.find(".selectAll").click();
                promises.push(TableList.tableBulkAction("delete",
                                                        tableType));
            });

            return PromiseHelper.when.apply(this, promises);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function deleteDS(test) {
        var deferred = PromiseHelper.deferred();
        var minModeCache = gMinModeOn;
        gMinModeOn = true;
        $("#dataStoresTab .mainTab").click();

        test.testDS.forEach(function(ds) {
            var $grid = DS.getGridByName(ds);
            // XXX TODO: use another way
            XcalarDatasetUnload(ds)
            .then(function() {
                DS.remove($grid);
                $("#alertModal .confirm").click();
                setTimeout(function() {
                    // wait for some time
                    gMinModeOn = minModeCache;
                    deferred.resolve();
                }, 2000);
            })
            .fail(deferred.reject);
        });

        return deferred.promise();
    }

    // ====================== TEST DEFINITIONS GO HERE ====================== //
    function getDSIcon(dsName) {
        return '#dsListSection .grid-unit[data-dsname="' +
                            dsName + '"]:not(.inactive)';
    }

    function getFinishDSIcon(dsName) {
        return '#dsListSection .grid-unit[data-dsname="' +
                            dsName + '"]:not(.inactive.fetching)';
    }

    function getInActivateDSIcon(dsName) {
        return '#dsListSection .grid-unit[data-dsname="' +
                            dsName + '"]:(.inActivate)';
    }

    return (TestSuite);
}(jQuery, {}));

window.DemoTestSuite = (function($, DemoTestSuite) {
    DemoTestSuite.run = function(isOneTime) {
        addOrphanTable()
        .then(function() {
            pullCols();

            if (isOneTime) {
                filterTable();
            } else {
                filterTrigger();
            }
        });

        return PromiseHelper.resolve();
    };

    function addOrphanTable() {
        var deferred = PromiseHelper.deferred();
        // open tab
        $("#workspaceTab .mainTab").click();
        $("#tableListSectionTabs .tableListSectionTab").eq(2).click();

        TableList.refreshOrphanList()
        .then(function() {
            $("#orphanedTableListSection .selectAll").click();
            return TableList.activeTables(TableType.Orphan);
        })
        .then(function() {
            // close tab
            $("#workspaceTab .mainTab").click();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function pullCols() {
        var $table = $(".xcTableWrap").eq(0);
        var tableId = $table.data("id");
        // if no col, will return 1 (include DATA col), so colNum = 1
        var colNum = gTables[tableId].getNumCols();
        ColManager.unnest(tableId, colNum, 0);
    }

    function filterTrigger() {
        // random num between [1,2,3,4,5]s
        var time = Math.floor(Math.random() * 5 + 1) * 1000;
        setTimeout(function() {
            filterTable()
            .then(filterTrigger);
        }, time);
    }

    function filterTable() {
        var deferred = PromiseHelper.deferred();
        var $table = $(".xcTableWrap").eq(0);
        var tableId = $table.data("id");
        var table = gTables[tableId];
        var tableName = table.getName();
        var colNum = 1;
        var progCol = table.getCol(colNum);
        var colName = progCol.getBackColName();
        var val = $table.find(".row0 .col1 .originalData").text();
        if (progCol.isNumberCol()) {
            val = Number(val);
        } else {
            val = "\"" + val + "\"";
        }

        var uniqueVals = {};
        uniqueVals[val] = true;
        var fltOptions = xcHelper.getFilterOptions(FltOp.Exclude, colName, uniqueVals);

        xcFunction.filter(colNum, tableId, fltOptions)
        .then(function() {
            return TblManager.deleteTables([tableName], TableType.Orphan, true);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    return (DemoTestSuite);
}(jQuery, {}));

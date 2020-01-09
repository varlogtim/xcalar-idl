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

        run: function(hasAnimation, toClean, noPopup, timeDilation) {
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

            var endRun = function() {
                if (toClean) {
                    cleanup(self)
                    .always(finish);
                } else {
                    finish();
                }
            };

            // XXX use min mode for testing to get around of
            // animation crash test problem
            // may have better way
            gMinModeOn = hasAnimation ? false : true;

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
                return true;
            }

            reason = reason || this.assert.caller.name;
            if (!statement) {
                console.log("Assert failed!", reason);
                this.fail(this.curDeferred, this.curTestName,
                            this.curTestNumber, reason);
                return false;
            }
            return true;
        },

        loadDS: function(dsName, url, check, addRowNum) {
            var self = this;
            var deferred = PromiseHelper.deferred();
            $("#importDataButton").click(); // button to initiate import dataset
            if ($("#dsForm-source").is(":visible")) {
                // cloud version have this extra step
                $("#dsForm-source .more").click();
            }
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
                for (var i = 0; i < empties.length; i++) {
                    empties.eq(i).val("Unused_" + rand + "_" + (i+1));
                }
                if (addRowNum) {
                    $("#importDataForm .extraCols .rowNumber .xi-ckbox-selected").click();
                    $("#importDataForm .extraCols .rowNumber :input").val("ROWNUM");
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
            var nodeId;
            var tableId;
            var tabId;

            self.checkExists(getFinishDSIcon(dsName))
            .then(function() {
                if (!$grid.hasClass("active")) {
                    $grid.find(".gridIcon").click();
                }
                return self.checkExists('#dsTableContainer .datasetTable[data-dsid="' + dsId + '"]');
            })
            .then(function() {
                var dsName = $("#dsInfo-title").text();
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
                $("#createDF").click();
                // should automatically switch from dataset panel to dataflow panel
                // and have a dataset node visible
                let visibleDatasetNode = ".dataflowArea.active.rendered .operator.dataset.configLocked.state-Unused:visible";
                return self.checkExists(visibleDatasetNode);
            })
            .then(() => {
                return this.checkExists("#datasetOpPanel:visible");
            })
            .then(() => {
                $("#datasetOpPanel .next").click();
                return this.checkExists("#datasetOpPanel .submit:visible");
            })
            .then(() => {
                $("#datasetOpPanel .submit").click();
                return this.checkExists("#datasetOpPanel:not(:visible)");
            })
            .then(() => {
                if (UserSettings.getPref("dfAutoExecute")) {
                    return PromiseHelper.resolve();
                } else {
                    return this.checkExists(".dataflowArea.active .operator.dataset.state-Configured:visible");
                }
            })
            .then(() => {
                nodeId = $(".dataflowArea.active .operator.dataset").data("nodeid");
                if (UserSettings.getPref("dfAutoExecute")) {
                    return PromiseHelper.resolve();
                } else {
                    return DagViewManager.Instance.run([nodeId]);
                }
            })
            .then(() => {
                return this.checkExists(".dataflowArea.active .operator.dataset.state-Complete:visible");
            })
            .then(() => {
                const node = DagViewManager.Instance.getActiveDag().getNode(nodeId);
                tableName = node.getTable();
                if (UserSettings.getPref("dfAutoPreview")) {
                    return PromiseHelper.resolve();
                } else {
                    return DagViewManager.Instance.viewResult(node);
                }
            })
            .then(function() {
                let tableTitle = "#dagViewTableArea .tableNameArea .name:contains(Label 1):visible";
                let dataCol = "#xcTable-" + xcHelper.getTableId(tableName) + " td.jsonElement";
                return self.checkExists([tableTitle, dataCol]);
            })
            .then(function() {
                const $table = $("#dagViewTableArea .xcTableWrap");
                tableId = $("#dagViewTableArea .xcTableWrap").data("id");
                if (sorted) {
                    TblManager.sortColumns(tableId, ColumnSortType.name, "forward");
                }

                var $prefixes = $table.find(".xcTable .topHeader .prefix");
                var prefix = "";
                $prefixes.each(function() {
                    var text = $(this).text();
                    if (text !== "") {
                        prefix = text;
                        return false; // stop loop
                    }
                });
                tabId = DagViewManager.Instance.getActiveTab().getId();
                deferred.resolve(gTables[tableId].getName(), prefix, nodeId, tabId);
            })
            .fail(function() {
                console.error("could not create table");
                deferred.reject.apply(this, arguments);
            });

            return deferred.promise();
        },

        createNode: function(type, subType) {
            var node = DagViewManager.Instance.newNode({
                type: type,
                subType: subType || null,
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
            // select node
            $node.find(".main").trigger(fakeEvent.mousedown);
            $node.find(".main").trigger(fakeEvent.mouseup);
            if (action === "viewResult") {
                $node.find(".table").trigger("contextmenu");
                $("#dagTableNodeMenu").find("." + action).trigger(fakeEvent.mouseup);
            } else {
                $node.find(".main").trigger("contextmenu");
                $("#dagNodeMenu").find("." + action).trigger(fakeEvent.mouseup);
            }

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

            var selector = '#datasetOpPanel .fileName :contains(' + dsName + ')';

            self.checkExists(selector)
            .then(function() {
                var $grid = $(selector).closest(".fileName");
                $grid.click();
                $panel.find(".datasetPrefix input").val(prefix);
                $panel.find(".bottomSection .submit").click();
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

        wait: function(time) {
            time = time || 0;
            var deferred = PromiseHelper.deferred();
            setTimeout(() => {
                deferred.resolve();
            }, time);
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
            var consoleUpdateTime = 0;

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

                // every 10 seconds, console log what is being searched for
                consoleUpdateTime += intervalTime;
                if (consoleUpdateTime > 10000) {
                    console.log("waiting for " + elemSelectors + " to " + (notExist ? "not" : "") + " be found");
                    consoleUpdateTime = 0;
                }
            }, intervalTime);

            return (deferred.promise());
        },

        // ==================== COMMON ACTION TRIGGERS ===================== //
        createNodeAndOpenPanel(parentNodeIds, nodeType, subType) {
            var self = this;
            var $node = self.createNode(nodeType, subType);
            var nodeId = $node.data("nodeid");
            const tabId = DagViewManager.Instance.getActiveDag().getTabId();
            if (parentNodeIds != null) {
                parentNodeIds = (parentNodeIds instanceof Array) ?
                parentNodeIds : [parentNodeIds];


                parentNodeIds.forEach((parentNodeId, index) => {
                    DagViewManager.Instance.connectNodes(parentNodeId, nodeId, index, tabId);
                });
            }
            DagViewManager.Instance.autoAlign(tabId);
            self.nodeMenuAction($node, "configureNode");
            return nodeId;
        },

        executeNode(nodeId) {
            var self = this;
            const deferred = PromiseHelper.deferred();
            const $node = DagViewManager.Instance.getNode(nodeId);
            const dfId = $node.closest(".dataflowArea").data("id");
            this.nodeMenuAction($node, "executeNode");

            this.hasNodeWithState(nodeId, DagNodeState.Complete)
            .then(() => {
                return self.checkExists('.dataflowArea[data-id="' + dfId + '"]:not(.locked)');
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        }
    };


    TestSuite.createTest = function() {
        xcMixpanel.off();
        return new TestRunner();
    };

    TestSuite.printResult = function(result) {
        if (result) {
            console.log(JSON.stringify(result));
        }
    };

    TestSuite.run = function(hasAnimation, toClean, noPopup, mode, timeDilation) {
        return FlightTest.run(hasAnimation, toClean, noPopup, mode, timeDilation);
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

    function cleanup(test) {
        // XXX TODO: make it work
        // XXX temporary disable it
        return PromiseHelper.resolve();
        var deferred = PromiseHelper.deferred();

        deleteTables()
        .then(function() {
            deleteDagTabs();
            return deleteDS(test);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function deleteDagTabs() {
        // XXX TODO
    }

    // XXX TODO: update it
    // function deleteTables() {
    //     console.log("Delete Tables");
    //     var deferred = PromiseHelper.deferred();

    //     var $workspaceMenu = $("#workspaceMenu");
    //     if (!$workspaceMenu.hasClass("active")) {
    //         $("#workspaceTab .mainTab").click();
    //     }

    //     if ($workspaceMenu.find(".tables").hasClass("xc-hidden")) {
    //         $("#tableListTab").click();
    //     }

    //     var $tabs = $("#tableListSectionTabs .tableListSectionTab");
    //     var tabeTypes = [TableType.Active, TableType.Orphan];
    //     var promises = [];

    //     TableList.refreshOrphanList()
    //     .then(function() {
    //         tabeTypes.forEach(function(tableType, index) {
    //             $tabs.eq(index).click();
    //             var $section = $("#tableListSections .tableListSection:visible");
    //             $section.find(".selectAll").click();
    //             promises.push(TableList.tableBulkAction("delete",
    //                                                     tableType));
    //         });

    //         return PromiseHelper.when.apply(this, promises);
    //     })
    //     .then(deferred.resolve)
    //     .fail(deferred.reject);

    //     return deferred.promise();
    // }

    function deleteDS(test) {
        var deferred = PromiseHelper.deferred();
        var minModeCache = gMinModeOn;
        gMinModeOn = true;
        $("#dataStoresTab .mainTab").click();

        test.testDS.forEach(function(ds) {
            var $grid = DS.getGridByName(ds);
            // XXX TODO: use another way
            XcalarDatasetDeactivate(ds)
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
                            dsName + '"]:not(.inactive):not(.fetching)';
    }

    function getInActivateDSIcon(dsName) {
        return '#dsListSection .grid-unit[data-dsname="' +
                            dsName + '"]:(.inActivate)';
    }

    return (TestSuite);
}(jQuery, {}));

describe("DagNodeInfoPanel Test", function() {
    let $panel;
    let mapNode;
    let filterNode;
    let customNode;
    let datasetNode;
    let testDagGraph;
    let tabId;
    let test;

    before(function(done) {
        if (XVM.isSQLMode()) {
            $("#modeArea").click();
        }
        test = TestSuite.createTest();
        UnitTest.onMinMode();
        if (!$("#modelingDataflowTab").hasClass("active")) {
            $("#dagButton").click();
        }
        UnitTest.testFinish(() => {
            return DagTabManager.Instance._setup;
        })
        .then(() => {
            $("#dagView .newTab").click();
            testDagGraph = DagViewManager.Instance.getActiveDag();
            tabId = testDagGraph.getTabId();
            let $mapNode = test.createNode("map");
            mapNode = testDagGraph.getNode($mapNode.data("nodeid"));
            let $filterNode = test.createNode("filter");
            filterNode = testDagGraph.getNode($filterNode.data("nodeid"));

            let $datasetNode = test.createNode("dataset");
            datasetNode = testDagGraph.getNode($datasetNode.data("nodeid"));

            DagNodeInfoPanel.Instance.hide();
            $panel = $("#dagNodeInfoPanel");
            done();
        })
        .fail(() => {
            done("fail");
        });
    });

    it("should not show if no node", function() {
        expect($panel.hasClass("xc-hidden")).to.be.true;
        expect(DagNodeInfoPanel.Instance.show(null)).to.be.false;
        expect($panel.hasClass("xc-hidden")).to.be.true;
        expect(DagNodeInfoPanel.Instance.isOpen()).to.be.false;
    });

    it("should show", function() {
        let cachedFn = DagNodeInfoPanel.Instance._updateTitleSection;
        let called = false;
        DagNodeInfoPanel.Instance._updateTitleSection = function() {
            called = true;
        }
        expect($panel.hasClass("xc-hidden")).to.be.true;
        expect(DagNodeInfoPanel.Instance.show(mapNode)).to.be.true;
        expect($panel.hasClass("xc-hidden")).to.be.false;
        expect(DagNodeInfoPanel.Instance.isOpen()).to.be.true;
        expect(called).to.be.true;
        DagNodeInfoPanel.Instance._updateTitleSection = cachedFn;
    });

    it("should not show if already focused on node", function() {
        let cachedFn = DagNodeInfoPanel.Instance._updateTitleSection;
        let called = false;
        DagNodeInfoPanel.Instance._updateTitleSection = function() {
            called = true;
        }
        expect(DagNodeInfoPanel.Instance.show(mapNode, false)).to.be.true;
        expect($panel.hasClass("xc-hidden")).to.be.false;
        expect(DagNodeInfoPanel.Instance.isOpen()).to.be.true;
        expect(called).to.be.false;
        DagNodeInfoPanel.Instance._updateTitleSection = cachedFn;
    });

    describe("check sections", function() {
        before(function() {
            filterNode.setTitle("");
            DagNodeInfoPanel.Instance.show(filterNode);
        });

        it("should show correct title", function() {
            expect($panel.find(".nodeTitle").hasClass("xc-hidden")).to.be.true;
            filterNode.setTitle("Node title");
            DagNodeInfoPanel.Instance.show(filterNode);
            expect($panel.find(".nodeTitle").hasClass("xc-hidden")).to.be.false;
            expect($panel.find(".nodeTitle").text()).to.equal("Node title");
            filterNode.setTitle("updated title", true);
            expect($panel.find(".nodeTitle").text()).to.equal("updated title");
        });

        it("should show correct config section", function() {
            expect($panel.find(".configRow").length).to.equal(1);
            expect($panel.find(".configRow").hasClass("xc-hidden")).to.be.false;
            expect($panel.find(".configSection").text()).to.equal('{\n    "evalString": "",\n    "result_table": "N/A"\n}');
            filterNode.setParam({"evalString": "eq(1,1)"});
            expect($panel.find(".configSection").text()).to.equal('{\n    "evalString": "eq(1,1)",\n    "result_table": "N/A"\n}');
        });

        it("should show correct status section", function() {
            expect($panel.find(".statusSection").text()).to.equal("Error");
            expect($panel.find(".errorSection").text()).to.equal("Requires 1 parents");

            filterNode.beErrorState("some error");

            expect($panel.find(".statusSection").text()).to.equal("Error");
            expect($panel.find(".errorSection").text()).to.equal("some error");
        });

        it("should show correct stats section", function() {
            expect($panel.find(".progressRow").hasClass("xc-hidden")).to.be.true;
            let map = new Map();
            map.set("table_DF2_5C2E5E0B0EF91A85_1549520868132_61_dag_5C2E5E0B0EF91A85_1549668770304_65#t_1553122939885_0",  {
                "name": {
                    "name": "table_DF2_5C2E5E0B0EF91A85_1549520868132_61_dag_5C2E5E0B0EF91A85_1549668770304_65#t_1553122939885_0"
                },
                "tag": "",
                "comment": "",
                "dagNodeId": "1619201",
                "api": 3,
                "state": 3,
                "xdbBytesRequired": 0,
                "xdbBytesConsumed": 0,
                "numTransPageSent": 0,
                "numTransPageRecv": 0,
                "numWorkCompleted": 5,
                "numWorkTotal": 6,
                "elapsed": {
                    "milliseconds": 8
                },
                "inputSize": 533024,
                "input": {
                    "indexInput": {
                        "source": ".XcalarDS.rudy.19434.classes",
                        "dest": "table_DF2_5C2E5E0B0EF91A85_1549520868132_61_dag_5C2E5E0B0EF91A85_1549668770304_65#t_1553122939885_0",
                        "key": [
                            {
                                "name": "xcalarRecordNum",
                                "type": "DfInt64",
                                "keyFieldName": "xcalarRecordNum",
                                "ordering": "Random"
                            }
                        ],
                        "prefix": "classes",
                        "dhtName": "",
                        "delaySort": false,
                        "broadcast": false
                    }
                },
                "numRowsTotal": 6,
                "numNodes": 2,
                "numRowsPerNode": [
                    6,
                    0
                ],
                "sizeTotal": 0,
                "sizePerNode": [],
                "numTransPagesReceivedPerNode": [
                    0,
                    0
                ],
                "numParents": 0,
                "parents": [],
                "numChildren": 0,
                "children": [],
                "log": "",
                "status": 0,
                "index": 0
            });
            filterNode.updateProgress(map);

            DagNodeInfoPanel.Instance.update(filterNode.getId(), "stats");
            expect($panel.find(".progressRow").hasClass("xc-hidden")).to.be.false;
            expect($panel.find(".progressSection").text()).to.equal("Step 1: 83%");
            expect($panel.find(".timeSection").text()).to.equal("8ms");
            expect($panel.find(".statsRow.subRow").eq(0).find(".value").text()).to.equal("Index");
            expect($panel.find(".statsRow.subRow").eq(1).find(".value").text()).to.equal("83%");
            expect($panel.find(".statsRow.subRow").eq(2).find(".value").text()).to.equal("Processing");
            // expect($panel.find(".statsRow.subRow").eq(2).find(".value").eq(1).text()).to.equal("6");
            expect($panel.find(".statsRow.subRow").eq(3).find(".value").eq(0).text()).to.equal("6");
            expect($panel.find(".statsRow.subRow").eq(3).find(".value").eq(1).text()).to.equal("6");
            expect($panel.find(".statsRow.subRow").eq(3).find(".value").eq(2).text()).to.equal("0");
            expect($panel.find(".statsRow.subRow").eq(6).find(".value").text()).to.equal("100");
            expect($panel.find(".statsRow.subRow").eq(6).find(".value").attr("style")).to.equal("color:hsl(0, 100%, 33%)");
            expect($panel.find(".statsRow.subRow").eq(7).find(".value").text()).to.equal("8ms");

            // expand row stats section
            expect($panel.find(".rowStats").hasClass("collapsed")).to.be.true;
            $panel.find(".rowStats > .rowHeading").click();
            expect($panel.find(".rowStats").hasClass("collapsed")).to.be.false;
        });

        it("agg section should be correct", function() {
            expect($panel.find(".aggsRow").hasClass("xc-hidden")).to.be.true;
            filterNode.setParam({"evalString": "eq(^agg,1)"});
            filterNode.setAggregates(["^myAgg"]);
            expect($panel.find(".aggsRow").hasClass("xc-hidden")).to.be.false;
            expect($panel.find(".aggsSection").text()).to.equal("^myAgg");
        });

        it("map udf should show", function() {
            let cachedFn = XcalarUdfGetRes;
            XcalarUdfGetRes = function() {
                return PromiseHelper.resolve("/sharedUDFs/a")
            }
            DagNodeInfoPanel.Instance.show(mapNode);
            expect($panel.find(".udfsRow").hasClass("xc-hidden")).to.be.true;
            mapNode.setParam({
                "eval": [
                    {
                        "evalString": "a:b(x)",
                        "newField": ""
                    }
                ],
                "icv": false
            });
            expect($panel.find(".udfsRow").hasClass("xc-hidden")).to.be.false;

            expect($panel.find(".udfsSection").text()).to.equal("");
            $panel.find(".udfsRow .xi-arrow-down").click();
            expect($panel.find(".udfsSection .type").text()).to.equal("a");
            expect($panel.find(".udfsSection .field").text()).to.equal("/sharedUDFs/a.py");
            XcalarUdfGetRes = cachedFn;
        });

        it("description section", function() {
            expect($panel.find(".descriptionRow").hasClass("xc-hidden")).to.be.true;
            mapNode.setDescription("something");
            expect($panel.find(".descriptionRow").hasClass("xc-hidden")).to.be.false;
            expect($panel.find(".descriptionSection").text()).to.equal("something");
        });

        it("lock section", function() {
            expect($panel.find(".editConfig").hasClass("unavailable")).to.be.false;
            DagViewManager.Instance.getActiveDagView().lockNode(mapNode.getId());
            expect($panel.find(".editConfig").hasClass("unavailable")).to.be.true;
            DagViewManager.Instance.getActiveDagView().unlockNode(mapNode.getId());
            expect($panel.find(".editConfig").hasClass("unavailable")).to.be.false;
        });

        it("should edit config", function() {
            let called = false;
            let cachedFn = DagNodeMenu.execute;
            DagNodeMenu.execute = function(type, options) {
                expect(type).to.equal("configureNode");
                expect(options.node.getId()).to.equal(mapNode.getId())
                called = true;
            }
            $panel.find(".editConfig").click();
            expect(called).to.be.true;
            DagNodeMenu.execute = cachedFn;
        });

        it("should update column changes section", () => {
            expect($panel.find(".columnChangeRow").hasClass("xc-hidden")).to.be.true;
            mapNode.columnChange(DagColumnChangeType.TextAlign, ["someColumn"], {alignment: "Center"});
            expect($panel.find(".columnChangeRow").hasClass("xc-hidden")).to.be.false;
            expect($panel.find(".columnChangeSection").text()).to.equal('someColumn\n    "textAlign": "Center"\n');
        });

        it("should update column ordering section", () => {
            expect($panel.find(".columnOrderingRow").hasClass("xc-hidden")).to.be.true;
            mapNode.columnChange(DagColumnChangeType.Reorder, ["someColumn", "otherColumn"]);
            expect($panel.find(".columnOrderingRow").hasClass("xc-hidden")).to.be.false;
            expect($panel.find(".columnOrderingSection").text()).to.equal('someColumnotherColumn');
        });


        it("update sub graph section", function() {
            expect($panel.find(".subGraphRow").hasClass("xc-hidden")).to.be.true;
            DagViewManager.Instance.wrapCustomOperator([filterNode.getId()]);
            customNode = DagViewManager.Instance.getActiveDag().getNode(DagViewManager.Instance.getActiveArea().find(".operator.custom").data("nodeid"));
            DagNodeInfoPanel.Instance.show(customNode);
            expect($panel.find(".subGraphRow").hasClass("xc-hidden")).to.be.false;
            expect($panel.find(".subGraphSection").text()).to.equal("Filter");
        });
    });
    describe("other tests", function() {
        it("update with invalid attr should be handled", function() {
            expect(DagNodeInfoPanel.Instance.update(customNode.getId(), "something")).to.be.false;
        });

        it("get active node should be null if not showing", function() {
            expect(DagNodeInfoPanel.Instance.getActiveNode().getType()).to.equal("custom");
            DagNodeInfoPanel.Instance.hide();
            expect(DagNodeInfoPanel.Instance.getActiveNode()).to.be.null;
        });
        it("should not render restore button if state is not error", function() {
            datasetNode.getDSName = function() {
                return "ds" + Math.random();
            }
            DagNodeInfoPanel.Instance.show(datasetNode);
            expect($panel.find(".restore").length).to.equal(0);
            DagNodeInfoPanel.Instance.hide();
        });
        it("should render restore button", function() {
            datasetNode.getDSName = function() {
                return "ds" + Math.random();
            }
            datasetNode.getState = function() {
                return DagNodeState.Error;
            };
            datasetNode.getError = function() {
                return DagNodeState.Error;
            }
            DagNodeInfoPanel.Instance.show(datasetNode);
            expect($panel.find(".restore").length).to.equal(1);

        });
        it("should try to restore dataset", function() {
            let called = false;
            let cachedFn = DS.restoreSourceFromDagNode;
            DS.restoreSourceFromDagNode = function(nodes, shareDS) {
                expect(nodes.length).to.equal(1);
                expect(nodes[0].getId()).to.equal(datasetNode.getId());
                expect(shareDS).to.be.false;
                called = true;
            }
            $panel.find(".restore .action").click();
            expect(called).to.be.true;
            DS.restoreSourceFromDagNode = cachedFn;
        })
    });



    after(function(done) {
        UnitTest.deleteTab(tabId)
        .then(() => {
            UnitTest.offMinMode();
            done();
        })
        .fail(function() {
            done("fail");
        });
    });
});
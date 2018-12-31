describe("DagView Test", () => {
    let $dagView;
    let $dfWrap;
    let tabId;
    let oldPut;

    before(function(done) {
        UnitTest.onMinMode();
        $dagView = $("#dagView");
        $dfWrap = $dagView.find(".dataflowWrap");
        oldPut = XcalarKeyPut;
        XcalarKeyPut = function() {
            return PromiseHelper.resolve();
        };
        UnitTest.testFinish(function() {
            return $dagView.find(".dataflowArea").length > 0;
        })
        .then(function() {
            DagTabManager.Instance.newTab();
            tabId = DagView.getActiveDag().getTabId();
            MainMenu.openPanel("dagPanel", null);
            done();
        });
    });
    describe("initial state", function() {
        it("initial screen should have at least 1 dataflowArea", () => {
            expect($dagView.find(".dataflowArea").length).at.least(1);
            expect($dagView.find(".dataflowArea.active").length).to.equal(1);
        });
        it("initial screen should have no operators", function() {
            expect($dagView.find(".operator").length).to.be.gt(0);
            expect($dagView.find(".dataflowArea.active .operator").length).to.equal(0);
        });
        it("correct elements should be present", function() {
            expect($dagView.find(".dataflowArea.active .dataflowAreaWrapper").children().length).to.equal(3);
            expect($dagView.find(".dataflowArea.active .operatorSvg").length).to.equal(1);
        });
    });
    describe("adding node", function() {
        it("add node should work", function() {
            expect($dagView.find(".dataflowArea.active .operatorSvg").children().length).to.equal(0);

            const newNodeInfo = {
                type: "dataset",
                display: {
                    x: 20,
                    y: 40
                }
            };
            DagView.newNode(newNodeInfo);
            expect($dagView.find(".dataflowArea.active .operatorSvg").children().length).to.equal(1);
            expect($dagView.find(".dataflowArea .operator").length).to.equal(1);
            const $operator = $dagView.find(".dataflowArea .operator");
            expect($operator.attr("transform")).to.equal("translate(20,40)");
            expect($operator.hasClass("dataset")).to.be.true;
            const dag = DagView.getActiveDag();

            const nodeId = $operator.data("nodeid");
            expect(DagView.getNode(nodeId).length).to.equal(1);
            const position = dag.getNode(nodeId).getPosition();
            expect(position.x).to.equal(20);
            expect(position.y).to.equal(40);
        });
    });

    describe("move node", function() {
        it("drag and drop for moving operators should work", function() {
            let $operator;
            let left;
            let top;
            const cacheFn = DagView.moveNodes;
            let called = false;
            DagView.moveNodes = function(tabId, nodeInfos) {
                expect(nodeInfos.length).to.equal(1);
                expect(nodeInfos[0].id).to.equal($operator.data("nodeid"));
                expect(nodeInfos[0].position.x).to.equal(left + 40);
                expect(nodeInfos[0].position.y).to.equal(top + 20);
                called = true;
            };
            $operator = $dfWrap.find(".dataflowArea.active .operator").eq(0);
            var parts  = /translate\(\s*([^\s,)]+)[ ,]([^\s,)]+)/.exec($operator.attr("transform"));

            left = parseInt(parts[1]);
            top = parseInt(parts[2]);
            var e = $.Event('mousedown', {pageX: 100, pageY: 100, which: 1});

            $operator.find(".main").trigger(e);

            expect($(".dragContainer").length).to.equal(0);
            var e = $.Event('mousemove', {pageX: 140, pageY: 120});
            $(document).trigger(e);

            expect($(".dragContainer").length).to.equal(1);

            var e = $.Event('mousemove', {pageX: 140, pageY: 120});
            $(document).trigger(e);

            var e = $.Event('mouseup', {pageX: 140, pageY: 120});
            $(document).trigger(e);
            expect($(".dragContainer").length).to.equal(0);

            expect(called).to.be.true;
            DagView.moveNodes = cacheFn;
        });

        it("DagView.moveNode should work", function(done) {
            const $operator = $dfWrap.find(".dataflowArea.active .operator").eq(0);
            const nodeId = $operator.data("nodeid");

            DagView.moveNodes(tabId, [{type: "dagNode", id: nodeId, position: {x: 220, y: 240}}])
            .always(function() {
                const dag = DagView.getActiveDag();
                expect(dag.getNode(nodeId).getPosition().x).to.equal(220);
                expect(dag.getNode(nodeId).getPosition().y).to.equal(240);
                expect($operator.attr("transform")).to.equal("translate(220,240)");
                done();
            });
        });
    });

    describe("connecting nodes", function() {
        before(function() {
            const newNodeInfo = {
                type: "filter",
                display: {
                    x: 10,
                    y: 10
                }
            };
            DagView.newNode(newNodeInfo);
        });

        it("drag and drop for connectors should work", function() {
            const cacheFn = DagView.connectNodes;
            let called = false;
            DagView.connectNodes = function(pId, cId, index) {
                expect(pId).to.equal($operator.data("nodeid"));
                expect(cId).to.equal($operator.siblings(".operator").data("nodeid"));
                expect(index).to.equal(0);
                called = true;
            };

            expect($dagView.find(".dataflowArea .operator").length).to.equal(2);

            var e = $.Event('mousedown', {pageX: 100, pageY: 100, which: 1});
            const $operator = $dfWrap.find(".dataflowArea.active .operator").eq(0);
            $operator.find(".connector.out").trigger(e);

            expect($(".dragContainer").length).to.equal(0);
            var e = $.Event('mousemove', {pageX: 102, pageY: 101});
            $(document).trigger(e);

            expect($(".dragContainer").length).to.equal(1);
            expect($dfWrap.find(".secondarySvg").length).to.equal(1);

            var e = $.Event('mousemove', {pageX: 102, pageY: 101});
            $(document).trigger(e);

            const rect = $operator.siblings(".operator")[0].getBoundingClientRect();
            var e = $.Event('mouseup', {pageX: rect.left, pageY: rect.top});
            $(document).trigger(e);

            expect($dfWrap.find(".secondarySvg").length).to.equal(0);


            expect(called).to.be.true;
            DagView.connectNodes = cacheFn;
        });

        it("DagView.connectNodes should work", function(done) {
            const $operator = $dfWrap.find(".dataflowArea.active .operator").eq(0);
            const $child = $operator.siblings(".operator");
            const parentId = $operator.data("nodeid");
            const childId = $child.data("nodeid");
            const tabId = DagView.getActiveDag().getTabId();
            DagView.connectNodes(parentId, childId, 0, tabId)
            .always(function() {
                const dag = DagView.getActiveDag();
                expect(dag.getNode(parentId).children.length).to.equal(1);
                expect(dag.getNode(parentId).parents.length).to.equal(0);
                expect(dag.getNode(childId).parents.length).to.equal(1);
                expect(dag.getNode(childId).children.length).to.equal(0);
                expect($dfWrap.find(".edgeSvg .edge").length).to.equal(1);
                done();
            });
        });
        it("DagView.disconnectNodes should work", function(done) {
            const $operator = $dfWrap.find(".dataflowArea.active .operator").eq(0);
            const $child = $operator.siblings(".operator");
            const parentId = $operator.data("nodeid");
            const childId = $child.data("nodeid");
            const tabId = DagView.getActiveDag().getTabId();
            DagView.disconnectNodes(parentId, childId, 0, tabId)
            .always(function() {
                const dag = DagView.getActiveDag();
                expect(dag.getNode(parentId).children.length).to.equal(0);
                expect(dag.getNode(childId).parents.length).to.equal(0);
                expect($dfWrap.find(".edgeSvg .edge").length).to.equal(0);
                done();
            });
        });
    });

    describe("delete nodes", function() {
        let idCache = [];
        before(function() {
            const dag = DagView.getActiveDag();
            const nodes = dag.getAllNodes();
            nodes.forEach((node) => {
                idCache.push(node.getId());
            });
        })
        it("delete should work", function(done) {
            expect($dfWrap.find(".dataflowArea.active .operator").length).to.equal(2);
            const dag = DagView.getActiveDag();
            let nodes = dag.getAllNodes();
            let nodeIds = [];
            nodes.forEach((node) => {
                nodeIds.push(node.getId());
            });
            DagView.removeNodes(nodeIds, dag.getTabId())
            .always(function() {
                nodes = dag.getAllNodes();
                let nodeIds = [];
                nodes.forEach((node) => {
                    nodeIds.push(node.getId());
                });
                expect(nodeIds.length).to.equal(0);
                expect($dfWrap.find(".dataflowArea.active .operator").length).to.equal(0);

                done();
            });
        });
        it("add back should work", function(done) {
            DagView.addBackNodes(idCache, tabId)
            .always(function() {
                expect($dfWrap.find(".dataflowArea.active .operator").length).to.equal(2);
                const dag = DagView.getActiveDag();
                let nodes = dag.getAllNodes();
                let nodeIds = [];
                nodes.forEach((node) => {
                    nodeIds.push(node.getId());
                });
                expect(nodeIds.length).to.equal(2);
                done();
            });
        });
    });

    // describe("drag select", function() {
    //     it("drag select should select all nodes", function() {
    //         $dfWrap.find(".operator").removeClass("selected");
    //         expect($dfWrap.find(".operator.selected").length).to.equal(0);
    //         let e = $.Event('mousedown', {pageX: 800, pageY: 500, which: 1,
    //                     target: $dfWrap.find(".dataflowArea.active")});
    //         $dfWrap.trigger(e);
    //         e = $.Event('mousemove', {pageX: 0, pageY: 0});
    //         $(document).trigger(e);
    //         e = $.Event('mousemove', {pageX: 0, pageY: 0});
    //         $(document).trigger(e);
    //         e = $.Event('mouseup', {pageX: 0, pageY: 0});
    //         $(document).trigger(e);
    //         expect($dfWrap.find(".operator.selected").length).to.equal(2);
    //     });
    // });

    describe("node description", function() {
        it("editDescription should work", function() {
            const $operator = $dfWrap.find(".operator").eq(0);
            expect($operator.hasClass("hasDescription")).to.be.false;
            expect($operator.find(".descriptionIcon").length).to.equal(0);

            const nodeId = $operator.data('nodeid');
            DagView.editDescription(nodeId, "test");
            const node = DagView.getActiveDag().getNode(nodeId);
            expect(node.getDescription()).to.equal("test");
            expect($operator.hasClass("hasDescription")).to.be.true;
            expect($operator.find(".descriptionIcon").length).to.equal(1);
        });

        it("editDescription with no value should work", function() {
            const $operator = $dfWrap.find(".operator").eq(0);
            expect($operator.hasClass("hasDescription")).to.be.true;
            expect($operator.find(".descriptionIcon").length).to.equal(1);

            const nodeId = $operator.data('nodeid');
            DagView.editDescription(nodeId, "");
            const node = DagView.getActiveDag().getNode(nodeId);
            expect(node.getDescription()).to.equal("");
            expect($operator.hasClass("hasDescription")).to.be.false;
            expect($operator.find(".descriptionIcon").length).to.equal(0);
        });
    });

    describe("preview table", () => {
        let graph;
        let node;
        let table;
        let oldShow;

        before(() => {
            graph = DagView.getActiveDag();
            node = DagNodeFactory.create({type: DagNodeType.Dataset});
            graph.addNode(node);
            table = xcHelper.randName("test#abc")
            node.setTable(table);
            oldShow = DagTable.Instance._show;
        });

        it("should show table", (done) => {
            let test = false;
            DagTable.Instance._show = () => {
                test = true;
                return PromiseHelper.resolve();
            }
            DagView.viewResult(node)
            .then(() => {
                expect(test).to.be.true;
                done();
            })
            .fail(() => {
                done("fail");
            });
        });

        it("should show alert in error case", (done) => {
            DagTable.Instance._show = () => {
                return PromiseHelper.reject("test");
            }
            DagView.viewResult(node)
            .then(() => {
                done("fail");
            })
            .fail(() => {
                UnitTest.hasAlertWithText("test");
                done();
            });
        });

        it("should show alert in error code", (done) => {
            node.setTable("");
            DagView.viewResult(node)
            .then(() => {
                done("fail");
            })
            .fail(() => {
                UnitTest.hasAlertWithText(ErrTStr.Unknown);
                done();
            });
        });

        after(() => {
            graph.removeNode(node.getId());
            DagTable.Instance._show = oldShow;
        });
    });

    describe("Dag Progress", () => {
        let nodeId;
        let $node;
        let tabId;

        before(() => {
            tabId = DagView.getActiveDag().getTabId();
            const newNodeInfo = {
                type: "filter",
                display: {
                    x: 10,
                    y: 10
                }
            };
            const node = DagView.newNode(newNodeInfo);
            nodeId = node.getId();
            $node = DagView.getNode(nodeId);
        });

        it("should add progress", () => {
            DagView.addProgress(nodeId, tabId);
            expect($node.find(".opProgress").text()).to.equal("0%");
        });

        it("should update progress", () => {
            DagView.updateProgress(nodeId, tabId, 10);
            expect($node.find(".opProgress").text()).to.equal("10%");
        });

        it("should remove progress", () => {
            DagView.removeProgress(nodeId, tabId);
            expect($node.find(".opProgress").length).to.equal(0);
        });

        after(() => {
            DagView.removeNodes([nodeId], tabId);
        });
    });

    it("should reset dag", () => {
        UnitTest.onMinMode();
        DagView.reset();
        UnitTest.hasAlertWithTitle(DagTStr.Reset);
        UnitTest.offMinMode();
    });

    after(function(done) {
        UnitTest.offMinMode();
        const dag = DagView.getActiveDag();
        const nodes = dag.getAllNodes();
        let nodeIds = [];
        nodes.forEach((node) => {
            nodeIds.push(node.getId());
        });

        let dagTab =  DagTabManager.Instance.getTabById(tabId);
        DagView.removeNodes(nodeIds, dag.getTabId())
        .then(function() {
            DagTabManager.Instance.removeTab(tabId);
            return dagTab.delete();
        })
        .always(function() {
            XcalarKeyPut = oldPut;
            done();
        });
    });
});
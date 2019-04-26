describe("Dag Node Basic Test", () => {
    it("should get id", () => {
        const node = new DagNode({id: "test"});
        expect(node.getId()).to.be.equal("test");
    });

    it("should auto generate id", () => {
        const node = new DagNode();
        expect(node.getId().startsWith("dag_")).to.be.true;
    });

    it("should get node type", () => {
        const node = new DagNode({type: DagNodeType.Filter});
        expect(node.getType()).to.equal(DagNodeType.Filter);
    });

    it("should get node's max parent that can have", () => {
        const node = new DagNode({});
        expect(node.getMaxParents()).to.equal(1);
    });

    it("should get node's max children that can have", () => {
        const node = new DagNode({});
           expect(node.getMaxChildren()).to.equal(-1);
    });

    it("should get all parents", () => {
        const node = new DagNode();
        expect(node.getParents()).to.be.an("array");
    });

    it("should get current number of parent", () => {
        const node = new DagNode();
        expect(node.getNumParent()).to.equal(0);
    });

    it("should get all children", () => {
        const node = new DagNode();
        expect(node.getChildren()).to.be.an("array");
    });

    it("should get position", () => {
        const node = new DagNode();
        const coor = node.getPosition();
        expect(coor).to.deep.equal({x: -1, y: -1});
    });

    it("should set position", () => {
        const node = new DagNode();
        node.setPosition({x: 1, y: 2});
        const coor = node.getPosition();
        expect(coor).to.deep.equal({x: 1, y: 2});
    });

    it("should get description", () => {
        const node = new DagNode();
        expect(node.getDescription()).to.equal("");
    });

    it("should set description", () => {
        const node = new DagNode();
        node.setDescription("test");
        expect(node.getDescription()).to.equal("test");
    });

    it("should remove description", () => {
        const node = new DagNode();
        node.setDescription("test");
        node.removeDescription();
        expect(node.getDescription()).to.be.undefined;
    });

    it("should get state", () => {
        const node = new DagNode();
        expect(node.getState()).to.equal(DagNodeState.Unused);
    });

    it("should change state", () => {
        const node = new DagNode();

        node.beCompleteState();
        expect(node.getState()).to.equal(DagNodeState.Complete);

        node.beErrorState();
        expect(node.getState()).to.equal(DagNodeState.Error);

        node.beRunningState();
        expect(node.getState()).to.equal(DagNodeState.Running);
    });

    it("should get table", () => {
        const node = new DagNode();
        expect(node.getTable()).to.be.undefined;
    });

    it("should set tabble", () => {
        const node = new DagNode();
        node.setTable("testName");
        expect(node.getTable()).to.equal("testName");
    });

    it("set table should pop up event", () => {
        const node = new DagNode();
        node.registerEvents(DagNodeEvents.ResultSetChange, (info) => {
            expect(node.getId()).to.equal(info.nodeId);
            expect(info.oldResult).to.be.empty;
            expect(info.result).to.equal("testName");
            expect(info.node).to.equal(node);
        });

        node.setTable("testName", true);
        expect(node.getTable()).to.equal("testName");
    });

    it("should remove table when running", () => {
        const node = new DagNode();
        node.setTable("testName");
        node.beRunningState();
        expect(node.getTable()).to.be.undefined;
    });

    it.skip("should get parameters", () => {
        const node = new DagNode();
        expect(node.getParams()).to.be.an("object");
    });

    it.skip("should set parameters", () => {
        const node = new DagNode({type: DagNodeType.Dataset});
    });

    it("should connect to parent", () => {
        const node = new DagNode({type: DagNodeType.Map});
        const parentNode = new DagNode();
        node.connectToParent(parentNode, 0);
        expect(node.getNumParent()).to.equal(1);
    });

    it("should throw error when already has parent but connect", () => {
        const node = new DagNode({type: DagNodeType.Map});
        const parentNode = new DagNode();
        try {
            node.connectToParent(parentNode, 0);
            // error case
            node.connectToParent(parentNode, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getNumParent()).to.equal(1);
        }
    });

    it("should throw error when add agg node to wrong kinds of node", () => {
        const node = new DagNode({type: DagNodeType.Join});
        const aggNode = new DagNode({type: DagNodeType.Aggregate});
        try {
            node.connectToParent(aggNode, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getNumParent()).to.equal(0);
        }
    });

    it("should throw error connect to node that has max parents", () => {
        const node = new DagNode({type: DagNodeType.Dataset});
        const aggNode = new DagNode();
        try {
            node.connectToParent(aggNode, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getNumParent()).to.equal(0);
        }
    });

    it("should connect to children", () => {
        const node = new DagNode();
        const childNode = new DagNode();
        node.connectToChild(childNode);
        expect(node.getChildren().length).to.equal(1);
    });

    it("should throw error connect to invalid node", () => {
        const node = new DagNode({type: DagNodeType.Export});
        const childNode = new DagNode();
        try {
            node.connectToChild(childNode, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getChildren().length).to.equal(0);
        }
    });

    it("should disconnect from parent node", () => {
        const node = new DagNode({type: DagNodeType.Map});
        const parentNode = new DagNode();
        node.connectToParent(parentNode, 0);

        node.disconnectFromParent(parentNode, 0);
        expect(node.getNumParent()).to.equal(0);
    });

    it("should throw error when disconnect at wrong position from parent node", () => {
        const node = new DagNode({type: DagNodeType.Map});
        const parentNode = new DagNode();
        try {
            node.disconnectFromParent(parentNode, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getNumParent()).to.equal(0);
        }
    });

    it("should throw error when disconnect at wrong parent node", () => {
        const node = new DagNode({type: DagNodeType.Map});
        const parentNode = new DagNode();
        node.connectToParent(parentNode, 0);

        try {
            node.disconnectFromParent(node, 0);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getNumParent()).to.equal(1);
        }
    });

    it("should disconnect from child node", () => {
        const node = new DagNode();
        const childNode = new DagNode();
        node.connectToChild(childNode);

        node.disconnectFromChild(childNode);
        expect(node.getChildren().length).to.equal(0);
    });

    it("should throw error when disconnect wrong child node", () => {
        const node = new DagNode();
        const childNode = new DagNode();
        node.connectToChild(childNode);

        try {
            node.disconnectFromChild(node);
        } catch (e) {
            expect(e).to.be.instanceof(Error);
            expect(node.getChildren().length).to.equal(1);
        }
    });

    it("should serialize correctly", () => {
        const node = new DagNode();
        const secondParentNode = new DagNode();
        const childNode = new DagNodeJoin();
        childNode.connectToParent(node);
        childNode.connectToParent(secondParentNode, 1);
        const serializable = childNode.getSerializableObj();
        expect(serializable).not.to.equal(childNode);
    });

    it("should get lineage", () => {
        const node = new DagNode();
        expect(node.getLineage()).to.be.instanceof(DagLineage);
    });

    describe("DagNodeInput.stringifyEval()", function() {
        var func;
        before(function() {
            func = DagNodeInput.stringifyEval;
        })
        it("should work if no args", function() {
            var fn = {fnName: "a", args:[]};
            expect(func(fn)).to.equal('a()');

            fn = {fnName: "a", args:[{type: "fn", fnName: "b", args: []}]};
            expect(func(fn)).to.equal('a(b())');

            fn = {fnName: "a", args:[{value: 1}, {type: "fn", fnName: "b", args: []}]};
            expect(func(fn)).to.equal('a(1,b())');
        });
        it("nested should work", function() {
            var fn = {fnName:"a", args:[{value: 1}, {value: 2}, {value: 3}]};
            expect(func(fn)).to.equal('a(1,2,3)');

            var fn = {fnName:"a", args:[{value: "1"}, {value: '2'}, {value: '"3"'}]};
            expect(func(fn)).to.equal('a(1,2,"3")');

            var fn = {fnName:"a", args:[{value: 1}, {type: "fn", fnName:"b", args:[{value: 4}, {value: 5}, {value: 6}]}, {value: 3}]};
            expect(func(fn)).to.equal('a(1,b(4,5,6),3)');

            var fn = {fnName:"a", args:[{type: "fn", fnName:"b", args:[{value: 2}, {value: 3}, {value: 4}]}, {value: 1}]};
            expect(func(fn)).to.equal('a(b(2,3,4),1)');

            var fn = {fnName:"a", args:[{type: "fn", fnName:"b", args:[{value: 2}, {type: "fn", fnName:"c", args:[{value: 3}, {value: 4}]}]}, {value: 1}]};
            expect(func(fn)).to.equal('a(b(2,c(3,4)),1)');
        });
    });

    describe("column changes", () => {
        let node;
        before(() => {
            node = new DagNode({type: DagNodeType.Map});
        });
        it("DagNode.ColumnChange ordering should work", function() {
            let called = false;
            node.registerEvents(DagNodeEvents.LineageChange, (info) => {
                called = true;
            })
            node.columnChange(DagColumnChangeType.Reorder, ["test1", "test2"]);
            expect(node.getColumnOrdering()).to.deep.equal(["test1", "test2"]);
            expect(called).to.be.true;
        });
        it("DagNode.ColumnChange resize should work", function() {
            node.columnChange(DagColumnChangeType.Resize, ["test1"], [{width: 20, sizeTo: "header", isMinimized: false}]);
            let res = node.getColumnDeltas();
            expect(res.size).to.equal(1);
            expect(res.has("test1")).to.be.true;
            expect(res.get("test1")).to.deep.equal({widthChange: {width: 20, sizeTo: "header", isMinimized: false}});
        });
        it("DagNode.ColumnChange textAlign should work", function() {
            node.columnChange(DagColumnChangeType.TextAlign, ["test1"], {alignment: "Right"});
            let res = node.getColumnDeltas();
            expect(res.size).to.equal(1);
            expect(res.has("test1")).to.be.true;
            expect(res.get("test1")).to.deep.equal({widthChange: {width: 20, sizeTo: "header", isMinimized: false}, textAlign: "Right"});
        });

        it("DagNode.ColumnChange hide should work", function() {
            node.columnChange(DagColumnChangeType.Hide, ["test1"], [{type: "string"}]);
            let res = node.getColumnDeltas();
            expect(res.size).to.equal(1);
            expect(res.has("test1")).to.be.true;
            expect(res.get("test1")).to.deep.equal({isHidden: true, type: "string"});
            expect(node.getColumnOrdering()).to.deep.equal(["test2"]);
        });

        it("DagNode.ColumnChange pull on hidden column should work", function() {
            node.columnChange(DagColumnChangeType.Pull, ["test1"]);
            let res = node.getColumnDeltas();
            expect(res.size).to.equal(0);
            expect(res.has("test1")).to.be.false;
            expect(node.getColumnOrdering()).to.deep.equal(["test2"]);
        });

        it("DagNode.ColumnChange hide and undo should work", function() {
            node = new DagNode({type: DagNodeType.Map});
            node.columnChange(DagColumnChangeType.Reorder, ["test1", "test2"]);

            // change text align and then hide
            node.columnChange(DagColumnChangeType.TextAlign, ["test1"], {alignment: "Right"});
            node.columnChange(DagColumnChangeType.Hide, ["test1"], [{type: "string"}]);
            let res = node.getColumnDeltas();
            expect(res.has("test1")).to.be.true;
            expect(res.get("test1")).to.deep.equal({isHidden: true, type: "string"});
            expect(node.getColumnOrdering()).to.deep.equal(["test2"]);

            // simulate an undo of hide
            let columnDeltas = [{textAlign: "Right", order: 0}];
            node.columnChange(DagColumnChangeType.Pull, ["test1"], columnDeltas);
            res = node.getColumnDeltas();
            expect(res.has("test1")).to.be.true;
            expect(res.get("test1")).to.deep.equal({textAlign: "Right"});
            expect(node.getColumnOrdering()).to.deep.equal(["test1", "test2"]);
        });
    });
});
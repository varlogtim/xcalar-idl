describe("Dag Node Basic Test", () => {
    it("should get id", () => {
        const node = new DagNode({id: "test"});
        expect(node.getId()).to.be.equal("test");
    });

    it("should auto generate id", () => {
        const node = new DagNode();
        expect(node.getId().startsWith("dag.")).to.be.true;
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
        const serializedChild = childNode.serialize();
        expect(serializedChild).to.equal(
            '{"type":"join","subType":null,"display":{"x":-1,"y":-1},"description":"","input":{},"id":"' +
            childNode.getId() + '","state":"unused","parents":["' + node.getId() +
            '","' + secondParentNode.getId() +'"]}'
        );
    });

    it("should get lineage", () => {
        const node = new DagNode();
        expect(node.getLineage()).to.be.instanceof(DagLineage);
    });

});
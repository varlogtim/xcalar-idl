describe("Dag Node Factory Test", () => {
    it("should deserialize a node correctly", () => {
        const node = new DagNode();
        const secondParentNode = new DagNode();
        const childNode = new DagNodeJoin();
        childNode.connectToParent(node);
        childNode.connectToParent(secondParentNode, 1);
        const serializedChild = childNode.serialize();
        const desNodeData = DagNodeFactory.deserialize(serializedChild);
        const parents = desNodeData.parents;
        expect(parents.length).to.equal(2);
        expect(parents[0]).to.equal(node.getId());
        const desNode = desNodeData.node;
        expect(desNode.getId()).to.equal(childNode.getId())
        expect(desNode.getType()).to.equal(childNode.getType());
        expect(desNode.getMaxParents()).to.equal(childNode.getMaxParents());
    });
});
describe("Dag Node Factory Test", () => {
    it("should re-create a node correctly", () => {
        const node = new DagNode();
        const secondParentNode = new DagNode();
        const childNode = new DagNodeJoin();
        childNode.connectToParent(node);
        childNode.connectToParent(secondParentNode, 1);
        const serializableNode = childNode.getSerializableObj();
        const desNode = DagNodeFactory.create(serializableNode);
        expect(desNode.getId()).to.equal(childNode.getId())
        expect(desNode.getType()).to.equal(childNode.getType());
        expect(desNode.getMaxParents()).to.equal(childNode.getMaxParents());
    });
});
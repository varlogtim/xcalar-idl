describe("Dag Graph Test", () => {
    it("should deserialize a graph correctly", () => {
        const graph = new DagGraph();
        const n1 = new DagNodeJoin();
        const n2 = new DagNodeJoin();
        graph.addNode(n1);
        graph.addNode(n2);
        graph.connect(n1.getId(),n2.getId());
        // Note: Relies on fake graph used by construct().
        const serializedGraph = graph.serialize();
        var desGraph = new DagGraph();
        expect(desGraph.deserializeDagGraph(serializedGraph)).to.be.true;
        expect(desGraph.hasNode(n1.getId())).to.be.true;
        expect(desGraph.hasNode(n2.getId())).to.be.true;
        const possibleN2 = desGraph.getNode(n2.getId());
        const parents = possibleN2.getParents();
        expect(parents).to.not.equal(undefined);
        expect(parents.length).to.equal(1);
        const parent = parents[0];
        expect(parent.getId()).to.equal(n1.getId());
    });
});
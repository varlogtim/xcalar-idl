describe("SQLOpPanelModel Test", function() {
    let model;
    let node;

    before(function() {
        node = new DagNodeSQL({});
        model = new SQLOpPanelModel(node);
    });

    it("should setDataModel", function() {
        model.setDataModel(
            "test",
            new Map(),
            true
        );

        expect(model.getSqlQueryString()).to.equal("test");
        expect(model.isDropAsYouGo()).to.be.true;
    });

    it("should setIdentifiers", function() {
        let map = new Map([[1, "test"], [2, "test2"]]);
        model.setIdentifiers(map);
        expect(model.getIdentifiers()).to.equal(map); 
    });

    it("should sumbit", function() {
        model.submit();
        expect(node.input.getInput().sqlQueryStr).to.equal("test");
    });
});
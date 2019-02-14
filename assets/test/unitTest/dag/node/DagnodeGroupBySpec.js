describe("GroupBy Dag Node Test", () => {
    let node;

    before(() => {
        node = new DagNodeGroupBy({});
    });

    it("should be an group by node", () => {
        expect(node.getType()).to.equal(DagNodeType.GroupBy);
    });

    it("should get parameter", () => {
        const param = node.getParam();
        expect(param).to.deep.equal({
            groupBy: [""],
            aggregate: [{operator: "", sourceColumn: "", destColumn: "", distinct: false, cast: null}],
            includeSample: false,
            icv: false,
            groupAll: false,
            newKeys: [],
            dhtName: "",
            joinBack: false
        });
    });

    it("should set parameter", () => {
        const testParam = {
            groupBy: ["groupOnCol"],
            aggregate: [{operator: "count", sourceColumn: "aggCol", destColumn: "count_agg", distinct: false, cast: null}],
            includeSample: true,
            icv: false,
            groupAll: false,
            newKeys: ["count_agg"],
            dhtName: "",
            joinBack: false
        };
        node.setParam(testParam);
        const param = node.getParam();
        expect(param).not.to.equal(testParam);
        expect(param).to.deep.equal(testParam);
    });
});
describe("MetaInfo Constructor Test", function() {
    var metaInfos;

    it("should have 6 attributs", function() {
        var table = new TableMeta({
            "tableId": "test",
            "tableName": "testTable"
        });

        var profile = new ProfileInfo({
            "id": "testId"
        });

        var query = new XcQuery({
            "name": "testQuery"
        });

        metaInfos = new MetaInfo({
            "TILookup": {"test": table},
            "statsCols": {"testTable": {"testCol": profile}},
            "sqlcursor": -2,
            "tablePrefix": {"testPrefix": "test"},
            "query": [query]
        });

        expect(metaInfos).to.be.an.instanceof(MetaInfo);
        expect(Object.keys(metaInfos).length).to.equal(6);
        expect(metaInfos.version).to.equal(Durable.Version);
    });

    it("should get table meta", function() {
        var tableMeta = metaInfos.getTableMeta();
        expect(tableMeta["test"]).to.exist;
    });

    it("should get stats meta", function() {
        var profileMeta = metaInfos.getStatsMeta();
        expect(profileMeta["testTable"]["testCol"]).to.exist;
    });

    it("should get log cursor meta", function() {
        expect(metaInfos.getLogCMeta()).to.equal(-2);
    });

    it("should get table prefix meta", function() {
        expect(metaInfos.getTpfxMeta()).to.have.property("testPrefix");
    });

    it("should get query meta", function() {
        var queryList = metaInfos.getQueryMeta();
        expect(queryList.length).to.equal(1);
        expect(queryList[0].name).to.equal("testQuery");
    });

    it("should serialize", function() {
        let res = metaInfos.serialize();
        let parsed = JSON.parse(res);
        let newMetaInfo = new MetaInfo(parsed);
        expect(newMetaInfo.getTableMeta()).not.to.have.property("test");
        expect(newMetaInfo.getStatsMeta()).not.to.have.property("testTable");
        expect(newMetaInfo.getLogCMeta()).not.to.equal(-2);
        expect(newMetaInfo.getTpfxMeta()).not.to.have.property("testPrefix");

        var queryList = newMetaInfo.getQueryMeta();
        if (queryList.length > 0) {
            expect(queryList[0].name).not.to.equal("testQuery");
        }
    });
});
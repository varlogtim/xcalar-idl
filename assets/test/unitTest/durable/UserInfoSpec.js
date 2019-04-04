describe("UserInfo Constructor Test", function() {
    var userInfos;

    before(function() {
        userInfos = new UserInfo();
    });

    it("Should have 3 attributes", function() {
        var userPref = new UserPref({
            "datasetListView": true
        });

        userInfos = new UserInfo({
            "gDSObj": "testDS",
            "userpreference": userPref
        });

        expect(userInfos).to.be.an.instanceof(UserInfo);
        expect(Object.keys(userInfos).length).to.equal(3);
        expect(userInfos.version).to.equal(Durable.Version);
        expect(userInfos.gDSObj).to.exist;
        expect(userInfos.userpreference).to.exist;
    });


    it("Should get pref info", function() {
        expect(userInfos.getPrefInfo().datasetListView).to.equal(true);
    });

    it("Should get ds info", function() {
        expect(userInfos.getDSInfo()).to.equal("testDS");
    });

    it("Should update info", function() {
        userInfos.update();

        expect(userInfos.getPrefInfo().datasetListView)
        .not.to.equal(true);
        expect(userInfos.getDSInfo()).not.to.equal("testDS");
    });
});
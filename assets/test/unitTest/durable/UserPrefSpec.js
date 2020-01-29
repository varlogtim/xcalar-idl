describe("UserPref Constructor Test", function() {
    it("should have 14 attributes", function() {
        var userPref = new UserPref();

        expect(userPref).to.be.an.instanceof(UserPref);
        expect(Object.keys(userPref).length).to.equal(14);
        expect(userPref).to.have.property("version")
        .and.to.equal(Durable.Version);
        expect(userPref).to.have.property("datasetListView")
        .and.to.be.false;
        expect(userPref).to.have.property("browserListView")
        .and.to.be.false;
        expect(userPref).to.have.property("logCollapsed")
        .and.to.be.false;
        expect(userPref).to.have.property("general").and.to.be.empty;
        expect(userPref).to.have.property("dsSortKey").and.to.be.undefined;
        expect(userPref).to.have.property("dfAutoExecute").and.to.be.true;
        expect(userPref).to.have.property("dfAutoPreview").and.to.be.true;
        expect(userPref).to.have.property("dfProgressTips").and.to.be.true;
        expect(userPref).to.have.property("dfConfigInfo").and.to.be.true;
    });

    it("should update attribute", function() {
        var datasetListView = !$("#dataViewBtn").hasClass("listView");
        var userPref = new UserPref({
            "datasetListView": datasetListView
        });

        userPref.update();
        expect(userPref.datasetListView).not.to.equal(datasetListView);
    });
});
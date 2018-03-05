describe("JupyterFinalizeModal Test", function() {
    var $modal;
    var tableId;
    var tableName;

    before(function() {
        $modal = $("#jupyterFinalizeModal");
        UnitTest.onMinMode();

        // create some fake tables and fake columns
        var progCol1 = new ProgCol({
            "name": "testCol",
            "backName": "testCol",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var progCol2 = new ProgCol({
            "name": "testCol2",
            "backName": "prefix::testCol2",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var progCol3 = new ProgCol({
            "name": "testCol2",
            "backName": "prefix2::testCol2",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });

        var progCol4 = new ProgCol({
            "name": "DATA",
            "backName": "DATA",
            "isNewCol": false,
            "func": {
                "name": "raw"
            }
        });

        tableName = "fakeTable#zz999";
        tableId = "zz999";
        var table = new TableMeta({
            "tableId": tableId,
            "tableName": tableName,
            "status": TableType.Active,
            "tableCols": [progCol1, progCol2, progCol3, progCol4]
        });
        gTables[tableId] = table;

    });

    describe("basic test", function() {
        it ("modal should show", function() {
            JupyterFinalizeModal.show(tableId, 20);
            expect($modal.is(":visible")).to.be.true;
            expect($modal.find(".leftSide .column").length).to.equal(3);
            expect($modal.find(".leftSide .column").eq(0).text()).to.equal("testCol");
            expect($modal.find(".leftSide .column").eq(1).text()).to.equal("prefix::testCol2");
            expect($modal.find(".leftSide .column").eq(2).text()).to.equal("prefix2::testCol2");

            expect($modal.find(".rightSide .column").length).to.equal(3);
            expect($modal.find(".rightSide .column input").eq(0).val()).to.equal("testCol");
            expect($modal.find(".rightSide .column input").eq(1).val()).to.equal("testCol2");
            expect($modal.find(".rightSide .column input").eq(2).val()).to.equal("testCol21");
            expect($modal.find(".column .readonly").length).to.equal(0);
            $modal.find(".close").click();
        });

        it ("array should be read only", function() {
            gTables[tableId].tableCols[2] = new ProgCol({
                "name": "test3",
                "backName": "test3",
                "isNewCol": false,
                "type": "array",
                "func": {
                    "name": "pull"
                }
            });

            JupyterFinalizeModal.show(tableId, 20);

            expect($modal.is(":visible")).to.be.true;
            expect($modal.find(".leftSide .column").length).to.equal(3);
            expect($modal.find(".leftSide .column").eq(0).text()).to.equal("testCol");
            expect($modal.find(".leftSide .column").eq(1).text()).to.equal("prefix::testCol2");
            expect($modal.find(".leftSide .column").eq(2).text()).to.equal("test3");

            expect($modal.find(".rightSide .column").length).to.equal(3);
            expect($modal.find(".rightSide .column input").eq(0).val()).to.equal("testCol");
            expect($modal.find(".rightSide .column input").eq(1).val()).to.equal("testCol2");
            expect($modal.find(".rightSide .column input").eq(2).val()).to.equal("test3");
            expect($modal.find(".column .readonly").length).to.equal(1);
            expect($modal.find(".rightSide .column input").eq(2).hasClass("readonly")).to.be.true;
            $modal.find(".close").click();
        });

        it("submit with no changes should not map columns", function() {
            var mapCalled = false;
            var jupCalled = false;
            var mapCache = XIApi.map;
            XIApi.map = function() {
                mapCalled = true;
            };
            var jupCache = JupyterPanel.publishTable;
            JupyterPanel.publishTable = function(tName, num, hasVerifiedNames) {
                expect(tName).to.equal("fakeTable#zz999");
                expect(num).to.equal(20);
                expect(hasVerifiedNames).to.be.true;
                jupCalled = true;
            };

            var progCol1 = new ProgCol({
                "name": "testCol",
                "backName": "testCol",
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var progCol2 = new ProgCol({
                "name": "DATA",
                "backName": "DATA",
                "isNewCol": false,
                "func": {
                    "name": "raw"
                }
            });

            tableName = "fakeTable#zz999";
            tableId = "zz999";
            var table = new TableMeta({
                "tableId": tableId,
                "tableName": tableName,
                "status": TableType.Active,
                "tableCols": [progCol1, progCol2]
            });
            gTables[tableId] = table;

            JupyterFinalizeModal.show(tableId, 20);
            expect($modal.find(".confirm").length).to.equal(1);
            $modal.find(".confirm").click();

            expect(mapCalled).to.be.false;
            expect(jupCalled).to.be.true;

            XIApi.map = mapCache;
            JupyterPanel.publishTable = jupCache;
        });

        it("submit with duplicate names should fail", function() {
            var mapCalled = false;
            var jupCalled = false;
            var mapCache = XIApi.map;
            XIApi.map = function() {
                mapCalled = true;
            };
            var jupCache = JupyterPanel.publishTable;
            JupyterPanel.publishTable = function(tName, num, hasVerifiedNames) {
                jupCalled = true;
            };

            var progCol1 = new ProgCol({
                "name": "testCol",
                "backName": "testCol",
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var progCol2 = new ProgCol({
                "name": "testCol2",
                "backName": "testCol2",
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var progCol3 = new ProgCol({
                "name": "DATA",
                "backName": "DATA",
                "isNewCol": false,
                "func": {
                    "name": "raw"
                }
            });

            tableName = "fakeTable#zz999";
            tableId = "zz999";
            var table = new TableMeta({
                "tableId": tableId,
                "tableName": tableName,
                "status": TableType.Active,
                "tableCols": [progCol1, progCol2, progCol3]
            });
            gTables[tableId] = table;

            JupyterFinalizeModal.show(tableId, 20);
            $modal.find(".rightSide .column input").last().val("testCol");
            expect($modal.find(".confirm").length).to.equal(1);
            $modal.find(".confirm").click();

            UnitTest.hasStatusBoxWithError(ErrTStr.DuplicateColNames);


            expect(mapCalled).to.be.false;
            expect(jupCalled).to.be.false;

            XIApi.map = mapCache;
            JupyterPanel.publishTable = jupCache;
        });

        it("submit with invalid name should fail", function() {
            var mapCalled = false;
            var jupCalled = false;
            var mapCache = XIApi.map;
            XIApi.map = function() {
                mapCalled = true;
            };
            var jupCache = JupyterPanel.publishTable;
            JupyterPanel.publishTable = function(tName, num, hasVerifiedNames) {
                jupCalled = true;
            };

            $modal.find(".rightSide .column input").last().val("test::test");
            $modal.find(".confirm").click();

            UnitTest.hasStatusBoxWithError(ColTStr.ColNameInvalidCharSpace);

            expect(mapCalled).to.be.false;
            expect(jupCalled).to.be.false;

            XIApi.map = mapCache;
            JupyterPanel.publishTable = jupCache;
        });

        it("submit with rename should work", function() {
            var mapCalled = false;
            var jupCalled = false;
            var mapCache = XIApi.map;
            XIApi.map = function() {
                mapCalled = true;
                return PromiseHelper.resolve("x#1234");
            };
            var jupCache = JupyterPanel.publishTable;
            JupyterPanel.publishTable = function(tName, num, hasVerifiedNames) {
                expect(tName).to.equal("x#1234");
                expect(num).to.equal(20);
                expect(hasVerifiedNames).to.be.true;
                jupCalled = true;
            };

            $modal.find(".rightSide .column input").last().val("testCol3");
            $modal.find(".confirm").click();

            expect(mapCalled).to.be.true;
            expect(jupCalled).to.be.true;

            XIApi.map = mapCache;
            JupyterPanel.publishTable = jupCache;
        });
    });


    after(function() {
        $modal.find(".close").click();
        UnitTest.offMinMode();
        delete gTables[tableId];
    });
});
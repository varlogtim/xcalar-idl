describe("Delete Table Modal Test", function() {
    var oldGetTables;

    before(function() {
        UnitTest.onMinMode();
        oldGetTables = XcalarGetTables;
        // fake the thrift call
        XcalarGetTables = function() {
            var nodeInfo = [{
                "name": "unitTest1#tt1",
                "size": 123
            }, {
                "name": "unitTest2#tt2",
                "size": 123456
            }];

            return PromiseHelper.resolve({
                "numNodes": 2,
                "nodeInfo": nodeInfo
            });
        };
    });

    describe("Basic Functoin Test", function() {
        it("getListSection should work", function() {
            var getListSection = DeleteTableModal.__testOnly__.getListSection;
            var $container = getListSection(TableType.Orphan);
            expect($container.attr("id"))
            .to.equal("deleteTableModal-orphan");

            var testCases = [{
                "type": TableType.Orphan,
                "id": "deleteTableModal-orphan"
            }, {
                "type": TableType.Archived,
                "id": "deleteTableModal-archived"
            }, {
                "type": TableType.Active,
                "id": "deleteTableModal-active"
            }, {
                "type": "error type",
                "id": "deleteTableModal-active"
            }, {
                "type": null,
                "id": "deleteTableModal-active"
            }];

            testCases.forEach(function(test) {
                var $container = getListSection(test.type);
                expect($container.attr("id"))
                .to.equal(test.id);
            });
        });

        it("getTableListHTMl should work", function() {
            var tableName = "test#tt1";
            var table = new TableMeta({
                "tableName": tableName,
                "tableId": "tt1"
            });

            var res = DeleteTableModal.__testOnly__.getTableListHTML([table]);
            expect(res).to.contain(tableName);
        });

        it("getTableSizeMap should work", function(done) {
            DeleteTableModal.__testOnly__.getTableSizeMap()
            .then(function(sizeMap) {
                expect(sizeMap).to.be.an("object");
                expect(sizeMap).to.have.ownProperty("unitTest1#tt1");
                expect(sizeMap["unitTest1#tt1"]).to.equal(123);
                expect(sizeMap["unitTest2#tt2"]).to.equal(123456);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("hasCheckedTables should work", function() {
            var res = DeleteTableModal.__testOnly__.hasCheckedTables();
            expect(res).to.equal(false);
        });
    });

    describe("Public Api and Behavior Test", function() {
        var $modal;
        var $orphanSection;
        var $alertModal;
        var oldDelete;

        before(function() {
            $modal = $("#deleteTableModal");
            $orphanSection = $("#deleteTableModal-orphan");
            $alertModal = $("#alertModal");
            oldDelete = TblManager.deleteTables;
        });

        it("Should show the modal", function(done) {
            DeleteTableModal.show()
            .then(function() {
                assert.isTrue($modal.is(":visible"));
                expect($orphanSection.find(".grid-unit").length)
                .to.equal(2);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("show modal again should have no side effect", function(done) {
            DeleteTableModal.show()
            .then(function() {
                assert.isTrue($modal.is(":visible"));
                expect($orphanSection.find(".grid-unit").length)
                .to.equal(2);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should toggle checok box", function() {
            var $grid = $orphanSection.find(".grid-unit").eq(0);
            var $checkbox = $grid.find(".checkbox");
            expect($checkbox.hasClass("checked")).to.be.false;
            // check
            $grid.click();
            expect($checkbox.hasClass("checked")).to.be.true;
            // toggle back
            $grid.click();
            expect($checkbox.hasClass("checked")).to.be.false;
        });

        it("Should toggle check of the whole section", function() {
            var $checkbox = $orphanSection.find(".titleSection .checkboxSection");
            expect($orphanSection.find(".checked").length).to.equal(0);
            $checkbox.click();
            // 2 on grid-unit and 1 on title
            expect($orphanSection.find(".checked").length).to.equal(3);
            // toggle back
            $checkbox.click();
            expect($orphanSection.find(".checked").length).to.equal(0);
        });

        it("Should sory by name", function() {
            var $nameTitle = $orphanSection.find(".title.name");
            expect($nameTitle.hasClass("active")).to.be.false;
            var $grid = $orphanSection.find(".grid-unit").eq(0);
            expect($grid.find(".name").text()).to.equal("unitTest1#tt1");

            // reverse sort
            $nameTitle.find(".label").click();
            expect($nameTitle.hasClass("active")).to.be.true;
            $grid = $orphanSection.find(".grid-unit").eq(0);
            expect($grid.find(".name").text()).to.equal("unitTest2#tt2");
        });

        it("Should sort by size", function() {
            var $sizeTitle = $orphanSection.find('.title[data-sortkey="size"]');
            expect($sizeTitle.hasClass("active")).to.be.false;
            // ascending sort
            $sizeTitle.find(".label").click();
            expect($sizeTitle.hasClass("active")).to.be.true;
            var $grid = $orphanSection.find(".grid-unit").eq(0);
            expect($grid.find(".name").text()).to.equal("unitTest1#tt1");
            // descending sort
            $sizeTitle.find(".label").click();
            expect($sizeTitle.hasClass("active")).to.be.true;
            $grid = $orphanSection.find(".grid-unit").eq(0);
            expect($grid.find(".name").text()).to.equal("unitTest2#tt2");
        });

        it("Should sort by date", function() {
            // their date is unkown
            var $dateTitle = $orphanSection.find('.title[data-sortkey="date"]');
            expect($dateTitle.hasClass("active")).to.be.false;
            // ascending sort
            $dateTitle.find(".label").click();
            expect($dateTitle.hasClass("active")).to.be.true;
            var $grid = $orphanSection.find(".grid-unit").eq(0);
            expect($grid.find(".name").text()).to.equal("unitTest1#tt1");
            // descending sort
            $dateTitle.find(".label").click();
            expect($dateTitle.hasClass("active")).to.be.true;
            $grid = $orphanSection.find(".grid-unit").eq(0);
            expect($grid.find(".name").text()).to.equal("unitTest2#tt2");
        });

        it("Should keep checkbox when sort", function() {
            var $grid = $orphanSection.find(".grid-unit").eq(0);
            $grid.click();
            var name = $grid.find(".name").text();
            expect($grid.find(".checkbox").hasClass("checked")).to.be.true;
            // sort by name
            $orphanSection.find(".title.name").click();
            $checkbox = $orphanSection.find(".checked");
            expect($checkbox.length).to.equal(1);
            // verify it's the same grid
            var $sameGrid = $checkbox.closest(".grid-unit");
            expect($sameGrid.find(".name").text()).to.equal(name);
        });

        it("Should show alert when submit", function() {
            $modal.find(".confirm").click();
            assert.isTrue($alertModal.is(":visible"));

            $alertModal.find(".cancel").click();
            assert.isFalse($alertModal.is(":visible"));
        });

        it("Should handle submit error", function() {
            TblManager.deleteTables = function() {
                return PromiseHelper.reject({"fails": [{
                    "tables": "unitTest1#tt1",
                    "error": "test"
                }]});
            };

            $modal.find(".confirm").click();
            assert.isTrue($alertModal.is(":visible"));
            $alertModal.find(".confirm").click();
            assert.isFalse($alertModal.is(":visible"));

            assert.isTrue($("#statusBox").is(":visible"));
            expect($orphanSection.find(".checked").length).to.eq(0);
            StatusBox.forceHide();
        });

        it("Should submit form", function() {
            TblManager.deleteTables = function() {
                return PromiseHelper.resolve();
            };

            $orphanSection.find(".grid-unit").eq(0).click();
            expect($orphanSection.find(".checked").length).to.eq(1);
            $modal.find(".confirm").click();
            assert.isTrue($alertModal.is(":visible"));
            $alertModal.find(".confirm").click();
            assert.isFalse($alertModal.is(":visible"));
        });

        it("Should close the modal", function() {
            $modal.find(".cancel").click();
            assert.isFalse($modal.is(":visible"));
        });

        after(function() {
            TblManager.deleteTables = oldDelete;
        });
    });

    describe('failHandler test error messages', function() {
        var fn;
        before(function() {
            fn = DeleteTableModal.__testOnly__.failHandler;
            StatusBox.forceHide();
        });

        it('1 regular fail, 1 locked fail', function() {
            fn(["fakeTable"]);
            expect($("#statusBox").is(":visible")).to.be.false;

            fn([{"fails": [
                {"tables": "unitTest1#tt1","error": "test"},
                {"tables": "unitTest1#tt1","error": ErrTStr.CannotDropLocked}
                ]}]);

            UnitTest.hasStatusBoxWithError("test. No tables were deleted.");
        });

        it('1 success, 1 regular fail, 1 locked fail', function() {
            fn([["fakeTable"], {"fails": [
                {"tables": "unitTest1#tt1","error": "test"},
                {"tables": "unitTest1#tt1","error": ErrTStr.CannotDropLocked}
                ]}]);

            UnitTest.hasStatusBoxWithError("test. Some tables could not be deleted.");
        });

        it('1 success, 1 locked fail', function() {
            fn([["fakeTable"], {"fails": [
                {"tables": "unitTest1#tt1","error": ErrTStr.CannotDropLocked}
                ]}]);

            UnitTest.hasStatusBoxWithError("Cannot drop locked tables. Table unitTest1#tt1 was not deleted.");
        });
    });

    after(function() {
        UnitTest.offMinMode();
        XcalarGetTables = oldGetTables;
    });
});
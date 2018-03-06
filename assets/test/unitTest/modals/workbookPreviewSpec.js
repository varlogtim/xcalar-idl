describe("Workbook Preview Test", function() {
    var oldGetTables;
    var oldGetMeta;
    var oldGetDag;
    var workbookId;
    var $workbookPreview;

    before(function() {
        UnitTest.onMinMode();
        workbookId = WorkbookManager.getActiveWKBK();
        $workbookPreview = $("#workbookPreview");

        oldGetTables = XcalarGetTables;
        oldGetMeta = KVStore.getAndParse;
        oldGetDag = XcalarGetDag;

        XcalarGetTables = function() {
            return PromiseHelper.resolve({
                nodeInfo: [{
                    name: "test1#ab1",
                    size: 2000
                }, {
                    name: "test2#ab2",
                    size: 1000
                }]
            })
        };

        KVStore.getAndParse = function() {
            return PromiseHelper.resolve({
                TILookup: {
                    ab1: {
                        tableName: "test1#ab1",
                        tableId: "#ab1",
                        status: "active"
                    },
                    ab2: {
                        tableName: "test2#ab2",
                        tableId: "#ab2",
                        status: "orphaned"
                    }
                },
                worksheets: {
                    wsInfos: {
                        testWSId1: {
                            name: "testWorksheet1",
                            tables: ["ab2"]
                        },
                        testWSId2: {
                            name: "testWorksheet2",
                            tables: ["ab1"]
                        }
                    }
                }
            });
        };

        XcalarGetDag = function() {
            return PromiseHelper.reject("test error");
        };
    });

    describe("Basic Test", function() {
        it("should show preview", function(done) {
            WorkbookPreview.show(workbookId)
            .then(function() {
                assert.isTrue($workbookPreview.is(":visible"));
                // have 2 lists
                expect($workbookPreview.find(".listSection .grid-unit").length)
                .to.equal(2);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should close preview", function() {
            $workbookPreview.find(".close").click();
            assert.isFalse($workbookPreview.is(":visible"));
        });
    });

    describe("Sort Test", function() {
        before(function(done) {
            WorkbookPreview.show(workbookId)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should sort by name", function() {
            var $name = $workbookPreview.find(".titleSection .name");
            var $listSection = $workbookPreview.find(".listSection");

            $name.find(".label").click();
            expect($listSection.find(".grid-unit:first-child .name").text())
            .to.equal("test1#ab1");
            expect($name.hasClass("active")).to.be.true;

            // reverse
            $name.find(".label").click();
            expect($listSection.find(".grid-unit:first-child .name").text())
            .to.equal("test2#ab2");
            expect($name.hasClass("active")).to.be.true;
        });

        it("should sort by size", function() {
            var $size = $workbookPreview.find(".titleSection .size");
            var $listSection = $workbookPreview.find(".listSection");

            $size.find(".label").click();
            expect($listSection.find(".grid-unit:first-child .name").text())
            .to.equal("test2#ab2");
            expect($size.hasClass("active")).to.be.true;

            // reverse
            $size.find(".label").click();
            expect($listSection.find(".grid-unit:first-child .name").text())
            .to.equal("test1#ab1");
            expect($size.hasClass("active")).to.be.true;
        });

        it("should sort by status", function() {
            var $status = $workbookPreview.find(".titleSection .status");
            var $listSection = $workbookPreview.find(".listSection");

            $status.find(".label").click();
            expect($listSection.find(".grid-unit:first-child .name").text())
            .to.equal("test1#ab1");
            expect($status.hasClass("active")).to.be.true;

            // reverse
            $status.find(".label").click();
            expect($listSection.find(".grid-unit:first-child .name").text())
            .to.equal("test2#ab2");
            expect($status.hasClass("active")).to.be.true;
        });

        it("should sort by worksheets", function() {
            var $worksheet = $workbookPreview.find(".titleSection .worksheet");
            var $listSection = $workbookPreview.find(".listSection");

            $worksheet.find(".label").click();
            expect($listSection.find(".grid-unit:first-child .name").text())
            .to.equal("test2#ab2");
            expect($worksheet.hasClass("active")).to.be.true;

            // reverse
            $worksheet.find(".label").click();
            expect($listSection.find(".grid-unit:first-child .name").text())
            .to.equal("test1#ab1");
            expect($worksheet.hasClass("active")).to.be.true;
        });

        after(function() {
            $workbookPreview.find(".close").click();
        });
    });

    describe("View Dag Test", function() {
        before(function(done) {
            WorkbookPreview.show(workbookId)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should view dag", function() {
            $workbookPreview.find(".listSection .view").eq(0).click();
            expect($workbookPreview.hasClass("dagMode")).to.be.true;
            expect($workbookPreview.find(".dagWrap").eq(0).text())
            .to.equal(DFTStr.DFDrawError);
        });

        it("should close dag", function() {
            $workbookPreview.find(".back").click();
            expect($workbookPreview.hasClass("dagMode")).to.be.false;
        });

        after(function() {
            $workbookPreview.find(".close").click();
        });
    });

    describe("error case test", function() {
        afterEach(function() {
            $workbookPreview.find(".close").click();
        });

        it("should handle error case", function(done) {
            var oldFunc = XcalarGetTables;
            XcalarGetTables = function() {
                return PromiseHelper.reject("test");
            };

            WorkbookPreview.show(workbookId)
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("test");
                expect($workbookPreview.hasClass("error")).to.be.true;
                done();
            })
            .always(function() {
                XcalarGetTables = oldFunc;
            });
        });

        it("should handle kvStore error sliently", function(done) {
            var oldFunc = KVStore.getAndParse;
            KVStore.getAndParse = function() {
                return PromiseHelper.resolve(null);
            };

            WorkbookPreview.show(workbookId)
            .then(function() {
                expect($workbookPreview.hasClass("error")).to.be.false;
                done();
            })
            .fail(function(error) {
                done("fail");
            })
            .always(function() {
                KVStore.getAndParse = oldFunc;
            });
        });

        it("should handle kvStore error sliently case2", function(done) {
            var oldFunc = KVStore.getAndParse;
            KVStore.getAndParse = function() {
                return PromiseHelper.reject("test");
            };

            WorkbookPreview.show(workbookId)
            .then(function() {
                expect($workbookPreview.hasClass("error")).to.be.false;
                done();
            })
            .fail(function(error) {
                done("fail");
            })
            .always(function() {
                KVStore.getAndParse = oldFunc;
            });
        });

        it("should handle no ws meta case", function(done) {
            var oldFunc = KVStore.getAndParse;
            KVStore.getAndParse = function() {
                return PromiseHelper.resolve({
                    TILookup: {
                        ab1: {
                            tableName: "test1#ab1",
                            tableId: "#ab1",
                            status: "active"
                        },
                        ab2: {
                            tableName: "test2#ab2",
                            tableId: "#ab2",
                            status: "orphaned"
                        }
                    },
                });
            };

            WorkbookPreview.show(workbookId)
            .then(function() {
                expect($workbookPreview.hasClass("error")).to.be.false;
                var $listSection = $workbookPreview.find(".listSection");
                expect($listSection.find(".grid-unit:first-child .worksheet").text())
                .to.equal("--");
                done();
            })
            .fail(function(error) {
                done("fail");
            })
            .always(function() {
                KVStore.getAndParse = oldFunc;
            });
        })
    });

    after(function() {
        XcalarGetTables = oldGetTables;
        KVStore.getAndParse = oldGetMeta;
        XcalarGetDag = oldGetDag;
        UnitTest.offMinMode();
    });
});
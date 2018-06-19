describe('IMD Test', function() {
    // XXX tests are very general and need to test more edge cases
    var $imdPanel;
    var startTime;
    var cacheActive;
    var cacheKV;
    before(function() {
        $imdPanel = $("#imdView");
        startTime = Math.round(Date.now() / 1000);
        cacheActive = IMDPanel.active;
        IMDPanel.active = function(){};
        MainMenu.openPanel("workspacePanel", "imdButton");
        cacheKV = XcalarKeyLookup;
        XcalarKeyLookup = function(key) {
            var testKey = KVStore.getKey("gIMDKey");
            if (testKey === key) {
                return PromiseHelper.resolve({value: JSON.stringify({hiddenTables: []})});
            } else {
                return cacheKV.apply(this, arguments);
            }
        }
    });

    describe("active and inactive test", function() {
        it("activate should work", function(done) {
            IMDPanel.active = cacheActive;
            var cachedFn = XcalarListPublishedTables;
            var called = false;
            XcalarListPublishedTables = function() {
                called = true;
                return PromiseHelper.reject({error: "testError"});
            };
            expect($imdPanel.find("#modalWaitingBG").length).to.equal(0);
            IMDPanel.active(true);
            expect($imdPanel.find("#modalWaitingBG").length).to.equal(1);
            expect(called).to.be.true;
            UnitTest.hasAlertWithText("testError");
            setTimeout(function() {
                XcalarListPublishedTables = cachedFn;
                done();
            });
        });

        it("inActivate should work and hideupdateprompt", function() {
            $imdPanel.find(".update-prompt").removeClass("xc-hidden");
            expect($imdPanel.find(".update-prompt").hasClass("xc-hidden")).to.be.false;
            IMDPanel.__testOnly__.setSelectedCells({unittest: true});
            expect(Object.keys(IMDPanel.__testOnly__.getSelectedCells()).length).to.equal(1);
            expect(IMDPanel.__testOnly__.getSelectedCells().unittest).to.equal(true);
            IMDPanel.inActive();
            expect($imdPanel.find(".update-prompt").hasClass("xc-hidden")).to.be.true;
            expect(Object.keys(IMDPanel.__testOnly__.getSelectedCells()).length).to.equal(0);
        });

        after(function() {
            IMDPanel.active();
        });
    });

    describe("list functions", function() {
        it("listTablesFirstTime should work", function(done) {
            var fnCache = XcalarListPublishedTables;
            var table2 =  {
                active: false,
                name: "test2",
                keys: [],
                updates: [
                    {batchId: 1, numRows:12, source:"source1b", startTS: startTime},
                    {batchId: 0, numRows:12, source:"source0b", startTS: startTime - 7200}
                ],
                values: [{name: "testCol", type: 0}],
                oldestBatchId: 0
            };
            XcalarListPublishedTables = function() {
                return PromiseHelper.resolve({
                    tables: [
                        {
                            active: true,
                            name: "test1",
                            keys: [],
                            updates: [
                                {batchId: 2, numRows:12, source:"source2a", startTS: startTime},
                                {batchId: 1, numRows:12, source:"source1a", startTS: startTime - 3600},
                                {batchId: 0, numRows:12, source:"source0a", startTS: startTime - 7200}
                            ],
                            oldestBatchId: 0,
                            values: [{name: "testCol", type: 0}]
                        },
                        table2
                    ]
                });
            };

            var fnCache2 = XcalarRestoreTable;
            XcalarRestoreTable = function() {
                table2.active = true;
                return PromiseHelper.resolve();
            }

            expect($imdPanel.find(".tableDetailSection").hasClass("active")).to.be.false;
            expect($imdPanel.find(".tableDetailSection .tableName").text()).to.equal("");

            IMDPanel.__testOnly__.listTablesFirstTime()
            .then(function() {
                var tables = IMDPanel.__testOnly__.getTables();
                expect(tables.pTables.length).to.equal(2);
                expect(tables.hTables.length).to.equal(0);
                expect($imdPanel.find(".activeTablesList .tableListItem").length).to.equal(2);
                expect($imdPanel.find(".tableListItem .tableListLeft").eq(0).text().trim()).to.equal("test1");
                expect($imdPanel.find(".tableListItem .tableListHist").eq(0).text().trim().slice(-2)).to.equal("10");
                expect($imdPanel.find(".hiddenTablesList .tableListItem").length).to.equal(0);
                expect($imdPanel.find(".tableDetailSection .tableName").text().trim()).to.equal("test1:");
                expect($imdPanel.find(".tableDetailSection").hasClass("active")).to.be.true;
                expect($imdPanel.find(".tableDetailSection .tableDetailContent .tableDetailRow").length).to.equal(3);
                XcalarListPublishedTables = fnCache;
                XcalarRestoreTable = fnCache2;
                done();
            })
            .fail(function() {
                done('failed');
            });
        });

        it("listAndCheckActive cancel should work", function(done) {
            var cache1 = XcalarListPublishedTables;
            XcalarListPublishedTables = function() {
                return PromiseHelper.resolve({tables: [{active: false, name: "one"}, {active: false, name: "two"}]});
            };
            var cache2 = XcalarRestoreTable;
            XcalarRestoreTable = function() {
                var pState = IMDPanel.__testOnly__.getProgressState();
                pState.canceled = true;
                return PromiseHelper.reject({error: "canceled", count: 0});
            };

            var called = false;
            var cache3 = XcalarUnpublishTable;
            XcalarUnpublishTable = function() {
                called = true;
                XcalarListPublishedTables = function() {
                    return PromiseHelper.reject();
                };
                return PromiseHelper.reject();
            };

            IMDPanel.__testOnly__.listAndCheckActive()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(called).to.be.true;
                XcalarListPublishedTables = cache1;
                XcalarRestoreTable = cache2;
                XcalarUnpublishTable = cache3;
                done();
            });
        });

        it("listAndCheckActive fail should work", function(done) {
            var cache1 = XcalarListPublishedTables;
            XcalarListPublishedTables = function() {
                return PromiseHelper.resolve({tables: [{active: false, name: "one"}]});
            };
            var cache2 = XcalarRestoreTable;
            XcalarRestoreTable = function() {
                return PromiseHelper.reject({error: "other error"});
            };

            var called = false;
            var cache3 = XcalarUnpublishTable;
            XcalarUnpublishTable = function() {
                called = true;
                return PromiseHelper.reject();
            };
            IMDPanel.__testOnly__.listAndCheckActive()
            .then(function() {
                expect(called).to.be.false;
                XcalarListPublishedTables = cache1;
                XcalarRestoreTable = cache2;
                XcalarUnpublishTable = cache3;
                done();
            })
            .fail(function() {

                done("fail");
            });
        });

        it("input times should be correct", function() {
            var range = 7200 * 1.02;
            var leftTime = new Date((startTime - range) * 1000);

            var expectedDate = moment(leftTime).format("l");
            var expectedTime = moment(leftTime).format("hh : mm A");

            expect($("#imdFromInput").val()).to.equal(expectedDate);
            expect($("#imdBar .fromTimeArea .timePickerBox").val()).to.equal(expectedTime);
        });
    });

    describe("canvas time tip", function() {

        it("mousemove on left canvas should work", function() {
            var $tipBox = $imdPanel.find(".date-tipbox");
            expect($tipBox.is(":visible")).to.be.false;
            expect($imdPanel.find(".dateTipLine").is(":visible")).to.be.false;
            var e = {type: "mousemove", offsetX: 0};
            $imdPanel.find("canvas").trigger(e);
            expect($tipBox.is(":visible")).to.be.true;
            expect($imdPanel.find(".dateTipLine").is(":visible")).to.be.true;
            expect($tipBox.css("left")).to.equal("189px");
            var range = 7200 * 1.02;
            var leftTime = new Date((startTime - range) * 1000);
            var timeText = moment(leftTime).format("MMMM Do YYYY, h:mm");
            expect($tipBox.text().indexOf(timeText)).to.equal(0);
        });

        it("mousemove on right canvas should work", function() {
            var $tipBox = $imdPanel.find(".date-tipbox");
            var e = {type: "mousemove", offsetX: $imdPanel.find("canvas").width()};
            $imdPanel.find("canvas").trigger(e);

            var position = 190 + $imdPanel.find("canvas").width();
            expect(parseInt($tipBox.css("left"))).to.be.gt(position - 100);
            expect(parseInt($tipBox.css("left"))).to.be.lt(position);

            var ruler = IMDPanel.__testOnly__.getRuler();
            var rightTime = (($imdPanel.find("canvas").width() + ruler.visibleLeft) * ruler.pixelToTime) + ruler.minTS;

            var timeText = moment(rightTime * 1000).format("MMMM Do YYYY, h:mm");
            expect($tipBox.text().indexOf(timeText)).to.equal(0);
        });

        it("mouseleave should work", function() {
            var $tipBox = $imdPanel.find(".date-tipbox");
            expect($tipBox.is(":visible")).to.be.true;
            expect($imdPanel.find(".dateTipLine").is(":visible")).to.be.true;

            var e = {type: "mouseleave"};
            $imdPanel.find("canvas").trigger(e);

            expect($tipBox.is(":visible")).to.be.false;
            expect($imdPanel.find(".dateTipLine").is(":visible")).to.be.false;
        });
    });

    describe("time inputs", function() {
        it("test date should work", function(){
            expect(IMDPanel.__testOnly__.testDate("5/42/2018")).to.be.false;
        });

        it("blur should hide datePicker", function() {
            $("#imdFromInput").trigger("focus").focus();
            $imdPanel.find(".datePickerPart").eq(0).addClass("active");
            $("#imdFromInput").trigger("blur").blur();
            expect( $imdPanel.find(".datePickerPart").eq(0).hasClass("active")).to.be.false;
        });
        it("update time inputs should work", function() {
            IMDPanel.__testOnly__.updateTimeInputs();
            // XXX need to implement
        });
        it("checkDate should work", function() {
            var cache1 = $("#imdFromInput").attr("id", "imdFromInputTemp");
            $("body").append('<input id="imdFromInput">');
            // var cache2 = $("#imdToInput").datepicker;
            $("#imdFromInput").datepicker = function() {
                return null;
            }

            expect(IMDPanel.__testOnly__.checkDateChange()).to.be.false;
            $("#imdFromInput").remove();
            $("#imdFromInputTemp").attr("id", "imdFromInput");

            var cacheTime = $("#imdBar").find(".fromTimeArea .timePickerBox").val();
            $("#imdBar").find(".fromTimeArea .timePickerBox").val("0");
            expect(IMDPanel.__testOnly__.checkDateChange()).to.be.false;
            $("#imdBar").find(".fromTimeArea .timePickerBox").val(cacheTime);

            $("#imdBar").find(".fromTimeArea .timePickerBox").val("1");
            expect(IMDPanel.__testOnly__.checkDateChange()).to.be.false;
            $("#imdBar").find(".fromTimeArea .timePickerBox").val(cacheTime);
        });

        it("onClose should work", function() {
            var prevFromTime = IMDPanel.__testOnly__.getPrevTimes().prevFromTime;
            var prevVal = $("#imdBar").find(".fromTimeArea .time").val();

            $("#imdBar").find(".fromTimeArea .time").focus().trigger("focus").val("01 : 61 AM");
            $(document).trigger("mousedown");
            var curFromTime = IMDPanel.__testOnly__.getPrevTimes().prevFromTime;
            expect(prevFromTime).to.not.equal(curFromTime);

            $("#imdBar").find(".fromTimeArea .time").val(prevVal);
        });
        it("onClose should work", function() {
            var prevToTime = IMDPanel.__testOnly__.getPrevTimes().prevToTime;
            var prevVal = $("#imdBar").find(".toTimeArea .time").val();

            $("#imdBar").find(".toTimeArea .time").focus().trigger("focus").val("01 : 61 AM");
            $(document).trigger("mousedown");
            var curToTime = IMDPanel.__testOnly__.getPrevTimes().prevToTime;
            expect(prevToTime).to.not.equal(curToTime);

            $("#imdBar").find(".fromTimeArea .time").val(prevVal);
        });
    });

    describe("update prompt", function() {
        it("getClosestUpdate should be null if not found", function() {
            expect(IMDPanel.__testOnly__.getClosestUpdate("x", 0)).to.be.null;
        })
        it("mousedown on left side should trigger update prompt", function() {
            expect($imdPanel.find(".update-prompt").is(":visible")).to.be.false;
            var e = {type: "mousedown", pageX: 340};
            $imdPanel.find(".tableTimePanel").last().trigger(e);

            expect($imdPanel.find(".update-prompt").is(":visible")).to.be.true;
            expect($imdPanel.find(".update-prompt .pointInTime").hasClass("unavailable")).to.be.true;
            var cells = IMDPanel.__testOnly__.getSelectedCells();
            expect(Object.keys(cells).length).to.equal(1);
            expect(cells.hasOwnProperty("test2")).to.be.true;
            expect(cells["test2"]).to.equal(0);
        });

        it("mousedown on right side should trigger update prompt", function() {
            var e = {type: "mousedown", pageX: $(window).width()};
            $imdPanel.find(".tableTimePanel").last().trigger(e);

            expect($imdPanel.find(".update-prompt .pointInTime").hasClass("unavailable")).to.be.false;
            var cells = IMDPanel.__testOnly__.getSelectedCells();
            expect(Object.keys(cells).length).to.equal(1);
            expect(cells.hasOwnProperty("test2")).to.be.true;
            expect(cells["test2"]).to.equal(1);
        });
        // XXX check positioning of green status bars

        it("mousedown on canvas should trigger update prompt", function() {
            var e = {type: "mousedown", offsetX: $imdPanel.find("canvas").width()};
            $imdPanel.find("canvas").trigger(e);

            expect($imdPanel.find(".update-prompt").is(":visible")).to.be.true;
            var cells = IMDPanel.__testOnly__.getSelectedCells();
            expect(Object.keys(cells).length).to.equal(2);
            expect(cells.hasOwnProperty("test1")).to.be.true;
            expect(cells["test1"]).to.equal(2);
            expect(cells.hasOwnProperty("test2")).to.be.true;
            expect(cells["test2"]).to.equal(1);
        });

        it("mousedown on table detail should trigger update prompt", function() {
            $imdPanel.find(".tableDetailSection .batchId").last().click();

            var cells = IMDPanel.__testOnly__.getSelectedCells();
            expect(Object.keys(cells).length).to.equal(1);
            expect(cells.hasOwnProperty("test2")).to.be.true;
            expect(cells["test2"]).to.equal(0);
            expect($imdPanel.find(".selectedBar").length).to.equal(1);
            var expectedLeft = parseInt($imdPanel.find(".selectedBar").css("left"));
            var left = parseInt($imdPanel.find(".tableListHist").last().find(".indicator1").css("left"));
            expect(left).to.equal(expectedLeft);
        });
    });

    describe("canvas zooming", function() {
        it("zoom in should work", function() {
            var ruler = IMDPanel.__testOnly__.getRuler();
            var pixelToTime = ruler.pixelToTime;
            var e = jQuery.Event( "mousewheel",{deltaY: -5, offsetX: 100} );
            $imdPanel.find("canvas").trigger(e);
            expect(ruler.pixelToTime).to.be.gt(pixelToTime);
        });

        it("zoom out should work", function() {
            var ruler = IMDPanel.__testOnly__.getRuler();
            var pixelToTime = ruler.pixelToTime;
            var e = jQuery.Event( "mousewheel",{deltaY: 5, offsetX: 100} );
            $imdPanel.find("canvas").trigger(e);
            expect(ruler.pixelToTime).to.be.lt(pixelToTime);
        });
    });

    describe("submit", function() {

        it("submitRefreshTables should fail if no selectedCells", function(done) {
            var cells = IMDPanel.__testOnly__.getSelectedCells();
            expect(Object.keys(cells).length).to.equal(0);
            IMDPanel.__testOnly__.submitRefreshTables()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                // this is what we want
                done();
            })
        });

        it("select cell", function() {
            $imdPanel.find(".tableDetailSection .batchId").last().click();

            var cells = IMDPanel.__testOnly__.getSelectedCells();
            expect(Object.keys(cells).length).to.equal(1);
            expect(cells.hasOwnProperty("test2")).to.be.true;
            expect(cells["test2"]).to.equal(0);
            expect($imdPanel.find(".update-prompt").is(":visible")).to.be.true;
        });

        it("submit should work", function(done) {
            var cachedFn = XcalarRefreshTable;
            var called = false;
            XcalarRefreshTable = function(name, dstName, min, max) {
                expect(name).to.equal("test2");
                expect(dstName.indexOf("test2")).to.equal(0);
                expect(min).to.equal(-1);
                expect(max).to.equal(-1);
                called = true;
                return PromiseHelper.resolve();
            };

            var cachedFn2 = WSManager.addWS;
            WSManager.addWS = function() {};

            var cachedFn3 = TblManager.refreshTable;
            var called2 = false;
            TblManager.refreshTable = function(tNames) {
                expect(tNames[0].indexOf("test2")).to.equal(0);
                called2 = true;
                return PromiseHelper.resolve();
            };

            $imdPanel.find(".update-prompt .latest").click();

            UnitTest.testFinish(function() {
                return called2;
            })
            .then(function() {
                expect(called).to.be.true;
                expect(called2).to.be.true;
                XcalarRefreshTable = cachedFn;
                WSManager.addWS = cachedFn2;
                TblManager.refreshTable = cachedFn3;
                done();
            })
            .fail(function() {
                done("failed");
            });
        });

        it("select cell", function() {
            $imdPanel.find(".tableDetailSection .batchId").last().click();

            var cells = IMDPanel.__testOnly__.getSelectedCells();
            expect(Object.keys(cells).length).to.equal(1);
            expect(cells.hasOwnProperty("test2")).to.be.true;
            expect(cells["test2"]).to.equal(0);
            expect($imdPanel.find(".update-prompt").is(":visible")).to.be.true;
        });

        it("submit with refreshTable fail should be handled", function(done) {
            var cachedFn = XcalarRefreshTable;
            var called = false;
            XcalarRefreshTable = function(name, dstName, min, max) {
                expect(name).to.equal("test2");
                expect(dstName.indexOf("test2")).to.equal(0);
                expect(min).to.equal(-1);
                expect(max).to.equal(-1);
                called = true;
                return PromiseHelper.resolve();
            };

            var cachedFn2 = WSManager.addWS;
            WSManager.addWS = function() {};

            var cachedFn3 = TblManager.refreshTable;
            var called2 = false;
            TblManager.refreshTable = function(tNames) {
                expect(tNames[0].indexOf("test2")).to.equal(0);
                called2 = true;
                return PromiseHelper.reject();
            };

            $imdPanel.find(".update-prompt .latest").click();

            UnitTest.testFinish(function() {
                return called2;
            })
            .then(function() {
                expect(called).to.be.true;
                expect(called2).to.be.true;
                XcalarRefreshTable = cachedFn;
                WSManager.addWS = cachedFn2;
                TblManager.refreshTable = cachedFn3;
                UnitTest.hasAlertWithTitle("Table refresh failed");
                done();
            })
            .fail(function() {
                done('failed');
            });
        });
    });

    describe("resizing window", function() {
        it("resizing window should redraw canvas", function(done) {
            var fromTime = $("#imdBar").find(".fromTimeArea input").val();
            var toTime = $("#imdBar").find(".toTimeArea input").val();
            var widthCache = $imdPanel.find("canvas").parent().width();
            var newWidth = 20;
            $imdPanel.find("canvas").parent().width(newWidth);

            $(window).trigger('resize');
            expect($("#imdBar").find(".toTimeArea input").val()).to.equal(toTime);
            var start = Date.now();

            // shouldn't change until timeout expires
            UnitTest.testFinish(function() {
                return $("#imdBar").find(".toTimeArea input").val() !== toTime;
            }, 100)
            .then(function() {
                expect(Date.now() - start).to.be.gt(300);
                expect($("#imdBar").find(".fromTimeArea input").val()).to.equal(fromTime);
                expect($("#imdBar").find(".toTimeArea input").val()).to.not.equal(toTime);

                $imdPanel.find("canvas").parent().width(widthCache);
                $(window).trigger('resize');
                setTimeout(function() {
                    done();
                }, 400);
            })
            .fail(function() {
                done("failed");
            });
        });
    });

    describe("hide and unhide", function() {
        it("hide should work", function() {
            $imdPanel.find(".activeTablesList .hideTable").eq(0).click();
            expect($imdPanel.find(".activeTablesList .tableListItem").length).to.equal(1);
            expect($imdPanel.find(".tableListItem .tableListLeft").eq(0).text().trim()).to.equal("test2");
            expect($imdPanel.find(".hiddenTablesList .tableListItem").length).to.equal(1);
            expect($imdPanel.find(".hiddenTablesList .tableListLeft").eq(0).text().trim()).to.equal("test1");
            var tables = IMDPanel.__testOnly__.getTables();
            expect(tables.pTables.length).to.equal(1);
            expect(tables.pTables[0].name).to.equal("test2");
            expect(tables.hTables.length).to.equal(1);
            expect(tables.hTables[0].name).to.equal("test1");
        });

        it("show should work", function() {
            $imdPanel.find(".hiddenTablesList .showTable").eq(0).click();
            expect($imdPanel.find(".activeTablesList .tableListItem").length).to.equal(2);
            expect($imdPanel.find(".tableListItem .tableListLeft").eq(0).text().trim()).to.equal("test2");
            expect($imdPanel.find(".tableListItem .tableListLeft").eq(1).text().trim()).to.equal("test1");

            var tables = IMDPanel.__testOnly__.getTables();
            expect(tables.pTables.length).to.equal(2);
            expect(tables.pTables[0].name).to.equal("test2");
            expect(tables.pTables[1].name).to.equal("test1");
        });
    });

    describe("delete table", function() {
        it("delete table should work", function(done) {
            var cachedFn = XcalarUnpublishTable;
            XcalarUnpublishTable = function() {
                return PromiseHelper.resolve();
            };
            $imdPanel.find(".deleteTable").eq(0).click();
            UnitTest.hasAlertWithTitle(IMDTStr.DelTable, {
                confirm: true
            });

            var tables = IMDPanel.__testOnly__.getTables();
            expect(tables.pTables.length).to.equal(1);
            expect(tables.pTables[0].name).to.equal("test1");
            setTimeout(function() {
                XcalarUnpublishTable = cachedFn;
                done();
            });

        });
    });

    describe("refresh list", function() {
        it('refresh list should work', function(done) {
            var cachedFn = XcalarListPublishedTables;
            XcalarListPublishedTables = function() {
                return PromiseHelper.resolve({tables: [
                    {
                        active: true,
                        name: "test3",
                        keys: [],
                        updates: [
                            {batchId: 2, numRows:12, source:"source2a", startTS: startTime},
                            {batchId: 1, numRows:12, source:"source1a", startTS: startTime - 3600},
                            {batchId: 0, numRows:12, source:"source0a", startTS: startTime - 7200}
                        ],
                        values: [{name: "testCol", type: 0}],
                        oldestBatchId: 0
                    },
                    {
                        active: false,
                        name: "test4",
                        keys: [],
                        updates: [
                            {batchId: 2, numRows:12, source:"source2a", startTS: startTime},
                            {batchId: 1, numRows:12, source:"source1a", startTS: startTime - 3600},
                            {batchId: 0, numRows:12, source:"source0a", startTS: startTime - 7200}
                        ],
                        values: [{name: "testCol", type: 0}],
                        oldestBatchId: 0
                    }
                ]});
            }
            $imdPanel.find(".refreshList").click();
            setTimeout(function() {
                var tables = IMDPanel.__testOnly__.getTables();
                expect(tables.pTables.length).to.equal(1);
                expect(tables.pTables[0].name).to.equal("test3");
                XcalarListPublishedTables = cachedFn;
                done();
            });
        });

        it('refresh list should work', function(done) {
            var cachedFn = XcalarListPublishedTables;
            XcalarListPublishedTables = function() {
                return PromiseHelper.resolve({tables: [
                    {
                        active: true,
                        name: "test4",
                        keys: [],
                        updates: [
                            {batchId: 2, numRows:12, source:"source2a", startTS: startTime},
                            {batchId: 1, numRows:12, source:"source1a", startTS: startTime - 3600},
                            {batchId: 0, numRows:12, source:"source0a", startTS: startTime - 7200}
                        ],
                        values: [{name: "testCol", type: 0}],
                        oldestBatchId: 0
                    },
                    {
                        active: true,
                        name: "test5",
                        keys: [],
                        updates: [
                            {batchId: 2, numRows:12, source:"source2a", startTS: startTime},
                            {batchId: 1, numRows:12, source:"source1a", startTS: startTime - 3600},
                            {batchId: 0, numRows:12, source:"source0a", startTS: startTime - 7200}
                        ],
                        values: [{name: "testCol", type: 0}],
                        oldestBatchId: 0
                    }
                ]});
            }
            var tables = IMDPanel.__testOnly__.getTables();
            tables.hTables.push(
                {
                    active: true,
                    name: "test5",
                    keys: [],
                    updates: [
                        {batchId: 2, numRows:12, source:"source2a", startTS: startTime},
                        {batchId: 1, numRows:12, source:"source1a", startTS: startTime - 3600},
                        {batchId: 0, numRows:12, source:"source0a", startTS: startTime - 7200}
                    ],
                    values: [{name: "testCol", type: 0}],
                    oldestBatchId: 0
                });
            tables.hTables.push(
                {
                    active: true,
                    name: "test6",
                    keys: [],
                    updates: [
                        {batchId: 2, numRows:12, source:"source2a", startTS: startTime},
                        {batchId: 1, numRows:12, source:"source1a", startTS: startTime - 3600},
                        {batchId: 0, numRows:12, source:"source0a", startTS: startTime - 7200}
                    ],
                    values: [{name: "testCol", type: 0}],
                    oldestBatchId: 0
                }
            );
            tables = IMDPanel.__testOnly__.getTables();
            expect(tables.hTables.length).to.equal(2);
            $imdPanel.find(".refreshList").click();
            setTimeout(function() {
                var tables = IMDPanel.__testOnly__.getTables();
                expect(tables.pTables.length).to.equal(1);
                expect(tables.pTables[0].name).to.equal("test4");
                expect(tables.hTables.length).to.equal(1);
                expect(tables.hTables[0].name).to.equal("test5");
                XcalarListPublishedTables = cachedFn;
                done();
            });
        });
    });

    describe("Table detail content", function() {
        it("no updates should show message", function() {
            var pTables = IMDPanel.__testOnly__.getTables().pTables;
            pTables.push({
                name: "empty",
                updates: [],
                values: []
            });
            IMDPanel.__testOnly__.updateTableDetailSection("empty");
            expect($imdPanel.find(".tableDetailContent").text()).to.equal("No updates");
            pTables.pop();
        });
    });

    after(function() {
        XcalarKeyLookup = cacheKV;
    });
});
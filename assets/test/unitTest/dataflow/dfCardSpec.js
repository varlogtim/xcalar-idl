describe("DFCard Test", function() {
    var testDs;
    var tableName;
    var tableId;
    var testDfName;
    var oldRefresh = null;
    var $dfCard;

    function getDfWrap(dfName) {
        return $('#dfViz .dagWrap[data-dataflowname="' + dfName + '"]');
    }

    before(function(done) {
        console.clear();
        oldRefresh = DataflowPanel.refresh;
        DataflowPanel.refresh = function() {};

        var $mainTabCache = $(".topMenuBarTab.active");
        if ($mainTabCache.attr("id") !== "dataflowTab") {
            $("#dataflowTab").click();
        }

        $dfCard = $('#dfViz');

        UnitTest.testFinish(function() {
            return $("#dfViz .cardMain").children().length !== 0;
        })
        .then(function() {
            return UnitTest.testFinish(function() {
                return $("#dfViz .cardMain .refreshIcon").length === 0;
            });
        })
        .then(function() {
            UnitTest.onMinMode();
            testDfName = xcHelper.randName("unitTestDF");
            var testDSObj = testDatasets.fakeYelp;
            return UnitTest.addAll(testDSObj, "unitTestFakeYelp");
        })
        .then(function(ds, tName) {
            testDs = ds;
            tableName = tName;
            tableId = xcHelper.getTableId(tableName);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("DFCard.addDFToList should work if not restored", function() {
        var cache1 = DF.wasRestored;
        var cache2 = DF.setLastCreatedDF;
        var setLastCalled = false;
        DF.wasRestored = function(){return false;};
        DF.setLastCreatedDF = function(){
            setLastCalled = true;
            return false;
        };
        DFCard.addDFToList("x");
        expect(setLastCalled).to.be.true;
        DF.wasRestored = cache1;
        DF.setLastCreatedDF = cache2;
    });

    it("DFCard.refreshDFList should handle empty objects", function() {
        var cache = DF.getAllDataflows;
        DF.getAllDataflows = function() {return {};};
        DFCard.refreshDFList(true);
        expect($("#dfViz").text().indexOf(DFTStr.NoDF1)).to.be.gt(-1);
        $("#dfViz").find(".hint").remove();
        DF.getAllDataflows = cache;
    });

    it("DFCard.updateRetinaTab should work", function() {
        var fakeName = "fakeName";
        var cache = DF.getDataflow;

        DF.getDataflow = function() {
            return {paramMap: {someParam: "someVal"},
                    parameters: ["someVal"]
                    };
        };

        DFCard.updateRetinaTab(fakeName);
        expect($("#retLists .row").first().text()).to.equal("someVal");

        $("#retLists").find(".unfilled").addClass("temp").removeClass("unfilled");
        DFCard.__testOnly__.addParamToRetina("someOtherName", "someOtherVal");
        expect($("#retLists .row").last().text()).to.equal("someOtherName");
        $("#retLists").find(".temp").addClass("unfilled");
        DF.getDataflow = cache;
    });

    it("Delete param should work", function() {
        var removeCalled = false;
        var cache = DF.getDataflow;

        DF.getDataflow = function() {
            return {paramMap: {someParam: "someVal"},
                    paramMapInUsed: [],
                    parameters: ["someVal"],
                    checkParamInUse: function() {return false;},
                    removeParameter: function() {removeCalled = true;}
                };
        };
        expect($("#retLists .row").last().text()).to.equal("someOtherName");
        $("#retLists").find(".paramDelete").last().click();
        expect(removeCalled).to.be.true;
        expect($("#retLists .row").last().text()).to.not.equal("someOtherName");
        DF.getDataflow = cache;
    });

    it("Should submit form", function(done) {
        DFCreateView.show($("#dagWrap-" + tableId));

        var $newNameInput = $("#newDFNameInput");
        $newNameInput.val(testDfName);

        DFCreateView.__testOnly__.submitForm()
        .then(function() {
            // triggers construction of dag image
            $("#dfMenu").find(".listBox").filter(function() {
                return ($(this).find(".groupName").text() === testDfName);
            }).closest(".listBox").trigger("click");

            $("#maximizeDag").click();
            setTimeout(function() {
                $("#closeDag").click();
                $("#dataflowTab .mainTab").click();
                UnitTest.testFinish(function() {
                    return $("#dfMenu").find(".numGroups").text() > 0;
                })
                .then(function() {
                    setTimeout(function() {
                        UnitTest.deleteAll(tableName, testDs)
                        .always(function() {
                            done();
                        });
                    }, 100);
                });

            }, 600);
        })
        .fail(function() {
            done("fail");
        });
    });

    // XXX need comprehensive test, currently just has test for certain bugs
    describe("dfcard menu", function() {
        var $menu;
        before(function(done){
            $menu = $("#dfViz").find(".dagDropDown");
            $("#dfMenu .groupName").filter(function() {
                return $(this).text() === testDfName;
            }).closest(".dataFlowGroup").click();

            UnitTest.testFinish(function() {
                var $dfWrap = getDfWrap(testDfName);
                return $dfWrap.find(".export .dagTableIcon").length > 0;
            })
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("menu should show correct options depending on license mode", function() {
            var cachedFn = XVM.getLicenseMode;
            XVM.getLicenseMode = function() {
                return XcalarMode.Oper;
            };

            var $dfWrap = getDfWrap(testDfName);
            $dfWrap.find(".export .dagTableIcon").click();
            expect($menu.find("li:visible").length).to.equal(2);
            expect($menu.find("li.createParamQuery:visible").length).to.equal(1);

            XVM.getLicenseMode = function() {
                return XcalarMode.Mod;
            };

            $dfWrap.find(".export .dagTableIcon").click();
            expect($menu.find("li:visible").length).to.equal(1);
            expect($menu.find("li.createParamQuery:visible").length).to.equal(0);

            XVM.getLicenseMode = cachedFn;
        });

        it("createParamQuery li should work", function() {
            var cache = DFParamModal.show;
            var called = false;
            DFParamModal.show = function() {
                called = true;
            };
            $menu.find("li.createParamQuery").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DFParamModal.show = cache;
        });

        it("expandAll li should work", function() {
            var cache = Dag.expandAll;
            var called = false;
            Dag.expandAll = function() {
                called = true;
            };
            $menu.find("li.expandAll").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            Dag.expandAll = cache;
        });

        it("collapseAll li should work", function() {
            var cache = Dag.collapseAll;
            var called = false;
            Dag.collapseAll = function() {
                called = true;
            };
            $menu.find("li.collapseAll").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            Dag.collapseAll = cache;
        });

        it("saveImageAction li should work", function() {
            var cache = DagPanel.saveImageAction;
            var called = false;
            DagPanel.saveImageAction = function() {
                called = true;
            };
            $menu.find("li.saveImage").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagPanel.saveImageAction = cache;
        });

        it("new tab image li should work", function() {
            var cache = DagPanel.newTabImageAction;
            var called = false;
            DagPanel.newTabImageAction = function() {
                called = true;
            };
            $menu.find("li.newTabImage").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;
            DagPanel.newTabImageAction = cache;
        });

        it("unavailable li should not work", function() {
            var cache = DFParamModal.show;
            var called = false;
            DFParamModal.show = function() {
                called = true;
            };
            $menu.find("li.createParamQuery").addClass("unavailable");
            $menu.find("li.createParamQuery") .trigger(fakeEvent.mouseup);
            expect(called).to.be.false;

            $menu.find("li.createParamQuery").removeClass("unavailable");
            $menu.find("li.createParamQuery").trigger({type: "mouseup", which: 3});
            expect(called).to.be.false;

            $menu.find("li.createParamQuery").trigger(fakeEvent.mouseup);
            expect(called).to.be.true;

            $menu.find("li.unexpectedInfo").trigger(fakeEvent.mouseup);

            DFParamModal.show = cache;
        });

        it("show export cols should work", function() {
            expect($("#exportColPopup").is(":visible")).to.be.false;
            var $dfWrap = getDfWrap(testDfName);
            $dfWrap.find(".export .dagTableIcon").click();
            $menu.find("li.showExportCols").trigger(fakeEvent.mouseup);
            expect($("#exportColPopup").is(":visible")).to.be.true;
            expect($("#exportColPopup").text().indexOf("user_id")).to.be.gt(-1);
        });

        it("right click should work", function() {
            $(document).mousedown();
            expect($menu.is(":visible")).to.be.false;
            var event = $.Event("contextmenu");
            event.target = $dfCard.find(".dagImageWrap").eq(0);
            $dfCard.trigger(event);
            expect($menu.is(":visible")).to.be.true;
            expect($menu.find("li:visible").length).to.equal(2);
            $(document).mousedown();
            expect($menu.is(":visible")).to.be.false;
        });
    });

    describe("filled DF list", function() {
        it("downloadDataflow btn should work", function() {
            var $dfWrap = getDfWrap(testDfName);
            $dfWrap.find(".export .dagTableIcon").click();

            var cached = XcSupport.downloadLRQ;
            var called = false;
            XcSupport.downloadLRQ = function(name) {
                expect(name).to.equal(testDfName);
                called = true;
            };
            $("#dfMenu").find(".downloadDataflow").eq(0).click();
            expect(called).to.be.true;
            XcSupport.downloadLRQ = cached;
        });

        it("deletedDataflow btn should work", function() {
            var cached = DF.removeDataflow;
            var called = false;
            DF.removeDataflow = function() {
                called = true;
                return PromiseHelper.reject();
            };

            $("#dfMenu").find(".deleteDataflow").eq(0).click();
            UnitTest.hasAlertWithTitle(DFTStr.DelDF, {confirm: true});
            expect(called).to.be.true;
            expect($dfCard.hasClass("deleting")).to.be.false;
            expect($dfCard.find(".title").text().indexOf(CommonTxtTstr.deleting)).to.equal(-1);
            DF.removeDataflow = cached;
        });
    });

    describe("dfCard buttons", function(){
        it("should show scheduler", function() {
            var cache = Scheduler.show;
            var schedCalled = false;
            Scheduler.show = function() {
                schedCalled = true;
            };
            expect($("#dfViz .addScheduleToDataflow:visible").length).to.equal(1);
            $("#dfViz .addScheduleToDataflow:visible").click();
            expect(schedCalled).to.be.true;
            Scheduler.show = cache;
        });
        it("should show schedule alert if invalid params", function() {
            var cache1 = Scheduler.show;
            var schedCalled = false;
            Scheduler.show = function() {
                schedCalled = true;
            };

            var cache2 = DF.getDataflow;
            DF.getDataflow = function() {
                return {
                    allUsedParamsWithValues: function(){return false;}
                };
            };

            expect($("#dfViz .addScheduleToDataflow:visible").length).to.equal(1);
            $("#dfViz .addScheduleToDataflow:visible").click();
            expect(schedCalled).to.be.false;
            Scheduler.show = cache1;
            DF.getDataflow = cache2;
            UnitTest.hasAlertWithTitle(DFTStr.AddValues);
            expect($dfCard.find('.retPopUp:visible').length).to.equal(1);
            $("#container").trigger(fakeEvent.mousedown);
            expect($dfCard.find('.retPopUp:visible').length).to.equal(0);
        });

        it("should not show schedule if has unexpected node", function() {
            xcTooltip.hideAll();
            $dfCard.addClass("hasUnexpectedNode");
            var cache = Scheduler.show;
            var schedCalled = false;
            Scheduler.show = function() {
                schedCalled = true;
            };
            expect($("#dfViz .addScheduleToDataflow:visible").length).to.equal(1);
            $("#dfViz .addScheduleToDataflow:visible").click();
            expect(schedCalled).to.be.false;
            $dfCard.removeClass("hasUnexpectedNode");
            expect($(".tooltip:visible").length).to.equal(1);
            expect($(".tooltip:visible").text()).to.equal(TooltipTStr.UnexpectedNode);

            Scheduler.show = cache;
        });

        it("run now btn should not work if unexpectedNode", function() {
            xcTooltip.hideAll();
            expect($dfCard.find(".runNowBtn:visible").length).to.equal(1);
            $dfCard.addClass("hasUnexpectedNode");
            $dfCard.find(".runNowBtn:visible").click();
            expect($(".tooltip:visible").length).to.equal(1);
            expect($(".tooltip:visible").text()).to.equal(TooltipTStr.UnexpectedNode);
            $dfCard.removeClass("hasUnexpectedNode");
        });

        it("run now btn should work", function() {
            expect($dfCard.find(".runNowBtn:visible").length).to.equal(1);


            var cache = DF.getAdvancedExportOption;
            var called = false;
            DF.getAdvancedExportOption = function() {
                called = true;
                return null;
            };

            $dfCard.find(".runNowBtn:visible").click();
            expect(called).to.be.true;
            DF.getAdvancedExportOption = cache;
        });

        it("run now btn should work with advanced export option", function(done) {
            expect($dfCard.find(".runNowBtn:visible").length).to.equal(1);

            var cache1 = DF.getAdvancedExportOption;
            var called = false;
            DF.getAdvancedExportOption = function() {
                called = true;
                return {activeSession: true};
            };
            var cache2 = XcalarExecuteRetina;
            XcalarExecuteRetina = function() {
                return PromiseHelper.resolve();
            };

            var cache3 = XIApi.project;
            XIApi.project = function() {
                return PromiseHelper.resolve();
            };

            var cache4 = TblManager.refreshTable;
            TblManager.refreshTable = function() {
                return PromiseHelper.resolve();
            };

            var cache5 = XIApi.deleteTable;
            XIApi.deleteTable = function() {
                return PromiseHelper.resolve();
            };

            var cache6 = MainMenu.openPanel;
            MainMenu.openPanel = function() {
                return;
            };

            var focusCalled = false;
            var cache7 = xcHelper.centerFocusedTable;
            xcHelper.centerFocusedTable = function() {
                focusCalled = true;
                return;
            };

            var dfObj = DF.getDataflow(testDfName);
            dfObj.paramMap = {
                "a": "val"
            };

            DFCard.__testOnly__.runDF(testDfName)
            .then(function() {
                expect(called).to.be.true;
                UnitTest.hasAlertWithTitle(DFTStr.RunDone, {confirm: true});
                expect(focusCalled).to.be.true;

                DF.getAdvancedExportOption = cache1;
                XcalarExecuteRetina = cache2;
                XIApi.project = cache3;
                TblManager.refreshTable = cache4;
                XIApi.deleteTable = cache5;
                MainMenu.openPanel = cache6;
                xcHelper.centerFocusedTable = cache7;
                dfObj.paramMap = {};
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("run now btn with invalid params should not work", function() {
            var cache = DF.getDataflow;
            DF.getDataflow = function() {
                return {
                    allUsedParamsWithValues: function(){return false;}
                };
            };

            $dfCard.find(".runNowBtn:visible").click();
            UnitTest.hasAlertWithTitle(DFTStr.AddValues);
            DF.getDataflow = cache;
        });

        it("run now btn can cancel df", function() {
            var cache = DFCard.cancelDF;
            var called = false;
            DFCard.cancelDF = function(retName) {
                expect(retName).to.equal(testDfName);
                called = true;
            };

            $dfCard.find(".runNowBtn:visible").addClass("running");
            $dfCard.find(".runNowBtn:visible").click();
            expect(called).to.be.true;
            $dfCard.find(".runNowBtn:visible").removeClass("running");
            DFCard.cancelDF = cache;
        });

        it("run now btn canceled df", function() {
            var cache = DF.getAdvancedExportOption;
            var called = false;
            DF.getAdvancedExportOption = function() {
                called = true;
                return null;
            };

            $dfCard.find(".runNowBtn:visible").addClass("canceling");
            $dfCard.find(".runNowBtn:visible").click();
            expect(called).to.be.false;
            $dfCard.find(".runNowBtn:visible").removeClass("canceling");
            DF.getAdvancedExportOption = cache;
        });

        it("handle run df errors", function(done) {
            var cache = XcalarExecuteRetina;
            XcalarExecuteRetina = function() {
                return PromiseHelper.reject({status: StatusT.StatusCanceled});
            };
            DFCard.__testOnly__.runDF(testDfName)
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasAlertWithTitle(DFTStr.RunFail);
                XcalarExecuteRetina = cache;
                done();
            });
        });

        it("handle run df errors via cancel", function(done) {
            var cache = XcalarExecuteRetina;
            XcalarExecuteRetina = function() {
                return PromiseHelper.reject({status: StatusT.StatusCanceled});
            };
            var cache2 = XcalarListParametersInRetina;
            XcalarListParametersInRetina = function() {
                return PromiseHelper.resolve({numParameters: 1,
                                parameters: [{paraName: "N"}]});
            };
            DFCard.__testOnly__.setCanceledRun(testDfName);
            DFCard.__testOnly__.runDF(testDfName)
            .then(function() {
                done("fail");
            })
            .fail(function() {
                XcalarExecuteRetina = cache;
                XcalarListParametersInRetina = cache2;
                done();
            });

            UnitTest.testFinish(function(){
                return $("#alertModal").is(":visible");
            })
            .then(function() {
                UnitTest.hasAlertWithTitle("warning");
            });
        });

        it("run df alert before run df", function(done) {
            var cache = XcalarExecuteRetina;
            XcalarExecuteRetina = function() {
                return PromiseHelper.reject({status: StatusT.StatusCanceled});
            };
            DFCard.__testOnly__.setCanceledRun(testDfName);
            DFCard.__testOnly__.runDF(testDfName)
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasAlertWithTitle(StatusMessageTStr.CancelSuccess);
                XcalarExecuteRetina = cache;
                done();
            });
        });

        it("DFCard.cancelDF should work", function(done) {
            var cache1 = QueryManager.cancelQuery;
            var called = false;
            QueryManager.cancelQuery = function() {
                called = true;
            };
            var cache2 = XcalarQueryCancel;
            XcalarQueryCancel = function() {
                return PromiseHelper.reject();
            };

            DFCard.cancelDF(testDfName, -1)
            .then(function(){
                done("fail");
            })
            .fail(function(){
                expect(called).to.be.true;
                QueryManager.cancelQuery = cache1;
                XcalarQueryCancel = cache2;
                UnitTest.hasAlertWithTitle(StatusMessageTStr.CancelFail);
                done();
            });

        });
    });

    describe("parameter popup", function() {
        var $tab;
        before(function() {
            $tab = $(".retTabSection").find(".retTab");
        });

        // it("popup should open and close", function() {
        //     $tab.trigger(fakeEvent.mousedown);
        //     expect($tab.hasClass("active")).to.be.true;
        //     expect($tab.find(".retPopUp").is(":visible")).to.be.true;

        //     $tab.trigger(fakeEvent.mousedown);

        //     expect($tab.hasClass("active")).to.be.false;
        //     expect($tab.find(".retPopUp").is(":visible")).to.be.false;
        // });

        it("popup should not close when clicking inside of it", function() {
            $tab.click();
            expect($tab.find(".retPopUp").is(":visible")).to.be.true;
            $tab.click();
            expect($tab.find(".retPopUp").is(":visible")).to.be.false;
        });

        // it("popup should close when clicking on dfcard", function() {
        //     expect($tab.find(".retPopUp").is(":visible")).to.be.true;
        //     $(document).trigger(fakeEvent.mousedown);
        //     expect($tab.find(".retPopUp").is(":visible")).to.be.true;
        //     $("#dfViz").trigger(fakeEvent.mousedown);
        //     expect($tab.find(".retPopUp").is(":visible")).to.be.false;
        // });
    });

    describe("various functions", function() {
        it("restore parameterized node should work", function() {
            var paramCalled = false;
            $("#dataflowPanel").append(
                '<div class="dagWrap" data-dataflowName="' + testDfName + 1 + '"></div>');
            var $dagWrap = $("#dataflowPanel").find('.dagWrap[data-dataflowName="' +
                                            testDfName + 1 + '"]');
            $dagWrap.append('<div data-nodeid="a" data-type="filter" paramValue="<a>"></div>');
            $dagWrap.append('<div data-nodeid="b" data-type="dataStore" paramValue="<a>"></div>');
            $dagWrap.append('<div data-nodeid="c" data-type="export" paramValue="<a>"></div>');
            $dagWrap.find("div").eq(0).data("paramValue", ["<a>"]);
            $dagWrap.find("div").eq(1).data("paramValue", ["<b>"]);
            $dagWrap.find("div").eq(2).data("paramValue", ["<c>"]);

            var cache1 = DF.getDataflow;
            var paramInfo = [];
            var df = {
                nodeIds: {"a": "a", "b": "b", "c": "c"},
                addParameterizedNode: function(nodeId, val, paramInf) {
                    paramCalled = true;
                    paramInfo.push(val);
                }
            };

            DF.getDataflow = function() {
                return df;
            };

            DFCard.__testOnly__.restoreParameterizedNode(testDfName + 1);
            expect(paramCalled).to.be.true;
            expect(paramInfo.length).to.equal(3);
            expect(paramInfo[0].paramType).to.equal(XcalarApisT.XcalarApiFilter);
            expect(paramInfo[0].paramValue[0]).to.equal("<a>");

            DF.getDataflow = cache1;
        });

        it("parseFileName should work", function() {
            var paramArray = [{parameterName: "test", parameterValue: "val"}];
            var exportInfo = {meta: {target: {type: ExTargetTypeT.ExTargetUDFType},
                                    specificInput: {udfInput: {fileName: "<test>.csv"}}}};
            var res = DFCard.__testOnly__.parseFileName(exportInfo, paramArray);
            expect(res).to.equal("val.csv");
        });

        it("applyDeltaTagsToDag should work", function() {
            var $wrap = $('<div class="dagWrap"></div>');
            $wrap.append('<div class="dagTable export" data-nodeid="a"><div class="opInfoText"></div></div>');
            // $wrap.find(".dagTable").data("paramValue", ["<a>"]);
            var cache1 = DF.getDataflow;
            var df = {
                retinaNodes: [{
                    dagNodeId: "a",
                    input: {
                        exportInput: {
                            meta: {
                                target: {
                                    name: "",
                                    type: ""
                                },
                                specificInput: {
                                    sfInput: {
                                        fileName: "<b>"
                                    }
                                }
                            }
                        }
                    },
                    api: XcalarApisT.XcalarApiExport,
                    name: {name: "testName"}
                }],
                parameterizedNodes: {
                    "a": {
                        paramType: XcalarApisT.XcalarApiExport
                    }
                },
                parameters: [],
                colorNodes: function() { return $wrap.find(".dagTable"); }
            };

            DF.getDataflow = function() {
                return df;
            };


            DFCard.__testOnly__.applyDeltaTagsToDag("", $wrap);
            expect($wrap.find(".dagTable").hasClass("parameterizable")).to.be.true;
            expect($wrap.find(".dagTable").data("paramValue")[0]).to.equal("<b>");
            DF.getDataflow = cache1;
        });

        it("applyDeltaTagsToDag should work with filter", function() {
            var $wrap = $('<div class="dagWrap"></div>');
            $wrap.append('<div class="actionType dropdownBox filter" data-info="<c>"></div><div class="dagTable filter" data-nodeid="a"><div class="opInfoText"></div></div>');
            var cache1 = DF.getDataflow;
            var df = {
                retinaNodes: [{
                    dagNodeId: "a",
                    input: {
                        exportInput: {
                            meta: {
                                target: {
                                    name: "",
                                    type: ""
                                },
                                specificInput: {
                                    sfInput: {
                                        fileName: "<b>"
                                    }
                                }
                            }
                        }
                    },
                    api: XcalarApisT.XcalarApiFilter,
                    name: {name: "testName"}
                }],
                parameterizedNodes: {
                    "a": {
                        paramType: XcalarApisT.XcalarApiFilter
                    }
                },
                parameters: [],
                colorNodes: function() { return $wrap.find(".dagTable"); }
            };

            DF.getDataflow = function() {
                return df;
            };


            DFCard.__testOnly__.applyDeltaTagsToDag("", $wrap);
            expect($wrap.find(".actionType").hasClass("parameterizable")).to.be.true;
            expect($wrap.find(".actionType").data("paramValue")[0]).to.equal("<c>");
            expect($wrap.find(".dagTable .opInfoText").text()).to.equal("<Parameterized>");
            DF.getDataflow = cache1;
        });
    });

    it("dag tables should have Created class", function() {
        var $dfWrap = getDfWrap(testDfName);
        expect($dfWrap.find(".dagTable").length).to.equal(3);
        expect($dfWrap.find(".dagTable.Created").length).to.equal(3);
    });

    it("Dataflow refresh test", function() {
        var allNames = [];
        $("#dfMenu .groupName").each(function(idx, obj) {
            allNames.push($(obj).text());
        });

        // Now hit refresh
        $(".dfList .refreshBtn").click();
        var newNames = [];
        $("#dfMenu .groupName").each(function(idx, obj) {
            newNames.push($(obj).text());
        });

        // Everything in newNames must be in oldNames
        expect(newNames.length).to.equal(allNames.length);
        for (var i = 0; i < allNames.length; i++) {
            expect(newNames).to.include(allNames[i]);
        }
    });

    describe("Status Progress check", function() {
        // using real xcalarquerystate
        it("dag table statuses should update when executing retina", function(done) {
            $("#dfMenu .groupName").filter(function() {
                return $(this).text() === testDfName;
            }).closest(".dataFlowGroup").click();

            var $dfWrap = getDfWrap(testDfName);
            $dfWrap = $('#dfViz .dagWrap[data-dataflowname="' + testDfName + '"]');

            DFParamModal.show($dfWrap.find(".dagTable").last())
            .then(function() {
                var $inputs = $("#dfParamModal").find(".editableTable input.editableParamDiv");
                $inputs.eq(1).val(testDfName + Date.now() + ".csv");
                $inputs.eq(2).val("Default");
                return DFParamModal.__testOnly__.storeRetina();
            })
            .then(function() {
                return DFCard.__testOnly__.runDF(testDfName);
            })
            .then(function() {
                // wait for last xcalarquerystate call to return
                setTimeout(function() {
                    expect(DFCard.__testOnly__.retinasInProgress[testDfName]).to.be.undefined;
                    $dfWrap = $('#dfViz .dagWrap[data-dataflowname="' + testDfName + '"]');
                    expect($dfWrap.find(".dagTable.Created").length).to.equal(0);
                    expect($dfWrap.find(".dagTable.Ready").length).to.equal(3);
                    done();
                }, 4000);
            })
            .fail(function() {
                done("fail");
            });
        });

        // using fake xcalarquerystate
        it("XcalarQueryState should be called when starting status check", function(done) {
            var cachedFn = XcalarQueryState;
            var passed = false;
            var count = 0;
            XcalarQueryState = function() {
                count++;
                passed = true;
                return PromiseHelper.reject();
            };

            expect(passed).to.be.false;
            expect(DFCard.__testOnly__.retinasInProgress[testDfName]).to.be.undefined;
            DFCard.__testOnly__.startStatusCheck(testDfName);
            expect(DFCard.__testOnly__.retinasInProgress[testDfName]).to.be.true;
            expect(passed).to.be.false;
            expect(count).to.equal(0);

            // wait for xcalarquerystate to be called
            setTimeout(function() {
                if (count !== 1) {
                    DFCard.__testOnly__.endStatusCheck(testDfName, true);
                }
                expect(count).to.equal(1);
                expect(passed).to.be.true;
                setTimeout(function() {
                    // xcalarquerystate should be called continuously until
                    // endstatuscheck is called
                    expect(count).to.equal(2);

                    expect(DFCard.__testOnly__.retinasInProgress[testDfName]).to.be.true;
                    DFCard.__testOnly__.endStatusCheck(testDfName, true);
                    // ending makes 1 last call to xcalarquerystate
                    expect(count).to.equal(3);
                    expect(DFCard.__testOnly__.retinasInProgress[testDfName]).to.be.undefined;
                    setTimeout(function() {
                        expect(count).to.equal(3);
                        XcalarQueryState = cachedFn;
                        done();
                    }, 2500);
                }, 2500);
            }, 1500);
        });
    });

    after(function(done) {
        UnitTest.offMinMode();
        DFCard.__testOnly__.deleteDataflow(testDfName)
        .always(function() {
            XcalarDeleteRetina.log("unitTestDF");
            Alert.forceClose();
            if (oldRefresh != null) {
                DataflowPanel.refresh = oldRefresh;
            }
            done();
        });
    });
});

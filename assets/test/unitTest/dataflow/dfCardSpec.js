describe("DFCard Test", function() {
    var testDs;
    var tableName;
    var tableId;
    var testDfName;
    var oldRefresh = null;

    function getDfWrap(dfName) {
        return $('#dfViz .dagWrap[data-dataflowname="' + dfName + '"]');
    }

    before(function(done) {
        console.clear();

        var $mainTabCache = $(".topMenuBarTab.active");
        if ($mainTabCache.attr("id") !== "dataflowTab") {
            $("#dataflowTab").click();
        }

        UnitTest.testFinish(function() {
            return $("#dfViz .cardMain").children().length !== 0;
        })
        .then(function() {
            oldRefresh = DataflowPanel.refresh;
            DataflowPanel.refresh = function() {};

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
                setTimeout(function() {
                    UnitTest.deleteAll(tableName, testDs)
                    .always(function() {
                        done();
                    });
                }, 100);
            }, 600);
        })
        .fail(function() {
            done("fail");
        });
    });

    // XXX need comprehensive test, currently just has test for certain bugs
    describe("dfcard menu", function() {
        before(function(done){
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
            var $menu = $("#dfViz").find(".dagDropDown");
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

        it("show export cols should work", function() {
            expect($("#exportColPopup").is(":visible")).to.be.false;
            var $menu = $("#dfViz").find(".dagDropDown");
            var $dfWrap = getDfWrap(testDfName);
            $dfWrap.find(".export .dagTableIcon").click();
            $menu.find("li.showExportCols").trigger(fakeEvent.mouseup);
            expect($("#exportColPopup").is(":visible")).to.be.true;
            expect($("#exportColPopup").text().indexOf("user_id")).to.be.gt(-1);
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

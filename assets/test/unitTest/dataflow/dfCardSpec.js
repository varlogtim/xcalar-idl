describe('DFCard Test', function() {
    var testDs;
    var tableName;
    var tableId;
    var testDfName;
    var $dfWrap;

    before(function(done) {
        testDfName = xcHelper.randName("unitTestDF");
        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .always(function(ds, tName) {
            testDs = ds;
            tableName = tName;
            tableId = xcHelper.getTableId(tableName);
            done();
        });
    });

    it("Should submit form", function(done) {
        DFCreateView.show($("#dagWrap-" + tableId));

        var $newNameInput = $('#newDFNameInput');
        $newNameInput.val(testDfName);

        DFCreateView.__testOnly__.submitForm()
        .then(function() {
            // triggers construction of dag image
            $('#dfgMenu').find('.listBox').filter(function() {
                return ($(this).find('.groupName').text() === testDfName);
            }).closest('.listBox').trigger('click');

            $dfWrap = $('#dfgViz .dagWrap[data-dataflowname="' + testDfName + '"]');

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
        before(function(){
            $("#dfgMenu .groupName").filter(function() {
                return $(this).text() === testDfName;
            }).closest('.dataFlowGroup').click();

        });

        it("menu should show correct options depending on license mode", function() {
            var cachedFn = XVM.getLicenseMode;
            XVM.getLicenseMode = function() {
                return XcalarMode.Oper;
            };
            var $menu = $('#dfgViz').find('.dagDropDown');
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
            var $menu = $('#dfgViz').find('.dagDropDown');
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

        it("popup should open and close", function() {
            $tab.trigger(fakeEvent.mousedown);
            expect($tab.hasClass("active")).to.be.true;
            expect($tab.find(".retPopUp").is(":visible")).to.be.true;

            $tab.trigger(fakeEvent.mousedown);

            expect($tab.hasClass("active")).to.be.false;
            expect($tab.find(".retPopUp").is(":visible")).to.be.false;
        });

        it("popup should not close when clicking inside of it", function() {
            $tab.trigger(fakeEvent.mousedown);
            expect($tab.find(".retPopUp").is(":visible")).to.be.true;
            $tab.find(".retPopup").trigger(fakeEvent.mouseddown);
            expect($tab.find(".retPopUp").is(":visible")).to.be.true;
        });

        it("popup should close when clicking on dfcard", function() {
            expect($tab.find(".retPopUp").is(":visible")).to.be.true;
            $(document).trigger(fakeEvent.mousedown);
            expect($tab.find(".retPopUp").is(":visible")).to.be.true;
            $("#dfgViz").trigger(fakeEvent.mousedown);
            expect($tab.find(".retPopUp").is(":visible")).to.be.false;
        });

        it("empty param submission should validate", function() {
            $tab.find(".newParam").val("");
            $tab.find(".newParam").trigger(fakeEvent.enterKeyup);
            UnitTest.hasStatusBoxWithError("Please fill out this field.");
        });

        it("invalid param character submission should validate", function() {
            $tab.find(".newParam").val("te?st");
            $tab.find(".newParam").trigger(fakeEvent.enterKeyup);
            UnitTest.hasStatusBoxWithError("Please input a valid name with no special characters or spaces.");
        });

        it("duplicate param name should validate", function() {
            $("#retLists").find(".row").eq(0).removeClass("unfilled").find(".paramName").text("test");
            $tab.find(".newParam").val("test");
            $tab.find(".newParam").trigger(fakeEvent.enterKeyup);
            UnitTest.hasStatusBoxWithError('Parameter "test" already exists, please choose another name.');
            $("#retLists").find(".row").eq(0).addClass("unfilled").find(".paramName").text("");
        });

        it("system param name should validate", function() {
            $tab.find(".newParam").val("N");
            $tab.find(".newParam").trigger(fakeEvent.enterKeyup);
            UnitTest.hasStatusBoxWithError('Parameter "N" is a system parameter, please choose another name.');
        });

        it("valid param should work", function() {
            expect($("#retLists").find(".row").eq(0).hasClass("unfilled")).to.be.true;
            expect($("#retLists").find(".row").eq(0).text()).to.be.equal("");
            var df = DF.getDataflow(testDfName);
            expect(df.parameters.length).to.equal(0);

            $tab.find(".newParam").val("test");
            $tab.find(".newParam").trigger(fakeEvent.enterKeyup);

            expect($("#retLists").find(".row").eq(0).hasClass("unfilled")).to.be.false;
            expect($("#retLists").find(".row").eq(0).text()).to.be.equal("test");
            expect(df.parameters.length).to.equal(1);
            expect(df.parameters[0]).to.equal("test");
        });

        it("param delete should work", function() {
            var df = DF.getDataflow(testDfName);
            expect(df.paramMap.hasOwnProperty("test")).to.be.true;
            expect(df.parameters.length).to.equal(1);
            expect($("#retLists").find(".row").eq(0).hasClass("unfilled")).to.be.false;
            expect($("#retLists").find(".row").eq(0).text()).to.be.equal("test");

            $("#retLists").find(".paramDelete").eq(0).click();
            expect(df.parameters.length).to.equal(0);
            expect(df.paramMap.hasOwnProperty("test")).to.be.false;
            expect($("#retLists").find(".row").eq(0).hasClass("unfilled")).to.be.true;
            expect($("#retLists").find(".row").eq(0).text()).to.be.equal("");
        });

        it("adding parameter when rows are filled should work", function() {
            expect($("#retLists").find(".row").length).to.equal(7);
            $("#retLists").find(".row").removeClass("unfilled");
            DFCard.__testOnly__.addParamToRetina("name", "val");
            expect($("#retLists").find(".row").length).to.equal(8);
            $("#retLists").find(".row").last().remove();
        });
    });

    it('dag tables should have Created class', function() {
        expect($dfWrap.find('.dagTable').length).to.equal(3);
        expect($dfWrap.find('.dagTable.Created').length).to.equal(3);
    });

    it('Dataflow refresh test', function() {
        var allNames = [];
        $("#dfgMenu .groupName").each(function(idx, obj) {
            allNames.push($(obj).text());
        });

        // Now hit refresh
        $(".dfgList .refreshBtn").click();
        var newNames = [];
        $("#dfgMenu .groupName").each(function(idx, obj) {
            newNames.push($(obj).text());
        });

        // Everything in newNames must be in oldNames
        expect(newNames.length).to.equal(allNames.length);
        for (var i = 0; i<allNames.length; i++) {
            expect(newNames).to.include(allNames[i]);
        }
    });

    describe('Status Progress check', function() {

        // using real xcalarquerystate
        it('dag table statuses should update when executing retina', function(done) {
             $("#dfgMenu .groupName").filter(function() {
                return $(this).text() === testDfName;
            }).closest('.dataFlowGroup').click();

            $dfWrap = $('#dfgViz .dagWrap[data-dataflowname="' + testDfName + '"]');


            DFParamModal.show($dfWrap.find('.dagTable').last());
            $("#dfgParameterModal").find('.editableTable input.editableParamDiv')
                                   .val(testDfName + Date.now() + '.csv');

            DFParamModal.__testOnly__.storeRetina()
            .then(function() {
                DFCard.__testOnly__.runDF(testDfName)
                .then(function() {
                    // wait for last xcalarquerystate call to return
                    setTimeout(function() {
                        expect(DFCard.__testOnly__.retinasInProgress[testDfName]).to.be.undefined;
                        $dfWrap = $('#dfgViz .dagWrap[data-dataflowname="' + testDfName + '"]');
                        expect($dfWrap.find('.dagTable.Created').length).to.equal(0);
                        expect($dfWrap.find('.dagTable.Ready').length).to.equal(3);
                        done();
                    }, 4000);
                });
            });
        });

        // using fake xcalarquerystate
        it('XcalarQueryState should be called when starting status check', function(done) {
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
        DFCard.__testOnly__.deleteDataflow(testDfName)
        .always(function() {
            XcalarDeleteRetina.log("unitTestDF");
            Alert.forceClose();
            done();
        });
    });
});

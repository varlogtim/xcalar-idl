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

    it("Should sumbit form", function(done) {
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
            }, 400);
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
            // make this the active df
            $("#dfgMenu .groupName").filter(function() {
                return $(this).text() === testDfName;
            }).closest('.dataFlowGroup').click();

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
            console.warn(Date.now());
            DFCard.__testOnly__.startStatusCheck(testDfName);
            expect(DFCard.__testOnly__.retinasInProgress[testDfName]).to.be.true;
            expect(passed).to.be.false;
            expect(count).to.equal(0);

            // wait for xcalarquerystate to be called
            setTimeout(function() {
                console.warn(Date.now());
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

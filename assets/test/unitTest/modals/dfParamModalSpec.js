describe("DFParamModal Test", function() {
    var $modal; // $("#dfParamModal")
    var testDfName;
    var tableName;
    var tableId;
    var $dfWrap;
    var prefix;
    var colName;
    var oldRefresh;
    var testDs;

    before(function(done) {
        $("#dataflowTab").click();
        UnitTest.testFinish(function() {
            return $("#dfViz .cardMain").children().length !== 0;
        })
        .then(function() {
            $modal = $("#dfParamModal");
            oldRefresh = DF.refresh;
            // refresh is async and affect the meta, should disabled
            DF.refresh = function() {
                return PromiseHelper.resolve();
            };

            testDfName = xcHelper.randName("unitTestParamDF");
            var testDSObj = testDatasets.fakeYelp;

            return UnitTest.addAll(testDSObj, "unitTestFakeYelp");
        })
        .then(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            oldTableName = tableName;
            prefix = tPrefix;
            tableId = xcHelper.getTableId(tableName);
            colName = prefix + gPrefixSign + "average_stars";

            return xcFunction.filter(1, tableId, {filterString: "gt(" + colName + ", 3)"});
        })
        .then(function(nTName) {
            tableName = nTName;
            tableId = xcHelper.getTableId(nTName);
            var columns = [{backCol: colName, frontCol: "average_stars"}];
            var exportTables = [{
                columns: columns,
                tableName: nTName
            }];

            return DF.addDataflow(testDfName, new Dataflow(testDfName), exportTables, []);
        })
        .then(function() {
            $("#dataflowTab .mainTab").click();
            $("#dfMenu").find(".listBox").filter(function() {
                return ($(this).find(".groupName").text() === testDfName);
            }).closest(".listBox").trigger("click");

            $dfWrap = $('#dfViz .dagWrap[data-dataflowname="' + testDfName + '"]');
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("modal show should be triggered", function() {
        var cachedFn = DFParamModal.show;
        var showed = false;
        DFParamModal.show = function() {
            showed = true;
        };
        $("#dataflowView").find(".dagDropDown .createParamQuery").trigger(fakeEvent.mouseup);

        expect(showed).to.be.true;
        DFParamModal.show = cachedFn;
    });

    describe("Add/delete param test", function() {
        before(function(done) {
            DFParamModal.show($dfWrap.find(".dagTable.export"))
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should click to show new param input", function() {
            assert.isFalse($modal.find(".newParam").is(":visible"));
            $modal.find(".addParam").click();
            assert.isTrue($modal.find(".newParam").is(":visible"));
        });

        it("empty param submission should hide input", function() {
            $modal.find(".newParam").val("").trigger(fakeEvent.enterKeydown);
            assert.isFalse($modal.find(".newParam").is(":visible"));
        });

        it("invalid param character submission should validate", function() {
            $modal.find(".addParam").click();
            $modal.find(".newParam").val("te?st")
                  .trigger(fakeEvent.enterKeydown);
            UnitTest.hasStatusBoxWithError(ErrTStr.NoSpecialCharOrSpace);
        });


        it("system param name should validate", function() {
            $modal.find(".newParam").val("N")
                  .trigger(fakeEvent.enterKeydown);
            var error = xcHelper.replaceMsg(ErrWRepTStr.SystemParamConflict, {
                name: "N"
            });
            UnitTest.hasStatusBoxWithError(error);
        });

        it("valid param should work", function() {
            var df = DF.getDataflow(testDfName);
            expect(df.parameters.length).to.equal(0);

            $modal.find(".newParam").val("test")
                  .trigger(fakeEvent.enterKeydown);

            expect($modal.find(".deleteParam").length).to.equal(1);
            expect(df.parameters.length).to.equal(1);
            expect(df.parameters[0]).to.equal("test");
        });

        it("duplicate param name should validate", function() {
            $modal.find(".addParam").click();
            $modal.find(".newParam").val("test")
                  .trigger(fakeEvent.enterKeydown);
            var error = xcHelper.replaceMsg(ErrWRepTStr.ParamConflict, {
                name: "test"
            });
            UnitTest.hasStatusBoxWithError(error);
            // hide the input
            $modal.find(".newParam").val("")
                  .trigger(fakeEvent.enterKeydown);
            assert.isFalse($modal.find(".newParam").is(":visible"));
        });

        it("param delete should work", function() {
            var df = DF.getDataflow(testDfName);
            $modal.find(".deleteParam").eq(0).click();

            expect(df.paramMap.hasOwnProperty("test")).to.be.false;
            expect(df.parameters.length).to.equal(0);
        });

        after(function() {
            DFParamModal.__testOnly__.closeDFParamModal();
        });
    });

    describe("initial state test from export and submit fail test", function() {
        before(function(done) {
            DFParamModal.show($dfWrap.find(".dagTable.export"))
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("modal should be visible", function() {
            expect($modal.is(":visible")).to.be.true;
        });

        it("inputs should be correct", function() {
            expect($modal.find(".template .boxed").length).to.equal(9);
            expect($modal.find(".template .boxed").eq(0).text()).to.equal("export-" + tableName);
            expect($modal.find(".template .boxed").eq(1).text()).to.equal("Default");
            expect($modal.find(".template .boxed").eq(2).text()).to.equal("Do Not Overwrite");
            expect($modal.find(".template .boxed").eq(3).text()).to.equal("\\n");
            expect($modal.find(".template .boxed").eq(4).text()).to.equal("\\t");
            expect($modal.find(".template .boxed").eq(5).text()).to.equal("\"");
            expect($modal.find(".template .boxed").eq(6).text()).to.equal("Every File");
            expect($modal.find(".template .boxed").eq(7).text()).to.equal("True");
            expect($modal.find(".template .boxed").eq(8).text()).to.equal("Multiple Files");
        });

        it("str to special char should work", function() {
            expect(DFParamModal.__testOnly__.strToSpecialChar("\\t")).to.equal("\t");
            expect(DFParamModal.__testOnly__.strToSpecialChar("\"")).to.equal('"');
            expect(DFParamModal.__testOnly__.strToSpecialChar("\'")).to.equal("'");
            expect(DFParamModal.__testOnly__.strToSpecialChar("\\n")).to.equal("\n");
            expect(DFParamModal.__testOnly__.strToSpecialChar("\\t")).to.equal("\t");
            expect(DFParamModal.__testOnly__.strToSpecialChar("\\r")).to.equal("\r");
            expect(DFParamModal.__testOnly__.strToSpecialChar("a")).to.equal("a");
        });

        describe("export submit with invalid file name", function() {
            it("extension in param should work", function(done) {
                var cachedFn = XcalarUpdateRetina;
                var called = false;
                XcalarUpdateRetina = function() {
                    called = true;
                    return PromiseHelper.reject();
                };

                $modal.find(".editableParamQuery input").eq(0).val("ab<test>c");
                $modal.find(".paramName").eq(0).text("test");
                $modal.find(".paramVal").eq(0).val(".csv");
                $modal.find(".row").eq(0).removeClass("unfilled")
                                                  .addClass("currParams");

                DFParamModal.__testOnly__.storeRetina()
                .then(function() {
                    done("failed");
                })
                .fail(function(){
                    expect(called).to.be.true;
                    Alert.forceClose();
                    XcalarUpdateRetina = cachedFn;
                    done();
                });
            });
        });

        after(function() {
            DFParamModal.__testOnly__.closeDFParamModal();
        });
    });

    describe("initial state test from filter with param", function() {
        var paramName = "testParam";
        before(function(done) {
            DF.getDataflow(testDfName).addParameter(paramName);
            DFCard.__testOnly__.addParamToRetina(paramName);

            DFParamModal.show($dfWrap.find(".operationTypeWrap.filter"))
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("modal should be visible", function() {
            expect($modal.is(":visible")).to.be.true;
        });

        it("inputs should be correct", function() {
            expect($modal.find(".template .boxed").length).to.equal(1);
            expect($modal.find(".template").text()).to.equal("Filter:gt(" + colName + ", 3)");
            var $inputs = $modal.find("input");
            expect($inputs.length).to.equal(5);
        });

        it("param should be present", function() {
            expect($modal.find(".draggableDiv").length).to.equal(3);
            expect($("#draggableParam-" + paramName).length).to.equal(1);
            expect($("#draggableParam-N").length).to.equal(1);
        });
    });

    describe("drag n drop", function() {
        var paramName = "testParam";
        before(function() {
            $modal.find("input.editableParamDiv").eq(0).val("abc");
        });

        it("paramDragStart should work", function() {
            var $dummyWrap = $modal.find("input.editableParamDiv").eq(0).siblings(".dummyWrap");
            expect($modal.find("input.editableParamDiv").eq(0).is(":visible")).to.be.true;
            expect($dummyWrap.length).to.equal(1);
            expect($dummyWrap.is(":visible")).to.be.false;
            expect($dummyWrap.find(".line").length).to.equal(0);
            expect($dummyWrap.find(".space").length).to.equal(0);
            expect($dummyWrap.text()).to.equal("");

            startDrag();
            expect($modal.find("input.editableParamDiv").eq(0).is(":visible")).to.be.false;
            expect($dummyWrap.is(":visible")).to.be.true;
            expect($dummyWrap.find(".line").length).to.equal(3);
            expect($dummyWrap.find(".space").length).to.equal(1);
            expect($dummyWrap.text()).to.equal("abc");
        });

        it("paramDropLine should work", function() {
            expect($("#dagModleParamList").find(".currParams").length).to.equal(0);
            dragDropLine();
            var $dummyWrap = $modal.find("input.editableParamDiv").eq(0).siblings(".dummyWrap");
            expect($dummyWrap.text()).to.equal("a<" + paramName + ">bc");
            expect($("#dagModleParamList").find(".currParams").length).to.equal(1);
            expect($("#dagModleParamList").text()).to.equal(paramName);
        });

        it("paramDropSpace should work", function() {
            $modal.find("input.editableParamDiv").eq(0).val("abc");
            startDrag();
            dragDropSpace();
            var $dummyWrap = $modal.find("input.editableParamDiv").eq(0).siblings(".dummyWrap");
            expect($dummyWrap.text()).to.equal("abc<" + paramName + ">");
            expect($("#dagModleParamList").find(".currParams").length).to.equal(1);
            expect($("#dagModleParamList").text()).to.equal(paramName);
        });

        // curr params
        it("paramDragEnd should work", function() {
            var $dummyWrap = $modal.find("input.editableParamDiv").eq(0).siblings(".dummyWrap");
            expect($dummyWrap.is(":visible")).to.be.true;

            var event = $.Event("mouseup");
            var $div = $('<div class="draggableParams currParams"></div>');
            $("#container").prepend($div);
            var $innerDiv1 = $("<div class='paramDragTest1'></div>");
            var $innerDiv2 = $("<div class='paramDragTest2'></div>");
            $div.append($innerDiv1);
            $div.append($innerDiv2);
            event.target = $innerDiv1;
            expect($div.find(".paramDragTest1").length).to.equal(1);
            expect($div.find(".paramDragTest2").length).to.equal(1);
            DFParamModal.__testOnly__.setDragElems($innerDiv1[0], $innerDiv2[0]);
            DFParamModal.paramDragEnd(event);
            expect($div.find(".paramDragTest1").length).to.equal(0);
            expect($div.find(".paramDragTest2").length).to.equal(0);
            $div.remove();
        });

        // sys params
        it("paramDragEnd should work", function() {
            var event = $.Event("mouseup");
            var $div = $('<div class="draggableParams systemParams"></div>');
            $("#container").prepend($div);
            var $innerDiv1 = $("<div class='paramDragTest1'></div>");
            var $innerDiv2 = $("<div class='paramDragTest2'></div>");
            $div.append($innerDiv1);
            $div.append($innerDiv2);
            event.target = $innerDiv1;
            expect($div.find(".paramDragTest1").length).to.equal(1);
            expect($div.find(".paramDragTest2").length).to.equal(1);
            DFParamModal.__testOnly__.setDragElems($innerDiv1[0], $innerDiv2[0]);
            DFParamModal.paramDragEnd(event);
            expect($div.find(".paramDragTest1").length).to.equal(0);
            expect($div.find(".paramDragTest2").length).to.equal(0);
            $div.remove();
        });

        function startDrag() {
            var target = $("#draggableParam-" + paramName)[0];
            var e = jQuery.Event("dragstart", {"target": target});
            e.dataTransfer = {
                "effectAllowed": "",
                "setData": function() {},
                "setDragImage": function() {}
            };
            DFParamModal.paramDragStart(e);
        }

        function dragDropLine() {
            var target = $modal.find(".line")[1];
            var e = jQuery.Event("drop", {"target": target});
            e.dataTransfer = {
                getData: function(){
                    return "draggableParam-" + paramName;
                }
            };
            DFParamModal.paramDropLine(e);
        }
        function dragDropSpace() {
            var target = $modal.find(".space")[0];
            var e = jQuery.Event("drop", {"target": target});
            e.dataTransfer = {
                getData: function(){
                    return "draggableParam-" + paramName;
                }
            };
            DFParamModal.paramDropSpace(e);
        }
    });

    describe("functions tests", function() {
        it("checkForOneParen should work", function() {
            var fn = DFParamModal.__testOnly__.checkForOneParen;
            expect(fn("(")).to.be.true;
            expect(fn("((")).to.be.false;
            expect(fn("'('")).to.be.false;
            expect(fn("('('")).to.be.true;
            expect(fn('"("')).to.be.false;
            expect(fn('"("(')).to.be.true;
            expect(fn('\\"(\\"')).to.be.true;
        });

        it("editableParamDiv on input should work", function(done) {
            var paramName = "testParam";
            var $input = $modal.find(".editableParamQuery input").eq(0);
            $input.val("<" + paramName + ">").trigger("input");
            setTimeout(function() {
                expect($("#dagModleParamList").text()).to.equal(paramName);
                $input.val(colName).trigger("input");
                setTimeout(function() {
                    expect($("#dagModleParamList").text()).to.equal("");
                    done();
                }, 400);
            }, 400);
        });
    });

    describe("DFParam Modal Submit Test", function() {
        it("empty input should be detected", function(done) {
            $modal.find(".editableParamQuery input").eq(0).val("");
            DFParamModal.__testOnly__.storeRetina()
            .then(function() {
                done("fail");
            })
            .fail(function(){
                UnitTest.hasStatusBoxWithError(ErrTStr.NoEmptyMustRevert);
                done();
            });
        });

        it("invalid bracket should be detected", function(done) {
            $modal.find(".editableParamQuery input").eq(0).val("<test");
            DFParamModal.__testOnly__.storeRetina()
            .then(function() {
                done("fail");
            })
            .fail(function(){
                UnitTest.hasStatusBoxWithError("Unclosed parameter bracket detected.");
                done();
            });
        });

        it("invalid param should be detected", function(done) {
            $modal.find(".editableParamQuery input").eq(0).val("<te?st>");
            DFParamModal.__testOnly__.storeRetina()
            .then(function() {
                done("fail");
            })
            .fail(function(){
                UnitTest.hasStatusBoxWithError("No special characters or spaces allowed within parameter braces.");
                done();
            });
        });

        it("empty param value should be detected", function(done) {
            $modal.find(".editableParamQuery input").eq(0).val("lt(" + colName + ", <testParam>)");

            DFParamModal.__testOnly__.checkInputForParam($modal.find(".editableParamQuery input").eq(0));

            DFParamModal.__testOnly__.storeRetina()
            .then(function() {
                done("fail");
            })
            .fail(function(){
                UnitTest.hasStatusBoxWithError("Please fill out this field or keep it empty by checking the checkbox.");
                $modal.find(".paramVal").eq(0).val("4");
                done();
            });
        });

        it("submit should work", function(done) {
            DFParamModal.__testOnly__.storeRetina()
            .then(function() {
                var df = DF.getDataflow(testDfName);
                expect(df.paramMap.testParam).to.equal("4");
                expect($dfWrap.find(".operationTypeWrap.filter").text()).to.equal("filter<Parameterized>");
                expect($dfWrap.find(".operationTypeWrap.filter").hasClass("hasParam")).to.be.true;
                done();
            })
            .fail(function(){
                done("fail");
            });
        });

        it("submit with default param should work", function(done) {
            DFParamModal.show($dfWrap.find(".operationTypeWrap.filter"))
            .then(function() {
                $modal.find(".editableParamQuery input").eq(0).val("lt(" + colName + ", <N>)");
                DFParamModal.__testOnly__.checkInputForParam($modal.find(".editableParamQuery input").eq(0));
                return DFParamModal.__testOnly__.storeRetina();
            })
            .then(function() {
                var df = DF.getDataflow(testDfName);
                expect(df.paramMap.N).to.equal(0);
                done();
            })
            .fail(function(){
                done("fail");
            });
        });
    });

    after(function(done) {
        DFCard.__testOnly__.deleteDataflow(testDfName)
        .always(function() {
            Alert.forceClose();
            DF.refresh = oldRefresh;
            UnitTest.deleteAllTables()
            .then(function() {
                UnitTest.deleteDS(testDs)
                .always(function() {
                    UnitTest.offMinMode();
                    done();
                });
            })
            .fail(function() {
                done("fail");
            });
        });
    });
});

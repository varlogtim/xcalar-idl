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
        UnitTest.onMinMode();
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


    describe("initial state test from export and submit fail test", function() {
        before(function(done) {
            DFParamModal.show($dfWrap.find(".operationTypeWrap.export"))
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
        var cache1;
        var cache2;
        before(function(done) {
            var df = DF.getDataflow(testDfName);
            cache1 = DF.commitAndBroadcast;
            DF.commitAndBroadcast = function(){return;};
            cache2 = DF.getParameters(df);
            DF.updateParamMap({"testParam": {value: "test"}});

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
            expect($inputs.length).to.equal(1);
        });

        it("param should be present", function() {
            expect($modal.find(".draggableDiv").length).to.equal(2);
            expect($("#draggableParam-" + paramName).length).to.equal(1);
            expect($("#draggableParam-N").length).to.equal(1);
        });

        after(function() {
            DF.commitAndBroadcast = cache1;
            cache2 = DF.getParameters;
            DF.updateParamMap(cache2);
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
        });

        it("paramDropSpace should work", function() {
            $modal.find("input.editableParamDiv").eq(0).val("abc");
            startDrag();
            dragDropSpace();
            var $dummyWrap = $modal.find("input.editableParamDiv").eq(0).siblings(".dummyWrap");
            expect($dummyWrap.text()).to.equal("abc<" + paramName + ">");
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

        // assuming type is filter
        describe("validateParamFields function", function() {
            var validate;
            var editor;
            before(function() {
                validate = DFParamModal.__testOnly__.validateParamFields;
                editor = DFParamModal.__testOnly__.getEditor();
            });

            it("should error if key is parameterized", function() {
                editor.setValue(JSON.stringify(
                    {
                      "te<p>st": "val"
                    }
                ));
                expect(validate()).to.be.false;
                UnitTest.hasStatusBoxWithError("Keys cannot be parameterized: te<p>st");
            });

            it("should error if array value is parameterized", function() {
                editor.setValue(JSON.stringify(
                    {
                      "array": ["test", "v<p>al"]
                    }
                ));
                expect(validate()).to.be.false;
                UnitTest.hasStatusBoxWithError("This field cannot be parameterized.");
            });

            it("should error if wrong export key is parameterized", function() {
                editor.setValue(JSON.stringify(
                    {
                      "fakeProperty": "val<p>"
                    }
                ));
                expect(validate()).to.be.false;
                UnitTest.hasStatusBoxWithError("Field \"fakeProperty\" cannot be parameterized.");
            });


            it("should error if other operation is parameterized", function() {
                DFParamModal.__testOnly__.setType("map");
                editor.setValue(JSON.stringify(
                    {
                      "fakeProperty": "val<p>"
                    }
                ));
                expect(validate()).to.be.false;
                UnitTest.hasStatusBoxWithError( "The map operation cannot be parameterized.");
                DFParamModal.__testOnly__.setType("filter");
            });

            it("valid operation should work", function() {
                editor.setValue(JSON.stringify(
                    {
                      "evalString": "val<p>"
                    }
                ));
                expect(validate()).to.be.true;
            });
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

        it("submit should work", function(done) {
            $modal.find(".editableParamQuery input").eq(0).val("lt(" + colName + ", <testParam>)");
            DFParamModal.__testOnly__.storeRetina()
            .then(function() {
                var df = DF.getDataflow(testDfName);
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
                return DFParamModal.__testOnly__.storeRetina();
            })
            .then(function() {
                var df = DF.getDataflow(testDfName);
                expect(df.retinaNodes[tableName].args.eval[0].evalString).to.equal("lt(" + colName + ", <N>)");
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

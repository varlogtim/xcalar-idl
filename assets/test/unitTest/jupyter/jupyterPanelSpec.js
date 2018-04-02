describe("JupyterPanel Test", function() {
    var $iframe;
    var sendMessage;
    before(function() {
        UnitTest.onMinMode();
        $iframe = $('<iframe>');
        $("body").append($iframe);
        $("#jupyterTab .mainTab").click();
        sendMessage = function(msg) {
            var deferred = PromiseHelper.deferred();
            var strMsg = JSON.stringify(msg);
            $iframe.contents().find("html").html('<script>parent.postMessage(JSON.stringify(' + strMsg + '), "*")</script>');
            setTimeout(function() {
                deferred.resolve();
            }, 1);
            return deferred.promise();
        };

        var progCol1 = new ProgCol({
            "name": "testCol1",
            "backName": "prefix::testCol1",
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

        var tableName = "fakeTable#zz999";
        var tableId = "zz999";
        var table = new TableMeta({
            "tableId": tableId,
            "tableName": tableName,
            "status": TableType.Active,
            "tableCols": [progCol1, progCol2]
        });
        gTables[tableId] = table;
    });

    describe("testing message listener", function() {
        it("alert should show", function(done) {
            sendMessage({action: "alert", options: {msg: "Alerted!"}})
            .then(function() {
                UnitTest.hasAlertWithText("Alerted!");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("autofillImportUdf with stub should trigger udf modal", function(done) {
            var called = false;
            var cacheFn = JupyterUDFModal.show;
            JupyterUDFModal.show = function(type, params) {
                expect(type).to.equal("newImport");
                expect(params.target).to.equal("targ");
                expect(params.filePath).to.equal("path");
                called = true;
            };
            sendMessage({action:"autofillImportUdf", includeStub: "true",
            target: "targ", filePath: "path"})
            .then(function() {
                expect(called).to.be.true;

                JupyterUDFModal.show = cacheFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });


        it("autofillImportUdf without stub should open udf panel", function(done) {
            var called1 = false;
            var called2 = false;
            var called3 = false;
            var cacheFn1 = JupyterPanel.appendStub;
            var cacheFn2 = BottomMenu.openSection;
            var cacheFn3 = UDF.selectUDFFuncList;
            JupyterPanel.appendStub = function() {
                called1 = true;
            };
            BottomMenu.openSection = function() {
                called2 = true;
            };
            UDF.selectUDFFuncList = function() {
                called3 = true;
            };
            sendMessage({action:"autofillImportUdf", includeStub: "false",
            target: "targ", filePath: "path"})
            .then(function() {
                expect(called1).to.be.true;
                expect(called2).to.be.true;
                expect(called3).to.be.true;

                JupyterPanel.appendStub = cacheFn1;
                BottomMenu.openSection = cacheFn2;
                UDF.selectUDFFuncList = cacheFn3;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("mixPanel should be triggered", function(done) {
            var called = false;
            mixpanel = window.mixpanel || {};
            xcMixpanel = window.xcMixpanel || {};
            var cacheFn = mixpanel.track;
            mixpanel.track = function() {
                called = true;
            };
            var cacheFn2 = xcMixpanel.forDev;
            xcMixpanel.forDev = function() {
                return true;
            };
            sendMessage({action: "mixpanel"})
            .then(function() {
                expect(called).to.be.true;
                mixpanel.track = cacheFn;
                xcMixpanel.forDev = cacheFn2;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("sendInit should be triggered", function(done) {
            var called = false;
            var cacheFn = JupyterPanel.sendInit;
            JupyterPanel.sendInit = function(isNew) {
                expect(isNew).to.be.true;
                called = true;
            };

            sendMessage({action: "newUntitled"})
            .then(function() {
                expect(called).to.be.true;
                JupyterPanel.sendInit = cacheFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("enterNotebookList should be triggered", function(done) {
            var called = false;
            var cacheFn = JupyterPanel.sendInit;
            JupyterPanel.sendInit = function(isNew) {
                expect(isNew).to.not.be.true;
                called = true;
            };

            sendMessage({action: "enterNotebookList"})
            .then(function() {
                expect(called).to.be.true;
                JupyterPanel.sendInit = cacheFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });


        it("udfToMapForm should be triggered", function(done) {
            var called = false;
            var cacheFn = UDF.refresh;
            UDF.refresh = function(isNew) {
                called = true;
                return PromiseHelper.resolve();
            };

            sendMessage({action: "udfToMapForm", tableName: "testTable"})
            .then(function() {
                expect(called).to.be.true;
                UnitTest.hasAlertWithText("Table testTable is not present in any active worksheets.");
                UDF.refresh = cacheFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("udfToMapForm should not be triggered if fail", function(done) {
            var called = false;
            var cacheFn = UDF.refresh;
            UDF.refresh = function(isNew) {
                called = true;
                return PromiseHelper.reject();
            };

            sendMessage({action: "udfToMapForm", tableName: "testTable"})
            .then(function() {
                expect(called).to.be.true;
                UnitTest.hasAlertWithText("Could not update UDF list.");
                UDF.refresh = cacheFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("udfToDSPreview should be triggered", function(done) {
            var called = false;
            var cacheFn = UDF.refresh;
            UDF.refresh = function(isNew) {
                called = true;
                return PromiseHelper.resolve();
            };

            sendMessage({action: "udfToDSPreview", tableName: "testTable"})
            .then(function() {
                expect(called).to.be.true;
                UnitTest.hasAlertWithText(JupyterTStr.DSFormInactive);
                UDF.refresh = cacheFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("updateLocation should be triggered", function(done) {
            var called = false;
            var cacheFn =  KVStore.prototype.put;
            KVStore.prototype.put = function(isNew) {
                called = true;
                return PromiseHelper.resolve();
            };

            sendMessage({action: "updateLocation"})
            .then(function() {
                expect(called).to.be.true;
                KVStore.prototype.put = cacheFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("Main functions", function() {
        it("Publish table should work", function() {



            var called = false;
            var cacheFn = JupyterFinalizeModal.show;
            JupyterFinalizeModal.show = function() {
                called = true;
            };
            JupyterPanel.publishTable("fakeTable#zz999", 2, false);
            expect(called).to.be.true;
            JupyterFinalizeModal.show = cacheFn;
        });

        it("JupyterPanel.autofillImportUdfModal should work", function() {
            var called1 = false;
            var called2 = false;
            var called3 = false;
            var cacheFn1 = JupyterPanel.appendStub;
            var cacheFn2 = BottomMenu.openSection;
            var cacheFn3 = UDF.selectUDFFuncList;
            JupyterPanel.appendStub = function(type) {
                expect(type).to.equal("importUDF");
                called1 = true;
            };
            BottomMenu.openSection = function() {
                called2 = true;
            };
            UDF.selectUDFFuncList = function() {
                called3 = true;
            };

            var prevNB = JupyterPanel.__testOnly__.getCurNB();
            JupyterPanel.__testOnly__.setCurNB(true);

            JupyterPanel.autofillImportUdfModal(null, null, false);
            expect(called1).to.be.true;
            expect(called2).to.be.true;
            expect(called3).to.be.true;

            JupyterPanel.appendStub = cacheFn1;
            BottomMenu.openSection = cacheFn2;
            UDF.selectUDFFuncList = cacheFn3;

            JupyterPanel.__testOnly__.setCurNB(prevNB);
        });
    });

    describe("menu dropdown", function() {
        it("should be visible on click", function() {
            expect($(".jupyterMenu").is(":visible")).to.be.false;
            $("#jupyterPanel").find(".topBar .dropdownBox").click();
            expect($(".jupyterMenu").is(":visible")).to.be.true;

            $("#jupyterPanel").find(".topBar .dropdownBox").click();
            expect($(".jupyterMenu").is(":visible")).to.be.false;
        });

        it("map li should work", function() {
            var called = false;
            var cacheFn = JupyterUDFModal.show;
            JupyterUDFModal.show = function(type) {
                expect(type).to.equal("map");
                called = true;
            }
            $(".jupyterMenu li[data-action='basicUDF']").click();
            expect(called).to.be.true;
            JupyterUDFModal.show = cacheFn;
        });

        it("import udf li should work", function() {
            var called = false;
            var cacheFn = JupyterUDFModal.show;
            JupyterUDFModal.show = function(type) {
                expect(type).to.equal("newImport");
                called = true;
            }
            $(".jupyterMenu li[data-action='importUDF']").click();
            expect(called).to.be.true;
            JupyterUDFModal.show = cacheFn;
        });


        it("import udf li should work", function() {
            var called = false;
            var cacheFn = JupyterPanel.appendStub;
            JupyterPanel.appendStub = function(name) {
                expect(name).to.equal("connWorkbook");
                called = true;
            }
            $(".jupyterMenu li[data-action='connWorkbook']").click();
            expect(called).to.be.true;
            JupyterPanel.appendStub = cacheFn;
        });
    });

    describe("other functions", function() {
        it("showMapForm should work", function() {
            var called1 = false;
            var cache1 = MainMenu.openPanel;
            MainMenu.openPanel = function(type) {
                expect(type).to.equal("workspacePanel");
                called1 = true;
            };

            var called2 = false;
            var cache2 = OperationsView.show;
            OperationsView.show = function(tId, colNums, type, options) {
                expect(tId).to.equal("zz999");
                expect(colNums[0]).to.equal(1);
                expect(type).to.equal("map");
                expect(options.prefill.ops[0]).to.equal("a:b");
                expect(options.prefill.args[0][0]).to.equal("prefix::testCol1");
                called2 = true;
            };
            JupyterPanel.__testOnly__showMapForm("fakeTable#zz999", ["prefix::testCol1"], "a", "b");
            expect(called1).to.be.true;
            expect(called2).to.be.true;
            MainMenu.openPanel = cache1;
            OperationsView.show = cache2;
        });

        it("showDSForm should work", function() {
            var wasHidden = $("#dsForm-preview").hasClass("xc-hidden");
            $("#dsForm-preview").removeClass("xc-hidden");
            var text = $("#fileFormatMenu").find('li[name="UDF"]').text();
            var prevText = $("#fileFormat .text").val();
            $("#fileFormat .text").val(text);

            var called1 = false;
            var called2 = false;
            var cache1 = MainMenu.openPanel;
            MainMenu.openPanel = function(type, subType) {
                expect(type).to.equal("datastorePanel");
                expect(subType).to.equal("inButton");
                called1 = true;
            };
            $("#dsForm-applyUDF").on("click.testClick", function() {
                called2 = true;
            });

            JupyterPanel.__testOnly__showDSForm("a", "b");
            expect(called1).to.be.true;
            expect(called2).to.be.true;
            MainMenu.openPanel = cache1;

            if (wasHidden) {
                $("#dsForm-preview").addClass("xc-hidden");
            }
            $("#fileFormat .text").val(prevText);
            $("#dsForm-applyUDF").off("click.testClick");
        });
    });

    after(function() {
        $iframe.remove();
        UnitTest.offMinMode();
        delete gTables["zz999"];
    });
});

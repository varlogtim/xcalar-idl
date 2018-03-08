describe("Dataset-DSExport Test", function() {
    var $nameInput;
    var $submitBtn;
    var $targetTypeList;
    var $targetInput;
    var $form;
    var $fileFormatMenu;
    var testTargetName = "unitTestTarget";
    var url = "mnt/nfsshare/xcalar/export";
    var wasAdmin;
    var oldIsAdmin;

    before(function(done) {
        wasAdmin = Admin.isAdmin();
        oldIsAdmin = Admin.isAdmin();
        Admin.isAdmin = function() {
            return true;
        };
        $("#datastorePanel").removeClass("noAdmin");
        $("#datastoreMenu").removeClass("noAdmin");

        UnitTest.onMinMode();
        $nameInput = $("#targetName");
        $submitBtn = $("#exportFormSubmit");
        $submitBtn = $("#exportFormSubmit");
        $targetTypeList = $("#targetTypeList");
        $targetInput = $targetTypeList.find("input");
        $form = $("#exportDataForm");
        $fileFormatMenu = $targetTypeList.find("ul");
        $("#dataStoresTab").click();
        $("#outButton").click();
        // make sure panel is open and we didn't just close it
        if (!$("#datastoreMenu").is(":visible")) {
            $("#outButton").click();
        }
        DSExport.getDefaultPath()
        .then(function(path) {
            url = path;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    describe("DSExport Basic Api Test", function() {
        it("DSExport.toggleXcUDFs should work", function() {
            var $udfModule = $("#exportDataForm").find(".udfModuleListWrap");
            var isHide = UserSettings.getPref("hideXcUDF");
            isHide = isHide || false;
            var $li = $("<li>_xcalar_test</li>");
            $udfModule.append($li);
            DSExport.toggleXcUDFs(!isHide);
            expect($li.hasClass("xcUDF")).to.be.equal(!isHide);

            DSExport.toggleXcUDFs(isHide);
            expect($li.hasClass("xcUDF")).to.be.equal(isHide);
            $li.remove();
        });

        it("DSExport.getTargets should work", function() {
            var res = DSExport.getTargets();
            expect(res).to.be.an("array");
        });

        it("DSExport.getTarget should work", function() {
            var exportTargets = DSExport.getTargets();
            var cache = [];
            exportTargets.forEach(function(target) {
                cache.push(target);
            });

            // case 1
            DSExport.__testOnly__.setTargets([]);
            var res = DSExport.getTarget("test");
            expect(res).to.be.null;

            // case 2
            DSExport.__testOnly__.setTargets([{
                name: ExportTStr.LocalFS,
                targets: [{name: "test"}]
            }]);
            res = DSExport.getTarget("test");
            expect(res).to.be.an("object");
            expect(res.type).to.equal(ExTargetTypeT.ExTargetSFType);
            expect(res.info).to.be.an("object");

            // case 3
            DSExport.__testOnly__.setTargets([{
                name: "UDF",
                targets: [{name: "test"}]
            }]);
            res = DSExport.getTarget("test");
            expect(res).to.be.an("object");
            expect(res.type).to.equal(ExTargetTypeT.ExTargetUDFType);
            expect(res.info).to.be.an("object");

            // restore
            DSExport.__testOnly__.setTargets(cache);
        });

        it("DSExport.getDefaultPath should work", function(done) {
            DSExport.getDefaultPath()
            .then(function(res) {
                expect(res.length).to.be.gt(10);
                expect(res.indexOf("export")).to.be.gt(4);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("DSExport.refresh should handle error case", function(done) {
            var oldList = XcalarListExportTargets;
            XcalarListExportTargets = function() {
                return PromiseHelper.reject({"error": "test"});
            };

            DSExport.refresh()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error.error).to.equal("test");
                UnitTest.hasAlertWithTitle(DSExportTStr.RestoreFail);
                done();
            })
            .always(function() {
                XcalarListExportTargets = oldList;
            });
        });

        it("DSExport.refresh should work", function(done) {
            var oldList = XcalarListExportTargets;
            XcalarListExportTargets = function() {
                return PromiseHelper.resolve({
                    "numTargets": 1,
                    "targets": [{
                        "hdr": {
                            "name": "test",
                            "type": ExTargetTypeT.ExTargetUDFType
                        },
                        "specificInput": {
                            "udfInput": {
                                "url": "testUrl",
                                "appName": "testApp:testFunc"
                            }
                        }
                    }]
                });
            };

            DSExport.refresh()
            .then(function() {
                var $grid = $("#dsExportListSection .grid-unit");
                expect($grid.length).to.equal(1);
                expect($grid.data("name")).to.equal("test");
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarListExportTargets = oldList;
            });
        });
    });

    describe("XcalarListExportTargets", function() {
        it("should return expected struct", function(done) {
            XcalarAddLocalFSExportTarget(testTargetName, url)
            .then(function() {
                return XcalarListExportTargets("*", testTargetName);
            })
            .then(function(targs) {
                expect(targs.numTargets).to.equal(1);
                expect(targs.targets).to.be.an("array");
                var targ = targs.targets[0];
                expect(targ).to.have.all.keys("hdr", "specificInput");
                expect(targ.hdr.name).to.equal(testTargetName);
                expect(targ.hdr.type).to.equal(ExTargetTypeT.ExTargetSFType);
                expect(targ.specificInput.sfInput.url).to.equal("/" + url);
                return XcalarRemoveExportTarget(testTargetName,
                                                ExTargetTypeT.ExTargetSFType);
            })
            .then(function() {
                return XcalarAddUDFExportTarget(testTargetName, url, "a:b");
            })
            .then(function() {
                return XcalarListExportTargets("*", testTargetName);
            })
            .then(function(targs) {
                expect(targs.numTargets).to.equal(1);
                expect(targs.targets).to.be.an("array");
                var targ = targs.targets[0];
                expect(targ).to.have.all.keys("hdr", "specificInput");
                expect(targ.hdr.name).to.equal(testTargetName);
                expect(targ.hdr.type).to.equal(ExTargetTypeT.ExTargetUDFType);
                expect(targ.specificInput.udfInput.url).to.equal("/" + url);
                expect(targ.specificInput.udfInput.appName).to.equal("a:b");
                return XcalarRemoveExportTarget(testTargetName,
                                                ExTargetTypeT.ExTargetUDFType);
            })
            .then(function() {
                done();
            })
            .fail(function() {
                expect("failed").to.equal("success");
            });
        });
    });

    describe("reset", function() {
        it("reset should work", function() {
            $nameInput.val("test");
            expect($nameInput.val()).to.equal("test");
            // select UDF
            $targetTypeList.find("li").eq(1).trigger(fakeEvent.mouseup);
            expect($targetInput.val()).to.equal("UDF");
            expect($targetInput.data("value")).to.equal("UDF");
            expect($("#exportURL").closest(".formRow").hasClass("active"))
            .to.be.true;
            expect($form.find(".udfSelectorRow").hasClass("active"))
            .to.be.true;

            $("#exportURL").val("test");
            expect($("#exportURL").val()).to.equal("test");
            $form.find(".udfModuleListWrap li")
            .eq(0).removeClass("unavailable").trigger(fakeEvent.mouseup);
            expect($form.find(".udfModuleName").val()).to.not.equal("");

            $form.find(".udfFuncName").val("test");
            expect($form.find(".udfFuncName").val()).to.equal("test");
            expect($form.find(".placeholderRow:visible").length).to.equal(0);

            // reset the form
            DSExport.__testOnly__.resetForm();

            expect($nameInput.val()).to.equal("");
            expect($targetInput.val()).to.equal("");
            expect($targetInput.data("value")).to.equal("");
            expect($form.find(".placeholderRow:visible").length).to.equal(1);
            expect($("#exportURL").val()).to.equal("");
            expect($form.find(".udfModuleName").val()).to.equal("");
            expect($form.find(".udfFuncName").val()).to.equal("main");
            expect($(document.activeElement).attr("id")).to.equal("targetName");
        });
    });

    describe("form dropdowns", function() {
        it("target type list should work", function() {
            expect($targetInput.val()).to.equal("");
            expect($targetInput.data("value")).to.equal("");
            expect($fileFormatMenu.is(":visible")).to.be.false;
            expect($form.find(".placeholderRow:visible").length).to.equal(1);

            // open menu
            $targetTypeList.trigger(fakeEvent.click);
            expect($fileFormatMenu.is(":visible")).to.be.true;
            expect($targetTypeList.find("li").eq(0).text())
            .to.equal("File System");
            // select local file system
            $targetTypeList.find("li").eq(0).trigger(fakeEvent.mouseup);
            expect($targetInput.val()).to.equal("File System");
            expect($targetInput.data("value")).to.equal("LocalFilesystem");
            expect($("#exportURL").closest(".formRow").hasClass("active"))
            .to.be.true;
            expect($form.find(".udfSelectorRow").hasClass("active"))
            .to.be.false;
            expect($("#exportURL").attr("placeholder")).to.equal("");

            // open menu
            $targetTypeList.trigger(fakeEvent.click);
            expect($fileFormatMenu.is(":visible")).to.be.true;
            expect($targetTypeList.find("li").eq(1).text()).to.equal("UDF");
            // select UDF
            $targetTypeList.find("li").eq(1).trigger(fakeEvent.mouseup);
            expect($targetInput.val()).to.equal("UDF");
            expect($targetInput.data("value")).to.equal("UDF");
            expect($("#exportURL").closest(".formRow").hasClass("active"))
            .to.be.true;
            expect($form.find(".udfSelectorRow").hasClass("active")).to.be.true;
            expect($("#exportURL").attr("placeholder").indexOf("will default to")).to.equal(0);
        });

        after(function() {
            DSExport.__testOnly__.resetForm();
        });
    });

    describe("form submit with invalid inputs", function() {
        describe("auto name validator should work", function() {
            it("disableSubmit should not be triggered if invalid name", function(done) {
                var cachedDisableSubmit = xcHelper.disableSubmit;
                var cachedValidate = xcHelper.validate;
                var disabled = false;
                xcHelper.disableSubmit = function() {
                    disabled = true;
                };
                xcHelper.validate = function() {
                    return false;
                };

                // fail cases
                $nameInput.val("a*b");
                $submitBtn.click();
                expect(disabled).to.be.false;

                $nameInput.val("a$b");
                $submitBtn.click();
                expect(disabled).to.be.false;

                $nameInput.val("a b");
                $submitBtn.click();
                expect(disabled).to.be.false;

                $nameInput.val("ab");
                $submitBtn.click();
                expect(disabled).to.be.true;

                // wait for submitForm's immediate promise return
                setTimeout(function() {
                    done();
                }, 1);

                xcHelper.disableSubmit = cachedDisableSubmit;
                xcHelper.validate = cachedValidate;
            });
        });

        describe("blank target type", function() {
            it ("blank target type should trigger error", function(done) {
                StatusBox.forceHide();
                expect($targetInput.data("value")).to.be.equal("");
                $nameInput.val("ab");
                $submitBtn.click();

                // wait for submitForm's immediate promise return
                setTimeout(function() {
                    done();
                }, 1);
                expect($("#statusBox:visible").length).to.equal(1);
                expect($("#statusBox").text().indexOf(ErrTStr.NoEmptyList))
                .to.be.gt(-1);
                StatusBox.forceHide();
                DSExport.__testOnly__.resetForm();
            });
        });

        describe("blank path", function() {
            it("blank path should produce error", function(done) {
                StatusBox.forceHide();
                $nameInput.val("ab");
                $targetTypeList.find("li").eq(0).trigger(fakeEvent.mouseup);
                expect($targetInput.val()).to.equal("File System");
                $("#exportURL").val("");
                expect($("#exportURL").val()).to.equal("");
                $submitBtn.click();

                // wait for submitForm's immediate promise return
                setTimeout(function() {
                    done();
                }, 1);
                expect($("#statusBox:visible").length).to.equal(1);
                expect($("#statusBox").text().indexOf(ErrTStr.NoEmpty))
                .to.be.gt(-1);
                StatusBox.forceHide();
                DSExport.__testOnly__.resetForm();
            });
        });

        describe("blank udf module/function", function() {
            it("blank udf module/func should produce error", function(done) {
                StatusBox.forceHide();
                $nameInput.val("ab");
                $targetTypeList.find("li").eq(1).trigger(fakeEvent.mouseup);
                expect($targetInput.val()).to.equal("UDF");
                $("#exportURL").val("http://www.xcalar.com");

                $submitBtn.click();

                // wait for submitForm's immediate promise return
                setTimeout(function() {
                    done();
                }, 1);
                expect($("#statusBox:visible").length).to.equal(1);
                expect($("#statusBox").text().indexOf(ErrTStr.NoEmptyList))
                .to.be.gt(-1);
                StatusBox.forceHide();
            });
        });
    });

    describe("successful form submit", function() {
        var submitForm;
        var oldSend;
        before(function() {
            submitForm = DSExport.__testOnly__.submitForm;
            oldSend = XcSocket.sendMessage;
            XcSocket.sendMessage = function() {};
        });

        it("XcalarAddLocalFSExportTarget should be called", function(done) {
            var localExportCache = XcalarAddLocalFSExportTarget;
            var passed = false;
            XcalarAddLocalFSExportTarget = function() {
                passed = true;
                return PromiseHelper.reject({});
            };

            submitForm("LocalFilesystem", testTargetName, url, {})
            .then(function() {
                done("fail");
            })
            .fail(function(){
                expect(passed).to.be.true;
                done();
            })
            .always(function() {
                XcalarAddLocalFSExportTarget = localExportCache;
                Alert.forceClose();
            });
        });

        it("localFileSystem should work", function(done) {
            var numGrids = $("#gridTarget-FileSystem")
                            .find(".grid-unit").length;
            expect($('.grid-unit[data-name="' + testTargetName + '"]').length)
            .to.equal(0);

            submitForm("LocalFilesystem", testTargetName, url, {})
            .then(function() {
                var newNumGrids = $("#gridTarget-FileSystem")
                                    .find(".grid-unit").length;
                expect(newNumGrids).to.equal(numGrids + 1);
                var $grid = $('.grid-unit[data-name="' + testTargetName + '"]');
                expect($grid.length).to.equal(1);
                expect($grid.data("formatarg")).to.equal("/" + url);

                return XcalarRemoveExportTarget(testTargetName,
                                        ExTargetTypeT.ExTargetSFType);
            })
            .then(function() {
                DSExport.__testOnly__.showExportTargetForm();
                return DSExport.refresh();
            })
            .then(function() {
                done();
            })
            .fail(function(){
                done("fail");
            });
        });

        it("XcalarAddUDFExportTarget should be called", function(done) {
            var exportCache = XcalarAddUDFExportTarget;
            var passed = false;
            XcalarAddUDFExportTarget = function() {
                passed = true;
                return PromiseHelper.reject({});
            };

            submitForm("UDF", testTargetName, url, {module: "a", fn: "b"})
            .then(function() {
                done("fail");
            })
            .fail(function(){
                expect(passed).to.be.true;
                done();
            })
            .always(function() {
                XcalarAddUDFExportTarget = exportCache;
                Alert.forceClose();
            });
        });

        it("UDF should work", function(done) {
            var numGrids = $("#gridTarget-UDF").find(".grid-unit").length;
            expect($('.grid-unit[data-name="' + testTargetName + '"]').length)
            .to.equal(0);

            submitForm("UDF", testTargetName, url, {module: "a", fn: "b"})
            .then(function() {
                var newNumGrids = $("#gridTarget-UDF").find(".grid-unit").length;
                expect(newNumGrids).to.equal(numGrids + 1);
                var $grid = $('.grid-unit[data-name="' + testTargetName + '"]');
                expect($grid.length).to.equal(1);
                expect($grid.data("formatarg")).to.equal("/" + url);

                return XcalarRemoveExportTarget(testTargetName,
                                                ExTargetTypeT.ExTargetUDFType);
            })
            .then(function() {
                DSExport.__testOnly__.showExportTargetForm();
                return DSExport.refresh();
            })
            .then(function() {
                done();
            })
            .fail(function(){
                done("fail");
            });
        });

        it("Error Type should not work", function(done) {
            submitForm("Error Type", testTargetName, url, {module: "a", fn: "b"})
            .then(function() {
                done("fail");
            })
            .fail(function(error){
                expect(error.error).to.equal(DSExportTStr.InvalidTypeMsg);
                UnitTest.hasAlertWithText(DSExportTStr.InvalidTypeMsg);
                done();
            });
        });

        after(function() {
            XcSocket.sendMessage = oldSend;
        });
    });

    describe("grid panel", function() {
        it("should click refre button to refresh", function() {
            var oldRefresh = DSExport.refresh;
            var test = false;
            DSExport.refresh = function() {
                test = true;
            };
            $("#dsExport-refresh").click();
            expect(test).to.be.true;
            DSExport.refresh = oldRefresh;
        });

        it("should toggle export list", function() {
            var $btn = $("#dsExportListSection").find(".targetInfo");
            var $list = $btn.closest(".xc-expand-list");
            var isActive = $list.hasClass("active");

            $btn.click();
            expect($list.hasClass("active")).to.equal(!isActive);
            // toggle back
            $btn.click();
            expect($list.hasClass("active")).to.equal(isActive);
        });

        it("create export button should work", function() {
            $("#dsExportListSection .grid-unit").eq(0).click();
            expect($("#exportTargetEditCard").is(":visible")).to.be.true;
            expect($("#exportTargetCard").is(":visible")).to.be.false;

            $("#createExportButton").click();
            expect($("#exportTargetEditCard").is(":visible")).to.be.false;
            expect($("#exportTargetCard").is(":visible")).to.be.true;

            expect($nameInput.val()).to.equal("");
            expect($targetInput.val()).to.equal("");
            expect($targetInput.data("value")).to.equal("");
            expect($form.find(".placeholderRow:visible").length).to.equal(1);
            expect($("#exportURL").val()).to.equal("");
            expect($form.find(".udfModuleName").val()).to.equal("");
            expect($form.find(".udfFuncName").val()).to.equal("main");
            expect($(document.activeElement).attr("id"))
            .to.equal("targetName");
        });

        it("create export button should not reset form", function() {
            $("#createExportButton").click();
            $nameInput.val("test");
            expect($nameInput.val()).to.equal("test");

            // select UDF
            $targetTypeList.find("li").eq(1).trigger(fakeEvent.mouseup);
            expect($targetInput.val()).to.equal("UDF");

            $("#createExportButton").click();
            expect($nameInput.val()).to.equal("test");
            expect($targetInput.val()).to.equal("UDF");
        });

        it("grid icon should show details", function(done) {
            var submitForm = DSExport.__testOnly__.submitForm;
            submitForm("UDF", testTargetName, url, {module: "a", fn: "b"})
            .then(function() {
                var $grid = $('.grid-unit[data-name="' + testTargetName + '"]');
                expect($grid.length).to.equal(1);

                $("#createExportButton").click();
                expect($("#exportTargetEditCard").is(":visible")).to.be.false;
                expect($("#exportTargetCard").is(":visible")).to.be.true;
                expect($grid.hasClass("active")).to.be.false;

                $grid.click();

                expect($grid.hasClass("active")).to.be.true;
                expect($("#exportTargetEditCard").is(":visible")).to.be.true;
                expect($("#exportTargetCard").is(":visible")).to.be.false;
                expect($("#targetName-edit").val()).to.equal(testTargetName);
                expect($("#targetTypeList-edit input").val()).to.equal("UDF");
                expect($("#exportURL-edit").val()).to.equal("file:///" + url);
                expect($("#exportTargetEditCard .udfModuleName").val())
                .to.equal("a");
                expect($("#exportTargetEditCard .udfFuncName").val())
                .to.equal("b");

                done();
            })
            .fail(function(){
                done("fail");
            });
        });

        it("should click to right menu for action", function() {
            var $grid = $('.grid-unit[data-name="' + testTargetName + '"]');
            var $gridMenu = $("#expTargetGridMenu");
            var $view = $gridMenu.find('li[data-action="view"]');
            var $refresh = $gridMenu.find('li[data-action="refresh"]');
            var $create = $gridMenu.find('li[data-action="create"]');
            // show form case
            $create.trigger(fakeEvent.mouseup);
            expect($grid.hasClass("active")).to.be.false;
            assert.isTrue($("#exportTargetCard").is(":visible"));

            // not left mouseup
            $grid.removeClass("active");
            $view.mouseup();
            expect($grid.hasClass("active")).to.be.false;

            // not avaialable
            $view.addClass("unavailable");
            $view.trigger(fakeEvent.mouseup);
            expect($grid.hasClass("active")).to.be.false;

            // invalid action
            var $fakeAction = $("<li>test</li>").appendTo($gridMenu);
            $fakeAction.trigger(fakeEvent.mouseup);
            expect($grid.hasClass("active")).to.be.false;

            // invalid action 2
            $fakeAction.data("action", "wrongAction");
            $fakeAction.trigger(fakeEvent.mouseup);
            expect($grid.hasClass("active")).to.be.false;

            $fakeAction.remove();

            // view detail case
            $view.removeClass("unavailable");
            $gridMenu.data("grid", $grid);
            $view.trigger(fakeEvent.mouseup);
            expect($grid.hasClass("active")).to.be.true;
            assert.isFalse($("#exportTargetCard").is(":visible"));

            // refresh case
            var test = false;
            var oldRefresh = DSExport.refresh;

            DSExport.refresh = function() {
                test = true;
            };

            $refresh.trigger(fakeEvent.mouseup);
            expect(test).to.be.true;
            DSExport.refresh = oldRefresh;
        });

        it("grid icon menu should work", function(done) {
            var $grid = $('.grid-unit[data-name="' + testTargetName + '"]');
            var $menu = $("#expTargetGridMenu");

            expect($grid.hasClass("selected")).to.be.false;
            expect($menu.is(":visible")).to.be.false;

            // click on grid
            $grid.contextmenu();

            expect($grid.hasClass("selected")).to.be.true;
            expect($menu.is(":visible")).to.be.true;
            expect($menu.find("li:visible").length).to.equal(2);
            expect($menu.find('[data-action="delete"]:visible').length)
            .to.equal(1);

            // click on menu delete
            Alert.forceClose();
            $menu.find('[data-action="delete"]').trigger(fakeEvent.mouseup);

            expect($("#alertModal:visible").length).to.equal(1);
            var removeCalled = false;
            var removeFunc = XcalarRemoveExportTarget;
            var refreshFunc = DSExport.refresh;
            XcalarRemoveExportTarget = function() {
                removeCalled = true;
                return PromiseHelper.resolve();
            };
            DSExport.refresh = function(){};

            $("#alertModal").find(".confirm").click();
            setTimeout(function() {
                expect(removeCalled).to.be.true;
                XcalarRemoveExportTarget = removeFunc;
                DSExport.refresh = refreshFunc;

                XcalarRemoveExportTarget(testTargetName,
                                        ExTargetTypeT.ExTargetUDFType)
                .then(function() {
                    DSExport.__testOnly__.showExportTargetForm();
                    DSExport.refresh()
                    .then(function() {
                        done();
                    })
                    .fail(function() {
                        done("fail");
                    });
                })
                .fail(function() {
                    done("fail");
                });
            },1);
        });
    });

    after(function(done) {
        Admin.isAdmin = oldIsAdmin;
        if (!wasAdmin) {
            $("#datastorePanel").addClass("noAdmin");
            $("#datastoreMenu").addClass("noAdmin");
        }

        // delete even if already deleted to make sure, ignore error messages
        XcalarRemoveExportTarget(testTargetName, ExTargetTypeT.ExTargetSFType)
        .always(function() {
            Alert.forceClose();
            XcalarRemoveExportTarget(testTargetName,
                                    ExTargetTypeT.ExTargetUDFType)
            .always(function() {
                Alert.forceClose();
                UnitTest.offMinMode();
                done();
            });
        });
    });
});

describe("SupTicketModal Test", function() {
    var $modal;
    var $ticketIdSection;
    var $commentSection;

    before(function() {
        $modal = $("#supTicketModal");
        $ticketIdSection = $modal.find(".ticketIDSection");
        $commentSection = $modal.find(".commentSection");
        UnitTest.onMinMode();
    });

    describe("SupTicketModal UI Behavior Test", function() {
        it("should show the modal", function() {
            SupTicketModal.show();
            assert.isTrue($modal.is(":visible"));
        });

        it("should toggle dropdown list", function(){
            var $dropdown = $modal.find(".issueList");
            var $input = $dropdown.find(".text");
            $($dropdown.find("li").get().reverse()).each(function() {
                var $li = $(this);
                $li.trigger(fakeEvent.mouseup);
                expect($input.val()).to.equal($li.text());
            });

            // already selected so shouldn't do anything
            $ticketIdSection.addClass("closed");
            $dropdown.find("li").eq(0).trigger(fakeEvent.mouseup);
            expect($ticketIdSection.hasClass("closed")).to.be.true;
            $ticketIdSection.removeClass("closed");
        });

        it("should toggle check box", function() {
            var $section = $modal.find(".genBundleRow .checkboxSection");
            var $checkbox = $section.find(".checkbox");
            expect($checkbox.hasClass("checked")).to.be.false;
            // check
            $section.click();
            expect($checkbox.hasClass("checked")).to.be.true;
            // uncheck
            $section.click();
            expect($checkbox.hasClass("checked")).to.be.false;
        });

        it("should close the modal", function() {
            $modal.find(".cancel").click();
            assert.isFalse($modal.is(":visible"));
        });

        it("alert modal should not be visible if modal background locked" ,function () {
            expect($modal.hasClass("locked")).to.be.false;
            $("#modalBackground").addClass("locked");

            SupTicketModal.show();

            expect($modal.hasClass("locked")).to.be.true;
            expect($("#alertModal").hasClass("xc-hidden")).to.be.true;

            $modal.find(".cancel").click();
            assert.isFalse($modal.is(":visible"));
            $("#modalBackground").removeClass("locked");
            $modal.removeClass("locked");
            expect($("#alertModal").hasClass("xc-hidden")).to.be.false;
        });
    });

    describe("Existing tickets test", function() {
        var longStr;
        before(function() {
            longStr = "blah blah ".repeat(40);
            SupTicketModal.show();
        });

        it("SupTicketModal.Restore work", function(done) {
            var ret1 = {
                logs: JSON.stringify({tickets: [
                    {"created_at": 12345, "updated_at": 12456, "id": 1, "comment": "abc"},
                    {"created_at": 12348, "id": 2, "comment": longStr}
                ]})
            };

            var ret2 = {
                logs: JSON.stringify({comments: [
                    {"created_at": 12345, "id": 1, "comment": "abc"},
                    {"created_at": 12346, "id": 1, "comment": "ghi"},
                    {"created_at": 12347, "id": 1, "comment": "jkl"}
                ]})
            };

             var ret3 = {
                logs: JSON.stringify({comments: [
                    {"created_at": 12348, "id": 2, "comment": longStr}
                ]})
            };

            var cache1 = XFTSupportTools.getTickets;
            var count = 0;
            XFTSupportTools.getTickets = function() {
                count++;
                if (count === 1) {
                    return PromiseHelper.resolve(ret1);
                } else if (count === 2) {
                    return PromiseHelper.resolve(ret2);
                } else if (count === 3) {
                    return PromiseHelper.resolve(ret3);
                }
            };

            SupTicketModal.restore()
            .then(function() {
                expect($ticketIdSection.find(".tableBody .row").length).to.equal(2);
                expect($ticketIdSection.find(".tableBody .innerRow").length).to.equal(4);
                expect($ticketIdSection.find(".tableBody .row").eq(0).find(".innerRow").length).to.equal(1);
                expect($ticketIdSection.find(".tableBody .row").eq(1).find(".innerRow").length).to.equal(3);
                expect($ticketIdSection.find(".tableBody .comments .text").eq(0).text()).to.equal(longStr);
                expect($ticketIdSection.find(".tableBody .comments .text").eq(1).text()).to.equal("You: abc");


                XFTSupportTools.getTickets = cache1;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("parseTicketList() should work", function() {
            var fn = SupTicketModal.__testOnly__.parseTicketList;
            list = fn([{"created_at": 1, "updated_at": 2}, {"created_at": 1, "updated_at": 1}]);
            expect(list[0].hasUpdate).to.equal(true);
            expect(list[0].author).to.equal("user");
        });

        it("getTickets() errors should work", function(done) {
            var cache1 = XFTSupportTools.getTickets;
            XFTSupportTools.getTickets = function() {
                getCalled = true;
                return PromiseHelper.reject();
            };

            SupTicketModal.__testOnly__.getTickets()
            .then(function(ret) {
                expect(getCalled).to.be.true;
                expect(ret).to.deep.equal([]);
                XFTSupportTools.getTickets = cache1;
                $("#debugAlert .xi-close").click();
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("ticket id radio buttons should work", function() {
            var $dropdown = $modal.find(".issueList");
            $dropdown.find("li").filter(function() {
                return $(this).data("val") === "existing";
            }).trigger(fakeEvent.mouseup);

            expect($ticketIdSection.hasClass("inactive")).to.be.false;
            expect($commentSection.hasClass("inactive")).to.be.true;

            $ticketIdSection.find(".radioButton").eq(0).click();

            expect($ticketIdSection.hasClass("inactive")).to.be.true;
            expect($commentSection.hasClass("inactive")).to.be.false;
            expect($ticketIdSection.find(".row.xc-hidden").length).to.equal(1);
        });

        it("mousedown on commentsection should work", function() {
            $ticketIdSection.find(".innerRow").eq(0).click();
            expect($ticketIdSection.hasClass("inactive")).to.be.false;
            expect($commentSection.hasClass("inactive")).to.be.true;

            $ticketIdSection.find(".tableBody .row").addClass("xc-hidden");

            $commentSection.mousedown();
            expect($ticketIdSection.find(".row").eq(0).hasClass("xc-hidden")).to.be.false;
        });

        it("clicking on comments should expand row", function() {
            $ticketIdSection.find(".tableBody .comments").eq(0).addClass("overflow");
            $ticketIdSection.find(".tableBody .innerRow").eq(0).removeClass("expanded");


            $ticketIdSection.find(".tableBody .comments").eq(0).click();

            expect($ticketIdSection.find(".tableBody .innerRow").eq(0).hasClass("expanded")).to.be.true;
        });

        it("expand comment via icon should work", function() {
            $ticketIdSection.find(".tableBody .innerRow").eq(0).removeClass("expanded");
            expect($ticketIdSection.find(".tableBody .innerRow").eq(0).hasClass("expanded")).to.be.false;
            $ticketIdSection.find(".expand").eq(0).click();
            expect($ticketIdSection.find(".tableBody .innerRow").eq(0).hasClass("expanded")).to.be.true;

            $ticketIdSection.find(".expand").eq(0).click();
            expect($ticketIdSection.find(".tableBody .innerRow").eq(0).hasClass("expanded")).to.be.false;
        });

        it("resize should show or hide expand icon", function() {
            var $bar = $modal.find(".ui-resizable-w").eq(0);
            var pageX = $bar.offset().left;
            var pageY = $bar.offset().top;

            $ticketIdSection.find(".comments").addClass("overflow");
            expect($ticketIdSection.find(".comments.overflow").length).to.equal(4);

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX, pageY: pageY });
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX - 1, pageY: pageY});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX, pageY: pageY });

            expect($ticketIdSection.find(".comments.overflow").length).to.be.lt(4);
        });
    });

    describe("SupTicketModal Submit Test", function() {
        var oldSupport;
        var oldGetLicense;
        var oldApiTop;
        var oldFileTicket;
        var oldDownload;
        var oldSuccess;
        var successMsg;

        before(function() {
            SupTicketModal.show();
            oldSupport = XcalarSupportGenerate;
            oldGetLicense = XFTSupportTools.getLicense;
            oldApiTop = XcalarApiTop;
            oldFileTicket = XFTSupportTools.fileTicket;
            oldDownload = xcHelper.downloadAsFile;
            oldSuccess = xcHelper.showSuccess;

            XFTSupportTools.getLicense = function() {
                return PromiseHelper.resolve("test license");
            };

            XcalarApiTop = function() {
                return PromiseHelper.resolve("test api top");
            };

            XFTSupportTools.fileTicket = function(input) {
                return PromiseHelper.resolve(JSON.parse(input));
            };

            xcHelper.showSuccess = function(input) {
                successMsg = input;
            };

            var $dropdown = $modal.find(".issueList");
            $dropdown.find("li").filter(function() {
                return $(this).data("val") === "new";
            }).trigger(fakeEvent.mouseup);
        });

        it("should trim large logs", function() {
            var cacheFn = Log.getAllLogs;
            Log.getAllLogs = function() {
                return {version: "a",
                        logs: ["try".repeat(60 * KB), "test"],
                        errors: ["a".repeat(40 * KB), "b".repeat(50 * KB), "c".repeat(10 * KB), "d"]
                    };
            };

            var logs = SupTicketModal.__testOnly__.trimRecentLogs();
            logs = JSON.parse(logs);
            expect(logs.logs.length).to.equal(1);
            expect(logs.logs[0]).to.equal("test");
            expect(logs.errors.length).to.equal(3);
            expect(logs.errors[0]).to.equal("d");
            expect(logs.errors[2]).to.equal("b".repeat(50 * KB));

            Log.getAllLogs = cacheFn;
        });

        it("should handle submit bundle error", function(done) {
            var test = false;
            XcalarSupportGenerate = function() {
                test = true;
                return PromiseHelper.reject("test");
            };

            SupTicketModal.__testOnly__.submitBundle()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(test).to.be.true;
                expect($modal.hasClass("bundleError")).to.be.true;
                expect($modal.find(".errorText").text())
                .to.contains(ErrTStr.BundleFailed);
                done();
            });
        });

        it("should submit bundle", function(done) {
            var test = false;
            XcalarSupportGenerate = function() {
                test = true;
                return PromiseHelper.resolve();
            };

            SupTicketModal.__testOnly__.submitBundle()
            .then(function() {
                expect(test).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should submit ticket", function(done) {
            var ticketObj = {
                "type": "",
                "ticketId": null,
                "comment": "",
                "xiLog": "",
                "userIdName": "",
                "userIdUnique": "",
                "sessionName": "",
                "version": {
                    "backendVersion": "",
                    "frontendVersion": "",
                    "thriftVersion": ""
                }
            };

            SupTicketModal.submitTicket(ticketObj)
            .then(function(res) {
                expect(res).to.be.an("object");
                expect(Object.keys(res).length).to.equal(9);
                expect(res).to.have.property("topInfo")
                .and.to.equal("test api top");
                expect(res).to.have.property("userIdName");
                expect(res).to.have.property("userIdUnique");
                expect(res).to.have.property("sessionName");
                expect(res).to.have.property("xiLog");
                expect(res).to.have.property("version")
                .and.to.be.an("object");
                expect(res).to.have.property("ticketId")
                .and.to.be.null;

                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should download ticket", function() {
            var res1 = null;
            var res2 = null;
            xcHelper.downloadAsFile = function(arg1, arg2) {
                res1 = arg1;
                res2 = arg2;
            };
            SupTicketModal.__testOnly__.downloadTicket({"test": "a"});
            expect(res1).to.equal("xcalarTicket.txt");
            expect(res2).to.contains('"test":"a"');
        });

        it("should submit to download", function(done) {
            xcHelper.downloadAsFile = function() {};

            SupTicketModal.__testOnly__.submitForm(true)
            .then(function() {
                expect(successMsg).to.equal(SuccessTStr.DownloadTicket);
                expect($modal.hasClass("downloadSuccess")).to.be.true;
                $modal.removeClass("downloadSuccess");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should handle submit form fail case", function(done) {
            var cache = XFTSupportTools.fileTicket;
            XFTSupportTools.fileTicket = function() {
                return PromiseHelper.reject("test");
            };

            SupTicketModal.__testOnly__.submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                assert.isTrue($("#statusBox").is(":visible"));
                StatusBox.forceHide();
                XFTSupportTools.fileTicket = cache;
                done();
            });
        });

        it("should submit bundle if selected", function() {
            var cache1 = XcalarSupportGenerate;
            var cache2 = XFTSupportTools.fileTicket;
            var cache3 = XFTSupportTools.getLicense;
            var cache4 = KVStore.append;
            var cache5 = SupTicketModal.fetchLicenseInfo;
            var supGenCalled = false;
            XcalarSupportGenerate = function() {
                supGenCalled = true;
                return PromiseHelper.resolve();
            };
            XFTSupportTools.fileTicket = function() {
                return PromiseHelper.resolve({logs: JSON.stringify({ticketId: 5})});
            };
            XFTSupportTools.getLicense = function() {
                return PromiseHelper.resolve();
            };

            KVStore.append = function() {
                return PromiseHelper.resolve();
            };
            SupTicketModal.fetchLicenseInfo = function() {
                return PromiseHelper.resolve({key: "key", "expiration": ""});
            };
            var $dropdown = $modal.find(".issueList");
            $dropdown.find("li").eq(0).trigger(fakeEvent.mouseup);
            $modal.find(".genBundleBox .checkbox").addClass("checked");

            $modal.find('.confirm').click();

            expect(supGenCalled).to.be.true;
            XcalarSupportGenerate = cache1;
            XFTSupportTools.fileTicket = cache2;
            XFTSupportTools.getLicense = cache3;
            KVStore.append = cache4;
            SupTicketModal.fetchLicenseInfo = cache5;
        });

        it("should provide error if no id selected", function() {
            var $dropdown = $modal.find(".issueList");
            $dropdown.find("li").eq(1).trigger(fakeEvent.mouseup);

            $ticketIdSection.find(".radioButton").removeClass("active");
            $modal.find(".download").click();
            UnitTest.hasStatusBoxWithError(MonitorTStr.SelectExistingTicket);
            $ticketIdSection.find(".radioButton").eq(0).addClass("active");
        });

        it("should submit form", function(done) {
            $modal.removeClass("bundleError");
            XcalarSupportGenerate = function() {
                return PromiseHelper.resolve();
            };

            XFTSupportTools.fileTicket = function() {
                return PromiseHelper.resolve({logs: '{"ticketId":123}'});
            };

            var cachedKV = KVStore.append;
            KVStore.append = function() {
                return PromiseHelper.resolve();
            };

            var cache2 = SupTicketModal.fetchLicenseInfo;
            SupTicketModal.fetchLicenseInfo = function() {
                return PromiseHelper.resolve({key: "key", "expiration": ""});
            };

            SupTicketModal.__testOnly__.submitForm()
            .then(function() {
                return UnitTest.testFinish(function() {
                    return $("#alertHeader").find(".text").text().trim() ===
                            SuccessTStr.SubmitTicket;
                });
            })
            .then(function() {
                Alert.forceClose();
                // should close modal after submit
                assert.isFalse($modal.is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                KVStore.append = cachedKV;
                SupTicketModal.fetchLicenseInfo = cache2;
            });
        });

        after(function() {
            XcalarSupportGenerate = oldSupport;
            XFTSupportTools.getLicense = oldGetLicense;
            XcalarApiTop = oldApiTop;
            XFTSupportTools.fileTicket = oldFileTicket;
            xcHelper.downloadAsFile = oldDownload;
            xcHelper.showSuccess = oldSuccess;
            // $modal.find(".cancel").click();
        });
    });

    after(function() {
        UnitTest.offMinMode();
    });
});
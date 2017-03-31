describe("SupTicketModal Test", function() {
    var $modal;

    before(function() {
        $modal = $("#supTicketModal");
        UnitTest.onMinMode();
    });

    describe("SupTicketModal UI Behavior Test", function() {
        it("should show the modal", function() {
            SupTicketModal.show();
            assert.isTrue($modal.is(":visible"));
        });

        it("should toggle dropdown list", function(){
            var $dropdown = $modal.find(".dropDownList");
            var $input = $dropdown.find(".text");
            $dropdown.find("li").each(function() {
                var $li = $(this);
                $li.trigger(fakeEvent.mouseup);
                expect($input.val()).to.equal($li.text());
            });
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
        });

        it("should handle submit bandle error", function(done) {
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
            SupTicketModal.__testOnly__.submitTicket({})
            .then(function(res) {
                expect(res).to.be.an("object");
                expect(Object.keys(res).length).to.equal(7);
                expect(res).to.have.property("topInfo")
                .and.to.equal("test api top");
                expect(res).to.have.property("license")
                .and.to.equal("test license");
                expect(res).to.have.property("userIdName");
                expect(res).to.have.property("userIdUnique");
                expect(res).to.have.property("sessionName");
                expect(res).to.have.property("xiLog");
                expect(res).to.have.property("version")
                .and.to.be.an("object");
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

        it("should handle sumit form fail case", function(done) {
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
                done();
            });
        });

        it("should submit form", function(done) {
            XcalarSupportGenerate = function() {
                return PromiseHelper.resolve();
            };

            XFTSupportTools.fileTicket = function() {
                return PromiseHelper.resolve();
            };

            SupTicketModal.__testOnly__.submitForm()
            .then(function() {
                expect(successMsg).to.equal(SuccessTStr.SubmitTicket);
                // should close modal after submit
                assert.isFalse($modal.is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
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
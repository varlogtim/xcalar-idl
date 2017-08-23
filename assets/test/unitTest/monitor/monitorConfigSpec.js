describe("MonitorConfig Test", function() {
    var $configCard;
    before(function() {
        $configCard = $("#configCard");
        $("#monitorTab .mainTab").click();
        $("#monitor-setup").addClass("active");
    });

    describe("refresh params", function() {
        it("refresh params should work", function(done) {
            MonitorConfig.refreshParams(true)
            .then(function() {
                expect($configCard.find('.paramName').length).to.be.gt(0);
                done();
            });
        });
    });

    describe("cancel params", function() {
        it("cancel params should work", function() {
            var $row = $configCard.find(".formRow.nameIsSet:not(.uneditable)")
                                  .eq(0);
            var oldVal = $row.find(".curVal").val();
            $row.find(".newVal").val("abc");
            $configCard.find(".resetAll").click();
            expect($row.find(".newVal").val()).to.equal(oldVal);
        });
    });

    describe("submitParamName", function() {
        it("add row should work", function() {
            var numRows = $configCard.find(".formRow").length;
            expect($configCard.find(".formRow").last().hasClass("placeholder")).to.be.true;
            $configCard.find(".formRow").last().click();
            expect($configCard.find(".formRow").length).to.equal(numRows + 1);
            var $penultimateRow = $configCard.find(".formRow").last().prev();
            expect($penultimateRow.hasClass("nameIsSet")).to.be.false;
        });

        it("submitParamName should work", function() {
            var $paramName = $configCard.find('.paramName').last();
            var $curVal = $paramName.closest(".formRow").find(".curVal");
            expect($paramName.closest(".formRow").hasClass("nameIsSet")).to.be.false;


            $curVal.val("invalidName");
            $paramName.val("invalidName").change();
            expect($curVal.val()).to.equal("");

            $curVal.val("invalidName");
            $paramName.val("invalidName").trigger(fakeEvent.enter);
            expect($curVal.val()).to.equal("");
            UnitTest.hasStatusBoxWithError(ErrTStr.ConfigParamNotFound);

            $paramName.val("buffercachepercentoftotalmem").trigger(fakeEvent.enter);
            UnitTest.hasStatusBoxWithError(ErrTStr.ConfigParamExists);

            $paramName.val("buffercachememlocking").trigger(fakeEvent.enter);
            expect($paramName.val()).to.equal("BufferCacheMemLocking");
            expect($paramName.closest(".formRow").hasClass("nameIsSet")).to.be.true;
            expect($paramName.closest(".formRow").find(".newVal").val()).to.equal("");
            expect($paramName.closest(".formRow").hasClass("uneditable")).to.be.true;
        });

        it("submit should handle not found case", function() {
            var $paramName = $configCard.find('.paramName').last();
            $paramName.closest(".formRow").removeClass("uneditable");
            $paramName.val("").trigger(fakeEvent.enter);
            $('#paramSettingsSave').click();
            UnitTest.hasStatusBoxWithError(ErrTStr.ConfigParamNotFound);
        });

        it("submit should handle no empty case", function() {
            var $paramName = $configCard.find('.paramName').last();
            $paramName.closest(".formRow").removeClass("uneditable");
            $paramName.val("buffercachememlocking");
            $paramName.closest(".formRow").find(".newVal").val("").trigger(fakeEvent.enterKeydown);
            $('#paramSettingsSave').click();
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        });

        it("submit fail should work", function() {
            var $paramName = $configCard.find('.paramName').last();
            $paramName.closest(".formRow").removeClass("uneditable");
            $paramName.val("TestMode").trigger(fakeEvent.enter);
            $paramName.closest(".formRow").removeClass("uneditable");
            $configCard.find(".newVal").last().val("testVal");

            var cachedFn = XcalarSetConfigParams;
            var configCalled = false;
            XcalarSetConfigParams = function() {
                configCalled = true;
                return PromiseHelper.reject({});
            };


            $('#paramSettingsSave').click();

            expect(configCalled).to.be.true;
            UnitTest.hasAlertWithTitle(MonitorTStr.ParamConfigFailed);
            XcalarSetConfigParams = cachedFn;
        });
    });

    describe("reset", function() {
        it("reset button should work", function() {
            $configCard.find(".defaultParam").last().click();
            expect($configCard.find(".newVal").last().val()).to.not.equal("");
        });

        it("remove row should work", function() {
            var numRows = $configCard.find(".formRow").length;
            $configCard.find(".removeRow").last().click();
            expect($configCard.find(".formRow").length).to.equal(numRows - 1);
        });
    });

    describe("other", function() {
        it("resizing card should work", function() {
            $configCard.find(".toggleSize .headerBtn:visible").click();
            expect($configCard.height()).to.be.lt(100);
            $configCard.find(".toggleSize .headerBtn:visible").click();
            expect($configCard.height()).to.be.gt(100);
        });
    });

    after(function() {
        $("#monitor-setup").removeClass(".active");
    });
});
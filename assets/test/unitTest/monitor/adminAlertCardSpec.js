describe("Admin Alert Card Test", function() {
    var $menu;
    var $card;
    var testMsg;
    var oldFunc;
    before(function(){
        UnitTest.onMinMode();

        $menu = $("#adminAlert");
        $card = $("#adminAlertCard");
        testMsg = "testing";
        oldFunc =  XcSocket.prototype.sendMessage;
        XcSocket.prototype.sendMessage = function() {};

        if (!Admin.isAdmin()) {
            AdminAlertCard.setup();
        }
    });
    describe("UI behavior Test", function() {
        it("Should show admin alert card", function() {
            $menu.click();
            assert.isFalse($card.hasClass("xc-hidden"));
        });
        it("Should enable send button when input is not empty", function() {
            $card.find(".alert-msg").val(testMsg);
            var inputEvent = $.Event("input");
            $card.find(".alert-msg").trigger(inputEvent);
            assert.isFalse($card.find(".confirm").hasClass("btn-disabled"));
        });
        it("Should clear input", function() {
            $card.find(".clear").click();
            expect($card.find(".alert-msg").val()).to.be.empty;
            assert.isTrue($card.find(".confirm").hasClass("btn-disabled"));
        });
        it("Should disable send button when input is empty", function() {
            $card.find(".alert-msg").val("");
            var inputEvent = $.Event("input");
            $card.find(".alert-msg").trigger(inputEvent);
            assert.isTrue($card.find(".confirm").hasClass("btn-disabled"));
        });
        it("Should submit form when click send button", function() {
            var oldFunc = XcSocket.Instance.sendMessage;
            var called = false;
            XcSocket.Instance.sendMessage = function() {
                called = true;
            };
            $card.find(".alert-msg").val(testMsg);
            $card.find(".confirm").click();
            expect($card.find(".alert-msg").val()).to.be.empty;
            expect(called).to.be.true;
            XcSocket.Instance.sendMessage = oldFunc;
        });
        it("Should submit form when press enter", function() {
            var oldFunc = XcSocket.Instance.sendMessage;
            var called = false;
            XcSocket.Instance.sendMessage = function() {
                called = true;
            };
            $card.find(".alert-msg").val(testMsg);
            var keyEvent = $.Event("keypress", {which: keyCode.Enter});
            $card.find(".alert-msg").trigger(keyEvent);
            expect($card.find(".alert-msg").val()).to.be.empty;
            expect(called).to.be.true;
            XcSocket.Instance.sendMessage = oldFunc;
        });
        it("Should close card", function() {
            $card.find(".close").click();
            assert.isTrue($card.hasClass("xc-hidden"));
        });
    });

    after(function() {
        UnitTest.offMinMode();
        XcSocket.prototype.sendMessage = oldFunc;
    });
});
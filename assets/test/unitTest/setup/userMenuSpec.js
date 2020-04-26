describe("UserMenu Test", function() {
    var $menu;

    before(function() {
        $menu = $("#userMenu");
    });

    it("should click username area to open dropdown", function() {
        $("#userNameArea").click();
        assert.isTrue($menu.is(":visible"));

        $("#userNameArea").click();
        assert.isFalse($menu.is(":visible"));
    });


    it("should mouseup .about to open about modal", function() {
        var oldFunc = AboutModal.Instance.show;
        var test = false;
        AboutModal.Instance.show = function() { test = true; };
        // normal moouseup not work
        $menu.find(".about").mouseup();
        expect(test).to.be.false;
        $menu.find(".about").trigger(fakeEvent.mouseup);
        expect(test).to.be.true;
        // clear up
        AboutModal.Instance.show = oldFunc;
    });

    it("should mouseup logout button to sign out", function() {
        var oldFunc = xcManager.unload;
        var test = false;
        xcManager.unload = function() {
            test = true;
            return PromiseHelper.resolve()
        };
        // normal moouseup not work
        $("#logout").mouseup();
        expect(test).to.be.false;
        $("#logout").trigger(fakeEvent.mouseup);
        expect(test).to.be.true;

        xcManager.unload = oldFunc;
    });
});
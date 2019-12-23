describe("Bottom Menu Test", function() {
    before(function() {
        if (BottomMenu.isMenuOpen()) {
            BottomMenu.close(true);
        }
    });

    describe("Basic API Test", function() {
        it("BottomMenu.openSection should work", function() {
            expect(BottomMenu.isMenuOpen()).to.be.false;
            BottomMenu.openSection(0);
            expect(BottomMenu.isMenuOpen()).to.be.true;
        });

        it("BottomMenu.isPoppedOut should work", function() {
            expect(BottomMenu.isPoppedOut()).to.be.false;
        });

        it("BottomMenu.close should work", function() {
            BottomMenu.close(true);
            expect(BottomMenu.isMenuOpen()).to.be.false;
        });
    });

    // XXX TODO: move to funcitonal test
    describe("UI Behavior Test", function() {
        var $bottomMenu;

        before(function(done) {
            $bottomMenu = $("#bottomMenu");
            UnitTest.testFinish(function() {
                return !$("#menuBar").hasClass("animating");
            })
            .then(function() {
                done();
            })
            .fail(function() {
                // error handler, if it fails, try call close again
                BottomMenu.close(true);
                done();
            });
        });

        it("should click to open bottom menu", function() {
            var $tab = $("#udfTab");
            $tab.click();
            expect($tab.hasClass("active")).to.be.true;
            expect(BottomMenu.isMenuOpen()).to.be.true;
            expect($bottomMenu.hasClass("open")).to.be.true;
        });

        it("should pop out the bottom menu", function() {
            $bottomMenu.find(".popOut").click();
            expect($bottomMenu.hasClass("poppedOut")).to.be.true;
            expect(BottomMenu.isPoppedOut()).to.be.true;
            expect(MainMenu.getOffset()).to.be.an("number");
        });

        // it("should resize the right bar of bottom", function() {
        //     var $bar = $bottomMenu.find(".ui-resizable-e").eq(0);
        //     var width = $bottomMenu.width();
        //     var pageX = $bar.offset().left + width;
        //     var pageY = $bar.offset().top;

        //     $bar.trigger("mouseover");
        //     $bar.trigger({
        //         "type": "mousedown",
        //         "which": 1,
        //         "pageX": pageX,
        //         "pageY": pageY
        //     });
        //     $bar.trigger({
        //         "type": "mousemove",
        //         "which": 1,
        //         "pageX": pageX + 1,
        //         "pageY": pageY
        //     });
        //     $bar.trigger({
        //         "type": "mouseup",
        //         "which": 1,
        //         "pageX": pageX,
        //         "pageY": pageY
        //     });

        //     expect($bottomMenu.width() > width).to.be.true;
        // });

        // it("should resize the left bar of bottom", function() {
        //     var $bar = $bottomMenu.find(".ui-resizable-w").eq(0);
        //     var width = $bottomMenu.width();
        //     var pageX = $bar.offset().left;
        //     var pageY = $bar.offset().top;

        //     $bar.trigger("mouseover");
        //     $bar.trigger({
        //         "type": "mousedown",
        //         "which": 1,
        //         "pageX": pageX,
        //         "pageY": pageY
        //     });
        //     $bar.trigger({
        //         "type": "mousemove",
        //         "which": 1,
        //         "pageX": pageX + 1,
        //         "pageY": pageY
        //     });
        //     $bar.trigger({
        //         "type": "mouseup",
        //         "which": 1,
        //         "pageX": pageX,
        //         "pageY": pageY
        //     });

        //     expect($bottomMenu.width() < width).to.be.true;
        // });

        // it("should resize the top bar of bottom", function() {
        //     var $bar = $bottomMenu.find(".ui-resizable-n").eq(0);
        //     var height = $bottomMenu.height();
        //     var pageX = $bar.offset().left;
        //     var pageY = $bar.offset().top;

        //     $bar.trigger("mouseover");
        //     $bar.trigger({
        //         "type": "mousedown",
        //         "which": 1,
        //         "pageX": pageX,
        //         "pageY": pageY
        //     });
        //     $bar.trigger({
        //         "type": "mousemove",
        //         "which": 1,
        //         "pageX": pageX,
        //         "pageY": pageY + 1
        //     });
        //     $bar.trigger({
        //         "type": "mouseup",
        //         "which": 1,
        //         "pageX": pageX,
        //         "pageY": pageY
        //     });

        //     expect($bottomMenu.height() < height).to.be.true;
        // });

        // it("should resize the bottom bar of bottom", function() {
        //     var $bar = $bottomMenu.find(".ui-resizable-s").eq(0);
        //     var height = $bottomMenu.height();
        //     var pageX = $bar.offset().left;
        //     var pageY = $bar.offset().top + height;

        //     $bar.trigger("mouseover");
        //     $bar.trigger({
        //         "type": "mousedown",
        //         "which": 1,
        //         "pageX": pageX,
        //         "pageY": pageY
        //     });
        //     $bar.trigger({
        //         "type": "mousemove",
        //         "which": 1,
        //         "pageX": pageX,
        //         "pageY": pageY + 1
        //     });
        //     $bar.trigger({
        //         "type": "mouseup",
        //         "which": 1,
        //         "pageX": pageX,
        //         "pageY": pageY
        //     });

        //     expect($bottomMenu.height() > height).to.be.true;
        // });

        // it("should resize the bottom right bar of bottom", function() {
        //     var $bar = $bottomMenu.find(".ui-resizable-se").eq(0);
        //     var height = $bottomMenu.height();
        //     var width = $bottomMenu.width();
        //     var pageX = $bar.offset().left + width;
        //     var pageY = $bar.offset().top + height;

        //     $bar.trigger("mouseover");
        //     $bar.trigger({
        //         "type": "mousedown",
        //         "which": 1,
        //         "pageX": pageX,
        //         "pageY": pageY
        //     });
        //     $bar.trigger({
        //         "type": "mousemove",
        //         "which": 1,
        //         "pageX": pageX + 1,
        //         "pageY": pageY + 1
        //     });
        //     $bar.trigger({
        //         "type": "mouseup",
        //         "which": 1,
        //         "pageX": pageX,
        //         "pageY": pageY
        //     });

        //     expect($bottomMenu.width() > width).to.be.true;
        //     expect($bottomMenu.height() > height).to.be.true;
        // });

        it("should pop in the bottom menu", function() {
            $bottomMenu.find(".popOut").click();
            expect($bottomMenu.hasClass("poppedOut")).to.be.false;
            expect(BottomMenu.isPoppedOut()).to.be.false;
            expect(MainMenu.getOffset()).to.be.an("number");
        });

        it("should close the menu", function() {
            $bottomMenu.find(".close").click();
            expect(BottomMenu.isMenuOpen()).to.be.false;
            expect($bottomMenu.hasClass("open")).to.be.false;
        });
    });
});
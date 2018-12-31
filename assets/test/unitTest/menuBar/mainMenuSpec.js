describe("Main Menu Test", function() {
    var $menuBar;
    var $mainMenu;

    before(function() {
        $menuBar = $("#menuBar");
        $mainMenu = $("#mainMenu");

        if (MainMenu.isMenuOpen()) {
            MainMenu.close(true);
        }
    });

    describe("Basic API Test", function() {
        it("MainMenu.open should work", function() {
            MainMenu.open(true);
            expect($mainMenu.hasClass("open")).to.be.true;
        });

        it("MainMenu.isMenuOpen should work", function() {
            expect(MainMenu.isMenuOpen()).to.be.true;
            expect(MainMenu.isMenuOpen("mainMenu")).to.be.true;
            expect(MainMenu.isMenuOpen("bottomMenu")).to.be.false;
        });

        it("MainMenu.getOffset should work", function() {
            expect(MainMenu.getOffset()).to.be.an("number");
        });

        it("MainMenu.getState should work", function() {
            var state = MainMenu.getState();
            expect(state).to.be.an("object");
            expect(Object.keys(state).length).to.equal(6);
        });

        it("should set form open and close", function() {
            var isFormOpen = MainMenu.setFormClose();
            expect(isFormOpen).to.be.false;

            isFormOpen = MainMenu.setFormOpen();
            expect(isFormOpen).to.be.true;
        });

        it("MainMenu.openPanel should work", function() {
            $(".topMenuBarTab.active").removeClass("active");
            MainMenu.openPanel("test");
            expect($(".topMenuBarTab.active").length).to.equal(0);

            MainMenu.openPanel("monitorPanel");
            expect($("#monitorTab").hasClass("active")).to.be.true;

            MainMenu.openPanel("dagPanel");
            expect($("#modelingDataflowTab").hasClass("active")).to.be.true;

            MainMenu.openPanel("dagPanel");
            expect($("#modelingDataflowTab").hasClass("active")).to.be.true;

            MainMenu.openPanel("datastorePanel");
            expect($("#dataStoresTab").hasClass("active")).to.be.true;
        });

        it("MainMenu.close should work", function() {
            MainMenu.close(true);
            expect($mainMenu.hasClass("open")).to.be.false;
            expect(MainMenu.isMenuOpen()).to.be.false;
        });
    });

    describe("UI Behavior Test", function() {
        it("should resize menu to be bigger", function() {
            var $bar = $mainMenu.find("> .ui-resizable-e").eq(0);
            var width = $mainMenu.width();
            var pageX = $bar.offset().left + width;
            var pageY = $bar.offset().top;

            $bar.trigger("mouseover");
            $bar.trigger({
                "type": "mousedown",
                "which": 1,
                "pageX": pageX,
                "pageY": pageY
            });
            $bar.trigger({
                "type": "mousemove",
                "which": 1,
                "pageX": pageX + 100,
                "pageY": pageY
            });
            $bar.trigger({
                "type": "mouseup",
                "which": 1,
                "pageX": pageX,
                "pageY": pageY
            });

            expect($mainMenu.width() > width).to.be.true;
        });

        it("should resize menu to be smaller", function() {
            var $bar = $mainMenu.find("> .ui-resizable-e").eq(0);
            var width = $mainMenu.width();
            var pageX = $bar.offset().left + width;
            var pageY = $bar.offset().top;

            $bar.trigger("mouseover");
            $bar.trigger({
                "type": "mousedown",
                "which": 1,
                "pageX": pageX,
                "pageY": pageY
            });
            $bar.trigger({
                "type": "mousemove",
                "which": 1,
                "pageX": pageX - 100,
                "pageY": pageY
            });
            $bar.trigger({
                "type": "mouseup",
                "which": 1,
                "pageX": pageX,
                "pageY": pageY
            });

            expect($mainMenu.width() < width).to.be.true;
        });

        it("should toggle menu", function(done) {
            var $tab;
            var isMenuOpen = MainMenu.isMenuOpen();
            UnitTest.testFinish(function() {
                return !$("#menuBar").hasClass("animating");
            })
            .then(function() {
                $tab = $menuBar.find(".topMenuBarTab.active");
                $tab.find(".mainTab").click();
                expect(MainMenu.isMenuOpen()).to.equal(!isMenuOpen);

                return UnitTest.testFinish(function() {
                    return !$("#menuBar").hasClass("animating");
                });
            })
            .then(function() {
                // toggle back
                $tab.find(".mainTab").click();
                expect(MainMenu.isMenuOpen()).to.equal(isMenuOpen);
                done();
            })
            .fail(function() {
                done(); // continue the test
            });
        });

        it("should click minimizeBtn to close menu", function(done) {
            UnitTest.testFinish(function() {
                return !$("#menuBar").hasClass("animating");
            })
            .then(function() {
                $mainMenu.find(".minimizeBtn").click();
                expect(MainMenu.isMenuOpen()).to.be.false;
                done();
            })
            .fail(function() {
                done(); // continue the test
            });

        });
    });
});
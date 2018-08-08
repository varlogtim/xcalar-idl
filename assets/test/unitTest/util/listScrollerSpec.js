describe("ListScroller Test", function() {
    var $list;
    var listScroller;

    function timeoutPromise(timeTmp) {
        var time = timeTmp || 200;
        var deferred = PromiseHelper.deferred();
        setTimeout(function() {
            deferred.resolve();
        }, time);
        return deferred;
    }

    before(function(done) {
        //Piggybacks onto dagTabManager to test horizontal scrolling
        UnitTest.onMinMode();
        var repStr = "";
        for (i = 0; i < 100; i++) {
            repStr += '<li class="dagTab"><div class="name">' + i +
            '</div><div class="after"><i class="icon xi-close-no-circle"></i></div></li>';
        }
        var dagTabManager = DagTabManager.Instance;
        dagTabManager.setup();
        //dagTabManager.reset();
        return timeoutPromise(100)
        .then(() => {
            $("#dagTabSectionTabs ul").append(repStr);
            done();
        });
    });

    it("List scrolling should work", function(done) {
        //Format of this test is similar to the test for MenuHelper in ephConstructorSpec.js
        $("#dagTabSectionTabs .scrollArea").show();
        var oldX = $("#dagTabSectionTabs li").last().position().left;
        var newX;
        $("#dagTabSectionTabs .scrollArea.bottom").mouseenter();

        UnitTest.testFinish(function() {
            return $("#dagTabSectionTabs li").last().position().left < oldX;
        })
        .then(function() {
            $("#dagTabSectionTabs .scrollArea.bottom").mouseleave();
            newX = $("#dagTabSectionTabs li").last().position().left;
            expect(newX).to.be.below(oldX);
            oldX = newX;
            return timeoutPromise(100);
        })
        .then(function() {
            newY = $("#dagTabSectionTabs li").last().position().left;
            expect(oldX).to.equal(newX);

            $("#dagTabSectionTabs .scrollArea.top").mouseenter();

            return UnitTest.testFinish(function() {
                return $("#dagTabSectionTabs li").last().position().left > oldX;
            });
        })
        .then(function() {
            newX = $("#dagTabSectionTabs li").last().position().left;
            expect(oldX).to.be.below(newX);
            done();
        });
    });

    after(function(done) {
        $("#dagTabSectionTabs ul").empty();
        DagTabManager.Instance.reset();
        done();
    });
});
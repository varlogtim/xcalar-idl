describe("DFCommentModal Test", function() {
    var $opIcon;
    var $modal;
    var node;
    var $dagWrap;
    before(function() {
        UnitTest.onMinMode();
        $modal = $("#dfCommentModal");
        $opIcon = $('<div class="operationTypeWrap"><div class="typeTitle">Test</div></div>');
        var $dagTable = $('<div class="dagTable" data-nodeid="0"><div class="tableTitle">somename</div></div>');
        $dagWrap = $('<div class="dagWrap"><div class="dagTableWrap"></div></div>');
        $dagWrap.find(".dagTableWrap").append($opIcon);
        $dagWrap.find(".dagTableWrap").append($dagTable);
        node = {
                value: {
                    name: "somename",
                    comment: {userComment:"", meta:{}}
                }
            }
        $dagWrap.data("allDagInfo", {
            nodeIdMap: {
                0: node
            }
        });
        $("#dagPanel").append($dagWrap);
    });
    describe("testing show and initial state", function() {
        it("should show with no comment", function() {
            DFCommentModal.show($opIcon, 0);
            expect($modal.hasClass("hasComment")).to.be.false;
            expect($modal.find(".modalHeader .text").text()).to.equal("Test");
            $modal.find(".close").click();
        });
        it("should show with comment", function() {
            node.value.comment = {userComment:"something", meta:{}};
            DFCommentModal.show($opIcon, 0);
            expect($modal.hasClass("hasComment")).to.be.true;
            expect($modal.find("textarea").val()).to.equal("something");

        });
        it("should not open if already open", function() {
            node.value.comment = {userComment:"somethingElse", meta:{}};
            DFCommentModal.show($opIcon, 0);
            expect($modal.find("textarea").val()).to.equal("something");
            node.value.comment = {userComment:"something", meta:{}};

        });
        it("clear should work", function() {
            expect($modal.find("textarea").val()).to.equal("something");
            $modal.find(".clear").click();
            expect($modal.find("textarea").val()).to.equal("");
        });

    });

    describe("submitting", function() {
        it("should validate length", function() {
            var cachedFn = XcalarCommentDagNodes;
            var called = false;
            XcalarCommentDagNodes = function() {
                called = true;
                return PromiseHelper.reject();
            };
            var text = "a".repeat(XcalarApisConstantsT.XcalarApiMaxDagNodeCommentLen + 1);

            $modal.find("textarea").val(text);
            $modal.find(".confirm").click();
            UnitTest.hasStatusBoxWithError('The maximum allowable comment length is ' +
            XcalarApisConstantsT.XcalarApiMaxDagNodeCommentLen +
            ' but you provided ' + (XcalarApisConstantsT.XcalarApiMaxDagNodeCommentLen + 1) + ' characters.');
            expect(called).to.be.false;
            XcalarCommentDagNodes = cachedFn;
        });

        it("valid comment should work", function() {
            var cachedFn = XcalarCommentDagNodes;
            var called = false;
            XcalarCommentDagNodes = function(newComment, tableNames) {
                expect(newComment).to.equal('{"userComment":"' + text + '","meta":{}}');
                expect(tableNames.length).to.equal(1);
                expect(tableNames[0]).to.equal("somename");
                called = true;
                return PromiseHelper.resolve();
            };

            var text = "a".repeat(XcalarApisConstantsT.XcalarApiMaxDagNodeCommentLen);
            $modal.find("textarea").val(text);
            $modal.find(".confirm").click();


            expect(called).to.be.true;
            expect($opIcon.hasClass("hasComment")).to.be.true;
            expect(node.value.comment.userComment).to.equal(text);

            XcalarCommentDagNodes = cachedFn;
        });

        it("no comment should work", function() {
            DFCommentModal.show($opIcon, 0);
            var cachedFn = XcalarCommentDagNodes;
            var called = false;
            XcalarCommentDagNodes = function(newComment, tableNames) {
                expect(newComment).to.equal('{"userComment":"","meta":{}}');
                expect(tableNames.length).to.equal(1);
                expect(tableNames[0]).to.equal("somename");
                called = true;
                return PromiseHelper.resolve();
            };

            $modal.find("textarea").val("");
            $modal.find(".confirm").click();

            expect(called).to.be.true;
            expect($opIcon.hasClass("hasComment")).to.be.false;
            expect(node.value.comment.userComment).to.equal("");

            XcalarCommentDagNodes = cachedFn;
        });

        it("error should show", function() {
            DFCommentModal.show($opIcon, 0);
            var cachedFn = XcalarCommentDagNodes;
            var called = false;
            XcalarCommentDagNodes = function(newComment, tableNames) {
                expect(newComment).to.equal('{"userComment":"","meta":{}}');
                expect(tableNames.length).to.equal(1);
                expect(tableNames[0]).to.equal("somename");
                called = true;
                return PromiseHelper.reject();
            };

            $modal.find("textarea").val("");
            $modal.find(".confirm").click();

            expect(called).to.be.true;
            UnitTest.hasAlertWithTitle("Commenting Failed");

            XcalarCommentDagNodes = cachedFn;
        });
    });
    after(function() {
        UnitTest.offMinMode();
        $dagWrap.remove();
    });
});
describe("FileInfoModal Test", function() {
    var oldListFiles;
    var $modal;

    before(function() {
        UnitTest.onMinMode();
        oldListFiles = XcalarListFiles;
        $modal = $("#fileInfoModal");
    });

    it("isCurrentPath should work", function() {
        var isCurrentPath = FileInfoModal.__testOnly__.isCurrentPath;
        $modal.data("path", "test");
        expect(isCurrentPath("test")).to.be.true;
        expect(isCurrentPath("test2")).to.be.false;
        $modal.removeData("path");
    });

    it("should show ds info", function() {
        FileInfoModal.show({
            "path": "file:///test",
            "name": "test",
            "modified": "testDate",
            "isFolder": false,
            "size": "testSize"
        });

        assert.isTrue($modal.is(":visible"));
        expect($modal.data("path")).to.equal("file:///test");
        expect($modal.find(".name .text").text()).to.equal("test");
        expect($modal.find(".path .text").text()).to.equal("file:///test");
        expect($modal.find(".modified .text").text()).to.equal("testDate");
        expect($modal.find(".size .text").text()).to.equal("testSize");
        expect($modal.find(".count .text").text()).to.equal("--");
    });

    it("should keep if trigger again", function() {
        FileInfoModal.show({
            "path": "file:///test",
            "name": "test",
            "modified": "testDate",
            "isFolder": false,
            "size": "testSize"
        });
        expect($modal.data("path")).to.equal("file:///test");
    });

    it("should show folder info", function(done) {
        var test = false;
        XcalarListFiles = function() {
            test = true;
            return PromiseHelper.resolve({
                "numFiles": 100
            });
        };

        FileInfoModal.show({
            "path": "file:///testFolder",
            "name": "testFolder",
            "modified": "testDate2",
            "isFolder": true
        });

        UnitTest.testFinish(function() {
            return test === true;
        })
        .then(function() {
            expect($modal.data("path")).to.equal("file:///testFolder");
            expect($modal.find(".name .text").text()).to.equal("testFolder");
            expect($modal.find(".path .text").text())
            .to.equal("file:///testFolder");
            expect($modal.find(".modified .text").text()).to.equal("testDate2");
            expect($modal.find(".count .text").text()).to.equal("100");
            expect($modal.find(".size .text").text()).to.equal("--");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("should handle fail case", function(done) {
        var test = false;
        XcalarListFiles = function() {
            test = true;
            return PromiseHelper.reject("test error");
        };

        FileInfoModal.show({
            "path": "file:///testFolder2",
            "name": "testFolder2",
            "modified": "testDate2",
            "isFolder": true
        });

        UnitTest.testFinish(function() {
            return test === true;
        })
        .then(function() {
            expect($modal.find(".count .text").text()).to.equal("--");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("should close the modal", function() {
        $modal.find(".close").click();
        assert.isFalse($modal.is(":visible"));
    });

    after(function() {
        XcalarListFiles = oldListFiles;
        UnitTest.offMinMode();
    });
});
describe("Help Test", function() {
    var $searchInput;

    before(function() {
        $searchInput = $("#helpSearch");
    });

    it("should submit the result", function() {
        var $fakeNoResult = $('<div class="noResults"></div>').show();
        $("#helpResults").append($fakeNoResult);

        $("#helpSubmit").click();
        expect($fakeNoResult.css("display")).to.equal("none");
        // clear up
        $fakeNoResult.remove();
    });

    it("searchArea should trigger submit", function() {
        var $fakeNoResult = $('<div class="noResults"></div>').show();
        $("#helpResults").append($fakeNoResult);

        $("#helpSearchArea").submit();
        expect($fakeNoResult.css("display")).to.equal("none");
        // clear up
        $fakeNoResult.remove();
    });

    it("click helpCategories should work", function() {
        $searchInput.val("test");

        $("#helpCategories").click();
        expect($searchInput.val()).to.equal("");
    });

    it("should enter to search", function() {
        var $category = $("#helpCategories").hide();
        $searchInput.val("table").trigger(fakeEvent.enterKeyup);
        expect($category.css("display")).to.equal("block");
    });

    it("should enter on empty string but not search", function() {
        var $category = $("#helpCategories").show();
        $searchInput.val("").trigger(fakeEvent.enterKeyup);
        expect($category.css("display")).to.equal("none");
    });

    it("should handle input empty in search bar", function() {
        var $category = $("#helpCategories").show();
        $searchInput.val("").change();

        expect($category.css("display")).to.equal("none");
    });
});
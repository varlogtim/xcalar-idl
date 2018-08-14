describe("Dataset Operator Panel Test", function() {
    var datasetOpPanel;
    before(function() {
        if (!gDionysus) {
            DatasetOpPanel.Instance.setup();
        }
        datasetOpPanel = DatasetOpPanel.Instance;
    });

    it ("Should be hidden at start", function () {
        datasetOpPanel.close();
        expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.true;
    });

    it ("Should be visible when show is called", function () {
        datasetOpPanel.close();
        datasetOpPanel.show();
        expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.false;
    });

    it ("Should be hidden when close is called after showing", function () {
        datasetOpPanel.show();
        datasetOpPanel.close();
        expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.true;
    });

    it ("Should be hidden when close is clicked", function () {
        datasetOpPanel.show();
        $('#datasetOpPanel .close.icon.xi-close').click();
        expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.true;
    });


    it ("Should not submit empty arguments", function () {
        datasetOpPanel.show();
        $('#datasetOpPanel .btn-submit.confirm').click();
        expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.false;
    });

    /**
     * Need to have some integration tests to ensure file browsing
     * works as expected, and submission does as well.
     */

    after(function() {
        datasetOpPanel.close();
    });
});
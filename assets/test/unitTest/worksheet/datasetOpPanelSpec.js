describe("Dataset Operator Panel Test", function() {
    var datasetOpPanel;
    var node;
    var oldListDS;
    var oldJSONParse;
    var oldGetDS;

    before(function() {
        node = new DagNodeDataset();
        oldListDS = DS.listDatasets;
        DS.listDatasets = function() {
            return [
                {
                    path: "ds1",
                    id: "support@ds1",
                    suffix: ""
                },
                {
                    path: "/folder/ds2",
                    id: "support@ds2",
                    suffix: ""
                }
            ]
        }
        if (!gDionysus) {
            DatasetOpPanel.Instance.setup();
        }
        datasetOpPanel = DatasetOpPanel.Instance;
        oldJSONParse = JSON.parse;
        oldGetDS = DS.getDSObj;
        DS.getDSObj = function(str) {
            if (str == "support@ds1") {
                return { val: "true"};
            }
        };
        node.setParam = () => {
            var deferred = PromiseHelper.deferred();
            return deferred.resolve();
        }
    });

    describe("Basic Dataset Panel UI Tests", function() {
        it ("Should be hidden at start", function () {
            datasetOpPanel.close();
            expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be visible when show is called", function () {
            datasetOpPanel.close();
            datasetOpPanel.show(node);
            expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.false;
        });

        it ("Should be hidden when close is called after showing", function () {
            datasetOpPanel.show(node);
            datasetOpPanel.close();
            expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be hidden when close is clicked", function () {
            datasetOpPanel.show(node);
            $('#datasetOpPanel .close.icon.xi-close').click();
            expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.true;
        });
    });

    describe("Standard Dataset Panel Tests", function() {

        it("Should display dataset list correctly", function() {
            datasetOpPanel.show(node);
            var $nameList = $("#datasetOpPanel #dsOpListSection .datasetName");
            expect($nameList.length).to.equal(1);
            expect($nameList.eq(0).find(".name").text()).to.equal("ds1");
            datasetOpPanel.close();
        });

        it("Should display folders correctly", function() {
            datasetOpPanel.show(node);
            var $foldList = $("#datasetOpPanel #dsOpListSection .folderName");
            expect($foldList.length).to.equal(1);
            expect($foldList.eq(0).find(".name").text()).to.equal("folder");
            $foldList.eq(0).dblclick();
            var $nameList = $("#datasetOpPanel #dsOpListSection .datasetName");
            expect($nameList.length).to.equal(1);
            expect($nameList.eq(0).find(".name").text()).to.equal("ds2");
            datasetOpPanel.close();
        });

        it("Should handle back and forward buttons correctly", function() {
            datasetOpPanel.show(node);
            $("#datasetOpPanel #dsOpListSection .folderName").eq(0).dblclick();
            expect($("#datasetOpBrowser .backFolderBtn").hasClass("xc-disabled")).to.be.false;
            expect($("#datasetOpBrowser .forwardFolderBtn").hasClass("xc-disabled")).to.be.true;
            $("#datasetOpBrowser .backFolderBtn").click();
            var $nameList = $("#datasetOpPanel #dsOpListSection .datasetName");
            expect($nameList.length).to.equal(1);
            expect($nameList.eq(0).find(".name").text()).to.equal("ds1");
            expect($("#datasetOpBrowser .backFolderBtn").hasClass("xc-disabled")).to.be.true;
            expect($("#datasetOpBrowser .forwardFolderBtn").hasClass("xc-disabled")).to.be.false;
            $("#datasetOpBrowser .forwardFolderBtn").click();
            $nameList = $("#datasetOpPanel #dsOpListSection .datasetName");
            expect($nameList.length).to.equal(1);
            expect($nameList.eq(0).find(".name").text()).to.equal("ds2");
            expect($("#datasetOpBrowser .backFolderBtn").hasClass("xc-disabled")).to.be.false;
            expect($("#datasetOpBrowser .forwardFolderBtn").hasClass("xc-disabled")).to.be.true;
            datasetOpPanel.close();
        });

        it("Should show the path correctly", function() {
            datasetOpPanel.show(node);
            expect($("#datasetOpBrowser .pathSection").text()).to.equal("HOME/");
            $("#datasetOpPanel #dsOpListSection .folderName").eq(0).dblclick();
            expect($("#datasetOpBrowser .pathSection").text()).to.equal("HOME/folder/");
        });

        it ("Should not submit empty arguments", function () {
            datasetOpPanel.show(node);
            $('#datasetOpPanel .btn-submit.confirm').click();
            expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.false;
        });

        it("Should not submit empty dataset", function() {
            datasetOpPanel.show(node);
            $("#datasetOpPanel #dsOpListSection .folderName").eq(0).click();
            $('#datasetOpPanel .btn-submit.confirm').click();
            expect($("#statusBox").hasClass("active")).to.be.true;
        });

        it("Should not submit invalid prefix", function() {
            datasetOpPanel.show(node);
            $("#datasetOpPanel #dsOpListSection .datasetName").eq(0).click();
            $("#datasetOpPanel .datasetPrefix .arg").val("@test");
            $('#datasetOpPanel .btn-submit.confirm').click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            datasetOpPanel.close();
        });

        it("Should submit valid arguments", function() {
            datasetOpPanel.show(node);
            $("#datasetOpPanel #dsOpListSection .datasetName").eq(0).click();
            $("#datasetOpPanel .datasetPrefix .arg").val("test");
            $('#datasetOpPanel .btn-submit.confirm').click();
            expect($("#statusBox").hasClass("active")).to.be.false;
            expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.true;
        });
    });

    describe("Advanced Dataset Panel Tests", function() {
        it("Should switch from advanced panel correctly", function() {
            datasetOpPanel.show(node);
            JSON.parse = function(obj) {
                return {
                    source: "support@ds1",
                    prefix: "pref"
                };
            };
            $("#datasetOpPanel .bottomSection .xc-switch").click();
            $("#datasetOpPanel .bottomSection .xc-switch").click();
            expect($("#datasetOpPanel .datasetPrefix .arg").val()).to.equal("pref");
            expect($("#datasetOpPanel #dsOpListSection .datasetName.active").text()).to.equal("ds1");
            datasetOpPanel.close();
        });

        it("Should not submit invalid dataset", function() {
            datasetOpPanel.show(node);
            JSON.parse = function(obj) {
                return {
                    source: null,
                    prefix: "pref"
                };
            };
            $('#datasetOpPanel .btn-submit.confirm').click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            datasetOpPanel.close();
        });

        it("Should not submit invalid prefix", function() {
            datasetOpPanel.show(node);
            JSON.parse = function(obj) {
                return {
                    source: "support@ds1",
                    prefix: "@pref"
                };
            };
            $('#datasetOpPanel .btn-submit.confirm').click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            datasetOpPanel.close();
        });

        it("Should submit valid arguments", function() {
            datasetOpPanel.show(node);
            JSON.parse = function(obj) {
                return {
                    source: "support@ds1",
                    prefix: "pref"
                };
            };
            $("#datasetOpPanel .bottomSection .xc-switch").click();
            $('#datasetOpPanel .btn-submit.confirm').click();
            expect($("#statusBox").hasClass("active")).to.be.false;
            expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.true;
        });
    });

    /**
     * Need to have some integration tests to ensure file browsing
     * works as expected, and submission does as well.
     */

    after(function() {
        DS.listDatasets = oldListDS;
        JSON.parse = oldJSONParse;
        DS.getDSObj = oldGetDS;
        datasetOpPanel.close();
    });
});
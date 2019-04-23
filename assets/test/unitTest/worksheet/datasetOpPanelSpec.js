describe("Dataset Operator Panel Test", function() {
    var datasetOpPanel;
    var node;
    var oldListDS;
    var oldJSONParse;
    var oldGetDS;

    before(function() {
        node = new DagNodeDataset({});
        oldListDS = DS.listDatasets;
        DS.listDatasets = function() {
            return [
                {
                    path: "ds1",
                    id: "support@ds1",
                    suffix: "",
                    options: {inActivated: false}
                },
                {
                    path: "/folder/ds2",
                    id: "support@ds2",
                    suffix: "",
                    options: {inActivated: false}
                }
            ]
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
            var $nameList = $("#datasetOpPanel #dsOpListSection .fileName");
            expect($nameList.length).to.equal(1);
            expect($nameList.eq(0).find(".name").text()).to.equal("ds1");
            datasetOpPanel.close();
        });

        it("Should display folders correctly", function() {
            datasetOpPanel.show(node);
            var $foldList = $("#datasetOpPanel #dsOpListSection .folderName");
            expect($foldList.length).to.equal(1);
            expect($foldList.eq(0).find(".name").text()).to.equal("folder");
            $foldList.eq(0).click();
            var $nameList = $("#datasetOpPanel #dsOpListSection .fileName");
            expect($nameList.length).to.equal(1);
            expect($nameList.eq(0).find(".name").text()).to.equal("ds2");
            datasetOpPanel.close();
        });

        it("Should handle back and forward buttons correctly", function() {
            datasetOpPanel.show(node);
            $("#datasetOpPanel #dsOpListSection .folderName").eq(0).click();
            expect($("#datasetOpBrowser .backFolderBtn").hasClass("xc-disabled")).to.be.false;
            expect($("#datasetOpBrowser .forwardFolderBtn").hasClass("xc-disabled")).to.be.true;
            $("#datasetOpBrowser .backFolderBtn").click();
            var $nameList = $("#datasetOpPanel #dsOpListSection .fileName");
            expect($nameList.length).to.equal(1);
            expect($nameList.eq(0).find(".name").text()).to.equal("ds1");
            expect($("#datasetOpBrowser .backFolderBtn").hasClass("xc-disabled")).to.be.true;
            expect($("#datasetOpBrowser .forwardFolderBtn").hasClass("xc-disabled")).to.be.false;
            $("#datasetOpBrowser .forwardFolderBtn").click();
            $nameList = $("#datasetOpPanel #dsOpListSection .fileName");
            expect($nameList.length).to.equal(1);
            expect($nameList.eq(0).find(".name").text()).to.equal("ds2");
            expect($("#datasetOpBrowser .backFolderBtn").hasClass("xc-disabled")).to.be.false;
            expect($("#datasetOpBrowser .forwardFolderBtn").hasClass("xc-disabled")).to.be.true;
            datasetOpPanel.close();
        });

        it("Should show the path correctly", function() {
            datasetOpPanel.show(node);
            expect($("#datasetOpBrowser .pathSection .pathWrap > .path").text()).to.equal("Home /");
            $("#datasetOpPanel #dsOpListSection .folderName").eq(0).click();
            expect($("#datasetOpBrowser .pathSection .pathWrap > .path").text()).to.equal("Home / folder /");
        });

        it("Should refresh list properly", function() {
            expect($("#dsOpListSection").find("li").length).to.equal(1);
            expect($("#dsOpListSection").find("li").eq(0).text()).to.equal("ds2");

            DS.listDatasets = function() {
                return [
                    {
                        path: "ds1",
                        id: "support@ds1",
                        suffix: "",
                        options: {inActivated: false}
                    },
                    {
                        path: "/folder/ds2",
                        id: "support@ds2",
                        suffix: "",
                        options: {inActivated: false}
                    },
                    {
                        path: "/folder/ds3",
                        id: "support@ds3",
                        suffix: "",
                        options: {inActivated: false}
                    }
                ]
            };
            $("#datasetOpPanel .refreshDatasetList").click();
            expect($("#datasetOpBrowser .pathSection .pathWrap > .path").text()).to.equal("Home / folder /");
            expect($("#dsOpListSection").find("li").length).to.equal(2);
            expect($("#dsOpListSection").find("li").eq(0).text()).to.equal("ds2");
            expect($("#dsOpListSection").find("li").eq(1).text()).to.equal("ds3");

            DS.listDatasets = function() {
                return [
                    {
                        path: "ds1",
                        id: "support@ds1",
                        suffix: "",
                        options: {inActivated: false}
                    }
                ]
            };
            $("#datasetOpPanel .refreshDatasetList").click();
            expect($("#datasetOpBrowser .pathSection .pathWrap > .path").text()).to.equal("Home /");
            expect($("#dsOpListSection").find("li").length).to.equal(1);
            expect($("#dsOpListSection").find("li").eq(0).text()).to.equal("ds1");

            DS.listDatasets = function() {
                return [
                    {
                        path: "ds1",
                        id: "support@ds1",
                        suffix: "",
                        options: {inActivated: false}
                    },
                    {
                        path: "/folder/ds2",
                        id: "support@ds2",
                        suffix: "",
                        options: {inActivated: false}
                    }
                ]
            }
            $("#datasetOpPanel .refreshDatasetList").click();
        });

        it ("Should not submit empty arguments", function () {
            datasetOpPanel.show(node);
            $('#datasetOpPanel .submit').click();
            expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.false;
        });

        it("Should not submit empty dataset", function() {
            datasetOpPanel.show(node);
            $("#datasetOpPanel #dsOpListSection .folderName").eq(0).click();
            $('#datasetOpPanel .bottomSection .next').click();
            UnitTest.hasStatusBoxWithError(OpPanelTStr.SelectDSSource);
        });

        it("Should not submit invalid prefix", function() {
            datasetOpPanel.show(node);
            $("#datasetOpPanel #dsOpListSection .fileName").eq(0).click();
            $("#datasetOpPanel .datasetPrefix .arg").val("@test");
            $('#datasetOpPanel .bottomSection .next').click();
            UnitTest.hasStatusBoxWithError(ErrTStr.PrefixStartsWithLetter);
            datasetOpPanel.close();
        });

        it("Should not submit with inactivated dataset", function() {
            var oldFunc = DS.getDSObj;
            DS.getDSObj = function() {
                return {
                    activatted: false
                };
            };
            datasetOpPanel.show(node);
            $("#datasetOpPanel #dsOpListSection .fileName").eq(0).click();
            $("#datasetOpPanel .datasetPrefix .arg").val("test");
            $('#datasetOpPanel .bottomSection .next').click();
            UnitTest.hasStatusBoxWithError(ErrTStr.InactivatedDS2);
            datasetOpPanel.close();
            DS.getDSObj = oldFunc;
        });

        // it("Should submit valid arguments", function() {
        //     var oldFunc = DS.getDSObj;
        //     DS.getDSObj = function() {
        //         return {
        //             activated: true
        //         };
        //     };
        //     datasetOpPanel.show(node);
        //     $("#datasetOpPanel #dsOpListSection .fileName").eq(0).click();
        //     $("#datasetOpPanel .datasetPrefix .arg").val("test");
        //     $('#datasetOpPanel .bottomSection .next').click();
        //     expect($("#statusBox").hasClass("active")).to.be.false;
        //     expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.true;
        //     DS.getDSObj = oldFunc;
        // });
    });

    describe("Advanced Dataset Panel Tests", function() {
        it("Should switch from advanced panel correctly", function() {
            datasetOpPanel.show(node);
            expect($("#datasetOpPanel .refreshDatasetList").is(":visible")).to.be.true;
            JSON.parse = function(obj) {
                return {
                    source: "support@ds1",
                    prefix: "pref"
                };
            };
            $("#datasetOpPanel .bottomSection .xc-switch").click();
            expect($("#datasetOpPanel .refreshDatasetList").is(":visible")).to.be.false;
            $("#datasetOpPanel .bottomSection .xc-switch").click();
            expect($("#datasetOpPanel .refreshDatasetList").is(":visible")).to.be.true;
            expect($("#datasetOpPanel .datasetPrefix .arg").val()).to.equal("pref");
            expect($("#datasetOpPanel #dsOpListSection .fileName.active").text()).to.equal("ds1");
            datasetOpPanel.close();
        });

        // it("Should not submit invalid dataset", function() {
        //     datasetOpPanel.show(node);
        //     JSON.parse = function(obj) {
        //         return {
        //             source: null,
        //             prefix: "pref"
        //         };
        //     };
        //     $('#datasetOpPanel .submit').click();
        //     expect($("#statusBox").hasClass("active")).to.be.true;
        //     datasetOpPanel.close();
        // });

        // it("Should not submit invalid prefix", function() {
        //     datasetOpPanel.show(node);
        //     JSON.parse = function(obj) {
        //         return {
        //             source: "support@ds1",
        //             prefix: "@pref"
        //         };
        //     };
        //     $('#datasetOpPanel .submit').click();
        //     expect($("#statusBox").hasClass("active")).to.be.true;
        //     datasetOpPanel.close();
        // });

        // it("Should submit valid arguments", function() {
        //     datasetOpPanel.show(node);
        //     JSON.parse = function(obj) {
        //         return {
        //             source: "support@ds1",
        //             prefix: "pref"
        //         };
        //     };
        //     $("#datasetOpPanel .bottomSection .xc-switch").click();
        //     $('#datasetOpPanel .btn-submit.confirm').click();
        //     expect($("#statusBox").hasClass("active")).to.be.false;
        //     expect($('#datasetOpPanel').hasClass("xc-hidden")).to.be.true;
        // });
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
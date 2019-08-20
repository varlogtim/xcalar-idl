describe("DFLinkOutOpPanel Test", function() {
    var dfLinkOutPanel;
    var $dfLinkOutPanel;
    var node;
    var openOptions = {};
    let cachedGetDagFn;

    before(function(done) {
        UnitTest.testFinish(() => DagPanel.hasSetup())
        .then(function() {
            return XDFManager.Instance.waitForSetup();
        })
        .always(function() {
            MainMenu.openPanel("dagPanel");
            node = new DagNodeDFOut({subType: DagNodeSubType.DFOutOptimized});
            const parentNode = new DagNodeFilter({});
            parentNode.getLineage = function() {
                return {getColumns: function() {
                    return [new ProgCol({
                        backName: "prefix::name",
                        type: "string"
                    }),
                    new ProgCol({
                        backName: "prefix_name",
                        type: "string"
                    }),new ProgCol({
                        backName: "name",
                        type: "string"
                    })]

                }}
            };
            node.getParents = function() {
                return [parentNode];
            }

            oldJSONParse = JSON.parse;
            dfLinkOutPanel = DFLinkOutOpPanel.Instance;
            $dfLinkOutPanel = $('#dfLinkOutPanel');
            let graph = new DagGraph();
            cachedGetDagFn = DagViewManager.Instance.getActiveDag;
            DagViewManager.Instance.getActiveDag = () => graph;
            graph.hasNode = () => true;

            done();
        });
    });

    describe("Basic DFOutPanel UI Tests", function() {

        it ("Should be hidden at start", function () {
            dfLinkOutPanel.close();
            expect($('#dfLinkOutPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be visible when show is called", function () {

            dfLinkOutPanel.show(node, openOptions);
            expect($('#dfLinkOutPanel').hasClass("xc-hidden")).to.be.false;
        });

        it("should select checkbox", function() {
            let $checkbox = $dfLinkOutPanel.find(".columnsWrap .checkbox").eq(0);
            let checked = $checkbox.hasClass("checked");
            $checkbox.click();
            expect($checkbox.hasClass("checked")).to.equal(!checked);
            $checkbox.click();
            expect($checkbox.hasClass("checked")).to.equal(checked);
        });

        it ("Should be hidden when close is called after showing", function () {
            dfLinkOutPanel.show(node, openOptions);
            dfLinkOutPanel.close();
            expect($('#dfLinkOutPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be hidden when close is clicked", function () {
            dfLinkOutPanel.show(node, openOptions);
            $('#dfLinkOutPanel .close').click();
            expect($('#dfLinkOutPanel').hasClass("xc-hidden")).to.be.true;
        });
    });

    describe("column rename test", function() {
        it("dest columns should rename correctly", function() {
            dfLinkOutPanel.show(node, openOptions);
            $dfLinkOutPanel.find(".linkOutName input").val("test");
            $dfLinkOutPanel.find(".selectAllWrap").click();
            this.dagGraph = DagViewManager.Instance.getActiveDag();
            const res = dfLinkOutPanel._validate();
            expect(res).to.deep.equal({
                "name": "test",
                "linkAfterExecution": false,
                "columns": [
                    {
                        "sourceName": "prefix::name",
                        "destName": "prefix_name"
                    },
                    {
                        "sourceName": "prefix_name",
                        "destName": "prefix_name_1"
                    },
                    {
                        "sourceName": "name",
                        "destName": "name"
                    }
                ]
            });
        });

    });

    describe("advanced mode validation", () => {
        it("should detect duplicate source cols", () => {
            cache1 = dfLinkOutPanel._convertAdvConfigToModel;
            dfLinkOutPanel._convertAdvConfigToModel = () => {
                return {
                    columns: [{
                        sourceName: "a",
                        destName: "b"
                    },{
                        sourceName: "a",
                        destName: "b"
                    }]
                };
            };

            let res = dfLinkOutPanel._validateAdvancedMode();
            expect(res.error).to.equal('Source column name "a" is duplicated');
            dfLinkOutPanel._convertAdvConfigToModel = cache1;
        });
        it("should detect duplicate dest cols", () => {
            cache1 = dfLinkOutPanel._convertAdvConfigToModel;
            dfLinkOutPanel._convertAdvConfigToModel = () => {
                return {
                    columns: [{
                        sourceName: "a",
                        destName: "b"
                    },{
                        sourceName: "c",
                        destName: "b"
                    }]
                };
            };

            let res = dfLinkOutPanel._validateAdvancedMode();
            expect(res.error).to.equal('Dest column name "b" is duplicated');
            dfLinkOutPanel._convertAdvConfigToModel = cache1;
        });
        it("should detect invalid dest col name", () => {
            cache1 = dfLinkOutPanel._convertAdvConfigToModel;
            dfLinkOutPanel._convertAdvConfigToModel = () => {
                return {
                    columns: [{
                        sourceName: "a",
                        destName: "b"
                    },{
                        sourceName: "c",
                        destName: "3"
                    }]
                };
            };

            let res = dfLinkOutPanel._validateAdvancedMode();
            expect(res.error).to.equal('Invalid name: a name can only begin with a letter or underscore(_).');
            dfLinkOutPanel._convertAdvConfigToModel = cache1;
        });
        it("should pass with valid col names", () => {
            cache1 = dfLinkOutPanel._convertAdvConfigToModel;
            dfLinkOutPanel._convertAdvConfigToModel = () => {
                return {
                    columns: [{
                        sourceName: "a",
                        destName: "b"
                    },{
                        sourceName: "c",
                        destName: "d"
                    }]
                };
            };

            let res = dfLinkOutPanel._validateAdvancedMode();
            expect(res.error).to.be.undefined;
            dfLinkOutPanel._convertAdvConfigToModel = cache1;
        });
    });

    describe("switching modes", function() {
        it("should switch mode", function() {
            let res = dfLinkOutPanel._switchMode(true);
            expect(res).to.equal(null);
            res = dfLinkOutPanel._switchMode(false);
            expect(res).to.equal(null);
        });
    });

    describe("submit advanced mode", () => {
        it("should submit", () => {
            dfLinkOutPanel._switchMode(true);
            dfLinkOutPanel._updateMode(true);
            dfLinkOutPanel._editor.setValue(JSON.stringify({
                name: "out",
                linkAfterExecution: true,
                columns: [{sourceName: "a", destName: "b"}]
            }));
            expect($('#dfLinkOutPanel').hasClass("xc-hidden")).to.be.false;
            dfLinkOutPanel._submitForm();
            expect($('#dfLinkOutPanel').hasClass("xc-hidden")).to.be.true;
            expect(node.getParam()).to.deep.equal({
                name: "out",
                linkAfterExecution: true,
                columns: [{sourceName: "a", destName: "b"}]
            });
        });
    });

    after(function() {
        dfLinkOutPanel.close();
        DagViewManager.Instance.getActiveDag = cachedGetDagFn;
    });
});

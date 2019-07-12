describe("DFLinkOutOpPanel Test", function() {
    var dfLinkOutPanel;
    var $dfLinkOutPanel;
    var node;
    var editor;
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
            editor = dfLinkOutPanel.getEditor();
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
        })
    });



    after(function() {
        dfLinkOutPanel.close();
        DagViewManager.Instance.getActiveDag = cachedGetDagFn;
    });
});

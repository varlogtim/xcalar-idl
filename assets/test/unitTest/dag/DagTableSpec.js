describe("DagTable Test", () => {
    let viewer;
    let renderCount = 0;
    let $container;

    before(() => {
        class TestViewer extends XcViewer {
            constructor(id) {
                super();
            }

            render($container) {
                renderCount++;
                return super.render($container);
            }
        }

        viewer = new TestViewer("id");
        $container = $("#dagViewTableArea");
    });

    it("should get instance", () => {
       const dagTable = DagTable.Instance;
       expect(dagTable).to.be.an.instanceof(DagTable); 
    });

    it("should show the viewer", (done) => {
        DagTable.Instance._show(viewer)
        .then(() => {
            expect($container.hasClass("xc-hidden")).to.be.false;
            expect(renderCount).to.equal(1);
            done();
        })
        .fail((error) => {
            done(error);
        });
    });

    it("should not render the same viewer again", (done) => {
        DagTable.Instance._show(viewer)
        .then(() => {
            expect(renderCount).to.equal(1);
            done();
        })
        .fail((error) => {
            done(error);
        });
    });

    it("should click close button to close", () => {
        $container.find(".close").click();
        expect($container.hasClass("xc-hidden")).to.be.true;
    });

    describe("Preview table icon test", () => {
        let $node;

        before(() => {
            d3.select("body").append("svg")
            .attr("id", "test-svg");
            $node = $("#test-svg");
        });

        it("should have valid initial state", () => {
            expect($node.length).to.equal(1);
            expect($node.find(".tableIcon").length).to.equal(0);
        });

        it("should show the table icon when show viewer", (done) => {
            DagTable.Instance._show(viewer, $node)
            .then(() => {
                expect($node.find(".tableIcon").length).to.equal(1);
                done();
            })
            .fail((error) => {
                done(error);
            });
        });

        it("should remove table icon when close viewer", () => {
            DagTable.Instance.close();
            expect($node.find(".tableIcon").length).to.equal(0);
        });

        after(() => {
            $node.remove();
        });
    });

    describe("Error Case Test", () => {
        before(() => {
            class ErrorViewer extends XcViewer {
                constructor(id) {
                    super(id);
                }
    
                render($container) {
                    super.render($container);
                    return PromiseHelper.reject("test error");
                }
            }
    
            viewer = new ErrorViewer("id2");
        });
        
        it("should show error", (done) => {
            DagTable.Instance._show(viewer)
            .then(() => {
                done("fail");
            })
            .fail(() => {
                expect($container.hasClass("error")).to.be.true;
                expect($container.find(".errorSection").text())
                .to.equal("test error");
                done();
            });
        });

        it("close should clear error", () => {
            DagTable.Instance.close();
            expect($container.hasClass("error")).to.be.false;
            expect($container.find(".errorSection").text())
            .to.equal("");
        });
    });
});
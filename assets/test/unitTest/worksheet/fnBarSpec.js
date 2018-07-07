describe('FnBar Test', function() {
    var testDs;
    var tableName;
    var prefix;
    var tableId;
    var editor;
    var $fnArea;
    var newTableName;

    /* TODO:
     *  -add a bogus UDF to see if the autocomplete updates correctly
     *  -test autocomplete on aggregates
     *  -ensure malformed entries do not try to execute, e.g. =mappo(yhaya) fails
    */

    before(function(done) {
        UnitTest.onMinMode();
        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .then(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            tableId = xcHelper.getTableId(tableName);
            $table = $('#xcTable-' + tableId);
            var fnBar = FnBar.Instance;
            editor = fnBar.getEditor();
            $fnArea = $("#functionArea");
            done();
        });
    });

    describe('fn bar test', function() {
        function signalKeyDown(keycode) {
            var e = new Event("keydown");
            e.which = keycode;
            CodeMirror.signal(editor, "keydown", editor, e);
            return;
        }
        function signalKeyUp(keycode) {
            var e = new Event("keyup");
            e.which = keycode;
            CodeMirror.signal(editor, "keyup", editor, e);
            return;
        }


        describe("Fnbar autocomplete and search should work", function() {
            it("Search results should work.", function() {
                var fnBar = FnBar.Instance;
                fnBar.clear();
                editor.focus();
                var e = new Event("mousedown");
                CodeMirror.signal(editor, "mousedown", editor, e);
                // expect(editor.state.focused).to.be.true;
                editor.setValue("asdfRNDSTRNGasdf");
                expect($fnArea.hasClass("searching")).to.be.true;

                expect($fnArea.find(".counter .position").text()).to.equal("0");

                editor.setValue("yelp");
                expect($fnArea.find(".counter .position").text()).to.equal("1");
                var maxMatches = parseInt($fnArea.find(".counter .total")
                                                 .text().replace("of ", ""));

                for (var i = 1; i < maxMatches; i++) {
                    signalKeyDown(keyCode.Down);
                    expect($fnArea.find(".counter .position").text())
                    .to.equal(String(i+1));
                }
                signalKeyDown(keyCode.Down);
                expect($fnArea.find(".counter .position").text()).to.equal("1");

                signalKeyDown(keyCode.Up);
                expect($fnArea.find(".counter .position").text())
                .to.equal(String(maxMatches));

                $fnArea.find(".downArrow").click();
                expect($fnArea.find(".counter .position").text())
                .to.equal("1");

                $fnArea.find(".upArrow").click();
                expect($fnArea.find(".counter .position").text())
                .to.equal(String(maxMatches));

                editor.setValue("average_stars");
                expect($fnArea.find(".counter .position").text()).to.equal("1");
                // search mode should deselect column
                editor.setValue("=");
                expect(editor.getValue()).to.equal("");
            });


        });
    });


    after(function(done) {
        UnitTest.deleteTable(tableName, TableType.Orphan)
        .always(function(){
            UnitTest.deleteAll(newTableName, testDs)
            .always(function() {
                UnitTest.offMinMode();
                done();
            });
        });
    });
});

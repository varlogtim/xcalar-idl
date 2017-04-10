describe('FnBar Test', function() {
    var testDs;
    var tableName;
    var prefix;
    var tableId;
    var $table;
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
            editor = FnBar.getEditor();
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
        it('fnBar should read correctly', function() {
            $table.find('th.col1 .dragArea').mousedown();
            expect($("#functionArea").find(".CodeMirror-code").text())
            .to.equal('= pull(' + prefix + gPrefixSign + 'average_stars)');
        });

        describe("fnBar events should work correctly.", function() {

            it("fnBar keyDown should do nothing unless enter key.", function(done) {
                var $statusBox = $("#statusBox");
                $table.find('th.col2 .dragArea').mousedown();
                editor.setValue("= pull(" + prefix + gPrefixSign + "elite)");
                var curCont = $table.find("td.col2").eq(0).text();
                expect(curCont.startsWith("[")).to.be.false;
                signalKeyDown(50); // Not enter
                curCont = $table.find("td.col2").eq(0).text();
                expect(curCont.startsWith("[")).to.be.false;
                expect($statusBox.is(":visible")).to.be.false;

                signalKeyDown(keyCode.Enter); // enter
                curCont = $table.find("td.col2").eq(0).text();
                expect(curCont.startsWith("[")).to.be.false;
                setTimeout(function() {
                   UnitTest.hasStatusBoxWithError(FnBarTStr.PullExists);
                   done();
               }, 1);
            });
            it("fnBar keyDown malformed input throws correctly.", function(done) {
                editor.setValue("= pull(beepboop");
                expect($("#statusBox").is(":visible")).to.be.false;
                signalKeyDown(keyCode.Enter);
                setTimeout(function() {
                    expect($("#statusBox").is(":visible")).to.be.true;
                    done();
                }, 100);
            });
            it("beforeChange should remove newlines and parse '='", function() {
                FnBar.clear();
                editor.setValue("1");
                expect(editor.getValue()).to.equal("1");
                expect($fnArea.hasClass("searching")).to.be.true;
                // TODO: Figure out why this case doesn't work.
                editor.setValue("\n");
                expect(editor.getValue()).to.equal("");
                editor.setValue("a\nb");
                expect(editor.getValue()).to.equal("ab");
                editor.setValue("=");
                expect(editor.getValue()).to.equal("");
                editor.setValue("a=");
                expect(editor.getValue()).to.equal("a=");

                FnBar.clear();
                $table.find('th.col2 .dragArea').mousedown();
                editor.setValue("=1");
                expect(editor.getValue()).to.equal("=1");
                // TODO: Figure out why this case doesn't work.
                expect($fnArea.hasClass("searching")).to.be.false;
                editor.setValue("");
                expect(editor.getValue()).to.equal("");
                expect($fnArea.hasClass("searching")).to.be.false;
                editor.setValue("=\n");
                expect(editor.getValue()).to.equal("=");
                editor.setValue("a\nb");
                expect($("#functionArea").find(".CodeMirror-code").text())
                .to.equal("ab");
                editor.setValue("a=");
                expect($("#functionArea").find(".CodeMirror-code").text())
                .to.equal("a=");
            });
        });

        describe("Fnbar autocomplete and search should work.", function() {
            it("Search results should work.", function() {
                FnBar.clear();
                $fnArea.removeClass("searching");
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

            it("Code hints should work.", function() {
                function getHintDispText() {
                    var hints = $("ul.CodeMirror-hints");
                    if (hints.length === 0) {
                        return [];
                    }
                    var hintTexts = [];
                    hints.children().each(function(idx,elt) {
                        var $elt = $(elt);
                        if ($elt.find(".displayText").length !== 0) {
                            hintTexts.push($elt.find(".displayText").text());
                        } else {
                            hintTexts.push($elt.text());
                        }
                    });
                    return hintTexts;
                }
                function deepArrayCmp(arr1, arr2) {
                    if (arr1.length === 0 && arr2.length === 0) {
                        return true;
                    }
                    if (arr1.length !== arr2.length) {
                        return false;
                    }
                    for (var i = 0; i < arr1.length; i++) {
                        if (arr1[i] !== arr2[i]) {
                            return false;
                        }
                    }
                    return true;
                }

                FnBar.clear();
                var hintTexts = [];
                $table.find('th.col2 .dragArea').mousedown();
                expect($fnArea.hasClass("searching")).to.be.false;
                editor.focus();
                var e = new Event("mousedown");
                CodeMirror.signal(editor, "mousedown", editor, e);
                // expect(editor.state.focused).to.be.true;
                editor.setValue("=");
                expect($fnArea.hasClass("searching")).to.be.false;
                // Autocomplete triggers on keyup
                signalKeyUp(keyCode.Up);
                // Should be map or pull
                hintTexts = getHintDispText();
                expect(hintTexts.indexOf("map")).to.not.equal(-1);
                expect(hintTexts.indexOf("pull")).to.not.equal(-1);

                editor.setValue("=map");
                editor.setCursor(0,4);
                signalKeyUp(keyCode.Up);
                // Should be ONLY map
                hintTexts = getHintDispText();
                expect(hintTexts.indexOf("map")).to.not.equal(-1);
                expect(hintTexts.indexOf("pull")).to.equal(-1);

                editor.setValue("=map()");
                editor.setCursor(0,4);
                signalKeyUp(keyCode.Up);
                // Should be nothing
                hintTexts = getHintDispText();
                expect(hintTexts.length).to.equal(0);

                hintTexts = [];
                editor.setValue("=map(re");
                // Expect no autocomplete at indices 0-4, and 8
                // Expect autocomplete maintains order regardless of location
                for (var i = 0; i <= editor.getValue().length; i++) {
                    editor.setCursor(0,i);
                    signalKeyUp(keyCode.Up);
                    var tmpHintTexts = getHintDispText();

                    if (i === 5) {
                        hintTexts = tmpHintTexts;
                        continue;
                    }

                    if (6 <= i && i < 8) {
                        expect(deepArrayCmp(hintTexts, tmpHintTexts)).to.be.true;
                        continue;
                    }
                    expect(tmpHintTexts.length).to.equal(0);
                }
                // Should be *at least* regex, replace, review_count
                // Should also be the same for setcursor 5,6,7
                expect(hintTexts.indexOf("regex")).to.not.equal(-1);
                expect(hintTexts.indexOf("replace")).to.not.equal(-1);
                var hasReviewCount = false;
                for (var c = 0; c < hintTexts.length; c++) {
                    if (hintTexts[c].endsWith("review_count")) {
                        hasReviewCount = true;
                        break;
                    }
                }
                expect(hasReviewCount).to.be.true;
                FnBar.clear();
            });
        });
        describe("Fnbar misc functions should work.", function() {

            // it("Update operations map should work", function() {
            //     // TODO* update operations map
            // });
            // it("Update aggregate map should work", function() {
            //     // TODO* update aggregate map
            // });
            it("Focus On Col should work", function() {
                // The not editable, not same origin case is already tested above.
                // This is the same-origin case, should no-op
                $table.find('th.col1 .dragArea').mousedown();
                var oldText = $("#functionArea").find(".CodeMirror-code").text();
                var editableHead = $table.find("th.col4 .editableHead");
                FnBar.focusOnCol(editableHead, $table.data("id"), 1);
                expect($("#functionArea").find(".CodeMirror-code").text())
                .to.equal(oldText);
                // TODO: test on editable columns.
            });
            it("fnbar clear & save should work", function() {
                // Tested above
                var randString = "RANDOMRANDOMSTRINGSTRING";
                $table.find('th.col2 .dragArea').mousedown();
                editor.setValue("="+randString);
                FnBar.clear();
                expect(editor.getValue().endsWith(randString)).to.equal(false);
                $table.find('th.col2 .dragArea').mousedown();
                expect(editor.getValue().endsWith(randString)).to.equal(true);
            });
            // it("fnbar focusCursor should work", function() {
            //     // This function doesn't do as much as you'd think
            //     // Only calls editor.focus(), which adds inFocus class
            //     // We also need classs CodeMirror-focused for many ops
            //     // for instance, code hints will not appear unless clicked
            //     // regardless of focus state.
            // });
        });
    });

    describe('Function bar operations test', function() {
        describe("Filter test", function() {
            it("invalid operator should be detected", function(done) {
                $table.find('th.col1 .dragArea').mousedown();
                var cachedFunc = ColManager.execCol;
                var execCalled = false;
                ColManager.execCol = function() {
                    execCalled = true;
                    return PromiseHelper.resolve();
                };

                editor.setValue('= fakeFilter(eq(' + prefix + gPrefixSign +
                    'average_stars, 4.5))');

                FnBar.__testOnly__.functionBarEnter()
                .then(function() {
                    expect('failed').to.equal('should succeed');
                    done("failed");
                })
                .fail(function() {
                    expect(execCalled).to.be.false;
                    // there's a delay before statusbox shows
                    setTimeout(function() {
                        UnitTest.hasStatusBoxWithError("Invalid Operator: fakeFilter.Valid operators are: pull, map, filter.");
                        ColManager.execCol = cachedFunc;
                        done();
                    }, 1);
                });
            });

            it('successful filter should work', function(done) {
                $table.find('th.col1 .dragArea').mousedown();
                var cachedFunc = ColManager.execCol;
                var passed = false;
                ColManager.execCol = function() {
                    passed = true;
                    return PromiseHelper.resolve();
                };

                editor.setValue('= filter(eq(' + prefix + gPrefixSign +
                    'average_stars, 0))');

                FnBar.__testOnly__.functionBarEnter()
                .then(function() {
                    expect(passed).to.be.true;
                })
                .fail(function() {
                    expect('failed').to.equal('should succeed');
                })
                .always(function() {
                    ColManager.execCol = cachedFunc;
                    done();
                });
            });

            it('error filter should not work', function(done) {
                var cachedFunc = ColManager.execCol;
                var passed = false;
                ColManager.execCol = function(op, newFuncStr, tId, colNum) {
                    passed = true;
                    expect(op).to.equal('filter');
                    expect(newFuncStr).to.equal('"average_stars" = filter(eq('
                        + prefix + gPrefixSign + 'average_stars, 0)))');
                    expect(tId).to.equal(tableId);
                    expect(colNum).to.equal(1);
                    return PromiseHelper.resolve();
                };

                editor.setValue('= filter(eq(' + prefix + gPrefixSign +
                    'wrongName, 0))');

                FnBar.__testOnly__.functionBarEnter()
                .then(function() {
                    expect('succeeded').to.equal('should fail');
                })
                .fail(function() {
                    var msg = xcHelper.replaceMsg(FnBarTStr.DiffColumn, {
                        colName: prefix + gPrefixSign + 'average_stars'
                    });
                    UnitTest.hasAlertWithText(msg);
                    expect(passed).to.be.false;
                })
                .always(function() {
                    ColManager.execCol = cachedFunc;
                    done();
                });
            });

            it('submit filter should work', function(done) {
                editor.setValue('= filter(eq(' + prefix + gPrefixSign +
                    'average_stars, 4.5))');
                expect($table.find('tbody tr').length).to.be.gt(10);

                FnBar.__testOnly__.functionBarEnter()
                .then(function(ret) {
                    newTableName = ret;
                    var newTableId = xcHelper.getTableId(ret);
                    var $newTable = $('#xcTable-' + newTableId);

                    expect($newTable.find('tbody tr').length).to.equal(27);
                    expect($newTable.find('.row0 td.col1 .originalData').text())
                    .to.equal('4.5');
                    expect($newTable.find('.row5 td.col1 .originalData').text())
                    .to.equal('4.5');
                    expect($newTable.find('.row15 td.col1 .originalData').text())
                    .to.equal('4.5');
                    done();
                })
                .fail(function() {
                    expect('failed').to.equal('should succeed');
                    done();
                });
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

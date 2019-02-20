describe.skip("Cast Op Panel Test", function() {
    var $castView;
    var $castTable;
    var $table;
    var prefix;

    var dsName, tableName, tableId;

    before(function(done){
        xcTooltip.hideAll();
        $castView = $("#castOpPanel");
        $resultSection = $("#multiCast-result");
        $castTable = $("#smartCast-table");

        UnitTest.addAll(testDatasets.fakeYelp, "yelp_smartCast_test")
        .then(function(resDS, resTable, pFix) {
            dsName = resDS;
            tableName = resTable;
            tableId = xcHelper.getTableId(tableName);
            $table = $("#xcTable-" + tableId);
            prefix = pFix;
            done();
        })
        .fail(function(error) {
            throw error;
        });
    });

    describe("Basic Function Test", function() {
        it("Should show the Cast View", function() {
            CastOpPanel.Instance.show(tableId);

            assert.isTrue($castView.is(":visible"));
            expect($castTable.find(".row").length).to.equal(0);
        });

        it("Should select column", function() {
            CastOpPanel.Instance.__testOnly__.selectCol(1);
            expect($castTable.find(".row").length).to.equal(1);
            expect($castTable.find(".initialType").length).to.equal(1);
            expect($(".modalHighlighted").length > 0).to.be.true;
        });

        it("Should change column type", function() {
            try {
                // test error case
                CastOpPanel.Instance.__testOnly__.changeColType();
            } catch (error) {
                expect(error).not.to.be.null;
            }

            CastOpPanel.Instance.__testOnly__.changeColType(1, "integer");
            var $row = $castTable.find(".row");
            expect($row.find(".colType .text").text()).to.equal("integer");
            expect($castTable.find(".initialType").length).to.equal(0);
        });

        it("Should deSelect column", function() {
            CastOpPanel.Instance.__testOnly__.deSelectCol(1);
            expect($castTable.find(".row").length).to.equal(0);
            expect($(".modalHighlighted").length > 0).to.be.false;
        });

        it("Should submit the form and close the view", function() {
            var oldFunc = ColManager.changeType;
            var test = false;
            ColManager.changeType = function() {
                test = true;
            };

            // nothing to cacst
            CastOpPanel.Instance.__testOnly__.submitForm();
            expect(test).to.be.false;
            var $statusBox = $("#statusBox");
            assert.isTrue($statusBox.is(":visible"));
            expect($statusBox.find(".message").text())
            .to.equal(ErrTStr.NoTypeChange);
            StatusBox.forceHide();

            // something to cast
            CastOpPanel.Instance.__testOnly__.selectCol(1);
            CastOpPanel.Instance.__testOnly__.changeColType(1, "integer");

            CastOpPanel.Instance.__testOnly__.submitForm();
            expect(test).to.be.true;
            assert.isFalse($castView.is(":visible"));

            ColManager.changeType = oldFunc;
        });
    });

    describe("UI Behavior Test", function() {
        var $header;

        before(function() {
            CastOpPanel.Instance.show(tableId);
            $header = $table.find("th.col1 .header");
        });

        it("Should select and deSelect column", function() {
            // select
            $header.click();
            expect($table.find("th.modalHighlighted").length).to.equal(1);
            // deselect
            $header.click();
            expect($table.find("th.modalHighlighted").length).to.equal(0);
        });

        it("Should clear all selected column", function() {
            // select
            $header.click();
            expect($table.find("th.modalHighlighted").length).to.equal(1);
            // clear
            $castView.find(".clear").click();
            expect($table.find("th.modalHighlighted").length).to.equal(0);
        });

        it("Should click detect to do the detection", function() {
            // select
            $header.click();
            expect($table.find("th.modalHighlighted").length).to.equal(1);
            // detect
            $castView.find(".detect").click();
            expect($table.find("th.modalHighlighted").length).to.equal(0);

            expect($("#smartCast-table .tableContent").text()).to.equal("");
        });

        it("Should click column name to focus", function() {
            // should clear inner data first
            $castView.find(".clear").click();
            // select
            $header.click();
            expect($castTable.find(".colName").length).to.equal(1);
            // focus on column name
            $castTable.find(".colName").click();
            expect($header.closest("th").attr("aria-describedby")).to.exist;
            xcTooltip.hideAll();
        });

        it("Should use change type menu to change type", function() {
            var $colType = $castTable.find(".colType");
            var $castMenu = $("#castMenu");
            expect($colType.hasClass("initialType")).to.be.true;
            expect($colType.find(".text").text()).to.equal("float");
            // open cast menu
            $colType.click();
            assert.isTrue($castMenu.is(":visible"));
            // change type
            $castMenu.find('li[data-type="string"]').mouseup();
            expect($colType.hasClass("initialType")).to.be.false;
            expect($colType.find(".text").text()).to.equal("string");
            // close cast menu
            $colType.click();
            assert.isFalse($castMenu.is(":visible"));
        });

        it("Should not submit when no columns to change type", function() {
            // clear
            $castView.find(".clear").click();
            // confirm
            $castView.find(".confirm").click();
            var $statusBox = $("#statusBox");
            assert.isTrue($statusBox.is(":visible"));
            expect($statusBox.find(".message").text()).to.equal(ErrTStr.NoCast);
            StatusBox.forceHide();
        });

        it("Should close the view", function() {
            $castView.find(".cancel").click();
            assert.isFalse($castView.is(":visible"));
            // call another close should have nothing happen
            CastOpPanel.Instance.close();
            assert.isFalse($castView.is(":visible"));
        });
    });

    describe("pulling column", function() {
        var colName;
        before(function(done) {
            colName = prefix + gPrefixSign + "four";
            ColManager.hideCol([4], tableId, {noAnimate: true})
            .then(function() {
                CastOpPanel.Instance.show(tableId);
                var colInfo = CastOpPanel.Instance.__testOnly__.getInfo();
                expect(colInfo.colNames.indexOf(colName)).to.equal(-1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should update columns", function(done) {
            ColManager.unnest(tableId, gTables[tableId].tableCols.length, 0, [colName]);
            UnitTest.testFinish(function() {
                var colInfo = CastOpPanel.Instance.__testOnly__.getInfo();
                return colInfo.colNames.indexOf(colName) > -1;
            })
            .then(function() {
                var colInfo = CastOpPanel.Instance.__testOnly__.getInfo();
                expect(colInfo.colNames.indexOf(colName)).to.equal(12);
                expect(colInfo.recTypes[12]).to.equal("boolean");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
        
        after(function() {
            CastOpPanel.Instance.close();
        });
    });

    after(function(done) {
        UnitTest.deleteAll(tableName, dsName)
        .always(function() {
            done();
        });
    });
});
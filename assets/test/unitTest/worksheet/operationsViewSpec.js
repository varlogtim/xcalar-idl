describe('OperationsView', function() {
    var testDs;
    var tableName;
    var prefix;

    before(function(done) {
        UnitTest.onMinMode();
        var testDSObj = testDatasets.fakeYelp;
        UnitTest.min
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .always(function(ds, tName, tPrefix) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            done();
        });
    });
    
    describe('function hasFuncFormat', function() {
        var func;
        before(function() {
            func = OperationsView.__testOnly__.hasFuncFormat;
        });

        it ('hasFuncFormat(arg) should return correctly', function() {
            expect(func('add(x,1)')).to.equal(true);
            expect(func('a(()x,(1))')).to.equal(true);
            expect(func('a("((("x,1)')).to.equal(true);
            expect(func('a(""x,1)')).to.equal(true);
            expect(func('a(x,1)')).to.equal(true);
            expect(func('a("\\"",1)')).to.equal(true);

            expect(func('add(x,1')).to.equal(false);
            expect(func('add(x,1\"')).to.equal(false);
            expect(func('a("\"",1)')).to.equal(false);
            expect(func('add(x,1")')).to.equal(false);
            expect(func('(xwf,1)')).to.equal(false);
            expect(func('add(xwf,1)x')).to.equal(false);
            expect(func('(xwf,1)x')).to.equal(false);
            expect(func('a(x,1))')).to.equal(false);
            expect(func('a((x,1)')).to.equal(false);
            expect(func('a(()x,1))')).to.equal(false);
            expect(func('a(()x,1))')).to.equal(false);
            expect(func('a(()"("x,1))')).to.equal(false);
            expect(func('a(()x,1))')).to.equal(false);
        });
    });

    describe('function hasUnescapedParens', function() {
        var func;
        before(function() {
            func = OperationsView.__testOnly__.hasUnescapedParens;
        });

        it ('hasUnescapedParens(arg) should return correctly', function() {
            expect(func('(')).to.equal(true);
            expect(func(')')).to.equal(true);
            expect(func('"")')).to.equal(true);
            expect(func('"\\"")')).to.equal(true);
            expect(func(')(')).to.equal(true);

            expect(func('")"')).to.equal(false);
            expect(func('")\\)"')).to.equal(false);
            expect(func('\\)')).to.equal(false);
            expect(func('"\\")')).to.equal(false);
        });
    });

    describe('function formulateMapFilterString', function() {
        var func;
        before(function() {
            func = OperationsView.__testOnly__.formulateMapFilterString;
        });

        it ('formulateMapFilterString() should return correctly', function() {
            var args = ['1', 2];
            var colTypeInfos = [{
                argNum: 0,
                type  : "integer"
            }];
            expect(func('add', args, colTypeInfos)).to.equal("add(int(1, 10), 2)");

            args = [['1', 2], ['3', 4]];
            colTypeInfos = [
            [{
                argNum: 0,
                type  : 'integer'
            }],
            [{
                argNum: 0,
                type  : 'integer'
            }]];
            expect(func('add', args, colTypeInfos, true)).to.equal(
                "and(add(int(1, 10), 2), add(int(3, 10), 4))");
        });
    });

    describe('function isNumberInQuotes', function() {
        var func;
        before(function() {
            func = OperationsView.__testOnly__.isNumberInQuotes;
        });

        it('isNumberInQuotes() should return correctly', function() {
            expect(func('"3"')).to.be.true;
            expect(func("'3'")).to.be.true;
            expect(func("'3.342'")).to.be.true;

            expect(func("'3")).to.be.false;
            expect(func("3'")).to.be.false;
            expect(func('"3')).to.be.false;
            expect(func(3)).to.be.false;
            expect(func("3")).to.be.false;
            expect(func("''3")).to.be.false;
            expect(func("'3''")).to.be.false;
            expect(func("'3t'")).to.be.false;
            expect(func("'3.342t'")).to.be.false;
        });
    });

    describe('group by', function() {
        var tableId;
        var $operationsModal;
        var $operationsView;
        var $functionInput;
        var $functionsMenu;
        var operatorsMap;
        var aggsList;
        var $argInputs;
        var getExistingTypes;
        var argumentFormatHelper;
        var parseType;
        var columns;
        var someColumns;
        // var columnNames = ["yelping_since", "votes", "one", "compliments", "friends", "two\\.three", "elite", "review_count", "four", "average_stars", "mixVal", "user_id", "DATA"];
        var someColumnNames = ["yelping_since", "compliments", "friends", "review_count", "four", "average_stars", "mixVal", "DATA"];

        before(function(done) {
            getExistingTypes = OperationsView.__testOnly__.getExistingTypes;
            argumentFormatHelper = OperationsView.__testOnly__.argumentFormatHelper;
            parseType = OperationsView.__testOnly__.parseType;
            $operationsModal = $('#operationsView');
            $operationsView = $('#operationsView');
            $('.xcTableWrap').each(function() {
                if ($(this).find('.tableName').val().indexOf(testDs) > -1) {
                    tableId = $(this).find('.hashName').text().slice(1);
                    return false;
                }
            });

            OperationsView.show(tableId, 1, 'group by')
            .then(function() {
                operatorsMap = OperationsView.getOperatorsMap();
                $functionInput = $operationsView.find('.groupby .functionsInput');
                $functionsMenu = $functionInput.siblings('.list');
                done();
            });
        });

        describe('var operatorsMap', function() {
            it('number of "group by" categories is valid', function() {
                aggsList = operatorsMap[FunctionCategoryT.FunctionCategoryAggregate];
                expect(aggsList.length).to.be.at.least(5);
                var indexOfCount = -1;
                for (var i = 0; i < aggsList.length; i++) {
                    if (aggsList[i].fnName === "count") {
                        indexOfCount = i;
                        break;
                    }
                }
                // XX gotta check this is agg somehow?
                expect(indexOfCount).to.be.at.least(0);
            });
        });

        describe('function input', function() {
            it('list should match operatorsMap', function() {
                // dropdown requires mousedown and click
                $functionInput.siblings('.dropdown').mousedown();
                $functionInput.siblings('.dropdown').click();

                expect($functionsMenu.is(':visible')).to.equal(true);
                expect($functionsMenu.find('li')).to.have.length(aggsList.length);
            });

            it('input should read Avg', function() {
                $functionsMenu.find('li').filter(function() {
                    return ($(this).text() === "avg");
                }).trigger(fakeEvent.mouseup);
                expect($functionInput.val()).to.equal('avg');
            });
        });

        describe('argument section', function() {
            it('should have 3 visible text inputs', function() {
                expect($operationsView.find('.arg[type=text]:visible')).to.have.lengthOf(3);
                $argInputs = $operationsView.find('.arg[type=text]:visible');
            });

            it('new table name should be visible', function() {
                expect($operationsView.find('.newTableName:visible')).to.have.lengthOf(1);
            });

            it('should have 3 visible checkboxes for inc sample', function() {
                expect($operationsView.find('.checkbox:visible')).to.have.lengthOf(3);
            });

            it('new table name should not be visible if join selected', function() {
                var $keepCheckbox = $operationsView.find('.groupby .keepTable .checkbox');
                $keepCheckbox.click();
                expect($keepCheckbox.filter('.checked').length).to.equal(1);
                expect($operationsView.find('.newTableName:visible')).to.have.lengthOf(0);

                $keepCheckbox.click();
                expect($keepCheckbox.filter('.checked').length).to.equal(0);
                expect($operationsView.find('.newTableName:visible')).to.have.lengthOf(1);

                var $incSampleBox = $operationsView.find('.groupby .incSample .checkbox');
                $incSampleBox.click();
                expect($incSampleBox.filter('.checked').length).to.equal(1);
                expect($operationsView.find('.newTableName:visible')).to.have.lengthOf(1);

                $incSampleBox.click();
                expect($incSampleBox.filter('.checked').length).to.equal(0);
                expect($operationsView.find('.newTableName:visible')).to.have.lengthOf(1);
            });

        });

        describe.skip('test type checking', function() {
            this.timeout(30000);
            // this will take a long time because we
            // test out a variety of arguments against each other and each test
            // loops through all the columns in a table each time to check if the
            // column name exists in the table
            it('should detect if arg types are valid or invalid', function() {
                columns = gTables[tableId].tableCols;
                someColumns = [columns[0], columns[1], columns[2], columns[5], columns[7], columns[8], columns[9], columns[10]];
                expect(columns.length).to.equal(13);
                var testArgs = [];
                var args;
                for (var i = 0; i < someColumns.length; i++) {
                    for (var j = 0; j < someColumns.length; j++) {
                        args = [];
                        args.push(gColPrefix + someColumns[i].getFrontColName(true));
                        args.push(gColPrefix + someColumns[j].getFrontColName(true));
                        args.push('new_column_name');
                        testArgs.push(args);
                    }
                }
                expect(testArgs.length).to.be.above(7 * 7);

                var groupByType;
                var testedGBTypes = [];
                for (var i = 0; i < aggsList.length; i++) {
                    groupByType = aggsList[i].fnName;
                    testGroupByInputsColTypes(groupByType, testArgs, testedGBTypes);
                }
            });

            it('variety of different arguments should be formatted correctly', function(done) {
                var testArgs1 = ["str", "null", "undefined", "sp aced", "com,ma", "d.ot", gColPrefix, "\\" + gColPrefix, gColPrefix + "a", "\\" + gColPrefix + "a", "a\\" + gColPrefix, "5a", "a5", -5, 5, 3.2, 0];
                var testArgs2 = [];
                var testArgs2Unprefixed = [];
                for (var i = 0; i < someColumnNames.length; i++) {
                    colName = someColumnNames[i];
                    if (colName !== "DATA") {
                        colName = xcHelper.getPrefixColName(prefix, colName);
                    }

                    testArgs2.push(gColPrefix + colName);
                    testArgs2Unprefixed.push(colName);
                }
                var arg1Types = [];
                var arg2Types = [];
                for (var i = 0; i < testArgs1.length; i++) {
                    arg1Type = typeof(testArgs1[i]);
                    if (arg1Type === "number") {
                        if (testArgs1[i] % 1 === 0) {
                            arg1Type = "integer";
                        } else {
                            arg1Type = "float";
                        }
                    }
                    arg1Types.push(arg1Type);
                }
                for (var i = 0; i < testArgs2.length; i++) {
                    var colName = testArgs2Unprefixed[i];
                    var progCol = gTables[tableId].getColByFrontName(colName);

                    if (testArgs2Unprefixed[i] === "DATA") {
                        args2Type = "object";
                    } else {
                        arg2Type = progCol.getType();
                    }
                    
                    arg2Types.push(arg2Type);
                }

                var groupByType;
                var testedGBTypes = [];
                for (var i = 0; i < aggsList.length; i++) {
                    groupByType = aggsList[i].fnName;
                    testVariousInputsTypes(groupByType, testedGBTypes, testArgs1,
                                            testArgs2, arg1Types, arg2Types);
                }
                // switch args around;
                testedGBTypes = [];
                for (var i = 0; i < aggsList.length; i++) {
                    groupByType = aggsList[i].fnName;
                    testVariousInputsTypes(groupByType, testedGBTypes, testArgs2,
                                            testArgs1, arg2Types, arg1Types);
                }
                done();
            });
        });

        describe('adding another column argument', function() {
            var $argInputs;
            it('add arg button should be visible', function() {
                expect($operationsView.find(".addGroupArg:visible")).to.have.lengthOf(1);
            });
            it('button should add another argument', function() {
                $argInputs = $operationsView.find('.arg[type=text]:visible');
                $operationsView.find(".addGroupArg").click();
                expect($operationsView.find('.arg[type=text]:visible').length).to.be.above($argInputs.length);
                expect($operationsView.find(".extra .arg").is(document.activeElement)).to.equal(true);
            });
            it('argument should be removable', function() {
                $operationsView.find(".extra .xi-cancel").click();
                expect($operationsModal.find('.arg[type=text]:visible').length).to.equal($argInputs.length);
            });
        });

        after(function() {
            $("#operationsView .close").click();
        });

        function setArgInputs(arr) {
            $argInputs.each(function(i) {
                if ([undefined, null].indexOf(arr[i]) > -1) {
                    $(this).val("defaultvalue");
                } else {
                    $(this).val(arr[i]);
                }
            });
        }
        // groupByType could be "avg","count", "max" etc.
        // testArgs is an array of the 2 input vals such as [$class_id, $time]
        // testedGBTypes is an array of the groupbys we've already tested ["avg", "count"]
        function testGroupByInputsColTypes(groupByType, testArgs, testedGBTypes) {
            var argInfos = [];
            var existingTypes;
            expect(testedGBTypes).to.not.include(groupByType);
            $functionInput.val(groupByType).trigger(fakeEvent.enter);
            expect($operationsModal.find('.arg[type=text]:visible')).to.have.length(3);
            testedGBTypes.push(groupByType);
            var groupNum = 0;

            for (var i = 0; i < testArgs.length; i++) {
                setArgInputs(testArgs[i]);
                existingTypes = getExistingTypes();
                argInfos.push(argumentFormatHelper(existingTypes, groupNum));
            }

            var count = 0;
            var hasValidTypes = false;
            var arg1TypeId = $argInputs.eq(0).data('typeid');
            var arg2TypeId = $argInputs.eq(1).data('typeid');
            var arg1Types = parseType(arg1TypeId);
            var arg2Types = parseType(arg2TypeId);

            for (var i = 0; i < someColumns.length; i++) {
                for (var j = 0; j < someColumns.length; j++) {
                    arg1ColumnType = someColumns[i].type;
                    arg2ColumnType = someColumns[j].type;
                    if (arg1Types.indexOf(arg1ColumnType) > -1 &&
                        arg2Types.indexOf(arg2ColumnType) > -1)
                    {
                        hasValidTypes = true;
                    } else {
                        hasValidTypes = false;
                    }
                    expect(hasValidTypes).to.equal(argInfos[count].isPassing);
                    count++;
                }
            }
            expect(count).to.be.above(7 * 7);
        }

        function testVariousInputsTypes(groupByType, testedGBTypes, testArgs1,
                                        testArgs2, arg1Types, arg2Types) {
            var existingTypes;
            var argInfos = [];
            var count = 0;
            var hasValidTypes;
            var hasValidColPrefix = xcHelper.hasValidColPrefix;

            expect(testedGBTypes).to.not.include(groupByType);
            $functionInput.val(groupByType).trigger(fakeEvent.enter);
            expect($operationsModal.find('.arg[type=text]:visible'))
                                                            .to.have.lengthOf(3);
            testedGBTypes.push(groupByType);

            var arg1TypeId = $argInputs.eq(0).data('typeid');
            var arg2TypeId = $argInputs.eq(1).data('typeid');
            var arg1ValidTypes = parseType(arg1TypeId);
            var arg2ValidTypes = parseType(arg2TypeId);
            var groupNum = 0;

            for (var i = 0; i < testArgs1.length; i++) {
                for (var j = 0; j < testArgs2.length; j++) {
                    setArgInputs([testArgs1[i], testArgs2[j], 'defaultval']);
                    existingTypes = getExistingTypes();
                    argInfos.push(argumentFormatHelper(existingTypes, groupNum));

                    if (hasValidColPrefix(testArgs1[i]) &&
                        !gTables[tableId].hasCol(testArgs1[i].slice(1))) {
                        hasValidTypes = false;
                    } else if (hasValidColPrefix(testArgs2[j]) &&
                                !gTables[tableId].hasCol(testArgs2[j].slice(1))) {
                        hasValidTypes = false;
                    } else if (arg1ValidTypes.indexOf(arg1Types[i]) > -1 &&
                        arg2ValidTypes.indexOf(arg2Types[j]) > -1) {
                        hasValidTypes = true;
                    } else {
                        hasValidTypes = false;
                    }
                    if (hasValidTypes !== argInfos[count].isPassing) {
                        console.error(arg1ValidTypes, arg1Types[i]);
                        console.warn(arg2ValidTypes, arg2Types[j]);
                        console.info(testArgs1[i], testArgs2[j], argInfos[count]);
                        debugger;
                    }

                    expect(hasValidTypes).to.equal(argInfos[count].isPassing);
                    count++;
                }
            }
            expect(count).to.be.above(7 * 7);
        }
    });

    // using map in operations view
    describe('column pickers test', function() {
        var tableId;
        var $operationsView;
        var $categoryMenu;
        var $functionsMenu;
        var $argInputs;
        var operatorsMap;

        before(function(done) {
            $operationsView = $('#operationsView');
            $('.xcTableWrap').each(function() {
                if ($(this).find('.tableName').val().indexOf(testDs) > -1) {
                    tableId = $(this).find('.hashName').text().slice(1);
                    return false;
                }
            });

            OperationsView.show(tableId, 1, 'map')
            .then(function() {
                operatorsMap = OperationsView.getOperatorsMap();
                $categoryMenu = $operationsView.find('.map .categoryMenu');
                $functionsMenu = $operationsView.find('.map .functionsMenu');
                done();
            });
        });

        describe('category menu in map', function() {
            it('menu should be visible', function() {
                expect($categoryMenu.is(":visible")).to.equal(true);
                expect($categoryMenu.find('li').length).to.be.above(7);
            });

            it('should select category when clicked', function() {
                $categoryMenu.find('li').filter(function() {
                    return ($(this).text() === "string");
                }).trigger(fakeEvent.click);
                expect($categoryMenu.find("li.active").text()).to.equal('string');
            });
            it('should select correct function list when clicked', function() {
                expect($functionsMenu.is(":visible")).to.equal(true);
                expect($functionsMenu.find('li').length).to.be.above(6);
                expect($functionsMenu.find('li').eq(0).text()).to.equal('concat');
            });
        });

        describe('functions menu in map', function() {
            it('should not have selected li', function() {
                expect($functionsMenu.find('li.active').length).to.equal(0);
                expect($operationsView.find('.map .argsSection').hasClass('inactive')).to.equal(true);
            });
            it('should select function name when clicked', function() {
                $functionsMenu.find('li').filter(function() {
                    return ($(this).text() === "concat");
                }).trigger(fakeEvent.click);
                expect($functionsMenu.find("li.active").text()).to.equal('concat');
            });
            it ('should show arguments after clicking function name', function() {
                expect($operationsView.find('.map .argsSection').hasClass('inactive')).to.equal(false);
            });
        });

        describe('argument section in map', function() {
            it('should have 3 visible text inputs', function() {
                expect($operationsView.find('.arg[type=text]:visible')).to.have.length(3);
                $argInputs = $operationsView.find('.arg[type=text]:visible');
            });
            it ('should have 1 visible checkbox for ICV', function() {
                expect($operationsView.find('.checkbox:visible')).to.have.lengthOf(1);
            });
        });

        describe('column pickers should work', function() {
            it('should have 2 column picker inputs', function() {
                expect($operationsView.find('.xi_select-column:visible')).to.have.lengthOf(2);
            });
            it ('input should fill from column header', function() {
                $argInputs.eq(0).focus().trigger('focus').val(""); // focus & trigger to make sure
                expect($argInputs.eq(0).val()).to.equal("");
                var $header = $('#xcTable-' + tableId).find('th.col1 .header');
                expect($header.find('input').val()).to.equal('yelping_since');
                $header.click();

                var prefixCol = xcHelper.getPrefixColName(prefix, 'yelping_since');
                expect($argInputs.eq(0).val()).to.equal(gColPrefix + prefixCol);


                var $allEls = $header.find('*');
                var count = 0;
                // go through each element inside .header and click
                $allEls.each(function() {
                    if ($(this).closest('.dropdownBox').length ||
                        !$(this).is(":visible")) {
                        return;
                    }
                    var $hiddenParents = $(this).parents().andSelf()
                            .filter(function() {
                                return $(this).css('visibility') === "hidden";
                            });
                    if ($hiddenParents.length) {
                        return;
                    }

                    $argInputs.eq(0).focus().trigger('focus').val("");
                    expect($argInputs.eq(0).val()).to.equal("");
                    $(this).click();
                    expect($argInputs.eq(0).val()).to.equal(gColPrefix + prefixCol);
                    count++;
                });
                expect(count).to.be.at.least(5);
            });

            it("column picker should not work when operationsView closes", function() {
                // close operations view
                $("#operationsView .close").click();
                expect($operationsView.hasClass('xc-hidden')).to.equal(true);
                // argsSection should stil be open even when operationsView is closed
                expect($operationsView.find('.map .argsSection').hasClass('inactive')).to.equal(false);
                

                $argInputs.eq(0).focus().trigger('focus').val(""); // focus & trigger to make sure
                expect($argInputs.eq(0).val()).to.equal("");
                var $header = $('#xcTable-' + tableId).find('th.col1 .header');
                expect($header.find('input').val()).to.equal('yelping_since');
                $header.click();
                expect($argInputs.eq(0).val()).to.equal("");

            });
        });

        after(function(done) {
            OperationsView.close();
            setTimeout(function() { // allow time for op menu to close
                done();
            }, 500);
        });

    });

    // using filter in operations view
    describe('functions input test', function() {
        var tableId;
        var $operationsView;
        var $functionsInput;
        var $functionsList;
        var $argSection;

        before(function(done) {
            $operationsView = $('#operationsView');
            $('.xcTableWrap').each(function() {
                if ($(this).find('.tableName').val().indexOf(testDs) > -1) {
                    tableId = $(this).find('.hashName').text().slice(1);
                    return false;
                }
            });

            OperationsView.show(tableId, 1, 'filter')
            .then(function() {
                $functionsInput = $operationsView.find('.filter .functionsInput');
                $functionsList = $functionsInput.siblings('.list');
                $argSection = $operationsView.find('.filter .argsSection').eq(0);
                done();
            });
        });

        it('clicking on functions input should work', function() {
            expect($functionsInput.length).to.equal(1);
            expect($functionsInput.is(":visible")).to.true;
            expect($functionsList.length).to.equal(1);
            expect($functionsList.is(":visible")).to.be.false;

            $functionsInput.click();
            expect($functionsList.is(":visible")).to.be.true;
            var numLis = $functionsList.find('li:visible').length;
            expect(numLis).to.be.gt(10);

            $functionsInput.click();
            expect($functionsList.is(":visible")).to.be.true;
            expect($functionsList.find('li:visible').length).to.equal(numLis);
        });

        it('clicking on functions input iconWrapper produce full list', function() {
            var numLis = $functionsList.find('li').length;
            $functionsInput.siblings('.iconWrapper').click();
            expect($functionsList.is(":visible")).to.be.true;
            expect($functionsList.find('li:visible').length).to.equal(numLis);

            $functionsInput.val('is').trigger(fakeEvent.input);
            expect($functionsList.find("li:visible").length).to.be.lt(numLis);

            $functionsInput.siblings('.iconWrapper').click();
            expect($functionsList.find('li:visible').length).to.equal(numLis);
        });

        it('keydown enter and tab should update argument section', function() {
            $functionsInput.val('').trigger(fakeEvent.enterKeydown);
            expect($argSection.length).to.equal(1);
            expect($argSection.hasClass('inactive')).to.be.true;

            $functionsInput.val('and').trigger(fakeEvent.enterKeydown);
            expect($argSection.hasClass('inactive')).to.be.false;
            var prefixCol = xcHelper.getPrefixColName(prefix, 'yelping_since');
            expect($argSection.find('.arg').eq(0).val()).to.equal(gColPrefix + prefixCol);
            expect($argSection.find('.arg').eq(1).val()).to.equal("");
            expect($argSection.find('.arg').eq(1).is(document.activeElement)).to.be.true;

            $functionsInput.val('').trigger({type:"keydown", which: keyCode.Tab});
            expect($argSection.length).to.equal(1);
            expect($argSection.hasClass('inactive')).to.be.true;

            $functionsInput.val('and').trigger({type:"keydown", which: keyCode.Tab});
            expect($argSection.hasClass('inactive')).to.be.false;
            var prefixCol = xcHelper.getPrefixColName(prefix, 'yelping_since');
            expect($argSection.find('.arg').eq(0).val()).to.equal(gColPrefix + prefixCol);
            expect($argSection.find('.arg').eq(1).val()).to.equal("");
            expect($argSection.find('.arg').eq(1).is(document.activeElement)).to.be.true;
        });

        it('$.change on input should update argument section', function() {
            StatusBox.forceHide();

            $functionsInput.val('').change();
            expect($argSection.length).to.equal(1);
            expect($argSection.hasClass('inactive')).to.be.true;
            expect($('#statusBox:visible').length).to.equal(0);

            $functionsInput.val('and').change();
            expect($argSection.hasClass('inactive')).to.be.false;
            var prefixCol = xcHelper.getPrefixColName(prefix, 'yelping_since');
            expect($argSection.find('.arg').eq(0).val()).to.equal(gColPrefix + prefixCol);
            expect($argSection.find('.arg').eq(1).val()).to.equal("");
            expect($argSection.find('.arg').eq(1).is(document.activeElement)).to.be.true;

            StatusBox.forceHide();
            expect($('#statusBox:visible').length).to.equal(0);
            $functionsInput.trigger(fakeEvent.mousedown);
            $functionsInput.val('invalidFunction').change();
            expect($('#statusBox:visible').length).to.equal(0);
            
            // trigger change via submit button to see if status box error shows
            StatusBox.forceHide();
            expect($('#statusBox:visible').length).to.equal(0);
            $operationsView.find('.submit').trigger(fakeEvent.mousedown);
            $functionsInput.val('test').change();
            expect($('#statusBox:visible').length).to.equal(1);
            StatusBox.forceHide();
        });

        it('functions list should scroll with key events', function() {
            var numLis = $functionsList.find('li').length;
            $functionsInput.val("");
            $functionsInput.siblings('.iconWrapper').mousedown();
            $functionsInput.siblings('.iconWrapper').click();

            expect($functionsList.is(":visible")).to.be.true;
            expect($functionsList.find('li:visible').length).to.equal(numLis);
            expect(numLis).to.be.gt(10);
            expect($functionsList.find('li.highlighted').length).to.equal(0);

            $('body').trigger({type:"keydown", which: keyCode.Down});
            expect($functionsList.find('li.highlighted').length).to.equal(1);
            expect($functionsList.find('li').eq(0).hasClass('highlighted')).to.be.true;

            $('body').trigger({type:"keydown", which: keyCode.Up});
            expect($functionsList.find('li.highlighted').length).to.equal(1);
            expect($functionsList.find('li').last().hasClass('highlighted')).to.be.true;

            $('body').trigger({type:"keydown", which: keyCode.Down});
            $('body').trigger({type:"keydown", which: keyCode.Down});
            expect($functionsList.find('li.highlighted').length).to.equal(1);
            expect($functionsList.find('li').eq(1).hasClass('highlighted')).to.be.true;
            expect($functionsInput.val()).to.equal("between");
        });

        after(function(done) {
            OperationsView.close();
            setTimeout(function() { // allow time for op menu to close
                done();
            }, 500);
        });
    });

    describe('filter', function() {
        var tableId;
        var $operationsView;
        var $functionsInput;
        var $functionsList;
        var $argSection;
        var $filterForm;

        before(function(done) {
            $operationsView = $('#operationsView');
            $filterForm = $operationsView.find('.filter');
            $('.xcTableWrap').each(function() {
                if ($(this).find('.tableName').val().indexOf(testDs) > -1) {
                    tableId = $(this).find('.hashName').text().slice(1);
                    return false;
                }
            });

            OperationsView.show(tableId, 1, 'filter')
            .then(function() {
                $functionsInput = $operationsView.find('.filter .functionsInput');
                $functionsList = $functionsInput.siblings('.list');
                $argSection = $filterForm.find('.argsSection').eq(0);
                done();
            });
        });

        describe('testing multiple conditions', function() {
            var addGroup;
            var removeGroup;
            before(function() {
                addGroup = OperationsView.__testOnly__.addFilterGroup;
                removeGroup = OperationsView.__testOnly__.removeFilterGroup;
            });

            it('minimizing group with no args should work', function() {
                expect($argSection.hasClass('inactive')).to.be.true;
                expect($filterForm.find('.minGroup').length).to.equal(1);
                expect($filterForm.find('.altFnTitle:visible').length).to.equal(0);
                expect($filterForm.find('.functionsInput').val()).to.equal("");
                expect($filterForm.find('.group').hasClass('minimized')).to.be.false;

                $filterForm.find('.minGroup').click();

                expect($filterForm.find('.group').hasClass('minimized')).to.be.true;
                expect($filterForm.find('.altFnTitle:visible').length).to.equal(1);
                expect($filterForm.find('.group').attr('data-numargs')).to.equal("0");
            });

            it('unminimize should work', function() {
                expect($filterForm.find('.group').hasClass('minimized')).to.be.true;
                $filterForm.find('.group').mouseup();
                expect($filterForm.find('.group').hasClass('minimized')).to.be.false;
            });

            it('minimizing group with args should work', function() {
                // check state
                expect($argSection.hasClass('inactive')).to.be.true;
                expect($filterForm.find('.minGroup').length).to.equal(1);
                expect($filterForm.find('.altFnTitle:visible').length).to.equal(0);
                expect($filterForm.find('.functionsInput').val()).to.equal("");
                expect($filterForm.find('.group').hasClass('minimized')).to.be.false;
                expect($argSection.find('.arg:visible').length).to.equal(0);

                // trigger function and arg section
                $functionsInput.val('and').trigger(fakeEvent.enterKeydown);
                expect($argSection.hasClass('inactive')).to.be.false;
                expect($argSection.find('.arg:visible').length).to.equal(2);

                // click minimize
                $filterForm.find('.minGroup').click();

                // check
                expect($filterForm.find('.group').hasClass('minimized')).to.be.true;
                expect($filterForm.find('.group').attr('data-numargs')).to.equal("2");
                expect($filterForm.find('.altFnTitle:visible').length).to.equal(0);

                // unminimize
                $filterForm.find('.group').mouseup();
            });

            it('adding and removing filter args should work', function() {
                expect($filterForm.find('.group').length).to.equal(1);
                expect($filterForm.find('.group').eq(0).hasClass('minimized')).to.be.false;

                addGroup();

                expect($filterForm.find('.group').length).to.equal(2);
                expect($filterForm.find('.group').eq(0).hasClass('minimized')).to.be.true;
                expect($filterForm.find('.group').eq(0).attr('data-numargs')).to.equal("2");
                expect($filterForm.find('.group').eq(1).hasClass('minimized')).to.be.false;

                addGroup();
                expect($filterForm.find('.group').length).to.equal(3);

                // cache 3rd group
                var $thirdGroup = $filterForm.find('.group').eq(2);
                expect($thirdGroup.find('.functionsList').data('fnlistnum')).to.equal(2);

                // remove middle group
                removeGroup($filterForm.find('.group').eq(1));

                expect($filterForm.find('.group').length).to.equal(2);
                expect($thirdGroup.find('.functionsList').data('fnlistnum')).to.equal(1);
            });
        });
        

        after(function(done) {
            OperationsView.close();
            setTimeout(function() { // allow time for op menu to close
                done();
            }, 500);
        });
    });

    // using map in operations view
    describe('map', function() {
        var tableId;
        var $operationsView;
        var $filterInput;
        var $categoryMenu;
        var $functionsMenu;
        var $argInputs;
        var $strPreview;

        before(function(done) {
            $operationsView = $('#operationsView');
            $strPreview = $operationsView.find('.strPreview');
            $('.xcTableWrap').each(function() {
                if ($(this).find('.tableName').val().indexOf(testDs) > -1) {
                    tableId = $(this).find('.hashName').text().slice(1);
                    return false;
                }
            });

            OperationsView.show(tableId, 1, 'map')
            .then(function() {
                $categoryMenu = $operationsView.find('.map .categoryMenu');
                $functionsMenu = $operationsView.find('.map .functionsMenu');
                $filterInput = $('#mapFilter');

                done();
            });
        });


        describe('map\'s search filter', function() {
            
            it('filter on input should update menus', function() {
                // xx dependent on there not being a UDF that has the word
                // add or sub

                $filterInput.val('add').trigger(fakeEvent.input);
                expect($categoryMenu.find('li:visible')).to.have.length(2);
                expect($categoryMenu.find('li:visible').text()).to.equal("arithmeticconversion");

                expect($functionsMenu.find('li:visible')).to.have.length(3);
                expect($functionsMenu.find('li:visible').text()).to.equal("addipAddrToIntmacAddrToInt");

                $filterInput.val('').trigger(fakeEvent.input);
                expect($categoryMenu.find('li:visible').length).to.be.within(7, 11);
                expect($functionsMenu.find('li:visible').length).to.be.above(70);

                $filterInput.val('add').trigger(fakeEvent.input);
                expect($functionsMenu.find('li:visible').text()).to.equal("addipAddrToIntmacAddrToInt");
                $filterInput.val('sub').trigger(fakeEvent.input);
                expect($functionsMenu.find('li:visible').text()).to.equal("subsubstring");
            });

            it('mapFilter keydown up/down actions should work', function() {
                $filterInput.val('').trigger(fakeEvent.input);
                expect($categoryMenu.find('li:visible').length).to.be.within(7, 11);
                expect($categoryMenu.find('li.active').length).to.equal(0);

                $filterInput.trigger({type: "keydown", which: keyCode.Up});
                expect($categoryMenu.find('li.active').length).to.equal(1);
                expect($categoryMenu.find('li').eq(0).hasClass('active')).to.be.true;

                $filterInput.trigger({type: "keydown", which: keyCode.Down});
                 expect($categoryMenu.find('li.active').length).to.equal(1);
                expect($categoryMenu.find('li').eq(1).hasClass('active')).to.be.true;

                $filterInput.trigger({type: "keydown", which: keyCode.Up});
                expect($categoryMenu.find('li.active').length).to.equal(1);
                expect($categoryMenu.find('li').eq(0).hasClass('active')).to.be.true;
            });

            it('mapFilter keydown enter should work', function() {
                $filterInput.val('findMinidx').trigger(fakeEvent.input);
                expect($categoryMenu.find('li').eq(0).hasClass('active')).to.be.true;
                expect($functionsMenu.find('li:visible').length).to.equal(1);
                expect($functionsMenu.find('li:visible').eq(0).hasClass('active')).to.be.false;
                expect($operationsView.find('.map .argsSection').hasClass('inactive')).to.be.true;

                $filterInput.trigger({type: "keydown", which: keyCode.Enter});
                expect($functionsMenu.find('li:visible').eq(0).hasClass('active')).to.be.true;
                expect($categoryMenu.find('li:visible').eq(0).hasClass('active')).to.be.true;
                expect($operationsView.find('.map .argsSection').hasClass('inactive')).to.be.false;
            });

            it('mapFilter clear should work', function() {
                $filterInput.val('findMinidx').trigger(fakeEvent.input);
                expect($filterInput.val()).to.equal('findMinidx');
                expect($categoryMenu.find('li:visible').length).to.equal(1);
                expect($functionsMenu.find('li:visible').length).to.equal(1);

                $operationsView.find('.filterMapFuncArea .clear').trigger(fakeEvent.mousedown);
                expect($filterInput.val()).to.equal('');
                expect($categoryMenu.find('li:visible').length).to.be.within(7, 11);
                expect($functionsMenu.find('li:visible').length).to.be.above(70);
            });

            it('clicking on filtered category list should work', function() {
                $filterInput.val('sub').trigger(fakeEvent.input);
                $categoryMenu.find('li:visible').eq(0).trigger(fakeEvent.click);
                expect($categoryMenu.find("li.active").text()).to.equal('arithmetic');
                expect($functionsMenu.find('li:visible')).to.have.length(1);
                expect($functionsMenu.find('li:visible').text()).to.equal("sub");
            });

            it('clicking away from category list should reset func list', function() {
                expect($functionsMenu.find('li:visible').text()).to.equal("sub");
                $operationsView.find('.map .catFuncHeadings').trigger(fakeEvent.mousedown);
                expect($functionsMenu.find('li:visible').text()).to.equal("subsubstring");
                expect($categoryMenu.find("li.active")).to.have.length(0);
                $filterInput.val('').trigger(fakeEvent.input);
            });
        });

        describe('autofilled input args', function() {
            it('should select category when clicked', function() {
                // string - concat
                $categoryMenu.find('li').filter(function() {
                    return ($(this).text() === "string");
                }).trigger(fakeEvent.click);
                expect($categoryMenu.find("li.active").text()).to.equal('string');

                $functionsMenu.find('li').filter(function() {
                    return ($(this).text() === "concat");
                }).trigger(fakeEvent.click);
                var $argInputs = $operationsView.find('.arg[type=text]:visible');
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                expect($argInputs.eq(0).val()).to.equal(gColPrefix + prefixCol);
                expect($argInputs.eq(1).val()).to.equal("");
                expect($argInputs.eq(2).val()).to.startsWith("yelping_since_concat");

                // user-defined - default:splitWithDelim
                $categoryMenu.find('li').filter(function() {
                    return ($(this).text() === "user-defined");
                }).trigger(fakeEvent.click);

                $functionsMenu.find('li').filter(function() {
                    return ($(this).text() === "default:splitWithDelim");
                }).trigger(fakeEvent.click);

                var $argInputs = $operationsView.find('.arg[type=text]:visible');
                expect($argInputs.eq(0).val()).to.equal(gColPrefix + prefixCol);
                expect($argInputs.eq(1).val()).to.equal("");
                expect($argInputs.eq(2).val()).to.equal("");
                expect($argInputs.eq(3).val()).to.startsWith("yelping_since_udf");

                // check arg descriptions
                var $descriptions = $argInputs.closest('.row').find('.description');
                expect($descriptions.eq(0).text()).to.equal("txt:");
                expect($descriptions.eq(1).text()).to.equal("index:");
                expect($descriptions.eq(2).text()).to.equal("delim:");
                expect($descriptions.eq(3).text()).to.equal("New Resultant Column Name:");
                
            });

            it('should focus on first empty input', function() {
                $categoryMenu.find('li').filter(function() {
                    return ($(this).text() === "string");
                }).trigger(fakeEvent.click);

                $functionsMenu.find('li').filter(function() {
                    return ($(this).text() === "concat");
                }).trigger(fakeEvent.click);

                var $argInputs = $operationsView.find('.arg[type=text]:visible');
                expect($argInputs.eq(1).is(document.activeElement)).to.be.true;
            });
        });

        describe('run map functions', function() {
            var submitForm;
            before(function() {
                submitForm = OperationsView.__testOnly__.submitForm;
            });

            it ('string-concat should work', function(done) {
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                var options = {
                    category: "string",
                    func: "concat",
                    args: [{
                        num: 1,
                        str: "zz"
                    }],
                    expectedMapStr: 'concat(' + prefixCol + ', "zz")',
                    expectedCliMapStr: 'concat(' + prefixCol + ', "zz")',
                    transform: function(colVal) {
                        return (colVal + this.args[0].str);
                    }
                };

                runMap(options)
                .always(function() {
                    done();
                });
            });

            it ('string-concat with empty param should not work', function(done) {
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                var options = {
                    category: "string",
                    func: "concat",
                    args: [{
                        num: 1,
                        str: ""
                    }],
                    expectedMapStr: 'concat(' + prefixCol + ', "")',
                    expectedCliMapStr: 'concat(' + prefixCol + 'yelping_since, "")',
                    transform: null
                };

                runMap(options)
                .always(function() {
                    done();
                });
            });

            it ('arithmetic-add with string should not work', function(done) {
                var options = {
                    category: "arithmetic",
                    func: "add",
                    args: [{num: 0, str: '"2"'}, {num: 1, str: '"3"'}],
                    expectedMapStr: 'add("2", "3")',
                    expectedCliMapStr: 'add("2", "3")',
                    transform: null
                };

                runMap(options)
                .always(function() {
                    done();
                });
            });


            it ('udf default:splitWithDelim should work', function(done) {
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                var options = {
                    category: "user-defined",
                    func: "default:splitWithDelim",
                    args: [{num: 1,str: 1}, {num:2, str: "\"-\""}],
                    expectedMapStr: 'default:splitWithDelim(' + prefixCol + ', 1, "-")',
                    expectedCliMapStr: 'default:splitWithDelim(' + prefixCol + ', 1, "-")',
                    transform: function(colVal) {
                        var delim = "-";
                        var index = this.args[0].str;
                        return colVal.split(delim).splice(index).join(delim);
                    }
                };

                runMap(options)
                .always(function() {
                    done();
                });
            });

            it ('add with string to int conversion should work', function(done) {
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                var options = {
                    category: "arithmetic",
                    func: "add",
                    args: [{num: 0,str: 'int(' + prefixCol + ', 10)'}, {num:1, str: 5}],
                    expectedMapStr: 'add(int(' + prefixCol + ', 10), 5)',
                    expectedCliMapStr: 'add(int(' + prefixCol + ', 10), 5)',
                    transform: function(colVal) {
                        return parseInt(colVal) + this.args[1].str + "";
                    }
                };

                runMap(options)
                .always(function() {
                    done();
                });
            });
           
            function runMap(options) {
                var deferred = jQuery.Deferred();
                var category = options.category;
                var func = options.func;
                var args = options.args;
                var expectedMapStr = options.expectedMapStr;
                var expectedCliMapStr = options.expectedCliMapStr;

                $categoryMenu.find('li').filter(function() {
                    return ($(this).text() === category);
                }).trigger(fakeEvent.click);

                $functionsMenu.find('li').filter(function() {
                    return ($(this).text() === func);
                }).trigger(fakeEvent.click);

                var $argInputs = $operationsView.find('.arg[type=text]:visible');
                for (var i = 0; i < args.length; i++) {
                    var argNum = args[i].num;
                    $argInputs.eq(argNum).val(args[i].str).trigger(fakeEvent.input);
                    var previewStr = $strPreview.find('.descArgs').text();
                }
                
                var promise = function() {
                    var innerDeferred = jQuery.Deferred();
                    setTimeout(function() {
                        // quotes/parsing doesn't get applied til 200 ms after inputed
                        expect(previewStr).to.equal(expectedMapStr);
                        innerDeferred.resolve();
                    }, 250);
                    return innerDeferred.promise();
                }
             
                promise()
                .then(function() {
                    return submitForm();
                })
                .then(function() {
                    expect(options.transform).to.not.be.null;
                    var $tableWrap;
                    var tableId;
                    $('.xcTableWrap').each(function() {
                        if ($(this).find('.tableName').val().indexOf(testDs) > -1) {
                            tableId = $(this).find('.hashName').text().slice(1);
                            $tableWrap = $(this);
                            return false;
                        }
                    });
                    var orgCellText = $tableWrap.find('.row0 .col2 .originalData').text();
                    var newCellText = $tableWrap.find('.row0 .col1 .originalData').text();
                    expect(newCellText).to.equal(options.transform(orgCellText));

                    var orgCellText = $tableWrap.find('.row15 .col2 .originalData').text();
                    var newCellText = $tableWrap.find('.row15 .col1 .originalData').text();
                    expect(newCellText).to.equal(options.transform(orgCellText));
                    var sqlCli = SQL.viewLastAction(true).cli;
                   
                    expect(sqlCli).to.contain(JSON.stringify(expectedCliMapStr));
                    SQL.undo()
                    .always(function() {
                        deferred.resolve();
                    });
                })
                .fail(function() {
                    expect(options.transform).to.be.null;
                    deferred.reject();
                });

                return deferred.promise();
            }
        });

        after(function(done) {
            OperationsView.close();
            var tableId;
            $('.xcTableWrap').each(function() {
                if ($(this).find('.tableName').val().indexOf(testDs) > -1) {
                    tableId = $(this).find('.hashName').text().slice(1);
                    return false;
                }
            });

            // allow time for operations view to close
            setTimeout(function() {
               done(); 
            }, 300);
        });
    });

    describe('aggregate', function() {
        var $aggForm;
        var $functionsInput;
        before(function(done) {
            $operationsView = $('#operationsView');
            $strPreview = $operationsView.find('.strPreview');
            $('.xcTableWrap').each(function() {
                if ($(this).find('.tableName').val().indexOf(testDs) > -1) {
                    tableId = $(this).find('.hashName').text().slice(1);
                    return false;
                }
            });


            OperationsView.show(tableId, 1, 'aggregate')
            .then(function() {
                $aggForm = $operationsView.find('.aggregate:visible');
                $functionsInput = $aggForm.find('.functionsInput:visible');
                done();
            });
        }); 

        describe('check aggregate form initial state', function() {
            it('agg form elements should be visible', function() {
                expect($aggForm).to.have.length(1);
                expect($aggForm.find('.tableList .text:visible')).to.have.length(1);
                expect($aggForm.find('.tableList .text').text()).to.startsWith('unitTestFakeYelp');
                expect($functionsInput).to.have.length(1);
                expect($functionsInput.val()).to.equal("");
                expect($functionsInput.attr('placeholder')).to.equal("avg");
            });

            it('functions menu should be filled', function() {
                var $menu = $aggForm.find('.genFunctionsMenu:hidden');
                expect($menu).to.have.length(1);
                expect($menu.find('li').length).to.be.gt(8);
                expect($menu.find('li').eq(0).text()).to.equal('avg');
                expect($menu.find('li').last().text()).to.equal('sumInteger');
                expect($functionsInput.val()).to.equal("");
                expect($aggForm.find('.argsSection').hasClass('inactive')).to.be.true;
            });
        });

        describe('agg function', function() {
            it('agg function input should work', function() {
                expect($aggForm.find('.argsSection').hasClass('inactive')).to.be.true;
                $functionsInput.val('avg').trigger('change');
                expect($aggForm.find('.argsSection').hasClass('inactive')).to.be.false;

                $functionsInput.val('avgWrong').trigger('change');
                expect($aggForm.find('.argsSection').hasClass('inactive')).to.be.true;

                $functionsInput.val('count').trigger('change');
                expect($aggForm.find('.argsSection').hasClass('inactive')).to.be.false;
                expect($aggForm.find('.descriptionText').text()).to.equal("Description: Counts the occurrences of a field");

                $functionsInput.val('avg').trigger('change');
                expect($aggForm.find('.argsSection').hasClass('inactive')).to.be.false;
                expect($aggForm.find('.descriptionText').text()).to.equal("Description: Computes average value in a set.");
                expect($aggForm.find('.description').eq(0).text()).to.equal("Field name to compute average value of:");
                expect($aggForm.find('.colNameSection .arg').val()).to.equal("");
            });
        });

        describe('field name input', function() {
            it('field name input should be autofilled when function selected', function() {
                var $fieldInput = $aggForm.find('.arg').eq(0);
                $functionsInput.val('avg').trigger('change');
                expect($fieldInput.val()).to.equal(gColPrefix + prefix + gPrefixSign + "yelping_since");
            });
        });

        describe('resultant name input', function() {
            it('resultant name input should work', function() {
                var $resultInput = $aggForm.find('.colNameSection .arg');
                 // xx focus testing only works if you're actually focused on this window
                if (document.hasFocus()) {
                     expect($resultInput.val()).to.equal("");
                    $resultInput.focus();
                    expect($resultInput.val()).to.equal(gAggVarPrefix);
                    $resultInput.blur();
                    expect($resultInput.val()).to.equal("");
                }
               

                $resultInput.val('something').trigger('input');
                expect($resultInput.val()).to.equal(gAggVarPrefix + 'something');
            });
        });

        describe('checkAggregateNameValidity() check', function() {
            it('checkAggregateNameValidity() fail should work', function(done) {
                var aggCheck = OperationsView.__testOnly__.checkAggregateNameValidity;
                var $resultInput = $aggForm.find('.colNameSection .arg');
                $resultInput.val('fa#il').trigger('input');
                var valid = false;

                aggCheck()
                .then(function(ret) {
                    expect(ret).to.equal(valid);
                })
                .fail(function() {
                    expect(valid).to.be.false;
                })
                .always(function() {
                    done();
                });
            });

            it('checkAggregateNameValidity() success should work', function(done) {
                var aggCheck = OperationsView.__testOnly__.checkAggregateNameValidity;
                var $resultInput = $aggForm.find('.colNameSection .arg');
                $resultInput.val('pa1ss').trigger('input');
                var valid = true;

                aggCheck()
                .then(function(ret) {
                    expect(ret).to.equal(valid);
                })
                .fail(function() {
                    expect(valid).to.be.false;
                })
                .always(function() {
                    done();
                });
            });
        });

        describe('aggregate submit test', function() {
            var submitForm;
            before(function() {
                submitForm = OperationsView.__testOnly__.submitForm;
            });

            it ('arg1-count, arg2-blank should work', function(done) {
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                var options = {
                    func: "count",
                    args: [{
                        num: 0,
                        str: gColPrefix + prefix + gPrefixSign + "yelping_since"
                    }],
                    output: 1000
                };

                runAgg(options)
                .always(function() {
                    done();
                });
            });

            it ('arg1-count, arg2-test should work', function(done) {
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                var options = {
                    func: "count",
                    args: [{
                        num: 0,
                        str: gColPrefix + prefix + gPrefixSign + "yelping_since"
                    },
                    {
                        num: 1,
                        str: gAggVarPrefix + "yelping_since"
                    },
                    ],
                    output: 1000
                };

                runAgg(options)
                .always(function() {
                    done();
                });
            });

            it ('arg1-invalid, arg2-blank should not work', function(done) {
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                var options = {
                    func: "invalid",
                    args: [{
                        num: 0,
                        str: gColPrefix + prefix + gPrefixSign + "yelping_since"
                    }],
                    output: null
                };

                runAgg(options)
                .always(function() {
                    done();
                });
            });

            it ('arg1-avg, arg2-blank on str should not work', function(done) {
                var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                var options = {
                    func: "avg",
                    args: [{
                        num: 0,
                        str: gColPrefix + prefix + gPrefixSign + "yelping_since"
                    }],
                    output: null
                };

                runAgg(options)
                .always(function() {
                    done();
                });
            });

            function runAgg(options) {
                var deferred = jQuery.Deferred();
                var func = options.func;
                var args = options.args;

                $functionsInput.val(func).trigger('change');
                $functionsInput.blur();

                var $argInputs = $operationsView.find('.arg[type=text]:visible');
                for (var i = 0; i < args.length; i++) {
                    var argNum = args[i].num;
                    $argInputs.eq(argNum).val(args[i].str).trigger(fakeEvent.input);
                }
             
                submitForm()
                .then(function() {
                    expect(options.output).to.not.be.null;
                    var alertText = $('#alertContent .text').text().trim(); 
                    expect(alertText).to.equal('{"Value":' + options.output +'}');
                    if (args[1]) {
                        Aggregates.deleteAggs([args[1].str.slice(1)])
                        .then(function() {
                            deferred.resolve();
                        })
                        .fail(function() {
                            expect(false).to.be.true;
                            deferred.reject();
                        })
                        .always(function() {
                            Alert.forceClose();
                            OperationsView.show(tableId, 1, 'aggregate')
                            .then(function() {
                                deferred.resolve();
                            }); 
                        });
                    } else {
                        OperationsView.show(tableId, 1, 'aggregate')
                        .then(function() {
                            deferred.resolve();
                        }); 
                    }
                })
                .fail(function() {
                    Alert.forceClose();
                    expect(options.output).to.be.null;
                    
                    deferred.reject();
                });

                return deferred.promise();
            }

        });
        
        after(function(done) {
            OperationsView.close();
            // allow time for operations view to close
            setTimeout(function() {
               done(); 
            }, 500);
        });
    });

    after(function(done) {
        UnitTest.deleteAll(tableName, testDs)
        .always(function() {
            UnitTest.offMinMode();
            done();
        });
    });
});
describe('OperationsModal', function() {

    describe('function hasFuncFormat', function() {
        var func;
        before(function() {
            func = OperationsModal.__testOnly__.hasFuncFormat;
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
            func = OperationsModal.__testOnly__.hasUnescapedParens;
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

    describe('group by', function() {
        var tableId;
        var $operationsModal;
        var $categoryInput;
        var $functionInput;
        var operatorsMap;
        var aggsList;
        var $argInputs;
        var getExistingTypes;
        var argumentFormatHelper;
        var parseType;
        var columns;
        var someColumns;
        var columnNames = ["yelping_since", "friends", "compliments", "one", "votes", "two.three", "elite", "review_count", "four", "mixVal", "average_stars", "user_id", "DATA"];
        var someColumnNames = ["yelping_since", "friends", "compliments", "review_count", "four", "mixVal", "average_stars", "DATA"];

        before(function(done) {
            getExistingTypes = OperationsModal.__testOnly__.getExistingTypes;
            argumentFormatHelper = OperationsModal.__testOnly__.argumentFormatHelper;
            parseType = OperationsModal.__testOnly__.parseType;
            $operationsModal = $('#operationsModal');
            $('.xcTableWrap').each(function() {
                if ($(this).find('.tableName').val().indexOf('unitTest-fakeYelp') > -1) {
                    tableId = $(this).find('.hashName').text().slice(1);
                    return false;
                }
            });

            OperationsModal.show(tableId, 1, 'group by')
            .then(function() {
                // console.log(tableId);
                operatorsMap = OperationsModal.getOperatorsMap();
                setTimeout(function() {
                    $categoryInput = $('#categoryList').find('input');
                    $functionInput = $('#functionList').find('input');
                    // $argInputs = $operationsModal.find('.argument:lt(3)');
                    done();
                }, 500);
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

        describe('category input', function() {
            it('should read aggregate functions', function() {
                expect($categoryInput.val()).to.equal('aggregate functions');
            });

            it('list should have exactly 1 item', function() {
                // dropdown requires mousedown and click
                $categoryInput.siblings('.dropdown').mousedown();
                $categoryInput.siblings('.dropdown').click();

                expect($('#categoryMenu').is(':visible')).to.equal(true);
                expect($('#categoryMenu').find('li')).to.have.length(1);
                expect($('#categoryMenu').find('li').text()).to.equal('aggregate functions');
            });
        });

        describe('function input', function() {
            it('list should match operatorsMap', function() {
                // dropdown requires mousedown and click
                $functionInput.siblings('.dropdown').mousedown();
                $functionInput.siblings('.dropdown').click();

                expect($('#functionsMenu').is(':visible')).to.equal(true);
                expect($('#functionsMenu').find('li')).to.have.length(aggsList.length);
            });

            it('input should read Avg', function() {
                $('#functionsMenu').find('li').filter(function() {
                    return ($(this).text() === "avg");
                }).trigger(fakeEvent.mouseup);
                expect($functionInput.val()).to.equal('avg');
            });
        });

        describe('argument section', function() {
            it('should have 3 visible text inputs', function() {
                expect($operationsModal.find('.argument[type=text]:visible')).to.have.length(3);
                $argInputs = $operationsModal.find('.argument[type=text]:visible');
            });
            it ('should have 2 visible checkboxes for inc sample', function() {
                expect($operationsModal.find('.argument[type=checkbox]:visible')).to.have.length(2);
            });
        });

        describe('test type checking', function() {
            it('should detect if arg types are valid or invalid', function() {
                columns = gTables[tableId].tableCols;
                someColumns = [columns[0], columns[1], columns[2], columns[5], columns[7], columns[8], columns[9], columns[10]];
                expect(columns.length).to.equal(13);
                var testArgs = [];
                var args;
                for (var i = 0; i < someColumns.length; i++) {
                    for (var j = 0; j < someColumns.length; j++) {
                        args = [];
                        args.push(gColPrefix + someColumns[i].name);
                        args.push(gColPrefix + someColumns[j].name);
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

            it('variety of different arguments should be formatted correctly', function() {
                var testArgs1 = ["str", "null", "undefined", "sp aced", "com,ma", "d.ot", gColPrefix, "\\" + gColPrefix, gColPrefix + "a", "\\" + gColPrefix + "a", "a\\" + gColPrefix, "5a", "a5", -5, 5, 3.2, 0];
                var testArgs2 = [];
                for (var i = 0; i < someColumnNames; i++) {
                    testArgs2.push(gColPrefix + someColumnNames[i]);
                }
                var arg1Types = [];
                var arg2Types = [];
                var arg1type;
                var arg2type;
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
                    gTableColNum = gTables[tableId].getColNumByBackName(testArgs2[i]);
                    arg2Type = gTables[tableId].getCol(gTableColNum).getType();

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
            });
        });

        after(function() {
            $("#operationsModal .cancel").click();
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

        function testGroupByInputsColTypes(groupByType, testArgs, testedGBTypes) {
            var argInfos = [];
            var existingTypes;
            expect(testedGBTypes).to.not.include(groupByType);
            $functionInput.val(groupByType).trigger(fakeEvent.enter);
            expect($operationsModal.find('.argument[type=text]:visible')).to.have.length(3);
            testedGBTypes.push(groupByType);

            for (var i = 0; i < testArgs.length; i++) {
                setArgInputs(testArgs[i]);
                existingTypes = getExistingTypes();
                argInfos.push(argumentFormatHelper(existingTypes));
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
            var gTableColNum;
            var arg1Type;
            var arg2Type;
            var hasValidTypes;
            var hasValidColPrefix = OperationsModal.__testOnly__.hasValidColPrefix;

            expect(testedGBTypes).to.not.include(groupByType);
            $functionInput.val(groupByType).trigger(fakeEvent.enter);
            expect($operationsModal.find('.argument[type=text]:visible'))
                                                            .to.have.length(3);
            testedGBTypes.push(groupByType);

            var arg1TypeId = $argInputs.eq(0).data('typeid');
            var arg2TypeId = $argInputs.eq(1).data('typeid');
            var arg1ValidTypes = parseType(arg1TypeId);
            var arg2ValidTypes = parseType(arg2TypeId);

            for (var i = 0; i < testArgs1.length; i++) {
                for (var j = 0; j < testArgs2.length; j++) {
                    setArgInputs([testArgs1[i], testArgs2[j], 'defaultval']);
                    existingTypes = getExistingTypes();
                    argInfos.push(argumentFormatHelper(existingTypes));

                    if (hasValidColPrefix(testArgs1[i]) &&
                        gTables[tableId].getColNumByBackName(testArgs1[i]) === -1) {
                        hasValidTypes = false;
                    } else if (hasValidColPrefix(testArgs2[j]) &&
                                gTables[tableId].getColNumByBackName(testArgs1[j]) === -1) {
                        hasValidTypes = false;
                    } else if (arg1ValidTypes.indexOf(arg1Types[i]) > -1 &&
                        arg2ValidTypes.indexOf(arg2Types[j]) > -1) {
                        hasValidTypes = true;
                    } else {
                        hasValidTypes = false;
                    }
                    if (hasValidTypes !== argInfos[count].isPassing) {
                        console.error(arg1ValidTypes, arg1Types[i], arg2ValidTypes,
                            arg2Types[j], testArgs1[i], testArgs2[j], argInfos[count]);
                    }

                    expect(hasValidTypes).to.equal(argInfos[count].isPassing);
                    count++;
                }
            }
        }
    });

});
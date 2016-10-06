describe('OperationsView', function() {
    // xx currently depends on table with the name "unitTestFakeYelp" to exist
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

    describe.skip('group by', function() {
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
                if ($(this).find('.tableName').val().indexOf('unitTestFakeYelp') > -1) {
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
            it('should have 3 visible checkboxes for inc sample', function() {
                expect($operationsView.find('.checkbox:visible')).to.have.lengthOf(3);
            });
        });

        describe('test type checking', function() {
            this.timeout(25000);
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

            it('variety of different arguments should be formatted correctly', function(done) {
                var testArgs1 = ["str", "null", "undefined", "sp aced", "com,ma", "d.ot", gColPrefix, "\\" + gColPrefix, gColPrefix + "a", "\\" + gColPrefix + "a", "a\\" + gColPrefix, "5a", "a5", -5, 5, 3.2, 0];
                var testArgs2 = [];
                var testArgs2Unprefixed = [];
                for (var i = 0; i < someColumnNames.length; i++) {
                    testArgs2.push(gColPrefix + someColumnNames[i]);
                    testArgs2Unprefixed.push(someColumnNames[i]);
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
                    gTableColNum = gTables[tableId].getColNumByBackName(testArgs2Unprefixed[i]);
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
                        gTables[tableId].getColNumByBackName(testArgs1[i].slice(1)) === -1) {
                        hasValidTypes = false;
                    } else if (hasValidColPrefix(testArgs2[j]) &&
                                gTables[tableId].getColNumByBackName(testArgs2[j].slice(1)) === -1) {
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

        before(function(done) {
            $operationsView = $('#operationsView');
            $('.xcTableWrap').each(function() {
                if ($(this).find('.tableName').val().indexOf('unitTestFakeYelp') > -1) {
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
                expect($argInputs.eq(0).val()).to.equal(gColPrefix + 'yelping_since');


                var $allEls = $header.find('*');
                var count = 0;
                // go through each element inside .header and click
                $allEls.each(function() {
                    if ($(this).closest('.dropdownBox').length) {
                        return;
                    }
                    $argInputs.eq(0).focus().trigger('focus').val("");
                    expect($argInputs.eq(0).val()).to.equal("");
                    $(this).click();
                    expect($argInputs.eq(0).val()).to.equal(gColPrefix + 'yelping_since');
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
                if ($(this).find('.tableName').val().indexOf('unitTestFakeYelp') > -1) {
                    tableId = $(this).find('.hashName').text().slice(1);
                    return false;
                }
            });

            OperationsView.show(tableId, 1, 'map')
            .then(function() {
                operatorsMap = OperationsView.getOperatorsMap();
                $categoryMenu = $operationsView.find('.map .categoryMenu');
                $functionsMenu = $operationsView.find('.map .functionsMenu');
                $filterInput = $('#mapFilter');

                done();
            });
        });


        describe('map\'s search filter', function() {
            // it('menu should be visible', function() {
            //     expect($categoryMenu.is(":visible")).to.equal(true);
            //     expect($categoryMenu.find('li').length).to.be.above(7);
            // });
            
            it('filter on input should update menus', function() {
                // xx dependent on there not being a UDF that hahs the word
                // add or sub
                // 
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
                expect($argInputs.eq(0).val()).to.equal("$yelping_since");
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
                expect($argInputs.eq(0).val()).to.equal("$yelping_since");
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
            this.timeout(15000);
            var submitForm;
            before(function() {
                submitForm = OperationsView.__testOnly__.submitForm;
            });

            it ('string-concat should work', function(done) {
                var options = {
                    category: "string",
                    func: "concat",
                    args: [{
                        num: 1,
                        str: "zz"
                    }],
                    expectedMapStr: 'concat(yelping_since, "zz")',
                    transform: function(colVal) {
                        return (colVal + this.args[0].str);
                    }
                };

                runMap(options)
                .always(function() {
                    done();
                });
            });

            it ('udf default:splitWithDelim should work', function(done) {
                var options = {
                    category: "user-defined",
                    func: "default:splitWithDelim",
                    args: [{num: 1,str: 1}, {num:2, str: "\"-\""}],
                    expectedMapStr: 'default:splitWithDelim(yelping_since, 1, "-")',
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
                var options = {
                    category: "arithmetic",
                    func: "add",
                    args: [{num: 0,str: 'int(yelping_since, 10)'}, {num:1, str: 5}],
                    expectedMapStr: 'add(int(yelping_since, 10), 5)',
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
               
                expect(previewStr).to.equal(expectedMapStr);

                submitForm()
                .then(function() {
                    var $tableWrap;
                    var tableId;
                    $('.xcTableWrap').each(function() {
                        if ($(this).find('.tableName').val().indexOf('unitTestFakeYelp') > -1) {
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
                   
                    expect(sqlCli).to.contain(JSON.stringify(expectedMapStr));
                    SQL.undo()
                    .always(function() {
                        deferred.resolve();
                    });
                })
                .fail(function() {
                    expect(false).to.equal.true;
                    deferred.reject();
                });

                return deferred.promise();
            }
        });

        after(function(done) {
            OperationsView.close();

            setTimeout(function() { // allow time for op menu to close
                done();
            }, 500);
        });

    });
});
describe('Constructor Test', function() {
    it('XcVersion should be a constructor', function() {
        var versionInfo = new XcVersion({
            'version': 'test',
            'SHA'    : 123,
        });

        expect(versionInfo).to.be.an('object');
        expect(Object.keys(versionInfo).length).to.equal(2);

        expect(versionInfo).to.have.property('version')
        .and.to.equal('test');

        expect(versionInfo).to.have.property('SHA')
        .and.to.equal(123);
    });

    it('XcAuth should be a constructor', function() {
        var autoInfo = new XcAuth({
            'idCount': 1,
            'hashTag': 'test'
        });

        expect(autoInfo).to.be.an('object');
        expect(Object.keys(autoInfo).length).to.equal(2);

        expect(autoInfo).to.have.property('idCount')
        .and.to.equal(1);

        expect(autoInfo).to.have.property('hashTag')
        .and.to.equal('test');
    });

    it('MouseEvents should be a constructor', function() {
        var mouseEvent = new MouseEvents();
        var $target = $('<div id="test"></div>');
        expect(mouseEvent.getLastClickTarget()).not.to.equal($target);
        expect(mouseEvent.getLastMouseDownTarget()).not.to.equal($target);

        mouseEvent.setClickTarget($target);
        expect(mouseEvent.getLastClickTarget()).to.equal($target);

        mouseEvent.setMouseDownTarget($target);
        expect(mouseEvent.getLastMouseDownTarget()).to.equal($target);
        expect(mouseEvent.getLastMouseDownTime()).to.be.a('number');
    });

    it('XcLog should be a constructor', function() {
        // case 1
        var log1 = new XcLog({
            'title'  : 'test1',
            'cli'    : 'cliTest',
            'options': {
                'operation': 'foo'
            }
        });

        expect(log1).to.be.an('object');
        expect(Object.keys(log1).length).to.equal(4);

        expect(log1).to.have.property('cli').and.to.equal('cliTest');
        expect(log1).to.have.property('timestamp')
        .and.to.be.a('number');

        expect(log1.isError()).to.be.false;
        expect(log1.getOperation()).to.equal('foo');
        expect(log1.getTitle()).to.equal('test1');
        expect(log1.getOptions()).to.be.an('object');

        // case 2
        var log2 = new XcLog({
            'title'  : 'test2',
            'cli'    : 'cliTest2',
            'error'  : 'testError',
            'options': {
                'operation': 'bar'
            }
        });

        expect(log2).to.be.an('object');
        expect(Object.keys(log2).length).to.equal(6);

        expect(log2).to.have.property('cli').and.to.equal('cliTest2');
        expect(log2).to.have.property('error').and.to.equal('testError');
        expect(log2.isError()).to.be.true;
        expect(log2.getOperation()).to.equal('bar');
        expect(log2.getTitle()).to.equal('test2');
    });

    it('ColFunc should be a constructor', function() {
        var colFunc = new ColFunc({
            "name": "test",
            "args": "pull(test)"
        });
        expect(colFunc).to.be.an('object');
        expect(Object.keys(colFunc).length).to.equal(2);

        expect(colFunc).to.have.property('name')
        .and.to.equal('test');
        expect(colFunc).to.have.property('args')
        .and.to.equal('pull(test)');
    });

    describe("ProgCol constructor test", function() {
        it("ProgCol should be a constructor", function() {
            // case 1
            var progCol = new ProgCol({
                "name"    : "test",
                "backName": "prefix::backTest",
                "type"    : "float",
                "isNewCol": false,
                "width"   : 100,
                "decimal" : 10,
                "func"    : {
                    "name": "pull"
                }
            });

            expect(progCol).to.be.an('object');
            expect(progCol.getFrontColName()).to.equal('test');
            expect(progCol.getFrontColName(true)).to.equal('prefix::test');
            expect(progCol.getBackColName()).to.equal('prefix::backTest');
            expect(progCol.getPrefix()).to.equal('prefix');
            expect(progCol.getType()).to.equal('float');
            expect(progCol.isNumberCol()).to.be.true;
            expect(progCol.isEmptyCol()).to.be.false;
            expect(progCol.getWidth()).to.equal(100);
            expect(progCol.hasHidden()).to.be.false;

            // case 2
            progCol = new ProgCol({
                "name": "DATA",
                "type": "object",
                "func": {
                    "name": "raw"
                }
            });
            expect(progCol.isDATACol()).to.be.true;
        });

        it("Should get display width", function() {
            // case 1
            var progCol = new ProgCol({
                "name"    : "test",
                "backName": "prefix::backTest",
                "type"    : "float",
                "isNewCol": false,
                "width"   : 100,
                "decimal" : 10,
                "func"    : {
                    "name": "pull"
                }
            });

            expect(progCol.getDisplayWidth()).to.equal(100);

            // case 2
            progCol.isHidden = true;
            expect(progCol.getDisplayWidth()).to.equal(15);
        });

        it("Should get and set back col name", function() {
            var progCol = new ProgCol({
                "name"    : "test",
                "backName": "prefix::backTest",
                "type"    : "float",
                "isNewCol": false,
                "width"   : 100,
                "decimal" : 10,
                "func"    : {
                    "name": "pull"
                }
            });

            expect(progCol.getBackColName()).to.equal("prefix::backTest");
            // case 1
            progCol.setBackColName();
            expect(progCol.getBackColName()).to.equal("prefix::backTest");
            // case 2
            progCol.setBackColName("prefix2::test2");
            expect(progCol.getBackColName()).to.equal("prefix2::test2");
            expect(progCol.getPrefix()).to.equal("prefix2");
            // case 3
            progCol.setBackColName("test3");
            expect(progCol.getBackColName()).to.equal("test3");
            expect(progCol.getPrefix()).to.equal("");
        });

        it("Should set immediates type", function() {
            var progCol = new ProgCol({
                "name"    : "test",
                "backName": "backTest",
                "type"    : "float",
                "isNewCol": false,
                "width"   : 100,
                "decimal" : 10,
                "func"    : {
                    "name": "pull"
                }
            });

            expect(progCol.isImmediate()).to.be.false;
            // error case
            progCol.setImmediateType();

            var testCases = [{
                "typeId" : DfFieldTypeT.DfString,
                "boolean": true,
                "type"   : "string"
            },{
                "typeId" : DfFieldTypeT.DfUnknown,
                "boolean": true,
                "type"   : "unknown"
            },{
                "typeId" : DfFieldTypeT.DfInt32,
                "boolean": true,
                "type"   : "integer"
            },{
                "typeId" : DfFieldTypeT.DfFloat64,
                "boolean": true,
                "type"   : "float"
            },{
                "typeId" : DfFieldTypeT.DfBoolean,
                "boolean": true,
                "type"   : "boolean"
            },{
                "typeId" : DfFieldTypeT.DfMixed,
                "boolean": true,
                "type"   : "mixed"
            },{
                "typeId" : DfFieldTypeT.DfFatptr,
                "boolean": false,
                "type"   : ""
            },{
                "typeId" : DfFieldTypeT.DfScalarPtr,
                "boolean": true,
                "type"   : "unknown"
            }];

            testCases.forEach(function(testCase) {
                progCol.immediate = false;
                progCol.type = "";
                progCol.setImmediateType(testCase.typeId);
                expect(progCol.isImmediate()).to.equal(testCase.boolean);
                expect(progCol.getType()).to.equal(testCase.type);
            });
        });

        it("Should get and set format", function() {
            var progCol = new ProgCol({
                "name"    : "test",
                "backName": "backTest",
                "type"    : "float",
                "isNewCol": false,
                "width"   : 100,
                "decimal" : 10,
                "func"    : {
                    "name": "pull"
                }
            });

            expect(progCol.format).to.be.null;
            expect(progCol.getFormat()).to.equal(ColFormat.Default);
            progCol.setFormat(ColFormat.Percent);
            expect(progCol.format).to.equal(ColFormat.Percent);
            expect(progCol.getFormat()).to.equal(ColFormat.Percent);

            progCol.setFormat(ColFormat.Default);
            expect(progCol.format).to.be.undefined;
            expect(progCol.getFormat()).to.equal(ColFormat.Default);
        });

        it("Should get and set decimal", function() {
            var progCol = new ProgCol({
                "name"    : "test",
                "backName": "backTest",
                "type"    : "float",
                "isNewCol": false,
                "width"   : 100,
                "func"    : {
                    "name": "pull"
                }
            });

            expect(progCol.getDecimal()).to.equal(-1);
            progCol.setDecimal(2);
            expect(progCol.getDecimal()).to.equal(2);
        });
    });

    describe('Table Constructor Test', function() {
        it('TableMeta Constructor should work', function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId"  : "a1",
                "isLocked" : false
            });

            expect(table).to.be.an('object');
            expect(table.getId()).to.equal('a1');
            expect(table.getName()).to.equal('test#a1');

            try {
                new TableMeta();
            } catch (error) {
                expect(error).not.to.be.null;
            }
        });

        it('Table should update timestamp', function(done) {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId"  : "a1",
                "isLocked" : false
            });

            var time = table.getTimeStamp();
            expect(time).to.be.a('number');

            setTimeout(function() {
                table.updateTimeStamp();
                expect(table.getTimeStamp()).not.to.equal(time);
                done();
            }, 50);
        });

        it("Table should get keyName", function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId"  : "a1",
                "isLocked" : false
            });
            var initialVal = "";
            var testVal = "testKey";

            expect(table.getKeyName()).to.equal(initialVal);
            
            table.keyName = testVal;
            expect(table.getKeyName()).to.equal(testVal);
            table.keyName = initialVal;
        });

        it("Table should get ordering", function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId"  : "a1",
                "isLocked" : false
            });
            expect(table.getOrdering()).to.be.undefined;

            var testVal = "testOrder";
            table.ordering = testVal;

            expect(table.getOrdering()).to.equal(testVal);
        });

        it('Table should lock and unlock', function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId"  : "a1",
                "isLocked" : false
            });

            expect(table.hasLock()).to.be.false;
            table.lock();
            expect(table.hasLock()).to.be.true;
            table.unlock();
            expect(table.hasLock()).to.be.false;
        });

        it('Table should change status', function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId"  : "a1",
                "isLocked" : false
            });
            expect(table.getType()).to.equal(TableType.Active);

            table.beArchived();
            expect(table.getType()).to.equal(TableType.Archived);

            table.beTrashed();
            expect(table.getType()).to.equal(TableType.Trash);

            table.beOrphaned();
            expect(table.getType()).to.equal(TableType.Orphan);

            table.beUndone();
            expect(table.getType()).to.equal(TableType.Undone);

            table.beActive();
            expect(table.getType()).to.equal(TableType.Active);
            expect(table.isActive()).to.be.true;
        });

        it('Table should get col info', function() {
            var progCol =  new ProgCol({
                "name"    : "testCol",
                "backName": "prefix::backTestCol",
                "isNewCol": false,
                "func"    : {
                    "name": "pull"
                }
            });

            var dataCol = ColManager.newDATACol();
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId"  : "a1",
                "tableCols": [progCol, dataCol],
                "isLocked" : false
            });

            expect(table.getNumCols()).to.equal(2);
            expect(table.getCol(0)).to.be.null;
            expect(table.getCol(1).getFrontColName()).to.be.equal("testCol");
            expect(table.getCol(3)).to.be.null;

            expect(table.getColNumByBackName("prefix::backTestCol"))
            .to.equal(1);
            expect(table.getColNumByBackName("errorCol")).to.equal(-1);

            expect(table.getColByBackName("prefix::backTestCol")
            .getFrontColName()).to.equal("testCol");
            expect(table.getColByBackName("errorCol")).to.be.null;

            expect(table.getColByFrontName("prefix::testCol").getBackColName())
            .to.equal("prefix::backTestCol");
            expect(table.getColByFrontName("errorCol")).to.be.null;

            expect(table.hasColWithBackName("prefix::backTestCol")).to.be.true;
            expect(table.hasColWithBackName("errorCol")).to.be.false;

            expect(table.hasCol("testCol", "")).to.be.false;
            expect(table.hasCol("testCol")).to.be.true;
            expect(table.hasCol("testCol", "prefix")).to.be.true;
            expect(table.hasCol("prefix::backTestCol", "")).to.be.false;
            expect(table.hasCol("prefix::backTestCol")).to.be.true;
            expect(table.hasCol("prefix::backTestCol", "prefix")).to.be.true;
            expect(table.hasCol("errorCol")).to.be.false;
        });

        it("Should add and remove col", function() {
            var dataCol = ColManager.newDATACol();
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId"  : "a1",
                "tableCols": [dataCol],
                "isLocked" : false
            });

            var progCol =  new ProgCol({
                "name"    : "testCol",
                "backName": "backTestCol",
                "isNewCol": false,
                "func"    : {
                    "name": "pull"
                }
            });

            // add col case 1
            table.addCol(-1, progCol);
            expect(table.tableCols.length).to.equal(1);
            // add col case 2
            table.addCol(1);
            expect(table.tableCols.length).to.equal(1);
            // add col case 3
            table.addCol(1, progCol);
            expect(table.tableCols.length).to.equal(2);
            expect(table.getCol(1)).to.equal(progCol);

            // remove col case 1
            table.removeCol(-1);
            expect(table.tableCols.length).to.equal(2);
            // remove col case 2
            table.removeCol(3);
            expect(table.tableCols.length).to.equal(2);
            // remove col case 3
            var col = table.removeCol(1);
            expect(table.tableCols.length).to.equal(1);
            expect(col).to.equal(progCol);
        });

        it('table should free result set', function(done) {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId"  : "a1",
                "isLocked" : false
            });
            table.freeResultset()
            .then(function() {
                expect(table.resultSetId).to.equal(-1);
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });

        it("table should get immediates info", function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId"  : "a1",
                "isLocked" : false
            });

            var res = table.getImmediateNames();
            expect(res).to.be.an("array").and.to.have.length(0);

            table.backTableMeta = {
                "valueAttrs": [{"name": "test", "type": DfFieldTypeT.DfString},
                            {"name": "test2", "type": DfFieldTypeT.DfFatptr}]
            };

            res = table.getImmediateNames();
            expect(res).to.be.an("array").and.to.have.length(1);
            expect(res[0]).to.equal("test");
        });

        it("table should show indexed style", function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId"  : "a1"
            });

            expect(table.showIndexStyle()).to.be.false;
            table.ordering = XcalarOrderingT.XcalarOrderingAscending;
            var cache = gEnableIndexStyle;
            gEnableIndexStyle = true;
            expect(table.showIndexStyle()).to.be.true;
            gEnableIndexStyle = cache;
        });

        it("table should add and remove book mark", function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId"  : "a1"
            });

            expect(table.bookmarks).to.be.an('array')
            .and.to.have.length(0);

            // case 1
            table.addBookmark(1);
            expect(table.bookmarks).to.have.length(1);
            expect(table.bookmarks[0]).to.equal(1);

            // case 2
            table.addBookmark(1);
            expect(table.bookmarks).to.have.length(1);

            // case 3
            try {
                table.addBookmark(null);
            } catch (error) {
                expect(error).not.to.be.null;
            }

            // unbookmark
            // case 1
            table.removeBookmark(2);
            expect(table.bookmarks).to.have.length(1);

            // case 2
            table.removeBookmark(1);
            expect(table.bookmarks).to.have.length(0);

            // case 3
            try {
                table.removeBookmark(null);
            } catch (error) {
                expect(error).not.to.be.null;
            }
        });
    });

    describe('Meta Constructor Test', function() {
        it('METAConstructor should have the right key', function() {
            var keys = getMETAKeys();
            var meta = new METAConstructor(keys);
            keyCheck(keys, meta);
        });

        it('EMetaConstructor should have the right key', function() {
            var keys = getEMetaKeys();
            var meta = new EMetaConstructor(keys);
            keyCheck(keys, meta);
        });

        it('UserInfoConstructor should have the right key', function() {
            var keys = getUserInfoKeys();
            var meta = new UserInfoConstructor(keys);
            keyCheck(keys, meta);
        });

        function keyCheck(keys, meta) {
            expect(keys).to.be.an('object');
            expect(meta).to.be.an('object');

            for (var key in keys) {
                expect(meta).have.property(keys[key]);
            }
        }
    });

    it('UserPref should be a constructor', function() {
        var userPref = new UserPref();
        expect(userPref).to.be.an('object');
        expect(Object.keys(userPref).length).to.equal(7);

        expect(userPref).to.have.property('datasetListView');
        expect(userPref).to.have.property('browserListView');
        expect(userPref).to.have.property('keepJoinTables');
        expect(userPref).to.have.property('hideDataCol')
        .and.to.be.false;
        expect(userPref).to.have.property('memoryLimit')
        .and.to.equal(70);
        expect(userPref).to.have.property('monitorGraphInterval')
        .and.to.equal(3);
        expect(userPref).to.have.property('activeMainTab')
        .and.to.equal('workspaceTab');

        userPref.update();
    });

    describe("DSFormAdvanceOption Constructor, Test", function() {
        var advanceOption;
        var $section;
        var $limit;
        var $pattern;

        before(function() {
            var html = '<section>' +
                            '<div class="listInfo no-selection">' +
                                '<span class="expand"></span>' +
                            '</div>' +
                            '<ul>' +
                                '<li class="limit option">' +
                                    '<input class="size" type="number">' +
                                    '<div class="dropDownList">' +
                                        '<input class="text unit">' +
                                        '<div class="list">' +
                                            '<ul>' +
                                              '<li>B</li>' +
                                            '</ul>' +
                                        '</div>' +
                                    '</div>' +
                                '</li>' +
                                '<li class="pattern option">' +
                                    '<input type="text" class="input">' +
                                    '<div class="recursive checkboxSection">' +
                                        '<div>Recursive</div>' +
                                        '<div class="checkbox"></div>' +
                                    '</div>' +
                                    '<div class="regex checkboxSection">' +
                                        '<div>Regex</div>' +
                                        '<div class="checkbox"></div>' +
                                    '</div>' +
                                '</li>' +
                            '</ul>' +
                        '</section>';
            $section = $(html);
            $limit = $section.find(".option.limit");
            $pattern = $section.find(".option.pattern");
        });

        it("Should be a valid constructor", function() {
            advanceOption = new DSFormAdvanceOption($section, "body");
            expect(advanceOption).to.be.an('object');
            expect(Object.keys(advanceOption).length).to.equal(1);

            expect(advanceOption).to.have.property('$section');
        });

        it("Should have valid event", function() {
            // expand
            $section.find(".listInfo .expand").click();
            expect($section.hasClass("active")).to.be.true;

            // dropdown list
            $limit.find("li").click();

            expect($limit.find(".unit").val()).to.equal("B");

            // checkbox
            $pattern.find(".recursive.checkboxSection").click();
            expect($pattern.find(".recursive .checkbox").hasClass("checked"))
            .to.be.true;
        });

        it("Should reset options", function() {
            advanceOption.reset();
            expect($limit.find(".unit").val()).to.equal("");
            expect($pattern.find(".recursive .checkbox").hasClass("checked"))
            .to.be.false;
        });

        it("Should set options", function() {
            advanceOption.set({
                "pattern"    : "testPattern",
                "isRecur"    : true,
                "isRegex"    : true,
                "previewSize": 123,
                "unit"       : "B",
                "sizeText"   : "123"
            });

            expect($pattern.find("input").val()).to.equal("testPattern");
            expect($pattern.find(".recursive .checkbox").hasClass("checked"))
            .to.be.true;
            expect($pattern.find(".regex .checkbox").hasClass("checked"))
            .to.be.true;
            expect($limit.find(".unit").val()).to.equal("B");
            expect($limit.find(".size").val()).to.equal("123");
        });

        it("Should get args", function() {
            var res = advanceOption.getArgs();
            expect(res).to.be.an("object");
            expect(Object.keys(res).length).to.equal(6);

            expect(res).to.have.property("pattern")
            .and.to.equal("testPattern");

            expect(res).to.have.property("isRecur")
            .and.to.be.true;

            expect(res).to.have.property("isRegex")
            .and.to.be.true;

            expect(res).to.have.property("previewSize")
            .and.to.equal(123);

            expect(res).to.have.property("sizeText")
            .and.to.equal("123");

            expect(res).to.have.property("unit")
            .and.to.equal("B");

            advanceOption.reset();
            res = advanceOption.getArgs();
            expect(res).to.have.property("pattern")
            .and.to.be.null;

            $limit.find(".unit").val("");
            $limit.find(".size").val("123");
            res = advanceOption.getArgs();
            expect(res).to.be.null;
            assert.isTrue($("#statusBox").is(":visible"));

            $("#statusBox .close").click();
        });
    });
    
    it("DSFormController Constructor Test", function() {
        var controller = new DSFormController();
        expect(controller).to.be.an("object");
        expect(Object.keys(controller).length).to.equal(0);

        controller.set({
            "path"       : "testPath",
            "format"     : "testFormat",
            "previewSize": 123,
            "pattern"    : "testPattern",
            "isRecur"    : true,
            "isRegex"    : false
        });

        expect(controller.getPath()).to.equal("testPath");
        expect(controller.getPattern()).to.equal("testPattern");
        expect(controller.getPreviewSize()).to.equal(123);
        expect(controller.getFormat()).to.equal("testFormat");
        expect(controller.useRegex()).to.be.false;
        expect(controller.useRecur()).to.be.true;

        // set format
        controller.setFormat("testFormat2");
        expect(controller.getFormat()).to.equal("testFormat2");

        // set header
        controller.setHeader(false);
        expect(controller.useHeader()).to.be.false;

        controller.setHeader();
        expect(controller.useHeader()).to.be.true;

        // set field delim
        controller.setFieldDelim(",");
        expect(controller.getFieldDelim()).to.be.equal(",");
        
        // set line delim
        controller.setLineDelim("\n");
        expect(controller.getLineDelim()).to.be.equal("\n");

        // set quote
        controller.setQuote("\'");
        expect(controller.getQuote()).to.be.equal("\'");

        controller.reset();
        expect(Object.keys(controller).length).to.equal(4);
        expect(controller.getFieldDelim()).to.equal("");
        expect(controller.getLineDelim()).to.equal("\n");
        expect(controller.useHeader()).to.be.false;
        expect(controller.getQuote()).to.equal("\"");
    });

    describe('DSObj Constructor Test', function() {
        // XXx TODO: add more to test basic attr
        it('Should get and set error', function() {
            var dsObj = new DSObj({"parentId": DSObjTerm.homeParentId});
            expect(dsObj.getError()).to.be.undefined;
            dsObj.setError("test");
            expect(dsObj.getError()).to.equal("test");

            dsObj = new DSObj({
                "parentId": DSObjTerm.homeParentId,
                "error"   : "test2"
            });
            expect(dsObj.getError()).to.equal("test2");
        });
    });

    describe('Cart Constructor Test', function() {
        it('CartItem should be a constructor', function() {
            var cartItem = new CartItem({
                "colNum": 1,
                "value" : "test"
            });

            expect(cartItem).to.be.an('object');
            expect(Object.keys(cartItem).length).to.equal(3);

            expect(cartItem).to.have.property('colNum');
            expect(cartItem).to.have.property('value');
            expect(cartItem).to.have.property('type');
        });

        it('Cart should be a constructor', function() {
            var cart = new Cart({
                "dsId"     : "test",
                "tableName": "testTable"
            });

            expect(cart).to.be.an('object');
            expect(Object.keys(cart).length).to.equal(3);
            expect(cart).to.have.property('dsId');
            expect(cart).to.have.property('tableName');
            expect(cart).to.have.property('items')
            .and.to.be.a('array');
        });

        it('Cart should have correct function to call', function() {
            var cart = new Cart({
                "dsId"     : "test",
                "tableName": "testTable"
            });

            expect(cart.getId()).to.equal('test');
            expect(cart.getTableName()).to.equal('testTable');
            cart.setTableName('table2');
            expect(cart.getTableName()).to.equal('table2');

            expect(cart.getPrefix()).to.be.null;
            cart.setPrefix('testPrefix');
            expect(cart.getPrefix()).to.equal('testPrefix');

            cart.addItem(new CartItem({'colNum': 1, 'value': 't1'}));
            cart.addItem(new CartItem({'colNum': 2, 'value': 't2'}));
            expect(cart.items.length).to.equal(2);

            cart.removeItem(1);
            expect(cart.items.length).to.equal(1);
            expect(cart.items[0].value).to.equal('t2');

            cart.emptyItem();
            expect(cart.items.length).to.equal(0);
        });
    });

    it('WSMETA is a constructor', function() {
        var meta = new WSMETA({
            "wsInfos"      : {},
            "wsOrder"      : [],
            "hiddenWS"     : [],
            "noSheetTables": [],
            "activeWS"     : "test"
        });

        expect(meta).to.be.an('object');
        expect(Object.keys(meta).length).to.equal(5);
        expect(meta).to.have.property('wsInfos');
        expect(meta).to.have.property('wsOrder');
        expect(meta).to.have.property('hiddenWS');
        expect(meta).to.have.property('noSheetTables');
        expect(meta).to.have.property('activeWS');
    });

    describe('WKBK Constructor Test', function() {
        it('WKBK should be a constructor', function() {
            try {
                new WKBK();
            } catch (error) {
                expect(error).not.to.be.null;
            }

            var wkbk = new WKBK({
                'name'         : 'test',
                'id'           : 'testId',
                'noMeta'       : false,
                'srcUser'      : 'testUser',
                'curUser'      : 'testUser',
                'created'      : 1234,
                'modified'     : 2234,
                'numWorksheets': 12
            });

            expect(wkbk).to.be.an('object');
            expect(Object.keys(wkbk).length).to.equal(8);
            expect(wkbk).to.have.property('name')
            .and.to.equal('test');
            expect(wkbk).to.have.property('id')
            .and.to.equal('testId');
            expect(wkbk).to.have.property('noMeta')
            .and.to.be.false;
            expect(wkbk).to.have.property('srcUser')
            .and.to.equal('testUser');
            expect(wkbk).to.have.property('curUser')
            .and.to.equal('testUser');
            expect(wkbk).to.have.property('created')
            .and.to.equal(1234);
            expect(wkbk).to.have.property('modified')
            .and.to.equal(2234);
            expect(wkbk).to.have.property('numWorksheets')
            .and.to.equal(12);
        });

        it('WKBK Basic function should work', function() {
            var wkbk = new WKBK({
                'name'         : 'test',
                'id'           : 'testId',
                'noMeta'       : false,
                'srcUser'      : 'testUser',
                'curUser'      : 'testUser',
                'created'      : 1234,
                'modified'     : 2234,
                'numWorksheets': 12
            });

            expect(wkbk.getId()).to.equal('testId');
            expect(wkbk.getName()).to.equal('test');
            expect(wkbk.getCreateTime()).to.equal(1234);
            expect(wkbk.getModifyTime()).to.equal(2234);
            expect(wkbk.getSrcUser()).to.equal('testUser');
            expect(wkbk.getNumWorksheets()).to.equal(12);
            expect(wkbk.isNoMeta()).to.be.false;

            wkbk.noMeta = true;
            expect(wkbk.isNoMeta()).to.be.true;

            wkbk.update();
            expect(wkbk.getModifyTime()).not.to.equal(2234);
        });

        it('WKBKSet should be constructor', function() {
            var wkbkSet = new WKBKSet();
            expect(wkbkSet).to.be.an('object');

            var wkbk = new WKBK({
                'name': 'test',
                'id'  : 'testId'
            });

            wkbkSet.put('testId', wkbk);
            expect(wkbkSet.getAll()).be.have.property('testId');
            expect(wkbkSet.get('testId')).to.equal(wkbk);
            expect(wkbkSet.has('testId')).to.be.true;
            expect(wkbkSet.has('errorId')).to.be.false;
            expect(wkbkSet.getWithStringify().indexOf('testId') >= 0).to.be.true;

            wkbkSet.delete('testId');
            expect(wkbkSet.has('testId')).to.be.false;
        });
    });

    describe.skip('DF Constructor Test', function() {
        var expandInfo;
        var opsInfo;
        var tableInfo;
        var dataFlow;
        var retinaNode;

        it('CanvasExpandInfo should be a constructor', function() {
            expandInfo = new CanvasExpandInfo({
                'tooltip': 'test',
                'left'   : 0,
                'top'    : 1
            });

            expect(expandInfo).to.be.an('object');
            expect(Object.keys(expandInfo).length).to.equal(3);
            expect(expandInfo).to.have.property('tooltip').and.to.equal('test');
            expect(expandInfo).to.have.property('left').and.to.equal(0);
            expect(expandInfo).to.have.property('top').and.to.equal(1);
        });

        it('CanvasOpsInfo should be a constructor', function() {
            opsInfo = new CanvasOpsInfo({
                'tooltip': 'test',
                'type'   : 'testType',
                'column' : 'testCol',
                'info'   : 'testInfo',
                'table'  : 'testTable',
                'parents': 'testParents',
                'left'   : 0,
                'top'    : 1,
                'classes': 'testClasses'
            });

            expect(opsInfo).to.be.an('object');
            expect(Object.keys(opsInfo).length).to.equal(10);
            expect(opsInfo).to.have.property('tooltip').and.to.equal('test');
            expect(opsInfo).to.have.property('type').and.to.equal('testType');
            expect(opsInfo).to.have.property('column').and.to.equal('testCol');
            expect(opsInfo).to.have.property('info').and.to.equal('testInfo');
            expect(opsInfo).to.have.property('table').and.to.equal('testTable');
            expect(opsInfo).to.have.property('parents').and.to.equal('testParents');
            expect(opsInfo).to.have.property('left').and.to.equal(0);
            expect(opsInfo).to.have.property('top').and.to.equal(1);
            expect(opsInfo).to.have.property('classes').and.to.equal('testClasses');
        });

        it('CanvasTableInfo should be a constructor', function() {
            tableInfo = new CanvasTableInfo({
                'index'   : 1,
                'children': 'testChild',
                'type'    : 'testType',
                'left'    : 1,
                'top'     : 2,
                'title'   : 'testTitle',
                'table'   : 'testTable',
                'url'     : 'testUrl'
            });

            expect(tableInfo).to.be.an('object');
            expect(Object.keys(tableInfo).length).to.equal(8);
            expect(tableInfo).to.have.property('index').and.to.equal(1);
            expect(tableInfo).to.have.property('children').and.to.equal('testChild');
            expect(tableInfo).to.have.property('type').and.to.equal('testType');
            expect(tableInfo).to.have.property('left').and.to.equal(1);
            expect(tableInfo).to.have.property('top').and.to.equal(2);
            expect(tableInfo).to.have.property('title').and.to.equal('testTitle');
            expect(tableInfo).to.have.property('table').and.to.equal('testTable');
            expect(tableInfo).to.have.property('url').and.to.equal('testUrl');
        });

        it('CanvasInfo should be a constructor', function() {
            var canvasInfo = new CanvasInfo({
                'height'     : 1,
                'width'      : 2,
                'tables'     : [tableInfo],
                'operations' : [opsInfo],
                'expandIcons': [expandInfo]
            });

            expect(canvasInfo).to.be.an('object');
            expect(Object.keys(canvasInfo).length).to.equal(5);
            expect(canvasInfo).to.have.property('height').and.to.equal(1);
            expect(canvasInfo).to.have.property('width').and.to.equal(2);
            expect(canvasInfo).to.have.property('tables');
            expect(canvasInfo).to.have.property('operations');
            expect(canvasInfo).to.have.property('expandIcons');
        });

        it('DFFlow should be a constructor', function() {
            dataFlow = new DFFlow({
                'name'   : 'testFlow',
                'columns': ['col1', 'col2']
            });

            expect(dataFlow).to.be.an('object');
            expect(Object.keys(dataFlow).length).to.equal(3);
            expect(dataFlow).to.have.property('name').and.to.equal('testFlow');
            expect(dataFlow).to.have.property('columns')
            .and.to.an.instanceof(Array);
            expect(dataFlow).to.have.property('canvasInfo')
            .and.to.an.instanceof(CanvasInfo);
        });

        it('RetinaNode should be a constructor', function() {
            retinaNode = new RetinaNode({
                'paramType' : 'testType',
                'paramValue': 'testVal',
                'paramQuery': ['testQuery']
            });

            expect(retinaNode).to.be.an('object');
            expect(Object.keys(retinaNode).length).to.equal(3);
            expect(retinaNode).to.have.property('paramType').and.to.equal('testType');
            expect(retinaNode).to.have.property('paramValue').and.to.equal('testVal');
            expect(retinaNode).to.have.property('paramQuery');
            expect(retinaNode.paramQuery[0]).to.equal('testQuery');
        });

        it('Dataflow should be a constructor', function() {
            var dfg = new Dataflow('testDF');
            expect(dfg).to.be.an('object');
            expect(dfg).to.have.property('name').and.to.equal('testDF');
        });

        it('DF should add dataflow', function() {
            var dfg = new Dataflow('testDF');
            expect(dfg).to.have.property('dataFlows')
            .and.to.an('Array');

            expect(dfg.dataFlows.length).to.equal(0);

            dfg.addDataFlow(dataFlow);
            expect(dfg.dataFlows.length).to.equal(1);
            expect(dfg.dataFlows[0].name).to.equal('testFlow');
        });

        it('DF should add RetinaNode', function() {
            var dfg = new Dataflow('testDF');
            expect(dfg).to.have.property('retinaNodes')
            .and.to.an('Object');

            expect(dfg.getParameterizedNode(123)).not.to.be.exist;

            dfg.addParameterizedNode(123, retinaNode);
            expect(dfg.getParameterizedNode(123)).to.be.exist;
        });

        it('DF should add Parameter', function() {
            var dfg = new Dataflow('testDF');
            expect(dfg).to.have.property('parameters')
            .and.to.an('Array');

            expect(dfg).to.have.property('paramMap')
            .and.to.an('Object');

            expect(dfg.parameters.length).to.equal(0);
            expect(dfg.getParameter('a')).not.to.be.exist;
            expect(dfg.addParameter('a'));
            expect(dfg.getParameter('a')).to.be.null;
            var params = dfg.getAllParameters();
            expect(params.length).to.equal(1);
            expect(params[0]).to.be.an('object');
            expect(params[0]).to.have.property('parameterName')
            .and.to.equal('a');
            expect(params[0]).to.have.property('parameterValue')
            .and.to.be.null;

            dfg.updateParameters([{
                'name': 'a',
                'val' : 'c'
            }]);
            expect(dfg.getParameter('a')).to.equal('c');

            expect(dfg.checkParamInUse('a')).to.be.false;
            dfg.addParameterizedNode(123, {
                'paramType' : 'test',
                'paramValue': 'test',
                'paramQuery': ['load <a>']
            });
            expect(dfg.checkParamInUse('a')).to.be.true;

            dfg.removeParameter('a');
            expect(dfg.getParameter('a')).not.to.be.exist;
        });
    });

    describe('Profile Constructor Test', function() {
        var bucketInfo;
        var groupbyInfo;

        it('ProfileAggInfo should be a constructor', function() {
            var aggInfo = new ProfileAggInfo({
                'max'    : 1,
                'min'    : 1,
                'count'  : 1,
                'sum'    : 1,
                'average': 1,
                'sd'     : 0
            });

            expect(aggInfo).to.be.an('object');
            expect(Object.keys(aggInfo).length).to.equal(6);
            expect(aggInfo).to.have.property('max').and.to.equal(1);
            expect(aggInfo).to.have.property('min').and.to.equal(1);
            expect(aggInfo).to.have.property('count').and.to.equal(1);
            expect(aggInfo).to.have.property('sum').and.to.equal(1);
            expect(aggInfo).to.have.property('average').and.to.equal(1);
            expect(aggInfo).to.have.property('sd').and.to.equal(0);
        });

        it('ProfileStatsInfo should be a constructor', function() {
            // case 1
            var statsInfo = new ProfileStatsInfo({'unsorted': true});
            expect(statsInfo).to.be.an('object');
            expect(Object.keys(statsInfo).length).to.equal(1);
            expect(statsInfo).to.have.property('unsorted').and.to.be.true;
            // case 2
            statsInfo = new ProfileStatsInfo({
                'zeroQuartile' : 2,
                'lowerQuartile': 2,
                'median'       : 3,
                'upperQuartile': 2,
                'fullQuartile' : 4
            });

            expect(Object.keys(statsInfo).length).to.equal(5);
            expect(statsInfo).to.have.property('zeroQuartile').and.to.equal(2);
            expect(statsInfo).to.have.property('lowerQuartile').and.to.equal(2);
            expect(statsInfo).to.have.property('median').and.to.equal(3);
            expect(statsInfo).to.have.property('upperQuartile').and.to.equal(2);
            expect(statsInfo).to.have.property('fullQuartile').and.to.equal(4);
        });

        it('ProfileBucketInfo should be a constructor', function() {
            bucketInfo = new ProfileBucketInfo({
                "bucketSize": 0,
                "table"     : "testTable",
                "colName"   : "testCol",
                "max"       : 1,
                "sum"       : 1
            });

            expect(bucketInfo).to.be.an('object');
            expect(Object.keys(bucketInfo).length).to.equal(7);
            expect(bucketInfo).to.have.property('bucketSize').and.to.equal(0);
            expect(bucketInfo).to.have.property('table').and.to.equal('testTable');
            expect(bucketInfo).to.have.property('ascTable').and.to.be.null;
            expect(bucketInfo).to.have.property('descTable').and.to.be.null;
            expect(bucketInfo).to.have.property('colName').and.to.equal('testCol');
            expect(bucketInfo).to.have.property('max').and.to.equal(1);
            expect(bucketInfo).to.have.property('sum').and.to.equal(1);
        });

        it('ProfileGroupbyInfo should be a constructor', function() {
            groupbyInfo = new ProfileGroupbyInfo({
                "buckets": {
                    0: bucketInfo
                }
            });

            expect(groupbyInfo).to.be.an('object');
            expect(Object.keys(groupbyInfo).length).to.equal(3);
            expect(groupbyInfo).to.have.property('isComplete').and.to.be.false;
            expect(groupbyInfo).to.have.property('nullCount').and.to.equal(0);
            expect(groupbyInfo).to.have.property('buckets');
            expect(groupbyInfo.buckets[0].table).to.equal('testTable');
        });

        it('ProfileInfo should be a constructor', function() {
            var profileInfo = new ProfileInfo({
                'modalId': 'testModal',
                'colName': 'testCol',
                'type'   : 'integer'
            });

            expect(profileInfo).to.be.an('object');
            expect(Object.keys(profileInfo).length).to.equal(6);
            expect(profileInfo).to.have.property('modalId').and.to.equal('testModal');
            expect(profileInfo).to.have.property('colName').and.to.equal('testCol');
            expect(profileInfo).to.have.property('type').and.to.equal('integer');
            expect(profileInfo).to.have.property('aggInfo')
            .and.to.be.an.instanceof(ProfileAggInfo);
            expect(profileInfo).to.have.property('statsInfo')
            .and.to.be.an.instanceof(ProfileStatsInfo);
            expect(profileInfo).to.have.property('groupByInfo')
            .and.to.be.an.instanceof(ProfileGroupbyInfo);

            profileInfo.addBucket(0, {
                "bucketSize": 0,
                "table"     : "testTable"
            });
            expect(profileInfo.groupByInfo.buckets).to.have.property(0);
        });
    });

    it('Corrector should work', function() {
        var corrector = new Corrector(['test', 'yelp', 'hello']);
        expect(corrector.correct('ylp')).to.equal('yelp');
        expect(corrector.suggest('ylp')).to.equal('yelp');
        expect(corrector.suggest('t')).to.equal('test');
    });

    describe('ExportHelper Constructor Test', function() {
        var $view;
        var exportHelper;

        before(function() {
            var fakeHtml =
            '<div id="unitst-view">' +
                '<div class="columnsToExport">' +
                    '<ul class="cols">' +
                        '<li class="checked">' +
                            '<span class="text">user::user_id</span>' +
                        '</li>' +
                        '<li class="checked">' +
                            '<span class="text">reviews::user_id</span>' +
                       '</li>' +
                       '<li class="checked">' +
                            '<span class="text">reviews::test</span>' +
                       '</li>' +
                    '</ul>' +
                '</div>' +
                '<div class="renameSection xc-hidden">' +
                    '<div class="renamePart"></div>' +
                '</div>' +
            '</div>';

            $view = $(fakeHtml).appendTo("body");
        });

        it("Should create exportHelper", function() {
            exportHelper = new ExportHelper($view);
            exportHelper.setup();

            expect(exportHelper).to.be.an("object");
            expect(Object.keys(exportHelper).length).to.equal(1);
            expect(exportHelper.$view).to.equal($view);
        });

        it("Should get export columns", function() {
            var exportColumns = exportHelper.getExportColumns();
            expect(exportColumns).to.be.an("array");
            expect(exportColumns.length).to.equal(3);
            expect(exportColumns[0]).to.equal("user::user_id");
            expect(exportColumns[1]).to.equal("reviews::user_id");
            expect(exportColumns[2]).to.equal("reviews::test");
        });

        it("Should not pass name check with invalid arg", function() {
            // error case
            var exportColumns = exportHelper.checkColumnNames();
            expect(exportColumns).to.be.null;
        });

        it("Should pass name check with valid names", function() {
            var exportColumns = exportHelper.checkColumnNames(["a", "b", "c"]);
            expect(exportColumns).to.be.an("array");
            expect(exportColumns.length).to.equal(3);
            expect(exportColumns[0]).to.equal("a");
            expect(exportColumns[1]).to.equal("b");
            expect(exportColumns[2]).to.equal("c");
        });

        it("Should check the conflict of column names", function() {
            var exportColumns = exportHelper.getExportColumns();
            exportColumns = exportHelper.checkColumnNames(exportColumns);
            expect(exportColumns).to.be.null;

            var $renameSection = $view.find(".renameSection");
            var $renames = $renameSection.find(".rename");
            expect($renameSection.hasClass("xc-hidden")).to.be.false;
            expect($renames.length).to.equal(2);
            expect($renames.eq(0).find(".origName").val())
            .to.equal("user::user_id");
            expect($renames.eq(1).find(".origName").val())
            .to.equal("reviews::user_id");
        });

        it("Should check empty rename", function() {
            var exportColumns = exportHelper.getExportColumns();
            exportColumns = exportHelper.checkColumnNames(exportColumns);
            expect(exportColumns).to.be.null;

            assert.isTrue($("#statusBox").is(":visible"));
            assert.equal($("#statusBox .message").text(), ErrTStr.NoEmpty);
            StatusBox.forceHide();
            assert.isFalse($("#statusBox").is(":visible"));
        });

        it("Should check name conflict", function() {
            var $renames = $view.find(".rename");
            $renames.eq(0).find(".newName").val("user_id");
            $renames.eq(1).find(".newName").val("user_id");

            var exportColumns = exportHelper.getExportColumns();
            exportColumns = exportHelper.checkColumnNames(exportColumns);
            expect(exportColumns).to.be.null;

            assert.isTrue($("#statusBox").is(":visible"));
            assert.equal($("#statusBox .message").text(), ErrTStr.NameInUse);
            StatusBox.forceHide();
            assert.isFalse($("#statusBox").is(":visible"));
        });

        it("Should smartly rename", function() {
            var $renames = $view.find(".rename");
            $renames.eq(0).find(".renameIcon").click();
            $renames.eq(1).find(".renameIcon").click();

            expect($renames.eq(0).find(".newName").val())
            .to.equal("user-user_id");
            expect($renames.eq(1).find(".newName").val())
            .to.equal("reviews-user_id");
        });

        it("Should pass name check after rename", function() {
            var exportColumns = exportHelper.getExportColumns();
            exportColumns = exportHelper.checkColumnNames(exportColumns);

            expect(exportColumns).to.be.an("array");
            expect(exportColumns.length).to.equal(3);
            expect(exportColumns[0]).to.equal("user-user_id");
            expect(exportColumns[1]).to.equal("reviews-user_id");
            expect(exportColumns[2]).to.equal("test");
        });

        it("Should clear the helper", function() {
            exportHelper.clear();
            var $renameSection = $view.find(".renameSection");
            expect($renameSection.hasClass("xc-hidden")).to.be.true;
            expect($renameSection.find(".rename").length).to.equal(0);
        });

        after(function() {
            $view.remove();
        });
    });

    // XX incomplete since the change where monitor query bars are working
    describe('XcQuery Constructor Test', function() {
        it('XcQuery should be a constructor', function() {
            var xcQuery = new XcQuery({
                'name'    : 'test',
                'fullName': 'full test',
                'time'    : 123,
                'type'    : 'xcFunction',
                'id'      : 1,
                'numSteps': 2
            });

            expect(xcQuery).to.be.an('object');
            expect(Object.keys(xcQuery).length).to.equal(15);
            expect(xcQuery).to.have.property('name').and.to.equal('test');
            expect(xcQuery).to.have.property('time').and.to.equal(123);
            expect(xcQuery).to.have.property('fullName').and.to.equal('full test');
            expect(xcQuery).to.have.property('state').and.to.equal(QueryStateT.qrNotStarted);
        });

        it('XcQuery OOP function should work', function() {
            var xcQuery = new XcQuery({
                'name'    : 'test2',
                'fullName': 'full test2',
                'time'    : 456,
                'state'   : QueryStateT.qrProcessing
            });

            expect(xcQuery.getName()).to.equal('test2');
            expect(xcQuery.getFullName()).to.equal('full test2');
            expect(xcQuery.getTime()).to.equal(456);
            expect(xcQuery.getState()).to.equal(QueryStateT.qrProcessing);
            expect(xcQuery.getStateString()).to.equal('qrProcessing');
        });
    });

    describe('Extension Constructor Test', function() {
        var extItem;

        it('ExtItem should be a constructor', function() {
            extItem = new ExtItem({
                'name'       : 'testItem',
                'version'    : '2.0',
                'description': 'test',
                'author'     : 'test user',
                'category'   : 'test',
                'imageUrl'   : 'test.jpg',
                'website'    : 'test.com',
                'installed'  : true,
                'repository' : {
                    'url': 'test.ext.com'
                }
            });

            expect(extItem).to.be.an('object');
            expect(Object.keys(extItem).length).to.equal(11);

            expect(extItem.getName()).to.equal('testItem');
            expect(extItem.getCategory()).to.equal('test');
            expect(extItem.getAuthor()).to.equal('test user');
            expect(extItem.getDescription()).to.equal('test');
            expect(extItem.getVersion()).to.equal('2.0');
            expect(extItem.getWebsite()).to.equal('test.com');
            expect(extItem.getImage()).to.equal('test.jpg');
            expect(extItem.getUrl()).to.equal('test.ext.com');
            expect(extItem.isInstalled()).to.be.true;

            extItem.setImage('image.jpg');
            expect(extItem.getImage()).to.equal('image.jpg');
        });

        it('ExtCategory should be a constructor', function() {
            var extCategory = new ExtCategory('test category');

            expect(extCategory).to.be.an('object');
            expect(Object.keys(extCategory).length).to.equal(2);

            expect(extCategory.getName()).to.equal('test category');
            var res = extCategory.addExtension(extItem);
            expect(res).to.be.true;
            // cannot add the same extension twice
            res = extCategory.addExtension(extItem);
            expect(res).to.be.false;

            expect(extCategory.getExtension('testItem').getName()).to.equal('testItem');
            expect(extCategory.hasExtension('testItem')).to.equal(true);

            var list = extCategory.getExtensionList();
            expect(list.length).to.equal(1);
            expect(list[0].getName()).to.equal('testItem');
            list = extCategory.getExtensionList('noResultKey');
            expect(list.length).to.equal(0);

            list = extCategory.getInstalledExtensionList();
            expect(list.length).to.equal(1);
            expect(list[0].getName()).to.equal('testItem');
        });

        it('ExtCategorySet should be constructor', function() {
            var extSet = new ExtCategorySet();

            expect(extSet).to.be.an('object');
            expect(Object.keys(extSet).length).to.equal(1);

            expect(extSet.has('test')).to.be.false;
            extSet.addExtension(extItem);
            expect(extSet.get('test').getName()).to.equal('test');

            var item2 = new ExtItem({
                'name'      : 'marketTestItem',
                'installed' : false,
                'category'  : 'marketTest',
                'repository': {
                    'type': 'market'
                }
            });

            expect(extSet.has('marketTest')).to.be.false;
            extSet.addExtension(item2);
            expect(extSet.has('marketTest')).to.be.true;
            expect(extSet.get('marketTest').getName()).to.equal('marketTest');
            var ext = extSet.getExtension('wrong category', 'test');
            expect(ext).to.be.null;
            ext = extSet.getExtension('marketTest', 'marketTestItem');
            expect(ext).not.to.be.null;
            expect(ext.getName()).to.equal('marketTestItem');

            var list = extSet.getList(true);
            expect(list.length).to.equal(2);
            expect(list[0].getName()).to.equal('marketTest');
            expect(list[1].getName()).to.equal('test');
        });
    });
});
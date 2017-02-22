describe("Persistent Constructor Test", function() {
    describe("METAConstructor Constructor Test", function() {
        var metaInfos;

        it("Should have 9 attributs", function() {
            var table = new TableMeta({
                "tableId": "test",
                "tableName": "testTable"
            });

            var cart = new Cart({
                "dsId": "testId"
            });

            var agg = new Agg({
                "aggName": "testAgg"
            });

            var profile = new ProfileInfo({
                "id": "testId"
            });

            var query = new XcQuery({
                "name": "testQuery"
            });

            metaInfos = new METAConstructor({
                "TILookup": {"test": table},
                "worksheets": {"wsOrder": [1]},
                "aggregates": {"testAgg": agg},
                "datacarts": {"testId": cart},
                "statsCols": {"testTable": {"testCol": profile}},
                "sqlcursor": -2,
                "tablePrefix": {"testPrefix": "test"},
                "query": [query]
            });

            expect(metaInfos).to.be.an.instanceof(METAConstructor);
            expect(Object.keys(metaInfos).length).to.equal(9);
            expect(metaInfos.version).to.equal(currentVersion);
        });

        it("Should get table meta", function() {
            var tableMeta = metaInfos.getTableMeta();
            expect(tableMeta["test"]).to.exist;
        });

        it("Should get worksheet meta", function() {
            var wsMeta = metaInfos.getWSMeta();
            expect(wsMeta.wsOrder).to.exist;
            expect(wsMeta.wsOrder[0]).to.equal(1);
        });

        it("Should get agg meta", function() {
            var aggs = metaInfos.getAggMeta();
            expect(aggs).to.have.property("testAgg");
        });

        it("Should get cart meta", function() {
            var cartMeta = metaInfos.getCartMeta();
            expect(cartMeta["testId"]).to.exist;
        });

        it("Should get stats meta", function() {
            var profileMeta = metaInfos.getStatsMeta();
            expect(profileMeta["testTable"]["testCol"]).to.exist;
        });

        it("Should get log cursor meta", function() {
            expect(metaInfos.getLogCMeta()).to.equal(-2);
        });

        it("Should get table prefix meta", function() {
            expect(metaInfos.getTpfxMeta()).to.have.property("testPrefix");
        });

        it("Should get query meta", function() {
            var queryList = metaInfos.getQueryMeta();
            expect(queryList.length).to.equal(1);
            expect(queryList[0].name).to.equal("testQuery");
        });

        it("Should update", function() {
            metaInfos.update();
            expect(metaInfos.getTableMeta()).not.to.have.property("test");
            expect(metaInfos.getWSMeta().wsOrder[0]).not.to.equal(1);
            expect(metaInfos.getAggMeta()).not.to.have.property("testAgg");
            expect(metaInfos.getCartMeta()).not.to.have.property("testId");
            expect(metaInfos.getStatsMeta()).not.to.have.property("testTable");
            expect(metaInfos.getLogCMeta()).not.to.equal(-2);
            expect(metaInfos.getTpfxMeta()).not.to.have.property("testPrefix");
            
            var queryList = metaInfos.getQueryMeta();
            if (queryList.length > 0) {
                expect(queryList[0].name).not.to.equal("testQuery");
            }
            
        });
    });

    describe("EMetaConstructor Constructor Test", function() {
        var ephMeta;

        it("Should have 2 attributes", function() {
            var DF = new Dataflow({
                "name": "testDF"
            });

            ephMeta = new EMetaConstructor({
                "DF": {"testDF": DF}
            });

            expect(ephMeta).to.be.an.instanceof(EMetaConstructor);
            expect(Object.keys(ephMeta).length).to.equal(2);
            expect(ephMeta.version).to.equal(currentVersion);
            expect(ephMeta.DF).to.exist;
        });

        it("Should get DF meta", function() {
            var df = ephMeta.getDFMeta();
            expect(df).to.have.property("testDF");
        });

        it("Should update", function() {
            ephMeta.update();
            var df = ephMeta.getDFMeta();
            expect(df).not.to.have.property("testDF");
        });
    });

    describe("UserInfoConstructor Constructor Test", function() {
        var userInfos;

        before(function() {
            userInfos = new UserInfoConstructor();
        });

        it("Should have 3 attributes", function() {
            var userPref = new UserPref({
                "activeMainTab": "testTab"
            });

            userInfos = new UserInfoConstructor({
                "gDSObj": "testDS",
                "userpreference": userPref
            });

            expect(userInfos).to.be.an.instanceof(UserInfoConstructor);
            expect(Object.keys(userInfos).length).to.equal(3);
            expect(userInfos.version).to.equal(currentVersion);
            expect(userInfos.gDSObj).to.exist;
            expect(userInfos.userpreference).to.exist;
        });


        it("Should get pref info", function() {
            expect(userInfos.getPrefInfo().activeMainTab).to.equal("testTab");
        });

        it("Should get ds info", function() {
            expect(userInfos.getDSInfo()).to.equal("testDS");
        });

        it("Should update info", function() {
            userInfos.update();

            expect(userInfos.getPrefInfo().activeMainTab)
            .not.to.equal("testTab");
            expect(userInfos.getDSInfo()).not.to.equal("testDS");
        });
    });

    describe("XcAuth Constructor Test", function() {
        var autoInfo;

        before(function() {
            autoInfo = new XcAuth({
                "idCount": 1,
                "hashTag": "test"
            });
        });

        it("XcAuth should have 3 properties", function() {
            expect(autoInfo).to.be.an.instanceof(XcAuth);
            expect(Object.keys(autoInfo).length).to.equal(3);

            expect(autoInfo).to.have.property("version")
            .and.to.equal(currentVersion);

            expect(autoInfo).to.have.property("idCount")
            .and.to.equal(1);

            expect(autoInfo).to.have.property("hashTag")
            .and.to.equal("test");
        });

        it("Should getHashTag", function() {
            expect(autoInfo.getHashTag()).to.equal("test");
        });

        it("Should getIdCount", function() {
            expect(autoInfo.getIdCount()).to.equal(1);
        });

        it("Should increase id count", function() {
            expect(autoInfo.incIdCount()).to.equal(2);
        });
    });

    describe("XcLog Constructor Test", function() {
        it("Should have 5 attributes", function() {
            var log = new XcLog({
                "title": "test1",
                "cli": "cliTest",
                "options": {
                    "operation": "foo"
                }
            });

            expect(log).to.be.an.instanceof(XcLog);
            expect(Object.keys(log).length).to.equal(5);

            expect(log).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(log).to.have.property("cli").and.to.equal("cliTest");
            expect(log).to.have.property("timestamp")
            .and.to.be.a("number");
        });

        it("Should know if is error log", function() {
            var log1 = new XcLog({
                "title": "test1",
                "cli": "cliTest",
                "options": {
                    "operation": "foo"
                }
            });

            var log2 = new XcLog({
                "title": "test2",
                "cli": "cliTest2",
                "error": "testError",
                "options": {
                    "operation": "bar"
                }
            });

            expect(log1.isError()).to.be.false;
            expect(log2.isError()).to.be.true;
        });

        it("Should get operation", function() {
            var log = new XcLog({
                "title": "test1",
                "cli": "cliTest",
                "options": {
                    "operation": "foo"
                }
            });
            expect(log.getOperation()).to.equal("foo");
        });

        it("Shoult get title", function() {
            var log = new XcLog({
                "title": "test1",
                "cli": "cliTest",
                "options": {
                    "operation": "foo"
                }
            });
            expect(log.getTitle()).to.equal("test1");
        });

        it("Should get options", function() {
            var log = new XcLog({
                "title": "test1",
                "cli": "cliTest",
                "options": {
                    "operation": "foo"
                }
            });
            expect(log.getOptions()).to.be.an("object");
        });
    });

    describe("ColFunc Constructor Test", function() {
        it("Should have 3 attributes", function() {
            var colFunc = new ColFunc({
                "name": "test",
                "args": "pull(test)"
            });

            expect(colFunc).to.be.an.instanceof(ColFunc);
            expect(Object.keys(colFunc).length).to.equal(3);
            expect(colFunc).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(colFunc).to.have.property("name")
            .and.to.equal("test");
            expect(colFunc).to.have.property("args")
            .and.to.equal("pull(test)");
        });
    });

    describe("ProgCol constructor test", function() {
        it("Should have 17 attributes", function() {
            var progCol = new ProgCol({
                "name": "test",
                "backName": "prefix::backTest",
                "type": ColumnType.float,
                "isNewCol": false,
                "width": 100,
                "decimal": 10,
                "func": {
                    "name": "pull"
                }
            });

            expect(progCol).to.be.an.instanceof(ProgCol);
            expect(Object.keys(progCol).length).to.equal(17);
            expect(progCol).to.have.property("version")
            .and.to.equal(1);
            expect(progCol).to.have.property("name")
            .and.to.equal("test");
            expect(progCol).to.have.property("backName")
            .and.to.equal("prefix::backTest");
            expect(progCol).to.have.property("prefix")
            .and.to.equal("prefix");
            expect(progCol).to.have.property("immediate")
            .and.to.be.false;
            expect(progCol).to.have.property("type")
            .and.to.equal(ColumnType.float);
            expect(progCol).to.have.property("knownType")
            .and.to.be.false;
            expect(progCol).to.have.property("childOfArray")
            .and.to.be.false;
            expect(progCol).to.have.property("isNewCol")
            .and.to.be.false;
            expect(progCol).to.have.property("isMinimized")
            .and.to.be.false;
            expect(progCol).to.have.property("width")
            .and.to.equal(100);
            expect(progCol).to.have.property("format")
            .and.to.be.null;
            expect(progCol).to.have.property("decimal")
            .and.to.equal(10);
            expect(progCol).to.have.property("sizedToHeader")
            .and.to.be.true;
            expect(progCol).to.have.property("textAlign")
            .and.to.equal(ColTextAlign.Left);
            expect(progCol).to.have.property("userStr")
            .and.to.equal("");
            expect(progCol).to.have.property("func")
            .and.to.be.instanceof(ColFunc);
        });

        it("Should know if is data col", function() {
            var progCol = new ProgCol({
                "name": "DATA",
                "type": ColumnType.object,
                "func": {
                    "name": "raw"
                }
            });
            expect(progCol.isDATACol()).to.be.true;

            // case 2
            var progCol2 = new ProgCol({
                "name": "test",
                "type": ColumnType.object,
                "func": {
                    "name": "pull"
                }
            });
            expect(progCol2.isDATACol()).to.be.false;
        });

        it("Should know if is number col", function() {
            var progCol1 = new ProgCol({
                "name": "test",
                "backName": "prefix::backTest",
                "type": ColumnType.float
            });

            var progCol2 = new ProgCol({
                "name": "test",
                "backName": "prefix::backTest",
                "type": ColumnType.integer
            });

            var progCol3 = new ProgCol({
                "name": "test",
                "backName": "prefix::backTest",
                "type": ColumnType.string
            });

            expect(progCol1.isNumberCol()).to.be.true;
            expect(progCol2.isNumberCol()).to.be.true;
            expect(progCol3.isNumberCol()).to.be.false;
        });

        it("Should know if is empty col", function() {
            var progCol1 = new ProgCol({
                "name": "test",
                "backName": "prefix::backTest",
                "type": ColumnType.float,
                "isNewCol": false
            });

            var progCol2 = new ProgCol({
                "name": "",
                "backName": "prefix::backTest",
                "type": ColumnType.float,
                "isNewCol": true
            });

            expect(progCol1.isEmptyCol()).to.be.false;
            expect(progCol2.isEmptyCol()).to.be.true;
        });

        it("Should set and get front col name", function() {
            var progCol = new ProgCol({
                "name": "test",
                "backName": "prefix::backTest",
                "type": "float",
                "isNewCol": false,
                "width": 100,
                "decimal": 10,
                "func": {
                    "name": "pull"
                }
            });

            expect(progCol.getFrontColName()).to.equal("test");
            expect(progCol.getFrontColName(true)).to.equal("prefix::test");

            progCol.setFrontColName("test2");
            expect(progCol.getFrontColName()).to.equal("test2");
        });

        it("Should get and update type", function() {
            var progCol = new ProgCol({
                "name": "test",
                "backName": "prefix::backTest",
                "type": ColumnType.integer,
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            expect(progCol.getType()).to.equal(ColumnType.integer);
            progCol.updateType(1.2);
            expect(progCol.getType()).to.equal(ColumnType.float);

            // case 2
            progCol = new ProgCol({
                "name": "",
                "backName": "",
                "isNewCol": true
            });

            expect(progCol.getType()).to.equal(ColumnType.undefined);
            progCol.updateType(1.2);
            // cannot change empty col
            expect(progCol.getType()).to.equal(ColumnType.undefined);

            // case 3
            progCol = new ProgCol({
                "name": "test",
                "backName": "prefix::backTest",
                "type": ColumnType.integer,
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            progCol.immediate = true;
            progCol.knownType = true;
            expect(progCol.getType()).to.equal(ColumnType.integer);
            progCol.updateType(1.2);
            // cannot change known type
            expect(progCol.getType()).to.equal(ColumnType.integer);

        });

        it("Should get and set width", function() {
            var progCol = new ProgCol({
                "name": "test",
                "backName": "prefix::backTest",
                "type": ColumnType.float,
                "isNewCol": false,
                "width": 100,
                "func": {
                    "name": "pull"
                }
            });

            expect(progCol.getWidth()).to.equal(100);
            progCol.setWidth(150);
            expect(progCol.getWidth()).to.equal(150);
        });

        it("Should get display width", function() {
            // case 1
            var progCol = new ProgCol({
                "name": "test",
                "backName": "prefix::backTest",
                "type": ColumnType.float,
                "isNewCol": false,
                "width": 100,
                "decimal": 10,
                "func": {
                    "name": "pull"
                }
            });

            expect(progCol.getDisplayWidth()).to.equal(100);

            // case 2
            progCol.isMinimized = true;
            expect(progCol.getDisplayWidth()).to.equal(15);
        });

        it("Should minimize and maximize column", function() {
            var progCol = new ProgCol({
                "name": "test",
                "backName": "prefix::backTest",
                "type": ColumnType.float,
                "isNewCol": false,
                "width": 100,
                "decimal": 10,
                "func": {
                    "name": "pull"
                }
            });
            expect(progCol.hasMinimized()).to.be.false;

            progCol.minimize();
            expect(progCol.hasMinimized()).to.be.true;
            progCol.maximize();
            expect(progCol.hasMinimized()).to.be.false;
        });

        it("Should get and set text align", function() {
            var progCol = new ProgCol({
                "name": "test",
                "backName": "prefix::backTest",
                "type": ColumnType.float,
                "isNewCol": false,
                "width": 100,
                "decimal": 10,
                "func": {
                    "name": "pull"
                }
            });

            expect(progCol.getTextAlign()).to.equal(ColTextAlign.Left);
            // error case
            progCol.setTextAlign(null);
            expect(progCol.getTextAlign()).to.equal(ColTextAlign.Left);
            // valid case
            progCol.setTextAlign(ColTextAlign.Center);
            expect(progCol.getTextAlign()).to.equal(ColTextAlign.Center);
        });

        it("Should getPrefix", function() {
            var progCol = new ProgCol({
                "name": "test",
                "backName": "prefix::backTest",
                "type": ColumnType.float,
                "isNewCol": false,
                "width": 100,
                "decimal": 10,
                "func": {
                    "name": "pull"
                }
            });

            expect(progCol.getPrefix()).to.equal("prefix");
        });

        it("Should get and set back col name", function() {
            var progCol = new ProgCol({
                "name": "test",
                "backName": "prefix::backTest",
                "type": ColumnType.float,
                "isNewCol": false,
                "width": 100,
                "decimal": 10,
                "func": {
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
                "name": "test",
                "backName": "backTest",
                "type": ColumnType.float,
                "isNewCol": false,
                "width": 100,
                "decimal": 10,
                "func": {
                    "name": "pull"
                }
            });

            expect(progCol.isImmediate()).to.be.false;
            // error case
            progCol.setImmediateType();

            var testCases = [{
                "typeId": DfFieldTypeT.DfString,
                "boolean": true,
                "type": "string",
            },{
                "typeId": DfFieldTypeT.DfUnknown,
                "boolean": true,
                "type": "unknown"
            },{
                "typeId": DfFieldTypeT.DfInt32,
                "boolean": true,
                "type": "integer"
            },{
                "typeId": DfFieldTypeT.DfFloat64,
                "boolean": true,
                "type": "float"
            },{
                "typeId": DfFieldTypeT.DfBoolean,
                "boolean": true,
                "type": "boolean"
            },{
                "typeId": DfFieldTypeT.DfMixed,
                "boolean": true,
                "type": "mixed"
            },{
                "typeId": DfFieldTypeT.DfFatptr,
                "boolean": false,
                "type": ""
            },{
                "typeId": DfFieldTypeT.DfScalarPtr,
                "boolean": true,
                "type": ""
            }];

            testCases.forEach(function(testCase) {
                progCol.immediate = false;
                progCol.type = "";
                progCol.setImmediateType(testCase.typeId);
                expect(progCol.isImmediate()).to.equal(testCase.boolean);
                expect(progCol.getType()).to.equal(testCase.type);

                var isKnownType = (testCase.boolean && testCase.type) ? true :
                                                                        false;
                expect(progCol.isKnownType()).to.equal(isKnownType);
            });
        });

        it("Should get and set format", function() {
            var progCol = new ProgCol({
                "name": "test",
                "backName": "backTest",
                "type": ColumnType.float,
                "isNewCol": false,
                "width": 100,
                "decimal": 10,
                "func": {
                    "name": "pull"
                }
            });

            expect(progCol.format).to.be.null;
            expect(progCol.getFormat()).to.equal(ColFormat.Default);
            progCol.setFormat(ColFormat.Percent);
            expect(progCol.format).to.equal(ColFormat.Percent);
            expect(progCol.getFormat()).to.equal(ColFormat.Percent);

            progCol.setFormat(ColFormat.Default);
            expect(progCol.format).to.be.null;
            expect(progCol.getFormat()).to.equal(ColFormat.Default);
        });

        it("Should get and set decimal", function() {
            var progCol = new ProgCol({
                "name": "test",
                "backName": "backTest",
                "type": ColumnType.float,
                "isNewCol": false,
                "width": 100,
                "func": {
                    "name": "pull"
                }
            });

            expect(progCol.getDecimal()).to.equal(-1);
            progCol.setDecimal(2);
            expect(progCol.getDecimal()).to.equal(2);
        });

        it("Should set to be child of array", function() {
            var progCol = new ProgCol({
                "name": "test",
                "backName": "backTest",
                "type": ColumnType.float,
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            expect(progCol.isChildOfArray()).to.be.false;
            progCol.beChildOfArray();
            expect(progCol.isChildOfArray()).to.be.true;
        });

        it("Should stringify func", function() {
            var progCol = new ProgCol({
                "name": "test",
                "backName": "backTest",
                "type": ColumnType.float,
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var res = progCol.stringifyFunc();
            expect(res).to.equal("pull");

            // case 2
            progCol2 = new ProgCol({
                "name": "test",
                "backName": "backTest",
                "type": ColumnType.float,
                "isNewCol": false,
                "func": {
                    "name": "map",
                    "args": [{
                        "args": ["a::b"],
                        "name": "absInt"
                    }]
                }
            });

            res = progCol2.stringifyFunc();
            expect(res).to.equal("map(absInt(a::b))");
        });

        it("Should parse func", function() {
            var progCol = new ProgCol({
                "name": "test",
                "backName": "backTest",
                "type": ColumnType.float,
                "isNewCol": false
            });

            // case 1
            progCol.userStr = "";
            progCol.parseFunc();
            expect(progCol.func.name).not.to.exist;
            // case 2
            progCol.userStr = "map(absInt(a::b))";
            progCol.parseFunc();
            expect(progCol.func.name).to.equal("map");
        });
    });

    describe("Table Constructor Test", function() {
        it("Should have 19 attributes", function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "isLocked": false
            });

            expect(table).to.be.an.instanceof(TableMeta);
            expect(Object.keys(table).length).to.equal(19);
            expect(table).have.property("version").and
            .to.equal(currentVersion);
            expect(table).have.property("tableName").and
            .to.equal("test#a1");
            expect(table).have.property("tableId").and
            .to.equal("a1");
            expect(table).have.property("isLocked").and
            .to.be.false;
            expect(table).have.property("noDelete").and
            .to.be.false;
            expect(table).have.property("status").and
            .to.equal(TableType.Active);
            expect(table).have.property("timeStamp").and
            .to.be.a("number");
            expect(table).have.property("tableCols").and
            .to.be.null;
            expect(table).have.property("tableCols").and
            .to.be.null;
            expect(table).have.property("bookmarks").and
            .to.be.an("array");
            expect(table).have.property("rowHeights").and
            .to.be.an("object");
            expect(table).have.property("resultSetId").and
            .to.be.equal(-1);
            expect(table).have.property("icv").and
            .to.be.equal("");
            expect(table).have.property("keyName").and
            .to.be.equal("");
            expect(table).have.property("ordering").and
            .to.be.null;
            expect(table).have.property("backTableMeta").and
            .to.be.null;
            expect(table).have.property("resultSetCount").and
            .to.be.equal(-1);
            expect(table).have.property("resultSetMax").and
            .to.be.equal(-1);
            expect(table).have.property("numPages").and
            .to.be.equal(-1);
        });

        it("TableMeta Constructor should handle error case", function() {
            try {
                new TableMeta();
            } catch (error) {
                expect(error).not.to.be.null;
            }
        });

        it("Should get id", function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "isLocked": false
            });

            expect(table.getId()).to.equal("a1");
        });

        it("Should get name", function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "isLocked": false
            });

            expect(table.getName()).to.equal("test#a1");
        });

        it("Table should update timestamp", function(done) {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "isLocked": false
            });

            var time = table.getTimeStamp();
            expect(time).to.be.a("number");

            setTimeout(function() {
                table.updateTimeStamp();
                expect(table.getTimeStamp()).not.to.equal(time);
                done();
            }, 50);
        });

        it("Table should get keyName", function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "isLocked": false
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
                "tableId": "a1",
                "isLocked": false
            });
            expect(table.getOrdering()).to.be.null;

            var testVal = "testOrder";
            table.ordering = testVal;

            expect(table.getOrdering()).to.equal(testVal);
        });

        it("Table should lock and unlock", function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "isLocked": false
            });

            expect(table.hasLock()).to.be.false;
            table.lock();
            expect(table.hasLock()).to.be.true;
            table.unlock();
            expect(table.hasLock()).to.be.false;
        });

        it("Table should change status", function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "isLocked": false
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

        it("Table should get col info", function() {
            var progCol =  new ProgCol({
                "name": "testCol",
                "backName": "prefix::backTestCol",
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var dataCol = ColManager.newDATACol();
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "tableCols": [progCol, dataCol],
                "isLocked": false
            });

            expect(table.getNumCols()).to.equal(2);
            expect(table.getAllCols()).to.be.an("array");
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
        });

        it("Should check if has column", function() {
            var progCol1 = new ProgCol({
                "name": "testCol",
                "backName": "prefix::backTestCol",
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var progCol2 = new ProgCol({
                "name": "testCol2",
                "backName": "backTestCol2",
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var dataCol = ColManager.newDATACol();

            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "tableCols": [dataCol, progCol1, progCol2],
                "isLocked": false
            });

            // test without backMeta
            expect(table.hasCol("testCol", "")).to.be.false;
            expect(table.hasCol("testCol")).to.be.true;
            expect(table.hasCol("testCol", "prefix")).to.be.true;
            expect(table.hasCol("prefix::backTestCol", "")).to.be.false;
            expect(table.hasCol("prefix::backTestCol")).to.be.true;
            expect(table.hasCol("prefix::backTestCol", "prefix")).to.be.true;
            expect(table.hasCol("errorCol")).to.be.false;

            // test with backMeta
            table.backTableMeta = {
                valueAttrs: [{
                    "type": DfFieldTypeT.DfFatptr,
                    "name": "backTestCol"
                },
                {
                    "type": DfFieldTypeT.DfString,
                    "name": "backTestCol2"
                },
                {
                    "type": DfFieldTypeT.DfString,
                    "name": "backTestCol3"
                }]
            };

            expect(table.hasCol("backTestCol2", "")).to.be.true;
            expect(table.hasCol("backTestCol2", "", true)).to.be.true;
            expect(table.hasCol("backTestCol3", "")).to.be.true;
            expect(table.hasCol("backTestCol3", "", true)).to.be.false;
        });

        it("Should add and remove col", function() {
            var dataCol = ColManager.newDATACol();
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "tableCols": [dataCol],
                "isLocked": false
            });

            var progCol = new ProgCol({
                "name": "testCol",
                "backName": "backTestCol",
                "isNewCol": false,
                "func": {
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

        it("Should add col and check immediate type", function() {
            var dataCol = ColManager.newDATACol();
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "tableCols": [dataCol],
                "isLocked": false
            });

            table.backTableMeta = {
                "valueAttrs": [{
                    "name": "testImmeidate",
                    "type": DfFieldTypeT.DfString
                }]
            };

            var progCol = new ProgCol({
                "name": "testImmeidate",
                "backName": "testImmeidate",
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            table.addCol(1, progCol);
            expect(table.tableCols.length).to.equal(2);
            var col = table.getCol(1);
            expect(col.getType()).to.equal(ColumnType.string);
        });

        it("Should sort columns by name", function() {
            var progCol1 = new ProgCol({
                "name": "b",
                "backName": "b",
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var progCol2 = new ProgCol({
                "name": "a",
                "backName": "a",
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "tableCols": [progCol1, progCol2],
                "isLocked": false
            });

            // case 1
            table.sortCols(ColumnSortType.name, ColumnSortOrder.ascending);
            expect(table.getCol(1).getFrontColName()).to.equal("a");

            // case 2
            table.sortCols(ColumnSortType.name, ColumnSortOrder.descending);
            expect(table.getCol(1).getFrontColName()).to.equal("b");
        });

        it("Should sort columns by type", function() {
            var progCol1 = new ProgCol({
                "name": "a",
                "backName": "a",
                "type": ColumnType.string,
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var progCol2 = new ProgCol({
                "name": "b",
                "backName": "b",
                "type": ColumnType.array,
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "tableCols": [progCol1, progCol2],
                "isLocked": false
            });

            // case 1
            table.sortCols(ColumnSortType.type, ColumnSortOrder.ascending);
            expect(table.getCol(1).getFrontColName()).to.equal("b");

            // case 2
            table.sortCols(ColumnSortType.type, ColumnSortOrder.descending);
            expect(table.getCol(1).getFrontColName()).to.equal("a");
        });

        it("Should sort columns by prefix", function() {
            var progCol1 = new ProgCol({
                "name": "a",
                "backName": "prefix2::a",
                "type": ColumnType.string,
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var progCol2 = new ProgCol({
                "name": "b",
                "backName": "prefix1::b",
                "type": ColumnType.array,
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "tableCols": [progCol1, progCol2],
                "isLocked": false
            });

            // case 1
            table.sortCols(ColumnSortType.prefix, ColumnSortOrder.ascending);
            expect(table.getCol(1).getFrontColName()).to.equal("b");

            // case 2
            table.sortCols(ColumnSortType.prefix, ColumnSortOrder.descending);
            expect(table.getCol(1).getFrontColName()).to.equal("a");
        });

        it("Should sort by name when have same prefix", function() {
            var progCol1 = new ProgCol({
                "name": "b",
                "backName": "prefix::b",
                "type": ColumnType.string,
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var progCol2 = new ProgCol({
                "name": "a",
                "backName": "prefix::a",
                "type": ColumnType.array,
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "tableCols": [progCol1, progCol2],
                "isLocked": false
            });

            table.sortCols(ColumnSortType.prefix, ColumnSortOrder.ascending);
            expect(table.getCol(1).getFrontColName()).to.equal("a");
        });

        it("table should get immediates", function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "isLocked": false
            });

            var res = table.getImmediates();
            expect(res).to.be.an("array").and.to.have.length(0);

            table.backTableMeta = {
                "valueAttrs": [{
                    "name": "test",
                    "type": DfFieldTypeT.DfString
                },
                {
                    "name": "test2",
                    "type": DfFieldTypeT.DfFatptr
                }]
            };

            res = table.getImmediates();
            expect(res).to.be.an("array").and.to.have.length(1);
            expect(res[0].name).to.equal("test");
        });

        it("table should get fatPtrs", function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "isLocked": false
            });

            var res = table.getFatPtr();
            expect(res).to.be.an("array").and.to.have.length(0);

            table.backTableMeta = {
                "valueAttrs": [{
                    "name": "test",
                    "type": DfFieldTypeT.DfString
                },
                {
                    "name": "test2",
                    "type": DfFieldTypeT.DfFatptr
                }]
            };

            res = table.getFatPtr();
            expect(res).to.be.an("array").and.to.have.length(1);
            expect(res[0].name).to.equal("test2");
        });


        it("table should get immediates names", function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "isLocked": false
            });

            var res = table.getImmediateNames();
            expect(res).to.be.an("array").and.to.have.length(0);

            table.backTableMeta = {
                "valueAttrs": [{
                    "name": "test",
                    "type": DfFieldTypeT.DfString
                },
                {
                    "name": "test2",
                    "type": DfFieldTypeT.DfFatptr
                }]
            };

            res = table.getImmediateNames();
            expect(res).to.be.an("array").and.to.have.length(1);
            expect(res[0]).to.equal("test");
        });

        it("table should get fatPtr names", function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "isLocked": false
            });

            var res = table.getFatPtrNames();
            expect(res).to.be.an("array").and.to.have.length(0);

            table.backTableMeta = {
                "valueAttrs": [{
                    "name": "test",
                    "type": DfFieldTypeT.DfString
                },
                {
                    "name": "test2",
                    "type": DfFieldTypeT.DfFatptr
                }]
            };

            res = table.getFatPtrNames();
            expect(res).to.be.an("array").and.to.have.length(1);
            expect(res[0]).to.equal("test2");
        });

        it("table should show indexed style", function() {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1"
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
                "tableId": "a1"
            });

            expect(table.bookmarks).to.be.an("array")
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

        it("Should get meta test1", function(done) {
            var oldFunc = XcalarGetTableMeta;
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1"
            });

            XcalarGetTableMeta = function() {
                return PromiseHelper.resolve();
            };

            table.getMeta()
            .then(function() {
                expect(table.backTableMeta).not.to.exists;
                done();
            })
            .fail(function() {
                throw "error case";
            })
            .always(function() {
                XcalarGetTableMeta = oldFunc;
            });
        });

        it("Should get meta test2", function(done) {
            var oldFunc = XcalarGetTableMeta;
            var progCol = new ProgCol({
                "name": "testCol",
                "backName": "prefix::backTestCol",
                "isNewCol": false,
                "func": {
                    "name": "pull"
                }
            });

            var dataCol = ColManager.newDATACol();
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1",
                "tableCols": [progCol, dataCol]
            });

            XcalarGetTableMeta = function() {
                return PromiseHelper.resolve({
                    "keyAttr": {
                        "name": "recordNum",
                        "type": 5,
                        "valueArrayIndex": -1
                    },
                    "ordering": 1,
                    "valueAttrs": [{
                        "name": "test",
                        "type": DfFieldTypeT.DfFatptr,
                        "valueArrayIndex": 0
                    },{
                        "name": "prefix::backTestCol",
                        "type": DfFieldTypeT.DfBoolean,
                        "valueArrayIndex": 1
                    }]
                });
            };

            table.getMeta()
            .then(function() {
                expect(table.backTableMeta).to.exists;
                expect(table.ordering).to.equal(1);
                expect(table.keyName).to.equal("recordNum");
                var col = table.getColByBackName("prefix::backTestCol");
                expect(col).not.to.be.null;
                expect(col.getType()).to.equal(ColumnType.boolean);
                done();
            })
            .fail(function() {
                throw "error case";
            })
            .always(function() {
                XcalarGetTableMeta = oldFunc;
            });
        });

        it("Should update result set", function(done) {
            var oldFunc = XcalarMakeResultSetFromTable;
            XcalarMakeResultSetFromTable = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 10
                });
            };

            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1"
            });

            table.updateResultset()
            .then(function() {
                expect(table.resultSetId).to.equal(1);
                expect(table.resultSetMax).to.equal(10);
                done();
            })
            .fail(function() {
                throw "error case";
            })
            .always(function() {
                XcalarMakeResultSetFromTable = oldFunc;
            });
        });

        it("getMetaAndResultSet should work", function(done) {
            var test1 = null;
            var test2 = null;
            var oldMakeResult = XcalarMakeResultSetFromTable;
            var oldGetMeta = XcalarGetTableMeta;

            XcalarMakeResultSetFromTable = function() {
                test1 = true;
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 10
                });
            };

            XcalarGetTableMeta = function() {
                test2 = true;
                return PromiseHelper.resolve();
            };

            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1"
            });

            table.getMetaAndResultSet()
            .then(function() {
                expect(test1).to.be.true;
                expect(test2).to.be.true;
                done();
            })
            .fail(function() {
                throw "error case";
            })
            .always(function() {
                XcalarMakeResultSetFromTable = oldMakeResult;
                XcalarGetTableMeta = oldGetMeta;
            });
        });

        it("table should free result set test1", function(done) {
            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1"
            });
            table.freeResultset()
            .then(function() {
                expect(table.resultSetId).to.equal(-1);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("table should free result set test2", function(done) {
            var oldFunc = XcalarSetFree;
            XcalarSetFree = function() {
                return PromiseHelper.resolve();
            };

            var table = new TableMeta({
                "tableName": "test#a1",
                "tableId": "a1"
            });

            table.resultSetId = 1;

            table.freeResultset()
            .then(function() {
                expect(table.resultSetId).to.equal(-1);
                done();
            })
            .fail(function() {
                throw "error case";
            })
            .always(function() {
                XcalarSetFree = oldFunc;
            });
        });
        it("table should get column contents", function() {
            var tableId = "unitTest-exportHelper";
            var colCont0 = "record0";

            var progCol = new ProgCol({
                "name": "test",
                "backName": "test",
                "isNewCol": false,
                "type": "string",
                "func": {
                    "name": "pull"
                }
            });

            var table = new TableMeta({
                "tableName": "test#" + tableId,
                "tableId": tableId,
                "tableCols": [progCol],
                "isLocked": false
            });
            var fakeHtml =
                '<div id="xcTable-' + tableId + '">' +
                    '<table>' +
                        '<tr>' +
                            '<td class="col1">' +
                                '<div class="originalData">' +
                                    colCont0 +
                                '</div>' +
                            '</td>' +
                        '</tr>' +
                    '</table>' +
                '</div>';
            $(fakeHtml).appendTo("body");
            succCont = table.getColContents(1);
            expect(succCont.length).to.equal(1);
            expect(succCont[0]).to.equal(colCont0);
            expect(table.getColContents(0)).to.equal(null);
            expect(table.getColContents(2)).to.equal(null);

            $("#xcTable-" + tableId).remove();
        });
    });

    describe("Agg Constructor Test", function() {
        it("Should have 8 attributes", function() {
            var agg = new Agg({
                "aggName": "^fg",
                "backColName": "schedule::teacher_id",
                "dagName": "fg",
                "op": "avg",
                "tableId": "gM321",
                "value": 2.1
            });

            expect(agg).to.be.an.instanceof(Agg);
            expect(Object.keys(agg).length).to.equal(7);
            expect(agg).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(agg).to.have.property("aggName")
            .and.to.equal("^fg");
            expect(agg).to.have.property("backColName")
            .and.to.equal("schedule::teacher_id");
            expect(agg).to.have.property("dagName")
            .and.to.equal("fg");
            expect(agg).to.have.property("op")
            .and.to.equal("avg");
            expect(agg).to.have.property("tableId")
            .and.to.equal("gM321");
            expect(agg).to.have.property("value")
            .and.to.equal(2.1);
        });
    });

    describe("GenSettings Constructor Test", function() {
        it("Should have 4 attributes", function() {
            var genSettings = new GenSettings();

            expect(genSettings).to.be.an.instanceof(GenSettings);
            expect(Object.keys(genSettings).length).to.equal(4);
            expect(genSettings).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(genSettings).to.have.property("adminSettings");
            expect(genSettings).to.have.property("xcSettings");
            expect(genSettings).to.have.property("baseSettings");
        });

        it("Should get baseSettings", function() {
            var genSettings = new GenSettings();
            var baseSettings = genSettings.getBaseSettings();

            expect(Object.keys(baseSettings).length).to.equal(5);
            expect(baseSettings).to.have.property("hideDataCol")
            .and.to.be.false;
            expect(baseSettings).to.have.property('skipSplash')
            .and.to.be.false;
            expect(baseSettings).to.have.property("monitorGraphInterval")
            .and.to.equal(3);
            expect(baseSettings).to.have.property("commitInterval")
            .and.to.equal(120);
            expect(baseSettings).to.have.property("DsDefaultSampleSize")
            .and.to.equal(10 * GB);
        });

        it("GenSettings heirarchy should work", function() {
            var testSettings = {
                "adminSettings": {},
                "xcSettings": {
                    "monitorGraphInterval": 9
                }
            };
            var userConfigParams = {
                "DsDefaultSampleSize": 2000,
                "commitInterval": 600
            };
            // modified base settings should be
            // {monitorGraphInterval: 9, hideDataCol: false}

            var genSettings = new GenSettings(userConfigParams, testSettings);

            var adminAndXc = genSettings.getAdminAndXcSettings();
            expect(Object.keys(adminAndXc.adminSettings)).to.have.length(0);
            expect(Object.keys(adminAndXc.xcSettings)).to.have.length(1);

            var baseSettings = genSettings.getBaseSettings();
            expect(Object.keys(baseSettings)).to.have.length(5);
            expect(baseSettings["hideDataCol"]).to.be.false;
            expect(baseSettings['skipSplash']).to.be.false;
            expect(baseSettings["monitorGraphInterval"]).to.equal(9);
            expect(baseSettings["commitInterval"]).to.equal(600);
            expect(baseSettings["DsDefaultSampleSize"]).to.equal(2000);
        });

        it("Should update adminSettings", function() {
            var genSettings = new GenSettings();
            genSettings.updateAdminSettings({"a": 1});
            expect(genSettings.adminSettings).to.exist;
            expect(genSettings.adminSettings.a).to.equal(1);
        });

        it("Should update xcSettings", function() {
            var genSettings = new GenSettings();
            genSettings.updateXcSettings({"a": 1});
            expect(genSettings.xcSettings).to.exist;
            expect(genSettings.xcSettings.a).to.equal(1);
        });
    });

    describe("UserPref Constructor Test", function() {
        it("Should have 6 attributes", function() {
            var userPref = new UserPref();

            expect(userPref).to.be.an.instanceof(UserPref);
            expect(Object.keys(userPref).length).to.equal(6);
            expect(userPref).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(userPref).to.have.property("datasetListView")
            .and.to.be.false;
            expect(userPref).to.have.property("browserListView")
            .and.to.be.false;
            expect(userPref).to.have.property("keepJoinTables")
            .and.to.be.false;
            expect(userPref).to.have.property("activeMainTab")
            .and.to.equal("workspaceTab");
            expect(userPref).to.have.property("general").and.to.be.empty;

            userPref.update();
        });

        it("Should update attribute", function() {
            var datasetListView = !$("#dataViewBtn").hasClass("listView");
            var userPref = new UserPref({
                "datasetListView": datasetListView
            });

            userPref.update();
            expect(userPref.datasetListView).not.to.equal(datasetListView);
        });
    });

    describe("DSObj Constructor Test", function() {
        it("Should have 10 attributes for ds", function() {
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "user": "testUser",
                "fullName": "testFullName",
                "parentId": DSObjTerm.homeParentId,
                "isFolder": true
            });

            expect(dsObj).to.be.instanceof(DSObj);
            expect(Object.keys(dsObj).length).to.equal(10);
            expect(dsObj).to.have.property("version")
            .and.to.equal(currentVersion);
        });

        it("Should have 25 attributes for ds", function() {
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "user": "testUser",
                "fullName": "testFullName",
                "parentId": DSObjTerm.homeParentId,
                "uneditable": false,
                "path": "nfs:///netstore/datasets/gdelt/",
                "format": "CSV",
                "pattern": "abc.csv",
                "numEntries": 1000
            });

            expect(dsObj).to.be.instanceof(DSObj);
            expect(Object.keys(dsObj).length).to.equal(25);
            expect(dsObj).to.have.property("version")
            .and.to.equal(currentVersion);
        });

        it("Should get id", function() {
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId
            });

            expect(dsObj.getId()).to.equal("testId");
        });

        it("Should get parent id", function() {
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId
            });

            expect(dsObj.getParentId()).to.equal(DSObjTerm.homeParentId);
        });

        it("Should get name", function() {
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId
            });

            expect(dsObj.getName()).to.equal("testName");
        });

        it("Should get full name", function() {
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId,
                "fullName": "testFullName"
            });

            expect(dsObj.getFullName()).to.equal("testFullName");
        });

        it("Should get user", function() {
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "user": "testUser",
                "parentId": DSObjTerm.homeParentId
            });

            expect(dsObj.getUser()).to.equal("testUser");
        });

        it("Should get format", function() {
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "format": "CSV",
                "parentId": DSObjTerm.homeParentId
            });

            expect(dsObj.getFormat()).to.equal("CSV");
        });

        it("Should get path", function() {
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId,
                "path": "nfs:///netstore/datasets/gdelt/"
            });

            expect(dsObj.getPath())
            .to.equal("nfs:///netstore/datasets/gdelt/");
        });

        it("Should get path with pattern", function() {
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId,
                "path": "nfs:///netstore/datasets/gdelt/",
                "pattern": "abc.csv"
            });

            expect(dsObj.getPathWithPattern())
            .to.equal("nfs:///netstore/datasets/gdelt/abc.csv");
        });

        it("Should get num entries", function() {
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId,
                "numEntries": 1000
            });
            expect(dsObj.getNumEntries()).to.equal(1000);
        });

        it("Should know if is folder or not", function() {
            var dsObj1 = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId,
                "isFolder": true,
            });

            var dsObj2 = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId,
                "isFolder": false,
            });

            expect(dsObj1.beFolder()).to.be.true;
            expect(dsObj2.beFolder()).to.be.false;
        });

        it("Should know if dsObj is folder with ds", function() {
            var dsObj1 = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId,
                "isFolder": true,
            });

            dsObj1.eles.push("test");

            var dsObj2 = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId,
                "isFolder": true,
            });

            var dsObj3 = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId,
                "isFolder": false,
            });

            expect(dsObj1.beFolderWithDS()).to.be.true;
            expect(dsObj2.beFolderWithDS()).to.be.false;
            expect(dsObj3.beFolderWithDS()).to.be.false;
        });

        it("Should know if is editable", function() {
            var dsObj1 = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId,
                "uneditable": false,
            });

            var dsObj2 = new DSObj({
                "id": "testId",
                "name": "testName",
                "parentId": DSObjTerm.homeParentId,
                "uneditable": true
            });

            expect(dsObj1.isEditable()).to.be.true;
            expect(dsObj2.isEditable()).to.be.false;
        });

        it("Should get point args", function() {
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "pattern": "test",
                "user": "testUser",
                "fullName": "testFullName",
                "parentId": DSObjTerm.homeParentId,
                "uneditable": false,
                "path": "nfs:///netstore/datasets/gdelt/",
                "format": "CSV",
                "numEntries": 1000,
                "isRegex": true
            });

            var res = dsObj.getPointArgs();
            expect(res).to.be.an("array");
            expect(res[0]).to.equal("nfs:///netstore/datasets/gdelt/");
            expect(res[1]).to.equal("CSV");
            expect(res[2]).to.equal("testFullName");
            expect(res[12]).to.equal("re:test");

            // case 2
            dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "pattern": "test",
                "user": "testUser",
                "fullName": "testFullName",
                "parentId": DSObjTerm.homeParentId,
                "uneditable": false,
                "path": "nfs:///netstore/datasets/gdelt/",
                "format": "CSV",
                "numEntries": 1000,
                "isRegEx": false
            });

            res = dsObj.getPointArgs();
            expect(res).to.be.an("array");
            expect(res[0]).to.equal("nfs:///netstore/datasets/gdelt/");
            expect(res[1]).to.equal("CSV");
            expect(res[2]).to.equal("testFullName");
            expect(res[12]).to.equal("test");
        });

        it("Should get and set size", function() {
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "fullName": "testFullName",
                "parentId": DSObjTerm.homeParentId,
                "size": "123B"
            });

            expect(dsObj.getSize()).to.equal("123B");
            dsObj.setSize(456);
            expect(dsObj.getSize()).to.equal("456B");
        });

        it("Should get memory taken size", function(done) {
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "fullName": "testFullName",
                "parentId": DSObjTerm.homeParentId
            });

            var oldFunc = XcalarGetDatasetMeta;
            XcalarGetDatasetMeta = function() {
                return PromiseHelper.resolve({
                    "metas": [{"size": 123}]
                });
            };

            dsObj.getMemoryTakenSize()
            .then(function(res) {
                expect(res).to.equal("123B");
                done();
            })
            .fail(function() {
                throw "error case";
            })
            .always(function() {
                XcalarGetDatasetMeta = oldFunc;
            });
        });

        it("Should get and set error", function() {
            // case 1
            var dsObj = new DSObj({"parentId": DSObjTerm.homeParentId});
            expect(dsObj.getError()).to.be.undefined;
            dsObj.setError("test");
            expect(dsObj.getError()).to.equal("test");
            // case 2
            dsObj = new DSObj({
                "parentId": DSObjTerm.homeParentId,
                "error": "test2"
            });
            expect(dsObj.getError()).to.equal("test2");
        });

        it("Should set preview size", function() {
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "fullName": "testFullName",
                "parentId": DSObjTerm.homeParentId,
                "isFolder": false
            });
            // case 1
            dsObj.setPreviewSize("invalid num");
            expect(dsObj.previewSize).not.to.exist;
            // case 2
            dsObj.setPreviewSize(123);
            expect(dsObj.previewSize).to.equal(123);
        });

        it("Should makeResultSet", function(done) {
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "fullName": "testFullName",
                "parentId": DSObjTerm.homeParentId,
                "isFolder": false
            });

            var oldFunc = XcalarMakeResultSetFromDataset;
            XcalarMakeResultSetFromDataset = function() {
                return PromiseHelper.resolve({
                    "resultSetId": 1,
                    "numEntries": 123
                });
            };

            dsObj.makeResultSet()
            .then(function() {
                expect(dsObj.resultSetId).to.equal(1);
                expect(dsObj.numEntries).to.equal(123);
                done();
            })
            .fail(function() {
                throw "error case";
            })
            .always(function() {
                XcalarMakeResultSetFromDataset = oldFunc;
            });
        });


        it("Should preserve order", function() {
            // XXX temp fix to preserve CSV header order
            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "fullName": "testFullName",
                "parentId": DSObjTerm.homeParentId,
                "isFolder": false
            });

            // when no headers
            var res = dsObj._preserveHeaderOrder(null);
            expect(res).to.be.null;

            res = dsObj._preserveHeaderOrder(["e", "f"]);
            expect(res[0]).to.equal("e");
            expect(res[1]).to.equal("f");

            // when has headers
            dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "fullName": "testFullName",
                "parentId": DSObjTerm.homeParentId,
                "isFolder": false,
                "headers": ["a", "b", "c"]
            });

            res = dsObj._preserveHeaderOrder(["c", "b", "e"]);
            expect(res[0]).to.equal("b");
            expect(res[1]).to.equal("c");
            expect(res[2]).to.equal("e");
        });

        describe("Fetch data test", function() {
            var oldFetch;
            var dsObj;

            before(function() {
                oldFetch = XcalarFetchData;
                dsObj = new DSObj({
                    "id": "testId",
                    "name": "testName",
                    "fullName": "testFullName",
                    "parentId": DSObjTerm.homeParentId,
                    "isFolder": false,
                    "resultSetId": 1
                });
            });

            it("Should return null in invalid case", function(done) {
                dsObj.numEntries = -1;

                dsObj.fetch(1, 10)
                .then(function() {
                    throw "error case";
                })
                .fail(function(error) {
                    expect(error).to.be.an("object");
                    expect(error.error).to.equal(DSTStr.NoRecords);
                    done();
                });
            });

            it("Should fetch data", function(done) {
                XcalarFetchData = function() {
                    var json = JSON.stringify({"a": "b"});
                    return PromiseHelper.resolve([{"value": json}]);
                };

                dsObj.numEntries = 1000;

                dsObj.fetch(1, 10)
                .then(function(jsons, jsonKeys) {
                    expect(jsons).to.be.an("array");
                    expect(jsonKeys).to.be.an("array");
                    expect(jsonKeys[0]).to.equal("a");
                    done();
                })
                .fail(function() {
                    throw "error case";
                });
            });

            it("Should handle normal fail case", function(done) {
                XcalarFetchData = function() {
                    return PromiseHelper.reject({"error": "test"});
                };

                dsObj.fetch(1, 10)
                .then(function() {
                    throw "error case";
                })
                .fail(function(error) {
                    expect(error).to.be.an("object");
                    expect(error.error).to.equal("test");
                    done();
                });
            });

            it("Should handle fetch fail case", function(done) {
                var oldMakeResult = XcalarMakeResultSetFromDataset;
                var shouldFail = true;

                XcalarMakeResultSetFromDataset = function() {
                    return PromiseHelper.resolve({
                        "resultSetId": null,
                        "numEntries": 1000
                    });
                };

                XcalarFetchData = function() {
                    if (shouldFail) {
                        shouldFail = false;

                        return PromiseHelper.reject({
                            "status": StatusT.StatusInvalidResultSetId
                        });
                    } else {
                        var json = JSON.stringify({"a": "b"});
                        return PromiseHelper.resolve([{"value": json}]);
                    }
                };

                dsObj.resultSetId = null;

                dsObj.fetch(1, 10)
                .then(function(jsons, jsonKeys) {
                    expect(jsons).to.be.an("array");
                    expect(jsonKeys).to.be.an("array");
                    expect(jsonKeys[0]).to.equal("a");
                    done();
                })
                .fail(function() {
                    throw "error case";
                })
                .always(function() {
                    XcalarMakeResultSetFromDataset = oldMakeResult;
                });
            });

            after(function() {
                XcalarFetchData = oldFetch;
            });
        });

        it("Should release dsObj", function(done) {
            var oldFunc = XcalarSetFree;
            XcalarSetFree = function() {
                return PromiseHelper.resolve();
            };

            var dsObj = new DSObj({
                "id": "testId",
                "name": "testName",
                "fullName": "testFullName",
                "parentId": DSObjTerm.homeParentId,
                "isFolder": false,
                "resultSetId": 1
            });

            dsObj.release()
            .then(function() {
                expect(dsObj.resultSetId).to.be.null;
                done();
            })
            .fail(function() {
                throw "error case";
            })
            .always(function() {
                XcalarSetFree = oldFunc;
            });
        });
    });

    describe("CatItem Constructor Test", function() {
        it("Should hvae 4 attributes", function() {
            var cartItem = new CartItem({
                "colNum": 1,
                "value": "test"
            });

            expect(cartItem).to.be.an.instanceof(CartItem);
            expect(Object.keys(cartItem).length).to.equal(4);
            expect(cartItem).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(cartItem).to.have.property("colNum");
            expect(cartItem).to.have.property("value");
            expect(cartItem).to.have.property("type");
        });
    });

    describe("Cart Constructor Test", function() {
        it("Should have 4 attributes", function() {
            var cart = new Cart({
                "dsId": "test",
                "tableName": "testTable",
                "items": [{
                    "colNum": 1,
                    "value": "test"
                }]
            });

            expect(cart).to.be.an.instanceof(Cart);
            expect(Object.keys(cart).length).to.equal(4);
            expect(cart).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(cart).to.have.property("dsId")
            .and.to.equal("test");
            expect(cart).to.have.property("tableName")
            .and.to.equal("testTable");
            expect(cart).to.have.property("items")
            .and.to.be.an("array");
        });

        it("Cart should have correct function to call", function() {
            var cart = new Cart({
                "dsId": "test",
                "tableName": "testTable"
            });

            expect(cart.getId()).to.equal("test");
            expect(cart.getTableName()).to.equal("testTable");
            cart.setTableName("table2");
            expect(cart.getTableName()).to.equal("table2");

            expect(cart.getPrefix()).to.be.null;
            cart.setPrefix("testPrefix");
            expect(cart.getPrefix()).to.equal("testPrefix");

            cart.addItem(new CartItem({"colNum": 1, "value": "t1"}));
            cart.addItem(new CartItem({"colNum": 2, "value": "t2"}));
            expect(cart.items.length).to.equal(2);

            cart.removeItem(1);
            expect(cart.items.length).to.equal(1);
            expect(cart.items[0].value).to.equal("t2");

            cart.emptyItem();
            expect(cart.items.length).to.equal(0);
        });

        it("Should get dsName", function() {
            var oldFunc = DS.getDSObj;
            DS.getDSObj = function() {
                return new DSObj({
                    "fullName": "testFullName",
                    "isFolder": false,
                    "parentId": DSObjTerm.homeParentId
                });
            };

            var cart = new Cart({
                "dsId": "test",
                "tableName": "testTable",
            });
            var res = cart.getDSName();
            expect(res).to.equal("testFullName");

            DS.getDSObj = oldFunc;
        });
    });

    describe("WSMETA Constructor Test", function() {
        it("Should have 6 attributes", function() {
            var meta = new WSMETA({
                "wsInfos": {},
                "wsOrder": [],
                "hiddenWS": [],
                "noSheetTables": [],
                "activeWS": "test"
            });

            expect(meta).to.be.an.instanceof(WSMETA);
            expect(Object.keys(meta).length).to.equal(6);
            expect(meta).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(meta).to.have.property("wsInfos")
            .and.to.be.an("object");
            expect(meta).to.have.property("wsOrder");
            expect(meta).to.have.property("hiddenWS");
            expect(meta).to.have.property("noSheetTables");
            expect(meta).to.have.property("activeWS")
            .and.to.equal("test");
        });
    });

    describe("WorksheetObj Constructor Test", function() {
        it("Should have 10 attributes ", function() {
            var worksheet = new WorksheetObj({
                "id": "testId",
                "name": "testName",
                "date": "testDate"
            });

            expect(worksheet).to.be.an.instanceof(WorksheetObj);
            expect(Object.keys(worksheet).length).to.equal(10);
            expect(worksheet).have.property("version")
            .and.to.equal(currentVersion);
            expect(worksheet).have.property("id")
            .and.to.equal("testId");
            expect(worksheet).have.property("name")
            .and.to.equal("testName");
            expect(worksheet).have.property("date")
            .and.to.equal("testDate");
            expect(worksheet).have.property("archivedTables")
            .and.to.be.an("array");
            expect(worksheet).have.property("orphanedTables")
            .and.to.be.an("array");
            expect(worksheet).have.property("tempHiddenTables")
            .and.to.be.an("array");
            expect(worksheet).have.property("undoneTables")
            .and.to.be.an("array");
            expect(worksheet).have.property("lockedTables")
            .and.to.be.an("array");
        });

        it("Should have basic getter", function() {
            var worksheet = new WorksheetObj({
                "id": "testId2",
                "name": "testName2",
                "date": "testDate"
            });

            expect(worksheet.getId()).to.equal("testId2");
            expect(worksheet.getName()).to.equal("testName2");

            worksheet.setName("testName3");
            expect(worksheet.getName()).to.equal("testName3");
        });

        it("Should add table to worksheet", function() {
            var worksheet = new WorksheetObj({
                "id": "testId",
                "name": "testName",
            });

            // error case1
            var res = worksheet.addTable();
            expect(res).to.be.false;

            // error case2
            res = worksheet.addTable("tableId", "invalidType");
            expect(res).to.be.false;

            var count = 0;
            for (var key in WSTableType) {
                var tableType = WSTableType[key];
                var tableId = "tableId";
                res = worksheet.addTable(tableId, tableType);
                expect(res).to.be.true;
                expect(worksheet[tableType].length).to.be.equal(1);
                count++;
            }

            // error case 3
            res = worksheet.addTable("tableId", WSTableType.Active);
            expect(res).to.be.false;
        });
    });

    describe("WKBK Constructor Test", function() {
        it("Should hanlde create error", function() {
            try {
                new WKBK();
            } catch (error) {
                expect(error).not.to.be.null;
            }
        });

        it("Should have 9 attributes", function() {
            var wkbk = new WKBK({
                "name": "test",
                "id": "testId",
                "srcUser": "testUser",
                "curUser": "testUser",
                "created": 1234,
                "modified": 2234,
                "numWorksheets": 12
            });

            expect(Object.keys(wkbk).length).to.equal(9);
            expect(wkbk).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(wkbk).to.have.property("name")
            .and.to.equal("test");
            expect(wkbk).to.have.property("id")
            .and.to.equal("testId");
            expect(wkbk).to.have.property("noMeta")
            .and.to.be.false;
            expect(wkbk).to.have.property("srcUser")
            .and.to.equal("testUser");
            expect(wkbk).to.have.property("curUser")
            .and.to.equal("testUser");
            expect(wkbk).to.have.property("created")
            .and.to.equal(1234);
            expect(wkbk).to.have.property("modified")
            .and.to.equal(2234);
            expect(wkbk).to.have.property("numWorksheets")
            .and.to.equal(12);
        });

        it("WKBK Basic function should work", function() {
            var wkbk = new WKBK({
                "name": "test",
                "id": "testId",
                "noMeta": false,
                "srcUser": "testUser",
                "curUser": "testUser",
                "created": 1234,
                "modified": 2234,
                "numWorksheets": 12
            });

            expect(wkbk.getId()).to.equal("testId");
            expect(wkbk.getName()).to.equal("test");
            expect(wkbk.getCreateTime()).to.equal(1234);
            expect(wkbk.getModifyTime()).to.equal(2234);
            expect(wkbk.getSrcUser()).to.equal("testUser");
            expect(wkbk.getNumWorksheets()).to.equal(12);
            expect(wkbk.isNoMeta()).to.be.false;

            wkbk.noMeta = true;
            expect(wkbk.isNoMeta()).to.be.true;

            wkbk.update();
            expect(wkbk.getModifyTime()).not.to.equal(2234);
        });
    });

    describe("RetinaNode Constructor Test", function() {
        it("Should have 4 arrtibues", function() {
            var retinaNode = new RetinaNode({
                "paramType": "testType",
                "paramValue": "testVal",
                "paramQuery": ["testQuery"]
            });

            expect(retinaNode).to.be.an.instanceof(RetinaNode);
            expect(Object.keys(retinaNode).length).to.equal(4);
            expect(retinaNode).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(retinaNode).to.have.property("paramType")
            .and.to.equal("testType");
            expect(retinaNode).to.have.property("paramValue")
            .and.to.equal("testVal");
            expect(retinaNode).to.have.property("paramQuery")
            .and.to.be.an("array");
            expect(retinaNode.paramQuery[0]).to.equal("testQuery");
        });
    });

    describe("SchedObj Constructor Test", function() {
        var sched;
        var currentTime = new Date().getTime();

        before(function() {
            var createTime = currentTime;
            var startTime = currentTime;
            var modifiedTime = currentTime;
            var options = {
                "startTime": startTime,
                "dateText": "11/08/2016",
                "timeText": "09 : 25 AM",
                "repeat": "hourly",
                "modified": modifiedTime,
                "recur": 10,
                "created": createTime
            };
            sched = new SchedObj(options);
        });

        it("Should have 8 attributes", function() {
            expect(sched).to.be.an.instanceof(SchedObj);
            expect(sched).to.have.property("startTime")
            .and.to.equal(currentTime);
            expect(sched).to.have.property("dateText")
            .and.to.equal("11/08/2016");
            expect(sched).to.have.property("timeText")
            .and.to.equal("09 : 25 AM");
            expect(sched).to.have.property("repeat")
            .and.to.equal("hourly");
            expect(sched).to.have.property("modified")
            .and.to.equal(currentTime);
            expect(sched).to.have.property("recur")
            .and.to.equal(10);
            expect(sched).to.have.property("created")
            .and.to.equal(currentTime);
        });

        it("Should update schedule", function() {
            var createTime2 = new Date().getTime();
            var startTime2 = new Date().getTime();
            var modifiedTime2 = new Date().getTime();
            var options2 = {
                "startTime": startTime2,
                "dateText": "12/09/2016",
                "timeText": "10 : 35 AM",
                "repeat": "weekly",
                "modified": modifiedTime2,
                "recur": 7,
                "created": createTime2
            };

            sched.update(options2);
            expect(sched.startTime).to.equal(startTime2);
            expect(sched.dateText).to.equal("12/09/2016");
            expect(sched.timeText).to.equal("10 : 35 AM");
            expect(sched.repeat).to.equal("weekly");
            expect(sched.modified).to.equal(modifiedTime2);
            expect(sched.recur).to.equal(7);
            // create time cannot be update
            expect(sched.created).not.to.equal(createTime2);
            expect(sched.created).to.equal(currentTime);
        });
    });

    describe("Dataflow Constructor Test", function() {
        var df;
        var sched;

        before(function() {
            df = new Dataflow("testRet");

            var createTime = new Date().getTime();
            var startTime = new Date().getTime();
            var modifiedTime = new Date().getTime();
            var options = {
                "startTime": startTime,
                "dateText": "11/08/2016",
                "timeText": "09 : 25 AM",
                "repeat": "hourly",
                "freq": 5,
                "modified": modifiedTime,
                "recur": 10,
                "created": createTime
            };
            sched = new SchedObj(options);
        });

        it("Should have 10 attributes", function() {
            expect(df).to.be.an.instanceof(Dataflow);
            expect(Object.keys(df).length).to.equal(9);
            expect(df).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(df).to.have.property("name")
            .and.to.equal("testRet");
            expect(df).to.have.property("columns")
            .and.to.be.an("array");
            expect(df).to.have.property("parameters")
            .and.to.be.an("array");
            expect(df).to.have.property("paramMap")
            .and.to.be.an("object");
            expect(df).to.have.property("nodeIds")
            .and.to.be.an("object");
            expect(df).to.have.property("parameterizedNodes")
            .and.to.be.an("object");
            expect(df).to.have.property("retinaNodes")
            .and.to.be.an("object");
            expect(df).to.have.property("schedule")
            .and.to.be.null;
        });

        it("Should set schedule", function() {
            df.setSchedule(sched);
            expect(df).to.have.property("schedule")
            .and.to.an.instanceof(SchedObj);
        });

        it("Should get schedule", function() {
            expect(df.getSchedule()).to.equal(sched);
        });

        it("Should know if has schedule", function() {
            expect(df.hasSchedule()).to.be.true;
        });

        it("Should remove schedule", function() {
            df.removeSchedule();
            expect(df.hasSchedule()).to.be.false;
        });
    });

    describe.skip("DF Constructor Test", function() {
        var dataFlow;
        var retinaNode;

        before(function() {
            retinaNode = new RetinaNode({
                "paramType": "testType",
                "paramValue": "testVal",
                "paramQuery": ["testQuery"]
            });
        });

        it("Dataflow should be a constructor", function() {
            var dfg = new Dataflow("testDF");
            expect(dfg).to.be.an("object");
            expect(dfg).to.have.property("name").and.to.equal("testDF");
        });

        it("DF should add dataflow", function() {
            var dfg = new Dataflow("testDF");
            expect(dfg).to.have.property("dataFlows")
            .and.to.an("Array");

            expect(dfg.dataFlows.length).to.equal(0);

            dfg.addDataFlow(dataFlow);
            expect(dfg.dataFlows.length).to.equal(1);
            expect(dfg.dataFlows[0].name).to.equal("testFlow");
        });

        it("DF should add RetinaNode", function() {
            var dfg = new Dataflow("testDF");
            expect(dfg).to.have.property("retinaNodes")
            .and.to.an("Object");

            expect(dfg.getParameterizedNode(123)).not.to.be.exist;

            dfg.addParameterizedNode(123, retinaNode);
            expect(dfg.getParameterizedNode(123)).to.be.exist;
        });

        it("DF should add Parameter", function() {
            var dfg = new Dataflow("testDF");
            expect(dfg).to.have.property("parameters")
            .and.to.an("Array");

            expect(dfg).to.have.property("paramMap")
            .and.to.an("Object");

            expect(dfg.parameters.length).to.equal(0);
            expect(dfg.getParameter("a")).not.to.be.exist;
            expect(dfg.addParameter("a"));
            expect(dfg.getParameter("a")).to.be.null;
            var params = dfg.getAllParameters();
            expect(params.length).to.equal(1);
            expect(params[0]).to.be.an("object");
            expect(params[0]).to.have.property("parameterName")
            .and.to.equal("a");
            expect(params[0]).to.have.property("parameterValue")
            .and.to.be.null;

            dfg.updateParameters([{
                "name": "a",
                "val": "c"
            }]);
            expect(dfg.getParameter("a")).to.equal("c");

            expect(dfg.checkParamInUse("a")).to.be.false;
            dfg.addParameterizedNode(123, {
                "paramType": "test",
                "paramValue": "test",
                "paramQuery": ["load <a>"]
            });
            expect(dfg.checkParamInUse("a")).to.be.true;

            dfg.removeParameter("a");
            expect(dfg.getParameter("a")).not.to.be.exist;
        });
    });

    describe("ProfileAggInfo Constructor Test", function() {
        it("Should have 7 attributes", function() {
            var aggInfo = new ProfileAggInfo({
                "max": 1,
                "min": 1,
                "count": 1,
                "sum": 1,
                "average": 1,
                "sd": 0
            });

            expect(aggInfo).to.be.an.instanceof(ProfileAggInfo);
            expect(Object.keys(aggInfo).length).to.equal(7);
            expect(aggInfo).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(aggInfo).to.have.property("max").and.to.equal(1);
            expect(aggInfo).to.have.property("min").and.to.equal(1);
            expect(aggInfo).to.have.property("count").and.to.equal(1);
            expect(aggInfo).to.have.property("sum").and.to.equal(1);
            expect(aggInfo).to.have.property("average").and.to.equal(1);
            expect(aggInfo).to.have.property("sd").and.to.equal(0);
        });
    });

    describe("ProfileStatsInfo Constructor Test", function() {
        it("Should have 7 attributes", function() {
            var statsInfo = new ProfileStatsInfo({
                "unsorted": false,
                "zeroQuartile": 2,
                "lowerQuartile": 2,
                "median": 3,
                "upperQuartile": 2,
                "fullQuartile": 4
            });

            expect(statsInfo).to.be.an.instanceof(ProfileStatsInfo);
            expect(Object.keys(statsInfo).length).to.equal(7);
            expect(statsInfo).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(statsInfo).to.have.property("unsorted").and.to.be.false;
            expect(statsInfo).to.have.property("zeroQuartile")
            .and.to.equal(2);
            expect(statsInfo).to.have.property("lowerQuartile")
            .and.to.equal(2);
            expect(statsInfo).to.have.property("median")
            .and.to.equal(3);
            expect(statsInfo).to.have.property("upperQuartile")
            .and.to.equal(2);
            expect(statsInfo).to.have.property("fullQuartile")
            .and.to.equal(4);
        });
    });

    describe("ProfileBucketInfo Constructor Test", function() {
        it("Should have 8 attributes", function() {
            var bucketInfo = new ProfileBucketInfo({
                "bucketSize": 0,
                "table": "testTable",
                "colName": "testCol",
                "max": 1,
                "sum": 1
            });

            expect(bucketInfo).to.be.an.instanceof(ProfileBucketInfo);
            expect(Object.keys(bucketInfo).length).to.equal(8);
            expect(bucketInfo).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(bucketInfo).to.have.property("bucketSize").and.to.equal(0);
            expect(bucketInfo).to.have.property("table")
            .and.to.equal("testTable");
            expect(bucketInfo).to.have.property("ascTable").and.to.be.null;
            expect(bucketInfo).to.have.property("descTable").and.to.be.null;
            expect(bucketInfo).to.have.property("colName")
            .and.to.equal("testCol");
            expect(bucketInfo).to.have.property("max").and.to.equal(1);
            expect(bucketInfo).to.have.property("sum").and.to.equal(1);
        });
    });

    describe("ProfileGroupbyInfo Constructor Test", function() {
        it("Should have 5 attributes", function() {
            var bucketInfo = new ProfileBucketInfo({
                "bucketSize": 0,
                "table": "testTable",
                "colName": "testCol",
                "max": 1,
                "sum": 1
            });

            var groupbyInfo = new ProfileGroupbyInfo({
                "allNull": true,
                "buckets": {
                    0: bucketInfo
                }
            });

            expect(groupbyInfo).to.be.an.instanceof(ProfileGroupbyInfo);
            expect(Object.keys(groupbyInfo).length).to.equal(5);
            expect(groupbyInfo).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(groupbyInfo).to.have.property("isComplete")
            .and.to.be.false;
            expect(groupbyInfo).to.have.property("nullCount")
            .and.to.equal(0);
            expect(groupbyInfo).to.have.property("allNull")
            .and.to.be.true;
            expect(groupbyInfo).to.have.property("buckets")
            .and.to.be.an("object");
        });
    });

    describe("ProfileInfo Constructor Test", function() {
        it("Should have 8 attributes", function() {
            var profileInfo = new ProfileInfo({
                "id": "testModal",
                "colName": "testCol",
                "frontColName": "testFrontCol",
                "type": "integer"
            });

            expect(profileInfo).to.be.an.instanceof(ProfileInfo);
            expect(Object.keys(profileInfo).length).to.equal(8);
            expect(profileInfo).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(profileInfo).to.have.property("id")
            .and.to.equal("testModal");
            expect(profileInfo).to.have.property("colName")
            .and.to.equal("testCol");
            expect(profileInfo).to.have.property("frontColName")
            .and.to.equal("testFrontCol");
            expect(profileInfo).to.have.property("type")
            .and.to.equal("integer");
            expect(profileInfo).to.have.property("aggInfo")
            .and.to.be.an.instanceof(ProfileAggInfo);
            expect(profileInfo).to.have.property("statsInfo")
            .and.to.be.an.instanceof(ProfileStatsInfo);
            expect(profileInfo).to.have.property("groupByInfo")
            .and.to.be.an.instanceof(ProfileGroupbyInfo);
        });

        it("Should get id", function() {
            var profileInfo = new ProfileInfo({
                "id": "testModal",
                "colName": "testCol",
                "type": "integer"
            });
            expect(profileInfo.getId()).to.equal("testModal");
        });

        it("Should add bucket", function() {
            var profileInfo = new ProfileInfo({
                "id": "testModal",
                "colName": "testCol",
                "type": "integer"
            });
            profileInfo.addBucket(0, {
                "bucketSize": 0,
                "table": "testTable"
            });
            expect(profileInfo.groupByInfo.buckets).to.have.property(0);
        });
    });

    // XX incomplete since the change where monitor query bars are working
    describe("XcQuery Constructor Test", function() {
        it("Should have 17 attributes", function() {
            var xcQuery = new XcQuery({
                "name": "test",
                "fullName": "full test",
                "time": 123,
                "type": "xcFunction",
                "id": 1,
                "numSteps": 2
            });

            expect(xcQuery).to.be.an.instanceof(XcQuery);
            expect(Object.keys(xcQuery).length).to.equal(17);
            expect(xcQuery).to.have.property("version")
            .and.to.equal(currentVersion);
            expect(xcQuery).to.have.property("name")
            .and.to.equal("test");
            expect(xcQuery).to.have.property("time")
            .and.to.equal(123);
            expect(xcQuery).to.have.property("elapsedTime")
            .and.to.equal(0);
            expect(xcQuery).to.have.property("fullName")
            .and.to.equal("full test");
            expect(xcQuery).to.have.property("type")
            .and.to.equal("xcFunction");
            expect(xcQuery).to.have.property("subQueries")
            .and.to.be.an("array");
            expect(xcQuery).to.have.property("id")
            .and.to.equal(1);
            expect(xcQuery).to.have.property("numSteps")
            .and.to.equal(2);
            expect(xcQuery).to.have.property("currStep")
            .and.to.equal(0);
            expect(xcQuery).to.have.property("outputTableName")
            .and.to.equal("");
            expect(xcQuery).to.have.property("outputTableState")
            .and.to.equal("");
            expect(xcQuery).to.have.property("queryStr")
            .and.to.equal("");
            expect(xcQuery).to.have.property("srcTables")
            .and.to.be.null;
            expect(xcQuery).to.have.property("sqlNum")
            .and.to.be.null;
            expect(xcQuery).to.have.property("state")
            .and.to.equal(QueryStateT.qrNotStarted);
            expect(xcQuery).to.have.property("cancelable")
            .and.to.be.true;
        });

        it("XcQuery OOP function should work", function() {
            var xcQuery = new XcQuery({
                "name": "test2",
                "fullName": "full test2",
                "time": 456,
                "state": QueryStateT.qrProcessing
            });

            expect(xcQuery.getName()).to.equal("test2");
            expect(xcQuery.getFullName()).to.equal("full test2");
            expect(xcQuery.getTime()).to.equal(456);
            expect(xcQuery.getState()).to.equal(QueryStateT.qrProcessing);
            expect(xcQuery.getStateString()).to.equal("qrProcessing");
        });
    });
});
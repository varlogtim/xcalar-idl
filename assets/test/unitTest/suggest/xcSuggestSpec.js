describe('xcSuggest', function() {
    describe("Setup ML Engine", function() {
        it("setup should work", function() {
            expect(xcSuggest.setup()).to.be.true;
            expect(xcSuggest.__testOnly__.getEngine()).to.not.be.undefined;
        });
    });

    describe("Join Key Heuristic", function() {
        it("Process Heuristic Inputs should work", function() {
            // TODO: processJoinKeyInputsHeuristic
        });

        it("Suggest Heuristic should work", function() {
            // TODO: suggestJoinKeyHeuristic
        });
    });

    describe("Join Key ML", function() {
        it("Process ML Inputs should work", function() {
            // TODO: processJoinKeyInputsHeuristic
        });

        it("Suggest ML should work", function() {
            // TODO: suggestJoinKeyML
        });
    });

    describe('Join Key & Support', function() {


        it('contextCheck should work', function() {

            var contextCheck = xcSuggest.__testOnly__.contextCheck;
            function contextEq(context1, context2) {
                var maxEq = (context1.max == context2.max);
                var minEq = (context1.min == context2.min);
                var avgEq = (context1.avg == context2.avg);
                var sig2Eq = (context1.sig2 == context2.sig2);
                var valLenEq = (context1.vals.length == context2.vals.length);
                var valsEq = valLenEq;
                if (valsEq) {
                    for (i = 0; i < context1.vals.length; i++) {
                        // Won't work for objects
                        if (context1.vals[i] != context2.vals[i]) {
                            valsEq = false;
                            break;
                        }
                    }

                }
                return (maxEq && minEq && avgEq &&
                        sig2Eq && valLenEq && valsEq);
            }

            var nullContext = {
                "max": 0,
                "min": 0,
                "avg": 0,
                "sig2":0,
                "vals":[]
            };
            // ContextCheck takes requiredInfo, uses RI.type and RI.data
            var emptyArrayIntRI = {
                "type": ColumnType.integer,
                "data": []
            };
            var emptyArrayIntCX = contextCheck(emptyArrayIntRI);

            var zeroIntRI = {
                "type": ColumnType.integer,
                "data": ["0"]
            };
            var zeroIntCX = contextCheck(zeroIntRI);

            var singletonNonZeroIntRI = {
                "type": ColumnType.integer,
                "data": ["1"]
            };
            var singletonNonZeroIntCX = contextCheck(singletonNonZeroIntRI);

            var nonZeroIntRI = {
                "type": ColumnType.integer,
                "data": ["1", "2"]
            };
            var nonZeroIntCX = contextCheck(nonZeroIntRI);

            var nonZeroAltIntRI = {
                "type": ColumnType.integer,
                "data": ["1", "3"]
            };

            var nonZeroAltIntCX = contextCheck(nonZeroAltIntRI);

            var mixedNullIntRI = {
                "type": ColumnType.integer,
                "data": ["1", null, "2"]
            };
            var mixedNullIntCX = contextCheck(mixedNullIntRI);


            var emptyArrayStringRI = {
                "type": ColumnType.string,
                "data": []
            };
            var emptyArrayStringCX = contextCheck(emptyArrayStringRI);


            var emptyStringRI = {
                "type": ColumnType.string,
                "data": [""]
            };
            var emptyStringCX = contextCheck(emptyStringRI);


            var nonEmptySingletonStringRI = {
                "type": ColumnType.string,
                "data": ["a"]
            };
            var nonEmptySingletonStringCX = contextCheck(nonEmptySingletonStringRI);


            var nonEmptyStringRI = {
                "type": ColumnType.string,
                "data": ["a", "b"]
            };
            var nonEmptyStringCX = contextCheck(nonEmptyStringRI);


            var diffLenStringRI = {
                "type": ColumnType.string,
                "data": ["a", "bcdefghij"]
            };
            var diffLenStringCX = contextCheck(diffLenStringRI);


            var mixedEmptyStringRI = {
                "type": ColumnType.string,
                "data": ["a", "", "b"]
            };
            var mixedEmptyStringCX = contextCheck(mixedEmptyStringRI);


            var invalidTypeRI = {
                "type": ColumnType.object,
                "data": []
            };
            var invalidTypeCX = contextCheck(invalidTypeRI);

            expect(contextEq(emptyArrayIntCX, nullContext)).to.be.true;
            expect(contextEq(zeroIntCX, nullContext)).to.be.false;
            expect(contextEq(singletonNonZeroIntCX, zeroIntCX)).to.be.false;
            expect(contextEq(singletonNonZeroIntCX, nonZeroIntCX)).to.be.false;
            expect(contextEq(nonZeroAltIntCX, nonZeroIntCX)).to.be.false
            // Should skip null entries
            expect(contextEq(mixedNullIntCX, nonZeroIntCX)).to.be.true;

            expect(contextEq(emptyArrayStringCX, nullContext)).to.be.true;
            expect(contextEq(emptyStringCX, nullContext)).to.be.true;
            expect(contextEq(nonEmptySingletonStringCX, nullContext)).to.be.false;
            expect(contextEq(nonEmptySingletonStringCX, nonEmptyStringCX)).to.be.false;
            expect(contextEq(diffLenStringCX, nonEmptyStringCX)).to.be.false;
            // Should skip null entries
            expect(contextEq(mixedEmptyStringCX, nonEmptyStringCX)).to.be.true;

            // Invalid type
            expect(contextEq(invalidTypeCX, nullContext)).to.be.true;
        });

        it.skip('getScore should work', function() {
            // TODO: refactor and unskip this to fall in line with getScore refactor
            var getScore = xcSuggest.__testOnly__.getScore;

            var nullContext = {
                "max" : 0,
                "min" : 0,
                "avg" : 0,
                "sig2": 0,
                "vals": []
            };

            var fullContext = {
                "max" : 10000,
                "min" : 72,
                "avg" : 5700.5,
                "sig2": 42.3,
                "vals": [10000, 72, 5700]
            };

            var nullTD = 0.0;

            var max1CX = {
                "max" : 1,
                "min" : 0,
                "avg" : 0,
                "sig2": 0,
                "vals": []
            };

            var max2CX = {
                "max" : 10,
                "min" : 0,
                "avg" : 0,
                "sig2": 0,
                "vals": []
            };

            var min1CX = {
                "max" : 0,
                "min" : -1,
                "avg" : 0,
                "sig2": 0,
                "vals": []
            };

            var min2CX = {
                "max" : 0,
                "min" : -10,
                "avg" : 0,
                "sig2": 0,
                "vals": []
            };

            var avg1CX = {
                "max" : 0,
                "min" : 0,
                "avg" : 1,
                "sig2": 0,
                "vals": []
            };

            var avg2CX = {
                "max" : 0,
                "min" : 0,
                "avg" : 10,
                "sig2": 0,
                "vals": []
            };

            var sig21CX = {
                "max" : 0,
                "min" : 0,
                "avg" : 0,
                "sig2": 1,
                "vals": []
            };

            var sig22CX = {
                "max" : 0,
                "min" : 0,
                "avg" : 0,
                "sig2": 10,
                "vals": []
            };

            var strCX = {
                "max" : 5,
                "min" : 5,
                "avg" : 5,
                "sig2": 0,
                "vals": ["hello"]
            };

            var strMatchCX = {
                "max" : 5,
                "min" : 5,
                "avg" : 5,
                "sig2": 0,
                "vals": ["byeby", "hello"]
            };

            var strNoMatchCX = {
                "max" : 5,
                "min" : 5,
                "avg" : 5,
                "sig2": 0,
                "vals": ["nuupe", "match"]
            };

            var intCX = {
                "max" : 100,
                "min" : 100,
                "avg" : 100,
                "sig2": 0,
                "vals": [100]
            };

            var intMatchCX = {
                "max" : 100,
                "min" : 100,
                "avg" : 100,
                "sig2": 0,
                "vals": [100,100]
            };

            // Doesn't make much sense but necessary to test int match
            var intNoMatchCX = {
                "max" : 100,
                "min" : 100,
                "avg" : 100,
                "sig2": 0,
                "vals": [20, 10]
            };

            // Checking to see if context params effect score correctly
            // TODO: Uncomment when calcSim is refactored
            // expect(getScore(nullContext, max1CX, nullTD, ColumnType.integer))
            // .to.be.above(getScore(max2CX, max1CX, nullTD, ColumnType.integer));
            // expect(getScore(nullContext, min1CX, nullTD, ColumnType.integer))
            // .to.be.above(getScore(min2CX, min1CX, nullTD, ColumnType.integer));
            // expect(getScore(nullContext, avg1CX, nullTD, ColumnType.integer))
            // .to.be.above(getScore(avg2CX, avg1CX, nullTD, ColumnType.integer));
            // expect(getScore(nullContext, sig21CX, nullTD, ColumnType.integer))
            // .to.be.above(getScore(sig22CX, sig21CX, nullTD, ColumnType.integer));

            // Checking to see if title distance effects score correctly
            expect(getScore(nullContext, nullContext, nullTD, ColumnType.integer))
            .to.be.above(getScore(nullContext, nullContext, 10.1, ColumnType.integer, 0));

            // Checking to see if bucket matches matter correctly
            // TODO: Uncomment once Match is refactored
            // expect(getScore(strCX, strMatchCX, nullTD, ColumnType.string))
            // .to.be.above(getScore(strCX, strNoMatchCX, nullTD, ColumnType.string));
            // expect(getScore(intCX, intMatchCX, nullTD, ColumnType.integer))
            // .to.equal(getScore(intCX, intNoMatchCX, nullTD, ColumnType.integer));

            // Checking reflexivity
            expect(getScore(nullContext, fullContext, 10.1, ColumnType.integer))
            .to.be.equal(getScore(fullContext, nullContext, 10.1, ColumnType.integer, 0));

        });

        it('calcSim should work', function() {
            // TODO: implement once calcSim is refactored

        });

        it('titleDist should work', function() {
            var autoGen = "columnAG";
            var name1 = "test1";
            var name2 = "test2";
            var name3 = "sizeP";
            var name4 = "supercalifragilisticexpialadocious";
            var emptyName = ""; // Does empty title ever happen?

            expect(xcSuggest.__testOnly__.getTitleDistance(autoGen, name1)).to.equal(0);
            var sim1 = xcSuggest.__testOnly__.getTitleDistance(name1, name2);
            var sim2 = xcSuggest.__testOnly__.getTitleDistance(name1, name3);
            var sim3 = xcSuggest.__testOnly__.getTitleDistance(name1, name4);
            var simEmpty1 = xcSuggest.__testOnly__.getTitleDistance(emptyName, name1);
            var simEmpty2 = xcSuggest.__testOnly__.getTitleDistance(emptyName, name3);

            // Assume: lower is more similar
            expect(sim1).to.be.below(sim2);
            expect(sim2).to.be.below(sim3);
            expect(simEmpty1).to.equal(simEmpty2);
            expect(sim2).to.be.most(simEmpty1);
        });

        it('suggestJoinKey should work', function() {
            var emptyColInfoNum = {
                "type" : ColumnType.integer,
                "name" : "",
                "data" : [""]
            };

            var emptyColInfoTitleNum = {
                "type" : ColumnType.integer,
                "name" : "numcol1",
                "data" : [""]
            };

            var singletonColInfoNum = {
                "type" : ColumnType.integer,
                "name" : "numcol2",
                "data" : ["0"]
            };

            var colInfoNum = {
                "type" : ColumnType.integer,
                "name" : "numcol3",
                "data" : ["0", "1"]
            };

            var colHasEmptyInfoNum = {
                "type" : ColumnType.integer,
                "name" : "numcol4",
                "data" : ["0", "", "1"]
            };

            var colHasEmptyDisorderInfoNum = {
                "type" : ColumnType.integer,
                "name" : "numcol5",
                "data" : ["1", "", "0"]
            };

            var colHasNullDisorderInfoNum = {
                "type" : ColumnType.integer,
                "name" : "numcol6",
                "data" : ["1", null, "0"]
            };

            var emptyColInfoStr = {
                "type" : ColumnType.string,
                "name" : "",
                "data" : [""]
            };

            var emptyColInfoTitleStr = {
                "type" : ColumnType.string,
                "name" : "strcol1",
                "data" : [""]
            };

            var singletonColInfoStr = {
                "type" : ColumnType.string,
                "name" : "strcol2",
                "data" : ["0"]
            };

            var colInfoStr = {
                "type" : ColumnType.string,
                "name" : "strcol3",
                "data" : ["0", "1"]
            };

            var colHasEmptyInfoStr = {
                "type" : ColumnType.string,
                "name" : "strcol4",
                "data" : ["0", "", "1"]
            };

            var colHasEmptyDisorderInfoStr = {
                "type" : ColumnType.string,
                "name" : "strcol5",
                "data" : ["1", "", "0"]
            };

            var colHasNullDisorderInfoStr = {
                "type" : ColumnType.string,
                "name" : "strcol6",
                "data" : ["1", null, "0"]
            };

            var singletonColInfoChaStr = {
                "type" : ColumnType.string,
                "name" : "chastrcol2",
                "data" : ["a"]
            };

            var colInfoChaStr = {
                "type" : ColumnType.string,
                "name" : "chastrcol3",
                "data" : ["a", "b"]
            };

            var colHasEmptyInfoChaStr = {
                "type" : ColumnType.string,
                "name" : "chastrcol4",
                "data" : ["a", "", "b"]
            };

            var colHasEmptyDisorderInfoChaStr = {
                "type" : ColumnType.string,
                "name" : "chastrcol5",
                "data" : ["b", "", "a"]
            };

            var colHasNullDisorderInfoChaStr = {
                "type" : ColumnType.string,
                "name" : "chastrcol6",
                "data" : ["b", null, "a"]
            };

            // TODO: double check that is format that obj strings
            // come in as
            var colInfoObject = {
                "type" : ColumnType.object,
                "name" : "objcol1",
                "data" : ["{hehe: hoho}"]
            };

            function mkIn(srcCol, destCols) {
                function infoDeepCpy(colInfo) {
                    var retObj = {
                        "type" :colInfo.type,
                        "name" :colInfo.name,
                        "data" :colInfo.data
                    };
                    return retObj;
                }
                var srcInfo = infoDeepCpy(srcCol);
                srcInfo.uniqueIdentifier = -1;
                var destInfos = [];
                for (i = 0; i < destCols.length; i++) {
                    destInfos.push(infoDeepCpy(destCols[i]));
                    destInfos[i].uniqueIdentifier = i;
                }
                return {"srcColInfo": srcInfo, "destColsInfo": destInfos};
            }

            // Check against empty dest table.
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoNum,[])).colToSugg)
            .to.be.null;
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoTitleNum,[])).colToSugg)
            .to.be.null;
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoNum,[])).colToSugg)
            .to.be.null;
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoStr,[])).colToSugg)
            .to.be.null;
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoTitleStr,[])).colToSugg)
            .to.be.null;
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoStr,[])).colToSugg)
            .to.be.null;


            // Check that types must match
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoNum,[emptyColInfoNum])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoNum,[emptyColInfoStr])).colToSugg)
            .to.be.null;
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoNum,[colInfoObject])).colToSugg)
            .to.be.null;

            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoStr,[emptyColInfoStr])).colToSugg)
            .to.be.equal(0); // ML Fails this
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoStr,[emptyColInfoNum])).colToSugg)
            .to.be.null;
            expect(xcSuggest.suggestJoinKey(mkIn(emptyColInfoStr,[colInfoObject])).colToSugg)
            .to.be.null;

            // Check basic similarity and that empty elements don't cause regression
            // (Bug 6784)
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoNum,[singletonColInfoNum])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoNum,[
                singletonColInfoNum,
                colInfoNum
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoNum,[
                singletonColInfoNum,
                colHasEmptyInfoNum
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoNum,[
                singletonColInfoNum,
                colHasEmptyDisorderInfoNum
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoNum,[
                singletonColInfoNum,
                colHasNullDisorderInfoNum
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(colHasEmptyInfoNum,[
                singletonColInfoNum,
                colHasEmptyDisorderInfoNum
            ])).colToSugg)
            .to.be.equal(1);
            expect(xcSuggest.suggestJoinKey(mkIn(colHasNullDisorderInfoNum,[
                singletonColInfoNum,
                colHasNullDisorderInfoNum
            ])).colToSugg)
            .to.be.equal(1);

            ///// BEGIN ML FAIL BLOCK /////
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoStr,[singletonColInfoStr])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoStr,[
                singletonColInfoStr,
                colInfoStr
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoStr,[
                singletonColInfoStr,
                colHasEmptyInfoStr
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoStr,[
                singletonColInfoStr,
                colHasEmptyDisorderInfoStr
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoStr,[
                singletonColInfoStr,
                colHasNullDisorderInfoStr
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(colHasEmptyInfoStr,[
                singletonColInfoStr,
                colHasEmptyDisorderInfoStr
            ])).colToSugg)
            .to.be.equal(1);
            expect(xcSuggest.suggestJoinKey(mkIn(colHasNullDisorderInfoStr,[
                singletonColInfoStr,
                colHasNullDisorderInfoStr
            ])).colToSugg)
            .to.be.equal(1);

            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoChaStr,[singletonColInfoChaStr])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoChaStr,[
                singletonColInfoChaStr,
                colInfoChaStr
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoChaStr,[
                singletonColInfoChaStr,
                colHasEmptyInfoChaStr
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoChaStr,[
                singletonColInfoChaStr,
                colHasEmptyDisorderInfoChaStr
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(singletonColInfoChaStr,[
                singletonColInfoChaStr,
                colHasNullDisorderInfoChaStr
            ])).colToSugg)
            .to.be.equal(0);
            expect(xcSuggest.suggestJoinKey(mkIn(colHasEmptyInfoChaStr,[
                singletonColInfoChaStr,
                colHasEmptyDisorderInfoChaStr
            ])).colToSugg)
            .to.be.equal(1);
            expect(xcSuggest.suggestJoinKey(mkIn(colHasNullDisorderInfoChaStr,[
                singletonColInfoChaStr,
                colHasNullDisorderInfoChaStr
            ])).colToSugg)
            .to.be.equal(1);
            ///// END ML FAIL BLOCK /////

            // Multitype tests
            expect(xcSuggest.suggestJoinKey(mkIn(colInfoNum,[
                colHasEmptyDisorderInfoNum,
                colInfoStr,
                colInfoChaStr,
                colHasNullDisorderInfoChaStr
                ])).colToSugg)
            .to.be.equal(0);
        });
    });

    describe("Join Key Data Submission", function() {
        it("Suggest Data construction should work", function() {
            // TODO: addSuggestFeatures, addSuggestLables,
            //       addMetaData, addIsValid
        });


        it("Suggest Data Validation should work", function() {
            // TODO: checkSuggestDataPortionsMatch,
            //       checkSuggestDataPortionsValid,
            //       checkSuggestDataPortionsFilled,
            //       isValidJoinKeySubmitData
        });

        it("Submit Data should work", function() {
            // TODO: processJoinKeySubmitData
            //       submitJoinKeyData
        });
    });

    describe("Preview Data Detection Test", function() {
        it("xcSuggest.detectFormat should work", function() {
            var tests = [{
                "data"  : ["[{\"test\"}"],
                "expect": DSFormat.JSON
            }, {
                "data"  : ["[", "{\"test\"}"],
                "expect": DSFormat.JSON
            }, {
                "data"  : ["{\"test\": \"val\"}"],
                "expect": DSFormat.SpecialJSON
            }, {
                "data"  : ["", "{\"test\": \"val\"}"],
                "expect": DSFormat.SpecialJSON
            }, {
                "data"  : ["abc"],
                "expect": DSFormat.CSV
            }];

            tests.forEach(function(test) {
                var rawRows = test.data;
                expect(xcSuggest.detectFormat(rawRows)).to.equal(test.expect);
            });
        });

        it("xcSuggest.detectDelim should work", function() {
            var tests = [{
                "data"  : "a,b,c,d",
                "expect": ","
            }, {
                "data"  : "a\tb\tc\te",
                "expect": "\t"
            }, {
                "data"  : "a,b,c\td",
                "expect": ","
            }, {
                "data"  : "a\tb\tc,d",
                "expect": "\t"
            }, {
                "data"  : "a\tb|c,d",
                "expect": ","
            }, {
                "data"  : "a\tb|c,d",
                "expect": ","
            }, {
                "data"  : "a|b|c,d",
                "expect": "|"
            }, {
                "data"  : "abcd",
                "expect": ""
            }];

            tests.forEach(function(test) {
                var rawStr = test.data;
                expect(xcSuggest.detectDelim(rawStr)).to.equal(test.expect);
            });
        });

        it("xcSuggest.detectHeader should work", function() {
            var tests = [{
                "data"  : [],
                "expect": false
            }, {
                "data"  : [["Col0"], ["Col1"]],
                "expect": false
            }, {
                "data"  : [["1", "2"], ["Col1", "Col2"]],
                "expect": false
            }, {
                "data"  : [["", "Col1"], ["1", "2"]],
                "expect": false
            }, {
                "data"  : [["Col1", "Col2"], ["1", "2"]],
                "expect": true
            }, {
                "data"  : [["Header1", "Header2"], ["a", "b"], ["a", "b"]],
                "expect": true
            }, {
                "data"  : [["a", "b"], ["a", "b"], ["a", "b"]],
                "expect": false
            }];

            tests.forEach(function(test) {
                var parsedRows = test.data;
                expect(xcSuggest.detectHeader(parsedRows))
                .to.equal(test.expect);
            });
        });
    });
});

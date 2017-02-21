describe('UExtTF', function() {
    var imgRecTrainArgs = {
        "dsName": "trainResults",
        "algorithm": "ImgRecCNN",
        "maxSteps": 12,
        "dataLoc": "/netstore/users/disenberg/datasets/catsdogscars-preproc/train"
    };

    var imgRecTestArgs = {
        "dsName": "imgRecTestResults",
        "algorithm": "ImgRecCNN",
        "uniqueTag": undefined,
        "dataLoc": "/netstore/users/disenberg/datasets/catsdogscars-preproc/test"
    };

    describe('UnitTest Test', function() {
        it('UT test 1', function() {
            expect(true).to.be.true;
        });
    });
    describe('Check Uniqueness Parameters.', function() {
        // TODO: Do tests on getUniqueTagParams
        // Problem: can assign user and window beforehand?
        // Is this even necessary?  Thin wrapper.
    });

    describe('Check Image Recognition Correct', function() {
        var tableOfInterest;
        var prevTag;
        var curTag;

        afterEach(function() {
            if (tableOfInterest !== undefined) {
                // TODO: Is actually active?
                TblManager.deleteTables(tableOfInterest, TableType.Active);
                tableOfInterest = undefined;
            }
            //TODO: delete dataset
        });

        it('should run tf train image rec', function(done) {
            prevTag = UExtTF.__testOnly__.loadLocalTag();
            if (typeof prevTag !== 'undefined') {
                prevTag = prevTag.uniqueTag;
            }
            ExtensionManager.trigger(null,
                                    "UExtTF",
                                    "tfTrain",
                                    imgRecTrainArgs,
                                    undefined)
            .then(function (extResponse) {
                // TODO: make this return an object.
                curTag = extResponse.uniqueTag;
                tableName = extResponse.tableName;

                expect(curTag).to.not.equal(prevTag);
                expect(curTag).to.equal(UExtTF.__testOnly__.loadLocalTag());
                prevTag = curTag;

                var tableId = xcHelper.getTableId(tableName);
                var resultTable = gTables[tableId];
                expect(resultTable.resultSetCount).to.equal(248);

                tableOfInterest = tableId;
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });
        it('should run tf test image rec', function(done) {
            imgRecTestArgs.uniqueTag = curTag;
            ExtensionManager.trigger(null,
                                    "UExtTF",
                                    "tfTest",
                                    imgRecTestArgs,
                                    undefined)
            .then(function (extResponse) {
                curTag = extResponse.uniqueTag;
                tableName = extResponse.tableName;

                expect(curTag).to.equal(prevTag);
                expect(curTag).to.equal(UExtTF.__testOnly__.loadLocalTag());
                tableId = xcHelper.getTableId(tableName);
                resultTable = gTables[tableId];
                expect(resultTable.resultSetCount).to.equal(300);

                tableOfInterest = tableId;
                done();
            })
            .fail(function(error) {
                throw error;
            });
        });
    });
});

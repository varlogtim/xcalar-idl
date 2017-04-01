// setup should happen before load test files
// --badil: will stop when first test fails
mocha.setup({
    "ui": "bdd",
    "bail": true,
    // must include Setup Test and optionally include other test
    // e.g. /Mocha Setup Test|Workbook Test/
    // default:
    // "grep": /Mocha Setup Test|.*/
    "grep": /Mocha Setup Test|.*/
});
// global
expect = chai.expect;
assert = chai.assert;

var testDatasets = {
    "sp500": {
        "path": "nfs:///netstore/datasets/sp500.csv",
        "url": "netstore/datasets/sp500.csv",
        "format": "CSV",
        "fieldDelim": "\t",
        "lineDelim": "\n",
        "hasHeader": false,
        "moduleName": "",
        "funcName": "",
        "pointCheck": "#previewTable td:contains(20041101)"
    },

    "schedule": {
        "path": "nfs:///netstore/datasets/indexJoin/schedule/",
        "url": "netstore/datasets/indexJoin/schedule/",
        "format": "JSON",
        "moduleName": "",
        "funcName": "",
        "pointCheck": "#previewTable td:contains(1)"
    },

    "fakeYelp": {
        "path": "nfs:///netstore/datasets/unittest/test_yelp.json",
        "url": "netstore/datasets/unittest/test_yelp.json",
        "format": "JSON",
        "moduleName": "",
        "funcName": "",
        "pointCheck": "#previewTable th:eq(1):contains(yelping_since)"
    }
};

window.UnitTest = (function(UnitTest, $) {
    var minModeCache;

    UnitTest.setup = function() {
        $(document).ready(function() {
            mocha.run();
            console.log("Setup code coverage!!!");
        });

        $("#toggleXC").click(function() {
            $("#xc").toggle();
        });

        $("#toggleTest").click(function() {
            $("#unitTestBody").toggleClass("hideTest");
        });

        $("#toggleCoverage").click(function() {
            $("#unitTestBody").toggleClass("hideCoverage");
        });

        $('#backXC').click(function() {
            var promise = TblManager.freeAllResultSetsSync();
            PromiseHelper.alwaysResolve(promise)
            .then(Support.releaseSession)
            .then(function() {
                xcManager.removeUnloadPrompt();
                window.location = paths.indexAbsolute;
            })
            .fail(function(error) {
                console.error(error);
            });
        });

        $('#toggleTestSize').click(function() {
            $('#mocha').toggleClass('small');
        });

        $('#toggleXCSize').click(function() {
            $('#xc').toggleClass('large');
        });

        var prevPct = null;
        window.mochaPct = 0;
        consolePct();

        function consolePct() {
            setTimeout(function() {
                if (!ifvisible.now()) {
                    if (prevPct === window.mochaPct) {
                        console.info("Test is still " + window.mochaPct + "% completed");
                    } else {
                        console.info(window.mochaPct + "% completed");
                    }
                }
                prevPct = window.mochaPct;
                if (window.mochaPct === 100) {
                    console.info("TEST FINISHED");
                } else {
                    consolePct();
                }
            }, 10000);
        }

        // Uncomment this to add button to increase blanket size.

        // $('#toggleCoverageSize').click(function() {
        //     $('#blanket-main').toggleClass('large');
        // });
    };

    UnitTest.testFinish = function(checkFunc) {
        var deferred = jQuery.Deferred();
        var checkTime = 200;
        var outCnt = 80;
        var timeCnt = 0;

        var timer = setInterval(function() {
            var res = checkFunc();
            if (res === true) {
                // make sure graphisc shows up
                clearInterval(timer);
                deferred.resolve();
            } else if (res === null) {
                clearInterval(timer);
                deferred.reject("Check Error!");
            } else {
                console.info("check not pass yet!");
                timeCnt += 1;
                if (timeCnt > outCnt) {
                    clearInterval(timer);
                    console.error("Time out!", checkFunc);
                    deferred.reject("Time out");
                }
            }
        }, checkTime);

        return deferred.promise();
    };

    UnitTest.addDS = function(testDSObj, dsName) {
        var deferred = jQuery.Deferred();
        if (dsName == null) {
            dsName = "uniteTest";
        }

        dsName = dsName + Math.floor(Math.random() * 10000);

        var url = testDSObj.url;
        var pointCheck = testDSObj.pointCheck || "";
        $("#dataStoresTab").click();
        if (!$("#inButton").hasClass('active')) {
            $("#inButton").click();
        }

        TestSuite.__testOnly__.loadDS(dsName, url, pointCheck)
        .then(function() {
            deferred.resolve(dsName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    UnitTest.addTable = function(dsName) {
        var deferred = jQuery.Deferred();

        if (!$("#dataStoresTab").hasClass("active")) {
            $("#dataStoresTab").click();
            if (!$("#inButton").hasClass('active')) {
                $("#inButton").click();
            }
        }

        // XXX this create table way doesn't make sure
        // creating process is finishing
        // need to refine

        var sortColumnsAtoZ = true;
        TestSuite.__testOnly__.createTable(dsName, sortColumnsAtoZ)
        .then(function(tableName, prefix) {
            setTimeout(function() {
                deferred.resolve(tableName, prefix);
            }, 500);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    // add both ds and table
    // deferred dsName, tableName
    UnitTest.addAll = function(testDSObj, dsName) {
        var deferred = jQuery.Deferred();
        var testDS;

        UnitTest.addDS(testDSObj, dsName)
        .then(function(res) {
            testDS = res;
            return UnitTest.addTable(res);
        })
        .then(function(tableName, prefix) {
            deferred.resolve(testDS, tableName, prefix);
        })
        .fail(function(error) {
            console.error("Add fail", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    UnitTest.deleteTable = function(table, type) {
        type = type || TableType.Active;
        var tableId;
        if (type === TableType.Orphan) {
            tableId = table;
        } else {
            tableId = xcHelper.getTableId(table);
        }
        return TblManager.deleteTables(tableId, type, true);
    };

    UnitTest.deleteDS = function(dsName) {
        var deferred = jQuery.Deferred();
        var $grid = DS.getGridByName(dsName);
        var dsId = $grid.data("dsid");
        var dsObj = DS.getDSObj(dsId);

        DS.__testOnly__.delDSHelper($grid, dsObj, {"failToShow": true})
        .always(function() {
            // now seems we have issue to delete ds because of ref count,
            // this should be reolsved with now backend way to hanld ds
            deferred.resolve();
        });

        return deferred.promise();
    };

    UnitTest.deleteAll = function(table, ds) {
        var deferred = jQuery.Deferred();

        UnitTest.deleteTable(table)
        .then(function() {
            return UnitTest.deleteDS(ds);
        })
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("Delete fail", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    UnitTest.deleteAllTables = function() {
        var deferred = jQuery.Deferred();

        DeleteTableModal.show(true)
        .then(function() {
            $('#deleteTableModal').find('.listSection .checkbox')
                                  .addClass('checked');
            return PromiseHelper.alwaysResolve(DeleteTableModal.__testOnly__.submitForm());
        })
        .then(function() {
            return DeleteTableModal.__testOnly__.closeModal();
        })
        .then(deferred.resolve);

        return deferred.promise();
    };

    UnitTest.onMinMode = function() {
        minModeCache = gMinModeOn;
        gMinModeOn = true;
    };

    UnitTest.offMinMode = function() {
        gMinModeOn = minModeCache;
        minModeCache = null;
    };

    UnitTest.hasStatusBoxWithError = function(error) {
        var $statusBox = $("#statusBox");
        assert.isTrue($statusBox.is(":visible"));
        expect($statusBox.find(".message").text()).to.equal(error);
        StatusBox.forceHide();
    };

    UnitTest.hasAlertWithTitle = function(title, options) {
        options = options || {};
        var $alertModal = $("#alertModal");
        assert.isTrue($alertModal.is(":visible"));
        title = title.toLowerCase();
        expect($("#alertHeader .text").text().toLowerCase()).to.equal(title);
        if (options.inputVal != null) {
            $alertModal.find('input').val(options.inputVal);
        }
        if (options.confirm) {
            $alertModal.find(".confirm").eq(0).click();
        } else {
            $alertModal.find(".cancel").click();
        }

        if (!options.nextAlert) {
            assert.isFalse($alertModal.is(":visible"));
        }
    };

    UnitTest.hasAlertWithText = function(text, options) {
        options = options || {};
        var $alertModal = $("#alertModal");
        assert.isTrue($alertModal.is(":visible"));
        expect($("#alertContent .text").text()).to.equal(text);
        if (options.inputVal != null) {
            $alertModal.find('input').val(options.inputVal);
        }
        if (options.confirm) {
            $alertModal.find(".confirm").eq(0).click();
        } else {
            $alertModal.find(".cancel").click();
        }

        if (!options.nextAlert) {
            assert.isFalse($alertModal.is(":visible"));
        }
    };

    UnitTest.timeoutPromise = function(amtTime) {
        var waitTime = amtTime || 1000;
        var deferred = PromiseHelper.deferred();
        setTimeout(function() {
            deferred.resolve();
        }, waitTime);
        return deferred;
    };

    UnitTest.removeOrphanTable = function() {
        var deferred = jQuery.Deferred();

        TableList.refreshOrphanList()
        .then(function() {
            return TblManager.deleteTables(gOrphanTables, TableType.Orphan);
        })
        .then(deferred.resolve)
        .fail(deferred.resolve);

        return deferred.promise();
    };

    return (UnitTest);
}({}, jQuery));

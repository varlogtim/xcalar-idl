window.UnitTest = (function(UnitTest) {
    UnitTest.addDS = function(testDSObj, dsName) {
        var deferred = jQuery.Deferred();
        if (dsName == null) {
            dsName = "uniteTest";
        }

        dsName = dsName + Math.floor(Math.random() * 10000);

        var url = testDSObj.url;
        var pointCheck = testDSObj.pointCheck || "";
        $("#dataStoresTab").click();

        TestSuite.__testOnly__.loadDS(dsName, url, pointCheck)
        .then(function() {
            deferred.resolve(dsName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    UnitTest.addTable = function(dsName) {
        return TestSuite.__testOnly__.createTable(dsName);
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

    UnitTest.deleteTable = function(table) {
        var tableId = xcHelper.getTableId(table);
        return TblManager.deleteTables(tableId, TableType.Active, true);
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

    return (UnitTest);
}({}));
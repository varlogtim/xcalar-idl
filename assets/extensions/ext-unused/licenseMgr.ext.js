window.UExtLicenseMgr = (function(UExtLicenseMgr) {
    UExtLicenseMgr.buttons = [
        {
            "buttonText": "View License Tables",
            "fnName": "viewLicense"
        },
        {
            "buttonText": "Issue license",
            "fnName": "issueLicense",
            "arrayOfFields": [
                {
                    "type": "string",
                    "name": "Name",
                    "fieldClass": "customerName"
                },
                {
                    "type": "string",
                    "name": "Organization",
                    "fieldClass": "customerOrg"
                },
                {
                    "type": "string",
                    "name": "License Key",
                    "fieldClass": "customerLicense"
                },
                {
                    "type": "boolean",
                    "name": "Create ZenDesk account",
                    "fieldClass": "createZenDeskAcct"
                }
            ]
        },
        {
            "buttonText": "Create new license",
            "fnName": "newLicense"
        }
    ];

    UExtLicenseMgr.configParams = {
        "notTableDependent": true
    };

    UExtLicenseMgr.actionFn = function(fnName) {
        switch (fnName) {
            case "viewLicense":
                return viewLicense();
            case "issueLicense":
                return issueLicense();
            case "newLicense":
                return newLicense();
            default:
                return null;
        }
    }

    function newLicense() {
        var ext = new XcSDK.Extension();
        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();
            // XXX Please implement me
            return deferred.reject("Not implemented").promise();
        }
        return ext;
    }

    function issueLicense() {
        var ext = new XcSDK.Extension();
        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();
            var self = this;
            var args = self.getArgs();
            var data = {
                "secret": "xcalarS3cret",
                "name": args.customerName,
                "organization": args.customerOrg,
                "key": args.customerLicense
            };

            $.ajax({
                "type": "POST",
                "contentType": "application/json",
                //"url": "https://zd.xcalar.net/license/api/v1.0/secure/addlicense",
                "url": "https://x3xjvoyc6f.execute-api.us-west-2.amazonaws.com/production/license/api/v1.0/secure/addlicense",
                "crossdomain": true,
                "data": JSON.stringify(data),
                "success": function () {
                    deferred.resolve("Successfully created license");
                    xcHelper.showSuccess("License successfully created");
                },
                "error": function() {
                    deferred.reject("Failed to create license");
                }
            });

            return deferred.promise();
        }
        return ext;
    }

    function viewLicense() {
        var ext = new XcSDK.Extension();
        var licenseTables = [ "license", "owner", "organization", "activation", "marketplace" ]

        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();
            var extDeferred = XcSDK.Promise.resolve().promise();

            for (var ii = 0; ii < licenseTables.length; ii++) {
                // This is necessary because of late binding of javascript.
                // By the time this function gets executed, ii may
                // already be at the very last
                (function (licenseTable) {
                    var licenseTableCopy = licenseTable;
                    var newTableName = ext.createTableName(licenseTable);

                    extDeferred = extDeferred.then(function() {
                        return (ext.load( { url: "memory://1"},
                                          { format: "json", moduleName: "licensemgr", funcName: "getTable", udfQuery: {tableName: licenseTable} }, licenseTableCopy))
                    });

                    extDeferred = extDeferred.then(function(dsName) {
                        return (ext.indexFromDataset(dsName, newTableName, licenseTable));
                    });

                    extDeferred = extDeferred.then(function() {
                        var newTable = ext.createNewTable(newTableName);
                        return newTable.addToWorksheet();
                    });

                })(licenseTables[ii]);
            }

            extDeferred.then(deferred.resolve).fail(deferred.reject);

            return deferred.promise();
        }

        return ext;
    }

    return UExtLicenseMgr;
}({}));

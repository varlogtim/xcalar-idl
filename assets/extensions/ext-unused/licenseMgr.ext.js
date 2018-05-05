window.UExtLicenseMgr = (function(UExtLicenseMgr) {
    // Development endpoint
    // var licenseServerApiEndpoint = "https://vktozna5ke.execute-api.us-west-2.amazonaws.com/dev/license/api/v1.0/secure";

    // Production endpoint
    var licenseServerApiEndpoint = "https://x3xjvoyc6f.execute-api.us-west-2.amazonaws.com/production/license/api/v1.0/secure";


    UExtLicenseMgr.buttons = [
        {
            "buttonText": "Create new license",
            "fnName": "newLicense",
            "instruction": "This will create, but not issue, a new Xcalar-signed license. Only logged in users will be able to create licenses",
            "arrayOfFields": [
                {
                    "type": "string",
                    "name": "License Type",
                    "fieldClass": "licenseType",
                    "enums": ["Production", "Developer"],
                    "autofill": "Production"
                },
                {
                    "type": "string",
                    "name": "Organization",
                    "fieldClass": "licensee"
                },
                {
                    "type": "string",
                    "name": "Product",
                    "fieldClass": "product",
                    "enums": ["Xcalar Data Platform", "Xcalar Design CE", "Xcalar Design EE"],
                    "autofill": "Xcalar Data Platform"
                },
                {
                    "type": "number",
                    "name": "Valid for number of days",
                    "fieldClass": "expiration",
                    "autofill": 14
                },
                {
                    "type": "number",
                    "name": "Number of nodes",
                    "fieldClass": "nodeCount",
                    "autofill": 3
                },
                {
                    "type": "number",
                    "name": "Number of users",
                    "fieldClass": "userCount",
                    "autofill": 10
                },
                {
                    "type": "string",
                    "name": "On expiry",
                    "fieldClass": "onexpiry",
                    "enums": ["Warn", "Disable"],
                    "autofill": "Warn"
                },
                {
                    "type": "boolean",
                    "name": "Enable JDBC Server",
                    "fieldClass": "jdbc"
                },
                {
                    "type": "string",
                    "name": "Max Interactive Dataset Size",
                    "fieldClass": "maxInteractiveDataSize",
                    "typeCheck": {
                        "allowEmpty": true
                    }
                }
            ]
        },
        {
            "buttonText": "Issue license",
            "fnName": "issueLicense",
            "instruction": "Take a license already generated and issue it to an existing customer. This will make the license available on their ZenDesk account",
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
                    "type": "string",
                    "name": "Deployment Type",
                    "fieldClass": "deploymentType",
                    "enums": ["On-Prem", "Azure"],
                    "autofill": "On-Prem"
                },
                {
                    "type": "string",
                    "name": "Salesforce Account ID (Optional)",
                    "fieldClass": "salesforceId",
                    "typeCheck": {
                        "allowEmpty": true
                    }
                },
                {
                    "type": "boolean",
                    "name": "Create ZenDesk account",
                    "fieldClass": "createZenDeskAcct"
                }
            ]
        },
        {
            "buttonText": "View License Tables",
            "fnName": "viewLicense",
            "instruction": "Click this and see what happens. Nothing bad I promise"
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
            var self = this;
            var args = self.getArgs();
            var data = {
                "secret": "xcalarS3cret",
                "userId": XcSupport.getUser(),
                "licenseType": args.licenseType,
                "compress": true,
                "usercount": args.userCount,
                "nodecount": args.nodeCount,
                "expiration": args.expiration,
                "licensee": args.licensee,
                "product": args.product,
                "onexpiry": args.onexpiry,
                "jdbc": args.jdbc
            };

            if (args.maxInteractiveDataSize.length > 0) {
                data["maxInteractiveDataSize"] = args.maxInteractiveDataSize;
            }

            $.ajax({
                "type": "POST",
                "contentType": "application/json",
                "url": licenseServerApiEndpoint + "/genlicense",
                "crossdomain": true,
                "data": JSON.stringify(data),
                "success": function(data) {
                    deferred.resolve();
                    Alert.show({"title": "License Key", "msg": data.Compressed_Sig, isAlert: true});
                },
                "error": function() {
                    deferred.reject("Failed to generate license");
                }
            });

            return deferred.promise();

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
                "userId": ext.getUsername(),
                "name": args.customerName,
                "organization": args.customerOrg,
                "key": args.customerLicense,
                "deploymentType": args.deploymentType,
            };

            if (args.salesforceId.length > 0) {
                data["salesforceId"] = args.salesforceId;
            }

            $.ajax({
                "type": "POST",
                "contentType": "application/json",
                "url": licenseServerApiEndpoint + "/addlicense",
                "crossdomain": true,
                "data": JSON.stringify(data),
                "success": function () {
                    deferred.resolve("Successfully issued license");
                    xcHelper.showSuccess("License successfully issued to " + args.customerOrg);
                },
                "error": function() {
                    deferred.reject("Failed to issue license");
                }
            });

            return deferred.promise();
        }
        return ext;
    }

    function viewLicense() {
        var ext = new XcSDK.Extension();
        var licenseTables = ["license", "owner", "organization", "activation",
                             "marketplace"];

        ext.start = function() {
            function getTable(licenseTable, targetName) {
                var deferred = XcSDK.Promise.deferred();
                var licenseTableCopy = licenseTable;
                var newTableName = ext.createTableName(licenseTable);
                var dsArgs = {
                    "url": "1",
                    "targetName": targetName
                };
                var formatArgs = {
                    "format": "JSON",
                    "moduleName": "licensemgr",
                    "funcName": "getTable",
                    "udfQuery": {"tableName": licenseTable}
                };
                ext.load(dsArgs, formatArgs, licenseTableCopy)
                .then(function(dsName) {
                    return ext.indexFromDataset(dsName, newTableName,
                                                licenseTable);
                })
                .then(function() {
                    var newTable = ext.createNewTable(newTableName);
                    return newTable.addToWorksheet();
                })
                .then(deferred.resolve)
                .fail(deferred.reject);
                return deferred.promise();
            }
            var deferred = XcSDK.Promise.deferred();
            var randId = Math.floor(Math.random() * 1000);
            var targetName = "licenseMgr_" + randId;
            var targetType = "memory";
            var targetParams = {};
            ext.createDataTarget(targetType, targetName, targetParams)
            .then(function () {
                var promiseArray = [];
                for (var i = 0; i < licenseTables.length; i++) {
                    promiseArray.push(getTable.bind(window, licenseTables[i], targetName));
                }
                return PromiseHelper.chain(promiseArray);
            })
            .then(deferred.resolve)
            .fail(deferred.reject)
            .always(function() {
                ext.deleteDataTarget(targetName);
            });
            return deferred.promise();
        }

        return ext;
    }

    return UExtLicenseMgr;
}({}));

// module name must start with "UExt"
window.UExtTagRules = (function(UExtTagRules) {
    console.log("loaded!");
    UExtTagRules.buttons = [{
        "buttonText": "Tag Rules",
        "fnName": "bri",
        "arrayOfFields": [{
            "type": "table",
            "name": "Tag Rules Table",
            "fieldClass": "briTable"
        },
        {
            "type": "string",
            "name": "Module Name (Lower Case)",
            "fieldClass": "moduleName"
        }
        ]
    }];

    // UExtTagRules.actionFn must reutrn a XcSDK.Extension obj or null
    UExtTagRules.actionFn = function(functionName) {
        // it's a good convention to use switch/case to handle
        // different function in the extension and handle errors.
        switch (functionName) {
            case "bri":
                return bri();
            default:
                return null;
        }
    };

    UExtTagRules.configParams = {
        "notTableDependent": true
    };

    function genStartingTemplate(argNames, tagName) {
        var aNames = [];
        var argTemplate = "    <ARG> = str(<ARG>)\n";
        var argString = "";
        var headerTemplate = "def gen_tag_<TAGNAME>(<ARGNAMES>):\n" +
                             "<ARGSTRINGS>";
        for (var i = 0; i < argNames.length; i++) {
            argName = argNames[i];
            aNames.push(argName);
            argString += argTemplate.replace("<ARG>", argName)
                                    .replace("<ARG>", argName);
        }
        var headerString = headerTemplate.replace("<ARGSTRINGS>", argString)
                                         .replace("<TAGNAME>", tagName)
                                         .replace("<ARGNAMES>", aNames.join(", "));
        return headerString;
    }

    function genUdfString(ruleStruct, names) {
        var idx = 0;
        var value = "";
        var ruleTemplate = "    if (<RULES>):\n" +
                           "        return str(\"<VALUE>\")\n";
        var subRuleTemplate = "<C> == \"<V>\"";
        var ruleString = "";
        var subRuleString = [];
        for (var key in ruleStruct) {
            if (idx === 0) {
                value = ruleStruct[key];
            } else {
                var colName = names[idx];
                if (ruleStruct[key] === "") {
                    idx += 1;
                    continue;
                }
                if (ruleStruct[key].startsWith("IN(")) {
                    subRuleTemplate = "(<C> in (<V>))";
                    var inRuleString = ruleStruct[key].trim().substring(3,
                                                 ruleStruct[key].length - 1);
                    var v = '"' + inRuleString.split(":").join("\", \"") + '"';
                    subRuleString.push(subRuleTemplate.replace("<C>", colName)
                                 .replace("<V>", v));

                } else if (ruleStruct[key].startsWith("<>")) {
                    subRuleTemplate = "(<C> != (\"<V>\"))";
                    var v = ruleStruct[key].trim().substring(2);
                    subRuleString.push(subRuleTemplate.replace("<C>", colName)
                                 .replace("<V>", v));
                } else {
                    subRuleTemplate = "(<C> == \"<V>\")";
                    subRuleString.push(subRuleTemplate.replace("<C>", colName)
                                               .replace("<V>", ruleStruct[key]));
                }
            }
            idx += 1;
        }
        var subRules = subRuleString.join(" and ");
        ruleString = ruleTemplate.replace("<RULES>", subRules)
                                 .replace("<VALUE>", value);
        return ruleString;
    }

    function bri() {
        var ext = new XcSDK.Extension();
        // Implement ext.beforeStart(), ext.start() and
        // ext.afterFinish() to do any operations
        // Note that all the interfaces are optionally to implement
        // but usually you should impelement ext.start at least.
        ext.start = function() {
            // seach "js promise" online if you do not understand it
            // check promiseApi.js to see the api.
            var deferred = XcSDK.Promise.deferred();

            // JS convention, rename this to self in case of scoping issue
            var self = this;

            var args = self.getArgs();
            var briTable = args.briTable;
            var briModuleName = args.moduleName;
            var argCol;
            var tagName;

            var numRules = -1;
            var regex = new RegExp("^[a-z][a-z0-9-_]*$");
            if (!regex.test(briModuleName)) {
                return XcSDK.Promise.reject("Module Name can only contain " +
                       "characters a-z, 0-9, -, _ and must start with an " +
                       "alphabet.");
            }
            ext.getNumRows(briTable.getName(), {})
            .then(function(numRows) {
                if (numRows > 1000) {
                    return XcSDK.Promise.reject("Please break rules up into " +
                                                "sets of 1000.");
                } else {
                    numRules = numRows;
                    XcSDK.Promise.resolve();
                }
            })
            .then(function() {
                return ext.fetchDataAndParse(briTable.getName(), 1, numRules);
            })
            .then(function(allRules) {
                var allRulesClean = [];
                for (var i = 0; i < allRules.length; i++) {
                    var record = allRules[i];
                    var newRecord = {};
                    for (var k in record) {
                        newRecord[k.split("::")[1]] = record[k];
                    }
                    allRulesClean.push(newRecord);
                }
                tagName = allRulesClean[0].column0;
                var tags = allRulesClean[1];
                var value = tags.column0;
                var args = [];
                for (var k in tags) {
                    var argName = tags[k];
                    argName = argName.replace(/[^0-9a-zA-Z-_]/, "_")
                                     .replace(/^[0-9]/, "_");
                    args.push(argName);
                }
                //args.shift();
                var tmpArgs = args.slice()
                tmpArgs.shift();

                var udfString = genStartingTemplate(tmpArgs, tagName);
                for (var i = 2; i < allRulesClean.length; i++) {
                    udfString += genUdfString(allRulesClean[i], args);
                }
                udfString += "    return \"\"";
                return XcalarUploadPythonRejectDuplicate("tr_" + briModuleName,
                                                         udfString);
            })
            .then(function() {
                Alert.show({title: "Tag Rules",
                            msg: "Please select the target table " +
                            " and apply the map operation tr_" + briModuleName+
                            ":gen_tag_" + tagName + ".",
                            instr: "User Defined Module tr_" + briModuleName +
                                 " uploaded successfully.",
                            isAlert: true});
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();
        };

        // Do not forget to return the extension
        return ext;
    }

    return UExtTagRules;
}({}));
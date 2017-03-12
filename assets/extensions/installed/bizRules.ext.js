// module name must start with "UExt"
window.UExtBizRules = (function(UExtBizRules) {
    UExtBizRules.buttons = [{
        "buttonText": "Business Rules Inventory",
        "fnName": "bri",
        "arrayOfFields": [{
            "type": "table",
            "name": "BRI Table",
            "fieldClass": "briTable"
        }
        ]
    }];

    // UExtBizRules.actionFn must reutrn a XcSDK.Extension obj or null
    UExtBizRules.actionFn = function(functionName) {
        // it's a good convention to use switch/case to handle
        // different function in the extension and handle errors.
        switch (functionName) {
            case "bri":
                return bri();
            default:
                return null;
        }
    };

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
            var cols = briTable.tableCols;
            var argCol;
            for (var i = 0; i<cols.length; i++) {
                var colName = (cols[i].name.replace(/\s/g, "")).toLowerCase();
                if (colName.indexOf("argumentnames") > -1) {
                    argCol = briTable.tableCols[i].backName;
                    break;
                }
            }
            if (!argCol) {
                return XcSDK.Promise.reject("No column named Argument Names");
            }

            var numRules = -1;
            ext.getNumRows(briTable.getName())
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
                // Find the different columns
                var oneRule = allRules[0];
                var rdKey;
                var anKey;
                var riKey;
                var rcKey;
                var rsKey;
                var rd;
                var an;
                var ri;
                var rc;
                var rs;

                for (var key in oneRule) {
                    normalizedKey = key.replace(/\s/g, "").toLowerCase();
                    if (normalizedKey.indexOf("ruledescription") > -1) {
                        rdKey = key;
                    } else if (normalizedKey.indexOf("argumentname") > -1) {
                        anKey = key;
                    } else if (normalizedKey.indexOf("ruleid") > -1) {
                        riKey = key;
                    } else if (normalizedKey.indexOf("rulecategor") > -1) {
                        rcKey = key;
                    } else if (normalizedKey.indexOf("rulestring") > -1) {
                        rsKey = key;
                    }
                }

                // Start generating the UDF
                var udfString = 'import re, json, csv\n' +
                                'def __is_number(s):\n' +
                                '    try:\n' +
                                '        float(s)\n' +
                                '        return True\n' +
                                '    except ValueError:\n' +
                                '        pass\n' +
                                '    try:\n' +
                                '        import unicodedata\n' +
                                '        unicodedata.numeric(s)\n' +
                                '        return True\n' +
                                '    except (TypeError, ValueError):\n' +
                                '        pass\n' +
                                '    return False\n';
                udfString += "\n";
                udfString +='def collateScore(resultCol):\n' +
                            '    results = resultCol.split(",")\n' +
                            '    nonPassing = []\n' +
                            '    for result in results:\n' +
                            '        if not result == "0":\n' +
                            '            nonPassing.append(result)\n' +
                            '    if len(nonPassing):\n' +
                            '        return ",".join(nonPassing)\n' +
                            '    else:\n' +
                            '        return ""';
                udfString += "\n";
                var ruleIds = [];
                var argNames = [];
                var ruleDescs = [];
                var ruleStructs = [];

                // Generate each individual rule
                for (var i = 0; i < allRules.length; i++) {
                    rd = allRules[i][rdKey];
                    an = allRules[i][anKey];
                    ri = allRules[i][riKey];
                    rc = allRules[i][rcKey];
                    rs = allRules[i][rsKey];

                    ruleStructs.push({"ri": ri, "an": an, "rd": rd});

                    var ruleTemplate =
                        'def __business_rule_<RULE_ID>(<ARG_NAME>):\n' +
                        '    rule_string = """ <RULE_STRING> """\n' +
                        '    rule_string = rule_string.strip()\n' +
                        '    rule_id = """<RULE_ID>"""\n' +
                        '    try:\n' +
                        '        if eval(rule_string):\n' +
                        '            return "0"\n' +
                        '        return """<RULE_ID>"""\n' +
                        '    except:\n' +
                        '        return """<RULE_ID>"""\n';
                    ruleTemplate = ruleTemplate.replace(/<RULE_ID>/g, ri);
                    ruleTemplate = ruleTemplate.replace(/<RULE_STRING>/g, rs);
                    ruleTemplate = ruleTemplate.replace(/<ARG_NAME>/g, an);
                    udfString += ruleTemplate;
                }

                ruleStructs = ruleStructs.sort(function(a, b) {
                    if (a.ri < b.ri) {
                        return -1;
                    }
                    return 1;
                });
                for (var i = 0; i < ruleStructs.length; i++) {
                    ruleIds.push(ruleStructs[i].ri);
                    argNames.push(ruleStructs[i].an);
                    ruleDescs.push(ruleStructs[i].rd);
                }

                udfString += "\n";

                // Generate main bri engine function
                var mainTemplate =
                    'def business_rules_inventory(<ALL_ARG_NAME>):\n' +
                    '    funcList = [<FUNC_NAME>];\n' +
                    '    fargs = [<ARG_NAME>]\n' +
                    '    resList = []\n' +
                    '    for i in xrange(len(funcList)):\n' +
                    '        f = funcList[i]\n' +
                    '        res = f(*fargs[i])\n' +
                    '        resList.append(str(res))\n' +
                    '    return ",".join(resList)';

                var aan = {};
                var argNameString = "";
                for (var i = 0; i < argNames.length; i++) {
                    argNameString += "[" + argNames[i] + "],";
                    args = argNames[i].split(",");
                    for (var j = 0; j < args.length; j++) {
                        aan[args[j]] = 1;
                    }
                }
                argNameString = argNameString.substring(0,
                                                      argNameString.length - 1);
                mainTemplate = mainTemplate.replace(/<ARG_NAME>/g,
                                                    argNameString);
                var argString = "";
                for (var key in aan) {
                    argString += key + ",";
                }
                argString = argString.substring(0, argString.length-1);
                mainTemplate = mainTemplate.replace(/<ALL_ARG_NAME>/g,
                                                    argString);

                var funcNameString = "";
                for (var i = 0; i < ruleIds.length; i++) {
                    funcNameString += "__business_rule_" + ruleIds[i] + ",";
                }
                funcNameString = funcNameString.substring(0,
                                                     funcNameString.length - 1);
                mainTemplate = mainTemplate.replace(/<FUNC_NAME>/g,
                                                    funcNameString);
                udfString += mainTemplate;
                udfString += "\n";

                var ruleLookupTemplate =
                'def convertFromRuleId(rules):\n' +
                '    ruleId = [<RULE_ID>]\n' +
                '    desc = [<DESC>]\n' +
                '    descs = []\n' +
                '    for rule in rules.split(","):\n' +
                '        if rule == "":\n' +
                '            continue\n' +
                '        try:\n' +
                '            idx = ruleId.index(rule)\n' +
                '            if idx > -1:\n' +
                '                descs.append(desc[idx])\n' +
                '            else:\n' +
                '                descs.append("Cannot find rule description")\n' +
                '        except:\n' +
                '            descs.append("Cannot find rule description")\n' +
                '    return ",".join(descs)';

                ruleDescString = '"""' + ruleDescs.join('""", """') + '"""';
                ruleIdString = '"' + ruleIds.join('", "') + '"';

                ruleLookupTemplate = ruleLookupTemplate.replace(/<RULE_ID>/g,
                                                                ruleIdString);
                ruleLookupTemplate = ruleLookupTemplate.replace(/<DESC>/g,
                                                                ruleDescString);
                udfString += ruleLookupTemplate;
                return XcalarUploadPython("bri_" + userIdName, udfString);
            })
            .then(function() {
                deferred.resolve();
            });

            return deferred.promise();
        };

        // Do not forget to return the extension
        return ext;
    }

    return UExtBizRules;
}({}));
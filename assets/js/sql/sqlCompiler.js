(function() {
    var root = this;

    function SQLCompiler() {
        this.sqlObj = new SQLApi();
        return this;
    }
    var opLookup = {
        // arithmetic.scala
        "expressions.UnaryMinus": null,
        "expressions.UnaryPositive": null,
        "expressions.Abs": "abs",
        "expressions.Add": "add",
        "expressions.Subtract": "sub",
        "expressions.Multiply": "mult",
        "expressions.Divide": "div",
        "expressions.Remainder": "mod",
        "expressions.Pmod": null,
        "expressions.Least": null,
        "expressions.Greatest": null,
        // bitwiseExpressions.scala
        "expressions.BitwiseAnd": "bitand",
        "expressions.BitwiseOr": "bitor",
        "expressions.BitwiseXor": "bitxor",
        "expressions.BitwiseNot": null,
        // Cast.scala
        "expressions.Cast": null, // NOTE: This will be replaced
        "expressions.XcType.float": "float",
        "expressions.XcType.int": "int",
        "expressions.XcType.bool": "bool",
        "expressions.XcType.string": "string",
        // conditionalExpressions.scala
        "expressions.If": "if",
        "expressions.IfStr": "ifStr", // Xcalar generated
        "expressions.CaseWhen": null, // XXX we compile these to if and ifstr
        "expressions.CaseWhenCodegen": null, /// XXX we compile these to if and ifstr
        // mathExpressions.scala
        "expressions.EulerNumber": null,
        "expressions.Pi": "pi",
        "expressions.Acos": "acos",
        "expressions.Asin": "asin",
        "expressions.Atan": "atan",
        "expressions.Cbrt": null,
        "expressions.Ceil": "ceil",
        "expressions.Cos": "cos",
        "expressions.Cosh": "cosh",
        "expressions.Conv": null,
        "expressions.Exp": "exp",
        "expressions.Expm1": null,
        "expressions.Floor": "floor",
        "expressions.Factorial": null,
        "expressions.Log": "log",
        "expressions.Log2": "log2",
        "expressions.Log10": "log10",
        "expressions.Log1p": null,
        "expressions:Rint": null,
        "expressions.Signum": null,
        "expressions.Sin": "sin",
        "expressions.Sinh": "sinh",
        "expressions.Sqrt": "sqrt",
        "expressions.Tan": "tan",
        "expressions.Cot": null,
        "expressions.Tanh": "tanh",
        "expressions.ToDegrees": "degrees",
        "expressions.ToRadians": "radians",
        "expressions.Bin": null,
        "expressions.Hex": null,
        "expressions.Unhex": null,
        "expressions.Atan2": "atan2",
        "expressions.Pow": "pow",
        "expressions.ShiftLeft": "bitlshift",
        "expressions.ShiftRight": "bitrshift",
        "expressions.ShiftRightUnsigned": null,
        "expressions.Hypot": null,
        "expressions.Logarithm": null,
        "expressions.Round": "round",
        "expressions.BRound": null,
        // predicates.scala
        "expressions.Not": "not",
        "expressions.In": null, // This is compiled to eq & or
        "expressions.And": "and",
        "expressions.Or": "or",
        "expressions.EqualTo": "eq",
        "expressions.EqualNullSafe": "eq",
        "expressions.LessThan": "lt",
        "expressions.LessThanOrEqual": "le",
        "expressions.GreaterThan": "gt",
        "expressions.GreaterThanOrEqual": "ge",
        // randomExpressions.scala,
        "expressions.Rand": "genRandom", // XXX a little different
        "expressions.Randn": null,
        // regexpExpressions.scala
        "expressions.Like": "like",
        "expressions.RLike": "regex",
        "expressions.StringSplit": null,
        "expressions.RegExpReplace": null,
        "expressions.RegExpExtract": null,
        // stringExpressions.scala
        "expressions.Concat": "concat", // Concat an array
        "expressions.ConcatWs": null,
        "expressions.Elt": null, // XXX Given an array returns element at idx
        "expressions.Upper": "upper",
        "expressions.Lower": "lower",
        "expressions.Contains": "contains",
        "expressions.StartsWith": "startsWith",
        "expressions.EndsWith": "endsWith",
        "expressions.StringReplace": "replace",
        "expressions.StringTranslate": null,
        "expressions.FindInSet": "findInSet",
        "expressions.StringTrim": "strip",
        "expressions.StringTrimLeft": "stripLeft",
        "expressions.StringTrimRight": "stripRight",
        "expressions.StringInstr": "find", // XXX 1-based index
        "expressions.SubstringIndex": "substringIndex",
        "expressions.StringLocate": "find", // XXX 1-based index
        "expressions.StringLPad": null, // TODO
        "expressions.StringRPad": null, // TODO
        "expressions.ParseUrl": null, // TODO
        "expressions.FormatString": null, // TODO
        "expressions.InitCap": null, // TODO
        "expressions.StringRepeat": "repeat",
        "expressions.StringReverse": null, // TODO
        "expressions.StringSpace": null, // TODO
        "expressions.Substring": "substring", // XXX 1-based index
        "expressions.Right": "right", // XXX right(str, 5) == substring(str, -5, 0)
        "expressions.Left": "left", // XXX left(str, 4) == substring(str, 0, 4)
        "expressions.Length": "len",
        "expressions.BitLength": null, // TODO
        "expressions.OctetLength": null, // TODO
        "expressions.Levenshtein": null, // TODO
        "expressions.SoundEx": null, // TODO
        "expressions.Ascii": null, // TODO
        "expressions.Chr": null, // TODO
        "expressions.Base64": null, // TODO
        "expressions.UnBase64": null, // TODO
        "expressions.Decode": null, // TODO
        "expressions.Encode": null, // TODO
        "expressions.FormatNumber": null, // TODO
        "expressions.Sentences": null, // XXX Returns an array.
        "expressions.IsNotNull": "exists",
        "expressions.aggregate.Sum": "sum",
        "expressions.aggregate.Count": "count",
        "expressions.aggregate.Max": "max",
        "expressions.aggregate.Min": "min",
        "expressions.aggregate.Average": "avg",
        "expressions.aggregate.CentralMomentAgg": null,
        "expressions.aggregate.Corr": null,
        "expressions.aggregate.CountMinSketchAgg": null,
        "expressions.aggregate.Covariance": null,
        "expressions.aggregate.First": null,
        "expressions.aggregate.HyperLogLogPlusPlus": null,
        "expressions.aggregate.Last": null,
        "expressions.aggregate.Percentile": null,
        "expressions.aggregate.PivotFirst": null,
        "expressions.aggregate.AggregateExpression": null
    };

    var tablePrefix = "XC_TABLENAME_";

    function assert(st) {
        if (!st) {
            debugger;
            console.error("ASSERTION FAILURE!");
            throw "BOOHOO!";
        }
    }

    function TreeNode(value) {
        if (value.class === "org.apache.spark.sql.execution.LogicalRDD") {
            // These are leaf nodes
            // Find the RDD that has a name XC_TABLENAME_ prefix
            this.allCols = [];
            this.tempCols = [];
            var rdds = value.output;
            for (var i = 0; i < rdds.length; i++) {
                var evalStr = genEvalStringRecur(SQLCompiler.genTree(undefined,
                    rdds[i].slice(0)));
                if (evalStr.indexOf("(") > 0) {
                    debugger;
                    console.info(rdds[i]);
                }
                if (evalStr.indexOf(tablePrefix) === 0) {
                    this.newTableName = evalStr.substring(tablePrefix.length);
                    break;
                } else {
                    this.allCols.push(evalStr);
                }
            }
        }
        this.value = value;
        this.parent;
        this.children = [];
        return (this);
    }

    // Options: extractAggregates -- change aggregate nodes to a different tree
    function secondTraverse(node, idx, options) {
        var retNode = node;
        // The second traverse convert all substring, left, right stuff
        function literalNumberNode(num) {
            return new TreeNode({
                "class" : "org.apache.spark.sql.catalyst.expressions.Literal",
                "num-children" : 0,
                "value" : "" + num,
                "dataType" : "integer"
            });
        }
        function literalStringNode(s) {
            return new TreeNode({
                "class" : "org.apache.spark.sql.catalyst.expressions.Literal",
                "num-children" : 0,
                "value" : s,
                "dataType" : "string"
            });
        }
        function subtractNode() {
            return new TreeNode({
                "class" : "org.apache.spark.sql.catalyst.expressions.Subtract",
                "num-children" : 2,
                "left" : 0,
                "right" : 1
            });
        }
        function addNode() {
            return new TreeNode({
                "class" : "org.apache.spark.sql.catalyst.expressions.Add",
                "num-children" : 2,
                "left" : 0,
                "right" : 1
            });
        }
        function stringReplaceNode() {
            return new TreeNode({
                "class" : "org.apache.spark.sql.catalyst.expressions." +
                          "StringReplace",
                "num-children" : 3,
                "left" : 0,
                "right" : 1
            });
        }

        function ifStrNode() {
            return new TreeNode({
                "class" : "org.apache.spark.sql.catalyst.expressions.IfStr",
                "num-children" : 3,
                "branches": null,
            });
        }
        function ifNode() {
            return new TreeNode({
                "class" : "org.apache.spark.sql.catalyst.expressions.If",
                "num-children" : 3,
                "branches": null,
            });
        }
        function orNode() {
            return new TreeNode({
                "class" : "org.apache.spark.sql.catalyst.expressions.Or",
                "num-children" : 2,
                "left" : 0,
                "right" : 1
            });
        }
        function eqNode() {
            return new TreeNode({
                "class" : "org.apache.spark.sql.catalyst.expressions.EqualTo",
                "num-children" : 2,
                "left" : 0,
                "right" : 1
            });
        }

        // This function traverses the tree for a second time.
        // To process expressions such as Substring, Left, Right, etc.
        var opName = node.value.class.substring(
            node.value.class.indexOf("expressions."));
        switch (opName) {
            case ("expressions.Substring"):
                // XXX since this traverse is top down, we will end up
                // traversing the subtrees twice. Might need to add a flag
                // to the node and stop traversal if the flag is already set
                var startIndex = node.children[1].value;
                var length = node.children[2].value;
                if (startIndex.class.endsWith("Literal") &&
                    startIndex.dataType === "integer") {
                    startIndex.value = "" + (startIndex.value * 1 - 1);
                    if (length.class.endsWith("Literal") &&
                    length.dataType === "integer") {
                        length.value = "" + (startIndex.value * 1 + length.value * 1);
                    } else {
                        var addN = addNode();
                        addN.children.push(node.children[1], node.children[2]);
                        addN.parent = node;
                        node.children[2] = addN;
                    }
                } else {
                    var subNode = subtractNode();
                    subNode.children.push(node.children[1], literalNumberNode(1));
                    var addN = addNode();
                    addN.children.push(subNode, node.children[2]);
                    node.children[1] = subNode;
                    subNode.parent = node;
                    node.children[2] = addN;
                    addN.parent = node;
                }
                break;
            case ("expressions.Left"):
            case ("expressions.Right"):
                var parent = node.parent;
                parent.children[idx] = node.children[2];
                node.children[2].parent = parent;
                break;
            case ("expressions.Like"):
                assert(node.children.length == 2);
                var strNode = node.children[1];
                var stringRepNode = stringReplaceNode();

                strNode.parent = stringRepNode;
                var pctNode = literalStringNode("%");
                pctNode.parent = stringRepNode;
                var starNode = literalStringNode("*");
                starNode.parent = stringRepNode;

                stringRepNode.children.push(strNode);
                stringRepNode.children.push(pctNode);
                stringRepNode.children.push(starNode);

                node.children[1] = stringRepNode;

                break;
            case ("expressions.CaseWhenCodegen"):
            case ("expressions.CaseWhen"):
                if (node.value.elseValue && node.children.length % 2 !== 1) {
                    // If there's an elseValue, then num children must be odd
                    assert(0);
                }
                // Check whether to use if or ifstr
                // XXX backend to fix if and ifStr such that `if` is generic
                // For now we are hacking this
                var type = "";
                for (var i = 0; i < node.children.length; i++) {
                    if (i % 2 === 1) {
                        if (node.children[i].value.class ===
                            "org.apache.spark.sql.catalyst.expressions.Literal") {
                            type = node.children[i].value.dataType;
                            break;
                        }
                    }
                }
                if (type === "" &&
                    node.value.elseValue && node.value.elseValue[0].class ===
                    "org.apache.spark.sql.catalyst.expressions.Literal") {
                    // XXX Handle case where else value is a complex expr
                    assert(node.value.elseValue.length === 1);
                    type = node.value.elseValue[0].dataType;
                }
                if (type === "") {
                    console.warn("Defaulting to ifstr as workaround");
                    type = "string";
                }
                var getNewNode;
                if (type === "string") {
                    getNewNode = ifStrNode; // nifty little trick :)
                } else {
                    getNewNode = ifNode;
                }
                var newNode = getNewNode();
                var curNode = newNode;
                // Time to reassign the children
                for (var i = 0; i < Math.floor(node.children.length/2); i++) {
                    curNode.children.push(node.children[i*2]);
                    curNode.children.push(node.children[i*2+1]);
                    node.children[i*2].parent = curNode;
                    node.children[i*2+1].parent = curNode;
                    var nextNode = getNewNode();
                    nextNode.parent = curNode;
                    curNode.children.push(nextNode);
                    curNode = nextNode;
                }

                var lastNode = curNode.parent;
                assert(lastNode.children.length === 3);

                // has else clause
                if (node.children.length % 2 === 1) {
                    lastNode.children[2] = node.children[node.children.length-1];
                } else {
                    // no else clause
                    // We need to create our own terminal condition
                    // XXX There's a backend bug here with if
                    if (type === "string") {
                        litNode = literalStringNode("");
                    } else {
                        litNode = literalNumberNode(0.1337);
                    }
                    litNode.parent = lastNode;
                    lastNode.children[2] = litNode;
                }
                if (node.parent) {
                    assert(idx !== undefined);
                    node.parent.children[idx] = newNode;
                } else {
                    assert(idx === undefined);
                    // This must be the first level call
                    retNode = newNode;
                }
                break;
            case ("expressions.In"):
                // XXX TODO Minor. When the list gets too long, we are forced
                // to convert this to a udf and invoke the UDF instead.
                assert(node.children.length >= 2);
                var retNode;
                var prevOrNode;
                var newEqNode;
                for (var i = 0; i < node.children.length - 1; i++) {
                    newEqNode = eqNode();
                    newEqNode.children.push(node.children[0]);
                    newEqNode.children.push(node.children[i+1]);
                    node.children[0].parent = newEqNode;
                    node.children[i+1].parent = newEqNode;
                    if (i < node.children.length -2) {
                        var newOrNode = orNode();
                        newOrNode.children.push(newEqNode);
                        newEqNode.parent = newOrNode;
                        if (prevOrNode) {
                            prevOrNode.children.push(newOrNode);
                            newOrNode.parent = prevOrNode;
                        }
                        prevOrNode = newOrNode;
                    } else {
                        if (prevOrNode) {
                            prevOrNode.children.push(newEqNode);
                            newEqNode.parent = prevOrNode;
                        }
                    }
                }
                if (prevOrNode) {
                    retNode = prevOrNode;
                } else {
                    retNode = newEqNode;
                }

                if (node.parent) {
                    assert(idx !== undefined);
                    node.parent.children[idx] = retNode;
                } else {
                    assert(idx === undefined);
                    // This must be the first level call
                }
                break;
            case ("expressions.Cast"):
                var type = node.value.dataType;
                var convertedType = convertSparkTypeToXcalarType(type);
                node.value.class = node.value.class.replace("expressions.Cast",
                                   "expressions.XcType." + convertedType);
                break;
            case ("expressions.aggregate.AggregateExpression"):
                // If extractAggregates is true, then we need to cut the tree
                // here and construct a different tree
                if (idx !== undefined && options && options.extractAggregates) {
                    assert(node.children.length === 1);
                    assert(node.children[0].value.class
                                        .indexOf("expressions.aggregate.") > 0);
                    assert(node.children[0].children.length === 1);
                    // XXX code below is wrong
                    // var grandChildClass = node.children[0].children[0].value.class;
                    // if (grandChildClass.endsWith("AttributeReference") ||
                    //     grandChildClass.endsWith("Literal")) {
                    //     // This is a simple aggregate. No need to extract and
                    //     // convert to aggregate variables
                    //     break;
                    // }

                    // We need to cut the tree at this node, and instead of
                    // having a child, remove the child and assign it as an
                    // aggregateTree
                    var aggNode = node.children[0];
                    aggNode.parent = undefined;
                    node.children = [];
                    node.value["num-children"] = 0;
                    node.aggTree = aggNode;
                    node.aggVariable = ""; // To be filled in by genEval
                }
                break;
            default:
                break;
        }

        // This must be a top down resolution. This is because of the Aggregate
        // Expression case, where we want to cut the tree at the top most
        // Aggregate Expression
        for (var i = 0; i < node.children.length; i++) {
            secondTraverse(node.children[i], i, options);
            // Notice that we ignore the return. This is because we only want
            // to return the top node
        }

        return retNode;
    }
    function sendPost(struct) {
        var deferred = jQuery.Deferred();
        jQuery.ajax({
            type: 'POST',
            data: JSON.stringify(struct),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            url: planServer + "/sqlquery/" +
                 WorkbookManager.getActiveWKBK() + "/true/true",
            success: function(data) {
                if (data.status === 200) {
                    try {
                        deferred.resolve(JSON.parse(JSON.parse(data.stdout).sqlQuery));
                    } catch (e) {
                        deferred.reject(e);
                        console.error(e);
                        console.error(data.stdout);
                    }
                } else {
                    deferred.reject(data);
                    console.error(data);
                }
            },
            error: function(error) {
                deferred.reject(error);
                console.error(error);
            }
        });
        return deferred.promise();
    }

    SQLCompiler.publishTable = function(xcalarTableName, sqlTableName) {
        tableLookup[sqlTableName] = xcalarTableName;
    };

    SQLCompiler.getAllPublishedTables = function() {
        return tableLookup;
    };
    function ProjectNode(columns) {
        return new TreeNode({
            "class" : "org.apache.spark.sql.catalyst.plans.logical.Project",
            "num-children" : 1,
            "projectList": columns
        });
    }
    function pushUpCols(node) {
        // Push cols names to its direct parent
        if (node.parent) {
            if (node.parent.allCols) {
                // Only happens when parent is Join
                for (var i = 0; i < node.allCols.length; i++) {
                    // There should be no duplicates
                    assert(node.parent.allCols.indexOf(node.allCols[i]) === -1);
                    node.parent.allCols.push(node.allCols[i])
                }

            } else {
                node.parent.allCols = node.allCols;
            }
            // Push tempCols as well
            if (node.parent.tempCols) {
                for (var i = 0; i < node.tempCols.length; i++) {
                    assert(node.parent.tempCols.indexOf(node.tempCols[i]) === -1);
                    node.parent.tempCols.push(node.tempCols[i])
                }
            } else {
                node.parent.tempCols = node.tempCols;
            }
        }
    }
    SQLCompiler.genTree = function(parent, array) {
        var newNode = new TreeNode(array.shift());
        if (parent) {
            newNode.parent = parent;
            if (newNode.value.class === "org.apache.spark.sql.execution.LogicalRDD") {
                // Push up here as we won't access it during traverseAndPushDown
                pushUpCols(newNode);
            }
        }
        for (var i = 0; i < newNode.value["num-children"]; i++) {
            newNode.children.push(SQLCompiler.genTree(newNode, array));
        }
        return newNode;
    };
    SQLCompiler.genExpressionTree = function(parent, array, options) {
        return secondTraverse(SQLCompiler.genTree(parent, array), undefined,
                              options);
    };
    SQLCompiler.prototype = {
        compile: function(sqlQueryString, isJsonPlan) {
            var outDeferred = jQuery.Deferred();
            var self = this;
            var promiseArray = [];
            function traverseAndPushDown(node) {
                for (var i = 0; i < node.children.length; i++) {
                    traverseAndPushDown(node.children[i]);
                }
                if (node.value.class.indexOf(
                    "org.apache.spark.sql.catalyst.plans.logical.") === 0) {
                    promiseArray.push(pushDown.bind(self, node));
                }
            }
            function pushDown(treeNode) {
                var deferred = jQuery.Deferred();
                var retStruct;

                var treeNodeClass = treeNode.value.class.substring(
                    "org.apache.spark.sql.catalyst.plans.logical.".length);
                switch (treeNodeClass) {
                    case ("Project"):
                        retStruct = self._pushDownProject(treeNode);
                        break;
                    case ("Filter"):
                        retStruct = self._pushDownFilter(treeNode);
                        break;
                    case ("Join"):
                        retStruct = self._pushDownJoin(treeNode);
                        break;
                    case ("Sort"):
                        retStruct = self._pushDownSort(treeNode);
                        break;
                    case ("Aggregate"):
                        retStruct = self._pushDownAggregate(treeNode);
                        break;
                    case ("GlobalLimit"):
                        retStruct = self._pushDownGlobalLimit(treeNode);
                        break;
                    case ("LocalLimit"):
                        retStruct = self._pushDownIgnore(treeNode);
                        break;
                    default:
                        console.error("Unexpected operator: " + treeNodeClass);
                        retStruct = self._pushDownIgnore(treeNode);

                }
                retStruct
                .then(function(ret) {
                    if (ret.newTableName) {
                        treeNode.newTableName = ret.newTableName;
                    }
                    treeNode.xccli = ret.cli;
                    for (var prop in ret) {
                        if (prop !== "newTableName" && prop !== "cli") {
                            treeNode[prop] = ret[prop];
                        }
                    }
                    // Pass cols to its parent
                    pushUpCols(treeNode);
                    deferred.resolve();
                })
                .fail(deferred.reject);
                return deferred.promise();
            }
            function getCli(node, cliArray) {
                for (var i = 0; i < node.children.length; i++) {
                    getCli(node.children[i], cliArray);
                }
                if (node.value.class.indexOf(
                    "org.apache.spark.sql.catalyst.plans.logical.") === 0 &&
                    node.xccli) {
                    if (node.xccli.endsWith(";")) {
                        node.xccli = node.xccli.substring(0,
                                                         node.xccli.length - 1);
                    }
                    cliArray.push(node.xccli);
                }
            }

            var promise = isJsonPlan
                          ? PromiseHelper.resolve(sqlQueryString) // this is a json plan
                          : sendPost({"sqlQuery": sqlQueryString});

            promise
            .then(function(jsonArray) {
                var tree = SQLCompiler.genTree(undefined, jsonArray);
                traverseAndPushDown(tree);
                PromiseHelper.chain(promiseArray)
                .then(function() {
                    // Tree has been augmented with xccli
                    var cliArray = [];
                    getCli(tree, cliArray);
                    cliArray = cliArray.map(function(cli) {
                        if (cli.endsWith(",")) {
                            cli = cli.substring(0, cli.length - 1);
                        }
                        return cli;
                    });
                    var queryString = "[" + cliArray.join(",") + "]";
                    // queryString = queryString.replace(/\\/g, "\\");
                    // console.log(queryString);
                    self.sqlObj.run(queryString, tree.newTableName, tree.allCols)
                    .then(outDeferred.resolve)
                    .fail(outDeferred.reject);
                })
                .fail(outDeferred.reject);
            })
            .fail(outDeferred.reject);

            return outDeferred.promise();
        },
        _pushDownIgnore: function(node) {
            assert(node.children.length === 1);
            return PromiseHelper.resolve({
                "newTableName": node.children[0].newTableName,
            });
        },

        _pushDownProject: function(node) {
            // Pre: Project must only have 1 child and its child should've been
            // resolved already
            var self = this;
            var deferred = jQuery.Deferred();
            assert(node.children.length === 1);
            var tableName = node.children[0].newTableName;
            // Find columns to project
            var columns = [];
            var evalStrArray = [];
            var aggEvalStrArray = [];

            genMapArray(node.value.projectList, columns, evalStrArray,
                        aggEvalStrArray);
            // I don't think the below is possible with SQL...
            assert(aggEvalStrArray.length === 0);
            if (evalStrArray.length > 0) {
                var mapStrs = evalStrArray.map(function(o) {
                    if (o.evalStr.indexOf("(") === -1) {
                        // This is the alias case
                        assert(o.dataType);
                        return o.dataType + "(" + o.evalStr + ")";
                    } else {
                        return o.evalStr;
                    }
                });
                var newColNames = evalStrArray.map(function(o) {
                    return o.newColName;
                });
                if (!node.additionalRDDs) {
                    node.additionalRDDs = [];
                }
                for (var i = 0; i < newColNames.length; i++) {
                    node.additionalRDDs.push(newColNames[i]);
                }
                var newTableName = xcHelper.getTableName(tableName) +
                                   Authentication.getHashId();
                var cli;

                self.sqlObj.map(mapStrs, tableName, newColNames,
                    newTableName)
                .then(function(ret) {
                    cli = ret.cli;
                    return self.sqlObj.project(columns, newTableName);
                })
                .then(function(ret) {
                    deferred.resolve({newTableName: ret.newTableName,
                                      cli: cli + ret.cli});
                });
            } else {
                self.sqlObj.project(columns, tableName)
                .then(deferred.resolve);
            }
            // In Project we just keep what is left
            node.allCols = columns;
            return deferred.promise();
        },

        _pushDownGlobalLimit: function(node) {
            var self = this;
            var deferred = jQuery.Deferred();
            assert(node.children.length === 1);
            assert(node.value.limitExpr.length === 1);
            assert(node.value.limitExpr[0].dataType === "integer");

            function getPreviousSortOrder(curNode) {
                if (!curNode) {
                    return;
                }
                if (curNode.value.class ===
                    "org.apache.spark.sql.catalyst.plans.logical.Sort") {
                    return {order: curNode.order, name: curNode.sortColName};
                } else {
                    if (curNode.children.length > 1) {
                        // Sort order doesn't make sense if > 1 children
                        return;
                    } else {
                        return getPreviousSortOrder(curNode.children[0]);
                    }
                }
            }

            var limit = parseInt(node.value.limitExpr[0].value);
            var tableName = node.children[0].newTableName;
            var tableId = xcHelper.getTableId(tableName);
            var colName = "XC_ROW_COL_" + tableId;
            var cli = "";

            self.sqlObj.genRowNum(tableName, colName)
            .then(function(ret) {
                var newTableName = ret.newTableName;
                cli += ret.cli;
                var filterString = "le(" + colName + "," + limit + ")";
                return self.sqlObj.filter(filterString, newTableName);
            })
            .then(function(ret) {
                var newTableName = ret.newTableName;

                cli += ret.cli;
                // If any descendents are sorted, sort again. Else return as is.

                var sortObj = getPreviousSortOrder(node);
                if (sortObj && limit > 1) {
                    self.sqlObj.sort([{order: sortObj.order,
                                       name: sortObj.name}],
                                     newTableName)
                    .then(function(ret2) {
                        cli += ret2.cli;
                        deferred.resolve({newTableName: ret2.newTableName,
                                          cli: cli});
                    })
                    .fail(deferred.reject);
                } else {
                    deferred.resolve({newTableName: newTableName,
                                      cli: cli});
                }
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        _pushDownFilter: function(node) {
            var self = this;
            var deferred = jQuery.Deferred();
            assert(node.children.length === 1);
            var treeNode = SQLCompiler.genExpressionTree(undefined,
                node.value.condition.slice(0), {extractAggregates: true});

            var aggEvalStrArray = [];
            var filterString = genEvalStringRecur(treeNode,
                                            {aggEvalStrArray: aggEvalStrArray});

            var cliStatements = "";

            var tableName = node.children[0].newTableName;
            produceAggregateCli(self, aggEvalStrArray, tableName)
            .then(function(cli) {
                cliStatements += cli;
                return self.sqlObj.filter(filterString, tableName);
            })
            .then(function(retStruct) {
                cliStatements += retStruct.cli;
                deferred.resolve({
                    "newTableName": retStruct.newTableName,
                    "cli": cliStatements
                });
            })
            .fail(deferred.reject);
            return deferred.promise();
        },

        _pushDownSort: function(node) {
            var self = this;
            assert(node.children.length === 1);
            function genSortStruct(orderArray) {
                var sortColsAndOrder = [];
                for (var i = 0; i < orderArray.length; i++) {
                    var order = orderArray[i][0].direction.object;
                    assert(orderArray[i][0].class ===
                        "org.apache.spark.sql.catalyst.expressions.SortOrder");
                    order = order.substring(order.lastIndexOf(".") + 1);
                    if (order === "Ascending$") {
                        order = XcalarOrderingT.XcalarOrderingAscending;
                    } else if (order === "Descending$") {
                        order = XcalarOrderingT.XcalarOrderingDescending;
                    } else {
                        console.error("Unexpected sort order");
                        assert(0);
                    }
                    assert(orderArray[i][1].class ===
                "org.apache.spark.sql.catalyst.expressions.AttributeReference");
                    var colName = orderArray[i][1].name
                                                  .replace(/[\(|\)]/g, "_").toUpperCase();

                    var type = orderArray[i][1].dataType;
                    switch (type) {
                        case ("integer"):
                        case ("boolean"):
                        case ("string"):
                            break;
                        case ("long"):
                            type = "integer";
                            break;
                        case ("double"):
                            type = "float";
                            break;
                        case ("date"):
                            type = "string";
                            break;
                        default:
                            assert(0);
                            type = "string";
                            break;
                    }

                    sortColsAndOrder.push({name: colName,
                                           type: type,
                                           order: order});
                }
                return sortColsAndOrder;
            }
            var sortColsAndOrder = genSortStruct(node.value.order);
            var tableName = node.children[0].newTableName;

            return self.sqlObj.sort(sortColsAndOrder, tableName);
        },

        _pushDownAggregate: function(node) {
            // There are 4 possible cases in aggregates (groupbys)
            // 1 - f(g) => Currently not implemented yet. TODO
            // 2 - g(f) => Handled
            // 3 - g(g) => Catalyst cannot handle this
            // 4 - f(f) => Not valid syntax. For gb you need to have g somewhere
            var self = this;
            var cli = "";
            var deferred = jQuery.Deferred();
            assert(node.children.length === 1);
            var tableName = node.children[0].newTableName;

            var gbCols = [];
            var gbEvalStrArray = [];
            var gbAggEvalStrArray = [];
            genMapArray(node.value.groupingExpressions, gbCols, gbEvalStrArray,
                        gbAggEvalStrArray);

            assert(gbEvalStrArray.length === 0); // XXX TODO
            assert(gbAggEvalStrArray.length === 0); // XXX TODO

            var columns = [];
            var evalStrArray = [];
            var aggEvalStrArray = [];
            genMapArray(node.value.aggregateExpressions, columns, evalStrArray,
                        aggEvalStrArray, {operator: true});

            var options = {};
            if (!node.additionalRDDs) {
                node.additionalRDDs = [];
            }
            for (var i = 0; i < evalStrArray.length; i++) {
                evalStrArray[i].aggColName = evalStrArray[i].evalStr;
                delete evalStrArray[i].evalStr;
                if (!evalStrArray[i].operator) {
                    options.isIncSample = true;
                }
                node.additionalRDDs.push(evalStrArray[i].newColName);
            }

            // Catalyst cannot handle this kind of aggregates
            // Try select avg(co1 * avg(col1))
            // Case 2 Map to resolve all complex evals
            var mapStrs = [];
            var newColNames = [];
            for (var i = 0; i < evalStrArray.length; i++) {
                if (evalStrArray[i].aggColName.indexOf("(") > -1) {
                    mapStrs.push(evalStrArray[i].aggColName);
                    var newColName = "XC_GB_COL_" +
                                     Authentication.getHashId().substring(3);
                    newColNames.push(newColName);
                    evalStrArray[i].aggColName = newColName;
                }
            }

            var mapPromise = PromiseHelper.resolve();
            if (mapStrs.length > 0) {
                var newTableName = xcHelper.getTableName(tableName) +
                                   Authentication.getHashId();
                mapPromise = self.sqlObj.map(mapStrs, tableName, newColNames,
                                             newTableName);
                tableName = newTableName;
            }
            mapPromise
            .then(function(ret) {
                if (ret) {
                    cli += ret.cli;
                }
                return self.sqlObj.groupBy(gbCols, evalStrArray, tableName,
                                           options);
            })
            .then(function(ret) {
                deferred.resolve({newTableName: ret.newTableName,
                                  cli: cli + ret.cli});
            })
            .fail(deferred.reject);
            // In Aggregate we record allCols as well as temp cols
            if (node.tempCols) {
                node.tempCols = node.tempCols.concat(newColNames);
            } else {
                node.tempCols = newColNames;
            }
            node.allCols = columns;
            return deferred.promise();
        },

        _pushDownJoin: function(node) {
            var self = this;
            assert(node.children.length === 2); // It's a join. So 2 kids only

            var condTree = SQLCompiler.genExpressionTree(undefined,
                node.value.condition.slice(0));
            // NOTE: The full supportability of Xcalar's Join is represented by
            // a tree where if we traverse from the root, it needs to be AND all the
            // way and when it's not AND, it must be an EQ (stop traversing subtree)
            // For EQ subtrees, the left tree must resolve to one of the tables
            // and the right tree must resolve to the other. Otherwise it's not an
            // expression that we can support.
            // The statements above rely on the behavior that the SparkSQL
            // optimizer will hoist join conditions that are essentially filters
            // out of the join clause. If this presumption is violated, then the
            // statements above no longer hold

            // Check AND conditions and take note of all the EQ subtrees
            var eqSubtrees = [];
            var andSubtrees = [];
            if (condTree.value.class ===
                "org.apache.spark.sql.catalyst.expressions.And") {
                andSubtrees.push(condTree);
            } else if (condTree.value.class ===
                "org.apache.spark.sql.catalyst.expressions.EqualTo") {
                eqSubtrees.push(condTree);
            } else {
                // Can't do it :(
                assert(0);
                return PromiseHelper.resolve("Cannot do it;");
            }

            while (andSubtrees.length > 0) {
                var andTree = andSubtrees.shift();
                assert(andTree.children.length === 2);
                for (var i = 0; i < andTree.children.length; i++) {
                    if (andTree.children[i].value.class ===
                        "org.apache.spark.sql.catalyst.expressions.And") {
                        andSubtrees.push(andTree.children[i]);
                    } else if (andTree.children[i].value.class ===
                        "org.apache.spark.sql.catalyst.expressions.EqualTo") {
                        eqSubtrees.push(andTree.children[i]);
                    } else {
                        // Can't do it :(
                        assert(0);
                        return PromiseHelper.resolve("Cannot do it;");
                    }
                }
            }

            // children[0] === leftTable
            // children[1] === rightTable
            // Get all columns in leftTable and rightTable because in the eval
            // string, it can be in either order. For example:
            // WHERE t1.col1 = t2.col2 and t2.col3 = t1.col4
            var leftRDDCols = [];
            var rightRDDCols = [];
            getAllCols(node.children[0], leftRDDCols);
            getAllCols(node.children[1], rightRDDCols);

            // Check all EQ subtrees and resolve the maps
            var leftTableName = node.children[0].newTableName;
            var rightTableName = node.children[1].newTableName;

            var newLeftTableName = leftTableName;
            var newRightTableName = rightTableName;

            var leftCols = [];
            var rightCols = [];

            var leftMapArray = [];
            var rightMapArray = [];
            var cliArray = [];

            while (eqSubtrees.length > 0) {
                var eqTree = eqSubtrees.shift();
                assert(eqTree.children.length === 2);

                var attributeReferencesOne = [];
                var attributeReferencesTwo = [];
                getAttributeReferences(eqTree.children[0],
                                       attributeReferencesOne);
                getAttributeReferences(eqTree.children[1],
                                       attributeReferencesTwo);
                if (xcHelper.arraySubset(attributeReferencesOne, leftRDDCols) &&
                    xcHelper.arraySubset(attributeReferencesTwo, rightRDDCols))
                {
                    leftEvalStr = genEvalStringRecur(eqTree.children[0]);
                    rightEvalStr = genEvalStringRecur(eqTree.children[1]);
                } else if (xcHelper.arraySubset(attributeReferencesOne,
                                                rightRDDCols) &&
                           xcHelper.arraySubset(attributeReferencesTwo,
                                                leftRDDCols)) {
                    leftEvalStr = genEvalStringRecur(eqTree.children[1]);
                    rightEvalStr = genEvalStringRecur(eqTree.children[0]);
                } else {
                    assert(0);
                    console.error("can't do it :(");
                }

                if (leftEvalStr.indexOf("(") > 0) {
                    leftMapArray.push(leftEvalStr);
                } else {
                    leftCols.push(leftEvalStr);
                }
                if (rightEvalStr.indexOf("(") > 0) {
                    rightMapArray.push(rightEvalStr);
                } else {
                    rightCols.push(rightEvalStr);
                }
            }

            function handleMaps(mapStrArray, origTableName) {
                var deferred = jQuery.Deferred();
                if (mapStrArray.length === 0) {
                    return deferred.resolve({newTableName: origTableName,
                                             colNames: []});
                }
                var newColNames = [];
                var tableId = xcHelper.getTableId(origTableName);
                for (var i = 0; i < mapStrArray.length; i++) {
                    newColNames.push("XC_JOIN_COL_" + tableId + "_" + i);
                }
                // Record temp cols
                if (node.tempCols) {
                    node.tempCols = node.tempCols.concat(newColNames);
                } else {
                    node.tempCols = newColNames;
                }
                var newTableName = xcHelper.getTableName(origTableName) +
                                   Authentication.getHashId();
                self.sqlObj.map(mapStrArray, origTableName, newColNames,
                    newTableName)
                .then(function(ret) {
                    ret.colNames = newColNames;
                    deferred.resolve(ret);
                });
                return deferred.promise();
            }

            var deferred = jQuery.Deferred();
            PromiseHelper.when(handleMaps(leftMapArray, newLeftTableName),
                               handleMaps(rightMapArray, newRightTableName))
            .then(function(retLeft, retRight) {
                var lTableInfo = {};
                lTableInfo.tableName = retLeft.newTableName;
                lTableInfo.columns = xcHelper.arrayUnion(retLeft.colNames,
                                                         leftCols);
                lTableInfo.pulledColumns = [];
                lTableInfo.rename = [];

                var rTableInfo = {};
                rTableInfo.tableName = retRight.newTableName;
                rTableInfo.columns = xcHelper.arrayUnion(retRight.colNames,
                                                         rightCols);
                rTableInfo.pulledColumns = [];
                rTableInfo.rename = [];

                if (retLeft.cli) {
                    cliArray.push(retLeft.cli);
                }

                if (retRight.cli) {
                    cliArray.push(retRight.cli);
                }

                var joinType;
                switch (node.value.joinType.object) {
                    case ("org.apache.spark.sql.catalyst.plans.Inner$"):
                        joinType = JoinOperatorT.InnerJoin;
                        break;
                    case ("org.apache.spark.sql.catalyst.plans.LeftOuter$"):
                        joinType = JoinOperatorT.LeftOuterJoin;
                        break;
                    case ("org.apache.spark.sql.catalyst.plans.RightOuter$"):
                        joinType = JoinOperatorT.RightOuterJoin;
                        break;
                    case ("org.apache.spark.sql.catalyst.plans.FullOuter$"):
                        joinType = JoinOperatorT.FullOuterJoin;
                        break;
                    case ("org.apache.spark.sql.catalyst.plans.LeftSemi$"):
                        joinType = JoinCompoundOperatorTStr.LeftSemiJoin;
                        break;
                    case ("org.apache.spark.sql.catalyst.plans.LeftAnti$"):
                        joinType = JoinCompoundOperatorTStr.LeftAntiSemiJoin;
                        break;
                    case ("org.apache.spark.sql.catalyst.plans.CrossJoin$"):
                        joinType = JoinCompoundOperatorTStr.CrossJoin;
                        break;
                    default:
                        assert(0);
                        console.error("Join Type not supported");
                        break;
                }

                return self.sqlObj.join(joinType, lTableInfo, rTableInfo);
            })
            .then(function(ret) {
                ret.cli = cliArray.join("") + ret.cli;
                deferred.resolve(ret);
            });
            return deferred.promise();
        }
    };

    function genEvalStringRecur(condTree, acc) {
        // Traverse and construct tree
        var outStr = "";
        var opName = condTree.value.class.substring(
            condTree.value.class.indexOf("expressions."));
        if (opName in opLookup) {
            if (opName.indexOf(".aggregate.") === -1) {
                outStr += opLookup[opName] + "(";
            } else {
                if (opName.indexOf(".aggregate.") > -1) {
                    if (opName === "expressions.aggregate.AggregateExpression")
                    {
                        if (condTree.aggTree) {
                            // We need to resolve the aggTree and then push
                            // the resolved aggTree's xccli into acc
                            assert(condTree.children.length === 0);
                            assert(acc);
                            assert(acc.aggEvalStrArray);

                            // It's very important to not pass in acc.
                            // This is what we are relying on to generate the
                            // string. Otherwise it will assign it to
                            // acc.operator
                            var aggEvalStr =
                                           genEvalStringRecur(condTree.aggTree);
                            var aggVarName = "XC_AGG_" +
                                        Authentication.getHashId().substring(3);

                            acc.aggEvalStrArray.push({aggEvalStr: aggEvalStr,
                                                      aggVarName: aggVarName});
                            outStr += "^" + aggVarName;
                        } else {
                            assert(condTree.children.length > 0);
                        }
                    } else {
                        if (!acc) {
                            outStr += opLookup[opName] + "(";
                        } else {
                            acc.operator = opLookup[opName];
                        }
                    }
                }
            }
            for (var i = 0; i < condTree.value["num-children"]; i++) {
                outStr += genEvalStringRecur(condTree.children[i], acc);
                if (i < condTree.value["num-children"] -1) {
                    outStr += ",";
                }
            }
            if (opName.indexOf(".aggregate.") === -1 ||
                (opName !== "expressions.aggregate.AggregateExpression" &&
                 !acc)) {
                outStr += ")";
            }
        } else {
            // When it's not op
            if (condTree.value.class ===
               "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
                // Column Name
                if (condTree.value.name.indexOf(tablePrefix) !== 0) {
                    outStr += condTree.value.name.replace(/[\(|\)]/g, "_")
                                      .toUpperCase();
                } else {
                    outStr += condTree.value.name;
                }
            } else if (condTree.value.class ===
                "org.apache.spark.sql.catalyst.expressions.Literal") {
                if (condTree.value.dataType === "string") {
                    outStr += '"' + condTree.value.value + '"';
                } else {
                    // XXX Check how they rep booleans
                    outStr += condTree.value.value;
                }
            }
            assert(condTree.value["num-children"] === 0);
        }
        return outStr;
    }

    function genMapArray(evalList, columns, evalStrArray, aggEvalStrArray,
                         options) {
        // Note: Only top level agg functions are not extracted. The rest of the
        // agg functions will be extracted and pushed into the aggArray
        // The evalStrArray will be using the ^aggVariables
        for (var i = 0; i<evalList.length; i++) {
            var colNameStruct;
            var colName;
            if (evalList[i].length > 1) {
                assert(evalList[i][0].class ===
                "org.apache.spark.sql.catalyst.expressions.Alias");
                var acc = {aggEvalStrArray: aggEvalStrArray};
                var treeNode = SQLCompiler.genExpressionTree(undefined,
                    evalList[i].slice(1), {extractAggregates: true});
                var evalStr = genEvalStringRecur(treeNode, acc);
                var newColName = evalList[i][0].name.replace(/[\(|\)]/g, "_").toUpperCase();
                var retStruct = {newColName: newColName,
                                 evalStr: evalStr};
                colName = newColName;
                if (options && options.operator) {
                    retStruct.operator = acc.operator;
                }
                if (evalList[i].length === 2) {
                    // This is a special alias case
                    assert(evalList[i][1].dataType);
                    retStruct.dataType = convertSparkTypeToXcalarType(
                        evalList[i][1].dataType);
                }
                evalStrArray.push(retStruct);
            } else {
                colNameStruct = evalList[i][0];
                assert(colNameStruct.class ===
                "org.apache.spark.sql.catalyst.expressions.AttributeReference");
                colName = colNameStruct.name.replace(/[\(|\)]/g, "_").toUpperCase();
            }

            columns.push(colName);
        }
    }

    function produceAggregateCli(self, aggEvalStrArray, tableName) {
        var deferred = jQuery.Deferred();
        var cliStatements = "";
        var promiseArray = [];

        if (aggEvalStrArray.length === 0) {
            return PromiseHelper.resolve("");
        }
        function handleAggStatements(aggEvalStr, aggSrcTableName,
                                     aggVarName) {
            var that = this;
            var innerDeferred = jQuery.Deferred();
            that.sqlObj.aggregateWithEvalStr(aggEvalStr, aggSrcTableName,
                                             aggVarName)
            .then(function(retStruct) {
                cliStatements += retStruct.cli;
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);
            return innerDeferred.promise();
        }

        if (aggEvalStrArray.length > 0) {
            // Do aggregates first then do filter
            for (var i = 0; i < aggEvalStrArray.length; i++) {
                promiseArray.push(handleAggStatements.bind(self,
                                  aggEvalStrArray[i].aggEvalStr,
                                  tableName,
                                  aggEvalStrArray[i].aggVarName));
            }
        }
        PromiseHelper.chain(promiseArray)
        .then(function() {
            deferred.resolve(cliStatements);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    function getTablesInSubtree(tree) {
        function getTablesRecur(subtree, tablesSeen) {
            if (subtree.value.class ===
                "org.apache.spark.sql.execution.LogicalRDD") {
                if (!(subtree.newTableName in tablesSeen)) {
                    tablesSeen.push(subtree.newTableName);
                }
            }
            for (var i = 0; i < subtree.children.length; i++) {
                getTablesRecur(subtree.children[i], tablesSeen);
            }
        }
        var allTables = [];
        getTablesRecur(tree, allTables);
        return allTables;
    }

    function getQualifiersInSubtree(tree) {
        var tablesSeen = [];
        function getQualifiersRecur(subtree) {
            if (subtree.value.class ===
               "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
                if (!(subtree.value.qualifier in tablesSeen)) {
                    tablesSeen.push(subtree.value.qualifier);
                }
            }
            for (var i = 0; i < subtree.children.length; i++) {
                getQualifiersRecur(subtree.children[i]);
            }
        }
        getQualifiersRecur(tree);
        return tablesSeen;
    }

    function getAllCols(treeNode, arr) {
        if (treeNode.value.class ===
            "org.apache.spark.sql.execution.LogicalRDD") {
            for (var i = 0; i < treeNode.value.output.length; i++) {
                arr.push(treeNode.value.output[i][0].name
                                 .replace(/[\(|\)]/g, "_").toUpperCase());
            }
        }
        if (treeNode.additionalRDDs) {
            for (var i = 0; i < treeNode.additionalRDDs.length; i++) {
                if (arr.indexOf(treeNode.additionalRDDs[i]) === -1) {
                    arr.push(treeNode.additionalRDDs[i]);
                }
            }
        }
        for (var i = 0; i < treeNode.children.length; i++) {
            getAllCols(treeNode.children[i], arr);
        }
    }

    function getAttributeReferences(treeNode, arr) {
        if (treeNode.value.class ===
            "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
            if (arr.indexOf(treeNode.value.name) === -1) {
                arr.push(treeNode.value.name.replace(/[\(|\)]/g, "_").toUpperCase());
            }
        }

        for (var i = 0; i < treeNode.children.length; i++) {
            getAttributeReferences(treeNode.children[i], arr);
        }
    }

    function convertSparkTypeToXcalarType(dataType) {
        switch (dataType) {
            case ("double"):
                return "float";
            case ("integer"):
            case ("long"):
                return "int";
            case ("boolean"):
                return "bool";
            case ("string"):
            case ("date"):
                return "string";
            default:
                assert(0);
                return "string";
        }
    }

    if (typeof exports !== "undefined") {
        if (typeof module !== "undefined" && module.exports) {
            exports = module.exports = SQLCompiler;
        }
        exports.SQLCompiler = SQLCompiler;
    } else {
        root.SQLCompiler = SQLCompiler;
    }
}());
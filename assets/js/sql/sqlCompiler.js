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
        "expressions.CaseWhenCodegen": null, // XXX we compile these to if and
                                             // ifstr
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
        "expressions.Right": "right", // XXX right(str, 5) ==
                                      // substring(str, -5, 0)
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
        "expressions.IsNull": null, // XXX we have to put not(exists)
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
        "expressions.aggregate.AggregateExpression": null,
        "expressions.ScalarSubquery": null
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
            this.usrCols = [];
            this.xcCols = [];
            this.sparkCols = [];
            var rdds = value.output;
            for (var i = 0; i < rdds.length; i++) {
                var acc = {numOps: 0};
                var evalStr = genEvalStringRecur(SQLCompiler.genTree(undefined,
                    rdds[i].slice(0)), acc);
                if (acc.numOps > 0) {
                    debugger;
                    console.info(rdds[i]);
                }
                if (evalStr.indexOf(tablePrefix) === 0) {
                    this.newTableName = evalStr.substring(tablePrefix.length);
                    break;
                } else {
                    var col = {colName: evalStr,
                               colId: rdds[i][0].exprId.id};
                    this.usrCols.push(col);
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
                        length.value = "" + (startIndex.value * 1 +
                                             length.value * 1);
                    } else {
                        var addN = addNode();
                        addN.children.push(node.children[1], node.children[2]);
                        addN.parent = node;
                        node.children[2] = addN;
                    }
                } else {
                    var subNode = subtractNode();
                    subNode.children.push(node.children[1],
                                          literalNumberNode(1));
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
                    lastNode.children[2] =node.children[node.children.length-1];
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

                // Note: The first OR node or the ONLY eq node will be the root
                // of the tree
                assert(node.children.length >= 2);
                var prevOrNode;
                var newEqNode;
                retNode = undefined;
                for (var i = 0; i < node.children.length - 1; i++) {
                    newEqNode = eqNode();
                    newEqNode.children.push(node.children[0]);
                    newEqNode.children.push(node.children[i+1]);
                    node.children[0].parent = newEqNode;
                    node.children[i+1].parent = newEqNode;
                    if (i < node.children.length - 2) {
                        var newOrNode = orNode();
                        newOrNode.children.push(newEqNode);
                        newEqNode.parent = newOrNode;
                        if (prevOrNode) {
                            prevOrNode.children.push(newOrNode);
                            newOrNode.parent = prevOrNode;
                        } else {
                            retNode = newOrNode;
                        }
                        prevOrNode = newOrNode;
                    } else {
                        if (prevOrNode) {
                            prevOrNode.children.push(newEqNode);
                            newEqNode.parent = prevOrNode;
                        }
                    }
                }
                if (!retNode) {
                    // Edge case where it's in just one element
                    // e.g. a in [1]
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
            case ("expressions.ScalarSubquery"):
                // The result of the subquery should be a single value
                // So an Aggregate node should be the first in the plan
                assert(node.value.plan[0].class ===
                       "org.apache.spark.sql.catalyst.plans.logical.Aggregate");
                node.value.plan[0].class =
                      "org.apache.spark.sql.catalyst.plans.logical.XcAggregate";
                var subqueryTree = SQLCompiler.genTree(undefined,
                                                       node.value.plan);
                node.subqueryTree = subqueryTree;
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

        if (node.aggTree) {
            // aggTree's root node is expressions.aggregate.*
            // so it won't hit any of the cases in second traverse
            // however, its grandchildren might be substring, etc.
            secondTraverse(node.aggTree, undefined, options);
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
                 encodeURIComponent(encodeURIComponent(WorkbookManager.getActiveWKBK())) +
                 "/true/true",
            success: function(data) {
                if (data.status === 200) {
                    try {
                        deferred.resolve(JSON.parse(JSON.parse(data.stdout)
                                                        .sqlQuery));
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
        // In pushUpCols, we have three types of columns:
        // 1. usrCols are columns that are visible to the user at a given node
        // 2. xcCols are temp columns generated by xcalar
        // 3. sparkCols are temp columns generated by spark

        // XXX sparkCols need to be implemented later. We've seen two possible
        // cases: 1) colName#exprId. Spark will create an Alias expression for
        // it. Then it goes to usrCols. We just need to record it in sparkCols.
        // 2) "exist" in Existence Join. We will handle it when implementing
        // Existence Join.
        // 3) "Expand" logical plan

        // Push cols names to its direct parent, except from Join
        if (node.parent && node.parent.value.class !==
            "org.apache.spark.sql.catalyst.plans.logical.Join") {
            // Must create a deep copy of the array.
            // Otherwise we are just assigning the pointer. So when the
            // parent changes, the children change as well.
            node.parent.usrCols = jQuery.extend(true, [], node.usrCols);
            node.parent.xcCols = jQuery.extend(true, [], node.xcCols);
            node.parent.sparkCols = jQuery.extend(true, [], node.sparkCols);
        }
    }
    SQLCompiler.genTree = function(parent, array) {
        var newNode = new TreeNode(array.shift());
        if (parent) {
            newNode.parent = parent;
            if (newNode.value.class ===
                                  "org.apache.spark.sql.execution.LogicalRDD") {
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
    function traverseAndPushDown(self, node) {
        var promiseArray = [];
        traverse(node, promiseArray);
        return promiseArray;
        function traverse(node, promiseArray) {
            for (var i = 0; i < node.children.length; i++) {
                traverse(node.children[i], promiseArray);
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
            if (treeNode.children.length === 1 &&
                treeNode.children[0].renamedCols) {
                // Join is handled in pushDownJoin
                treeNode.options = {renamedColIds: getRenamedCols(treeNode.children[0])
                                                   .renamedColIds};
            }
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
                case ("XcAggregate"):
                    retStruct = self._pushDownXcAggregate(treeNode);
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
    SQLCompiler.prototype = {
        compile: function(sqlQueryString, isJsonPlan) {
            var outDeferred = jQuery.Deferred();
            var self = this;

            var promise = isJsonPlan
                          ? PromiseHelper.resolve(sqlQueryString)
                          // this is a json plan
                          : sendPost({"sqlQuery": sqlQueryString});

            promise
            .then(function(jsonArray) {
                var tree = SQLCompiler.genTree(undefined, jsonArray);
                if (tree.value.class ===
                                  "org.apache.spark.sql.execution.LogicalRDD") {
                    // If the logicalRDD is root, we should add an extra Project
                    var newNode = ProjectNode(tree.value.output.slice(0, -1));
                    newNode.children = [tree];
                    tree.parent = newNode;
                    pushUpCols(tree);
                    tree = newNode;
                }
                var promiseArray = traverseAndPushDown(self, tree);
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
                    self.sqlObj.run(queryString, tree.newTableName,tree.usrCols)
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

            var options = node.options || {};
            genMapArray(node.value.projectList, columns, evalStrArray,
                        aggEvalStrArray, options);
            // I don't think the below is possible with SQL...
            assert(aggEvalStrArray.length === 0);

            // Change node.usrCols
            node.usrCols = columns;
            // Extract colNames from column structs
            // and check if it has renamed columns
            var colNames = [];
            for (var i = 0; i < columns.length; i++) {
                colNames.push(columns[i].colName);
                if (!node.renamedCols && columns[i].rename) {
                    node.renamedCols = true;
                }
            }

            if (evalStrArray.length > 0) {
                var mapStrs = evalStrArray.map(function(o) {
                    return o.evalStr;
                });
                var newColNames = evalStrArray.map(function(o) {
                    return o.newColName;
                });
                var newTableName = xcHelper.getTableName(tableName) +
                                   Authentication.getHashId();
                var cli;

                self.sqlObj.map(mapStrs, tableName, newColNames,
                    newTableName)
                .then(function(ret) {
                    cli = ret.cli;
                    return self.sqlObj.project(colNames, newTableName);
                })
                .then(function(ret) {
                    deferred.resolve({newTableName: ret.newTableName,
                                      cli: cli + ret.cli});
                });
            } else {
                self.sqlObj.project(colNames, tableName)
                .then(deferred.resolve);
            }
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
            var subqueryArray = [];
            var options = node.options || {};
            if (options.renamedColIds && options.renamedColIds.length > 0) {
                node.renamedCols = true;
            }
            options.xcAggregate = true;
            var filterString = genEvalStringRecur(treeNode,
                                            {aggEvalStrArray: aggEvalStrArray,
                                             subqueryArray: subqueryArray},
                                             options);

            var cliStatements = "";

            var tableName = node.children[0].newTableName;
            produceAggregateCli(self, aggEvalStrArray, tableName)
            .then(function(cli) {
                cliStatements += cli;
                return produceSubqueryCli(self, subqueryArray);
            })
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
            function genSortStruct(orderArray, options) {
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
                                                  .replace(/[\(|\)|\.]/g, "_")
                                                  .toUpperCase();
                    var id = orderArray[i][1].exprId.id;
                    if (options && options.renamedColIds &&
                        options.renamedColIds.indexOf(id) !== -1) {
                        colName += "_E" + id;
                    }

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
            var options = node.options || {};
            if (options.renamedColIds && options.renamedColIds.length > 0) {
                node.renamedCols = true;
            }
            var sortColsAndOrder = genSortStruct(node.value.order, options);
            var tableName = node.children[0].newTableName;

            return self.sqlObj.sort(sortColsAndOrder, tableName);
        },
        _pushDownXcAggregate: function(node) {
            // This is for Xcalar Aggregate which produces a single value
            var self = this;

            assert(node.children.length === 1);
            assert(node.value.groupingExpressions.length === 0);
            assert(node.value.aggregateExpressions.length === 1);
            assert(node.subqVarName);
            assert(node.value.aggregateExpressions[0][0].class ===
                "org.apache.spark.sql.catalyst.expressions.Alias");

            var tableName = node.children[0].newTableName;
            var treeNode = SQLCompiler.genExpressionTree(undefined,
                           node.value.aggregateExpressions[0].slice(1));
            var options = node.options || {};
            var evalStr = genEvalStringRecur(treeNode, undefined, options);
            return self.sqlObj.aggregateWithEvalStr(evalStr,
                                                    tableName,
                                                    node.subqVarName);
        },
        _pushDownAggregate: function(node) {
            // There are 4 possible cases in aggregates (groupbys)
            // 1 - f(g) => Handled
            // 2 - g(f) => Handled
            // 3 - g(g) => Catalyst cannot handle this
            // 4 - f(f) => Not valid syntax. For gb you need to have g somewhere
            var self = this;
            var cli = "";
            var deferred = jQuery.Deferred();
            assert(node.children.length === 1);
            var tableName = node.children[0].newTableName;

            var options = node.options || {};
            // Resolve group on clause
            var gbCols = [];
            var gbEvalStrArray = [];
            var gbAggEvalStrArray = [];
            if (node.value.groupingExpressions.length > 0) {
                for (var i = 0; i < node.value.groupingExpressions.length; i++) {
                    // subquery is not allowed in GROUP BY
                    assert(node.value.groupingExpressions[i][0].class !==
                    "org.apache.spark.sql.catalyst.expressions.ScalarSubquery");
                }
                options.groupby = true;
                genMapArray(node.value.groupingExpressions, gbCols, gbEvalStrArray,
                            gbAggEvalStrArray, options);
                assert(gbAggEvalStrArray.length === 0);
                // aggregate functions are not allowed in GROUP BY
            }
            // Extract colNames from column structs
            var gbColNames = [];
            for (var i = 0; i < gbCols.length; i++) {
                gbColNames.push(gbCols[i].colName);
            }

            // Resolve each group's map clause
            var columns = [];
            var evalStrArray = [];
            var aggEvalStrArray = [];
            options.operator = true;
            options.groupby = false;
            genMapArray(node.value.aggregateExpressions, columns, evalStrArray,
                        aggEvalStrArray, options);
            // Extract colNames from column structs
            var aggColNames = [];
            for (var i = 0; i < columns.length; i++) {
                aggColNames.push(columns[i].colName);
                if (!node.renamedCols && columns[i].rename) {
                    node.renamedCols = true;
                }
            }

            // Here are the steps on how we compile groupbys
            // 1. For all in evalStrArray, split into gArray and fArray based
            // on whether they have operator
            // 2. For all in gArray, if hasOp in evalStr,
            //    - Push into firstMapArray
            //    - Replace value inside with aggVarName
            // 3. For all in aggArray, if hasOp in aggEval after strip, fgf case
            //    - Push into firstMapArray
            //    - Replace value inside with aggVarName
            // 4. Special case: for cases where there's no group by clause,
            // we will create a column of 1s and group on it. for case where
            // there is no map operation, we will just do a count(1)
            // 5. For all in fArray, if hasOp in EvalStr, push op into
            // secondMapArray. Be sure to use the column name that's in the
            // original alias call
            // 6. Trigger the lazy call
            // firstMapArray
            // .then(groupby)
            // .then(secondMapArray)

            var gArray = [];
            var fArray = [];

            // Step 1
            for (var i = 0; i < evalStrArray.length; i++) {
                if (evalStrArray[i].operator) {
                    gArray.push(evalStrArray[i]);
                } else {
                    fArray.push(evalStrArray[i]);
                }
            }

            // Step 2
            var firstMapArray = [];
            var firstMapColNames = [];

            // Push the group by eval string into firstMapArray
            for (var i = 0; i < gbEvalStrArray.length; i++) {
                var inAgg = false;
                // Check if the gbExpression is also in aggExpression
                for (var j = 0; j < fArray.length; j++) {
                    var origGbColName = gbEvalStrArray[i].newColName;
                    // This is importatnt as there will be an alias in aggExp
                    // but no agg in gbExp. So we need to compare the evalStr
                    if (gbEvalStrArray[i].evalStr === fArray[j].evalStr) {
                        var newGbColName = fArray[j].newColName;
                        firstMapColNames.push(newGbColName);
                        gbColNames[gbColNames.indexOf(origGbColName)] = newGbColName;
                        inAgg = true;
                        // Mark fArray[i] as "used in group by"
                        fArray[j].groupby = true;
                        break;
                    }
                }
                if (!inAgg) {
                    firstMapColNames.push(gbEvalStrArray[i].newColName);
                }
                firstMapArray.push(gbEvalStrArray[i].evalStr);
            }

            for (var i = 0; i < gArray.length; i++) {
                gArray[i].aggColName = gArray[i].evalStr;
                delete gArray[i].evalStr;
                if (gArray[i].numOps > 0) {
                    firstMapArray.push(gArray[i].aggColName);
                    var newColName = "XC_GB_COL_" +
                                     Authentication.getHashId().substring(3);
                    firstMapColNames.push(newColName);
                    gArray[i].aggColName = newColName;
                }

            }

            // Step 3
            var aggVarNames = [];
            // aggVarNames will be pushed into node.xcCols
            for (var i = 0; i < aggEvalStrArray.length; i++) {
                var gbMapCol = {};
                var rs = extractAndReplace(aggEvalStrArray[i]);
                assert(rs);
                gbMapCol.operator = rs.firstOp;
                if (aggEvalStrArray[i].numOps > 1) {
                    var newColName = "XC_GB_COL_" +
                                     Authentication.getHashId().substring(3);
                    firstMapColNames.push(newColName);
                    firstMapArray.push(rs.inside);
                    gbMapCol.aggColName = newColName;
                } else {
                    gbMapCol.aggColName = rs.inside;
                }
                gbMapCol.newColName = aggEvalStrArray[i].aggVarName;
                gArray.push(gbMapCol);
                aggVarNames.push(aggEvalStrArray[i].aggVarName);
            }

            // Step 4
            // Special cases
            // Select avg(col1)
            // from table
            // This results in a table where it's just 1 value

            // Another special case
            // Select col1 [as col2]
            // from table
            // grouby col1
            var gbTempColName;
            if (gbColNames.length === 0) {
                firstMapArray.push("int(1)");
                gbTempColName = "XC_GB_COL_" + Authentication.getHashId()
                                                             .substring(3);
                firstMapColNames.push(gbTempColName);
                gbColNames = [gbTempColName];
            }

            var tempCol;
            if (gArray.length === 0) {
                var newColName = "XC_GB_COL_" +
                                 Authentication.getHashId().substring(3);
                gArray = [{operator: "count",
                           aggColName: "1",
                           newColName: newColName}];
                tempCol = newColName;
            }

            // Step 5
            var secondMapArray = [];
            var secondMapColNames = [];
            for (var i = 0; i < fArray.length; i++) {
                if (fArray[i].numOps > 0 && !fArray[i].groupby) {
                    secondMapArray.push(fArray[i].evalStr);
                    secondMapColNames.push(fArray[i].newColName);
                }
                // This if is necessary because of the case where
                // select col1
                // from table
                // group by col1
            }

            // Step 6
            var newTableName = tableName;
            var firstMapPromise = function() {
                if (firstMapArray.length > 0) {
                    var srcTableName = newTableName;
                    newTableName =  xcHelper.getTableName(newTableName) +
                                    Authentication.getHashId();
                    return self.sqlObj.map(firstMapArray, srcTableName,
                                           firstMapColNames, newTableName);
                } else {
                    return PromiseHelper.resolve();
                }
            };

            var secondMapPromise = function() {
                if (secondMapArray.length > 0) {
                    var srcTableName = newTableName;
                    newTableName =  xcHelper.getTableName(newTableName) +
                                    Authentication.getHashId();
                    return self.sqlObj.map(secondMapArray, srcTableName,
                                           secondMapColNames, newTableName);
                } else {
                    return PromiseHelper.resolve();
                }
            };

            firstMapPromise()
            .then(function(ret) {
                if (ret) {
                    cli += ret.cli;
                    newTableName = ret.newTableName;
                }
                return self.sqlObj.groupBy(gbColNames, gArray, newTableName);
            })
            .then(function(ret) {
                assert(ret);
                newTableName = ret.newTableName;
                cli += ret.cli;
                for (var i = 0; i < ret.tempCols.length; i++) {
                    node.xcCols.push({colName: ret.tempCols[i]});
                }
                return secondMapPromise();
            })
            .then(function(ret) {
                if (ret) {
                    cli += ret.cli;
                    newTableName = ret.newTableName;
                }
                deferred.resolve({newTableName: newTableName,
                                  cli: cli});
            })
            .fail(deferred.reject);
            // End of Step 6

            node.usrCols = columns;
            // Also track xcCols
            for (var i = 0; i < secondMapColNames.length; i++) {
                node.xcCols.push({colName: secondMapColNames[i]});
            }
            for (var i = 0; i < firstMapColNames.length; i++) {
                // Avoid adding the "col + 1" in
                // select col+1 from t1 group by col + 1
                // It belongs to usrCols
                if (aggColNames.indexOf(firstMapColNames[i]) === -1) {
                    node.xcCols.push({colName: firstMapColNames[i]});
                }
            }
            for (var i = 0; i < gbColNames.length; i++) {
                // If gbCol is a map str, it should exist in firstMapColNames
                // Avoid adding it twice.
                if (firstMapColNames.indexOf(gbColNames[i]) === -1 &&
                    aggColNames.indexOf(gbColNames[i]) === -1) {
                    node.xcCols.push({colName: gbColNames[i]});
                }
            }
            if (tempCol) {
                node.xcCols.push({colName: tempCol});
            }
            for (var i = 0; i < aggVarNames.length; i++) {
                node.xcCols.push({colName: aggVarNames[i]});
            }
            assertCheckCollision(node.xcCols);

            return deferred.promise();
        },

        _pushDownJoin: function(node) {
            var self = this;
            assert(node.children.length === 2); // It's a join. So 2 kids only

            // Special case for Anti Semi Joins
            // Check if root node is OR
            // If yes, assert OR's one child is &= tree. Other child is isNull,
            // followed by the identical &= tree
            // If root node is not OR, tree must be &=
            // If root node is OR, change root node to be &= subTree and set
            // removeNull to true
            // The above assertion and changes causes left anti semi joins to
            // forever be an &= subtree.
            if (node.value.joinType.object ===
                "org.apache.spark.sql.catalyst.plans.LeftAnti$") {
                if (node.value.condition[0].class ===
                    "org.apache.spark.sql.catalyst.expressions.Or") {
                    var leftSubtree = [node.value.condition[1]];
                    var rightSubtree = [];
                    var numNodesInLeftTree = leftSubtree[0]["num-children"];
                    var idx = 1;
                    while (numNodesInLeftTree > 0) {
                        leftSubtree.push(node.value.condition[++idx]);
                        numNodesInLeftTree += node.value.condition[idx]["num-children"];
                        numNodesInLeftTree--;
                    }
                    for (var i = idx+1; i < node.value.condition.length; i++) {
                        rightSubtree.push(node.value.condition[i]);
                    }

                    // Find the subtree that has IsNull as the first node and
                    // assign that as the right subtree
                    if (leftSubtree[0].class ===
                        "org.apache.spark.sql.catalyst.expressions.IsNull") {
                        var tempTree = rightSubtree;
                        rightSubtree = leftSubtree;
                        leftSubtree = tempTree;
                    }
                    // Remove the IsNull node
                    rightSubtree.shift();
                    // Assert that both subtrees are the same by stringifying
                    assert(JSON.stringify(leftSubtree) ===
                           JSON.stringify(rightSubtree));
                    // All good, now set removeNull to true and over write the
                    // condition array with the left subtree
                    node.xcRemoveNull = true;
                    node.value.condition = leftSubtree;
                } else {
                    node.xcRemoveNull = false;
                }
            }

            var condTree = SQLCompiler.genExpressionTree(undefined,
                node.value.condition.slice(0));

            node.xcCols = [];

            // NOTE: The full supportability of Xcalar's Join is represented by
            // a tree where if we traverse from the root, it needs to be AND all
            // the way and when it's not AND, it must be an EQ (stop traversing
            // subtree)
            // For EQ subtrees, the left tree must resolve to one of the tables
            // and the right tree must resolve to the other. Otherwise it's not
            // an expression that we can support.
            // The statements above rely on the behavior that the SparkSQL
            // optimizer will hoist join conditions that are essentially filters
            // out of the join clause. If this presumption is violated, then the
            // statements above no longer hold

            // Check AND conditions and take note of all the EQ subtrees
            var eqSubtrees = [];
            var andSubtrees = [];
            var catchAll = false;
            if (condTree.value.class ===
                "org.apache.spark.sql.catalyst.expressions.And") {
                andSubtrees.push(condTree);
            } else if (condTree.value.class ===
                "org.apache.spark.sql.catalyst.expressions.EqualTo") {
                eqSubtrees.push(condTree);
            } else {
                // No optimization
                console.info("catchall join");
                catchAll = true;
            }

            while (andSubtrees.length > 0 && !catchAll) {
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
                        catchAll = true;
                        console.info("catchall join");
                        break;
                    }
                    // TODO: implement optimization for andOrEqJoins
                }
            }

            var leftTableName = node.children[0].newTableName;
            var rightTableName = node.children[1].newTableName;

            if (!catchAll) {
                // For andEqTrees
                var retStruct = __getJoinMapArrays(node, eqSubtrees);
                if (!retStruct) {
                    catchAll = true;
                    joinPromise = __catchAllJoin(self, node, condTree,
                                                 leftTableName,
                                                 rightTableName);
                } else {
                    joinPromise = __handleAndEqJoins(self, retStruct,
                                                     leftTableName,
                                                     rightTableName,
                                                     node);
                }
            } else {
                joinPromise = __catchAllJoin(self, node, condTree, leftTableName,
                                             rightTableName);
            }
            node.usrCols = jQuery.extend(true, [], node.children[0].usrCols
                                         .concat(node.children[1].usrCols));
            node.xcCols = jQuery.extend(true, [], node.xcCols
                                            .concat(node.children[0].xcCols)
                                            .concat(node.children[1].xcCols));
            node.sparkCols = jQuery.extend(true, [], node.children[0].sparkCols
                                         .concat(node.children[1].sparkCols));
            assertCheckCollision(node.usrCols);
            assertCheckCollision(node.xcCols);
            assertCheckCollision(node.sparkCols);
            return joinPromise;
        }
    };
    // Helper functions for join
    function __catchAllJoin(sqlCompiler, node, condTree, leftTableName,
                            rightTableName) {

        assert((node.value.joinType.object !==
                "org.apache.spark.sql.catalyst.plans.LeftSemi$") &&
               (node.value.joinType.object !==
                "org.apache.spark.sql.catalyst.plans.LeftAnti$"));

        var lTableInfo = {};
        lTableInfo.tableName = leftTableName;
        lTableInfo.columns = []; // CrossJoin does not need columns
        lTableInfo.pulledColumns = [];
        lTableInfo.rename = [];

        var rTableInfo = {};
        rTableInfo.tableName = rightTableName;
        rTableInfo.columns = []; // CrossJoin does not need columns
        rTableInfo.pulledColumns = [];
        rTableInfo.rename = [];
        __resolveCollision(node.children[0].usrCols,
                         node.children[1].usrCols,
                         lTableInfo.rename, rTableInfo.rename);
        __resolveCollision(node.children[0].xcCols,
                         node.children[1].xcCols,
                         lTableInfo.rename, rTableInfo.rename);
        __resolveCollision(node.children[0].sparkCols,
                         node.children[1].sparkCols,
                         lTableInfo.rename, rTableInfo.rename);
        var options = {};
        var renamedColIds = [];
        if (node.children[0].renamedCols || node.children[1].renamedCols ||
            lTableInfo.rename.length > 0 || rTableInfo.rename.length > 0) {
            node.renamedCols = true;
            renamedColIds = renamedColIds.concat(
                                getRenamedCols(node.children[0]).renamedColIds);
            renamedColIds = renamedColIds.concat(
                                getRenamedCols(node.children[1]).renamedColIds);
        }
        options.renamedColIds = renamedColIds;
        var acc = {}; // for ScalarSubquery use case
        var filterEval = genEvalStringRecur(condTree, acc, options);

        return sqlCompiler.sqlObj.join(JoinOperatorT.CrossJoin, lTableInfo,
                                       rTableInfo, {evalString: filterEval});
    }

    function __getJoinMapArrays(node, eqSubtrees) {
        // children[0] === leftTable
        // children[1] === rightTable
        // Get all columns in leftTable and rightTable because in the eval
        // string, it can be in either order. For example:
        // WHERE t1.col1 = t2.col2 and t2.col3 = t1.col4

        var leftRetStruct = getRenamedCols(node.children[0],
                                           {returnColArray: true});
        var leftOptions = {renamedColIds: leftRetStruct.renamedColIds};
        var leftRDDCols = leftRetStruct.rddCols;

        var rightRetStruct = getRenamedCols(node.children[1],
                                           {returnColArray: true});
        var rightOptions = {renamedColIds: rightRetStruct.renamedColIds};
        var rightRDDCols = rightRetStruct.rddCols;

        // Check all EQ subtrees and resolve the maps

        var leftCols = [];
        var rightCols = [];

        var leftMapArray = [];
        var rightMapArray = [];

        while (eqSubtrees.length > 0) {
            var eqTree = eqSubtrees.shift();
            assert(eqTree.children.length === 2);

            var attributeReferencesOne = [];
            var attributeReferencesTwo = [];
            var options = {};
            options.renamedColIds = leftOptions.renamedColIds
                                    .concat(rightOptions.renamedColIds);
            if (options.renamedColIds.length > 0) {
                node.renamedCols = true;
            }
            getAttributeReferences(eqTree.children[0],
                                   attributeReferencesOne, options);
            getAttributeReferences(eqTree.children[1],
                                   attributeReferencesTwo, options);
            var leftAcc = {numOps: 0};
            var rightAcc = {numOps: 0};
            if (xcHelper.arraySubset(attributeReferencesOne, leftRDDCols) &&
                xcHelper.arraySubset(attributeReferencesTwo, rightRDDCols))
            {
                leftEvalStr = genEvalStringRecur(eqTree.children[0],
                                                 leftAcc, leftOptions);
                rightEvalStr = genEvalStringRecur(eqTree.children[1],
                                                  rightAcc, rightOptions);
            } else if (xcHelper.arraySubset(attributeReferencesOne,
                                            rightRDDCols) &&
                       xcHelper.arraySubset(attributeReferencesTwo,
                                            leftRDDCols)) {
                leftEvalStr = genEvalStringRecur(eqTree.children[1],
                                                 rightAcc, rightOptions);
                rightEvalStr = genEvalStringRecur(eqTree.children[0],
                                                  leftAcc, leftOptions);
            } else {
                // E.g. table1.col1.substring(2) + table2.col2.substring(2)
                // == table1.col3.substring(2) + table2.col4.substring(2)
                // There is no way to reduce this to left and right tables
                return;
            }

            if (leftAcc.numOps > 0) {
                leftMapArray.push(leftEvalStr);
            } else {
                leftCols.push(leftEvalStr);
            }
            if (rightAcc.numOps > 0) {
                rightMapArray.push(rightEvalStr);
            } else {
                rightCols.push(rightEvalStr);
            }
        }
        return {leftMapArray: leftMapArray,
                leftCols: leftCols,
                rightMapArray: rightMapArray,
                rightCols: rightCols};
    }

    function __handleAndEqJoins(sqlCompiler, mapArrayStruct, newLeftTableName,
                                newRightTableName, node,
                                leftRDDCols, rightRDDCols) {
        function handleMaps(mapStrArray, origTableName) {
            var deferred = jQuery.Deferred();
            if (mapStrArray.length === 0) {
                return deferred.resolve({newTableName: origTableName,
                                         colNames: []});
            }
            var newColNames = [];
            var tableId = xcHelper.getTableId(origTableName);
            for (var i = 0; i < mapStrArray.length; i++) {
                var tempCol = "XC_JOIN_COL_" + tableId + "_" + i;
                newColNames.push(tempCol);
                // Record temp cols
                node.xcCols.push({colName: tempCol});
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
        var self = sqlCompiler;
        var leftMapArray = mapArrayStruct.leftMapArray;
        var rightMapArray = mapArrayStruct.rightMapArray;
        var leftCols = mapArrayStruct.leftCols;
        var rightCols = mapArrayStruct.rightCols;
        var cliArray = [];
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
            if (node.xcRemoveNull) {
                // This flag is set for left anti semi join. It means to
                // removeNulls in the left table
                lTableInfo.removeNull = true;
            }

            var rTableInfo = {};
            rTableInfo.tableName = retRight.newTableName;
            rTableInfo.columns = xcHelper.arrayUnion(retRight.colNames,
                                                     rightCols);
            rTableInfo.pulledColumns = [];
            rTableInfo.rename = [];


            __resolveCollision(node.children[0].usrCols,
                             node.children[1].usrCols,
                             lTableInfo.rename, rTableInfo.rename);
            __resolveCollision(node.children[0].xcCols,
                             node.children[1].xcCols,
                             lTableInfo.rename, rTableInfo.rename);
            __resolveCollision(node.children[0].sparkCols,
                             node.children[1].sparkCols,
                             lTableInfo.rename, rTableInfo.rename);
            if (lTableInfo.rename.length > 0 || rTableInfo.rename.length > 0) {
                node.renamedCols = true;
            }

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
                    // Turns out that left semi is identical to inner
                    // except that it only keeps columns in the left table
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
        .then(function(retJoin) {
            var overallRetStruct = {};
            overallRetStruct.newTableName = retJoin.newTableName;
            cliArray.push(retJoin.cli);
            overallRetStruct.cli = cliArray.join("");
            deferred.resolve(overallRetStruct);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
    function __resolveCollision(leftCols, rightCols, leftRename, rightRename) {
        // There could be three colliding cases:

        // 1. their xx their => keep the left and rename the right using the
        // exprId. according to spark's documentation, it's guaranteed to be
        // globally unique. Also, I confirmed that in the corner case
        // (subquery+join) we made, it is referring to the correct id. How it
        //  works is like: the exprId is firstly generated in the subquery and
        //  then referred by the outside query.

        // 2. our xx our => just append a random ID. In the query, there will
        // be no reference to columns generated by us. Therefore all we need to
        // do is to resolve the collision. No need to worry about other
        // references in genXXX() functions.

        // 3. our xx their => rename their column using exprId because of
        // reasons listed in case 1 & 2.
        for (var i = 0; i < leftCols.length; i++) {
            for (var j = 0; j < rightCols.length; j++) {
                if (leftCols[i].colName === rightCols[j].colName) {
                    var oldName = rightCols[j].colName;
                    if (rightCols[j].colId) {
                        // Right has ID, rename right
                        var newName = oldName + "_E" + rightCols[j].colId;
                        rightRename.push(xcHelper.getJoinRenameMap(oldName,
                                         newName));
                        rightCols[j].rename = newName;
                    } else if (leftCols[i].colId) {
                        // Right has no ID and left has ID, rename left
                        var newName = oldName + "_E" + leftCols[i].colId;
                        leftRename.push(xcHelper.getJoinRenameMap(oldName,
                                         newName));
                        leftCols[i].rename = newName;
                    } else {
                        // Neither has ID, append a random hash value
                        // This is for case#2
                        var newName = oldName + "_E" +
                                      Authentication.getHashId().substring(3);
                        rightRename.push(xcHelper.getJoinRenameMap(oldName,
                                         newName));
                        rightCols[j].rename = newName;
                    }
                    break;
                }
            }
        }
    }
    function assertCheckCollision(cols) {
        if (cols.length > 0) {
            var set = new Set();
            for (var i = 0; i < cols.length; i++) {
                if (cols[i].rename) {
                    if (set.has(cols[i].rename)) {
                        assert(0);
                        // We should never hit this
                    }
                    set.add(cols[i].rename);
                } else {
                    if (set.has(cols[i].colName)) {
                        assert(0);
                        // We should never hit this
                    }
                    set.add(cols[i].colName);
                }
            }
        }
    }
    // End of helper functions for join
    function getRenamedCols(node, options) {
        // Second argument is used by Join to push colName/rename into rddCols
        var retStruct = {renamedColIds: []};
        if (options && options.returnColArray) {
            retStruct.rddCols = [];
        }
        for (var i = 0; i < node.usrCols.length; i++) {
            if (node.usrCols[i].rename) {
                retStruct.renamedColIds.push(node.usrCols[i].colId);
                if (options && options.returnColArray) {
                    retStruct.rddCols.push(node.usrCols[i].rename);
                }
            } else if (options && options.returnColArray) {
                retStruct.rddCols.push(node.usrCols[i].colName);
            }
        }
        return retStruct;
    }

    function genEvalStringRecur(condTree, acc, options) {
        // Traverse and construct tree
        var outStr = "";
        var opName = condTree.value.class.substring(
            condTree.value.class.indexOf("expressions."));
        if (opName in opLookup) {
            if (opName.indexOf(".aggregate.") > -1) {
                if (opName === "expressions.aggregate.AggregateExpression") {
                    if (acc) {
                        acc.isDistinct = condTree.value.isDistinct;
                    }
                    if (condTree.aggTree) {
                        // We need to resolve the aggTree and then push
                        // the resolved aggTree's xccli into acc
                        assert(condTree.children.length === 0);
                        assert(acc);
                        assert(acc.aggEvalStrArray);

                        // It's very important to include a flag in acc.
                        // This is what we are relying on to generate the
                        // string. Otherwise it will assign it to
                        // acc.operator
                        var aggAcc = {numOps: 0, noAssignOp: true};
                        var aggEvalStr =
                                       genEvalStringRecur(condTree.aggTree,
                                        aggAcc, options);
                        var aggVarName = "XC_AGG_" +
                                    Authentication.getHashId().substring(3);

                        acc.aggEvalStrArray.push({aggEvalStr: aggEvalStr,
                                                  aggVarName: aggVarName,
                                                  numOps: aggAcc.numOps});
                        if (options && options.xcAggregate) {
                            outStr += "^";
                        }
                        outStr += aggVarName;
                    } else {
                        assert(condTree.children.length > 0);
                    }
                } else {
                    if (acc) {
                        if (acc.noAssignOp) {
                            acc.numOps += 1;
                            outStr += opLookup[opName] + "(";
                        } else {
                            acc.operator = opLookup[opName];
                        }
                    } else {
                        outStr += opLookup[opName] + "(";
                    }
                }
            } else if (opName.indexOf(".ScalarSubquery") > -1) {
                // Subquery should have subqueryTree and no child
                assert(condTree.children.length === 0);
                assert(condTree.subqueryTree);
                assert(acc.subqueryArray);
                var subqVarName = "XC_SUBQ_" +
                                    Authentication.getHashId().substring(3);
                condTree.subqueryTree.subqVarName = subqVarName;
                acc.subqueryArray.push({subqueryTree: condTree.subqueryTree});
                outStr += "^" + subqVarName;
            } else {
                if (acc && acc.hasOwnProperty("numOps")) {
                    acc.numOps += 1;
                }
                outStr += opLookup[opName] + "(";
            }
            for (var i = 0; i < condTree.value["num-children"]; i++) {
                outStr += genEvalStringRecur(condTree.children[i], acc,
                                             options);
                if (i < condTree.value["num-children"] -1) {
                    outStr += ",";
                }
            }
            if ((opName.indexOf(".aggregate.") === -1 &&
                 opName.indexOf(".ScalarSubquery") === -1) ||
                (opName !== "expressions.aggregate.AggregateExpression" &&
                 (!acc || acc.noAssignOp))) {
                outStr += ")";
            }
        } else {
            // When it's not op
            if (condTree.value.class ===
               "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
                // Column Name
                if (condTree.value.name.indexOf(tablePrefix) !== 0) {
                    outStr += condTree.value.name.replace(/[\(|\)|\.]/g, "_")
                                      .toUpperCase();
                } else {
                    outStr += condTree.value.name;
                }
                var id = condTree.value.exprId.id;
                if (options && options.renamedColIds &&
                    options.renamedColIds.indexOf(id) !== -1) {
                    outStr += "_E" + id;
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
        // Note: Only top level agg functions are not extracted
        // (idx !== undefined check). The rest of the
        // agg functions will be extracted and pushed into the aggArray
        // The evalStrArray will be using the ^aggVariables
        for (var i = 0; i<evalList.length; i++) {
            var colStruct = {};
            if (evalList[i].length > 1) {
                var genTreeOpts = {extractAggregates: true};
                if (options && options.groupby) {
                    var treeNode = SQLCompiler.genExpressionTree(undefined,
                        evalList[i].slice(0), genTreeOpts);
                } else {
                    assert(evalList[i][0].class ===
                    "org.apache.spark.sql.catalyst.expressions.Alias");
                    var treeNode = SQLCompiler.genExpressionTree(undefined,
                        evalList[i].slice(1), genTreeOpts);
                }
                var acc = {aggEvalStrArray: aggEvalStrArray, numOps: 0};
                var evalStr = genEvalStringRecur(treeNode, acc, options);

                if (options && options.groupby) {
                    var newColName = evalStr.replace(/[\(|\)|\.]/g, "_")
                                                   .toUpperCase();
                } else {
                    var newColName = evalList[i][0].name
                                                   .replace(/[\(|\)|\.]/g, "_")
                                                   .toUpperCase();
                    colStruct.colId = evalList[i][0].exprId.id;
                }
                colStruct.colName = newColName;
                var retStruct = {newColName: newColName,
                                 evalStr: evalStr,
                                 numOps: acc.numOps};

                if (acc.isDistinct) {
                    retStruct.isDistinct = true;
                }

                if (options && options.operator) {
                    retStruct.operator = acc.operator;
                }
                if (evalList[i].length === 2 && (!options || !options.groupby)) {
                    // This is a special alias case
                    assert(evalList[i][1].dataType);
                    var dataType = convertSparkTypeToXcalarType(
                        evalList[i][1].dataType);
                    retStruct.evalStr = dataType + "(" +retStruct.evalStr + ")";
                    retStruct.numOps += 1;
                }
                evalStrArray.push(retStruct);
            } else {
                var curColStruct = evalList[i][0];
                assert(curColStruct.class ===
                "org.apache.spark.sql.catalyst.expressions.AttributeReference");
                colStruct.colName = curColStruct.name.replace(/[\(|\)|\.]/g, "_")
                                            .toUpperCase();
                colStruct.colId = curColStruct.exprId.id;
                if (options && options.renamedColIds &&
                    options.renamedColIds.indexOf(colStruct.colId) !== -1) {
                    colStruct.rename += "_E" + colStruct.colId;
                }
            }
            columns.push(colStruct);
        }
    }
    function produceSubqueryCli(self, subqueryArray) {
        var deferred = jQuery.Deferred();
        if (subqueryArray.length === 0) {
            return PromiseHelper.resolve("");
        }
        var promiseArray = [];
        for (var i = 0; i < subqueryArray.length; i++) {
            // traverseAndPushDown returns promiseArray with length >= 1
            promiseArray = promiseArray.concat(traverseAndPushDown(self,
                                               subqueryArray[i].subqueryTree));
        }
        PromiseHelper.chain(promiseArray)
        .then(function() {
            var cliStatements = "";
            // Replace subqueryName in filterString
            // Subquery result must have only one value
            for (var i = 0; i < subqueryArray.length; i++) {
                var cliArray = [];
                getCli(subqueryArray[i].subqueryTree, cliArray);
                for (var j = 0; j < cliArray.length; j++) {
                    cliStatements += cliArray[j];
                }
            }
            deferred.resolve(cliStatements);
        })
        .fail(deferred.reject);
        return deferred.promise();
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

    function extractAndReplace(aggEvalObj, replace) {
        if (aggEvalObj.numOps === 0) {
            return;
        }
        var evalStr = aggEvalObj.aggEvalStr;
        var leftBracketIndex = evalStr.indexOf("(");
        var rightBracketIndex = evalStr.lastIndexOf(")");
        var firstOp = evalStr.substring(0, leftBracketIndex);
        var inside = evalStr.substring(leftBracketIndex + 1,
                                          rightBracketIndex);
        var retStruct = {};
        if (replace) {
            retStruct.replaced = firstOp + "(" + replace + ")";
        }
        retStruct.firstOp = firstOp;
        retStruct.inside = inside;
        return retStruct;
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

    function getAttributeReferences(treeNode, arr, options) {
        if (treeNode.value.class ===
            "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
            var attrName = treeNode.value.name;
            var id = treeNode.value.exprId.id;
            if (options && options.renamedColIds &&
                options.renamedColIds.indexOf(id) !== -1) {
                attrName += "_E" + id;
            }
            if (arr.indexOf(attrName) === -1) {
                arr.push(attrName.replace(/[\(|\)|\.]/g, "_")
                                            .toUpperCase());
            }
        }

        for (var i = 0; i < treeNode.children.length; i++) {
            getAttributeReferences(treeNode.children[i], arr, options);
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
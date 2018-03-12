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

        // datetimeExpressions.scala
        "expressions.Year": "cut", // Split string and extract year
        "expressions.Month": "cut",
        "expressions.DayOfMonth": "cut",
        "expressions.convertDate": "convertDate", // This is for date casting
        "expressions.convertFromUnixTS": "convertFromUnixTS",

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
        "expressions.ScalarSubquery": null,
        "expressions.XCEPassThrough": null
    };

    var tablePrefix = "XC_TABLENAME_";
    var passthroughPrefix = "XCEPASSTHROUGH";

    function assert(st, message) {
        if (!st) {
            console.error("ASSERTION FAILURE!");
            throw "Assertion Failure: " + message;
        }
    }

    function getAllTableNames(rawOpArray) {
        var tableNames = {};
        for (var i = 0; i < rawOpArray.length; i++) {
            var value = rawOpArray[i];
            if (value.class === "org.apache.spark.sql.execution.LogicalRDD") {
                var rdds = value.output;
                var acc = {numOps: 0};
                for (var j = 0; j < rdds.length; j++) {
                    var evalStr = genEvalStringRecur(SQLCompiler.genTree(
                                  undefined, rdds[j].slice(0)), acc);
                    if (evalStr.indexOf(tablePrefix) === 0) {
                        var newTableName = evalStr.substring(tablePrefix.length);
                        if (!(newTableName in tableNames)) {
                            tableNames[newTableName] = true;
                        }
                    }
                }
            }
        }
        return tableNames;
    }

    function TreeNode(value) {
        if (value.class === "org.apache.spark.sql.execution.LogicalRDD") {
            // These are leaf nodes
            // Find the RDD that has a name XC_TABLENAME_ prefix
            this.usrCols = [];
            this.xcCols = [];
            this.sparkCols = [];
            this.renamedColIds = [];
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
    function secondTraverse(node, options, isRoot) {
        // The second traverse convert all substring, left, right stuff
        function literalNumberNode(num) {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.Literal",
                "num-children": 0,
                "value": "" + num,
                "dataType": "integer"
            });
        }
        function literalStringNode(s) {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.Literal",
                "num-children": 0,
                "value": s,
                "dataType": "string"
            });
        }
        function subtractNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.Subtract",
                "num-children": 2,
                "left": 0,
                "right": 1
            });
        }
        function addNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.Add",
                "num-children": 2,
                "left": 0,
                "right": 1
            });
        }
        function stringReplaceNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions." +
                          "StringReplace",
                "num-children": 3,
                "left": 0,
                "right": 1
            });
        }

        function ifStrNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.IfStr",
                "num-children": 3,
                "branches": null,
            });
        }
        function ifNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.If",
                "num-children": 3,
                "branches": null,
            });
        }
        function orNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.Or",
                "num-children": 2,
                "left": 0,
                "right": 1
            });
        }
        function eqNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.EqualTo",
                "num-children": 2,
                "left": 0,
                "right": 1
            });
        }
        function stringToDateNode(origNode) {
            var node = new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.convertDate",
                "num-children": 3
            });
            node.children = [origNode,
                             literalStringNode("%Y-%m-%d"),
                             literalStringNode("%Y-%m-%d")];
            origNode.parent = node;
            return node;
        }
        function timestampToDateNode(origNode) {
            var node = new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.convertFromUnixTS",
                "num-children": 2
            });
            node.children = [origNode, literalStringNode("%Y-%m-%d")];
            origNode.parent = node;
            return node;
        }
        function castNode(xcType) {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.XcType."
                          + xcType,
                "num-children": 1
            });
        }
        function existNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.IsNotNull",
                "num-children": 1
            });
        }

        // This function traverses the tree for a second time.
        // To process expressions such as Substring, Case When, etc.

        // If the current node is already visited, return it
        if (node.visited) {
            return node;
        }
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
                        node.children[2] = addN;
                    }
                } else {
                    var subNode = subtractNode();
                    subNode.children.push(node.children[1],
                                          literalNumberNode(1));
                    var addN = addNode();
                    addN.children.push(subNode, node.children[2]);
                    node.children[1] = subNode;
                    node.children[2] = addN;
                }
                break;
            // Left & Right are now handled by UDFs
            // case ("expressions.Left"):
            // case ("expressions.Right"):
            case ("expressions.Like"):
                assert(node.children.length === 2, SQLTStr.LikeTwoChildren + node.children.length);
                var strNode = node.children[1];
                var stringRepNode = stringReplaceNode();

                var pctNode = literalStringNode("%");
                var starNode = literalStringNode("*");

                stringRepNode.children.push(strNode);
                stringRepNode.children.push(pctNode);
                stringRepNode.children.push(starNode);

                node.children[1] = stringRepNode;

                break;
            case ("expressions.CaseWhenCodegen"):
            case ("expressions.CaseWhen"):
                if (node.value.elseValue && node.children.length % 2 !== 1) {
                    // If there's an elseValue, then num children must be odd
                    assert(0, SQLTStr.CaseWhenOdd + node.children.length);
                }
                // Check whether to use if or ifstr
                // XXX backend to fix if and ifStr such that `if` is generic
                // For now we are hacking this
                var type = "";
                var backupType = "";
                for (var i = 0; i < node.children.length; i++) {
                    if (i % 2 === 1) {
                        if (node.children[i].value.class ===
                          "org.apache.spark.sql.catalyst.expressions.Literal" ||
                            node.children[i].value.class ===
               "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
                            type = node.children[i].value.dataType;
                            break;
                        } else if (isMathOperator(node.children[i].value.class))
                        {
                            backupType = "float"; // anything except for string
                        }
                    }
                }
                if (type === "" &&
                    node.value.elseValue &&
                    ((node.value.elseValue[0].class ===
                    "org.apache.spark.sql.catalyst.expressions.Literal") ||
                    (node.value.elseValue[0].class ===
             "org.apache.spark.sql.catalyst.expressions.AttributeReference"))) {
                    // XXX Handle case where else value is a complex expr
                    assert(node.value.elseValue.length === 1,
                           SQLTStr.CaseWhenElse + node.value.elseValue.length);
                    type = node.value.elseValue[0].dataType;
                }
                if (type === "") {
                    if (backupType === "") {
                        console.error("Defaulting to ifstr as workaround");
                        type = "string";
                    } else {
                        type = backupType;
                    }
                }
                var getNewNode;
                if (type === "string") {
                    getNewNode = ifStrNode; // nifty little trick :)
                } else {
                    getNewNode = ifNode;
                }
                var newNode = getNewNode();
                var curNode = newNode;
                var lastNode;
                // Time to reassign the children
                for (var i = 0; i < Math.floor(node.children.length/2); i++) {
                    curNode.children.push(node.children[i*2]);
                    curNode.children.push(node.children[i*2+1]);
                    var nextNode = getNewNode();
                    curNode.children.push(nextNode);
                    lastNode = curNode;
                    curNode = nextNode;
                }

                assert(lastNode.children.length === 3,
                       SQLTStr.CaseWhenLastNode + lastNode.children.length);

                // has else clause
                if (node.children.length % 2 === 1) {
                    lastNode.children[2] =
                                          node.children[node.children.length-1];
                } else {
                    // no else clause
                    // We need to create our own terminal condition
                    // XXX There's a backend bug here with if
                    if (type === "string") {
                        litNode = literalStringNode("");
                    } else {
                        litNode = literalNumberNode(0.1337);
                    }
                    lastNode.children[2] = litNode;
                }

                node = newNode;
                break;
            case ("expressions.In"):
                // XXX TODO Minor. When the list gets too long, we are forced
                // to convert this to a udf and invoke the UDF instead.

                // Note: The first OR node or the ONLY eq node will be the root
                // of the tree
                assert(node.children.length >= 2,
                       SQLTStr.InChildrenLength + node.children.length);
                var prevOrNode;
                var newEqNode;
                var newNode;
                for (var i = 0; i < node.children.length - 1; i++) {
                    newEqNode = eqNode();
                    newEqNode.children.push(node.children[0]);
                    newEqNode.children.push(node.children[i+1]);
                    if (i < node.children.length - 2) {
                        var newOrNode = orNode();
                        newOrNode.children.push(newEqNode);
                        if (prevOrNode) {
                            prevOrNode.children.push(newOrNode);
                        } else {
                            newNode = newOrNode;
                        }
                        prevOrNode = newOrNode;
                    } else {
                        if (prevOrNode) {
                            prevOrNode.children.push(newEqNode);
                        }
                    }
                }
                if (!newNode) {
                    // Edge case where it's in just one element
                    // e.g. a in [1]
                    newNode = newEqNode;
                }
                node = newNode;
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
                if (!isRoot && options && options.extractAggregates) {
                    assert(node.children.length === 1,
                         SQLTStr.AggregateExpressionOne + node.children.length);
                    assert(node.children[0].value.class
                                        .indexOf("expressions.aggregate.") > 0,
                           SQLTStr.AggregateFirstChildClass +
                           node.children[0].value.class);
                    assert(node.children[0].children.length === 1,
                            SQLTStr.AggregateChildrenLength +
                            node.children[0].children.length);
                    // We need to cut the tree at this node, and instead of
                    // having a child, remove the child and assign it as an
                    // aggregateTree
                    var aggNode = node.children[0];
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
                       "org.apache.spark.sql.catalyst.plans.logical.Aggregate",
                       SQLTStr.SubqueryAggregate + node.value.plan[0].class);
                node.value.plan[0].class =
                      "org.apache.spark.sql.catalyst.plans.logical.XcAggregate";
                var subqueryTree = SQLCompiler.genTree(undefined,
                                                       node.value.plan);
                node.subqueryTree = subqueryTree;
                break;
            case ("expressions.Year"):
            case ("expressions.Month"):
            case ("expressions.DayOfMonth"):
                // Spark will first try to cast the string/timestamp to DATE

                // Following formats are allowed:
                // "yyyy"
                // "yyyy-[m]m"
                // "yyyy-[m]m-[d]d"
                // "yyyy-[m]m-[d]d "
                // "yyyy-[m]m-[d]d *"
                // "yyyy-[m]m-[d]dT*"
                // timestamp
                assert(node.children.length === 1,
                       SQLTStr.YMDLength + node.children.length);
                assert(node.children[0].value.class ===
                       "org.apache.spark.sql.catalyst.expressions.Cast",
                       SQLTStr.YMDCast + node.children[0].value.class);
                var dateCastNode = node.children[0];
                assert(dateCastNode.value.dataType === "date",
                       SQLTStr.YMDDataType + dateCastNode.value.dataType);
                assert(dateCastNode.children.length === 1,
                       SQLTStr.YMDChildLength);

                // Prepare three children for the node
                var cutIndex = ["Year", "Month", "DayOfMonth"]
                        .indexOf(opName.substring(opName.lastIndexOf(".") + 1));
                var cutIndexNode = literalNumberNode(cutIndex + 1);
                var delimNode = literalStringNode("-");
                var dateNode;

                // dateCastNode's child can be a column or another cast node
                var childNode = dateCastNode.children[0];
                if (childNode.value.class === "org.apache.spark.sql.catalyst." +
                                             "expressions.AttributeReference") {
                    // If the child is a column, it must be of string type
                    assert(childNode.value.dataType === "string",
                           SQLTStr.YMDString + childNode.value.dataType);
                    dateNode = stringToDateNode(childNode);
                } else {
                    // Otherwise, it has to be another cast node of str/ts type
                    assert(childNode.value.class ===
                           "org.apache.spark.sql.catalyst.expressions.Cast",
                           SQLTStr.YMDGrandCast + childNode.value.class);
                    assert(childNode.children.length === 1,
                           SQLTStr.YMDGrandLength + childNode.children.length);
                    if (childNode.value.dataType === "string") {
                        dateNode = stringToDateNode(childNode.children[0]);
                    } else if (childNode.value.dataType === "timestamp") {
                        // If it is timestamp cast, we need to first cast the
                        // child to timestamp and then cast timestamp to date
                        if (childNode.children[0].value.dataType !==
                                                                 "double") {
                            // Convert it to int and then to timestamp
                            var timestampNode = castNode("float");
                            timestampNode.children = [childNode.children[0]];
                            dateNode = timestampToDateNode(timestampNode);
                        } else {
                            dateNode = timestampToDateNode(childNode.children[0]);
                        }
                    } else {
                        // Other cases should have been rejected by spark
                        assert(0,
                               SQLTStr.YMDIllegal + childNode.value.dataType);
                    }
                }
                node.children = [dateNode, cutIndexNode, delimNode];
                node.value["num-children"] = 3;

                var intCastNode = castNode("int");
                intCastNode.children = [node, literalNumberNode(10)];
                intCastNode.value["num-children"] = 2;

                node = intCastNode;
                break;
            case ("expressions.Coalesce"):
                // XXX It's a hack. It should be compiled into CASE WHEN as it
                // may have more than 2 children
                assert(node.children.length === 2);

                var newNode;
                // All children are already casted to the same type, just take 1
                if (node.children[0].value.dataType === "string") {
                    newNode = ifStrNode();
                } else {
                    newNode = ifNode();
                }
                // XXX Revisit for strings
                var childNode = existNode();
                childNode.children.push(node.children[0]);
                newNode.children.push(childNode,
                                      node.children[0], node.children[1]);
                node = newNode;
                break;
            default:
                break;
        }

        // This must be a top down resolution. This is because of the Aggregate
        // Expression case, where we want to cut the tree at the top most
        // Aggregate Expression
        for (var i = 0; i < node.children.length; i++) {
            node.children[i] = secondTraverse(node.children[i], options);
        }

        if (node.aggTree) {
            // aggTree's root node is expressions.aggregate.*
            // so it won't hit any of the cases in second traverse
            // however, its grandchildren might be substring, etc.
            node.aggTree = secondTraverse(node.aggTree, options, true);
        }
        node.visited = true;
        return node;
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
                try {
                    if (data.stdout) {
                        // Only for dev when using sqlRestfulServer. We need to
                        // either modify here or sqlRestfulServer.js
                        deferred.resolve(JSON.parse(JSON.parse(data.stdout).sqlQuery));
                    } else {
                        deferred.resolve(JSON.parse(data.sqlQuery));
                    }
                } catch (e) {
                    deferred.reject(data.stdout);
                    // console.error(e);
                    // console.error(data.stdout);
                    // throw data.stdout;
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
            "class": "org.apache.spark.sql.catalyst.plans.logical.Project",
            "num-children": 1,
            "projectList": columns
        });
    }
    function pushUpCols(node) {
        // In pushUpCols, we have four types of column arrays which are used to
        // track columns/IDs at each node. Columns are stored as objects
        // e.g. {colName: "col1", colId: 123, rename: "col1_E123"}

        // A general rule applies to all those four arrays in pushUpCols:
        // Every node may add or remove columns/IDs in those arrays if needed.
        // Otherwise, arrays will be pushed up to its parent without modification.

        // The four column arrays are:
        // 1. usrCols: visible to the user at a given node.
        // They get updated in Project, Aggregate and Join.

        // 2. xcCols: temp columns generated by xcalar.
        // They get updated in Aggregate and Join.

        // 3. sparkCols: temp columns generated by spark.
        // XXX sparkCols need to be implemented later. We've seen three possible
        // cases: 1) colName#exprId. Spark will create an Alias expression for
        // it. Then it goes to usrCols. We just need to record it in sparkCols.
        // 2) "exist" in Existence Join. We will handle it when implementing
        // Existence Join.
        // 3) "Expand" logical plan

        // 4. renamedColIds: IDs(exprId) of those columns that are renamed due
        // to collision. e.g.[123, 124, 125]
        // They get updated in Project, Aggregate and Join.

        // Push cols names to its direct parent, except from Join
        if (node.parent && node.parent.value.class !==
            "org.apache.spark.sql.catalyst.plans.logical.Join") {
            // Must create a deep copy of the array.
            // Otherwise we are just assigning the pointer. So when the
            // parent changes, the children change as well.
            node.parent.usrCols = jQuery.extend(true, [], node.usrCols);
            node.parent.xcCols = jQuery.extend(true, [], node.xcCols);
            node.parent.sparkCols = jQuery.extend(true, [], node.sparkCols);
            // This is an array of renamed column IDs
            node.parent.renamedColIds = node.renamedColIds.slice(0);
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

    function countNumNodes(tree) {
        var count = 1;
        for (var i = 0; i < tree.children.length; i++) {
            count += countNumNodes(tree.children[i]);
        }
        return count;
    }

    SQLCompiler.genExpressionTree = function(parent, array, options) {
        return secondTraverse(SQLCompiler.genTree(parent, array), options, true);
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
            SQLEditor.updateProgress();
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
                case ("XcAggregate"):
                    retStruct = self._pushDownXcAggregate(treeNode);
                    break;
                case ("GlobalLimit"):
                    retStruct = self._pushDownGlobalLimit(treeNode);
                    break;
                case ("LocalLimit"):
                    retStruct = self._pushDownIgnore(treeNode);
                    break;
                case ("Union"):
                    retStruct = self._pushDownUnion(treeNode);
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
            // XXX PLEASE DO NOT DO THIS. THIS IS CRAP
            var oldKVcommit = KVStore.commit;
            KVStore.commit = function(atStartUp) {
                return PromiseHelper.resolve();
            };
            var outDeferred = jQuery.Deferred();
            var self = this;
            var cached = SQLCache.getCached(sqlQueryString);

            var promise;
            if (isJsonPlan) {
                promise = PromiseHelper.resolve(sqlQueryString);
            } else if (cached) {
                promise = PromiseHelper.resolve(cached, true);
            } else {
                promise = sendPost({"sqlQuery": sqlQueryString});
            }

            var toCache;

            promise
            .then(function(jsonArray, hasPlan) {
                var deferred = jQuery.Deferred();
                if (hasPlan) {
                    var plan = JSON.parse(jsonArray.plan);
                    var finalTableName = SQLCache.setNewTableNames(plan,
                                                         jsonArray.startTables,
                                                         jsonArray.finalTable);
                    SQLEditor.fakeCompile(jsonArray.steps)
                    .then(function() {
                        deferred.resolve(JSON.stringify(plan), finalTableName,
                                         jsonArray.finalTableCols);
                    });
                } else {
                    var allTableNames = getAllTableNames(jsonArray);

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

                    var numNodes = countNumNodes(tree);
                    SQLEditor.startCompile(numNodes);

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

                        // Cache the query so that we can reuse it later
                        // Caching only happens on successful run
                        toCache = {plan: queryString,
                                   startTables: allTableNames,
                                   steps: numNodes,
                                   finalTable: tree.newTableName,
                                   finalTableCols: tree.usrCols};
                        deferred.resolve(queryString,
                                         tree.newTableName, tree.usrCols);
                    });
                }
                return deferred.promise();
            })
            .then(function(queryString, newTableName, newCols) {
                SQLEditor.startExecution();
                self.sqlObj.run(queryString, newTableName, newCols)
                .then(function() {
                    if (toCache) {
                        SQLCache.cacheQuery(sqlQueryString, toCache);
                    }
                    outDeferred.resolve();
                })
                .fail(outDeferred.reject);
            })
            .fail(outDeferred.reject)
            .always(function() {
                // Restore the old KVcommit code
                KVStore.commit = oldKVcommit;
            });

            return outDeferred.promise();
        },
        _pushDownIgnore: function(node) {
            assert(node.children.length === 1,
                   SQLTStr.IgnoreOneChild + node.children.length);
            return PromiseHelper.resolve({
                "newTableName": node.children[0].newTableName,
            });
        },

        _pushDownProject: function(node) {
            // Pre: Project must only have 1 child and its child should've been
            // resolved already
            var self = this;
            var deferred = jQuery.Deferred();
            assert(node.children.length === 1,
                   SQLTStr.ProjectOneChild + node.children.length);
            var tableName = node.children[0].newTableName;
            // Find columns to project
            var columns = [];
            var evalStrArray = [];
            var aggEvalStrArray = [];
            var options = {renamedColIds: node.renamedColIds};
            genMapArray(node.value.projectList, columns, evalStrArray,
                        aggEvalStrArray, options);
            // I don't think the below is possible with SQL...
            assert(aggEvalStrArray.length === 0,
                   SQLTStr.ProjectAggAgg + JSON.stringify(aggEvalStrArray));

            // Change node.usrCols & node.renamedColIds
            node.usrCols = columns;
            node.renamedColIds = [];
            // Extract colNames from column structs
            // and check if it has renamed columns
            var colNames = [];
            for (var i = 0; i < columns.length; i++) {
                if (columns[i].rename) {
                    colNames.push(columns[i].rename);
                    node.renamedColIds.push(columns[i].colId);
                } else {
                    colNames.push(columns[i].colName);
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
            assert(node.children.length === 1,
                   SQLTStr.GLChild + node.children.length);
            assert(node.value.limitExpr.length === 1,
                   SQLTStr.GLLength + node.value.limitExpr.length);
            assert(node.value.limitExpr[0].dataType === "integer",
                   SQLTStr.GLDataType + node.value.limitExpr[0].dataType);

            function getPreviousSortOrder(curNode) {
                if (!curNode) {
                    return;
                }
                if (curNode.value.class ===
                    "org.apache.spark.sql.catalyst.plans.logical.Sort") {
                    return {ordering: curNode.order, name: curNode.sortColName};
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
                    self.sqlObj.sort([{ordering: sortObj.ordering,
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
            assert(node.children.length === 1,
                   SQLTStr.FilterLength + node.children.length);
            var treeNode = SQLCompiler.genExpressionTree(undefined,
                node.value.condition.slice(0), {extractAggregates: true});

            var aggEvalStrArray = [];
            var subqueryArray = [];
            var options = {renamedColIds: node.renamedColIds,
                           xcAggregate: true};
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
                    var colName = cleanseColName(orderArray[i][1].name);
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
                                           ordering: order});
                }
                return sortColsAndOrder;
            }
            var options = {renamedColIds: node.renamedColIds};
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
            var options = {renamedColIds: node.renamedColIds};
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

            var options = {renamedColIds: node.renamedColIds};
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
                genMapArray(node.value.groupingExpressions, gbCols,
                            gbEvalStrArray, gbAggEvalStrArray, options);
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

            node.renamedColIds = [];
            // Extract colNames from column structs
            var aggColNames = [];
            for (var i = 0; i < columns.length; i++) {
                if (columns[i].rename) {
                    aggColNames.push(columns[i].rename);
                    node.renamedColIds.push(columns[i].colId);
                } else {
                    aggColNames.push(columns[i].colName);
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
                // gbAll = true;
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
                    newTableName = xcHelper.getTableName(newTableName) +
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
                    newTableName = xcHelper.getTableName(newTableName) +
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

            // XXX This is a workaround for the prefix issue. Need to revist
            // when taking good care of index & prefix related issues.
            for (var i = 0; i < columns.length; i++) {
                if (columns[i].rename) {
                    columns[i].rename = cleanseColName(columns[i].rename, true);
                } else {
                    columns[i].colName = cleanseColName(columns[i].colName, true);
                }
            }
            node.usrCols = columns;
            // Also track xcCols
            for (var i = 0; i < secondMapColNames.length; i++) {
                if (aggColNames.indexOf(secondMapColNames[i]) === -1) {
                    node.xcCols.push({colName: secondMapColNames[i]});
                }
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
            var deferred = jQuery.Deferred();

            // Some helper functions to make the code easier to read
            function isSemiOrAntiJoin(n) {
                return ((n.value.joinType.object ===
                        "org.apache.spark.sql.catalyst.plans.LeftAnti$") ||
                        (n.value.joinType.object ===
                        "org.apache.spark.sql.catalyst.plans.LeftSemi$"));
            }

            function isSemiJoin(n) {
                return (n.value.joinType.object ===
                        "org.apache.spark.sql.catalyst.plans.LeftSemi$");
            }

            function isAntiJoin(n) {
                return (n.value.joinType.object ===
                        "org.apache.spark.sql.catalyst.plans.LeftAnti$");
            }

            // Special case for Anti Semi Joins
            // Check if root node is OR
            // If yes, assert OR's one child is &= tree. Other child is isNull,
            // followed by the identical &= tree
            // If root node is not OR, tree must be &=
            // If root node is OR, change root node to be &= subTree and set
            // removeNull to true
            // The above assertion and changes causes left anti semi joins to
            // forever be an &= subtree.
            if (isAntiJoin(node)) {
                if (node.value.condition[0].class ===
                    "org.apache.spark.sql.catalyst.expressions.Or") {
                    var leftSubtree = [node.value.condition[1]];
                    var rightSubtree = [];
                    var numNodesInLeftTree = leftSubtree[0]["num-children"];
                    var idx = 1;
                    while (numNodesInLeftTree > 0) {
                        leftSubtree.push(node.value.condition[++idx]);
                        numNodesInLeftTree += node.value.
                                                 condition[idx]["num-children"];
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
                    if (JSON.stringify(leftSubtree) ===
                        JSON.stringify(rightSubtree)) {
                        // All good, now set removeNull to true and over write
                        // the condition array with the left subtree
                        node.xcRemoveNull = true;
                        node.value.condition = leftSubtree;
                    } else {
                        node.xcRemoveNull = false;
                    }
                } else {
                    node.xcRemoveNull = false;
                }
            }

            // XXX BUG check whether node.value.condition exists. if it doesn't
            // it's a condition-free cross join. EDGE CASE
            // select * from n1 cross join n2
            var condTree;
            if (node.value.condition) {
                condTree = SQLCompiler.genExpressionTree(undefined,
                           node.value.condition.slice(0));
            } else {
                // Edge case: select * from n1 cross join n2
            }

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
            var filterSubtrees = [];
            var optimize = true;
            if (condTree && condTree.value.class ===
                "org.apache.spark.sql.catalyst.expressions.And") {
                andSubtrees.push(condTree);
            } else if (condTree && condTree.value.class ===
                "org.apache.spark.sql.catalyst.expressions.EqualTo") {
                eqSubtrees.push(condTree);
            } else {
                // No optimization
                console.info("catchall join");
                optimize = false;
            }

            // This is the MOST important struct in this join algorithm.
            // This is what each of the join clauses will be mutating.
            var retStruct = {leftTableName: node.children[0].newTableName,
                             rightTableName: node.children[1].newTableName,
                             cli: ""};

            var sqlObj = self.sqlObj;
            // Resolving firstDeferred will start the domino fall
            var firstDeferred = jQuery.Deferred();
            var promise = firstDeferred.promise();

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
                        filterSubtrees.push(andTree.children[i]);
                    }
                }
            }

            var retStruct;
            if (optimize) {
                var mapStruct = __getJoinMapArrays(node, eqSubtrees);
                for (var prop in mapStruct) {
                    retStruct[prop] = mapStruct[prop];
                }
            }
            if (!optimize || retStruct.catchAll) {
                // not a single eq can be untangled. defaulting back to
                // catchall join
                optimize = false;
            } else {
                if (retStruct.filterSubtrees.length > 0) {
                    filterSubtrees = filterSubtrees.concat(
                                                retStruct.filterSubtrees);
                    delete retStruct.filterSubtrees; // No need for this anymore
                }
            }

            // Start of flow. All branching decisions has been made
            if (optimize) {
                var overwriteJoinType;
                if (filterSubtrees.length > 0) {
                    if (isSemiOrAntiJoin(node)) {
                        overwriteJoinType = JoinOperatorT.InnerJoin;
                        promise = promise.then(__generateRowNumber.bind(sqlObj,
                                                                        retStruct,
                                                                        node));
                    }
                }

                promise = promise.then(__handleAndEqJoin.bind(sqlObj,
                                                              retStruct,
                                                              node,
                                                            overwriteJoinType));
                if (filterSubtrees.length > 0) {
                    promise = promise.then(__filterJoinedTable.bind(sqlObj,
                                                                    retStruct,
                                                                    node,
                                                               filterSubtrees));
                    if (isSemiJoin(node)) {
                        promise = promise.then(__groupByLeftRowNum.bind(sqlObj,
                                                                      retStruct,
                                                                        node,
                                                                        true));
                    }
                    if (isAntiJoin(node)) {
                        promise = promise.then(__groupByLeftRowNum.bind(sqlObj,
                                                                      retStruct,
                                                                        node,
                                                                        false));
                        promise = promise.then(__joinBackFilter.bind(sqlObj,
                                                                     retStruct,
                                                                     node));
                    }
                }
            } else {
                if (isSemiOrAntiJoin(node)) {
                    promise = promise.then(__generateRowNumber.bind(sqlObj,
                                                                    retStruct,
                                                                    node));
                }
                promise = promise.then(__catchAllJoin.bind(sqlObj, retStruct,
                                                           node,
                                                           condTree));
                if (isSemiJoin(node)) {
                    promise = promise.then(__groupByLeftRowNum.bind(sqlObj,
                                                                  retStruct,
                                                                    node,
                                                                    true));
                }
                if (isAntiJoin(node)) {
                    promise = promise.then(__groupByLeftRowNum.bind(sqlObj,
                                                                  retStruct,
                                                                    node,
                                                                    false));
                    promise = promise.then(__joinBackFilter.bind(sqlObj,
                                                                 retStruct,
                                                                 node));
                }
            }

            promise.fail(deferred.reject);

            promise.then(function() {
                node.usrCols = jQuery.extend(true, [],
                                             node.children[0].usrCols);
                node.xcCols = jQuery.extend(true, [], node.xcCols
                                            .concat(node.children[0].xcCols));
                node.sparkCols = jQuery.extend(true, [],
                                               node.children[0].sparkCols);
                if (node.value.joinType.object !==
                    "org.apache.spark.sql.catalyst.plans.LeftSemi$" &&
                    node.value.joinType.object !==
                    "org.apache.spark.sql.catalyst.plans.LeftAnti$") {
                    // XXX Think of existence joins and the new column created
                    node.usrCols = node.usrCols
                        .concat(jQuery.extend(true, [],
                                              node.children[1].usrCols));
                    node.xcCols = node.xcCols
                        .concat(jQuery.extend(true, [],
                                              node.children[1].xcCols));
                    node.sparkCols = node.sparkCols
                        .concat(jQuery.extend(true, [],
                                              node.children[1].sparkCols));
                } else {
                    node.xcCols = node.xcCols
                        .concat(jQuery.extend(true, [],
                                              node.children[1].usrCols
                                              .concat(node.children[1].xcCols)));
                        // XXX Think about sparkcols
                }

                assertCheckCollision(node.usrCols);
                assertCheckCollision(node.xcCols);
                assertCheckCollision(node.sparkCols);
                deferred.resolve({newTableName: retStruct.newTableName,
                                  cli: retStruct.cli});
            });

            // start the domino fall
            firstDeferred.resolve();

            return deferred.promise();
        },
        _pushDownUnion: function(node) {
            var self = this;
            // Union has at least two children
            assert(node.children.length > 1);
            var newTableName = node.newTableName;
            var tableInfos = [];
            var colRenames = node.children[0].usrCols;
            for (var i = 0; i < node.children.length; i++) {
                var unionTable = node.children[i];
                var unionCols = unionTable.usrCols;
                var columns = [];
                for (var j = 0; j < unionCols.length; j++) {
                    columns.push({
                        name: unionCols[j].colName,
                        rename: colRenames[j].colName,
                        type: "DfUnknown", // backend will figure this out. :)
                        cast: false // Should already be casted by spark
                    });
                }
                tableInfos.push({
                    tableName: unionTable.newTableName,
                    columns: columns
                });
            }
            // We now support union w/ deduplication as Spark converts it into a
            // groupBy without aggregation on all columns we need.
            // XXX Since we support dedup flag, we may consider optimization.
            // It will save us one groupBy.
            return self.sqlObj.union(tableInfos, false, newTableName);
        }
    };

    // Helper functions for join

    // Deferred Helper functions for join
    function __generateRowNumber(globalStruct, joinNode) {
        var deferred = jQuery.Deferred();
        var self = this; // This is the SqlObject

        // Since the grn call is done prior to the join, both tables must exist
        assert(globalStruct.leftTableName);
        assert(globalStruct.rightTableName);

        var leftTableId = xcHelper.getTableId(joinNode.children[0]
                                                      .newTableName);
        var rnColName = "XC_LROWNUM_COL_" + leftTableId;
        joinNode.xcCols.push({colName: rnColName});
        self.genRowNum(globalStruct.leftTableName, rnColName)
        .then(function(ret) {
            globalStruct.cli += ret.cli;
            globalStruct.leftTableName = ret.newTableName;
            globalStruct.leftRowNumCol = rnColName;
            // This will be kept and not deleted
            globalStruct.leftRowNumTableName = ret.newTableName;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // The two join functions. Each path will run only one of the 2 functions
    function __handleAndEqJoin(globalStruct, joinNode, overwriteJoinType) {
        var self = this;

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
                joinNode.xcCols.push({colName: tempCol});
            }
            var newTableName = xcHelper.getTableName(origTableName) +
                               Authentication.getHashId();
            self.map(mapStrArray, origTableName, newColNames,
                     newTableName)
            .then(function(ret) {
                ret.colNames = newColNames;
                deferred.resolve(ret);
            });
            return deferred.promise();
        }
        var leftMapArray = globalStruct.leftMapArray;
        var rightMapArray = globalStruct.rightMapArray;
        var leftCols = globalStruct.leftCols;
        var rightCols = globalStruct.rightCols;
        var cliArray = [];
        var deferred = jQuery.Deferred();
        var leftTableName = globalStruct.leftTableName;
        var rightTableName = globalStruct.rightTableName;
        PromiseHelper.when(handleMaps(leftMapArray, leftTableName),
                           handleMaps(rightMapArray, rightTableName))
        .then(function(retLeft, retRight) {
            var lTableInfo = {};
            lTableInfo.tableName = retLeft.newTableName;
            lTableInfo.columns = xcHelper.arrayUnion(retLeft.colNames,
                                                     leftCols);
            lTableInfo.pulledColumns = [];
            lTableInfo.rename = [];
            if (joinNode.xcRemoveNull) {
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

            var newRenames = __resolveCollision(joinNode.children[0].usrCols
                                        .concat(joinNode.children[0].xcCols)
                                        .concat(joinNode.children[0].sparkCols),
                                        joinNode.children[1].usrCols
                                        .concat(joinNode.children[1].xcCols)
                                        .concat(joinNode.children[1].sparkCols),
                                        lTableInfo.rename,
                                        rTableInfo.rename
                                        );
            joinNode.renamedColIds = newRenames
                                    .concat(joinNode.children[0].renamedColIds);
            if (joinNode.value.joinType.object !==
                "org.apache.spark.sql.catalyst.plans.LeftSemi$" &&
                joinNode.value.joinType.object !==
                "org.apache.spark.sql.catalyst.plans.LeftAnti$") {
                joinNode.renamedColIds = joinNode.renamedColIds
                                    .concat(joinNode.children[1].renamedColIds);
            }

            if (retLeft.cli) {
                cliArray.push(retLeft.cli);
            }

            if (retRight.cli) {
                cliArray.push(retRight.cli);
            }

            var joinType;
            if (overwriteJoinType !== undefined) {
                joinType = overwriteJoinType;
            } else {
                switch (joinNode.value.joinType.object) {
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
            }

            return self.join(joinType, lTableInfo, rTableInfo);
        })
        .then(function(retJoin) {
            // Since we have the joined table now, we don't need the original
            // left and right tables anymore
            delete globalStruct.leftTableName;
            delete globalStruct.rightTableName;
            delete globalStruct.leftMapArray;
            delete globalStruct.rightMapArray;
            globalStruct.newTableName = retJoin.newTableName;

            cliArray.push(retJoin.cli);
            globalStruct.cli += cliArray.join("");

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function __catchAllJoin(globalStruct, joinNode, condTree) {
        var self = this;
        var deferred = jQuery.Deferred();
        // Since this is before the join, both tables must exist
        assert(globalStruct.leftTableName);
        assert(globalStruct.rightTableName);

        var leftTableName = globalStruct.leftTableName;
        var rightTableName = globalStruct.rightTableName;

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

        var newRenames = __resolveCollision(joinNode.children[0].usrCols
                                        .concat(joinNode.children[0].xcCols)
                                        .concat(joinNode.children[0].sparkCols),
                                        joinNode.children[1].usrCols
                                        .concat(joinNode.children[1].xcCols)
                                        .concat(joinNode.children[1].sparkCols),
                                        lTableInfo.rename,
                                        rTableInfo.rename
                                        );
        // var newRenames = __resolveCollision(joinNode.children[0].usrCols,
        //                                     joinNode.children[1].usrCols,
        //                                     lTableInfo.rename,
        //                                     rTableInfo.rename)
        //                     .concat(__resolveCollision(joinNode.children[0].xcCols,
        //                                                joinNode.children[1].xcCols,
        //                                                lTableInfo.rename,
        //                                                rTableInfo.rename))
        //                     .concat(__resolveCollision(joinNode.children[0].sparkCols,
        //                                                joinNode.children[1].sparkCols,
        //                                                lTableInfo.rename,
        //                                                rTableInfo.rename));
        joinNode.renamedColIds = newRenames
                             .concat(joinNode.children[0].renamedColIds)
                             .concat(joinNode.children[1].renamedColIds);
        var options = {renamedColIds: joinNode.renamedColIds};
        var acc = {}; // for ScalarSubquery use case
        var filterEval = "";
        if (condTree) {
            filterEval = genEvalStringRecur(condTree, acc, options);
        }

        self.join(JoinOperatorT.CrossJoin, lTableInfo, rTableInfo,
                  {evalString: filterEval})
        .then(function(ret) {
            // Since the join is done now, we don't need leftTableName and
            // rightTableName anymore
            delete globalStruct.leftTableName;
            delete globalStruct.rightTableName;
            globalStruct.newTableName = ret.newTableName;
            globalStruct.cli += ret.cli;
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    function __groupByLeftRowNum(globalStruct, joinNode, incSample) {
        var self = this;
        var deferred = jQuery.Deferred();
        // This is called after the join, so newTableName must exist, and join
        // would've removed leftTableName and rightTableName
        assert(!globalStruct.leftTableName);
        assert(!globalStruct.rightTableName);
        assert(globalStruct.newTableName);
        assert(globalStruct.leftRowNumCol);

        var tempCountCol = "XC_COUNT_" +
                           xcHelper.getTableId(globalStruct.newTableName);
        // Record groupBy column
        joinNode.xcCols.push({colName: tempCountCol});

        self.groupBy([globalStruct.leftRowNumCol],
                     [{operator: "count", aggColName: "1",
                       newColName: tempCountCol}], globalStruct.newTableName,
                       {isIncSample: incSample})
        .then(function(ret) {
            globalStruct.cli += ret.cli;
            globalStruct.newTableName = ret.newTableName;
            // Record tempCols created from groupBy
            for (var i = 0; i < ret.tempCols.length; i++) {
                joinNode.xcCols.push({colName: ret.tempCols[i]});
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function __joinBackFilter(globalStruct, joinNode) {
        var self = this;
        var deferred = jQuery.Deferred();
        // This is post join, so assert that left and right tables no longer
        // exist
        assert(!globalStruct.leftTableName);
        assert(!globalStruct.rightTableName);
        assert(globalStruct.leftRowNumTableName);
        assert(globalStruct.newTableName);
        assert(globalStruct.leftRowNumCol);

        // For this func to be called, the current table must only have 2 cols
        // The rowNumCol and the countCol. Both are autogenerated
        var lTableInfo = {
            tableName: globalStruct.leftRowNumTableName,
            columns: [globalStruct.leftRowNumCol],
            pulledColumns: [],
            rename: []
        };

        var newRowNumColName = "XC_ROWNUM_" +
                               xcHelper.getTableId(globalStruct.newTableName);
        // Record the renamed column
        joinNode.xcCols.push({colName: newRowNumColName});
        var rTableInfo = {
            tableName: globalStruct.newTableName,
            columns: [globalStruct.leftRowNumCol],
            pulledColumns: [],
            rename: [{
                new: newRowNumColName,
                orig: globalStruct.leftRowNumCol,
                type: DfFieldTypeT.DfUnknown
            }]
        };

        self.join(JoinOperatorT.LeftOuterJoin, lTableInfo, rTableInfo)
        .then(function(ret) {
            globalStruct.cli += ret.cli;
            globalStruct.newTableName = ret.newTableName;
            // Now keep only the rows where the newRowNumColName does not exist
            return self.filter("not(exists(" + newRowNumColName + "))",
                               globalStruct.newTableName);
        })
        .then(function(ret) {
            globalStruct.cli += ret.cli;
            globalStruct.newTableName = ret.newTableName;
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    function __filterJoinedTable(globalStruct, joinNode, filterSubtrees) {
        var self = this;
        var deferred = jQuery.Deferred();

        var joinTablename = globalStruct.newTableName;
        var filterEvalStrArray = [];
        var finalEvalStr = "";

        for (var i = 0; i < filterSubtrees.length; i++) {
            var subtree = filterSubtrees[i];
            var options = {renamedColIds: joinNode.renamedColIds};

            filterEvalStrArray.push(genEvalStringRecur(subtree, undefined,
                                                       options));
        }
        for (var i = 0; i < filterEvalStrArray.length - 1; i++) {
            finalEvalStr += "and(" + filterEvalStrArray[i] + ",";
        }
        finalEvalStr += filterEvalStrArray[filterEvalStrArray.length - 1];
        for (var i = 0; i < filterEvalStrArray.length - 1; i++) {
            finalEvalStr += ")";
        }

        self.filter(finalEvalStr, joinTablename)
        .then(function(ret) {
            globalStruct.newTableName = ret.newTableName;
            globalStruct.cli += ret.cli;
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    // Immediate Helper functions for join
    function __getJoinMapArrays(node, eqSubtrees) {
        // children[0] === leftTable
        // children[1] === rightTable
        // Get all columns in leftTable and rightTable because in the eval
        // string, it can be in either order. For example:
        // WHERE t1.col1 = t2.col2 and t2.col3 = t1.col4
        var leftRDDCols = getAllCols(node.children[0]);
        var rightRDDCols = getAllCols(node.children[1]);
        // Check all EQ subtrees and resolve the maps

        var leftCols = [];
        var rightCols = [];

        var leftMapArray = [];
        var rightMapArray = [];

        var filterSubtrees = [];

        while (eqSubtrees.length > 0) {
            var eqTree = eqSubtrees.shift();
            assert(eqTree.children.length === 2);

            var attributeReferencesOne = [];
            var attributeReferencesTwo = [];
            var options = {renamedColIds: node.children[0].renamedColIds
                                       .concat(node.children[1].renamedColIds)};
            var dontPush = false;
            getAttributeReferences(eqTree.children[0],
                                   attributeReferencesOne, options);
            getAttributeReferences(eqTree.children[1],
                                   attributeReferencesTwo, options);
            var leftAcc = {numOps: 0};
            var rightAcc = {numOps: 0};
            var leftOptions = {renamedColIds: node.children[0].renamedColIds};
            var rightOptions = {renamedColIds: node.children[1].renamedColIds};
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
                                                 rightAcc, leftOptions);
                rightEvalStr = genEvalStringRecur(eqTree.children[0],
                                                  leftAcc, rightOptions);
            } else {
                // E.g. table1.col1.substring(2) + table2.col2.substring(2)
                // == table1.col3.substring(2) + table2.col4.substring(2)
                // There is no way to reduce this to left and right tables
                filterSubtrees.push(eqTree);
                dontPush = true;
            }

            if (!dontPush) {
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
        }

        var retStruct = {};

        if (leftMapArray.length + leftCols.length === 0) {
            assert(rightCols.length + rightCols.length ===0);
            retStruct.catchAll = true;
            retStruct.filterSubtrees = filterSubtrees;
        } else {
            retStruct = {leftMapArray: leftMapArray,
                         leftCols: leftCols,
                         rightMapArray: rightMapArray,
                         rightCols: rightCols,
                         filterSubtrees: filterSubtrees};
        }
        return retStruct;
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
        var newRenames = [];
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
                        newRenames.push(rightCols[j].colId);
                    } else if (leftCols[i].colId) {
                        // Right has no ID and left has ID, rename left
                        var newName = oldName + "_E" + leftCols[i].colId;
                        leftRename.push(xcHelper.getJoinRenameMap(oldName,
                                         newName));
                        leftCols[i].rename = newName;
                        newRenames.push(leftCols[i].colId);
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
        return newRenames;
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


    function getAllCols(node) {
        var rddCols = [];
        for (var i = 0; i < node.usrCols.length; i++) {
            if (node.usrCols[i].rename) {
                rddCols.push(node.usrCols[i].rename);
            } else {
                rddCols.push(node.usrCols[i].colName);
            }
        }
        return rddCols;
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
                if (opName === "expressions.XCEPassThrough") {
                    assert(condTree.value.name !== undefined);
                    outStr += "sql:" + condTree.value.name + "(";
                    assert(acc.hasOwnProperty("udfs"));
                    acc.udfs.push(condTree.value.name.toUpperCase());
                } else {
                    outStr += opLookup[opName] + "(";
                }
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
                    outStr += cleanseColName(condTree.value.name);
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
                var acc = {aggEvalStrArray: aggEvalStrArray, numOps: 0, udfs: []};
                var evalStr = genEvalStringRecur(treeNode, acc, options);

                if (options && options.groupby) {
                    var newColName = cleanseColName(evalStr, true);
                } else {
                    var newColName = cleanseColName(evalList[i][0].name, true);
                    colStruct.colId = evalList[i][0].exprId.id;
                }
                // XCEPASSTHROUGH -> UDF_NAME
                newColName = replaceUDFName(newColName, acc.udfs);
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
                if (curColStruct.name.indexOf(tablePrefix) >= 0) {
                    // Skip XC_TABLENAME_XXX
                    continue;
                }
                colStruct.colName = cleanseColName(curColStruct.name);
                colStruct.colId = curColStruct.exprId.id;
                if (options && options.renamedColIds &&
                    options.renamedColIds.indexOf(colStruct.colId) !== -1) {
                    colStruct.rename = colStruct.colName + "_E" + colStruct.colId;
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
                arr.push(cleanseColName(attrName));
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

    function cleanseColName(name, isNewCol) {
        if (isNewCol) {
            name = name.replace(/(::)/g, "--");
        }
        return name.replace(/[().]/g, "_").toUpperCase();
    }

    function replaceUDFName(name, udfs) {
        var i = 0;
        var re = new RegExp(passthroughPrefix, "g");
        return name.toUpperCase().replace(re, function(match) {
            if (i === udfs.length) {
                // Should always match, otherwise throw an error
                assert(0);
                return match;
            }
            return udfs[i++];
        });
    }

    function isMathOperator(expression) {
        var mathOps = {
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
        };
        if (expression.substring("org.apache.spark.sql.catalyst.".length) in
            mathOps) {
            return true;
        } else {
            return false;
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
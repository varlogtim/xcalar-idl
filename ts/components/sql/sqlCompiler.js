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
        "expressions.Round": null,
        "expressions.xcRound": "round",
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
        "expressions.Cut": "cut", // Split string and extract year
        "expressions.Year": null,
        "expressions.Month": null,
        "expressions.DayOfMonth": null,
        "expressions.DateAdd": null,
        "expressions.DateSub": null,
        "expressions.TimeAdd": "sql:timeAdd",
        "expressions.TimeSub": "sql:timeSub",
        "expressions.convertFormats": "default:convertFormats", // XXX default value for udf when input format is not specified is wrong
        "expressions.convertFromUnixTS": "default:convertFromUnixTS", // Use default module here because implementation different from convertFromUnixTS
        "expressions.convertToUnixTS": "default:convertToUnixTS", // And cannot peak what's in the other function

        "expressions.aggregate.Sum": "sum",
        "expressions.aggregate.Count": "count",
        "expressions.aggregate.Max": "max",
        "expressions.aggregate.Min": "min",
        "expressions.aggregate.Average": "avg",
        "expressions.aggregate.StddevPop": "stdevp",
        "expressions.aggregate.StddevSamp": "stdev",
        "expressions.aggregate.VariancePop": "varp",
        "expressions.aggregate.VarianceSamp": "var",
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
            this.renamedCols = {};
            this.orderCols = [];
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
        function literalNullNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.Literal",
                "num-children": 0,
                "value": "null"
            })
        }
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
        function multiplyNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.Multiply",
                "num-children": 2,
                "left": 0,
                "right": 1
            });
        }
        function divideNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.Divide",
                "num-children": 2,
                "left": 0,
                "right": 1
            });
        }
        function powerNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.Pow",
                "num-children": 2,
                "left": 0,
                "right": 1
            });
        }
        function roundNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.xcRound",
                "num-children": 1
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
        function notNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.Not",
                "num-children": 1,
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
                "class": "org.apache.spark.sql.catalyst.expressions.convertFormats",
                "num-children": 3
            });
            node.children = [origNode,
                             literalStringNode("%Y-%m-%d"),
                             literalStringNode("")];
            return node;
        }
        function timestampToDateNode(origNode) {
            var node = new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.convertFromUnixTS",
                "num-children": 2
            });
            node.children = [origNode, literalStringNode("%Y-%m-%d")];
            return node;
        }
        function dateToTimestampNode(origNode) {
            var node = new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.convertToUnixTS",
                "num-children": 2
            });
            node.children = [origNode, literalStringNode("")];
            return node;
        }
        function cutNode() {
            var node = new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.Cut",
                "num-children": 3
            });
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
        function xcAggregateNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.plans.logical.XcAggregate",
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
                assert(node.children.length === 2, SQLErrTStr.LikeTwoChildren + node.children.length);
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
                    assert(0, SQLErrTStr.CaseWhenOdd + node.children.length);
                }
                // Check whether to use if or ifstr
                // XXX backend to fix if and ifStr such that `if` is generic
                // For now we are hacking this
                var type = __getColType(node);
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
                       SQLErrTStr.CaseWhenLastNode + lastNode.children.length);

                // has else clause
                if (node.children.length % 2 === 1) {
                    lastNode.children[2] =
                                          node.children[node.children.length-1];
                } else {
                    // no else clause
                    // We need to create our own terminal condition
                    // XXX There's a backend bug here with if
                    // if (type === "string") {
                    //     litNode = literalStringNode("");
                    // } else {
                    //     litNode = literalNumberNode(0.1337);
                    // }
                    litNode = literalNullNode();
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
                       SQLErrTStr.InChildrenLength + node.children.length);
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
                if (type === "timestamp") {
                    var origType = convertSparkTypeToXcalarType(
                                            __getColType(node.children[0]));
                    if (origType === "string") {
                        // No "timestamp" type in Xcalar, so create a UDF node
                        // Datetime related conversion depends on timezone
                        var dttsNode = dateToTimestampNode(node.children[0]);
                        node = dttsNode;
                    } else {
                        var intNode = castNode("int");
                        intNode.children = [node.children[0]];
                        node = intNode;
                    }
                } else {
                    var convertedType = convertSparkTypeToXcalarType(type);
                    node.value.class = node.value.class
                                .replace("expressions.Cast",
                                         "expressions.XcType." + convertedType);
                }
                break;
            case ("expressions.aggregate.AggregateExpression"):
                // If extractAggregates is true, then we need to cut the tree
                // here and construct a different tree
                if (!isRoot && options && options.extractAggregates) {
                    assert(node.children.length === 1,
                         SQLErrTStr.AggregateExpressionOne + node.children.length);
                    assert(node.children[0].value.class
                                        .indexOf("expressions.aggregate.") > 0,
                           SQLErrTStr.AggregateFirstChildClass +
                           node.children[0].value.class);
                    assert(node.children[0].children.length === 1,
                            SQLErrTStr.AggregateChildrenLength +
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
                // XXX Currently, Aggregate node should be the first in the plan
                // This assertion is NO longer valid when we move to TPCDS
                // Will be fixed soon.
                if (node.value.plan[0].class ===
                       "org.apache.spark.sql.catalyst.plans.logical.Aggregate") {
                node.value.plan[0].class =
                      "org.apache.spark.sql.catalyst.plans.logical.XcAggregate";
                var subqueryTree = SQLCompiler.genTree(undefined,
                                                       node.value.plan);
                node.subqueryTree = subqueryTree;
                } else {
                    var xcAggNode = xcAggregateNode();
                    var subqueryTree = SQLCompiler.genTree(xcAggNode,
                                                           node.value.plan);
                    xcAggNode.children = [subqueryTree];
                    node.subqueryTree = xcAggNode;
                }
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
                       SQLErrTStr.YMDLength + node.children.length);
                assert(node.children[0].value.class ===
                       "org.apache.spark.sql.catalyst.expressions.Cast",
                       SQLErrTStr.YMDCast + node.children[0].value.class);
                var dateCastNode = node.children[0];
                assert(dateCastNode.value.dataType === "date",
                       SQLErrTStr.YMDDataType + dateCastNode.value.dataType);
                assert(dateCastNode.children.length === 1,
                       SQLErrTStr.YMDChildLength);

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
                    assert(childNode.value.dataType === "string" ||
                           childNode.value.dataType === "date",
                           SQLErrTStr.YMDString + childNode.value.dataType);
                    dateNode = stringToDateNode(childNode);
                } else {
                    // Otherwise, it has to be another cast node of str/ts type
                    assert(childNode.value.class ===
                           "org.apache.spark.sql.catalyst.expressions.Cast",
                           SQLErrTStr.YMDGrandCast + childNode.value.class);
                    assert(childNode.children.length === 1,
                           SQLErrTStr.YMDGrandLength + childNode.children.length);
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
                               SQLErrTStr.YMDIllegal + childNode.value.dataType);
                    }
                }
                var cuNode = cutNode();
                cuNode.children = [dateNode, cutIndexNode, delimNode];

                var intCastNode = castNode("int");
                intCastNode.children = [cuNode, literalNumberNode(10)];
                intCastNode.value["num-children"] = 2;

                node = intCastNode;
                break;
            case ("expressions.Coalesce"):
                // XXX It's a hack. It should be compiled into CASE WHEN as it
                // may have more than 2 children
                assert(node.children.length === 2);

                var newNode;
                var type = __getColType(node);
                // All children are already casted to the same type, just take 1
                if (type === "string") {
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
            case ("expressions.Round"):
                var mulNode = multiplyNode();
                var divNode = divideNode();
                var powNode = powerNode();  // Reused
                var ronNode = roundNode();
                var tenNode = literalNumberNode(10);  // Reused
                mulNode.children = [node.children[0], powNode];
                divNode.children = [ronNode, powNode];
                powNode.children = [tenNode, node.children[1]];
                ronNode.children = [mulNode];
                node = divNode;
                break;
            // XXX if format %Y-%m, UDF assume day is 13
            // And 1995-10-29 + 1 day = 1995-10-29
            case ("expressions.DateAdd"):
            case ("expressions.DateSub"):
                var asNode;
                if(opName === "expressions.DateAdd") {
                    asNode = addNode();
                } else {
                    asNode = subtractNode();
                }
                var tstdNode = timestampToDateNode(asNode);
                var mulNode = multiplyNode();
                var numNode = literalNumberNode(86400);
                var caNode = castNode("float");
                var dttsNode = dateToTimestampNode(node.children[0]);
                mulNode.children = [node.children[1], numNode];
                caNode.children = [dttsNode]
                asNode.children = [caNode, mulNode];
                node = tstdNode;
                break;
            case ("expressions.IsNull"):
                var nNode = notNode();
                var notNNode = existNode();
                nNode.children = [notNNode];
                notNNode.children = [node.children[0]];
                node = nNode;
                break;
            case ("expressions.CheckOverflow"):
            case ("expressions.PromotePrecision"):
                assert(node.children.length === 1);
                node = secondTraverse(node.children[0], options);
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
        var deferred = PromiseHelper.deferred();
        jQuery.ajax({
            type: 'POST',
            data: JSON.stringify(struct),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            url: planServer + "/sqlquery/" +
                 encodeURIComponent(encodeURIComponent(WorkbookManager.getActiveWKBK())) +
                 "/true/true",
            success: function(data) {
                deferred.resolve(JSON.parse(data.sqlQuery));
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

        // 4. renamedCols: an object that contains all renamed columns where key
        // is colId and value is renamedColName e.g.{"1": "col_1", "2": "col_2"}
        // They get updated in Project, Aggregate and Join.

        // Push cols names to its direct parent, except from Join
        if (node.parent && node.parent.value.class !==
            "org.apache.spark.sql.catalyst.plans.logical.Join" && 
            node.parent && node.parent.value.class !==
            "org.apache.spark.sql.catalyst.plans.logical.Union") {
            // Must create a deep copy of the array.
            // Otherwise we are just assigning the pointer. So when the
            // parent changes, the children change as well.
            node.parent.usrCols = jQuery.extend(true, [], node.usrCols);
            node.parent.xcCols = jQuery.extend(true, [], node.xcCols);
            node.parent.sparkCols = jQuery.extend(true, [], node.sparkCols);
            // This is an array of renamed column IDs
            node.parent.renamedCols = jQuery.extend(true, {},
                                                      node.renamedCols);
            node.parent.orderCols = jQuery.extend(true, [], node.orderCols);
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
        var count = tree.value.class ===
                    "org.apache.spark.sql.execution.LogicalRDD" ? 0 : 1;
        for (var i = 0; i < tree.children.length; i++) {
            count += countNumNodes(tree.children[i]);
        }
        return count;
    }

    SQLCompiler.genExpressionTree = function(parent, array, options) {
        return secondTraverse(SQLCompiler.genTree(parent, array), options, true);
    };
    function traverseAndPushDown(self, node, updateUI) {
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
            var deferred = PromiseHelper.deferred();
            var retStruct;
            if (typeof SQLEditor !== "undefined" && updateUI) {
                SQLEditor.updateProgress();
            }
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
                case ("Expand"):
                    retStruct = self._pushDownExpand(treeNode);
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
                case ("Window"):
                    retStruct = self._pushDownWindow(treeNode);
                    break;
                case ("LocalRelation"):
                    retStruct = self._pushDownLocalRelation(treeNode);
                    break;
                default:
                    console.error("Unexpected operator: " + treeNodeClass);
                    retStruct = self._pushDownIgnore(treeNode);

            }
            retStruct
            .then(function(ret) {
                if (ret) {
                    if (ret.newTableName) {
                        treeNode.newTableName = ret.newTableName;
                    }
                    if (ret.cli) {
                        treeNode.xccli = ret.cli;
                    }
                    for (var prop in ret) {
                        if (prop !== "newTableName" && prop !== "cli") {
                            treeNode[prop] = ret[prop];
                        }
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
            var oldKVcommit;
            if (typeof KVStore !== "undefined") {
                oldKVcommit = KVStore.commit;
                KVStore.commit = function(atStartUp) {
                    return PromiseHelper.resolve();
                };
            }
            var outDeferred = PromiseHelper.deferred();
            var self = this;
            var cached;
            if (typeof SQLCache !== "undefined") {
                cached = SQLCache.getCached(sqlQueryString);
            }

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
                var deferred = PromiseHelper.deferred();
                if (hasPlan) {
                    var plan = JSON.parse(jsonArray.plan);
                    var finalTableName = SQLCache.setNewTableNames(plan,
                                                         jsonArray.startTables,
                                                         jsonArray.finalTable);
                    if (typeof SQLEditor !== "undefined") {
                        SQLEditor.fakeCompile(jsonArray.steps)
                        .then(function() {
                            deferred.resolve(JSON.stringify(plan), finalTableName,
                                             jsonArray.finalTableCols);
                        });
                    }
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
                    if (typeof SQLEditor !== "undefined") {
                        SQLEditor.startCompile(numNodes);
                    }

                    var promiseArray = traverseAndPushDown(self, tree, true);
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
                if (typeof SQLEditor !== "undefined") {
                    SQLEditor.startExecution();
                }
                self.sqlObj.run(queryString, newTableName, newCols)
                .then(function() {
                    if (typeof SQLCache !== "undefined" && toCache) {
                        SQLCache.cacheQuery(sqlQueryString, toCache);
                    }
                    outDeferred.resolve(newTableName);
                })
                .fail(outDeferred.reject);
            })
            .fail(outDeferred.reject)
            .always(function() {
                if (typeof KVStore !== "undefined" && oldKVcommit) {
                    // Restore the old KVcommit code
                    KVStore.commit = oldKVcommit;
                }
            });

            return outDeferred.promise();
        },
        _pushDownIgnore: function(node) {
            assert(node.children.length === 1,
                   SQLErrTStr.IgnoreOneChild + node.children.length);
            return PromiseHelper.resolve({
                "newTableName": node.children[0].newTableName,
            });
        },

        _pushDownProject: function(node) {
            // Pre: Project must only have 1 child and its child should've been
            // resolved already
            var self = this;
            var deferred = PromiseHelper.deferred();
            assert(node.children.length === 1,
                   SQLErrTStr.ProjectOneChild + node.children.length);
            if (node.value.projectList.length === 0) {
                node.emptyProject = true;
                node.newTableName = node.children[0].newTableName;
                node.xccli = "";
                return deferred.resolve().promise();
            }
            var tableName = node.children[0].newTableName;
            // Find columns to project
            var columns = [];
            var evalStrArray = [];
            var aggEvalStrArray = [];
            var subqueryArray = [];
            var options = {renamedCols: node.renamedCols};
            genMapArray(node.value.projectList, columns, evalStrArray,
                        aggEvalStrArray, options, subqueryArray);
            // I don't think the below is possible with SQL...
            assert(aggEvalStrArray.length === 0,
                   SQLErrTStr.ProjectAggAgg + JSON.stringify(aggEvalStrArray));

            var newXcCols = [];
            var colNames = [];
            for (var i = 0; i < node.orderCols.length; i++) {
                var find = false;
                if (node.orderCols[i].colId) {
                    var id = node.orderCols[i].colId;
                    for (var j = 0; j < columns.length; j++) {
                        if (columns[j].colId === id) {
                            node.orderCols[i] = columns[j];
                            find = true;
                            break;
                        }
                    }
                    if (!find) {
                        for (var j = 0; j < node.usrCols.length; j++) {
                            if (node.usrCols[j].colId === id) {
                                var colStructWithoutId =
                                    __deleteIdFromColInfo([node.usrCols[j]])[0];
                                node.orderCols[i] = colStructWithoutId;
                                newXcCols.push(colStructWithoutId);
                                find = true;
                                break;
                            }
                        }
                    }
                } else {
                    var name = __getCurrentName(node.orderCols[i]);
                    for (var j = 0; j < node.xcCols.length; j++) {
                        if (__getCurrentName(node.xcCols[j]) === name) {
                            node.orderCols[i] = node.xcCols[j];
                            newXcCols.push(node.xcCols[j]);
                            find = true;
                            break;
                        }
                    }
                }
                assert(find);
            }
            node.xcCols = newXcCols;
            node.sparkCols = [];

            // Change node.usrCols & node.renamedCols
            node.usrCols = columns;
            node.renamedCols = {};
            // Extract colNames from column structs
            // and check if it has renamed columns
            for (var i = 0; i < columns.length; i++) {
                if (columns[i].rename) {
                    node.renamedCols[columns[i].colId] = columns[i].rename;
                }
            }

            var newRenames = __resolveCollision(node.xcCols, node.usrCols, [],
                                                [], "", tableName);
            node.renamedCols = __combineRenameMaps([node.renamedCols,
                                         newRenames]);
            node.usrCols.concat(node.xcCols).forEach(function(col) {
                colNames.push(__getCurrentName(col));
            });
            for (var id in newRenames) {
                var find = false;
                for (var i = 0; i < evalStrArray.length; i++) {
                    if (evalStrArray[i].colId === Number(id)) {
                        evalStrArray[i].newColName = newRenames[id];
                        find = true;
                        break;
                    }
                }
                if (!find) {
                    for (var i = 0; i < columns.length; i++) {
                        if (columns[i].colId === Number(id)) {
                            evalStrArray.push({newColName: newRenames[id],
                                evalStr: columns[i].colType + "("
                                + columns[i].colName + ")"});
                            find = true;
                            break;
                        }
                    }
                }
                assert(find);
            }
            columns.forEach(function(col) {
                delete col.colType;
            });
            // XXX Currently we rename new columns, but if we have
            // column type in the future, can switch to renaming old columns
            // for (var i = 0; i < node.xcCols.length; i++) {
            //     if (node.xcCols[i].rename) {
            //         // Need to get column type and map
            //     }
            // }
            var cliStatements = "";
            if (evalStrArray.length > 0) {
                var mapStrs = evalStrArray.map(function(o) {
                    return o.evalStr;
                });
                var newColNames = evalStrArray.map(function(o) {
                    return o.newColName;
                });
                var newTableName = xcHelper.getTableName(tableName) +
                                   Authentication.getHashId();

                produceSubqueryCli(self, subqueryArray)
                .then(function(cli) {
                    cliStatements += cli;
                    return self.sqlObj.map(mapStrs, tableName, newColNames,
                                           newTableName);
                })
                .then(function(ret) {
                    cliStatements += ret.cli;
                    return self.sqlObj.project(colNames, newTableName);
                })
                .then(function(ret) {
                    deferred.resolve({newTableName: ret.newTableName,
                                      cli: cliStatements + ret.cli});
                });
            } else {
                produceSubqueryCli(self, subqueryArray)
                .then(function(cli) {
                    cliStatements += cli;
                    return self.sqlObj.project(colNames, tableName);
                })
                .then(function(ret) {
                    deferred.resolve({newTableName: ret.newTableName,
                                        cli: cliStatements + ret.cli});
                });
            }
            return deferred.promise();
        },

        _pushDownGlobalLimit: function(node) {
            var self = this;
            var deferred = PromiseHelper.deferred();
            assert(node.children.length === 1,
                   SQLErrTStr.GLChild + node.children.length);
            assert(node.value.limitExpr.length === 1,
                   SQLErrTStr.GLLength + node.value.limitExpr.length);
            assert(node.value.limitExpr[0].dataType === "integer",
                   SQLErrTStr.GLDataType + node.value.limitExpr[0].dataType);

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
            var deferred = PromiseHelper.deferred();
            assert(node.children.length === 1,
                   SQLErrTStr.FilterLength + node.children.length);
            var treeNode = SQLCompiler.genExpressionTree(undefined,
                node.value.condition.slice(0), {extractAggregates: true});

            var aggEvalStrArray = [];
            var subqueryArray = [];
            var options = {renamedCols: node.renamedCols, xcAggregate: true};
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
            var deferred = PromiseHelper.deferred();
            var sortCli = "";
            assert(node.children.length === 1);
            var options = {renamedCols: node.renamedCols,
                           tableName: node.children[0].newTableName};
            var sortColsAndOrder = __genSortStruct(node.value.order, options);
            var tableName = node.children[0].newTableName;
            node.orderCols = [];
            options.maps.forEach(function(tempColInfo) {
                var tempColStruct = {colName: tempColInfo.colName};
                node.xcCols.push(tempColStruct);
                node.orderCols.push(tempColStruct);
            });
            sortColsAndOrder.forEach(function(col) {
                for (var i = 0; i < node.usrCols.length; i++) {
                    if (node.usrCols[i].colId === col.colId) {
                        node.orderCols.push(node.usrCols[i]);
                        break;
                    }
                }
            });
            __handleSortMap(self, options.maps, tableName)
            .then(function(ret) {
                sortCli += ret.cli;
                return self.sqlObj.sort(sortColsAndOrder, ret.newTableName);
            })
            .then(function(ret) {
                ret.cli = sortCli + ret.cli;
                deferred.resolve(ret);
            })
            return deferred.promise();
        },

        _pushDownXcAggregate: function(node) {
            // This is for Xcalar Aggregate which produces a single value
            var self = this;

            assert(node.children.length === 1);
            assert(node.subqVarName);
            var tableName = node.children[0].newTableName;
            if (node.value.aggregateExpressions) {
                assert(node.value.aggregateExpressions.length === 1);
            var edgeCase = false;
            node.orderCols = [];
            // Edge case:
            // SELECT col FROM tbl GROUP BY col1

            // This is dangerous but Spark still compiles it to ScalarSubquery
            // It seems that Spark expects user to enforce the "single val" rule
            // In this case, col1 has a 1 to 1 mappping relation with col2.
            // Thus we can give it an aggOperator, such as max.
            var index = node.value.aggregateExpressions[0][0].class ===
                      "org.apache.spark.sql.catalyst.expressions.Alias" ? 1 : 0;
            var treeNode = SQLCompiler.genExpressionTree(undefined,
                           node.value.aggregateExpressions[0].slice(index));
            var options = {renamedCols: node.renamedCols, xcAggregate: true};
            var acc = {};
            var evalStr = genEvalStringRecur(treeNode, acc, options);
            if (!acc.operator) {
                evalStr = "max(" + evalStr + ")";
            }
            } else {
                assert(node.usrCols.length === 1);
                var colName = __getCurrentName(node.usrCols[0]);
                var evalStr = "max(" + colName + ")";
            }
            return self.sqlObj.aggregateWithEvalStr(evalStr,
                                                    tableName,
                                                    node.subqVarName);
        },

        _pushDownExpand: function(node) {
            // Only support expand followed by aggregate node
            assert(node.parent.value.class ===
                "org.apache.spark.sql.catalyst.plans.logical.Aggregate");
            node.orderCols = [];
            node.newTableName = node.children[0].newTableName;
            var groupingCols = [];
            node.value.output.forEach(function(item) {
                groupingCols.push(__genColStruct(item[0]));
            });
            // Last element of expand-output should be spark_grouping_id
            assert(groupingCols[groupingCols.length - 1].colName ===
                                                    "SPARK_GROUPING_ID");
            var groupingIds = [];
            // XXX Here assume all expands are full rollup, still not clear
            // how spark represent other type of grouping sets
            for (var i = 0, curId = 0; i < groupingCols.length; i++) {
                groupingIds.push(curId);
                curId = (curId << 1) + 1;
            }
            node.sparkCols.push(groupingCols[groupingCols.length - 1]);
            var newRenames = __resolveCollision([],node.usrCols
                        .concat(node.xcCols).concat(node.sparkCols), [],
                        [], "", node.newTableName);
            node.renamedCols = __combineRenameMaps(node.renamedCols, newRenames);
            node.parent.expand = {groupingCols: groupingCols,
                    groupingIds: groupingIds,
                    groupingColStruct: groupingCols[groupingCols.length - 1]};
            return PromiseHelper.resolve();
        },

        _pushDownAggregate: function(node) {
            // There are 4 possible cases in aggregates (groupbys)
            // 1 - f(g) => Handled
            // 2 - g(f) => Handled
            // 3 - g(g) => Catalyst cannot handle this
            // 4 - f(f) => Not valid syntax. For gb you need to have g somewhere
            var self = this;
            var cli = "";
            var deferred = PromiseHelper.deferred();
            node.orderCols = [];
            assert(node.children.length === 1);
            var tableName = node.children[0].newTableName;

            var options = {renamedCols: node.renamedCols};
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
            var gbStrColNames = []
            for (var i = 0; i < gbCols.length; i++) {
                gbColNames.push(__getCurrentName(gbCols[i]));
                // Extract colNames of string type columns for creating nulls
                if (node.expand) {
                    for (var j = 0; j < node.expand.groupingCols.length; j++) {
                        if (gbCols[i].colId === node.expand.groupingCols[j].colId) {
                            if (node.expand.groupingCols[j].type === "string") {
                                gbStrColNames.push(__getCurrentName(gbCols[i]));
                            }
                            break;
                        }
                    }
                }
            }

            // Resolve each group's map clause
            var columns = [];
            var evalStrArray = [];
            var aggEvalStrArray = [];
            options.operator = true;
            options.groupby = false;
            genMapArray(node.value.aggregateExpressions, columns, evalStrArray,
                        aggEvalStrArray, options);
            node.renamedCols = {};
            // Extract colNames from column structs
            var aggColNames = [];
            for (var i = 0; i < columns.length; i++) {
                if (columns[i].rename) {
                    aggColNames.push(columns[i].rename);
                    node.renamedCols[columns[i].colId] = columns[i].rename;
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
                        if (gbStrColNames.indexOf(origGbColName) != -1) {
                            gbStrColNames[gbStrColNames.indexOf(origGbColName)]
                                                                = newGbColName;
                        }
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
                                     Authentication.getHashId().substring(1);
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
                                     Authentication.getHashId().substring(1);
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
            // Now we use groupAll flag to handle this

            var tempCol;
            if (gArray.length === 0) {
                var newColName = "XC_GB_COL_" +
                                 Authentication.getHashId().substring(1);
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
                if (node.expand) {
                    return __handleMultiDimAgg(self, gbColNames, gbStrColNames,
                                            gArray, newTableName, node.expand);
                } else {
                    return self.sqlObj.groupBy(gbColNames, gArray, newTableName);
                }
            })
            .then(function(ret) {
                assert(ret);
                newTableName = ret.newTableName;
                cli += ret.cli;
                if (ret.tempCols) {
                    for (var i = 0; i < ret.tempCols.length; i++) {
                        node.xcCols.push({colName: ret.tempCols[i]});
                    }
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
            var deferred = PromiseHelper.deferred();
            var hasEmptyProject = false;

            // Check if one of children is empty table
            if (node.children[0].emptyProject) {
                hasEmptyProject = true;
                node.children = [node.children[1], node.children[0]];
            } else if (node.children[1].emptyProject) {
                hasEmptyProject = true;
            }

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
            function isExistenceJoin(n) {
                // We have different logic of handling ExistenceJoin. Ideally,
                // an ExistenceJoin will be compiled into LeftSemi by Spark.
                // But when the condition is complex it can return type of
                // "ExistenceJoin". In that case, we compile it into a
                // LeftSemi + LeftOuter + Project
                return (n.value.joinType["product-class"] ===
                    "org.apache.spark.sql.catalyst.plans.ExistenceJoin");
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
            var firstDeferred = PromiseHelper.deferred();
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

            if (isExistenceJoin(node)) {
                var existColName = cleanseColName(node.value.joinType.exists[0]
                                                                     .name);
                var existColId = node.value.joinType.exists[0].exprId.id;
                retStruct.existenceCol = {
                    colName: existColName,
                    colId: existColId,
                    rename: existColName + "_E" + existColId
                }
            }

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
                if (filterSubtrees.length > 0 && isSemiOrAntiJoin(node)) {
                    overwriteJoinType = JoinOperatorT.InnerJoin;
                    promise = promise.then(__generateRowNumber.bind(sqlObj,
                                                                    retStruct,
                                                                    node));
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
                if (isSemiOrAntiJoin(node) || isExistenceJoin(node)) {
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
                if (isExistenceJoin(node)) {
                    promise = promise.then(__groupByLeftRowNum.bind(sqlObj,
                                                                    retStruct,
                                                                    node,
                                                                    false));
                    promise = promise.then(__joinBackMap.bind(sqlObj,
                                                                  retStruct,
                                                                  node));
                }
                if (hasEmptyProject) {
                    promise = promise.then(__projectAfterCrossJoin.bind(sqlObj,
                                                            retStruct, node));
                }
            }

            promise.fail(deferred.reject);

            promise.then(function() {
                node.usrCols = jQuery.extend(true, [],
                                             node.children[0].usrCols);
                if (hasEmptyProject) {
                    node.xcCols = [];
                    node.sparkCols = [];
                } else {
                    node.xcCols = jQuery.extend(true, [], node.xcCols
                                                .concat(node.children[0].xcCols));
                    node.sparkCols = jQuery.extend(true, [],
                                                node.children[0].sparkCols);
                    if (!isSemiOrAntiJoin(node) && !isExistenceJoin(node)) {
                        // Existence = LeftSemi join with right table then LeftOuter
                        // join back with left table
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
                        if (isExistenceJoin(node)) {
                            // If it's ExistenceJoin, don't forget existenceCol
                            node.sparkCols.push(retStruct.existenceCol);
                            node.renamedCols[retStruct.existenceCol.colId] =
                                                    retStruct.existenceCol.rename;
                        }
                    }
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
            // If only 1 of children is not localrelation,
            // skip the union and handle column info
            var validChildrenIds = __findValidChildren(node);
            if (validChildrenIds.length === 1 && validChildrenIds[0] != 0) {
                var lrChild = node.children[0];
                var validChild = node.children[validChildrenIds[0]];
                node.newTableName = validChild.newTableName;
                node.usrCols = jQuery.extend(true, [], validChild.usrCols);
                node.xcCols = jQuery.extend(true, [], validChild.xcCols);
                node.sparkCols = jQuery.extend(true, [], validChild.sparkCols);
                node.renamedCols = {};
                for (var i = 0; i < lrChild.usrCols.length; i++) {
                    var newColName = lrChild.usrCols[i].colName;
                    var newColId = lrChild.usrCols[i].colId;
                    node.usrCols[i].colId = newColId;
                    if (__getCurrentName(node.usrCols[i]) != newColName) {
                        node.usrCols[i].rename = newColName;
                        node.renamedCols[newColId] = newColName;
                    } else if (node.usrCols[i].rename) {
                        node.renamedCols[newColId] = node.usrCols[i].rename;
                    }
                }
                return PromiseHelper.resolve();
            } else {
                var validChild = node.children[0];
                node.usrCols = jQuery.extend(true, [], validChild.usrCols);
                node.xcCols = jQuery.extend(true, [], validChild.xcCols);
                node.sparkCols = jQuery.extend(true, [], validChild.sparkCols);
                node.renamedCols = jQuery.extend(true, {}, validChild.renamedCols);
                if (validChildrenIds.length === 1) {
                    node.newTableName = validChild.newTableName;
                    return PromiseHelper.resolve();
                }
            }
            var newTableName = node.newTableName;
            var tableInfos = [];
            var colRenames = node.children[0].usrCols;
            for (var i = 0; i < node.children.length; i++) {
                var unionTable = node.children[i];
                if (unionTable.value.class ===
                    "org.apache.spark.sql.catalyst.plans.logical.LocalRelation") {
                    continue;
                }
                var unionCols = unionTable.usrCols;
                var columns = [];
                for (var j = 0; j < unionCols.length; j++) {
                    columns.push({
                        name: __getCurrentName(unionCols[j]),
                        rename: __getCurrentName(colRenames[j]),
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
            return self.sqlObj.union(tableInfos, false);
        },

        _pushDownWindow: function(node) {
            var self = this;
            var deferred = PromiseHelper.deferred();
            var loopStruct = {cli: "", node: node, self: self};
            var cli = "";

            // Window should has one child
            assert(node.children.length === 1);

            // Sort the table first because windowExps in same window node
            // share same order
            // If no sortOrder specified => aggregate window, no need to sort
            var tableName = node.children[0].newTableName;
            var options = {renamedCols: node.renamedCols, tableName: tableName};
            loopStruct.groupByCols = __genGBColArray(node.value.partitionSpec);
            loopStruct.sortColsAndOrder =
                                __genSortStruct(node.value.orderSpec, options);
            var curPromise;
            if (loopStruct.sortColsAndOrder.length === 0
                                    && loopStruct.groupByCols.length === 0) {
                var innerDeferred = PromiseHelper.deferred();
                innerDeferred.resolve({"cli": "",
                                       "newTableName": tableName});
                curPromise = innerDeferred.promise();
            } else {
                curPromise = self.sqlObj.sort(
                            __concatColInfoForSort(loopStruct.groupByCols,
                                loopStruct.sortColsAndOrder), tableName);
            }

            // Generate row number after sort, may check if needed
            // to reduce operation number
            var tableId = xcHelper.getTableId(tableName);
            loopStruct.indexColStruct = {colName: "XC_ROW_COL_" + tableId};
            node.xcCols.push(loopStruct.indexColStruct);
            curPromise = curPromise.then(function(ret) {
                cli += ret.cli;
                return self.sqlObj.genRowNum(ret.newTableName,
                                __getCurrentName(loopStruct.indexColStruct));
            });

            // If no partition specified, need to add a temp column to group by
            // Use groupAll instead

            // Traverse windowExps, generate desired rows
            for (var i = 0; i < node.value.windowExpressions.length; i++) {
                var curWindowExp = node.value.windowExpressions[i];
                // Window functions create new columns, so should be alias node
                assert(curWindowExp[0].class ===
                    "org.apache.spark.sql.catalyst.expressions.Alias",
                    SQLErrTStr.NotAliasWindowExpr + curWindowExp[0].class);
                var windowTree = SQLCompiler.genTree(null, curWindowExp.slice(1));
                assert(windowTree.value.class ===
                    "org.apache.spark.sql.catalyst.expressions.WindowExpression",
                    SQLErrTStr.NoWENode + windowTree.value.class);

                var opNode = windowTree.children[windowTree.value.windowFunction];
                var opName = opNode.value.class.substring(opNode.value.class
                    .indexOf("expressions.") + "expressions.".length);

                curPromise = __windowExpressionHelper(loopStruct, curPromise,
                                            curWindowExp[0], opNode, opName);
            }
            // XXX may need to project otherwise there would be too many cols
            // Add cli for last operation and handle table info for pushing up
            curPromise = curPromise.then(function(ret) {
                cli += loopStruct.cli;
                cli += ret.cli;
                node.xccli = cli;
                node.newTableName = ret.newTableName;
                deferred.resolve();
            });
            return deferred.promise();
        },

        _pushDownLocalRelation: function(node) {
            // Now only support empty localrelation, which represent tables
            // can be evaluated to empty from sql query without data on server
            assert(node.value.data.length === 0);
            // Spark will replace operators after localrelation except union
            // Project/.../Filter => localrelation
            // inner/semi join => localrelation
            // outer join => project (add empty columns)
            // anti join => the other table (all rows are kept)
            // table intersect localrelation => localrelation
            // table except localrelation => table
            assert(node.parent.value.class ===
                "org.apache.spark.sql.catalyst.plans.logical.Union");
            node.xccli = "";
            node.usrCols = [];
            node.value.output.forEach(function(array) {
                node.usrCols.push(__genColStruct(array[0]));
            })
            return PromiseHelper.resolve();
        }
    };

    // Helper functions for join

    // Deferred Helper functions for join
    function __generateRowNumber(globalStruct, joinNode) {
        var deferred = PromiseHelper.deferred();
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

        function handleMaps(mapStrArray, origTableName, colNameArray) {
            var deferred = PromiseHelper.deferred();
            if (mapStrArray.length === 0) {
                return deferred.resolve({newTableName: origTableName,
                                         colNames: []});
            }
            var newColNames = [];
            var tableId = xcHelper.getTableId(origTableName);
            var j = 0;
            for (var i = 0; i < mapStrArray.length; i++) {
                var tempCol = "XC_JOIN_COL_" + tableId + "_" + i;
                for (; j < colNameArray.length; j++) {
                    if (colNameArray[j] === mapStrArray[i]) {
                        colNameArray[j] = tempCol;
                        break;
                    }
                }
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
        var deferred = PromiseHelper.deferred();
        var leftTableName = globalStruct.leftTableName;
        var rightTableName = globalStruct.rightTableName;
        PromiseHelper.when(handleMaps(leftMapArray, leftTableName, leftCols),
                           handleMaps(rightMapArray, rightTableName, rightCols))
        .then(function(retLeft, retRight) {
            var lTableInfo = {};
            lTableInfo.tableName = retLeft.newTableName;
            lTableInfo.columns = leftCols;
            lTableInfo.pulledColumns = [];
            lTableInfo.rename = [];
            if (joinNode.xcRemoveNull) {
                // This flag is set for left anti semi join. It means to
                // removeNulls in the left table
                lTableInfo.removeNull = true;
            }

            var rTableInfo = {};
            rTableInfo.tableName = retRight.newTableName;
            rTableInfo.columns = rightCols;
            rTableInfo.pulledColumns = [];
            rTableInfo.rename = [];

            var newRenames = __resolveCollision(joinNode.children[0].usrCols
                                        .concat(joinNode.children[0].xcCols)
                                        .concat(joinNode.children[0].sparkCols),
                                        joinNode.children[1].usrCols
                                        .concat(joinNode.children[1].xcCols)
                                        .concat(joinNode.children[1].sparkCols),
                                        lTableInfo.rename,
                                        rTableInfo.rename,
                                        lTableInfo.tableName,
                                        rTableInfo.tableName
                                        );
            joinNode.renamedCols = joinNode.children[0].renamedCols;
            if (joinNode.value.joinType.object !==
                "org.apache.spark.sql.catalyst.plans.LeftSemi$" &&
                joinNode.value.joinType.object !==
                "org.apache.spark.sql.catalyst.plans.LeftAnti$") {
                joinNode.renamedCols = __combineRenameMaps(
                    [joinNode.renamedCols, joinNode.children[1].renamedCols]);
            }
            joinNode.renamedCols = __combineRenameMaps(
                                        [joinNode.renamedCols, newRenames]);

            if (retLeft.cli) {
                cliArray.push(retLeft.cli);
            }

            if (retRight.cli) {
                cliArray.push(retRight.cli);
            }

            var joinType;
            var options = {};
            if (overwriteJoinType !== undefined) {
                joinType = overwriteJoinType;
            } else if (globalStruct.existenceCol) {
                // ExistenceJoin is not in joinNode.value.joinType.object
                joinType = JoinCompoundOperatorTStr.ExistenceJoin;
                options.existenceCol = globalStruct.existenceCol.rename;
            } else {
                switch (joinNode.value.joinType.object) {
                    case ("org.apache.spark.sql.catalyst.plans.Cross$"):
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
                    default:
                        assert(0);
                        console.error("Join Type not supported");
                        break;
                }
            }
            return self.join(joinType, lTableInfo, rTableInfo, options);
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
        var deferred = PromiseHelper.deferred();
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
                                        rTableInfo.rename,
                                        lTableInfo.tableName,
                                        rTableInfo.tableName
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
        joinNode.renamedCols = __combineRenameMaps(
                            [joinNode.children[0].renamedCols,
                            joinNode.children[1].renamedCols, newRenames]);
        var options = {renamedCols: joinNode.renamedCols};
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
        var deferred = PromiseHelper.deferred();
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
            if (ret.tempCols) {
                for (var i = 0; i < ret.tempCols.length; i++) {
                    joinNode.xcCols.push({colName: ret.tempCols[i]});
                }
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function __joinBackMap(globalStruct, joinNode) {
        var self = this;
        var deferred = PromiseHelper.deferred();
        // This is post join, so assert that left and right tables no longer
        // exist
        assert(!globalStruct.leftTableName);
        assert(!globalStruct.rightTableName);
        assert(globalStruct.leftRowNumTableName);
        assert(globalStruct.newTableName);
        assert(globalStruct.leftRowNumCol);
        assert(globalStruct.existenceCol);
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

        // var leftRDDCols = getAllCols(joinNode.children[0]);
        // // ExistenceCol has to be already renamed
        // leftRDDCols.push(globalStruct.existenceCol.rename);
        self.join(JoinOperatorT.LeftOuterJoin, lTableInfo, rTableInfo)
        .then(function(ret) {
            globalStruct.cli += ret.cli;
            // Now keep only the rows where the newRowNumColName does not exist
            return self.map("and(" +
                            "exists(" + globalStruct.leftRowNumCol + ")," +
                            "exists(" + newRowNumColName + "))",
                            ret.newTableName, globalStruct.existenceCol.rename);
        })
        .then(function(ret) {
            globalStruct.cli += ret.cli;
            globalStruct.newTableName = ret.newTableName;
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    function __joinBackFilter(globalStruct, joinNode) {
        var self = this;
        var deferred = PromiseHelper.deferred();
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

    function __projectAfterCrossJoin(globalStruct, joinNode) {
        var self = this;
        var deferred = PromiseHelper.deferred();
        var columns = [];
        for (var i = 0; i < joinNode.children[0].usrCols.length; i++) {
            columns.push(__getCurrentName(joinNode.children[0].usrCols[i]));
        }

        self.project(columns, globalStruct.newTableName)
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
        var deferred = PromiseHelper.deferred();

        var joinTablename = globalStruct.newTableName;
        var filterEvalStrArray = [];
        var finalEvalStr = "";

        for (var i = 0; i < filterSubtrees.length; i++) {
            var subtree = filterSubtrees[i];
            var options = {renamedCols: joinNode.renamedCols};

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
            var options = {renamedCols: __combineRenameMaps(
                [node.children[0].renamedCols, node.children[1].renamedCols])};
            var dontPush = false;
            getAttributeReferences(eqTree.children[0],
                                   attributeReferencesOne, options);
            getAttributeReferences(eqTree.children[1],
                                   attributeReferencesTwo, options);
            var leftAcc = {numOps: 0};
            var rightAcc = {numOps: 0};
            var leftOptions = {renamedCols: node.children[0].renamedCols};
            var rightOptions = {renamedCols: node.children[1].renamedCols};
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
                }
                leftCols.push(leftEvalStr);
                if (rightAcc.numOps > 0) {
                    rightMapArray.push(rightEvalStr);
                }
                rightCols.push(rightEvalStr);
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

    function __resolveCollision(leftCols, rightCols, leftRename, rightRename,
                                leftTableName, rightTableName) {
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

        // 3. our xx their => rename our column because it's only temp col and
        // will not be visible to the user.
        var newRenames = {};
        var colSet = new Set();
        var leftTableId = xcHelper.getTableId(leftTableName);
        var rightTableId = xcHelper.getTableId(rightTableName);
        for (var i = 0; i < leftCols.length; i++) {
            var colName = leftCols[i].rename || leftCols[i].colName;
            colSet.add(colName);
        }
        for (var i = 0; i < rightCols.length; i++) {
            var colName = rightCols[i].rename || rightCols[i].colName;
            if (colSet.has(colName)) {
                var newName = colName + "_E" + rightTableId;
                while (colSet.has(newName)) {
                    newName = newName + "_E" + rightTableId;
                }
                rightRename.push(xcHelper.getJoinRenameMap(colName, newName));
                rightCols[i].rename = newName;
                colSet.add(newName);
                if (rightCols[i].colId) {
                    newRenames[rightCols[i].colId] = newName;
                }
            } else {
                colSet.add(colName);
            }
        }
        return newRenames;
    }

    function __combineRenameMaps(renameMaps) {
        var retMap = renameMaps[0];
        for (var i = 1; i < renameMaps.length; i++) {
            for (var attr in renameMaps[i]) {
                retMap[attr] = renameMaps[i][attr];
            }
        }
        return retMap;
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

    function __findValidChildren(node) {
        var validIds = [];
        for (var i = 0; i < node.children.length; i++) {
            if (node.children[i].value.class !=
                "org.apache.spark.sql.catalyst.plans.logical.LocalRelation") {
                validIds.push(i);
            }
        }
        return validIds;
    }

    function __getColType(node) {
        // There are some exceptions in expressions like b in substr(a,b,c)
        if (node.value.class ===
            "org.apache.spark.sql.catalyst.expressions.AttributeReference" ||
            node.value.class ===
            "org.apache.spark.sql.catalyst.expressions.Cast" ||
            node.value.class ===
            "org.apache.spark.sql.catalyst.expressions.Literal") {
                return convertSparkTypeToXcalarType(node.value.dataType);
        } else if (node.value.class ===
            "org.apache.spark.sql.catalyst.expressions.ScalarSubquery") {
            return __getColType(SQLCompiler.genTree(undefined,
                                            node.value.plan.slice(0)));
        } else if (node.value.class ===
            "org.apache.spark.sql.catalyst.plans.logical.Project") {
            return __getColType(SQLCompiler.genTree(undefined,
                                        node.value.projectList[0].slice(0)));
        } else if (node.value.class ===
            "org.apache.spark.sql.catalyst.plans.logical.Aggregate") {
            return __getColType(SQLCompiler.genTree(undefined,
                                node.value.aggregateExpressions[0].slice(0)));
        }
        var left = 0;
        if (node.value.class ===
            "org.apache.spark.sql.catalyst.expressions.CaseWhen" ||
            node.value.class ===
            "org.apache.spark.sql.catalyst.expressions.If") {
                left = 1;
        }
        for (var i = left; i < node.children.length; i++) {
            if (__getColType(node.children[i])) {
                return __getColType(node.children[i]);
            }
        }
        assert(0, "undefined leaf type in expression");
    }

    function __genSortStruct(orderArray, options) {
        var sortColsAndOrder = [];
        var colNameSet = new Set();
        options.maps = [];
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
            var colName, type, id;
            if (orderArray[i][1].class ===
                "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
                colName = cleanseColName(orderArray[i][1].name);
                id = orderArray[i][1].exprId.id;
                if (options && options.renamedCols &&
                    options.renamedCols[id]) {
                    colName = options.renamedCols[id];
                }
                type = convertSparkTypeToXcalarType(orderArray[i][1].dataType);
            } else {
                // Here don't check duplicate expressions, need optimization
                colName = "XC_SORT_COL_" + i + "_"
                        + Authentication.getHashId().substring(1) + "_"
                        + xcHelper.getTableId(options.tableName);
                var orderNode = SQLCompiler.genExpressionTree(undefined,
                                                        orderArray[i].slice(1));
                type = __getColType(orderNode);
                var mapStr = genEvalStringRecur(orderNode, undefined, options);
                options.maps.push({colName: colName, mapStr: mapStr});
            }

            if (!colNameSet.has(colName)) {
                colNameSet.add(colName);
                sortColsAndOrder.push({name: colName,
                                       type: type,
                                       ordering: order,
                                       colId: id});
            }
        }
        return sortColsAndOrder;
    }

    function __handleSortMap(self, maps, tableName) {
        var deferred = PromiseHelper.deferred();
        if(maps.length === 0) {
            deferred.resolve({newTableName: tableName, cli: ""});
        } else {
            self.sqlObj.map(maps.map(function(item) {
                                    return item.mapStr;
                                }), tableName, maps.map(function(item) {
                                    return item.colName;
                                }))
            .then(function(ret) {
                deferred.resolve({newTableName: ret.newTableName, cli: ret.cli});
            });
        }
        return deferred.promise();
    }

    // XXX Need to remove duplicate?
    function __genGBColArray(cols) {
        var colInfoArray = [];
        for (var i = 0; i < cols.length; i++) {
            assert(cols[i][0].class ===
                "org.apache.spark.sql.catalyst.expressions.AttributeReference",
                SQLErrTStr.BadGenGBArray + cols[i][0].class);
            colInfoArray.push({colName: cleanseColName(cols[i][0].name),
                               type: cols[i][0].dataType,
                               colId: cols[i][0].exprId.id
                            });
        }
        return colInfoArray;
    }

    function __concatColInfoForSort(gbCols, sortCols) {
        var retStruct = [];
        var colNameSet = new Set();
        for (var i = 0; i < gbCols.length; i++) {
            if (!colNameSet.has(gbCols[i].colName)) {
                colNameSet.add(gbCols[i].colName);
                retStruct.push({name: gbCols[i].colName,
                                type: gbCols[i].type,
                                ordering: XcalarOrderingT.XcalarOrderingAscending});
            }
        }
        for (var i = 0; i < sortCols.length; i++) {
            if (!colNameSet.has(sortCols[i].name)) {
                colNameSet.add(sortCols[i].name);
                retStruct.push(sortCols[i]);
            }
        }
        return retStruct;
    }

    function __genColStruct(value) {
        var retStruct = {};
        // Assert that this is only used on alias and ar nodes
        assert(value.class && (value.class ===
            "org.apache.spark.sql.catalyst.expressions.Alias" ||
            value.class ===
            "org.apache.spark.sql.catalyst.expressions.AttributeReference"),
            SQLErrTStr.BadGenColStruct + value.class);
        retStruct.colName = cleanseColName(value.name);
        retStruct.colId = value.exprId.id;
        if (value.dataType) {
            retStruct.type = convertSparkTypeToXcalarType(value.dataType);
        }
        return retStruct;
    }

    function __getCurrentName(col) {
        return col.rename || col.colName;
    }

    function __deleteIdFromColInfo(cols) {
        var retList = [];
        for (var i = 0; i < cols.length; i++) {
            retList.push({colName: __getCurrentName(cols[i])});
        }
        return retList;
    }

    function __genGroupByTable(sqlObj, ret, operator, groupByCols,
                                                aggColName, windowStruct) {
        var deferred = PromiseHelper.deferred();
        // Save original table for later use
        windowStruct.origTableName = ret.newTableName;
        windowStruct.cli += ret.cli;
        windowStruct.gbTableName  = "XC_GB_Table"
                    + xcHelper.getTableId(windowStruct.origTableName) + "_"
                    + Authentication.getHashId().substring(1);
        if (!windowStruct.tempGBCol) {
            windowStruct.tempGBCol = "XC_" + operator.toUpperCase() + "_"
                    + xcHelper.getTableId(windowStruct.origTableName) + "_"
                    + Authentication.getHashId().substring(1);
        }
        // If the new column will be added to usrCols later
        // don't add it to gbColInfo (will later concat to xcCols) here
        if (windowStruct.addToUsrCol) {
            windowStruct.gbColInfo = __deleteIdFromColInfo(groupByCols);
        } else {
            windowStruct.gbColInfo = [{colName: windowStruct.tempGBCol}]
                                    .concat(__deleteIdFromColInfo(groupByCols));
        }
        sqlObj.groupBy(groupByCols.map(function(col) {
                            return __getCurrentName(col);}),
                        [{operator: operator, aggColName: aggColName,
                          newColName: windowStruct.tempGBCol,
                          newTableName: windowStruct.gbTableName}],
                        windowStruct.origTableName, {})
        .then(function(ret) {
            deferred.resolve(ret);
        });
        return deferred.promise();
    }

    function __joinTempTable(sqlObj, ret, joinType, leftJoinCols,
                                                rightJoinCols, windowStruct) {
        var deferred = PromiseHelper.deferred();
        windowStruct.cli += ret.cli;
        if (leftJoinCols.length === 0) {
            joinType = JoinOperatorT.CrossJoin;
        }
        var lTableInfo = {
            "tableName": windowStruct.leftTableName,
            "columns": leftJoinCols.map(function(col) {
                            return __getCurrentName(col);}),
            "rename": []
        };
        var rTableInfo = {
            "tableName": ret.newTableName,
            "columns": rightJoinCols.map(function(col) {
                            return __getCurrentName(col);}),
            "rename": []
        }
        var newRenames;
        if (windowStruct.renameFromCol) {
            var targetCol;
            var renamed = false;
            // Find the target column struct and rename it before resolve collision
            windowStruct.rightColInfo.forEach(function(item) {
                if (__getCurrentName(item) ===
                            __getCurrentName(windowStruct.renameFromCol)) {
                    item.colName = windowStruct.renameToUsrCol.colName;
                    item.colId = windowStruct.renameToUsrCol.colId;
                    delete item.rename;
                    targetCol = item;
                    return false;
                }
            });
            newRenames = __resolveCollision(windowStruct.leftColInfo,
                windowStruct.rightColInfo, lTableInfo.rename, rTableInfo.rename,
                windowStruct.leftTableName, ret.newTableName);
            // This struct is used by backend, so need to replace
            // target column name with column name before rename
            rTableInfo.rename.forEach(function(item) {
                if (item.orig === windowStruct.renameToUsrCol.colName) {
                    item.orig = __getCurrentName(windowStruct.renameFromCol);
                    renamed = true;
                    return false;
                }
            });
            // If it is not renamed, add the rename info into rTableInfo.rename
            if (!renamed) {
                rTableInfo.rename.push(
                    {"new": windowStruct.renameToUsrCol.colName,
                    "orig": __getCurrentName(windowStruct.renameFromCol),
                    "type": DfFieldTypeT.DfUnknown}); // XXX Not sure with type
            }
            windowStruct.rightColInfo.splice(windowStruct.rightColInfo
                                                         .indexOf(targetCol),1);
            windowStruct.node.usrCols.push(targetCol);
        } else if (windowStruct.addToUsrCol) {
            newRenames = __resolveCollision(windowStruct.leftColInfo,
                windowStruct.rightColInfo.concat(windowStruct.addToUsrCol),
                lTableInfo.rename, rTableInfo.rename,
                windowStruct.leftTableName, ret.newTableName);
        } else {
            newRenames = __resolveCollision(windowStruct.leftColInfo,
                                            windowStruct.rightColInfo,
                                            lTableInfo.rename, rTableInfo.rename,
                                    windowStruct.leftTableName, ret.newTableName);
        }
        // If left table is the trunk table, modify column info of node
        // otherwise modify temp column info
        if (windowStruct.node) {
            windowStruct.node.xcCols = windowStruct.node.xcCols
                                            .concat(windowStruct.rightColInfo);
            if (windowStruct.addToUsrCol) {
                windowStruct.node.usrCols.push(windowStruct.addToUsrCol);
            }
            windowStruct.node.renamedCols = __combineRenameMaps(
                                [windowStruct.node.renamedCols, newRenames]);
        } else {
            windowStruct.leftColInfo = windowStruct.leftColInfo
                                            .concat(windowStruct.rightColInfo);
            windowStruct.leftRename = __combineRenameMaps(
                                [windowStruct.leftRename,newRenames]);
        }
        sqlObj.join(joinType, lTableInfo, rTableInfo, {})
        .then(function(ret) {
            deferred.resolve(ret);
        })
        return deferred.promise();
    }

    function __groupByAndJoinBack(sqlObj, ret, operator, groupByCols,
                                        aggColName, joinType, windowStruct) {
        var deferred = PromiseHelper.deferred();
        if (windowStruct.addToUsrCol) {
            windowStruct.tempGBCol = windowStruct.addToUsrCol.colName;
        }
        __genGroupByTable(sqlObj, ret, operator, groupByCols,
                                                aggColName, windowStruct)
        .then(function(ret) {
            if (ret.tempCols) {
                windowStruct.gbColInfo = windowStruct.gbColInfo
                    .concat(ret.tempCols.map(function(colName) {
                        return {colName: colName};
                    }));
            }
            windowStruct.leftTableName = windowStruct.origTableName;
            windowStruct.rightColInfo = windowStruct.gbColInfo;
            return ret;
        })
        .then(function(ret) {
            if (windowStruct.joinBackByIndex) {
                return __joinTempTable(sqlObj, ret, joinType,
                            [windowStruct.indexColStruct],
                            [{colName: windowStruct.tempGBCol}], windowStruct);
            }
            return __joinTempTable(sqlObj, ret, joinType, groupByCols,
                                                    groupByCols, windowStruct);
        })
        .then(function(ret) {
            if (ret.tempCols) {
                if (windowStruct.node) {
                    node.xcCols = node.xcCols.concat(ret.tempCols
                                        .map(function(colName) {
                                            return {colName: colName};
                                        }));
                } else {
                    windowStruct.leftColInfo = windowStruct.leftColInfo
                        .concat(ret.tempCols.map(function(colName) {
                            return {colName: colName};
                        }));
                }
            }
            deferred.resolve(ret);
        });
        return deferred;
    }

    function __windowExpressionHelper(loopStruct, curPromise, aliasNode,
                                                        opNode, opName) {
        var deferred = PromiseHelper.deferred();
        var node = loopStruct.node;
        var self = loopStruct.self;
        var cli = "";
        var groupByCols = loopStruct.groupByCols;
        var sortColsAndOrder = loopStruct.sortColsAndOrder;
        var indexColStruct = loopStruct.indexColStruct;
        var newColStruct = __genColStruct(aliasNode);

        switch (opName) {
            case ("aggregate.AggregateExpression"):
                // First/last are also aggregate in spark plan
                var aggOpNode = opNode.children[0];
                var aggOpName = aggOpNode.value.class.substring(
                    aggOpNode.value.class.indexOf("expressions."));
                // Assert that spark will do all the map before window
                // and put only AR here
                var aggColNode = aggOpNode.children[0];
                var aggColStruct = __genColStruct(aggColNode.value);
                assert(aggColNode.value.class ===
                "org.apache.spark.sql.catalyst.expressions.AttributeReference",
                SQLErrTStr.NotARAgg + aggColNode.value.class);

                switch (aggOpName) {
                    case ("expressions.aggregate.First"):
                    case ("expressions.aggregate.Last"):
                        assert(sortColsAndOrder.length > 0, SQLErrTStr.NoSortFirst);
                        var windowStruct;
                        // Generate a temp table only contain the
                        // first/last row of each partition by getting
                        // minimum/maximum row number in each partition
                        // and left semi join back
                        curPromise = curPromise.then(function(ret) {
                            windowStruct = {cli: ""};
                            // Columns in temp table should not have id
                            windowStruct.leftColInfo =
                                __deleteIdFromColInfo(jQuery.extend(true,
                                    [], node.usrCols.concat(node.xcCols)
                                                .concat(node.sparkCols)));
                            windowStruct.leftRename = [];
                            var gbOpName;
                            if (aggOpName === "expressions.aggregate.Last") {
                                gbOpName = "expressions.aggregate.Max";
                            } else {
                                gbOpName = "expressions.aggregate.Min";
                            }
                            // The flag joinBackByIndex is used when we
                            // want to join back by other column
                            // = result column of group by
                            // rather than groupByCols = groupByCols
                            // In that case, indexColStruct should be set
                            windowStruct.joinBackByIndex = true;
                            windowStruct.indexColStruct = indexColStruct;
                            return __groupByAndJoinBack(self.sqlObj, ret,
                                        opLookup[gbOpName], groupByCols,
                                        __getCurrentName(indexColStruct),
                                        JoinCompoundOperatorTStr.LeftSemiJoin,
                                        windowStruct);
                        })
                        // Inner join original table and temp table
                        // rename the column needed
                        .then(function(ret) {
                            windowStruct.node = node;
                            windowStruct.rightColInfo =
                                                windowStruct.leftColInfo;
                            windowStruct.leftColInfo = node.usrCols
                                                .concat(node.xcCols)
                                                .concat(node.sparkCols);
                            // If renameFromCol and renameToUsrCol are
                            // specified, helper function will rename
                            // the column and move that column to usrCols
                            windowStruct.renameFromCol = aggColStruct;
                            windowStruct.renameToUsrCol = newColStruct;
                            return __joinTempTable(self.sqlObj, ret,
                                JoinOperatorT.InnerJoin, groupByCols,
                                groupByCols, windowStruct);
                        })
                        // windowStruct.cli contains the clis for one
                        // operation before window and all the
                        // windowStruct involved operations except for
                        // last one, which will be added in next then
                        .then(function(ret) {
                            if (ret.tempCols) { // This needed or not depends on behavior of innerjoin
                                node.xcCols = node.xcCols.concat(ret.tempCols
                                                .map(function(colName) {
                                                    return {colName: colName};
                                                }));
                            }
                            cli += windowStruct.cli;
                            return ret;
                        })
                        break;
                    default:
                        // Other aggregate expressions, do a group by
                        // and join back
                        var windowStruct;
                        curPromise = curPromise.then(function(ret) {
                            var aggColName = __getCurrentName(aggColStruct);
                            windowStruct = {leftColInfo: node.usrCols
                                                .concat(node.xcCols)
                                                .concat(node.sparkCols),
                                                node: node, cli: "",
                                            addToUsrCol: newColStruct};
                            return __groupByAndJoinBack(self.sqlObj, ret,
                                    opLookup[aggOpName], groupByCols,
                                    aggColName, JoinOperatorT.InnerJoin,
                                    windowStruct);
                        })
                        .then(function(ret) {
                            cli += windowStruct.cli;
                            return ret;
                        });
                        break;
                }
                break;
            case ("Lead"):
            case ("Lag"):
                var keyColStruct = __genColStruct(opNode.
                                    children[opNode.value.input].value);
                var offset = opNode.children[opNode.value.offset]
                                   .value.value;
                var defaultValue = opNode.children[opNode.value.default]
                                         .value.value;
                var windowStruct = {cli: ""};
                var rightKeyColStruct;
                windowStruct.node = node;
                var leftJoinCols = [];
                var rightJoinCols = [];
                var newIndexColName;
                // Map on index column with offset
                curPromise = curPromise.then(function(ret) {
                    windowStruct.leftTableName = ret.newTableName;
                    cli += ret.cli;
                    windowStruct.leftColInfo = node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols);
                    windowStruct.rightColInfo = jQuery.extend(true, [],
                                        node.usrCols.concat(node.xcCols)
                                        .concat(node.sparkCols));
                    if (loopStruct.dummyGbColStruct) {
                        leftJoinCols.push(loopStruct.dummyGbColStruct);
                    } else {
                        node.usrCols.forEach(function(item) {
                            for (var i = 0; i < groupByCols.length; i++) {
                                if (item.colId === groupByCols[i].colId) {
                                    leftJoinCols[i] = item;
                                    break;
                                }
                            }
                        });
                    }
                    windowStruct.rightColInfo.forEach(function(item) {
                        if (item.colId === keyColStruct.colId) {
                            rightKeyColStruct = item;
                        }
                        for (var i = 0; i < groupByCols.length; i++) {
                            if (item.colId === groupByCols[i].colId) {
                                rightJoinCols[i] = item;
                                break;
                            }
                        }
                        delete item.colId;
                    });
                    newIndexColName = __getCurrentName(indexColStruct) + "_right";
                    windowStruct.rightColInfo
                                    .push({colName: newIndexColName});
                    var mapStr;
                    if (opName === "Lead") {
                        mapStr = "int(sub(" + __getCurrentName(indexColStruct)
                                 + ", " + offset + "))";
                    } else {
                        mapStr = "int(add(" + __getCurrentName(indexColStruct)
                                 + ", " + offset + "))";
                    }
                    return self.sqlObj.map([mapStr],
                        windowStruct.leftTableName, [newIndexColName]);
                })
                // Outer join back with index columnm
                .then(function(ret) {
                    return __joinTempTable(self.sqlObj, ret,
                            JoinOperatorT.LeftOuterJoin,
                            [{colName: __getCurrentName(indexColStruct)}],
                            [{colName: newIndexColName}], windowStruct);
                });
                // Map again to set default value
                curPromise = curPromise.then(function(ret) {
                    if (ret.tempCols) { // This needed or not depends on behavior of leftouterjoin
                        node.xcCols = node.xcCols.concat(ret.tempCols
                                        .map(function(colName) {
                                            return {colName: colName};
                                        }));
                    }
                    cli += windowStruct.cli;
                    cli += ret.cli;
                    node.usrCols.push(newColStruct);
                    var mapStr = "if(";
                    // Need to check rename here
                    for (var i = 0; i < leftJoinCols.length - 1; i++) {
                        mapStr += "and(eq("
                            + __getCurrentName(leftJoinCols[i]) + ", "
                            + __getCurrentName(rightJoinCols[i]) + "),";
                    }
                    mapStr += "eq("
                        + __getCurrentName(leftJoinCols[leftJoinCols
                            .length - 1]) + ", "
                        + __getCurrentName(rightJoinCols[leftJoinCols
                            .length - 1]) + ")"
                        + Array(leftJoinCols.length).join(")") + ", "
                        + __getCurrentName(rightKeyColStruct)
                        + ", " + defaultValue + ")";
                    return self.sqlObj.map([mapStr], ret.newTableName,
                                                [newColStruct.colName]);
                });
                break;
            // Rank function
            case ("NTile"):
                // Ntile should have 1 argument
                // XXX According to definition, it could be some
                // expression but here I assume it as an literal
                // Not sure how to build query with expression in ntile
                assert(opNode.children.length === 1 &&
                       opNode.children[opNode.value.buckets].value.class
                === "org.apache.spark.sql.catalyst.expressions.Literal",
                SQLErrTStr.ExprInNtile + opNode.children[opNode.value.buckets].value.class);
                var groupNum = opNode.children[opNode.value.buckets]
                                     .value.value;
                assert(groupNum > 0, SQLErrTStr.InvalidNtile + groupNum);
            case ("RowNumber"):
                var windowStruct;
                // Group by and join back to generate minimum row number
                // in each partition
                curPromise = curPromise.then(function(ret) {
                    windowStruct = {leftColInfo: node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols),
                            node: node, cli: ""};
                    return __groupByAndJoinBack(self.sqlObj, ret, "min",
                                groupByCols, __getCurrentName(indexColStruct),
                                JoinOperatorT.InnerJoin, windowStruct);
                });
                if (opName === "RowNumber") {
                    // Row number = index - minIndexOfPartition + 1
                    curPromise = curPromise.then(function(ret) {
                        cli += windowStruct.cli;
                        cli += ret.cli;
                        node.usrCols.push(newColStruct);
                        var mapStr = "add(sub(" + __getCurrentName(indexColStruct)
                                     + ", " + windowStruct.tempGBCol + "), 1)";
                        return self.sqlObj.map([mapStr], ret.newTableName,
                                                [newColStruct.colName]);
                    });
                } else {
                    // ntile = int((index - minIndexOfPartition)
                    // * groupNum / sizeOfPartition + 1)
                    // Here use count group by partition columns
                    // to generate partition size
                    var tempMinIndexColName;
                    curPromise = curPromise.then(function(ret){
                        cli += windowStruct.cli;
                        tempMinIndexColName = windowStruct.tempGBCol;
                        windowStruct = {leftColInfo: node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols),
                            node: node, cli: ""};
                        return __groupByAndJoinBack(self.sqlObj, ret, "count",
                                groupByCols, __getCurrentName(indexColStruct),
                                JoinOperatorT.InnerJoin, windowStruct);
                    })
                    .then(function(ret) {
                        cli += windowStruct.cli;
                        cli += ret.cli;
                        node.usrCols.push(newColStruct);
                        var bracketSize = "int(div(" + windowStruct.tempGBCol
                                + ", " + groupNum + "))";
                        var extraRowNum = "mod(" + windowStruct.tempGBCol
                                + ", " + groupNum + ")";
                        var rowNumSubOne = "sub(" + __getCurrentName(indexColStruct)
                                + ", " + tempMinIndexColName + ")";
                        var threashold = "mult(" + extraRowNum + ", add(1, "
                                + bracketSize + "))";
                        var mapStr = "if(lt(" + rowNumSubOne + ", " + threashold
                                + "), int(add(div(" + rowNumSubOne + ", add(1, "
                                + bracketSize + ")), 1)), int(add(div(sub("
                                + rowNumSubOne + ", " + threashold + "), "
                                + "if(eq(" + bracketSize + ", 0), 1, "
                                + bracketSize + ")), 1, " + extraRowNum + ")))";
                        return self.sqlObj.map([mapStr], ret.newTableName,
                                                [newColStruct.colName]);
                    });
                }
                break;
            case ("Rank"):
            case ("PercentRank"):
            case ("CumeDist"):
                var windowStruct;
                var partitionMinColName;
                var psGbColName;
                curPromise = curPromise.then(function(ret) {
                    windowStruct = {leftColInfo: node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols),
                            node: node, cli: ""};
                    return __groupByAndJoinBack(self.sqlObj, ret, "min",
                                groupByCols, __getCurrentName(indexColStruct),
                                JoinOperatorT.InnerJoin, windowStruct);
                })
                .then(function(ret) {
                    // Those three give duplicate row same number
                    // so need to generate min/max index
                    // for each (partition + sort columns) pair (eigen)
                    cli += windowStruct.cli;
                    partitionMinColName = windowStruct.tempGBCol;
                    var operator = "min";
                    windowStruct = {leftColInfo: node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols),
                            node: node, cli: ""};
                    if (opName === "CumeDist") {
                        operator = "max";
                    }
                    return __groupByAndJoinBack(self.sqlObj, ret, operator,
                            __concatColInfoForSort(groupByCols,
                            sortColsAndOrder).map(function(col) {
                                col.colName = col.name;
                                return col;
                            }), __getCurrentName(indexColStruct),
                            JoinOperatorT.InnerJoin, windowStruct);
                });
                if (opName === "Rank") {
                    // rank = minForEigen - minForPartition + 1
                    curPromise = curPromise.then(function(ret) {
                        cli += windowStruct.cli;
                        cli += ret.cli;
                        psGbColName = windowStruct.tempGBCol;
                        node.usrCols.push(newColStruct);
                        var mapStr = "add(sub(" + psGbColName + ", "
                                     + partitionMinColName + "), 1)";
                        return self.sqlObj.map([mapStr], ret.newTableName,
                                               [newColStruct.colName]);
                    });
                } else {
                    // percent_rank = (minForEigen - minForPartition)
                    // / (sizeOfPartition - 1)
                    // if sizeOfPartition == 1, set denominator to be 1
                    // cume_dist = (maxForEigen - minFor Partition + 1)
                    // / sizeOfPartition
                    var tempCountColName;
                    curPromise = curPromise.then(function(ret) {
                        cli += windowStruct.cli;
                        psGbColName = windowStruct.tempGBCol;
                        windowStruct = {leftColInfo: node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols),
                            node: node, cli: ""};
                        return __groupByAndJoinBack(self.sqlObj, ret, "count",
                                groupByCols, __getCurrentName(indexColStruct),
                                JoinOperatorT.InnerJoin, windowStruct);
                    })
                    .then(function(ret) {
                        cli += windowStruct.cli;
                        cli += ret.cli;
                        tempCountColName = windowStruct.tempGBCol;
                        node.usrCols.push(newColStruct);
                        var mapStr;
                        if (opName === "PercentRank") {
                            mapStr = "div(sub(" + psGbColName + ", "
                                + partitionMinColName + "), if(eq(sub("
                                + tempCountColName + ", 1), 0), 1, sub("
                                + tempCountColName + ", 1)))";
                        } else {
                            mapStr = "div(add(sub(" + psGbColName + ", "
                                     + partitionMinColName + "), 1),"
                                     + tempCountColName + ")";
                        }
                        return self.sqlObj.map([mapStr], ret.newTableName,
                                               [newColStruct.colName]);
                    });
                }
                break;
            case ("DenseRank"):
                var windowStruct;
                var drIndexColName;
                var origTableName;
                // Dense_rank treat rows with same eigen as one so do
                // a group by to eliminate duplicate eigens => t1
                curPromise = curPromise.then(function(ret) {
                    windowStruct = {cli: ""};
                    return __genGroupByTable(self.sqlObj, ret, "count",
                            __concatColInfoForSort(groupByCols,
                                sortColsAndOrder).map(function(col) {
                                    col.colName = col.name;
                                    return col;
                                }), __getCurrentName(indexColStruct), windowStruct);
                })
                // Sort t1 because group by may change order
                .then(function(ret) {
                    cli += windowStruct.cli;
                    // Need to reset windowStruct.cli here because
                    // it has been added to cli
                    windowStruct.cli = "";
                    cli += ret.cli;
                    origTableName = windowStruct.origTableName;
                    windowStruct.leftColInfo =
                        [{colName: windowStruct.tempGBCol}]
                        .concat(__deleteIdFromColInfo(groupByCols))
                        .concat(sortColsAndOrder.map(function(col) {
                            return {colName: col.name};
                        }));
                    if (ret.tempCols) {
                        windowStruct.leftColInfo = windowStruct.leftColInfo
                            .concat(ret.tempCols.map(function(colName) {
                                return {colName: colName};
                            }));
                    }
                    delete windowStruct.tempGBCol;
                    windowStruct.leftRename = [];
                    return self.sqlObj.sort(
                        __concatColInfoForSort(groupByCols,
                            sortColsAndOrder), ret.newTableName);
                })
                // Genrow and same steps as in row_number
                // to get rank for each eigen
                .then(function(ret) {
                    cli += ret.cli;
                    drIndexColName = "XC_ROW_COL_"
                                + xcHelper.getTableId(ret.newTableName);
                    windowStruct.leftColInfo
                                .push({colName: drIndexColName});
                    return self.sqlObj.genRowNum(ret.newTableName,
                                                 drIndexColName);
                })
                .then(function(ret){
                    return __groupByAndJoinBack(self.sqlObj, ret, "min",
                                groupByCols, drIndexColName,
                                JoinOperatorT.InnerJoin, windowStruct);
                })
                .then(function(ret) {
                    cli += windowStruct.cli;
                    windowStruct.cli = "";
                    cli += ret.cli;
                    var mapStr = "add(sub(" + drIndexColName + ", "
                                 + windowStruct.tempGBCol + "), 1)";
                    windowStruct.leftColInfo.push(newColStruct);
                    return self.sqlObj.map([mapStr], ret.newTableName,
                                           [newColStruct.colName]);
                })
                // Join back temp table with rename
                .then(function(ret) {
                    windowStruct.leftTableName = origTableName;
                    windowStruct.node = node;
                    windowStruct.rightColInfo = windowStruct.leftColInfo;
                    windowStruct.leftColInfo = node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols);
                    return __joinTempTable(self.sqlObj, ret,
                                           JoinOperatorT.InnerJoin,
                            __concatColInfoForSort(groupByCols,
                                sortColsAndOrder).map(function(col) {
                                    col.colName = col.name;
                                    return col;
                                }),
                            __concatColInfoForSort(groupByCols,
                                sortColsAndOrder).map(function(col) {
                                    col.colName = col.name;
                                    return col;
                                }), windowStruct);
                })
                .then(function(ret) {
                    // add cli in window and move the new column
                    // from xcCols to usrCols
                    if (ret.tempCols) { // This needed or not depends on behavior of innerjoin
                        node.xcCols = node.xcCols.concat(ret.tempCols
                                        .map(function(colName) {
                                            return {colName: colName};
                                        }));
                    }
                    cli += windowStruct.cli;
                    node.usrCols.push(newColStruct);
                    node.xcCols.splice(node.xcCols
                               .indexOf(newColStruct),1);
                    return ret;
                });
                break;
            default:
                assert(0, SQLErrTStr.UnsupportedWindow + opName);
                break;
        }

        curPromise = curPromise.then(function(ret) {
            loopStruct.cli += cli;
            if (node.usrCols.length + node.xcCols.length
                                            + node.sparkCols.length > 60) {
                loopStruct.cli += ret.cli;
                colNameList = node.usrCols.map(function(col) {
                        return __getCurrentName(col);
                    });
                node.xcCols = [indexColStruct];
                colNameList.push(__getCurrentName(indexColStruct));
                if (loopStruct.dummyGbColStruct) {
                    node.xcCols.push(loopStruct.dummyGbColStruct);
                    colNameList.push(__getCurrentName(loopStruct.dummyGbColStruct));
                }
                self.sqlObj.project(colNameList,ret.newTableName)
                .then(function(ret) {
                    deferred.resolve(ret);
                })
            } else {
                deferred.resolve(ret);
            }
        });
        return deferred.promise();
    }

    // XXX plan server fixed, need design to support cube/grouping_sets
    function __handleMultiDimAgg(self, gbColNames, gbStrColNames, gArray, tableName, expand) {
        var cli = "";
        var deferred = PromiseHelper.deferred();
        assert(gbColNames[gbColNames.length - 1] === "SPARK_GROUPING_ID");
        // Currently expand is not used here
        //var groupingIds = expand.groupingIds;
        var gIdColName = __getCurrentName(expand.groupingColStruct);
        var curIndex = 0;
        var tableInfos = [];
        // Only support full rollup, which always need extra gb column
        var gbTempColName = "XC_GB_COL_" + Authentication.getHashId()
                                                         .substring(1);
        var tempCols = [{colName: gbTempColName}];
        var curPromise = self.sqlObj.map(["string(1)"], tableName, [gbTempColName])
                                    .then(function(ret) {
                                        tableName = ret.newTableName;
                                        return ret;
                                    });
        for (var i = 0; i < gbColNames.length; i++) {
            curPromise = curPromise.then(function(ret) {
                cli += ret.cli;
                //var newTableName = tableName + "-GB-" + curIndex + "-"
                //                   + Authentication.getHashId();
                options = {};
                if (ret.tempCols) {
                    for (var i = 0; i < ret.tempCols.length; i++) {
                        tempCols.push({colName: ret.tempCols[i]});
                    }
                }
                var tempGBColNames = [gbTempColName];
                var tempGArray = jQuery.extend(true, [], gArray);
                var nameMap = {};
                var mapStrs = [];
                var newColNames = [];
                for (var j = 0; j < gbColNames.length - 1; j++) {
                    if ((1 << (gbColNames.length - j - 2) & curIndex) === 0) {
                        tempGBColNames.push(gbColNames[j]);
                    } else {
                        if (gbStrColNames.indexOf(gbColNames[j]) != -1) {
                            var tempStrColName = gbColNames[j] + "-str-"
                                    + Authentication.getHashId().substring();
                            nameMap[gbColNames[j]] = tempStrColName;
                            newColNames.push(gbColNames[j]);
                            mapStrs.push("string(" + tempStrColName + ")");
                        }
                        tempGArray.push({
                            operator: "sum",
                            aggColName: gbTempColName,
                            newColName: nameMap[gbColNames[j]] || gbColNames[j]
                        });
                    }
                }
                mapStrs.push("int(" + curIndex + ")");
                newColNames.push(gIdColName);

                // Column info for union
                var columns = [{name: gbTempColName, rename: gbTempColName,
                                type: "DfUnknown", cast: false},
                               {name: gIdColName, rename: gIdColName,
                                type: "DfUnknown", cast: false}];
                for (var j = 0; j < gbColNames.length - 1; j++) {
                    columns.push({
                        name: gbColNames[j],
                        rename: gbColNames[j],
                        type: "DfUnknown",
                        cast: false
                    });
                }
                for (var j = 0; j < gArray.length; j++) {
                    columns.push({
                        name: gArray[j].newColName,
                        rename: gArray[j].newColName,
                        type: "DfUnknown",
                        cast: false
                    })
                }

                curIndex = (curIndex << 1) + 1;

                return self.sqlObj.groupBy(tempGBColNames, tempGArray,
                    tableName, options).then(function(ret) {
                        cli += ret.cli;
                        return self.sqlObj.map(mapStrs, ret.newTableName,
                                            newColNames)
                            .then(function(ret) {
                                tableInfos.push({
                                    tableName: ret.newTableName,
                                    columns: columns
                                });
                                return ret;
                            });
                    });
            });
        }

        curPromise = curPromise.then(function(ret) {
            cli += ret.cli;
            return self.sqlObj.union(tableInfos, false);
        })
        .then(function(ret) {
            cli += ret.cli;
            deferred.resolve({newTableName: ret.newTableName,
                              cli: cli, tempCols: tempCols});
        });

        return deferred.promise();
    }

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
            var hasLeftPar = false;
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
                                    Authentication.getHashId().substring(1);

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
                            hasLeftPar = true;
                        } else {
                            acc.operator = opLookup[opName];
                            if (options.xcAggregate) {
                                outStr += opLookup[opName] + "(";
                                hasLeftPar = true;
                            }
                        }
                    } else {
                        outStr += opLookup[opName] + "(";
                        hasLeftPar = true;
                    }
                }
            } else if (opName.indexOf(".ScalarSubquery") > -1) {
                // Subquery should have subqueryTree and no child
                assert(condTree.children.length === 0);
                assert(condTree.subqueryTree);
                assert(acc.subqueryArray);
                var subqVarName = "XC_SUBQ_" +
                                    Authentication.getHashId().substring(1);
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
                    hasLeftPar = true;
                    assert(acc.hasOwnProperty("udfs"));
                    acc.udfs.push(condTree.value.name.toUpperCase());
                } else {
                    outStr += opLookup[opName] + "(";
                    hasLeftPar = true;
                }
            }
            for (var i = 0; i < condTree.value["num-children"]; i++) {
                outStr += genEvalStringRecur(condTree.children[i], acc,
                                             options);
                if (i < condTree.value["num-children"] -1) {
                    outStr += ",";
                }
            }
            if (hasLeftPar) {
                outStr += ")";
            }
        } else {
            // When it's not op
            if (condTree.value.class ===
               "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
                // Column Name
                var colName;
                if (condTree.value.name.indexOf(tablePrefix) !== 0) {
                    colName = cleanseColName(condTree.value.name);
                } else {
                    colName = condTree.value.name;
                }
                var id = condTree.value.exprId.id;
                if (options && options.renamedCols &&
                    options.renamedCols[id]) {
                    // XXX spark column not included here
                    // not sure whether this AR could be spark column
                    colName = options.renamedCols[id];
                }
                outStr += colName;
            } else if (condTree.value.class ===
                "org.apache.spark.sql.catalyst.expressions.Literal") {
                if (condTree.value.dataType === "string" ||
                    condTree.value.dataType === "date" ||
                    condTree.value.dataType === "calendarinterval") {
                    outStr += '"' + condTree.value.value + '"';
                } else if (condTree.value.dataType === "timestamp") {
                    outStr += 'default:convertToUnixTS("' +
                                                    condTree.value.value + '")';
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
                         options, subqueryArray) {
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
                var acc = {aggEvalStrArray: aggEvalStrArray,
                           numOps: 0,
                           udfs: [],
                           subqueryArray: subqueryArray};
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
                                 numOps: acc.numOps,
                                 colId: colStruct.colId};

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
                colStruct.colType = curColStruct.dataType;
                if (options && options.renamedCols &&
                    options.renamedCols[colStruct.colId]) {
                    colStruct.rename = options.renamedCols[colStruct.colId];
                }
            }
            columns.push(colStruct);
        }
    }

    function produceSubqueryCli(self, subqueryArray) {
        var deferred = PromiseHelper.deferred();
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
        var deferred = PromiseHelper.deferred();
        var cliStatements = "";
        var promiseArray = [];

        if (aggEvalStrArray.length === 0) {
            return PromiseHelper.resolve("");
        }
        function handleAggStatements(aggEvalStr, aggSrcTableName,
                                     aggVarName) {
            var that = this;
            var innerDeferred = PromiseHelper.deferred();
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
            if (options && options.renamedCols &&
                options.renamedCols[id]) {
                attrName = options.renamedCols[id];
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
        if (dataType.indexOf("decimal(") != -1) {
            return "float";
        }
        switch (dataType) {
            case ("double"):
            case ("float"):
                return "float";
            case ("timestamp"):
            case ("integer"):
            case ("long"):
            case ("short"):
            case ("byte"):
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
            name = xcHelper.stripPrefixInColName(name);
        }
        return xcHelper.stripColName(name,true).toUpperCase();
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

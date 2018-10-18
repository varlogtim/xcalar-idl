(function() {
    var root = this;

    function SQLCompiler() {
        this.sqlObj = new SQLApi();
        this.jdbcOption;
        return this;
    }
    var opLookup = {
        // arithmetic.scala
        "expressions.UnaryMinus": null,
        "expressions.UnaryPositive": null, // Seems it's removed by spark
        "expressions.Abs": "abs",
        "expressions.AbsNumeric": "absNumeric",
        "expressions.AbsInteger": "absInt",
        "expressions.Add": "add",
        "expressions.Subtract": "sub",
        "expressions.Multiply": "mult",
        "expressions.AddInteger": "addInteger",
        "expressions.SubtractInteger": "subInteger",
        "expressions.MultiplyInteger": "multInteger",
        "expressions.AddNumeric": "addNumeric",
        "expressions.SubtractNumeric": "subNumeric",
        "expressions.MultiplyNumeric": "multNumeric",
        "expressions.Divide": "div",
        "expressions.DivideNumeric": "divNumeric",
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
        "expressions.XcType.float": "float", // Xcalar generated
        "expressions.XcType.int": "int", // Xcalar generated
        "expressions.XcType.bool": "bool", // Xcalar generated
        "expressions.XcType.numeric": "numeric", // Xcalar generated
        "expressions.XcType.string": "string", // Xcalar generated
        "expressions.XcType.timestamp": "timestamp", // Xcalar generated
        // conditionalExpressions.scala
        "expressions.If": "if",
        "expressions.IfStr": "ifStr", // Xcalar generated
        "expressions.IfNumeric": "ifNumeric", // Xcalar generated
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
        "expressions.XcRound": "round", // Xcalar generated
        "expressions.BRound": null,
        // predicates.scala
        "expressions.Not": "not",
        "expressions.In": "in", // This is compiled to eq & or <= not true, we support in now
        "expressions.And": "and",
        "expressions.Or": "or",
        "expressions.EqualTo": "eqNonNull",
        "expressions.EqualNullSafe": "eq",
        "expressions.LessThan": "lt",
        "expressions.LessThanOrEqual": "le",
        "expressions.GreaterThan": "gt",
        "expressions.GreaterThanOrEqual": "ge",
        // randomExpressions.scala,
        "expressions.Rand": null, // XXX a little different
        "expressions.GenRandom": "genRandom", // Xcalar generated
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
        "expressions.StringInstr": null,
        "expressions.SubstringIndex": "substringIndex",
        "expressions.StringLocate": null,
        "expressions.Find": "find", // Xcalar generated
        "expressions.StringLPad": "stringLPad",
        "expressions.StringRPad": "stringRPad",
        "expressions.ParseUrl": null, // TODO
        "expressions.FormatString": null, // TODO
        "expressions.InitCap": "initCap", // Different behavior
        "expressions.StringRepeat": "repeat",
        "expressions.StringReverse": "stringReverse",
        "expressions.StringSpace": null, // TODO
        "expressions.Substring": "substring", // XXX 1-based index
        "expressions.XcSubstring": "substring", // Xcalar generated
        "expressions.Right": "right", // XXX right(str, 5) ==
                                      // substring(str, -5, 0)
        "expressions.Left": "left", // XXX left(str, 4) == substring(str, 0, 4)
        "expressions.Length": "len",
        "expressions.BitLength": "bitLength",
        "expressions.OctetLength": "octetLength",
        "expressions.Levenshtein": "levenshtein",
        "expressions.SoundEx": "soundEx",
        "expressions.Ascii": "ascii",
        "expressions.Chr": "chr",
        "expressions.Base64": null, // TODO
        "expressions.UnBase64": null, // TODO
        "expressions.Decode": null, // TODO
        "expressions.Encode": null, // TODO
        "expressions.FormatNumber": "formatNumber",
        "expressions.Sentences": null, // XXX Returns an array.
        "expressions.IsNotNull": "exists",
        "expressions.IsNull": null, // XXX we have to put not(exists)
        "expressions.IsString": "isString", // Xcalar generated

        // datetimeExpressions.scala

        // Since we're not supporting DATE type, results of all DATE related
        // functions need to go through secondTraverse to be truncated for
        // displaying purpose
        "expressions.AddMonths": "addDateInterval", // date
        "expressions.CurrentDate": null, // Spark
        "expressions.CurrentTimestamp": null, // Spark
        "expressions.DateAdd": "addDateInterval", // date
        "expressions.DateDiff": "dateDiff", // date
        "expressions.DateFormatClass": "convertFromUnixTS",
        "expressions.DateSub": "addDateInterval", // date
        "expressions.LastDay": "lastDayOfMonth", // date
        "expressions.NextDay": "nextDay", // date
        "expressions.MonthsBetween": "monthsBetween",
        "expressions.TimeAdd": "addIntervalString",
        "expressions.TimeSub": "addIntervalString",

        "expressions.Year": "datePart",
        "expressions.Quarter": "datePart",
        "expressions.Month": "datePart",
        "expressions.WeekOfYear": "weekOfYear",
        "expressions.DayOfWeek": "datePart",
        "expressions.DayOfMonth": "datePart",
        "expressions.DayOfYear": "dayOfYear",
        "expressions.Hour": "timePart",
        "expressions.Minute": "timePart",
        "expressions.Second": "timePart",

        "expressions.FromUnixTime": "timestamp",
        "expressions.FromUTCTimestamp": null, //"convertTimezone",
        "expressions.ParseToDate": "timestamp",  // date
        "expressions.ParseToTimestamp": "timestamp",
        "expressions.ToUnixTimestamp": "timestamp", // Need int result
        "expressions.ToUTCTimestamp": null, //"toUTCTimestamp",
        "expressions.TruncDate": "dateTrunc",  // date
        "expressions.TruncTimestamp": "dateTrunc",
        "expressions.UnixTimestamp": "timestamp",


        "expressions.aggregate.Sum": "sum",
        "expressions.aggregate.SumInteger": "sumInteger",
        "expressions.aggregate.SumNumeric": "sumNumeric",
        "expressions.aggregate.Count": "count",
        "expressions.aggregate.CollectList": null,
        "expressions.aggregate.ListAgg": "listAgg", // Xcalar generated
        "expressions.aggregate.Max": "max",
        "expressions.aggregate.MaxInteger": "maxInteger",
        "expressions.aggregate.MaxNumeric": "maxNumeric",
        "expressions.aggregate.Min": "min",
        "expressions.aggregate.MinInteger": "minInteger",
        "expressions.aggregate.MinNumeric": "minNumeric",
        "expressions.aggregate.Average": "avg",
        "expressions.aggregate.AverageNumeric": "avgNumeric",
        "expressions.aggregate.StddevPop": "stdevp",
        "expressions.aggregate.StddevSamp": "stdev",
        "expressions.aggregate.VariancePop": "varp",
        "expressions.aggregate.VarianceSamp": "var",
        "expressions.aggregate.CentralMomentAgg": null,
        "expressions.aggregate.Corr": null,
        "expressions.aggregate.CountMinSketchAgg": null,
        "expressions.aggregate.Covariance": null,
        "expressions.aggregate.First": "first", // Only used in aggregate
        "expressions.aggregate.HyperLogLogPlusPlus": null,
        "expressions.aggregate.Last": "last", // Only used in aggregate
        "expressions.Rank": "*rank", // These eight are for window functions in map
        "expressions.PercentRank": "*percentRank",
        "expressions.DenseRank": "*denseRank",
        "expressions.NTile": "*nTile",
        "expressions.CumeDist": "*cumeDist",
        "expressions.RowNumber": "*rowNumber",
        "expressions.Lead": "*lead",
        "expressions.Lag": "*lag",
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
            if (!message) {
                message = "Compilation Error";
            }
            if (typeof SQLOpPanel !== "undefined") {
                SQLOpPanel.throwError(message);
            }
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
            this.dupCols = {};
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
                    continue;
                } else {
                    var col = {colName: evalStr,
                               colId: rdds[i][0].exprId.id,
                               colType: convertSparkTypeToXcalarType(rdds[i][0].dataType)};
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
                "value": null,
                "dataType": "null"
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
                "class": "org.apache.spark.sql.catalyst.expressions.XcRound",
                "num-children": 1
            });
        }
        function stringReplaceNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.StringReplace",
                "num-children": 3,
                "left": 0,
                "right": 1
            });
        }
        // function ifStrNode() {
        //     return new TreeNode({
        //         "class": "org.apache.spark.sql.catalyst.expressions.IfStr",
        //         "num-children": 3,
        //         "branches": null,
        //     });
        // }
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
        function castNode(xcType) {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.XcType."
                          + xcType,
                "num-children": 1,
                "colType": xcType
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
        function findNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.Find",
                "num-children": 4
            });
        }
        function isStrNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.IsString",
                "num-children": 1
            });
        }
        function greaterThanNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.GreaterThan",
                "num-children": 2
            });
        }
        function greaterThanEqualNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.GreaterThanOrEqual",
                "num-children": 2
            });
        }
        function andNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.And",
                "num-children": 2
            });
        }
        function inNode(numChildren) {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.In",
                "num-children": numChildren
            });
        }
        function dupNodeWithNewName(node, str) {
            var dupNode = jQuery.extend(true, {}, node);
            dupNode.value.class = str;
            return dupNode;
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
            case ("expressions.UnaryMinus"):
                var subNode = subtractNode();
                var zeroNode = literalNumberNode(0);
                subNode.children = [zeroNode, node.children[0]];
                node = subNode;
                break;
            case ("expressions.Remainder"):
                var intNodeL = castNode("int");
                var intNodeR = castNode("int");
                intNodeL.children = [node.children[0]];
                intNodeR.children = [node.children[1]];
                node.children = [intNodeL, intNodeR];
                break;
            case ("expressions.Rand"):
                var intMax = 2147483647;
                var intMaxNode = literalNumberNode(intMax);
                var endNode = literalNumberNode(intMax-1);
                var zeroNode = literalNumberNode(0);
                var divNode = divideNode();
                var dupNode = dupNodeWithNewName(node,
                    "org.apache.spark.sql.catalyst.expressions.GenRandom");
                divNode.children = [dupNode, intMaxNode];
                dupNode.children = [zeroNode, endNode];
                dupNode.value["num-children"] = 2;
                node = divNode;
                break;
            case ("expressions.FindInSet"):
                node.children = [node.children[1], node.children[0]];
                break;
            case ("expressions.Substring"):
                // XXX since this traverse is top down, we will end up
                // traversing the subtrees twice. Might need to add a flag
                // to the node and stop traversal if the flag is already set
                var startIndex = node.children[1].value;
                var length = node.children[2].value;
                if (startIndex.class.endsWith("Literal") &&
                    startIndex.dataType === "integer") {
                    if (length.class.endsWith("Literal") &&
                        length.dataType === "integer") {
                        if (length.value * 1 <= 0) {
                            var strNode = castNode("string");
                            strNode.children = [literalStringNode("")];
                            node = strNode;
                        } else {
                            if (startIndex.value * 1 > 0) {
                                startIndex.value = "" + (startIndex.value * 1 - 1);
                            }
                            if (startIndex.value * 1 < 0 && startIndex.value
                                            * 1 + length.value * 1 >= 0) {
                                length.value = "0";
                            } else {
                                length.value = "" + (startIndex.value * 1 +
                                               length.value * 1);
                            }
                        }
                    } else {
                        node.value.class =
                        "org.apache.spark.sql.catalyst.expressions.XcSubstring";
                        var retNode = ifNode();
                        var gtNode = greaterThanNode();
                        var emptyStrNode = castNode("string");
                        emptyStrNode.children = [literalStringNode("")];
                        var zeroNode = castNode("int");
                        zeroNode.children = [literalNumberNode(0)];
                        retNode.children = [gtNode, node, emptyStrNode];
                        gtNode.children = [node.children[2], zeroNode];
                        if (startIndex.value * 1 > 0) {
                            startIndex.value = "" + (startIndex.value * 1 - 1);
                        }
                        var addN = addNode();
                        var intN = castNode("int");
                        addN.children.push(node.children[1], node.children[2]);
                        intN.children = [addN];
                        if (startIndex.value * 1 < 0) {
                            var innerIfNode = ifNode();
                            var geNode = greaterThanEqualNode();
                            geNode.children = [intN, zeroNode];
                            innerIfNode.children = [geNode, zeroNode, intN];
                            node.children[2] = innerIfNode;
                        } else {
                            node.children[2] = intN;
                        }
                        node = retNode;
                    }
                } else {
                    node.value.class =
                        "org.apache.spark.sql.catalyst.expressions.XcSubstring";
                    var retNode = ifNode();
                    var gtNode = greaterThanNode();
                    var emptyStrNode = castNode("string");
                    emptyStrNode.children = [literalStringNode("")];
                    var zeroNode = castNode("int");
                    zeroNode.children = [literalNumberNode(0)];
                    retNode.children = [gtNode, node, emptyStrNode];
                    gtNode.children = [node.children[2], zeroNode];
                    var ifNodeI = ifNode();
                    var gtNodeI = greaterThanNode();
                    var subNode = subtractNode();

                    var intNodeS = castNode("int");
                    intNodeS.children = [node.children[1]];
                    node.children[1] = intNodeS;

                    subNode.children.push(node.children[1],
                                          literalNumberNode(1));
                    var addN = addNode();
                    var intNLeft = castNode("int");
                    var intNRight = castNode("int");
                    var ifNodeL = ifNode();
                    var andN = andNode();
                    var gtNodeL = greaterThanNode();
                    var geNode = greaterThanEqualNode();
                    gtNodeL.children = [zeroNode, node.children[1]];
                    addN.children.push(ifNodeI, node.children[2]);
                    intNLeft.children = [subNode];
                    intNRight.children = [addN];
                    geNode.children = [intNRight, zeroNode];
                    andN.children = [gtNodeL, geNode];
                    ifNodeL.children = [andN, zeroNode, intNRight];
                    gtNodeI.children = [node.children[1], zeroNode];
                    ifNodeI.children = [gtNodeI, intNLeft, node.children[1]];
                    node.children[1] = ifNodeI;
                    node.children[2] = ifNodeL;
                    node = retNode;
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
                getNewNode = ifNode;
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
                // Note: The first OR node or the ONLY In node will be the root
                // of the tree
                assert(node.children.length >= 2,
                       SQLErrTStr.InChildrenLength + node.children.length);
                if (node.children.length < 1025) {
                    break;
                }
                var newInNode;
                var newNode = orNode();
                var prevOrNode = newNode;
                var index = 1;
                for (var i = 0; i < (node.children.length - 1) / 1023; i++) {
                    if (newInNode) {
                        prevOrNode.children.push(newInNode);
                        newInNode = inNode(Math.min(1024,
                                                node.children.length - index));
                    }
                    newInNode.children = [node.children[0]];
                    while (index < node.children.length &&
                                        newInNode.children.length < 1024) {
                        newInNode.children.push(node.children[index]);
                        index++;
                    }
                    if (index === node.children.length) {
                        prevOrNode.children.push(newInNode);
                    } else {
                        var newOrNode = orNode();
                        prevOrNode.children.push(newOrNode);
                        prevOrNode = newOrNode;
                    }
                }
                node = newNode;
                break;
            case ("expressions.Cast"):
                var type = node.value.dataType;
                var convertedType = convertSparkTypeToXcalarType(type);
                node.value.class = node.value.class
                            .replace("expressions.Cast",
                                     "expressions.XcType." + convertedType);
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
                    prepareUsedColIds(subqueryTree);
                    node.subqueryTree = subqueryTree;
                } else {
                    var xcAggNode = xcAggregateNode();
                    var subqueryTree = SQLCompiler.genTree(xcAggNode,
                                                           node.value.plan);
                    prepareUsedColIds(subqueryTree);
                    xcAggNode.children = [subqueryTree];
                    node.subqueryTree = xcAggNode;
                }
                break;
            case ("expressions.Year"):
            case ("expressions.Quarter"):
            case ("expressions.Month"):
            case ("expressions.DayOfWeek"):
            case ("expressions.DayOfMonth"):
            case ("expressions.Hour"):
            case ("expressions.Minute"):
            case ("expressions.Second"):
                assert(node.children.length === 1,
                       SQLErrTStr.DateTimeOneChild + node.children.length);
                var lookUpDict = {
                    "expressions.Year": "Y",
                    "expressions.Quarter": "Q",
                    "expressions.Month": "M",
                    "expressions.DayOfWeek": "W",
                    "expressions.DayOfMonth": "D",
                    "expressions.Hour": "H",
                    "expressions.Minute": "M",
                    "expressions.Second": "S"
                };
                var argNode = literalStringNode(lookUpDict[opName]);
                node.children.push(argNode);
                node.value["num-children"]++;
                break;
            case ("expressions.FromUnixTime"):
                assert(node.children.length === 2,
                       SQLErrTStr.UnixTimeTwoChildren + node.children.length);
                var multNode = multiplyNode();
                var thousandNode = literalNumberNode(1000);
                multNode.children = [node.children[node.value["sec"]], thousandNode];
                node.children = [multNode];
                node.value["num-children"] = 1;
                break;
            case ("expressions.ToUnixTimestamp"):
            case ("expressions.UnixTimestamp"):
                // Takes in string/date/timestamp.
                // We cast all to timestamp first.
                assert(node.children.length === 2,
                       SQLErrTStr.UnixTimeTwoChildren + node.children.length);
                // remove format node
                var cNode = castNode("timestamp");
                cNode.children = [node.children[node.value["timeExp"]]];
                var intNode = castNode("int");
                var divNode = divideNode();
                var parentIntNode = castNode("int");
                intNode.children = [cNode];
                divNode.children = [intNode, literalNumberNode(1000)];
                parentIntNode.children = [divNode];
                node = parentIntNode;
                break;
            case ("expressions.TimeAdd"):
            case ("expressions.TimeSub"):
                assert(node.children.length === 2,
                       SQLErrTStr.TimeIntervalTwoChildren + node.children.length);
                var intervalNode = node.children[node.value["interval"]];
                assert(intervalNode.value.class ===
                       "org.apache.spark.sql.catalyst.expressions.Literal",
                       SQLErrTStr.TimeIntervalType + intervalNode.value.class);
                var intervalTypes = ["years",  "months", "days", "hours",
                                     "minutes", "seconds"];
                var intervalArray = [0, 0, 0, 0, 0, 0];
                var typeStr = intervalNode.value.value;
                var intervalParts = typeStr.split(" ");
                for (var i = 1; i < intervalParts.length; i += 2) {
                    var num = parseInt(intervalParts[i]);
                    var type = intervalParts[i + 1];
                    if (intervalTypes.indexOf(type) > -1) {
                        intervalArray[intervalTypes.indexOf(type)] += num;
                    } else if (type === "week") {
                        intervalArray[intervalTypes.indexOf("days")] += 7 * num;
                    } else if (type === "milliseconds") {
                        intervalArray[intervalTypes.indexOf("seconds")] += num / 1000;
                    } else {
                        assert(0, SQLErrTStr.UnsupportedIntervalType + type);
                    }
                }
                var intervalStr = "";
                for (var i = 0; i < intervalArray.length; i++) {
                    if (opName === "expressions.TimeSub") {
                        intervalStr += "-" + intervalArray[i] + ",";
                    } else {
                        intervalStr += intervalArray[i] + ",";
                    }
                }
                if (intervalStr.endsWith(",")) {
                    intervalStr = intervalStr.substring(0, intervalStr.length - 1);
                }
                var newIntervalNode = literalStringNode(intervalStr);
                node.children[node.value["interval"]] = newIntervalNode;
                break;
            case ("expressions.DateFormatClass"):
                assert(node.children.length === 2,
                       SQLErrTStr.DateFormatTwoChildren + node.children.length);
                var formatNode = node.children[1];
                if (formatNode.value.class ===
                        "org.apache.spark.sql.catalyst.expressions.Literal") {
                    var formatStr = formatNode.value.value;
                    var segments = formatStr.split("%");
                    for (i in segments) {
                        segments[i] = segments[i].replace(/(^|[^%])(YYYY|yyyy|YYY|yyy)/g, "$1%Y")
                                                 .replace(/(^|[^%])(YY|yy)/g, "$1%y")
                                                 .replace(/(^|[^%])(Y|y)/g, "$1%Y")
                                                 .replace(/(^|[^%])(MM|M)/g, "$1%m")
                                                 .replace(/(^|[^%])(dd|d)/g, "$1%d")
                                                 .replace(/(^|[^%])(HH|H)/g, "$1%H")
                                                 .replace(/(^|[^%])(hh|h)/g, "$1%I")
                                                 .replace(/(^|[^%])(mm|m)/g, "$1%M")
                                                 .replace(/(^|[^%])(ss|s)/g, "$1%S");
                    }
                    formatStr = segments.join("%%");
                    formatNode.value.value = formatStr;
                } else {
                    assert(0, SQLErrTStr.DateFormatNotColumn);
                }
                // var intNode = castNode("int");
                // intNode.children = [node];
                // node = intNode;
                break;
            case ("expressions.Coalesce"):
                // XXX It's a hack. It should be compiled into CASE WHEN as it
                // may have more than 2 children
                assert(node.children.length === 2,
                       SQLErrTStr.CoalesceTwoChildren + node.children.length);

                var newNode = ifNode();
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
            case ("expressions.IsNull"):
                var nNode = notNode();
                var notNNode = existNode();
                nNode.children = [notNNode];
                notNNode.children = [node.children[0]];
                node = nNode;
                break;
            case ("expressions.CheckOverflow"):
            case ("expressions.PromotePrecision"):
                assert(node.children.length === 1,
                       SQLErrTStr.DecimalNodeChildren + node.children.length);
                node = secondTraverse(node.children[0], options);
                break;
            case ("expressions.StringInstr"):
                var retNode = addNode();
                var fNode = findNode();
                var zeroNode = literalNumberNode(0);
                var oneNode = literalNumberNode(1);
                retNode.children = [fNode, oneNode];
                fNode.children = [node.children[node.value["str"]],
                    node.children[node.value["substr"]], zeroNode, zeroNode];
                node = retNode;
                break;
            case ("expressions.StringLocate"):
                var retNode = addNode();
                var subNode = subtractNode();
                var fNode = findNode();
                var intNode = castNode("int");
                var zeroNode = literalNumberNode(0);
                var oneNode = literalNumberNode(1);
                retNode.children = [fNode, oneNode];
                intNode.children = [subNode];
                subNode.children = [node.children[node.value["start"]], oneNode];
                fNode.children = [node.children[node.value["str"]],
                    node.children[node.value["substr"]], intNode, zeroNode];
                node = retNode;
                break;
            case ("expressions.Rank"):
            case ("expressions.PercentRank"):
            case ("expressions.DenseRank"):
                node.children = [];
                node.value["num-children"] = 0;
                break;
            case ("expressions.TruncTimestamp"):
            case ("expressions.DateDiff"):
                node.children = [node.children[1], node.children[0]];
                break;
            case ("expressions.AddMonths"):
                node.value["num-children"] = 4;
                var zeroNode = literalNumberNode(0);
                node.children = [node.children[0], zeroNode, node.children[1], zeroNode];
                break;
            case ("expressions.DateAdd"):
                node.value["num-children"] = 4;
                var zeroNode = literalNumberNode(0);
                node.children = [node.children[0], zeroNode, zeroNode, node.children[1]];
                break;
            case ("expressions.DateSub"):
                assert(node.children.length === 2,
                    SQLErrTStr.DateSubTwoChildren + node.children.length);
                node.value["num-children"] = 4;
                var zeroNode = literalNumberNode(0);
                var intNode = castNode("int");
                var mulNode = multiplyNode();
                var mOneNode = literalNumberNode(-1);
                intNode.children = [mulNode];
                mulNode.children = [mOneNode, node.children[1]];
                node.children = [node.children[0], zeroNode, zeroNode, intNode];
                break;
            case ("expressions.aggregate.CollectList"):
                // XXX this is a workaround because we don't have list type
                node.value.class =
                    "org.apache.spark.sql.catalyst.expressions.aggregate.ListAgg";
                break;
            // case ("expressions.FromUTCTimestamp"):
            //     assert(node.children.length === 2,
            //             SQLErrTStr.UTCTZTwoChildren + node.children.length);
            //     var formatNode = node.children[1];
            //     if (formatNode.value.class ===
            //             "org.apache.spark.sql.catalyst.expressions.Literal") {
            //         // TODO
            //         // var formatStr = formatNode.value.value;
            //         // formatStr = formatStr.replace(/YYYY|yyyy|YYY|yyy/g, "%Y")
            //         //                     .replace(/YY|yy/g, "%y")
            //         //                     .replace(/Y|y/g, "%Y")
            //         //                     .replace(/MM|M/g, "%M")
            //         //                     .replace(/dd|d/g, "%d")
            //         //                     .replace(/HH|H/g, "%H")
            //         //                     .replace(/hh|h/g, "%I")
            //         //                     .replace(/mm|m/g, "%M")
            //         //                     .replace(/ss|s/g, "%S");
            //         // if (formatStr.indexOf("%%") > -1) {
            //         //     // XXX FIXME Limiting the valid formats now as I can't
            //         //     // find a perfect regex solution. Feel free to extend it
            //         //     assert(0, SQLErrTStr.InvliadDateFormat);
            //         // }
            //         // formatNode.value.value = formatStr;
            //     } else {
            //         assert(0, SQLErrTStr.UTCTZNotColumn);
            //     }
            //     break;
            default:
                break;
        }

        // This must be a top down resolution. This is because of the Aggregate
        // Expression case, where we want to cut the tree at the top most
        // Aggregate Expression
        for (var i = 0; i < node.children.length; i++) {
            node.children[i] = secondTraverse(node.children[i], options);
        }

        var curOpName = node.value.class.substring(
                        node.value.class.indexOf("expressions."));

        // XXX This should also be removed after we have list type
        if (curOpName === "expressions.aggregate.ListAgg" &&
            node.children[0].colType != "string") {
            assert(0, "Collect_list is only supported with string input");
        }

        if (node.aggTree) {
            // aggTree's root node is expressions.aggregate.*
            // so it won't hit any of the cases in second traverse
            // however, its grandchildren might be substring, etc.
            node.aggTree = secondTraverse(node.aggTree, options, true);
            node.colType = getColType(node.aggTree);
        } else if (node.subqueryTree) {
            node.colType = node.subqueryTree;
        } else if (curOpName === "expressions.AttributeReference" ||
                   curOpName === "expressions.Literal") {
            node.colType = convertSparkTypeToXcalarType(node.value.dataType);
        } else if (curOpName === "expressions.XCEPassThrough") {
            // XXX Remove second block when type map added to sqldf
            if (node.value.name.indexOf("xdf_") === 0) {
                node.colType = opOutTypeLookup[node.value.name.substring(4)];
            } else if (node.value.name.indexOf("xdf_") === 1) {
                if (node.value.name[0] === "i") {
                    node.colType = "int";
                } else if (node.value.name[0] === "f") {
                    node.colType = "float";
                } else if (node.value.name[0] === "s") {
                    node.colType = "string";
                } else if (node.value.name[0] === "b") {
                    node.colType = "bool";
                } else if (node.value.name[0] === "n") {
                    node.colType = "numeric";
                } else {
                    assert(0);
                }
                node.value.name = node.value.name.substring(1);
            } else {
                node.colType = "string";
            }
        } else if (curOpName === "expressions.If") {
            if (getColType(node.children[1]) === "null") {
                node.colType = getColType(node.children[2]);
            } else {
                node.colType = getColType(node.children[1]);
            }
        } else if (opLookup[curOpName] && opLookup[curOpName].indexOf("*") != -1) {
            if (curOpName === "expressions.Lead" || curOpName === "expressions.Lag") {
                node.colType = getColType(node.children[0]);
            } else if (curOpName === "expressions.PercentRank"
                            || curOpName === "expressions.CumeDist") {
                node.colType = "float";
            } else {
                node.colType = "int";
            }
        } else {
            node.colType = opOutTypeLookup[opLookup[curOpName]] || getColType(node.children[0]);
        }
        opName = node.value.class.substring(
                            node.value.class.indexOf("expressions."));
        if (opName === "expressions.Add" || opName === "expressions.Subtract"
            || opName === "expressions.Multiply" || opName === "expressions.Abs"
            || opName === "expressions.Divide"
            || opName === "expressions.aggregate.Sum"
            || opName === "expressions.aggregate.Max"
            || opName === "expressions.aggregate.Min"
            || opName === "expressions.aggregate.Average") {
            var allInteger = true;
            var allNumeric = true;
            for (var i = 0; i < node.children.length; i++) {
                if (getColType(node.children[i]) != "int") {
                    allInteger = false;
                }
                if (getColType(node.children[i]) != "numeric") {
                    allNumeric = false;
                }
            }
            if (allInteger && opName != "expressions.aggregate.Average"
                && opName != "expressions.Divide") {
                node.value.class = node.value.class + "Integer";
                node.colType = "int";
            } else if (allNumeric) {
                // Numeric and integer ops are slightly different
                node.value.class = node.value.class + "Numeric";
                node.colType = "numeric";
            }
        } else if (opName === "expressions.If" && getColType(node.children[1])
                   === "numeric" && getColType(node.children[2]) === "numeric") {
            node.value.class = node.value.class + "Numeric";
            node.colType = "numeric";
        }
        node.visited = true;
        if (opName === "expressions.UnaryMinus" && node.children[1].colType === "int") {
            var intNode = castNode("int");
            intNode.children = [node];
            node = intNode;
            node.visited = true;
        }
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
                var plan;
                try {
                    plan = JSON.parse(data.sqlQuery);
                } catch (e) {
                    deferred.reject(SQLErrTStr.InvalidLogicalPlan);
                }
                try {
                    deferred.resolve(plan);
                } catch (e) {
                    if (typeof SQLOpPanel !== "undefined") {
                        SQLOpPanel.throwError(e);
                    }
                }
            },
            error: function(error) {
                deferred.reject(error);
                console.error(error);
            }
        });
        return deferred.promise();
    }

    // Not used currently
    // SQLCompiler.publishTable = function(xcalarTableName, sqlTableName) {
    //     tableLookup[sqlTableName] = xcalarTableName;
    // };

    // SQLCompiler.getAllPublishedTables = function() {
    //     return tableLookup;
    // };
    function ProjectNode(columns) {
        var newColumns = [];
        columns.forEach(function(column) {
            if (column.length === 1 && column[0].name &&
                column[0].name.indexOf(tablePrefix) === 0) {
                return;
            }
            newColumns.push(column);
        });
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.plans.logical.Project",
            "num-children": 1,
            "projectList": newColumns
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
            "org.apache.spark.sql.catalyst.plans.logical.Union" &&
            node.parent && node.parent.value.class !==
            "org.apache.spark.sql.catalyst.plans.logical.Intersect" &&
            node.parent && node.parent.value.class !==
            "org.apache.spark.sql.catalyst.plans.logical.Except") {
            // Must create a deep copy of the array.
            // Otherwise we are just assigning the pointer. So when the
            // parent changes, the children change as well.
            node.parent.usrCols = jQuery.extend(true, [], node.usrCols);
            node.parent.xcCols = jQuery.extend(true, [], node.xcCols);
            node.parent.sparkCols = jQuery.extend(true, [], node.sparkCols);
            // This is a map of renamed column ids and new names
            node.parent.renamedCols = jQuery.extend(true, {},
                                                      node.renamedCols);
            // A list of columns used to sort in case later operators reorder table
            node.parent.orderCols = jQuery.extend(true, [], node.orderCols);
        }
        // Duplicate columns pulled out in sql. Map {id -> duplicate times}
        if (node.parent && node.parent.dupCols) {
            jQuery.extend(true, node.parent.dupCols, node.dupCols);
        } else if (node.parent) {
            node.parent.dupCols = jQuery.extend(true, {}, node.dupCols);
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
            // XXX Remove after type change completed
            // if (treeNode.usrCols) {
            //     treeNode.usrCols.forEach(function(col) {
            //         assert(col.colType, "Column have no type!");
            //         assert(col.colType != "DfUnknown", "Column with unknown type: " + __getCurrentName(col));
            //     })
            // }

            if (self.sqlObj.getStatus() === SQLStatus.Cancelled) {
                return PromiseHelper.reject(SQLErrTStr.Cancel);
            }
            var deferred = PromiseHelper.deferred();
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
                case ("Intersect"):
                case ("Except"):
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
                node.xccli = node.xccli.substring(0, node.xccli.length - 1);
            }
            cliArray.push(node.xccli);
        }
    }
    SQLCompiler.prototype = {
        // XXX need to move mutator functions from sqlApi to sqlCompiler
        // updateQueryHistory() {
        //     var queryObj = this.sqlObj;
        //     var jdbcOption = this.getJdbcOption();
        //     if (jdbcOption) {
        //         var jdbcSession = jdbcOption.prefix.substring(3, jdbcOption.prefix.length - 2);
        //         queryObj.jdbcSession = jdbcSession;
        //         return SqlQueryHistory.getInstance().upsertQuery(queryObj);
        //     }
        //     // return SqlQueryHistoryPanel.Card.getInstance().update(queryObj);
        //     return SQLHistorySpace.Instance.update(queryObj);
        // },
        getStatus: function() {
            return this.sqlObj.getStatus();
        },
        setStatus: function(st) {
            return this.sqlObj.setStatus(st);
        },
        getError: function() {
            return this.sqlObj.getError();
        },
        setError: function(err) {
            this.sqlObj.setError(err);
        },
        setJdbcOption: function(jdbcOption) {
            this.jdbcOption = jdbcOption;
        },
        getJdbcOption: function() {
            return this.jdbcOption;
        },
        compile: function(queryId, sqlQueryString, isJsonPlan, jdbcOption) {
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

            var id = queryId || xcHelper.randName("sql", 8);
            self.sqlObj.setQueryId(id);
            self.setJdbcOption(jdbcOption);
            if (jdbcOption && jdbcOption.queryString) {
                self.sqlObj.setQueryString(jdbcOption.queryString);
            } else {
                self.sqlObj.setQueryString(sqlQueryString);
            }

            // var cached;
            // if (typeof SQLCache !== "undefined") {
            //     cached = SQLCache.getCached(sqlQueryString);
            // }
            if (jdbcOption && jdbcOption.sqlMode) {
                self.sqlObj.setSqlMode();
            }

            var promise;
            var callback;
            if (isJsonPlan) {
                promise = PromiseHelper.resolve(sqlQueryString);
            // } else if (cached) {
            //     promise = PromiseHelper.resolve(cached, true);
            } else {
                promise = sendPost({"sqlQuery": sqlQueryString});
            }

            var toCache;

            promise
            .then(function(jsonArray, hasPlan) {
                var deferred = PromiseHelper.deferred();
                if (hasPlan) {
                    try {
                        var plan = JSON.parse(jsonArray.plan);
                    } catch (e) {
                        return PromiseHelper.reject(SQLErrTStr.InvalidLogicalPlan);
                    }
                    var finalTableName = SQLCache.setNewTableNames(plan,
                                                         jsonArray.startTables,
                                                         jsonArray.finalTable);
                    deferred.resolve(JSON.stringify(plan), finalTableName,
                                        jsonArray.finalTableCols);
                } else {
                    if (self.sqlObj.getStatus() === SQLStatus.Cancelled) {
                        return PromiseHelper.reject(SQLErrTStr.Cancel);
                    }
                    var allTableNames = getAllTableNames(jsonArray);

                    var tree = SQLCompiler.genTree(undefined, jsonArray);
                    if (tree.value.class ===
                                      "org.apache.spark.sql.execution.LogicalRDD") {
                        // If the logicalRDD is root, we should add an extra Project
                        var newNode = ProjectNode(tree.value.output);
                        newNode.children = [tree];
                        tree.parent = newNode;
                        pushUpCols(tree);
                        tree = newNode;
                    }

                    var numNodes = countNumNodes(tree);

                    prepareUsedColIds(tree);
                    var promiseArray = traverseAndPushDown(self, tree);
                    promiseArray.push(self._handleDupCols.bind(self, tree));
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
                    })
                    .fail(deferred.reject);
                }
                return deferred.promise();
            })
            .then(function(queryString, newTableName, newCols) {
                outDeferred.resolve(queryString, newTableName, newCols, toCache);
            })
            .fail(function(err) {
                var errorMsg = "";
                if (err === SQLErrTStr.Cancel) {
                    self.setStatus(SQLStatus.Cancelled);
                    errorMsg = err;
                } else {
                    errorMsg = parseError(err);
                }
                outDeferred.reject(errorMsg);
            })
            .always(function () {
                if (typeof KVStore !== "undefined" && oldKVcommit) {
                    // Restore the old KVcommit code
                    KVStore.commit = oldKVcommit;
                }
                SQLApi.clear();
            });

            return outDeferred.promise();
        },
        execute: function(queryString, newTableName, newCols, sqlQueryString,
            toCache, jdbcOption) {
            var self = this;
            if (self.getStatus() === SQLStatus.Cancelled){
                return PromiseHelper.reject(SQLErrTStr.Cancel);
            }
            if (jdbcOption && jdbcOption.sqlMode) {
                self.sqlObj.setSqlMode();
            }

            self.setStatus(SQLStatus.Running);
            var deferred = jQuery.Deferred();
            var checkTime = jdbcOption ? jdbcOption.checkTime : 200;
            // update query history
            // var promise = self.updateQueryHistory();
            // var callback = self.sqlObj.run(queryString, newTableName, newCols,
            //                                sqlQueryString, checkTime);
            // promise
            // .then(function () {
            //     return callback;
            // }, function() {
            //     return callback;
            // })
            self.sqlObj.run(queryString, newTableName, newCols, sqlQueryString,
                            checkTime)
            .then(function(newTableName, cols) {
                if (typeof SQLCache !== "undefined" && toCache) {
                    SQLCache.cacheQuery(sqlQueryString, toCache);
                }
                self.setStatus(SQLStatus.Done);
                self.sqlObj.setNewTableName(newTableName);
                // self.updateQueryHistory();
                deferred.resolve(newTableName, cols);
            })
            .fail(function(err) {
                if (err === SQLErrTStr.Cancel) {
                    self.setStatus(SQLStatus.Cancelled);
                } else {
                    self.setStatus(SQLStatus.Failed);
                    self.setError(JSON.stringify(err));
                }
                // Update as "done"
                // self.updateQueryHistory();
                deferred.reject(err);
            });
            return deferred.promise();
        },
        // Deprecated
        _addDrops: function(queryString, keepOri) {
            function cliNode(ancestors) {
                var obj = {};
                obj.ancestors = ancestors;
                obj.dependents = [];
                return obj;
            }
            var self = this;
            var jsonObj;
            var cliMap = {};
            var deferred = PromiseHelper.deferred();
            var curPromise = PromiseHelper.resolve();
            var opClis = [];
            var outCli = "";
            var tempCli = "";
            if (keepOri == undefined) {
                keepOri = true;
            }
            try {
                jsonObj = JSON.parse(queryString);
            } catch (e) {
                if (typeof SQLOpPanel !== "undefined") {
                    SQLOpPanel.throwError(e);
                }
                throw e;
            }
            // First loop, build graph
            for (var i = 0; i < jsonObj.length; i++) {
                var curCliNode = jsonObj[i];
                var nodeName = curCliNode.args.dest;
                var ancestors = typeof curCliNode.args.source === "string" ?
                                        [curCliNode.args.source] : curCliNode.args.source;
                cliMap[nodeName] = cliNode(ancestors);
                for (var j = 0; j < ancestors.length; j++) {
                    if (cliMap[ancestors[j]]) {
                        cliMap[ancestors[j]].dependents.push(nodeName);
                    } else if(!keepOri) {
                        // Tables exist before query
                        cliMap[ancestors[j]] = cliNode([]);
                        cliMap[ancestors[j]].dependents.push(nodeName);
                    }
                }
            }
            for (var i = 0; i < jsonObj.length; i++) {
                var curCliNode = jsonObj[i];
                var nodeName = curCliNode.args.dest;
                var ancestors = typeof curCliNode.args.source === "string" ?
                                        [curCliNode.args.source] : curCliNode.args.source;
                tempCli += JSON.stringify(curCliNode) + ",";
                for (var j = 0; j < ancestors.length; j++) {
                    if (cliMap[ancestors[j]]) {
                        var index = cliMap[ancestors[j]].dependents.indexOf(nodeName);
                        assert(index != -1);
                        cliMap[ancestors[j]].dependents.splice(index, 1);
                        if (cliMap[ancestors[j]].dependents.length === 0) {
                            opClis.push(tempCli);
                            tempCli = "";
                            curPromise = curPromise.then(function() {
                                return self.sqlObj.deleteTable(ancestors[j]);
                            })
                            .then(function(ret) {
                                outCli += opClis[0] + ret.cli;
                                opClis.splice(0, 1);
                            });
                        }
                    }
                }
            }
            curPromise = curPromise.then(function() {
                if (tempCli != "") {
                    outCli += tempCli;
                }
                deferred.resolve("[" + outCli.substring(0, outCli.length - 1) + "]");
            })
            .fail(deferred.reject);
            return deferred.promise();
        },
        // Deprecated
        _addIndexForCrossJoin: function(queryString) {
            var outCli = "";
            var jsonObj;
            var indexMap = {};
            try {
                jsonObj = JSON.parse(queryString);
            } catch (e) {
                if (typeof SQLOpPanel !== "undefined") {
                    SQLOpPanel.throwError(e);
                }
                throw e;
            }
            for (var i = 0; i < jsonObj.length; i++) {
                var curCliNode = jsonObj[i];
                if (curCliNode.operation === "XcalarApiJoin"
                    && curCliNode.args.joinType === "crossJoin") {
                    for (var j = 0; j < curCliNode.args.source.length; j++) {
                        if (indexMap[curCliNode.args.source[j]]) {
                            curCliNode.args.source[j] = indexMap[curCliNode.args.source[j]];
                        } else {
                            // TODO: generate an object for index
                            var tableName = curCliNode.args.source[j];
                            var newTableName = xcHelper.getTableName(tableName)
                                        + "_index" + Authentication.getHashId();
                            indexMap[tableName] = newTableName;
                            curCliNode.args.source[j] = newTableName;
                            var indexObj = {
                                "operation": "XcalarApiIndex",
                                "args": {
                                    "source": tableName,
                                    "dest": newTableName,
                                    "key": [
                                        {
                                            "name": "xcalarRecordNum",
                                            "keyFieldName": "xcalarRecordNum",
                                            "type": "DfInt64",
                                            "ordering": "Unordered"
                                        }
                                    ],
                                    "prefix": "",
                                    "dhtName": "systemRandomDht",
                                    "delaySort": false,
                                    "broadcast": false
                                }
                            };
                            outCli += JSON.stringify(indexObj) + ",";
                        }
                    }
                }
                outCli += JSON.stringify(curCliNode) + ",";
            }
            return "[" + outCli.substring(0, outCli.length - 1) + "]";
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
            var jdbcOption = self.getJdbcOption();
            if (jdbcOption && jdbcOption.prefix) {
                options.prefix = jdbcOption.prefix;
            }
            genMapArray(node.value.projectList, columns,
                        evalStrArray, aggEvalStrArray, options, subqueryArray);
            node.dupCols = options.dupCols;
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
                assert(find, SQLErrTStr.ProjectMismatch +
                             JSON.stringify(node.orderCols[i]));
            }

            // Change node.usrCols & node.renamedCols
            newRenamedCols = {};
            // Extract colNames from column structs
            // and check if it has renamed columns
            for (var i = 0; i < columns.length; i++) {
                if (columns[i].rename) {
                    newRenamedCols[columns[i].colId] = columns[i].rename;
                }
            }

            var newRenames = __resolveCollision(newXcCols, columns, [],
                                                [], "", tableName);
            newRenamedCols = __combineRenameMaps([newRenamedCols,
                                         newRenames]);
            columns.concat(newXcCols).forEach(function(col) {
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
                                evalStr: getColType(columns[i]) + "("
                                + columns[i].colName + ")"});
                            find = true;
                            break;
                        }
                    }
                }
                assert(find, SQLErrTStr.ProjectRenameMistmatch +
                             JSON.stringify(newRenames));
            }
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
                    var colNameSet = new Set();
                    node.usrCols.concat(node.xcCols).concat(node.sparkCols)
                    .map(function (col) {
                        colNameSet.add(__getCurrentName(col));
                    });
                    return __windowMapHelper(self, node, mapStrs, tableName,
                                        newColNames, newTableName, colNameSet);
                })
                .then(function(ret) {
                    cliStatements += ret.cli;
                    return self.sqlObj.project(colNames, ret.newTableName);
                })
                .then(function(ret) {
                    node.usrCols = columns;
                    node.xcCols = newXcCols;
                    node.sparkCols = [];
                    node.renamedCols = newRenamedCols;
                    deferred.resolve({newTableName: ret.newTableName,
                                      cli: cliStatements + ret.cli});
                })
                .fail(deferred.reject);
            } else {
                produceSubqueryCli(self, subqueryArray)
                .then(function(cli) {
                    cliStatements += cli;
                    return self.sqlObj.project(colNames, tableName);
                })
                .then(function(ret) {
                    node.usrCols = columns;
                    node.xcCols = newXcCols;
                    node.sparkCols = [];
                    node.renamedCols = newRenamedCols;
                    deferred.resolve({newTableName: ret.newTableName,
                                        cli: cliStatements + ret.cli});
                })
                .fail(deferred.reject);
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
            if (typeof tableId === "string") {
                tableId = tableId.toUpperCase();
            }
            var colName = "XC_ROW_COL_" + tableId;
            var cli = "";

            self.sqlObj.genRowNum(tableName, colName)
            .then(function(ret) {
                var newTableName = ret.newTableName;
                cli += ret.cli;
                node.xcCols.push({colName: colName, colType: "int"});
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
            var tree = SQLCompiler.genTree(undefined, node.value.condition.slice(0));
            tree = removeExtraExists(tree, node.usedColIds);
            if (tree == undefined) {
                deferred.resolve({
                    "newTableName": node.children[0].newTableName,
                    "cli": ""
                });
                return deferred.promise();
            }
            var treeNode = secondTraverse(tree, {extractAggregates: true}, true);

            var aggEvalStrArray = [];
            var subqueryArray = [];
            var options = {renamedCols: node.renamedCols, xcAggregate: true};
            var jdbcOption = self.getJdbcOption();
            if (jdbcOption && jdbcOption.prefix) {
                options.prefix = jdbcOption.prefix;
            }
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
            assert(node.children.length === 1, SQLErrTStr.SortOneChild + node.children.length);
            var options = {renamedCols: node.renamedCols,
                           tableName: node.children[0].newTableName};
            var sortColsAndOrder = __genSortStruct(node.value.order, options);
            var tableName = node.children[0].newTableName;
            var mapCols = [];
            node.orderCols = [];
            options.maps.forEach(function(tempColInfo) {
                var tempColStruct = {colName: tempColInfo.colName,
                                     colType: getColType(tempColInfo)};
                mapCols.push(tempColStruct);
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
            __handleSortMap(self, node, options.maps, tableName)
            .then(function(ret) {
                sortCli += ret.cli;
                return self.sqlObj.sort(sortColsAndOrder, ret.newTableName);
            })
            .then(function(ret) {
                ret.cli = sortCli + ret.cli;
                node.xcCols = node.xcCols.concat(mapCols);
                deferred.resolve(ret);
            })
            .fail(deferred.reject);
            return deferred.promise();
        },

        _pushDownXcAggregate: function(node) {
            // This is for Xcalar Aggregate which produces a single value
            var self = this;

            assert(node.children.length === 1,
                   SQLErrTStr.XcAggOneChild + node.children.length);
            assert(node.subqVarName, SQLErrTStr.SubqueryName);
            var tableName = node.children[0].newTableName;
            if (node.value.aggregateExpressions) {
                assert(node.value.aggregateExpressions.length === 1,
                       SQLErrTStr.SubqueryOneColumn + node.value.aggregateExpressions.length);
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
                var jdbcOption = self.getJdbcOption();
                if (jdbcOption && jdbcOption.prefix) {
                    options.prefix = jdbcOption.prefix;
                }
                var acc = {};
                var evalStr = genEvalStringRecur(treeNode, acc, options);
                if (!acc.operator) {
                    evalStr = "max(" + evalStr + ")";
                }
                node.colType = getColType(treeNode);
            } else {
                assert(node.usrCols.length === 1,
                       SQLErrTStr.SubqueryOneColumn + node.usrCols.length);
                var colName = __getCurrentName(node.usrCols[0]);
                var evalStr = "max(" + colName + ")";
                node.colType = getColType(node.usrCols[0]);
            }
            return self.sqlObj.aggregateWithEvalStr(evalStr,
                                                    tableName,
                                                    node.subqVarName);
        },

        _pushDownExpand: function(node) {
            // Only support expand followed by aggregate node
            assert(node.parent.value.class ===
                "org.apache.spark.sql.catalyst.plans.logical.Aggregate",
                SQLErrTStr.ExpandWithoutAgg + node.parent.value.class);
            node.orderCols = [];
            node.newTableName = node.children[0].newTableName;
            var groupingCols = [];
            var projections = node.value.projections;
            node.value.output.forEach(function(item) {
                groupingCols.push(__genColStruct(item[0]));
            });
            // Last element of expand-output should be spark_grouping_id
            assert(groupingCols[groupingCols.length - 1].colName ===
                    "SPARK_GROUPING_ID", SQLErrTStr.IllegalGroupingCols +
                    groupingCols[groupingCols.length - 1].colName);
            var groupingIds = [];

            for (var i = 0; i < projections.length; i++) {
                var idStruct = projections[i][projections[i].length - 1][0];
                assert(idStruct.class ===
                    "org.apache.spark.sql.catalyst.expressions.Literal" &&
                        idStruct.dataType === "integer");
                groupingIds.push(Number(idStruct.value));
            }
            node.sparkCols.push(groupingCols[groupingCols.length - 1]);
            var newRenames = __resolveCollision([], node.usrCols
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
            assert(node.children.length === 1,
                   SQLErrTStr.AggregateOneChild + node.children.length);
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
                    "org.apache.spark.sql.catalyst.expressions.ScalarSubquery",
                    SQLErrTStr.SubqueryNotAllowedInGroupBy);
                }
                options.groupby = true;
                genMapArray(node.value.groupingExpressions, gbCols,
                            gbEvalStrArray, gbAggEvalStrArray, options);
                assert(gbAggEvalStrArray.length === 0,
                       SQLErrTStr.AggNotAllowedInGroupBy);
                // aggregate functions are not allowed in GROUP BY
            }
            // Extract colNames from column structs
            var gbColNames = [];
            var gbColTypes = [];
            for (var i = 0; i < gbCols.length; i++) {
                gbColNames.push(__getCurrentName(gbCols[i]));
                gbColTypes.push(getColType(gbCols[i]));
            }

            // Resolve each group's map clause
            var columns = [];
            var evalStrArray = [];
            var aggEvalStrArray = [];
            options.operator = true;
            options.groupby = false;
            genMapArray(node.value.aggregateExpressions, columns,
                                    evalStrArray, aggEvalStrArray, options);
            node.dupCols = options.dupCols;
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
            var firstMapColTypes = [];

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
                        firstMapColTypes.push(getColType(fArray[j]));
                        if (inAgg) {
                            gbColNames.push(newGbColName);
                            firstMapArray.push(fArray[j].evalStr);
                        } else {
                            gbColNames[gbColNames.indexOf(origGbColName)] = newGbColName;
                            inAgg = true;
                        }
                        // Mark fArray[i] as "used in group by"
                        fArray[j].groupby = true;
                    }
                }
                if (!inAgg) {
                    firstMapColNames.push(gbEvalStrArray[i].newColName);
                    firstMapColTypes.push(getColType(gbEvalStrArray[i]));
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
                    if (gArray[i].operator === "count") {
                        firstMapColTypes.push(gArray[i].countType);
                    } else {
                        firstMapColTypes.push(getColType(gArray[i]));
                    }
                    gArray[i].aggColName = newColName;
                }
            }

            // Step 3
            var aggVarNames = [];
            var aggVarTypes = [];
            // aggVarNames will be pushed into node.xcCols
            for (var i = 0; i < aggEvalStrArray.length; i++) {
                var gbMapCol = {};
                var rs = extractAndReplace(aggEvalStrArray[i]);
                assert(rs, SQLErrTStr.GroupByNoReplacement);
                gbMapCol.operator = rs.firstOp;
                gbMapCol.arguments = rs.arguments;
                if (aggEvalStrArray[i].numOps > 1) {
                    var newColName = "XC_GB_COL_" +
                                     Authentication.getHashId().substring(3);
                    firstMapColNames.push(newColName);
                    if (rs.firstOp === "count") {
                        firstMapColTypes.push(aggEvalStrArray[i].countType);
                    } else {
                        firstMapColTypes.push(getColType(aggEvalStrArray[i]));
                    }
                    firstMapArray.push(rs.inside);
                    gbMapCol.aggColName = newColName;
                } else {
                    gbMapCol.aggColName = rs.inside;
                }
                gbMapCol.newColName = aggEvalStrArray[i].aggVarName;
                gArray.push(gbMapCol);
                aggVarNames.push(aggEvalStrArray[i].aggVarName);
                aggVarTypes.push(getColType(aggEvalStrArray[i]));
            }

            // Step 3.5
            // Extract first/last in gArray and replace with max
            // Moved into promise
            var windowTempCols = [];
            var frameInfo = {typeRow: true, lower: undefined, upper: undefined};
            var windowStruct = {first: {newCols: [], aggCols: [], aggTypes: [],
                                        frameInfo: frameInfo, ignoreNulls: []},
                                last: {newCols: [], aggCols: [], aggTypes: [],
                                       frameInfo: frameInfo, ignoreNulls: []}};

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
                                 Authentication.getHashId().substring(3);
                gArray = [{operator: "count",
                           aggColName: "1",
                           newColName: newColName}];
                tempCol = newColName;
            }

            // Step 5
            var secondMapArray = [];
            var secondMapColNames = [];
            var secondMapColTypes = [];
            for (var i = 0; i < fArray.length; i++) {
                if (fArray[i].numOps > 0 && !fArray[i].groupby) {
                    secondMapArray.push(fArray[i].evalStr);
                    secondMapColNames.push(fArray[i].newColName);
                    secondMapColTypes.push(getColType(fArray[i]));
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
                    var colNameSet = new Set();
                    node.usrCols.concat(node.xcCols).concat(node.sparkCols)
                    .map(function (col) {
                        colNameSet.add(__getCurrentName(col));
                    });
                    return __windowMapHelper(self, node, firstMapArray, srcTableName,
                                    firstMapColNames, newTableName, colNameSet);
                } else {
                    return PromiseHelper.resolve();
                }
            };

            var secondMapPromise = function() {
                if (secondMapArray.length > 0) {
                    var srcTableName = newTableName;
                    newTableName = xcHelper.getTableName(newTableName) +
                                    Authentication.getHashId();
                    var colNameSet = new Set();
                    node.usrCols.concat(node.xcCols).concat(node.sparkCols)
                    .map(function (col) {
                        colNameSet.add(__getCurrentName(col));
                    });
                    return __windowMapHelper(self, node, secondMapArray, srcTableName,
                                    secondMapColNames, newTableName, colNameSet);
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
                for (var i = 0; i < firstMapColNames.length; i++) {
                    // Avoid adding the "col + 1" in
                    // select col+1 from t1 group by col + 1
                    // It belongs to usrCols
                    if (aggColNames.indexOf(firstMapColNames[i]) === -1) {
                        node.xcCols.push({colName: firstMapColNames[i],
                                          colType: firstMapColTypes[i]});
                    }
                }
                var colNames = new Set();
                node.usrCols.concat(node.xcCols).concat(node.sparkCols).map(function (col) {
                    colNames.add(__getCurrentName(col));
                });
                for (var i = 0; i < gArray.length; i++) {
                    if (gArray[i].operator === "first" || gArray[i].operator === "last") {
                        node.usrCols.concat(node.xcCols).forEach(function(col) {
                            if (__getCurrentName(col) === gArray[i].aggColName) {
                                var index = windowStruct[gArray[i].operator]
                                                        .aggCols.indexOf(col);
                                if (index != -1) {
                                    gArray[i].aggColName = windowStruct[gArray[i]
                                            .operator].newCols[index].colName;
                                } else {
                                    var tempColName = "XC_WINDOWAGG_" +
                                                    Authentication.getHashId().substring(3);
                                    while (colNames.has(tempColName)) {
                                        tempColName = "XC_WINDOWAGG_" +
                                                    Authentication.getHashId().substring(3);
                                    }
                                    colNames.add(tempColName);
                                    windowStruct[gArray[i].operator].newCols.push({
                                                        colName: tempColName,
                                                        colType: getColType(gArray[i])});
                                    windowStruct[gArray[i].operator].aggCols.push(col);
                                    windowStruct[gArray[i].operator].aggTypes.push(undefined);
                                    windowStruct[gArray[i].operator].ignoreNulls
                                                    .push(gArray[i].arguments[0]);
                                    gArray[i].aggColName = tempColName;
                                    windowTempCols.push(tempColName);
                                }
                                return false;
                            }
                        })
                        gArray[i].operator = "max";
                    }
                }
                if (windowTempCols.length > 0) {
                    var innerDeferred = PromiseHelper.deferred();
                    var loopStruct = {cli: "", node: node, self: self};
                    var sortList = [];
                    var windowCli = "";
                    var curPromise;
                    gbColNames.forEach(function(name) {
                        sortList.push({name: name, type: "DfUnknown",
                        ordering: XcalarOrderingT.XcalarOrderingAscending});
                    })
                    loopStruct.groupByCols = gbCols;
                    loopStruct.sortColsAndOrder = [];
                    if (sortList.length > 0) {
                        curPromise = self.sqlObj.sort(sortList, newTableName);
                    } else {
                        curPromise = PromiseHelper.resolve({cli: "", newTableName: newTableName});
                    }
                    var tableId = xcHelper.getTableId(newTableName);
                    if (typeof tableId === "string") {
                        tableId = tableId.toUpperCase();
                    }
                    loopStruct.indexColStruct = {colName: "XC_ROW_COL_" + tableId};
                    node.xcCols.push(loopStruct.indexColStruct);
                    curPromise = curPromise.then(function(ret) {
                        windowCli += ret.cli;
                        return self.sqlObj.genRowNum(ret.newTableName,
                                        __getCurrentName(loopStruct.indexColStruct));
                    });
                    if (windowStruct["first"].newCols.length != 0) {
                        curPromise = __windowExpressionHelper(loopStruct,
                                            curPromise, "first", windowStruct["first"]);
                    }
                    if (windowStruct["last"].newCols.length != 0) {
                        curPromise = __windowExpressionHelper(loopStruct,
                                            curPromise, "last", windowStruct["last"]);
                    }
                    curPromise = curPromise.then(function(ret) {
                        windowCli += loopStruct.cli;
                        cli += windowCli;
                        // move columns to xcCols
                        windowTempCols.forEach(function(name) {
                            for (var i = 0; i < node.usrCols.length; i++) {
                                if (node.usrCols[i].colName === name) {
                                    node.usrCols.splice(i,1);
                                    node.xcCols.push({colName: name});
                                    break;
                                }
                            }
                        })
                        innerDeferred.resolve(ret);
                    })
                    .fail(innerDeferred.reject);
                    return innerDeferred.promise();
                } else {
                    return PromiseHelper.resolve({newTableName: newTableName, cli: ""});
                }
            })
            .then(function(ret) {
                if (ret) {
                    cli += ret.cli;
                    newTableName = ret.newTableName;
                }
                var gArrayList = [];
                var gArraySingleOp = [];
                for (var i = 0; i < gArray.length; i++) {
                    if (gArray[i].operator === "stdev"
                        || gArray[i].operator === "stdevp"
                        || gArray[i].operator === "var"
                        || gArray[i].operator === "varp") {
                        gArrayList.push([gArray[i]]);
                    } else {
                        gArraySingleOp.push(gArray[i]);
                    }
                }
                if (gArraySingleOp.length > 0) {
                    gArrayList.push(gArraySingleOp);
                }
                if (gArrayList.length > 1) {
                    return __multGBHelper(self, gbColNames, gbColTypes,
                                        gArrayList, newTableName, node);
                } else if (node.expand) {
                    return __handleMultiDimAgg(self, gbColNames, gbColTypes,
                                            gArray, newTableName, node.expand);
                } else {
                    return self.sqlObj.groupBy(gbColNames, gArray, newTableName);
                }
            })
            .then(function(ret) {
                assert(ret, SQLErrTStr.GroupByFailure);
                newTableName = ret.newTableName;
                cli += ret.cli;
                for (var i = 0; i < aggVarNames.length; i++) {
                    node.xcCols.push({colName: aggVarNames[i],
                                      colType: aggVarTypes[i]});
                }
                if (ret.tempCols) {
                    for (var i = 0; i < ret.tempCols.length; i++) {
                        node.xcCols.push({colName: ret.tempCols[i],
                                          colType: "DfUnknown"}); // XXX tempCols from xiApi don't have type
                    }
                }
                if (tempCol) {
                    node.xcCols.push({colName: tempCol, colType: "int"});
                }
                return secondMapPromise();
            })
            .then(function(ret) {
                if (ret) {
                    cli += ret.cli;
                    newTableName = ret.newTableName;
                }
                // XXX This is a workaround for the prefix issue. Need to revist
                // when taking good care of index & prefix related issues.
                for (var i = 0; i < columns.length; i++) {
                    if (columns[i].rename) {
                        columns[i].rename = cleanseColName(columns[i].rename, true);
                    } else {
                        columns[i].colName = cleanseColName(columns[i].colName, true);
                    }
                }
                // Also track xcCols
                for (var i = 0; i < secondMapColNames.length; i++) {
                    if (aggColNames.indexOf(secondMapColNames[i]) === -1) {
                        node.xcCols.push({colName: secondMapColNames[i],
                                          colType: secondMapColTypes[i]});
                    }
                }
                node.usrCols = columns;
                for (var i = 0; i < gbColNames.length; i++) {
                    // If gbCol is a map str, it should exist in firstMapColNames
                    // Avoid adding it twice.
                    if (firstMapColNames.indexOf(gbColNames[i]) === -1 &&
                        aggColNames.indexOf(gbColNames[i]) === -1) {
                        node.xcCols.push({colName: gbColNames[i],
                                          colType: gbColTypes[i]});
                    }
                }
                assertCheckCollision(node.xcCols);
                deferred.resolve({newTableName: newTableName,
                                  cli: cli});
            })
            .fail(deferred.reject);
            // End of Step 6

            return deferred.promise();
        },

        _pushDownJoin: function(node) {
            var self = this;
            assert(node.children.length === 2,
                   SQLErrTStr.JoinTwoChildren + node.children.length);
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

            function isNaturalJoin(n) {
                return (n.children[0].value.class ===
                "org.apache.spark.sql.catalyst.expressions.AttributeReference" &&
                n.children[0].value.name.indexOf(tablePrefix) > -1);
            }

            function isOuterJoin(n) {
                var joinType = n.value.joinType.object;
                if (joinType && joinType.endsWith("Outer$")) {
                    if (joinType.endsWith("LeftOuter$")) {
                        return "left";
                    } else if (joinType.endsWith("RightOuter$")) {
                        return "right";
                    } else if (joinType.endsWith("FullOuter$")) {
                        return "full";
                    } else {
                        assert(0, SQLErrTStr.InvalidOuterType + joinType);
                    }
                }
            }

            function isNonCrossAndJoin(treeNode, eqTrees, nonEqFilterTrees) {
                if (treeNode.value.class ===
                    "org.apache.spark.sql.catalyst.expressions.EqualTo") {
                    eqTrees.push(treeNode);
                    return true;
                } else if (treeNode.value.class !==
                            "org.apache.spark.sql.catalyst.expressions.And") {
                    nonEqFilterTrees.push(treeNode);
                    return false;
                }
                var nonCross = false;
                for (var i = 0; i < treeNode.value["num-children"]; i++) {
                    var childNode = treeNode.children[i];
                    if (isNonCrossAndJoin(childNode, eqTrees, nonEqFilterTrees)) {
                        nonCross = true;
                    }
                }
                return nonCross;
            }

            function isOrEqJoin(treeNode, eqTreesByBranch, nonEqFilterTreesByBranch) {
                if (treeNode.value.class !==
                        "org.apache.spark.sql.catalyst.expressions.Or") {
                    return false;
                }
                for (var i = 0; i < treeNode.value["num-children"]; i++) {
                    var childNode = treeNode.children[i];
                    if (childNode.value.class ===
                        "org.apache.spark.sql.catalyst.expressions.Or") {
                        if (!isOrEqJoin(childNode, eqTreesByBranch, nonEqFilterTreesByBranch)) {
                            return false;
                        }
                    } else {
                        var eqTrees = [];
                        var nonEqFilterTrees = [];
                        if (isNonCrossAndJoin(childNode, eqTrees, nonEqFilterTrees)) {
                            eqTreesByBranch.push(eqTrees);
                            nonEqFilterTreesByBranch.push(nonEqFilterTrees);
                        } else {
                            return false;
                        }
                    }
                }
                return true;
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
                if (node.value.condition && node.value.condition[0].class ===
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
                "org.apache.spark.sql.catalyst.expressions.EqualTo" &&
                !isNaturalJoin(condTree)) {
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
                assert(andTree.children.length === 2,
                       SQLErrTStr.JoinAndTreeTwoChildren + andTree.children.length);
                for (var i = 0; i < andTree.children.length; i++) {
                    if (andTree.children[i].value.class ===
                        "org.apache.spark.sql.catalyst.expressions.And") {
                        andSubtrees.push(andTree.children[i]);
                    } else if (andTree.children[i].value.class ===
                        "org.apache.spark.sql.catalyst.expressions.EqualTo") {
                        if (isNaturalJoin(andTree.children[i])) {
                            continue;
                        }
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
                    rename: existColName + "_E" + existColId,
                    colType: "bool"
                }
            }

            var eqTreesByBranch = [];
            var nonEqFilterTreesByBranch = [];
            var mapStructList = [];
            var orEqJoinOpt = false;
            if (node.value.joinType.object ===
                "org.apache.spark.sql.catalyst.plans.Inner$" && condTree
                && isOrEqJoin(condTree, eqTreesByBranch, nonEqFilterTreesByBranch)) {
                retStruct.filterSubtrees = retStruct.filterSubtrees || [];
                orEqJoinOpt = true;
                for (var i = 0; i < eqTreesByBranch.length; i++) {
                    var mapStruct = __getJoinMapArrays(node, eqTreesByBranch[i]);
                    if (mapStruct.catchAll) {
                        orEqJoinOpt = false;
                        break;
                    }
                    mapStructList.push(mapStruct);
                }
            } else if (optimize) {
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
            var outerType = isOuterJoin(node);
            if (orEqJoinOpt) {
                var unionTableNames = [];
                var leftRNTableName;
                var rightRNTableName;
                promise = promise.then(__generateRowNumber.bind(sqlObj,
                                            retStruct, node, "full"))
                                .then(function() {
                                    leftRNTableName = retStruct.leftTableName;
                                    rightRNTableName = retStruct.rightTableName;
                                });
                for (var i = 0; i < mapStructList.length; i++) {
                    promise = promise.then(function() {
                        var innerDeferred = PromiseHelper.deferred();
                        var mapStruct = mapStructList.shift();
                        var nonEqFilterTrees = nonEqFilterTreesByBranch.shift();
                        var innerPromise = PromiseHelper.resolve();
                        for (var prop in mapStruct) {
                            retStruct[prop] = mapStruct[prop];
                        }
                        retStruct.filterSubtrees = retStruct.filterSubtrees
                                                        .concat(nonEqFilterTrees);
                        retStruct.leftTableName = leftRNTableName;
                        retStruct.rightTableName = rightRNTableName;
                        innerPromise = innerPromise.then(__handleAndEqJoin
                                                .bind(sqlObj, retStruct, node));
                        innerPromise
                        .then(innerDeferred.resolve)
                        .fail(innerDeferred.reject);
                        return innerDeferred.promise();
                    })
                    .then(function() {
                        unionTableNames.push(retStruct.newTableName);
                    })
                    .fail(deferred.reject);
                }
                promise = promise.then(function() {
                    node.usrCols = jQuery.extend(true, [], node.children[0].usrCols
                                            .concat(node.children[1].usrCols));
                    node.xcCols = [{colName: retStruct.leftRowNumCol, colType: "int"},
                                   {colName: retStruct.rightRowNumCol, colType: "int"}];
                    node.sparkCols = [];
                    var unionCols = node.usrCols.concat(node.xcCols);
                    var tableInfos = [];
                    var columns = [];
                    for (var j = 0; j < unionCols.length; j++) {
                        columns.push({
                            name: __getCurrentName(unionCols[j]),
                            rename: __getCurrentName(unionCols[j]),
                            type: "DfUnknown", // backend will figure this out. :)
                            cast: false // Should already be casted by spark
                        });
                    }
                    for (var i = 0; i < unionTableNames.length; i++) {
                        tableInfos.push({
                            tableName: unionTableNames[i],
                            columns: columns
                        });
                    }
                    return self.sqlObj.union(tableInfos, true)
                    .then(function(ret) {
                        retStruct.newTableName = ret.newTableName;
                        retStruct.cli += ret.cli;
                    })
                    .fail(deferred.reject);
                })
            } else if (optimize) {
                // Eq conditions + non-equi conditions (optional)
                var overwriteJoinType;
                retStruct.filterSubtrees = filterSubtrees;
                if (filterSubtrees.length > 0 && isExistenceJoin(node)) {
                    overwriteJoinType = JoinOperatorT.InnerJoin;
                    promise = promise.then(__generateRowNumber.bind(sqlObj,
                                                                    retStruct,
                                                                    node,
                                                                    outerType));
                }

                promise = promise.then(__handleAndEqJoin.bind(sqlObj,
                                                              retStruct,
                                                              node,
                                                            overwriteJoinType));
                if (isExistenceJoin(node) && filterSubtrees.length > 0) {
                    promise = promise.then(__groupByLeftRowNum.bind(sqlObj,
                                                                    retStruct,
                                                                    node,
                                                                    false));
                    promise = promise.then(__joinBackMap.bind(sqlObj,
                                                              retStruct,
                                                              node));
                } else if (isExistenceJoin(node)) {
                    // Map with filter tree
                    promise = promise.then(__mapExistenceColumn.bind(sqlObj,
                                                                     retStruct,
                                                                     node));
                }
            } else {
                // Non-equi conditions
                if (isSemiOrAntiJoin(node) || isExistenceJoin(node) ||
                    outerType) {
                    promise = promise.then(__generateRowNumber.bind(sqlObj,
                                                                    retStruct,
                                                                    node,
                                                                    outerType));
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

                if (outerType) {
                    promise = promise.then(__outerJoinBack.bind(sqlObj,
                                                           retStruct,
                                                           node,
                                                           outerType));
                }
                if (hasEmptyProject) {
                    promise = promise.then(__projectAfterCrossJoin.bind(sqlObj,
                                                            retStruct, node));
                }
            }

            promise.fail(deferred.reject);

            promise.then(function() {
                if (!orEqJoinOpt) {
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
                        } else if (isExistenceJoin(node) && optimize) {
                            node.sparkCols.push(retStruct.existenceCol);
                            node.renamedCols[retStruct.existenceCol.colId] =
                                                retStruct.existenceCol.rename;
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
                }

                assertCheckCollision(node.usrCols);
                assertCheckCollision(node.xcCols);
                assertCheckCollision(node.sparkCols);
                deferred.resolve({newTableName: retStruct.newTableName,
                                  cli: retStruct.cli});
            })
            .fail(deferred.reject);

            // start the domino fall
            firstDeferred.resolve();

            return deferred.promise();
        },

        _pushDownUnion: function(node) {
            var self = this;
            // Union has at least two children
            assert(node.children.length > 1,
                    SQLErrTStr.UnionChildren + node.children.length);
            // If only 1 of children is not localrelation,
            // skip the union and handle column info
            var unionType = UnionOperatorT.UnionStandard;
            if (node.value.class === "org.apache.spark.sql.catalyst.plans.logical.Intersect") {
                unionType = UnionOperatorT.UnionIntersect;
            } else if (node.value.class === "org.apache.spark.sql.catalyst.plans.logical.Except") {
                unionType = UnionOperatorT.UnionExcept;
            }
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
                    var colType = xcHelper.convertSQLTypeToColType(unionCols[j].colType);
                    columns.push({
                        name: __getCurrentName(unionCols[j]),
                        rename: __getCurrentName(colRenames[j]),
                        type: colType,
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
            return self.sqlObj.union(tableInfos, false, undefined, unionType);
        },

        _pushDownWindow: function(node) {
            var self = this;
            var deferred = PromiseHelper.deferred();
            var loopStruct = {cli: "", node: node, self: self};
            var cli = "";

            // Window should has one child
            assert(node.children.length === 1,
                    SQLErrTStr.WindowChildren + node.children.length);

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
            if (typeof tableId === "string") {
                tableId = tableId.toUpperCase();
            }
            loopStruct.indexColStruct = {colName: "XC_ROW_COL_" + tableId,
                                         colType: "int"};
            node.xcCols.push(loopStruct.indexColStruct);
            curPromise = curPromise.then(function(ret) {
                cli += ret.cli;
                return self.sqlObj.genRowNum(ret.newTableName,
                                __getCurrentName(loopStruct.indexColStruct));
            });

            // If no partition specified, need to add a temp column to group by
            // Use groupAll instead

            // Traverse windowExps, generate desired rows
            var windowStruct = __categoryWindowOps(node.value.windowExpressions);
            for (item in windowStruct) {
                if (item === "lead") {
                    if (!jQuery.isEmptyObject(windowStruct[item])) {
                        for (offset in windowStruct[item]) {
                            curPromise = __windowExpressionHelper(loopStruct,
                                curPromise, item, windowStruct[item][offset]);
                        }
                    }
                } else if (item === "agg" || item === "first" || item === "last") {
                    windowStruct[item].forEach(function (obj) {
                        curPromise = __windowExpressionHelper(loopStruct,
                                                    curPromise, item, obj);
                    })
                } else if (windowStruct[item].newCols.length != 0) {
                    curPromise = __windowExpressionHelper(loopStruct,
                                        curPromise, item, windowStruct[item]);
                }
            }

            curPromise = curPromise.then(function(ret) {
                cli += loopStruct.cli;
                cli += ret.cli;
                node.xccli = cli;
                node.newTableName = ret.newTableName;
                deferred.resolve();
            })
            .fail(deferred.reject);
            return deferred.promise();
        },

        _pushDownLocalRelation: function(node) {
            // Now only support empty localrelation, which represent tables
            // can be evaluated to empty from sql query without data on server
            assert(node.value.data.length === 0, SQLErrTStr.NonEmptyLR);
            // Spark will replace operators after localrelation except union
            // Project/.../Filter => localrelation
            // inner/semi join => localrelation
            // outer join => project (add empty columns)
            // anti join => the other table (all rows are kept)
            // table intersect localrelation => localrelation
            // table except localrelation => table
            assert(node.parent, SQLErrTStr.SingleLR);
            assert(node.parent.value.class ===
                    "org.apache.spark.sql.catalyst.plans.logical.Union",
                    SQLErrTStr.LRParent +node.parent.value.class);
            node.xccli = "";
            node.usrCols = [];
            node.value.output.forEach(function(array) {
                node.usrCols.push(__genColStruct(array[0]));
            })
            return PromiseHelper.resolve();
        },

        _handleDupCols: function(node) {
            if (Object.keys(node.dupCols).length === 0) {
                return PromiseHelper.resolve();
            }
            var self = this;
            var deferred = PromiseHelper.deferred();
            var mapStrs = [];
            var newColNames = [];
            var newColStructs = [];
            var colNameSet = new Set();
            var tableId = xcHelper.getTableId(node.newTableName);
            if (typeof tableId === "string") {
                tableId = tableId.toUpperCase();
            }
            node.usrCols.concat(node.xcCols).concat(node.sparkCols).forEach(function(col) {
                colNameSet.add(__getCurrentName(col));
            })
            for (colId in node.dupCols) {
                var dupNum = node.dupCols[colId];
                var colName;
                var origName;
                var colType;
                node.usrCols.forEach(function(col) {
                    if (col.colId === Number(colId)) {
                        colName = col.colName;
                        origName = __getCurrentName(col);
                        colType = col.colType;
                        return false;
                    }
                })
                for (var i = 0; i < dupNum; i++) {
                    var newName = origName + "_" + (i + 1);
                    while (colNameSet.has(newName)) {
                        newName = newName + "_" + tableId;
                    }
                    colNameSet.add(newName);
                    mapStrs.push(colType + "(" + origName + ")");
                    newColNames.push(newName);
                    newColStructs.push({colName: colName, colId: colId,
                                        colType: colType, rename: newName});
                }
            }
            self.sqlObj.map(mapStrs, node.newTableName, newColNames)
            .then(function(ret) {
                node.newTableName = ret.newTableName;
                node.xccli += ret.cli;
                node.usrCols = node.usrCols.concat(newColStructs);
                deferred.resolve();
            })
            .fail(deferred.reject);
            return deferred.promise();
        }
    };

    // Helper functions for join

    // Deferred Helper functions for join
    function __generateRowNumber(globalStruct, joinNode, outerType) {
        var deferred = PromiseHelper.deferred();
        var self = this; // This is the SqlObject

        // Since the grn call is done prior to the join, both tables must exist
        assert(globalStruct.leftTableName, SQLErrTStr.NoLeftTblForJoin);
        assert(globalStruct.rightTableName, SQLErrTStr.NoRightTblForJoin);

        var rnColName;
        var rnTableName;
        var leftTableId = xcHelper.getTableId(joinNode.children[0].newTableName);
        if (typeof leftTableId === "string") {
            leftTableId = leftTableId.toUpperCase();
        }
        var rightTableId = xcHelper.getTableId(joinNode.children[1].newTableName);
        if (typeof rightTableId === "string") {
            rightTableId = rightTableId.toUpperCase();
        }
        if (outerType === "right") {
            rnColName = "XC_RROWNUM_COL_" + rightTableId;
            rnTableName = globalStruct.rightTableName;
        } else {
            rnColName = "XC_LROWNUM_COL_" + leftTableId;
            rnTableName = globalStruct.leftTableName;
        }
        joinNode.xcCols.push({colName: rnColName, colType: "int"});
        self.genRowNum(rnTableName, rnColName)
        .then(function(ret) {
            globalStruct.cli += ret.cli;
            if (outerType === "right") {
                globalStruct.rightTableName = ret.newTableName;
                globalStruct.rightRowNumCol = rnColName;
                // Need a column copy here so that it will not be renamed in first join
                globalStruct.rightColumnsCopy = jQuery.extend(true, [],
                                    joinNode.children[1].usrCols
                                    .concat(joinNode.children[1].xcCols)
                                    .concat(joinNode.children[1].sparkCols));
                // This will be kept and not deleted
                globalStruct.rightRowNumTableName = ret.newTableName;
            } else {
                globalStruct.leftTableName = ret.newTableName;
                globalStruct.leftRowNumCol = rnColName;
                globalStruct.leftColumnsCopy = jQuery.extend(true, [],
                                    joinNode.children[0].usrCols
                                    .concat(joinNode.children[0].xcCols)
                                    .concat(joinNode.children[0].sparkCols));
                // This will be kept and not deleted
                globalStruct.leftRowNumTableName = ret.newTableName;
            }
            if (outerType === "full") {
                rnColName = "XC_RROWNUM_COL_" + rightTableId;
                rnTableName = globalStruct.rightTableName;
                return self.genRowNum(globalStruct.rightTableName, rnColName)
            }
            return PromiseHelper.resolve();
        })
        .then(function(ret) {
            if (outerType === "full" && ret) {
                globalStruct.cli += ret.cli;
                globalStruct.rightTableName = ret.newTableName;
                globalStruct.rightRowNumCol = rnColName;
                globalStruct.rightColumnsCopy = jQuery.extend(true, [],
                                    joinNode.children[1].usrCols
                                    .concat(joinNode.children[1].xcCols)
                                    .concat(joinNode.children[1].sparkCols));
                // This will be kept and not deleted
                globalStruct.rightRowNumTableName = ret.newTableName;
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function groupbyForExistenceJoin(self, globalStruct, joinNode,
                            retLeft, retRight, cliArray, overwriteJoinType) {
        var innerDeferred = PromiseHelper.deferred();
        if (globalStruct.existenceCol && overwriteJoinType == undefined) {
            if (retRight.cli) {
                cliArray.push(retRight.cli);
            }
            var tempGBColName = "XC_GB_COL" + Authentication.getHashId().substring(3);
            var gbArgs = [{operator: "count", aggColName: "1",
                           newColName: tempGBColName}];
            var tempGBColStruct = {colName: tempGBColName, colType: "int"};
            joinNode.xcCols.push(tempGBColStruct);
            globalStruct.colForExistCheck = tempGBColStruct;
            joinNode.children[1].usrCols.concat(joinNode.children[1].xcCols)
            .concat(joinNode.children[1].sparkCols).forEach(function(col) {
                var colName = col.rename || col.colName;
                if (globalStruct.rightCols.indexOf(colName) !== -1) {
                    joinNode.xcCols.push(col);
                }
            });
            self.groupBy(globalStruct.rightCols, gbArgs, retRight.newTableName, {})
            .then(function(ret) {
                if (ret.tempCols) {
                    for (var i = 0; i < ret.tempCols.length; i++) {
                        joinNode.xcCols.push({colName: ret.tempCols[i],
                                              colType: "DfUnknown"});
                    }
                }
                innerDeferred.resolve(retLeft, ret);
            })
            .fail(innerDeferred.reject);
        } else {
            innerDeferred.resolve(retLeft, retRight);
        }
        return innerDeferred.promise();
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
            if (typeof tableId === "string") {
                tableId = tableId.toUpperCase();
            }
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
                joinNode.xcCols.push({colName: tempCol,
                                      colType: getColType(mapStrArray[i])});
            }
            var newTableName = xcHelper.getTableName(origTableName) +
                               Authentication.getHashId();
            self.map(mapStrArray, origTableName, newColNames,
                     newTableName)
            .then(function(ret) {
                ret.colNames = newColNames;
                deferred.resolve(ret);
            })
            .fail(deferred.reject);
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
            return groupbyForExistenceJoin(self, globalStruct, joinNode, retLeft,
                                           retRight, cliArray, overwriteJoinType);
        })
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

            var rightColsForRename = joinNode.children[1].usrCols
                                     .concat(joinNode.children[1].xcCols)
                                     .concat(joinNode.children[1].sparkCols);
            if (globalStruct.existenceCol &&  overwriteJoinType == undefined) {
                rightColsForRename = joinNode.xcCols;
            }
            var newRenames = __resolveCollision(joinNode.children[0].usrCols
                                        .concat(joinNode.children[0].xcCols)
                                        .concat(joinNode.children[0].sparkCols),
                                        rightColsForRename,
                                        lTableInfo.rename,
                                        rTableInfo.rename,
                                        lTableInfo.tableName,
                                        rTableInfo.tableName
                                        );
            joinNode.renamedCols = joinNode.children[0].renamedCols;
            globalStruct.renameMap = __combineRenameMaps([joinNode.children[0]
                .renamedCols, joinNode.children[1].renamedCols, newRenames]);
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
                joinType = JoinOperatorT.LeftOuterJoin;
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
                        joinType = JoinOperatorT.LeftSemiJoin;
                        break;
                    case ("org.apache.spark.sql.catalyst.plans.LeftAnti$"):
                        joinType = JoinOperatorT.LeftAntiJoin;
                        break;
                    default:
                        assert(0, SQLErrTStr.UnsupportedJoin +
                                  JSON.stringify(joinNode.value.joinType.object));
                        break;
                }
            }
            if (globalStruct.filterSubtrees &&
                globalStruct.filterSubtrees.length > 0) {
                options.evalString = __createFilterString(globalStruct);
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
            if (retJoin.tempCols) {
                for (var i = 0; i < retJoin.tempCols.length; i++) {
                    joinNode.xcCols.push({colName: retJoin.tempCols[i],
                                          colType: "DfUnknown"});
                }
            }

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
        assert(globalStruct.leftTableName, SQLErrTStr.NoLeftTblForJoin);
        assert(globalStruct.rightTableName, SQLErrTStr.NoRightTblForJoin);

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
            if (condTree.value.class ===
                    "org.apache.spark.sql.catalyst.expressions.Literal" &&
                condTree.value.value === "false") {
                filterEval = "neq(" + __getCurrentName(joinNode.xcCols[0])
                            + "," + __getCurrentName(joinNode.xcCols[0]) + ")";
            }
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
        assert(!globalStruct.leftTableName,
                SQLErrTStr.UnexpectedTableName + globalStruct.leftTableName);
        assert(!globalStruct.rightTableName,
                SQLErrTStr.UnexpectedTableName + globalStruct.rightTableName);
        assert(globalStruct.newTableName, SQLErrTStr.NoNewTableName);
        assert(globalStruct.leftRowNumCol, SQLErrTStr.NoLeftRowNumCol);

        var tableId = xcHelper.getTableId(globalStruct.newTableName);
        if (typeof tableId === "string") {
            tableId = tableId.toUpperCase();
        }
        var tempCountCol = "XC_COUNT_" + tableId;
        // Record groupBy column
        joinNode.xcCols.push({colName: tempCountCol, colType: "int"});

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
                    joinNode.xcCols.push({colName: ret.tempCols[i],
                                          colType: "DfUnknown"}); // XXX xiApi temp column
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
        assert(!globalStruct.leftTableName,
                SQLErrTStr.UnexpectedTableName + globalStruct.leftTableName);
        assert(!globalStruct.rightTableName,
                SQLErrTStr.UnexpectedTableName + globalStruct.rightTableName);
        assert(globalStruct.leftRowNumTableName, SQLErrTStr.NoLeftRowNumTableName);
        assert(globalStruct.newTableName, SQLErrTStr.NoNewTableName);
        assert(globalStruct.leftRowNumCol, SQLErrTStr.NoLeftRowNumCol);
        assert(globalStruct.existenceCol, SQLErrTStr.NoExistCol);
        // For this func to be called, the current table must only have 2 cols
        // The rowNumCol and the countCol. Both are autogenerated
        var lTableInfo = {
            tableName: globalStruct.leftRowNumTableName,
            columns: [globalStruct.leftRowNumCol],
            pulledColumns: [],
            rename: []
        };
        var tableId = xcHelper.getTableId(globalStruct.newTableName);
        if (typeof tableId === "string") {
            tableId = tableId.toUpperCase();
        }
        var newRowNumColName = "XC_ROWNUM_" + tableId;
        // Record the renamed column
        joinNode.xcCols.push({colName: newRowNumColName, colType: "int"});
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

    function __outerJoinBack(globalStruct, joinNode, outerType) {
        var self = this;
        var deferred = PromiseHelper.deferred();
        // This is post join, so assert that left and right tables no longer
        // exist
        assert(!globalStruct.leftTableName,
                SQLErrTStr.UnexpectedTableName + globalStruct.leftTableName);
        assert(!globalStruct.rightTableName,
                SQLErrTStr.UnexpectedTableName + globalStruct.rightTableName);

        var rnColName;
        var lTableInfo;
        var leftColInfo;
        var allLeftColumns = joinNode.children[0].usrCols
                                     .concat(joinNode.children[0].xcCols)
                                     .concat(joinNode.children[0].sparkCols);
        var allRightColumns = joinNode.children[1].usrCols
                                      .concat(joinNode.children[1].xcCols)
                                      .concat(joinNode.children[1].sparkCols);
        if (outerType === "right") {
            assert(globalStruct.rightRowNumTableName, SQLErrTStr.NoRightRowNumTableName);
            assert(globalStruct.newTableName, SQLErrTStr.NoNewTableName);
            assert(globalStruct.rightRowNumCol, SQLErrTStr.NoRightRowNumCol);
            lTableInfo = {
                tableName: globalStruct.rightRowNumTableName,
                columns: [globalStruct.rightRowNumCol],
                pulledColumns: [],
                rename: []
            }
            rnColName = globalStruct.rightRowNumCol;
            leftColInfo = globalStruct.rightColumnsCopy;
        } else {
            assert(globalStruct.leftRowNumTableName, SQLErrTStr.NoLeftRowNumTableName);
            assert(globalStruct.newTableName, SQLErrTStr.NoNewTableName);
            assert(globalStruct.leftRowNumCol, SQLErrTStr.NoLeftRowNumCol);
            lTableInfo = {
                tableName: globalStruct.leftRowNumTableName,
                columns: [globalStruct.leftRowNumCol],
                pulledColumns: [],
                rename: []
            };
            rnColName = globalStruct.leftRowNumCol;
            leftColInfo = globalStruct.leftColumnsCopy;
        }
        var rTableInfo = {
            tableName: globalStruct.newTableName,
            columns: jQuery.extend(true, [], lTableInfo.columns),
            pulledColumns: [],
            rename: []
        };
        var rightColInfo = jQuery.extend(true, [],
                                        allLeftColumns.concat(allRightColumns));
        __resolveCollision(leftColInfo, rightColInfo,
                           lTableInfo.rename, rTableInfo.rename,
                           lTableInfo.tableName, rTableInfo.tableName);
        var tableId = xcHelper.getTableId(globalStruct.newTableName);
        if (typeof tableId === "string") {
            tableId = tableId.toUpperCase();
        }
        var newRowNumColName = "XC_ROWNUM_" + tableId;
        // Record the renamed column
        joinNode.xcCols.push({colName: newRowNumColName, colType: "int"});
        var rnColRename = {
            new: newRowNumColName,
            orig: rnColName,
            type: DfFieldTypeT.DfUnknown
        };
        rTableInfo.rename.push(rnColRename);

        var promise;
        if (outerType === "right") {
            promise = self.join(JoinOperatorT.RightOuterJoin, rTableInfo, lTableInfo);
        } else {
            promise = self.join(JoinOperatorT.LeftOuterJoin, lTableInfo, rTableInfo);
        }
        promise
        .then(function(ret) {
            globalStruct.cli += ret.cli;
            globalStruct.newTableName = ret.newTableName;
            if (outerType === "full") {
                lTableInfo = {
                    tableName: globalStruct.rightRowNumTableName,
                    columns: [globalStruct.rightRowNumCol],
                    pulledColumns: [],
                    rename: []
                };
                leftColInfo = globalStruct.rightColumnsCopy;
                rTableInfo = {
                    tableName: ret.newTableName,
                    columns: jQuery.extend(true, [], lTableInfo.columns),
                    pulledColumns: [],
                    rename: []
                };
                rightColInfo = jQuery.extend(true, [],
                                            rightColInfo.concat(allLeftColumns));
                // Re-use rightColInfo
                __resolveCollision(leftColInfo, rightColInfo,
                                   lTableInfo.rename, rTableInfo.rename,
                                   lTableInfo.tableName, rTableInfo.tableName);

                tableId = xcHelper.getTableId(globalStruct.newTableName);
                if (typeof tableId === "string") {
                    tableId = tableId.toUpperCase();
                }
                newRowNumColName = "XC_ROWNUM_" + tableId;
                // Record the renamed column
                joinNode.xcCols.push({colName: newRowNumColName, colType: "int"});
                rnColName = globalStruct.rightRowNumCol;
                rnColRename = {
                    new: newRowNumColName,
                    orig: rnColName,
                    type: DfFieldTypeT.DfUnknown
                };
                rTableInfo.rename.push(rnColRename);
                return self.join(JoinOperatorT.FullOuterJoin, rTableInfo,
                                                               lTableInfo);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(function(ret) {
            if (outerType === "full") {
                globalStruct.cli += ret.cli;
                globalStruct.newTableName = ret.newTableName;
            }
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
        assert(!globalStruct.leftTableName,
                SQLErrTStr.UnexpectedTableName + globalStruct.leftTableName);
        assert(!globalStruct.rightTableName,
                SQLErrTStr.UnexpectedTableName + globalStruct.rightTableName);
        assert(globalStruct.leftRowNumTableName, SQLErrTStr.NoLeftRowNumTableName);
        assert(globalStruct.newTableName, SQLErrTStr.NoNewTableName);
        assert(globalStruct.leftRowNumCol, SQLErrTStr.NoLeftRowNumCol);

        // For this func to be called, the current table must only have 2 cols
        // The rowNumCol and the countCol. Both are autogenerated
        var lTableInfo = {
            tableName: globalStruct.leftRowNumTableName,
            columns: [globalStruct.leftRowNumCol],
            pulledColumns: [],
            rename: []
        };

        var tableId = xcHelper.getTableId(globalStruct.newTableName);
        if (typeof tableId === "string") {
            tableId = tableId.toUpperCase();
        }
        var newRowNumColName = "XC_ROWNUM_" + tableId;
        // Record the renamed column
        joinNode.xcCols.push({colName: newRowNumColName, colType: "int"});
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

    function __createFilterString(globalStruct) {
        var self = this;
        var filterSubtrees = globalStruct.filterSubtrees;
        var filterEvalStrArray = [];
        var finalEvalStr = "";

        for (var i = 0; i < filterSubtrees.length; i++) {
            var subtree = filterSubtrees[i];
            var options = {renamedCols: globalStruct.renameMap};

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
        return finalEvalStr;
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
            assert(eqTree.children.length === 2,
                   SQLErrTStr.JoinEqTreeTwoChildren + eqTree.children.length);

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
            if (attributeReferencesOne.length === 0 ||
                attributeReferencesTwo.length === 0) {
                filterSubtrees.push(eqTree);
                dontPush = true;
            } else if (xcHelper.arraySubset(attributeReferencesOne, leftRDDCols) &&
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
                                                 leftAcc, leftOptions);
                rightEvalStr = genEvalStringRecur(eqTree.children[0],
                                                  rightAcc, rightOptions);
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
            assert(rightMapArray.length + rightCols.length === 0,
                   SQLErrTStr.JoinConditionMismatch);
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

    function __mapExistenceColumn(globalStruct, joinNode) {
        var self = this;
        var deferred = PromiseHelper.deferred();

        var joinTablename = globalStruct.newTableName;
        var checkCol = globalStruct.colForExistCheck;
        var finalEvalStr = "exists(" + __getCurrentName(checkCol) + ")";

        self.map(finalEvalStr, joinTablename, __getCurrentName(globalStruct.existenceCol))
        .then(function(ret) {
            globalStruct.newTableName = ret.newTableName;
            globalStruct.cli += ret.cli;
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
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
        var rightTableId = xcHelper.getTableId(rightTableName);
        if (typeof rightTableId === "string") {
            rightTableId = rightTableId.toUpperCase();
        }
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
                        assert(0, SQLErrTStr.NameCollision + cols[i].rename);
                        // We should never hit this
                    }
                    set.add(cols[i].rename);
                } else {
                    if (set.has(cols[i].colName)) {
                        assert(0, SQLErrTStr.NameCollision + cols[i].colName);
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

    function __genSortStruct(orderArray, options) {
        var sortColsAndOrder = [];
        var colNameSet = new Set();
        options.maps = [];
        for (var i = 0; i < orderArray.length; i++) {
            var order = orderArray[i][0].direction.object;
            assert(orderArray[i][0].class ===
                    "org.apache.spark.sql.catalyst.expressions.SortOrder",
                    SQLErrTStr.SortStructOrder + orderArray[i][0].class);
            order = order.substring(order.lastIndexOf(".") + 1);
            if (order === "Ascending$") {
                order = XcalarOrderingT.XcalarOrderingAscending;
            } else if (order === "Descending$") {
                order = XcalarOrderingT.XcalarOrderingDescending;
            } else {
                console.error("Unexpected sort order");
                assert(0, SQLErrTStr.IllegalSortOrder + order);
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
                var tableId = xcHelper.getTableId(options.tableName);
                if (typeof tableId === "string") {
                    tableId = tableId.toUpperCase();
                }
                colName = "XC_SORT_COL_" + i + "_"
                        + Authentication.getHashId().substring(3) + "_"
                        + tableId;
                var orderNode = SQLCompiler.genExpressionTree(undefined,
                                                        orderArray[i].slice(1));
                type = getColType(orderNode);
                var mapStr = genEvalStringRecur(orderNode, undefined, options);
                options.maps.push({colName: colName, mapStr: mapStr, colType: type});
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

    function __handleSortMap(self, node, maps, tableName) {
        var deferred = PromiseHelper.deferred();
        if (maps.length === 0) {
            deferred.resolve({newTableName: tableName, cli: ""});
        } else {
            var newTableName = xcHelper.getTableName(tableName) +
                                            Authentication.getHashId();
            var colNameSet = new Set();
            node.usrCols.concat(node.xcCols).concat(node.sparkCols)
            .map(function (col) {
                colNameSet.add(__getCurrentName(col));
            });
            __windowMapHelper(self, node, maps.map(function(item) {
                                    return item.mapStr;
                                }), tableName, maps.map(function(item) {
                                    return item.colName;
                                }), newTableName, colNameSet)
            .then(deferred.resolve)
            .fail(deferred.reject);
        }
        return deferred.promise();
    }

    // Need to remove duplicate
    function __genGBColArray(cols) {
        var colInfoArray = [];
        var idSet = new Set();
        for (var i = 0; i < cols.length; i++) {
            assert(cols[i][0].class ===
                "org.apache.spark.sql.catalyst.expressions.AttributeReference",
                SQLErrTStr.BadGenGBArray + cols[i][0].class);
            if (idSet.has(cols[i][0].exprId.id)) {
                continue;
            }
            idSet.add(cols[i][0].exprId.id);
            colInfoArray.push({colName: cleanseColName(cols[i][0].name),
                               type: convertSparkTypeToXcalarType(cols[i][0].dataType),
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
            retStruct.colType = convertSparkTypeToXcalarType(value.dataType);
        }
        return retStruct;
    }

    function __getCurrentName(col) {
        return col.rename || col.colName;
    }

    function __deleteIdFromColInfo(cols) {
        var retList = [];
        for (var i = 0; i < cols.length; i++) {
            retList.push({colName: __getCurrentName(cols[i]),
                          colType: getColType(cols[i])});
        }
        return retList;
    }

    // XXX the type argument is not used now
    function __prepareWindowOp(node, type) {
        var newCol;
        var opName;
        var args = [];
        var argTypes = [];
        // Not supported currently
        var frameInfo;
        // Window functions create new columns, so should be alias node
        assert(node.value.class ===
            "org.apache.spark.sql.catalyst.expressions.Alias",
            SQLErrTStr.NotAliasWindowExpr + node.value.class);
        newCol = __genColStruct(node.value);
        var weNode = node.children[0];
        assert(weNode.value.class ===
            "org.apache.spark.sql.catalyst.expressions.WindowExpression",
            SQLErrTStr.NoWENode + weNode.value.class);
        var curNode = weNode.children[weNode.value.windowFunction];
        if (curNode.value.class ===
    "org.apache.spark.sql.catalyst.expressions.aggregate.AggregateExpression") {
            curNode = curNode.children[0];
            assert(curNode.value.class.indexOf(
                "org.apache.spark.sql.catalyst.expressions.aggregate.") != -1,
                "Child of AggregateExpression node should be Aggregate");
            opName = curNode.value.class.substring(
                "org.apache.spark.sql.catalyst.expressions.aggregate.".length);
        } else {
            opName = curNode.value.class.substring(
                "org.apache.spark.sql.catalyst.expressions.".length);
        }
        for (var i = 0; i < curNode.children.length; i++) {
            var argNode = curNode.children[i];
            if (argNode.value.class ===
            "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
                args.push(__genColStruct(argNode.value));
                argTypes.push(undefined);
            } else if (argNode.value.class ===
                "org.apache.spark.sql.catalyst.expressions.Cast") {
                // Happen when applying sum/../avg on int columns. Ignore it
                argNode = argNode.children[0];
                args.push(__genColStruct(argNode.value));
                argTypes.push(undefined);
            } else {
                assert(argNode.value.class ===
                    "org.apache.spark.sql.catalyst.expressions.Literal",
                    "Arg should be literal if not AR or Cast");
                if (argNode.value.value == null) {
                    args.push(convertSparkTypeToXcalarType(argNode.value.dataType)
                                    + "(None)");
                } else {
                args.push(argNode.value.value);
                }
                argTypes.push(convertSparkTypeToXcalarType(argNode.value.dataType));
            }
        }
        curNode = weNode.children[weNode.value.windowSpec];
        var frameNode = curNode.children[curNode.value.frameSpecification];
        frameInfo = {typeRow: frameNode.value.frameType.object ===
                     "org.apache.spark.sql.catalyst.expressions.RowFrame$"};
        curNode = frameNode.children[frameNode.value.lower];
        if (curNode.value.class ===
                    "org.apache.spark.sql.catalyst.expressions.Literal") {
            frameInfo.lower = curNode.value.value * 1;
        } else if (curNode.value.class ===
            "org.apache.spark.sql.catalyst.expressions.CurrentRow$") {
            frameInfo.lower = 0;
        } else {
            frameInfo.lower = undefined;
        }
        curNode = frameNode.children[frameNode.value.upper];
        if (curNode.value.class ===
                    "org.apache.spark.sql.catalyst.expressions.Literal") {
            frameInfo.upper = curNode.value.value * 1;
        } else if (curNode.value.class ===
            "org.apache.spark.sql.catalyst.expressions.CurrentRow$") {
            frameInfo.upper = 0;
        } else {
            frameInfo.upper = undefined;
        }
        curNode = secondTraverse(weNode.children[weNode.value.windowFunction], {}, true);
        newCol.colType = getColType(curNode);
        assert(opName !== "CollectList", "CollectList is not supported in window");
        return {newColStruct: newCol, opName: opName, args: args,
                argTypes: argTypes, frameInfo: frameInfo};
    }

    // XXX the type argument is not used now
    function __categoryWindowOps(opList, type) {
        var retStruct = {agg: [],
                         first: [],
                         last: [],
                         lead: {},
                         nTile: {newCols: [], groupNums: []},
                         rowNumber: {newCols: []},
                         rank: {newCols: []},
                         percentRank: {newCols: []},
                         cumeDist: {newCols: []},
                         denseRank: {newCols: []}};
        var multiOperations = [];
        for (var i = 0; i < opList.length; i++) {
            var found = false;
            var opStruct = __prepareWindowOp(SQLCompiler
                                    .genTree(undefined, opList[i]), type);
            if (opStruct.opName === "First" || opStruct.opName === "Last") {
                var key = opStruct.opName.toLowerCase();
                retStruct[key].forEach(function(obj) {
                    if (JSON.stringify(obj.frameInfo)
                                === JSON.stringify(opStruct.frameInfo)) {
                        obj.newCols.push(opStruct.newColStruct);
                        obj.aggCols.push(opStruct.args[0]);
                        obj.aggTypes.push(opStruct.argTypes[0]);
                        obj.ignoreNulls.push(opStruct.args[1]);
                        found = true;
                    }
                })
                if (!found) {
                    var obj = {newCols: [], aggCols: [], aggTypes: [], ignoreNulls: []};
                    obj.newCols.push(opStruct.newColStruct);
                    obj.aggCols.push(opStruct.args[0]);
                    obj.aggTypes.push(opStruct.argTypes[0]);
                    obj.ignoreNulls.push(opStruct.args[1]);
                    obj.frameInfo = opStruct.frameInfo;
                    retStruct[key].push(obj);
                }
            } else if (opStruct.opName === "Lead" || opStruct.opName === "Lag") {
                var offset;
                if (opStruct.opName === "Lead") {
                    offset = opStruct.args[1];
                } else {
                    offset = opStruct.args[1] * -1;
                }
                if (retStruct.lead[offset]) {
                    retStruct.lead[offset].newCols
                                            .push(opStruct.newColStruct);
                    retStruct.lead[offset].keyCols
                                            .push(opStruct.args[0]);
                    retStruct.lead[offset].keyTypes
                                            .push(opStruct.argTypes[0]);
                    retStruct.lead[offset].defaults
                                            .push(opStruct.args[2]);
                    retStruct.lead[offset].types
                                            .push(opStruct.argTypes[2]);
                } else {
                    retStruct.lead[offset] =
                            {newCols: [opStruct.newColStruct],
                             keyCols: [opStruct.args[0]],
                             keyTypes: [opStruct.argTypes[0]],
                             defaults: [opStruct.args[2]],
                             types: [opStruct.argTypes[2]],
                             offset: offset};
                }
            } else if (opStruct.opName === "NTile") {
                // Ntile should have 1 argument
                // XXX According to definition, it could be some
                // expression but here I assume it as an literal
                // Not sure how to build query with expression in ntile
                assert(opStruct.args.length === 1 &&
                        !(opStruct.args[0] instanceof Object),
                        SQLErrTStr.ExprInNtile + opStruct.args);
                assert(opStruct.args[0] > 0, SQLErrTStr.InvalidNtile + opStruct.args[0]);
                retStruct.nTile.groupNums.push(opStruct.args[0]);
                retStruct.nTile.newCols.push(opStruct.newColStruct);
            } else if (opStruct.opName === "RowNumber") {
                retStruct.rowNumber.newCols.push(opStruct.newColStruct);
            } else if (opStruct.opName === "Rank") {
                retStruct.rank.newCols.push(opStruct.newColStruct);
            } else if (opStruct.opName === "PercentRank") {
                retStruct.percentRank.newCols.push(opStruct.newColStruct);
            } else if (opStruct.opName === "CumeDist") {
                retStruct.cumeDist.newCols.push(opStruct.newColStruct);
            } else if (opStruct.opName === "DenseRank") {
                retStruct.denseRank.newCols.push(opStruct.newColStruct);
            } else if (opStruct.opName === "StddevPop"
                       || opStruct.opName === "StddevSamp"
                       || opStruct.opName === "VariancePop"
                       || opStruct.opName === "VarianceSamp") {
                var aggObj = {newCols: [], ops: [], aggCols: [], aggTypes: []};
                aggObj.newCols.push(opStruct.newColStruct);
                aggObj.ops.push(opLookup["expressions.aggregate."
                                         + opStruct.opName]);
                aggObj.aggCols.push(opStruct.args[0]);
                aggObj.aggTypes.push(opStruct.argTypes[0]);
                aggObj.frameInfo = opStruct.frameInfo;
                multiOperations.push(aggObj);
            } else {
                retStruct.agg.forEach(function(aggObj) {
                    if (JSON.stringify(aggObj.frameInfo)
                                === JSON.stringify(opStruct.frameInfo)) {
                        aggObj.newCols.push(opStruct.newColStruct);
                        aggObj.ops.push(opLookup["expressions.aggregate."
                                                        + opStruct.opName]);
                        aggObj.aggCols.push(opStruct.args[0]);
                        aggObj.aggTypes.push(opStruct.argTypes[0]);
                        found = true;
                    }
                })
                if (!found) {
                    var aggObj = {newCols: [], ops: [], aggCols: [], aggTypes: []};
                    aggObj.newCols.push(opStruct.newColStruct);
                    aggObj.ops.push(opLookup["expressions.aggregate."
                                                + opStruct.opName]);
                    aggObj.aggCols.push(opStruct.args[0]);
                    aggObj.aggTypes.push(opStruct.argTypes[0]);
                    aggObj.frameInfo = opStruct.frameInfo;
                    retStruct.agg.push(aggObj);
                }
            }
        }
        retStruct.agg = retStruct.agg.concat(multiOperations);
        return retStruct;
    }

    function __genGroupByTable(sqlObj, ret, operators, groupByCols,
                                                aggColNames, windowStruct) {
        var deferred = PromiseHelper.deferred();
        // Save original table for later use
        windowStruct.origTableName = ret.newTableName;
        windowStruct.cli += ret.cli;
        windowStruct.gbTableName  = "XC_GB_Table"
                    + xcHelper.getTableId(windowStruct.origTableName) + "_"
                    + Authentication.getHashId();
        if (!windowStruct.tempGBCols) {
            windowStruct.tempGBCols = [];
            for (var i = 0; i < operators.length; i++) {
                var tableId = xcHelper.getTableId(windowStruct.origTableName);
                if (typeof tableId === "string") {
                    tableId = tableId.toUpperCase();
                }
                windowStruct.tempGBCols.push("XC_" + operators[i].toUpperCase()
                    + "_" + tableId
                    + "_" + Authentication.getHashId().substring(3));
            }
        }
        // If the new column will be added to usrCols later
        // don't add it to gbColInfo (will later concat to xcCols) here
        var resultGBCols = __deleteIdFromColInfo(groupByCols);
        windowStruct.resultGBCols = resultGBCols;
        if (windowStruct.addToUsrCols) {
            windowStruct.gbColInfo = resultGBCols;
        } else {
            windowStruct.gbColInfo = windowStruct.tempGBCols.map(function(colName) {
                                         return {colName: colName, colType: "DfUnknown"};
                                     }).concat(resultGBCols);
        }
        var gbArgs = [];
        for (var i = 0; i < operators.length; i++) {
            gbArgs.push({operator: operators[i], aggColName: aggColNames[i],
                         newColName: windowStruct.tempGBCols[i]})
        }
        sqlObj.groupBy(groupByCols.map(function(col) {
                            return __getCurrentName(col);}),
                        gbArgs, windowStruct.origTableName,
                        {newTableName: windowStruct.gbTableName})
        .then(function(ret) {
            deferred.resolve(ret);
        })
        .fail(deferred.reject);
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
            "tableName": windowStruct.joinRetAsLeft ?
                         ret.newTableName : windowStruct.leftTableName,
            "columns": leftJoinCols.map(function(col) {
                            return __getCurrentName(col);}),
            "rename": []
        };
        var rTableInfo = {
            "tableName": windowStruct.joinRetAsLeft ?
                         windowStruct.rightTableName : ret.newTableName,
            "columns": rightJoinCols.map(function(col) {
                            return __getCurrentName(col);}),
            "rename": []
        }
        var newRenames;
        if (windowStruct.renameFromCols) {
            // Make a copy of renameFromCols to avoid change by other reference
            windowStruct.renameFromCols = jQuery.extend(true, [],
                                          windowStruct.renameFromCols);
            var targetCols = Array(windowStruct.renameFromCols.length);
            var renamed = Array(windowStruct.renameFromCols.length);
            renamed.fill(false, 0, renamed.length);
            // Find the target column struct and rename it before resolve collision
            windowStruct.rightColInfo.forEach(function(item) {
                var colIndex = windowStruct.renameFromCols.map(function(col) {
                                   return __getCurrentName(col);
                               }).indexOf(__getCurrentName(item));
                if (colIndex != -1) {
                    item.colName = __getCurrentName(windowStruct
                                                .renameToUsrCols[colIndex]);
                    item.colId = windowStruct.renameToUsrCols[colIndex].colId;
                    delete item.rename;
                    targetCols[colIndex] = item;
                }
            });
            newRenames = __resolveCollision(windowStruct.leftColInfo,
                windowStruct.rightColInfo, lTableInfo.rename, rTableInfo.rename,
                lTableInfo.tableName, rTableInfo.tableName);
            // This struct is used by backend, so need to replace
            // target column name with column name before rename
            rTableInfo.rename.forEach(function(item) {
                var colIndex = windowStruct.renameToUsrCols.map(function(col) {
                                   return __getCurrentName(col);
                               }).indexOf(item.orig);
                if (colIndex != -1) {
                    item.orig = __getCurrentName(windowStruct.renameFromCols[colIndex]);
                    renamed[colIndex] = true;
                }
            });
            // If it is not renamed, add the rename info into rTableInfo.rename
            for (var i = 0; i < renamed.length; i++) {
                if (!renamed[i]) {
                    rTableInfo.rename.push(
                        {"new": __getCurrentName(windowStruct.renameToUsrCols[i]),
                        "orig": __getCurrentName(windowStruct.renameFromCols[i]),
                        "type": DfFieldTypeT.DfUnknown}); // XXX Not sure with type
                }
                windowStruct.rightColInfo.splice(windowStruct.rightColInfo
                                         .indexOf(targetCols[i]),1);
                windowStruct.node.usrCols.push(targetCols[i]);
            }
        } else if (windowStruct.addToUsrCols) {
            newRenames = __resolveCollision(windowStruct.leftColInfo,
                windowStruct.rightColInfo.concat(windowStruct.addToUsrCols),
                lTableInfo.rename, rTableInfo.rename,
                lTableInfo.tableName, rTableInfo.tableName);
        } else {
            newRenames = __resolveCollision(windowStruct.leftColInfo,
                                            windowStruct.rightColInfo,
                                            lTableInfo.rename, rTableInfo.rename,
                                    lTableInfo.tableName, rTableInfo.tableName);
        }
        // If left table is the trunk table, modify column info of node
        // otherwise modify temp column info
        if (windowStruct.node) {
            windowStruct.node.xcCols = windowStruct.node.xcCols
                                            .concat(windowStruct.rightColInfo);
            if (windowStruct.addToUsrCols) {
                windowStruct.node.usrCols = windowStruct.node.usrCols
                                            .concat(windowStruct.addToUsrCols);
            }
            windowStruct.node.renamedCols = __combineRenameMaps(
                                [windowStruct.node.renamedCols, newRenames]);
        } else {
            windowStruct.leftColInfo = windowStruct.leftColInfo
                                            .concat(windowStruct.rightColInfo);
            windowStruct.leftRename = __combineRenameMaps(
                                [windowStruct.leftRename,newRenames]);
        }
        var evalString = "";
        if (joinType === JoinOperatorT.CrossJoin) {
            for (var i = 0; i < leftJoinCols.length; i++) {
                if (evalString === "") {
                    evalString = "eq(" + __getCurrentName(leftJoinCols[i]) +
                                 "," + __getCurrentName(rightJoinCols[i]) + ")";
                } else {
                    evalString = "and(" + evalString + "," + "eq("
                                 + __getCurrentName(leftJoinCols[i]) + ","
                                 + __getCurrentName(rightJoinCols[i]) + "))";
                }
            }
            lTableInfo.columns = [];
            rTableInfo.columns = [];
        }
        sqlObj.join(joinType, lTableInfo, rTableInfo, {evalString: evalString})
        .then(function(ret) {
            deferred.resolve(ret);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    function __groupByAndJoinBack(sqlObj, ret, operators, groupByCols,
                                        aggColNames, joinType, windowStruct) {
        var deferred = PromiseHelper.deferred();
        if (windowStruct.addToUsrCols) {
            windowStruct.tempGBCols = windowStruct.addToUsrCols.map(function(col) {
                return __getCurrentName(col);
            });
        }
        __genGroupByTable(sqlObj, ret, operators, groupByCols,
                                                aggColNames, windowStruct)
        .then(function(ret) {
            if (ret.tempCols) {
                windowStruct.gbColInfo = windowStruct.gbColInfo
                    .concat(ret.tempCols.map(function(colName) {
                        return {colName: colName, colType: "DfUnknown"}; // XXX xiApi temp columns
                    }));
            }
            windowStruct.leftTableName = windowStruct.origTableName;
            windowStruct.rightColInfo = windowStruct.gbColInfo;
            return ret;
        })
        .then(function(ret) {
            if (windowStruct.joinBackByIndex) {
                assert(windowStruct.tempGBCols.length === 1, "TempGBCols should have length 1");
                var rightIndexColStruct;
                for (var i = 0; i < windowStruct.rightColInfo.length; i++) {
                    if (__getCurrentName(windowStruct.rightColInfo[i])
                        === windowStruct.tempGBCols[0]) {
                        rightIndexColStruct = windowStruct.rightColInfo[i];
                        break;
                    }
                }
                return __joinTempTable(sqlObj, ret, joinType,
                            [windowStruct.indexColStruct],
                            [rightIndexColStruct], windowStruct);
            }
            return __joinTempTable(sqlObj, ret, joinType, groupByCols,
                                   windowStruct.resultGBCols, windowStruct);
        })
        .then(function(ret) {
            if (ret.tempCols) {
                if (windowStruct.node) {
                    windowStruct.node.xcCols = windowStruct.node.xcCols.concat(ret.tempCols
                                        .map(function(colName) {
                                            return {colName: colName,
                                                    colType: "DfUnknown"}; // XXX xiApi temp columns
                                        }));
                } else {
                    windowStruct.leftColInfo = windowStruct.leftColInfo
                        .concat(ret.tempCols.map(function(colName) {
                            return {colName: colName,
                                    colType: "DfUnknown"}; // XXX xiApi temp columns
                        }));
                }
            }
            deferred.resolve(ret);
        })
        .fail(deferred.reject);
        return deferred;
    }

    // XXX should add collision detection
    function __windowExpressionHelper(loopStruct, curPromise, opName, opStruct) {
        var deferred = PromiseHelper.deferred();
        var node = loopStruct.node;
        var self = loopStruct.self;
        var cli = "";
        var groupByCols = loopStruct.groupByCols;
        var sortColsAndOrder = loopStruct.sortColsAndOrder;
        var indexColStruct = loopStruct.indexColStruct;
        var noUsrCol = loopStruct.noUsrCol;
        var newColStructs = opStruct.newCols;
        curPromise = curPromise.then(function(ret) {
            var newRenames = __resolveCollision(node.usrCols.concat(node.xcCols)
                                    .concat(node.sparkCols), newColStructs,
                                    [], [], "", node.children[0].newTableName);
            node.renamedCols = __combineRenameMaps([node.renamedCols, newRenames]);
            return ret;
        });

        switch (opName) {
            case ("agg"):
                // Common aggregate expressions, do a group by
                // and join back
                var windowStruct;
                var mapStrs = [];
                var newColNames = [];
                var tempColStructs = [];
                for (i in opStruct.aggCols) {
                    if (opStruct.aggTypes[i]) {
                        mapStrs.push(opStruct.aggTypes[i] + "("
                                     + opStruct.aggCols[i] + ")");
                        var tempColName = cleanseColName("XC_WINDOW_"
                                    + opStruct.aggTypes[i] + "_"
                                    + opStruct.aggCols[i] + "_"
                                    + Authentication.getHashId().substring(3)
                                    + "_" + i);
                        newColNames.push(tempColName);
                        tempColStructs.push({colName: tempColName});
                        opStruct.aggCols[i] = tempColStructs[tempColStructs.length - 1];
                    }
                }
                if (mapStrs.length !== 0) {
                    node.xcCols = node.xcCols.concat(tempColStructs);
                    curPromise = curPromise.then(function(ret) {
                        cli += ret.cli;
                        return self.sqlObj.map(mapStrs, ret.newTableName, newColNames);
                    });
                }
                if (opStruct.frameInfo.lower == undefined
                    && opStruct.frameInfo.upper == undefined) {
                    curPromise = curPromise.then(function(ret) {
                        var aggColNames = [];
                        for (i in opStruct.aggCols) {
                            aggColNames.push(__getCurrentName(opStruct.aggCols[i]));
                        }
                        windowStruct = {leftColInfo: node.usrCols
                                            .concat(node.xcCols)
                                            .concat(node.sparkCols),
                                        node: node, cli: "",
                                        addToUsrCols: newColStructs};
                        return __groupByAndJoinBack(self.sqlObj, ret,
                                    opStruct.ops, groupByCols,
                                    aggColNames, JoinOperatorT.CrossJoin,
                                    windowStruct);
                    })
                    .then(function(ret) {
                        cli += windowStruct.cli;
                        return ret;
                    });
                } else {
                    var origTableName;
                    var leftIndexStruct;
                    var rightIndexStruct;
                    var leftGBColStructs = [];
                    var rightGBColStructs = [];
                    var rightAggColStructs = [];
                    var leftOrderColStructs = [];
                    var rightOrderColStructs = [];
                    var leftCols = [];
                    var rightCols = [];
                    curPromise = curPromise.then(function(ret) {
                        cli += ret.cli;
                        origTableName = ret.newTableName;
                        var lTableInfo = {
                            "tableName": ret.newTableName,
                            "columns": [],
                            "rename": []
                        };
                        var rTableInfo = {
                            "tableName": ret.newTableName,
                            "columns": [],
                            "rename": []
                        };
                        node.usrCols.concat(node.xcCols).concat(node.sparkCols)
                            .forEach(function(item) {
                            var lColStruct = {colName: __getCurrentName(item),
                                              colType: item.colType};
                            var rColStruct = {colName: __getCurrentName(item),
                                              colType: item.colType};
                            leftCols.push(lColStruct);
                            rightCols.push(rColStruct);
                            if (item === indexColStruct) {
                                leftIndexStruct = lColStruct;
                                rightIndexStruct = rColStruct;
                            }
                            for (var i = 0; i < groupByCols.length; i++) {
                                if (groupByCols[i].colId === item.colId) {
                                    leftGBColStructs.push(lColStruct);
                                    rightGBColStructs.push(rColStruct);
                                    break;
                                }
                            }
                            for (var i = 0; i < opStruct.aggCols.length; i++) {
                                if (opStruct.aggCols[i].colId &&
                                    opStruct.aggCols[i].colId === item.colId ||
                                    __getCurrentName(opStruct.aggCols[i])
                                    === __getCurrentName(item)) {
                                    rightAggColStructs[i] = rColStruct;
                                    break;
                                }
                            }
                            for (var i = 0; i < sortColsAndOrder.length; i++) {
                                if (sortColsAndOrder[i].colId === item.colId) {
                                    lColStruct.ordering = sortColsAndOrder[i].ordering;
                                    rColStruct.ordering = sortColsAndOrder[i].ordering;
                                    leftOrderColStructs.push(lColStruct);
                                    rightOrderColStructs.push(rColStruct);
                                    break;
                                }
                            }
                        });
                        __resolveCollision(leftCols, rightCols,
                                           lTableInfo.rename, rTableInfo.rename,
                                           ret.newTableName, ret.newTableName);
                        var evalString = __generateFrameEvalString(opStruct,
                            leftGBColStructs, rightGBColStructs, leftIndexStruct,
                            rightIndexStruct, leftOrderColStructs,
                            rightOrderColStructs);
                        return self.sqlObj.join(JoinOperatorT.CrossJoin, lTableInfo,
                                         rTableInfo, {evalString: evalString});
                    })
                    .then(function(ret) {
                        windowStruct = {leftColInfo: node.usrCols
                                        .concat(node.xcCols).concat(node.sparkCols),
                                        node: node, cli: "",
                                        addToUsrCols: newColStructs,
                                        tempGBCols: newColStructs.map(function(col) {
                                            return __getCurrentName(col);
                                        })};
                        var aggColNames = [];
                        for (var i = 0; i < opStruct.aggCols.length; i++) {
                            aggColNames.push(__getCurrentName(rightAggColStructs[i]));
                        }
                        return __genGroupByTable(self.sqlObj, ret, opStruct.ops,
                                [leftIndexStruct], aggColNames, windowStruct);
                    })
                    .then(function(ret) {
                        if (ret.tempCols) {
                            windowStruct.gbColInfo = windowStruct.gbColInfo
                                .concat(ret.tempCols.map(function(colName) {
                                    return {colName: colName, colType: "DfUnknown"}; // XXX xiApi temp columns
                                }));
                        }
                        windowStruct.leftTableName = origTableName;
                        windowStruct.rightColInfo = windowStruct.gbColInfo;
                        return __joinTempTable(self.sqlObj, ret, JoinOperatorT.LeftOuterJoin,
                                [indexColStruct], [leftIndexStruct], windowStruct);
                    })
                    .then(function(ret) {
                        if (ret.tempCols) {
                            node.xcCols = node.xcCols.concat(ret.tempCols
                                            .map(function(colName) {
                                                return {colName: colName,
                                                        colType: "DfUnknown"}; // XXX xiApi temp columns
                                            }));
                        }
                        cli += windowStruct.cli;

                        var columnListForMap = [];
                        for (var i = 0; i < opStruct.ops.length; i++) {
                            if (opStruct.ops[i] === "count") {
                                columnListForMap.push(opStruct.newCols[i]);
                            }
                        }
                        if (columnListForMap.length === 0) {
                            return ret;
                        } else {
                            cli += ret.cli;
                            var mapStrList = [];
                            for (var i = 0; i < columnListForMap.length; i++) {
                                var curMapStr = "if(exists(" +
                                __getCurrentName(columnListForMap[i]) + ")," +
                                __getCurrentName(columnListForMap[i]) + ",0)";
                                mapStrList.push(curMapStr);
                            }
                            return self.sqlObj.map(mapStrList, ret.newTableName,
                                        columnListForMap.map(function(col) {
                                            return __getCurrentName(col);
                                        }));
                        }
                    })
                }
                break;
            case ("first"):
            case ("last"):
                // assert(sortColsAndOrder.length > 0, SQLErrTStr.NoSortFirst);
                var windowStruct;
                // Generate a temp table only contain the
                // first/last row of each partition by getting
                // minimum/maximum row number in each partition
                // and left semi join back
                var mapStrs = [];
                var newColNames = [];
                var tempColStructs = [];
                for (i in opStruct.aggCols) {
                    if (opStruct.aggTypes[i]) {
                        mapStrs.push(opStruct.aggTypes[i] + "("
                                     + opStruct.aggCols[i] + ")");
                        var tempColName = cleanseColName("XC_WINDOW_"
                                    + opStruct.aggTypes[i] + "_"
                                    + opStruct.aggCols[i] + "_"
                                    + Authentication.getHashId().substring(3)
                                    + "_" + i);
                        newColNames.push(tempColName);
                        tempColStructs.push({colName: tempColName});
                        opStruct.aggCols[i] = tempColStructs[tempColStructs.length - 1];
                    }
                }
                if (mapStrs.length !== 0) {
                    node.xcCols = node.xcCols.concat(tempColStructs);
                    curPromise = curPromise.then(function(ret) {
                        cli += ret.cli;
                        return self.sqlObj.map(mapStrs, ret.newTableName, newColNames);
                    });
                }
                if (opStruct.frameInfo.lower == undefined && opName === "first" ||
                    opStruct.frameInfo.upper == undefined && opName === "last") {
                    curPromise = curPromise.then(function(ret) {
                        windowStruct = {cli: ""};
                        windowStruct.node = node;
                        // Columns in temp table should not have id
                        windowStruct.leftColInfo =
                            __deleteIdFromColInfo(jQuery.extend(true,
                                [], node.usrCols.concat(node.xcCols)
                                            .concat(node.sparkCols)));
                        windowStruct.leftRename = [];
                        var gbOpName;
                        if (opName === "last") {
                            gbOpName = "max";
                        } else {
                            gbOpName = "min";
                        }
                        // The flag joinBackByIndex is used when we
                        // want to join back by other column
                        // = result column of group by
                        // rather than groupByCols = groupByCols
                        // In that case, indexColStruct should be set
                        windowStruct.joinBackByIndex = true;
                        windowStruct.indexColStruct = indexColStruct;
                        return __groupByAndJoinBack(self.sqlObj, ret,
                                    [gbOpName], groupByCols,
                                    [__getCurrentName(indexColStruct)],
                                    JoinOperatorT.InnerJoin,
                                    windowStruct);
                    })
                    // Inner join original table and temp table
                    // rename the column needed
                    .then(function(ret) {
                        windowStruct.rightColInfo =
                                            windowStruct.leftColInfo;
                        windowStruct.leftColInfo = node.usrCols
                                            .concat(node.xcCols)
                                            .concat(node.sparkCols);
                        // If renameFromCol and renameToUsrCol are
                        // specified, helper function will rename
                        // the column and move that column to usrCols
                        windowStruct.renameFromCols = opStruct.aggCols;
                        windowStruct.renameToUsrCols = newColStructs;
                        var rightGBColStructs = [];
                        for (var i = 0; i < groupByCols.length; i++) {
                            for (var j = 0; j < windowStruct.rightColInfo.length; j++) {
                                if (__getCurrentName(windowStruct.rightColInfo[j])
                                    === __getCurrentName(groupByCols[i])) {
                                    rightGBColStructs.push(windowStruct.rightColInfo[j]);
                                    break;
                                }
                            }
                        }
                        return __joinTempTable(self.sqlObj, ret,
                                               JoinOperatorT.CrossJoin, groupByCols,
                                               rightGBColStructs, windowStruct);
                    });
                } else {
                    var origTableName;
                    var leftIndexStruct;
                    var rightIndexStruct;
                    var leftGBColStructs = [];
                    var rightGBColStructs = [];
                    var leftAggColStructs = [];
                    var leftOrderColStructs = [];
                    var rightOrderColStructs = [];
                    var leftCols = [];
                    var rightCols = [];
                    curPromise = curPromise.then(function(ret) {
                        cli += ret.cli;
                        origTableName = ret.newTableName;
                        var lTableInfo = {
                            "tableName": ret.newTableName,
                            "columns": [],
                            "rename": []
                        };
                        var rTableInfo = {
                            "tableName": ret.newTableName,
                            "columns": [],
                            "rename": []
                        };
                        node.usrCols.concat(node.xcCols).concat(node.sparkCols)
                            .forEach(function(item) {
                            var lColStruct = {colName: __getCurrentName(item),
                                              colType: item.colType};
                            var rColStruct = {colName: __getCurrentName(item),
                                              colType: item.colType};
                            leftCols.push(lColStruct);
                            rightCols.push(rColStruct);
                            if (item === indexColStruct) {
                                leftIndexStruct = lColStruct;
                                rightIndexStruct = rColStruct;
                            }
                            for (var i = 0; i < groupByCols.length; i++) {
                                if (groupByCols[i].colId === item.colId) {
                                    leftGBColStructs.push(lColStruct);
                                    rightGBColStructs.push(rColStruct);
                                    break;
                                }
                            }
                            for (var i = 0; i < opStruct.aggCols.length; i++) {
                                if (opStruct.aggCols[i].colId &&
                                    opStruct.aggCols[i].colId === item.colId ||
                                    __getCurrentName(opStruct.aggCols[i])
                                    === __getCurrentName(item)) {
                                    leftAggColStructs[i] = lColStruct;
                                    break;
                                }
                            }
                            for (var i = 0; i < sortColsAndOrder.length; i++) {
                                if (sortColsAndOrder[i].colId === item.colId) {
                                    lColStruct.ordering = sortColsAndOrder[i].ordering;
                                    rColStruct.ordering = sortColsAndOrder[i].ordering;
                                    leftOrderColStructs.push(lColStruct);
                                    rightOrderColStructs.push(rColStruct);
                                    break;
                                }
                            }
                        });
                        __resolveCollision(leftCols, rightCols,
                                           lTableInfo.rename, rTableInfo.rename,
                                           ret.newTableName, ret.newTableName);
                        var evalString = __generateFrameEvalString(opStruct,
                            leftGBColStructs, rightGBColStructs, leftIndexStruct,
                            rightIndexStruct, leftOrderColStructs,
                            rightOrderColStructs);
                        return self.sqlObj.join(JoinOperatorT.CrossJoin, lTableInfo,
                                         rTableInfo, {evalString: evalString});
                    })
                    .then(function(ret) {
                        windowStruct = {leftColInfo: node.usrCols
                                        .concat(node.xcCols).concat(node.sparkCols),
                                        node: node, cli: ""};
                        var aggColNames = [__getCurrentName(rightIndexStruct)];
                        var gbOpName;
                        if (opName === "last") {
                            gbOpName = "max";
                        } else {
                            gbOpName = "min";
                        }
                        return __genGroupByTable(self.sqlObj, ret, [gbOpName],
                                [leftIndexStruct], aggColNames, windowStruct);
                    })
                    .then(function(ret) {
                        if (ret.tempCols) {
                            windowStruct.gbColInfo = windowStruct.gbColInfo
                                .concat(ret.tempCols.map(function(colName) {
                                    return {colName: colName, colType: "DfUnknown"}; // XXX xiApi temp columns
                                }));
                        }
                        // Update right index with result of min/max
                        rightIndexStruct = {colName: windowStruct.tempGBCols[0],
                                            colType: "int"};
                        windowStruct.leftTableName = origTableName;
                        windowStruct.rightColInfo = windowStruct.gbColInfo;
                        return __joinTempTable(self.sqlObj, ret, JoinOperatorT.LeftOuterJoin,
                                [indexColStruct], [leftIndexStruct], windowStruct);
                    })
                    .then(function(ret) {
                        if (ret.tempCols) {
                            node.xcCols = node.xcCols.concat(ret.tempCols
                                .map(function(colName) {
                                    return {colName: colName,
                                            colType: "DfUnknown"}; // XXX xiApi temp columns
                                }));
                        }
                        windowStruct.rightColInfo = leftCols;
                        windowStruct.rightTableName = origTableName;
                        windowStruct.leftColInfo = node.usrCols
                                    .concat(node.xcCols).concat(node.sparkCols);
                        windowStruct.renameFromCols = leftAggColStructs;
                        windowStruct.renameToUsrCols = newColStructs;
                        windowStruct.joinRetAsLeft = true;

                        return __joinTempTable(self.sqlObj, ret,
                                JoinOperatorT.LeftOuterJoin, [rightIndexStruct],
                                [indexColStruct], windowStruct);
                    });
                }
                // windowStruct.cli contains the clis for one
                // operation before window and all the
                // windowStruct involved operations except for
                // last one, which will be added in next then
                curPromise = curPromise.then(function(ret) {
                    if (ret.tempCols) { // This needed or not depends on behavior of innerjoin
                        node.xcCols = node.xcCols.concat(ret.tempCols
                                        .map(function(colName) {
                                            return {colName: colName,
                                                    colType: "DfUnknown"}; // XXX xiApi temp columns
                                        }));
                    }
                    cli += windowStruct.cli;
                    return ret;
                });
                break;
            case ("lead"):
                var windowStruct = {cli: ""};
                var rightKeyColStructs = [];
                var keyColIds = opStruct.keyCols.map(function(item) {
                    return item.colId;
                })
                var keyColNames = [];
                var mapStrs = [];
                var newColNames = [];
                var tempColStructs = [];
                for (i in opStruct.keyCols) {
                    if (opStruct.keyTypes[i]) {
                        mapStrs.push(opStruct.keyTypes[i] + "("
                                     + opStruct.keyCols[i] + ")");
                        var tempColName = cleanseColName("XC_WINDOW_"
                                    + opStruct.keyTypes[i] + "_"
                                    + opStruct.keyCols[i] + "_"
                                    + Authentication.getHashId().substring(3)
                                    + "_" + i);
                        newColNames.push(tempColName);
                        keyColNames.push(tempColName);
                        tempColStructs.push({colName: tempColName});
                        opStruct.keyCols[i] = tempColStructs[tempColStructs.length - 1];
                    } else {
                        keyColNames.push(__getCurrentName(opStruct.keyCols[i]));
                    }
                }
                if (mapStrs.length !== 0) {
                    node.xcCols = node.xcCols.concat(tempColStructs);
                    curPromise = curPromise.then(function(ret) {
                        cli += ret.cli;
                        return self.sqlObj.map(mapStrs, ret.newTableName, newColNames);
                    });
                }
                windowStruct.node = node;
                var leftJoinCols = [];
                var rightJoinCols = [];
                var newIndexColName;
                var newIndexColStruct;
                // Map on index column with offset
                curPromise = curPromise.then(function(ret) {
                    windowStruct.leftTableName = ret.newTableName;
                    cli += ret.cli;
                    windowStruct.leftColInfo = node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols);
                    windowStruct.rightColInfo = jQuery.extend(true, [],
                                        node.usrCols.concat(node.xcCols)
                                        .concat(node.sparkCols));
                    node.usrCols.forEach(function(item) {
                        for (var i = 0; i < groupByCols.length; i++) {
                            if (item.colId === groupByCols[i].colId) {
                                leftJoinCols[i] = item;
                                break;
                            }
                        }
                    });
                    windowStruct.rightColInfo.forEach(function(item) {
                        if (item.colId && keyColIds.indexOf(item.colId) != -1
                        || keyColNames.indexOf(__getCurrentName(item)) != -1) {
                            rightKeyColStructs.push(item);
                        }
                        for (var i = 0; i < groupByCols.length; i++) {
                            if (item.colId === groupByCols[i].colId) {
                                rightJoinCols[i] = item;
                                break;
                            }
                        }
                        delete item.colId;
                    });
                    newIndexColName = __getCurrentName(indexColStruct) + "_right"
                                        + Authentication.getHashId().substring(3);
                    newIndexColStruct = {colName: newIndexColName, colType: "int"};
                    windowStruct.rightColInfo
                                    .push(newIndexColStruct);
                    var mapStr;
                    mapStr = "subInteger(" + __getCurrentName(indexColStruct)
                                 + ", " + opStruct.offset + ")";
                    return self.sqlObj.map([mapStr],
                        windowStruct.leftTableName, [newIndexColName]);
                })
                // Outer join back with index columnm
                .then(function(ret) {
                    // Not cross join because group on index which cannot be FNF
                    return __joinTempTable(self.sqlObj, ret,
                            JoinOperatorT.LeftOuterJoin,
                            [{colName: __getCurrentName(indexColStruct),
                              colType: "int"}],
                            [newIndexColStruct], windowStruct);
                });
                // Map again to set default value
                curPromise = curPromise.then(function(ret) {
                    if (ret.tempCols) { // This needed or not depends on behavior of leftouterjoin
                        node.xcCols = node.xcCols.concat(ret.tempCols
                                        .map(function(colName) {
                                            return {colName: colName,
                                                    colType: "DfUnknown"}; // XXX xiApi temp columns
                                        }));
                    }
                    cli += windowStruct.cli;
                    cli += ret.cli;
                    if (!noUsrCol) {
                        node.usrCols = node.usrCols.concat(newColStructs);
                    }
                    var mapStrs = [];
                    for (var i = 0; i < rightKeyColStructs.length; i++) {
                        var mapStr = "if(";
                        var defaultValue = opStruct.defaults[i];
                        if (opStruct.types[i] === "string") {
                            defaultValue = "\"" + defaultValue + "\"";
                        } else if (opStruct.types[i] === undefined) {
                            if (node.renamedCols[defaultValue.colId]) {
                                defaultValue = node.renamedCols[defaultValue.colId];
                            } else {
                                defaultValue = defaultValue.colName;
                            }
                        }
                        // Need to check rename here
                        for (var i = 0; i < leftJoinCols.length - 1; i++) {
                            mapStr += "and(eq("
                                + __getCurrentName(leftJoinCols[i]) + ", "
                                + __getCurrentName(rightJoinCols[i]) + "),";
                        }
                        if (groupByCols.length === 0) {
                            mapStr += "exists(" + __getCurrentName(newIndexColStruct)
                                    + "), " + __getCurrentName(rightKeyColStructs[i])
                                    + ", " + defaultValue + ")";
                        } else {
                            mapStr += "eq("
                                + __getCurrentName(leftJoinCols[leftJoinCols
                                    .length - 1]) + ", "
                                + __getCurrentName(rightJoinCols[leftJoinCols
                                    .length - 1]) + ")"
                                + Array(leftJoinCols.length).join(")") + ", "
                                + __getCurrentName(rightKeyColStructs[i])
                                + ", " + defaultValue + ")";
                        }
                        mapStrs.push(mapStr);
                    }
                    return self.sqlObj.map(mapStrs, ret.newTableName,
                                    newColStructs.map(function(col) {
                                        return __getCurrentName(col);
                                    }));
                });
                break;
            // Rank function
            case ("nTile"):
                var groupNums = opStruct.groupNums;
            case ("rowNumber"):
                var windowStruct;
                // Group by and join back to generate minimum row number
                // in each partition
                curPromise = curPromise.then(function(ret) {
                    windowStruct = {leftColInfo: node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols),
                            node: node, cli: ""};
                    return __groupByAndJoinBack(self.sqlObj, ret, ["min"],
                                groupByCols, [__getCurrentName(indexColStruct)],
                                JoinOperatorT.CrossJoin, windowStruct);
                });
                if (opName === "rowNumber") {
                    // Row number = index - minIndexOfPartition + 1
                    curPromise = curPromise.then(function(ret) {
                        cli += windowStruct.cli;
                        cli += ret.cli;
                        if (!noUsrCol) {
                            node.usrCols = node.usrCols.concat(newColStructs);
                        }
                        var mapStr = "addInteger(subInteger("
                                     + __getCurrentName(indexColStruct) + ", "
                                     + windowStruct.tempGBCols[0] + "), 1)";
                        var mapStrs = Array(newColStructs.length).fill(mapStr);
                        return self.sqlObj.map(mapStrs, ret.newTableName,
                                            newColStructs.map(function(col) {
                                                return __getCurrentName(col);
                                            }));
                    });
                } else {
                    // ntile = int((index - minIndexOfPartition)
                    // * groupNum / sizeOfPartition + 1)
                    // Here use count group by partition columns
                    // to generate partition size
                    var tempMinIndexColName;
                    curPromise = curPromise.then(function(ret){
                        cli += windowStruct.cli;
                        tempMinIndexColName = windowStruct.tempGBCols[0];
                        windowStruct = {leftColInfo: node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols),
                            node: node, cli: ""};
                        return __groupByAndJoinBack(self.sqlObj, ret, ["count"],
                                groupByCols, [__getCurrentName(indexColStruct)],
                                JoinOperatorT.CrossJoin, windowStruct);
                    })
                    .then(function(ret) {
                        cli += windowStruct.cli;
                        cli += ret.cli;
                        if (!noUsrCol) {
                            node.usrCols = node.usrCols.concat(newColStructs);
                        }
                        var mapStrs = [];
                        for (var i = 0; i < newColStructs.length; i++) {
                            var groupNum = groupNums[i];
                            var bracketSize = "int(div(" + windowStruct.tempGBCols[0]
                                    + ", " + groupNum + "))";
                            var extraRowNum = "mod(" + windowStruct.tempGBCols[0]
                                    + ", " + groupNum + ")";
                            var rowNumSubOne = "subInteger("
                                        + __getCurrentName(indexColStruct)
                                        + ", " + tempMinIndexColName + ")";
                            var threashold = "mult(" + extraRowNum + ", add(1, "
                                    + bracketSize + "))";
                            var mapStr = "if(lt(" + rowNumSubOne + ", " + threashold
                                    + "), addInteger(div(" + rowNumSubOne + ", add(1, "
                                    + bracketSize + ")), 1), addInteger(div(sub("
                                    + rowNumSubOne + ", " + threashold + "), "
                                    + "if(eq(" + bracketSize + ", 0), 1, "
                                    + bracketSize + ")), 1, " + extraRowNum + "))";
                            mapStrs.push(mapStr);
                        }
                        return self.sqlObj.map(mapStrs, ret.newTableName,
                                            newColStructs.map(function(col) {
                                                return __getCurrentName(col);
                                            }));
                    });
                }
                break;
            case ("rank"):
            case ("percentRank"):
            case ("cumeDist"):
                var windowStruct;
                var partitionMinColName;
                var psGbColName;
                curPromise = curPromise.then(function(ret) {
                    windowStruct = {leftColInfo: node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols),
                            node: node, cli: ""};
                    return __groupByAndJoinBack(self.sqlObj, ret, ["min"],
                                groupByCols, [__getCurrentName(indexColStruct)],
                                JoinOperatorT.CrossJoin, windowStruct);
                })
                .then(function(ret) {
                    // Those three give duplicate row same number
                    // so need to generate min/max index
                    // for each (partition + sort columns) pair (eigen)
                    cli += windowStruct.cli;
                    partitionMinColName = windowStruct.tempGBCols[0];
                    var operator = "min";
                    windowStruct = {leftColInfo: node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols),
                            node: node, cli: ""};
                    if (opName === "cumeDist") {
                        operator = "max";
                    }
                    return __groupByAndJoinBack(self.sqlObj, ret, [operator],
                            __concatColInfoForSort(groupByCols,
                            sortColsAndOrder).map(function(col) {
                                col.colName = col.name;
                                col.colType = col.type;
                                return col;
                            }), [__getCurrentName(indexColStruct)],
                            JoinOperatorT.CrossJoin, windowStruct);
                });
                if (opName === "rank") {
                    // rank = minForEigen - minForPartition + 1
                    curPromise = curPromise.then(function(ret) {
                        cli += windowStruct.cli;
                        cli += ret.cli;
                        psGbColName = windowStruct.tempGBCols[0];
                        if (!noUsrCol) {
                            node.usrCols = node.usrCols.concat(newColStructs);
                        }
                        var mapStr = "addInteger(subInteger(" + psGbColName
                                     + ", " + partitionMinColName + "), 1)";
                        var mapStrs = Array(newColStructs.length).fill(mapStr);
                        return self.sqlObj.map(mapStrs, ret.newTableName,
                                               newColStructs.map(function(col) {
                                                return __getCurrentName(col);
                                               }));
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
                        psGbColName = windowStruct.tempGBCols[0];
                        windowStruct = {leftColInfo: node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols),
                            node: node, cli: ""};
                        return __groupByAndJoinBack(self.sqlObj, ret, ["count"],
                                groupByCols, [__getCurrentName(indexColStruct)],
                                JoinOperatorT.CrossJoin, windowStruct);
                    })
                    .then(function(ret) {
                        cli += windowStruct.cli;
                        cli += ret.cli;
                        tempCountColName = windowStruct.tempGBCols[0];
                        if (!noUsrCol) {
                            node.usrCols = node.usrCols.concat(newColStructs);
                        }
                        var mapStr;
                        if (opName === "percentRank") {
                            mapStr = "div(sub(" + psGbColName + ", "
                                + partitionMinColName + "), if(eq(sub("
                                + tempCountColName + ", 1), 0), 1.0, sub("
                                + tempCountColName + ", 1)))";
                        } else {
                            mapStr = "div(add(sub(" + psGbColName + ", "
                                     + partitionMinColName + "), 1),"
                                     + tempCountColName + ")";
                        }
                        var mapStrs = Array(newColStructs.length).fill(mapStr);
                        return self.sqlObj.map(mapStrs, ret.newTableName,
                                               newColStructs.map(function(col) {
                                                return __getCurrentName(col);
                                               }));
                    });
                }
                break;
            case ("denseRank"):
                var windowStruct;
                var drIndexColName;
                var origTableName;
                // Dense_rank treat rows with same eigen as one so do
                // a group by to eliminate duplicate eigens => t1
                curPromise = curPromise.then(function(ret) {
                    windowStruct = {cli: ""};
                    return __genGroupByTable(self.sqlObj, ret, ["count"],
                            __concatColInfoForSort(groupByCols,
                                sortColsAndOrder).map(function(col) {
                                    col.colName = col.name;
                                    col.colType = col.type;
                                    return col;
                                }), [__getCurrentName(indexColStruct)], windowStruct);
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
                        [{colName: windowStruct.tempGBCols[0], colType: "DfUnknown"}]
                        .concat(__deleteIdFromColInfo(groupByCols))
                        .concat(sortColsAndOrder.map(function(col) {
                            return {colName: col.name, colType: col.type};
                        }));
                    if (ret.tempCols) {
                        windowStruct.leftColInfo = windowStruct.leftColInfo
                            .concat(ret.tempCols.map(function(colName) {
                                return {colName: colName,
                                        colType: "DfUnknown"}; // XXX xiApi temp columns
                            }));
                    }
                    delete windowStruct.tempGBCols;
                    windowStruct.leftRename = [];
                    return self.sqlObj.sort(
                        __concatColInfoForSort(groupByCols,
                            sortColsAndOrder), ret.newTableName);
                })
                // Genrow and same steps as in row_number
                // to get rank for each eigen
                .then(function(ret) {
                    cli += ret.cli;
                    var tableId = xcHelper.getTableId(ret.newTableName);
                    if (typeof tableId === "string") {
                        tableId = tableId.toUpperCase();
                    }
                    drIndexColName = "XC_ROW_COL_" + tableId;
                    windowStruct.leftColInfo
                                .push({colName: drIndexColName, colType: "int"});
                    return self.sqlObj.genRowNum(ret.newTableName,
                                                 drIndexColName);
                })
                .then(function(ret){
                    return __groupByAndJoinBack(self.sqlObj, ret, ["min"],
                                groupByCols, [drIndexColName],
                                JoinOperatorT.CrossJoin, windowStruct);
                })
                .then(function(ret) {
                    cli += windowStruct.cli;
                    windowStruct.cli = "";
                    cli += ret.cli;
                    var mapStr = "addInteger(subInteger(" + drIndexColName
                                 + ", " + windowStruct.tempGBCols + "), 1)";
                    windowStruct.leftColInfo = windowStruct.leftColInfo.concat(newColStructs);
                    var mapStrs = Array(newColStructs.length).fill(mapStr);
                    return self.sqlObj.map(mapStrs, ret.newTableName,
                                           newColStructs.map(function(col) {
                                            return __getCurrentName(col);
                                           }));
                })
                // Join back temp table with rename
                .then(function(ret) {
                    windowStruct.leftTableName = origTableName;
                    windowStruct.node = node;
                    windowStruct.rightColInfo = windowStruct.leftColInfo;
                    windowStruct.leftColInfo = node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols);
                    var rightGBColStructs = [];
                    var rightGBColNames = __concatColInfoForSort(groupByCols,
                                            sortColsAndOrder).map(function(col) {
                                                return col.name;
                                            });
                    for (var i = 0; i < rightGBColNames.length; i++) {
                        for (var j = 0; j < windowStruct.rightColInfo.length; j++) {
                            if (__getCurrentName(windowStruct.rightColInfo[j])
                                === rightGBColNames[i]) {
                                rightGBColStructs.push(windowStruct.rightColInfo[j]);
                                break;
                            }
                        }
                    }
                    return __joinTempTable(self.sqlObj, ret,
                                           JoinOperatorT.InnerJoin,
                            __concatColInfoForSort(groupByCols,
                                sortColsAndOrder).map(function(col) {
                                    col.colName = col.name;
                                    col.colType = col.type;
                                    return col;
                                }), rightGBColStructs, windowStruct);
                })
                .then(function(ret) {
                    // add cli in window and move the new column
                    // from xcCols to usrCols
                    if (ret.tempCols) { // This needed or not depends on behavior of innerjoin
                        node.xcCols = node.xcCols.concat(ret.tempCols
                                        .map(function(colName) {
                                            return {colName: colName,
                                                    colType: "DfUnknown"}; // XXX xiApi temp columns
                                        }));
                    }
                    cli += windowStruct.cli;
                    if (!noUsrCol) {
                        node.usrCols = node.usrCols.concat(newColStructs);
                    }
                    for (var i = 0; i < newColStructs.length; i++) {
                        node.xcCols.splice(node.xcCols
                                   .indexOf(newColStructs[i]),1);
                    }
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
                                            + node.sparkCols.length > 500) {
                loopStruct.cli += ret.cli;
                colNameList = node.usrCols.map(function(col) {
                        return __getCurrentName(col);
                    });
                node.xcCols = [indexColStruct];
                colNameList.push(__getCurrentName(indexColStruct));
                self.sqlObj.project(colNameList,ret.newTableName)
                .then(function(ret) {
                    deferred.resolve(ret);
                })
                .fail(deferred.reject);
            } else {
                deferred.resolve(ret);
            }
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    function __generateFrameEvalString(opStruct, leftGBColStructs,
                rightGBColStructs, leftIndexStruct, rightIndexStruct,
                leftOrderColStructs, rightOrderColStructs) {
        var evalString = "";
        for (var i = 0; i < leftGBColStructs.length; i++) {
            var evalElement = "eq(" + __getCurrentName(leftGBColStructs[i])
                        + "," + __getCurrentName(rightGBColStructs[i]) + ")";
            if (evalString === "") {
                evalString = evalElement;
            } else {
                evalString = "and(" + evalString + "," + evalElement + ")";
            }
        }
        if (opStruct.frameInfo.typeRow) {
            if (opStruct.frameInfo.lower != undefined) {
                var evalElement = "ge(" + __getCurrentName(rightIndexStruct)
                                + ",add(" + __getCurrentName(leftIndexStruct)
                                + "," + opStruct.frameInfo.lower + "))";
                if (evalString === "") {
                    evalString = evalElement;
                } else {
                    evalString = "and(" + evalString + "," + evalElement + ")";
                }
            }
            if (opStruct.frameInfo.upper != undefined) {
                var evalElement = "le(" + __getCurrentName(rightIndexStruct)
                                + ",add(" + __getCurrentName(leftIndexStruct)
                                + "," + opStruct.frameInfo.upper + "))";
                if (evalString === "") {
                    evalString = evalElement;
                } else {
                    evalString = "and(" + evalString + "," + evalElement + ")";
                }
            }
        } else if (opStruct.frameInfo.lower || opStruct.frameInfo.upper) {
            assert(leftOrderColStructs.length === 1);
            var isAsc = leftOrderColStructs[0].ordering
                                === XcalarOrderingT.XcalarOrderingAscending;
            if (opStruct.frameInfo.lower != undefined) {
                var evalElement = (isAsc ? "ge(" : "le(") +
                __getCurrentName(rightOrderColStructs[0]) + (isAsc ? ",add(" : ",sub(")
                + __getCurrentName(leftOrderColStructs[0])  + "," +
                opStruct.frameInfo.lower + "))";
                if (evalString === "") {
                    evalString = evalElement;
                } else {
                    evalString = "and(" + evalString + "," + evalElement + ")";
                }
            }
            if (opStruct.frameInfo.upper != undefined) {
                var evalElement = (isAsc ? "le(" : "ge(") +
                __getCurrentName(rightOrderColStructs[0]) + (isAsc ? ",add(" : ",sub(")
                + __getCurrentName(leftOrderColStructs[0])  + "," +
                opStruct.frameInfo.upper + "))";
                if (evalString === "") {
                    evalString = evalElement;
                } else {
                    evalString = "and(" + evalString + "," + evalElement + ")";
                }
            }
        } else {
            for (var i = 0; i < leftOrderColStructs.length; i++) {
                var isAsc = leftOrderColStructs[i].ordering
                                    === XcalarOrderingT.XcalarOrderingAscending;
                if (opStruct.frameInfo.lower != undefined) {
                    var evalElement = (isAsc ? "ge(" : "le(") +
                                    __getCurrentName(rightOrderColStructs[i]) + ","
                                    + __getCurrentName(leftOrderColStructs[i]) + ")";
                    if (evalString === "") {
                        evalString = evalElement;
                    } else {
                        evalString = "and(" + evalString + "," + evalElement + ")";
                    }
                }
                if (opStruct.frameInfo.upper != undefined) {
                    var evalElement = (isAsc ? "le(" : "ge(") +
                                    __getCurrentName(rightOrderColStructs[i]) + ","
                                    + __getCurrentName(leftOrderColStructs[i]) + ")";
                    if (evalString === "") {
                        evalString = evalElement;
                    } else {
                        evalString = "and(" + evalString + "," + evalElement + ")";
                    }
                }
            }
        }
        return evalString;
    }

    function __handleMultiDimAgg(self, gbColNames, gbColTypes, gArray, tableName, expand) {
        var cli = "";
        var deferred = PromiseHelper.deferred();
        assert(gbColNames[gbColNames.length - 1] === "SPARK_GROUPING_ID",
                SQLErrTStr.BadGBCol + gbColNames[gbColNames.length - 1]);
        var gIdColName = __getCurrentName(expand.groupingColStruct);
        var curIndex = expand.groupingIds[0];
        var curI = 0;
        var tableInfos = [];
        var curPromise = PromiseHelper.resolve({cli: "", newTableName: tableName});
        for (var i = 0; i < expand.groupingIds.length; i++) {
            curPromise = curPromise.then(function(ret) {
                cli += ret.cli;
                options = {};
                curIndex = expand.groupingIds[curI];
                var tempGBColNames = [];
                var tempGArray = jQuery.extend(true, [], gArray);
                var nameMap = {};
                var mapStrs = [];
                var newColNames = [];
                for (var j = 0; j < gbColNames.length - 1; j++) {
                    if ((1 << (gbColNames.length - j - 2) & curIndex) === 0) {
                        tempGBColNames.push(gbColNames[j]);
                    } else {
                        mapStrs.push(gbColTypes[j] + "(div(1,0))");
                        newColNames.push(gbColNames[j]);
                    }
                }
                mapStrs.push("int(" + curIndex + ")");
                newColNames.push(gIdColName);

                // Column info for union
                var columns = [{name: gIdColName, rename: gIdColName,
                                type: "DfUnknown", cast: false}];
                for (var j = 0; j < gbColNames.length - 1; j++) {
                    columns.push({
                        name: gbColNames[j],
                        rename: gbColNames[j],
                        type: DfFieldTypeT.DfUnknown,
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

                curI++;

                return self.sqlObj.groupBy(tempGBColNames, tempGArray,
                    tableName, options)
                .then(function(ret) {
                    cli += ret.cli;
                    return self.sqlObj.map(mapStrs, ret.newTableName,
                                            newColNames);
                })
                .then(function(ret) {
                    tableInfos.push({
                        tableName: ret.newTableName,
                        columns: columns
                    });
                    return ret;
                });
            });
        }

        curPromise = curPromise.then(function(ret) {
            cli += ret.cli;
            return self.sqlObj.union(tableInfos, false);
        })
        .then(function(ret) {
            cli += ret.cli;
            deferred.resolve({newTableName: ret.newTableName, cli: cli});
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function __multGBHelper(self, gbColNames, gbColTypes,
                            gArrayList, tableName, node) {
        // Do group by separately for multi-operation and corss join
        var deferred = PromiseHelper.deferred();
        var gbTableNames = [];
        var gbTableColInfos = [];
        var cli = "";
        var curPromise = PromiseHelper.resolve();
        var index = 0;
        for (var i = 0; i < gArrayList.length; i++) {
            if (node.expand) {
                curPromise = curPromise.then(function(ret) {
                    return __handleMultiDimAgg(self, gbColNames, gbColTypes,
                                    gArrayList[index], tableName, node.expand);
                });
            } else {
                curPromise = curPromise.then(function(ret) {
                    return self.sqlObj.groupBy(gbColNames, gArrayList[index], tableName);
                });
            }
            curPromise = curPromise.then(function(ret) {
                cli += ret.cli;
                gbTableNames.push(ret.newTableName);
                var columnInfo = {tableName: ret.newTableName,
                                  columns: jQuery.extend(true, [], gbColNames)};
                for (var j = 0; j < gArrayList[index].length; j++) {
                    columnInfo.columns.push(gArrayList[index][j].newColName);
                }
                if (ret.tempCols) {
                    for (var j = 0; j < ret.tempCols.length; j++) {
                        if (typeof ret.tempCols[j] === "string") {
                            columnInfo.columns.push(ret.tempCols[j]);
                            node.xcCols.push({colName: ret.tempCols[j],
                                              colType: "DfUnknown"});
                        } else {
                            columnInfo.columns.push(__getCurrentName(ret.tempCols[j]));
                            node.xcCols.push(ret.tempCols[j]);
                        }
                    }
                }
                gbTableColInfos.push(columnInfo);
                index += 1;
                return ret;
            });
        }
        curPromise = PromiseHelper.resolve({newTableName: gbTableNames[0]});
        var joinType = JoinOperatorT.CrossJoin;
        index = 1;
        for (var i = 1; i < gbTableNames.length; i++) {
            var rightCols = [];
            curPromise = curPromise.then(function(ret) {
                gbTableColInfos[index].rename = [];
                var evalString = "";
                rightCols = [];
                gbTableColInfos[0].tableName = ret.newTableName;
                for (var j = 0; j < gbColNames.length; j++) {
                    var newColName = gbColNames[j] + "_" + index
                                     + Authentication.getHashId(3);
                    rightCols.push(newColName);
                    gbTableColInfos[index].rename.push({orig: gbColNames[j],
                                                        new: newColName});
                    if (evalString === "") {
                        evalString = "eq(" + gbColNames[j] + "," + newColName + ")";
                    } else {
                        evalString = "and(" + evalString + ",eq(" + gbColNames[j]
                                     + "," + newColName + "))";
                    }
                }
                for (var j = 0; j < gbTableColInfos[index].columns.length; j++) {
                    if (gbColNames.indexOf(gbTableColInfos[index].columns[j]) === -1) {
                        rightCols.push(gbTableColInfos[index].columns[j]);
                    }
                }
                var leftColInfo = {tableName: gbTableColInfos[0].tableName,
                                   columns: [],
                                   rename: gbTableColInfos[0].rename};
                var rightColInfo = {tableName: gbTableColInfos[index].tableName,
                                    columns: [],
                                    rename: gbTableColInfos[index].rename};
                return self.sqlObj.join(joinType, leftColInfo, rightColInfo,
                                        {evalString: evalString});
            })
            .then(function(ret) {
                cli += ret.cli;
                gbTableColInfos[0].columns = gbTableColInfos[0].columns.concat(rightCols);
                if (ret.tempCols) {
                    for (var j = 0; j < ret.tempCols.length; j++) {
                        if (typeof ret.tempCols[j] === "string") {
                            gbTableColInfos[0].columns.push(ret.tempCols[j]);
                            node.xcCols.push({colName: ret.tempCols[j],
                                              colType: "DfUnknown"});
                        } else {
                            gbTableColInfos[0].columns.push(__getCurrentName(ret.tempCols[j]));
                            node.xcCols.push(ret.tempCols[j]);
                        }
                    }
                }
                index += 1;
                return ret;
            })
        }
        curPromise.then(function(ret) {
            deferred.resolve({newTableName: ret.newTableName, cli: cli});
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    function __windowMapHelper(self, node, mapStrs, tableName, newColNames,
                                    newTableName, colNames, outerLoopStruct) {
        var deferred = PromiseHelper.deferred();
        var cli = "";
        var hasWindow = false;
        var hasMainMap = false;
        var nestMapStrs = [];
        var nestMapNames = [];
        var windowColStructs = [];
        // Check & form next level mapStrs
        var windowStruct = {lead: {},
                            nTile: {newCols: [], groupNums: []},
                            rowNumber: {newCols: []},
                            rank: {newCols: []},
                            percentRank: {newCols: []},
                            cumeDist: {newCols: []},
                            denseRank: {newCols: []}};
        for (var i = 0; i < mapStrs.length; i++) {
            var ret = __analyzeMapStr(mapStrs[i], windowStruct, newColNames[i], colNames);
            if (!ret.noMap) {
                hasMainMap = true;
            }
            if (!ret.noWindow) {
                hasWindow = true;
                mapStrs[i] = ret.mainMapStr;
                nestMapStrs = nestMapStrs.concat(ret.nestMapStrs);
                nestMapNames = nestMapNames.concat(ret.nestMapNames);
                windowColStructs = windowColStructs.concat(ret.windowColStructs);
            }
        }
        if (!hasWindow) {
            return self.sqlObj.map(mapStrs, tableName, newColNames, newTableName);
        } else {
            var curPromise;
            var loopStruct = {cli: "", node: node, self: self};
            loopStruct.groupByCols = [];
            if (outerLoopStruct) {
                loopStruct.indexColStruct = outerLoopStruct.indexColStruct;
                loopStruct.sortColsAndOrder = outerLoopStruct.sortColsAndOrder;
                curPromise = PromiseHelper.resolve({cli: "", newTableName: tableName});
            } else {
                var tableId = xcHelper.getTableId(tableName);
                if (typeof tableId === "string") {
                    tableId = tableId.toUpperCase();
                }
                loopStruct.indexColStruct = {colName: "XC_ROW_COL_" + tableId,
                                             colType: "int"};
                loopStruct.sortColsAndOrder = [{name: "XC_ROW_COL_" + tableId,
                                                type: "float",
                            ordering: XcalarOrderingT.XcalarOrderingAscending}];
                node.xcCols.push(loopStruct.indexColStruct);
                curPromise = self.sqlObj.genRowNum(tableName,
                                __getCurrentName(loopStruct.indexColStruct));
            }
            // First do lower level map & windows
            if (nestMapNames.length != 0) {
                var nestTableName = xcHelper.getTableName(newTableName) +
                                                Authentication.getHashId();
                curPromise = curPromise.then(function(ret) {
                    cli += ret.cli;
                    var nestMapNamesCopy = jQuery.extend(true, [], nestMapNames);
                    return __windowMapHelper(self, node, nestMapStrs, ret.newTableName,
                                nestMapNamesCopy, nestTableName, colNames, loopStruct);
                });
            }
            // Execute window
            curPromise = curPromise.then(function (ret) {
                nestMapNames.forEach(function(colName) {
                    node.xcCols.push({colName: colName, colType: "DfUnknown"});
                })
                return ret;
            })
            .then(function(ret) {
                var innerPromise = PromiseHelper.resolve(ret);
                if (windowStruct.rowNumber.newCols.length > 0) {
                    var rNCols = windowStruct.rowNumber.newCols;
                    windowStruct.rowNumber.newCols = [];
                    innerPromise = innerPromise.then(function(ret) {
                        var newRenames = __resolveCollision(loopStruct.node
                                    .usrCols.concat(loopStruct.node.xcCols)
                                    .concat(loopStruct.node.sparkCols), rNCols,
                                    [], [], "", ret.newTableName);
                        loopStruct.node.renamedCols =__combineRenameMaps(
                                    [loopStruct.node.renamedCols, newRenames]);
                        loopStruct.node.usrCols = loopStruct.node.usrCols.concat(rNCols);
                        loopStruct.cli += ret.cli;
                        return self.sqlObj.map(Array(rNCols.length).fill("int("
                            + __getCurrentName(loopStruct.indexColStruct) +")"),
                            ret.newTableName, rNCols.map(__getCurrentName));
                    })
                }
                for (item in windowStruct) {
                    if (item === "lead") {
                        if (!jQuery.isEmptyObject(windowStruct[item])) {
                            for (offset in windowStruct[item]) {
                                innerPromise = __windowExpressionHelper(loopStruct,
                                    innerPromise, item, windowStruct[item][offset]);
                            }
                        }
                    } else if (item === "first" || item === "last") {
                        windowStruct[item].forEach(function (obj) {
                            innerPromise = __windowExpressionHelper(loopStruct,
                                            innerPromise, item, obj);
                        })
                    } else if (windowStruct[item].newCols.length != 0) {
                        innerPromise = __windowExpressionHelper(loopStruct,
                                        innerPromise, item, windowStruct[item]);
                    }
                }
                return innerPromise.promise();
            })
            // Execute map
            if (hasMainMap) {
                curPromise = curPromise.then(function(ret) {
                    cli += loopStruct.cli;
                    cli += ret.cli;
                    windowColStructs.forEach(function(col) {
                        if (node.usrCols.indexOf(col) != -1) {
                            node.usrCols.splice(node.usrCols.indexOf(col), 1);
                        }
                    })
                    for (var i = 0; i < node.usrCols.length;) {
                        if (newColNames.indexOf(__getCurrentName(node.usrCols[i])) != -1) {
                            node.usrCols.splice(i, 1);
                        } else {
                            i++;
                        }
                    }
                    node.xcCols = node.xcCols.concat(windowColStructs);
                    while (mapStrs.indexOf("") != -1) {
                        newColNames.splice(mapStrs.indexOf(""), 1);
                        mapStrs.splice(mapStrs.indexOf(""), 1);
                    }
                    return self.sqlObj.map(mapStrs, ret.newTableName, newColNames, newTableName);
                })
                .then(function(ret) {
                    cli += ret.cli;
                    deferred.resolve({cli: cli, newTableName: ret.newTableName});
                })
                .fail(deferred.reject);
            } else {
                curPromise = curPromise.then(function(ret) {
                    cli += loopStruct.cli;
                    cli += ret.cli;
                    windowColStructs.forEach(function(col) {
                        if (node.usrCols.indexOf(col) != -1) {
                            node.usrCols.splice(node.usrCols.indexOf(col), 1);
                        }
                    })
                    for (var i = 0; i < node.usrCols.length;) {
                        if (newColNames.indexOf(__getCurrentName(node.usrCols[i])) != -1) {
                            node.usrCols.splice(i, 1);
                        } else {
                            i++;
                        }
                    }
                    deferred.resolve({cli: cli, newTableName: ret.newTableName});
                })
                .fail(deferred.reject);
            }
        }
        return deferred.promise();
    }

    function __analyzeMapStr(str, windowStruct, finalColName, colNames) {
        var retStruct = {};
        var findStar = function(str) {
            var find = false;
            var inPar = false;
            var i = 0;
            for (; i < str.length; i++) {
                if (str[i] === "*" && !inPar) {
                    find = true;
                    break;
                } else if (str[i] === '"') {
                    inPar = !inPar;
                }
            }
            if (!find) {
                return -1;
            } else {
                return i;
            }
        }
        if (findStar(str) === -1) {
            retStruct.mainMapStr = str;
            retStruct.noWindow = true;
        } else {
            retStruct.nestMapStrs = [];
            retStruct.nestMapNames = [];
            retStruct.windowColStructs = [];
            while (findStar(str) != -1) {
                var leftIndex = findStar(str);
                var rightIndex = str.substring(leftIndex).indexOf("(") + leftIndex;
                var opName = str.substring(leftIndex + 1, rightIndex);
                var tempColName;
                var tempColStruct;
                if (findStar(str) === 0) {
                    tempColName = finalColName;
                    retStruct.noMap = true;
                    tempColStruct = {colName: tempColName, colType: "DfUnknown"};
                } else {
                    tempColName = "XC_WINDOWMAP_" +
                                        Authentication.getHashId().substring(3);
                    while (colNames.has(tempColName)) {
                        tempColName = "XC_WINDOWMAP_" +
                                        Authentication.getHashId().substring(3);
                    }
                    colNames.add(tempColName);
                    tempColStruct = {colName: tempColName, colType: "DfUnknown"};
                    retStruct.windowColStructs.push(tempColStruct);
                }
                if (opName === "nTile") {
                    var innerLeft = rightIndex + 1;
                    rightIndex = str.substring(innerLeft).indexOf(")") + innerLeft;
                    windowStruct[opName].newCols.push(tempColStruct);
                    windowStruct[opName].groupNums
                                .push(str.substring(innerLeft, rightIndex));
                } else if (opName === "lead" || opName === "lag") {
                    rightIndex++;
                    var innerLeft = rightIndex;
                    var keyColType;
                    var args = [];
                    var defaultType = "value";
                    var inQuote = false;
                    var hasQuote = false;
                    var isFunc = false;
                    var hasDot = false;
                    var parCount = 1;
                    while (parCount != 0) {
                        var curChar = str[rightIndex];
                        rightIndex++;
                        if (curChar === '"') {
                            inQuote = !inQuote;
                            hasQuote = true;
                        } else if (inQuote) {
                            continue;
                        } else if (curChar === "(") {
                            parCount++;
                            isFunc = true;
                        } else if (curChar === ")") {
                            parCount--;
                        } else if (curChar === ".") {
                            hasDot = true;
                        }
                        if (curChar === "," && parCount === 1 || parCount === 0) {
                            var curArg = str.substring(innerLeft, rightIndex - 1);
                            defaultType = "value";
                            if (isFunc) {
                                var innerTempColName = "XC_WINDOWMAP_" +
                                        Authentication.getHashId().substring(3);
                                while (colNames.has(innerTempColName)) {
                                    innerTempColName = "XC_WINDOWMAP_" +
                                        Authentication.getHashId().substring(3);
                                }
                                colNames.add(innerTempColName);
                                args.push(innerTempColName);
                                retStruct.nestMapStrs.push(curArg);
                                retStruct.nestMapNames.push(innerTempColName);
                                defaultType = "function";
                            } else {
                                if (args.length === 0) {
                                    if (hasQuote) {
                                        keyColType = "string";
                                    } else if (hasDot) {
                                        keyColType = "float";
                                    } else if (!isNaN(curArg)) {
                                        keyColType = "int";
                                    }
                                }
                                args.push(curArg);
                                if (hasQuote) {
                                    defaultType = "string";
                                }
                            }
                            innerLeft = rightIndex;
                            isFunc = false;
                        }
                    }
                    assert(args.length === 3, "Lead/lag should have three arguments");
                    if (opName === "lag") {
                        args[1] = args[1] * -1;
                    }
                    if (windowStruct.lead[args[1]]) {
                        windowStruct.lead[args[1]].newCols.push(tempColStruct);
                        if (keyColType) {
                            windowStruct.lead[args[1]].keyCols.push(args[0]);
                        } else {
                            windowStruct.lead[args[1]].keyCols.push(
                                    {colName: args[0], colType: "DfUnknown"});
                        }
                        windowStruct.lead[args[1]].keyTypes.push(keyColType);
                        windowStruct.lead[args[1]].defaults.push(args[2]);
                        windowStruct.lead[args[1]].types.push(defaultType);
                    } else {
                        windowStruct.lead[args[1]] =
                                {newCols: [tempColStruct],
                                 keyCols: [{colName: args[0], colType: "DfUnknown"}],
                                 keyTypes: [keyColType],
                                 defaults: [args[2]],
                                 types: [defaultType],
                                 offset: args[1]};
                        if (keyColType) {
                            windowStruct.lead[args[1]].keyCols = [args[0]];
                        }
                    }
                    rightIndex--;
                } else {
                    // Other functions should take no argument: 'opName()'
                    rightIndex++;
                    assert(str[rightIndex] === ")", "Last char should be )");
                    windowStruct[opName].newCols.push(tempColStruct);
                }
                if (retStruct.noMap) {
                    str = "";
                } else {
                    str = str.substring(0, leftIndex) + tempColName
                                        + str.substring(rightIndex + 1);
                }
            }
            retStruct.mainMapStr = str;
        }
        return retStruct;
    }

    function extractUsedCols(node) {
        var colIds = [];
        function findColIds(node) {
            var opName = node.value.class.substring(
                            node.value.class.lastIndexOf(".") + 1);
            if (opName === "Or" || opName === "Concat" || opName === "IsNotNull"
                || opName === "ScalarSubquery" || opName === "IsNull"
                || opName === "EqualNullSafe") {
                return;
            } else if (opName === "AttributeReference") {
                colIds.push(node.value.exprId.id);
            }
            for (var i = 0; i < node.children.length; i++) {
                findColIds(node.children[i]);
            }
        }
        if (node.value.condition) {
            var dupCondition = jQuery.extend(true, [], node.value.condition);
            var tree = SQLCompiler.genTree(undefined, dupCondition);
            findColIds(tree);
        }
        node.usedColIds = node.usedColIds.concat(colIds);
    }

    function trackRenamedUsedCols(node) {
        var renameIdsMap = {};
        var mapList;
        if (node.value.class === "org.apache.spark.sql.catalyst.plans.logical.Project") {
            mapList = node.value.projectList;
        } else {
            mapList = node.value.aggregateExpressions;
        }
        for (var i = 0; i < mapList.length; i++) {
            if (mapList[i].length === 2 && mapList[i][0].class ===
                "org.apache.spark.sql.catalyst.expressions.Alias" &&
                mapList[i][1].class ===
                "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
                var aliasId = mapList[i][0].exprId.id;
                var origId = mapList[i][1].exprId.id;
                renameIdsMap[origId] = renameIdsMap[origId] || [];
                renameIdsMap[origId].push(aliasId);
            }
        }
        for (origId in renameIdsMap) {
            var valid = true;
            for (var i = 0; i < renameIdsMap[origId].length; i++) {
                if (node.usedColIds.indexOf(renameIdsMap[origId][i]) === -1) {
                    valid = false;
                    break;
                }
            }
            if (valid) {
                node.usedColIds.push(Number(origId));
            }
        }
    }

    function prepareUsedColIds(node) {
        if (!node.usedColIds) {
            node.usedColIds = [];
        }
        var treeNodeClass = node.value.class.substring(
            "org.apache.spark.sql.catalyst.plans.logical.".length);
        if (treeNodeClass === "Join" || treeNodeClass === "Filter") {
            extractUsedCols(node);
        } else if (treeNodeClass === "Project" || treeNodeClass === "Aggregate") {
            trackRenamedUsedCols(node);
        }
        for (var i = 0; i < node.children.length; i++) {
            node.children[i].usedColIds = node.usedColIds;
            prepareUsedColIds(node.children[i]);
        }
    }

    function removeExtraExists(node, usedColIds) {
        var subtrees = [];
        // Copied from secondTraverse
        function andNode() {
            return new TreeNode({
                "class": "org.apache.spark.sql.catalyst.expressions.And",
                "num-children": 2
            });
        }
        function getFragments(node) {
            var opName = node.value.class.substring(
                            node.value.class.lastIndexOf(".") + 1);
            if (opName === "IsNotNull") {
                if (node.children[0].value.class !=
                "org.apache.spark.sql.catalyst.expressions.AttributeReference"
                || usedColIds.indexOf(node.children[0].value.exprId.id) === -1) {
                    subtrees.push(node);
                }
            } else if (opName === "And") {
                getFragments(node.children[0]);
                getFragments(node.children[1]);
            } else {
                subtrees.push(node);
            }
        }
        getFragments(node);
        if (subtrees.length === 0) {
            return undefined;
        } else if (subtrees.length === 1) {
            return subtrees[0];
        } else {
            var retNode = andNode();
            var curNode = retNode;
            curNode.children[0] = subtrees[0];
            for (var i = 1; i < subtrees.length - 1; i++) {
                var tempNode = andNode();
                curNode.children[1] = tempNode;
                tempNode.children[0] = subtrees[i];
                curNode = tempNode;
            }
            curNode.children[1] = subtrees[subtrees.length - 1];
            return retNode;
        }
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
                        assert(condTree.children.length === 0,
                               SQLErrTStr.AggTreeShouldCut);
                        assert(acc, SQLErrTStr.AggTreeShouldHaveAcc);
                        assert(acc.aggEvalStrArray, SQLErrTStr.AccShouldHaveEval);

                        // It's very important to include a flag in acc.
                        // This is what we are relying on to generate the
                        // string. Otherwise it will assign it to
                        // acc.operator
                        var aggAcc = {numOps: 0, noAssignOp: true};
                        var aggEvalStr = genEvalStringRecur(condTree.aggTree,
                                            aggAcc, options);
                        var prefix = options.prefix || "";
                        var aggVarName = prefix + "XC_AGG_" +
                                    Authentication.getHashId().substring(3);
                        var countType;
                        if (condTree.aggTree.value.class ===
                        "org.apache.spark.sql.catalyst.expressions.aggregate.Count") {
                            countType = getColType(condTree.aggTree.children[0]);
                        }
                        acc.aggEvalStrArray.push({aggEvalStr: aggEvalStr,
                                                  aggVarName: aggVarName,
                                                  numOps: aggAcc.numOps,
                                                  countType: countType,
                                    colType: getColType(condTree.aggTree)});
                        if (options && options.xcAggregate) {
                            outStr += "^";
                        }
                        outStr += aggVarName;
                    } else {
                        assert(condTree.children.length > 0, SQLErrTStr.CondTreeChildren);
                    }
                } else {
                    if (acc) {
                        // Conversion of max/min/sum
                        var opString = opLookup[opName];
                        if (opString === "max" || opString === "min") {
                            switch (condTree.colType) {
                                case ("int"):
                                case ("bool"):
                                    opString += "Integer";
                                    break;
                                case ("string"):
                                    opString += "String";
                                    break;
                                case ("timestamp"):
                                    opString += "Timestamp";
                                    break;
                                case ("float"):
                                    opString += "Float";
                                    break;
                                default:
                                    break;
                            }
                        } else if (opString === "sum" && condTree.colType === "int") {
                            opString += "Integer";
                        }
                        if (acc.noAssignOp) {
                            acc.numOps += 1;
                            outStr += opString + "(";
                            hasLeftPar = true;
                        } else {
                            acc.operator = opString;
                            if (opString === "first" || opString === "last") {
                                if (condTree.children[1].value.value == null) {
                                    acc.arguments = ["false"];
                                } else {
                                acc.arguments = [condTree.children[1].value.value];
                                }
                                condTree.value["num-children"] = 1;
                            }
                            if (options.xcAggregate) {
                                outStr += opString + "(";
                                hasLeftPar = true;
                            }
                        }
                    } else {
                        // Conversion of max/min/sum
                        var opString = opLookup[opName];
                        if (opString === "max" || opString === "min") {
                            switch (condTree.colType) {
                                case ("int"):
                                case ("bool"):
                                    opString += "Integer";
                                    break;
                                case ("string"):
                                    opString += "String";
                                    break;
                                case ("timestamp"):
                                    opString += "Timestamp";
                                    break;
                                case ("float"):
                                    opString += "Float";
                                    break;
                                default:
                                    break;
                            }
                        } else if (opString === "sum" && condTree.colType === "int") {
                            opString += "Integer";
                        }
                        outStr += opString + "(";
                        hasLeftPar = true;
                    }
                }
            } else if (opName.indexOf(".ScalarSubquery") > -1) {
                // Subquery should have subqueryTree and no child
                assert(condTree.children.length === 0, SQLErrTStr.SubqueryNoChild);
                assert(condTree.subqueryTree, SQLErrTStr.SubqueryTree);
                assert(acc.subqueryArray, SQLErrTStr.AccSubqueryArray);
                var prefix = options.prefix || "";
                var subqVarName = prefix + "XC_SUBQ_" +
                                    Authentication.getHashId().substring(3);
                condTree.subqueryTree.subqVarName = subqVarName;
                acc.subqueryArray.push({subqueryTree: condTree.subqueryTree});
                outStr += "^" + subqVarName;
            } else {
                if (acc && acc.hasOwnProperty("numOps")) {
                    acc.numOps += 1;
                }
                if (opName === "expressions.XCEPassThrough") {
                    assert(condTree.value.name !== undefined, SQLErrTStr.UDFNoName);
                    if (condTree.value.name.indexOf("xdf_") === 0) {
                        assert(condTree.value.name != "xdf_explodeString",
                                                SQLErrTStr.XdfExplodeString);
                        outStr += condTree.value.name.substring(4) + "(";
                    } else {
                        outStr += "sql:" + condTree.value.name + "(";
                    }
                    hasLeftPar = true;
                    if (acc.hasOwnProperty("udfs")) {
                        acc.udfs.push(condTree.value.name.toUpperCase());
                    }
                } else {
                    // Conversion of if
                    var opString = opLookup[opName];
                    if (opString === "if") {
                        switch (condTree.colType) {
                            case ("int"):
                            case ("bool"):
                                opString = "ifInt";
                                break;
                            case ("string"):
                                opString = "ifStr";
                                break;
                            case ("timestamp"):
                                opString = "ifTimestamp";
                                break;
                            default:
                                break;
                        }
                    }
                    outStr += opString + "(";
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
                if (condTree.value.value == null) {
                    outStr += convertSparkTypeToXcalarType(
                                    condTree.value.dataType) + "(None)";
                } else if (condTree.value.dataType === "string" ||
                    condTree.value.dataType === "calendarinterval") {
                    outStr += '"' + condTree.value.value + '"';
                } else if (condTree.value.dataType === "timestamp" ||
                           condTree.value.dataType === "date") {
                    outStr += 'timestamp("' + condTree.value.value + '")';
                } else if (condTree.value.dataType.indexOf("decimal(") === 0) {
                    outStr += 'numeric(\'' + condTree.value.value + '\')';
                } else {
                    // XXX Check how they rep booleans
                    outStr += condTree.value.value;
                }
            }
            assert(condTree.value["num-children"] === 0,
                   SQLErrTStr.NonOpShouldHaveNoChildren);
        }
        return outStr;
    }

    function genMapArray(evalList, columns, evalStrArray, aggEvalStrArray,
                         options, subqueryArray) {
        // A map to check if there is duplicate column pull out
        var dupCols = {};

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
                    "org.apache.spark.sql.catalyst.expressions.Alias",
                    SQLErrTStr.FirstChildAlias);
                    var treeNode = SQLCompiler.genExpressionTree(undefined,
                        evalList[i].slice(1), genTreeOpts);
                }
                var countType = undefined;
                if (treeNode.value.class ===
                    "org.apache.spark.sql.catalyst.expressions.aggregate.AggregateExpression" &&
                treeNode.children[0].value.class ===
                    "org.apache.spark.sql.catalyst.expressions.aggregate.Count") {
                    countType = getColType(treeNode.children[0].children[0]);
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
                newColName = cleanseColName(replaceUDFName(newColName, acc.udfs));
                colStruct.colName = newColName;
                colStruct.colType = getColType(treeNode);
                var retStruct = {newColName: newColName,
                                 evalStr: evalStr,
                                 numOps: acc.numOps,
                                 colId: colStruct.colId,
                                 countType: countType,
                                 colType: getColType(treeNode)};

                if (acc.isDistinct) {
                    retStruct.isDistinct = true;
                }

                if (options && options.operator) {
                    retStruct.operator = acc.operator;
                    retStruct.arguments = acc.arguments;
                }
                if (evalList[i].length === 2 && (!options || !options.groupby)
                    && (evalList[i][1].class ===
                    "org.apache.spark.sql.catalyst.expressions.AttributeReference"
                    || evalList[i][1].class ===
                    "org.apache.spark.sql.catalyst.expressions.Literal")) {
                    // This is a special alias case
                    assert(evalList[i][1].dataType, SQLErrTStr.NoDataType);
                    if (evalList[i][1].dataType !== "timestamp" &&
                        evalList[i][1].dataType !== "date" &&
                        evalList[i][1].value !== null) {
                        var dataType = convertSparkTypeToXcalarType(
                                                    evalList[i][1].dataType);
                        retStruct.evalStr = dataType + "(" +retStruct.evalStr + ")";
                    }
                    retStruct.numOps += 1;
                }
                evalStrArray.push(retStruct);
            } else {
                var curColStruct = evalList[i][0];
                assert(curColStruct.class ===
                "org.apache.spark.sql.catalyst.expressions.AttributeReference",
                SQLErrTStr.EvalOnlyChildAttr);
                if (curColStruct.name.indexOf(tablePrefix) >= 0) {
                    // Skip XC_TABLENAME_XXX
                    continue;
                }
                colStruct.colName = cleanseColName(curColStruct.name);
                colStruct.colId = curColStruct.exprId.id;
                colStruct.colType = convertSparkTypeToXcalarType(curColStruct.dataType);
                if (options && options.renamedCols &&
                    options.renamedCols[colStruct.colId]) {
                    colStruct.rename = options.renamedCols[colStruct.colId];
                }
            }
            if (colStruct.colId && dupCols[colStruct.colId] > 0) {
                dupCols[colStruct.colId]++;
            } else {
                dupCols[colStruct.colId] = 1;
                columns.push(colStruct);
            }
        }
        for (colId in dupCols) {
            if (dupCols[colId] === 1) {
                delete dupCols[colId];
            } else {
                dupCols[colId]--;
            }
        }
        options.dupCols = dupCols;
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

    // XXX replace is never used
    function extractAndReplace(aggEvalObj, replace) {
        if (aggEvalObj.numOps === 0) {
            return;
        }
        var evalStr = aggEvalObj.aggEvalStr;
        var leftBracketIndex = evalStr.indexOf("(");
        var rightBracketIndex = evalStr.lastIndexOf(")");
        var firstOp = evalStr.substring(0, leftBracketIndex);
        var inside;
        var retStruct = {};
        if (firstOp === "first" || firstOp === "last") {
            inside = evalStr.substring(leftBracketIndex + 1,
                                            evalStr.lastIndexOf(","));
            retStruct.arguments = [evalStr.substring(evalStr.lastIndexOf(",")
                                        + 1, rightBracketIndex)];
        } else {
            inside = evalStr.substring(leftBracketIndex + 1,
                                            rightBracketIndex);
        }
        if (replace) {
            retStruct.replaced = firstOp + "(" + replace + ")";
        }
        retStruct.firstOp = firstOp;
        retStruct.inside = inside;
        return retStruct;
    }

    // Not used currently
    // function getTablesInSubtree(tree) {
    //     function getTablesRecur(subtree, tablesSeen) {
    //         if (subtree.value.class ===
    //             "org.apache.spark.sql.execution.LogicalRDD") {
    //             if (!(subtree.newTableName in tablesSeen)) {
    //                 tablesSeen.push(subtree.newTableName);
    //             }
    //         }
    //         for (var i = 0; i < subtree.children.length; i++) {
    //             getTablesRecur(subtree.children[i], tablesSeen);
    //         }
    //     }
    //     var allTables = [];
    //     getTablesRecur(tree, allTables);
    //     return allTables;
    // }

    // function getQualifiersInSubtree(tree) {
    //     var tablesSeen = [];
    //     function getQualifiersRecur(subtree) {
    //         if (subtree.value.class ===
    //            "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
    //             if (!(subtree.value.qualifier in tablesSeen)) {
    //                 tablesSeen.push(subtree.value.qualifier);
    //             }
    //         }
    //         for (var i = 0; i < subtree.children.length; i++) {
    //             getQualifiersRecur(subtree.children[i]);
    //         }
    //     }
    //     getQualifiersRecur(tree);
    //     return tablesSeen;
    // }

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
        if (typeof dataType !== "string") {
            console.error(SQLErrTStr.UnsupportedColType + JSON.stringify(dataType));
            return "string";
            // assert(0, SQLErrTStr.UnsupportedColType + JSON.stringify(dataType));
        }
        if (dataType.indexOf("decimal(") != -1) {
            return "numeric";
        }
        switch (dataType) {
            case ("double"):
            case ("float"):
                return "float";
            case ("integer"):
            case ("long"):
            case ("short"):
            case ("byte"):
            case ("null"):
                return "int";
            case ("boolean"):
                return "bool";
            case ("string"):
                return "string";
            case ("date"):
            case ("timestamp"):
                return "timestamp";
            default:
                assert(0, SQLErrTStr.UnsupportedColType + dataType);
                return "string";
        }
    }

    function cleanseColName(name, isNewCol) {
        if (isNewCol) {
            name = xcHelper.stripPrefixInColName(name);
        }
        return xcHelper.stripColName(name, true, true).toUpperCase();
    }

    function replaceUDFName(name, udfs) {
        var i = 0;
        var re = new RegExp(passthroughPrefix, "g");
        return name.toUpperCase().replace(re, function(match) {
            if (i === udfs.length) {
                // Should always match, otherwise throw an error
                assert(0, SQLErrTStr.UDFColumnMismatch);
                return match;
            }
            return udfs[i++];
        });
    }

    function getColType(item) {
        try {
            if (!item.colType) {
                return;
            } else {
                if (item.colType instanceof Object && getColType(item.colType)) {
                    item.colType = getColType(item.colType);
                }
                return item.colType;
            }
        } catch (e) {
            return "DfUnknown";
        }
    }

    var opOutTypeLookup = {
        "abs": "float",
        "absNumeric": "numeric",
        "absInt": "int",
        "add": "float",
        "addInteger": "int",
        "addNumeric": "numeric",
        "ceil": "float",
        "div": "float",
        "divNumeric": "numeric",
        "exp": "float",
        "floatCompare": "int",
        "floor": "float",
        "log": "float",
        "log10": "float",
        "log2": "float",
        "mod": "int",
        "mult": "float",
        "multInteger": "int",
        "multNumeric": "numeric",
        "pow": "float",
        "round": "float",
        "sqrt": "float",
        "sub": "float",
        "subInteger": "int",
        "subNumeric": "numeric",
        "bitCount": "int",
        "bitLength": "int",
        "bitand": "int",
        "bitlshift": "int",
        "bitor": "int",
        "bitrshift": "int",
        "bitxor": "int",
        "colsDefinedBitmap": "int",
        "octetLength": "int",
        "and": "bool",
        "between": "bool",
        "contains": "bool",
        "endsWith": "bool",
        "eq": "bool",
        "eqNonNull": "bool",
        "exists": "bool",
        "ge": "bool",
        "gt": "bool",
        "in": "bool",
        "isBoolean": "bool",
        "isFloat": "bool",
        "isInf": "bool",
        "isInteger": "bool",
        "isNull": "bool",
        "isNumeric": "numeric",
        "isString": "bool",
        "le": "bool",
        "like": "bool",
        "lt": "bool",
        "neq": "bool",
        "not": "bool",
        "or": "bool",
        "regex": "bool",
        "startsWith": "bool",
        // "convertDate": "string",
        // "convertFromUnixTS": "String",
        // "convertToUnixTS": "int",
        // "dateAddDay": "string",
        // "dateAddInterval": "string",
        // "dateAddMonth": "string",
        // "dateAddYear": "string",
        // "dateDiffday": "int",
        // "ipAddrToInt": "int",
        // "macAddrToInt": "int",
        "dhtHash": "int",
        "genRandom": "int",
        "genUnique": "int",
        "ifInt": "int",
        "ifStr": "string",
        "ifTimestamp": "timestamp",
        "ifNumeric": "numeric",
        "xdbHash": "int",
        "ascii": "int",
        "chr": "string",
        "concat": "string",
        "concatDelim": "string",
        "countChar": "int",
        "cut": "string",
        "explodeString": "string",
        "find": "int",
        "findInSet": "int",
        "formatNumber": "string",
        "initCap": "string",
        "len": "int",
        "levenshtein": "int",
        "lower": "string",
        "repeat": "string",
        "replace": "string",
        "rfind": "int",
        "soundEx": "string",
        "stringLPad": "string",
        "stringRPad": "string",
        "stringReverse": "string",
        "stringsPosCompare": "bool",
        "strip": "string",
        "stripLeft": "string",
        "stripRight": "string",
        "substring": "string",
        "substringIndex": "string",
        "upper": "string",
        "wordCount": "int",
        "addDateInterval": "timestamp",
        "addIntervalString": "timestamp",
        "addtimeInterval": "timestamp",
        "convertFromUnixTS": "string",
        "convertTimezone": "timestamp",
        "dateDiff": "int",
        "datePart": "int",
        "dateTrunc": "timestamp",
        "dayOfYear": "int",
        "lastDayOfMonth": "timestamp",
        "monthsBetween": "float",
        "nextDay": "timestamp",
        "timePart": "int",
        "weekOfYear": "int",
        "acos": "float",
        "acosh": "float",
        "asin": "float",
        "asinh": "float",
        "atan": "float",
        "atan2": "float",
        "atanh": "float",
        "cos": "float",
        "cosh": "float",
        "degrees": "float",
        "pi": "float",
        "radians": "float",
        "sin": "float",
        "sinh": "float",
        "tan": "float",
        "tanh": "float",
        "bool": "bool",
        "float": "float",
        "int": "int",
        "numeric": "numeric",
        "string": "string",
        "timestamp": "timestamp",
        // "default:dayOfWeek": "string",
        // "default:dayOfYear": "string",
        // "default:weekOfYear": "string",
        // "default:timeAdd": "string",
        // "default:timeSub": "string",
        // "default:toDate": "string",
        // "default:convertToUnixTS": "string",
        // "default:toUTCTimestamp": "string",
        // "default:convertFormats": "string",
        // "default:convertFromUnixTS": "string",
        "avg": "float",
        "avgNumeric": "numeric",
        "count": "int",
        "listAgg": "string",
        "maxFloat": "float",
        "maxInteger": "int",
        "maxNumeric": "numeric",
        "maxString": "string",
        "maxTimestamp": "timestamp",
        "minFloat": "float",
        "minInteger": "int",
        "minNumeric": "numeric",
        "minString": "string",
        "minTimestamp": "timestamp",
        "sum": "float",
        "sumInteger": "int",
        "sumNumeric": "numeric",
        "stdevp": "float",
        "stdev": "float",
        "varp": "float",
        "var": "float"
    }

    // Not used currently
    // function isMathOperator(expression) {
    //     var mathOps = {
    //         // arithmetic.scala
    //         "expressions.UnaryMinus": null,
    //         "expressions.UnaryPositive": null,
    //         "expressions.Abs": "abs",
    //         "expressions.Add": "add",
    //         "expressions.Subtract": "sub",
    //         "expressions.Multiply": "mult",
    //         "expressions.Divide": "div",
    //         "expressions.Remainder": "mod",
    //         "expressions.Pmod": null,
    //         "expressions.Least": null,
    //         "expressions.Greatest": null,
    //         // mathExpressions.scala
    //         "expressions.EulerNumber": null,
    //         "expressions.Pi": "pi",
    //         "expressions.Acos": "acos",
    //         "expressions.Asin": "asin",
    //         "expressions.Atan": "atan",
    //         "expressions.Cbrt": null,
    //         "expressions.Ceil": "ceil",
    //         "expressions.Cos": "cos",
    //         "expressions.Cosh": "cosh",
    //         "expressions.Conv": null,
    //         "expressions.Exp": "exp",
    //         "expressions.Expm1": null,
    //         "expressions.Floor": "floor",
    //         "expressions.Factorial": null,
    //         "expressions.Log": "log",
    //         "expressions.Log2": "log2",
    //         "expressions.Log10": "log10",
    //         "expressions.Log1p": null,
    //         "expressions:Rint": null,
    //         "expressions.Signum": null,
    //         "expressions.Sin": "sin",
    //         "expressions.Sinh": "sinh",
    //         "expressions.Sqrt": "sqrt",
    //         "expressions.Tan": "tan",
    //         "expressions.Cot": null,
    //         "expressions.Tanh": "tanh",
    //         "expressions.ToDegrees": "degrees",
    //         "expressions.ToRadians": "radians",
    //         "expressions.Bin": null,
    //         "expressions.Hex": null,
    //         "expressions.Unhex": null,
    //         "expressions.Atan2": "atan2",
    //         "expressions.Pow": "pow",
    //         "expressions.ShiftLeft": "bitlshift",
    //         "expressions.ShiftRight": "bitrshift",
    //         "expressions.ShiftRightUnsigned": null,
    //         "expressions.Hypot": null,
    //         "expressions.Logarithm": null,
    //         "expressions.Round": "round",
    //         "expressions.BRound": null,
    //     };
    //     if (expression.substring("org.apache.spark.sql.catalyst.".length) in
    //         mathOps) {
    //         return true;
    //     } else {
    //         return false;
    //     }
    // }
    function parseError() {
        var errorMsg;
        if (arguments.length === 1) {
            if (typeof(arguments[0]) === "string") {
                errorMsg = arguments[0];
                if (errorMsg.indexOf("exceptionMsg") > -1 &&
                    errorMsg.indexOf("exceptionName") > -1) {
                    var errorObj = JSON.parse(errorMsg);
                    errorMsg = errorObj.exceptionName.substring(
                               errorObj.exceptionName
                                         .lastIndexOf(".") + 1) + "\n" +
                               errorObj.exceptionMsg;
                }
            } else {
                var errorObj = arguments[0];
                // XXX Error parsing is bad. Needs to be fixed
                if (errorObj && errorObj.responseJSON) {
                    var exceptionMsg = errorObj.responseJSON
                                               .exceptionMsg;
                    errorMsg = exceptionMsg;
                } else if (errorObj && errorObj.status === 0) {
                    errorMsg = SQLErrTStr.FailToConnectPlanner;
                } else if (errorObj && errorObj.error) {
                    errorMsg = errorObj.error;
                }
            }
        } else {
            errorMsg = JSON.stringify(arguments);
        }
        return errorMsg;
    }

    if (typeof exports !== "undefined") {
        exports.SQLCompiler = SQLCompiler;
    } else {
        root.SQLCompiler = SQLCompiler;
    }
}());

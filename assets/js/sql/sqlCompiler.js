window.SQLCompiler = (function(SQLCompiler, $) {
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
        // conditionalExpressions.scala
        "expressions.If": ["if", "ifStr"], // XXX please verify
        "expressions.CaseWhen": null,
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
        "expressions.In": "contains", // XXX reverse order
        "expressions.And": "and",
        "expressions.Or": "or",
        "expressions.EqualTo": "eq",
        "expressions.EqualNullSafe": "eq",
        "expressions.LessThan": "lt",
        "expressions.LessThanOrEqual": "le",
        "expressions.GreaterThan":  "gt",
        "expressions.GreaterThanOrEqual": "ge",
        // randomExpressions.scala,
        "expressions.Rand": "genRandom", // XXX a little different
        "expressions.Randn": null,
        // regexoExpressions.scala
        "expressions.like": "like",
        "expressions.RLike": "regex",
        "expressions.StringSplit": null,
        "expressions.RegExpReplace": null,
        "expressions.RegExpExtract": null,
        // stringExpressions.scala
        "expressions.Concat": "concat",
        "expressions.ConcatWs": null,
        "expressions.Elt": null,
        "expressions.Upper": "upper",
        "expressions.Lower": "lower",
        "expressions.StringReplace": "replace",
        "expressions.StringTranslate": null,
        "expressions.FindInSet": null,
        "expressions.StringTrim": "strip",
        "expressions.StringTrimLeft": null,
        "expressions.StringTrimRight": null,
        "expressions.StringInstr": "find", // XXX 1-based index
        "expressions.SubstringIndex": null,
        "expressions.StringLocate": "find", // XXX 1-based index
        "expressions.StringLPad": null,
        "expressions.StringRPad": null,
        "expressions.ParseUrl": null,
        "expressions.FormatString": null,
        "expressions.InitCap": null,
        "expressions.StringRepeat": null,
        "expressions.StringReverse": null,
        "expressions.StringSpace": null,
        "expressions.Substring": "substring", // XXX 1-based index
        "expressions.Right": null,
        "expressions.Left": null,
        "expressions.Length": "len",
        "expressions.BitLength": null,
        "expressions.OctetLength": null,
        "expressions.Levenshtein": null,
        "expressions.SoundEx": null,
        "expressions.Ascii": null,
        "expressions.Chr": null,
        "expressions.Base64": null,
        "expressions.UnBase64": null,
        "expressions.Decode": null,
        "expressions.Encode": null,
        "expressions.FormatNumber": null,
        "expressions.Sentences": null,
        "expressions.IsNotNull": "exists",
    };
    var xcSQLObj;

    function assert(st) {
        if (!st) {
            debugger;
            console.error("ASSERTION FAILURE!");
        }
    }

    function TreeNode(value) {
        if (value.class === "org.apache.spark.sql.execution.LogicalRDD") {
            // These are leaf nodes
            // Find the RDD that has a name XC_TABLENAME_ prefix
            var rdds = value.output;
            var prefix = "XC_TABLENAME_";
            for (var i = 0; i < rdds.length; i++) {
                if (rdds[i][0].name.indexOf(prefix) === 0) {
                    this.newTableName = rdds[i][0].name.substring(prefix.length);
                    break;
                }
            }
        }
        this.value = value;
        this.parent = [];
        this.children = [];
        return (this);
    }

    SQLCompiler.genTree = function(parent, array) {
        var newNode = new TreeNode(array.shift());
        if (parent) {
            newNode.parent = parent;
        }
        for (var i = 0; i < newNode.value["num-children"]; i++) {
            newNode.children.push(SQLCompiler.genTree(newNode, array));
        }
        return newNode;
    };

    SQLCompiler.compile = function(jsonArray) {
        xcSQLObj = new SQLApi();
        var tree = SQLCompiler.genTree(undefined, jsonArray);
        var promiseArray = [];
        function traverseAndPushDown(node) {
            for (var i = 0; i < node.children.length; i++) {
                traverseAndPushDown(node.children[i]);
            }
            if (node.value.class.indexOf("org.apache.spark.sql.catalyst.plans.logical.") === 0) {
                promiseArray.push(pushDown.bind(this, node));
            }
        }
        function pushDown(treeNode) {
            var deferred = jQuery.Deferred();
            var retStruct;
            switch(treeNode.value.class) {
                case("org.apache.spark.sql.catalyst.plans.logical.Project"):
                    retStruct = pushDownProject(treeNode);
                    break;
                case("org.apache.spark.sql.catalyst.plans.logical.Filter"):
                    retStruct = pushDownFilter(treeNode);
                    break;
                case("org.apache.spark.sql.catalyst.plans.logical.Join"):
                    retStruct = pushDownJoin(treeNode);
                    break;
                case("org.apache.spark.sql.catalyst.plans.logical.Sort"):
                    retStruct = pushDownSort(treeNode);
                    break;
                case("org.apache.spark.sql.catalyst.plans.logical.Aggregate"):
                    retStruct = pushDownAggregate(treeNode);
                    break;
                case("org.apache.spark.sql.catalyst.plans.logical.LocalLimit"):
                    retStruct = pushDownLocalLimit(treeNode);
                    break;
                case("org.apache.spark.sql.catalyst.plans.logical.GlobalLimit"):
                    retStruct = pushDownGlobalLimit(treeNode);
                    break;
                default:
                    break;
            }
            retStruct
            .then(function(ret) {
                if (ret.newTableName) {
                    treeNode.newTableName = ret.newTableName;
                }
                treeNode.xccli = ret.cli;
                deferred.resolve();
            })
            .fail(deferred.reject);
            return deferred.promise();
        }

        function getCli(node, cliArray) {
            for (var i = 0; i < node.children.length; i++) {
                getCli(node.children[i], cliArray);
            }
            if (node.value.class.indexOf("org.apache.spark.sql.catalyst.plans.logical.") === 0) {
                cliArray.push(node.xccli);
            }
        }

        traverseAndPushDown(tree);
        PromiseHelper.chain(promiseArray)
        .then(function() {
            // Tree has been augmented with xccli
            var cliArray = [];
            getCli(tree, cliArray);
            console.log(cliArray.join("\n"));
        });
    };

    function pushDownProject(node) {
        // Pre: Project must only have 1 child and its child should've been
        // resolved already 
        assert(node.children.length === 1);
        tableName = node.children[0].newTableName;
        // Find columns to project
        var columns = [];
        for (var i = 0; i<node.value.projectList.length; i++) {
            var colNameStruct = node.value.projectList[i][0];
            assert(colNameStruct.class === "org.apache.spark.sql.catalyst.expressions.AttributeReference");
            var colName = colNameStruct.name;
            columns.push(colName);
        }
        
        return xcSQLObj.project(columns, tableName);
    }

    function pushDownFilter(node) {
        assert(node.children.length === 1);
        function genFilterString(condArray) {
            function genFilterStringRecur(condTree) {
                // Traverse and construct tree
                var outStr = "";
                var opName = condTree.value.class.substring(condTree.value.class.indexOf("expressions."));
                if (opName in opLookup) {
                    if (opName !== "expressions.Cast") {
                        outStr += opLookup[opName] + "(";
                    } // For Cast, we only add the operator on the child
                    for (var i = 0; i < condTree.value["num-children"]; i++) {
                        outStr += genFilterStringRecur(condTree.children[i]);
                        if (i < condTree.value["num-children"] -1) {
                            outStr += ",";
                        }
                    }
                    outStr += ")";
                } else {
                    var parentOpName = condTree.parent.value.class.substring(condTree.value.class.indexOf("expressions."));
                    if (parentOpName === "expressions.Cast") {
                        switch (condTree.value.dataType) {
                            case ("double"):
                                outStr += "float(";
                                break;
                            case ("integer"):
                                outStr += "int(";
                                break;
                            case ("boolean"):
                                outStr += "bool(";
                                break;
                            case ("string"):
                            case ("date"):
                                outStr += "string(";
                                break;
                            default:
                                assert(0);
                                outStr += "string(";
                                break;
                        }
                    }
                    if (condTree.value.class === "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
                        // Column Name
                        outStr += condTree.value.name;
                    } else if (condTree.value.class === "org.apache.spark.sql.catalyst.expressions.Literal") {
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
            return genFilterStringRecur(SQLCompiler.genTree(undefined, condArray.slice(0)));
        }

        var filterString = genFilterString(node.value.condition);
        var tableName = node.children[0].newTableName;

        return xcSQLObj.filter(filterString, tableName);
    }

    function pushDownJoin(node) {
        debugger;
        // TODO: Test how left + 1 === right compiles
        // TODO: Test how a = b and c= d compiles
        assert(node.value.condition.length === 3);
        // We only support equijoin
        assert(node.value.condition[0].class === "org.apache.spark.sql.catalyst.expressions.EqualTo");
        assert(node.children.length === 2);
        var leftColName;
        var rightColName;
        var leftTableRootName;
        var rightTableRootName;
        for (var i = 1; i < 3; i++) {
            switch (node.value.condition[i].class) {
                case ("org.apache.spark.sql.catalyst.expressions.AttributeReference"):
                    if (leftColName) {
                        rightColName = node.value.condition[i].name;
                        rightTableRootName = node.value.condition[i].qualifier;
                    } else {
                        leftColName = node.value.condition[i].name;
                        leftTableRootName = node.value.condition[i].qualifier;
                    }
                    break;
                default:
                    assert(0);
                    break;
            }
        }

        assert(leftColName && rightColName);
        // Match TableRootName to tableName
        var leftChild;
        var rightChild;
        if (node.children[0].newTableName.indexOf(leftTableRootName) === 0) {
            leftChild = node.children[0];
            rightChild = node.children[1];
        } else {
            leftChild = node.children[1];
            rightChild = node.children[0];
        }

        var lTableInfo = {};
        lTableInfo.tableName = leftChild.newTableName;
        lTableInfo.columns = [leftColName];
        lTableInfo.pulledColumns = [];
        lTableInfo.rename = [];

        var rTableInfo = {};
        rTableInfo.tableName = rightChild.newTableName;
        rTableInfo.columns = [rightColName];
        rTableInfo.pulledColumns = [];
        rTableInfo.rename = [];

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
            default:
                assert(0);
                console.error("Join Type not supported");
                break;
        }
        
        return xcSQLObj.join(joinType, lTableInfo, rTableInfo);
    }

    return SQLCompiler;
}({}, jQuery));

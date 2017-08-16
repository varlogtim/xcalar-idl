window.SQLCompiler = (function(SQLCompiler, $) {
    function assert(st) {
        if (!st) {
            debugger;
            console.error("ASSERTION FAILURE!");
        }
    }

    var tableNameLookup = {
        "ss": "store_sales",
        "hd": "household_demographics",
        "t": "time_dim",
        "s": "store",
    };

    function TreeNode(value) {
        if (value.class === "org.apache.spark.sql.execution.LogicalRDD") {
            // These are leaf nodes
            var prefixDelim = "_"; // XXX change to --
            var prefixIdx = value.output[0][0].name.indexOf(prefixDelim);
            var tablePrefix = value.output[0][0].name.substring(0, prefixIdx);
            this.newTableName = tableNameLookup[tablePrefix];
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
            });
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
        var deferred = jQuery.Deferred();
        // Find columns to project
        var columns = [];
        for (var i = 0; i<node.value.projectList.length; i++) {
            var colNameStruct = node.value.projectList[i][0];
            assert(colNameStruct.class === "org.apache.spark.sql.catalyst.expressions.AttributeReference");
            var colName = colNameStruct.name;
            columns.push(colName);
        }
        var xcSQLObj = new SQLApi();
        xcSQLObj.project(columns, tableName)
        .then(function(newTableName) {
            var retStruct = {"cli": xcSQLObj.run()};
            retStruct.newTableName = newTableName;
            deferred.resolve(retStruct);
        });
        return deferred.promise();
    }

    function pushDownFilter(node) {
        assert(node.children.length === 1);
        function genFilterString(condArray) {
            function genFilterStringRecur(condTree) {
                var opLookup = {"org.apache.spark.sql.catalyst.expressions.And": "and", "org.apache.spark.sql.catalyst.expressions.EqualTo": "eq", "org.apache.spark.sql.catalyst.expressions.GreaterThanOrEqual": "ge"};
                // Traverse and construct tree
                var outStr = "";
                if (condTree.value.class in opLookup) {
                    outStr += opLookup[condTree.value.class] + "(";
                    for (var i = 0; i < condTree.value["num-children"]; i++) {
                        outStr += genFilterStringRecur(condTree.children[i]);
                        if (i < condTree.value["num-children"] -1) {
                            outStr += ",";
                        }
                    }
                    outStr += ")";
                } else {
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
        var deferred = jQuery.Deferred();
        var filterString = genFilterString(node.value.condition);
        var tableName = node.children[0].newTableName;
        var xcSQLObj = new SQLApi();
        xcSQLObj.filter(filterString, tableName)
        .then(function(newTableName) {
            var retStruct = {"cli": xcSQLObj.run()};
            retStruct.newTableName = newTableName;
            deferred.resolve(retStruct);
        });
        return deferred.promise();
    }

    return SQLCompiler;
}({}, jQuery));
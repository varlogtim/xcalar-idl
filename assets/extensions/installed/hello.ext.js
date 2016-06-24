// module name must start with "UExt"
window.UExtHello = (function(UExtHello) {
    /* 
     * Note of UExtHello.buttons:
     * 1. it must be an array, each element is an object,
     *    which specify one function,
     *    one extension can have unlimited functions
     *
     * 2. Fields on object:
     *      buttonText: the extension function name that display on XI
     *      fnName: the function name, will pass into UExtHello.actionFn
     *      arrayOfFields: an array to specify the buttons on the extension function
     *
     * 3. Fields on arrayOfFields attribute:
     *      type: type of the arg, can be column, string, number or boolean
     *      name: the button name, which will dispaly on XI,
     *      fieldClass: Use this name to find the arg in ext obj
     *      allowEmpty: allow the field to be empty
     *      tyepCheck: object to specify how to check the arg
     *          if type is column, columnType can strict the column's type,
     *          if type is number, min and max can strict the range
     *          and integer attr can strict the number is integer only
     */
    UExtHello.buttons = [{
        "buttonText"   : "Sum 3",
        "fnName"       : "sum3",
        "arrayOfFields": [{
            "type"      : "column",
            "name"      : "Column 1",
            "fieldClass": "col1",
            "typeCheck" : {
                "columnType": ["number"]
            }
        },
        {
            "type"      : "column",
            "name"      : "Column 2",
            "fieldClass": "col2",
            "typeCheck" : {
                "columnType": ["number"]
            }
        },
        {
            "type"      : "column",
            "name"      : "Column 3",
            "fieldClass": "col3",
            "typeCheck" : {
                "columnType": ["number"]
            }
        }
        ],
    }];

    // UExtHello.actionFn must reutrn a XcSDK.Extension obj or null 
    UExtHello.actionFn = function(functionName) {
        // it's a good convention to use switch/case to handle
        // different function in the extension and handle errors.
        switch(functionName) {
            case "sum3":
                return sum3();
            default:
                return null;
        }
    }

    function sum3() {
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
            var col1Name = args.col1.getName();
            var col2Name = args.col2.getName();
            var col3Name = args.col3.getName();
            var srcTableName = self.getTriggerTable().getName();
            var newColName = "sum3Col";
            // construct map string to add the three columns
            var mapStr = 'add(' + col1Name + ', add(' + col2Name + ', ' + col3Name + '))'

            // check extensionApi_Operations.js to see the api signature.
            ext.map(mapStr, srcTableName, "sum3Col")
            .then(function(tableAfterMap) {
                // usually for the final table,
                // you want to customerize it's columns and display it
                // see tableApi.js and columnApi.js for more details
                var table = ext.getTable(tableAfterMap);
                table.deleteAllCols();
                table.addCol(args.col1);
                table.addCol(args.col2);
                table.addCol(args.col3);

                var newCol = new XcSDK.Column(newColName, "float");
                table.addCol(newCol);

                return table.addToWorksheet();
            })
            .then(deferred.resolve)
            .fail(deferred.reject)

            return deferred.promise();
        };

        // Do not forget to return the extension
        return ext;
    }

    return UExtHello;
}({}));
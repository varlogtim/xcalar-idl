// module name must start with "UExt"
window.UExtHello = (function(UExtHello) {
    /*
     * Instruction of UExtHello.buttons:
     *
     * 1. Structure of UExtHello.buttons:
     *  It's an array of object,
     *  each object specify one extension function,
     *  one extension can have unlimited functions.
     *
     *  E.g. of UExtHello.buttons:
     *  [extensoinFunc1, extensoinFunc2, ...]
     *
     *  For details of the structure of extension function,
     *  please see the Instruction 2.
     *
     *
     * 2. Structure of extension function object:
     *  Extension writers use an object to specify how an extension function
     *  should look like, the object must include the following attributes:
     *
     *  1) buttonText: the extension function's display name,
     *                 it will show in XI.
     *  2) fnName: a name that uniquely identify the function,
     *             it will be passed in as an argument in UExtHello.actionFn.
     *  3) arrayOfFields: an array to specify all arguments in
     *                    the extension function. Each arguement is an object.
     *                    In XI, every argument will disaply
     *                    as a field of input.
     *
     *  E.g. of an extension function object
     *  {
     *      "buttonText"   : "Sum 3",
     *      "fnName"       : "sum3",
     *      "arrayOfFields": [argument1, argument2, ...]
     *  }
     *
     *  For details of the structure of argument,
     *  please see the Note 3.
     *
     *
     * 3. Structure of argument object in arrayOfFields:
     *  Extension Writers use an object to specify the behavior of an argument
     *  in an extension function. It should include the following attributes:
     *
     *  1) type: type of the arg,
     *           valid values are: table, column, string, number or boolean,
     *           other values are invalid and will make extension function
     *           have unexpected behavior.
     *
     *  2) name: the argument's display name, it will show in XI.
     *
     *  3) fieldClass: a string to uniquely idendify the argument,
     *                 extension writers can use it to get the argument's
     *                 value in XcSDK.Extension (see the sum3() as an example).
     *
     *  4) allowEmpty: Optional, when set to be true, XI will allow the argument
     *                 to be empty. Otherwise, XI will prevent value in
     *                 this field.
     *
     *  5) enums: Optional, an arry of values. If specified, then in XI this
     *            field will be a dropdown list instead of input and the
     *            arugment's value must be one of the element in enums.
     *
     *  6) autofill: Optional, when set a valid value, this field will be
     *               auto filled of the value in XI. If not specified or
     *               the value is invalid, then auto fill will not happen.
     *               Different type of arguments accept
     *               different autofill value. Here is a checklist:
     *
     *
     *      6.1 Autofill for boolean type argument:
     *          boolean type of field displays as a checkbox in XI.
     *          If autofill set to true, checkbox will be checked by default,
     *          otherwise, checkbox will not be checked by default.
     *
     *      6.2 Autofill for column type argument:
     *          once the value exists, this field will be auto filled of
     *          the column name if user trigger extension from a column.
     *          For good practice, please use "autofill: true".
     *
     *      6.2 Autofill for string type argument:
     *          value can be any string.
     *
     *      6.3 Autofill for number type argument:
     *          value can be any number.
     *
     *  7) typeCheck: Optional, an object to specify how XI should check
     *                the argument. Different type of arguments accept
     *                different attributes. Here is a checklist:
     *
     *   7.1 Attributes of typeCheck for column type argument:
     *       columnType: Optional, an array to restrict the column argument's
     *                   type, each element in the array can be
     *                   "number", "string", "boolean"...
     *       multiColumn: Optional, when set true, the field can accept more
     *                    than one column as input. Otherwise, only allow
     *                    one column as input.
     *       tableField: Optional, when not exists, XI will check if the
     *                   column belongs to the triggerd table if any.
     *                   When has a valid value, XI will check if the column
     *                   belongs to the table specified by the value.
     *                   Valid value means the tableFiled's value equals to
     *                   an arugment's fieldClass value and that arguemnt
     *                   must be type table. For other case, XI will
     *                   not check, extension writer should
     *                   be responsible for invalid column value.
     *
     *  7.2 Attributes of typeCheck for number type argument:
     *      integer: Optional, when set true, only allow the arguement to be
     *               integer. Float value is not allowed.
     *      max: Optional, when set to a valid number, the argument's value
     *           can not be more than it. Any invalid value may make extension
     *           has unexpected behavior.
     *      min: Optional, when set to a valid number, the argument's value
     *           can not be less than it. Any invalid value may make extension
     *           has unexpected behavior.
     *
     *
     * E.g of an argument object:
     * {
     *  "type"      : "column",
     *  "name"      : "Example 1",
     *  "allowEmpty": true,
     *  "fieldClass": "col1",
     *  "typeCheck" : {
     *      "columnType": ["number"],
     *      "tableField": "tableA"
     *  }
     * }
     *
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
        switch (functionName) {
            case "sum3":
                return sum3();
            default:
                return null;
        }
    };

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
            var mapStr = 'add(' + col1Name + ', add(' + col2Name +
                         ', ' + col3Name + '))';

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
            .fail(deferred.reject);

            return deferred.promise();
        };

        // Do not forget to return the extension
        return ext;
    }

    return UExtHello;
}({}));
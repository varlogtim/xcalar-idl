// module name must start with "UExt"
window.UExtGenRowNum = (function(UExtGenRowNum) {
    /*
     * Note of UExtGenRowNum.buttons:
     * 1. it must be an array, each element is an object,
     *    which specify one function,
     *    one extension can have unlimited functions
     *
     * 2. Fields on object:
     *      buttonText: the extension function name that display on XI
     *      fnName: the function name, will pass into UExtGenRowNum.actionFn
     *      arrayOfFields: an array to specify the buttons on the extension function
     *
     * 3. Fields on arrayOfFields attribute:
     *      type: type of the arg, can be column, string, number or boolean
     *      name: the button name, which will dispaly on XI,
     *      fieldClass: Use this name to find the arg in ext obj
     *      tyepCheck: object to specify how to check the arg
     *          if type is column, columnType can strict the column's type,
     *          if type is number, min and max can strict the range
     *          and integer attr can strict the number is integer only
     */
    UExtGenRowNum.buttons = [{
        "buttonText"   : "Generate Row Num",
        "fnName"       : "genRowNum",
        "arrayOfFields": [{
            "type"      : "string",
            "name"      : "New Column Name",
            "fieldClass": "newColName",
            "typeCheck" : {
                "newColumnName": true
            }
        }]
    }];

    // UExtGenRowNum.actionFn must reutrn a XcSDK.Extension obj or null
    UExtGenRowNum.actionFn = function(functionName) {
        // it's a good convention to use switch/case to handle
        // different function in the extension and handle errors.
        switch (functionName) {
            case "genRowNum":
                return (genRowNum());
            default:
                return (null);
        }
    };

    function genRowNum() {
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
            var newColName = self.getArgs().newColName;
            var srcTableName = self.getTriggerTable().getName();

            // check extensionApi_Operations.js to see the api signature.
            ext.getRowNum(srcTableName, newColName)
            .then(function(tableAfterMap) {
                var table = ext.getTable(tableAfterMap);
                var newCol = new XcSDK.Column(newColName, "integer");
                table.addCol(newCol);

                return table.addToWorksheet(srcTableName);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        // Do not forget to return the extension
        return ext;
    }

    return UExtGenRowNum;
}({}));
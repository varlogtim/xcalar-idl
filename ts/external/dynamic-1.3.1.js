(function($) {
    console.log("dynamic patch 1.3.1 loaded");

    function changeColMetaToMap(valueAttrs) {
        var res = {};
        try {
            valueAttrs.forEach(function(valueAttr) {
                res[valueAttr.name] = valueAttr.type;
            });
        } catch (e) {
            console.error(e);
        }
        return res;
    }
    function getColMetaHelper(tableName) {
        var deferred = jQuery.Deferred();
        var tableId = xcHelper.getTableId(tableName);
        var table = gTables[tableId];
        var colMeta;

        if (table && table.backTableMeta) {
            colMeta = changeColMetaToMap(table.backTableMeta.valueAttrs);
            deferred.resolve(colMeta, true);
        } else if (DagEdit.isEditMode()) {
            deferred.resolve({}, false);
        } else {
            XcalarGetTableMeta(tableName)
            .then(function(tableMeta) {
                colMeta = changeColMetaToMap(tableMeta.valueAttrs);
                deferred.resolve(colMeta, true);
            })
            .fail(function() {
                deferred.resolve({}, false); // still resolve
            });
        }

        return deferred.promise();
    }

    function getNewKeyFieldName(parsedName, takenNames) {
        var name = xcHelper.stripColName(parsedName.name);
        if (!takenNames.hasOwnProperty(name)) {
            return name;
        }

        var name = parsedName.prefix + "-" + name;
        var newName = name;
        if (!takenNames.hasOwnProperty(newName)) {
            return newName;
        }

        return xcHelper.randName(name);
    }

    xcHelper.getKeyInfos = function(keys, tableName) {
        var keys = (keys instanceof Array) ? keys : [keys];
        var deferred = jQuery.Deferred();

        getColMetaHelper(tableName)
        .then(function (colMeta, hasTableMeta) {
            var res = keys.map(function(key) {
                var name = key.name;
                var ordering = key.ordering;
                var type = DfFieldTypeT.DfUnknown;
                var keyFieldName = null;
                var parsedName = xcHelper.parsePrefixColName(name);

                if (hasTableMeta) {
                    if (parsedName.prefix !== "") {
                        keyFieldName = getNewKeyFieldName(parsedName, colMeta);
                    } else {
                        keyFieldName = name;
                        type = colMeta[name];
                    }
                } else {
                    // // if no tableMeta, let backend handle it
                    // if no tableMeta, just overwrite keyFieldName with key.name
                    keyFieldName = name;
                }
                if (!colMeta.hasOwnProperty(keyFieldName)) {
                    // add to map so we can check against it when creating
                    // other new key field names
                    colMeta[keyFieldName] = DfFieldTypeT.DfUnknown;
                }

                return {
                    name: name,
                    type: type,
                    keyFieldName: keyFieldName || "",
                    ordering: ordering
                };
            });

            deferred.resolve(res);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };
}(jQuery));
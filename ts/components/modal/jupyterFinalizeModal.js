window.JupyterFinalizeModal = (function(JupyterFinalizeModal, $) {
    var $modal;    // $("#jupyterFinalizeModal")
    var modalHelper;
    var tableId;
    var numSampleRows;

    JupyterFinalizeModal.setup = function() {
        $modal = $("#jupyterFinalizeModal");
        reset();

        modalHelper = new ModalHelper($modal);
        $modal.on("click", ".close, .cancel", closeModal);

        $modal.on("click", ".confirm", function() {
            submitForm()
            .then(function(finalTableName) {
                JupyterPanel.publishTable(finalTableName, numSampleRows, true);
            })
            .fail(function() {
                // alert error will show
            });
        });

        $modal.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });
    };

    JupyterFinalizeModal.show = function(tId, nRows) {
        if ($modal.is(":visible")) {
            // in case modal show is triggered when
            // it's already open
            return;
        }
        tableId = tId;
        numSampleRows = nRows;
        initColumns();

        modalHelper.setup();
        var $mainSection = $modal.find(".modalMain");
        var $colSection = $modal.find(".columnsSection");
        var diff = $colSection.outerHeight() - $mainSection.outerHeight();
        $modal.outerHeight("+=" + diff);
        modalHelper.center();
    };

    function initColumns() {
        var table = gTables[tableId];
        var cols = table.getAllCols(true);
        var leftHtml = "";
        var rightHtml = "";
        var existingCols = {};
        var immediateCols = table.getImmediateNames();
        var pulledColNames = cols.map(function(col) {
            return col.getBackColName();
        });

        cols.forEach(function(col) {
            if (col.getType() === ColumnType.object ||
                col.getType() === ColumnType.array) {
                existingCols[col.getBackColName()] = true;
            }
        });

        immediateCols.forEach(function(colName) {
            if (pulledColNames.indexOf(colName) === -1) {
                existingCols[colName] = true;
            }
        });
        var inputClass;
        var inputAttr;
        var newColName;
        for (var i = 0; i < cols.length; i++) {
            leftHtml += '<div class="column">' +
                    xcHelper.escapeHTMLSpecialChar(cols[i].getBackColName()) +
                        '</div>';
            newColName = "";
            inputClass = "";
            inputAttr = "";
            if (cols[i].getType() === ColumnType.object ||
                cols[i].getType() === ColumnType.array) {
                newColName = cols[i].getBackColName();
                inputClass = "readonly";
                inputAttr = 'readonly data-toggle="tooltip" ' +
                            'data-container="body" title="' +
                            JupyterTStr.PrefixNoRename + '"';
            } else {
                newColName = xcHelper.stripColName(cols[i].getFrontColName(), true);
                newColName = getAutoGenColName(newColName, existingCols);
            }

            existingCols[newColName] = true;
            rightHtml += '<div class="column">' +
                        '<input class="arg xc-input ' + inputClass + '" ' +
                            inputAttr + ' type="text" value="' + newColName +
                            '" spellcheck="false">' +
                        '</div>';
        }
        $modal.find(".leftColSection").html(leftHtml);
        $modal.find(".rightColSection").html(rightHtml);
    }

    function getAutoGenColName(name, existingCols) {
        var limit = 20; // we won't try more than 20 times
        name = name.replace(/\s/g, '');
        var newName = name;

        var tries = 0;
        while (tries < limit && (existingCols[newName])) {
            tries++;
            newName = name + tries;
        }

        if (tries >= limit) {
            newName = xcHelper.randName(name);
        }

        return newName;
    }

    function closeModal() {
        modalHelper.clear();
        reset();
    }

    function reset() {
        $modal.find(".leftColSection").empty();
        $modal.find(".rightColSection").empty();
    }

    function submitForm() {
        var deferred = PromiseHelper.deferred();
        var renames = [];
        var renameMap = [];
        var existingCols = {};
        var name;
        var errFound = false;
        var table = gTables[tableId];
        var immediateCols = table.getImmediateNames();
        var cols = table.getAllCols(true);
        var pulledColNames = cols.map(function(col) {
            return col.getBackColName();
        });

        immediateCols.forEach(function(colName) {
            if (pulledColNames.indexOf(colName) === -1) {
                existingCols[colName] = "immediate";
            }
        });

        $modal.find(".rightColSection .arg").each(function(i) {
            name = $.trim($(this).val());
            if (!$(this).hasClass("readonly")) {
                var err = xcHelper.validateColName(name, true);
                if (err) {
                    StatusBox.show(err, $(this), true, {
                        preventImmediateHide: true,
                    });
                    errFound = true;
                    return false;
                }
            }

            if (existingCols[name]) {
                var msg;
                if (existingCols[name] === "immediate") {
                    msg = ColTStr.ImmediateClash;
                } else {
                    msg = ErrTStr.DuplicateColNames;
                }
                StatusBox.show(msg, $(this), true, {
                    preventImmediateHide: true,
                });
                errFound = true;
                return false;
            }
            existingCols[name] = $(this);
            var oldName = $modal.find(".leftColSection .column").eq(i).text();

            renames.push({
                map: renameMap,
                oldName: oldName,
                newName: name,
                col: cols[i],
                colNum: i + 1
            });
            renames.push(name);
            // for logs
            renameMap.push({
                previousName: oldName,
                newName: name
            });
        });

        if (!errFound) {
            var tableName = table.getName();
            var tableInfo = {tableName: tableName, tableId: tableId};
            var newFieldNames = [];
            var mapStrs = [];
            var newTableCols = table.tableCols;
            for (var i = 0; i < renames.length; i++) {
                if (renames[i].oldName === renames[i].newName) {
                    continue;
                }
                newFieldNames.push(renames[i].newName);

                var mapInfo = getMapInfo(renames[i]);
                mapStrs.push(mapInfo.mapStr);

                var mapOptions = {replaceColumn: true,
                                  resize: true,
                                  type: mapInfo.type};
                newTableCols = xcHelper.mapColGenerate(renames[i].colNum,
                                        renames[i].newName, mapInfo.mapStr,
                                        newTableCols, mapOptions);
            }

            if (!mapStrs.length) {
                closeModal();
                deferred.resolve(tableName);
                return deferred.promise();
            }

            var sql = {
                "operation": SQLOps.Finalize,
                "tableName": tableName,
                "tableId": tableInfo.tableId,
                "renames": renameMap
            };
            var txId = Transaction.start({
                "msg": StatusMessageTStr.Finalize,
                "operation": SQLOps.Finalize,
                "sql": sql,
                "steps": renames.length
            });


            xcHelper.lockTable(tableId, txId);
            closeModal();

            XIApi.map(txId, mapStrs, tableName, newFieldNames)
            .then(function(tableAfterMap) {
                finalTableName = tableAfterMap;
                finalTableId = xcHelper.getTableId(finalTableName);
                Profile.copy(tableId, finalTableId);
                TblManager.setOrphanTableMeta(finalTableName, xcHelper.deepCopy(newTableCols));

                xcHelper.unlockTable(tableId);
                sql.newTableName = finalTableName;
                Transaction.done(txId, {
                    "msgTable": finalTableId,
                    "sql": sql
                });
                deferred.resolve(finalTableName);
            })
            .fail(function(error) {
                xcHelper.unlockTable(tableId);
                Transaction.fail(txId, {
                    "failMsg": StatusMessageTStr.FinalizeFailed,
                    "error": error
                });

                deferred.reject(error);
            });

        } else {
            deferred.reject();
        }
        return deferred.promise();
    }

    function getMapInfo(colInfo) {
        var mapFn;
        var col = colInfo.col;
        if (col.type === 'integer' || col.type === 'float') {
            // convert all numbers to float, since we cannot determine
            // actual type of prefix fields
            mapFn = "float";
        } else if (col.type === 'boolean') {
            mapFn = "bool";
        } else {
            mapFn = "string";
        }
        var mapStr = mapFn + "(" + col.backName + ")";
        var type = mapFn;
        if (type === "bool") {
            type = "boolean";
        }
        return {mapStr: mapStr, type: type};
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        JupyterFinalizeModal.__testOnly__ = {};
        JupyterFinalizeModal.__testOnly__submitForm = submitForm;
    }
    /* End Of Unit Test Only */

    return JupyterFinalizeModal;
}({}, jQuery));

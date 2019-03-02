window.JupyterUDFModal = (function(JupyterUDFModal, $) {
    var $modal;    // $("#jupyterUDFTemplateModal")
    var modalHelper;
    var cols = [];
    var $targetList;

    JupyterUDFModal.setup = function() {
        $modal = $("#jupyterUDFTemplateModal");
        reset();

        modalHelper = new ModalHelper($modal, {
            noBackground: true,
            beforeResize: function() {
                $("#container").addClass("menuResizing");
            },
            afterResize: function() {
                $("#container").removeClass("menuResizing");
            },
        });
        $modal.on("click", ".close, .cancel", closeModal);

        $modal.on("click", ".confirm", function() {
            submitForm();
        });

        $modal.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        var tableList = new MenuHelper($modal.find(".tableList"), {
            "onOpen": function() {
                var tableLis = getTableList();
                $modal.find(".tableList").find("ul").html(tableLis);
                var tableName = $modal.find(".tableList .arg").data("tablename");
                $modal.find(".tableList").find('li').filter(function() {
                    return ($(this).data("tablename") === tableName);
                }).addClass('selected');
            },
            "onSelect": function($li) {
                var val = $li.text();
                var tableName = $li.data("tablename");
                if (tableName ===  $modal.find(".tableList .arg").data("tablename")) {
                    return;
                }
                $modal.find(".tableList .arg").val(val);
                $modal.find(".tableList .arg").data('tablename', tableName);
                $modal.find(".columnsList .arg").val("");
                $modal.find(".columnsList li.selecting").removeClass("selecting");
                cols = [];
                var table = gTables[xcHelper.getTableId(tableName)];
                var progCols = table.getAllCols(true);
                var html = "";
                for (var i = 0; i < progCols.length; i++) {
                    if (progCols[i].type === ColumnType.array ||
                        progCols[i].type === ColumnType.object) {
                        html += '<li data-toggle="tooltip" ' +
                                'data-container="body" ' +
                                'title="Cannot directly operate on objects ' +
                                'or arrays" class="unavailable">' +
                                xcHelper.escapeHTMLSpecialChar(
                                        progCols[i].getBackColName()) + "</li>";
                    } else {
                        html += "<li>" + xcHelper.escapeHTMLSpecialChar(
                                    progCols[i].getBackColName()) + "</li>";
                    }
                }
                $modal.find(".columnsList ul").html(html);
            }
        });
        tableList.setupListeners();

        var columnsList = new MenuHelper($modal.find(".columnsList"), {
            "onSelect": function($li) {
                if ($li.hasClass("unavailable")) {
                    return true;
                }
                var val = $li.text();
                if ($li.hasClass("selecting")) {
                    cols.splice(cols.indexOf(val), 1);
                } else {
                    cols.push(val);
                }
                $li.toggleClass("selecting");
                var vals = cols.join(", ");
                $modal.find(".columnsList .arg").val(vals);
                return true;
            }
        });
        columnsList.setupListeners();

        $targetList = $modal.find(".targetList");
        new MenuHelper($targetList, {
            "onSelect": function($li) {
                var target = $li.text();
                $targetList.find(".target").val(target);
            }
        }).setupListeners();
    };

    function getTableList() {
        var tableList = "";
        const activeWKBNK = WorkbookManager.getActiveWKBK();
        const workbook = WorkbookManager.getWorkbook(activeWKBNK);
        const dfTablePrefix = "table_DF2_" + workbook.sessionId + "_";
        const sqlTablePrefix = "table_SQLFunc_" + workbook.sessionId + "_";
        const tableInfos = [];
        for (var tableId in gTables) {
            var table = gTables[tableId];
            var tableName = table.getName();
            var isSql = false;
            if (!tableName.startsWith(dfTablePrefix)) {
                if (tableName.startsWith(sqlTablePrefix)) {
                    isSql = true;
                } else {
                    continue;
                }
            }
            var displayName = tableName;
            var displayNameHtml = displayName;
            var tableNamePart;
            if (isSql) {
                tableNamePart = tableName.slice(tableName.indexOf("SQLFunc_"));
            } else {
                tableNamePart = tableName.slice(tableName.indexOf("DF2_"));
            }
            var dagPartIndex = tableNamePart.indexOf("_dag_");
            if (dagPartIndex === -1) {
                continue;
            }
            var tabId = tableNamePart.slice(0, dagPartIndex);

            var dagListTab = DagList.Instance.getDagTabById(tabId);
            if (dagListTab) {
                displayNameHtml = dagListTab.getName();
                displayName = displayNameHtml;
                var dagTab = DagTabManager.Instance.getTabById(tabId);
                if (dagTab) {
                    var nodePart = tableNamePart.slice(dagPartIndex + 1);
                    var hashIndex = nodePart.indexOf("#");
                    var graph = dagTab.getGraph();
                    if (graph && hashIndex > -1) {
                        var nodeId = nodePart.slice(0, hashIndex);
                        var node = graph.getNode(nodeId);
                        if (node) {
                            displayNameHtml += " (" + node.getDisplayNodeType() + ")";
                            var nodeTitle = node.getTitle();
                            if (nodeTitle) {
                                displayNameHtml += " - " + nodeTitle;
                            }
                        }
                    }
                    displayName = displayNameHtml;
                } else {
                    displayNameHtml += '<span class="inactiveDF"> (inactive dataflow) </span>' + tableName;
                    displayName += " (inactive dataflow) " + tableName;
                }

            } else {
                continue;
            }
            tableInfos.push({
                displayName: displayName,
                displayNameHtml: displayNameHtml,
                displayNameLower: displayName.toLowerCase(),
                tableId: tableId,
                tableName: tableName
            });
        }
        tableInfos.sort((a, b) => {
            return (a.displayNameLower < b.displayNameLower) ? -1 : (a.displayNameLower !== b.displayNameLower ? 1 : 0);
        });
        tableInfos.forEach((tableInfo) => {
            tableList +=
            '<li class="tooltipOverflow"' +
            ' data-original-title="' + tableInfo.displayName + '"' +
            ' data-toggle="tooltip"' +
            ' data-container="body" ' +
            ' data-id="' + tableInfo.tableId + '" data-tablename="' + tableInfo.tableName + '">' +
                tableInfo.displayNameHtml +
            '</li>';
        })

        return tableList;
    }

    JupyterUDFModal.show = function(type, params) {
        if ($modal.is(":visible")) {
            // in case modal show is triggered when
            // it's already open
            return;
        }
        params = params || {};
        $modal.removeClass("type-map type-newImport");
        $modal.addClass("type-" + type);
        modalHelper.setup();

        var $activeSection = $modal.find(".form:visible");
        if (params.target) {
            $activeSection.find(".target").val(params.target);
        }
        if (params.filePath) {
            $activeSection.find(".url").val(params.filePath);
        }

        // focus on first none empty input
        $activeSection.find(".arg").filter(function() {
            return !$(this).val();
        }).eq(0).focus();
    };

    JupyterUDFModal.refreshTarget = function(targetList) {
        $targetList.find("ul").html(targetList);
    };

    function closeModal() {
        modalHelper.clear();
        reset();
    }

    function reset() {
        $modal.find(".arg").val("").removeData("tablename");
        $modal.find(".columnsList .arg").val("");
        $modal.find(".columnsList li.selecting").removeClass("selecting");
        $modal.find(".columnsList ul").empty();
        cols = [];
    }

    function submitForm() {
        var isValid;
        var $args = $modal.find(".arg:visible");
        $args.each(function() {
            var $input = $(this);
            isValid = xcHelper.validate({
                "$ele": $input
            });
            if (!isValid) {
                return false;
            }
        });
        if (!isValid) {
            return;
        }

        var moduleName = $modal.find(".moduleName:visible").val();
        var isModuleNameValid = xcHelper.checkNamePattern("udf", "check", moduleName);
        if (!isModuleNameValid) {
            StatusBox.show(UDFTStr.InValidName, $modal.find(".moduleName:visible"), true);
            return;
        }

        var fnName = $modal.find(".fnName:visible").val();
        var isFnNameValid = xcHelper.checkNamePattern("udfFn", "check", fnName);
        if (!isFnNameValid) {
            StatusBox.show(UDFTStr.InValidFnName, $modal.find(".fnName:visible"), true);
            return;
        }

        if ($modal.hasClass("type-map")) {
            var columns = $modal.find(".columns").val().split(",");
            columns = columns.map(function(colName) {
                return $.trim(colName);
            });
            var tableName = $modal.find(".tableName:visible").data("tablename");
            JupyterPanel.appendStub("basicUDF", {
                moduleName: $modal.find(".moduleName:visible").val(),
                fnName: fnName,
                tableName: tableName,
                columns: columns,
                allCols: xcHelper.getColNameList(xcHelper.getTableId(tableName)),
                includeStub: true
            });
        } else if ($modal.hasClass("type-newImport")) {
            JupyterPanel.appendStub("importUDF", {
                fnName: fnName,
                target: $modal.find(".target:visible").val(),
                url: $modal.find(".url:visible").val(),
                moduleName: $modal.find(".moduleName:visible").val(),
                includeStub: true,
            });
        }

        closeModal();
    }


    /* Unit Test Only */
    if (window.unitTestMode) {
        JupyterUDFModal.__testOnly__ = {};
    }
    /* End Of Unit Test Only */

    return JupyterUDFModal;
}({}, jQuery));

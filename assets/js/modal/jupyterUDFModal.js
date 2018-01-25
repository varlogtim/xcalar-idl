window.JupyterUDFModal = (function(JupyterUDFModal, $) {
    var $modal;    // $("#jupyterUDFTemplateModal")
    var modalHelper;
    var cols = [];
    var $udfModuleList;
    var $udfFnList;
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
                var tableLis = WSManager.getTableList();
                $modal.find(".tableList").find("ul").html(tableLis);
                var tableName = $modal.find(".tableList .arg").val();
                $modal.find(".tableList").find('li').filter(function() {
                    return ($(this).text() === tableName);
                }).addClass('selected');
            },
            "onSelect": function($li) {
                var val = $li.text();
                if (val === $modal.find(".tableList .arg").val()) {
                    return;
                }
                $modal.find(".tableList .arg").val(val);
                $modal.find(".columnsList .arg").val("");
                $modal.find(".columnsList li.selecting").removeClass("selecting");
                cols = [];
                var table = gTables[xcHelper.getTableId(val)];
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

        $udfModuleList = $modal.find(".udfModuleList");
        new MenuHelper($udfModuleList, {
            "onSelect": function($li) {
                var module = $li.text();
                $udfModuleList.find(".moduleName").val(module);
                $udfFnList.find(".fnName").val("");
                StatusBox.forceHide();
            }
        }).setupListeners();

        $udfFnList = $modal.find(".udfFnList");
        new MenuHelper($udfFnList, {
            "onOpen": function() {
                var moduleName = $udfModuleList.find(".moduleName").val();
                $udfFnList.find("li").hide();
                if (moduleName) {
                    $udfFnList.find('li[data-module="' + moduleName + '"]').show();
                } else {
                    StatusBox.show(ErrTStr.NoEmpty, $udfModuleList.find(".moduleName"), true);
                }
            },
            "onSelect": function($li) {
                var fn = $li.text();
                $udfFnList.find(".fnName").val(fn);
            }
        }).setupListeners();

        $targetList = $modal.find(".targetList");
        new MenuHelper($targetList, {
            "onSelect": function($li) {
                var target = $li.text();
                $targetList.find(".target").val(target);
            }
        }).setupListeners();
    };

    JupyterUDFModal.show = function(type) {
        if ($modal.is(":visible")) {
            // in case modal show is triggered when
            // it's already open
            return;
        }
        $modal.removeClass("type-map type-newImport type-testImport");
        $modal.addClass("type-" + type);
        modalHelper.setup();
        if (type === "testImport") {
            $modal.css({"minHeight": 310});
        } else {
            $modal.css({"minHeight": 290});
        }
    };

    JupyterUDFModal.refreshTarget = function(targetList) {
        $targetList.find("ul").html(targetList);
    };

    JupyterUDFModal.refreshUDF = function(listXdfsObj) {
        var udfObj = xcHelper.getUDFList(listXdfsObj);
        $udfModuleList.find("ul").html(udfObj.moduleLis);
        $udfFnList.find("ul").html(udfObj.fnLis);
    };

    function closeModal() {
        modalHelper.clear();
        reset();
    }

    function reset() {
        $modal.find(".arg").val("");
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
            var tableName = $modal.find(".tableName:visible").val();
            JupyterPanel.appendStub("basicUDF", {
                fnName: $modal.find(".fnName:visible").val(),
                tableName: tableName,
                columns: columns,
                allCols: xcHelper.getColNameList(xcHelper.getTableId(tableName))
            });
        } else if ($modal.hasClass("type-newImport")) {
            JupyterPanel.appendStub("importUDF", {
                fnName: $modal.find(".fnName:visible").val()
            });
        } else if ($modal.hasClass("type-testImport")) {
            JupyterPanel.appendStub("testImportUDF", {
                target: $modal.find(".target:visible").val(),
                url: $modal.find(".url:visible").val(),
                moduleName: $modal.find(".moduleName:visible").val(),
                fnName: $modal.find(".fnName:visible").val()
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

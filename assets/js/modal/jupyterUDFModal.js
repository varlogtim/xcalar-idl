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

        $targetList = $modal.find(".targetList");
        new MenuHelper($targetList, {
            "onSelect": function($li) {
                var target = $li.text();
                $targetList.find(".target").val(target);
            }
        }).setupListeners();
    };

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
            var tableName = $modal.find(".tableName:visible").val();
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

window.JupyterUDFModal = (function(JupyterUDFModal, $) {
    var $modal;    // $("#jupyterUDFTemplateModal")
    var modalHelper;
    var cols = [];

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
                                progCols[i].getBackColName() + "</li>";
                    } else {
                        html += "<li>" + progCols[i].getBackColName() + "</li>";
                    }
                }
                $modal.find(".columnsList ul").html(html);
            }
        });
        tableList.setupListeners();

        var columnsList = new MenuHelper($modal.find(".columnsList"), {
            "onSelect": function($li, $last, event) {
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
    };

    JupyterUDFModal.show = function() {
        if ($modal.is(":visible")) {
            // in case modal show is triggered when
            // it's already open
            return;
        }

        modalHelper.setup();
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
        var $args = $modal.find(".arg");
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
        var columns = $modal.find(".columns").val().split(",");
        columns = columns.map(function(colName) {
            return $.trim(colName);
        });
        var tableName = $modal.find(".tableName").val();
        var args = {
            fnName: $modal.find(".fnName").val(),
            tableName: tableName,
            columns: columns,
            allCols: xcHelper.getColNameList(xcHelper.getTableId(tableName))
        };
        JupyterPanel.appendStub("basicUDF", args);
        closeModal();
    }


    /* Unit Test Only */
    if (window.unitTestMode) {
        JupyterUDFModal.__testOnly__ = {};
    }
    /* End Of Unit Test Only */

    return JupyterUDFModal;
}({}, jQuery));

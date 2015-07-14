window.ExportModal = (function($, ExportModal) {
    var $modalBackground = $("#modalBackground");
    var $exportModal     = $("#exportModal");

    var $exportName = $("#exportName");
    var $exportPath = $("#exportPath");

    var exportTable;

    var modalHelper = new xcHelper.Modal($exportModal);

    ExportModal.setup = function() {
        $exportModal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing"
        });

        // click cancel or close button
        $exportModal.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeExoprtModal();
        });

        // click confirm button
        $exportModal.on("click", ".confirm", function() {
            var exportName = $exportName.val().trim();
            xcFunction.exportTable(exportTable, exportName);
            closeExoprtModal();
        });

        xcHelper.dropdownList($("#exportLists"), {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return;
                }

                $exportPath.val($li.text());
            }
        });
    };

    ExportModal.show = function(tableName) {
        xcHelper.removeSelectionRange();

        $modalBackground.fadeIn(300, function() {
            Tips.refresh();
        });

        $exportModal.css({
            "left"  : 0,
            "right" : 0,
            "top"   : 0,
            "bottom": 0
        });

        $(document).on("click.exportModal", function() {
            xcHelper.hideDropdowns($exportModal);
        });

        $exportModal.show();

        modalHelper.setup();

        exportTable = tableName;
        $exportName.val(tableName + ".csv").focus();
        $exportName[0].select();
    };

    function closeExoprtModal() {
        exportTable = null;
        $exportPath.val("Local Filesystem");

        $(document).off("click.exportModal");
        modalHelper.clear();

        $exportModal.hide();
        $modalBackground.fadeOut(300, function() {
            Tips.refresh();
        });
    }

    return (ExportModal);
}(jQuery, {}));

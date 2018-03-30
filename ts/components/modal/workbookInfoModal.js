window.WorkbookInfoModal = (function(WorkbookInfoModal, $) {
    var $modal; // $("#workbookInfoModal")
    var modalHelper;
    var activeWorkbookId;
    var $workbookDescription;
    var workbook;

    WorkbookInfoModal.setup = function() {
        $modal = $("#workbookInfoModal");
        modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });
        $workbookDescription = $modal.find(".description input");

        addEvents();
    };

    WorkbookInfoModal.show = function(workbookId) {
        activeWorkbookId = workbookId;
        modalHelper.setup();
        showWorkbookInfo(workbookId);
    };

    function addEvents() {
        $modal.on("click", ".close, .cancel", function() {
            closeModal();
        });

        $modal.on("click", ".confirm", function() {
            submitForm();
        });
    }

    function closeModal() {
        modalHelper.clear();
        activeWorkbookId = null;
        $workbookDescription.val("");
    }

    function showWorkbookInfo(workbookId) {
        workbook = WorkbookManager.getWorkbook(workbookId);
        $workbookDescription.val(workbook.getDescription() || "");
    }

    function submitForm() {
        var workbookId = activeWorkbookId;
        var name = workbook.getName();
        var description = $workbookDescription.val();

        closeModal();
        WorkbookPanel.edit(workbookId, name, description);
    }

    return WorkbookInfoModal;
}({}, jQuery));
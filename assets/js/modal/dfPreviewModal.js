window.DfPreviewModal = (function(DfPreviewModal, $) {
    var $modal;
    var modalHelper;
    var curId;

    DfPreviewModal.setup = function() {
        $modal = $("#dfPreviewModal");
        modalHelper = new ModalHelper($modal);
        addEvents();
    };

    DfPreviewModal.show = function(tableName, workbookName) {
        modalHelper.setup();
        curId = xcHelper.randName("dfPreview");
        $modal.find(".title").text(tableName);
        var promise = showDag(tableName, workbookName);
        xcHelper.showRefreshIcon($modal.find(".modalMain"), false, promise);
    };

    function addEvents() {
        $modal.on("click", ".close", function() {
            closeModal();
        });
    }

    function showDag(tableName, workbookName) {
        var deferred = jQuery.Deferred();
        var id = curId;
        var html = '<div class="dagWrap clearfix">' +
                    '<div class="header clearfix">' +
                        '<div class="btn infoIcon">' +
                            '<i class="icon xi-info-rectangle"></i>' +
                        '</div>' +
                        '<div class="tableTitleArea">' +
                            '<span>Table: </span>' +
                            '<span class="tableName">' +
                                tableName +
                            '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        var $dagWrap = $(html);
        $modal.find(".modalMain").append($dagWrap);

        XcalarGetDag(tableName, workbookName)
        .then(function(dagObj) {
            if (id === curId) {
                DagDraw.createDagImage(dagObj.node, $dagWrap);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.error(error);
            if (id === curId) {
                $dagWrap.html('<div class="errorMsg">' +
                                DFTStr.DFDrawError +
                            '</div>');
            }
            deferred.reject(error);
        });
        return deferred.promise();
    }

    function closeModal() {
        modalHelper.clear();
        $modal.find(".modalMain").empty();
        curId = null;
    }

    return DfPreviewModal;
}({}, jQuery));
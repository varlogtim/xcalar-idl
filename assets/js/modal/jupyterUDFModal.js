window.JupyterUDFModal = (function(JupyterUDFModal, $) {
    var $modal;    // $("#jupyterUDFTemplateModal")
    var modalHelper;


    JupyterUDFModal.setup = function() {
        $modal = $("#jupyterUDFTemplateModal");
        reset();

        modalHelper = new ModalHelper($modal, {
            noBackground: true,
            noResize: true
        });
        $modal.on("click", ".close, .cancel", closeModal);

        $modal.on("click", ".confirm", function() {
            submitForm();
        });

        $modal.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });
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
        var args = {
            fnName: $modal.find(".fnName").val(),
            tableName: $modal.find(".tableName").val(),
            columns: columns
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

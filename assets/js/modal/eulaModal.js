window.EULAModal = (function(EULAModal, $) {
    var $modal;
    var logInDeferred;

    EULAModal.show = function() {
        logInDeferred = PromiseHelper.deferred();
        setup();
        $("#container").hide();
        $modal.show();
        return logInDeferred.promise();
    };


    function setup() {
        $modal = $("#eulaModal");

        $modal.on("click", ".confirm", function() {
            submitForm();
        });

        $modal.on("click", ".cancel", function() {
            cancelForm();
        });
    }

    function submitForm() {
        logInDeferred.resolve();
        $modal.hide();
        $("#container").show();
    }

    function cancelForm() {
        window.location = paths.dologout;
        logInDeferred.reject();
    }

    return EULAModal;
}({}, jQuery));

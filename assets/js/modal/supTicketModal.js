window.SupTicketModal = (function($, SupTicketModal) {
    var $modal;  // $("#supTicketModal");
    var modalHelper;
    var $issueList; // $modal.find('.issueList');


    SupTicketModal.setup = function() {
        $modal = $("#supTicketModal");
        $issueList = $modal.find('.issueList');
        var minWidth = 400;
        var minHeight = 400;

        modalHelper = new ModalHelper($modal, {
            "minWidth" : minWidth,
            "minHeight": minHeight
        });

        $modal.resizable({
            "handles"    : "n, e, s, w, se",
            "minHeight"  : minHeight,
            "minWidth"   : minWidth,
            "containment": "document"
        });

        $modal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        $modal.on("click", ".close, .cancel", closeModal);

        setupListeners();
    };

    SupTicketModal.show = function() {
        $modal.addClass('flex-container');
        modalHelper.setup();
    };

    function setupListeners() {
        $modal.find('.confirm').click(submitForm);

        new MenuHelper($issueList, {
            "onSelect": function($li) {
                var newVal = $li.text().trim();
                var $input = $issueList.find('.text');
                var inputVal = $input.val();
                if (newVal !== inputVal) {
                    $input.val(newVal);
                    if (newVal.indexOf('Crash') > -1 ||
                        newVal.indexOf('Performance Issue') > -1) {
                        showSupBundle();
                    } else {
                        hideSupBundle();
                    }
                }
            },
            "container": "#supTicketModal"
        }).setupListeners();

        $modal.find('.genBundleRow .checkboxSection').click(function() {
            var $checkbox = $(this).find('.checkbox');
            $checkbox.toggleClass('checked');
        });
    }

    function showSupBundle() {
        $modal.find('.genBundleRow').removeClass('xc-hidden');
    }

    function hideSupBundle() {
        $modal.find('.genBundleRow').addClass('xc-hidden');
    }

    function submitForm() {
        var genBundle = false;
        var perfOrCrash;
        if (perfOrCrash &&
            $modal.find('.genBundleRow .checkbox').hasClass('checked')) {
            genBundle = true;
        }

        closeModal();
        xcHelper.showSuccess();
    }

    function closeModal() {
        modalHelper.clear();
        hideSupBundle();
        $issueList.find('.text').val("");
        $modal.find('.genBundleRow .checkbox').removeClass('checked');
        $modal.find('.xc-textArea').val("");
    }

    return (SupTicketModal);
}(jQuery, {}));

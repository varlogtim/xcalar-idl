window.DFCommentModal = (function(DFCommentModal, $) {
    var $modal;    // $("#dfCommentModal")
    var $textArea; // $modal.find(".xc-textArea")
    var modalHelper;
    var tableName;

    DFCommentModal.setup = function() {
        $modal = $("#dfCommentModal");
        $textArea = $modal.find(".xc-textArea");

        modalHelper = new ModalHelper($modal, {
            noEnter: true
        });


        $modal.on("click", ".close, .cancel", closeModal);

        $modal.on("click", ".confirm", function() {
            submitForm();
        });

        $modal.find(".clear").click(function() {
            $textArea.val("").focus();
        });
    };

    DFCommentModal.show = function($opIcon, nodeId) {
        if ($modal.is(":visible")) {
            return;
        }

        var title = $opIcon.find(".typeTitle").text();
        $modal.find(".modalHeader .text").text(title);
        var $dagWrap = $opIcon.closest(".dagWrap");

        var node = $dagWrap.data("allDagInfo").nodeIdMap[nodeId];
        tableName = node.value.name;
        var curComment = node.value.comment;

        if (curComment) {
            $modal.addClass("hasComment");
        } else {
            $modal.removeClass("hasComment");
        }
        $textArea.val(curComment);

        modalHelper.setup();
        $textArea.focus();
    };

    function closeModal() {
        modalHelper.clear();
        reset();
    }

    function reset() {
        tableName = null;
        $textArea.val("");
    }

    function submitForm() {
        var newComment = $textArea.val().trim();
        var commentLen = newComment.length;
        if (commentLen > XcalarApisConstantsT.XcalarApiMaxDagNodeCommentLen) {
            var errMsg = 'The maximum allowable comment length is ' +
                        XcalarApisConstantsT.XcalarApiMaxDagNodeCommentLen +
                        ' but you provided ' + commentLen + ' characters.';
            StatusBox.show(errMsg, $textArea);
            return false;
        }

        var tName = tableName;
        closeModal();

        XcalarCommentDagNodes(newComment, [tName])
        .then(function() {
            var $dagPanel = $('#dagPanel');
            var $dagTableTitles = $dagPanel.find('.tableTitle').filter(function() {
                return ($(this).text() === tName);
            });
            if (newComment) {
                // remove comment entirely to fix tooltip html rendering
                $dagTableTitles.each(function() {
                    var $dagTable = $(this).closest(".dagTable");
                    var nodeId = $dagTable.data("index");
                    var $opIcon = $dagTable.closest(".dagTableWrap").find(".operationTypeWrap");
                    var $dagWrap = $opIcon.closest(".dagWrap");
                    var nodeIdMap = $dagWrap.data("allDagInfo").nodeIdMap;

                    $opIcon.find(".commentIcon").remove();
                    Dag.updateComment($opIcon, newComment, nodeIdMap[nodeId]);
                });
            } else {
                $dagTableTitles.each(function() {
                    var $dagTable = $(this).closest(".dagTable");
                    var nodeId = $dagTable.data("index");
                    var $opIcon = $dagTable.closest(".dagTableWrap").find(".operationTypeWrap");
                    $opIcon.removeClass("hasComment");
                    $opIcon.find(".commentIcon").remove();
                    var $dagWrap = $opIcon.closest(".dagWrap");
                    var nodeIdMap = $dagWrap.data("allDagInfo").nodeIdMap;

                    nodeIdMap[nodeId].value.comment = newComment;
                });
            }
        })
        .fail(function(err) {
            console.log(err);
            Alert.error("Commenting Failed", err);
        });
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DFCommentModal.__testOnly__ = {};
    }
    /* End Of Unit Test Only */

    return DFCommentModal;
}({}, jQuery));

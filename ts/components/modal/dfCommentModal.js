window.DFCommentModal = (function(DFCommentModal, $) {
    var $modal;    // $("#dfCommentModal")
    var $textArea; // $modal.find(".xc-textArea")
    var modalHelper;
    var tableName;
    var curCommentObj;
    var isBatchDF;
    var $dagWrap;

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

    DFCommentModal.show = function($opIcon, isBDF) {
        if ($modal.is(":visible")) {
            return;
        }
        isBatchDF = isBDF;

        var title = $opIcon.find(".typeTitle").text();
        $modal.find(".modalHeader .text").text(title);
        $dagWrap = $opIcon.closest(".dagWrap");
        var nodeId = $opIcon.data("nodeid");
        var node = Dag.getNodeById($dagWrap, nodeId);
        tableName = node.value.name;
        curCommentObj = xcHelper.deepCopy(node.value.comment);
        var curComment = curCommentObj.userComment;

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
        var tName = tableName; // store because tableName will be reset
        var isBDF = isBatchDF;
        var commentObj = curCommentObj;
        commentObj.userComment = newComment;
        closeModal();

        var promise;
        if (isBDF) {
            var dfName = $dagWrap.data("dataflowname");
            promise = DF.comment(dfName, tName, newComment, commentObj.meta);
        } else {
            promise = DagFunction.commentDagNodes([tName], newComment, commentObj.meta);
        }

        promise
        .then(function() {
            var $dagTableTitles;
            if (isBDF) {
                $dagTableTitles = $dagWrap.find('.dagTable').filter(function() {
                    return ($(this).data("tablename") === tName);
                }).find(".tableTitle");
            } else {
                var $dagPanel = $('#dagPanel');
                $dagTableTitles = $dagPanel.find('.tableTitle').filter(function() {
                    return ($(this).text() === tName);
                });
            }

            // remove comment entirely to fix tooltip html rendering
            $dagTableTitles.each(function() {
                var $dagTable = $(this).closest(".dagTable");
                var nodeId = $dagTable.data("nodeid");
                var $opIcon = $dagTable.closest(".dagTableWrap").find(".operationTypeWrap");
                var $dagWrap = $opIcon.closest(".dagWrap");
                var node = Dag.getNodeById($dagWrap, nodeId);
                $opIcon.find(".commentIcon").remove();

                if (newComment) {
                    Dag.updateComment($opIcon, commentObj, node);
                } else {
                    $opIcon.removeClass("hasComment");
                    node.value.comment = commentObj;
                }
            });
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

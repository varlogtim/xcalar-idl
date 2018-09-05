class DagComment {
    private static _instance: DagComment;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {

    }

    public setup() {
        const self = this;
        const $dfWrap: JQuery = $("#dagView .dataflowWrap");
        $dfWrap.on("click", ".comment", function() {
            if (!$(this).hasClass("focused")) {
                $(this).appendTo($dfWrap.find(".dataflowArea.active .commentArea"));
            }
        });
        $dfWrap.on("dblclick", ".comment", function() {
            $(this).addClass("focused");
            $(this).find("textarea").prop("readonly", false).focus();
        });
        $dfWrap.on("blur", ".comment textarea", function() {
            $(this).closest(".comment").removeClass("focused");
            $(this).prop("readonly", true);
        });
        $dfWrap.on("change", ".comment textarea", function() {
            const id = $(this).closest(".comment").data("nodeid");
            const text = $(this).val();
            self._updateText(id, text);
        });
    }

    public drawComment(
        commentNode: CommentNode,
        $dfArea: JQuery,
        isSelect?: boolean
    ): void {
        const self = this;
        const pos = commentNode.getPosition();
        const id = commentNode.getId();
        const dim = commentNode.getDimensions();
        let text = commentNode.getText();
        let placeholder = "";
        if (!text) {
            placeholder = "Double-click to edit";
        }
        let $comment = $('<div class="comment" data-nodeid="' + id +
                        '" style="left:' + pos.x + 'px;top:' + pos.y + 'px;' +
                        'width:' + dim.width + 'px;height:' + dim.height +
                        'px;">' +
                            '<textarea spellcheck="false" readonly ' +
                                'placeholder="' + placeholder + '" >' + text +
                            '</textarea>' +
                        '</div>');
        $dfArea.find(".commentArea").append($comment);
        if (isSelect) {
            $comment.addClass("selected");
        }
        $comment.resizable({
            "minWidth": DagView.gridSpacing,
            "minHeight": DagView.gridSpacing,
            "grid": DagView.gridSpacing,
            "stop": function(_event, ui) {
               self._updateDimensions(id, ui.size);
            }
        });
    }

    public removeComment(id) {
        $("#dagView").find('.comment[data-nodeid="' + id + '"]').remove();
    }

    private _updateDimensions(
        id: CommentNodeId,
        size: Dimensions
    ): XDPromise<void> {
        const comment = DagView.getActiveDag().getComment(id);
        comment.setDimensions(size);
        return DagView.getActiveTab().saveTab();
    }

    private _updateText(id: CommentNodeId, text: string): XDPromise<void> {
        DagView.getActiveDag().getComment(id).setText(text);
        return DagView.getActiveTab().saveTab();
    }
}
class DagUDFPopup {
    private static _instance: DagUDFPopup;
    private _$popup: JQuery;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._$popup = $("#dagUDFPopup");
        this._$popup.draggable({
            handle: '#dagUDFPopupTitle',
            cursor: '-webkit-grabbing',
            containment: "window"
        });

        this._$popup.resizable({
            handles: "n, e, s, w, se",
            minHeight: 100,
            minWidth: 230,
            containment: "document"
        });

        this._addEventListeners();
    }

    public show(nodeId: DagNodeId): void {
        const dagNode = DagView.getActiveDag().getNode(nodeId);
        if (dagNode instanceof DagNodeMap) {
            const $elemNode = DagView.getNode(nodeId);
            this._$popup.addClass("active");
            this._positionPopup($elemNode[0].getBoundingClientRect());
            xcTooltip.hideAll();
            $(document).on('mousedown.hideDagUDF', (event) => {
                if ($(event.target).closest('#dagUDFPopup').length === 0 &&
                    !$(event.target).is("#dagView .dataflowWrap")) {
                    this._close();
                }
            });
        
            const $content = this._$popup.find('.content');
            const $header = this._$popup.find('.selHeader');
            const $background = this._$popup.find('.background');
            // Show the loading message
            $content.html(this._genLoadingHTML());
            $header.hide();
            $background.hide();
            // Call API to get resolutions
            dagNode.getModuleResolutions()
            .then((udfRes) => {
                // Show the resolution info.
                $content.html(this._genUDFHTML(udfRes));
                $header.show();
                $background.show();
            })
            .fail(() => {
                // Show the error message
                $content.html(this._genErrorHTML());
                $header.hide();
                $background.hide();
            });
        }
    }

    private _addEventListeners(): void {
        this._$popup.find(".close").click(() => {
            this._close();
        });
    }

    private _close(): void {
        this._$popup.removeClass('active');
        $(document).off('.hideDagUDF');
    }

    private _genLoadingHTML(): HTML {
        return `<p class="message">${StatusMessageTStr.Loading}</p>`;
    }

    private _genErrorHTML(): HTML {
        return `<p class="message">${StatusMessageTStr.Error}</p>`;
    }

    private _genUDFHTML(udfInfo: Map<string, string>): HTML {
        let html = '';
        udfInfo.forEach((resolution, moduleName) => {
            html +=
                `<div title="${moduleName}" class="type">${moduleName}</div>
                <div title="${resolution}" class="field">${resolution}</div>`;
        });
        return html;
    }

    private _positionPopup(nodeRect: ClientRect): void {
        let top: number = Math.max(5, nodeRect.top);
        let left: number = Math.max(5, nodeRect.left);
        let defaultWidth = 300;
        let defaultHeight = 266;
        let rightBoundary: number = $(window).width() - 5;
        let bottomBoundary: number = $(window).height() - 5;

        this._$popup.css("width", "auto");
        let width = Math.min(defaultWidth, this._$popup.outerWidth());
        width = Math.max(230, width);
        this._$popup.width(width);

        this._$popup.css("height", "auto");
        var height = Math.min(defaultHeight, this._$popup.outerHeight());
        height = Math.max(100, height);
        this._$popup.height(height);

        top = Math.max(5, top - this._$popup.outerHeight() - 10);
        this._$popup.css({top: top, left: left});

        let popupRect: ClientRect = this._$popup[0].getBoundingClientRect();
        if (popupRect.right > rightBoundary) {
            left = rightBoundary - popupRect.width;
            this._$popup.css("left", left);
        }
        if (popupRect.bottom > bottomBoundary) {
            top = bottomBoundary - popupRect.height;
            this._$popup.css("top", top);
        }
    }
}
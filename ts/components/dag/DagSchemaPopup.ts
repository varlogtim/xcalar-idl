class DagSchemaPopup {
    private static _instance: DagSchemaPopup;
    private _$popup: JQuery;
    private _nodeId: DagNodeId;
    private _tableColumns: ProgCol[];

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._$popup = $("#dagSchemaPopup");
        this._addEventListeners();
    }

    public show(nodeId: DagNodeId): void {
        const self = this;
        this._nodeId = nodeId;
        this._$popup.addClass("active");
        xcTooltip.hideAll();
        $(document).on('mousedown.hideDagSchema', function(event) {
            if ($(event.target).closest('#dagSchemaPopup').length === 0) {
                self._close();
            }
        });

        this._fillColumns();
        this._positionPopup();
    }

    private _addEventListeners(): void {
        const self = this;
        this._$popup.on("mouseup", ".content li", function(event) {
            if (event.which !== 1) {
                return;
            }
            let $li: JQuery = $(this);
            let $name: JQuery = $li.find('.name');
            let name: string = $name.text();
        });

        this._$popup.on("click", ".expand", function() {
            self._$popup.toggleClass("expanded");
        });

        this._$popup.find(".close").click(function() {
            self._close();
        });

        this._$popup.draggable({
            handle: '#dagSchemaPopupTitle',
            cursor: '-webkit-grabbing',
            containment: "window"
        });

        this._$popup.resizable({
            handles: "n, e, s, w, se",
            minHeight: 200,
            minWidth: 200,
            containment: "document"
        });
    }

    private _fillColumns(): void {
        const dagNode = DagView.getActiveDag().getNode(this._nodeId);
        this._tableColumns = dagNode.getLineage().getColumns() || [];

        const numCols = this._tableColumns.length;
        let html: HTML = "<ul>";
        for (var i = 0; i < numCols; i++) {
            var progCol = this._tableColumns[i];

            var type = progCol.getType();
            var name = xcHelper.escapeHTMLSpecialChar(
                                                progCol.getFrontColName(true));
            var backName = xcHelper.escapeHTMLSpecialChar(
                                                progCol.getBackColName());
            html += '<li>' +
                        '<div>' +
                            '<span class="iconWrap">' +
                                '<i class="icon fa-13 xi-' + type + '"></i>' +
                            '</span>' +
                            '<span class="text">' + type + '</span>' +
                        '</div>' +
                        '<div title="' + xcHelper.escapeDblQuoteForHTML(name) +
                        '" class="name" ' +
                        'data-backname="' + backName + '">' +
                            name +
                        '</div>' +
                        // '<div>' +
                        // // XX SAMPLE DATA GOES HERE
                        // '</div>' +
                    '</li>';
        }
        if (!numCols) {
            html += '<span class="noFields">' + DFTStr.NoFields + '</span>';
        }
        html += "</ul>";

        this._$popup.find(".content").html(html);
    }

    private _positionPopup(): void {
        const $node: JQuery = DagView.getNode(this._nodeId);
        const rect: ClientRect = $node[0].getBoundingClientRect();
        let top: number = Math.max(5, rect.top);
        let left: number = Math.max(5, rect.left);
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
        height = Math.max(200, height);
        this._$popup.height(height);

        top = Math.max(5, top - this._$popup.outerHeight());
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

    private _close(): void {
        this._$popup.removeClass("active");
        $(document).off('.hideDagSchema');
    }
}
class DagSchemaPopup {
    private static _instance: DagSchemaPopup;
    private _$popup: JQuery;
    private _nodeId: DagNodeId;
    private _dagNode: DagNode;
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
        this._dagNode = DagView.getActiveDag().getNode(this._nodeId);
        this._$popup.addClass("active");
        DagView.getNode(this._nodeId).addClass("lineageStart");
        xcTooltip.hideAll();
        $(document).on('mousedown.hideDagSchema', function(event) {
            if ($(event.target).closest('#dagSchemaPopup').length === 0 &&
                !$(event.target).is("#dagView .dataflowWrap")) {
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
            self._clearLineage();
            const $li: JQuery = $(this);
            const $name: JQuery = $li.find(".name");
            self._$popup.find("li.selected").removeClass("selected");
            $li.addClass("selected");
            const colName: string = $name.text();
            const lineage = self._dagNode.getLineage().getColumnHistory(colName);
            for (let i = 0; i < lineage.length; i++) {
                DagView.highlightLineage(lineage[i].id, lineage[i].childId, lineage[i].type);
            }
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
        const lineage = this._dagNode.getLineage()
        this._tableColumns = lineage.getColumns() || [];
        const changes = lineage.getChanges();
        let numCols = changes.length;
        let html: HTML = "<ul>";
        let adds = {html: ""};
        let removes = {html: ""};
        let replaces = {html: ""};
        let changeIcon;
        let seenColumns = {};

        for (let i = 0; i < changes.length; i++) {
            const change = changes[i];
            let changeType;
            let progCol;
            let otherProgCol;
            let htmlType;
            if (change.to) {
                seenColumns[change.to.getBackColName()] = true;
                if (change.from) {
                    progCol = change.to;
                    otherProgCol = change.from;
                    changeType = "replace";
                    htmlType = replaces;
                    changeIcon = "+";
                } else {
                    progCol = change.to;
                    changeType = "add";
                    htmlType = adds;
                    changeIcon = "+";
                }
            } else if (change.from) {
                progCol = change.from;
                changeType = "remove";
                htmlType = removes;
                changeIcon = "-";
            }

            if (changeType === "replace") {
                htmlType.html += '<ul class="replaceSection">';
                let liClass = 'changeType-' + changeType + ' changeType-remove';
                htmlType.html += this._liTemplate(otherProgCol, changeIcon,
                                                  liClass);
            }

            let liClass = 'changeType-' + changeType;
            htmlType.html += this._liTemplate(progCol, changeIcon,
                                             liClass);
            if (changeType === "replace") {
                htmlType.html += '<div class="arrow">&darr;</div>';
                htmlType.html += '</ul>';
            }
        }

        html += removes.html;
        html += adds.html;
        html += replaces.html;

        numCols += this._tableColumns.length;

        let noChange = !html.length;

        for (let i = 0; i < this._tableColumns.length; i++) {
            const progCol = this._tableColumns[i];
            if (seenColumns[progCol.getBackColName()]) {
                continue;
            }

            html += this._liTemplate(progCol, "", "");
        }

        if (!numCols) {
            html += '<span class="noFields">' + DFTStr.NoFields + '</span>';
        }
        html += "</ul>";

        this._$popup.find(".content").html(html);
        if (noChange) {
            this._$popup.addClass("noChange");
        } else {
            this._$popup.removeClass("noChange");
        }
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

    private _close(): void {
        this._$popup.removeClass("active");
        $(document).off('.hideDagSchema');
        this._$popup.find(".content").empty();
        DagView.getNode(this._nodeId).removeClass("lineageStart");
        this._dagNode = null;
        this._nodeId = null;
        this._clearLineage();
    }

    private _liTemplate(
        progCol: ProgCol,
        changeIcon: string,
        liClass: string
    ): HTML {
        let type = progCol.getType();
        let name = xcHelper.escapeHTMLSpecialChar(
                                            progCol.getFrontColName(true));
        let backName = xcHelper.escapeHTMLSpecialChar(
                                            progCol.getBackColName());
        let html: HTML =
            '<li class="' + liClass + '">' +
                '<div>' +
                    '<span class="changeWrap">' + changeIcon + '</span>' +
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
        return html;
    }

    private _clearLineage() {
        $("#dagView").find(".lineageSelected").removeClass("lineageSelected");
        $("#dagView").find(".lineageTip").remove();
    }
}
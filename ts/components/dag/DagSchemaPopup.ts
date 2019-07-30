class DagSchemaPopup {
    private static _instance: DagSchemaPopup;
    private _$popup: JQuery;
    private _nodeId: DagNodeId;
    private _tabId: string;
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
        this._tabId = DagViewManager.Instance.getActiveDag().getTabId();
        this._dagNode = DagViewManager.Instance.getActiveDag().getNode(this._nodeId);
        if (this._dagNode == null) {
            console.error("error case");
            return;
        }

        this._$popup.addClass("active");
        DagViewManager.Instance.getNode(this._nodeId, this._tabId).addClass("lineageStart");
        xcTooltip.hideAll();
        $(document).on('mousedown.hideDagSchema', function(event) {
            const $target = $(event.target);
            if ($target.closest('#dagSchemaPopup').length === 0 &&
                !$target.is("#dagView .dataflowWrap") &&
                !$target.is("#dagView .dataflowArea")) {
                self._close();
            }
        });

        this._fillColumns();
        this._positionPopup();
    }

    private _addEventListeners(): void {
        const self = this;
        this._$popup.on("mouseup", ".content li", function(event) {
            if (event.which !== 1 || (isSystemMac && event.ctrlKey)) {
                return;
            }
            self._clearLineage();
            const $li: JQuery = $(this);
            const $name: JQuery = $li.find(".name");
            self._$popup.find("li.selected").removeClass("selected");
            $li.addClass("selected");
            const colName: string = $name.text();
            const destCol: string = $name.data('destcol').trim();
            let promise: XDPromise<any> = PromiseHelper.resolve();
            if (self._dagNode instanceof DagNodeSQL) {
                // Special case for SQL node
                let subGraph = self._dagNode.getSubGraph();
                if (!subGraph) {
                    self._$popup.find(".content, .close").addClass("xc-disabled");
                    const params: DagNodeSQLInputStruct = self._dagNode.getParam();
                    if (params.sqlQueryStr) {
                        const queryId = xcHelper.randName("sql", 8);
                        promise = self._dagNode.compileSQL(params.sqlQueryStr, queryId)
                        .always(() => {
                            self._$popup.find(".content, .close").removeClass("xc-disabled");
                        });
                    }
                }
            }
            promise
            .then(() => {
                const lineage = self._dagNode.getLineage().getColumnHistory(colName, null, destCol.length > 0? destCol: null);
                for (let i = 0; i < lineage.length; i++) {
                    DagViewManager.Instance.highlightLineage(lineage[i].id, lineage[i].childId, lineage[i].type);
                }
            });
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
        let hiddenColumns = lineage.getHiddenColumns();
        const changes = lineage.getChanges();
        let numCols = changes.length;
        let html: HTML = "<ul>";
        let adds = {html: ""};
        let removes = {html: ""};
        let replaces = {html: ""};
        let hides = {html: ""};
        let changeIcon;
        let seenColumns: Set<string> = new Set();

        const columnDeltas: Map<string, any> = this._dagNode.getColumnDeltas();
        let columnsHiddenThisNode: Set<string> = new Set();
        columnDeltas.forEach((colInfo, colName) => {
            if (colInfo.isHidden) {
                columnsHiddenThisNode.add(colName);
            }
        });

        // list changes first
        for (let i = 0; i < changes.length; i++) {
            const change = changes[i];
            let changeType = "";
            let progCol;
            let destCol;
            let otherProgCol;
            let htmlType;
            let isHidden = change.hidden || false;

            if (change.to) {
                progCol = change.to;
                seenColumns.add(progCol.getBackColName());

                if (change.from) {
                    otherProgCol = change.from;
                    changeType = "replace";
                    htmlType = replaces;
                    changeIcon = "+";
                    if (hiddenColumns.has(otherProgCol.getBackColName())) {
                        if (columnsHiddenThisNode.has(otherProgCol.getBackColName()) &&
                        otherProgCol.getBackColName() !== progCol.getBackColName()) {
                            // renamed column was not hidden
                        } else {
                            isHidden = true;
                        }
                    }
                } else {
                    changeType = "add";
                    htmlType = adds;
                    changeIcon = "+";
                    if (hiddenColumns.has(progCol.getBackColName())) {
                        isHidden = true;
                    }
                }
            } else if (change.from) {
                progCol = change.from;
                destCol = change.from;
                changeType = "remove";
                htmlType = removes;
                changeIcon = "-";
            } else if (change.hiddenCol) {
                progCol = change.hiddenCol;
                seenColumns.add(progCol.getBackColName());
                destCol = progCol;
                htmlType = hides;
                changeIcon = "";
                changeType = "hidden";
            }

            if (changeType === "replace") {
                htmlType.html += '<ul class="replaceSection">';

                let liClass = 'changeType-' + changeType + ' changeType-remove';
                if (isHidden) {
                    liClass += " hidden";
                }
                htmlType.html += this._liTemplate(otherProgCol, changeIcon,
                                                  liClass, progCol, isHidden);
            }

            let liClass = 'changeType-' + changeType;
            if (isHidden) {
                liClass += " hidden";
            }
            htmlType.html += this._liTemplate(progCol, changeIcon,
                                             liClass, destCol, isHidden);
            if (changeType === "replace") {
                htmlType.html += '<div class="arrow">&darr;</div>';
                htmlType.html += '</ul>';
            }
        }

        html += removes.html;
        html += adds.html;
        html += replaces.html;

        numCols += this._tableColumns.length;

        let noChange = (html === "<ul>");

        // list columns that have no change (have not been seen)

        this._tableColumns.forEach(progCol => {
            if (seenColumns.has(progCol.getBackColName())) {
                return;
            }
            seenColumns.add(progCol.getBackColName());
            html += this._liTemplate(progCol, "", "");
        });

        hiddenColumns.forEach((progCol, colName) => {
            if (seenColumns.has(colName)) {
                return;
            }
            html += this._liTemplate(progCol, "", "hidden", null, true);
            numCols++;
        });

        html += hides.html; // show hidden columns after kept columns

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
        const $node: JQuery = DagViewManager.Instance.getNode(this._nodeId, this._tabId);
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
        DagViewManager.Instance.getNode(this._nodeId, this._tabId).removeClass("lineageStart");
        this._dagNode = null;
        this._nodeId = null;
        this._tabId = null;
        this._clearLineage();
    }

    private _liTemplate(
        progCol: ProgCol,
        changeIcon: string,
        liClass: string,
        destCol?: ProgCol,
        isHidden?: boolean
    ): HTML {
        let type = progCol.getType();
        let name = xcStringHelper.escapeHTMLSpecialChar(
                                            progCol.getFrontColName(true));
        let backName = xcStringHelper.escapeHTMLSpecialChar(
                                            progCol.getBackColName());
        const destColName = destCol != null
            ? xcStringHelper.escapeHTMLSpecialChar(destCol.getBackColName())
            : '';
        let hideIcon: HTML = isHidden ? '<i class="icon xi-hide" ' + xcTooltip.Attrs +
                        '  data-tipclasses="highZindex" data-original-title="Field is hidden from result set"></i>' : "";
        let html: HTML =
            '<li class="' + liClass + '">' +
                '<div>' +
                    '<span class="changeWrap">' + changeIcon + '</span>' +
                    '<span class="iconWrap">' +
                        '<i class="icon fa-13 xi-' + type + '"></i>' +
                    '</span>' +
                    '<span class="text">' + type + '</span>' +
                '</div>' +
                '<div title="' + xcStringHelper.escapeDblQuoteForHTML(name) +
                '" class="name" ' +
                `data-destcol="${destColName}" ` +
                'data-backname="' + backName + '">' +
                    name +
                '</div>' +
                hideIcon +
                // '<div>' +
                // // XX SAMPLE DATA GOES HERE
                // '</div>' +
            '</li>';
        return html;
    }

    private _clearLineage() {
        $("#dagView").find(".lineageSelected").removeClass("lineageSelected");
        $("#dagView").find(".lineageTip").remove();
        $("#dagView").removeClass("hideProgressTips");
    }
}
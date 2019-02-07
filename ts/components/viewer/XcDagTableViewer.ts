class XcDagTableViewer extends XcTableViewer {
    private dataflowTabId: string;
    private dagNode: DagNode;

    public static getTableFromDagNode(dagNode: DagNode): TableMeta {
        const tableName: string = dagNode.getTable();
        // XXX this code should be change after refine the table meta structure
        const tableId: TableId = xcHelper.getTableId(tableName);
        let table: TableMeta = gTables[tableId];
        if (!table) {
            table = new TableMeta({
                tableName: tableName,
                tableId: tableId,
                tableCols: [ColManager.newDATACol()]
            });
            gTables[tableId] = table;
        }
        const columns: ProgCol[] = dagNode.getLineage().getColumns(true);
        if (columns != null && columns.length > 0) {
            table.tableCols = columns.concat(ColManager.newDATACol());
        }
        return table;
    }

    public constructor(tabId: string, dagNode: DagNode, table: TableMeta) {
        const tableName: string = table.getName();
        super(table);
        this.dataflowTabId = tabId;
        this.dagNode = dagNode;
        DagTblManager.Instance.resetTable(tableName);
    }

    public getTitle(): string {
        return this.dagNode.getTitle();
    }

    /**
     * Clear Table Preview
     */
    public clear(): XDPromise<void> {
        this._removeTableIconOnDagNode();
        return super.clear();
    }

    /**
     * Render the view of the data
     */
    public render($container: JQuery): XDPromise<void> {
        this._showTableIconOnDagNode();
        return super.render($container);
    }

    public getDataflowTabId(): string {
        return this.dataflowTabId;
    }

    public getNode(): DagNode {
        return this.dagNode;
    }

    public getNodeId(): DagNodeId {
        return this.dagNode.getId();
    }

    public replace(table: TableMeta): XcDagTableViewer {
        return new XcDagTableViewer(this.dataflowTabId, this.dagNode, table);
    }

    protected _afterBuild(): void {
        super._afterBuild();
        const tableId: TableId = this.table.getId();
        const $table: JQuery = $('#xcTable-' + tableId);
        $table.removeClass("noOperation");
    }

    private _getNodeEl(): JQuery {
        return DagViewManager.Instance.getNode(this.dagNode.getId(), this.dataflowTabId);
    }

    private _showTableIconOnDagNode(): void {
        const $node: JQuery = this._getNodeEl();
        if ($node.length && !$node.find(".tableIcon").length) {
            const g = d3.select($node.get(0)).append("g")
                    .attr("class", "tableIcon")
                    .attr("transform", "translate(65, 2)");
            g.append("rect")
                .attr("x", 0)
                .attr("y", -8)
                .attr("width", 15)
                .attr("height", "13")
                .style("fill", "#378CB3");
            g.append("text")
                .attr("font-family", "icomoon")
                .attr("font-size", 8)
                .attr("fill", "white")
                .attr("x", 3)
                .attr("y", 2)
                .text(function(_d) {return "\uea07"});
        }
    }

    private _removeTableIconOnDagNode(): void {
        const $node: JQuery = this._getNodeEl();
        if ($node.length) {
            d3.select($node.get(0)).selectAll(".tableIcon").remove();
        }
    }
}
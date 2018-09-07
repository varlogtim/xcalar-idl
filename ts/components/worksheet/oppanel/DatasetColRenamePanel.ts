class DatasetColRenamePanel {
    private $view: JQuery;
    private sourceNode: DagNode;
    private colRenameView;
    private viewOptions;
    private isOpen = false;
    private static _instance;

    public static get Instance() {
        return  this._instance || (this._instance = new this());
    }

    constructor() {
        this.$view = $("#datasetOpColumnAssignment");

        this.colRenameView = new ColAssignmentView("#datasetOpColumnAssignment",
            {
                labels: [OpFormTStr.PreviousColumns, OpFormTStr.NewColumns]
            });
        this._modifyColRenameSection();
        this._registerHandlers();
    }

    public show(dagNode, oldColumns, options): void {
        this.isOpen = true;
        this.$view.removeClass("xc-hidden");
        this.sourceNode = dagNode;
        this.viewOptions = options || {};

        const newColumns = dagNode.getLineage().getColumns();
        const allColSets = [oldColumns, newColumns];
        const selectedColSets = [[],[]];
        allColSets[1].forEach(function(col: ProgCol) {
            selectedColSets[0].push({
                sourceColumn: null,
                destColumn: null,
                columnType: null,
                cast: false
            });
            selectedColSets[1].push({
                sourceColumn: col.getBackColName(),
                destColumn: null,
                columnType: col.getType(),
                cast: false
            });
        });
        this.colRenameView.show(allColSets, selectedColSets);
        this._modifyColRenameSection();
    }

    public close(): void {
        if (!this.isOpen) {
            return;
        }
        this.isOpen = false;
        this.$view.addClass("xc-hidden");
        if (typeof this.viewOptions.onClose === "function") {
            this.viewOptions.onClose();
        }
    }

    private _modifyColRenameSection() {
        this.$view.off("click.candidateSection");
        this.$view.find(".tableSection .header .text")
                  .text(OpFormTStr.SelectColRename);
        this.$view.find(".candidateSection .subHeading .text")
                  .text(OpFormTStr.NotRenamed + ":");
    }

    private _registerHandlers(): void {
        this.$view.on("click", ".confirmRename", () => {
            this._submit();
        });
    }

    private _submit() {
        const data = this.colRenameView.getParam();
        const cols: {
            sourceColumn: string,
            destColumn: string,
            columnType: ColumnType,
            cast: boolean
        }[][] = data.columns;
        const oldCols = cols[0];
        const newCols = cols[1];
        const renameMap = {
            columns: {},
            prefixes: {}
        };
        oldCols.forEach((oldCol, index: number) => {
            if (!oldCol.sourceColumn) return;
            renameMap.columns[oldCol.sourceColumn] = newCols[index].sourceColumn;
        });
        const keys = Object.keys(renameMap.columns);
        let oldPrefix;
        let newPrefix;
        if (keys.length) {
            oldPrefix = xcHelper.parsePrefixColName(keys[0]).prefix;
            newPrefix = xcHelper.parsePrefixColName(renameMap.columns[keys[0]]).prefix;
            renameMap.prefixes[oldPrefix] = newPrefix;
        } else {
            const model = this.colRenameView.getModel();
            oldPrefix = model.all[0][0].getPrefix();
            newPrefix = model.all[1][0].getPrefix();
            if (oldPrefix !== newPrefix) {
                renameMap.prefixes[oldPrefix] = newPrefix;
            }
        }

        if (Object.keys(renameMap.prefixes).length) {
            const dagGraph = DagView.getActiveDag();
            dagGraph.applyColumnMapping(this.sourceNode.getId(), renameMap);
        }
        this.close();
    }
}
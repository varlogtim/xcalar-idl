class ProjectOpPanelModel {
    public derivedList: ProjectOpPanelModelColumnInfo[] = [];
    public prefixedList: ProjectOpPanelModelPrefixColumn[] = [];

    public static fromDag(dagNode: DagNodeProject) {
        const model = new ProjectOpPanelModel();

        const projectedColumns = dagNode.getParam().columns.reduce( (res, col) => {
            res[col] = true;
            return res;
        }, {});

        const allColsList = dagNode.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns();
        });
        const allColMap: Map<string, ProgCol> = new Map();
        for (const cols of allColsList) {
            for (const col of cols) {
                allColMap.set(col.getBackColName(), col);
            }
        }

        const prefixLookupMap = {};
        for (const [colName, colInfo] of allColMap.entries()) {
            const isSelected = projectedColumns[colName] ? true : false;
            if (colInfo.prefix == null || colInfo.prefix.length === 0) {
                // Derived column
                model.derivedList.push({
                    name: colName,
                    isSelected: isSelected
                });
            } else {
                // Prefixed column
                const prefix = colInfo.prefix;
                let prefixIndex = prefixLookupMap[prefix];
                if (prefixIndex == null) {
                    model.prefixedList.push({
                        prefix: prefix,
                        isSelected: isSelected,
                        columnList: []
                    });
                    prefixIndex = model.prefixedList.length - 1;
                    prefixLookupMap[prefix] = prefixIndex;
                }
                model.prefixedList[prefixIndex].columnList.push({
                    name: colName,
                    isSelected: false // Not used for prefixed column
                });
            }
        }
        
        return model;
    }

    public toDag(): DagNodeProjectInput {
        const dagData = { columns: [] };
        for (const colInfo of this.derivedList) {
            if (colInfo.isSelected) {
                dagData.columns.push(colInfo.name);
            }
        }
        for (const group of this.prefixedList) {
            if (group.isSelected) {
                for (const colInfo of group.columnList) {
                    dagData.columns.push(colInfo.name);
                }
            }
        }

        return dagData;
    }

    public get isAllDerivedSelected(): boolean {
        for (const column of this.derivedList) {
            if (!column.isSelected) {
                return false;
            }
        }
        return true;
    }

    public selectAllDerived(isSelected: boolean) {
        for (const column of this.derivedList) {
            column.isSelected = isSelected;
        }
    }

    public getSelectedCount(): {derived: number, prefixed: number} {
        const derivedCount = this.derivedList.reduce( (res, column) => (
            res + (column.isSelected ? 1 : 0)
        ), 0);
        const prefixedCount = this.prefixedList.reduce( (res, prefix) => (
            res + (prefix.isSelected ? 1 : 0)
        ), 0);
        return { derived: derivedCount, prefixed: prefixedCount };
    }
}
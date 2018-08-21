class JoinOpPanelModel {
    public currentStep: number = 1;
    public columnMeta: {
        left: JoinOpColumnInfo[],
        right: JoinOpColumnInfo[]
    } = { left: [], right: [] };
    public prefixMeta: { left: string[], right: string[] } = { left: [], right: [] };
    public joinType: string = JoinOperatorTStr[JoinOperatorT.InnerJoin];
    public joinColumnPairs: JoinOpColumnPair[] = [];
    public columnRename: {
        left: JoinOpRenameInfo[],
        right: JoinOpRenameInfo[]
    } = { left: [], right: [] };
    public evalString = '';

    public static fromDag(dagNode: DagNodeJoin): JoinOpPanelModel {
        const model = new JoinOpPanelModel();
        const joinData = dagNode.getParam();
        const joinLeft = joinData.left;
        const joinRight = joinData.right;

        // Data validation
        if (joinLeft.columns.length !== joinLeft.casts.length
            || joinRight.columns.length !== joinRight.casts.length
            || joinLeft.columns.length !== joinRight.columns.length
        ) {
            console.error('JoinOpPanelModel.fromDag: data length mismatch');
            return model;
        }
        if (dagNode.getNumParent() < 2) {
            console.error(`JoinOpPanelModel.fromDag: too few parent nodes(${dagNode.getNumParent()})`);
            return model;
        }

        // Get columns from lineage
        const [leftDag, rightDag] = dagNode.getParents();
        const leftColMap: Map<string, ProgCol> = new Map();
        for (const col of leftDag.getLineage().getColumns()) {
            leftColMap.set(col.getBackColName(), col);
        }
        const rightColMap: Map<string, ProgCol> = new Map();
        for (const col of rightDag.getLineage().getColumns()) {
            rightColMap.set(col.getBackColName(), col);
        }

        // Join Type
        model.joinType = joinData.joinType;
        
        // Candidate columns & prefixes
        const leftPrefixMap = {};
        for (const [colName, colInfo] of leftColMap) {
            const isPrefix = (colInfo.prefix != null && colInfo.prefix.length > 0);
            model.columnMeta.left.push({
                name: colName,
                type: colInfo.getType(),
                isPrefix: isPrefix
            });
            if (isPrefix) {
                leftPrefixMap[colInfo.prefix] = 1;
            }
        }
        this._sortColumnMeta(model.columnMeta.left);
        const leftColLookupMap = model.columnMeta.left.reduce( (res, col, index) => {
            res[col.name] = index;
            return res;
        }, {} );

        for (const prefix of Object.keys(leftPrefixMap)) {
            model.prefixMeta.left.push(prefix);
        }
        this._sortPrefixMeta(model.prefixMeta.left);
        const leftPrefixLookupMap = model.prefixMeta.left.reduce( (res, prefix, index) => {
            res[prefix] = index;
            return res;
        }, {});


        const rightPrefixMap = {};
        for (const [colName, colInfo] of rightColMap) {
            const isPrefix = (colInfo.prefix != null && colInfo.prefix.length > 0);
            model.columnMeta.right.push({
                name: colName,
                type: colInfo.getType(),
                isPrefix: isPrefix
            });
            if (isPrefix) {
                rightPrefixMap[colInfo.prefix] = 1;
            }
        }
        this._sortColumnMeta(model.columnMeta.right);
        const rightColLookupMap = model.columnMeta.right.reduce( (res, col, index) => {
            res[col.name] = index;
            return res;
        }, {} );

        for (const prefix of Object.keys(rightPrefixMap)) {
            model.prefixMeta.right.push(prefix);
        }
        this._sortPrefixMeta(model.prefixMeta.right);
        const rightPrefixLookupMap = model.prefixMeta.right.reduce( (res, prefix, index) => {
            res[prefix] = index;
            return res;
        }, {});

        // JoinOn pairs
        const pairLen = joinLeft.columns.length;
        for (let i = 0; i < pairLen; i ++) {
            const leftColIndex = leftColLookupMap[joinLeft.columns[i]];
            const rightColIndex = rightColLookupMap[joinRight.columns[i]];
            if (leftColIndex == null || rightColIndex == null) {
                console.error(`JoinOpPanelModel.fromDag: column not exists in metadata(${joinLeft.columns[i]},${joinRight.columns[i]})`);
                continue;
            }
            model.joinColumnPairs.push({
                left: leftColIndex,
                right: rightColIndex,
                isCastNeed: false
            });
            model.columnMeta.left[leftColIndex].type = joinLeft.casts[i];
            model.columnMeta.right[rightColIndex].type = joinRight.casts[i];
        }

        // Renames
        const renamePrefixMapLeft = {};
        const renameColMapLeft = {};
        for (const rename of joinLeft.rename) {
            if (rename.prefix) {
                renamePrefixMapLeft[rename.sourceColumn] = rename;
            } else {
                renameColMapLeft[rename.sourceColumn] = rename;
            }
        }
        const renamePrefixMapRight = {};
        const renameColMapRight = {};
        for (const rename of joinRight.rename) {
            if (rename.prefix) {
                renamePrefixMapRight[rename.sourceColumn] = rename;
            } else {
                renameColMapRight[rename.sourceColumn] = rename;
            }
        }
        // Check column name collision
        let isCheckLeft = model.columnMeta.left.length < model.columnMeta.right.length;
        const columnsToCheck = isCheckLeft
            ? model.columnMeta.left
            : model.columnMeta.right;
        const columnMapToCheck = isCheckLeft? rightColLookupMap: leftColLookupMap;
        const columnMetaToCheck = isCheckLeft? model.columnMeta.right: model.columnMeta.left;
        for (const col of columnsToCheck) { // columnsToCheck consists of prefixed & derived columns
            if (col.isPrefix) {
                // Skip the prefixed column
                continue;
            }

            // Find the columnMetaIndex in the other table
            const collisionColIndex = columnMapToCheck[col.name];
            if (collisionColIndex == null) {
                // Same column name exists in the other table
                continue;
            }
            // Get the column meta of the collided column
            const collisionColMeta = columnMetaToCheck[collisionColIndex];
            if (collisionColMeta.isPrefix) {
                // This should never happen: a prefixed column name in the form of derived
                console.error(`JoinOpPanelModel.fromDag: Invalid prefixed column name(${collisionColMeta.name})`);
                continue;
            }

            const leftRenameInfo = renameColMapLeft[col.name];
            model.columnRename.left.push({
                source: leftColLookupMap[col.name],
                dest: leftRenameInfo == null ? '': leftRenameInfo.destColumn,
                isPrefix: false
            });

            const rightRenameInfo = renameColMapRight[col.name];
            model.columnRename.right.push({
                source: rightColLookupMap[col.name],
                dest: rightRenameInfo == null ? '': rightRenameInfo.destColumn,
                isPrefix: false
            });
        }
        // Check prefix name collision
        isCheckLeft = model.prefixMeta.left.length < model.prefixMeta.right.length;
        const prefixToCheck = isCheckLeft
            ? model.prefixMeta.left
            : model.prefixMeta.right;
        const prefixMapToCheck = isCheckLeft
            ? rightPrefixLookupMap
            : leftPrefixLookupMap;
        for (const prefix of prefixToCheck) {
            if (prefixMapToCheck[prefix] == null) {
                // No collision
                continue;
            }

            const leftRenameInfo = renamePrefixMapLeft[prefix];
            model.columnRename.left.push({
                source: leftPrefixLookupMap[prefix],
                dest: leftRenameInfo == null ? '' : leftRenameInfo.destColumn,
                isPrefix: true
            });
            const rightRenameInfo = renamePrefixMapRight[prefix];
            model.columnRename.right.push({
                source: rightPrefixLookupMap[prefix],
                dest: rightRenameInfo == null ? '' : rightRenameInfo.destColumn,
                isPrefix: true
            });
        }

        model._setColumnCastFlag();
        return model;
    }

    public toDag(): DagNodeJoinInput {
        const dagData: DagNodeJoinInput = {
            joinType: this.joinType,
            left: { columns: [], casts: [], rename: [] },
            right: { columns: [], casts: [], rename: [] },
            evalString: this.evalString
        };

        // JoinOn columns
        for (const colPair of this.joinColumnPairs) {
            const { left: leftCol, right: rightCol} = this.getColumnPairMeta(colPair);
            // Left JoinOn column
            dagData.left.columns.push(leftCol.name);
            dagData.left.casts.push(leftCol.type);
            // Right JoinOn column
            dagData.right.columns.push(rightCol.name);
            dagData.right.casts.push(rightCol.type);
        }

        // Renamed left prefixes & columns
        for (const renameInfo of this.columnRename.left) {
            const source = renameInfo.isPrefix
                ? this.prefixMeta.left[renameInfo.source]
                : this.columnMeta.left[renameInfo.source].name;
            dagData.left.rename.push({
                sourceColumn: source,
                destColumn: renameInfo.dest,
                prefix: renameInfo.isPrefix
            });
        }

        // Renamed left prefixes & columns
        for (const renameInfo of this.columnRename.right) {
            const source = renameInfo.isPrefix
                ? this.prefixMeta.right[renameInfo.source]
                : this.columnMeta.right[renameInfo.source].name;
            dagData.right.rename.push({
                sourceColumn: source,
                destColumn: renameInfo.dest,
                prefix: renameInfo.isPrefix
            });
        }

        return dagData;
    }

    public static getDefaultColumnPair(): JoinOpColumnPair {
        return { left: -1, right: -1, isCastNeed: false };
    }

    public getColumnPairMeta(
        colPair: JoinOpColumnPair
    ): {left: JoinOpColumnInfo, right: JoinOpColumnInfo} {
        const {left: leftIndex, right: rightIndex} = colPair;
        return {
            left: (leftIndex >= 0 && leftIndex < this.columnMeta.left.length)
                ? this.columnMeta.left[leftIndex]
                : null,
            right: (rightIndex >= 0 && rightIndex < this.columnMeta.right.length)
                ? this.columnMeta.right[rightIndex]
                : null
        };
    }

    public getRenameMetaName(props: {
        renameInfo: JoinOpRenameInfo,
        isLeft: boolean
    }) {
        const { renameInfo, isLeft } = props;
        const table = isLeft ? 'left' : 'right';
        if (renameInfo.isPrefix) {
            return this.prefixMeta[table][renameInfo.source];
        } else {
            return this.columnMeta[table][renameInfo.source].name;
        }
    }

    public addColumnPair(colPair?: JoinOpColumnPair) {
        let pairToAdd;
        if (colPair != null) {
            pairToAdd = Object.assign({}, colPair);
        } else {
            pairToAdd = JoinOpPanelModel.getDefaultColumnPair();
        }
        const len = this.joinColumnPairs.push(pairToAdd);
        this._setColumnCastFlag(len - 1);
    }

    public removeColumnPair(index: number) {
        return this.joinColumnPairs.splice(index, 1);
    }

    public modifyColumnPair(
        pairIndex: number,
        pairInfo: { left?: number, right?: number}
    ): void {
        if (pairIndex < this.joinColumnPairs.length){
            const pairToChange = this.joinColumnPairs[pairIndex];
            if (pairInfo.left != null) {
                pairToChange.left = pairInfo.left;
            }
            if (pairInfo.right != null) {
                pairToChange.right = pairInfo.right;
            }
            this._setColumnCastFlag(pairIndex);
        }
    }

    public modifyColumnTypeByPair(
        pairIndex: number,
        typeInfo: { left?: ColumnType, right?: ColumnType }
    ): void {
        if (pairIndex < this.joinColumnPairs.length) {
            const colPair = this.joinColumnPairs[pairIndex];
            if (typeInfo.left != null) {
                this.columnMeta.left[colPair.left].type = typeInfo.left;
            }
            if (typeInfo.right != null) {
                this.columnMeta.right[colPair.right].type = typeInfo.right;
            }
            this._setColumnCastFlag(pairIndex);
        }
    }

    public _setColumnCastFlag(pairIndex?: number) {
        if (pairIndex != null) {
            this.joinColumnPairs[pairIndex].isCastNeed
                = this._isColumnCastNeed(pairIndex);
        } else {
            for (let i = 0; i < this.joinColumnPairs.length; i ++) {
                this.joinColumnPairs[i].isCastNeed = this._isColumnCastNeed(i);
            }
        }
    }

    private _isColumnCastNeed(
        pairIndex: number
    ): boolean {
        const columnPair = this.joinColumnPairs[pairIndex];
        const {left: leftMeta, right: rightMeta}
         = this.getColumnPairMeta(columnPair);
        return ( leftMeta != null
            && rightMeta != null
            && leftMeta.type !== rightMeta.type);
    }

    private static _sortPrefixMeta(
        prefixList: string[]
    ) {
        prefixList.sort( (a, b) => {
            return (a > b) ? 1 : ( a < b ? -1 : 0);
        });
    }

    private static _sortColumnMeta(
        colList: JoinOpColumnInfo[]
    ) {
        colList.sort( (a, b) => {
            if (a.isPrefix === b.isPrefix) {
                return (a.name > b.name) ? 1 : ( a.name < b.name ? -1 : 0);
            } else {
                return a.isPrefix ? 1 : -1;
            }
        });
    }
}
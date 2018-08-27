class JoinOpPanelModel {
    private _currentStep: number = 1;
    private _columnMeta: {
        left: JoinOpColumnInfo[],
        leftMap: Map<string, JoinOpColumnInfo>,
        right: JoinOpColumnInfo[],
        rightMap: Map<string, JoinOpColumnInfo>
    } = { left: [], leftMap: new Map(), right: [], rightMap: new Map() };
    private _prefixMeta: {
        left: string[],
        leftMap: Map<string, string>,
        right: string[],
        rightMap: Map<string, string>
    } = { left: [], leftMap: new Map(), right: [], rightMap: new Map() };
    private _joinType: string = JoinOperatorTStr[JoinOperatorT.InnerJoin];
    private _joinColumnPairs: JoinOpColumnPair[] = [];
    private _columnRename: {
        left: JoinOpRenameInfo[],
        right: JoinOpRenameInfo[]
    } = { left: [], right: [] };
    private _evalString = '';

    public static fromDag(dagNode: DagNodeJoin): JoinOpPanelModel {
        try {
            const [leftParent, rightParent] = dagNode.getParents();
            return this.fromDagInput(
                this._getColumnsFromDagNode(leftParent),
                this._getColumnsFromDagNode(rightParent),
                dagNode.getParam()
            );
        } catch(e) {
            console.error(e);
            return new JoinOpPanelModel();
        }
    }

    /**
     * Create JoinOpPanelModel instance from DagNode configuration and column meta
     * @param leftColList Could be null/empty
     * @param rightColList Could be null/empty
     * @param config DagNodeJoinInput object
     * @throws JS exception/JoinOpError
     */
    public static fromDagInput(
        leftColList: ProgCol[],
        rightColList: ProgCol[],
        config: DagNodeJoinInput
    ) {
        const model = new JoinOpPanelModel();
        if (config == null) {
            return model;
        }

        const {
            left: configLeft, right: configRight,
            joinType: configJoinType, evalString: configEvalString
        } = config;


        // Basic Data validation
        if (configLeft.columns.length !== configLeft.casts.length
            || configRight.columns.length !== configRight.casts.length
            || configLeft.columns.length !== configLeft.columns.length
        ) {
            throw new Error(JoinOpError.ColumnTypeLenMismatch);
        }

        // === DagLineage ===
        // Candidate columns & prefixes
        const {
            columnMeta: leftColumnMeta,
            prefixMeta: leftPrefixMeta,
            columnLookup: leftColLookupMap,
            prefixLookup: leftPrefixLookupMap
        } = this._parseColumnPrefixMeta(leftColList);
        model._columnMeta.left = leftColumnMeta;
        model._columnMeta.leftMap = leftColLookupMap;
        model._prefixMeta.left = leftPrefixMeta;
        model._prefixMeta.leftMap = leftPrefixLookupMap;

        const {
            columnMeta: rightColumnMeta,
            prefixMeta: rightPrefixMeta,
            columnLookup: rightColLookupMap,
            prefixLookup: rightPreixLookupMap
        } = this._parseColumnPrefixMeta(rightColList);
        model._columnMeta.right = rightColumnMeta;
        model._columnMeta.rightMap = rightColLookupMap;
        model._prefixMeta.right = rightPrefixMeta;
        model._prefixMeta.rightMap = rightPreixLookupMap;

        // === DagNode configuration ===
        // Join Type
        model.setJoinType(configJoinType);
        // Eval String
        model.setEvalString(configEvalString);

        // JoinOn pairs
        const pairLen = configLeft.columns.length;
        for (let i = 0; i < pairLen; i ++) {
            const [leftName, leftCast, rightName, rightCast] = [
                configLeft.columns[i], configLeft.casts[i],
                configRight.columns[i], configRight.casts[i]
            ];
            if (leftName.length === 0 || rightName.length === 0
                || leftCast == null || rightCast == null
            ) {
                continue;
            }
            model._joinColumnPairs.push({
                leftName: leftName,
                leftCast: leftCast,
                rightName: rightName,
                rightCast: rightCast
            });
        }

        // Renames
        const renamePrefixMapLeft = {};
        const renameColMapLeft = {};
        for (const rename of configLeft.rename) {
            if (rename.sourceColumn.length === 0) {
                continue;
            }
            if (rename.prefix) {
                renamePrefixMapLeft[rename.sourceColumn] = rename.destColumn;
            } else {
                renameColMapLeft[rename.sourceColumn] = rename.destColumn;
            }
        }
        const renamePrefixMapRight = {};
        const renameColMapRight = {};
        for (const rename of configRight.rename) {
            if (rename.sourceColumn.length === 0) {
                continue;
            }
            if (rename.prefix) {
                renamePrefixMapRight[rename.sourceColumn] = rename.destColumn;
            } else {
                renameColMapRight[rename.sourceColumn] = rename.destColumn;
            }
        }
        model._buildRenameInfo({
            colDestLeft: renameColMapLeft,
            colDestRight: renameColMapRight,
            prefixDestLeft: renamePrefixMapLeft,
            prefixDestRight: renamePrefixMapRight
        });

        return model;
    }

    public toDag(): DagNodeJoinInput {
        const dagData: DagNodeJoinInput = {
            joinType: this._joinType,
            left: { columns: [], casts: [], rename: [] },
            right: { columns: [], casts: [], rename: [] },
            evalString: this._evalString
        };

        // JoinOn columns
        for (const colPair of this._joinColumnPairs) {
            // Left JoinOn column
            dagData.left.columns.push(colPair.leftName);
            dagData.left.casts.push(colPair.leftCast);
            // Right JoinOn column
            dagData.right.columns.push(colPair.rightName);
            dagData.right.casts.push(colPair.rightCast);
        }

        // Renamed left prefixes & columns
        const {
            colDestLeft, colDestRight, prefixDestLeft, prefixDestRight
        } = this._getRenameMap();
        for (const source of Object.keys(colDestLeft)) {
            dagData.left.rename.push({
                sourceColumn: source,
                destColumn: colDestLeft[source],
                prefix: false
            });
        }
        for (const source of Object.keys(colDestRight)) {
            dagData.right.rename.push({
                sourceColumn: source,
                destColumn: colDestRight[source],
                prefix: false
            });
        }
        for (const source of Object.keys(prefixDestLeft)) {
            dagData.left.rename.push({
                sourceColumn: source,
                destColumn: prefixDestLeft[source],
                prefix: true
            });
        }
        for (const source of Object.keys(prefixDestRight)) {
            dagData.right.rename.push({
                sourceColumn: source,
                destColumn: prefixDestRight[source],
                prefix: true
            });
        }

        return dagData;
    }

    /**
     * Get the list of conflicted names(based on origin name) and modified names
     * @param isPrefix true: return prefix names; false: return column names
     * @returns left and right name lists. In each lists, source is the origin name, dest is the modified name
     * @description the result list is sorted by dest ascending
     */
    public getResolvedNames(
        isPrefix: boolean
    ): {
        left: { source: string, dest: string }[],
        right: { source: string, dest: string }[]
    } {
        const result = { left: null, right: null };

        if (isPrefix) {
            const { prefixDestLeft, prefixDestRight } = this._getRenameMap();
            result.left = this._applyPrefixRename(
                this._prefixMeta.leftMap, prefixDestLeft
            ).map((r)=>({ source: r.source, dest: r.key }));
            result.right = this._applyPrefixRename(
                this._prefixMeta.rightMap, prefixDestRight
            ).map((r)=>({ source: r.source, dest: r.key }));
        } else {
            const { colDestLeft, colDestRight } = this._getRenameMap();
            result.left = this._applyColumnRename(
                this._columnMeta.leftMap, colDestLeft
            ).map((r)=>({ source: r.source, dest: r.key }));
            result.right = this._applyColumnRename(
                this._columnMeta.rightMap, colDestRight
            ).map((r)=>({ source: r.source, dest: r.key }));
        }

        return result;
    }

    /**
     * Get the conflicted names of columns and prefixes
     * @returns conflicted name map of column and prefix, the key is the origin name, the value is always true
     */
    public getCollisionNames() {
        const result = {
            column: new Map<string, boolean>(),
            prefix: new Map<string, boolean>()
        };
        const {
            colDestLeft, colDestRight, prefixDestLeft, prefixDestRight
        } = this._getRenameMap();

        // Build column map
        const leftColNames = this._applyColumnRename(
            this._columnMeta.leftMap, colDestLeft
        );
        const rightColNames = this._applyColumnRename(
            this._columnMeta.rightMap, colDestRight
        );
        for (const {i1} of this._checkCollisionByKey(leftColNames, rightColNames)) {
            result.column.set(leftColNames[i1].source, true);
        }

        // Build prefix map
        const leftPrefixNames = this._applyPrefixRename(
            this._prefixMeta.leftMap, prefixDestLeft
        );
        const rightPrefixNames = this._applyPrefixRename(
            this._prefixMeta.rightMap, prefixDestRight
        );
        for (const {i1} of this._checkCollisionByKey(leftPrefixNames, rightPrefixNames)) {
            result.prefix.set(leftPrefixNames[i1].source, true);
        }

        return result;
    }

    public batchRename(options: {
        isLeft: boolean, isPrefix: boolean, suffix?: string
    }) {
        const { isLeft, isPrefix, suffix = '' } = options;
        const renameList = isLeft ? this._columnRename.left : this._columnRename.right;
        for (const renameInfo of renameList) {
            if (renameInfo.isPrefix === isPrefix) {
                renameInfo.dest = `${renameInfo.source}${suffix}`;
            }
        }
    }

    public addColumnPair(colPair?: JoinOpColumnPair) {
        let pairToAdd;
        if (colPair != null) {
            pairToAdd = Object.assign({}, colPair);
        } else {
            pairToAdd = this._getDefaultColumnPair();
        }
        this._joinColumnPairs.push(pairToAdd);
    }

    public removeColumnPair(index: number) {
        return this._joinColumnPairs.splice(index, 1);
    }

    public getColumnPairsLength() {
        return this._joinColumnPairs.length;
    }

    public getColumnPairs() {
        return this._joinColumnPairs.map( (pair) => {
            return Object.assign({}, pair);
        });
    }

    public getColumnMetaLeft() {
        return this._columnMeta.left.map( (col) => {
            return Object.assign({}, col);
        })
    }

    public getColumnMetaRight() {
        return this._columnMeta.right.map( (col) => {
            return Object.assign({}, col);
        })
    }

    public getCurrentStep() {
        return this._currentStep;
    }

    public setCurrentStep(step: number) {
        this._currentStep = step;
    }

    public getJoinType() {
        return this._joinType;
    }

    public setJoinType(type: string) {
        this._joinType = type;
    }

    public getEvalString() {
        return this._evalString;
    }

    public setEvalString(str: string) {
        this._evalString = str;
    }

    public isCastNeed(colPair: JoinOpColumnPair) {
        if (colPair.leftName.length === 0 || colPair.rightName.length === 0) {
            return false;
        }
        return (colPair.leftCast !== colPair.rightCast);
    }

    public modifyColumnPairName(
        pairIndex: number,
        pairInfo: { left: string, right: string }
    ) {
        if (pairIndex >= this._joinColumnPairs.length) {
            console.error(`JoinOpPanelModel.modifyColumnPairName: pairIndex out of range(${pairIndex})`);
            return;
        }
        const { left: leftName, right: rightName } = pairInfo;
        if (leftName != null) {
            const colMeta = this._columnMeta.leftMap.get(leftName);
            if (colMeta != null) {
                this._joinColumnPairs[pairIndex].leftName = leftName;
                this._joinColumnPairs[pairIndex].leftCast = colMeta.type;
            } else {
                console.error(`JoinOpPanelModel.modifyColumnPairName: lcolumn not exists(${leftName})`);
            }
        }
        if (rightName != null) {
            const colMeta = this._columnMeta.rightMap.get(rightName);
            if (colMeta != null) {
                this._joinColumnPairs[pairIndex].rightName = rightName;
                this._joinColumnPairs[pairIndex].rightCast = colMeta.type;
            } else {
                console.error(`JoinOpPanelModel.modifyColumnPairName: rcolumn not exists(${rightName})`);
            }
        }
    }

    public modifyColumnPairCast(
        pairIndex: number,
        pairInfo: { left: ColumnType, right: ColumnType }
    ) {
        if (pairIndex >= this._joinColumnPairs.length) {
            console.error(`JoinOpPanelModel.modifyColumnPairCast: pairIndex out of range(${pairIndex})`);
            return;
        }
        const { left: leftCast, right: rightCast } = pairInfo;
        if (leftCast != null) {
            if (leftCast !== ColumnType.undefined) {
                this._joinColumnPairs[pairIndex].leftCast = leftCast;
            } else {
                console.error(`JoinOpPanelModel.modifyColumnPairCast: lcast unknown(${leftCast})`);
            }
        }
        if (rightCast != null) {
            if (rightCast !== ColumnType.undefined) {
                this._joinColumnPairs[pairIndex].rightCast = rightCast;
            } else {
                console.error(`JoinOpPanelModel.modifyColumnPairCast: rcast unknown(${rightCast})`);
            }
        }
    }

    public getRenames(options: {
        isLeft: boolean,
        isPrefix: boolean
    }) {
        const { isLeft, isPrefix } = options;
        const renames = isLeft ? this._columnRename.left : this._columnRename.right;
        return renames.filter( (v) => (v.isPrefix === isPrefix));
    }

    public isColumnDetached(colName: string, isLeft: boolean) {
        if (colName.length === 0) {
            return false;
        }
        return isLeft
            ? !this._columnMeta.leftMap.has(colName)
            : !this._columnMeta.rightMap.has(colName);
    }

    public isPrefixDetached(prefix: string, isLeft: boolean) {
        if (prefix.length === 0) {
            return false;
        }
        return isLeft
            ? !this._prefixMeta.leftMap.has(prefix)
            : !this._prefixMeta.rightMap.has(prefix);
    }

    private static _parseColumnPrefixMeta(
        columnList: ProgCol[]
    ) {
        const result:  {
            columnMeta: JoinOpColumnInfo[],
            prefixMeta: string[],
            columnLookup: Map<string, JoinOpColumnInfo>,
            prefixLookup: Map<string, string>
        } = {
            columnMeta: [],
            prefixMeta: [],
            columnLookup: new Map(),
            prefixLookup: new Map()
        };

        if (columnList == null || columnList.length === 0) {
            return result;
        }

        const prefixSet = {}; // Consists of all unique prefixes

        // List of columns
        for (const colInfo of columnList) {
            const isPrefix = (colInfo.prefix != null && colInfo.prefix.length > 0);
            result.columnMeta.push({
                name: colInfo.getBackColName(),
                type: colInfo.getType(),
                isPrefix: isPrefix
            });
            if (isPrefix) {
                prefixSet[colInfo.prefix] = 1;
            }
        }
        this._sortColumnMeta(result.columnMeta);

        // List of prefixes
        for (const prefix of Object.keys(prefixSet)) {
            result.prefixMeta.push(prefix);
        }
        this._sortPrefixMeta(result.prefixMeta);

        // column name => index of columnMeta, for quick lookup
        for (const col of result.columnMeta) {
            result.columnLookup.set(col.name, col);
        }
        // prefix => index of prefixMeta, for quick lookup
        for (const prefix of result.prefixMeta) {
            result.prefixLookup.set(prefix, prefix);
        }
        
        return result;
    }

    private static _getColumnsFromDagNode(dagNode: DagNode) {
        const colList: ProgCol[] = [];
        try {
            if (dagNode != null) {
                for (const col of dagNode.getLineage().getColumns()) {
                    colList.push(col);
                }
            }
            return colList;
        } catch(e) {
            return colList;
        }
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

    private _getDefaultColumnPair(): JoinOpColumnPair {
        return {
            leftName: '',
            leftCast: ColumnType.undefined ,
            rightName: '',
            rightCast: ColumnType.undefined
        };
    }

    private _checkCollision<T>(
        list1: T[],
        list2: T[],
        checkFunc: (a: T, b: T) => { eq: boolean, d1: number, d2: number }
    ): { i1: number, i2: number }[] {
        let index1 = 0;
        let index2 = 0;
        const len1 = list1.length;
        const len2 = list2.length;
        const result: {i1: number, i2: number}[] = [];
        while (index1 < len1 && index2 < len2) {
            const {eq, d1, d2} = checkFunc(list1[index1], list2[index2]);
            if (eq) {
                result.push({i1: index1, i2: index2});
            }
            index1 += d1;
            index2 += d2;
        }
        return result;
    }

    private _getRenameMap() {
        const colDestLeft: { [source: string]: string } = {};
        const colDestRight: { [source: string]: string } = {};
        const prefixDestLeft: { [source: string]: string } = {};
        const prefixDestRight: { [source: string]: string } = {};

        for (const renameInfo of this._columnRename.left) {
            if (renameInfo.isPrefix) {
                prefixDestLeft[renameInfo.source] = renameInfo.dest;
            } else {
                colDestLeft[renameInfo.source] = renameInfo.dest;
            }
        }

        for (const renameInfo of this._columnRename.right) {
            if (renameInfo.isPrefix) {
                prefixDestRight[renameInfo.source] = renameInfo.dest;
            } else {
                colDestRight[renameInfo.source] = renameInfo.dest;
            }
        }

        return {
            colDestLeft: colDestLeft, colDestRight: colDestRight,
            prefixDestLeft: prefixDestLeft, prefixDestRight: prefixDestRight
        }
    }

    private _applyColumnRename(
        columnMetaMap: Map<string, JoinOpColumnInfo>,
        colRename: { [source: string]: string },
        isApplyToKey: boolean = true
    ) {
        const renameMap = Object.assign({}, colRename);
        const result: { source: string, dest: string, key: string }[] = [];
        if (columnMetaMap != null) {
            for (const [source, colMeta] of columnMetaMap.entries()) {
                if (!colMeta.isPrefix) {
                    const dest = renameMap[source];
                    if (dest != null) {
                        result.push({
                            source: source,
                            dest: dest,
                            key: isApplyToKey? dest: source
                        });
                        delete renameMap[source];
                    } else {
                        result.push({
                            source: source,
                            dest: '',
                            key: source
                        });
                    }
                }
            }
        }
        for (const source of Object.keys(renameMap)) {
            const dest = renameMap[source];
            result.push({
                source: source,
                dest: dest,
                key: isApplyToKey? dest: source
            });
        }
        result.sort( (a, b) => {
            const av = a.key;
            const bv = b.key;
            return av > bv ? 1 : (av < bv ? -1 : 0);
        });
        
        return result;
    }

    private _applyPrefixRename(
        prefixMetaMap: Map<string, string>,
        prefixRename: { [source: string]: string },
        isApplyToKey: boolean = true
    ) {
        const renameMap = Object.assign({}, prefixRename);
        const result: { source: string, dest: string, key: string }[] = [];
        if (prefixMetaMap != null) {
            for (const [source] of prefixMetaMap.entries()) {
                const dest = renameMap[source];
                if (dest != null) {
                    result.push({
                        source: source,
                        dest: dest,
                        key: isApplyToKey? dest: source
                    });
                    delete renameMap[source];
                } else {
                    result.push({
                        source: source,
                        dest: '',
                        key: source
                    });
                }
            }
        }
        for (const source of Object.keys(renameMap)) {
            const dest = renameMap[source];
            result.push({
                source: source,
                dest: dest,
                key: isApplyToKey? dest: source
            });
        }
        result.sort( (a, b) => {
            const av = a.key;
            const bv = b.key;
            return av > bv ? 1 : (av < bv ? -1 : 0);
        });
        
        return result;
    }

    private _checkCollisionByKey(
        list1: { key: string }[],
        list2: { key: string }[]
    ): { i1: number, i2: number }[] {
        return this._checkCollision(list1, list2,
            (a, b) => {
                const av = a.key;
                const bv = b.key;
                const result = { eq: false, d1: 0, d2: 0 };
                if (av > bv) {
                    result.d2 = 1;
                } else if (av < bv) {
                    result.d1 = 1;
                } else {
                    result.d1 = 1;
                    result.d2 = 1;
                    result.eq = true;
                }
                return result;
            }
        );
    }

    private _buildRenameInfo(dest: {
        colDestLeft: { [source: string]: string },
        colDestRight: { [source: string]: string },
        prefixDestLeft: { [source: string]: string },
        prefixDestRight: { [source: string]: string },
    }): void {
        const {
            colDestLeft,
            colDestRight,
            prefixDestLeft,
            prefixDestRight
        } = dest;

        // Cleanup
        this._columnRename = { left: [], right: [] };

        // Columns need to rename
        const leftColNames = this._applyColumnRename(
            this._columnMeta.leftMap, colDestLeft, false
        );
        const rightColNames = this._applyColumnRename(
            this._columnMeta.rightMap, colDestRight, false
        );
        const columnCollisions = this._checkCollisionByKey(
            leftColNames, rightColNames
        );
        for (const { i1, i2 } of columnCollisions) {
            const { source: leftSource, dest: leftDest } = leftColNames[i1];
            this._columnRename.left.push({
                source: leftSource,
                dest: leftDest,
                isPrefix: false
            });
            const { source: rightSource, dest: rightDest } = rightColNames[i2];
            this._columnRename.right.push({
                source: rightSource,
                dest: rightDest,
                isPrefix: false
            });
        }

        // Prefixes need to rename
        const leftPrefixNames = this._applyPrefixRename(
            this._prefixMeta.leftMap, prefixDestLeft, false
        );
        const rightPrefixNames = this._applyPrefixRename(
            this._prefixMeta.rightMap, prefixDestRight, false
        );
        const prefixCollisions = this._checkCollisionByKey(
            leftPrefixNames, rightPrefixNames
        );
        for (const { i1, i2 } of prefixCollisions) {
            const { source: leftSource, dest: leftDest } = leftPrefixNames[i1];
            this._columnRename.left.push({
                source: leftSource,
                dest: leftDest,
                isPrefix: true
            });
            const { source: rightSource, dest: rightDest } = rightPrefixNames[i2];
            this._columnRename.right.push({
                source: rightSource,
                dest: rightDest,
                isPrefix: true
            });
        }
    }
}

enum JoinOpError {
    ColumnTypeLenMismatch = 'ColumnTypeLenMismatch',

}
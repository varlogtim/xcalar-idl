class JoinOpPanelModel {
    // UI states
    private _currentStep: number = 1;
    private _isAdvMode: boolean = false;
    private _isNoCast: boolean = true;
    private _isFixedType: boolean = false;
    // Lineage data
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
    // DagNode configurations
    private _joinType: string = JoinOperatorTStr[JoinOperatorT.InnerJoin];
    private _joinColumnPairs: JoinOpColumnPair[] = [];
    private _columnRename: {
        left: JoinOpRenameInfo[],
        right: JoinOpRenameInfo[]
    } = { left: [], right: [] };
    private _evalString = '';
    private _previewTableNames: {
        left: string, right: string
    } = { left: null, right: null };

    public static fromDag(
        dagNode: DagNodeJoin,
        uiOptions: {
            currentStep: number,
            isAdvMode: boolean,
            isNoCast: boolean
        }
    ): JoinOpPanelModel {
        try {
            const {left: leftCols, right: rightCols} = this.getColumnsFromDag(dagNode);
            const {
                left: leftTableName, right: rightTableName
            } = this.getPreviewTableNamesFromDag(dagNode);

            // Override the join type with sub type(sub category)
            const dagConfig = dagNode.getParam();

            return this.fromDagInput(
                leftCols,rightCols, dagConfig,
                leftTableName, rightTableName,
                {
                    currentStep: uiOptions.currentStep,
                    isAdvMode: uiOptions.isAdvMode,
                    isNoCast: uiOptions.isNoCast,
                    isFixedType: dagNode.isJoinTypeConverted()
                }
            );
        } catch(e) {
            console.error(e);
            return new JoinOpPanelModel();
        }
    }

    public static getColumnsFromDag(
        dagNode: DagNodeJoin
    ): { left: ProgCol[], right: ProgCol[] } {
        const [leftParent, rightParent] = dagNode.getParents();
        return {
            left: this._getColumnsFromDagNode(leftParent),
            right: this._getColumnsFromDagNode(rightParent)
        };
    }

    public static getPreviewTableNamesFromDag(
        dagNode: DagNodeJoin
    ): { left: string, right: string } {
        const [leftParent, rightParent] = dagNode.getParents();
        return {
            left: this._getPreviewTableNameFromDagNode(leftParent),
            right: this._getPreviewTableNameFromDagNode(rightParent)
        };
    }

    /**
     * Create JoinOpPanelModel instance from DagNode configuration and column meta
     * @param leftColList Could be null/empty
     * @param rightColList Could be null/empty
     * @param config DagNodeJoinInputStruct object
     * @throws JS exception/JoinOpError
     */
    public static fromDagInput(
        leftColList: ProgCol[],
        rightColList: ProgCol[],
        config: DagNodeJoinInputStruct,
        leftPreviewTableName: string,
        rightPreviewTableName: string,
        uiOptions: {
            currentStep: number,
            isAdvMode: boolean,
            isNoCast: boolean,
            isFixedType: boolean
        }
    ) {
        const model = new JoinOpPanelModel();
        if (config == null) {
            return model;
        }

        const {
            left: configLeft, right: configRight,
            joinType: configJoinType, evalString: configEvalString
        } = config;

        // === UI States ====
        model.setCurrentStep(uiOptions.currentStep);
        model.setAdvMode(uiOptions.isAdvMode);
        model.setNoCast(uiOptions.isNoCast);
        model.setFixedType(uiOptions.isFixedType);

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

        // Normalize JoinOn input
        const joinOnCount = Math.max(
            configLeft.columns.length,
            configRight.columns.length);
        for (let i = 0; i < joinOnCount; i ++) {
            // joinOn left column
            const leftColName = configLeft.columns[i];
            if (leftColName == null || leftColName.length === 0) {
                configLeft.columns[i] = '';
                configLeft.casts[i] = ColumnType.undefined;
            } else {
                const colInfo = leftColLookupMap.get(leftColName);
                configLeft.casts[i] = colInfo == null
                    ? ColumnType.undefined : colInfo.type;
            }
            // joinOn right column
            const rightColName = configRight.columns[i];
            if (rightColName == null || rightColName.length === 0) {
                configRight.columns[i] = '';
                configRight.casts[i] = ColumnType.undefined;
            } else {
                const colInfo = rightColLookupMap.get(rightColName);
                configRight.casts[i] = colInfo == null
                    ? ColumnType.undefined : colInfo.type;
            }
        }

        // JoinOn pairs
        const pairLen = configLeft.columns.length;
        for (let i = 0; i < pairLen; i ++) {
            const [leftName, leftCast, rightName, rightCast] = [
                configLeft.columns[i], configLeft.casts[i],
                configRight.columns[i], configRight.casts[i]
            ];
            model._joinColumnPairs.push({
                leftName: leftName,
                leftCast: leftCast,
                rightName: rightName,
                rightCast: rightCast
            });
        }

        // Renames
        if (model._needRenameByType(model.getJoinType())) {
            const renamePrefixMapLeft = {};
            const renameColMapLeft = {};
            for (const rename of configLeft.rename) {
                if (rename.sourceColumn.length === 0) {
                    continue;
                }
                if (rename.prefix) {
                    if (leftPrefixLookupMap.has(rename.sourceColumn)) {
                        renamePrefixMapLeft[rename.sourceColumn] = rename.destColumn;
                    }
                } else {
                    if (leftColLookupMap.has(rename.sourceColumn)) {
                        renameColMapLeft[rename.sourceColumn] = rename.destColumn;
                    }
                }
            }
            const renamePrefixMapRight = {};
            const renameColMapRight = {};
            for (const rename of configRight.rename) {
                if (rename.sourceColumn.length === 0) {
                    continue;
                }
                if (rename.prefix) {
                    if (rightPreixLookupMap.has(rename.sourceColumn)) {
                        renamePrefixMapRight[rename.sourceColumn] = rename.destColumn;
                    }
                } else {
                    if (rightColLookupMap.has(rename.sourceColumn)) {
                        renameColMapRight[rename.sourceColumn] = rename.destColumn;
                    }
                }
            }
            model._buildRenameInfo({
                colDestLeft: renameColMapLeft,
                colDestRight: renameColMapRight,
                prefixDestLeft: renamePrefixMapLeft,
                prefixDestRight: renamePrefixMapRight
            });
        } else {
            model._clearRenames();
        }

        model._previewTableNames.left = leftPreviewTableName;
        model._previewTableNames.right = rightPreviewTableName;
        return model;
    }

    public toDag(): DagNodeJoinInputStruct {
        const dagData: DagNodeJoinInputStruct = {
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
            const { prefixDestLeft, prefixDestRight } = this._getRenameMap(false);
            result.left = this._applyPrefixRename(
                this._prefixMeta.leftMap, prefixDestLeft
            ).map((r)=>({ source: r.source, dest: r.dest }));
            result.right = this._applyPrefixRename(
                this._prefixMeta.rightMap, prefixDestRight
            ).map((r)=>({ source: r.source, dest: r.dest }));
        } else {
            const { colDestLeft, colDestRight } = this._getRenameMap(false);
            result.left = this._applyColumnRename(
                this._columnMeta.leftMap, colDestLeft
            ).map((r)=>({ source: r.source, dest: r.dest }));
            result.right = this._applyColumnRename(
                this._columnMeta.rightMap, colDestRight
            ).map((r)=>({ source: r.source, dest: r.dest }));
        }

        return result;
    }

    /**
     * Get the conflicted names of columns and prefixes
     * @returns conflicted name map of column and prefix, the key is the origin name, the value is always true
     * @description The function checks name collision in each table and between tables
     */
    public getCollisionNames() {
        const result = {
            columnLeft: new Map<string, boolean>(),
            columnRight: new Map<string, boolean>(),
            prefixLeft: new Map<string, boolean>(),
            prefixRight: new Map<string, boolean>(),
        };
        if (!this._needRenameByType(this.getJoinType())) {
            return result;
        }
        
        const {
            colDestLeft, colDestRight, prefixDestLeft, prefixDestRight
        } = this._getRenameMap();

        // Apply renaming to left columns
        const leftColNames = this._applyColumnRename(
            this._columnMeta.leftMap, colDestLeft
        );
        // Check name conflicting inbetween left columns
        for (const [_, indexList] of this._checkCollisionInListByKey(leftColNames).entries()) {
            for (const index of indexList) {
                result.columnLeft.set(leftColNames[index].source, true);
            }
        }
        // Apply renaming to right columns
        const rightColNames = this._applyColumnRename(
            this._columnMeta.rightMap, colDestRight
        );
        // Check name conflicting inbetween right columns
        for (const [_, indexList] of this._checkCollisionInListByKey(rightColNames).entries()) {
            for (const index of indexList) {
                result.columnRight.set(rightColNames[index].source, true);
            }
        }
        // Check name conflicting between left and right
        for (const {i1, i2} of this._checkCollisionByKey(leftColNames, rightColNames)) {
            result.columnLeft.set(leftColNames[i1].source, true);
            result.columnRight.set(rightColNames[i2].source, true);
        }

        // Apply renaming to left prefixes
        const leftPrefixNames = this._applyPrefixRename(
            this._prefixMeta.leftMap, prefixDestLeft
        );
        // Check name conflicting inbetween left prefixes
        for (const [_, indexList] of this._checkCollisionInListByKey(leftPrefixNames).entries()) {
            for (const index of indexList) {
                result.prefixLeft.set(leftPrefixNames[index].source, true);
            }
        }
        // Apply renaming to right prefixes
        const rightPrefixNames = this._applyPrefixRename(
            this._prefixMeta.rightMap, prefixDestRight
        );
        // Check name conflicting inbetween left prefixes
        for (const [_, indexList] of this._checkCollisionInListByKey(rightPrefixNames).entries()) {
            for (const index of indexList) {
                result.prefixRight.set(rightPrefixNames[index].source, true);
            }
        }
        // Check name conflicting between left and right
        for (const {i1, i2} of this._checkCollisionByKey(leftPrefixNames, rightPrefixNames)) {
            result.prefixLeft.set(leftPrefixNames[i1].source, true);
            result.prefixRight.set(rightPrefixNames[i2].source, true);
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

    public isCrossJoin() {
        return this.getJoinType() === JoinOperatorTStr[JoinOperatorT.CrossJoin];
    }

    public isValidEvalString() {
        const evalStr = this.getEvalString();
        return evalStr.length > 0
            && evalStr.indexOf("(") >= 0
            && evalStr.indexOf(")") > 0;
    }

    public getPreviewTableNames() {
        return {
            left: this._previewTableNames.left,
            right: this._previewTableNames.right
        };
    }

    public getCurrentStep() {
        return this._currentStep;
    }

    public setCurrentStep(step: number) {
        this._currentStep = step;
    }

    public isNoCast() {
        return this._isNoCast;
    }

    public setNoCast(noCast: boolean) {
        this._isNoCast = noCast;
    }

    public setFixedType(fixedType: boolean) {
        this._isFixedType = fixedType;
    }

    public isFixedType(): boolean {
        return this._isFixedType;
    }

    public isAdvMode() {
        return this._isAdvMode;
    }

    public setAdvMode(advMode: boolean) {
        this._isAdvMode = advMode;
    }

    public getJoinType() {
        return this._joinType;
    }

    public setJoinType(type: string) {

        const oldType = this._joinType;
        this._joinType = type;

        if (this._needRenameByType(type)) {
            if (!this._needRenameByType(oldType)) {
                // Rebuild rename infos when switching from noRename -> rename
                this._buildRenameInfo({
                    colDestLeft: {},
                    colDestRight: {},
                    prefixDestLeft: {},
                    prefixDestRight: {}
                });
            }
        } else {
            this._clearRenames();
        }
    }

    public getEvalString() {
        return this._evalString;
    }

    public setEvalString(str: string) {
        this._evalString = str;
    }

    public isRenameNeeded(): boolean {
        if (!this._needRenameByType(this.getJoinType())) {
            return false;
        }
        if (this._columnRename.left.length > 0) {
            return true;
        }
        if (this._columnRename.right.length > 0) {
            return true;
        }
        return false;
    }

    public isCastNeed(colPair: JoinOpColumnPair) {
        if (this.isNoCast()) {
            return false;
        }
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

    private static _getPreviewTableNameFromDagNode(dagNode: DagNode) {
        try {
            return dagNode.getTable();
        } catch {
            return null;
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

    private _needRenameByType(type: string): boolean {
        const noRenameType: Set<string> = new Set([
            JoinCompoundOperatorTStr.LeftSemiJoin,
            JoinCompoundOperatorTStr.LeftAntiSemiJoin
        ]);
        return !noRenameType.has(type);
    }
    /**
     * Abstracted algorithm of finding same values between two sorted arrays
     * @param list1
     * @param list2
     * @param checkFunc
     * @description Double pointers algorithm
     */
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

    private _getRenameMap(isRenameEmpty: boolean = true) {
        const colDestLeft: { [source: string]: string } = {};
        const colDestRight: { [source: string]: string } = {};
        const prefixDestLeft: { [source: string]: string } = {};
        const prefixDestRight: { [source: string]: string } = {};

        for (const renameInfo of this._columnRename.left) {
            if (renameInfo.isPrefix) {
                prefixDestLeft[renameInfo.source] =
                    this._getRenameDest(renameInfo, isRenameEmpty);
            } else {
                colDestLeft[renameInfo.source] =
                    this._getRenameDest(renameInfo, isRenameEmpty);
            }
        }

        for (const renameInfo of this._columnRename.right) {
            if (renameInfo.isPrefix) {
                prefixDestRight[renameInfo.source] =
                    this._getRenameDest(renameInfo, isRenameEmpty);
            } else {
                colDestRight[renameInfo.source] =
                    this._getRenameDest(renameInfo, isRenameEmpty);
            }
        }

        return {
            colDestLeft: colDestLeft, colDestRight: colDestRight,
            prefixDestLeft: prefixDestLeft, prefixDestRight: prefixDestRight
        }
    }

    /**
     * Get the dest name of a renaming
     * @param renameInfo
     * @param isRenameEmpty true: fill an empty destName with sourceName
     * @returns The name after renaming. If renaming to ""(user didn't do renaming), returns the source name.
     */
    private _getRenameDest(renameInfo: JoinOpRenameInfo, isRenameEmpty: boolean = true): string {
        const { source, dest } = renameInfo;
        if (isRenameEmpty) {
            return (dest == null || dest.length === 0) ? source : dest;
        } else {
            return dest || '';
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

    private _checkCollisionInListByKey(list: { key: string }[]): Map<string, number[]> {
        const keyIndexMap = new Map<string, number[]>();
        list.forEach(({ key }, index) => {
            if (keyIndexMap.has(key)) {
                keyIndexMap.get(key).push(index);
            } else {
                keyIndexMap.set(key, [index]);
            }
        });

        const result = new Map<string, number[]>();
        for (const [key, indexList] of keyIndexMap.entries()) {
            if (indexList.length > 1) {
                result.set(key, [].concat(indexList));
            }
        }
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

    private _clearRenames(): void {
        this._columnRename = { left: [], right: [] };
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

    public static refreshColumns(oldModel, dagNode: DagNodeJoin) {
        const oldDagData = oldModel.toDag();
        const {left: leftCols, right: rightCols} = this.getColumnsFromDag(dagNode);
        const {
            left: leftTableName, right: rightTableName
        } = this.getPreviewTableNamesFromDag(dagNode);

        const model = this.fromDagInput(
            leftCols,rightCols, oldDagData,
            leftTableName, rightTableName,
            {
                currentStep: oldModel._currentStep,
                isAdvMode: oldModel._isAdvMode,
                isNoCast: oldModel._isNoCast,
                isFixedType: oldModel._isFixedType
            }
        );

        if (model.getColumnPairsLength() === 0) {
            model.addColumnPair();
        }

        if (!model.isRenameNeeded()) {
            model.setCurrentStep(1);
        }

        return model;
    }
}

enum JoinOpError {
    ColumnTypeLenMismatch = 'ColumnTypeLenMismatch',
    InvalidEvalString = 'InvalidEvalString',
    NeedTypeCast = 'NeedTypeCast',
    InvalidJoinClause = 'InvalidJoinClause',
    ColumnNameConflict = 'ConlumnNameConflict',
    PrefixConflict = 'PrefixConflict',
    InvalidJoinType = 'InvalidJoinType',
}
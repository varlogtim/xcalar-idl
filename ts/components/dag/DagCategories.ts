class DagCategories {
    private categories: DagCategory[];
    public constructor() {

        this.initBasicLists();
    }

    private initBasicLists() {

        this.categories = [];

        // const favoritesCategory = new DagCategory(DagCategoryType.Favorites, [
        //     new DagCategoryNodeIn(DagNodeFactory.create({
        //         type: DagNodeType.Dataset
        //     })),
        //     new DagCategoryNodeOperations(DagNodeFactory.create({
        //         type: DagNodeType.Filter
        //     })),
        //     new DagCategoryNodeColumn(DagNodeFactory.create({
        //         type: DagNodeType.Map
        //     })),
        //     new DagCategoryNodeOut(DagNodeFactory.create({
        //         type: DagNodeType.Export
        //     })),
        // ]);

        let isSQLMode = XVM.isSQLMode();
        let inCategory = null;
        if (isSQLMode) {
            inCategory = new DagCategory(DagCategoryType.In, [
                new DagCategoryNodeIn(DagNodeFactory.create({
                    type: DagNodeType.SQLFuncIn
                })),
            ]);
        } else {
            inCategory = new DagCategory(DagCategoryType.In, [
                new DagCategoryNodeIn(DagNodeFactory.create({
                    type: DagNodeType.Dataset
                })),
                new DagCategoryNodeIn(DagNodeFactory.create({
                    type: DagNodeType.IMDTable
                })),
                new DagCategoryNodeIn(DagNodeFactory.create({
                    type: DagNodeType.DFIn
                })),
            ]);
        }
        
        let outCategory;
        if (isSQLMode) {
            outCategory = new DagCategory(DagCategoryType.Out, [
                new DagCategoryNodeOut(DagNodeFactory.create({
                    type: DagNodeType.SQLFuncOut
                })),
            ]);
        } else {
            outCategory = new DagCategory(DagCategoryType.Out, [
                new DagCategoryNodeOut(DagNodeFactory.create({
                    type: DagNodeType.Export
                })),
                new DagCategoryNodeOut(DagNodeFactory.create({
                    type: DagNodeType.Export,
                    subType: DagNodeSubType.ExportOptimized
                })),
                new DagCategoryNodeOut(DagNodeFactory.create({
                    type: DagNodeType.DFOut
                })),
                new DagCategoryNodeOut(DagNodeFactory.create({
                    type: DagNodeType.DFOut,
                    subType: DagNodeSubType.DFOutOptimized
                })),
                new DagCategoryNodeOut(DagNodeFactory.create({
                    type: DagNodeType.Jupyter
                })),
                new DagCategoryNodeOut(DagNodeFactory.create({
                    type: DagNodeType.PublishIMD
                }))
            ]);
        }

        if (typeof gUpdateIMDAccess !== "undefined" && gUpdateIMDAccess === true) {
            outCategory.add(new DagCategoryNodeOut(DagNodeFactory.create({
                type: DagNodeType.UpdateIMD
            })));
        }

        const valueCategory = new DagCategory(DagCategoryType.Value, [
            new DagCategoryNodeValue(DagNodeFactory.create({
                type: DagNodeType.Aggregate
            }))
        ]);

        const operationsCategory = new DagCategory(DagCategoryType.Operations, [
            new DagCategoryNodeOperations(DagNodeFactory.create({
                type: DagNodeType.Filter
            })),
            new DagCategoryNodeOperations(DagNodeFactory.create({
                type: DagNodeType.Project
            })),
            new DagCategoryNodeOperations(DagNodeFactory.create({
                type: DagNodeType.GroupBy
            })),
            new DagCategoryNodeOperations(DagNodeFactory.create({
                type: DagNodeType.RowNum
            })),
            new DagCategoryNodeOperations(DagNodeFactory.create({
                type: DagNodeType.Explode
            })),
            new DagCategoryNodeOperations(DagNodeFactory.create({
                type: DagNodeType.Sort
            }))
        ]);

        const columnCategory = new DagCategory(DagCategoryType.Column, [
            new DagCategoryNodeColumn(DagNodeFactory.create({
                type: DagNodeType.Map
            })),
            new DagCategoryNodeColumn(DagNodeFactory.create({
                type: DagNodeType.Map,
                subType: DagNodeSubType.Cast
            })),
            new DagCategoryNodeColumn(DagNodeFactory.create({
                type: DagNodeType.Split
            })),
            new DagCategoryNodeColumn(DagNodeFactory.create({
                type: DagNodeType.Round
            })),
        ]);

        const joinCategory = new DagCategory(DagCategoryType.Join, [
            new DagCategoryNodeJoin(DagNodeFactory.create({
                type: DagNodeType.Join
            })),
            new DagCategoryNodeJoin(DagNodeFactory.create({
                type: DagNodeType.Join,
                subType: DagNodeSubType.LookupJoin
            })),
            new DagCategoryNodeJoin(DagNodeFactory.create({
                type: DagNodeType.Join,
                subType: DagNodeSubType.FilterJoin
            })),
        ]);

        const setCategory = new DagCategory(DagCategoryType.Set, [
            new DagCategoryNodeSet(DagNodeFactory.create({
                type: DagNodeType.Set,
                subType: DagNodeSubType.Intersect
            })),
            new DagCategoryNodeSet(DagNodeFactory.create({
                type: DagNodeType.Set,
                subType: DagNodeSubType.Union
            })),
            new DagCategoryNodeSet(DagNodeFactory.create({
                type: DagNodeType.Set,
                subType: DagNodeSubType.Except
            })),
        ]);

        const sqlCategory = new DagCategory(DagCategoryType.SQL, [
            new DagCategoryNodeSQL(DagNodeFactory.create({
                type: DagNodeType.SQL
            })),
            new DagCategoryNodeSQL(DagNodeFactory.create({
                type: DagNodeType.SQLSubInput
            }), true),
            new DagCategoryNodeSQL(DagNodeFactory.create({
                type: DagNodeType.SQLSubOutput
            }), true)
        ]);

        const extensionCategory = new DagCategory(DagCategoryType.Extensions, [
            new DagCategoryNodeExtensions(DagNodeFactory.create({
                type: DagNodeType.Extension
            }))
        ]);

        // Default operators(not in the kvstore)
        const customCategory = new DagCategoryCustom([
            new DagCategoryNode(DagNodeFactory.create({
                type: DagNodeType.Custom
            }), DagCategoryType.Custom, true),
            new DagCategoryNode(DagNodeFactory.create({
                type: DagNodeType.CustomInput
            }), DagCategoryType.Custom, true),
            new DagCategoryNode(DagNodeFactory.create({
                type: DagNodeType.CustomOutput
            }), DagCategoryType.Custom, true),
            new DagCategoryNode(DagNodeFactory.create({
                type: DagNodeType.Index
            }), DagCategoryType.Custom, true),
            new DagCategoryNode(DagNodeFactory.create({
                type: DagNodeType.Synthesize
            }), DagCategoryType.Custom, true),
            new DagCategoryNode(DagNodeFactory.create({
                type: DagNodeType.Placeholder
            }), DagCategoryType.Custom, true)
        ], 'gUserCustomOpKey');

        // TODO implement favorites category
        this.categories = [
            // favoritesCategory,
            inCategory,
            outCategory,
            sqlCategory,
            operationsCategory,
            columnCategory,
            joinCategory,
            setCategory,
            extensionCategory,
            valueCategory,
            customCategory
        ];

        if (isSQLMode) {
            // XXX TODO: verify it's valid or not XD-261
            this.categories = this.categories.filter((category) => {
                let categoryName = category.getName();
                return categoryName !== DagCategoryType.Extensions &&
                categoryName !== DagCategoryType.Custom;
            });
        }
    }

    public getCategories(): DagCategory[] {
        return this.categories;
    }

    /**
     * Load categories from data storage
     */
    public loadCategories(): XDPromise<void> {
        const loadTasks = this.categories.map((category) => {
            return category.loadCategory();
        });

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        PromiseHelper.when(...loadTasks)
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    /**
     * Save categories to data storage
     */
    public saveCategories(): XDPromise<void> {
        const saveTasks = this.categories.map((category) => {
            return category.saveCategory();
        });

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        PromiseHelper.when(...saveTasks)
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    /**
     * Get the category which an operator belongs to
     * @param nodeId
     */
    public getCategoryByNodeId(nodeId: DagNodeId): DagCategory {
        for (const category of this.getCategories()) {
            if (category.getOperatorById(nodeId) != null) {
                return category;
            }
        }
        return null;
    }
}

class DagCategory {
    private name: DagCategoryType;
    private operators: DagCategoryNode[];

    public constructor(name: DagCategoryType, operators: DagCategoryNode[]) {
        this.name = name;
        this.operators = operators;
    }

    public getName(): DagCategoryType {
        return this.name;
    }

    public add(node: DagCategoryNode): void {
        this.operators.push(node);
    }

    public getOperators() {
        return this.operators;
    }

    public getSortedOperators() {
        return this.operators;
    }

    public clear() {
        return this.operators = [];
    }

    /**
     * Check if an operator with the given name exists in the list
     * @param name
     */
    public isExistOperatorName(name: string): boolean {
        return this._getOperatorDisplayNames().has(name);
    }

    /**
     * Remove an operator identified by operatorId(nodeId)
     * @param operatorId
     */
    public removeOperatorById(operatorId: DagNodeId): boolean {
        const idx = this._getIndexById(operatorId);
        if (idx < 0) {
            return false;
        }
        this._remove(idx);
        return true;
    }

    /**
     * Get an operator identified by operatorId(nodeId)
     * @param operatorId
     */
    public getOperatorById(operatorId: DagNodeId): DagCategoryNode {
        const idx = this._getIndexById(operatorId);
        if (idx < 0) {
            return null;
        }
        return this.getOperators()[idx];
    }

    /**
     * Rename an operator
     * @param operatorId 
     * @param name 
     */
    public renameOperatorById(operatorId: DagNodeId, name: string): boolean {
        const categoryNode = this.getOperatorById(operatorId);
        if (categoryNode == null) {
            return false;
        }
        const dagNode = categoryNode.getNode();
        if (dagNode instanceof DagNodeCustom) {
            dagNode.setCustomName(name);
            return true;
        } else {
            return false;
        }
    }

    /**
     * Load category content from data storage. Child class can override this method with specific implementation.
     */
    public loadCategory(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    /**
     * Save category content to data storage. Child class can override this method with specific implementation.
     */
    public saveCategory(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    protected _getOperatorDisplayNames(): Set<string> {
        const nameSet = new Set<string>();
        for (const node of this.getOperators()) {
            nameSet.add(node.getDisplayNodeType());
        }
        return nameSet;
    }

    private _remove(index: number): void {
        this.operators.splice(index, 1);
    }

    private _getIndexById(operatorId: string): number {
        const categoryNodes = this.operators;
        for (let idx = 0; idx < categoryNodes.length; idx ++) {
            if (categoryNodes[idx].getNode().getId() === operatorId) {
                return idx;
            }
        }
        return -1;
    }
}

class DagCategoryCustom extends DagCategory {
    // Each category nodes is stored in a separate KVStore key-value pair,
    // where key is path structured like 'gUserCustomOpKey/<nodeKey>';
    private _categoryKey: string;
    private _dirtyData: {
        create: Set<string>, update: Set<string>, delete: Set<string>
    };

    public constructor(operators: DagCategoryNode[], key: string) {
        super(DagCategoryType.Custom, operators);
        this._categoryKey = KVStore.getKey(key);
        this._dirtyData = {
            create: new Set(), update: new Set(), delete: new Set()
        };
    }

    /**
     * @override
     * Load custom operators from KVStore
     */
    public loadCategory():XDPromise<void> {
        return PromiseHelper.resolve(this._hasDirtyData())
        .then((needSave) => {
            // If there are unsaved changes, save first
            if (needSave) {
                return this.saveCategory();
            }
        })
        .then(() => KVStore.list(this._getNodeKeyPatten(), gKVScope.USER))
        .then((keyResult) => {
            // === Load category nodes stored in KVStroe ===
            // Construct the promise list of loading/creating categoryNodes
            const taskList = keyResult.keys.map((key) => {
                const deferred: XDDeferred<DagCategoryNode> = PromiseHelper.deferred();
                (new KVStore(key, gKVScope.USER)).getAndParse()
                .then((info: DagCategoryNodeInfo) => {
                    if (info == null) {
                        deferred.resolve(null);
                    } else {
                        deferred.resolve(DagCategoryNodeFactory.createFromJSON(info));
                    }
                })
                .fail(() => {
                    deferred.resolve(null);
                }); // Ignore any errors
                return deferred.promise();
            });

            // Execute the KVStore actions in parallel
            return PromiseHelper.when(...taskList)
            .then((...categoryNodes) => {
                // All KVStore actions are done
                const nodeList: DagCategoryNode[] = [];
                for (const node of categoryNodes) {
                    if (node != null) {
                        nodeList.push(node);
                    }
                }
                return nodeList;
            });
        })
        .then((loadedNodes) => {
            // === Combine fixed/loaded nodes, and rebuild the node list ===
            // Get all non-persistable nodes(ex. DagNodeCustomInput)
            const fixedNodes = [];
            for (const node of this.getOperators()) {
                if (!node.isPersistable()) {
                    fixedNodes.push(node);
                }
            }
            // Rebuild the node list in the order: fixed, loaded
            this.clear();
            fixedNodes.concat(loadedNodes).forEach((node) => {
                this.add(node, false);
            });
        });
    }

    /**
     * @override
     * Save custom operators to KVStore
     * @description
     * It checkes DagCategoryNode.isPersistable(), and persists all those return true.
     */
    public saveCategory(): XDPromise<void> {
        const putSet: Set<string> = new Set();
        const delSet: Set<string> = new Set(this._dirtyData.delete);
        this._dirtyData.create.forEach((key) => {
            if (!delSet.has(key)) {
                putSet.add(key);
            }
        });
        this._dirtyData.update.forEach((key) => {
            if (!delSet.has(key)) {
                putSet.add(key);
            }
        });

        const taskList = [];
        // List of update/add nodes
        for (const operator of this.getOperators()) {
            const opKey = operator.getKey();
            if (operator.isPersistable() && putSet.has(opKey)) {
                const nodeJSON = operator.getJSON();
                const kvStore = new KVStore(
                    this._getNodeFullKey(opKey),
                    gKVScope.USER);

                const deferred = PromiseHelper.deferred();
                kvStore.put(JSON.stringify(nodeJSON), true, false)
                .then(() => deferred.resolve())
                .fail(() => deferred.resolve());
                taskList.push(deferred.promise());
            }
        }
        // List of delete nodes
        delSet.forEach((opKey) => {
            const kvStore = new KVStore(
                this._getNodeFullKey(opKey),
                gKVScope.USER);

            const deferred = PromiseHelper.deferred();
            kvStore.delete()
            .then(() => deferred.resolve())
            .fail(() => deferred.resolve());
            taskList.push(deferred.promise());
        });

        // Execute all tasks in parallel
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        PromiseHelper.when(...taskList)
        .always(() => {
            this._dirtyData.create.clear();
            this._dirtyData.update.clear();
            this._dirtyData.delete.clear();
            deferred.resolve();
        });
        return deferred.promise();
    }

    /**
     * Generate a name w/o conflicting with existing operators in the category
     * @param prefix
     * @returns prefix-[number]
     */
    public genOperatorName(prefix: string): string {
        const nameSet = this._getOperatorDisplayNames();

        let limitCount = 1000;
        const step = 100;
        let start = 1;
        let end = start + step;
        while (nameSet.has(`${prefix}-${end}`)) {
            start += step; end += step;
            if (limitCount > 0) {
                limitCount --;
            } else {
                return prefix;
            }
        }

        for (let i = start; i < end; i ++) {
            const name = `${prefix}-${i}`;
            if (!nameSet.has(name)) {
                return name;
            }
        }

        return prefix;
    }
    
    /**
     * @override
     * @param node 
     */
    public add(node: DagCategoryNode, isSetDirty: boolean = true): void {
        super.add(node);
        if (node.isPersistable() && isSetDirty) {
            this._dirtyData.create.add(node.getKey());
        }
    }

    /**
     * @override
     * @param operatorId
     */
    public removeOperatorById(
        operatorId: DagNodeId, isSetDirty: boolean = true
    ): boolean {
        const op = this.getOperatorById(operatorId);
        if (op != null && op.isPersistable() && isSetDirty) {
            this._dirtyData.delete.add(op.getKey());
        }
        return super.removeOperatorById(operatorId);
    }

    /**
     * @override
     * @param operatorId 
     * @param name 
     */
    public renameOperatorById(
        operatorId: DagNodeId, name: string, isSetDirty: boolean = true
    ): boolean {
        const categoryNode = this.getOperatorById(operatorId);
        if (categoryNode != null && categoryNode.isPersistable() && isSetDirty) {
            this._dirtyData.update.add(categoryNode.getKey());
        }
        return super.renameOperatorById(operatorId, name);
    }    

    /**
     * @override
     */
    public getSortedOperators() {
        const result = super.getSortedOperators().map((v) => v);
        result.sort((a, b) => {
            const [av, bv] = [a.getDisplayNodeType().toLowerCase(), b.getDisplayNodeType().toLowerCase()];
            return av > bv ? 1 : (av < bv ? -1 : 0);
        });
        return result;
    }

    private _hasDirtyData(): boolean {
        return this._dirtyData.create.size > 0
            || this._dirtyData.update.size > 0
            || this._dirtyData.delete.size > 0;
    }

    private _getNodeKeyPatten(): string {
        return `${this._categoryKey}/.+`;
    }

    private _getNodeFullKey(nodeKey: string): string {
        return `${this._categoryKey}/${nodeKey}`;
    }
}
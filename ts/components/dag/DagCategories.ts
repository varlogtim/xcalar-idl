class DagCategories {
    private categories: DagCategory[];
    public constructor() {

        this.initBasicLists();
    }

    private initBasicLists() {

        this.categories = [];

        const favoritesCategory = new DagCategory(DagCategoryType.Favorites, [
            new DagCategoryNodeIn(DagNodeFactory.create({
                type: DagNodeType.Dataset
            })),
            new DagCategoryNodeOperations(DagNodeFactory.create({
                type: DagNodeType.Filter
            })),
            new DagCategoryNodeColumn(DagNodeFactory.create({
                type: DagNodeType.Map
            })),
            new DagCategoryNodeOut(DagNodeFactory.create({
                type: DagNodeType.Export
            })),
        ]);

        const inCategory = new DagCategory(DagCategoryType.In, [
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

        const outCategory = new DagCategory(DagCategoryType.Out, [
            new DagCategoryNodeOut(DagNodeFactory.create({
                type: DagNodeType.Export
            })),
            new DagCategoryNodeOut(DagNodeFactory.create({
                type: DagNodeType.PublishIMD
            })),
            new DagCategoryNodeOut(DagNodeFactory.create({
                type: DagNodeType.DFOut
            })),
        ]);

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
            }))
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
            }))
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
        ], 'gUserCustomOpKey');

        this.categories = [
            favoritesCategory,
            inCategory,
            outCategory,
            valueCategory,
            operationsCategory,
            columnCategory,
            joinCategory,
            setCategory,
            sqlCategory,
            extensionCategory,
            customCategory
        ];
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

// XXX TODO: Solve race condition by using path structured KVStore key 'gUserCustomOpKey/opName';
// XXX TODO: Generate unique key(per user), in the multi-session scenario;
// XXX TODO: Syncup custom ops between multiple sessions;
class DagCategoryCustom extends DagCategory {
    private _kvStore: KVStore;

    public constructor(operators: DagCategoryNode[], key: string) {
        super(DagCategoryType.Custom, operators);
        this._kvStore = new KVStore(
            KVStore.getKey(key),
            gKVScope.USER);
    }

    /**
     * @override
     * Load custom operators from KVStore
     */
    public loadCategory():XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        this._kvStore.getAndParse()
        .then((categoryInfos: DagCategoryNodeInfo[]) => {
            if (categoryInfos != null) {
                for (const info of categoryInfos) {
                    this.add(DagCategoryNodeFactory.createFromJSON(info));
                }
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * @override
     * Save custom operators to KVStore
     * @description
     * It checkes DagCategoryNode.isPersistable(), and persists all those return true.
     */
    public saveCategory(): XDPromise<void> {
        const categoryInfos: DagCategoryNodeInfo[] = [];
        for (const operator of this.getOperators()) {
            if (operator.isPersistable()) {
                // Save only the operators that needs to be persisted
                categoryInfos.push(operator.getJSON());
            }
        }
        return this._kvStore.put(JSON.stringify(categoryInfos), true, false);
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
}
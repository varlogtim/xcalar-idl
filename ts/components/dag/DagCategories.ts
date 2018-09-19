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
            }))
        ]);

        const outCategory = new DagCategory(DagCategoryType.Out, [
            new DagCategoryNodeOut(DagNodeFactory.create({
                type: DagNodeType.Export
            }))
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
        ]);

        const columnCategory = new DagCategory(DagCategoryType.Column, [
            new DagCategoryNodeColumn(DagNodeFactory.create({
                type: DagNodeType.Map
            })),
            new DagCategoryNodeColumn(DagNodeFactory.create({
                type: DagNodeType.Map,
                subType: DagNodeSubType.Cast
            }))
        ]);

        const joinCategory = new DagCategory(DagCategoryType.Join, [
            new DagCategoryNodeJoin(DagNodeFactory.create({
                type: DagNodeType.Join
            }))
        ]);

        const setCategory = new DagCategory(DagCategoryType.Set, [
            new DagCategoryNodeSet(DagNodeFactory.create({
                type: DagNodeType.Set
            }))
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

        const customCategory = new DagCategory(DagCategoryType.Custom, [
            new DagCategoryNode(DagNodeFactory.create({
                type: DagNodeType.Custom
            }), DagCategoryType.Custom),
            new DagCategoryNode(DagNodeFactory.create({
                type: DagNodeType.CustomInput
            }), DagCategoryType.Custom, true)
        ]);

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
}
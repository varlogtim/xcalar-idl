class DagCategories {
    private categories: DagCategory[];
    public constructor() {

        this.initBasicLists();
    }

    private initBasicLists() {

        this.categories = [];

        const inCategory = new DagCategory(DagCategoryType.In, [
            new DagNode({
                type: DagNodeType.Dataset
            })
        ]);

        const outCategory = new DagCategory(DagCategoryType.Out, [
            new DagNode({
                type: DagNodeType.Export
            })
        ]);

        const valueCategory = new DagCategory(DagCategoryType.Value, [
            new DagNode({
                type: DagNodeType.Aggregate
            })
        ]);

        const operationsCategory = new DagCategory(DagCategoryType.Operations, [
            new DagNode({
                type: DagNodeType.Filter
            })
        ]);

        const columnCategory = new DagCategory(DagCategoryType.Column, [
            new DagNode({
                type: DagNodeType.Map
            })
        ]);

        const joinCategory = new DagCategory(DagCategoryType.Join, [
            new DagNode({
                type: DagNodeType.Join
            })
        ]);

        const setCategory = new DagCategory(DagCategoryType.Set, [
            new DagNode({
                type: DagNodeType.Union
            })
        ]);

        this.categories = [inCategory, outCategory, valueCategory,
                        operationsCategory, columnCategory, joinCategory,
                        setCategory];
    }

    public getCategories(): DagCategory[] {
        return this.categories;
    }
}

class DagCategory {
    private name: string;
    private operators: DagNode[];

    public constructor(name, items) {
        this.name = name;
        this.operators = items;
    }

    public getName(): string {
        return this.name;
    }

    public add(node: DagNode): void {
        this.operators.push(node);
    }

    public getOperators() {
        return this.operators;
    }
}
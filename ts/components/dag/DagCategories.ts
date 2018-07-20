class DagCategories {
    private categories: DagCategory[];
    public constructor() {

        this.initBasicLists();
    }

    private initBasicLists() {

        this.categories = [];

        const favoritesCategory = new DagCategory(DagCategoryType.Favorites, []);

        const inCategory = new DagCategory(DagCategoryType.In, [
            DagNodeFactory.create({
                type: DagNodeType.Dataset
            })
        ]);

        const outCategory = new DagCategory(DagCategoryType.Out, [
            DagNodeFactory.create({
                type: DagNodeType.Export
            })
        ]);

        const valueCategory = new DagCategory(DagCategoryType.Value, [
            DagNodeFactory.create({
                type: DagNodeType.Aggregate
            })
        ]);

        const operationsCategory = new DagCategory(DagCategoryType.Operations, [
            DagNodeFactory.create({
                type: DagNodeType.Filter
            }),
            DagNodeFactory.create({
                type: DagNodeType.Project
            }),
            DagNodeFactory.create({
                type: DagNodeType.GroupBy
            }),
        ]);

        const columnCategory = new DagCategory(DagCategoryType.Column, [
            DagNodeFactory.create({
                type: DagNodeType.Map
            })
        ]);

        const joinCategory = new DagCategory(DagCategoryType.Join, [
            DagNodeFactory.create({
                type: DagNodeType.Join
            })
        ]);

        const setCategory = new DagCategory(DagCategoryType.Set, [
            DagNodeFactory.create({
                type: DagNodeType.Set
            })
        ]);

        this.categories = [favoritesCategory, inCategory, outCategory,
                        valueCategory, operationsCategory, columnCategory,
                        joinCategory, setCategory];
    }

    public getCategories(): DagCategory[] {
        return this.categories;
    }
}

class DagCategory {
    private name: string;
    private operators: DagNode[];

    public constructor(name, operators) {
        this.name = name;
        this.operators = operators;
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
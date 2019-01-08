class DagTabSQLFunc extends DagTabUser {
    public static listFuncs(): XDPromise<string[]> {
        // XXX TODO remove the fake thing
        return PromiseHelper.resolve(["fn"]);
    }

    public static getFunc(name: string) {
        // XXX TODO remove fake thing
        return new DagTabSQLFunc(name);
    }

    public getQuery(input: string[]): string {
        // XXX TODO remove fake thing
        let dest = "testTable" + Authentication.getHashId();
        let fakeQuey = `{"operation":"XcalarApiMap","args":{"source":"${input[0]}","dest":"${dest}","eval":[{"evalString":"add(1, 1)","newField":"test"}],"icv":false}}`
        return fakeQuey;
    }

    public getSchema(): ColSchema[] {
        // XXX TODO remove fake thing
        return [{
            name: "test",
            type: ColumnType.integer
        }];
    }
}
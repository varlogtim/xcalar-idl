/*
This file defines the state of SQL mode in XD Func Test
SQLModeState has the following operations:

* createSnippet
* deleteSnippet
* executeSnippet

- createSnippet will generate a random sql query (or use a SQL Func with 40% chance)
and randomly chose the existing publish tables in the newly created snippet.
- executeSnippet will execute the sql query within the snippet and publish the result
table (We only publish relatively small tables --> with row nums in (0, 500])

*/
class SQLModeState extends State {
    private sqlEditor: SQLEditorSpace;
    private sqlSnippet: SQLSnippet;
    private sqlHistory: SqlQueryHistory;
    private tableManager: PTblManager;
    private mode: String;
    private run: number; // How many iterations ran in this state currently

    public constructor(stateMachine: StateMachine, verbosity: string) {
        let name = "SQLMode";
        super(name, stateMachine, verbosity);

        // Set up the sql mode
        this.mode = XVM.Mode.SQL;
        XVM.setMode(this.mode);

        //turn off auto execute and auto preview for dataflow
        UserSettings.setPref("dfAutoExecute", false, false);
        UserSettings.setPref("dfAutoPreview", false, false);

        // get all the datasources loaded as part of functests setup
        this.sqlEditor = SQLEditorSpace.Instance;
        this.sqlSnippet = SQLSnippet.Instance;
        this.sqlHistory = SqlQueryHistory.getInstance();
        this.tableManager = PTblManager.Instance;

        this.availableActions = [this.createSnippet];
        this.run = 0;
    }

    /* -------------------------------Helper Function------------------------------- */
    // Generate a random unique snippet name
    private getUniqueName(prefix?: string, validFunc?: function): string {
        prefix = prefix || "FuncTestSnippet";
        validFunc = validFunc || function (snippetName) { return (!SQLSnippet.Instance.hasSnippet(snippetName));};
        return xcHelper.uniqueRandName(prefix, validFunc, 10);
    }

    // Return a random snippet
    private getRandomSnippet(): string {
        let snippetNames = this.sqlSnippet._listSnippetsNames();
        // Get rid of the default snippet: Untitled
        snippetNames.splice( snippetNames.indexOf(CommonTxtTstr.Untitled), 1 );
        return Util.pickRandom(snippetNames);
    }

    private async getPublishTables(): XDPromise<string[]>{
        let tableLoaded = await this.tableManager._listTables();
        let tables = [];
        for (let table of tableLoaded) {
            tables.push(table.name);
        }
        return tables;
    }

    // Generate sql query
    private async generateSQL(): XDPromise<string> {
        let publishTables = await this.getPublishTables();
        let tables = [];
        let filters = [];
        for (let idx of Array.from(Array(Util.getRandomInt(3)+1).keys())) {
            let tableName = Util.pickRandom(publishTables);
            tables.push(`${tableName} as t${idx}`)
            filters.push(`t${idx}.ROWNUM <= ${Util.getRandomInt(30)+1}`)
        }
        // Do a filter on ROWNUM column of the table
        // e.g: select * from table as t0 join table as t1 where t0.ROWNUM < 30 and t1.ROWNUM < 15
        let sql = `select * from ${tables.join(' join ')} where ${filters.join(' and ')}`;
        // 40% chance we will use SQL func
        if (Util.getRandomInt(10) > 5) {
            let dags = await DagList.Instance.listSQLFuncAsync();
            dags = dags.dags;
            if (dags.length > 0) {
                let sqlFunc = Util.pickRandom(dags).name;
                sql = `SELECT * FROM ${sqlFunc}(${Util.pickRandom(publishTables)})`;
            }
        }
        return sql;
    }

    // Get latest sql history
    private getLatestSQLHistory(): SqlQueryHistory.QueryInfo {
        let historyMap = this.sqlHistory.getQueryMap();
        let qInfo = null;
        for (let idx in historyMap) {
            let q = historyMap[idx];
            if (qInfo == null || qInfo.startTime < q.startTime) {
                qInfo = q;
            }
        }
        return qInfo;
    }
    /* -------------------------------Helper Function------------------------------- */

    private async createSnippet(): XDPromise<SQLModeState> {
        let snippetName = this.getUniqueName();
        this.log(`Creating snippet ${snippetName}`);
        try {
            await this.sqlEditor._newSnippet();
            await this.sqlEditor._setSnippet(snippetName);
            this.sqlEditor.clearSQL();
            let sql = await this.generateSQL();
            this.sqlEditor.newSQL(sql);
            await this.sqlEditor.save();
        } catch (err) {
            this.log(`Error creating snippet ${err}`);
            throw err;
        }

        if (!this.sqlSnippet.hasSnippet(snippetName)) {
            throw `Error creating snippet ${snippetName}, not in the snippet list`;
        }

        if (this.sqlSnippet._listSnippetsNames().length > 1) {
            // If has more than one snippet ( except for the default one)
            // add more actions
            this.addAction(this.deleteSnippet);
            this.addAction(this.executeSnippet);
        }
        return this;
    }

    private async deleteSnippet(): XDPromise<SQLModeState> {
        let randomSnippet = this.getRandomSnippet();
        this.log(`Deleting snippet ${randomSnippet}`);
        try{
            await this.sqlSnippet.deleteSnippet(randomSnippet);
        } catch (err) {
            this.log(`Error deleting snippet ${err}`);
            throw err;
        }

        if (this.sqlSnippet.hasSnippet(randomSnippet)) {
            throw `Error deleting snippet ${randomSnippet}`;
        }
        if (this.sqlSnippet._listSnippetsNames().length == 1) {
            // Only 1 default snippet: Untitled
            this.deleteAction(this.executeSnippet);
            this.deleteAction(this.deleteSnippet);
        }
        return this;
    }

    private async executeSnippet(): XDPromise<SQLModeState> {
        let randomSnippet = this.getRandomSnippet();
        this.log(`Executing snippet ${randomSnippet}`);
        this.sqlEditor._setSnippet(randomSnippet);
        let snippet = this.sqlSnippet.getSnippet(randomSnippet);

        if (!snippet) { // empty snippet
            return this;
        }

        try{
            this.log(`Executing sql query ${snippet}`);
            await this.sqlEditor.execute(snippet);
        } catch (err) {
            this.log(`Error executing snippet ${err}`);
            throw err;
        }

        // Check the latest query history info matches the sql query
        // we just issued
        let checkFunc = function() {
            let historyMap = SqlQueryHistory.getInstance().getQueryMap();
            let qInfo = null;
            for (let idx in historyMap) {
                let q = historyMap[idx];
                if (qInfo == null || qInfo.startTime < q.startTime) {
                    qInfo = q;
                }
            }
            if (qInfo == null) {
                return false;
            }
            console.info(`checking sql execution ${snippet}`);
            return qInfo.queryString == snippet && (qInfo.status == 'Failed' || qInfo.status == 'Done');
        }
        await this.testFinish(checkFunc);

        let qInfo = this.getLatestSQLHistory();
        // Only publish those relatively small table (row nums in (0, 500])
        if (qInfo.status == 'Done' && qInfo.queryString == snippet && qInfo.rows > 0 && qInfo.rows < 500) {
            let publishTables = await this.getPublishTables();
            let validFunc = function(name) {return !publishTables.includes(name);}
            let tableName = this.getUniqueName("FUNCTESTPUB", validFunc);
            let columns = [];
            for (let col of qInfo.columns) {
                columns.push(ColManager.newPullCol(col.name, col.backName, col.type));
            }
            await this.tableManager.createTableFromView([], columns, qInfo.tableName, tableName);
        }
        return this;
    }

    public async takeOneAction(): XDPromise<SQLModeState> {
        XVM.setMode(this.mode);
        let randomAction = Util.pickRandom(this.availableActions);
        const newState = await randomAction.call(this);
        this.run++;
        return newState;
    }
}

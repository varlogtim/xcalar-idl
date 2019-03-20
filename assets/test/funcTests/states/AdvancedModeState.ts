class AdvancedModeState extends State {
    private dagTabManager: DagTabManager;
    private currentTab: DagTabUser;
    private dfLinks: Map<string, Array<string>>;

    private tabsArray:string[];
    private mode: string;

    public constructor(stateMachine: StateMachine, verbosity: string) {
        let name = "AdvancedMode";
        super(name, stateMachine, verbosity);
        // Sets in the advanced mode
        this.mode = XVM.Mode.Advanced;
        XVM.setMode(this.mode);
        //turn off auto execute and auto preview
        UserSettings.setPref("dfAutoExecute", false, false);
        UserSettings.setPref("dfAutoPreview", false, false);

        this.availableActions = [this.createTab];

        // get all the datasources loaded as part of functests setup
        this.dfLinks = new Map();
        this.dagTabManager = DagTabManager.Instance;
    }

    public async createTab() {
        // XXX restricting to only 3 tabs
        if (this.dagTabManager.getTabs().length >= 3) {
            return await this.getTab();
        }
        let newTabId = this.dagTabManager.newTab();
        this.currentTab = this.dagTabManager.getTabById(newTabId);
        await this.addDatasetNode();

        if (this.availableActions.length == 1) {
            // In nodes
            this.availableActions.push(this.addDatasetNode);
            this.availableActions.push(this.addLinkInNode);

            // column nodes
            this.availableActions.push(this.addMapNode);
            this.availableActions.push(this.addSplitNode);
            this.availableActions.push(this.addRoundNode);
            // this.availableActions.push(this.addProjectNode);

            // out nodes
            this.availableActions.push(this.addLinkOutNode);

            // SQL nodes
            this.availableActions.push(this.addSQLNode);
            //tab
            this.availableActions.push(this.getTab);

            // SQL func
            this.availableActions.push(this.createSQLFunc);
        }
        return this;
    }

    public async getTab() {
        this.currentTab.save();
        this.currentTab = this.pickRandom(this.dagTabManager.getTabs());
        this.dagTabManager.switchTab(this.currentTab.getId());
        return this;
    }

    // In nodes
    public async addDatasetNode() {
        let datasetsLoaded = DS.listDatasets();
        let ds = this.pickRandom(datasetsLoaded);
        let dsNode = DagViewManager.Instance.newNode({type:DagNodeType.Dataset});
        let dsArgs = await DS.getLoadArgsFromDS(ds.id);
        let dsSchema = await DS.getDSBasicInfo(ds.id);
        dsNode.setParam({
            'source': ds.id,
            'prefix': xcHelper.randName(xcHelper.parseDSName(ds.id)["dsName"]),
            'synthesize': this._getRandomLiteral(ColumnType.boolean),
            'loadArgs': dsArgs
        });
        dsNode.setSchema(dsSchema[ds.id].columns, true);
        return this;
    }

    public async addLinkInNode() {
        if (this.dfLinks.size == 0) {
            this.log("No links avialable to create link in nodes!");
            return this;
        }
        let dfId = this.pickRandom(this.dfLinks);
        let linkOutId = this.pickRandom(this.dfLinks.get(dfId));
        let linkInNode = DagViewManager.Instance.newNode({type:DagNodeType.DFIn});
        let linkOutNode = this.getDfLinkOutNodeById(linkOutId);
        linkInNode.setParam({
            'linkOutName': linkOutNode.getParam().name,
            'dataflowId': dfId
        });
        let progCols = linkOutNode.getLineage().getColumns();
        let schema = progCols.map((progCol) => {
            return {
                name: progCol.getBackColName(),
                type: progCol.getType()
            }
        });
        linkInNode.setSchema(schema);
        return this;
    }

    // Column nodes
    public async addMapNode() {
        let cNode, columns;
        [cNode, columns] = this.addNode(DagNodeType.Map);
        let numOfEvals = Math.floor(5 * Math.random()) + 1;
        let evalObjs = [];
        while (numOfEvals > 0) {
            evalObjs.push({
                "evalString":this._buildEvalStr(columns),
                "newField": xcHelper.randName("col_") + Date.now()
            });
           --numOfEvals;
        }
        cNode.setParam({
            "eval":evalObjs,
            "icv":false
        });
        //run
        // await graph.execute();
        return this;
    }

    public async addSplitNode() {
        let cNode, columns;
        [cNode, columns] = this.addNode(DagNodeType.Split);
        let numOfCuts = Math.floor(5 * Math.random()) + 1;
        let delim = this._getRandomString(1);
        let currCut = 1;
        let evalObjs = [];
        let randomCol = this.pickRandom(columns);
        while (currCut <= numOfCuts) {
            evalObjs.push({
                "evalString":`cut(string(${randomCol.backName}),${currCut},\"${delim}\")`,
                "newField": xcHelper.randName("col_") + Date.now()
            });
           currCut++;
        }
        cNode.setParam({
            "eval":evalObjs,
            "icv":false
        });
        //run
        // await graph.execute();
        return this;
    }

    public async addRoundNode() {
        let cNode, allCols;
        [cNode, allCols] = this.addNode(DagNodeType.Round);
        //Get all columns of type float
        let numTypeColumns = [1.2]; //adding some literals
        for (const colInfo of allCols) {
            const colType = colInfo.getType();
            if (colType === ColumnType.float) {
                numTypeColumns.push(colInfo.getBackColName());
            }
        }
        let numOfRounds = Math.floor(2 * Math.random()) + 1;
        let evalObjs = [];
        while (numOfRounds > 0) {
            const randomCol = this.pickRandom(numTypeColumns);
            const numOfDecimals = Math.floor(10000 * Math.random()); //some random upto 10000
            evalObjs.push({
                "evalString":`round(${randomCol},${numOfDecimals})`,
                "newField": xcHelper.randName("round_") + Date.now()
            });
            numOfRounds--;
        }
        cNode.setParam({
            "eval":evalObjs,
            "icv":false
        });
        //run
        // await graph.execute();
        return this;
    }

    public async addRownNumNode() {
        let cNode;
        [cNode, ] = this.addNode(DagNodeType.RowNum);
        cNode.setParam({
            "newField": xcHelper.randName("rownum_") + Date.now()
        });
        //run
        // await graph.execute();
        return this;
    }

    public async addProjectNode() {
        let cNode, allCols;
        [cNode, allCols] = this.addNode(DagNodeType.Project);
        let numColsToProject = Math.floor(allCols.length * 2/3);
        let colsToKeep = [];
        let addPrefix = false;
        for (const colInfo of allCols) {
            if(colInfo.isImmediate()) {
                colsToKeep.push(colInfo.backName);
                numColsToProject--;
            } else {
                let prefixedCols = cNode.getParents()[0].getLineage().getPrefixColumns();
                colsToKeep.push(...prefixedCols);
                numColsToProject = numColsToProject - prefixedCols.length;
            }
            if(numColsToProject <= 0) {
                break;
            }
        }
        cNode.setParam({
            "columns": colsToKeep
        });
        //run
        // await graph.execute();
        return this;
    }

    // Row nodes
    public async addSortNode() {

    }

    public async addFilterNode() {

    }

    public async addExplodeNode() {

    }

    // Set nodes
    public async addUnionNode() {

    }

    public async addExceptNode() {

    }

    public async addIntersectNode() {

    }

    // Join nodes

    // SQL node
    public async addSQLNode() {
        let graph = this.currentTab.getGraph();
        let numParents = Math.floor(5 * Math.random()) + 1;
        let pNode;
        let cNode = DagViewManager.Instance.newNode({type:DagNodeType.SQL});
        let identifiersObj = {};
        let identifiersOrder = [];
        let currIter = 1;
        while (currIter <=  numParents) {
            pNode = graph.nodesMap.get(this.pickRandom(graph.nodesMap));
            if (pNode.type === DagNodeType.DFOut || pNode.getId() === cNode.getId()) {
                continue;
            }
            identifiersObj[currIter] = "tab" + currIter;
            identifiersOrder.push(currIter);
            xcAssert(pNode != undefined);
            graph.connect(pNode.id, cNode.id, currIter-1);
            currIter++;
        }
        // Querying only on one tab(parent)
        let randomTab = this.pickRandom(Object.values(identifiersObj));
        let sqlQuery = `SELECT * FROM ${randomTab}`;
        cNode.setParam({
            "sqlQueryStr": sqlQuery,
            "identifiers": identifiersObj,
            "identifiersOrder": identifiersOrder,
            "dropAsYouGo": this._getRandomLiteral(ColumnType.boolean)
        });
        return this;
    }

    // Out nodes
    public async addLinkOutNode() {
        let cNode, allCols;
        [cNode, allCols] = this.addNode(DagNodeType.DFOut);
        let linkOutName = xcHelper.randName("Linkout_" + Date.now());
        cNode.setParam({
            "name": linkOutName,
            "linkAfterExecution": this._getRandomLiteral(ColumnType.boolean)
        });
        this.setDfLinks(cNode.getId());
        //run
        // await graph.execute();
        return this;
    }

    private getDfLinkOutNodeById(linkOutId: string) {
        let tabs = this.dagTabManager.getTabs();
        for(let tab of tabs) {
            let graph = tab.getGraph();
            if(graph.hasNode(linkOutId)) {
                return graph._getNodeFromId(linkOutId);
            }
        }
        this.log(`Error: Link out node with id ${linkOutId} not found.`)
    }

    private setDfLinks(linkName: string) {
        let dfId = this.currentTab.getId();
        if (this.dfLinks.has(dfId)){
            this.dfLinks.get(dfId).push(linkName);
        } else{
            this.dfLinks.set(dfId, [linkName]);
        }
    }

    private _getRandomString(len: number) {
        if(len == undefined) {
            len = Math.floor(30 * Math.random()) + 1;
        }
        let allPossibleChars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&()*+,-./:;<=>?@[]^_`{|}~";
        return [...Array(len).keys()].map(() => allPossibleChars.charAt(Math.floor(allPossibleChars.length*Math.random()))).join('');
    }

    private _getRandomLiteral(type: string) {
        let toss;
        if (type == undefined) {
            toss = this.pickRandom([0, 1, 2, 3]);
        }
        // Boolean type
        if (type === ColumnType.boolean || toss === 0) {
            return this.pickRandom([true, false]);
        } else if (type === ColumnType.string || toss === 1) {//string type
            return `\"${this._getRandomString()}\"`;
        } else if (type === ColumnType.integer || toss === 2) { //random  int
            return Math.floor(1000 * Math.random());
        } else { // Defaulting to float
            return 1000 * Math.random();
        }
    }

    private _getAllXDFsAsArray() {
        let xdfsArray = [];
        let allXDFs = XDFManager.Instance.getOperatorsMap();
        let xdfCats = Object.keys(allXDFs);
        xdfCats.forEach((cat) => {
            var funcsByCat = Object.keys(allXDFs[cat]);
            funcsByCat.forEach((funcName) => {
                xdfsArray.push(allXDFs[cat][funcName]);
            });
        });
        return xdfsArray;
    }

    // builds a random nested eval string by ignoring the type information of input
    private _buildEvalStr(columnsObj: Object[]) {
        let xdfsArr = this._getAllXDFsAsArray();
        let columnNames = columnsObj.map((colInfo) => { return colInfo.backName});
        let evalString = this.pickRandom(columnNames);
        let nestedDepth = Math.floor(5 * Math.random()) + 1;
        while (nestedDepth > 0) {
            //select a xdf
            let xdf = this.pickRandom(xdfsArr);
            // use precomputed evalString
            let xdfArgs = [evalString];
            let argNum=1;
            while (argNum < xdf.argDescs.length) {
                let toss = this.pickRandom([true, true, false]);
                // picks either literal or column; more weightage for columns.
                if(toss) {
                    xdfArgs.push(this.pickRandom(columnNames));
                } else {
                    xdfArgs.push(this._getRandomLiteral());
                }
                argNum++;
            }
            evalString = `${xdf.fnName}(${xdfArgs.join(', ')})`;
            nestedDepth--;
        }
        return evalString;
    }

    private addNode(nodeType: string) {
        let graph = this.currentTab.getGraph();
        let pNode;
        do {
            pNode = graph.nodesMap.get(this.pickRandom(graph.nodesMap));
        } while (pNode.type === DagNodeType.DFOut);
        xcAssert(pNode != undefined);
        let cNode = DagViewManager.Instance.newNode({type:nodeType});
        graph.connect(pNode.id, cNode.id);
        return [cNode, pNode.getLineage().getColumns()];
    }

    private async createSQLFunc() {
        let currentTabId = this.currentTab.getId();
        let newTabId = this.dagTabManager.newSQLFunc();
        this.currentTab = this.dagTabManager.getTabById(newTabId);
        this.mode = "linear"

        let tableLoaded = await PTblManager.Instance._listTables();
        let table = this.pickRandom(tableLoaded);
        // create input node
        let ignoreColumns = new Set(["XcalarRankOver", "XcalarOpCode", "XcalarBatchId"])
        let inNode = DagViewManager.Instance.newNode({type: DagNodeType.SQLFuncIn});
        inNode.setParam({"source": table.name});
        let schema = []
        for (let col of table.columns) {
            if (ignoreColumns.has(col.name)) {
                continue;
            }
            schema.push({"name": col.name, "type": col.type});
        }
        inNode.setSchema(schema);

        // build dataflow
        let nodesCount = Math.floor(5*Math.random());
        let count = 1;
        let ignoreActions = new Set(["createTab", "addLinkInNode",
                        "addLinkOutNode", "getTab", "createCustomNodes",
                    "addDatasetNode", "createSQLFunc", "addSQLNode"]);
        while (count < nodesCount) {
            let randomAction = this.pickRandom(this.availableActions);
            if (ignoreActions.has(randomAction.name)) {
                continue;
            }
            await randomAction.call(this);
            count++;
        }

        // create output node
        let graph = this.currentTab.getGraph();
        let pNode = graph.getSortedNodes().slice(-1)[0];
        let outNode = DagViewManager.Instance.newNode({type: DagNodeType.SQLFuncOut});
        graph.connect(pNode.id, outNode.id);

        schema = []
        for (let col of pNode.getLineage().getColumns()) {
            schema.push({"name": col.backName, "type": col.type});
        }
        outNode.setParam({"schema": schema});

        // restore
        this.mode = "random";
        this.dagTabManager.switchTab(currentTabId);
        this.currentTab = this.dagTabManager.getTabById(currentTabId);
        return this;
    }

    public async takeOneAction() {
        let randomAction = this.availableActions[Math.floor(this.availableActions.length * Math.random())];
        const newState = await randomAction.call(this);
        await this.currentTab.save();
        DagViewManager.Instance.autoAlign(this.currentTab.getId());
        return newState;
    }

}

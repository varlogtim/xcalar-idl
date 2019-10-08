/*
This file defines the state of Advanced mode in XD Func Test
advancedModeState has the following operations:

Tab operations
* CreateTab - creates a new dataflow tab
* getTab - Pick an existing tab randomly and switches to it

IN node operations
* addDatasetNode - Adds a dataset node choosing a random dataset loaded
* addLinkInNode - adds a link-in node chosing a random link-out nodes available
* addTableLinkInNode - adds a link-in node chosing a random xd table available
* addInputCustomNode - Adds a input custom node choosing a random custom nodes available.

Column Node operations
* addMapNode - Adds map node by randomly choosing a parent from the dataflow.
               Constructs eval strings with random level and nested operations,
               Totally ignoring the data  type of columns.
* addSplitNode - Adds split  node by randomly choosing a parent from the dataflow,
                constructs the split eval string using a random column.
* addRoundNode - Adds round node by randomly choosing a parent from the dataflow,
                constructs the round eval string using a random column.
* addRowNumNode - Adds rownum  node by randomly choosing a parent from the dataflow.
* addProjectNode - Adds project node by randomly choosing a parent from the dataflow.

OUT node operations
* addLinkOutNode - Adds a linkout node by randomly choosing a parent from the dataflow.
* addOptimizedLinkOutNode - Adds a optimized linkout node by randomly choosing a parent from the dataflow.

Custom Node operations
* createCustomNode - creates a custom node with random operations like linked list fashion.
* createCustomNodesFromDF - creates a custom node frm a dataflow by choosing random nodes in it.
* addCustomNode - add a custom node which is not input type to the dataflow.

SQL node operations
* addSQLNode - Adds a sql node by choosing random number of parents from the dataflow.
               Constructs a simple sql query from the list of connections to it.
* createSQLFunc - creates a sql function with random number of input parameters.

Prune node operation
* pruneNodes - This operation will prune nodes which are in errored or unsed states
               from all the dataflows
*/

class AdvancedModeState extends State {
    private dagTabManager: DagTabManager;
    private dagViewManager: DagViewManager;
    private currentTab: DagTabUser;
    private xdfsArr: Object[];
    private mode: string;
    private maxAvgNumOfNodesPerTab: number;
    private run: number; // How many iterations ran in this state currently
    private currentWKBKId: string;
    private optimizedDF: boolean;

    static dfExecWhiteList: Set<string> = new Set([
        // "All nodes have been executed"
        DFTStr.AllExecuted,
        // "Unconfigured"
        DagNodeErrorType.Unconfigured,
        // "Error: Invalid argument"
        "Error: " + StatusTStr[StatusT.StatusInval]
    ])

    private constructor(stateMachine: StateMachine, verbosity: string) {
        let name = "AdvancedMode";
        super(name, stateMachine, verbosity);

        //turn off auto execute and auto preview
        UserSettings.setPref("dfAutoExecute", false, false);
        UserSettings.setPref("dfAutoPreview", false, false);

        this.availableActions = [this.createTab];
        this.maxAvgNumOfNodesPerTab = 75;
        this.run = 0;
        this.currentWKBKId = WorkbookManager.getActiveWKBK();

        this.dagTabManager = DagTabManager.Instance;
        this.dagViewManager = DagViewManager.Instance;

        this.optimizedDF = false;
    }

    private async createTab() {
        if (this.availableActions.length == 1) {
            // In nodes
            this.addAction(this.addDatasetNode);
            this.addAction(this.addLinkInNode);
            this.addAction(this.addTableLinkInNode);
            this.addAction(this.addInputCustomNode);

            // column nodes
            this.addAction(this.addMapNode);
            this.addAction(this.addSplitNode);
            this.addAction(this.addRoundNode);
            this.addAction(this.addRowNumNode);
            // this.availableActions.push(this.addProjectNode);

            // out nodes
            this.addAction(this.addLinkOutNode);
            this.addAction(this.addOptimizedLinkOutNode);

            // SQL nodes
            this.addAction(this.addSQLNode);
            //tab
            this.addAction(this.getTab);

            // SQL func
            this.addAction(this.createSQLFunc);

            //custom nodes
            this.addAction(this.createCustomNode);
            this.addAction(this.createCustomNodesFromDF);
            this.addAction(this.addCustomNode);

            // Other actions
            this.addAction(this.pruneNodes);
        }

        if (!this._checkToCreateTab()) {
            return await this.getTab();
        }
        let newTabId = this.dagTabManager.newTab();
        this.currentTab = this.dagTabManager.getTabById(newTabId);
        await this.addDatasetNode();
        return this;
    }

    private async getTab() {
        this.currentTab = Util.pickRandom(this.dagTabManager.getTabs());
        this.dagTabManager.switchTab(this.currentTab.getId());
        return this;
    }

    // In nodes
    private async addDatasetNode() {
        this.log(`Adding dataset node.. in WKBK ${this.currentWKBKId}`);
        let datasetsLoaded = DS.listDatasets();
        console.log("************* Num datasets: " + datasetsLoaded.length);
        let ds = Util.pickRandom(datasetsLoaded);
        let dsNode = this.dagViewManager.newNode({type:DagNodeType.Dataset});
        let dsArgs = await DS.getLoadArgsFromDS(ds.id);
        let dsSchema = await DS.getDSBasicInfo(ds.id);

        dsNode.setParam({
            'source': ds.id,
            'prefix': Util.randName(xcHelper.parseDSName(ds.id)["dsName"]),
            'synthesize': this._getRandomLiteral(ColumnType.boolean),
            'loadArgs': dsArgs
        });
        dsNode.setSchema(dsSchema[ds.id].columns, true);
        this.log(`dataset node with id ${ds.id} added in WKBK ${this.currentWKBKId}`);
        return this;
    }

    private async addLinkInNode() {
        this.log(`Adding Link In node.. in WKBK ${this.currentWKBKId}`);
        let dfLinks = this.getAllDfLinks();
        if (dfLinks.length == 0) {
            this.log(`No links available to create link in nodes in WKBK ${this.currentWKBKId}`);
            return this;
        }
        let dfTab, linkOutNode;
        [linkOutNode, dfTab] = Util.pickRandom(dfLinks);
        let linkInNode = this.dagViewManager.newNode({type:DagNodeType.DFIn});
        linkInNode.setParam({
            'linkOutName': linkOutNode.getParam().name,
            'dataflowId': dfTab.getId()
        });
        let progCols = linkOutNode.getLineage().getColumns();
        let schema = progCols.map((progCol) => {
            return {
                name: progCol.getBackColName(),
                type: progCol.getType()
            }
        });
        linkInNode.setSchema(schema);
        this.log(`Link In node added in WKBK ${this.currentWKBKId}`);
        return this;
    }

    private async addInputCustomNode() {
        this.log(`Adding input custom node.. in WKBK ${this.currentWKBKId}`);
        let customNodesInfo = await this.getCustomNodesInfo();
        let customNodes = customNodesInfo.filter((nodeInfo) => nodeInfo.inPorts.length == 0);
        if (customNodes.length == 0) {
            this.log(`No input custom nodes available to add in WKBK ${this.currentWKBKId}`);
            return this.addDatasetNode();
        }
        this.dagViewManager.newNode(Util.pickRandom(customNodes));
        this.log(`Input custom node added in WKBK ${this.currentWKBKId}`);
        return this;
    }

    private async addCustomNode() {
        this.log(`Adding custom node.. in WKBK ${this.currentWKBKId}`);
        let customNodesInfo = await this.getCustomNodesInfo();
        let customNodes = customNodesInfo.filter((nodeInfo) => nodeInfo.inPorts.length > 0);
        if (customNodes.length == 0) {
            this.log(`No custom nodes available to add in WKBK ${this.currentWKBKId}`);
            return this.addDatasetNode();
        }
        this.dagViewManager.newNode(Util.pickRandom(customNodes));
        this.log(`Custom node added in WKBK ${this.currentWKBKId}`);
        return this;
    }

    // Column nodes
    private async addMapNode() {
        this.log(`Adding Map node.. in WKBK ${this.currentWKBKId}`);
        let cNode, columns;
        [cNode, columns] = this.addNode({type:DagNodeType.Map});
        if (cNode == undefined) {
            this.log("There is only out node in current tab. Skip add map node");
            return this;
        }
        let numOfEvals = Math.floor(5 * Util.random()) + 1;
        let evalObjs = [];
        while (numOfEvals > 0) {
            evalObjs.push({
                "evalString":this._buildEvalStr(columns),
                "newField": Util.randName("col_") + Date.now()
            });
           --numOfEvals;
        }
        cNode.setParam({
            "eval":evalObjs,
            "icv":false
        });
        //run
        // await graph.execute();
        this.log(`Added Map node in WKBK ${this.currentWKBKId}`);
        return this;
    }

    private async addSplitNode() {
        this.log(`Adding split node.. in WKBK ${this.currentWKBKId}`);
        let cNode, columns;
        [cNode, columns] = this.addNode({type:DagNodeType.Split});
        if (cNode == undefined) {
            this.log("There is only out node in current tab. Skip add split node");
            return this;
        }
        let numOfCuts = Math.floor(5 * Util.random()) + 1;
        let delim = this._getRandomString(1);
        let currCut = 1;
        let evalObjs = [];
        let randomCol = Util.pickRandom(columns);
        while (currCut <= numOfCuts) {
            evalObjs.push({
                "evalString":`cut(string(${randomCol.backName}),${currCut},\"${delim}\")`,
                "newField": Util.randName("col_") + Date.now()
            });
           currCut++;
        }
        cNode.setParam({
            "eval":evalObjs,
            "icv":false
        });
        //run
        // await graph.execute();
        this.log(`Added split node in WKBK ${this.currentWKBKId}`);
        return this;
    }

    private async addRoundNode() {
        this.log(`Adding Round node.. in WKBK ${this.currentWKBKId}`);
        let cNode, allCols;
        [cNode, allCols] = this.addNode({type:DagNodeType.Round});
        if (cNode == undefined) {
            this.log("There is only out node in current tab. Skip add round node");
            return this;
        }
        //Get all columns of type float
        let numTypeColumns = [1.2]; //adding some literals
        for (const colInfo of allCols) {
            const colType = colInfo.getType();
            if (colType === ColumnType.float) {
                numTypeColumns.push(colInfo.getBackColName());
            }
        }
        let numOfRounds = Math.floor(2 * Util.random()) + 1;
        let evalObjs = [];
        while (numOfRounds > 0) {
            const randomCol = Util.pickRandom(numTypeColumns);
            const numOfDecimals = Math.floor(10000 * Util.random()); //some random upto 10000
            evalObjs.push({
                "evalString":`round(${randomCol},${numOfDecimals})`,
                "newField": Util.randName("round_") + Date.now()
            });
            numOfRounds--;
        }
        cNode.setParam({
            "eval":evalObjs,
            "icv":false
        });
        //run
        // await graph.execute();
        this.log(`Round node added in WKBK ${this.currentWKBKId}`);
        return this;
    }

    private async addRowNumNode() {
        this.log(`Adding Row Num node.. in WKBK ${this.currentWKBKId}`);
        let cNode;
        [cNode, ] = this.addNode({type:DagNodeType.RowNum});
        if (cNode == undefined) {
            this.log("There is only out node in current tab. Skip add rownum node");
            return this;
        }
        cNode.setParam({
            "newField": Util.randName("rownum_") + Date.now()
        });
        //run
        // await graph.execute();
        this.log(`Row Num node added in WKBK ${this.currentWKBKId}`);
        return this;
    }

    private async addProjectNode() {
        this.log(`Adding Project node.. in WKBK ${this.currentWKBKId}`);
        let cNode, allCols;
        [cNode, allCols] = this.addNode({type:DagNodeType.Project});
        if (cNode == undefined) {
            this.log("There is only out node in current tab. Skip add project node");
            return this;
        }
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
        this.log(`Project node added in WKBK ${this.currentWKBKId}`);
        return this;
    }

    // Row nodes
    private async addSortNode() {

    }

    private async addFilterNode() {

    }

    private async addExplodeNode() {

    }

    // Set nodes
    private async addUnionNode() {

    }

    private async addExceptNode() {

    }

    private async addIntersectNode() {

    }

    // Join nodes

    // SQL node
    private async addSQLNode() {
        this.log(`Adding SQL node.. in WKBK ${this.currentWKBKId}`);
        let graph = this.currentTab.getGraph();
        if (this._onlyOutNode(graph)) {
            this.log(`Only out node in the current tab. Skip add sql node`);
            return this;
        }
        let numParents = Math.floor(5 * Util.random()) + 1;
        let pNode;
        let cNode = this.dagViewManager.newNode({type:DagNodeType.SQL});
        let identifiersObj = {};
        let identifiersOrder = [];
        let currIter = 1;
        while (currIter <=  numParents) {
            pNode = graph.nodesMap.get(Util.pickRandom(graph.nodesMap));
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
        let randomTab = Util.pickRandom(Object.values(identifiersObj));
        let sqlQuery = `SELECT * FROM ${randomTab}`;
        cNode.setParam({
            "sqlQueryStr": sqlQuery,
            "identifiers": identifiersObj,
            "identifiersOrder": identifiersOrder,
            "dropAsYouGo": this._getRandomLiteral(ColumnType.boolean)
        });
        cNode.setIdentifiers(new Map(Object.entries(identifiersObj)));

        // Executing this node to get schema for its children
        await graph.execute();
        this.log(`SQL node added in WKBK ${this.currentWKBKId}`);
        return this;
    }

    // Out nodes
    private async addLinkOutNode() {
        this.log(`Adding Link Out node.. in WKBK ${this.currentWKBKId}`);
        let cNode, allCols;
        [cNode, allCols] = this.addNode({type:DagNodeType.DFOut});
        if (cNode == undefined) {
            this.log("There is only out node in current tab. Skip add out node");
            return this;
        }
        let linkOutName = Util.randName("Linkout_" + Date.now());
        cNode.setParam({
            "name": linkOutName,
            "linkAfterExecution": this._getRandomLiteral(ColumnType.boolean)
        });
        this.log(`Link Out node added in WKBK ${this.currentWKBKId}`);
        return this;
    }

    // remove all the link out nodes in the current tab
    private async _pruneLinkOutNodes() {
        let graph: DagGraph = this.currentTab.getGraph();
        let outNodeIds = [];
        graph.nodesMap.forEach((node) => {
            if (node.type == DagNodeType.DFOut) {
                outNodeIds.push(node.getId());
            }
        })
        if (outNodeIds.length != 0) {
            await this.dagViewManager.dagViewMap.get(this.currentTab.getId()).removeNodes(outNodeIds);
        }
    }


    // Optimized Out nodes
    private async addOptimizedLinkOutNode() {
        this.log(`Adding Optimized Link Out node.. in WKBK ${this.currentWKBKId}`);
        this.log(`Prunning other link out nodes.. in WKBK ${this.currentWKBKId}`);
        // This is necessary because:
        // 1) Optimized dataflow cannot have multiple link out nodes
        // 2) You can't have normal link out nodes cause it will fail the execute
        await this._pruneLinkOutNodes();
        this.log(`Done prunning other link out nodes.. in WKBK ${this.currentWKBKId}.`);
        let cNode, allCols;
        [cNode, allCols] = this.addNode({type:DagNodeType.DFOut, subType:"link out Optimized"});
        if (cNode == undefined) {
            this.log("There is only out node in current tab. Skip add optimized out node");
            return this;
        }
        let linkOutName = Util.randName("OptimizedLinkout_" + Date.now());
        let columns = allCols.getLineage().getColumns().map((progCol) => {
            return {
                "sourceName": progCol.backName,
                "destName": progCol.backName,
            }
        });
        cNode.setParam({
            "name": linkOutName,
            "linkAfterExecution": this._getRandomLiteral(ColumnType.boolean),
            "columns": columns
        });
        this.log(`Optimized Link Out node added in WKBK ${this.currentWKBKId}`);
        this.optimizedDF = true;
        return this;
    }

    // returns Array of (linkoutNode, dataflow) tuples
    private getAllDfLinks() {
        let dfLinks = [];
        let tabs = this.dagTabManager.getTabs();
        for(let tab of tabs) {
            let linkOutNodes = tab.getGraph().getNodesByType(DagNodeType.DFOut);
            if (linkOutNodes.length == 0) {
                continue;
            }
            for(let linkOutNode of linkOutNodes) {
                dfLinks.push([linkOutNode, tab]);
            }
        }
        return dfLinks;
    }

    private _getRandomString(len: number) {
        if(len == undefined) {
            len = Math.floor(30 * Util.random()) + 1;
        }
        let allPossibleChars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        return [...Array(len).keys()].map(() => allPossibleChars.charAt(Math.floor(allPossibleChars.length*Util.random()))).join('');
    }

    private _getRandomLiteral(type: string) {
        let toss;
        if (type == undefined) {
            toss = Util.pickRandom([0, 1, 2, 3]);
        }
        // Boolean type
        if (type === ColumnType.boolean || toss === 0) {
            return Util.pickRandom([true, false]);
        } else if (type === ColumnType.string || toss === 1) {//string type
            return `"${this._getRandomString()}"`;
        } else if (type === ColumnType.integer || toss === 2) { //random  int
            return Math.floor(1000 * Util.random());
        } else { // Defaulting to float
            return 1000 * Util.random();
        }
    }

    private _getAllXDFsAsArray() {
        this.xdfsArr = [];
        let allXDFs = XDFManager.Instance.getOperatorsMap();
        let xdfCats = Object.keys(allXDFs);
        xdfCats.forEach((cat) => {
            // Ignore Aggregate functions
            if(FunctionCategoryTStr[cat] === 'Aggregate functions') {
                return;
            }
            var funcsByCat = Object.keys(allXDFs[cat]);
            funcsByCat.forEach((funcName) => {
                if (funcName === 'explodeString') {
                    return;
                }
                if (FunctionCategoryTStr[cat] === 'User-defined functions') {
                    let udfFunc = allXDFs[cat][funcName];
                    udfFunc = udfFunc.split('/').pop();
                    this.xdfsArr.push(udfFunc);
                } else {
                    this.xdfsArr.push(allXDFs[cat][funcName]);
                }
            });
        });
    }

    // builds a random nested eval string by ignoring the type information of input
    private _buildEvalStr(columnsObj: Object[]) {
        if(this.xdfsArr === undefined || this.xdfsArr.length == 0) {
            this._getAllXDFsAsArray();
        }
        let columnNames = columnsObj.map((colInfo) => { return colInfo.backName});
        let evalString = Util.pickRandom(columnNames);
        let nestedDepth = Math.floor(5 * Util.random()) + 1;
        while (nestedDepth > 0) {
            //select a xdf
            let xdf = Util.pickRandom(this.xdfsArr);
            // use precomputed evalString
            let xdfArgs = [evalString];
            let numArgs = xdf.argDescs.length;
            let idx = 1;
            while (idx < numArgs) {
                let toss = Util.pickRandom([true, true, false]);
                // picks either literal or column; more weightage for columns.
                if(toss) {
                    xdfArgs.push(Util.pickRandom(columnNames));
                } else {
                    xdfArgs.push(this._getRandomLiteral());
                }
                idx++;
            }
            // check if xdf has any arguments, if not concatinate with previous eval string
            if (numArgs > 0) {
                evalString = `${xdf.fnName}(${xdfArgs.join(', ')})`;
            } else {
                evalString = `concat(${xdf.fnName}(), string(${evalString}))`;
            }
            nestedDepth--;
        }
        return evalString;
    }

    private addNode(nodeInfo: string){
        let graph = this.currentTab.getGraph();
        if (this._onlyOutNode(graph)) {
            return [undefined, undefined];
        }
        let pNode;
        if (this.mode == undefined ||
                this.mode === "random") {
            do {
                pNode = graph.nodesMap.get(Util.pickRandom(graph.nodesMap));
            } while (pNode.type === DagNodeType.DFOut);
        } else {
            pNode = graph.getSortedNodes().slice(-1)[0];
        }
        xcAssert(pNode != undefined);
        let cNode = this.dagViewManager.newNode(nodeInfo);
        graph.connect(pNode.id, cNode.id);
        return [cNode, pNode.getLineage().getColumns()];
    }

    private async runDF() {
        this.log(`Running dataflow ${this.currentTab.getName()} in WKBK ${this.currentWKBKId}`);
        if (!this.optimizedDF) {
            await this.currentTab.getGraph().execute();
        } else {
            await this.currentTab.getGraph().execute(null, true);
            // delete the DagTabOptimized tab
            this.dagTabManager.removeTab(this.dagViewManager.activeDagTab.getId());
            this.dagTabManager.switchTab(this.currentTab.getId());
            this.optimizedDF = false;
        }
        this.log(`Done running dataflow ${this.currentTab.getName()} in WKBK ${this.currentWKBKId}`);
    }

    // Prunes the nodes in error/not configured state in all the tabs
    private async pruneNodes() {
        this.log(`Prunning errored nodes.. in WKBK ${this.currentWKBKId}`);
        let tabs = this.dagTabManager.getTabs();
        for(let tab of tabs) {
            this.currentTab = tab;
            this.dagTabManager.switchTab(tab.getId());
            // collect all nodes in error/
            let errorNodes = tab.getGraph().filterNode((node, _) => {
                if(node.state === "Configured" || node.state === "Complete") {
                    return false;
                }
                return true;
            });
            if(errorNodes.length == 0) {
                continue;
            }
            let nodeToPrune = new Set(errorNodes);
            // get all nodes children to remove
            for(let node of errorNodes) {
                var childSet = tab.getGraph().traverseGetChildren(node);
                nodeToPrune = new Set([...nodeToPrune, ...childSet]);
            }
            let errorNodesIds = [...nodeToPrune].map((node) => node.getId());
            await this.dagViewManager.dagViewMap.get(tab.getId()).removeNodes(errorNodesIds);
        }
        this.log(`Done prunning nodes in WKBK ${this.currentWKBKId}`);
        return this;
    }

    // gets custom nodes information from kv store
    private async getCustomNodesInfo() {
        let customNodeKeys = await KVStore.list(`${userIdName}-gUserCustomOp-1/.+`, gKVScope.GLOB);
        customNodeKeys = Object.values(customNodeKeys.keys);
        let customNodeInfo =  await Promise.all(customNodeKeys.map(async (key) => {
            const nodeInfo = await (new KVStore(key, 1)).get();
            const json = JSON.parse(nodeInfo).node;
            delete json['id'];
            return json;
        }));
        return customNodeInfo;
    }

    private async createCustomNodesFromDF() {
        this.log(`Creating custom node from dataflow.. in WKBK ${this.currentWKBKId}`);
        let nodeIds = Array.from(this.currentTab.getGraph().getAllNodes().keys());
        let randN = Math.floor(nodeIds.length * Util.random()) + 1;
        let randomNodeIds = Util.pickRandom(nodeIds, randN);
        if (randN == 1) {
            randomNodeIds = [randomNodeIds];
        }
        await this.dagViewManager.wrapCustomOperator(randomNodeIds);
        this.log(`Custom node from dataflow created  in WKBK ${this.currentWKBKId}`);
        return this;
    }

    // creates a new dataflow tab, builds a dataflow and
    // then converts to a custom node and shares it.
    // This will create customNode in controlled fashion.
    private async createCustomNode() {
        this.log(`Creating custom node.. in WKBK ${this.currentWKBKId}`);
        let currentTabId = this.currentTab.getId();
        let newTabId = this.dagTabManager.newTab();
        this.currentTab = this.dagTabManager.getTabById(newTabId);
        this.mode = "linear";

        //build dataflow
        let nodesCount = Math.floor(5 * Util.random());
        let idx = 1;
        let ignoreActions = new Set(["createTab", "addLinkInNode", "addTableLinkInNode", "createSQLFunc",
                        "addLinkOutNode", "addOptimizedLinkOutNode", "getTab", "createCustomNode",
                        "addDatasetNode", "addCustomNode", "addSQLNode"]);
        let randomAction = this.addDatasetNode;
        await randomAction.call(this);
        while (idx < nodesCount) {
            randomAction = Util.pickRandom(this.availableActions);
            if (ignoreActions.has(randomAction.name)) {
                continue;
            }
            await randomAction.call(this);
            idx++;
        }
        // convert to custom node
        let nodeIds = Array.from(DagTabManager.Instance._activeTab.getGraph().getAllNodes().keys());
        await this.dagViewManager.wrapCustomOperator(nodeIds);

        // share
        let customNodeId = this.currentTab.getGraph().getAllNodes().keys().next().value;
        this.dagViewManager.shareCustomOperator(customNodeId);

        //restore
        this.mode = "random";
        this.dagTabManager.switchTab(currentTabId);
        DagList.Instance.deleteDataflow(newTabId);
        this.currentTab = this.dagTabManager.getTabById(currentTabId);
        this.log(`Custom node created and shared in WKBK ${this.currentWKBKId}`);
        return this;
    }

   private async createSQLFunc() {
       let currentTabId = this.currentTab.getId();
       let newTabId = this.dagTabManager.newSQLFunc();
       this.currentTab = this.dagTabManager.getTabById(newTabId);
       this.mode = "linear"

       let tableLoaded = await PTblManager.Instance._listTables();
       let table = Util.pickRandom(tableLoaded);

       try {
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
            let nodesCount = Math.floor(5*Util.random());
            let count = 1;
            let ignoreActions = new Set(["createTab", "addLinkInNode", "addTableLinkInNode", "addCustomNode",
                                    "addLinkOutNode", "addOptimizedLinkOutNode", "getTab", "createCustomNodes",
                                    "addDatasetNode", "createSQLFunc", "addSQLNode"]);
            while (count < nodesCount) {
                let randomAction = Util.pickRandom(this.availableActions);
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

            await this.currentTab.save();
            this.dagViewManager.autoAlign(newTabId);
        } catch (error) {
            throw error;
        } finally {
            this.dagTabManager.removeTab(newTabId);
            // restore
            this.mode = "random";
            this.dagTabManager.switchTab(currentTabId);
            this.currentTab = this.dagTabManager.getTabById(currentTabId);
            return this;
        }
    }

    // Checks to see if average nodes per dataflow exceeded constant maxAvgNumOfNodesPerTab
    // If true, will create another dataflow.
    private _checkToCreateTab() {
        let tabs = this.dagTabManager.getTabs();
        if (tabs.length == 0) {
            return true;
        }
        let numOfNodes = 0;
        for (let tab of tabs) {
            numOfNodes += tab.getGraph().getAllNodes().size;
        }
        let avgNodesPerTab = numOfNodes/tabs.length;
        if (avgNodesPerTab > this.maxAvgNumOfNodesPerTab) {
            return true;
        }
        return false;
    }

    // Check to see if there is only "Out" node in the tab
    // If so, we can't add more nodes other than data source to this tab
    private _onlyOutNode(graph) {
        graph.nodesMap.forEach((node)=>{
            if(node.maxChildren != 0) {
                return false;
            }
        })
        return true;
    }

    // Check if the dataflow execution error is a "valid" error
    private _validDFExecuteError(error) {
        let errorMsg;
        if (error && error.hasError && error.type) {
            errorMsg = error.type;
        } else if (error && error.error) {
            errorMsg = error.error;
        } else {
            errorMsg = error;
        }
        return AdvancedModeState.dfExecWhiteList.has(errorMsg);
    }

    public async takeOneAction() {
        try {
            await XVM.setMode(this.mode);
        } catch (error) {
            console.log(`Error switching mode to ${this.mode}`);
            throw error
        }
        let randomAction = Util.pickRandom(this.availableActions);
        let newState = this;
        try {
                newState = await randomAction.call(this);
        } catch (error) {
            // XXX: Ignoring all errors. Might want to rethrow some errors;
            this.log(`Exec Action Error: `);
            this.logError(error);
        }
        await this.currentTab.save();
        try {
            this.dagViewManager.autoAlign(this.currentTab.getId());
        } catch (error) {
            // It's ok to ignore the autoAlign render error
            this.log(`Dag View Render Error:`);
            this.logError(error);
        }
        try {
            await this.runDF();
        } catch (error) {
            // XXX: Ignoring all errors. Might want to rethrow some errors;
            this.log(`Run DF Error`);
            if (error && error.node) {
                delete error.node;
            }
            this.logError(error);
            // XXX added back by https://gerrit.int.xcalar.com/#/c/17864/9/assets/dev/funcTests/states/AdvancedModeState.ts
            // please remove if this is wrong
            if (! this._validDFExecuteError(error)) {
                throw error;
            }
        }
        this.run++;
        return newState;
    }
}

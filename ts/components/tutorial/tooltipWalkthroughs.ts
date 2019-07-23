namespace TooltipWalkthroughs {
    let seenSQL = false;
    let seenDataflow = false;
    let SQLModeName = "SQL Mode";
    let ADVModeName = "Dataflow Mode";
    let WorkbookTutorialName = "Tutorial Workbook Walkthrough";
    let storedWorkbookWalkthrough: {info: WalkthroughInfo, walkthrough: TooltipInfo[], options: any};
    let tempName = "Temporary Walkthrough";
    let storedTempWalkthrough: {info: WalkthroughInfo, walkthrough: TooltipInfo[], options: any};

    // TODO: Add flight tests for whenever this file has added walkthroughs.

    function readWalkthrough(file: File) {
        if (file == null) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<any> = PromiseHelper.deferred(); //string or array buffer
        const reader: FileReader = new FileReader();

        reader.onload = function(event: any) {
            deferred.resolve(event.target.result);
        };

        reader.onloadend = function(event: any) {
            const error: DOMException = event.target.error;
            if (error != null) {
                deferred.reject(error);
            }
        };

        reader.readAsBinaryString(file);

        return deferred.promise();
    }

    function processWalkthrough(e: Event) {
        let file = (<HTMLInputElement>e.target).files[0];
        readWalkthrough(file)
        .then((res) => {
            try {
                storedTempWalkthrough = JSON.parse(res);
            } catch (err) {
                console.log(err);
                return;
            }
            TooltipManager.start(storedTempWalkthrough.info,
                storedTempWalkthrough.walkthrough,
                0,
                storedTempWalkthrough.options
            );
        })
    }

    function storeTooltipObj(): JQueryPromise<void> {
        let tooltipObj: TooltipStoredInfo = {
            seenDataflow: seenDataflow,
            seenSQL: seenSQL
        }
        const key: string = KVStore.getKey("gUserTooltipKey");
        const kvStore: KVStore = new KVStore(key, gKVScope.USER);
        return kvStore.put(JSON.stringify(tooltipObj), true);
    }

    /**
     * To be called exclusively with chrome dev console, allows a user to upload
     * a temporary tooltip walkthrough
     */
    export function uploadWalkthrough() {
        let fileInput: HTMLInputElement = document.createElement('input');
        fileInput.addEventListener("change", processWalkthrough, false);
        fileInput.type = 'file';
        fileInput.click();
        fileInput.remove();
    }

    /**
     * Saves the current temporary walkthrough into the kvstore.
     */
    export function storeTemporaryWalkthrough() {
        if (!storedTempWalkthrough) {
            return;
        }
        let walkthroughKey: string = KVStore.getKey("gStoredWalkthroughKey");
        let _walkthroughKVStore: KVStore = new KVStore(walkthroughKey, gKVScope.WKBK);
        return _walkthroughKVStore.put(JSON.stringify(storedTempWalkthrough), true);
    }

    export function setWorkbookWalkthrough(walkthrough) {
        storedWorkbookWalkthrough = walkthrough;
    }

    export function newUserPopup(): void {
        TooltipManager.start({
                tooltipTitle: DemoTStr.title,
                background: false,
                startScreen: TooltipStartScreen.Workbooks,
                isSingleTooltip: true
            },
            [{
                highlight_div: "#workbookPanel .tutBox",
                interact_div: "#workbookPanel .tutBox",
                text: "If this is your first time using Xcalar design, the above panel contains many resources to help get you started.",
                type: TooltipType.Click
            }],
            0,
            {
                closeOnModalClick: true,
                includeNumbering: false
            }
        );
    }

    export function emergencyPopup(): void {
        TooltipManager.start({
            tooltipTitle: "Warning",
            background: false,
            startScreen: null,
            isSingleTooltip: true
        },
        [{
            highlight_div: "#homeBtn",
            interact_div: "#homeBtn",
            text: "Something has gone wrong while executing this tooltip walkthrough. Please try again later.",
            type: TooltipType.Click
        }],
        0,
        {
            closeOnModalClick: true,
            includeNumbering: false
        }
        );
    }


    export function SQLModeWalkthrough(): void {
        // NOTE: If this is changed, please change the associated unit test
        TooltipManager.start({
                tooltipTitle: "SQL Mode",
                background: true,
                startScreen: TooltipStartScreen.SQLWorkspace
            },
            [{
                highlight_div: "#homeBtn",
                text: "Welcome to Xcalar Design. This tooltip walkthrough will familiarize " +
                "you with some of the UI for Xcalar Design's SQL Mode.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#menuBar",
                text: "The side bar enables you to access to various features within Xcalar Design.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dataStoresTab",
                text: "The Sources icon enables you to create connectors, and import data as a dataset or table.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#sqlTab",
                text: "The SQL Workspace icon enables you to apply SQL to manipulate your data and create data models.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#monitorTab",
                text: "The System icon provides tools for monitoring, managing, and troubleshooting the Xcalar cluster.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dataStoresTab",
                interact_div: "#dataStoresTab .mainTab",
                text: "Let's get started with importing a table. Click the Sources icon to open it.",
                type: TooltipType.Click
            },
            {
                highlight_div: "#sourceTblButton",
                interact_div: "#sourceTblButton",
                text: "Click the Tables icon to manage and create new tables.",
                type: TooltipType.Click
            },
            {
                highlight_div: "#dsForm-path .cardMain",
                text: "This panel enables you to locate your data.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dsForm-target",
                text: "Choose a connector to access your data. Connectors must be created before data can be imported from them.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#filePath",
                text: "Enter the path to your data source for the selected connector.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dsForm-path .cardMain .browse",
                text: "This button enables you to locate your data source for the associated connector.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dsForm-path .btn-submit",
                text: "This button enables you to preview the data source.",
                type: TooltipType.Text,
            },
            {
                highlight_div: "#dsForm-path",
                text: "After importing, your data will be previewable within this panel." +
                " It can then be queried within the SQL Workspace.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#sqlWorkSpace",
                interact_div: "#sqlWorkSpace",
                text: "Click the SQL Workspace icon to start working in SQL.",
                type: TooltipType.Click,
            },
            {
                highlight_div: "#sqlEditorSpace",
                text: "The SQL Editor is where you can write, modify, and execute SQL Query Statements.",
                type: TooltipType.Text,
            },
            {
                highlight_div: "#sqlTableListerArea",
                text: "The Preview section enables you to view information about your tables and results.",
                type: TooltipType.Text,
            },
            {
                highlight_div: "#sqlWorkSpacePanel .historySection",
                text: "The History section provides detail about past SQL executions.",
                type: TooltipType.Text,
            },
            {
                highlight_div: "#bottomMenuBarTabs",
                interact_div: "#bottomMenuBarTabs #helpMenuTab.sliderBtn",
                text: "Click the Help icon to get help and support.",
                type: TooltipType.Click
            },
            {
                highlight_div: "#tutorialResource",
                text: " This concludes the tour of the Dataflow Mode UI. " +
                "To get more hands-on, you can view the tutorial workbooks.",
                type: TooltipType.Text
            }],
            0,
            {
                closeOnModalClick: true,
                includeNumbering: true
            }
        );
    }

    export function AdvModeWalkthrough(): void {
        // NOTE: If this is changed, please change the associated unit test
        TooltipManager.start({
                tooltipTitle: "Dataflow Mode",
                background: true,
                startScreen: TooltipStartScreen.ADVModeDataflow
            },
            [{
                highlight_div: "#modeArea",
                text: "Welcome to Dataflow Mode. This user interface enables" +
                    " you to analyze your data and troubleshoot your queries " +
                    " by providing a powerful visual design framework.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#tabButton",
                interact_div: "#tabButton",
                text: "Click the new dataflow icon to create a new dataflow at any time.",
                type: TooltipType.Click
            },
            {
                highlight_div: "#dataflowMenu",
                text: "The Dataflows panel is a visual directory structure for storing and managing your dataflows.",
                type: TooltipType.Text
            },
            {
                highlight_div: ".dataflowMainArea",
                text: "The dataflow canvas is where you create and connect nodes to create dataflows.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dagView .categoryBar",
                text: "The dataflow mode toolbar displays the categories of available operator nodes.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dagView .operatorBar",
                text: "Each category displays the operator nodes you'll use to build dataflows.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dagView .operatorBar",
                text: "Drag and drop nodes from here to the dataflow canvas to create a dataflow." +
                " Nodes can be connected together by dragging node anchors to other nodes.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dagView .operatorWrap .active .operator",
                interact_div: "#dagView .operatorWrap .active .operator .main",
                text: "Double-click this node to add it into the canvas.",
                type: TooltipType.DoubleClick
            },
            {
                highlight_div: "#dagView",
                text: "Practice creating a dataflow by adding nodes into the canvas and connecting them. " +
                "Click the arrow when you're ready to continue.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dagView",
                text: "Clicking a node displays a menu of actions. " +
                "Select 'Configure' to open a configuration panel on the left of the canvas.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#bottomMenuBarTabs",
                interact_div: "#bottomMenuBarTabs #helpMenuTab.sliderBtn",
                text: "Click the Help icon to get help and support.",
                type: TooltipType.Click
            }
            ,
            {
                highlight_div: "#tutorialResource",
                text: " This concludes the tour of the Dataflow Mode UI. " +
                "To get more hands-on, you can view the tutorial workbooks.",
                type: TooltipType.Text
            }],
            0,
            {
                closeOnModalClick: true,
                includeNumbering: true
            }
        );
    }

    /**
     * Returns a list of available walkthroughs in {name, description} objects.
     */
    export function getAvailableWalkthroughs(): {name: string, description: string}[] {
        // XXX TODO: Integrate with tutorial workbooks
        let builtInWalkthroughs = [{
            name: SQLModeName,
            description: "Tour of the SQL Mode UI"
        }, {
            name: ADVModeName,
            description: "Tour of the Dataflow Mode UI"
        }];
        if (storedTempWalkthrough) {
            builtInWalkthroughs.push({
                name: storedTempWalkthrough.info.tooltipTitle,
                description: storedTempWalkthrough.info.description || "Temporary Test Walkthrough"
            });
        }
        if (storedWorkbookWalkthrough) {
            builtInWalkthroughs.push({
                name: storedWorkbookWalkthrough.info.tooltipTitle,
                description: storedWorkbookWalkthrough.info.description
            });
        }
        return builtInWalkthroughs;
    }

    /**
     * Given a walkthrough name, starts the corresponding walkthrough.
     * @param name
     */
    export function startWalkthrough(name: string): string {
        if (WorkbookPanel.isWBMode()) {
            if (WorkbookManager.getActiveWKBK() != null) {
                // if we're in a workbook, but on the workbook screen, we just go back to it
                $("#homeBtn").click();
            } else {
                // If we aren't in a workbook, we need to open one.
                return TooltipTStr.TooltipNoWorkbook;
            }
        }
        switch(name) {
            case (SQLModeName):
                SQLModeWalkthrough();
                break;
            case (ADVModeName):
                AdvModeWalkthrough();
                break;
            default:
                if (storedWorkbookWalkthrough && storedWorkbookWalkthrough.info.tooltipTitle == name) {
                    TooltipManager.start(storedWorkbookWalkthrough.info,
                        storedWorkbookWalkthrough.walkthrough,
                        0,
                        storedWorkbookWalkthrough.options
                    );
                } else if (storedTempWalkthrough && storedTempWalkthrough.info.tooltipTitle == name) {
                    TooltipManager.start(storedTempWalkthrough.info,
                        storedTempWalkthrough.walkthrough,
                        0,
                        storedTempWalkthrough.options
                    );
                }
                break;
        }
        return "";
    }

    /**
     * Sets up to see if any tooltip walkthroughs need to be automatically started
     */
    export function setupInitialWalkthroughCheck(): JQueryPromise<void> {
        if (typeof window !== 'undefined' && window['unitTestMode']) {
            seenSQL = true;
            seenDataflow = true;
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const key: string = KVStore.getKey("gUserTooltipKey");
        const kvStore: KVStore = new KVStore(key, gKVScope.USER);
        kvStore.getAndParse()
        .then((tooltipObj) => {
            if (tooltipObj != null) {
                seenSQL = tooltipObj.seenSQL;
                seenDataflow = tooltipObj.seenDataflow;
            }
        })
        .always(deferred.resolve);

        return deferred.promise();
    }

    /**
     * Checks if any tooltip walkthroughs need to be started automatically,
     * if so, starts them.
     */
    export function checkFirstTimeTooltip(): JQueryPromise<void> {
        if (XVM.isSQLMode() && !seenSQL) {
            seenSQL = true;
            TooltipWalkthroughs.startWalkthrough(SQLModeName);
            return storeTooltipObj();
        } else if (!seenDataflow) {
            seenDataflow = true;
            TooltipWalkthroughs.startWalkthrough(ADVModeName)
            return storeTooltipObj();
        } else {
            return PromiseHelper.resolve();
        }
    }

    export function setSeenSQL(flag: boolean) {
        seenSQL = flag;
    }

    export function setSeenDataflow(flag: boolean) {
        seenDataflow = flag;
    }
}
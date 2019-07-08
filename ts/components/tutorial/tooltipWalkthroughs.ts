namespace TooltipWalkthroughs {

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
                highlight_div: "#menuBar",
                text: "The menu bar enables access to various features within Xcalar Design.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dataStoresTab",
                text: "This icon enables you to import data, create tables, and create data targets.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#sqlTab",
                text: "SQL query statements can be created and executed within the SQL workspace.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#monitorTab",
                text: "The monitor tab provides various tools for monitoring Xcalar, managing files, and changing settings.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dataStoresTab",
                interact_div: "#dataStoresTab .mainTab",
                text: "Let's get started with importing a table. Click this icon to open it.",
                type: TooltipType.Click
            },
            {
                highlight_div: "#sourceTblButton",
                interact_div: "#sourceTblButton",
                text: "To create a new table, click this Tables icon.",
                type: TooltipType.Click
            },
            {
                highlight_div: "#dsForm-path .cardMain",
                text: "This panel enables you to locate your data.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dsForm-target",
                text: "The data target is the storage location of your data.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#filePath",
                text: "The file path is the path to your data source, in relation to the target. ",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dsForm-path .cardMain .browse",
                text: "Clicking this browse button allows you to browse the location at the file path for your file(s).",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dsForm-path .btn-submit",
                text: "To load the dataset at the path, click this button.",
                type: TooltipType.Text,
            },
            {
                highlight_div: "#sqlWorkSpace",
                interact_div: "#sqlWorkSpace",
                text: "Let's go back to the SQL Workspace. Click this button to go there instantly.",
                type: TooltipType.Click,
            },
            {
                highlight_div: "#sqlEditorSpace",
                text: "The SQL Editor Space is where you can write, store, and modify SQL Query Statements.",
                type: TooltipType.Text,
            },
            {
                highlight_div: "#sqlTableListerArea",
                text: "This area provides information on available tables and result sets.",
                type: TooltipType.Text,
            },
            {
                highlight_div: "#sqlWorkSpacePanel .historySection",
                text: "This area displays the execution history of your SQL statements.",
                type: TooltipType.Text,
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
                text: "Welcome to Dataflow Mode. This user interface provides" +
                    " you with a powerful visual design framework to analyze your" +
                    " data, and augments SQL Mode by providing features and fuctions" +
                    " for monitoring and troubleshooting your queries.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#tabButton",
                interact_div: "#tabButton",
                text: "The basis of Dataflow Mode is a dataflow. Click this button to create a new dataflow at any time. " +
                    "Depending on context, this panel may change to display node information or its configure panel.",
                type: TooltipType.Click
            },
            {
                highlight_div: "#dataflowMenu",
                text: "The Dataflows panel is a visual directory structure for storing and managing your dataflows.",
                type: TooltipType.Text
            },
            {
                highlight_div: ".dataflowMainArea",
                text: "This is the dataflow canvas. Dataflow nodes can be connected in this area to create an executable dataflow.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dagView .categoryBar",
                text: "This is the category bar for selecting various types of nodes.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dagView .operatorBar",
                text: "The Dataflow Mode toolbar is where you can find the operator nodes you'll use to build dataflows.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dagView .operatorBar",
                text: "Nodes can be dragged and dropped from this bar into the dataflow canvas. Nodes can be connected to eachother " +
                    "by dragging from a node's input or output anchor to any part of another node.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dagView .operatorWrap .active .operator",
                interact_div: "#dagView .operatorWrap .active .operator .main",
                text: "Double clicking can also bring a node into the canvas.",
                type: TooltipType.DoubleClick
            },
            {
                highlight_div: "#dagView",
                text: "Try creating and connecting nodes now. Click the arrow when you're ready to continue.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dagView",
                text: "Once a node is in the canvas, it can be configured by clicking on it and selecting 'configure' from the menu.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dagViewBar",
                text: "The left buttons allow you to undo, redo, zoom, execute, and stop execution of the current dataflow. " +
                "The right buttons allow you to create parameters, manage aggregates, and manage dataflow settings.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#bottomMenuBarTabs",
                interact_div: "#bottomMenuBarTabs #helpMenuTab.sliderBtn",
                text: "Click the ? icon to open up the help and support panel.",
                type: TooltipType.Click
            }
            ,
            {
                highlight_div: "#tutorialResource",
                text: " This concludes the tour of the Dataflow Mode UI. Tutorial Workbooks provide a wealth of information on how to use Xcalar Design efficiently and effectively.",
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
}
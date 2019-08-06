const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class RecreateNodes extends EventEmitter {
    command(nodeInfos, dfId, dfIdMapping, cb) {
        const self = this;
        const commandResult = { IMDNames: [], nodeElemIDs: [], nodeIDs: [], nodeTypes: [] };
        let customOutputMap = new Map();
        let customNodesMap = new Map();

        // first we have to "unwrap" any custom nodes.
        let trueNodeInfos = [];
        let operationCount = 0;
        nodeInfos.forEach((nodeInfo, i) => {
            if (nodeInfo.type === 'custom') {
                let subNodes = nodeInfo.subGraph.nodes;
                let inPortIds = nodeInfo.inPorts.map((inport) => {
                    return inport.parentId;
                });
                let startingOpCount = operationCount;
                for(let si = 0; si < subNodes.length; si++) {
                    let subNode = subNodes[si];
                    for(let sp = 0; sp < subNode.parents.length; sp++) {
                        let inputIndex = inPortIds.findIndex((id) => { return (id == subNode.parents[sp])});
                        if (inputIndex != -1) {
                            subNode.parents[sp] = nodeInfo.parents[inputIndex];
                        }
                    }
                    if (subNode.type == "customOutput") {
                        customOutputMap.set(nodeInfo.nodeId, subNode.parents[0]);
                    }
                    subNode.display.x = nodeInfo.display.x + 120*si;
                    subNode.display.y = nodeInfo.display.y;
                    if (subNode.type != "customOutput" && subNode.type != "customInput") {
                        trueNodeInfos.push(subNode);
                        operationCount++;
                    }
                }
                // This tells us later where to split to select nodes
                customNodesMap.set(nodeInfo.nodeId, [startingOpCount, operationCount]);
            } else {
                trueNodeInfos.push(nodeInfo);
                operationCount++;
            }
        });

        nodeInfos = trueNodeInfos;

        nodeInfos.forEach((nodeInfo, i) => {
            // Get node information in category bar
            let nodeCategoryClass = '';
            let nodeCategorySelector = '';
            this.api.execute(execFunctions.getNodeFromCategoryBar, [nodeInfo], ({value}) => {
                nodeCategoryClass = value.categoryClass;
                nodeCategorySelector = value.nodeSelector;
            });

            for(let np = 0; np < nodeInfo.parents.length; np++) {
                // Connect to correct parent if parent was previously a custom node
                let customParent = customOutputMap.get(nodeInfo.parents[np]);
                if (customParent) {
                    nodeInfo.parents[np] = customParent;
                }
            }

            // Drag&Drop to create node
            this.api.perform(() => {
                // Select the operation category
                this.api
                    .moveToElement(".category." + nodeCategoryClass, 1, 1)
                    .mouseButtonDown("left");
                // Create the node
                this.api.newNode(
                    nodeCategorySelector + ' .main',
                    nodeInfo.display.x, nodeInfo.display.y,
                    ({ELEMENT, nodeId}) => {
                        commandResult.nodeElemIDs.push(ELEMENT);
                        commandResult.nodeIDs.push(nodeId);
                        commandResult.nodeTypes.push(nodeInfo.type);
                    }
                );
            });

            // Recover connections
            this.api.perform(() => {
                const childId = commandResult.nodeIDs[i];
                nodeInfo.parents.forEach((parentId, j) => {
                    if (parentId) {
                        const parentIndex = nodeInfos.findIndex((nodeInfo) => (nodeInfo.nodeId === parentId));
                        let connectorIndex = j + 1;
                        if (nodeInfo.type === "sql" || nodeInfo.type === "set") {
                            connectorIndex = 1;
                        }
                        if (nodeInfo.type !== "dataset") {
                            this.api
                            .execute(execFunctions.scrollIntoView, ['.dataflowArea.active .operator[data-id="' + commandResult.nodeIDs[parentIndex] + '"]'], () => {})
                            .execute(execFunctions.scrollIntoView, [".dataflowArea.active .operator:nth-child(" + (i + 1) + ")"], () => {})
                            .moveToElement(".dataflowArea.active .operator:nth-child(" + (i + 1) + ") .connIn:nth-child(" + connectorIndex + ") .connector.in", 2, 2)
                            .mouseButtonDown("left")
                            // .saveScreenshot("nwscreenshot1.png")
                            .moveTo(commandResult.nodeElemIDs[parentIndex], 20, 10)
                            // .saveScreenshot("nwscreenshot2.png")
                            .mouseButtonUp("left")
                            // .saveScreenshot("nwscreenshot3.png")

                            // If it's connecting to a sort, an alert popup ios going to show up
                            // It needs to be closed.
                            if (commandResult.nodeTypes[parentIndex] == "sort") {
                                    this.api
                                    .waitForElementVisible("#alertModal", 2000)
                                    .click("#alertActions .confirm")
                                    .waitForElementNotVisible("#alertModal", 5000)
                                    .pause(1000) // wait for the alert to close fully
                                    .waitForElementPresent('.dataflowArea.active .edgeSvg .edge'
                                        + `[data-childnodeid="${childId}"]`
                                        + `[data-parentnodeid="${commandResult.nodeIDs[parentIndex]}"]`
                                        + `[data-connectorindex="${j}"]`,
                                        10);
                            } else {
                                this.api
                                    .waitForElementPresent('.dataflowArea.active .edgeSvg .edge'
                                        + `[data-childnodeid="${childId}"]`
                                        + `[data-parentnodeid="${commandResult.nodeIDs[parentIndex]}"]`
                                        + `[data-connectorindex="${j}"]`,
                                        10);
                            }

                        }
                    }
               });
            })

            // Re-configure the node
            this.api.perform(() => {
                const input = JSON.parse(JSON.stringify(nodeInfo.input));
                const pause = 1;
                // Preprocess the input structure
                if (nodeInfo.type === "dataset") {
                    input.schema = nodeInfo.schema;
                } else if (nodeInfo.type === "link in") {
                    const oldId = input.dataflowId === 'self'
                        ? dfId : input.dataflowId;
                    input.dataflowId = dfIdMapping.has(oldId)
                        ? dfIdMapping.get(oldId) : oldId;
                    input.schema = nodeInfo.schema;
                } else if (nodeInfo.type === "sql") {
                    input.sqlQueryString = input.sqlQueryStr;
                }

                // Config the node via opPanel
                if (nodeInfo.type === "link out") {
                    this.api
                        .openOpPanel(".operator:nth-child(" + (i + 1) + ")")
                        .pause(pause)
                        .setValue("#dfLinkOutPanel .linkOutName .inputWrap input", input.name);
                        if (input.linkAfterExecution) {
                            this.api.waitForElementNotPresent("#formWaitingBG", 3000)
                                .click('#dfLinkOutPanel .argsSection .inputWrap .checkbox.checked');
                        }
                        if (nodeInfo.subType === "link out Optimized") {
                            this.api.waitForElementNotPresent("#formWaitingBG", 3000)
                                .click("#dfLinkOutPanel .selectAllWrap .checkbox");
                        }
                    this.api.click('#dfLinkOutPanel .submit')
                        .waitForElementNotVisible('#dfLinkOutPanel');
                } else if (nodeInfo.type === "publishIMD") {
                    commandResult.IMDNames.push(input.pubTableName);
                    this.api
                        .openOpPanel(".operator:nth-child(" + (i + 1) + ")")
                        .pause(pause)
                        .setValue("#publishIMDOpPanel .IMDNameInput", input.pubTableName)
                        .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4))
                        .executeNode(".operator:nth-child(" + (i + 1) + ")")
                } else if (nodeInfo.type !== "IMDTable" && nodeInfo.type !== "export") {
                    let waitTime;
                    if (nodeInfo.type === "sql") {
                        waitTime = 100000;
                    }
                    this.api
                        .openOpPanel(".operator:nth-child(" + (i + 1) + ")")
                        .pause(pause)
                        .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4), waitTime);
                }
            });

            // Additional actions after configuring the node
            this.api.perform(() => {
                if (nodeInfo.type === 'dataset') {
                    this.api.restoreDataset(".dataflowArea.active .dataset:nth-child(" + (i + 1) + ") .main");
                }
            });
        });

        // Create any applicable custom nodes
        this.api.perform(() => {
            if (customNodesMap.size > 0) {
                customNodesMap.forEach((nodeIndexes) => {
                    let ids = commandResult.nodeIDs.slice(nodeIndexes[0], nodeIndexes[1]);
                    this.api.createCustomNode(ids);
                });
            };
        });

        this.api.perform(() => {
            if (cb != null) {
                cb(commandResult);
            }
        });
        this.emit('complete');

        return this;
    }
}

module.exports = RecreateNodes;
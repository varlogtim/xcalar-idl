const EventEmitter = require('events');
const execFunctions = require('../lib/execFunctions');

class RecreateNodes extends EventEmitter {
    command(nodeInfos, dfId, dfIdMapping, cb) {
        const self = this;
        const commandResult = { IMDNames: [], nodeElemIDs: [], nodeIDs: [] };

        nodeInfos.forEach((nodeInfo, i) => {
            // Get node information in category bar
            let nodeCategoryClass = '';
            let nodeCategorySelector = '';
            this.api.execute(execFunctions.getNodeFromCategoryBar, [nodeInfo], ({value}) => {
                nodeCategoryClass = value.categoryClass;
                nodeCategorySelector = value.nodeSelector;
            });

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
                                .moveToElement(".dataflowArea.active .operator:nth-child(" + (i + 1) + ") .connector.in:nth-child(" + connectorIndex + ")", 2, 2)
                                .mouseButtonDown("left")
                                .moveTo(commandResult.nodeElemIDs[parentIndex], 20, 10)
                                .mouseButtonUp("left")
                                .waitForElementPresent('.dataflowArea.active .edgeSvg .edge'
                                    + `[data-childnodeid="${childId}"]`
                                    + `[data-parentnodeid="${commandResult.nodeIDs[parentIndex]}"]`
                                    + `[data-connectorindex="${j}"]`,
                                    10);
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
                        if (!input.linkAfterExecution) {
                            this.api.click('#dfLinkOutPanel .argsSection .inputWrap .checkbox.checked');
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
                    this.api
                        .openOpPanel(".operator:nth-child(" + (i + 1) + ")")
                        .pause(pause)
                        .submitAdvancedPanel(".opPanel:not(.xc-hidden)", JSON.stringify(input, null, 4));
                }
            });

            // Additional actions after configuring the node
            this.api.perform(() => {
                if (nodeInfo.type === 'dataset') {
                    this.api.restoreDataset(".dataflowArea.active .dataset:nth-child(" + (i + 1) + ") .main");
                }
            });
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
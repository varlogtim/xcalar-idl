class DagStatsDataflowGenerator {

    // Wire in reading a heuristic/setting for how many times we retry

    private static _instance: DagStatsDataflowGenerator;
    public static get Instance() {
        return this._instance || (this._instance = new DagStatsDataflowGenerator());
    }

    public constructor() {
    }

    public generateStatsDataflow() {
        const tabId = DagViewManager.Instance.getActiveDag().getTabId();
        const statsDagTab: DagTabStats = <DagTabStats>DagTabManager.Instance.getTabById(tabId);
        if (!statsDagTab) {
            return;
        }
        let filePath = statsDagTab.getFilePath();
        let nodeJson = this._getStatsDataflow(filePath, statsDagTab.getStats());

        DagStatsPanel.Instance.hide();
        let newTabId = DagTabManager.Instance.newTab();
        let newTab = DagTabManager.Instance.getTabById(newTabId);
        let name = statsDagTab.getName() + " analysis";
        let baseName = name;
        let attempt = 0;
        while (!DagList.Instance.isUniqueName(name) && attempt < 30) {
            attempt++
            name = baseName + " (" + attempt + ")";
        }
        newTab.setName(name);
        DagList.Instance.changeName(name, newTabId);
        $("#dagTabView .dagTab").last().find(".name").text(name);

        DagViewManager.Instance.getActiveDagView().pasteNodes(nodeJson);
        DagNodeMenu.restoreAllDatasets(true)
        .always(() => {
            MainMenu.openPanel("dagPanel");
            DagViewManager.Instance.run()
            .then(() => {
                let sortNodes = DagViewManager.Instance.getActiveDag().getNodesByType(DagNodeType.Sort);
                if (sortNodes && sortNodes.length) {
                    let focusNode = sortNodes.find((sortNode) => {
                        return sortNode.input.input.columns[0].columnName === "node_time_elapsed_millisecs";
                    });
                    if (focusNode) {
                        DagViewManager.Instance.viewResult(focusNode, newTabId);
                    }
                }
            });

        });
    }

    private _getStatsDataflow(filePath, stats) {
        let nodeJson;
        let fakeUser = "xdstats" + Math.round(Math.random() * 100000) + ".";
        let fakeDsName1 = fakeUser + Math.round(Math.random() * 100000) + ".stats";
        let fakeDsName2 = fakeUser + Math.round(Math.random() * 100000) + ".stats";
        let systemStatsSchema = [];
        let nodesSchema = [];
        let systemCrossJoinColumns = [];
        let nodesCrossJoinColumns = [];
        if (stats.system_stats[0]) {
            for (let name in stats.system_stats[0]) {
                let type = this._getType(stats.system_stats[0][name]);
                systemStatsSchema.push({
                    "name": name,
                    "type": type
                });
                if (name === "timestamp") {
                    systemCrossJoinColumns.push("timestamp");
                } else {
                    systemCrossJoinColumns.push("times::" + name);
                }
            }
        }
        if (stats.query_state_output.nodes[0]) {
            for (let name in stats.query_state_output.nodes[0]) {
                let val = stats.query_state_output.nodes[0][name];
                let type = this._getType(val);
                nodesSchema.push({
                    "name": name,
                    "type": type
                });

                if (name === "node_name" || name === "node_start_timestamp_microsecs" || name === "node_end_timestamp_microsecs") {
                    nodesCrossJoinColumns.push(name);
                } else {
                    nodesCrossJoinColumns.push("nodes::" + name);
                }
            }
            nodesCrossJoinColumns.push("nodes::job_id");
            nodesCrossJoinColumns.push("job_start_timestamp_microsecs");
            nodesCrossJoinColumns.push("nodes::skew");

            nodesSchema.push({
                "name": "job_id",
                "type": "string"
            });
            nodesSchema.push({
                "name": "job_start_timestamp_microsecs",
                "type": "integer"
            });
            nodesSchema.push({
                "name": "skew",
                "type": "integer"
            });
        }

        let comments = this._getComments();

        nodeJson = [...comments,
            {
                "type": "dataset",
                "subType": null,
                "display": {
                    "x": 60,
                    "y": 275
                },
                "description": "",
                "input": {
                    "source": fakeDsName1,
                    "prefix": "times",
                    "synthesize": false,
                    "loadArgs": "{\n    \"operation\": \"XcalarApiBulkLoad\",\n    \"comment\": \"\",\n    \"tag\": \"\",\n    \"state\": \"Unknown state\",\n    \"args\": {\n        \"dest\": \"" + fakeDsName1 + "\",\n        \"loadArgs\": {\n            \"sourceArgsList\": [\n                {\n                    \"targetName\": \"Default Shared Root\",\n                    \"path\": \"" + filePath + "\",\n                    \"fileNamePattern\": \"\",\n                    \"recursive\": false\n                }\n            ],\n            \"parseArgs\": {\n                \"parserFnName\": \"/sharedUDFs/default:extractJsonRecords\",\n                \"parserArgJson\": \"{\\\"structsToExtract\\\":\\\"system_stats\\\"}\",\n                \"fileNameFieldName\": \"\",\n                \"recordNumFieldName\": \"\",\n                \"allowFileErrors\": false,\n                \"allowRecordErrors\": false,\n                \"schema\": []\n            },\n            \"size\": 10737418240\n        }\n    },\n    \"annotations\": {}\n}"
                },
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "tag": "",
                "schema": systemStatsSchema,
                "parents": [],
                "nodeId": "dag_5DA5573527F142CD_1571268176998_38"
            },
            {
                "type": "map",
                "subType": "cast",
                "display": {
                    "x": 320,
                    "y": 315
                },
                "description": "",
                "input": {
                    "eval": [
                        {
                            "evalString": "int(times::timestamp, 10)",
                            "newField": "timestamp"
                        }
                    ],
                    "icv": false
                },
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "tag": "",
                "parents": [
                    "dag_5DA5573527F142CD_1571268176998_38"
                ],
                "nodeId": "dag_5DA5573527F142CD_1571268388235_41"
            },
            {
                "type": "join",
                "subType": null,
                "display": {
                    "x": 600,
                    "y": 235
                },
                "description": "",
                "input": {
                    "joinType": "crossJoin",
                    "left": {
                        "columns": [],
                        "keepColumns": nodesCrossJoinColumns,
                        "rename": []
                    },
                    "right": {
                        "columns": [],
                        "keepColumns": systemCrossJoinColumns,
                        "rename": []
                    },
                    "evalString": "and(lt(node_start_timestamp_microsecs,timestamp),gt(node_end_timestamp_microsecs,timestamp))",
                    "nullSafe": false,
                    "keepAllColumns": false
                },
                "state": "Configured",
                "error": "Requires 2 parents",
                "configured": true,
                "aggregates": [],
                "tag": "",
                "parents": [
                    "dag_5DA5573527F142CD_1571268357060_40",
                    "dag_5DA5573527F142CD_1571268388235_41"
                ],
                "nodeId": "dag_5DA5573527F142CD_1571268264387_39"
            },
                {
                    "type": "join",
                    "subType": null,
                    "display": {
                        "x": 800,
                        "y": 235
                    },
                    "description": "",
                    "input": {
                        "joinType": "leftJoin",
                        "left": {
                            "columns": [
                                "node_name"
                            ],
                            "keepColumns": [
                                ...nodesCrossJoinColumns
                            ],
                            "rename": [
                                {
                                    "sourceColumn": "node_name",
                                    "destColumn": "node_name",
                                    "prefix": false
                                }
                            ]
                        },
                        "right": {
                            "columns": [
                                "node_name"
                            ],
                            "keepColumns": [
                                "node_name",
                                ...systemCrossJoinColumns
                            ],
                            "rename": [
                                {
                                    "sourceColumn": "node_name",
                                    "destColumn": "node_name2",
                                    "prefix": false
                                }
                            ]
                        },
                        "evalString": "",
                        "nullSafe": false,
                        "keepAllColumns": false
                    },
                    "state": "Configured",
                    "configured": true,
                    "aggregates": [],
                    "tag": "",
                    "parents": [
                        "dag_5DA5573527F142CD_1571268357060_40",
                        "dag_5DA5573527F142CD_1571268264387_39"
                    ],
                    "nodeId": "dag_5D92982526BDF1D9_1571715872049_81"
                },
            {
                "type": "dataset",
                "subType": null,
                "display": {
                    "x": 40,
                    "y": 140
                },
                "description": "",
                "input": {
                    "source": fakeDsName2,
                    "prefix": "nodes",
                    "synthesize": false,
                    "loadArgs": "{\n    \"operation\": \"XcalarApiBulkLoad\",\n    \"comment\": \"\",\n    \"tag\": \"\",\n    \"state\": \"Unknown state\",\n    \"args\": {\n        \"dest\": \"" + fakeDsName2 + "\",\n        \"loadArgs\": {\n            \"sourceArgsList\": [\n                {\n                    \"targetName\": \"Default Shared Root\",\n                    \"path\": \"" + filePath + "\",\n                    \"fileNamePattern\": \"\",\n                    \"recursive\": false\n                }\n            ],\n            \"parseArgs\": {\n                \"parserFnName\": \"/sharedUDFs/default:getQueryStateOutputNodes\",\n                \"parserArgJson\": \"{}\",\n                \"fileNameFieldName\": \"\",\n                \"recordNumFieldName\": \"\",\n                \"allowFileErrors\": false,\n                \"allowRecordErrors\": false,\n                \"schema\": []\n            },\n            \"size\": 10737418240\n        }\n    },\n    \"annotations\": {}\n}"
                },
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "tag": "",
                "schema": nodesSchema,
                "parents": [],
                "nodeId": "dag_5DA5573527F142CD_1571268022355_37"
            },
            {
                "type": "map",
                "subType": "cast",
                "display": {
                    "x": 320,
                    "y": 55
                },
                "description": "",
                "input": {
                    "eval": [
                        {
                            "evalString": "int(nodes::sequence_num, 10)",
                            "newField": "sequence_num"
                        },
                        {
                            "evalString": "string(nodes::node_name)",
                            "newField": "node_name"
                        },
                        {
                            "evalString": "string(nodes::operator_name)",
                            "newField": "operator_name"
                        },
                        {
                            "evalString": "int(nodes::node_time_elapsed_millisecs, 10)",
                            "newField": "node_time_elapsed_millisecs"
                        },
                        {
                            "evalString": "int(nodes::skew, 10)",
                            "newField": "skew"
                        }
                    ],
                    "icv": false
                },
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "tag": "",
                "parents": [
                    "dag_5DA5573527F142CD_1571268022355_37"
                ],
                "nodeId": "dag_5D92982526BDF1D9_1571638354164_89"
            },
            {
                "type": "project",
                "subType": null,
                "display": {
                    "x": 500,
                    "y": 55
                },
                "description": "",
                "input": {
                    "columns": [
                        "sequence_num",
                        "node_name",
                        "operator_name",
                        "node_time_elapsed_millisecs",
                        "skew"
                    ]
                },
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "tag": "",
                "parents": [
                    "dag_5D92982526BDF1D9_1571638354164_89"
                ],
                "nodeId": "dag_5D92982526BDF1D9_1571638421570_90"
            },
            {
                "type": "sort",
                "subType": null,
                "display": {
                    "x": 660,
                    "y": 55
                },
                "description": "",
                "input": {
                    "columns": [
                        {
                            "columnName": "node_time_elapsed_millisecs",
                            "ordering": "Descending"
                        }
                    ],
                    "newKeys": []
                },
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "tag": "",
                "parents": [
                    "dag_5D92982526BDF1D9_1571638421570_90"
                ],
                "nodeId": "dag_5D92982526BDF1D9_1571638458205_91"
            },
            {
                "type": "sort",
                "subType": null,
                "display": {
                    "x": 1020,
                    "y": 415
                },
                "description": "",
                "input": {
                    "columns": [
                        {
                            "columnName": "timestamp",
                            "ordering": "Ascending"
                        }
                    ],
                    "newKeys": []
                },
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "tag": "",
                "parents": [
                    "dag_5D92982526BDF1D9_1571715872049_81"
                ],
                "nodeId": "dag_5DA5573527F142CD_1571268595475_42"
            },
            {
                "type": "filter",
                "subType": null,
                "display": {
                    "x": 1040,
                    "y": 240
                },
                "description": "",
                "input": {
                    "evalString": "eq(times::node,\"0\")"
                },
                "state": "Configured",
                "error": "Requires 1 parents",
                "configured": true,
                "aggregates": [],
                "tag": "",
                "parents": [
                    "dag_5D92982526BDF1D9_1571715872049_81"
                ],
                "nodeId": "dag_5D92982526BDF1D9_1571642892194_37"
            },
            {
                "type": "sql",
                "subType": null,
                "display": {
                    "x": 1220,
                    "y": 240
                },
                "description": "",
                "input": {
                    "sqlQueryStr": "select node_name, operator_name, node_time_elapsed_millisecs,\n\t" +
                                    "avg(SystemCpuMaximumUsage) as AveSystemCpuMaximumUsage,\n" +
                                     "    MAX(cpuTotal_last - cpuTotal_first) as SystemCpuTotalUsage,\n" +
                                     "    MAX(cpuXce_last - cpuXce_first) as SystemCpuXCEUsage,\n" +
                                     "    MAX(cpuXPU_last - cpuXPU_first) as SystemCpuXPUUsage,\n" +
                                     "    MAX(cpuNetworkRecv_last - cpuNetworkRecv_first) as SystemNetworkRecvBytes,\n" +
                                     "    MAX(cpuNetworkSend_last - cpuNetworkSend_first) as SystemNetworkSendBytes,\n" +
                                     "    AVG(SystemMemoryUsed) as AveSystemMemoryUsed,\n" +
                                     "    AVG(SystemMemoryXPUUsed) as AveSystemMemoryXPUUsed,\n" +
                                     " \tAVG(SystemMemoryXCEUsed) as AveSystemXCEUsed,\n" +
                                     "    AVG(SystemSwapUsed) as AveSystemSwapUsed,\n" +
                                     "    AVG(SystemDatasetUsed) as AveSystemDatasetUsed,\n" +
                                     "    MAX(cpuMemXCEMalloced_last - cpuMemXCEMalloced_first) as SystemMemoryXCEMalloced,\n" +
                                     "    MAX(cpuPageInsXpu_last - cpuPageInsXpu_first) as cpuPageInsXpu,\n" +
                                     "    MAX(cpuPageOutsXpu_last - cpuPageOutsXpu_first) as cpuPageOutsXpu,\n" +
                                     "    MAX(cpuPageInsXce_last - cpuPageInsXce_first) as cpuPageInsXce,\n" +
                                     "    MAX(cpuPageOutsXce_last - cpuPageOutsXce_first) as cpuPageOutsXce,\n" +
                                     "    AVG(XdbUsedBytes) as AveXdbUsedBytes\nfrom \n(select node_name,operator_name, node_time_elapsed_millisecs,\n \t" +
                                     "first(SystemCpuTotalUsage) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuTotal_first,\n \t" +
                                     "last(SystemCpuTotalUsage) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuTotal_last,\n \t" +
                                     "first(SystemCpuXCEUsage) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuXce_first,\n \t" +
                                     "last(SystemCpuXCEUsage) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuXce_last,\n \t" +
                                     "first(SystemCpuXPUUsage) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuXPU_first,\n \t"+
                                     "last(SystemCpuXPUUsage) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuXPU_last,\n \t" +
                                     "first(SystemNetworkRecvBytes) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuNetworkRecv_first,\n \t" +
                                     "last(SystemNetworkRecvBytes) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuNetworkRecv_last,\n \t" +
                                     "first(SystemNetworkSendBytes) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuNetworkSend_first,\n \t" +
                                     "last(SystemNetworkSendBytes) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuNetworkSend_last,\n \t" +
                                     "SystemMemoryUsed,\n \t" +
                                     "SystemMemoryXPUUsed,\n \t" +
                                     "SystemMemoryXCEUsed,\n \t" +
                                     "SystemSwapUsed,\n \t" +
                                     "SystemDatasetUsed,\n \t" +
                                     "first(SystemMemoryXCEMalloced) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuMemXCEMalloced_first,\n \t" +
                                     "last(SystemMemoryXCEMalloced) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuMemXCEMalloced_last,\n \t" +
                                     "first(SystemPageInsXPU) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuPageInsXpu_first,\n \t" +
                                     "last(SystemPageInsXPU) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuPageInsXpu_last,\n \t" +
                                     "first(SystemPageOutsXPU) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuPageOutsXpu_first,\n \t" +
                                     "last(SystemPageOutsXPU) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuPageOutsXpu_last,\n \t" +
                                     "first(SystemPageInsXCE) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuPageInsXce_first,\n \t" +
                                     "last(SystemPageInsXCE) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuPageInsXce_last,\n \t" +
                                     "first(SystemPageOutsXCE) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuPageOutsXce_first,\n \t" +
                                     "last(SystemPageOutsXCE) OVER(PARTITION BY node_name ORDER BY timestamp ASC) cpuPageOutsXce_last,\n \t" +
                                     "XdbUsedBytes,\n \t" +
                                     "SystemCpuMaximumUsage \nfrom result)\nGROUP by node_name, operator_name, node_time_elapsed_millisecs",
                    "identifiers": {
                        "1": "result"
                    },
                    "identifiersOrder": [
                        1
                    ],
                    "dropAsYouGo": true
                },
                "state": "Configured",
                "error": "Unknown Error",
                "configured": true,
                "aggregates": [],
                "tag": "",
                "tableSrcMap": {
                    "table_DF2_5D92982526BDF1D9_1571554314495_1_dag_5D92982526BDF1D9_1571642892194_37#t_1571642939780_5": 1
                },
                "columns": [
                    {
                        "name": "NODE_NAME",
                        "backName": "NODE_NAME",
                        "type": "string"
                    },
                    {
                        "name": "OPERATOR_NAME",
                        "backName": "OPERATOR_NAME",
                        "type": "string"
                    },
                    {
                        "name": "NODE_TIME_ELAPSED_MILLISECS",
                        "backName": "NODE_TIME_ELAPSED_MILLISECS",
                        "type": "integer"
                    },
                    {
                        "name": "AVESYSTEMCPUMAXIMUMUSAGE",
                        "backName": "AVESYSTEMCPUMAXIMUMUSAGE",
                        "type": "float"
                    },
                    {
                        "name": "SYSTEMCPUTOTALUSAGE",
                        "backName": "SYSTEMCPUTOTALUSAGE",
                        "type": "float"
                    },
                    {
                        "name": "SYSTEMCPUXCEUSAGE",
                        "backName": "SYSTEMCPUXCEUSAGE",
                        "type": "float"
                    },
                    {
                        "name": "SYSTEMCPUXPUUSAGE",
                        "backName": "SYSTEMCPUXPUUSAGE",
                        "type": "float"
                    },
                    {
                        "name": "SYSTEMNETWORKRECVBYTES",
                        "backName": "SYSTEMNETWORKRECVBYTES",
                        "type": "float"
                    },
                    {
                        "name": "SYSTEMNETWORKSENDBYTES",
                        "backName": "SYSTEMNETWORKSENDBYTES",
                        "type": "float"
                    },
                    {
                        "name": "AVESYSTEMMEMORYUSED",
                        "backName": "AVESYSTEMMEMORYUSED",
                        "type": "float"
                    },
                    {
                        "name": "AVESYSTEMMEMORYXPUUSED",
                        "backName": "AVESYSTEMMEMORYXPUUSED",
                        "type": "float"
                    },
                    {
                        "name": "AVESYSTEMXCEUSED",
                        "backName": "AVESYSTEMXCEUSED",
                        "type": "float"
                    },
                    {
                        "name": "AVESYSTEMSWAPUSED",
                        "backName": "AVESYSTEMSWAPUSED",
                        "type": "float"
                    },
                    {
                        "name": "AVESYSTEMDATASETUSED",
                        "backName": "AVESYSTEMDATASETUSED",
                        "type": "float"
                    },
                    {
                        "name": "SYSTEMMEMORYXCEMALLOCED",
                        "backName": "SYSTEMMEMORYXCEMALLOCED",
                        "type": "float"
                    },
                    {
                        "name": "CPUPAGEINSXPU",
                        "backName": "CPUPAGEINSXPU",
                        "type": "float"
                    },
                    {
                        "name": "CPUPAGEOUTSXPU",
                        "backName": "CPUPAGEOUTSXPU",
                        "type": "float"
                    },
                    {
                        "name": "CPUPAGEINSXCE",
                        "backName": "CPUPAGEINSXCE",
                        "type": "float"
                    },
                    {
                        "name": "CPUPAGEOUTSXCE",
                        "backName": "CPUPAGEOUTSXCE",
                        "type": "float"
                    },
                    {
                        "name": "AVEXDBUSEDBYTES",
                        "backName": "AVEXDBUSEDBYTES",
                        "type": "float"
                    }
                ],
                "parents": [
                    "dag_5D92982526BDF1D9_1571642892194_37"
                ],
                "nodeId": "dag_5D92982526BDF1D9_1571642892191_36"
            },
            {
                "type": "sort",
                "subType": null,
                "display": {
                    "x": 1360,
                    "y": 240
                },
                "description": "",
                "input": {
                    "columns": [
                        {
                            "columnName": "NODE_TIME_ELAPSED_MILLISECS",
                            "ordering": "Descending"
                        }
                    ],
                    "newKeys": []
                },
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "tag": "",
                "parents": [
                    "dag_5D92982526BDF1D9_1571642892191_36"
                ],
                "nodeId": "dag_5D92982526BDF1D9_1571642892196_38"
            },
            {
                "type": "map",
                "subType": "cast",
                "display": {
                    "x": 320,
                    "y": 140
                },
                "description": "",
                "input": {
                    "eval": [
                        {
                            "evalString": "int(nodes::node_start_timestamp_microsecs, 10)",
                            "newField": "node_start_timestamp_microsecs"
                        },
                        {
                            "evalString": "int(nodes::node_end_timestamp_microsecs, 10)",
                            "newField": "node_end_timestamp_microsecs"
                        },
                        {
                            "evalString": "string(nodes::node_name)",
                            "newField": "node_name"
                        }
                    ],
                    "icv": false
                },
                "state": "Configured",
                "configured": true,
                "aggregates": [],
                "tag": "",
                "parents": [
                    "dag_5DA5573527F142CD_1571268022355_37"
                ],
                "nodeId": "dag_5DA5573527F142CD_1571268357060_40"
            }
        ];
        return nodeJson;
    }

    private _getComments() {
        return [
            {
                "nodeId": "comment_5D92982526BDF1D9_1571554314559_0",
                "display": {
                    "x": 560,
                    "y": 140,
                    "width": 180,
                    "height": 80
                },
                "text": "Join node start & end times with system stats timestamps."
            },
            {
                "nodeId": "comment_5D92982526BDF1D9_1571554314562_1",
                "display": {
                    "x": 280,
                    "y": 200,
                    "width": 180,
                    "height": 100
                },
                "text": "Casting node_start_time, node_end_time, and timestamp to int so we can join them together."
            },
            {
                "nodeId": "comment_5D92982526BDF1D9_1571554314563_2",
                "display": {
                    "x": 20,
                    "y": 340,
                    "width": 220,
                    "height": 100
                },
                "text": "This dataset is derived from the system_stats field. Each row corresponds to a timestamp from a cluster node.  "
            },
            {
                "nodeId": "comment_5D92982526BDF1D9_1571638628188_0",
                "display": {
                    "x": 760,
                    "y": 40,
                    "width": 116,
                    "height": 56
                },
                "text": "Nodes sorted by time elapsed"
            },
            {
                "nodeId": "comment_5D92982526BDF1D9_1571554314566_4",
                "display": {
                    "x": 1000,
                    "y": 340,
                    "width": 160,
                    "height": 60
                },
                "text": "Sort the joined table by timestamp"
            },
            {
                "nodeId": "comment_5D92982526BDF1D9_1571642892188_0",
                "display": {
                    "x": 1020,
                    "y": 140,
                    "width": 154,
                    "height": 74
                },
                "text": "Select which cluster node to inspect. Default is Node 0."
            },
            {
                "nodeId": "comment_5D92982526BDF1D9_1571554314567_5",
                "display": {
                    "x": 20,
                    "y": 20,
                    "width": 220,
                    "height": 100
                },
                "text": "This dataset is derived from query_state_output.nodes. Each operator/node corresponds to 1 row"
            }
        ];
    }

    private _getType(val) {
        let type;
        switch (typeof val) {
            case ('string'):
                type = "string";
                break;
            case ('number'):
                type = "integer";
                break;
            case ('boolean'):
                type = "boolean";
                break;
            case ('object'):
                if (val == null) {
                    type = "null"
                } else if (val instanceof Array) {
                    type = "array";
                } else {
                    type = "object";
                }
            default:
                type = "string";
                break;
        }
        return type;
    }

    private static oldSystemStatsSchema =  [
        {
            "name": "timestamp",
            "type": "string"
        },
        {
            "name": "node",
            "type": "string"
        },
        {
            "name": "SystemCpuMaximumUsage",
            "type": "string"
        },
        {
            "name": "SystemCpuTotalUsage",
            "type": "string"
        },
        {
            "name": "SystemCpuXCEUsage",
            "type": "string"
        },
        {
            "name": "SystemCpuXPUUsage",
            "type": "string"
        },
        {
            "name": "SystemNetworkRecvBytes",
            "type": "string"
        },
        {
            "name": "SystemNetworkSendBytes",
            "type": "string"
        },
        {
            "name": "SystemMemoryUsed",
            "type": "string"
        },
        {
            "name": "SystemMemoryTotalAvailable",
            "type": "string"
        },
        {
            "name": "SystemSwapUsed",
            "type": "string"
        },
        {
            "name": "SystemSwapTotal",
            "type": "string"
        },
        {
            "name": "SystemDatasetUsed",
            "type": "string"
        },
        {
            "name": "SystemMemoryXPUUsed",
            "type": "string"
        },
        {
            "name": "SystemMemoryXCEUsed",
            "type": "string"
        },
        {
            "name": "SystemMemoryXCEMalloced",
            "type": "string"
        },
        {
            "name": "SystemPageInsXPU",
            "type": "string"
        },
        {
            "name": "SystemPageOutsXPU",
            "type": "string"
        },
        {
            "name": "SystemPageInsXCE",
            "type": "string"
        },
        {
            "name": "SystemPageOutsXCE",
            "type": "string"
        },
        {
            "name": "XdbUsedBytes",
            "type": "string"
        },
        {
            "name": "XdbTotalBytes",
            "type": "string"
        },
        {
            "name": "XdbNumSerializedPages",
            "type": "string"
        },
        {
            "name": "XdbNumDeserializedPages",
            "type": "string"
        },
        {
            "name": "XdbNumSerDesDroppedBatches",
            "type": "string"
        },
        {
            "name": "OperationsFilterCount",
            "type": "string"
        },
        {
            "name": "OperationsGroupByCount",
            "type": "string"
        },
        {
            "name": "OperationsJoinCount",
            "type": "string"
        },
        {
            "name": "OperationsMapCount",
            "type": "string"
        },
        {
            "name": "OperationsUnionCount",
            "type": "string"
        },
        {
            "name": "OperationsAggregateCount",
            "type": "string"
        },
        {
            "name": "SystemNumCores",
            "type": "string"
        }
    ];
    private static oldNodesSchema = [
        {
            "name": "sequence_num",
            "type": "integer"
        },
        {
            "name": "node_name",
            "type": "string"
        },
        {
            "name": "input_tables",
            "type": "string"
        },
        {
            "name": "output_tables",
            "type": "string"
        },
        {
            "name": "operator_name",
            "type": "string"
        },
        {
            "name": "operator_state",
            "type": "string"
        },
        {
            "name": "operator_status",
            "type": "string"
        },
        {
            "name": "node_start_timestamp_microsecs",
            "type": "integer"
        },
        {
            "name": "node_time_elapsed_millisecs",
            "type": "integer"
        },
        {
            "name": "node_end_timestamp_microsecs",
            "type": "integer"
        },
        {
            "name": "input_parameters",
            "type": "string"
        },
        {
            "name": "input_size",
            "type": "integer"
        },
        {
            "name": "total_row_count_output_table",
            "type": "integer"
        },
        {
            "name": "rows_per_node_in_cluster",
            "type": "string"
        },
        {
            "name": "skew",
            "type": "integer"
        },
        {
            "name": "total_node_count_in_cluster",
            "type": "integer"
        },
        {
            "name": "tag",
            "type": "string"
        },
        {
            "name": "user_comment",
            "type": "string"
        },
        {
            "name": "libstats",
            "type": "array"
        },
        {
            "name": "job_id",
            "type": "string"
        },
        {
            "name": "job_start_timestamp_microsecs",
            "type": "integer"
        }
    ];


}
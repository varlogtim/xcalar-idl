// **********************************************************************
// *** DO NOT EDIT!  This file was autogenerated by xcrpc             ***
// **********************************************************************
// Copyright 2018 Xcalar, Inc. All rights reserved.
//
// No use, or distribution, of this source code is permitted in any form or
// means without a valid, written license agreement with Xcalar, Inc.
// Please refer to the included "COPYING" file for terms and conditions
// regarding the use and redistribution of this software.
//

var client = require("./Client");
var service = require('./xcalar/compute/localtypes/Service_pb');

var dataflow = require("./xcalar/compute/localtypes/Dataflow_pb");
var proto_empty = require("google-protobuf/google/protobuf/empty_pb");


////////////////////////////////////////////////////////////////////////////////
// Constructors
////////////////////////////////////////////////////////////////////////////////

function DataflowService(client) {
    this.client = client;
}

////////////////////////////////////////////////////////////////////////////////
// Definitions
////////////////////////////////////////////////////////////////////////////////

DataflowService.prototype = {
    filter: async function(filterRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(filterRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.FilterRequest");
        //anyWrapper.pack(filterRequest.serializeBinary(), "FilterRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "Filter", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var filterResponse =
            //    responseData.unpack(dataflow.FilterResponse.deserializeBinary,
            //                        "FilterResponse");
            var filterResponse = dataflow.FilterResponse.deserializeBinary(specificBytes);
            return filterResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.FilterResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    aggregate: async function(aggregateRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(aggregateRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.AggregateRequest");
        //anyWrapper.pack(aggregateRequest.serializeBinary(), "AggregateRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "Aggregate", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var aggregateResponse =
            //    responseData.unpack(dataflow.AggregateResponse.deserializeBinary,
            //                        "AggregateResponse");
            var aggregateResponse = dataflow.AggregateResponse.deserializeBinary(specificBytes);
            return aggregateResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.AggregateResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    aggregateWithEvalStr: async function(aggregateEvalStrRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(aggregateEvalStrRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest");
        //anyWrapper.pack(aggregateEvalStrRequest.serializeBinary(), "AggregateEvalStrRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "AggregateWithEvalStr", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var aggregateResponse =
            //    responseData.unpack(dataflow.AggregateResponse.deserializeBinary,
            //                        "AggregateResponse");
            var aggregateResponse = dataflow.AggregateResponse.deserializeBinary(specificBytes);
            return aggregateResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.AggregateResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    map: async function(mapRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(mapRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.MapRequest");
        //anyWrapper.pack(mapRequest.serializeBinary(), "MapRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "Map", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var mapResponse =
            //    responseData.unpack(dataflow.MapResponse.deserializeBinary,
            //                        "MapResponse");
            var mapResponse = dataflow.MapResponse.deserializeBinary(specificBytes);
            return mapResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.MapResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    genRowNum: async function(genRowNumRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(genRowNumRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.GenRowNumRequest");
        //anyWrapper.pack(genRowNumRequest.serializeBinary(), "GenRowNumRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "GenRowNum", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var genRowNumResponse =
            //    responseData.unpack(dataflow.GenRowNumResponse.deserializeBinary,
            //                        "GenRowNumResponse");
            var genRowNumResponse = dataflow.GenRowNumResponse.deserializeBinary(specificBytes);
            return genRowNumResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.GenRowNumResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    project: async function(projectRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(projectRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.ProjectRequest");
        //anyWrapper.pack(projectRequest.serializeBinary(), "ProjectRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "Project", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var projectResponse =
            //    responseData.unpack(dataflow.ProjectResponse.deserializeBinary,
            //                        "ProjectResponse");
            var projectResponse = dataflow.ProjectResponse.deserializeBinary(specificBytes);
            return projectResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.ProjectResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    join: async function(joinRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(joinRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.JoinRequest");
        //anyWrapper.pack(joinRequest.serializeBinary(), "JoinRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "Join", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var joinResponse =
            //    responseData.unpack(dataflow.JoinResponse.deserializeBinary,
            //                        "JoinResponse");
            var joinResponse = dataflow.JoinResponse.deserializeBinary(specificBytes);
            return joinResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.JoinResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    unionOp: async function(unionRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(unionRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.UnionRequest");
        //anyWrapper.pack(unionRequest.serializeBinary(), "UnionRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "UnionOp", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var unionResponse =
            //    responseData.unpack(dataflow.UnionResponse.deserializeBinary,
            //                        "UnionResponse");
            var unionResponse = dataflow.UnionResponse.deserializeBinary(specificBytes);
            return unionResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.UnionResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    groupBy: async function(groupByRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(groupByRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.GroupByRequest");
        //anyWrapper.pack(groupByRequest.serializeBinary(), "GroupByRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "GroupBy", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var groupByResponse =
            //    responseData.unpack(dataflow.GroupByResponse.deserializeBinary,
            //                        "GroupByResponse");
            var groupByResponse = dataflow.GroupByResponse.deserializeBinary(specificBytes);
            return groupByResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.GroupByResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    indexFromDataset: async function(indexFromDatasetRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(indexFromDatasetRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest");
        //anyWrapper.pack(indexFromDatasetRequest.serializeBinary(), "IndexFromDatasetRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "IndexFromDataset", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var indexFromDatasetResponse =
            //    responseData.unpack(dataflow.IndexFromDatasetResponse.deserializeBinary,
            //                        "IndexFromDatasetResponse");
            var indexFromDatasetResponse = dataflow.IndexFromDatasetResponse.deserializeBinary(specificBytes);
            return indexFromDatasetResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.IndexFromDatasetResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    index: async function(indexRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(indexRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.IndexRequest");
        //anyWrapper.pack(indexRequest.serializeBinary(), "IndexRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "Index", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var indexResponse =
            //    responseData.unpack(dataflow.IndexResponse.deserializeBinary,
            //                        "IndexResponse");
            var indexResponse = dataflow.IndexResponse.deserializeBinary(specificBytes);
            return indexResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.IndexResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    sort: async function(sortRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(sortRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.SortRequest");
        //anyWrapper.pack(sortRequest.serializeBinary(), "SortRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "Sort", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var sortResponse =
            //    responseData.unpack(dataflow.SortResponse.deserializeBinary,
            //                        "SortResponse");
            var sortResponse = dataflow.SortResponse.deserializeBinary(specificBytes);
            return sortResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.SortResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    synthesize: async function(synthesizeRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(synthesizeRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.SynthesizeRequest");
        //anyWrapper.pack(synthesizeRequest.serializeBinary(), "SynthesizeRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "Synthesize", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var synthesizeResponse =
            //    responseData.unpack(dataflow.SynthesizeResponse.deserializeBinary,
            //                        "SynthesizeResponse");
            var synthesizeResponse = dataflow.SynthesizeResponse.deserializeBinary(specificBytes);
            return synthesizeResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.SynthesizeResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    execute: async function(executeRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(executeRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.ExecuteRequest");
        //anyWrapper.pack(executeRequest.serializeBinary(), "ExecuteRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "Execute", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var executeResponse =
            //    responseData.unpack(dataflow.ExecuteResponse.deserializeBinary,
            //                        "ExecuteResponse");
            var executeResponse = dataflow.ExecuteResponse.deserializeBinary(specificBytes);
            return executeResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.ExecuteResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    listParametersInDataflow: async function(listParametersInDataflowRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(listParametersInDataflowRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest");
        //anyWrapper.pack(listParametersInDataflowRequest.serializeBinary(), "ListParametersInDataflowRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "ListParametersInDataflow", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var listParametersInDataflowResponse =
            //    responseData.unpack(dataflow.ListParametersInDataflowResponse.deserializeBinary,
            //                        "ListParametersInDataflowResponse");
            var listParametersInDataflowResponse = dataflow.ListParametersInDataflowResponse.deserializeBinary(specificBytes);
            return listParametersInDataflowResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.ListParametersInDataflowResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    list: async function(listRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(listRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.ListRequest");
        //anyWrapper.pack(listRequest.serializeBinary(), "ListRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "List", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var listResponse =
            //    responseData.unpack(dataflow.ListResponse.deserializeBinary,
            //                        "ListResponse");
            var listResponse = dataflow.ListResponse.deserializeBinary(specificBytes);
            return listResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.ListResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    update: async function(updateRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(updateRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.UpdateRequest");
        //anyWrapper.pack(updateRequest.serializeBinary(), "UpdateRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "Update", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var empty =
            //    responseData.unpack(proto_empty.Empty.deserializeBinary,
            //                        "Empty");
            var empty = proto_empty.Empty.deserializeBinary(specificBytes);
            return empty;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = proto_empty.Empty.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    getDataflowJson: async function(getDataflowJsonRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(getDataflowJsonRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest");
        //anyWrapper.pack(getDataflowJsonRequest.serializeBinary(), "GetDataflowJsonRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "GetDataflowJson", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var getDataflowJsonResponse =
            //    responseData.unpack(dataflow.GetDataflowJsonResponse.deserializeBinary,
            //                        "GetDataflowJsonResponse");
            var getDataflowJsonResponse = dataflow.GetDataflowJsonResponse.deserializeBinary(specificBytes);
            return getDataflowJsonResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.GetDataflowJsonResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    importDataflow: async function(importRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(importRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.ImportRequest");
        //anyWrapper.pack(importRequest.serializeBinary(), "ImportRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "ImportDataflow", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var empty =
            //    responseData.unpack(proto_empty.Empty.deserializeBinary,
            //                        "Empty");
            var empty = proto_empty.Empty.deserializeBinary(specificBytes);
            return empty;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = proto_empty.Empty.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    exportDataflow: async function(exportRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(exportRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.ExportRequest");
        //anyWrapper.pack(exportRequest.serializeBinary(), "ExportRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "ExportDataflow", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var exportResponse =
            //    responseData.unpack(dataflow.ExportResponse.deserializeBinary,
            //                        "ExportResponse");
            var exportResponse = dataflow.ExportResponse.deserializeBinary(specificBytes);
            return exportResponse;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = dataflow.ExportResponse.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
    deleteDataflow: async function(deleteRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(deleteRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.Dataflow.DeleteRequest");
        //anyWrapper.pack(deleteRequest.serializeBinary(), "DeleteRequest");

        try {
            var responseData = await this.client.execute("Dataflow", "DeleteDataflow", anyWrapper);
            var specificBytes = responseData.getValue();
            // XXX Any.unpack() is only available in protobuf 3.2; see above
            //var empty =
            //    responseData.unpack(proto_empty.Empty.deserializeBinary,
            //                        "Empty");
            var empty = proto_empty.Empty.deserializeBinary(specificBytes);
            return empty;
        } catch(error) {
            if (error.response != null) {
                const specificBytes = error.response.getValue();
                error.response = proto_empty.Empty.deserializeBinary(specificBytes);
            }
            throw error;
        }
    },
};

exports.DataflowService = DataflowService;

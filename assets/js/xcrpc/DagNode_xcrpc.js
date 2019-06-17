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

var proto_empty = require("google-protobuf/google/protobuf/empty_pb");
var dagNode = require("./xcalar/compute/localtypes/DagNode_pb");


////////////////////////////////////////////////////////////////////////////////
// Constructors
////////////////////////////////////////////////////////////////////////////////

function DagNodeService(client) {
    this.client = client;
}

////////////////////////////////////////////////////////////////////////////////
// Definitions
////////////////////////////////////////////////////////////////////////////////

DagNodeService.prototype = {
    tag: async function(tagRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(tagRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.DagNode.TagRequest");
        //anyWrapper.pack(tagRequest.serializeBinary(), "TagRequest");

        var responseData = await this.client.execute("DagNode", "Tag", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var empty =
        //    responseData.unpack(proto_empty.Empty.deserializeBinary,
        //                        "Empty");
        var empty = proto_empty.Empty.deserializeBinary(specificBytes);
        return empty;
    },
    comment: async function(commentRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(commentRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.DagNode.CommentRequest");
        //anyWrapper.pack(commentRequest.serializeBinary(), "CommentRequest");

        var responseData = await this.client.execute("DagNode", "Comment", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var empty =
        //    responseData.unpack(proto_empty.Empty.deserializeBinary,
        //                        "Empty");
        var empty = proto_empty.Empty.deserializeBinary(specificBytes);
        return empty;
    },
};

exports.DagNodeService = DagNodeService;

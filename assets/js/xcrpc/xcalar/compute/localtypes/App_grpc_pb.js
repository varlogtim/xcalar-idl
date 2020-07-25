// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Copyright 2020 Xcalar, Inc. All rights reserved.
//
// No use, or distribution, of this source code is permitted in any form or
// means without a valid, written license agreement with Xcalar, Inc.
// Please refer to the included "COPYING" file for terms and conditions
// regarding the use and redistribution of this software.
//
//
'use strict';
var grpc = require('grpc');
var xcalar_compute_localtypes_App_pb = require('../../../xcalar/compute/localtypes/App_pb.js');
var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');

function serialize_xcalar_compute_localtypes_App_AppStatusRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_App_pb.AppStatusRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.App.AppStatusRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_App_AppStatusRequest(buffer_arg) {
  return xcalar_compute_localtypes_App_pb.AppStatusRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_App_AppStatusResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_App_pb.AppStatusResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.App.AppStatusResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_App_AppStatusResponse(buffer_arg) {
  return xcalar_compute_localtypes_App_pb.AppStatusResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var AppService = exports.AppService = {
  appStatus: {
    path: '/xcalar.compute.localtypes.App.App/AppStatus',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_App_pb.AppStatusRequest,
    responseType: xcalar_compute_localtypes_App_pb.AppStatusResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_App_AppStatusRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_App_AppStatusRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_App_AppStatusResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_App_AppStatusResponse,
  },
};

exports.AppClient = grpc.makeGenericClientConstructor(AppService);

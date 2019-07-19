/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');
var xcalar_compute_localtypes_Workbook_pb = require('../../../xcalar/compute/localtypes/Workbook_pb.js');
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.AggColInfo', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.AggregateRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.AggregateResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.DataflowDesc', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.DeleteRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.ExportRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.ExportResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.FilterRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.FilterResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.GroupByOptions', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.GroupByRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.GroupByResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.ImportRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.IndexRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.IndexResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.JoinOptions', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.JoinRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.JoinResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.ListRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.ListResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.MapRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.MapResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.Parameter', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.ProjectRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.ProjectResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.SortRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.SortResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.UnionColInfo', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.UnionRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.UnionResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Dataflow.UpdateRequest', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.FilterRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.FilterRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.FilterRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.FilterRequest';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.FilterRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.FilterRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.FilterRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.FilterRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    filterstr: jspb.Message.getFieldWithDefault(msg, 1, ""),
    srctablename: jspb.Message.getFieldWithDefault(msg, 2, ""),
    dsttablename: jspb.Message.getFieldWithDefault(msg, 3, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.FilterRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.FilterRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.FilterRequest;
  return proto.xcalar.compute.localtypes.Dataflow.FilterRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.FilterRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.FilterRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.FilterRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setFilterstr(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setSrctablename(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setDsttablename(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.FilterRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.FilterRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.FilterRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.FilterRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getFilterstr();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getSrctablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getDsttablename();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
};


/**
 * optional string filterStr = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.FilterRequest.prototype.getFilterstr = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.FilterRequest.prototype.setFilterstr = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string srcTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.FilterRequest.prototype.getSrctablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.FilterRequest.prototype.setSrctablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string dstTableName = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.FilterRequest.prototype.getDsttablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.FilterRequest.prototype.setDsttablename = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.FilterResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.FilterResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.FilterResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.FilterResponse';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.FilterResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.FilterResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.FilterResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.FilterResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    querystr: jspb.Message.getFieldWithDefault(msg, 1, ""),
    newtablename: jspb.Message.getFieldWithDefault(msg, 2, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.FilterResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.FilterResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.FilterResponse;
  return proto.xcalar.compute.localtypes.Dataflow.FilterResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.FilterResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.FilterResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.FilterResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setQuerystr(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewtablename(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.FilterResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.FilterResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.FilterResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.FilterResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getQuerystr();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getNewtablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
};


/**
 * optional string queryStr = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.FilterResponse.prototype.getQuerystr = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.FilterResponse.prototype.setQuerystr = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string newTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.FilterResponse.prototype.getNewtablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.FilterResponse.prototype.setNewtablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.AggregateRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.AggregateRequest';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.AggregateRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    aggop: jspb.Message.getFieldWithDefault(msg, 1, ""),
    colname: jspb.Message.getFieldWithDefault(msg, 2, ""),
    srctablename: jspb.Message.getFieldWithDefault(msg, 3, ""),
    dstaggname: jspb.Message.getFieldWithDefault(msg, 4, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.AggregateRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.AggregateRequest;
  return proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.AggregateRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.AggregateRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setAggop(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setColname(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setSrctablename(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.setDstaggname(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.AggregateRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getAggop();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getColname();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getSrctablename();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getDstaggname();
  if (f.length > 0) {
    writer.writeString(
      4,
      f
    );
  }
};


/**
 * optional string aggOp = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.prototype.getAggop = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.prototype.setAggop = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string colName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.prototype.getColname = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.prototype.setColname = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string srcTableName = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.prototype.getSrctablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.prototype.setSrctablename = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * optional string dstAggName = 4;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.prototype.getDstaggname = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 4, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.AggregateRequest.prototype.setDstaggname = function(value) {
  jspb.Message.setProto3StringField(this, 4, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    evalstr: jspb.Message.getFieldWithDefault(msg, 1, ""),
    srctablename: jspb.Message.getFieldWithDefault(msg, 2, ""),
    dstaggname: jspb.Message.getFieldWithDefault(msg, 3, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest;
  return proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setEvalstr(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setSrctablename(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setDstaggname(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getEvalstr();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getSrctablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getDstaggname();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
};


/**
 * optional string evalStr = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest.prototype.getEvalstr = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest.prototype.setEvalstr = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string srcTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest.prototype.getSrctablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest.prototype.setSrctablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string dstAggName = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest.prototype.getDstaggname = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest.prototype.setDstaggname = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.AggregateResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.AggregateResponse';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.AggregateResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    querystr: jspb.Message.getFieldWithDefault(msg, 1, ""),
    aggval: jspb.Message.getFieldWithDefault(msg, 2, ""),
    dstaggname: jspb.Message.getFieldWithDefault(msg, 3, ""),
    todelete: jspb.Message.getFieldWithDefault(msg, 4, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.AggregateResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.AggregateResponse;
  return proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.AggregateResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.AggregateResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setQuerystr(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setAggval(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setDstaggname(value);
      break;
    case 4:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setTodelete(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.AggregateResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getQuerystr();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getAggval();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getDstaggname();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getTodelete();
  if (f) {
    writer.writeBool(
      4,
      f
    );
  }
};


/**
 * optional string queryStr = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.prototype.getQuerystr = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.prototype.setQuerystr = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string aggVal = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.prototype.getAggval = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.prototype.setAggval = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string dstAggName = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.prototype.getDstaggname = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.prototype.setDstaggname = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * optional bool toDelete = 4;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.prototype.getTodelete = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 4, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.AggregateResponse.prototype.setTodelete = function(value) {
  jspb.Message.setProto3BooleanField(this, 4, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.MapRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.MapRequest.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.MapRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.MapRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.MapRequest';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.repeatedFields_ = [1,2];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.MapRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.MapRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    mapstrsList: jspb.Message.getRepeatedField(msg, 1),
    newcolnamesList: jspb.Message.getRepeatedField(msg, 2),
    srctablename: jspb.Message.getFieldWithDefault(msg, 3, ""),
    dsttablename: jspb.Message.getFieldWithDefault(msg, 4, ""),
    icvmode: jspb.Message.getFieldWithDefault(msg, 5, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.MapRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.MapRequest;
  return proto.xcalar.compute.localtypes.Dataflow.MapRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.MapRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.MapRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.addMapstrs(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.addNewcolnames(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setSrctablename(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.setDsttablename(value);
      break;
    case 5:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setIcvmode(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.MapRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.MapRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getMapstrsList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      1,
      f
    );
  }
  f = message.getNewcolnamesList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      2,
      f
    );
  }
  f = message.getSrctablename();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getDsttablename();
  if (f.length > 0) {
    writer.writeString(
      4,
      f
    );
  }
  f = message.getIcvmode();
  if (f) {
    writer.writeBool(
      5,
      f
    );
  }
};


/**
 * repeated string mapStrs = 1;
 * @return {!Array<string>}
 */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.prototype.getMapstrsList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 1));
};


/** @param {!Array<string>} value */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.prototype.setMapstrsList = function(value) {
  jspb.Message.setField(this, 1, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.prototype.addMapstrs = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 1, value, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.MapRequest.prototype.clearMapstrsList = function() {
  this.setMapstrsList([]);
};


/**
 * repeated string newColNames = 2;
 * @return {!Array<string>}
 */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.prototype.getNewcolnamesList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 2));
};


/** @param {!Array<string>} value */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.prototype.setNewcolnamesList = function(value) {
  jspb.Message.setField(this, 2, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.prototype.addNewcolnames = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 2, value, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.MapRequest.prototype.clearNewcolnamesList = function() {
  this.setNewcolnamesList([]);
};


/**
 * optional string srcTableName = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.prototype.getSrctablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.prototype.setSrctablename = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * optional string dstTableName = 4;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.prototype.getDsttablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 4, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.prototype.setDsttablename = function(value) {
  jspb.Message.setProto3StringField(this, 4, value);
};


/**
 * optional bool icvMode = 5;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.prototype.getIcvmode = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 5, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.MapRequest.prototype.setIcvmode = function(value) {
  jspb.Message.setProto3BooleanField(this, 5, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.MapResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.MapResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.MapResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.MapResponse';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.MapResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.MapResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.MapResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.MapResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    querystr: jspb.Message.getFieldWithDefault(msg, 1, ""),
    newtablename: jspb.Message.getFieldWithDefault(msg, 2, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.MapResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.MapResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.MapResponse;
  return proto.xcalar.compute.localtypes.Dataflow.MapResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.MapResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.MapResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.MapResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setQuerystr(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewtablename(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.MapResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.MapResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.MapResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.MapResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getQuerystr();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getNewtablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
};


/**
 * optional string queryStr = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.MapResponse.prototype.getQuerystr = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.MapResponse.prototype.setQuerystr = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string newTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.MapResponse.prototype.getNewtablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.MapResponse.prototype.setNewtablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    newcolname: jspb.Message.getFieldWithDefault(msg, 1, ""),
    srctablename: jspb.Message.getFieldWithDefault(msg, 2, ""),
    dsttablename: jspb.Message.getFieldWithDefault(msg, 3, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest;
  return proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewcolname(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setSrctablename(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setDsttablename(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getNewcolname();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getSrctablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getDsttablename();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
};


/**
 * optional string newColName = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest.prototype.getNewcolname = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest.prototype.setNewcolname = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string srcTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest.prototype.getSrctablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest.prototype.setSrctablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string dstTableName = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest.prototype.getDsttablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumRequest.prototype.setDsttablename = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    querystr: jspb.Message.getFieldWithDefault(msg, 1, ""),
    newtablename: jspb.Message.getFieldWithDefault(msg, 2, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse;
  return proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setQuerystr(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewtablename(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getQuerystr();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getNewtablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
};


/**
 * optional string queryStr = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse.prototype.getQuerystr = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse.prototype.setQuerystr = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string newTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse.prototype.getNewtablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.GenRowNumResponse.prototype.setNewtablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.ProjectRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.ProjectRequest';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ProjectRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    columnsList: jspb.Message.getRepeatedField(msg, 1),
    srctablename: jspb.Message.getFieldWithDefault(msg, 2, ""),
    dsttablename: jspb.Message.getFieldWithDefault(msg, 3, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ProjectRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.ProjectRequest;
  return proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ProjectRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ProjectRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.addColumns(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setSrctablename(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setDsttablename(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ProjectRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getColumnsList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      1,
      f
    );
  }
  f = message.getSrctablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getDsttablename();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
};


/**
 * repeated string columns = 1;
 * @return {!Array<string>}
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.prototype.getColumnsList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 1));
};


/** @param {!Array<string>} value */
proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.prototype.setColumnsList = function(value) {
  jspb.Message.setField(this, 1, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.prototype.addColumns = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 1, value, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.prototype.clearColumnsList = function() {
  this.setColumnsList([]);
};


/**
 * optional string srcTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.prototype.getSrctablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.prototype.setSrctablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string dstTableName = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.prototype.getDsttablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ProjectRequest.prototype.setDsttablename = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.ProjectResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.ProjectResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.ProjectResponse';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.ProjectResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ProjectResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    querystr: jspb.Message.getFieldWithDefault(msg, 1, ""),
    newtablename: jspb.Message.getFieldWithDefault(msg, 2, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ProjectResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.ProjectResponse;
  return proto.xcalar.compute.localtypes.Dataflow.ProjectResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ProjectResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ProjectResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setQuerystr(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewtablename(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.ProjectResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ProjectResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getQuerystr();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getNewtablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
};


/**
 * optional string queryStr = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectResponse.prototype.getQuerystr = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ProjectResponse.prototype.setQuerystr = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string newTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ProjectResponse.prototype.getNewtablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ProjectResponse.prototype.setNewtablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.AggColInfo = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.AggColInfo, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.AggColInfo.displayName = 'proto.xcalar.compute.localtypes.Dataflow.AggColInfo';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.AggColInfo.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.AggColInfo.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.AggColInfo} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.AggColInfo.toObject = function(includeInstance, msg) {
  var f, obj = {
    operator: jspb.Message.getFieldWithDefault(msg, 1, ""),
    aggcolname: jspb.Message.getFieldWithDefault(msg, 2, ""),
    newcolname: jspb.Message.getFieldWithDefault(msg, 3, ""),
    isdistinct: jspb.Message.getFieldWithDefault(msg, 4, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.AggColInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.AggColInfo.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.AggColInfo;
  return proto.xcalar.compute.localtypes.Dataflow.AggColInfo.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.AggColInfo} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.AggColInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.AggColInfo.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setOperator(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setAggcolname(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewcolname(value);
      break;
    case 4:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setIsdistinct(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.AggColInfo.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.AggColInfo.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.AggColInfo} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.AggColInfo.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getOperator();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getAggcolname();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getNewcolname();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getIsdistinct();
  if (f) {
    writer.writeBool(
      4,
      f
    );
  }
};


/**
 * optional string operator = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.AggColInfo.prototype.getOperator = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.AggColInfo.prototype.setOperator = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string aggColName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.AggColInfo.prototype.getAggcolname = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.AggColInfo.prototype.setAggcolname = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string newColName = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.AggColInfo.prototype.getNewcolname = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.AggColInfo.prototype.setNewcolname = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * optional bool isDistinct = 4;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.AggColInfo.prototype.getIsdistinct = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 4, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.AggColInfo.prototype.setIsdistinct = function(value) {
  jspb.Message.setProto3BooleanField(this, 4, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.GroupByOptions, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.displayName = 'proto.xcalar.compute.localtypes.Dataflow.GroupByOptions';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.repeatedFields_ = [7,8];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GroupByOptions} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.toObject = function(includeInstance, msg) {
  var f, obj = {
    newtablename: jspb.Message.getFieldWithDefault(msg, 1, ""),
    groupall: jspb.Message.getFieldWithDefault(msg, 2, false),
    icvmode: jspb.Message.getFieldWithDefault(msg, 3, false),
    dhtname: jspb.Message.getFieldWithDefault(msg, 4, ""),
    clean: jspb.Message.getFieldWithDefault(msg, 5, false),
    isincsample: jspb.Message.getFieldWithDefault(msg, 6, false),
    samplecolsList: jspb.Message.getRepeatedField(msg, 7),
    newkeysList: jspb.Message.getRepeatedField(msg, 8)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.GroupByOptions}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.GroupByOptions;
  return proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GroupByOptions} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.GroupByOptions}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewtablename(value);
      break;
    case 2:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setGroupall(value);
      break;
    case 3:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setIcvmode(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.setDhtname(value);
      break;
    case 5:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setClean(value);
      break;
    case 6:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setIsincsample(value);
      break;
    case 7:
      var value = /** @type {!Array<number>} */ (reader.readPackedUint64());
      msg.setSamplecolsList(value);
      break;
    case 8:
      var value = /** @type {string} */ (reader.readString());
      msg.addNewkeys(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GroupByOptions} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getNewtablename();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getGroupall();
  if (f) {
    writer.writeBool(
      2,
      f
    );
  }
  f = message.getIcvmode();
  if (f) {
    writer.writeBool(
      3,
      f
    );
  }
  f = message.getDhtname();
  if (f.length > 0) {
    writer.writeString(
      4,
      f
    );
  }
  f = message.getClean();
  if (f) {
    writer.writeBool(
      5,
      f
    );
  }
  f = message.getIsincsample();
  if (f) {
    writer.writeBool(
      6,
      f
    );
  }
  f = message.getSamplecolsList();
  if (f.length > 0) {
    writer.writePackedUint64(
      7,
      f
    );
  }
  f = message.getNewkeysList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      8,
      f
    );
  }
};


/**
 * optional string newTableName = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.getNewtablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.setNewtablename = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional bool groupAll = 2;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.getGroupall = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 2, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.setGroupall = function(value) {
  jspb.Message.setProto3BooleanField(this, 2, value);
};


/**
 * optional bool icvMode = 3;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.getIcvmode = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 3, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.setIcvmode = function(value) {
  jspb.Message.setProto3BooleanField(this, 3, value);
};


/**
 * optional string dhtName = 4;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.getDhtname = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 4, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.setDhtname = function(value) {
  jspb.Message.setProto3StringField(this, 4, value);
};


/**
 * optional bool clean = 5;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.getClean = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 5, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.setClean = function(value) {
  jspb.Message.setProto3BooleanField(this, 5, value);
};


/**
 * optional bool isIncSample = 6;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.getIsincsample = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 6, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.setIsincsample = function(value) {
  jspb.Message.setProto3BooleanField(this, 6, value);
};


/**
 * repeated uint64 sampleCols = 7;
 * @return {!Array<number>}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.getSamplecolsList = function() {
  return /** @type {!Array<number>} */ (jspb.Message.getRepeatedField(this, 7));
};


/** @param {!Array<number>} value */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.setSamplecolsList = function(value) {
  jspb.Message.setField(this, 7, value || []);
};


/**
 * @param {!number} value
 * @param {number=} opt_index
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.addSamplecols = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 7, value, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.clearSamplecolsList = function() {
  this.setSamplecolsList([]);
};


/**
 * repeated string newKeys = 8;
 * @return {!Array<string>}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.getNewkeysList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 8));
};


/** @param {!Array<string>} value */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.setNewkeysList = function(value) {
  jspb.Message.setField(this, 8, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.addNewkeys = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 8, value, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.prototype.clearNewkeysList = function() {
  this.setNewkeysList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.GroupByRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.GroupByRequest';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.repeatedFields_ = [1,2];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GroupByRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    aggargsList: jspb.Message.toObjectList(msg.getAggargsList(),
    proto.xcalar.compute.localtypes.Dataflow.AggColInfo.toObject, includeInstance),
    groupbycolsList: jspb.Message.getRepeatedField(msg, 2),
    srctablename: jspb.Message.getFieldWithDefault(msg, 3, ""),
    options: (f = msg.getOptions()) && proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.GroupByRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.GroupByRequest;
  return proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GroupByRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.GroupByRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.xcalar.compute.localtypes.Dataflow.AggColInfo;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Dataflow.AggColInfo.deserializeBinaryFromReader);
      msg.addAggargs(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.addGroupbycols(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setSrctablename(value);
      break;
    case 4:
      var value = new proto.xcalar.compute.localtypes.Dataflow.GroupByOptions;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.deserializeBinaryFromReader);
      msg.setOptions(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GroupByRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getAggargsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.xcalar.compute.localtypes.Dataflow.AggColInfo.serializeBinaryToWriter
    );
  }
  f = message.getGroupbycolsList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      2,
      f
    );
  }
  f = message.getSrctablename();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getOptions();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.xcalar.compute.localtypes.Dataflow.GroupByOptions.serializeBinaryToWriter
    );
  }
};


/**
 * repeated AggColInfo aggArgs = 1;
 * @return {!Array<!proto.xcalar.compute.localtypes.Dataflow.AggColInfo>}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.prototype.getAggargsList = function() {
  return /** @type{!Array<!proto.xcalar.compute.localtypes.Dataflow.AggColInfo>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.xcalar.compute.localtypes.Dataflow.AggColInfo, 1));
};


/** @param {!Array<!proto.xcalar.compute.localtypes.Dataflow.AggColInfo>} value */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.prototype.setAggargsList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.xcalar.compute.localtypes.Dataflow.AggColInfo=} opt_value
 * @param {number=} opt_index
 * @return {!proto.xcalar.compute.localtypes.Dataflow.AggColInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.prototype.addAggargs = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.xcalar.compute.localtypes.Dataflow.AggColInfo, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.prototype.clearAggargsList = function() {
  this.setAggargsList([]);
};


/**
 * repeated string groupByCols = 2;
 * @return {!Array<string>}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.prototype.getGroupbycolsList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 2));
};


/** @param {!Array<string>} value */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.prototype.setGroupbycolsList = function(value) {
  jspb.Message.setField(this, 2, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.prototype.addGroupbycols = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 2, value, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.prototype.clearGroupbycolsList = function() {
  this.setGroupbycolsList([]);
};


/**
 * optional string srcTableName = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.prototype.getSrctablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.prototype.setSrctablename = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * optional GroupByOptions options = 4;
 * @return {?proto.xcalar.compute.localtypes.Dataflow.GroupByOptions}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.prototype.getOptions = function() {
  return /** @type{?proto.xcalar.compute.localtypes.Dataflow.GroupByOptions} */ (
    jspb.Message.getWrapperField(this, proto.xcalar.compute.localtypes.Dataflow.GroupByOptions, 4));
};


/** @param {?proto.xcalar.compute.localtypes.Dataflow.GroupByOptions|undefined} value */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.prototype.setOptions = function(value) {
  jspb.Message.setWrapperField(this, 4, value);
};


proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.prototype.clearOptions = function() {
  this.setOptions(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByRequest.prototype.hasOptions = function() {
  return jspb.Message.getField(this, 4) != null;
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.GroupByResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.GroupByResponse';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.repeatedFields_ = [4];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GroupByResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    querystr: jspb.Message.getFieldWithDefault(msg, 1, ""),
    newtablename: jspb.Message.getFieldWithDefault(msg, 2, ""),
    newkeyfieldname: jspb.Message.getFieldWithDefault(msg, 3, ""),
    newkeysList: jspb.Message.getRepeatedField(msg, 4)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.GroupByResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.GroupByResponse;
  return proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GroupByResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.GroupByResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setQuerystr(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewtablename(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewkeyfieldname(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.addNewkeys(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GroupByResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getQuerystr();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getNewtablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getNewkeyfieldname();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getNewkeysList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      4,
      f
    );
  }
};


/**
 * optional string queryStr = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.prototype.getQuerystr = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.prototype.setQuerystr = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string newTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.prototype.getNewtablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.prototype.setNewtablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string newKeyFieldName = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.prototype.getNewkeyfieldname = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.prototype.setNewkeyfieldname = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * repeated string newKeys = 4;
 * @return {!Array<string>}
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.prototype.getNewkeysList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 4));
};


/** @param {!Array<string>} value */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.prototype.setNewkeysList = function(value) {
  jspb.Message.setField(this, 4, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.prototype.addNewkeys = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 4, value, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.GroupByResponse.prototype.clearNewkeysList = function() {
  this.setNewkeysList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.displayName = 'proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.toObject = function(includeInstance, msg) {
  var f, obj = {
    orig: jspb.Message.getFieldWithDefault(msg, 1, ""),
    pb_new: jspb.Message.getFieldWithDefault(msg, 2, ""),
    type: jspb.Message.getFieldWithDefault(msg, 3, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo;
  return proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setOrig(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setNew(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setType(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getOrig();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getNew();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getType();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
};


/**
 * optional string orig = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.prototype.getOrig = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.prototype.setOrig = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string new = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.prototype.getNew = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.prototype.setNew = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string type = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.prototype.getType = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.prototype.setType = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.displayName = 'proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.repeatedFields_ = [2,3,4,5,6];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.toObject = function(includeInstance, msg) {
  var f, obj = {
    tablename: jspb.Message.getFieldWithDefault(msg, 1, ""),
    columnsList: jspb.Message.getRepeatedField(msg, 2),
    castsList: jspb.Message.getRepeatedField(msg, 3),
    pulledcolumnsList: jspb.Message.getRepeatedField(msg, 4),
    renameList: jspb.Message.toObjectList(msg.getRenameList(),
    proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.toObject, includeInstance),
    allimmediatesList: jspb.Message.getRepeatedField(msg, 6),
    removenulls: jspb.Message.getFieldWithDefault(msg, 7, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo;
  return proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setTablename(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.addColumns(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.addCasts(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.addPulledcolumns(value);
      break;
    case 5:
      var value = new proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.deserializeBinaryFromReader);
      msg.addRename(value);
      break;
    case 6:
      var value = /** @type {string} */ (reader.readString());
      msg.addAllimmediates(value);
      break;
    case 7:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setRemovenulls(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getTablename();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getColumnsList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      2,
      f
    );
  }
  f = message.getCastsList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      3,
      f
    );
  }
  f = message.getPulledcolumnsList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      4,
      f
    );
  }
  f = message.getRenameList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      5,
      f,
      proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.serializeBinaryToWriter
    );
  }
  f = message.getAllimmediatesList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      6,
      f
    );
  }
  f = message.getRemovenulls();
  if (f) {
    writer.writeBool(
      7,
      f
    );
  }
};


/**
 * optional string tableName = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.getTablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.setTablename = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * repeated string columns = 2;
 * @return {!Array<string>}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.getColumnsList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 2));
};


/** @param {!Array<string>} value */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.setColumnsList = function(value) {
  jspb.Message.setField(this, 2, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.addColumns = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 2, value, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.clearColumnsList = function() {
  this.setColumnsList([]);
};


/**
 * repeated string casts = 3;
 * @return {!Array<string>}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.getCastsList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 3));
};


/** @param {!Array<string>} value */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.setCastsList = function(value) {
  jspb.Message.setField(this, 3, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.addCasts = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 3, value, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.clearCastsList = function() {
  this.setCastsList([]);
};


/**
 * repeated string pulledColumns = 4;
 * @return {!Array<string>}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.getPulledcolumnsList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 4));
};


/** @param {!Array<string>} value */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.setPulledcolumnsList = function(value) {
  jspb.Message.setField(this, 4, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.addPulledcolumns = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 4, value, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.clearPulledcolumnsList = function() {
  this.setPulledcolumnsList([]);
};


/**
 * repeated ColRenameInfo rename = 5;
 * @return {!Array<!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo>}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.getRenameList = function() {
  return /** @type{!Array<!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo, 5));
};


/** @param {!Array<!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo>} value */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.setRenameList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 5, value);
};


/**
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo=} opt_value
 * @param {number=} opt_index
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.addRename = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 5, opt_value, proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.clearRenameList = function() {
  this.setRenameList([]);
};


/**
 * repeated string allImmediates = 6;
 * @return {!Array<string>}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.getAllimmediatesList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 6));
};


/** @param {!Array<string>} value */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.setAllimmediatesList = function(value) {
  jspb.Message.setField(this, 6, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.addAllimmediates = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 6, value, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.clearAllimmediatesList = function() {
  this.setAllimmediatesList([]);
};


/**
 * optional bool removeNulls = 7;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.getRemovenulls = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 7, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.prototype.setRemovenulls = function(value) {
  jspb.Message.setProto3BooleanField(this, 7, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.JoinOptions, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.JoinOptions.displayName = 'proto.xcalar.compute.localtypes.Dataflow.JoinOptions';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.JoinOptions.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.JoinOptions} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions.toObject = function(includeInstance, msg) {
  var f, obj = {
    newtablename: jspb.Message.getFieldWithDefault(msg, 1, ""),
    clean: jspb.Message.getFieldWithDefault(msg, 2, false),
    evalstr: jspb.Message.getFieldWithDefault(msg, 3, ""),
    existencecol: jspb.Message.getFieldWithDefault(msg, 4, ""),
    keepallcolumns: jspb.Message.getFieldWithDefault(msg, 5, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.JoinOptions}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.JoinOptions;
  return proto.xcalar.compute.localtypes.Dataflow.JoinOptions.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.JoinOptions} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.JoinOptions}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewtablename(value);
      break;
    case 2:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setClean(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setEvalstr(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.setExistencecol(value);
      break;
    case 5:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setKeepallcolumns(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.JoinOptions.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.JoinOptions} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getNewtablename();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getClean();
  if (f) {
    writer.writeBool(
      2,
      f
    );
  }
  f = message.getEvalstr();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getExistencecol();
  if (f.length > 0) {
    writer.writeString(
      4,
      f
    );
  }
  f = message.getKeepallcolumns();
  if (f) {
    writer.writeBool(
      5,
      f
    );
  }
};


/**
 * optional string newTableName = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions.prototype.getNewtablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions.prototype.setNewtablename = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional bool clean = 2;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions.prototype.getClean = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 2, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions.prototype.setClean = function(value) {
  jspb.Message.setProto3BooleanField(this, 2, value);
};


/**
 * optional string evalStr = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions.prototype.getEvalstr = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions.prototype.setEvalstr = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * optional string existenceCol = 4;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions.prototype.getExistencecol = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 4, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions.prototype.setExistencecol = function(value) {
  jspb.Message.setProto3StringField(this, 4, value);
};


/**
 * optional bool keepAllColumns = 5;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions.prototype.getKeepallcolumns = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 5, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.JoinOptions.prototype.setKeepallcolumns = function(value) {
  jspb.Message.setProto3BooleanField(this, 5, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.JoinRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.JoinRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.JoinRequest';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.JoinRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.JoinRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    jointype: jspb.Message.getFieldWithDefault(msg, 1, 0),
    ltableinfo: (f = msg.getLtableinfo()) && proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.toObject(includeInstance, f),
    rtableinfo: (f = msg.getRtableinfo()) && proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.toObject(includeInstance, f),
    options: (f = msg.getOptions()) && proto.xcalar.compute.localtypes.Dataflow.JoinOptions.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.JoinRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.JoinRequest;
  return proto.xcalar.compute.localtypes.Dataflow.JoinRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.JoinRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.JoinRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readUint32());
      msg.setJointype(value);
      break;
    case 2:
      var value = new proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.deserializeBinaryFromReader);
      msg.setLtableinfo(value);
      break;
    case 3:
      var value = new proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.deserializeBinaryFromReader);
      msg.setRtableinfo(value);
      break;
    case 4:
      var value = new proto.xcalar.compute.localtypes.Dataflow.JoinOptions;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Dataflow.JoinOptions.deserializeBinaryFromReader);
      msg.setOptions(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.JoinRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.JoinRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getJointype();
  if (f !== 0) {
    writer.writeUint32(
      1,
      f
    );
  }
  f = message.getLtableinfo();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.serializeBinaryToWriter
    );
  }
  f = message.getRtableinfo();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo.serializeBinaryToWriter
    );
  }
  f = message.getOptions();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.xcalar.compute.localtypes.Dataflow.JoinOptions.serializeBinaryToWriter
    );
  }
};


/**
 * optional uint32 joinType = 1;
 * @return {number}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.prototype.getJointype = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.prototype.setJointype = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional JoinTableInfo lTableInfo = 2;
 * @return {?proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.prototype.getLtableinfo = function() {
  return /** @type{?proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo} */ (
    jspb.Message.getWrapperField(this, proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo, 2));
};


/** @param {?proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo|undefined} value */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.prototype.setLtableinfo = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.xcalar.compute.localtypes.Dataflow.JoinRequest.prototype.clearLtableinfo = function() {
  this.setLtableinfo(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.prototype.hasLtableinfo = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional JoinTableInfo rTableInfo = 3;
 * @return {?proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.prototype.getRtableinfo = function() {
  return /** @type{?proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo} */ (
    jspb.Message.getWrapperField(this, proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo, 3));
};


/** @param {?proto.xcalar.compute.localtypes.Dataflow.JoinTableInfo|undefined} value */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.prototype.setRtableinfo = function(value) {
  jspb.Message.setWrapperField(this, 3, value);
};


proto.xcalar.compute.localtypes.Dataflow.JoinRequest.prototype.clearRtableinfo = function() {
  this.setRtableinfo(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.prototype.hasRtableinfo = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional JoinOptions options = 4;
 * @return {?proto.xcalar.compute.localtypes.Dataflow.JoinOptions}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.prototype.getOptions = function() {
  return /** @type{?proto.xcalar.compute.localtypes.Dataflow.JoinOptions} */ (
    jspb.Message.getWrapperField(this, proto.xcalar.compute.localtypes.Dataflow.JoinOptions, 4));
};


/** @param {?proto.xcalar.compute.localtypes.Dataflow.JoinOptions|undefined} value */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.prototype.setOptions = function(value) {
  jspb.Message.setWrapperField(this, 4, value);
};


proto.xcalar.compute.localtypes.Dataflow.JoinRequest.prototype.clearOptions = function() {
  this.setOptions(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinRequest.prototype.hasOptions = function() {
  return jspb.Message.getField(this, 4) != null;
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.JoinResponse.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.JoinResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.JoinResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.JoinResponse';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.repeatedFields_ = [3,4];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.JoinResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.JoinResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    querystr: jspb.Message.getFieldWithDefault(msg, 1, ""),
    newtablename: jspb.Message.getFieldWithDefault(msg, 2, ""),
    lrenameList: jspb.Message.toObjectList(msg.getLrenameList(),
    proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.toObject, includeInstance),
    rrenameList: jspb.Message.toObjectList(msg.getRrenameList(),
    proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.JoinResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.JoinResponse;
  return proto.xcalar.compute.localtypes.Dataflow.JoinResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.JoinResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.JoinResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setQuerystr(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewtablename(value);
      break;
    case 3:
      var value = new proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.deserializeBinaryFromReader);
      msg.addLrename(value);
      break;
    case 4:
      var value = new proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.deserializeBinaryFromReader);
      msg.addRrename(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.JoinResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.JoinResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getQuerystr();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getNewtablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getLrenameList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      3,
      f,
      proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.serializeBinaryToWriter
    );
  }
  f = message.getRrenameList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      4,
      f,
      proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.serializeBinaryToWriter
    );
  }
};


/**
 * optional string queryStr = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.prototype.getQuerystr = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.prototype.setQuerystr = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string newTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.prototype.getNewtablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.prototype.setNewtablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * repeated ColRenameInfo lRename = 3;
 * @return {!Array<!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo>}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.prototype.getLrenameList = function() {
  return /** @type{!Array<!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo, 3));
};


/** @param {!Array<!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo>} value */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.prototype.setLrenameList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 3, value);
};


/**
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo=} opt_value
 * @param {number=} opt_index
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.prototype.addLrename = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 3, opt_value, proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.JoinResponse.prototype.clearLrenameList = function() {
  this.setLrenameList([]);
};


/**
 * repeated ColRenameInfo rRename = 4;
 * @return {!Array<!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo>}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.prototype.getRrenameList = function() {
  return /** @type{!Array<!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo, 4));
};


/** @param {!Array<!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo>} value */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.prototype.setRrenameList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 4, value);
};


/**
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo=} opt_value
 * @param {number=} opt_index
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.JoinResponse.prototype.addRrename = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 4, opt_value, proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.JoinResponse.prototype.clearRrenameList = function() {
  this.setRrenameList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.UnionColInfo = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.UnionColInfo, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.displayName = 'proto.xcalar.compute.localtypes.Dataflow.UnionColInfo';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionColInfo} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.toObject = function(includeInstance, msg) {
  var f, obj = {
    name: jspb.Message.getFieldWithDefault(msg, 1, ""),
    rename: jspb.Message.getFieldWithDefault(msg, 2, ""),
    type: jspb.Message.getFieldWithDefault(msg, 3, ""),
    cast: jspb.Message.getFieldWithDefault(msg, 4, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.UnionColInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.UnionColInfo;
  return proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionColInfo} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.UnionColInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setRename(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setType(value);
      break;
    case 4:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setCast(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionColInfo} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getRename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getType();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getCast();
  if (f) {
    writer.writeBool(
      4,
      f
    );
  }
};


/**
 * optional string name = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.prototype.setName = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string rename = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.prototype.getRename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.prototype.setRename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string type = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.prototype.getType = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.prototype.setType = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * optional bool cast = 4;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.prototype.getCast = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 4, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.prototype.setCast = function(value) {
  jspb.Message.setProto3BooleanField(this, 4, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.displayName = 'proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.repeatedFields_ = [2];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.toObject = function(includeInstance, msg) {
  var f, obj = {
    tablename: jspb.Message.getFieldWithDefault(msg, 1, ""),
    columnsList: jspb.Message.toObjectList(msg.getColumnsList(),
    proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo;
  return proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setTablename(value);
      break;
    case 2:
      var value = new proto.xcalar.compute.localtypes.Dataflow.UnionColInfo;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.deserializeBinaryFromReader);
      msg.addColumns(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getTablename();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getColumnsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      2,
      f,
      proto.xcalar.compute.localtypes.Dataflow.UnionColInfo.serializeBinaryToWriter
    );
  }
};


/**
 * optional string tableName = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.prototype.getTablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.prototype.setTablename = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * repeated UnionColInfo columns = 2;
 * @return {!Array<!proto.xcalar.compute.localtypes.Dataflow.UnionColInfo>}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.prototype.getColumnsList = function() {
  return /** @type{!Array<!proto.xcalar.compute.localtypes.Dataflow.UnionColInfo>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.xcalar.compute.localtypes.Dataflow.UnionColInfo, 2));
};


/** @param {!Array<!proto.xcalar.compute.localtypes.Dataflow.UnionColInfo>} value */
proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.prototype.setColumnsList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 2, value);
};


/**
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionColInfo=} opt_value
 * @param {number=} opt_index
 * @return {!proto.xcalar.compute.localtypes.Dataflow.UnionColInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.prototype.addColumns = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 2, opt_value, proto.xcalar.compute.localtypes.Dataflow.UnionColInfo, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.prototype.clearColumnsList = function() {
  this.setColumnsList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.UnionRequest.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.UnionRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.UnionRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.UnionRequest';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.UnionRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    tableinfosList: jspb.Message.toObjectList(msg.getTableinfosList(),
    proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.toObject, includeInstance),
    dedup: jspb.Message.getFieldWithDefault(msg, 2, false),
    newtablename: jspb.Message.getFieldWithDefault(msg, 3, ""),
    uniontype: jspb.Message.getFieldWithDefault(msg, 4, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.UnionRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.UnionRequest;
  return proto.xcalar.compute.localtypes.Dataflow.UnionRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.UnionRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.deserializeBinaryFromReader);
      msg.addTableinfos(value);
      break;
    case 2:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setDedup(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewtablename(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readUint32());
      msg.setUniontype(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.UnionRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getTableinfosList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo.serializeBinaryToWriter
    );
  }
  f = message.getDedup();
  if (f) {
    writer.writeBool(
      2,
      f
    );
  }
  f = message.getNewtablename();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getUniontype();
  if (f !== 0) {
    writer.writeUint32(
      4,
      f
    );
  }
};


/**
 * repeated UnionTableInfo tableInfos = 1;
 * @return {!Array<!proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo>}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest.prototype.getTableinfosList = function() {
  return /** @type{!Array<!proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo, 1));
};


/** @param {!Array<!proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo>} value */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest.prototype.setTableinfosList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo=} opt_value
 * @param {number=} opt_index
 * @return {!proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest.prototype.addTableinfos = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.xcalar.compute.localtypes.Dataflow.UnionTableInfo, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.UnionRequest.prototype.clearTableinfosList = function() {
  this.setTableinfosList([]);
};


/**
 * optional bool dedup = 2;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest.prototype.getDedup = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 2, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest.prototype.setDedup = function(value) {
  jspb.Message.setProto3BooleanField(this, 2, value);
};


/**
 * optional string newTableName = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest.prototype.getNewtablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest.prototype.setNewtablename = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * optional uint32 unionType = 4;
 * @return {number}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest.prototype.getUniontype = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.xcalar.compute.localtypes.Dataflow.UnionRequest.prototype.setUniontype = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.UnionResponse.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.UnionResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.UnionResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.UnionResponse';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.repeatedFields_ = [3];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.UnionResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    querystr: jspb.Message.getFieldWithDefault(msg, 1, ""),
    newtablename: jspb.Message.getFieldWithDefault(msg, 2, ""),
    newtablecolsList: jspb.Message.toObjectList(msg.getNewtablecolsList(),
    proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.UnionResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.UnionResponse;
  return proto.xcalar.compute.localtypes.Dataflow.UnionResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.UnionResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setQuerystr(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewtablename(value);
      break;
    case 3:
      var value = new proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.deserializeBinaryFromReader);
      msg.addNewtablecols(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.UnionResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getQuerystr();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getNewtablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getNewtablecolsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      3,
      f,
      proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.serializeBinaryToWriter
    );
  }
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.displayName = 'proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.toObject = function(includeInstance, msg) {
  var f, obj = {
    rename: jspb.Message.getFieldWithDefault(msg, 1, ""),
    type: jspb.Message.getFieldWithDefault(msg, 2, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo;
  return proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setRename(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setType(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getRename();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getType();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
};


/**
 * optional string rename = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.prototype.getRename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.prototype.setRename = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string type = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.prototype.getType = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo.prototype.setType = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string queryStr = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.prototype.getQuerystr = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.prototype.setQuerystr = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string newTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.prototype.getNewtablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.prototype.setNewtablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * repeated RenameInfo newTableCols = 3;
 * @return {!Array<!proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo>}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.prototype.getNewtablecolsList = function() {
  return /** @type{!Array<!proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo, 3));
};


/** @param {!Array<!proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo>} value */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.prototype.setNewtablecolsList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 3, value);
};


/**
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo=} opt_value
 * @param {number=} opt_index
 * @return {!proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.UnionResponse.prototype.addNewtablecols = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 3, opt_value, proto.xcalar.compute.localtypes.Dataflow.UnionResponse.RenameInfo, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.UnionResponse.prototype.clearNewtablecolsList = function() {
  this.setNewtablecolsList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.IndexRequest.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.IndexRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.IndexRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.IndexRequest';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.repeatedFields_ = [1,4];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.IndexRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.IndexRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    colnamesList: jspb.Message.getRepeatedField(msg, 1),
    srctablename: jspb.Message.getFieldWithDefault(msg, 2, ""),
    dsttablename: jspb.Message.getFieldWithDefault(msg, 3, ""),
    newkeysList: jspb.Message.getRepeatedField(msg, 4),
    dhtname: jspb.Message.getFieldWithDefault(msg, 5, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.IndexRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.IndexRequest;
  return proto.xcalar.compute.localtypes.Dataflow.IndexRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.IndexRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.IndexRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.addColnames(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setSrctablename(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setDsttablename(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.addNewkeys(value);
      break;
    case 5:
      var value = /** @type {string} */ (reader.readString());
      msg.setDhtname(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.IndexRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.IndexRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getColnamesList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      1,
      f
    );
  }
  f = message.getSrctablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getDsttablename();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getNewkeysList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      4,
      f
    );
  }
  f = message.getDhtname();
  if (f.length > 0) {
    writer.writeString(
      5,
      f
    );
  }
};


/**
 * repeated string colNames = 1;
 * @return {!Array<string>}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.prototype.getColnamesList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 1));
};


/** @param {!Array<string>} value */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.prototype.setColnamesList = function(value) {
  jspb.Message.setField(this, 1, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.prototype.addColnames = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 1, value, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.IndexRequest.prototype.clearColnamesList = function() {
  this.setColnamesList([]);
};


/**
 * optional string srcTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.prototype.getSrctablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.prototype.setSrctablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string dstTableName = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.prototype.getDsttablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.prototype.setDsttablename = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * repeated string newKeys = 4;
 * @return {!Array<string>}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.prototype.getNewkeysList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 4));
};


/** @param {!Array<string>} value */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.prototype.setNewkeysList = function(value) {
  jspb.Message.setField(this, 4, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.prototype.addNewkeys = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 4, value, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.IndexRequest.prototype.clearNewkeysList = function() {
  this.setNewkeysList([]);
};


/**
 * optional string dhtName = 5;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.prototype.getDhtname = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 5, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.IndexRequest.prototype.setDhtname = function(value) {
  jspb.Message.setProto3StringField(this, 5, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.IndexResponse.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.IndexResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.IndexResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.IndexResponse';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse.repeatedFields_ = [4];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.IndexResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.IndexResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    querystr: jspb.Message.getFieldWithDefault(msg, 1, ""),
    newtablename: jspb.Message.getFieldWithDefault(msg, 2, ""),
    iscache: jspb.Message.getFieldWithDefault(msg, 3, false),
    newkeysList: jspb.Message.getRepeatedField(msg, 4)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.IndexResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.IndexResponse;
  return proto.xcalar.compute.localtypes.Dataflow.IndexResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.IndexResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.IndexResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setQuerystr(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewtablename(value);
      break;
    case 3:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setIscache(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.addNewkeys(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.IndexResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.IndexResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getQuerystr();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getNewtablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getIscache();
  if (f) {
    writer.writeBool(
      3,
      f
    );
  }
  f = message.getNewkeysList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      4,
      f
    );
  }
};


/**
 * optional string queryStr = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse.prototype.getQuerystr = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse.prototype.setQuerystr = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string newTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse.prototype.getNewtablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse.prototype.setNewtablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional bool isCache = 3;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse.prototype.getIscache = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 3, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse.prototype.setIscache = function(value) {
  jspb.Message.setProto3BooleanField(this, 3, value);
};


/**
 * repeated string newKeys = 4;
 * @return {!Array<string>}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse.prototype.getNewkeysList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 4));
};


/** @param {!Array<string>} value */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse.prototype.setNewkeysList = function(value) {
  jspb.Message.setField(this, 4, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.xcalar.compute.localtypes.Dataflow.IndexResponse.prototype.addNewkeys = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 4, value, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.IndexResponse.prototype.clearNewkeysList = function() {
  this.setNewkeysList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    dsname: jspb.Message.getFieldWithDefault(msg, 1, ""),
    dsttablename: jspb.Message.getFieldWithDefault(msg, 2, ""),
    prefix: jspb.Message.getFieldWithDefault(msg, 3, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest;
  return proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setDsname(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setDsttablename(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setPrefix(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getDsname();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getDsttablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getPrefix();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
};


/**
 * optional string dsName = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest.prototype.getDsname = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest.prototype.setDsname = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string dstTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest.prototype.getDsttablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest.prototype.setDsttablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string prefix = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest.prototype.getPrefix = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest.prototype.setPrefix = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    querystr: jspb.Message.getFieldWithDefault(msg, 1, ""),
    newtablename: jspb.Message.getFieldWithDefault(msg, 2, ""),
    prefix: jspb.Message.getFieldWithDefault(msg, 3, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse;
  return proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setQuerystr(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewtablename(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setPrefix(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getQuerystr();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getNewtablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getPrefix();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
};


/**
 * optional string queryStr = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse.prototype.getQuerystr = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse.prototype.setQuerystr = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string newTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse.prototype.getNewtablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse.prototype.setNewtablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string prefix = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse.prototype.getPrefix = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse.prototype.setPrefix = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.SortRequest.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.SortRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.SortRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.SortRequest';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.SortRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.SortRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    keyinfosList: jspb.Message.toObjectList(msg.getKeyinfosList(),
    proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.toObject, includeInstance),
    srctablename: jspb.Message.getFieldWithDefault(msg, 2, ""),
    dsttablename: jspb.Message.getFieldWithDefault(msg, 3, ""),
    dhtname: jspb.Message.getFieldWithDefault(msg, 4, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.SortRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.SortRequest;
  return proto.xcalar.compute.localtypes.Dataflow.SortRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.SortRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.SortRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.deserializeBinaryFromReader);
      msg.addKeyinfos(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setSrctablename(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setDsttablename(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.setDhtname(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.SortRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.SortRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getKeyinfosList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.serializeBinaryToWriter
    );
  }
  f = message.getSrctablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getDsttablename();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getDhtname();
  if (f.length > 0) {
    writer.writeString(
      4,
      f
    );
  }
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.displayName = 'proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.toObject = function(includeInstance, msg) {
  var f, obj = {
    name: jspb.Message.getFieldWithDefault(msg, 1, ""),
    ordering: jspb.Message.getFieldWithDefault(msg, 2, 0),
    type: jspb.Message.getFieldWithDefault(msg, 3, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo;
  return proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readUint32());
      msg.setOrdering(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setType(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getOrdering();
  if (f !== 0) {
    writer.writeUint32(
      2,
      f
    );
  }
  f = message.getType();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
};


/**
 * optional string name = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.prototype.setName = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional uint32 ordering = 2;
 * @return {number}
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.prototype.getOrdering = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 2, 0));
};


/** @param {number} value */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.prototype.setOrdering = function(value) {
  jspb.Message.setProto3IntField(this, 2, value);
};


/**
 * optional string type = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.prototype.getType = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo.prototype.setType = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * repeated keyInfo keyInfos = 1;
 * @return {!Array<!proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo>}
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.prototype.getKeyinfosList = function() {
  return /** @type{!Array<!proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo, 1));
};


/** @param {!Array<!proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo>} value */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.prototype.setKeyinfosList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo=} opt_value
 * @param {number=} opt_index
 * @return {!proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.prototype.addKeyinfos = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.xcalar.compute.localtypes.Dataflow.SortRequest.keyInfo, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.SortRequest.prototype.clearKeyinfosList = function() {
  this.setKeyinfosList([]);
};


/**
 * optional string srcTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.prototype.getSrctablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.prototype.setSrctablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string dstTableName = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.prototype.getDsttablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.prototype.setDsttablename = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * optional string dhtName = 4;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.prototype.getDhtname = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 4, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.SortRequest.prototype.setDhtname = function(value) {
  jspb.Message.setProto3StringField(this, 4, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.SortResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.SortResponse.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.SortResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.SortResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.SortResponse';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.SortResponse.repeatedFields_ = [3];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.SortResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.SortResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.SortResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.SortResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    querystr: jspb.Message.getFieldWithDefault(msg, 1, ""),
    newtablename: jspb.Message.getFieldWithDefault(msg, 2, ""),
    newkeysList: jspb.Message.getRepeatedField(msg, 3)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.SortResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.SortResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.SortResponse;
  return proto.xcalar.compute.localtypes.Dataflow.SortResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.SortResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.SortResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.SortResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setQuerystr(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewtablename(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.addNewkeys(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.SortResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.SortResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.SortResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.SortResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getQuerystr();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getNewtablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getNewkeysList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      3,
      f
    );
  }
};


/**
 * optional string queryStr = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.SortResponse.prototype.getQuerystr = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.SortResponse.prototype.setQuerystr = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string newTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.SortResponse.prototype.getNewtablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.SortResponse.prototype.setNewtablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * repeated string newKeys = 3;
 * @return {!Array<string>}
 */
proto.xcalar.compute.localtypes.Dataflow.SortResponse.prototype.getNewkeysList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 3));
};


/** @param {!Array<string>} value */
proto.xcalar.compute.localtypes.Dataflow.SortResponse.prototype.setNewkeysList = function(value) {
  jspb.Message.setField(this, 3, value || []);
};


/**
 * @param {!string} value
 * @param {number=} opt_index
 */
proto.xcalar.compute.localtypes.Dataflow.SortResponse.prototype.addNewkeys = function(value, opt_index) {
  jspb.Message.addToRepeatedField(this, 3, value, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.SortResponse.prototype.clearNewkeysList = function() {
  this.setNewkeysList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    colinfosList: jspb.Message.toObjectList(msg.getColinfosList(),
    proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.toObject, includeInstance),
    srctablename: jspb.Message.getFieldWithDefault(msg, 2, ""),
    dsttablename: jspb.Message.getFieldWithDefault(msg, 3, ""),
    samesession: jspb.Message.getFieldWithDefault(msg, 4, false)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest;
  return proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.deserializeBinaryFromReader);
      msg.addColinfos(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setSrctablename(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setDsttablename(value);
      break;
    case 4:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setSamesession(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getColinfosList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo.serializeBinaryToWriter
    );
  }
  f = message.getSrctablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getDsttablename();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getSamesession();
  if (f) {
    writer.writeBool(
      4,
      f
    );
  }
};


/**
 * repeated ColRenameInfo colInfos = 1;
 * @return {!Array<!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo>}
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.prototype.getColinfosList = function() {
  return /** @type{!Array<!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo, 1));
};


/** @param {!Array<!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo>} value */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.prototype.setColinfosList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo=} opt_value
 * @param {number=} opt_index
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo}
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.prototype.addColinfos = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.xcalar.compute.localtypes.Dataflow.ColRenameInfo, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.prototype.clearColinfosList = function() {
  this.setColinfosList([]);
};


/**
 * optional string srcTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.prototype.getSrctablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.prototype.setSrctablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string dstTableName = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.prototype.getDsttablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.prototype.setDsttablename = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * optional bool sameSession = 4;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.prototype.getSamesession = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 4, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeRequest.prototype.setSamesession = function(value) {
  jspb.Message.setProto3BooleanField(this, 4, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    querystr: jspb.Message.getFieldWithDefault(msg, 1, ""),
    newtablename: jspb.Message.getFieldWithDefault(msg, 2, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse;
  return proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setQuerystr(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setNewtablename(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getQuerystr();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getNewtablename();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
};


/**
 * optional string queryStr = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse.prototype.getQuerystr = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse.prototype.setQuerystr = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string newTableName = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse.prototype.getNewtablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.SynthesizeResponse.prototype.setNewtablename = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.Parameter = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.Parameter, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.Parameter.displayName = 'proto.xcalar.compute.localtypes.Dataflow.Parameter';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.Parameter.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.Parameter.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.Parameter} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.Parameter.toObject = function(includeInstance, msg) {
  var f, obj = {
    name: jspb.Message.getFieldWithDefault(msg, 1, ""),
    value: jspb.Message.getFieldWithDefault(msg, 2, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.Parameter}
 */
proto.xcalar.compute.localtypes.Dataflow.Parameter.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.Parameter;
  return proto.xcalar.compute.localtypes.Dataflow.Parameter.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.Parameter} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.Parameter}
 */
proto.xcalar.compute.localtypes.Dataflow.Parameter.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setValue(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.Parameter.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.Parameter.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.Parameter} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.Parameter.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getValue();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
};


/**
 * optional string name = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.Parameter.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.Parameter.prototype.setName = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string value = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.Parameter.prototype.getValue = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.Parameter.prototype.setValue = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.repeatedFields_ = [8];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    dataflowName: jspb.Message.getFieldWithDefault(msg, 1, ""),
    queryName: jspb.Message.getFieldWithDefault(msg, 2, ""),
    scope: (f = msg.getScope()) && xcalar_compute_localtypes_Workbook_pb.WorkbookScope.toObject(includeInstance, f),
    udfUserName: jspb.Message.getFieldWithDefault(msg, 4, ""),
    udfSessionName: jspb.Message.getFieldWithDefault(msg, 5, ""),
    isAsync: jspb.Message.getFieldWithDefault(msg, 6, false),
    schedName: jspb.Message.getFieldWithDefault(msg, 7, ""),
    parametersList: jspb.Message.toObjectList(msg.getParametersList(),
    proto.xcalar.compute.localtypes.Dataflow.Parameter.toObject, includeInstance),
    exportToActiveSession: jspb.Message.getFieldWithDefault(msg, 9, false),
    destTable: jspb.Message.getFieldWithDefault(msg, 10, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest;
  return proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setDataflowName(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setQueryName(value);
      break;
    case 3:
      var value = new xcalar_compute_localtypes_Workbook_pb.WorkbookScope;
      reader.readMessage(value,xcalar_compute_localtypes_Workbook_pb.WorkbookScope.deserializeBinaryFromReader);
      msg.setScope(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.setUdfUserName(value);
      break;
    case 5:
      var value = /** @type {string} */ (reader.readString());
      msg.setUdfSessionName(value);
      break;
    case 6:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setIsAsync(value);
      break;
    case 7:
      var value = /** @type {string} */ (reader.readString());
      msg.setSchedName(value);
      break;
    case 8:
      var value = new proto.xcalar.compute.localtypes.Dataflow.Parameter;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Dataflow.Parameter.deserializeBinaryFromReader);
      msg.addParameters(value);
      break;
    case 9:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setExportToActiveSession(value);
      break;
    case 10:
      var value = /** @type {string} */ (reader.readString());
      msg.setDestTable(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getDataflowName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getQueryName();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getScope();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      xcalar_compute_localtypes_Workbook_pb.WorkbookScope.serializeBinaryToWriter
    );
  }
  f = message.getUdfUserName();
  if (f.length > 0) {
    writer.writeString(
      4,
      f
    );
  }
  f = message.getUdfSessionName();
  if (f.length > 0) {
    writer.writeString(
      5,
      f
    );
  }
  f = message.getIsAsync();
  if (f) {
    writer.writeBool(
      6,
      f
    );
  }
  f = message.getSchedName();
  if (f.length > 0) {
    writer.writeString(
      7,
      f
    );
  }
  f = message.getParametersList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      8,
      f,
      proto.xcalar.compute.localtypes.Dataflow.Parameter.serializeBinaryToWriter
    );
  }
  f = message.getExportToActiveSession();
  if (f) {
    writer.writeBool(
      9,
      f
    );
  }
  f = message.getDestTable();
  if (f.length > 0) {
    writer.writeString(
      10,
      f
    );
  }
};


/**
 * optional string dataflow_name = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.getDataflowName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.setDataflowName = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string query_name = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.getQueryName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.setQueryName = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional xcalar.compute.localtypes.Workbook.WorkbookScope scope = 3;
 * @return {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.getScope = function() {
  return /** @type{?proto.xcalar.compute.localtypes.Workbook.WorkbookScope} */ (
    jspb.Message.getWrapperField(this, xcalar_compute_localtypes_Workbook_pb.WorkbookScope, 3));
};


/** @param {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope|undefined} value */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.setScope = function(value) {
  jspb.Message.setWrapperField(this, 3, value);
};


proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.clearScope = function() {
  this.setScope(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.hasScope = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional string udf_user_name = 4;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.getUdfUserName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 4, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.setUdfUserName = function(value) {
  jspb.Message.setProto3StringField(this, 4, value);
};


/**
 * optional string udf_session_name = 5;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.getUdfSessionName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 5, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.setUdfSessionName = function(value) {
  jspb.Message.setProto3StringField(this, 5, value);
};


/**
 * optional bool is_async = 6;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.getIsAsync = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 6, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.setIsAsync = function(value) {
  jspb.Message.setProto3BooleanField(this, 6, value);
};


/**
 * optional string sched_name = 7;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.getSchedName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 7, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.setSchedName = function(value) {
  jspb.Message.setProto3StringField(this, 7, value);
};


/**
 * repeated Parameter parameters = 8;
 * @return {!Array<!proto.xcalar.compute.localtypes.Dataflow.Parameter>}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.getParametersList = function() {
  return /** @type{!Array<!proto.xcalar.compute.localtypes.Dataflow.Parameter>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.xcalar.compute.localtypes.Dataflow.Parameter, 8));
};


/** @param {!Array<!proto.xcalar.compute.localtypes.Dataflow.Parameter>} value */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.setParametersList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 8, value);
};


/**
 * @param {!proto.xcalar.compute.localtypes.Dataflow.Parameter=} opt_value
 * @param {number=} opt_index
 * @return {!proto.xcalar.compute.localtypes.Dataflow.Parameter}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.addParameters = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 8, opt_value, proto.xcalar.compute.localtypes.Dataflow.Parameter, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.clearParametersList = function() {
  this.setParametersList([]);
};


/**
 * optional bool export_to_active_session = 9;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.getExportToActiveSession = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 9, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.setExportToActiveSession = function(value) {
  jspb.Message.setProto3BooleanField(this, 9, value);
};


/**
 * optional string dest_table = 10;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.getDestTable = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 10, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest.prototype.setDestTable = function(value) {
  jspb.Message.setProto3StringField(this, 10, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    queryName: jspb.Message.getFieldWithDefault(msg, 1, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse;
  return proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setQueryName(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getQueryName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
};


/**
 * optional string query_name = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse.prototype.getQueryName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse.prototype.setQueryName = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    listDataflowInput: jspb.Message.getFieldWithDefault(msg, 1, ""),
    scope: (f = msg.getScope()) && xcalar_compute_localtypes_Workbook_pb.WorkbookScope.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest;
  return proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setListDataflowInput(value);
      break;
    case 2:
      var value = new xcalar_compute_localtypes_Workbook_pb.WorkbookScope;
      reader.readMessage(value,xcalar_compute_localtypes_Workbook_pb.WorkbookScope.deserializeBinaryFromReader);
      msg.setScope(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getListDataflowInput();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getScope();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      xcalar_compute_localtypes_Workbook_pb.WorkbookScope.serializeBinaryToWriter
    );
  }
};


/**
 * optional string list_dataflow_input = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest.prototype.getListDataflowInput = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest.prototype.setListDataflowInput = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional xcalar.compute.localtypes.Workbook.WorkbookScope scope = 2;
 * @return {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope}
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest.prototype.getScope = function() {
  return /** @type{?proto.xcalar.compute.localtypes.Workbook.WorkbookScope} */ (
    jspb.Message.getWrapperField(this, xcalar_compute_localtypes_Workbook_pb.WorkbookScope, 2));
};


/** @param {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope|undefined} value */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest.prototype.setScope = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest.prototype.clearScope = function() {
  this.setScope(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowRequest.prototype.hasScope = function() {
  return jspb.Message.getField(this, 2) != null;
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse.repeatedFields_ = [2];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    parametersList: jspb.Message.toObjectList(msg.getParametersList(),
    proto.xcalar.compute.localtypes.Dataflow.Parameter.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse;
  return proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 2:
      var value = new proto.xcalar.compute.localtypes.Dataflow.Parameter;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Dataflow.Parameter.deserializeBinaryFromReader);
      msg.addParameters(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getParametersList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      2,
      f,
      proto.xcalar.compute.localtypes.Dataflow.Parameter.serializeBinaryToWriter
    );
  }
};


/**
 * repeated Parameter parameters = 2;
 * @return {!Array<!proto.xcalar.compute.localtypes.Dataflow.Parameter>}
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse.prototype.getParametersList = function() {
  return /** @type{!Array<!proto.xcalar.compute.localtypes.Dataflow.Parameter>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.xcalar.compute.localtypes.Dataflow.Parameter, 2));
};


/** @param {!Array<!proto.xcalar.compute.localtypes.Dataflow.Parameter>} value */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse.prototype.setParametersList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 2, value);
};


/**
 * @param {!proto.xcalar.compute.localtypes.Dataflow.Parameter=} opt_value
 * @param {number=} opt_index
 * @return {!proto.xcalar.compute.localtypes.Dataflow.Parameter}
 */
proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse.prototype.addParameters = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 2, opt_value, proto.xcalar.compute.localtypes.Dataflow.Parameter, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.ListParametersInDataflowResponse.prototype.clearParametersList = function() {
  this.setParametersList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.ListRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.ListRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.ListRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.ListRequest';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.ListRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.ListRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ListRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ListRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    namePattern: jspb.Message.getFieldWithDefault(msg, 1, ""),
    scope: (f = msg.getScope()) && xcalar_compute_localtypes_Workbook_pb.WorkbookScope.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ListRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.ListRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.ListRequest;
  return proto.xcalar.compute.localtypes.Dataflow.ListRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ListRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ListRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.ListRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setNamePattern(value);
      break;
    case 2:
      var value = new xcalar_compute_localtypes_Workbook_pb.WorkbookScope;
      reader.readMessage(value,xcalar_compute_localtypes_Workbook_pb.WorkbookScope.deserializeBinaryFromReader);
      msg.setScope(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.ListRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.ListRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ListRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ListRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getNamePattern();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getScope();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      xcalar_compute_localtypes_Workbook_pb.WorkbookScope.serializeBinaryToWriter
    );
  }
};


/**
 * optional string name_pattern = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ListRequest.prototype.getNamePattern = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ListRequest.prototype.setNamePattern = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional xcalar.compute.localtypes.Workbook.WorkbookScope scope = 2;
 * @return {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope}
 */
proto.xcalar.compute.localtypes.Dataflow.ListRequest.prototype.getScope = function() {
  return /** @type{?proto.xcalar.compute.localtypes.Workbook.WorkbookScope} */ (
    jspb.Message.getWrapperField(this, xcalar_compute_localtypes_Workbook_pb.WorkbookScope, 2));
};


/** @param {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope|undefined} value */
proto.xcalar.compute.localtypes.Dataflow.ListRequest.prototype.setScope = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.xcalar.compute.localtypes.Dataflow.ListRequest.prototype.clearScope = function() {
  this.setScope(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.ListRequest.prototype.hasScope = function() {
  return jspb.Message.getField(this, 2) != null;
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.DataflowDesc = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.DataflowDesc, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.DataflowDesc.displayName = 'proto.xcalar.compute.localtypes.Dataflow.DataflowDesc';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.DataflowDesc.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.DataflowDesc.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.DataflowDesc} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.DataflowDesc.toObject = function(includeInstance, msg) {
  var f, obj = {
    dataflowName: jspb.Message.getFieldWithDefault(msg, 1, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.DataflowDesc}
 */
proto.xcalar.compute.localtypes.Dataflow.DataflowDesc.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.DataflowDesc;
  return proto.xcalar.compute.localtypes.Dataflow.DataflowDesc.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.DataflowDesc} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.DataflowDesc}
 */
proto.xcalar.compute.localtypes.Dataflow.DataflowDesc.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setDataflowName(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.DataflowDesc.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.DataflowDesc.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.DataflowDesc} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.DataflowDesc.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getDataflowName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
};


/**
 * optional string dataflow_name = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.DataflowDesc.prototype.getDataflowName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.DataflowDesc.prototype.setDataflowName = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.ListResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Dataflow.ListResponse.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.ListResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.ListResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.ListResponse';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Dataflow.ListResponse.repeatedFields_ = [2];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.ListResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.ListResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ListResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ListResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    dataflowDescsList: jspb.Message.toObjectList(msg.getDataflowDescsList(),
    proto.xcalar.compute.localtypes.Dataflow.DataflowDesc.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ListResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.ListResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.ListResponse;
  return proto.xcalar.compute.localtypes.Dataflow.ListResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ListResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ListResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.ListResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 2:
      var value = new proto.xcalar.compute.localtypes.Dataflow.DataflowDesc;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Dataflow.DataflowDesc.deserializeBinaryFromReader);
      msg.addDataflowDescs(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.ListResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.ListResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ListResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ListResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getDataflowDescsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      2,
      f,
      proto.xcalar.compute.localtypes.Dataflow.DataflowDesc.serializeBinaryToWriter
    );
  }
};


/**
 * repeated DataflowDesc dataflow_descs = 2;
 * @return {!Array<!proto.xcalar.compute.localtypes.Dataflow.DataflowDesc>}
 */
proto.xcalar.compute.localtypes.Dataflow.ListResponse.prototype.getDataflowDescsList = function() {
  return /** @type{!Array<!proto.xcalar.compute.localtypes.Dataflow.DataflowDesc>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.xcalar.compute.localtypes.Dataflow.DataflowDesc, 2));
};


/** @param {!Array<!proto.xcalar.compute.localtypes.Dataflow.DataflowDesc>} value */
proto.xcalar.compute.localtypes.Dataflow.ListResponse.prototype.setDataflowDescsList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 2, value);
};


/**
 * @param {!proto.xcalar.compute.localtypes.Dataflow.DataflowDesc=} opt_value
 * @param {number=} opt_index
 * @return {!proto.xcalar.compute.localtypes.Dataflow.DataflowDesc}
 */
proto.xcalar.compute.localtypes.Dataflow.ListResponse.prototype.addDataflowDescs = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 2, opt_value, proto.xcalar.compute.localtypes.Dataflow.DataflowDesc, opt_index);
};


proto.xcalar.compute.localtypes.Dataflow.ListResponse.prototype.clearDataflowDescsList = function() {
  this.setDataflowDescsList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.UpdateRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.UpdateRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.UpdateRequest';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UpdateRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    dataflowName: jspb.Message.getFieldWithDefault(msg, 1, ""),
    dataflowJson: jspb.Message.getFieldWithDefault(msg, 2, ""),
    scope: (f = msg.getScope()) && xcalar_compute_localtypes_Workbook_pb.WorkbookScope.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.UpdateRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.UpdateRequest;
  return proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UpdateRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.UpdateRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setDataflowName(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setDataflowJson(value);
      break;
    case 3:
      var value = new xcalar_compute_localtypes_Workbook_pb.WorkbookScope;
      reader.readMessage(value,xcalar_compute_localtypes_Workbook_pb.WorkbookScope.deserializeBinaryFromReader);
      msg.setScope(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.UpdateRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getDataflowName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getDataflowJson();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getScope();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      xcalar_compute_localtypes_Workbook_pb.WorkbookScope.serializeBinaryToWriter
    );
  }
};


/**
 * optional string dataflow_name = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.prototype.getDataflowName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.prototype.setDataflowName = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string dataflow_json = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.prototype.getDataflowJson = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.prototype.setDataflowJson = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional xcalar.compute.localtypes.Workbook.WorkbookScope scope = 3;
 * @return {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope}
 */
proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.prototype.getScope = function() {
  return /** @type{?proto.xcalar.compute.localtypes.Workbook.WorkbookScope} */ (
    jspb.Message.getWrapperField(this, xcalar_compute_localtypes_Workbook_pb.WorkbookScope, 3));
};


/** @param {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope|undefined} value */
proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.prototype.setScope = function(value) {
  jspb.Message.setWrapperField(this, 3, value);
};


proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.prototype.clearScope = function() {
  this.setScope(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.UpdateRequest.prototype.hasScope = function() {
  return jspb.Message.getField(this, 3) != null;
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    dataflowName: jspb.Message.getFieldWithDefault(msg, 1, ""),
    scope: (f = msg.getScope()) && xcalar_compute_localtypes_Workbook_pb.WorkbookScope.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest;
  return proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setDataflowName(value);
      break;
    case 2:
      var value = new xcalar_compute_localtypes_Workbook_pb.WorkbookScope;
      reader.readMessage(value,xcalar_compute_localtypes_Workbook_pb.WorkbookScope.deserializeBinaryFromReader);
      msg.setScope(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getDataflowName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getScope();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      xcalar_compute_localtypes_Workbook_pb.WorkbookScope.serializeBinaryToWriter
    );
  }
};


/**
 * optional string dataflow_name = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest.prototype.getDataflowName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest.prototype.setDataflowName = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional xcalar.compute.localtypes.Workbook.WorkbookScope scope = 2;
 * @return {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope}
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest.prototype.getScope = function() {
  return /** @type{?proto.xcalar.compute.localtypes.Workbook.WorkbookScope} */ (
    jspb.Message.getWrapperField(this, xcalar_compute_localtypes_Workbook_pb.WorkbookScope, 2));
};


/** @param {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope|undefined} value */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest.prototype.setScope = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest.prototype.clearScope = function() {
  this.setScope(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonRequest.prototype.hasScope = function() {
  return jspb.Message.getField(this, 2) != null;
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    dataflowJson: jspb.Message.getFieldWithDefault(msg, 1, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse;
  return proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setDataflowJson(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getDataflowJson();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
};


/**
 * optional string dataflow_json = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse.prototype.getDataflowJson = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.GetDataflowJsonResponse.prototype.setDataflowJson = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.ImportRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.ImportRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.ImportRequest';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.ImportRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ImportRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    dataflowName: jspb.Message.getFieldWithDefault(msg, 1, ""),
    overwriteExistingUdf: jspb.Message.getFieldWithDefault(msg, 2, false),
    loadDataflowJson: jspb.Message.getFieldWithDefault(msg, 3, false),
    dataflow: msg.getDataflow_asB64(),
    scope: (f = msg.getScope()) && xcalar_compute_localtypes_Workbook_pb.WorkbookScope.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ImportRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.ImportRequest;
  return proto.xcalar.compute.localtypes.Dataflow.ImportRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ImportRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ImportRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setDataflowName(value);
      break;
    case 2:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setOverwriteExistingUdf(value);
      break;
    case 3:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setLoadDataflowJson(value);
      break;
    case 4:
      var value = /** @type {!Uint8Array} */ (reader.readBytes());
      msg.setDataflow(value);
      break;
    case 5:
      var value = new xcalar_compute_localtypes_Workbook_pb.WorkbookScope;
      reader.readMessage(value,xcalar_compute_localtypes_Workbook_pb.WorkbookScope.deserializeBinaryFromReader);
      msg.setScope(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.ImportRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ImportRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getDataflowName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getOverwriteExistingUdf();
  if (f) {
    writer.writeBool(
      2,
      f
    );
  }
  f = message.getLoadDataflowJson();
  if (f) {
    writer.writeBool(
      3,
      f
    );
  }
  f = message.getDataflow_asU8();
  if (f.length > 0) {
    writer.writeBytes(
      4,
      f
    );
  }
  f = message.getScope();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      xcalar_compute_localtypes_Workbook_pb.WorkbookScope.serializeBinaryToWriter
    );
  }
};


/**
 * optional string dataflow_name = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.prototype.getDataflowName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.prototype.setDataflowName = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional bool overwrite_existing_udf = 2;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.prototype.getOverwriteExistingUdf = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 2, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.prototype.setOverwriteExistingUdf = function(value) {
  jspb.Message.setProto3BooleanField(this, 2, value);
};


/**
 * optional bool load_dataflow_json = 3;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.prototype.getLoadDataflowJson = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 3, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.prototype.setLoadDataflowJson = function(value) {
  jspb.Message.setProto3BooleanField(this, 3, value);
};


/**
 * optional bytes dataflow = 4;
 * @return {!(string|Uint8Array)}
 */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.prototype.getDataflow = function() {
  return /** @type {!(string|Uint8Array)} */ (jspb.Message.getFieldWithDefault(this, 4, ""));
};


/**
 * optional bytes dataflow = 4;
 * This is a type-conversion wrapper around `getDataflow()`
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.prototype.getDataflow_asB64 = function() {
  return /** @type {string} */ (jspb.Message.bytesAsB64(
      this.getDataflow()));
};


/**
 * optional bytes dataflow = 4;
 * Note that Uint8Array is not supported on all browsers.
 * @see http://caniuse.com/Uint8Array
 * This is a type-conversion wrapper around `getDataflow()`
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.prototype.getDataflow_asU8 = function() {
  return /** @type {!Uint8Array} */ (jspb.Message.bytesAsU8(
      this.getDataflow()));
};


/** @param {!(string|Uint8Array)} value */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.prototype.setDataflow = function(value) {
  jspb.Message.setProto3BytesField(this, 4, value);
};


/**
 * optional xcalar.compute.localtypes.Workbook.WorkbookScope scope = 5;
 * @return {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope}
 */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.prototype.getScope = function() {
  return /** @type{?proto.xcalar.compute.localtypes.Workbook.WorkbookScope} */ (
    jspb.Message.getWrapperField(this, xcalar_compute_localtypes_Workbook_pb.WorkbookScope, 5));
};


/** @param {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope|undefined} value */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.prototype.setScope = function(value) {
  jspb.Message.setWrapperField(this, 5, value);
};


proto.xcalar.compute.localtypes.Dataflow.ImportRequest.prototype.clearScope = function() {
  this.setScope(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.xcalar.compute.localtypes.Dataflow.ImportRequest.prototype.hasScope = function() {
  return jspb.Message.getField(this, 5) != null;
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.ExportRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.ExportRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.ExportRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.ExportRequest';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.ExportRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.ExportRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ExportRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ExportRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    dataflowName: jspb.Message.getFieldWithDefault(msg, 1, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ExportRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.ExportRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.ExportRequest;
  return proto.xcalar.compute.localtypes.Dataflow.ExportRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ExportRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ExportRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.ExportRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setDataflowName(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.ExportRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.ExportRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ExportRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ExportRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getDataflowName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
};


/**
 * optional string dataflow_name = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ExportRequest.prototype.getDataflowName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.ExportRequest.prototype.setDataflowName = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.ExportResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.ExportResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.ExportResponse.displayName = 'proto.xcalar.compute.localtypes.Dataflow.ExportResponse';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.ExportResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.ExportResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ExportResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ExportResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    dataflow: msg.getDataflow_asB64()
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ExportResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.ExportResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.ExportResponse;
  return proto.xcalar.compute.localtypes.Dataflow.ExportResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ExportResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.ExportResponse}
 */
proto.xcalar.compute.localtypes.Dataflow.ExportResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {!Uint8Array} */ (reader.readBytes());
      msg.setDataflow(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.ExportResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.ExportResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.ExportResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.ExportResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getDataflow_asU8();
  if (f.length > 0) {
    writer.writeBytes(
      1,
      f
    );
  }
};


/**
 * optional bytes dataflow = 1;
 * @return {!(string|Uint8Array)}
 */
proto.xcalar.compute.localtypes.Dataflow.ExportResponse.prototype.getDataflow = function() {
  return /** @type {!(string|Uint8Array)} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * optional bytes dataflow = 1;
 * This is a type-conversion wrapper around `getDataflow()`
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.ExportResponse.prototype.getDataflow_asB64 = function() {
  return /** @type {string} */ (jspb.Message.bytesAsB64(
      this.getDataflow()));
};


/**
 * optional bytes dataflow = 1;
 * Note that Uint8Array is not supported on all browsers.
 * @see http://caniuse.com/Uint8Array
 * This is a type-conversion wrapper around `getDataflow()`
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.ExportResponse.prototype.getDataflow_asU8 = function() {
  return /** @type {!Uint8Array} */ (jspb.Message.bytesAsU8(
      this.getDataflow()));
};


/** @param {!(string|Uint8Array)} value */
proto.xcalar.compute.localtypes.Dataflow.ExportResponse.prototype.setDataflow = function(value) {
  jspb.Message.setProto3BytesField(this, 1, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.Dataflow.DeleteRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Dataflow.DeleteRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Dataflow.DeleteRequest.displayName = 'proto.xcalar.compute.localtypes.Dataflow.DeleteRequest';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Dataflow.DeleteRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Dataflow.DeleteRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Dataflow.DeleteRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.DeleteRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    dataflowName: jspb.Message.getFieldWithDefault(msg, 1, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.DeleteRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.DeleteRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Dataflow.DeleteRequest;
  return proto.xcalar.compute.localtypes.Dataflow.DeleteRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.DeleteRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Dataflow.DeleteRequest}
 */
proto.xcalar.compute.localtypes.Dataflow.DeleteRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setDataflowName(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Dataflow.DeleteRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Dataflow.DeleteRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Dataflow.DeleteRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Dataflow.DeleteRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getDataflowName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
};


/**
 * optional string dataflow_name = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Dataflow.DeleteRequest.prototype.getDataflowName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Dataflow.DeleteRequest.prototype.setDataflowName = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


goog.object.extend(exports, proto.xcalar.compute.localtypes.Dataflow);

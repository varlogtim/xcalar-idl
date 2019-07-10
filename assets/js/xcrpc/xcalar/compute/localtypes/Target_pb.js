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

var xcalar_compute_localtypes_Workbook_pb = require('../../../xcalar/compute/localtypes/Workbook_pb.js');
goog.exportSymbol('proto.xcalar.compute.localtypes.Target.TargetRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Target.TargetResponse', null, global);

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
proto.xcalar.compute.localtypes.Target.TargetRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Target.TargetRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Target.TargetRequest.displayName = 'proto.xcalar.compute.localtypes.Target.TargetRequest';
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
proto.xcalar.compute.localtypes.Target.TargetRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Target.TargetRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Target.TargetRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Target.TargetRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    inputJson: jspb.Message.getFieldWithDefault(msg, 1, ""),
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
 * @return {!proto.xcalar.compute.localtypes.Target.TargetRequest}
 */
proto.xcalar.compute.localtypes.Target.TargetRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Target.TargetRequest;
  return proto.xcalar.compute.localtypes.Target.TargetRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Target.TargetRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Target.TargetRequest}
 */
proto.xcalar.compute.localtypes.Target.TargetRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInputJson(value);
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
proto.xcalar.compute.localtypes.Target.TargetRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Target.TargetRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Target.TargetRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Target.TargetRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInputJson();
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
 * optional string input_json = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Target.TargetRequest.prototype.getInputJson = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Target.TargetRequest.prototype.setInputJson = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional xcalar.compute.localtypes.Workbook.WorkbookScope scope = 2;
 * @return {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope}
 */
proto.xcalar.compute.localtypes.Target.TargetRequest.prototype.getScope = function() {
  return /** @type{?proto.xcalar.compute.localtypes.Workbook.WorkbookScope} */ (
    jspb.Message.getWrapperField(this, xcalar_compute_localtypes_Workbook_pb.WorkbookScope, 2));
};


/** @param {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope|undefined} value */
proto.xcalar.compute.localtypes.Target.TargetRequest.prototype.setScope = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.xcalar.compute.localtypes.Target.TargetRequest.prototype.clearScope = function() {
  this.setScope(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.xcalar.compute.localtypes.Target.TargetRequest.prototype.hasScope = function() {
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
proto.xcalar.compute.localtypes.Target.TargetResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Target.TargetResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Target.TargetResponse.displayName = 'proto.xcalar.compute.localtypes.Target.TargetResponse';
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
proto.xcalar.compute.localtypes.Target.TargetResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Target.TargetResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Target.TargetResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Target.TargetResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    outputJson: jspb.Message.getFieldWithDefault(msg, 1, "")
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
 * @return {!proto.xcalar.compute.localtypes.Target.TargetResponse}
 */
proto.xcalar.compute.localtypes.Target.TargetResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Target.TargetResponse;
  return proto.xcalar.compute.localtypes.Target.TargetResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Target.TargetResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Target.TargetResponse}
 */
proto.xcalar.compute.localtypes.Target.TargetResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setOutputJson(value);
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
proto.xcalar.compute.localtypes.Target.TargetResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Target.TargetResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Target.TargetResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Target.TargetResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getOutputJson();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
};


/**
 * optional string output_json = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Target.TargetResponse.prototype.getOutputJson = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.Target.TargetResponse.prototype.setOutputJson = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


goog.object.extend(exports, proto.xcalar.compute.localtypes.Target);
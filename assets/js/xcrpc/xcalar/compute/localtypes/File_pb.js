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
var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');
goog.exportSymbol('proto.xcalar.compute.localtypes.File.DataSourceArgs', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.File.FileArg', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.File.FileAttr', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.File.ListRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.File.ListResponse', null, global);

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
proto.xcalar.compute.localtypes.File.DataSourceArgs = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.File.DataSourceArgs, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.File.DataSourceArgs.displayName = 'proto.xcalar.compute.localtypes.File.DataSourceArgs';
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
proto.xcalar.compute.localtypes.File.DataSourceArgs.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.File.DataSourceArgs.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.File.DataSourceArgs} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.File.DataSourceArgs.toObject = function(includeInstance, msg) {
  var f, obj = {
    targetName: jspb.Message.getFieldWithDefault(msg, 1, ""),
    path: jspb.Message.getFieldWithDefault(msg, 2, ""),
    fileNamePattern: jspb.Message.getFieldWithDefault(msg, 3, ""),
    recursive: jspb.Message.getFieldWithDefault(msg, 4, false)
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
 * @return {!proto.xcalar.compute.localtypes.File.DataSourceArgs}
 */
proto.xcalar.compute.localtypes.File.DataSourceArgs.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.File.DataSourceArgs;
  return proto.xcalar.compute.localtypes.File.DataSourceArgs.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.File.DataSourceArgs} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.File.DataSourceArgs}
 */
proto.xcalar.compute.localtypes.File.DataSourceArgs.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setTargetName(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setPath(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setFileNamePattern(value);
      break;
    case 4:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setRecursive(value);
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
proto.xcalar.compute.localtypes.File.DataSourceArgs.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.File.DataSourceArgs.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.File.DataSourceArgs} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.File.DataSourceArgs.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getTargetName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getPath();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getFileNamePattern();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getRecursive();
  if (f) {
    writer.writeBool(
      4,
      f
    );
  }
};


/**
 * optional string target_name = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.File.DataSourceArgs.prototype.getTargetName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.File.DataSourceArgs.prototype.setTargetName = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string path = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.File.DataSourceArgs.prototype.getPath = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.File.DataSourceArgs.prototype.setPath = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string file_name_pattern = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.File.DataSourceArgs.prototype.getFileNamePattern = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.File.DataSourceArgs.prototype.setFileNamePattern = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * optional bool recursive = 4;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.File.DataSourceArgs.prototype.getRecursive = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 4, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.File.DataSourceArgs.prototype.setRecursive = function(value) {
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
proto.xcalar.compute.localtypes.File.FileAttr = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.File.FileAttr, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.File.FileAttr.displayName = 'proto.xcalar.compute.localtypes.File.FileAttr';
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
proto.xcalar.compute.localtypes.File.FileAttr.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.File.FileAttr.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.File.FileAttr} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.File.FileAttr.toObject = function(includeInstance, msg) {
  var f, obj = {
    isDirectory: jspb.Message.getFieldWithDefault(msg, 1, false),
    size: jspb.Message.getFieldWithDefault(msg, 2, 0),
    mtime: jspb.Message.getFieldWithDefault(msg, 3, 0)
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
 * @return {!proto.xcalar.compute.localtypes.File.FileAttr}
 */
proto.xcalar.compute.localtypes.File.FileAttr.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.File.FileAttr;
  return proto.xcalar.compute.localtypes.File.FileAttr.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.File.FileAttr} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.File.FileAttr}
 */
proto.xcalar.compute.localtypes.File.FileAttr.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setIsDirectory(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readUint64());
      msg.setSize(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readUint64());
      msg.setMtime(value);
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
proto.xcalar.compute.localtypes.File.FileAttr.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.File.FileAttr.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.File.FileAttr} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.File.FileAttr.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getIsDirectory();
  if (f) {
    writer.writeBool(
      1,
      f
    );
  }
  f = message.getSize();
  if (f !== 0) {
    writer.writeUint64(
      2,
      f
    );
  }
  f = message.getMtime();
  if (f !== 0) {
    writer.writeUint64(
      3,
      f
    );
  }
};


/**
 * optional bool is_directory = 1;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.File.FileAttr.prototype.getIsDirectory = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldWithDefault(this, 1, false));
};


/** @param {boolean} value */
proto.xcalar.compute.localtypes.File.FileAttr.prototype.setIsDirectory = function(value) {
  jspb.Message.setProto3BooleanField(this, 1, value);
};


/**
 * optional uint64 size = 2;
 * @return {number}
 */
proto.xcalar.compute.localtypes.File.FileAttr.prototype.getSize = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 2, 0));
};


/** @param {number} value */
proto.xcalar.compute.localtypes.File.FileAttr.prototype.setSize = function(value) {
  jspb.Message.setProto3IntField(this, 2, value);
};


/**
 * optional uint64 mtime = 3;
 * @return {number}
 */
proto.xcalar.compute.localtypes.File.FileAttr.prototype.getMtime = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.xcalar.compute.localtypes.File.FileAttr.prototype.setMtime = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
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
proto.xcalar.compute.localtypes.File.FileArg = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.File.FileArg, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.File.FileArg.displayName = 'proto.xcalar.compute.localtypes.File.FileArg';
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
proto.xcalar.compute.localtypes.File.FileArg.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.File.FileArg.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.File.FileArg} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.File.FileArg.toObject = function(includeInstance, msg) {
  var f, obj = {
    attr: (f = msg.getAttr()) && proto.xcalar.compute.localtypes.File.FileAttr.toObject(includeInstance, f),
    name: jspb.Message.getFieldWithDefault(msg, 2, "")
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
 * @return {!proto.xcalar.compute.localtypes.File.FileArg}
 */
proto.xcalar.compute.localtypes.File.FileArg.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.File.FileArg;
  return proto.xcalar.compute.localtypes.File.FileArg.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.File.FileArg} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.File.FileArg}
 */
proto.xcalar.compute.localtypes.File.FileArg.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.xcalar.compute.localtypes.File.FileAttr;
      reader.readMessage(value,proto.xcalar.compute.localtypes.File.FileAttr.deserializeBinaryFromReader);
      msg.setAttr(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
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
proto.xcalar.compute.localtypes.File.FileArg.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.File.FileArg.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.File.FileArg} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.File.FileArg.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getAttr();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      proto.xcalar.compute.localtypes.File.FileAttr.serializeBinaryToWriter
    );
  }
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
};


/**
 * optional FileAttr attr = 1;
 * @return {?proto.xcalar.compute.localtypes.File.FileAttr}
 */
proto.xcalar.compute.localtypes.File.FileArg.prototype.getAttr = function() {
  return /** @type{?proto.xcalar.compute.localtypes.File.FileAttr} */ (
    jspb.Message.getWrapperField(this, proto.xcalar.compute.localtypes.File.FileAttr, 1));
};


/** @param {?proto.xcalar.compute.localtypes.File.FileAttr|undefined} value */
proto.xcalar.compute.localtypes.File.FileArg.prototype.setAttr = function(value) {
  jspb.Message.setWrapperField(this, 1, value);
};


proto.xcalar.compute.localtypes.File.FileArg.prototype.clearAttr = function() {
  this.setAttr(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.xcalar.compute.localtypes.File.FileArg.prototype.hasAttr = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional string name = 2;
 * @return {string}
 */
proto.xcalar.compute.localtypes.File.FileArg.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.xcalar.compute.localtypes.File.FileArg.prototype.setName = function(value) {
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
proto.xcalar.compute.localtypes.File.ListRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.File.ListRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.File.ListRequest.displayName = 'proto.xcalar.compute.localtypes.File.ListRequest';
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
proto.xcalar.compute.localtypes.File.ListRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.File.ListRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.File.ListRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.File.ListRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    scope: (f = msg.getScope()) && xcalar_compute_localtypes_Workbook_pb.WorkbookScope.toObject(includeInstance, f),
    sourceArgs: (f = msg.getSourceArgs()) && proto.xcalar.compute.localtypes.File.DataSourceArgs.toObject(includeInstance, f)
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
 * @return {!proto.xcalar.compute.localtypes.File.ListRequest}
 */
proto.xcalar.compute.localtypes.File.ListRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.File.ListRequest;
  return proto.xcalar.compute.localtypes.File.ListRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.File.ListRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.File.ListRequest}
 */
proto.xcalar.compute.localtypes.File.ListRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new xcalar_compute_localtypes_Workbook_pb.WorkbookScope;
      reader.readMessage(value,xcalar_compute_localtypes_Workbook_pb.WorkbookScope.deserializeBinaryFromReader);
      msg.setScope(value);
      break;
    case 2:
      var value = new proto.xcalar.compute.localtypes.File.DataSourceArgs;
      reader.readMessage(value,proto.xcalar.compute.localtypes.File.DataSourceArgs.deserializeBinaryFromReader);
      msg.setSourceArgs(value);
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
proto.xcalar.compute.localtypes.File.ListRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.File.ListRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.File.ListRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.File.ListRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getScope();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      xcalar_compute_localtypes_Workbook_pb.WorkbookScope.serializeBinaryToWriter
    );
  }
  f = message.getSourceArgs();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      proto.xcalar.compute.localtypes.File.DataSourceArgs.serializeBinaryToWriter
    );
  }
};


/**
 * optional xcalar.compute.localtypes.Workbook.WorkbookScope scope = 1;
 * @return {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope}
 */
proto.xcalar.compute.localtypes.File.ListRequest.prototype.getScope = function() {
  return /** @type{?proto.xcalar.compute.localtypes.Workbook.WorkbookScope} */ (
    jspb.Message.getWrapperField(this, xcalar_compute_localtypes_Workbook_pb.WorkbookScope, 1));
};


/** @param {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope|undefined} value */
proto.xcalar.compute.localtypes.File.ListRequest.prototype.setScope = function(value) {
  jspb.Message.setWrapperField(this, 1, value);
};


proto.xcalar.compute.localtypes.File.ListRequest.prototype.clearScope = function() {
  this.setScope(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.xcalar.compute.localtypes.File.ListRequest.prototype.hasScope = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional DataSourceArgs source_args = 2;
 * @return {?proto.xcalar.compute.localtypes.File.DataSourceArgs}
 */
proto.xcalar.compute.localtypes.File.ListRequest.prototype.getSourceArgs = function() {
  return /** @type{?proto.xcalar.compute.localtypes.File.DataSourceArgs} */ (
    jspb.Message.getWrapperField(this, proto.xcalar.compute.localtypes.File.DataSourceArgs, 2));
};


/** @param {?proto.xcalar.compute.localtypes.File.DataSourceArgs|undefined} value */
proto.xcalar.compute.localtypes.File.ListRequest.prototype.setSourceArgs = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.xcalar.compute.localtypes.File.ListRequest.prototype.clearSourceArgs = function() {
  this.setSourceArgs(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.xcalar.compute.localtypes.File.ListRequest.prototype.hasSourceArgs = function() {
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
proto.xcalar.compute.localtypes.File.ListResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.File.ListResponse.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.File.ListResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.File.ListResponse.displayName = 'proto.xcalar.compute.localtypes.File.ListResponse';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.File.ListResponse.repeatedFields_ = [2];



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
proto.xcalar.compute.localtypes.File.ListResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.File.ListResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.File.ListResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.File.ListResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    numFiles: jspb.Message.getFieldWithDefault(msg, 1, 0),
    filesList: jspb.Message.toObjectList(msg.getFilesList(),
    proto.xcalar.compute.localtypes.File.FileArg.toObject, includeInstance)
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
 * @return {!proto.xcalar.compute.localtypes.File.ListResponse}
 */
proto.xcalar.compute.localtypes.File.ListResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.File.ListResponse;
  return proto.xcalar.compute.localtypes.File.ListResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.File.ListResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.File.ListResponse}
 */
proto.xcalar.compute.localtypes.File.ListResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readUint64());
      msg.setNumFiles(value);
      break;
    case 2:
      var value = new proto.xcalar.compute.localtypes.File.FileArg;
      reader.readMessage(value,proto.xcalar.compute.localtypes.File.FileArg.deserializeBinaryFromReader);
      msg.addFiles(value);
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
proto.xcalar.compute.localtypes.File.ListResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.File.ListResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.File.ListResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.File.ListResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getNumFiles();
  if (f !== 0) {
    writer.writeUint64(
      1,
      f
    );
  }
  f = message.getFilesList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      2,
      f,
      proto.xcalar.compute.localtypes.File.FileArg.serializeBinaryToWriter
    );
  }
};


/**
 * optional uint64 num_files = 1;
 * @return {number}
 */
proto.xcalar.compute.localtypes.File.ListResponse.prototype.getNumFiles = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.xcalar.compute.localtypes.File.ListResponse.prototype.setNumFiles = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * repeated FileArg files = 2;
 * @return {!Array<!proto.xcalar.compute.localtypes.File.FileArg>}
 */
proto.xcalar.compute.localtypes.File.ListResponse.prototype.getFilesList = function() {
  return /** @type{!Array<!proto.xcalar.compute.localtypes.File.FileArg>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.xcalar.compute.localtypes.File.FileArg, 2));
};


/** @param {!Array<!proto.xcalar.compute.localtypes.File.FileArg>} value */
proto.xcalar.compute.localtypes.File.ListResponse.prototype.setFilesList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 2, value);
};


/**
 * @param {!proto.xcalar.compute.localtypes.File.FileArg=} opt_value
 * @param {number=} opt_index
 * @return {!proto.xcalar.compute.localtypes.File.FileArg}
 */
proto.xcalar.compute.localtypes.File.ListResponse.prototype.addFiles = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 2, opt_value, proto.xcalar.compute.localtypes.File.FileArg, opt_index);
};


proto.xcalar.compute.localtypes.File.ListResponse.prototype.clearFilesList = function() {
  this.setFilesList([]);
};


goog.object.extend(exports, proto.xcalar.compute.localtypes.File);

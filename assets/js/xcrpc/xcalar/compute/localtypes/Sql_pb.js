/**
 * @fileoverview
 * @enhanceable
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');
goog.exportSymbol('proto.xcalar.compute.localtypes.Sql.SQLQueryRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Sql.SQLQueryResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo', null, global);

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
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Sql.SQLQueryRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.displayName = 'proto.xcalar.compute.localtypes.Sql.SQLQueryRequest';
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
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Sql.SQLQueryRequest} msg The msg instance to transform.
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    username: msg.getUsername(),
    userid: msg.getUserid(),
    sessionname: msg.getSessionname(),
    resulttablename: msg.getResulttablename(),
    querystring: msg.getQuerystring(),
    tableprefix: msg.getTableprefix(),
    queryname: msg.getQueryname(),
    optimizations: (f = msg.getOptimizations()) && proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.toObject(includeInstance, f)
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
 * @return {!proto.xcalar.compute.localtypes.Sql.SQLQueryRequest}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Sql.SQLQueryRequest;
  return proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Sql.SQLQueryRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Sql.SQLQueryRequest}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setUsername(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readUint32());
      msg.setUserid(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setSessionname(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.setResulttablename(value);
      break;
    case 5:
      var value = /** @type {string} */ (reader.readString());
      msg.setQuerystring(value);
      break;
    case 6:
      var value = /** @type {string} */ (reader.readString());
      msg.setTableprefix(value);
      break;
    case 7:
      var value = /** @type {string} */ (reader.readString());
      msg.setQueryname(value);
      break;
    case 9:
      var value = new proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.deserializeBinaryFromReader);
      msg.setOptimizations(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Class method variant: serializes the given message to binary data
 * (in protobuf wire format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Sql.SQLQueryRequest} message
 * @param {!jspb.BinaryWriter} writer
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.serializeBinaryToWriter = function(message, writer) {
  message.serializeBinaryToWriter(writer);
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  this.serializeBinaryToWriter(writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the message to binary data (in protobuf wire format),
 * writing to the given BinaryWriter.
 * @param {!jspb.BinaryWriter} writer
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.serializeBinaryToWriter = function (writer) {
  var f = undefined;
  f = this.getUsername();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = this.getUserid();
  if (f !== 0) {
    writer.writeUint32(
      2,
      f
    );
  }
  f = this.getSessionname();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = this.getResulttablename();
  if (f.length > 0) {
    writer.writeString(
      4,
      f
    );
  }
  f = this.getQuerystring();
  if (f.length > 0) {
    writer.writeString(
      5,
      f
    );
  }
  f = this.getTableprefix();
  if (f.length > 0) {
    writer.writeString(
      6,
      f
    );
  }
  f = this.getQueryname();
  if (f.length > 0) {
    writer.writeString(
      7,
      f
    );
  }
  f = this.getOptimizations();
  if (f != null) {
    writer.writeMessage(
      9,
      f,
      proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.serializeBinaryToWriter
    );
  }
};


/**
 * Creates a deep clone of this proto. No data is shared with the original.
 * @return {!proto.xcalar.compute.localtypes.Sql.SQLQueryRequest} The clone.
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.cloneMessage = function() {
  return /** @type {!proto.xcalar.compute.localtypes.Sql.SQLQueryRequest} */ (jspb.Message.cloneMessage(this));
};


/**
 * optional string userName = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.getUsername = function() {
  return /** @type {string} */ (jspb.Message.getFieldProto3(this, 1, ""));
};


/** @param {string} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.setUsername = function(value) {
  jspb.Message.setField(this, 1, value);
};


/**
 * optional uint32 userId = 2;
 * @return {number}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.getUserid = function() {
  return /** @type {number} */ (jspb.Message.getFieldProto3(this, 2, 0));
};


/** @param {number} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.setUserid = function(value) {
  jspb.Message.setField(this, 2, value);
};


/**
 * optional string sessionName = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.getSessionname = function() {
  return /** @type {string} */ (jspb.Message.getFieldProto3(this, 3, ""));
};


/** @param {string} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.setSessionname = function(value) {
  jspb.Message.setField(this, 3, value);
};


/**
 * optional string resultTableName = 4;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.getResulttablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldProto3(this, 4, ""));
};


/** @param {string} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.setResulttablename = function(value) {
  jspb.Message.setField(this, 4, value);
};


/**
 * optional string queryString = 5;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.getQuerystring = function() {
  return /** @type {string} */ (jspb.Message.getFieldProto3(this, 5, ""));
};


/** @param {string} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.setQuerystring = function(value) {
  jspb.Message.setField(this, 5, value);
};


/**
 * optional string tablePrefix = 6;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.getTableprefix = function() {
  return /** @type {string} */ (jspb.Message.getFieldProto3(this, 6, ""));
};


/** @param {string} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.setTableprefix = function(value) {
  jspb.Message.setField(this, 6, value);
};


/**
 * optional string queryName = 7;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.getQueryname = function() {
  return /** @type {string} */ (jspb.Message.getFieldProto3(this, 7, ""));
};


/** @param {string} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.setQueryname = function(value) {
  jspb.Message.setField(this, 7, value);
};


/**
 * optional Optimizations optimizations = 9;
 * @return {proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.getOptimizations = function() {
  return /** @type{proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations} */ (
    jspb.Message.getWrapperField(this, proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations, 9));
};


/** @param {proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations|undefined} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.setOptimizations = function(value) {
  jspb.Message.setWrapperField(this, 9, value);
};


proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.clearOptimizations = function() {
  this.setOptimizations(undefined);
};


/**
 * Returns whether this field is set.
 * @return{!boolean}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.prototype.hasOptimizations = function() {
  return jspb.Message.getField(this, 9) != null;
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
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.displayName = 'proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations';
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
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations} msg The msg instance to transform.
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.toObject = function(includeInstance, msg) {
  var f, obj = {
    dropasyougo: msg.getDropasyougo(),
    dropsrctables: msg.getDropsrctables(),
    randomcrossjoin: msg.getRandomcrossjoin(),
    pushtoselect: msg.getPushtoselect()
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
 * @return {!proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations;
  return proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setDropasyougo(value);
      break;
    case 2:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setDropsrctables(value);
      break;
    case 3:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setRandomcrossjoin(value);
      break;
    case 4:
      var value = /** @type {boolean} */ (reader.readBool());
      msg.setPushtoselect(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Class method variant: serializes the given message to binary data
 * (in protobuf wire format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations} message
 * @param {!jspb.BinaryWriter} writer
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.serializeBinaryToWriter = function(message, writer) {
  message.serializeBinaryToWriter(writer);
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  this.serializeBinaryToWriter(writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the message to binary data (in protobuf wire format),
 * writing to the given BinaryWriter.
 * @param {!jspb.BinaryWriter} writer
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.prototype.serializeBinaryToWriter = function (writer) {
  var f = undefined;
  f = this.getDropasyougo();
  if (f) {
    writer.writeBool(
      1,
      f
    );
  }
  f = this.getDropsrctables();
  if (f) {
    writer.writeBool(
      2,
      f
    );
  }
  f = this.getRandomcrossjoin();
  if (f) {
    writer.writeBool(
      3,
      f
    );
  }
  f = this.getPushtoselect();
  if (f) {
    writer.writeBool(
      4,
      f
    );
  }
};


/**
 * Creates a deep clone of this proto. No data is shared with the original.
 * @return {!proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations} The clone.
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.prototype.cloneMessage = function() {
  return /** @type {!proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations} */ (jspb.Message.cloneMessage(this));
};


/**
 * optional bool dropAsYouGo = 1;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.prototype.getDropasyougo = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldProto3(this, 1, false));
};


/** @param {boolean} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.prototype.setDropasyougo = function(value) {
  jspb.Message.setField(this, 1, value);
};


/**
 * optional bool dropSrcTables = 2;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.prototype.getDropsrctables = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldProto3(this, 2, false));
};


/** @param {boolean} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.prototype.setDropsrctables = function(value) {
  jspb.Message.setField(this, 2, value);
};


/**
 * optional bool randomCrossJoin = 3;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.prototype.getRandomcrossjoin = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldProto3(this, 3, false));
};


/** @param {boolean} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.prototype.setRandomcrossjoin = function(value) {
  jspb.Message.setField(this, 3, value);
};


/**
 * optional bool pushToSelect = 4;
 * Note that Boolean fields may be set to 0/1 when serialized from a Java server.
 * You should avoid comparisons like {@code val === true/false} in those cases.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.prototype.getPushtoselect = function() {
  return /** @type {boolean} */ (jspb.Message.getFieldProto3(this, 4, false));
};


/** @param {boolean} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations.prototype.setPushtoselect = function(value) {
  jspb.Message.setField(this, 4, value);
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
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Sql.SQLQueryResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.displayName = 'proto.xcalar.compute.localtypes.Sql.SQLQueryResponse';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.repeatedFields_ = [2];



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
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse} msg The msg instance to transform.
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    tablename: msg.getTablename(),
    orderedcolumnsList: jspb.Message.toObjectList(msg.getOrderedcolumnsList(),
    proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.toObject, includeInstance)
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
 * @return {!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Sql.SQLQueryResponse;
  return proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.deserializeBinaryFromReader = function(msg, reader) {
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
      var value = new proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.deserializeBinaryFromReader);
      msg.getOrderedcolumnsList().push(value);
      msg.setOrderedcolumnsList(msg.getOrderedcolumnsList());
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Class method variant: serializes the given message to binary data
 * (in protobuf wire format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse} message
 * @param {!jspb.BinaryWriter} writer
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.serializeBinaryToWriter = function(message, writer) {
  message.serializeBinaryToWriter(writer);
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  this.serializeBinaryToWriter(writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the message to binary data (in protobuf wire format),
 * writing to the given BinaryWriter.
 * @param {!jspb.BinaryWriter} writer
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.prototype.serializeBinaryToWriter = function (writer) {
  var f = undefined;
  f = this.getTablename();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = this.getOrderedcolumnsList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      2,
      f,
      proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.serializeBinaryToWriter
    );
  }
};


/**
 * Creates a deep clone of this proto. No data is shared with the original.
 * @return {!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse} The clone.
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.prototype.cloneMessage = function() {
  return /** @type {!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse} */ (jspb.Message.cloneMessage(this));
};


/**
 * optional string tableName = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.prototype.getTablename = function() {
  return /** @type {string} */ (jspb.Message.getFieldProto3(this, 1, ""));
};


/** @param {string} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.prototype.setTablename = function(value) {
  jspb.Message.setField(this, 1, value);
};


/**
 * repeated ColInfo orderedColumns = 2;
 * If you change this array by adding, removing or replacing elements, or if you
 * replace the array itself, then you must call the setter to update it.
 * @return {!Array.<!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo>}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.prototype.getOrderedcolumnsList = function() {
  return /** @type{!Array.<!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo, 2));
};


/** @param {Array.<!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo>} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.prototype.setOrderedcolumnsList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 2, value);
};


proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.prototype.clearOrderedcolumnsList = function() {
  this.setOrderedcolumnsList([]);
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
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.displayName = 'proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo';
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
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo} msg The msg instance to transform.
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.toObject = function(includeInstance, msg) {
  var f, obj = {
    colname: msg.getColname(),
    colid: msg.getColid(),
    coltype: msg.getColtype()
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
 * @return {!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo;
  return proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setColname(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readUint32());
      msg.setColid(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setColtype(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Class method variant: serializes the given message to binary data
 * (in protobuf wire format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo} message
 * @param {!jspb.BinaryWriter} writer
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.serializeBinaryToWriter = function(message, writer) {
  message.serializeBinaryToWriter(writer);
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  this.serializeBinaryToWriter(writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the message to binary data (in protobuf wire format),
 * writing to the given BinaryWriter.
 * @param {!jspb.BinaryWriter} writer
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.prototype.serializeBinaryToWriter = function (writer) {
  var f = undefined;
  f = this.getColname();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = this.getColid();
  if (f !== 0) {
    writer.writeUint32(
      2,
      f
    );
  }
  f = this.getColtype();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
};


/**
 * Creates a deep clone of this proto. No data is shared with the original.
 * @return {!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo} The clone.
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.prototype.cloneMessage = function() {
  return /** @type {!proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo} */ (jspb.Message.cloneMessage(this));
};


/**
 * optional string colName = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.prototype.getColname = function() {
  return /** @type {string} */ (jspb.Message.getFieldProto3(this, 1, ""));
};


/** @param {string} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.prototype.setColname = function(value) {
  jspb.Message.setField(this, 1, value);
};


/**
 * optional uint32 colId = 2;
 * @return {number}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.prototype.getColid = function() {
  return /** @type {number} */ (jspb.Message.getFieldProto3(this, 2, 0));
};


/** @param {number} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.prototype.setColid = function(value) {
  jspb.Message.setField(this, 2, value);
};


/**
 * optional string colType = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.prototype.getColtype = function() {
  return /** @type {string} */ (jspb.Message.getFieldProto3(this, 3, ""));
};


/** @param {string} value  */
proto.xcalar.compute.localtypes.Sql.SQLQueryResponse.ColInfo.prototype.setColtype = function(value) {
  jspb.Message.setField(this, 3, value);
};


goog.object.extend(exports, proto.xcalar.compute.localtypes.Sql);

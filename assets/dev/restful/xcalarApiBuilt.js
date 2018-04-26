/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*jshint evil:true*/

/**
 * The Thrift namespace houses the Apache Thrift JavaScript library
 * elements providing JavaScript bindings for the Apache Thrift RPC
 * system. End users will typically only directly make use of the
 * Transport (TXHRTransport/TWebSocketTransport) and Protocol
 * (TJSONPRotocol/TBinaryProtocol) constructors.
 *
 * Object methods beginning with a __ (e.g. __onOpen()) are internal
 * and should not be called outside of the object's own methods.
 *
 * This library creates one global object: Thrift
 * Code in this library must never create additional global identifiers,
 * all features must be scoped within the Thrift namespace.
 * @namespace
 * @example
 *     var transport = new Thrift.Transport("http://localhost:8585");
 *     var protocol  = new Thrift.Protocol(transport);
 *     var client = new MyThriftSvcClient(protocol);
 *     var result = client.MyMethod();
 */
var Thrift = {
    /**
     * Thrift JavaScript library version.
     * @readonly
     * @const {string} Version
     * @memberof Thrift
     */
    Version: '0.9.2',

    /**
     * Thrift IDL type string to Id mapping.
     * @readonly
     * @property {number}  STOP   - End of a set of fields.
     * @property {number}  VOID   - No value (only legal for return types).
     * @property {number}  BOOL   - True/False integer.
     * @property {number}  BYTE   - Signed 8 bit integer.
     * @property {number}  I08    - Signed 8 bit integer.
     * @property {number}  DOUBLE - 64 bit IEEE 854 floating point.
     * @property {number}  I16    - Signed 16 bit integer.
     * @property {number}  I32    - Signed 32 bit integer.
     * @property {number}  I64    - Signed 64 bit integer.
     * @property {number}  STRING - Array of bytes representing a string of characters.
     * @property {number}  UTF7   - Array of bytes representing a string of UTF7 encoded characters.
     * @property {number}  STRUCT - A multifield type.
     * @property {number}  MAP    - A collection type (map/associative-array/dictionary).
     * @property {number}  SET    - A collection type (unordered and without repeated values).
     * @property {number}  LIST   - A collection type (unordered).
     * @property {number}  UTF8   - Array of bytes representing a string of UTF8 encoded characters.
     * @property {number}  UTF16  - Array of bytes representing a string of UTF16 encoded characters.
     */
    Type: {
        'STOP': 0,
        'VOID': 1,
        'BOOL': 2,
        'BYTE': 3,
        'I08': 3,
        'DOUBLE': 4,
        'I16': 6,
        'I32': 8,
        'I64': 10,
        'STRING': 11,
        'UTF7': 11,
        'STRUCT': 12,
        'MAP': 13,
        'SET': 14,
        'LIST': 15,
        'UTF8': 16,
        'UTF16': 17
    },

    /**
     * Thrift RPC message type string to Id mapping.
     * @readonly
     * @property {number}  CALL      - RPC call sent from client to server.
     * @property {number}  REPLY     - RPC call normal response from server to client.
     * @property {number}  EXCEPTION - RPC call exception response from server to client.
     * @property {number}  ONEWAY    - Oneway RPC call from client to server with no response.
     */
    MessageType: {
        'CALL': 1,
        'REPLY': 2,
        'EXCEPTION': 3,
        'ONEWAY': 4
    },

    /**
     * Utility function returning the count of an object's own properties.
     * @param {object} obj - Object to test.
     * @returns {number} number of object's own properties
     */
    objectLength: function(obj) {
        var length = 0;
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                length++;
            }
        }
        return length;
    },

    /**
     * Utility function to establish prototype inheritance.
     * @see {@link http://javascript.crockford.com/prototypal.html|Prototypal Inheritance}
     * @param {function} constructor - Contstructor function to set as derived.
     * @param {function} superConstructor - Contstructor function to set as base.
     * @param {string} [name] - Type name to set as name property in derived prototype.
     */
    inherits: function(constructor, superConstructor, name) {
      function F() {}
      F.prototype = superConstructor.prototype;
      constructor.prototype = new F();
      constructor.prototype.name = name || "";
    }
};

/**
 * Initializes a Thrift TException instance.
 * @constructor
 * @augments Error
 * @param {string} message - The TException message (distinct from the Error message).
 * @classdesc TException is the base class for all Thrift exceptions types.
 */
Thrift.TException = function(message) {
    this.message = message;
};
Thrift.inherits(Thrift.TException, Error, 'TException');

/**
 * Returns the message set on the exception.
 * @readonly
 * @returns {string} exception message
 */
Thrift.TException.prototype.getMessage = function() {
    return this.message;
};

/**
 * Thrift Application Exception type string to Id mapping.
 * @readonly
 * @property {number}  UNKNOWN                 - Unknown/undefined.
 * @property {number}  UNKNOWN_METHOD          - Client attempted to call a method unknown to the server.
 * @property {number}  INVALID_MESSAGE_TYPE    - Client passed an unknown/unsupported MessageType.
 * @property {number}  WRONG_METHOD_NAME       - Unused.
 * @property {number}  BAD_SEQUENCE_ID         - Unused in Thrift RPC, used to flag proprietary sequence number errors.
 * @property {number}  MISSING_RESULT          - Raised by a server processor if a handler fails to supply the required return result.
 * @property {number}  INTERNAL_ERROR          - Something bad happened.
 * @property {number}  PROTOCOL_ERROR          - The protocol layer failed to serialize or deserialize data.
 * @property {number}  INVALID_TRANSFORM       - Unused.
 * @property {number}  INVALID_PROTOCOL        - The protocol (or version) is not supported.
 * @property {number}  UNSUPPORTED_CLIENT_TYPE - Unused.
 */
Thrift.TApplicationExceptionType = {
    'UNKNOWN': 0,
    'UNKNOWN_METHOD': 1,
    'INVALID_MESSAGE_TYPE': 2,
    'WRONG_METHOD_NAME': 3,
    'BAD_SEQUENCE_ID': 4,
    'MISSING_RESULT': 5,
    'INTERNAL_ERROR': 6,
    'PROTOCOL_ERROR': 7,
    'INVALID_TRANSFORM': 8,
    'INVALID_PROTOCOL': 9,
    'UNSUPPORTED_CLIENT_TYPE': 10
};

/**
 * Initializes a Thrift TApplicationException instance.
 * @constructor
 * @augments Thrift.TException
 * @param {string} message - The TApplicationException message (distinct from the Error message).
 * @param {Thrift.TApplicationExceptionType} [code] - The TApplicationExceptionType code.
 * @classdesc TApplicationException is the exception class used to propagate exceptions from an RPC server back to a calling client.
*/
Thrift.TApplicationException = function(message, code) {
    this.message = message;
    this.code = typeof code === "number" ? code : 0;
};
Thrift.inherits(Thrift.TApplicationException, Thrift.TException, 'TApplicationException');

/**
 * Read a TApplicationException from the supplied protocol.
 * @param {object} input - The input protocol to read from.
 */
Thrift.TApplicationException.prototype.read = function(input) {
    while (1) {
        var ret = input.readFieldBegin();

        if (ret.ftype == Thrift.Type.STOP) {
            break;
        }

        var fid = ret.fid;

        switch (fid) {
            case 1:
                if (ret.ftype == Thrift.Type.STRING) {
                    ret = input.readString();
                    this.message = ret.value;
                } else {
                    ret = input.skip(ret.ftype);
                }
                break;
            case 2:
                if (ret.ftype == Thrift.Type.I32) {
                    ret = input.readI32();
                    this.code = ret.value;
                } else {
                    ret = input.skip(ret.ftype);
                }
                break;
           default:
                ret = input.skip(ret.ftype);
                break;
        }

        input.readFieldEnd();
    }

    input.readStructEnd();
};

/**
 * Wite a TApplicationException to the supplied protocol.
 * @param {object} output - The output protocol to write to.
 */
Thrift.TApplicationException.prototype.write = function(output) {
    output.writeStructBegin('TApplicationException');

    if (this.message) {
        output.writeFieldBegin('message', Thrift.Type.STRING, 1);
        output.writeString(this.getMessage());
        output.writeFieldEnd();
    }

    if (this.code) {
        output.writeFieldBegin('type', Thrift.Type.I32, 2);
        output.writeI32(this.code);
        output.writeFieldEnd();
    }

    output.writeFieldStop();
    output.writeStructEnd();
};

/**
 * Returns the application exception code set on the exception.
 * @readonly
 * @returns {Thrift.TApplicationExceptionType} exception code
 */
Thrift.TApplicationException.prototype.getCode = function() {
    return this.code;
};

/**
 * Constructor Function for the XHR transport.
 * If you do not specify a url then you must handle XHR operations on
 * your own. This type can also be constructed using the Transport alias
 * for backward compatibility.
 * @constructor
 * @param {string} [url] - The URL to connect to.
 * @classdesc The Apache Thrift Transport layer performs byte level I/O
 * between RPC clients and servers. The JavaScript TXHRTransport object
 * uses Http[s]/XHR. Target servers must implement the http[s] transport
 * (see: node.js example server_http.js).
 * @example
 *     var transport = new Thrift.TXHRTransport("http://localhost:8585");
 */
Thrift.Transport = Thrift.TXHRTransport = function(url, options) {
    this.url = url;
    this.wpos = 0;
    this.rpos = 0;
    this.useCORS = (options && options.useCORS);
    this.send_buf = '';
    this.recv_buf = '';
};

Thrift.TXHRTransport.prototype = {
    /**
     * Gets the browser specific XmlHttpRequest Object.
     * @returns {object} the browser XHR interface object
     */
    getXmlHttpRequestObject: function() {
        try { return new XMLHttpRequest(); } catch (e1) { }
        try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch (e2) { }
        try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch (e3) { }

        throw "Your browser doesn't support XHR.";
    },

    /**
     * Sends the current XRH request if the transport was created with a URL
     * and the async parameter is false. If the transport was not created with
     * a URL, or the async parameter is True and no callback is provided, or
     * the URL is an empty string, the current send buffer is returned.
     * @param {object} async - If true the current send buffer is returned.
     * @param {object} callback - Optional async completion callback
     * @returns {undefined|string} Nothing or the current send buffer.
     * @throws {string} If XHR fails.
     */
    flush: function(async, callback) {
        var self = this;
        if ((async && !callback) || this.url === undefined || this.url === '') {
            return this.send_buf;
        }

        var xreq = this.getXmlHttpRequestObject();

        if (xreq.overrideMimeType) {
            xreq.overrideMimeType('application/json');
        }

        if (callback) {
            //Ignore XHR callbacks until the data arrives, then call the
            //  client's callback
            xreq.onreadystatechange =
              (function() {
                var clientCallback = callback;
                return function() {
                  if (this.readyState == 4 && this.status == 200) {
                    self.setRecvBuffer(this.responseText);
                    clientCallback();
                  }
                };
              }());
        }

        xreq.open('POST', this.url, !!async);
        xreq.send(this.send_buf);
        if (async && callback) {
            return;
        }

        if (xreq.readyState != 4) {
            throw 'encountered an unknown ajax ready state: ' + xreq.readyState;
        }

        if (xreq.status != 200) {
            throw 'encountered a unknown request status: ' + xreq.status;
        }

        this.recv_buf = xreq.responseText;
        this.recv_buf_sz = this.recv_buf.length;
        this.wpos = this.recv_buf.length;
        this.rpos = 0;
    },

    /**
     * Creates a jQuery XHR object to be used for a Thrift server call.
     * @param {object} client - The Thrift Service client object generated by the IDL compiler.
     * @param {object} postData - The message to send to the server.
     * @param {function} args - The original call arguments with the success call back at the end.
     * @param {function} recv_method - The Thrift Service Client receive method for the call.
     * @returns {object} A new jQuery XHR object.
     * @throws {string} If the jQuery version is prior to 1.5 or if jQuery is not found.
     */
    jqRequest: function(client, postData, args, recv_method) {
        if (typeof jQuery === 'undefined' ||
            typeof jQuery.Deferred === 'undefined') {
            throw 'Thrift.js requires jQuery 1.5+ to use asynchronous requests';
        }

        var thriftTransport = this;

        $.support.cors = true;

        var jqXHR = jQuery.ajax({
            crossDomain: true,
            url: this.url,
            data: postData,
            type: 'POST',
            cache: false,
            contentType: 'application/json',
            dataType: 'text thrift',
            converters: {
                'text thrift' : function(responseData) {
                    thriftTransport.setRecvBuffer(responseData);
                    var value = recv_method.call(client);
                    return value;
                }
            },
            context: client,
            success: jQuery.makeArray(args).pop()
        });

        return jqXHR;
    },

    /**
     * Sets the buffer to provide the protocol when deserializing.
     * @param {string} buf - The buffer to supply the protocol.
     */
    setRecvBuffer: function(buf) {
        this.recv_buf = buf;
        this.recv_buf_sz = this.recv_buf.length;
        this.wpos = this.recv_buf.length;
        this.rpos = 0;
    },

    /**
     * Returns true if the transport is open, XHR always returns true.
     * @readonly
     * @returns {boolean} Always True.
     */
    isOpen: function() {
        return true;
    },

    /**
     * Opens the transport connection, with XHR this is a nop.
     */
    open: function() {},

    /**
     * Closes the transport connection, with XHR this is a nop.
     */
    close: function() {},

    /**
     * Returns the specified number of characters from the response
     * buffer.
     * @param {number} len - The number of characters to return.
     * @returns {string} Characters sent by the server.
     */
    read: function(len) {
        var avail = this.wpos - this.rpos;

        if (avail === 0) {
            return '';
        }

        var give = len;

        if (avail < len) {
            give = avail;
        }

        var ret = this.read_buf.substr(this.rpos, give);
        this.rpos += give;

        //clear buf when complete?
        return ret;
    },

    /**
     * Returns the entire response buffer.
     * @returns {string} Characters sent by the server.
     */
    readAll: function() {
        return this.recv_buf;
    },

    /**
     * Sets the send buffer to buf.
     * @param {string} buf - The buffer to send.
     */
    write: function(buf) {
        this.send_buf = buf;
    },

    /**
     * Returns the send buffer.
     * @readonly
     * @returns {string} The send buffer.
     */
    getSendBuffer: function() {
        return this.send_buf;
    }

};


/**
 * Constructor Function for the WebSocket transport.
 * @constructor
 * @param {string} [url] - The URL to connect to.
 * @classdesc The Apache Thrift Transport layer performs byte level I/O
 * between RPC clients and servers. The JavaScript TWebSocketTransport object
 * uses the WebSocket protocol. Target servers must implement WebSocket.
 * (see: node.js example server_http.js).
 * @example
 *   var transport = new Thrift.TWebSocketTransport("http://localhost:8585");
 */
Thrift.TWebSocketTransport = function(url) {
    this.__reset(url);
};

Thrift.TWebSocketTransport.prototype = {
    __reset: function(url) {
      this.url = url;             //Where to connect
      this.socket = null;         //The web socket
      this.callbacks = [];        //Pending callbacks
      this.send_pending = [];     //Buffers/Callback pairs waiting to be sent
      this.send_buf = '';         //Outbound data, immutable until sent
      this.recv_buf = '';         //Inbound data
      this.rb_wpos = 0;           //Network write position in receive buffer
      this.rb_rpos = 0;           //Client read position in receive buffer
    },

    /**
     * Sends the current WS request and registers callback. The async
     * parameter is ignored (WS flush is always async) and the callback
     * function parameter is required.
     * @param {object} async - Ignored.
     * @param {object} callback - The client completion callback.
     * @returns {undefined|string} Nothing (undefined)
     */
    flush: function(async, callback) {
      var self = this;
      if (this.isOpen()) {
        //Send data and register a callback to invoke the client callback
        this.socket.send(this.send_buf);
        this.callbacks.push((function() {
          var clientCallback = callback;
          return function(msg) {
            self.setRecvBuffer(msg);
            clientCallback();
          };
        }()));
      } else {
        //Queue the send to go out __onOpen
        this.send_pending.push({
          buf: this.send_buf,
          cb:  callback
        });
      }
    },

    __onOpen: function() {
       var self = this;
       if (this.send_pending.length > 0) {
          //If the user made calls before the connection was fully
          //open, send them now
          this.send_pending.forEach(function(elem) {
             this.socket.send(elem.buf);
             this.callbacks.push((function() {
               var clientCallback = elem.cb;
               return function(msg) {
                  self.setRecvBuffer(msg);
                  clientCallback();
               };
             }()));
          });
          this.send_pending = [];
       }
    },

    __onClose: function(evt) {
      this.__reset(this.url);
    },

    __onMessage: function(evt) {
      if (this.callbacks.length) {
        this.callbacks.shift()(evt.data);
      }
    },

    __onError: function(evt) {
      console.log("Thrift WebSocket Error: " + evt.toString());
      this.socket.close();
    },

    /**
     * Sets the buffer to use when receiving server responses.
     * @param {string} buf - The buffer to receive server responses.
     */
    setRecvBuffer: function(buf) {
        this.recv_buf = buf;
        this.recv_buf_sz = this.recv_buf.length;
        this.wpos = this.recv_buf.length;
        this.rpos = 0;
    },

    /**
     * Returns true if the transport is open
     * @readonly
     * @returns {boolean}
     */
    isOpen: function() {
        return this.socket && this.socket.readyState == this.socket.OPEN;
    },

    /**
     * Opens the transport connection
     */
    open: function() {
      //If OPEN/CONNECTING/CLOSING ignore additional opens
      if (this.socket && this.socket.readyState != this.socket.CLOSED) {
        return;
      }
      //If there is no socket or the socket is closed:
      this.socket = new WebSocket(this.url);
      this.socket.onopen = this.__onOpen.bind(this);
      this.socket.onmessage = this.__onMessage.bind(this);
      this.socket.onerror = this.__onError.bind(this);
      this.socket.onclose = this.__onClose.bind(this);
    },

    /**
     * Closes the transport connection
     */
    close: function() {
      this.socket.close();
    },

    /**
     * Returns the specified number of characters from the response
     * buffer.
     * @param {number} len - The number of characters to return.
     * @returns {string} Characters sent by the server.
     */
    read: function(len) {
        var avail = this.wpos - this.rpos;

        if (avail === 0) {
            return '';
        }

        var give = len;

        if (avail < len) {
            give = avail;
        }

        var ret = this.read_buf.substr(this.rpos, give);
        this.rpos += give;

        //clear buf when complete?
        return ret;
    },

    /**
     * Returns the entire response buffer.
     * @returns {string} Characters sent by the server.
     */
    readAll: function() {
        return this.recv_buf;
    },

    /**
     * Sets the send buffer to buf.
     * @param {string} buf - The buffer to send.
     */
    write: function(buf) {
        this.send_buf = buf;
    },

    /**
     * Returns the send buffer.
     * @readonly
     * @returns {string} The send buffer.
     */
    getSendBuffer: function() {
        return this.send_buf;
    }

};

/**
 * Initializes a Thrift JSON protocol instance.
 * @constructor
 * @param {Thrift.Transport} transport - The transport to serialize to/from.
 * @classdesc Apache Thrift Protocols perform serialization which enables cross
 * language RPC. The Protocol type is the JavaScript browser implementation
 * of the Apache Thrift TJSONProtocol.
 * @example
 *     var protocol  = new Thrift.Protocol(transport);
 */
Thrift.TJSONProtocol = Thrift.Protocol = function(transport) {
    this.transport = transport;
};

/**
 * Thrift IDL type Id to string mapping.
 * @readonly
 * @see {@link Thrift.Type}
 */
Thrift.Protocol.Type = {};
Thrift.Protocol.Type[Thrift.Type.BOOL] = '"tf"';
Thrift.Protocol.Type[Thrift.Type.BYTE] = '"i8"';
Thrift.Protocol.Type[Thrift.Type.I16] = '"i16"';
Thrift.Protocol.Type[Thrift.Type.I32] = '"i32"';
Thrift.Protocol.Type[Thrift.Type.I64] = '"i64"';
Thrift.Protocol.Type[Thrift.Type.DOUBLE] = '"dbl"';
Thrift.Protocol.Type[Thrift.Type.STRUCT] = '"rec"';
Thrift.Protocol.Type[Thrift.Type.STRING] = '"str"';
Thrift.Protocol.Type[Thrift.Type.MAP] = '"map"';
Thrift.Protocol.Type[Thrift.Type.LIST] = '"lst"';
Thrift.Protocol.Type[Thrift.Type.SET] = '"set"';

/**
 * Thrift IDL type string to Id mapping.
 * @readonly
 * @see {@link Thrift.Type}
 */
Thrift.Protocol.RType = {};
Thrift.Protocol.RType.tf = Thrift.Type.BOOL;
Thrift.Protocol.RType.i8 = Thrift.Type.BYTE;
Thrift.Protocol.RType.i16 = Thrift.Type.I16;
Thrift.Protocol.RType.i32 = Thrift.Type.I32;
Thrift.Protocol.RType.i64 = Thrift.Type.I64;
Thrift.Protocol.RType.dbl = Thrift.Type.DOUBLE;
Thrift.Protocol.RType.rec = Thrift.Type.STRUCT;
Thrift.Protocol.RType.str = Thrift.Type.STRING;
Thrift.Protocol.RType.map = Thrift.Type.MAP;
Thrift.Protocol.RType.lst = Thrift.Type.LIST;
Thrift.Protocol.RType.set = Thrift.Type.SET;

/**
 * The TJSONProtocol version number.
 * @readonly
 * @const {number} Version
 * @memberof Thrift.Protocol
 */
 Thrift.Protocol.Version = 1;

Thrift.Protocol.prototype = {
    /**
     * Returns the underlying transport.
     * @readonly
     * @returns {Thrift.Transport} The underlying transport.
     */
    getTransport: function() {
        return this.transport;
    },

    /**
     * Serializes the beginning of a Thrift RPC message.
     * @param {string} name - The service method to call.
     * @param {Thrift.MessageType} messageType - The type of method call.
     * @param {number} seqid - The sequence number of this call (always 0 in Apache Thrift).
     */
    writeMessageBegin: function(name, messageType, seqid) {
        this.tstack = [];
        this.tpos = [];

        this.tstack.push([Thrift.Protocol.Version, '"' +
            name + '"', messageType, seqid]);
    },

    /**
     * Serializes the end of a Thrift RPC message.
     */
    writeMessageEnd: function() {
        var obj = this.tstack.pop();

        this.wobj = this.tstack.pop();
        this.wobj.push(obj);

        this.wbuf = '[' + this.wobj.join(',') + ']';

        this.transport.write(this.wbuf);
     },


    /**
     * Serializes the beginning of a struct.
     * @param {string} name - The name of the struct.
     */
    writeStructBegin: function(name) {
        this.tpos.push(this.tstack.length);
        this.tstack.push({});
    },

    /**
     * Serializes the end of a struct.
     */
    writeStructEnd: function() {

        var p = this.tpos.pop();
        var struct = this.tstack[p];
        var str = '{';
        var first = true;
        for (var key in struct) {
            if (first) {
                first = false;
            } else {
                str += ',';
            }

            str += key + ':' + struct[key];
        }

        str += '}';
        this.tstack[p] = str;
    },

    /**
     * Serializes the beginning of a struct field.
     * @param {string} name - The name of the field.
     * @param {Thrift.Protocol.Type} fieldType - The data type of the field.
     * @param {number} fieldId - The field's unique identifier.
     */
    writeFieldBegin: function(name, fieldType, fieldId) {
        this.tpos.push(this.tstack.length);
        this.tstack.push({ 'fieldId': '"' +
            fieldId + '"', 'fieldType': Thrift.Protocol.Type[fieldType]
        });

    },

    /**
     * Serializes the end of a field.
     */
    writeFieldEnd: function() {
        var value = this.tstack.pop();
        var fieldInfo = this.tstack.pop();

        this.tstack[this.tstack.length - 1][fieldInfo.fieldId] = '{' +
            fieldInfo.fieldType + ':' + value + '}';
        this.tpos.pop();
    },

    /**
     * Serializes the end of the set of fields for a struct.
     */
    writeFieldStop: function() {
        //na
    },

    /**
     * Serializes the beginning of a map collection.
     * @param {Thrift.Type} keyType - The data type of the key.
     * @param {Thrift.Type} valType - The data type of the value.
     * @param {number} [size] - The number of elements in the map (ignored).
     */
    writeMapBegin: function(keyType, valType, size) {
        this.tpos.push(this.tstack.length);
        this.tstack.push([Thrift.Protocol.Type[keyType],
            Thrift.Protocol.Type[valType], 0]);
    },

    /**
     * Serializes the end of a map.
     */
    writeMapEnd: function() {
        var p = this.tpos.pop();

        if (p == this.tstack.length) {
            return;
        }

        if ((this.tstack.length - p - 1) % 2 !== 0) {
            this.tstack.push('');
        }

        var size = (this.tstack.length - p - 1) / 2;

        this.tstack[p][this.tstack[p].length - 1] = size;

        var map = '}';
        var first = true;
        while (this.tstack.length > p + 1) {
            var v = this.tstack.pop();
            var k = this.tstack.pop();
            if (first) {
                first = false;
            } else {
                map = ',' + map;
            }

            if (! isNaN(k)) { k = '"' + k + '"'; } //json "keys" need to be strings
            map = k + ':' + v + map;
        }
        map = '{' + map;

        this.tstack[p].push(map);
        this.tstack[p] = '[' + this.tstack[p].join(',') + ']';
    },

    /**
     * Serializes the beginning of a list collection.
     * @param {Thrift.Type} elemType - The data type of the elements.
     * @param {number} size - The number of elements in the list.
     */
    writeListBegin: function(elemType, size) {
        this.tpos.push(this.tstack.length);
        this.tstack.push([Thrift.Protocol.Type[elemType], size]);
    },

    /**
     * Serializes the end of a list.
     */
    writeListEnd: function() {
        var p = this.tpos.pop();

        while (this.tstack.length > p + 1) {
            var tmpVal = this.tstack[p + 1];
            this.tstack.splice(p + 1, 1);
            this.tstack[p].push(tmpVal);
        }

        this.tstack[p] = '[' + this.tstack[p].join(',') + ']';
    },

    /**
     * Serializes the beginning of a set collection.
     * @param {Thrift.Type} elemType - The data type of the elements.
     * @param {number} size - The number of elements in the list.
     */
    writeSetBegin: function(elemType, size) {
        this.tpos.push(this.tstack.length);
        this.tstack.push([Thrift.Protocol.Type[elemType], size]);
    },

    /**
     * Serializes the end of a set.
     */
    writeSetEnd: function() {
        var p = this.tpos.pop();

        while (this.tstack.length > p + 1) {
            var tmpVal = this.tstack[p + 1];
            this.tstack.splice(p + 1, 1);
            this.tstack[p].push(tmpVal);
        }

        this.tstack[p] = '[' + this.tstack[p].join(',') + ']';
    },

    /** Serializes a boolean */
    writeBool: function(value) {
        this.tstack.push(value ? 1 : 0);
    },

    /** Serializes a number */
    writeByte: function(i8) {
        this.tstack.push(i8);
    },

    /** Serializes a number */
    writeI16: function(i16) {
        this.tstack.push(i16);
    },

    /** Serializes a number */
    writeI32: function(i32) {
        this.tstack.push(i32);
    },

    /** Serializes a number */
    writeI64: function(i64) {
        this.tstack.push(i64);
    },

    /** Serializes a number */
    writeDouble: function(dbl) {
        this.tstack.push(dbl);
    },

    /** Serializes a string */
    writeString: function(str) {
        // We do not encode uri components for wire transfer:
        if (str === null) {
            this.tstack.push(null);
        } else {
            // concat may be slower than building a byte buffer
            var escapedString = '';
            for (var i = 0; i < str.length; i++) {
                var ch = str.charAt(i);      // a single double quote: "
                if (ch === '\"') {
                    escapedString += '\\\"'; // write out as: \"
                } else if (ch === '\\') {    // a single backslash
                    escapedString += '\\\\'; // write out as double backslash
                } else if (ch === '\b') {    // a single backspace: invisible
                    escapedString += '\\b';  // write out as: \b"
                } else if (ch === '\f') {    // a single formfeed: invisible
                    escapedString += '\\f';  // write out as: \f"
                } else if (ch === '\n') {    // a single newline: invisible
                    escapedString += '\\n';  // write out as: \n"
                } else if (ch === '\r') {    // a single return: invisible
                    escapedString += '\\r';  // write out as: \r"
                } else if (ch === '\t') {    // a single tab: invisible
                    escapedString += '\\t';  // write out as: \t"
                } else {
                    escapedString += ch;     // Else it need not be escaped
                }
            }
            this.tstack.push('"' + escapedString + '"');
        }
    },

    /** Serializes a string */
    writeBinary: function(str) {
        this.writeString(str);
    },

    /**
       @class
       @name AnonReadMessageBeginReturn
       @property {string} fname - The name of the service method.
       @property {Thrift.MessageType} mtype - The type of message call.
       @property {number} rseqid - The sequence number of the message (0 in Thrift RPC).
     */
    /**
     * Deserializes the beginning of a message.
     * @returns {AnonReadMessageBeginReturn}
     */
    readMessageBegin: function() {
        this.rstack = [];
        this.rpos = [];

        if (typeof JSON !== 'undefined' && typeof JSON.parse === 'function') {
            var msg = this.transport.readAll();
            var regex = new RegExp('{"tf":[^01]}', "g");
            msg = msg.replace(regex, '{"tf":0}');
            try {
                this.robj = JSON.parse(msg);
            } catch (error) {
                console.error("thrift parse error", error, msg);
                this.robj = eval(this.transport.readAll());
            }

        } else if (typeof jQuery !== 'undefined') {
            var msg = this.transport.readAll();
            var regex = new RegExp('{"tf":[^01]}', "g");
            msg = msg.replace(regex, '{"tf":0}');
            try {
                this.robj = jQuery.parseJSON(msg);
            } catch (error) {
                console.error("thrift parse error", error, msg);
                this.robj = eval(this.transport.readAll());
            }
        } else {
            this.robj = eval(this.transport.readAll());
        }

        var r = {};
        var version = this.robj.shift();

        if (version != Thrift.Protocol.Version) {
            throw 'Wrong thrift protocol version: ' + version;
        }

        r.fname = this.robj.shift();
        r.mtype = this.robj.shift();
        r.rseqid = this.robj.shift();


        //get to the main obj
        this.rstack.push(this.robj.shift());

        return r;
    },

    /** Deserializes the end of a message. */
    readMessageEnd: function() {
    },

    /**
     * Deserializes the beginning of a struct.
     * @param {string} [name] - The name of the struct (ignored)
     * @returns {object} - An object with an empty string fname property
     */
    readStructBegin: function(name) {
        var r = {};
        r.fname = '';

        //incase this is an array of structs
        if (this.rstack[this.rstack.length - 1] instanceof Array) {
            this.rstack.push(this.rstack[this.rstack.length - 1].shift());
        }

        return r;
    },

    /** Deserializes the end of a struct. */
    readStructEnd: function() {
        if (this.rstack[this.rstack.length - 2] instanceof Array) {
            this.rstack.pop();
        }
    },

    /**
       @class
       @name AnonReadFieldBeginReturn
       @property {string} fname - The name of the field (always '').
       @property {Thrift.Type} ftype - The data type of the field.
       @property {number} fid - The unique identifier of the field.
     */
    /**
     * Deserializes the beginning of a field.
     * @returns {AnonReadFieldBeginReturn}
     */
    readFieldBegin: function() {
        var r = {};

        var fid = -1;
        var ftype = Thrift.Type.STOP;

        //get a fieldId
        for (var f in (this.rstack[this.rstack.length - 1])) {
            if (f === null) {
                continue;
            }

            fid = parseInt(f, 10);
            this.rpos.push(this.rstack.length);

            var field = this.rstack[this.rstack.length - 1][fid];

            //remove so we don't see it again
            delete this.rstack[this.rstack.length - 1][fid];

            this.rstack.push(field);

            break;
        }

        if (fid != -1) {

            //should only be 1 of these but this is the only
            //way to match a key
            for (var i in (this.rstack[this.rstack.length - 1])) {
                if (Thrift.Protocol.RType[i] === null) {
                    continue;
                }

                ftype = Thrift.Protocol.RType[i];
                this.rstack[this.rstack.length - 1] =
                    this.rstack[this.rstack.length - 1][i];
            }
        }

        r.fname = '';
        r.ftype = ftype;
        r.fid = fid;

        return r;
    },

    /** Deserializes the end of a field. */
    readFieldEnd: function() {
        var pos = this.rpos.pop();

        //get back to the right place in the stack
        while (this.rstack.length > pos) {
            this.rstack.pop();
        }

    },

    /**
       @class
       @name AnonReadMapBeginReturn
       @property {Thrift.Type} ktype - The data type of the key.
       @property {Thrift.Type} vtype - The data type of the value.
       @property {number} size - The number of elements in the map.
     */
    /**
     * Deserializes the beginning of a map.
     * @returns {AnonReadMapBeginReturn}
     */
    readMapBegin: function() {
        var map = this.rstack.pop();
        var first = map.shift();
        if (first instanceof Array) {
          this.rstack.push(map);
          map = first;
          first = map.shift();
        }

        var r = {};
        r.ktype = Thrift.Protocol.RType[first];
        r.vtype = Thrift.Protocol.RType[map.shift()];
        r.size = map.shift();


        this.rpos.push(this.rstack.length);
        this.rstack.push(map.shift());

        return r;
    },

    /** Deserializes the end of a map. */
    readMapEnd: function() {
        this.readFieldEnd();
    },

    /**
       @class
       @name AnonReadColBeginReturn
       @property {Thrift.Type} etype - The data type of the element.
       @property {number} size - The number of elements in the collection.
     */
    /**
     * Deserializes the beginning of a list.
     * @returns {AnonReadColBeginReturn}
     */
    readListBegin: function() {
        var list = this.rstack[this.rstack.length - 1];

        var r = {};
        r.etype = Thrift.Protocol.RType[list.shift()];
        r.size = list.shift();

        this.rpos.push(this.rstack.length);
        this.rstack.push(list);

        return r;
    },

    /** Deserializes the end of a list. */
    readListEnd: function() {
        this.readFieldEnd();
    },

    /**
     * Deserializes the beginning of a set.
     * @returns {AnonReadColBeginReturn}
     */
    readSetBegin: function(elemType, size) {
        return this.readListBegin(elemType, size);
    },

    /** Deserializes the end of a set. */
    readSetEnd: function() {
        return this.readListEnd();
    },

    /** Returns an object with a value property set to
     *  False unless the next number in the protocol buffer
     *  is 1, in which case teh value property is True */
    readBool: function() {
        var r = this.readI32();

        if (r !== null && r.value == '1') {
            r.value = true;
        } else {
            r.value = false;
        }

        return r;
    },

    /** Returns the an object with a value property set to the
        next value found in the protocol buffer */
    readByte: function() {
        return this.readI32();
    },

    /** Returns the an object with a value property set to the
        next value found in the protocol buffer */
    readI16: function() {
        return this.readI32();
    },

    /** Returns the an object with a value property set to the
        next value found in the protocol buffer */
    readI32: function(f) {
        if (f === undefined) {
            f = this.rstack[this.rstack.length - 1];
        }

        var r = {};

        if (f instanceof Array) {
            if (f.length === 0) {
                r.value = undefined;
            } else {
                r.value = f.shift();
            }
        } else if (f instanceof Object) {
           for (var i in f) {
                if (i === null) {
                  continue;
                }
                this.rstack.push(f[i]);
                delete f[i];

                r.value = i;
                break;
           }
        } else {
            r.value = f;
            this.rstack.pop();
        }

        return r;
    },

    /** Returns the an object with a value property set to the
        next value found in the protocol buffer */
    readI64: function() {
        return this.readI32();
    },

    /** Returns the an object with a value property set to the
        next value found in the protocol buffer */
    readDouble: function() {
        return this.readI32();
    },

    /** Returns the an object with a value property set to the
        next value found in the protocol buffer */
    readString: function() {
        var r = this.readI32();
        return r;
    },

    /** Returns the an object with a value property set to the
        next value found in the protocol buffer */
    readBinary: function() {
        return this.readString();
    },

    /**
     * Method to arbitrarily skip over data */
    skip: function(type) {
        var ret, i;
        switch (type) {
            case Thrift.Type.STOP:
                return null;

            case Thrift.Type.BOOL:
                return this.readBool();

            case Thrift.Type.BYTE:
                return this.readByte();

            case Thrift.Type.I16:
                return this.readI16();

            case Thrift.Type.I32:
                return this.readI32();

            case Thrift.Type.I64:
                return this.readI64();

            case Thrift.Type.DOUBLE:
                return this.readDouble();

            case Thrift.Type.STRING:
                return this.readString();

            case Thrift.Type.STRUCT:
                this.readStructBegin();
                while (true) {
                    ret = this.readFieldBegin();
                    if (ret.ftype == Thrift.Type.STOP) {
                        break;
                    }
                    this.skip(ret.ftype);
                    this.readFieldEnd();
                }
                this.readStructEnd();
                return null;

            case Thrift.Type.MAP:
                ret = this.readMapBegin();
                for (i = 0; i < ret.size; i++) {
                    if (i > 0) {
                        if (this.rstack.length > this.rpos[this.rpos.length - 1] + 1) {
                            this.rstack.pop();
                        }
                    }
                    this.skip(ret.ktype);
                    this.skip(ret.vtype);
                }
                this.readMapEnd();
                return null;

            case Thrift.Type.SET:
                ret = this.readSetBegin();
                for (i = 0; i < ret.size; i++) {
                    this.skip(ret.etype);
                }
                this.readSetEnd();
                return null;

            case Thrift.Type.LIST:
                ret = this.readListBegin();
                for (i = 0; i < ret.size; i++) {
                    this.skip(ret.etype);
                }
                this.readListEnd();
                return null;
        }
    }
};


/**
 * Initializes a MutilplexProtocol Implementation as a Wrapper for Thrift.Protocol
 * @constructor
 */
Thrift.MultiplexProtocol = function (srvName, trans, strictRead, strictWrite) {
    Thrift.Protocol.call(this, trans, strictRead, strictWrite);
    this.serviceName = srvName;
};
Thrift.inherits(Thrift.MultiplexProtocol, Thrift.Protocol, 'multiplexProtocol');

/** Override writeMessageBegin method of prototype*/
Thrift.MultiplexProtocol.prototype.writeMessageBegin = function (name, type, seqid) {

    if (type === Thrift.MessageType.CALL || type === Thrift.MessageType.ONEWAY) {
        Thrift.Protocol.prototype.writeMessageBegin.call(this, this.serviceName + ":" + name, type, seqid);
    } else {
        Thrift.Protocol.prototype.writeMessageBegin.call(this, name, type, seqid);
    }
};

Thrift.Multiplexer = function () {
    this.seqid = 0;
};

/** Instantiates a multiplexed client for a specific service
 * @constructor
 * @param {String} serviceName - The transport to serialize to/from.
 * @param {Thrift.ServiceClient} SCl - The Service Client Class
 * @param {Thrift.Transport} transport - Thrift.Transport instance which provides remote host:port
 * @example
 *    var mp = new Thrift.Multiplexer();
 *    var transport = new Thrift.Transport("http://localhost:9090/foo.thrift");
 *    var protocol = new Thrift.Protocol(transport);
 *    var client = mp.createClient('AuthService', AuthServiceClient, transport);
*/
Thrift.Multiplexer.prototype.createClient = function (serviceName, SCl, transport) {
    if (SCl.Client) {
        SCl = SCl.Client;
    }
    var self = this;
    SCl.prototype.new_seqid = function () {
        self.seqid += 1;
        return self.seqid;
    };
    var client = new SCl(new Thrift.MultiplexProtocol(serviceName, transport));

    return client;
};


global.Thrift = Thrift;
var jQuery;
var $;
var xcalarApi;
var xcHelper;
var PromiseHelper;
var XIApi;
var Transaction;
var SQLApi;
var SQLCompiler;

require("jsdom").env("", function(err, window) {
    console.log("initting jQuery");
    if (err) {
        console.error(err);
        return;
    }

    jQuery = require("jquery")(window);
    jQuery.md5 = require('../../../3rd/jQuery-MD5-master/jquery.md5.js').md5;
    global.jQuery = jQuery;
    global.$ = $ = jQuery;

    require("../../../assets/js/thrift/CsvLoadArgsEnums_types.js");
    require("../../../assets/js/thrift/DagRefTypeEnums_types.js");
    require("../../../assets/js/thrift/DagStateEnums_types.js");
    require("../../../assets/js/thrift/DagTypes_types.js");
    require("../../../assets/js/thrift/DataFormatEnums_types.js");
    require("../../../assets/js/thrift/DataTargetEnums_types.js");
    require("../../../assets/js/thrift/DataTargetTypes_types.js");
    require("../../../assets/js/thrift/FunctionCategory_types.js");
    require("../../../assets/js/thrift/JoinOpEnums_types.js");
    require("../../../assets/js/thrift/LibApisCommon_types.js");
    require("../../../assets/js/thrift/LibApisConstants_types.js");
    require("../../../assets/js/thrift/LibApisConstants_types.js");
    require("../../../assets/js/thrift/LibApisEnums_types.js");
    require("../../../assets/js/thrift/OrderingEnums_types.js");
    require("../../../assets/js/thrift/QueryStateEnums_types.js");
    require("../../../assets/js/thrift/SourceTypeEnum_types.js");
    require("../../../assets/js/thrift/Status_types.js");
    require("../../../assets/js/thrift/UdfTypes_types.js");
    require("../../../assets/js/shared/setup/enums.js");

    global.xcHelper = xcHelper = require("../../../assets/js/shared/util/xcHelper.js");
    global.xcGlobal = xcGlobal = require("../../../assets/js/shared/setup/xcGlobal.js");
    xcGlobal.setup();
    require("../../../assets/js/thrift/XcalarApiService.js");
    require("../../../assets/js/thrift/XcalarApiVersionSignature_types.js");
    require("../../../assets/js/thrift/XcalarApiServiceAsync.js");
    require("../../../assets/js/thrift/XcalarEvalEnums_types.js");
    xcalarApi = require("../../../assets/js/thrift/XcalarApi.js");


    global.PromiseHelper = PromiseHelper = require("../../../assets/js/promiseHelper.js");
    global.Transaction = Transaction = require("../../../assets/js/shared/helperClasses/transaction.js");


    hackFunction();

    require("../../../assets/js/XcalarThrift.js");
    global.XIApi = XIApi = require("../../../assets/js/shared/api/xiApi.js");
    global.SQLApi = SQLApi = require("../../../assets/js/components/sql/sqlApi.js");
    SQLCompiler = require("../../../assets/js/components/sql/sqlCompiler.js");
    require("../../../assets/lang/en/jsTStr.js");
});

function hackFunction() {
    global.TblManager = {
        setOrphanTableMeta: function() {}
    };

    global.ColManager = {
        newPullCol: function(colName, backColName, type) {
            if (backColName == null) {
                backColName = colName;
            }
            return {
                "backName": backColName,
                "name": colName,
                "type": type || null,
                "width": 100,
                "isNewCol": false,
                "userStr": '"' + colName + '" = pull(' + backColName + ')',
                "func": {
                    "name": "pull",
                    "args": [backColName]
                },
                "sizedTo": "header"
            };
        },

        newDATACol: function() {
            return {
                "backName": "DATA",
                "name": "DATA",
                "type": "object",
                "width": "auto",// to be determined when building table
                "userStr": "DATA = raw()",
                "func": {
                    "name": "raw",
                    "args": []
                },
                "isNewCol": false
            };
        }
    };

    global.Authentication = {
        getHashId: function() {
            return xcHelper.randName("#api");
        }
    };

    global.MonitorGraph = {
        tableUsageChange: function() {}
    };

    global.Log = {
        errorLog: function() { console.log.apply(this, arguments); }
    };
    global.DagEdit = {
        isEditMode: function() { return false; }
    };
}


var logInUser;
// Setting up Xcalar
exports.connect = function(hostname, username, id) {
    if (getTHandle() != null) {
        if (username !== logInUser) {
            return jQuery.Deferred().reject("Authentication fails").promise();
        } else {
            return XcalarGetVersion();
        }
    }
    var valid = xcalarApi.setUserIdAndName(username, id, jQuery.md5);
    if (valid) {
        setupThrift(hostname);
        logInUser = username;
        return XcalarGetVersion();
    } else {
        return jQuery.Deferred().reject("Authentication fails").promise();
    }
};

exports.getTables = function(tableName) {
    return XcalarGetTables(tableName);
};

exports.getRows = function(tableName, startRowNum, rowsToFetch) {
    var deferred = jQuery.Deferred();

    if (tableName === null || startRowNum === null ||
        rowsToFetch <= 0)
    {
        deferred.reject("Invalid args in fetch data");
        return deferred.promise();
    }

    var resultSetId;
    var finalData;

    XcalarMakeResultSetFromTable(tableName)
    .then(function(res) {
        resultSetId = res.resultSetId;
        var totalRows = res.numEntries;

        if (totalRows == null || totalRows === 0) {
            deferred.reject("No Data!");
            return deferred.promise();
        }

        // startRowNum starts with 1, rowPosition starts with 0
        var rowPosition = startRowNum - 1;
        if (rowsToFetch == null) {
            rowsToFetch = totalRows;
        }
        rowsToFetch = Math.min(rowsToFetch, totalRows);
        return XcalarFetchData(resultSetId, rowPosition, rowsToFetch,
                               totalRows, [], 0, 0);
    })
    .then(function(result) {
        finalData = [];
        for (var i = 0, len = result.length; i < len; i++) {
            finalData.push(result[i]);
        }
        return XcalarSetFree(resultSetId);
    })
    .then(function() {
        deferred.resolve(finalData);
    })
    .fail(function(error) {
        if (resultSetId != null) {
            XcalarSetFree(resultSetId);
        }
        deferred.reject(error);
    });

    return deferred.promise();
};

exports.query = function(queryString) {
    var deferred = jQuery.Deferred();
    var queryName = "query_restful" + (Math.floor(Math.random() * 10000) + 1);

    XcalarQuery(queryName, queryString, true)
    .then(function() {
        return XcalarQueryCheck(queryName);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
};

exports.groupBy = function(gbArgs, groupByCols, tableName, newTableName) {
    var deferred = jQuery.Deferred();
    var txId = Transaction.start();
    var options = {
        "newTableName": newTableName,
        "clean": true
    };
    
    XIApi.groupBy(txId, gbArgs, groupByCols, tableName, options)
    .then(function(finalTableName) {
        Transaction.done(txId);
        deferred.resolve(finalTableName);
    })
    .fail(function(error) {
        Transaction.fail(txId);
        deferred.reject(error);
    });

    return deferred.promise();
};

exports.sqlApi = function() {
    return new SQLApi().filter("eq('1, 2')", "srcTable", "dstTable");
};

exports.sql = function(sql) {
    sql = sql.replace(/\n/g, " ").trim().replace(/;+$/, "");
    console.log("execute sql", sql);
    var sqlCom = new SQLCompiler();
    return sqlCom.compile(sql, true);
};


var sqlDS;
var sqlTable;
var sqlUser = "xcalar-internal-sql";
var sqlId = 4193719;

exports.sqlLoad = function(path) {
    global.sqlMode = true;
    sqlDS = xcHelper.randName("sql.12345.ds");
    sqlTable = xcHelper.randName("SQL");
    var importTable = xcHelper.randName("importTable");
    var sqlTableAlias = "sql";

    var deferred = jQuery.Deferred();
    var dsArgs = {
        url: path,
        targetName: "Default Shared Root",
        maxSampleSize: 0
    };
    var formatArgs = {
        format: "JSON"
    };
    var txId = 1;

    exports.connect("localhost:9090", sqlUser, sqlId)
    .then(function() {
        console.log("connected");
        return goToSqlWkbk();
    })
    .then(function() {
        return XIApi.load(dsArgs, formatArgs, sqlDS, txId);
    })
    .then(function() {
        console.log("load dataset");
        return XIApi.indexFromDataset(txId, sqlDS, importTable, "p");
    })
    .then(function() {
        console.log("create table");
        return convertToDerivedColAndGetSchema(txId, importTable, sqlTable);
    })
    .then(function(schema) {
        // add tablename to schema
        var tableNameCell = {};
        tableNameCell["XC_TABLENAME_" + sqlTable] = "string";
        schema.push(tableNameCell);
        var res = {
            tableName: sqlTableAlias,
            schema: schema
        };
        console.log("get schema", schema);
        deferred.resolve(res);
    })
    .fail(deferred.reject)
    .always(function() {
        global.sqlMode = false;
    });

    return deferred.promise();
};

function goToSqlWkbk() {
    var wkbkName = "sql-workbook";
    var deferred = jQuery.Deferred();
    var activeSessionName = null;
    var sqlSession = null;

    XcalarListWorkbooks("*")
    .then(function(res) {
        res.sessions.forEach(function(session) {
            if (session.name === wkbkName) {
                sqlSession = session;
            }
            if (session.state === "Active") {
                activeSessionName = session.name;
            }
        });
        if (sqlSession == null) {
            return XcalarNewWorkbook(wkbkName, false);
        }
    })
    .then(function() {
        if (sqlSession != null && wkbkName !== activeSessionName) {
            return XcalarSwitchToWorkbook(wkbkName, activeSessionName);
        }
        setSessionName(wkbkName);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
}

function getSchema(tableName) {
    var deferred = jQuery.Deferred();

    exports.getRows(tableName, 1, 1)
    .then(function(data) {
        try {
            var row = JSON.parse(data);
            var colMap = [];
            var headers = [];
            for (var colName in row) {
                if (colName.startsWith("XC_ROW_COL_")) {
                    // this is auto-generated by xcalar
                    continue;
                }
                var type = typeof row[colName];
                if (type === "array" || type === "object") {
                    // array and object will be projected away
                    continue;
                } else if (type === "number") {
                    type = "float";
                }
                colMap[colName] = type;
                headers.push(colName);
            }
            headers.sort();
            var schema = headers.map(function(header) {
                var cell = {};
                cell[header] = colMap[header];
                return cell;
            });
            deferred.resolve(schema);
        } catch (e) {
            console.error("parse error", e);
            deferred.reject(e);
        }
    })
    .fail(deferred.reject);

    return deferred.promise();
}

function getDerivedCol(txId, tableName, schema, dstTable) {
    var deferred = jQuery.Deferred();
    var newSchema = [];
    var mapStrs = [];
    var newColNames = [];
    var newTableName = xcHelper.randName("tempTable");
    schema.forEach(function(cell) {
        var colName = Object.keys(cell)[0];
        var type = cell[colName];
        var newColName = xcHelper.parsePrefixColName(colName).name.toUpperCase();
        var mapFn;
        if (type === "number" || type === "float") {
            type = "float";
            mapFn = "float";
        } else if (type === "boolean") {
            mapFn = "bool";
        } else {
            mapFn = type;
        }

        var newCell = {};
        newCell[newColName] = type;
        newSchema.push(newCell);

        mapStrs.push(mapFn + "(" + colName + ")");
        newColNames.push(newColName);
    });

    XIApi.map(txId, mapStrs, tableName, newColNames, newTableName)
    .then(function() {
        return XIApi.project(txId, newColNames, newTableName, dstTable);
    })
    .then(function() {
        XIApi.deleteTable(txId, tableName);
        XIApi.deleteTable(txId, newTableName);
        deferred.resolve(newSchema);
    })
    .fail(deferred.reject);

    return deferred.promise();
}

function convertToDerivedColAndGetSchema(txId, tableName, dstTable) {
    var deferred = jQuery.Deferred();
    getSchema(tableName)
    .then(function(schema) {
        return getDerivedCol(txId, tableName, schema, dstTable);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
}

exports.sqlPlan = function(execid, planStr, rowsToFetch) {
    var deferred = jQuery.Deferred();
    if (rowsToFetch == null) {
        rowsToFetch = 10; // default to be 10
    }
    var finalTable;
    var schema;

    try {
        global.sqlMode = true;
        var plan = JSON.parse(planStr);
        exports.connect("localhost:9090", sqlUser, sqlId)
        .then(function() {
            console.log("connected");
            return goToSqlWkbk();
        })
        .then(function() {
            return new SQLCompiler().compile(plan, true);
        })
        .then(function(tableName) {
            console.log("get table from plan", tableName);
            finalTable = tableName;
            return getSchema(finalTable);
        })
        .then(function(res) {
            schema = res;
            return exports.getRows(finalTable, 1, rowsToFetch);
        })
        .then(function(data) {
            var result = parseRows(data, schema);
            XIApi.deleteTable(1, finalTable);
            var res = {
                execid: execid,
                schema: schema,
                result: result
            };
            deferred.resolve(res);
        })
        .fail(deferred.reject)
        .always(function() {
            global.sqlMode = false;
        });
    } catch (e) {
        global.sqlMode = false;
        console.error("plan parse error", e);
        deferred.reject(e);
    }

    return deferred.promise();
};

function parseRows(data, schema) {
    try {
        var headers = schema.map(function(cell) {
            return Object.keys(cell)[0];
        });

        var rows = data.map(function(row) {
            row = JSON.parse(row);
            return headers.map(function(header) {
                return row[header];
            });
        });
        return rows;
    } catch (e) {
        console.error(e);
        return null;
    }
}
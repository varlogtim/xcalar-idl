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
var PromiseHelper;
var xcHelper;

require("jsdom").env("", function(err, window) {
    console.log("initting jQuery");
    if (err) {
        console.error(err);
        return;
    }

    jQuery = require("jquery")(window);
    jQuery.md5 = require('../../3rd/jQuery-MD5-master/jquery.md5.js').md5;
    global.jQuery = jQuery;
    global.$ = $ = jQuery;
    PromiseHelper = getPromiseHelper(jQuery);
    xcHelper = getXcHelper(jQuery);
});

function getXcHelper($) {
    var xcHelper = {};
    var gPrefixSign = '::';

    xcHelper.capitalize = function(s) {
        if (!s) {
            return s;
        }
        return s[0].toUpperCase() + s.slice(1);
    };

    xcHelper.randName = function(name, digits) {
        if (digits == null) {
            digits = 5; // default
        }

        var max = Math.pow(10, digits);
        var rand = Math.floor(Math.random() * max);

        if (rand === 0) {
            rand = 1;
        }

        function padZero(number, numDigits) {
            number = number.toString();
            return (number.length < numDigits) ?
                    new Array(numDigits - number.length + 1).join('0') + number :
                    number;
        }

        rand = padZero(rand, digits);
        return (name + rand);
    };

    xcHelper.getTableName = function(wholeName) {
        // get out tableName from tableName + hashId
        var hashIndex = wholeName.lastIndexOf('#');
        var tableName;
        if (hashIndex > -1) {
            tableName = wholeName.substring(0, hashIndex);
        } else {
            tableName = wholeName;
        }
        return tableName;
    };

    xcHelper.isStartWithLetter = function(str) {
        if (str == null) {
            return false;
        }
        return /^[a-zA-Z]/.test(str);
    };

    xcHelper.isValidTableName = function(str) {
        if (str == null || str === "") {
            return false;
        }

        // has to start with alpha character
        if (!xcHelper.isStartWithLetter(str)) {
            return false;
        }

        // cannot have any characters other than alphanumeric
        // or _ -
        return !/[^a-zA-Z\d\_\-]/.test(str);
    };

    xcHelper.stripColName = function(colName) {
        var res = colName.split(/[\[\]\.\\]/g).filter(function(str) {
            return (str !== "");
        }).join("_");
        return res;
    };

    // get a deep copy
    xcHelper.deepCopy = function(obj) {
        var string = JSON.stringify(obj);
        var res;

        try {
            res = JSON.parse(string);
        } catch (err) {
            console.error(err, string);
        }

        return (res);
    };

    xcHelper.getPrefixColName = function(prefix, colName) {
        if (prefix == null || prefix === "") {
            return colName;
        } else {
            return prefix + gPrefixSign + colName;
        }
    };

    xcHelper.parsePrefixColName = function(colName) {
        var index = colName.indexOf(gPrefixSign);
        var prefix = "";
        if (index >= 0) {
            prefix = colName.substring(0, index);
            colName = colName.substring(index + gPrefixSign.length);
        }

        return {
            "prefix": prefix,
            "name": colName,
        };
    };

    xcHelper.getMultiJoinMapString = function(args) {
        var mapStr = "";
        var len = args.length;
        for (var i = 0; i < len - 1; i++) {
            mapStr += 'concat(string(' + args[i] + '), concat(".Xc.", ';
        }

        mapStr += 'string(' + args[len - 1] + ')';
        mapStr += "))".repeat(len - 1);
        return mapStr;
    };

    xcHelper.getTableKeyFromMeta = function(tableMeta) {
        var keyAttr = tableMeta.keyAttr;
        var keyName = keyAttr.name;
        var valueArrayIndex = keyAttr.valueArrayIndex;

        var valueAttrs = tableMeta.valueAttrs || [];
        var prefixOfKey = "";
        if (valueArrayIndex >= 0 && valueAttrs[valueArrayIndex] != null &&
            valueAttrs[valueArrayIndex].type === DfFieldTypeT.DfFatptr)
        {
            prefixOfKey = valueAttrs[valueArrayIndex].name;
        } else if (valueArrayIndex < 0) {
            return null;
        }
        keyName = xcHelper.getPrefixColName(prefixOfKey, keyName);
        return keyName;
    };

    return (xcHelper);
}

function getPromiseHelper(jQuery) {
    var PromiseHelper = {};
    var gMutePromises = true;
    /**
    oneIter: Function that returns a promise. It represents one iteration of the
    loop.
    args: Arguments to apply to oneIter. Must be in an array
    condition: This is what we are going to call eval on. So this is a string
    that can take in arguments as in put and do whatever it wants with it. For
    example, if oneIter returns an integer, and we want to terminate if the
    integer is < 0.01(opaqueArgs.threshold), then
    condition = "arguments[0] < opaqueArgs.threshold"
    opaqueArgs: User can choose to use this argument in the condition. This
    function will not touch this argument and will not use it unless the caller
    manipulates it in side condition
    */
    PromiseHelper.deferred = function() {
        return jQuery.Deferred();
    };

    PromiseHelper.doWhile = function(oneIter, args, condition, opaqueArgs) {
        // XXX: Type check!
        function doWork() {
            return (oneIter.apply({}, args)
                    .then(function() {
                        if (!eval(condition)) {
                            return doWork();
                        }
                    })
                );
        }
        return doWork();
    };

    /**
    Same thing as doWhile except that it checks for the condition first before
    kicking into doWhile loop
    */
    PromiseHelper.while = function(oneIter, args, condition, opaqueArgs) {
        if (!eval(condition)) {
            return PromiseHelper.doWhile(oneIter, args, condition, opaqueArgs);
        } else {
            return PromiseHelper.resolve();
        }
    };

    /**
    Runs all promises in the argument in parallel and resolves when all of
    them are complete or fails
    */
    PromiseHelper.when = function() {
        var numProm = arguments.length;
        if (numProm === 0) {
            return PromiseHelper.resolve(null);
        }
        var mainDeferred = jQuery.Deferred();

        var numDone = 0;
        var returns = [];
        var argument = arguments;
        var hasFailures = false;

        for (var t = 0; t < numProm; t++) {
            whenCall(t);
        }

        function whenCall(i) {
            argument[i].then(function() {
                if (!gMutePromises) {
                    console.log("Promise", i, "done!");
                }
                numDone++;
                if (arguments.length === 0) {
                    returns[i] = undefined;
                } else if (arguments.length === 1) {
                    returns[i] = arguments[0];
                } else {
                    returns[i] = arguments;
                }

                if (numDone === numProm) {
                    if (!gMutePromises) {
                        console.log("All done!");
                    }
                    if (hasFailures) {
                        mainDeferred.reject.apply(jQuery, returns);
                    } else {
                        mainDeferred.resolve.apply(jQuery, returns);
                    }
                }
            }, function() {
                console.warn("Promise", i, "failed!");
                numDone++;
                if (arguments.length === 0) {
                    returns[i] = undefined;
                } else if (arguments.length === 1) {
                    returns[i] = arguments[0];
                } else {
                    returns[i] = arguments;
                }
                hasFailures = true;
                if (numDone === numProm) {
                    console.log("All done!");
                    mainDeferred.reject.apply(jQuery, returns);
                }

            });
        }

        return (mainDeferred.promise());
    };

    /**
    Chains the promises such that only after promiseArray[i] completes, then
    promiseArray[i+1] will start.
    */
    PromiseHelper.chain = function(promiseArray) {
        // Takes an array of promise *generators*.
        // This means that promisearray[i]() itself calls a promise.
        // Reason for this being, promises start executing the moment they are
        // called, so you need to prevent them from being called in the first place.
        if (!promiseArray ||
            !Array.isArray(promiseArray) ||
            typeof promiseArray[0] !== "function") {
            return PromiseHelper.resolve(null);
        }
        var head = promiseArray[0]();
        for (var i = 1; i < promiseArray.length; i++) {
            head = head.then(promiseArray[i]);
        }
        return (head);
    };

    PromiseHelper.chainHelper = function(promiseFunction, valueArr) {
        // Takes a function that returns a promise, and an array of values
        // to pass to that promise in a chain order..
        var promiseGeneratorClosures = [];
        for (var i = 0; i < valueArr.length; i++) {
            var promiseClosure = (function(someArg) {
                return (function() {
                    return promiseFunction(someArg);
                });
            })(valueArr[i]);
            promiseGeneratorClosures.push(promiseClosure);
        }
        return PromiseHelper.chain(promiseGeneratorClosures);
    };

    /* Always resolve when passed in promise is done */
    PromiseHelper.alwaysResolve = function(def) {
        var deferred = jQuery.Deferred();
        def.always(deferred.resolve);
        return deferred.promise();
    };

    /* return a promise with resvoled value */
    PromiseHelper.resolve = function() {
        var deferred = jQuery.Deferred();
        deferred.resolve.apply(this, arguments);
        return deferred.promise();
    };

    /* return a promise with rejected error */
    PromiseHelper.reject = function() {
        var deferred = jQuery.Deferred();
        deferred.reject.apply(this, arguments);
        return deferred.promise();
    };

    return (PromiseHelper);
}

require("../../assets/js/thrift/DagStateEnums_types.js");
require("../../assets/js/thrift/DagTypes_types.js");
require("../../assets/js/thrift/DataFormatEnums_types.js");
require("../../assets/js/thrift/DataTargetEnums_types.js");
require("../../assets/js/thrift/DataTargetTypes_types.js");
require("../../assets/js/thrift/FunctionCategory_types.js");
require("../../assets/js/thrift/JoinOpEnums_types.js");
require("../../assets/js/thrift/LibApisCommon_types.js");
require("../../assets/js/thrift/LibApisConstants_types.js");
require("../../assets/js/thrift/LibApisConstants_types.js");
require("../../assets/js/thrift/LibApisEnums_types.js");
require("../../assets/js/thrift/OrderingEnums_types.js");
require("../../assets/js/thrift/QueryStateEnums_types.js");
require("../../assets/js/thrift/SourceTypeEnum_types.js");
require("../../assets/js/thrift/Status_types.js");
require("../../assets/js/thrift/UdfTypes_types.js");
require("../../assets/js/thrift/XcalarApiService.js");
require("../../assets/js/thrift/XcalarApiVersionSignature_types.js");
require("../../assets/js/thrift/XcalarApiServiceAsync.js");
var xcalarApi = require("../../assets/js/thrift/XcalarApi.js");

function XcalarGetTableMeta(tableName) {
    var deferred = jQuery.Deferred();
    if (tHandle == null) {
        deferred.resolve(0);
    } else {
        var isPrecise = false; // Set to true if you are collecting stats from
                               // the backend about xdb pages and hashslots.
        xcalarGetTableMeta(tHandle, tableName, isPrecise)
        .then(deferred.resolve)
        .fail(deferred.reject);
    }
    return deferred.promise();
}

function searchTableMetaForKey(key, tableName) {
    var deferred = jQuery.Deferred();
    XcalarGetTableMeta(tableName)
    .then(function(tableMeta) {
        var colObjs = tableMeta.valueAttrs;
        for (var i = 0; i < colObjs.length; i++) {
            var colObj = colObjs[i];
            if (colObj.name === key &&
                colObj.type !== DfFieldTypeT.DfFatptr) {
                deferred.resolve(colObj.type);
                return;
            }
        }
        deferred.resolve(null);
    })
    .fail(function() {
        // just pass with null
        deferred.resolve(null);
    });

    return deferred.promise();
}

function XcalarIndexFromTable(srcTablename, key, tablename, ordering, txId, unsorted) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    var dhtName = ""; // XXX TODO fill in later
    var unsortedSrcTablename = srcTablename;

    searchTableMetaForKey(key, unsortedSrcTablename)
    .then(function(keyType) {
        return xcalarIndexTable(tHandle, unsortedSrcTablename, key,
                                tablename, dhtName, ordering, keyType);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
}

function XcalarMap(newFieldName, evalStr, srcTablename, dstTablename,
                   txId, doNotUnsort, icvMode) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (evalStr.length > XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
        deferred.reject(thriftLog("XcalarMap", "Eval string too long"));
        return deferred.promise();
    }

    var unsortedSrcTablename = srcTablename;

    xcalarApiMap(tHandle, newFieldName, evalStr,
                unsortedSrcTablename, dstTablename, icvMode)
    .then(function(ret1, ret2) {
        deferred.resolve(ret1);
    })
    .fail(deferred.reject);

    return deferred.promise();
}

function XcalarGroupBy(operator, newColName, oldColName, tableName,
                       newTableName, incSample, icvMode, newKeyFieldName, txId)
{
    var deferred = jQuery.Deferred();
    var evalStr;

    XIApi.genAggStr(oldColName, operator)
    .then(function(res) {
        evalStr = res;
        if (evalStr === "") {
            return PromiseHelper.reject("Wrong operator! " + operator);
        } else if (evalStr.length > XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
            return PromiseHelper.reject("Eval string too long");
        }

        return PromiseHelper.resolve(tableName);
    })
    .then(function(unsortedTableName) {
        return xcalarGroupBy(tHandle, unsortedTableName, newTableName,
                                 evalStr, newColName, incSample, icvMode,
                                 newKeyFieldName);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
}

function XcalarDeleteTable(tableName, txId, isRetry) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    return xcalarDeleteDagNodes(tHandle, tableName, SourceTypeT.SrcTable);
}

// XIApi:
var XIApi = {};
XIApi.checkOrder = function(tableName) {
    if (tableName == null) {
        return PromiseHelper.reject("Invalid args in checkOrder");
    }

    var deferred = jQuery.Deferred();
    XcalarGetTableMeta(tableName)
    .then(function(tableMeta) {
        var order = tableMeta.ordering;
        var keyName = xcHelper.getTableKeyFromMeta(tableMeta);
        deferred.resolve(order, keyName);
    })
    .fail(deferred.reject);

    return deferred.promise();
};

XIApi.genAggStr = function(fieldName, op) {
    var deferred = jQuery.Deferred();
    if (op && op.length) {
        op = op.slice(0, 1).toLowerCase() + op.slice(1);
    }

    var evalStr = op + "(" + fieldName + ")";
    deferred.resolve(evalStr);
    return deferred.promise();
};

XIApi.map = function(txId, mapStr, tableName, newColName, newTableName, icvMode) {
    if (txId == null || mapStr == null ||
        tableName == null || newColName == null)
    {
        return PromiseHelper.reject("Invalid args in map");
    }

    var deferred = jQuery.Deferred();

    if (!isValidTableName(newTableName)) {
        newTableName = getNewTableName(tableName);
    }

    XcalarMap(newColName, mapStr, tableName, newTableName, txId, false, icvMode)
    .then(function() {
        deferred.resolve(newTableName);
    })
    .fail(deferred.reject);

    return deferred.promise();
};

/*
 * gbArgs: an array of objects with operator, aggColName, and newColName
 *         properties - for multi group by operations
 * options:
 *  isIncSample: true/false, include sample or not,
 *               not specified is equal to false
 *  sampleCols: array, sampleColumns to keep,
 *              only used when isIncSample is true
 *  icvMode: true/false, icv mode or not
 *  newTableName: string, dst table name, optional
 *  clean: true/false, if set true, will remove intermediate tables
 */
XIApi.groupBy = function(txId, gbArgs, groupByCols, tableName, options) {
    if (txId == null || gbArgs == null || groupByCols == null ||
        tableName == null || gbArgs[0].newColName == null ||
        gbArgs[0].aggColName.length < 1 || gbArgs[0].operator == null)
    {
        return PromiseHelper.reject("Invalid args in groupby");
    }

    options = options || {};
    var isIncSample = options.isIncSample || false;
    var sampleCols = options.sampleCols || [];
    var icvMode = options.icvMode || false;
    var finalTableName = options.newTableName || null;
    var clean = options.clean || false;

    if (!(groupByCols instanceof Array)) {
        groupByCols = [groupByCols];
    }

    if (groupByCols.length < 1) {
        return PromiseHelper.reject("Invalid args in groupby groupByCols");
    }

    var deferred = jQuery.Deferred();

    var tempTables = [];
    var indexedTable;
    var indexedColName;
    var finalTable;
    var gbTableName = null;
    var isMultiGroupby = (groupByCols.length > 1);
    var unstrippedIndexedColName;

    var finalCols = getFinalGroupByCols(tableName, groupByCols, gbArgs,
                                        isIncSample, sampleCols);
    // tableName is the original table name that started xiApi.groupby
    getGroupbyIndexedTable(txId, tableName, groupByCols)
    .then(function(resTable, resCol, tempTablesInIndex) {
        // table name may have changed after sort!
        indexedTable = resTable;
        unstrippedIndexedColName = resCol;
        indexedColName = xcHelper.stripColName(resCol);
        tempTables = tempTables.concat(tempTablesInIndex);

        // get name from src table
        if (finalTableName == null) {
            finalTableName = getNewTableName(tableName, "-GB");
        }
        var promises = [];

        gbTableName = finalTableName;
        var sample = isIncSample;
        for (var i = 0; i < gbArgs.length; i++) {
            if (gbArgs.length > 1) {
                gbTableName = getNewTableName(finalTableName);
            }
            if (i > 0) {
                // only do sample on first groupby
                sample = false;
            }
            var newKeyFieldName = xcHelper.parsePrefixColName(indexedColName)
                                          .name;
            if (sample) {
                // incSample does not take renames
                newKeyFieldName = null;
            }
            promises.push(XcalarGroupBy(gbArgs[i].operator,
                gbArgs[i].newColName, gbArgs[i].aggColName,
                indexedTable, gbTableName, sample, icvMode, newKeyFieldName,
                txId));
        }
        return PromiseHelper.when.apply(null, promises);
    })
    .then(function() {
        // var args = arguments;
        // if (!isIncSample) {
        //     indexedColName = xcHelper.parsePrefixColName(indexedColName)
        //                              .name;
        // }

        // return groupByJoinHelper(txId, indexedColName,
        //                     unstrippedIndexedColName, finalTableName,
        //                         gbArgs, args, isIncSample);
    })
    .then(function() {
        finalTableName = gbTableName;
        if (isMultiGroupby && !isIncSample) {
            // multi group by should extract column from groupby table
            return extractColFromMap(tableName, finalTableName, groupByCols,
                                     indexedColName, finalCols, txId);
        } else {
            return PromiseHelper.resolve(finalTableName, []);
        }
    })
    .then(function(resTable, tempTablesInMap) {
        finalTable = resTable;
        tempTables = tempTables.concat(tempTablesInMap);
        if (clean) {
            // remove intermediate table
            return XIApi.deleteTableAndMetaInBulk(txId, tempTables, true);
        }
    })
    .then(function() {
        deferred.resolve(finalTable, finalCols);
    })
    .fail(deferred.reject);

    return deferred.promise();
};

// toIgnoreError: boolean, if set true, will always resolve
// the promise even the call fails.
XIApi.deleteTable = function(txId, tableName, toIgnoreError) {
    if (txId == null || tableName == null) {
        return PromiseHelper.reject("Invalid args in delete table");
    }

    var deferred = jQuery.Deferred();

    XcalarDeleteTable(tableName, txId)
    .then(deferred.resolve)
    .fail(function(error) {
        if (toIgnoreError) {
            deferred.resolve();
        } else {
            deferred.reject(error);
        }
    });

    return deferred.promise();
};

XIApi.deleteTableAndMeta = function(txId, tableName, toIgnoreError) {
    var deferred = jQuery.Deferred();

    XIApi.deleteTable(txId, tableName, toIgnoreError)
    .then(function() {
        deferred.resolve();
    })
    .fail(function(error) {
        console.error("Drop Table Failed!", error);
        deferred.reject(error);
    });

    return deferred.promise();
};

XIApi.deleteTableAndMetaInBulk = function(txId, tables, toIgnoreError) {
    var promises = [];
    for (var i = 0, len = tables.length; i < len; i++) {
        var def = XIApi.deleteTableAndMeta(txId, tables[i], toIgnoreError);
        promises.push(def);
    }
    return PromiseHelper.when.apply(this, promises);
};


// check if table has correct index
function checkTableIndex(colName, tableName, txId) {
    var deferred = jQuery.Deferred();
    var shouldIndex = true;
    var tempTables = [];

    XIApi.checkOrder(tableName)
    .then(function(order, keyName) {
        if (keyName === colName) {
            if (order === XcalarOrderingT.XcalarOrderingAscending ||
                order === XcalarOrderingT.XcalarOrderingDescending) {
                return PromiseHelper.reject("Current RESTful API don't support groupBy on sorted column");
            }

            shouldIndex = false;
        }
        var unsortedTable = tableName;
        if (shouldIndex) {
            console.log(tableName, "not indexed correctly!");
            // XXX In the future,we can check if there are other tables that
            // are indexed on this key. But for now, we reindex a new table
            var newTableName = getNewTableName(tableName, ".index");
            XcalarIndexFromTable(unsortedTable, colName, newTableName,
                                 XcalarOrderingT.XcalarOrderingUnordered,
                                 txId)
            .then(function() {
                tempTables.push(newTableName);
                deferred.resolve(newTableName, shouldIndex, tempTables);
            })
            .fail(function(error) {
                if (error.code === StatusT.StatusAlreadyIndexed) {
                    deferred.resolve(unsortedTable, false, tempTables);
                } else {
                    deferred.reject(error);
                }
            });
        } else {
            console.log(tableName, "indexed correctly!");
            deferred.resolve(unsortedTable, shouldIndex, tempTables);
        }
    })
    .fail(deferred.reject);

    return deferred.promise();
}

function concatGroupByCols(txId, tableName, groupByCols) {
    if (groupByCols.length <= 1) {
        return PromiseHelper.resolve(groupByCols[0], tableName, []);
    }

    var deferred = jQuery.Deferred();
    var mapStr = xcHelper.getMultiJoinMapString(groupByCols);
    var groupByField = xcHelper.randName("multiGroupBy");

    XIApi.map(txId, mapStr, tableName, groupByField)
    .then(function(tableAfterMap) {
        deferred.resolve(groupByField, tableAfterMap, [tableAfterMap]);
    })
    .fail(deferred.reject);

    return deferred.promise();
}

function getGroupbyIndexedTable(txId, tableName, groupByCols) {
    // From Jerene:
    // 1. merge multi columns into one using concat xdf
    // 2. sort this merged column
    var deferred = jQuery.Deferred();
    var groupByField;
    var tempTables = [];

    concatGroupByCols(txId, tableName, groupByCols)
    .then(function(resCol, resTable, resTempTables) {
        tempTables = resTempTables || [];
        groupByField = resCol;
        return checkTableIndex(resCol, resTable, txId);
    })
    .then(function(indexedTable, shouldIndex, temIndexTables) {
        tempTables = tempTables.concat(temIndexTables);
        deferred.resolve(indexedTable, groupByField, tempTables);
    })
    .fail(deferred.reject);

    return deferred.promise();
}

function getFinalGroupByCols(tableName, groupByCols, gbArgs,
                             isIncSample, sampleCols) {
    return [];
}

function extractColFromMap(srcTableName, groupbyTableName, groupByCols,
                           indexedColName, finalTableCols, txId)
{
    var deferred = jQuery.Deferred();

    var numGroupByCols = groupByCols.length;
    var groupByColTypes = new Array(numGroupByCols);

    // XXX Jerene: Okay this is really dumb, but we have to keep mapping
    var mapStrStarter = "cut(" + indexedColName + ", ";
    var tableCols = extractColGetColHelper(finalTableCols, 0);

    var promises = [];
    var currTableName = groupbyTableName;
    var tempTables = [];

    for (var i = 0; i < numGroupByCols; i++) {
        var mapStr = mapStrStarter + (i + 1) + ", " + '".Xc."' + ")";
        // convert type
        // XXX FIXME if need more other types
        if (groupByColTypes[i] === "integer") {
            mapStr = "int(" + mapStr + ")";
        } else if (groupByColTypes[i] === "float") {
            mapStr = "float(" + mapStr + ")";
        } else if (groupByColTypes[i] === "boolean") {
            mapStr = "bool(" + mapStr + ")";
        }

        var newTableName = getNewTableName(currTableName);
        var isLastTable = (i === groupByCols.length - 1);
        tableCols = extractColGetColHelper(finalTableCols, i + 1);

        var parsedName = xcHelper.parsePrefixColName(groupByCols[i]).name;
        parsedName = xcHelper.stripColName(parsedName);
        var args = {
            "colName": parsedName,
            "mapString": mapStr,
            "srcTableName": currTableName,
            "newTableName": newTableName
        };

        promises.push(extracColMapHelper.bind(this, args, tableCols,
                                              isLastTable, txId));
        tempTables.push(currTableName);
        currTableName = newTableName;
    }
    var lastTableName = currTableName;
    PromiseHelper.chain(promises)
    .then(function() {
        deferred.resolve(lastTableName, tempTables);
    })
    .fail(deferred.reject);

    return deferred.promise();
}

function extractColGetColHelper(tableCols, index) {
    var newCols = xcHelper.deepCopy(tableCols);
    newCols.splice(index + 1, newCols.length - index - 2);
    // Note that after splice, newCols.length changes

    return newCols;
}

function extracColMapHelper(mapArgs, tableCols, isLastTable, txId) {
    var deferred = jQuery.Deferred();

    var colName = mapArgs.colName;
    var mapStr = mapArgs.mapString;
    var srcTableName = mapArgs.srcTableName;
    var newTableName = mapArgs.newTableName;

    XcalarMap(colName, mapStr, srcTableName, newTableName, txId)
    .then(function() {
        deferred.resolve();
    })
    .fail(deferred.reject);

    return deferred.promise();
}

function isValidTableName(tableName) {
    var isValid = isCorrectTableNameFormat(tableName);

    if (!isValid) {
        if (tableName != null) {
            console.error("incorrect table name format");
        }
        return false;
    }

    var namePart = xcHelper.getTableName(tableName);
    // allow table name to start with dot
    isValid = xcHelper.isValidTableName(namePart);
    if (!isValid) {
        // we allow name that has dot internally
        namePart = namePart.replace(/\./g, "");
        isValid = xcHelper.isValidTableName(namePart);
    }
    if (!isValid) {
        if (tableName != null) {
            console.error("incorrect table name format");
        }
    }
    return isValid;
}

function isCorrectTableNameFormat(tableName) {
    if (tableName == null || tableName === "") {
        return false;
    }

    var regex = "^.*#[a-zA-Z0-9]{2}[0-9]+$";
    var regexp = new RegExp(regex);
    return regexp.test(tableName);
}

function getNewTableName(tableName, affix, rand) {
    var nameRoot = xcHelper.getTableName(tableName);

    if (affix != null) {
        nameRoot += affix;
    }

    if (rand) {
        nameRoot = xcHelper.randName(nameRoot);
    }

    return (nameRoot + Authentication.getHashId());
}

Authentication = {
    getHashId: function() {
        return xcHelper.randName("#api");
    }
};
// End of XIApi



function getUserIdUnique(name) {
    var hash = jQuery.md5(name);
    var len = 5;
    var id = parseInt("0x" + hash.substring(0, len)) + 4000000;
    return id;
}

var tHandle;
var logInUser;
// Setting up Xcalar
exports.connect = function(hostname, username, id) {
    if (tHandle != null) {
        if (username !== logInUser) {
            return jQuery.Deferred().reject("Authentication fails").promise();
        } else {
            return xcalarGetVersion(tHandle);
        }
    }
    hostname = hostname + ":9090";
    var valid = xcalarApi.setUserIdAndName(username, id, jQuery.md5);
    if (valid) {
        tHandle = xcalarConnectThrift(hostname);
        logInUser = username;
        return xcalarGetVersion(tHandle);
    } else {
        return jQuery.Deferred().reject("Authentication fails").promise();
    }
};

exports.getTables = function(tableName) {
    return xcalarListTables(tHandle, tableName, SourceTypeT.SrcTable);
};

function XcalarFetchData(resultSetId, rowPosition, rowsToFetch, totalRows, data, tryCnt) {
    var deferred = jQuery.Deferred();
    if (tryCnt == null) {
        tryCnt = 0;
    }

    if (data == null) {
        data = [];
    }

    // row position start with 0
    xcalarResultSetAbsolute(tHandle, resultSetId, rowPosition)
    .then(function() {
        return xcalarResultSetNext(tHandle, resultSetId, rowsToFetch);
    })
    .then(function(tableOfEntries) {
        var kvPairs = tableOfEntries.kvPair;
        var numKvPairs = tableOfEntries.numKvPairs;
        var numStillNeeds = 0;

        if (numKvPairs < rowsToFetch) {
            if (rowPosition + numKvPairs >= totalRows) {
                numStillNeeds = 0;
            } else {
                numStillNeeds = rowsToFetch - numKvPairs;
            }
        }

        kvPairs.forEach(function(kvPair) {
            data.push(kvPair);
        });

        if (numStillNeeds > 0) {
            console.info("fetch not finish", numStillNeeds);
            if (tryCnt >= 20) {
                console.warn("Too may tries, stop");
                return PromiseHelper.resolve();
            }

            var newPosition;
            if (numStillNeeds === rowsToFetch) {
                // fetch 0 this time
                newPosition = rowPosition + 1;
                console.warn("cannot fetch position", rowPosition);
            } else {
                newPosition = rowPosition + numKvPairs;
            }

            return XcalarFetchData(resultSetId, newPosition, numStillNeeds,
                                    totalRows, data, tryCnt + 1);
        }
    })
    .then(function() {
        deferred.resolve(data);
    })
    .fail(deferred.reject);

    return deferred.promise();
}

exports.getRows = function(tableName, startRowNum, rowsToFetch) {
    var deferred = jQuery.Deferred();

    if (tableName === null || startRowNum === null ||
        rowsToFetch === null || rowsToFetch <= 0)
    {
        deferred.reject("Invalid args in fetch data");
        return deferred.promise();
    }

    var resultSetId;
    var finalData;

    xcalarMakeResultSetFromTable(tHandle, tableName)
    .then(function(res) {
        resultSetId = res.resultSetId;
        var totalRows = res.numEntries;

        if (totalRows == null || totalRows === 0) {
            deferred.reject("No Data!");
            return deferred.promise();
        }

        // startRowNum starts with 1, rowPosition starts with 0
        var rowPosition = startRowNum - 1;
        rowsToFetch = Math.min(rowsToFetch, totalRows);
        return XcalarFetchData(resultSetId, rowPosition, rowsToFetch,
                               totalRows, [], 0);
    })
    .then(function(result) {
        finalData = [];
        for (var i = 0, len = result.length; i < len; i++) {
            finalData.push(result[i].value);
        }
        return xcalarFreeResultSet(tHandle, resultSetId);
    })
    .then(function() {
        deferred.resolve(finalData);
    })
    .fail(function(error) {
        if (resultSetId != null) {
            xcalarFreeResultSet(tHandle, resultSetId);
        }
        deferred.reject(error);
    });

    return deferred.promise();
};

exports.query = function(queryString) {
    var deferred = jQuery.Deferred();
    var queryName = "query_restful" + (Math.floor(Math.random() * 10000) + 1);

    xcalarQuery(tHandle, queryName, queryString, true)
    .then(function() {
        return XcalarQueryCheck(queryName);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
};

// used to check when a query finishes or when a queryCancel finishes
function XcalarQueryCheck(queryName, canceling) {
    var deferred = jQuery.Deferred();
    var checkTime = 1000;// 1s per check
    if (canceling) {
        checkTime = 2000;
    }
    cycle();

    function cycle() {
        setTimeout(function() {
            xcalarQueryState(tHandle, queryName)
            .then(function(queryStateOutput) {
                var state = queryStateOutput.queryState;
                if (state === QueryStateT.qrFinished ||
                    state === QueryStateT.qrCancelled) {
                    // clean up query when done
                    xcalarQueryDelete(tHandle, queryName)
                    .always(function() {
                        deferred.resolve(queryStateOutput);
                    });
                } else if (state === QueryStateT.qrError) {
                    // clean up query when done
                    xcalarQueryDelete(tHandle, queryName)
                    .always(function() {
                        deferred.reject(queryStateOutput.queryStatus);
                    });
                } else {
                    cycle();
                }
            })
            .fail(function() {
                if (canceling) {
                    xcalarQueryDelete(tHandle, queryName);
                }
                deferred.reject.apply(this, arguments);
            });
        }, checkTime);
    }

    return deferred.promise();
}

exports.groupBy = function(operator, groupByCols, aggColName, tableName, newColName, newTableName) {
    var txId = xcHelper.randName("apiTXId");
    var options = {
        "newTableName": newTableName,
        "clean": true
    };

    var gbArgs = [{
        "aggColName": aggColName,
        "operator": parseOpeartor(operator),
        "newColName": newColName
    }];
    return XIApi.groupBy(txId, gbArgs, groupByCols, tableName, options);
};

function parseOpeartor(op) {
    var AggrOp = {
        "Max": "Max",
        "Min": "Min",
        "Avg": "Avg",
        "Count": "Count",
        "Sum": "Sum",
        "MaxInteger": "MaxInteger",
        "MinInteger": "MinInteger",
        "SumInteger": "SumInteger",
        "ListAgg": "ListAgg"
    };
    op = xcHelper.capitalize(op);
    if (!AggrOp.hasOwnProperty(op)) {
        return null;
    } else {
        return op;
    }
}
var protoMsg = require('./xcalar/compute/localtypes/ProtoMsg_pb');
var service = require('./xcalar/compute/localtypes/Service_pb');
var jQuery;

// Explicitly check if this code is running under nodejs
if ((typeof process !== 'undefined') &&
    (typeof process.versions !== 'undefined') &&
    (typeof process.versions.node !== 'undefined')) {
    const jsdom = require("jsdom");
    const { JSDOM } = jsdom;
    const { window } = new JSDOM();
    jQuery = require("jquery")(window);
} else {
    jQuery = require('jquery');
}

function serializeRequest(serviceRequest) {
    var msg = new protoMsg.ProtoMsg();
    msg.setType(protoMsg.ProtoMsgType.PROTOMSGTYPEREQUEST);
    msg.setRequest(new protoMsg.ProtoRequestMsg());
    msg.getRequest().setRequestid(0);
    msg.getRequest().setChildid(0);
    msg.getRequest().setTarget(protoMsg.ProtoMsgTarget.PROTOMSGTARGETSERVICE);

    msg.getRequest().setServic(serviceRequest);

    var requestBytes = msg.serializeBinary();
    var reqBase64 = Buffer.from(requestBytes).toString("base64");

    return reqBase64;
}

function deserializeResponse(respBytes) {
    // respBytes is a Buffer; turn it into an int array so we can deserialize
    var msg = protoMsg.ProtoMsg.deserializeBinary(Array.from(respBytes));
    return msg.getResponse().getServic();
}

function XceClient(serviceUrl) {
    this.serviceUrl = serviceUrl;
    this.execute = function(serviceName, methodName, anyWrappedRequest) {
        var deferred = jQuery.Deferred();
        var serviceRequest = new service.ServiceRequest();
        serviceRequest.setServicename(serviceName);
        serviceRequest.setMethodname(methodName);

        serviceRequest.setBody(anyWrappedRequest);

        var requestBytes = serializeRequest(serviceRequest);

        var wrappedRequest = {"data": requestBytes};
        jQuery.post(this.serviceUrl, wrappedRequest)
        .then(function(rawResponse) {
            var byteBuffer = Array.from(Buffer.from(rawResponse.data, 'base64'));
            // byteBuffer is a Buffer; we need to turn it into an
            // int array so we can deserialize
            var respMsg = protoMsg.ProtoMsg.deserializeBinary(byteBuffer).getResponse();
            if (respMsg.getStatus() != 0) {
                // If we get a status code other than StatusOk, this failed
                deferred.reject({
                    "status": respMsg.getStatus(),
                    "error": respMsg.getError()
                });
            } else {
                // Unpack all of the layers of the successful response, except
                // for unpacking the protobuf 'Any' response, which the caller
                // will unpack
                var serviceResponse = respMsg.getServic();
                var unpackedResponse = serviceResponse.getBody();
                deferred.resolve(unpackedResponse);
            }
        })
        .fail(function(error) {
            console.log("got error response :" + JSON.stringify(error));
            deferred.reject(error);
        });
        return deferred.promise();
    };
}

exports.XceClient = XceClient;

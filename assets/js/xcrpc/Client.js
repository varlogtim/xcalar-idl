var protoMsg = require('./xcalar/compute/localtypes/ProtoMsg_pb');
var service = require('./xcalar/compute/localtypes/Service_pb');
var request = require('request-promise-native');

function serializeRequest(serviceRequest) {
    var msg = new protoMsg.ProtoMsg();
    msg.setType(protoMsg.ProtoMsgType.PROTO_MSG_TYPE_REQUEST);
    msg.setRequest(new protoMsg.ProtoRequestMsg());
    msg.getRequest().setRequestId(0);
    msg.getRequest().setChildId(0);
    msg.getRequest().setTarget(protoMsg.ProtoMsgTarget.PROTO_MSG_TARGET_SERVICE);

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
    this.execute = async function(serviceName, methodName, anyWrappedRequest) {
        var serviceRequest = new service.ServiceRequest();
        serviceRequest.setServicename(serviceName);
        serviceRequest.setMethodname(methodName);

        serviceRequest.setBody(anyWrappedRequest);

        var requestBytes = serializeRequest(serviceRequest);

        var wrappedRequest = {"data": requestBytes};
        try {
            const rawResponse = await request.post({
                url: this.serviceUrl,
                body: wrappedRequest,
                json: true
            });

            var byteBuffer = Array.from(Buffer.from(rawResponse.data, 'base64'));
            // byteBuffer is a Buffer; we need to turn it into an
            // int array so we can deserialize
            var respMsg = protoMsg.ProtoMsg.deserializeBinary(byteBuffer).getResponse();
            if (respMsg.getStatus() != 0) {
                // If we get a status code other than StatusOk, this failed
                const error = {
                    "status": respMsg.getStatus(),
                    "error": respMsg.getError(),
                }
                if (respMsg.hasServic()) {
                    error.response = respMsg.getServic().getBody();
                }
                throw error;
            }

            // Unpack all of the layers of the successful response, except
            // for unpacking the protobuf 'Any' response, which the caller
            // will unpack
            var serviceResponse = respMsg.getServic();
            var unpackedResponse = serviceResponse.getBody();
            return unpackedResponse;
        } catch(error) {
            if (error.message != null) {
                throw new Error(error.message);
            } else {
                throw error;
            }
        }
    };
}

exports.XceClient = XceClient;

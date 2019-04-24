var xcalar = require('xcalar');
var serviceRegistry = require('./serviceRegistry').ServiceRegistry;
var serviceInfo = xcalar.ServiceInfo;

function serializeResponse(serviceResponse) {
    var msg = new proto.ProtoMsg();
    msg.setType(proto.ProtoMsgType.PROTOMSGTYPERESPONSE);
    msg.setResponse(new proto.ProtoResponseMsg());
    msg.getResponse().setRequestid(0);
    msg.getResponse().setStatus(0);
    msg.getResponse().setServic(serviceResponse);

    var responseBytes = msg.serializeBinary();
    var resBase64 = Buffer.from(responseBytes).toString("base64");
    return resBase64;
}

function unpackTo(anyReq, serviceName, methodName) {
   var reqType = serviceInfo[serviceName][methodName][0].split("\.").pop();
   var aReqObj = proto.xcalar.compute.localtypes[serviceName][reqType];
   return aReqObj.deserializeBinary(anyReq);
}

function packFrom(anyRes, serviceName, methodName) {
    var resType = serviceInfo[serviceName][methodName][1];
    if (resType == "google.protobuf.Empty") {
        return;
    }
    var anyWrapper = new proto.google.protobuf.Any();
    anyWrapper.setValue(anyRes.serializeBinary());
    var typeUrl = `type.googleapis.com/${resType}`
    anyWrapper.setTypeUrl(typeUrl);
    return anyWrapper;
}

function handleService(protoReqMsg){
    var deferred = PromiseHelper.deferred();
    var pMsg = proto.ProtoMsg.deserializeBinary(Array.from(protoReqMsg));
    var serviceReqMsg = pMsg.getRequest().getServic();
    var serviceName = serviceReqMsg.getServicename();
    if(!(serviceName in serviceRegistry)) {
        //The service is not implemented in expserver
        //need to route it to backend
        deferred.resolve({reqHandled: false, resp: null});
        return deferred.promise();
    }
    var methodName = serviceReqMsg.getMethodname();
    var serviceHandle = serviceRegistry[serviceName];
    var methodHandle = serviceHandle[methodName];
    if (methodHandle == null || typeof methodHandle != 'function') {
        //The method is not implemented in expserver
        //need to route it to backend
        deferred.resolve({reqHandled: false, resp: null});
        return deferred.promise();
    }
    console.log(`Service name:: ${serviceName}, Method name:: ${methodName}`);
    var aReqMsg = unpackTo(serviceReqMsg.getBody().getValue(),
                            serviceName, methodName);
    methodHandle(aReqMsg)
    .then(function(res){
        var anyRes = packFrom(res, serviceName, methodName);
        var serviceResponse = new proto.ServiceResponse();
        serviceResponse.setBody(anyRes);
        deferred.resolve({reqHandled: true, resp: serializeResponse(serviceResponse)});
    })
    .fail(function(err){
        deferred.reject(err);
    });
    return deferred.promise();
}
exports.handleService = handleService;

import { ServiceInfo as serviceInfo } from "xcalar";
import { ServiceRegistry as serviceRegistry } from "./SDKServiceRegistry";

function serializeResponse(serviceResponse: any): string {
    let msg: any = new proto.ProtoMsg();
    msg.setType(proto.ProtoMsgType.PROTOMSGTYPERESPONSE);
    msg.setResponse(new proto.ProtoResponseMsg());
    msg.getResponse().setRequestid(0);
    msg.getResponse().setStatus(0);
    msg.getResponse().setServic(serviceResponse);

    let responseBytes: Buffer = msg.serializeBinary();
    let resBase64: string = Buffer.from(responseBytes).toString("base64");
    return resBase64;
}

function unpackTo(anyReq: any, serviceName: string, methodName: string): any {
   let reqType: string  = serviceInfo[serviceName][methodName][0].split("\.").pop();
   let aReqObj: any = proto.xcalar.compute.localtypes[serviceName][reqType];
   return aReqObj.deserializeBinary(anyReq);
}

function packFrom(anyRes: any, serviceName: string, methodName: string): any {
    let resType: string = serviceInfo[serviceName][methodName][1];
    if (resType == "google.protobuf.Empty") {
        return;
    }
    let anyWrapper: any = new proto.google.protobuf.Any();
    anyWrapper.setValue(anyRes.serializeBinary());
    let typeUrl: string = `type.googleapis.com/${resType}`
    anyWrapper.setTypeUrl(typeUrl);
    return anyWrapper;
}

export function handleService(protoReqMsg: Buffer): Promise<any> {
    let deferred: any = PromiseHelper.deferred();
    let pMsg: any = proto.ProtoMsg.deserializeBinary(Array.from(protoReqMsg));
    let serviceReqMsg: any = pMsg.getRequest().getServic();
    let serviceName: string = serviceReqMsg.getServicename();
    if(!(serviceName in serviceRegistry)) {
        //The service is not implemented in expserver
        //need to route it to backend
        deferred.resolve({reqHandled: false, resp: null});
        return deferred.promise();
    }
    let methodName: string = serviceReqMsg.getMethodname();
    let serviceHandle: any = serviceRegistry[serviceName];
    let methodHandle: any = serviceHandle[methodName];
    if (methodHandle == null || typeof methodHandle != 'function') {
        //The method is not implemented in expserver
        //need to route it to backend
        deferred.resolve({reqHandled: false, resp: null});
        return deferred.promise();
    }
    console.log(`Service name:: ${serviceName}, Method name:: ${methodName}`);
    let aReqMsg: any = unpackTo(serviceReqMsg.getBody().getValue(),
                            serviceName, methodName);
    methodHandle(aReqMsg)
    .then(function(res: any): void {
        var anyRes = packFrom(res, serviceName, methodName);
        var serviceResponse = new proto.ServiceResponse();
        serviceResponse.setBody(anyRes);
        deferred.resolve({reqHandled: true,
            resp: serializeResponse(serviceResponse)});
    })
    .fail(function(err: any): void {
        deferred.reject(err);
    });
    return deferred.promise();
}
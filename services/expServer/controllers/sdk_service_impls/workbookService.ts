import * as xcalar from "xcalar"
// Workbook.proto/Workbook_pb.js
const wkbk_pb : any = proto.xcalar.compute.localtypes.Workbook;

// DagHelper is in DagHelperIndex.js
// which is imported as a global var

function convertKvsToQuery(convertRequest: any): Promise<any> {
    let deferred: any = PromiseHelper.deferred();
    let kvsQueryList: string[] = convertRequest.getKvsstringList();
    let dataflowName: string = convertRequest.getDataflowname();
    let optimized: boolean = convertRequest.getOptimized();
    let listXdfsOutput: string = convertRequest.getListxdfsoutput();
    let userName: string = convertRequest.getUsername();
    let sessionId: string = convertRequest.getSessionid();
    let workbookName: string = convertRequest.getWorkbookname();
    // let txId = Transaction.start({"simulate": true});
    let cvtKvsToQueryResponse: any = new wkbk_pb.ConvertKvsToQueryResponse();

    cvtKvsToQueryResponse.setConverted(false);
    DagHelper.convertKvs(kvsQueryList, dataflowName, optimized, listXdfsOutput,
            userName, sessionId, workbookName)
    .then(function(convertedQuery: any): void {
        if (optimized) {
            let optimizedStr: string = JSON.stringify(convertedQuery)
            cvtKvsToQueryResponse.setResultstring(optimizedStr);
        } else {
            cvtKvsToQueryResponse.setResultstring(convertedQuery);
        }
        cvtKvsToQueryResponse.setConverted(true);
        deferred.resolve(cvtKvsToQueryResponse);
    })
    .fail(function(err) {
        // Unable to convert to a query.  Pass back the reason.
        const errStr: string = err.node != null
            ? err.node.title + " (" + err.node.type + ") - " + err.type
            : (err.message || err);
        cvtKvsToQueryResponse.setResultstring(errStr);

        // We don't reject if there is a xcrpc error
        // Instead, if the error message have different field,
        // which indicate this is a internal error. We let it fail itself
        deferred.resolve(cvtKvsToQueryResponse);
    });
    return deferred.promise();
}
export { convertKvsToQuery as ConvertKvsToQuery }
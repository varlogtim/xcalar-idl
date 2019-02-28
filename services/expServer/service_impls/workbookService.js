// Copyright 2019 Xcalar, Inc. All rights reserved.
//
// No use, or distribution, of this source code is permitted in any form or
// means without a valid, written license agreement with Xcalar, Inc.
// Please refer to the included "COPYING" file for terms and conditions
// regarding the use and redistribution of this software.
//

var xcalar = require('xcalar');
var workbook_pb = proto.xcalar.compute.localtypes.Workbook;

function convertKvsToQuery(convertRequest) {
    var deferred = PromiseHelper.deferred();
    var kvsQueryList = convertRequest.getKvsstringList();
    var dataflowName = convertRequest.getDataflowname();
    var optimized = convertRequest.getOptimized();
    var listXdfsOutput = convertRequest.getListxdfsoutput();
    var userName = convertRequest.getUsername();
    var sessionId = convertRequest.getSessionid();
    var workbookName = convertRequest.getWorkbookname();
    // var txId = Transaction.start({"simulate": true});
    var cvtKvsToQueryResponse = new workbook_pb.ConvertKvsToQueryResponse();

    cvtKvsToQueryResponse.setConverted(false);
    DagHelper.convertKvs(kvsQueryList, dataflowName, optimized, listXdfsOutput,
            userName, sessionId, workbookName)
    .then(function(convertedQuery) {
        if (optimized) {
            var optimizedStr = JSON.stringify(convertedQuery)
            cvtKvsToQueryResponse.setResultstring(optimizedStr);
        } else {
            cvtKvsToQueryResponse.setResultstring(convertedQuery);
        }
        cvtKvsToQueryResponse.setConverted(true);
        deferred.resolve(cvtKvsToQueryResponse);
    })
    .fail(function(err) {
        // Unable to convert to a query.  Pass back the reason.
        var errStr = err.node.title + " (" + err.node.type + ") - " + err.type;
        cvtKvsToQueryResponse.setResultstring(errStr);
        deferred.resolve(cvtKvsToQueryResponse);
    });
    return deferred.promise();
}

exports.ConvertKvsToQuery = convertKvsToQuery;

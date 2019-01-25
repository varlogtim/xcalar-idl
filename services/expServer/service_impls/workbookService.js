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
    var kvsQuery = convertRequest.getKvsstring();
    // var txId = Transaction.start({"simulate": true});

    DagHelper.convertKvs(kvsQuery)
    .then(function(convertedQuery) {
        var cvtKvsToQueryResponse = new workbook_pb.ConvertKvsToQueryResponse();
        cvtKvsToQueryResponse.setQuerystring(convertedQuery);
        deferred.resolve(cvtKvsToQueryResponse);
    })
    .fail(function(err) {
        deferred.reject(err);
    });
    return deferred.promise();
}

exports.ConvertKvsToQuery = convertKvsToQuery;

// Every extension must be named UExt<EXTENSIONNAME>
// Every extension must be named after the file which will be
// <EXTENSIONNAME>.ext.js
// Extensions are case INSENSITIVE
// Every extension must have 3 functions:
// buttons
// actionFn
// undoActionFn
// buttons must return an array of structs. each struct must have a field
// called "buttonText" which populates the text in the button
// each struct must have a fnName field which contains the name of the function
// that will be triggered
// each struct must also have a field called arrayOfFields that is an array of
// requirements for each of the arguments that must be passed into the struct
// actionFn is a function that will get invoked once the user presses any of
// the buttons belonging to the extension
// undoActionFn is a function that will get invoked once the user tries to undo
// an action that belongs to this extension
window.UExtNN = (function(UExtNN, $) {
    UExtNN.buttons = [{
        "buttonText"   : "Neural Network Training",
        "fnName"       : "nnTrain",
        "arrayOfFields": [{
            "type"      : "number",
            "name"      : "num datapoints",
            "fieldClass": "numDatapoints",
            "typeCheck" : {
                "integer": true
            }
        },
        {
            "type"      : "number",
            "name"      : "learning rate",
            "fieldClass": "rate"
        },
        {
            "type"      : "number",
            "name"      : "max iter",
            "fieldClass": "maxIter",
            "typeCheck" : {
                "integer": true
            }
        }]
    },
    {
        "buttonText": "Neural Network Training",
         "fnName": "nnTest",
         "arrayOfFields": [{
            "type"      : "number",
            "name"      : "data num tag",
            "fieldClass": "dataNumTag"
        },
        {
            "type"      : "number",
            "name"      : "iteration tag",
            "fieldClass": "iterTag"
        }]
    }];

    UExtNN.undoActionFn = undefined;
    UExtNN.actionFn = function(txId, colList, tableId, functionName, argList) {
        var table = gTables[tableId];
        var tableName = table.tableName;
        var tableNameRoot = tableName.split("#")[0];
        // all temporary tables will have this tag appended in tableName
        var tmpTableTag = "_" + Authentication.getHashId().split("#")[1]
            + "nnTmpTable";
        var delim = '\\",\\"';
        switch (functionName) {
            case ("nnTrain"):
                if (argList["numDatpoints"] != "") {
                    return nnTrain(txId, tableName, argList["numDatapoints"],
                                    argList["rate"], argList["maxIter"]);
                } else {
                    return PromiseHelper.reject(ErrTStr.NoEmpty);
                }
            case ("nnTest"):
                return nnTest(txId, tableName, argList["dataNumTag"], argList["iterTag"]);
            default:
                return PromiseHelper.reject("Invalid Function");
        }

        function nnTest(txId, input, dataNumTag, iterTag) {
            if (verbose) {
                console.log("Starting Neural Network Testing");
            }

            var deferred = jQuery.Deferred();
            var tableId = xcHelper.getTableId(input);
            var table = gTables[tableId];
            var workSheet = WSManager.getWSFromTable(tableId);
            var resultSet;

            var dataNumCol = "dataNum";
            var inputRow = "inputRow";
            var inputCol = "inputCol";
            var inputData = "inputData";

            var hwRow = "hwRow" + dataNumTag;
            var hwCol = "hwCol" + dataNumTag;
            var hwData = "hwData" + dataNumTag;
            var hw;

            var owRow = "owRow" + dataNumTag;
            var owCol = "owCol" + dataNumTag;
            var owData = "owData" + dataNumTag;
            var ow;

            var haRow = "haRow";
            var haCol = "haCol";
            var haData = "haData";
            var haPreSigData = "haPreSigData";
            var ha = "ha_" + tmpTableTag +
                Authentication.getHashId();
            var haPreSig = "haPreSig_" + tmpTableTag +
                Authentication.getHashId();

            var oaData = "oaData";
            var oaPreSigData = "oaPreSigData";
            var oa = "oa_" + tmpTableTag +
                Authentication.getHashId();
            var oaPreSig = "oaPreSig_" + tmpTableTag +
                Authentication.getHashId();
            var oaIndex = "oa_index" + tmpTableTag +
                Authentication.getHashId();
            var oaFinal = "oa_final" + tmpTableTag +
                Authentication.getHashId();

            var outputRow = "outputRow";
            var outputCol = "outputCol";
            var outputData = "outputData";
            var output = "NN_output_" + input.split("#")[0] +
                Authentication.getHashId();

            XcalarGetTables("*w_" + dataNumTag + "_" + iterTag + "*")
            .then(function(out) {
                if (out.nodeInfo[0].name.charAt(0) == 'h') {
                    hw = out.nodeInfo[0].name;
                    ow = out.nodeInfo[1].name;
                } else {
                    ow = out.nodeInfo[0].name;
                    hw = out.nodeInfo[1].name;
                }

                // debugger;
                var queryStr =
                    multiMatrixMult(hw, hwRow, hwCol, hwData,
                                    input, inputRow, inputCol, inputData,
                                    haPreSig, haRow, haCol, haPreSigData,
                                    dataNumCol, "NN_test_haMult") +
                    'map --eval "float(nn:sigmoid(' + haPreSigData + '))"' +
                    ' --fieldName ' + haData +
                    ' --srctable ' + haPreSig +
                    ' --dsttable ' + ha + ';' +
                    multiMatrixMult(ow, owRow, owCol, owData,
                                    ha, haRow, haCol, haData,
                                    oaPreSig, outputRow, outputCol, oaPreSigData,
                                    dataNumCol, "NN_test_oaMult") +
                    'map --eval "float(nn:sigmoid(' + oaPreSigData + '))"' +
                    ' --fieldName ' + oaData +
                    ' --srctable ' + oaPreSig +
                    ' --dsttable ' + oa + ';' +
                    'index --key ' + dataNumCol +
                    ' --srctable ' + oa +
                    ' --dsttable ' + oaIndex + ';' +
                    'groupBy --eval "sum(' + oaData + ')"' +
                    ' --fieldName ' + outputData +
                    ' --srctable ' + oaIndex +
                    ' --dsttable ' + oaFinal + ';' +
                    'project --srctable ' + oaFinal +
                    ' --dsttable ' + output +
                    ' ' + dataNumCol + ' ' + outputRow +
                    ' ' + outputCol + ' ' + outputData + ';' +
                    'drop table *' + tmpTableTag + '*;';

                return (XcalarQueryWithCheck("nn_training_" + Authentication.getHashId(),
                                             queryStr));
            })
            .then(function () {
                return (XcalarMakeResultSetFromTable(output));
            })
            .then(function(res) {
                resultSet = res;
                return (XcalarGetNextPage(resultSet.resultSetId, 4));
            })
            .then(function(out) {
                var json = jQuery.parseJSON(out.kvPair[0].value);
                // debugger;
                XcalarSetFree(resultSet.resultSetId);
            })
            /*
            .then(function() {
                var finalTableId = xcHelper.getTableId(output);
                var finalCols = [];

                finalCols[0] = ColManager.newPullCol(outputRow, "integer");
                finalCols[1] = ColManager.newPullCol(outputCol, "integer");
                finalCols[2] = ColManager.newPullCol(outputData, "float");

                return TblManager.refreshTable([output], finalCols,
                                               [], workSheet);
            })
            */
            .then(function() {
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();

            // returns a query that performs A x B and stores result in table C
            function multiMatrixMult(A, ARow, ACol, AData,
                                     B, BRow, BCol, BData,
                                     C, CRow, CCol, CData,
                                     dataNumCol, tag) {
                var Aindex = "A_index_" + tag + tmpTableTag +
                    Authentication.getHashId();
                var Bindex = "B_index_" + tag + tmpTableTag +
                    Authentication.getHashId();
                var Cjoin = "C_join_" + tag + tmpTableTag +
                    Authentication.getHashId();

                var CmultCol = "C_mult_" + tag;
                var Cmult = "C_mult_" + tag + tmpTableTag +
                    Authentication.getHashId();

                var concatStr =
                    '"concat(concat(concat(string(' + dataNumCol + '),' + delim + '),' +
                    'concat(string(' + ARow + '),' + delim + ')),' +
                    'string(' + BCol + '))"';
                var CconcatCol = "C_concat_" + tag;
                var Cconcat = "C_concat_" + tag + tmpTableTag +
                    Authentication.getHashId();

                var Cindex = "C_index_" + tag + tmpTableTag +
                    Authentication.getHashId();
                var CgroupBy = "C_groupBy_" + tag + tmpTableTag +
                    Authentication.getHashId();
                var CcutDataNum = "C_cutDataNum_" + tag + tmpTableTag +
                    Authentication.getHashId();
                var CcutRow = "C_cutRow_" + tag + tmpTableTag +
                    Authentication.getHashId();

                multStr =
                    'index --key ' + ACol +
                    ' --srctable ' + A +
                    ' --dsttable ' + Aindex + ';' +
                    'index --key ' + BRow +
                    ' --srctable ' + B +
                    ' --dsttable ' + Bindex + ';' +
                    'join --leftTable ' + Aindex +
                    ' --rightTable ' + Bindex +
                    ' --joinTable ' + Cjoin + ';' +
                    'map --eval "mult(' + AData + ',' + BData + ')"' +
                    ' --fieldName ' + CmultCol +
                    ' --srctable ' + Cjoin +
                    ' --dsttable ' + Cmult + ';' +
                    'map --eval ' + concatStr +
                    ' --fieldName ' + CconcatCol +
                    ' --srctable ' + Cmult +
                    ' --dsttable ' + Cconcat + ';' +
                    'index --key ' + CconcatCol +
                    ' --srctable ' + Cconcat +
                    ' --dsttable ' + Cindex + ';' +
                    'groupBy --eval "sum(' + CmultCol + ')"' +
                    ' --fieldName ' + CData +
                    ' --srctable ' + Cindex +
                    ' --dsttable ' + CgroupBy + ';' +
                    'map --eval "int(cut(' + CconcatCol + ',1,' + delim + '))"' +
                    ' --fieldName ' + dataNumCol +
                    ' --srctable ' + CgroupBy +
                    ' --dsttable ' + CcutDataNum + ';' +
                    'map --eval "int(cut(' + CconcatCol + ',2,' + delim + '))"' +
                    ' --fieldName ' + CRow +
                    ' --srctable ' + CcutDataNum +
                    ' --dsttable ' + CcutRow + ';' +
                    'map --eval "int(cut(' + CconcatCol + ',3,' + delim + '))"' +
                    ' --fieldName ' + CCol +
                    ' --srctable ' + CcutRow +
                    ' --dsttable ' + C + ';';
                return (multStr);
            }
        }

        function nnTrain(txId, tableName, inputSize, rate, maxIter) {
            if (verbose) {
                console.log("Starting Neural Network Training");
            }

            var deferred = jQuery.Deferred();
            var tableId = xcHelper.getTableId(tableName);
            var table = gTables[tableId];
            var workSheet = WSManager.getWSFromTable(tableId);
            var resultSet;

            var dataNumCol = "dataNum";

            var inputRow = "inputRow";
            var inputCol = "inputCol";
            var inputData = "inputData";
            var inputs = "inputs" + Authentication.getHashId();

            var outputRow = "outputRow";
            var outputCol = "outputCol";
            var outputData = "outputData";
            var outputs = "outputs" + Authentication.getHashId();

            var hwRow = "hwRow";
            var hwCol = "hwCol";
            var hwData = "hwData";
            var hw = "hw" + Authentication.getHashId();

            var owRow = "owRow";
            var owCol = "owCol";
            var owData = "owData";
            var ow = "ow" + Authentication.getHashId();

            var haRow = "haRow";
            var haCol = "haCol";
            var haData = "haData";

            var oaRow = "oaRow";
            var oaCol = "oaCol";
            var oaData = "oaData";

            var odRow = "odRow";
            var odCol = "odCol";
            var odErrorData = "odErrorData";
            var odData = "odData";

            var owTRow = "owTRow";
            var owTCol = "owTCol";
            var owTData = "owTData";

            var hdRow = "hdRow";
            var hdCol = "hdCol";
            var hdErrorData = "hdErrorData";
            var hdData = "hdData";

            var haTRow = "haTRow";
            var haTCol = "haTCol";
            var haTData = "haTData";

            var owUpdateRow = "owUpdateRow";
            var owUpdateCol = "owUpdateCol";
            var owUpdatePreRateData = "owUpdatePreRateData";
            var owUpdateData = "owUpdateData";

            var inputTRow = "inputTRow";
            var inputTCol = "inputTCol";
            var inputTData = "inputTData";

            var hwUpdateRow = "hwUpdateRow";
            var hwUpdateCol = "hwUpdateCol";
            var hwUpdatePreRateData = "hwUpdatePreRateData";
            var hwUpdateData = "hwUpdateData";

            var outputErrorsCol = "outputErrors";

            var iteration = 1;
            var threshold = .1;

            var preProcessStr =
                'filter ' + tableName + ' "eq(type,\\"input\\")" ' + inputs + ';' +
                'filter ' + tableName + ' "eq(type,\\"output\\")" ' + outputs + ';' +
                'filter ' + tableName + ' "eq(type,\\"hw\\")" ' + hw + ';' +
                'filter ' + tableName + ' "eq(type,\\"ow\\")" ' + ow + ';';

            XcalarQueryWithCheck("nn_preProcess" + Authentication.getHashId(),
                                 preProcessStr)
            .then(function () {
                return iterate(iteration);
            })
            /*
              .then(function() {
              // FINAL:
              // Step 10: Display the final hidden weight matrix
              var finalTableId = xcHelper.getTableId(hw);
              var finalCols = [];

              finalCols[0] = ColManager.newPullCol(hwRow, "integer");
              finalCols[1] = ColManager.newPullCol(hwCol, "integer");
              finalCols[2] = ColManager.newPullCol(hwData, "float");

              return TblManager.refreshTable([hw], finalCols,
              [], workSheet);
              })
              .then(function() {
              // Step 10: Display the final output weight matrix
              var finalTableId = xcHelper.getTableId(ow);
              var finalCols = [];

              finalCols[0] = ColManager.newPullCol(owRow, "integer");
              finalCols[1] = ColManager.newPullCol(owCol, "integer");
              finalCols[2] = ColManager.newPullCol(owData, "float");

              return TblManager.refreshTable([ow], finalCols,
              [], workSheet);
              })
            */
            .then(function() {
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();

            function iterate(iteration) {
                // CLUSTERING: this is a recursive do-while construct.
                return (oneIter(iteration)
                        .then(function(done) {
                            if ((!maxIter || iteration < maxIter) &&
                                done == false) {
                                return iterate(iteration + 1);
                            }
                        }));
            }

            function oneIter(iteration) {
                var done;
                var queryStr = "";
                var totalError = "";
                var innerDeferred = jQuery.Deferred();
                for (var dataNum = 1; dataNum <= inputSize; dataNum++) {
                    var input = "input_" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var output = "output_" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var ha = "ha_" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var oa = "oa_" + dataNum + tmpTableTag +
                        Authentication.getHashId();

                    startupStr =
                        'filter ' + inputs +
                        ' "eq(' + dataNumCol + ',' + dataNum + ')" ' + input + ';' +
                        'filter ' + outputs +
                        ' "eq(' + dataNumCol + ',' + dataNum + ')" ' + output + ';';

                    fpStr = forwardPropagation(input, hw, ow,
                                               ha, oa, dataNum);

                    var oaIndex = "oa_index" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var outputIndex = "output_index" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var odJoin = "od_join" + dataNum + tmpTableTag +
                        Authentication.getHashId();

                    var odMapRow = "od_map_row" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var odMapCol = "od_map_col" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var odError = "odError_" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var od = "od_" + dataNum + tmpTableTag +
                        Authentication.getHashId();

                    var outputDeltaStr =
                        'index --key ' + oaRow +
                        ' --srctable ' + oa +
                        ' --dsttable ' + oaIndex + ';' +
                        'index --key ' + outputRow +
                        ' --srctable ' + output +
                        ' --dsttable ' + outputIndex + ';' +
                        'join --leftTable ' + oaIndex +
                        ' --rightTable ' + outputIndex +
                        ' --joinTable ' + odJoin + ';' +
                        'map --eval "int(' + outputRow + ')"' +
                        ' --fieldName ' + odRow +
                        ' --srctable ' + odJoin +
                        ' --dsttable ' + odMapRow + ';' +
                        'map --eval "int(' + outputCol + ')"' +
                        ' --fieldName ' + odCol +
                        ' --srctable ' + odMapRow +
                        ' --dsttable ' + odMapCol + ';' +
                        'map --eval "sub(' + outputData + ',' + oaData + ')"' +
                        ' --fieldName ' + odErrorData +
                        ' --srctable ' + odMapCol +
                        ' --dsttable ' + odError + ';' +
                        'map --eval "mult(' + odErrorData + ',' +
                        'float(nn:dsigmoid(' + oaData + ')))"' +
                        ' --fieldName ' + odData +
                        ' --srctable ' + odError +
                        ' --dsttable ' + od + ';';

                    var owT = "owT_" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var haIndex = 'ha_index' + dataNum + tmpTableTag +
                        Authentication.getHashId();

                    var hdError = "hdError_" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var hdErrorIndex = "hdError_index" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var hdJoin = 'hd_join' + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var hd = "hd_" + dataNum + tmpTableTag +
                        Authentication.getHashId();

                    var hiddenDeltaStr =
                        matrixTranspose(ow, owRow, owCol, owData,
                                        owT, owTRow, owTCol, owTData,
                                        dataNum + "owT") +
                        matrixMult(owT, owTRow, owTCol, owTData,
                                   od, odRow, odCol, odData,
                                   hdError, hdRow, hdCol, hdErrorData,
                                   dataNum + "hdMult") +
                        'index --key ' + haRow +
                        ' --srctable ' + ha +
                        ' --dsttable ' + haIndex + ';' +
                        'index --key ' + hdRow +
                        ' --srctable ' + hdError +
                        ' --dsttable ' + hdErrorIndex + ';' +
                        'join --leftTable ' + haIndex +
                        ' --rightTable ' + hdErrorIndex +
                        ' --joinTable ' + hdJoin + ';' +
                        'map --eval "mult(' + hdErrorData + ',' +
                        'float(nn:dsigmoid(' + haData + ')))"' +
                        ' --fieldName ' + hdData +
                        ' --srctable ' + hdJoin +
                        ' --dsttable ' + hd + ';';


                    var haT = "haT_" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var owUpdatePreRate = "owUpdatePreRate_" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var owUpdate = "owUpdate_" + dataNum + tmpTableTag +
                        Authentication.getHashId();

                    var owCopyRow = "owCopyRow" + dataNum;
                    var owCopyCol = "owCopyCol" + dataNum;
                    var owCopyData = "owCopyData" + dataNum;
                    var owCopy = "ow_copy" + dataNum + tmpTableTag +
                        Authentication.getHashId();

                    var owNewRow = "owRow" + dataNum;
                    var owNewCol = "owCol" + dataNum;
                    var owNewData = "owData" + dataNum;
                    var owNew = "ow_" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var owUpdateStr =
                        matrixTranspose(ha, haRow, haCol, haData,
                                        haT, haTRow, haTCol, haTData,
                                        dataNum + "haT") +
                        matrixMult(od, odRow, odCol, odData,
                                   haT, haTRow, haTCol, haTData,
                                   owUpdatePreRate, owUpdateRow, owUpdateCol, owUpdatePreRateData,
                                   dataNum + "owUpdateMult") +
                        'map --eval "mult(' + owUpdatePreRateData + ',' + rate + ')"' +
                        ' --fieldName ' + owUpdateData +
                        ' --srctable ' + owUpdatePreRate +
                        ' --dsttable ' + owUpdate + ';' +
                        matrixCopy(ow, owRow, owCol, owData,
                                   owCopy, owCopyRow, owCopyCol, owCopyData,
                                   dataNum + "owCopy") +
                        matrixAdd(owUpdate, owUpdateRow, owUpdateCol, owUpdateData,
                                  owCopy, owCopyRow, owCopyCol, owCopyData,
                                  owNew, owNewRow, owNewCol, owNewData,
                                  dataNum + "owUpdateAdd");


                    var inputT = "inputT_" + dataNum + tmpTableTag +
                        Authentication.getHashId();

                    var hwUpdatePreRate = "hwUpdatePreRate_" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var hwUpdate = "hwUpdate_" + dataNum + tmpTableTag +
                        Authentication.getHashId();

                    var hwCopyRow = "hwCopyRow" + dataNum;
                    var hwCopyCol = "hwCopyCol" + dataNum;
                    var hwCopyData = "hwCopyData" + dataNum;
                    var hwCopy = "hw_copy" + dataNum + tmpTableTag +
                        Authentication.getHashId();

                    var hwNewRow = "hwRow" + dataNum;
                    var hwNewCol = "hwCol" + dataNum;
                    var hwNewData = "hwData" + dataNum;
                    var hwNew = "hw_" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var hwUpdateStr =
                        matrixTranspose(input, inputRow, inputCol, inputData,
                                        inputT, inputTRow, inputTCol, inputTData,
                                        dataNum + "inputT") +
                        matrixMult(hd, hdRow, hdCol, hdData,
                                   inputT, inputTRow, inputTCol, inputTData,
                                   hwUpdatePreRate, hwUpdateRow, hwUpdateCol, hwUpdatePreRateData,
                                   dataNum + "hwUpdateMult") +
                        'map --eval "mult(' + hwUpdatePreRateData + ',' + rate + ')"' +
                        ' --fieldName ' + hwUpdateData +
                        ' --srctable ' + hwUpdatePreRate +
                        ' --dsttable ' + hwUpdate + ';' +
                        matrixCopy(hw, hwRow, hwCol, hwData,
                                   hwCopy, hwCopyRow, hwCopyCol, hwCopyData,
                                   dataNum + "hwCopy") +
                        matrixAdd(hwUpdate, hwUpdateRow, hwUpdateCol, hwUpdateData,
                                  hwCopy, hwCopyRow, hwCopyCol, hwCopyData,
                                  hwNew, hwNewRow, hwNewCol, hwNewData,
                                  dataNum + "hwUpdateAdd");

                    var outputErrors = "output_errors" + dataNum + tmpTableTag +
                        Authentication.getHashId();
                    var error = "error_" + dataNum + "_" + iteration +
                        Authentication.getHashId();
                    var errorStr;

                    if (totalError == "") {
                        errorStr = 'map --eval "add(0,';
                    } else {
                        errorStr = 'map --eval "add(@' + totalError + ',';
                    }
                    errorStr += 'mult(pow(' + odErrorData + ',2),0.5))"' +
                        ' --fieldName ' + outputErrorsCol +
                        ' --srctable ' + odError +
                        ' --dsttable ' + outputErrors + ';' +
                        'aggregate --eval "sum(' + outputErrorsCol + ')"' +
                        ' --srctable ' + outputErrors +
                        ' --dsttable ' + error + ';';

                    var hwProjected = "hw_" + dataNum + "_" + iteration +
                        Authentication.getHashId();
                    var owProjected = "ow_" + dataNum + "_" + iteration +
                        Authentication.getHashId();
                    cleanupStr =
                        'project --srctable ' + hwNew +
                        ' --dsttable ' + hwProjected +
                        ' ' + hwNewRow + ' ' + hwNewCol + ' ' + hwNewData + ';' +
                        'project --srctable ' + owNew +
                        ' --dsttable ' + owProjected +
                        ' ' + owNewRow + ' ' + owNewCol + ' ' + owNewData + ';' +
                        'drop table *' + tmpTableTag + '*;';

                    queryStr += startupStr +
                        // Forward propagation
                        fpStr +
                        // Backward propagation
                        outputDeltaStr + hiddenDeltaStr +
                        // Weight update
                        owUpdateStr + hwUpdateStr +
                        errorStr + cleanupStr;

                    totalError = error;
                    hwRow = hwNewRow;
                    hwCol = hwNewCol;
                    hwData = hwNewData;
                    hw = hwProjected;

                    owRow = owNewRow;
                    owCol = owNewCol;
                    owData = owNewData;
                    ow = owProjected;
                }

                var resultSet;
                XcalarQueryWithCheck("nn_iteration_" + iteration
                                     + Authentication.getHashId(),
                                     queryStr)
                .then(function () {
                    return (XcalarMakeResultSetFromTable(totalError));
                })
                .then(function(res) {
                    resultSet = res;
                    return (XcalarGetNextPage(resultSet.resultSetId, 1));
                })
                .then(function(out) {
                    var error = jQuery.parseJSON(out.kvPair[0].value)["constant"];
                    if (error > threshold) {
                        done = false;
                    } else {
                        done = true;
                    }

                    XcalarSetFree(resultSet.resultSetId);
                    innerDeferred.resolve(done);
                })
                return innerDeferred.promise();
            }

            // returns a query that does forward propagation
            function forwardPropagation(input, hw, ow,
                                        ha, oa, dataNum) {
                var haPreSigData = "haPreSigData";
                var haPreSig = "haPreSig_" + dataNum + tmpTableTag +
                    Authentication.getHashId();

                var hiddenActivationStr =
                    matrixMult(hw, hwRow, hwCol, hwData,
                               input, inputRow, inputCol, inputData,
                               haPreSig, haRow, haCol, haPreSigData,
                               dataNum + "haMult") +
                    'map --eval "float(nn:sigmoid(' + haPreSigData + '))"' +
                    ' --fieldName ' + haData +
                    ' --srctable ' + haPreSig +
                    ' --dsttable ' + ha + ';';

                var oaPreSigData = "oaPreSigData";
                var oaPreSig = "oaPreSig_" + dataNum + tmpTableTag +
                    Authentication.getHashId();
                var outputActivationStr =
                    matrixMult(ow, owRow, owCol, owData,
                               ha, haRow, haCol, haData,
                               oaPreSig, oaRow, oaCol, oaPreSigData,
                               dataNum + "oaMult") +
                    'map --eval "float(nn:sigmoid(' + oaPreSigData + '))"' +
                    ' --fieldName ' + oaData +
                    ' --srctable ' + oaPreSig +
                    ' --dsttable ' + oa + ';';

                return (hiddenActivationStr + outputActivationStr);
            }
        }

        // returns a query that performs A x B and stores result in table C
        function matrixMult(A, ARow, ACol, AData,
                            B, BRow, BCol, BData,
                            C, CRow, CCol, CData,
                            tag) {
            var Aindex = "A_index_" + tag + tmpTableTag +
                Authentication.getHashId();
            var Bindex = "B_index_" + tag + tmpTableTag +
                Authentication.getHashId();
            var Cjoin = "C_join_" + tag + tmpTableTag +
                Authentication.getHashId();

            var CmultCol = "C_mult_" + tag;
            var Cmult = "C_mult_" + tag + tmpTableTag +
                Authentication.getHashId();

            var concatStr =
                '"concat(concat(string(' + ARow + '),' + delim + '),' +
                'string(' + BCol + '))"';
            var CconcatCol = "C_concat_" + tag;
            var Cconcat = "C_concat_" + tag + tmpTableTag +
                Authentication.getHashId();

            var Cindex = "C_index_" + tag + tmpTableTag +
                Authentication.getHashId();
            var CgroupBy = "C_groupBy_" + tag + tmpTableTag +
                Authentication.getHashId();
            var CcutRow = "C_cutRow_" + tag + tmpTableTag +
                Authentication.getHashId();

            multStr =
                'index --key ' + ACol +
                ' --srctable ' + A +
                ' --dsttable ' + Aindex + ';' +
                'index --key ' + BRow +
                ' --srctable ' + B +
                ' --dsttable ' + Bindex + ';' +
                'join --leftTable ' + Aindex +
                ' --rightTable ' + Bindex +
                ' --joinTable ' + Cjoin + ';' +
                'map --eval "mult(' + AData + ',' + BData + ')"' +
                ' --fieldName ' + CmultCol +
                ' --srctable ' + Cjoin +
                ' --dsttable ' + Cmult + ';' +
                'map --eval ' + concatStr +
                ' --fieldName ' + CconcatCol +
                ' --srctable ' + Cmult +
                ' --dsttable ' + Cconcat + ';' +
                'index --key ' + CconcatCol +
                ' --srctable ' + Cconcat +
                ' --dsttable ' + Cindex + ';' +
                'groupBy --eval "sum(' + CmultCol + ')"' +
                ' --fieldName ' + CData +
                ' --srctable ' + Cindex +
                ' --dsttable ' + CgroupBy + ';' +
                'map --eval "int(cut(' + CconcatCol + ',1,' + delim + '))"' +
                ' --fieldName ' + CRow +
                ' --srctable ' + CgroupBy +
                ' --dsttable ' + CcutRow + ';' +
                'map --eval "int(cut(' + CconcatCol + ',2,' + delim + '))"' +
                ' --fieldName ' + CCol +
                ' --srctable ' + CcutRow +
                ' --dsttable ' + C + ';';
            return (multStr);
        }

        // returns a query that copies A into B
        function matrixCopy(A, ARow, ACol, AData,
                            B, BRow, BCol, BData,
                            tag) {
            var BmapRow = "B_mapRow_" + tag + tmpTableTag +
                Authentication.getHashId();
            var BmapCol = "B_mapCol_" + tag + tmpTableTag +
                Authentication.getHashId();

            copyStr =
                'map --eval "int(' + ACol + ')"' +
                ' --fieldName ' + BCol +
                ' --srctable ' + A +
                ' --dsttable ' + BmapCol + ';' +
                'map --eval "int(' + ARow + ')"' +
                ' --fieldName ' + BRow +
                ' --srctable ' + BmapCol +
                ' --dsttable ' + BmapRow + ';' +
                'map --eval "float(' + AData + ')"' +
                ' --fieldName ' + BData +
                ' --srctable ' + BmapRow +
                ' --dsttable ' + B + ';';
            return (copyStr);
        }

        // returns a query that performs transpose(A) and stores result in table B
        function matrixTranspose(A, ARow, ACol, AData,
                                 B, BRow, BCol, BData,
                                 tag) {
            return matrixCopy(A, ARow, ACol, AData,
                              B, BCol, BRow, BData,
                              tag);
        }

        // returns a query that performs A + B and stores result in table C
        function matrixAdd(A, ARow, ACol, AData,
                           B, BRow, BCol, BData,
                           C, CRow, CCol, CData,
                           tag) {
            var AconcatStr =
                '"concat(concat(string(' + ARow + '),' + delim + '),' +
                'string(' + ACol + '))"';
            var AconcatCol = "A_concat_" + tag;
            var Aconcat = "Aconcat_" + tag + tmpTableTag +
                Authentication.getHashId();

            var BconcatStr =
                '"concat(concat(string(' + BRow + '),' + delim + '),' +
                'string(' + BCol + '))"';
            var BconcatCol = "B_concat_" + tag;
            var Bconcat = "Bconcat_" + tag + tmpTableTag +
                Authentication.getHashId();

            var Aindex = "A_index_" + tag + tmpTableTag +
                Authentication.getHashId();
            var Bindex = "B_index_" + tag + tmpTableTag +
                Authentication.getHashId();
            var Cjoin = "C_join_" + tag + tmpTableTag +
                Authentication.getHashId();
            var Cadd = "C_add_" + tag + tmpTableTag +
                Authentication.getHashId();
            var CcutRow = "C_cutRow_" + tag + tmpTableTag +
                Authentication.getHashId();

            addStr =
                'map --eval ' + AconcatStr +
                ' --fieldName ' + AconcatCol +
                ' --srctable ' + A +
                ' --dsttable ' + Aconcat + ';' +
                'map --eval ' + BconcatStr +
                ' --fieldName ' + BconcatCol +
                ' --srctable ' + B +
                ' --dsttable ' + Bconcat + ';' +
                'index --key ' + AconcatCol +
                ' --srctable ' + Aconcat +
                ' --dsttable ' + Aindex + ';' +
                'index --key ' + BconcatCol +
                ' --srctable ' + Bconcat +
                ' --dsttable ' + Bindex + ';' +
                'join --leftTable ' + Aindex +
                ' --rightTable ' + Bindex +
                ' --joinTable ' + Cjoin + ';' +
                'map --eval "add(' + AData + ',' + BData + ')"' +
                ' --fieldName ' + CData +
                ' --srctable ' + Cjoin +
                ' --dsttable ' + Cadd + ';' +
                'map --eval "int(cut(' + AconcatCol + ',1,' + delim + '))"' +
                ' --fieldName ' + CRow +
                ' --srctable ' + Cadd +
                ' --dsttable ' + CcutRow + ';' +
                'map --eval "int(cut(' + AconcatCol + ',2,' + delim + '))"' +
                ' --fieldName ' + CCol +
                ' --srctable ' + CcutRow +
                ' --dsttable ' + C + ';';
            return (addStr);
        }
    };
    return (UExtNN);
}({}, jQuery));

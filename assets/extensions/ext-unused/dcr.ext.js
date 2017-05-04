window.UExtDemo = (function(UExtDemo) {
    UExtDemo.buttons = [{
        "buttonText": "Demo",
        "fnName": "demo",
        "arrayOfFields": [{
            "type": "string",
            "name": "Start Date",
            "fieldClass": "startDate",
            // "autofill": "20150403"
        },
        {
            "type": "string",
            "name": "End Date",
            "fieldClass": "endDate",
            // "autofill": "20160408"
        },
        {
            "type": "string",
            "name": "Shop ID List",
            "fieldClass": "shopIdList",
            // "autofill": "4838593,163520,59928"
        }]
    }];

    UExtDemo.actionFn = function(functionName) {
        switch (functionName) {
            case "demo":
                return demo();
            default:
                return null;
        }
    };

    function demo() {
        var ext = new XcSDK.Extension();

        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();
            var self = this;

            var args = self.getArgs();
            var startDate = args.startDate;
            var endDate = args.endDate;
            var shopIdList = args.shopIdList;
            var srcTableName = self.getTriggerTable().getName();
            var dstTableName = ext.createTableName(null, null, "all");

            // substring(0, 6) both startDate and endDate
            startDate = startDate.substring(0, 6);
            endDate = endDate.substring(0, 6);

            // For shopIdList, generate a eval string with OR and EQ.
            var shopIdSet = {};
            shopIdList.split(",").forEach(function(shopId) {
                shopId = "\\\"" + shopId.trim() + "\\\"";
                shopIdSet[shopId] = true;
            });

            var fltOpt = xcHelper.getFilterOptions(FltOp.Filter, "shopid",
                                                   shopIdSet);
            var shopIdEvalStr = fltOpt.filterString;
            var query =
            'map --eval \"dcr:genUnionKey(s_company--companyname, shopid, s_shopid--shopname, g_spdm--c_xilbh, r_xilie--c_xilmc, r_xilie--n_id)\" --srctable \"<USERSRCTABLE>\" --fieldName \"gbkey\" --dsttable \"BatchTable#aN769\"; map --eval \"substring(month, 0, 6)\" --srctable \"BatchTable#aN769\" --fieldName \"month_substring\" --dsttable \"BatchTable#aN770\";map --eval \"int(month_substring)\" --srctable \"BatchTable#aN770\" --fieldName \"b_month\" --dsttable \"BatchTable#aN772\";filter --srctable \"BatchTable#aN772\" --eval \"between(b_month, <USERSTARTDATE>, <USERENDDATE>)\" --dsttable \"handEdit_1#aN1000\";filter --srctable \"handEdit_1#aN1000\" --eval \"<USEREVALSTRING>\" --dsttable \"handEdit_final#aN1001\";filter --srctable \"handEdit_final#aN1001\" --eval \"eq(ioflag, \\\"112\\\")\"  --dsttable \"BatchTable#aN774\";filter --srctable \"handEdit_final#aN1001\" --eval \"eq(iotype, \\\"111\\\")\"  --dsttable \"BatchTable#aN773\";map --eval \"float(amount)\" --srctable \"BatchTable#aN774\" --fieldName \"amount_float\" --dsttable \"BatchTable#aN777\";map --eval \"float(amount)\" --srctable \"BatchTable#aN773\" --fieldName \"amount_float\" --dsttable \"BatchTable#aN775\";map --eval \"float(g_spdm--sale)\" --srctable \"BatchTable#aN777\" --fieldName \"sale_float\" --dsttable \"BatchTable#aN778\";map --eval \"float(g_spdm--sale)\" --srctable \"BatchTable#aN775\" --fieldName \"sale_float\" --dsttable \"BatchTable#aN776\";map --eval \"mult(amount_float, sale_float)\" --srctable \"BatchTable#aN778\" --fieldName \"dxje\" --dsttable \"BatchTable#aN781\";map --eval \"mult(-1, mult(amount_float, sale_float))\" --srctable \"BatchTable#aN776\" --fieldName \"kc\" --dsttable \"BatchTable#aN780\";map --eval \"concat(string(gbkey), concat(\\\".Xc.\\\", string(sku)))\" --srctable \"BatchTable#aN781\" --fieldName \"multiGroupBy64271\" --dsttable \"BatchTable#aN788\";map --eval \"concat(string(gbkey), concat(\\\".Xc.\\\", string(sku)))\" --srctable \"BatchTable#aN780\" --fieldName \"multiGroupBy96929\" --dsttable \"BatchTable#aN783\";index --key \"multiGroupBy64271\" --srctable \"BatchTable#aN788\" --dsttable \"BatchTable.index#aN789\";index --key \"multiGroupBy96929\" --srctable \"BatchTable#aN783\" --dsttable \"BatchTable.index#aN784\";groupBy --srctable \"BatchTable.index#aN789\" --eval \"count(sku)\" --fieldName \"gbkey_count\" --newKeyFieldName \"multiGroupBy64271\" --dsttable \"cd2#aN787\" --nosample;groupBy --srctable \"BatchTable.index#aN784\" --eval \"count(sku)\" --fieldName \"gbkey_count\" --newKeyFieldName \"multiGroupBy96929\" --dsttable \"cd111#aN782\" --nosample;map --eval \"cut(multiGroupBy64271, 1, \\\".Xc.\\\")\" --srctable \"cd2#aN787\" --fieldName \"gbkey\" --dsttable \"cd2#aN790\";map --eval \"cut(multiGroupBy96929, 1, \\\".Xc.\\\")\" --srctable \"cd111#aN782\" --fieldName \"gbkey\" --dsttable \"cd111#aN785\";map --eval \"cut(multiGroupBy64271, 2, \\\".Xc.\\\")\" --srctable \"cd2#aN790\" --fieldName \"sku\" --dsttable \"cd2#aN791\";map --eval \"cut(multiGroupBy96929, 2, \\\".Xc.\\\")\" --srctable \"cd111#aN785\" --fieldName \"sku\" --dsttable \"cd111#aN786\";map --eval \"rfind(multiGroupBy64271, \\\".Xc.\\\", 0, 0)\" --srctable \"cd2#aN791\" --fieldName \"splitIndex\" --dsttable \"cd2#aN796\";map --eval \"rfind(multiGroupBy96929, \\\".Xc.\\\", 0, 0)\" --srctable \"cd111#aN786\" --fieldName \"splitIndex\" --dsttable \"cd111#aN792\";index --key \"gbkey\" --srctable \"BatchTable#aN781\" --dsttable \"BatchTable.index#aN801\";map --eval \"substring(multiGroupBy64271, 0, splitIndex)\" --srctable \"cd2#aN796\" --fieldName \"correctGbKey\" --dsttable \"cd2#aN797\";index --key \"gbkey\" --srctable \"BatchTable#aN780\" --dsttable \"BatchTable.index#aN806\";map --eval \"substring(multiGroupBy96929, 0, splitIndex)\" --srctable \"cd111#aN792\" --fieldName \"correctGbKey\" --dsttable \"cd111#aN793\";groupBy --srctable \"BatchTable.index#aN801\" --eval \"sum(amount_float)\" --fieldName \"dx\" --newKeyFieldName \"gbkey\" --dsttable \"dx#aN803\" --nosample;groupBy --srctable \"BatchTable.index#aN801\" --eval \"sum(dxje)\" --fieldName \"t_dxje\" --newKeyFieldName \"gbkey\" --dsttable \"dx#aN802\" --nosample;index --key \"correctGbKey\" --srctable \"cd2#aN797\" --dsttable \"cd2.index#aN799\";groupBy --srctable \"BatchTable.index#aN806\" --eval \"sum(mult(-1, amount_float))\" --fieldName \"t_kc\" --newKeyFieldName \"gbkey\" --dsttable \"kc#aN808\" --nosample;groupBy --srctable \"BatchTable.index#aN806\" --eval \"sum(kc)\" --fieldName \"kcje\" --newKeyFieldName \"gbkey\" --dsttable \"kc#aN807\" --nosample;index --key \"correctGbKey\" --srctable \"cd111#aN793\" --dsttable \"cd111.index#aN795\";join --leftTable \"dx#aN802\" --rightTable \"dx#aN803\" --joinType innerJoin  --joinTable \"dx#aN804\" --collisionCheck --rightRenameMap gbkey:gbkey_GB569:1;groupBy --srctable \"cd2.index#aN799\" --eval \"count(gbkey_count)\" --fieldName \"dxsku\" --newKeyFieldName \"correctGbKey\" --dsttable \"dxsku#aN798\" --nosample;join --leftTable \"kc#aN807\" --rightTable \"kc#aN808\" --joinType innerJoin  --joinTable \"kc#aN809\" --collisionCheck --rightRenameMap gbkey:gbkey_GB408:1;groupBy --srctable \"cd111.index#aN795\" --eval \"count(gbkey_count)\" --fieldName \"kcsku\" --newKeyFieldName \"correctGbKey\" --dsttable \"kcsku#aN794\" --nosample;join --leftTable \"dxsku#aN798\" --rightTable \"dx#aN804\" --joinType innerJoin  --joinTable \"dx_all#aN811\" --collisionCheck;join --leftTable \"kcsku#aN794\" --rightTable \"kc#aN809\" --joinType innerJoin  --joinTable \"kc_final#aN810\" --collisionCheck;index --key \"gbkey\" --srctable \"dx_all#aN811\" --dsttable \"dx_all.index#aN823\";index --key \"gbkey\" --srctable \"kc_final#aN810\" --dsttable \"kc_final.index#aN824\";join --leftTable \"kc_final.index#aN824\" --rightTable \"dx_all.index#aN823\" --joinType innerJoin  --joinTable \"all#aN822\" --collisionCheck --leftRenameMap correctGbKey:correctGbKey_296:1 --rightRenameMap gbkey:gbkey_296:1;map --eval \"cut(gbkey, 1, \\\".Xc.\\\")\" --srctable \"all#aN822\" --fieldName \"companyname\" --dsttable \"all#aN825\";map --eval \"cut(gbkey, 2, \\\".Xc.\\\")\" --srctable \"all#aN825\" --fieldName \"shopid\" --dsttable \"all#aN826\";map --eval \"cut(gbkey, 3, \\\".Xc.\\\")\" --srctable \"all#aN826\" --fieldName \"shopname\" --dsttable \"all#aN827\";map --eval \"cut(gbkey, 4, \\\".Xc.\\\")\" --srctable \"all#aN827\" --fieldName \"c_xilbh\" --dsttable \"all#aN828\";map --eval \"cut(gbkey, 5, \\\".Xc.\\\")\" --srctable \"all#aN828\" --fieldName \"c_xilmc\" --dsttable \"all#aN829\";map --eval \"cut(gbkey, 6, \\\".Xc.\\\")\" --srctable \"all#aN829\" --fieldName \"n_id_pre\" --dsttable \"all#aN830\";map --eval \"dcr:zfill(n_id_pre)\" --srctable \"all#aN830\" --fieldName \"n_id\" --dsttable \"all#aN831\";map --eval \"dcr:genUnionKey(shopname, shopid, n_id)\" --srctable \"all#aN831\" --fieldName \"sortKey\" --dsttable \"all#aN832\";index --key \"sortKey\" --srctable \"all#aN832\" --dsttable \"<DSTTABLE>\" --sorted;'

            query = query.replace(/\<USERSTARTDATE\>/g, startDate)
                        .replace(/\<USERENDDATE\>/g, endDate)
                        .replace(/\<USEREVALSTRING\>/g, shopIdEvalStr)
                        .replace(/\<USERSRCTABLE\>/g, srcTableName)
                        .replace(/\<DSTTABLE\>/g, dstTableName);
            query += 'drop table *aN*;';

            // console.log(query)
            ext.query(query)
            .then(function() {
                var finalTable = ext.createNewTable(dstTableName);
                var cols = ["companyname", "shopid", "shopname", "c_xilbh",
                            "c_xilmc", "kcsku", "t_kc", "kcje", "dxsku",
                            "dx", "t_dxje", "n_id"];
                var frontNames = [null, null, null, null,
                                  null, null, "kc", null, null,
                                  null, "dxje", null];

                cols.forEach(function(colName, index) {
                    var newCol = new XcSDK.Column(colName);
                    if (frontNames[index]) {
                        newCol.setFrontName(frontNames[index]);
                    }
                    finalTable.addCol(newCol);
                });

                return finalTable.addToWorksheet();
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
            // deferred.resolve()
            return deferred.promise();
        };


        return ext;
    }


    return UExtDemo;
}({}));
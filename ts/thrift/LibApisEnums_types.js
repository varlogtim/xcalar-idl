//
// Autogenerated by Thrift Compiler (0.10.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//


XcalarApisT = {
  'XcalarApiUnknown' : 0,
  'XcalarApiGetVersion' : 1,
  'XcalarApiBulkLoad' : 2,
  'XcalarApiIndex' : 3,
  'XcalarApiGetTableMeta' : 4,
  'XcalarApiShutdown' : 5,
  'XcalarApiGetStat' : 6,
  'XcalarApiGetStatByGroupId' : 7,
  'XcalarApiResetStat' : 8,
  'XcalarApiGetStatGroupIdMap' : 9,
  'XcalarApiListDagNodeInfo' : 10,
  'XcalarApiListDatasets' : 11,
  'XcalarApiShutdownLocal' : 12,
  'XcalarApiMakeResultSet' : 13,
  'XcalarApiResultSetNext' : 14,
  'XcalarApiJoin' : 15,
  'XcalarApiProject' : 16,
  'XcalarApiGetRowNum' : 17,
  'XcalarApiFilter' : 18,
  'XcalarApiGroupBy' : 19,
  'XcalarApiResultSetAbsolute' : 20,
  'XcalarApiFreeResultSet' : 21,
  'XcalarApiDeleteObjects' : 22,
  'XcalarApiGetTableRefCount' : 23,
  'XcalarApiMap' : 24,
  'XcalarApiAggregate' : 25,
  'XcalarApiQuery' : 26,
  'XcalarApiQueryState' : 27,
  'XcalarApiQueryCancel' : 28,
  'XcalarApiQueryDelete' : 29,
  'XcalarApiAddExportTarget' : 30,
  'XcalarApiRemoveExportTarget' : 31,
  'XcalarApiListExportTargets' : 32,
  'XcalarApiExport' : 33,
  'XcalarApiGetDag' : 34,
  'XcalarApiListFiles' : 35,
  'XcalarApiStartNodes' : 36,
  'XcalarApiMakeRetina' : 37,
  'XcalarApiListRetinas' : 38,
  'XcalarApiGetRetina' : 39,
  'XcalarApiDeleteRetina' : 40,
  'XcalarApiUpdateRetina' : 41,
  'XcalarApiListParametersInRetina' : 42,
  'XcalarApiExecuteRetina' : 43,
  'XcalarApiImportRetina' : 44,
  'XcalarApiKeyLookup' : 45,
  'XcalarApiKeyAddOrReplace' : 46,
  'XcalarApiKeyDelete' : 47,
  'XcalarApiGetNumNodes' : 48,
  'XcalarApiTop' : 49,
  'XcalarApiMemory' : 50,
  'XcalarApiListXdfs' : 51,
  'XcalarApiRenameNode' : 52,
  'XcalarApiSessionNew' : 53,
  'XcalarApiSessionList' : 54,
  'XcalarApiSessionRename' : 55,
  'XcalarApiSessionSwitch' : 56,
  'XcalarApiSessionDelete' : 57,
  'XcalarApiSessionInfo' : 58,
  'XcalarApiSessionInact' : 59,
  'XcalarApiSessionPersist' : 60,
  'XcalarApiGetQuery' : 61,
  'XcalarApiCreateDht' : 62,
  'XcalarApiKeyAppend' : 63,
  'XcalarApiKeySetIfEqual' : 64,
  'XcalarApiDeleteDht' : 65,
  'XcalarApiSupportGenerate' : 66,
  'XcalarApiUdfAdd' : 67,
  'XcalarApiUdfUpdate' : 68,
  'XcalarApiUdfGet' : 69,
  'XcalarApiUdfDelete' : 70,
  'XcalarApiCancelOp' : 71,
  'XcalarApiGetPerNodeOpStats' : 72,
  'XcalarApiGetOpStats' : 73,
  'XcalarApiErrorpointSet' : 74,
  'XcalarApiErrorpointList' : 75,
  'XcalarApiPreview' : 76,
  'XcalarApiExportRetina' : 77,
  'XcalarApiStartFuncTests' : 78,
  'XcalarApiListFuncTests' : 79,
  'XcalarApiDeleteDatasets' : 80,
  'XcalarApiGetConfigParams' : 81,
  'XcalarApiSetConfigParam' : 82,
  'XcalarApiAppSet' : 83,
  'XcalarApiGetLicense' : 84,
  'XcalarApiAppRun' : 85,
  'XcalarApiAppReap' : 86,
  'XcalarApiDemoFile' : 87,
  'XcalarApiUpdateLicense' : 88,
  'XcalarApiListFuncTest' : 89,
  'XcalarApiQueryName' : 90,
  'XcalarApiStartFuncTest' : 91,
  'XcalarApiStat' : 92,
  'XcalarApiStatByGroupId' : 93,
  'XcalarApiTable' : 94,
  'XcalarStressSetKeyType' : 95,
  'XcalarApiDagTableName' : 96,
  'XcalarApiLicenseUpdate' : 97,
  'XcalarApiSessionListScalar' : 98,
  'XcalarApiSessionListArray' : 99,
  'XcalarApiExExportTarget' : 100,
  'XcalarApiExExportTargetHdr' : 101,
  'XcalarApiPacked' : 102,
  'XcalarApiDagNodeNamePattern' : 103,
  'XcalarApiDagNodeNamePatternDelete' : 104,
  'XcalarApiAddParameterToRetina' : 105,
  'XcalarApiGetMemoryUsage' : 106,
  'XcalarApiLogLevelSet' : 107,
  'XcalarApiUpdateRetinaExport' : 108,
  'XcalarApiGetIpAddr' : 109,
  'XcalarApiTagDagNodes' : 110,
  'XcalarApiCommentDagNodes' : 111,
  'XcalarApiListDatasetUsers' : 112,
  'XcalarApiLogLevelGet' : 113,
  'XcalarApiLockDataset' : 114,
  'XcalarApiPerNodeTop' : 115,
  'XcalarApiKeyList' : 116,
  'XcalarApiGetCurrentXemConfig' : 117,
  'XcalarApiListUserDatasets' : 118,
  'XcalarApiUnion' : 119,
  'XcalarApiTarget' : 120,
  'XcalarApiSynthesize' : 121,
  'XcalarApiGetRetinaJson' : 122,
  'XcalarApiGetDatasetsInfo' : 123,
  'XcalarApiArchiveTables' : 124,
  'XcalarApiSessionDownload' : 125,
  'XcalarApiSessionUpload' : 126,
  'XcalarApiPublish' : 127,
  'XcalarApiUpdate' : 128,
  'XcalarApiSelect' : 129,
  'XcalarApiUnpublish' : 130,
  'XcalarApiListTables' : 131,
  'XcalarApiRestoreTable' : 132,
  'XcalarApiCoalesce' : 133,
  'XcalarApiFunctionInvalid' : 134
};
XcalarApisTStr = {
  0 : 'XcalarApiUnknown',
  1 : 'XcalarApiGetVersion',
  2 : 'XcalarApiBulkLoad',
  3 : 'XcalarApiIndex',
  4 : 'XcalarApiGetTableMeta',
  5 : 'XcalarApiShutdown',
  6 : 'XcalarApiGetStat',
  7 : 'XcalarApiGetStatByGroupId',
  8 : 'XcalarApiResetStat',
  9 : 'XcalarApiGetStatGroupIdMap',
  10 : 'XcalarApiListDagNodeInfo',
  11 : 'XcalarApiListDatasets',
  12 : 'XcalarApiShutdownLocal',
  13 : 'XcalarApiMakeResultSet',
  14 : 'XcalarApiResultSetNext',
  15 : 'XcalarApiJoin',
  16 : 'XcalarApiProject',
  17 : 'XcalarApiGetRowNum',
  18 : 'XcalarApiFilter',
  19 : 'XcalarApiGroupBy',
  20 : 'XcalarApiResultSetAbsolute',
  21 : 'XcalarApiFreeResultSet',
  22 : 'XcalarApiDeleteObjects',
  23 : 'XcalarApiGetTableRefCount',
  24 : 'XcalarApiMap',
  25 : 'XcalarApiAggregate',
  26 : 'XcalarApiQuery',
  27 : 'XcalarApiQueryState',
  28 : 'XcalarApiQueryCancel',
  29 : 'XcalarApiQueryDelete',
  30 : 'XcalarApiAddExportTarget',
  31 : 'XcalarApiRemoveExportTarget',
  32 : 'XcalarApiListExportTargets',
  33 : 'XcalarApiExport',
  34 : 'XcalarApiGetDag',
  35 : 'XcalarApiListFiles',
  36 : 'XcalarApiStartNodes',
  37 : 'XcalarApiMakeRetina',
  38 : 'XcalarApiListRetinas',
  39 : 'XcalarApiGetRetina',
  40 : 'XcalarApiDeleteRetina',
  41 : 'XcalarApiUpdateRetina',
  42 : 'XcalarApiListParametersInRetina',
  43 : 'XcalarApiExecuteRetina',
  44 : 'XcalarApiImportRetina',
  45 : 'XcalarApiKeyLookup',
  46 : 'XcalarApiKeyAddOrReplace',
  47 : 'XcalarApiKeyDelete',
  48 : 'XcalarApiGetNumNodes',
  49 : 'XcalarApiTop',
  50 : 'XcalarApiMemory',
  51 : 'XcalarApiListXdfs',
  52 : 'XcalarApiRenameNode',
  53 : 'XcalarApiSessionNew',
  54 : 'XcalarApiSessionList',
  55 : 'XcalarApiSessionRename',
  56 : 'XcalarApiSessionSwitch',
  57 : 'XcalarApiSessionDelete',
  58 : 'XcalarApiSessionInfo',
  59 : 'XcalarApiSessionInact',
  60 : 'XcalarApiSessionPersist',
  61 : 'XcalarApiGetQuery',
  62 : 'XcalarApiCreateDht',
  63 : 'XcalarApiKeyAppend',
  64 : 'XcalarApiKeySetIfEqual',
  65 : 'XcalarApiDeleteDht',
  66 : 'XcalarApiSupportGenerate',
  67 : 'XcalarApiUdfAdd',
  68 : 'XcalarApiUdfUpdate',
  69 : 'XcalarApiUdfGet',
  70 : 'XcalarApiUdfDelete',
  71 : 'XcalarApiCancelOp',
  72 : 'XcalarApiGetPerNodeOpStats',
  73 : 'XcalarApiGetOpStats',
  74 : 'XcalarApiErrorpointSet',
  75 : 'XcalarApiErrorpointList',
  76 : 'XcalarApiPreview',
  77 : 'XcalarApiExportRetina',
  78 : 'XcalarApiStartFuncTests',
  79 : 'XcalarApiListFuncTests',
  80 : 'XcalarApiDeleteDatasets',
  81 : 'XcalarApiGetConfigParams',
  82 : 'XcalarApiSetConfigParam',
  83 : 'XcalarApiAppSet',
  84 : 'XcalarApiGetLicense',
  85 : 'XcalarApiAppRun',
  86 : 'XcalarApiAppReap',
  87 : 'XcalarApiDemoFile',
  88 : 'XcalarApiUpdateLicense',
  89 : 'XcalarApiListFuncTest',
  90 : 'XcalarApiQueryName',
  91 : 'XcalarApiStartFuncTest',
  92 : 'XcalarApiStat',
  93 : 'XcalarApiStatByGroupId',
  94 : 'XcalarApiTable',
  95 : 'XcalarStressSetKeyType',
  96 : 'XcalarApiDagTableName',
  97 : 'XcalarApiLicenseUpdate',
  98 : 'XcalarApiSessionListScalar',
  99 : 'XcalarApiSessionListArray',
  100 : 'XcalarApiExExportTarget',
  101 : 'XcalarApiExExportTargetHdr',
  102 : 'XcalarApiPacked',
  103 : 'XcalarApiDagNodeNamePattern',
  104 : 'XcalarApiDagNodeNamePatternDelete',
  105 : 'XcalarApiAddParameterToRetina',
  106 : 'XcalarApiGetMemoryUsage',
  107 : 'XcalarApiLogLevelSet',
  108 : 'XcalarApiUpdateRetinaExport',
  109 : 'XcalarApiGetIpAddr',
  110 : 'XcalarApiTagDagNodes',
  111 : 'XcalarApiCommentDagNodes',
  112 : 'XcalarApiListDatasetUsers',
  113 : 'XcalarApiLogLevelGet',
  114 : 'XcalarApiLockDataset',
  115 : 'XcalarApiPerNodeTop',
  116 : 'XcalarApiKeyList',
  117 : 'XcalarApiGetCurrentXemConfig',
  118 : 'XcalarApiListUserDatasets',
  119 : 'XcalarApiUnion',
  120 : 'XcalarApiTarget',
  121 : 'XcalarApiSynthesize',
  122 : 'XcalarApiGetRetinaJson',
  123 : 'XcalarApiGetDatasetsInfo',
  124 : 'XcalarApiArchiveTables',
  125 : 'XcalarApiSessionDownload',
  126 : 'XcalarApiSessionUpload',
  127 : 'XcalarApiPublish',
  128 : 'XcalarApiUpdate',
  129 : 'XcalarApiSelect',
  130 : 'XcalarApiUnpublish',
  131 : 'XcalarApiListTables',
  132 : 'XcalarApiRestoreTable',
  133 : 'XcalarApiCoalesce',
  134 : 'XcalarApiFunctionInvalid'
};
XcalarApisTFromStr = {
  'XcalarApiUnknown' : 0,
  'XcalarApiGetVersion' : 1,
  'XcalarApiBulkLoad' : 2,
  'XcalarApiIndex' : 3,
  'XcalarApiGetTableMeta' : 4,
  'XcalarApiShutdown' : 5,
  'XcalarApiGetStat' : 6,
  'XcalarApiGetStatByGroupId' : 7,
  'XcalarApiResetStat' : 8,
  'XcalarApiGetStatGroupIdMap' : 9,
  'XcalarApiListDagNodeInfo' : 10,
  'XcalarApiListDatasets' : 11,
  'XcalarApiShutdownLocal' : 12,
  'XcalarApiMakeResultSet' : 13,
  'XcalarApiResultSetNext' : 14,
  'XcalarApiJoin' : 15,
  'XcalarApiProject' : 16,
  'XcalarApiGetRowNum' : 17,
  'XcalarApiFilter' : 18,
  'XcalarApiGroupBy' : 19,
  'XcalarApiResultSetAbsolute' : 20,
  'XcalarApiFreeResultSet' : 21,
  'XcalarApiDeleteObjects' : 22,
  'XcalarApiGetTableRefCount' : 23,
  'XcalarApiMap' : 24,
  'XcalarApiAggregate' : 25,
  'XcalarApiQuery' : 26,
  'XcalarApiQueryState' : 27,
  'XcalarApiQueryCancel' : 28,
  'XcalarApiQueryDelete' : 29,
  'XcalarApiAddExportTarget' : 30,
  'XcalarApiRemoveExportTarget' : 31,
  'XcalarApiListExportTargets' : 32,
  'XcalarApiExport' : 33,
  'XcalarApiGetDag' : 34,
  'XcalarApiListFiles' : 35,
  'XcalarApiStartNodes' : 36,
  'XcalarApiMakeRetina' : 37,
  'XcalarApiListRetinas' : 38,
  'XcalarApiGetRetina' : 39,
  'XcalarApiDeleteRetina' : 40,
  'XcalarApiUpdateRetina' : 41,
  'XcalarApiListParametersInRetina' : 42,
  'XcalarApiExecuteRetina' : 43,
  'XcalarApiImportRetina' : 44,
  'XcalarApiKeyLookup' : 45,
  'XcalarApiKeyAddOrReplace' : 46,
  'XcalarApiKeyDelete' : 47,
  'XcalarApiGetNumNodes' : 48,
  'XcalarApiTop' : 49,
  'XcalarApiMemory' : 50,
  'XcalarApiListXdfs' : 51,
  'XcalarApiRenameNode' : 52,
  'XcalarApiSessionNew' : 53,
  'XcalarApiSessionList' : 54,
  'XcalarApiSessionRename' : 55,
  'XcalarApiSessionSwitch' : 56,
  'XcalarApiSessionDelete' : 57,
  'XcalarApiSessionInfo' : 58,
  'XcalarApiSessionInact' : 59,
  'XcalarApiSessionPersist' : 60,
  'XcalarApiGetQuery' : 61,
  'XcalarApiCreateDht' : 62,
  'XcalarApiKeyAppend' : 63,
  'XcalarApiKeySetIfEqual' : 64,
  'XcalarApiDeleteDht' : 65,
  'XcalarApiSupportGenerate' : 66,
  'XcalarApiUdfAdd' : 67,
  'XcalarApiUdfUpdate' : 68,
  'XcalarApiUdfGet' : 69,
  'XcalarApiUdfDelete' : 70,
  'XcalarApiCancelOp' : 71,
  'XcalarApiGetPerNodeOpStats' : 72,
  'XcalarApiGetOpStats' : 73,
  'XcalarApiErrorpointSet' : 74,
  'XcalarApiErrorpointList' : 75,
  'XcalarApiPreview' : 76,
  'XcalarApiExportRetina' : 77,
  'XcalarApiStartFuncTests' : 78,
  'XcalarApiListFuncTests' : 79,
  'XcalarApiDeleteDatasets' : 80,
  'XcalarApiGetConfigParams' : 81,
  'XcalarApiSetConfigParam' : 82,
  'XcalarApiAppSet' : 83,
  'XcalarApiGetLicense' : 84,
  'XcalarApiAppRun' : 85,
  'XcalarApiAppReap' : 86,
  'XcalarApiDemoFile' : 87,
  'XcalarApiUpdateLicense' : 88,
  'XcalarApiListFuncTest' : 89,
  'XcalarApiQueryName' : 90,
  'XcalarApiStartFuncTest' : 91,
  'XcalarApiStat' : 92,
  'XcalarApiStatByGroupId' : 93,
  'XcalarApiTable' : 94,
  'XcalarStressSetKeyType' : 95,
  'XcalarApiDagTableName' : 96,
  'XcalarApiLicenseUpdate' : 97,
  'XcalarApiSessionListScalar' : 98,
  'XcalarApiSessionListArray' : 99,
  'XcalarApiExExportTarget' : 100,
  'XcalarApiExExportTargetHdr' : 101,
  'XcalarApiPacked' : 102,
  'XcalarApiDagNodeNamePattern' : 103,
  'XcalarApiDagNodeNamePatternDelete' : 104,
  'XcalarApiAddParameterToRetina' : 105,
  'XcalarApiGetMemoryUsage' : 106,
  'XcalarApiLogLevelSet' : 107,
  'XcalarApiUpdateRetinaExport' : 108,
  'XcalarApiGetIpAddr' : 109,
  'XcalarApiTagDagNodes' : 110,
  'XcalarApiCommentDagNodes' : 111,
  'XcalarApiListDatasetUsers' : 112,
  'XcalarApiLogLevelGet' : 113,
  'XcalarApiLockDataset' : 114,
  'XcalarApiPerNodeTop' : 115,
  'XcalarApiKeyList' : 116,
  'XcalarApiGetCurrentXemConfig' : 117,
  'XcalarApiListUserDatasets' : 118,
  'XcalarApiUnion' : 119,
  'XcalarApiTarget' : 120,
  'XcalarApiSynthesize' : 121,
  'XcalarApiGetRetinaJson' : 122,
  'XcalarApiGetDatasetsInfo' : 123,
  'XcalarApiArchiveTables' : 124,
  'XcalarApiSessionDownload' : 125,
  'XcalarApiSessionUpload' : 126,
  'XcalarApiPublish' : 127,
  'XcalarApiUpdate' : 128,
  'XcalarApiSelect' : 129,
  'XcalarApiUnpublish' : 130,
  'XcalarApiListTables' : 131,
  'XcalarApiRestoreTable' : 132,
  'XcalarApiCoalesce' : 133,
  'XcalarApiFunctionInvalid' : 134
};

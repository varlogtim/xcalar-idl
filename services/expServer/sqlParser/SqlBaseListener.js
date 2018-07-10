// Generated from SqlBase.g4 by ANTLR 4.7.1
// jshint ignore: start
var antlr4 = require('antlr4/index');

// This class defines a complete listener for a parse tree produced by SqlBaseParser.
function SqlBaseListener() {
	antlr4.tree.ParseTreeListener.call(this);
	return this;
}

SqlBaseListener.prototype = Object.create(antlr4.tree.ParseTreeListener.prototype);
SqlBaseListener.prototype.constructor = SqlBaseListener;

// Enter a parse tree produced by SqlBaseParser#singleStatement.
SqlBaseListener.prototype.enterSingleStatement = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#singleStatement.
SqlBaseListener.prototype.exitSingleStatement = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#singleExpression.
SqlBaseListener.prototype.enterSingleExpression = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#singleExpression.
SqlBaseListener.prototype.exitSingleExpression = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#singleTableIdentifier.
SqlBaseListener.prototype.enterSingleTableIdentifier = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#singleTableIdentifier.
SqlBaseListener.prototype.exitSingleTableIdentifier = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#singleFunctionIdentifier.
SqlBaseListener.prototype.enterSingleFunctionIdentifier = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#singleFunctionIdentifier.
SqlBaseListener.prototype.exitSingleFunctionIdentifier = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#singleDataType.
SqlBaseListener.prototype.enterSingleDataType = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#singleDataType.
SqlBaseListener.prototype.exitSingleDataType = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#singleTableSchema.
SqlBaseListener.prototype.enterSingleTableSchema = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#singleTableSchema.
SqlBaseListener.prototype.exitSingleTableSchema = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#statementDefault.
SqlBaseListener.prototype.enterStatementDefault = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#statementDefault.
SqlBaseListener.prototype.exitStatementDefault = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#use.
SqlBaseListener.prototype.enterUse = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#use.
SqlBaseListener.prototype.exitUse = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#createDatabase.
SqlBaseListener.prototype.enterCreateDatabase = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#createDatabase.
SqlBaseListener.prototype.exitCreateDatabase = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#setDatabaseProperties.
SqlBaseListener.prototype.enterSetDatabaseProperties = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#setDatabaseProperties.
SqlBaseListener.prototype.exitSetDatabaseProperties = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#dropDatabase.
SqlBaseListener.prototype.enterDropDatabase = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#dropDatabase.
SqlBaseListener.prototype.exitDropDatabase = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#createTable.
SqlBaseListener.prototype.enterCreateTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#createTable.
SqlBaseListener.prototype.exitCreateTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#createHiveTable.
SqlBaseListener.prototype.enterCreateHiveTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#createHiveTable.
SqlBaseListener.prototype.exitCreateHiveTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#createTableLike.
SqlBaseListener.prototype.enterCreateTableLike = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#createTableLike.
SqlBaseListener.prototype.exitCreateTableLike = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#analyze.
SqlBaseListener.prototype.enterAnalyze = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#analyze.
SqlBaseListener.prototype.exitAnalyze = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#addTableColumns.
SqlBaseListener.prototype.enterAddTableColumns = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#addTableColumns.
SqlBaseListener.prototype.exitAddTableColumns = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#renameTable.
SqlBaseListener.prototype.enterRenameTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#renameTable.
SqlBaseListener.prototype.exitRenameTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#setTableProperties.
SqlBaseListener.prototype.enterSetTableProperties = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#setTableProperties.
SqlBaseListener.prototype.exitSetTableProperties = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#unsetTableProperties.
SqlBaseListener.prototype.enterUnsetTableProperties = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#unsetTableProperties.
SqlBaseListener.prototype.exitUnsetTableProperties = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#changeColumn.
SqlBaseListener.prototype.enterChangeColumn = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#changeColumn.
SqlBaseListener.prototype.exitChangeColumn = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#setTableSerDe.
SqlBaseListener.prototype.enterSetTableSerDe = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#setTableSerDe.
SqlBaseListener.prototype.exitSetTableSerDe = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#addTablePartition.
SqlBaseListener.prototype.enterAddTablePartition = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#addTablePartition.
SqlBaseListener.prototype.exitAddTablePartition = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#renameTablePartition.
SqlBaseListener.prototype.enterRenameTablePartition = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#renameTablePartition.
SqlBaseListener.prototype.exitRenameTablePartition = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#dropTablePartitions.
SqlBaseListener.prototype.enterDropTablePartitions = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#dropTablePartitions.
SqlBaseListener.prototype.exitDropTablePartitions = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#setTableLocation.
SqlBaseListener.prototype.enterSetTableLocation = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#setTableLocation.
SqlBaseListener.prototype.exitSetTableLocation = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#recoverPartitions.
SqlBaseListener.prototype.enterRecoverPartitions = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#recoverPartitions.
SqlBaseListener.prototype.exitRecoverPartitions = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#dropTable.
SqlBaseListener.prototype.enterDropTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#dropTable.
SqlBaseListener.prototype.exitDropTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#createView.
SqlBaseListener.prototype.enterCreateView = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#createView.
SqlBaseListener.prototype.exitCreateView = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#createTempViewUsing.
SqlBaseListener.prototype.enterCreateTempViewUsing = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#createTempViewUsing.
SqlBaseListener.prototype.exitCreateTempViewUsing = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#alterViewQuery.
SqlBaseListener.prototype.enterAlterViewQuery = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#alterViewQuery.
SqlBaseListener.prototype.exitAlterViewQuery = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#createFunction.
SqlBaseListener.prototype.enterCreateFunction = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#createFunction.
SqlBaseListener.prototype.exitCreateFunction = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#dropFunction.
SqlBaseListener.prototype.enterDropFunction = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#dropFunction.
SqlBaseListener.prototype.exitDropFunction = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#explain.
SqlBaseListener.prototype.enterExplain = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#explain.
SqlBaseListener.prototype.exitExplain = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#showTables.
SqlBaseListener.prototype.enterShowTables = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#showTables.
SqlBaseListener.prototype.exitShowTables = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#showTable.
SqlBaseListener.prototype.enterShowTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#showTable.
SqlBaseListener.prototype.exitShowTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#showDatabases.
SqlBaseListener.prototype.enterShowDatabases = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#showDatabases.
SqlBaseListener.prototype.exitShowDatabases = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#showTblProperties.
SqlBaseListener.prototype.enterShowTblProperties = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#showTblProperties.
SqlBaseListener.prototype.exitShowTblProperties = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#showColumns.
SqlBaseListener.prototype.enterShowColumns = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#showColumns.
SqlBaseListener.prototype.exitShowColumns = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#showPartitions.
SqlBaseListener.prototype.enterShowPartitions = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#showPartitions.
SqlBaseListener.prototype.exitShowPartitions = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#showFunctions.
SqlBaseListener.prototype.enterShowFunctions = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#showFunctions.
SqlBaseListener.prototype.exitShowFunctions = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#showCreateTable.
SqlBaseListener.prototype.enterShowCreateTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#showCreateTable.
SqlBaseListener.prototype.exitShowCreateTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#describeFunction.
SqlBaseListener.prototype.enterDescribeFunction = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#describeFunction.
SqlBaseListener.prototype.exitDescribeFunction = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#describeDatabase.
SqlBaseListener.prototype.enterDescribeDatabase = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#describeDatabase.
SqlBaseListener.prototype.exitDescribeDatabase = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#describeTable.
SqlBaseListener.prototype.enterDescribeTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#describeTable.
SqlBaseListener.prototype.exitDescribeTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#refreshTable.
SqlBaseListener.prototype.enterRefreshTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#refreshTable.
SqlBaseListener.prototype.exitRefreshTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#refreshResource.
SqlBaseListener.prototype.enterRefreshResource = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#refreshResource.
SqlBaseListener.prototype.exitRefreshResource = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#cacheTable.
SqlBaseListener.prototype.enterCacheTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#cacheTable.
SqlBaseListener.prototype.exitCacheTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#uncacheTable.
SqlBaseListener.prototype.enterUncacheTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#uncacheTable.
SqlBaseListener.prototype.exitUncacheTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#clearCache.
SqlBaseListener.prototype.enterClearCache = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#clearCache.
SqlBaseListener.prototype.exitClearCache = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#loadData.
SqlBaseListener.prototype.enterLoadData = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#loadData.
SqlBaseListener.prototype.exitLoadData = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#truncateTable.
SqlBaseListener.prototype.enterTruncateTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#truncateTable.
SqlBaseListener.prototype.exitTruncateTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#repairTable.
SqlBaseListener.prototype.enterRepairTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#repairTable.
SqlBaseListener.prototype.exitRepairTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#manageResource.
SqlBaseListener.prototype.enterManageResource = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#manageResource.
SqlBaseListener.prototype.exitManageResource = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#failNativeCommand.
SqlBaseListener.prototype.enterFailNativeCommand = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#failNativeCommand.
SqlBaseListener.prototype.exitFailNativeCommand = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#setConfiguration.
SqlBaseListener.prototype.enterSetConfiguration = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#setConfiguration.
SqlBaseListener.prototype.exitSetConfiguration = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#resetConfiguration.
SqlBaseListener.prototype.enterResetConfiguration = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#resetConfiguration.
SqlBaseListener.prototype.exitResetConfiguration = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#unsupportedHiveNativeCommands.
SqlBaseListener.prototype.enterUnsupportedHiveNativeCommands = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#unsupportedHiveNativeCommands.
SqlBaseListener.prototype.exitUnsupportedHiveNativeCommands = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#createTableHeader.
SqlBaseListener.prototype.enterCreateTableHeader = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#createTableHeader.
SqlBaseListener.prototype.exitCreateTableHeader = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#bucketSpec.
SqlBaseListener.prototype.enterBucketSpec = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#bucketSpec.
SqlBaseListener.prototype.exitBucketSpec = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#skewSpec.
SqlBaseListener.prototype.enterSkewSpec = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#skewSpec.
SqlBaseListener.prototype.exitSkewSpec = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#locationSpec.
SqlBaseListener.prototype.enterLocationSpec = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#locationSpec.
SqlBaseListener.prototype.exitLocationSpec = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#query.
SqlBaseListener.prototype.enterQuery = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#query.
SqlBaseListener.prototype.exitQuery = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#insertOverwriteTable.
SqlBaseListener.prototype.enterInsertOverwriteTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#insertOverwriteTable.
SqlBaseListener.prototype.exitInsertOverwriteTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#insertIntoTable.
SqlBaseListener.prototype.enterInsertIntoTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#insertIntoTable.
SqlBaseListener.prototype.exitInsertIntoTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#insertOverwriteHiveDir.
SqlBaseListener.prototype.enterInsertOverwriteHiveDir = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#insertOverwriteHiveDir.
SqlBaseListener.prototype.exitInsertOverwriteHiveDir = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#insertOverwriteDir.
SqlBaseListener.prototype.enterInsertOverwriteDir = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#insertOverwriteDir.
SqlBaseListener.prototype.exitInsertOverwriteDir = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#partitionSpecLocation.
SqlBaseListener.prototype.enterPartitionSpecLocation = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#partitionSpecLocation.
SqlBaseListener.prototype.exitPartitionSpecLocation = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#partitionSpec.
SqlBaseListener.prototype.enterPartitionSpec = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#partitionSpec.
SqlBaseListener.prototype.exitPartitionSpec = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#partitionVal.
SqlBaseListener.prototype.enterPartitionVal = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#partitionVal.
SqlBaseListener.prototype.exitPartitionVal = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#describeFuncName.
SqlBaseListener.prototype.enterDescribeFuncName = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#describeFuncName.
SqlBaseListener.prototype.exitDescribeFuncName = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#describeColName.
SqlBaseListener.prototype.enterDescribeColName = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#describeColName.
SqlBaseListener.prototype.exitDescribeColName = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#ctes.
SqlBaseListener.prototype.enterCtes = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#ctes.
SqlBaseListener.prototype.exitCtes = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#namedQuery.
SqlBaseListener.prototype.enterNamedQuery = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#namedQuery.
SqlBaseListener.prototype.exitNamedQuery = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#tableProvider.
SqlBaseListener.prototype.enterTableProvider = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#tableProvider.
SqlBaseListener.prototype.exitTableProvider = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#tablePropertyList.
SqlBaseListener.prototype.enterTablePropertyList = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#tablePropertyList.
SqlBaseListener.prototype.exitTablePropertyList = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#tableProperty.
SqlBaseListener.prototype.enterTableProperty = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#tableProperty.
SqlBaseListener.prototype.exitTableProperty = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#tablePropertyKey.
SqlBaseListener.prototype.enterTablePropertyKey = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#tablePropertyKey.
SqlBaseListener.prototype.exitTablePropertyKey = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#tablePropertyValue.
SqlBaseListener.prototype.enterTablePropertyValue = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#tablePropertyValue.
SqlBaseListener.prototype.exitTablePropertyValue = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#constantList.
SqlBaseListener.prototype.enterConstantList = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#constantList.
SqlBaseListener.prototype.exitConstantList = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#nestedConstantList.
SqlBaseListener.prototype.enterNestedConstantList = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#nestedConstantList.
SqlBaseListener.prototype.exitNestedConstantList = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#createFileFormat.
SqlBaseListener.prototype.enterCreateFileFormat = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#createFileFormat.
SqlBaseListener.prototype.exitCreateFileFormat = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#tableFileFormat.
SqlBaseListener.prototype.enterTableFileFormat = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#tableFileFormat.
SqlBaseListener.prototype.exitTableFileFormat = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#genericFileFormat.
SqlBaseListener.prototype.enterGenericFileFormat = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#genericFileFormat.
SqlBaseListener.prototype.exitGenericFileFormat = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#storageHandler.
SqlBaseListener.prototype.enterStorageHandler = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#storageHandler.
SqlBaseListener.prototype.exitStorageHandler = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#resource.
SqlBaseListener.prototype.enterResource = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#resource.
SqlBaseListener.prototype.exitResource = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#singleInsertQuery.
SqlBaseListener.prototype.enterSingleInsertQuery = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#singleInsertQuery.
SqlBaseListener.prototype.exitSingleInsertQuery = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#multiInsertQuery.
SqlBaseListener.prototype.enterMultiInsertQuery = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#multiInsertQuery.
SqlBaseListener.prototype.exitMultiInsertQuery = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#queryOrganization.
SqlBaseListener.prototype.enterQueryOrganization = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#queryOrganization.
SqlBaseListener.prototype.exitQueryOrganization = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#multiInsertQueryBody.
SqlBaseListener.prototype.enterMultiInsertQueryBody = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#multiInsertQueryBody.
SqlBaseListener.prototype.exitMultiInsertQueryBody = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#queryTermDefault.
SqlBaseListener.prototype.enterQueryTermDefault = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#queryTermDefault.
SqlBaseListener.prototype.exitQueryTermDefault = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#setOperation.
SqlBaseListener.prototype.enterSetOperation = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#setOperation.
SqlBaseListener.prototype.exitSetOperation = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#queryPrimaryDefault.
SqlBaseListener.prototype.enterQueryPrimaryDefault = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#queryPrimaryDefault.
SqlBaseListener.prototype.exitQueryPrimaryDefault = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#table.
SqlBaseListener.prototype.enterTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#table.
SqlBaseListener.prototype.exitTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#inlineTableDefault1.
SqlBaseListener.prototype.enterInlineTableDefault1 = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#inlineTableDefault1.
SqlBaseListener.prototype.exitInlineTableDefault1 = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#subquery.
SqlBaseListener.prototype.enterSubquery = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#subquery.
SqlBaseListener.prototype.exitSubquery = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#sortItem.
SqlBaseListener.prototype.enterSortItem = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#sortItem.
SqlBaseListener.prototype.exitSortItem = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#querySpecification.
SqlBaseListener.prototype.enterQuerySpecification = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#querySpecification.
SqlBaseListener.prototype.exitQuerySpecification = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#hint.
SqlBaseListener.prototype.enterHint = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#hint.
SqlBaseListener.prototype.exitHint = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#hintStatement.
SqlBaseListener.prototype.enterHintStatement = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#hintStatement.
SqlBaseListener.prototype.exitHintStatement = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#fromClause.
SqlBaseListener.prototype.enterFromClause = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#fromClause.
SqlBaseListener.prototype.exitFromClause = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#aggregation.
SqlBaseListener.prototype.enterAggregation = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#aggregation.
SqlBaseListener.prototype.exitAggregation = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#groupingSet.
SqlBaseListener.prototype.enterGroupingSet = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#groupingSet.
SqlBaseListener.prototype.exitGroupingSet = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#lateralView.
SqlBaseListener.prototype.enterLateralView = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#lateralView.
SqlBaseListener.prototype.exitLateralView = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#setQuantifier.
SqlBaseListener.prototype.enterSetQuantifier = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#setQuantifier.
SqlBaseListener.prototype.exitSetQuantifier = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#relation.
SqlBaseListener.prototype.enterRelation = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#relation.
SqlBaseListener.prototype.exitRelation = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#joinRelation.
SqlBaseListener.prototype.enterJoinRelation = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#joinRelation.
SqlBaseListener.prototype.exitJoinRelation = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#joinType.
SqlBaseListener.prototype.enterJoinType = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#joinType.
SqlBaseListener.prototype.exitJoinType = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#joinCriteria.
SqlBaseListener.prototype.enterJoinCriteria = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#joinCriteria.
SqlBaseListener.prototype.exitJoinCriteria = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#sample.
SqlBaseListener.prototype.enterSample = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#sample.
SqlBaseListener.prototype.exitSample = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#sampleByPercentile.
SqlBaseListener.prototype.enterSampleByPercentile = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#sampleByPercentile.
SqlBaseListener.prototype.exitSampleByPercentile = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#sampleByRows.
SqlBaseListener.prototype.enterSampleByRows = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#sampleByRows.
SqlBaseListener.prototype.exitSampleByRows = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#sampleByBucket.
SqlBaseListener.prototype.enterSampleByBucket = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#sampleByBucket.
SqlBaseListener.prototype.exitSampleByBucket = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#sampleByBytes.
SqlBaseListener.prototype.enterSampleByBytes = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#sampleByBytes.
SqlBaseListener.prototype.exitSampleByBytes = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#identifierList.
SqlBaseListener.prototype.enterIdentifierList = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#identifierList.
SqlBaseListener.prototype.exitIdentifierList = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#identifierSeq.
SqlBaseListener.prototype.enterIdentifierSeq = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#identifierSeq.
SqlBaseListener.prototype.exitIdentifierSeq = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#orderedIdentifierList.
SqlBaseListener.prototype.enterOrderedIdentifierList = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#orderedIdentifierList.
SqlBaseListener.prototype.exitOrderedIdentifierList = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#orderedIdentifier.
SqlBaseListener.prototype.enterOrderedIdentifier = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#orderedIdentifier.
SqlBaseListener.prototype.exitOrderedIdentifier = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#identifierCommentList.
SqlBaseListener.prototype.enterIdentifierCommentList = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#identifierCommentList.
SqlBaseListener.prototype.exitIdentifierCommentList = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#identifierComment.
SqlBaseListener.prototype.enterIdentifierComment = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#identifierComment.
SqlBaseListener.prototype.exitIdentifierComment = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#tableName.
SqlBaseListener.prototype.enterTableName = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#tableName.
SqlBaseListener.prototype.exitTableName = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#aliasedQuery.
SqlBaseListener.prototype.enterAliasedQuery = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#aliasedQuery.
SqlBaseListener.prototype.exitAliasedQuery = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#aliasedRelation.
SqlBaseListener.prototype.enterAliasedRelation = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#aliasedRelation.
SqlBaseListener.prototype.exitAliasedRelation = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#inlineTableDefault2.
SqlBaseListener.prototype.enterInlineTableDefault2 = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#inlineTableDefault2.
SqlBaseListener.prototype.exitInlineTableDefault2 = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#tableValuedFunction.
SqlBaseListener.prototype.enterTableValuedFunction = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#tableValuedFunction.
SqlBaseListener.prototype.exitTableValuedFunction = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#inlineTable.
SqlBaseListener.prototype.enterInlineTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#inlineTable.
SqlBaseListener.prototype.exitInlineTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#functionTable.
SqlBaseListener.prototype.enterFunctionTable = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#functionTable.
SqlBaseListener.prototype.exitFunctionTable = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#tableAlias.
SqlBaseListener.prototype.enterTableAlias = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#tableAlias.
SqlBaseListener.prototype.exitTableAlias = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#rowFormatSerde.
SqlBaseListener.prototype.enterRowFormatSerde = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#rowFormatSerde.
SqlBaseListener.prototype.exitRowFormatSerde = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#rowFormatDelimited.
SqlBaseListener.prototype.enterRowFormatDelimited = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#rowFormatDelimited.
SqlBaseListener.prototype.exitRowFormatDelimited = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#tableIdentifier.
SqlBaseListener.prototype.enterTableIdentifier = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#tableIdentifier.
SqlBaseListener.prototype.exitTableIdentifier = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#functionIdentifier.
SqlBaseListener.prototype.enterFunctionIdentifier = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#functionIdentifier.
SqlBaseListener.prototype.exitFunctionIdentifier = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#namedExpression.
SqlBaseListener.prototype.enterNamedExpression = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#namedExpression.
SqlBaseListener.prototype.exitNamedExpression = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#namedExpressionSeq.
SqlBaseListener.prototype.enterNamedExpressionSeq = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#namedExpressionSeq.
SqlBaseListener.prototype.exitNamedExpressionSeq = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#expression.
SqlBaseListener.prototype.enterExpression = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#expression.
SqlBaseListener.prototype.exitExpression = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#logicalNot.
SqlBaseListener.prototype.enterLogicalNot = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#logicalNot.
SqlBaseListener.prototype.exitLogicalNot = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#booleanDefault.
SqlBaseListener.prototype.enterBooleanDefault = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#booleanDefault.
SqlBaseListener.prototype.exitBooleanDefault = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#exists.
SqlBaseListener.prototype.enterExists = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#exists.
SqlBaseListener.prototype.exitExists = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#logicalBinary.
SqlBaseListener.prototype.enterLogicalBinary = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#logicalBinary.
SqlBaseListener.prototype.exitLogicalBinary = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#predicated.
SqlBaseListener.prototype.enterPredicated = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#predicated.
SqlBaseListener.prototype.exitPredicated = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#predicate.
SqlBaseListener.prototype.enterPredicate = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#predicate.
SqlBaseListener.prototype.exitPredicate = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#valueExpressionDefault.
SqlBaseListener.prototype.enterValueExpressionDefault = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#valueExpressionDefault.
SqlBaseListener.prototype.exitValueExpressionDefault = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#comparison.
SqlBaseListener.prototype.enterComparison = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#comparison.
SqlBaseListener.prototype.exitComparison = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#arithmeticBinary.
SqlBaseListener.prototype.enterArithmeticBinary = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#arithmeticBinary.
SqlBaseListener.prototype.exitArithmeticBinary = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#arithmeticUnary.
SqlBaseListener.prototype.enterArithmeticUnary = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#arithmeticUnary.
SqlBaseListener.prototype.exitArithmeticUnary = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#struct.
SqlBaseListener.prototype.enterStruct = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#struct.
SqlBaseListener.prototype.exitStruct = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#dereference.
SqlBaseListener.prototype.enterDereference = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#dereference.
SqlBaseListener.prototype.exitDereference = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#simpleCase.
SqlBaseListener.prototype.enterSimpleCase = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#simpleCase.
SqlBaseListener.prototype.exitSimpleCase = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#columnReference.
SqlBaseListener.prototype.enterColumnReference = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#columnReference.
SqlBaseListener.prototype.exitColumnReference = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#rowConstructor.
SqlBaseListener.prototype.enterRowConstructor = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#rowConstructor.
SqlBaseListener.prototype.exitRowConstructor = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#last.
SqlBaseListener.prototype.enterLast = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#last.
SqlBaseListener.prototype.exitLast = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#star.
SqlBaseListener.prototype.enterStar = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#star.
SqlBaseListener.prototype.exitStar = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#subscript.
SqlBaseListener.prototype.enterSubscript = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#subscript.
SqlBaseListener.prototype.exitSubscript = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#subqueryExpression.
SqlBaseListener.prototype.enterSubqueryExpression = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#subqueryExpression.
SqlBaseListener.prototype.exitSubqueryExpression = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#cast.
SqlBaseListener.prototype.enterCast = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#cast.
SqlBaseListener.prototype.exitCast = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#constantDefault.
SqlBaseListener.prototype.enterConstantDefault = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#constantDefault.
SqlBaseListener.prototype.exitConstantDefault = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#parenthesizedExpression.
SqlBaseListener.prototype.enterParenthesizedExpression = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#parenthesizedExpression.
SqlBaseListener.prototype.exitParenthesizedExpression = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#functionCall.
SqlBaseListener.prototype.enterFunctionCall = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#functionCall.
SqlBaseListener.prototype.exitFunctionCall = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#searchedCase.
SqlBaseListener.prototype.enterSearchedCase = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#searchedCase.
SqlBaseListener.prototype.exitSearchedCase = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#position.
SqlBaseListener.prototype.enterPosition = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#position.
SqlBaseListener.prototype.exitPosition = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#first.
SqlBaseListener.prototype.enterFirst = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#first.
SqlBaseListener.prototype.exitFirst = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#nullLiteral.
SqlBaseListener.prototype.enterNullLiteral = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#nullLiteral.
SqlBaseListener.prototype.exitNullLiteral = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#intervalLiteral.
SqlBaseListener.prototype.enterIntervalLiteral = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#intervalLiteral.
SqlBaseListener.prototype.exitIntervalLiteral = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#typeConstructor.
SqlBaseListener.prototype.enterTypeConstructor = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#typeConstructor.
SqlBaseListener.prototype.exitTypeConstructor = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#numericLiteral.
SqlBaseListener.prototype.enterNumericLiteral = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#numericLiteral.
SqlBaseListener.prototype.exitNumericLiteral = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#booleanLiteral.
SqlBaseListener.prototype.enterBooleanLiteral = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#booleanLiteral.
SqlBaseListener.prototype.exitBooleanLiteral = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#stringLiteral.
SqlBaseListener.prototype.enterStringLiteral = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#stringLiteral.
SqlBaseListener.prototype.exitStringLiteral = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#comparisonOperator.
SqlBaseListener.prototype.enterComparisonOperator = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#comparisonOperator.
SqlBaseListener.prototype.exitComparisonOperator = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#arithmeticOperator.
SqlBaseListener.prototype.enterArithmeticOperator = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#arithmeticOperator.
SqlBaseListener.prototype.exitArithmeticOperator = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#predicateOperator.
SqlBaseListener.prototype.enterPredicateOperator = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#predicateOperator.
SqlBaseListener.prototype.exitPredicateOperator = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#booleanValue.
SqlBaseListener.prototype.enterBooleanValue = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#booleanValue.
SqlBaseListener.prototype.exitBooleanValue = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#interval.
SqlBaseListener.prototype.enterInterval = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#interval.
SqlBaseListener.prototype.exitInterval = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#intervalField.
SqlBaseListener.prototype.enterIntervalField = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#intervalField.
SqlBaseListener.prototype.exitIntervalField = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#intervalValue.
SqlBaseListener.prototype.enterIntervalValue = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#intervalValue.
SqlBaseListener.prototype.exitIntervalValue = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#colPosition.
SqlBaseListener.prototype.enterColPosition = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#colPosition.
SqlBaseListener.prototype.exitColPosition = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#complexDataType.
SqlBaseListener.prototype.enterComplexDataType = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#complexDataType.
SqlBaseListener.prototype.exitComplexDataType = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#primitiveDataType.
SqlBaseListener.prototype.enterPrimitiveDataType = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#primitiveDataType.
SqlBaseListener.prototype.exitPrimitiveDataType = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#colTypeList.
SqlBaseListener.prototype.enterColTypeList = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#colTypeList.
SqlBaseListener.prototype.exitColTypeList = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#colType.
SqlBaseListener.prototype.enterColType = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#colType.
SqlBaseListener.prototype.exitColType = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#complexColTypeList.
SqlBaseListener.prototype.enterComplexColTypeList = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#complexColTypeList.
SqlBaseListener.prototype.exitComplexColTypeList = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#complexColType.
SqlBaseListener.prototype.enterComplexColType = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#complexColType.
SqlBaseListener.prototype.exitComplexColType = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#whenClause.
SqlBaseListener.prototype.enterWhenClause = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#whenClause.
SqlBaseListener.prototype.exitWhenClause = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#windows.
SqlBaseListener.prototype.enterWindows = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#windows.
SqlBaseListener.prototype.exitWindows = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#namedWindow.
SqlBaseListener.prototype.enterNamedWindow = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#namedWindow.
SqlBaseListener.prototype.exitNamedWindow = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#windowRef.
SqlBaseListener.prototype.enterWindowRef = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#windowRef.
SqlBaseListener.prototype.exitWindowRef = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#windowDef.
SqlBaseListener.prototype.enterWindowDef = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#windowDef.
SqlBaseListener.prototype.exitWindowDef = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#windowFrame.
SqlBaseListener.prototype.enterWindowFrame = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#windowFrame.
SqlBaseListener.prototype.exitWindowFrame = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#frameBound.
SqlBaseListener.prototype.enterFrameBound = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#frameBound.
SqlBaseListener.prototype.exitFrameBound = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#qualifiedName.
SqlBaseListener.prototype.enterQualifiedName = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#qualifiedName.
SqlBaseListener.prototype.exitQualifiedName = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#identifier.
SqlBaseListener.prototype.enterIdentifier = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#identifier.
SqlBaseListener.prototype.exitIdentifier = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#unquotedIdentifier.
SqlBaseListener.prototype.enterUnquotedIdentifier = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#unquotedIdentifier.
SqlBaseListener.prototype.exitUnquotedIdentifier = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#quotedIdentifierAlternative.
SqlBaseListener.prototype.enterQuotedIdentifierAlternative = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#quotedIdentifierAlternative.
SqlBaseListener.prototype.exitQuotedIdentifierAlternative = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#quotedIdentifier.
SqlBaseListener.prototype.enterQuotedIdentifier = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#quotedIdentifier.
SqlBaseListener.prototype.exitQuotedIdentifier = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#decimalLiteral.
SqlBaseListener.prototype.enterDecimalLiteral = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#decimalLiteral.
SqlBaseListener.prototype.exitDecimalLiteral = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#integerLiteral.
SqlBaseListener.prototype.enterIntegerLiteral = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#integerLiteral.
SqlBaseListener.prototype.exitIntegerLiteral = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#bigIntLiteral.
SqlBaseListener.prototype.enterBigIntLiteral = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#bigIntLiteral.
SqlBaseListener.prototype.exitBigIntLiteral = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#smallIntLiteral.
SqlBaseListener.prototype.enterSmallIntLiteral = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#smallIntLiteral.
SqlBaseListener.prototype.exitSmallIntLiteral = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#tinyIntLiteral.
SqlBaseListener.prototype.enterTinyIntLiteral = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#tinyIntLiteral.
SqlBaseListener.prototype.exitTinyIntLiteral = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#doubleLiteral.
SqlBaseListener.prototype.enterDoubleLiteral = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#doubleLiteral.
SqlBaseListener.prototype.exitDoubleLiteral = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#bigDecimalLiteral.
SqlBaseListener.prototype.enterBigDecimalLiteral = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#bigDecimalLiteral.
SqlBaseListener.prototype.exitBigDecimalLiteral = function(ctx) {
};


// Enter a parse tree produced by SqlBaseParser#nonReserved.
SqlBaseListener.prototype.enterNonReserved = function(ctx) {
};

// Exit a parse tree produced by SqlBaseParser#nonReserved.
SqlBaseListener.prototype.exitNonReserved = function(ctx) {
};



exports.SqlBaseListener = SqlBaseListener;
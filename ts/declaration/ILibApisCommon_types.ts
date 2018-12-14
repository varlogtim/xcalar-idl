declare class XcalarEvalArgDescT {
	argDesc: string;
	typesAccepted: number;
	isSingletonValue: boolean;
	argType: number;
	minArgs: number;
	maxArgs: number;
	constructor(args?: {
		argDesc?: string,
		typesAccepted?: number,
		isSingletonValue?: boolean,
		argType?: number,
		minArgs?: number,
		maxArgs?: number,
	});
}
declare class XcalarEvalFnDescT {
	fnName: string;
	fnDesc: string;
	category: number;
	numArgs: number;
	argDescs: XcalarEvalArgDescT[];
	outputType: number;
	constructor(args?: {
		fnName?: string,
		fnDesc?: string,
		category?: number,
		numArgs?: number,
		argDescs?: XcalarEvalArgDescT[],
		outputType?: number,
	});
}
declare class DfFieldAttrHeaderT {
	name: string;
	type: number;
	valueArrayIndex: number;
	ordering: string;
	constructor(args?: {
		name?: string,
		type?: number,
		valueArrayIndex?: number,
		ordering?: string,
	});
}
declare class XcalarApiTimeT {
	milliseconds: number;
	constructor(args?: {
		milliseconds?: number,
	});
}
declare class XcalarApiColumnT {
	sourceColumn: string;
	destColumn: string;
	columnType: string;
	constructor(args?: {
		sourceColumn?: string,
		destColumn?: string,
		columnType?: string,
	});
}
declare class XcalarApiFileAttrT {
	isDirectory: boolean;
	size: number;
	mtime: number;
	constructor(args?: {
		isDirectory?: boolean,
		size?: number,
		mtime?: number,
	});
}
declare class XcalarApiFileT {
	attr: XcalarApiFileAttrT;
	name: string;
	constructor(args?: {
		attr?: XcalarApiFileAttrT,
		name?: string,
	});
}
declare class XcalarApiListFilesOutputT {
	numFiles: number;
	files: XcalarApiFileT[];
	constructor(args?: {
		numFiles?: number,
		files?: XcalarApiFileT[],
	});
}
declare class XcalarApiListXdfsInputT {
	fnNamePattern: string;
	categoryPattern: string;
	constructor(args?: {
		fnNamePattern?: string,
		categoryPattern?: string,
	});
}
declare class XcalarApiUdfErrorT {
	message: string;
	traceback: string;
	constructor(args?: {
		message?: string,
		traceback?: string,
	});
}
declare class XcalarApiUdfAddUpdateOutputT {
	status: number;
	moduleName: string;
	error: XcalarApiUdfErrorT;
	constructor(args?: {
		status?: number,
		moduleName?: string,
		error?: XcalarApiUdfErrorT,
	});
}
declare class XcalarApiUdfGetInputT {
	moduleName: string;
	constructor(args?: {
		moduleName?: string,
	});
}
declare class XcalarApiUdfDeleteInputT {
	moduleName: string;
	constructor(args?: {
		moduleName?: string,
	});
}
declare class XcalarApiListXdfsOutputT {
	numXdfs: number;
	fnDescs: XcalarEvalFnDescT[];
	constructor(args?: {
		numXdfs?: number,
		fnDescs?: XcalarEvalFnDescT[],
	});
}
declare class XcalarApiKeyValuePairT {
	key: string;
	value: string;
	constructor(args?: {
		key?: string,
		value?: string,
	});
}
declare class XcalarApiKeyAddOrReplaceInputT {
	scope: number;
	persist: boolean;
	kvPair: XcalarApiKeyValuePairT;
	constructor(args?: {
		scope?: number,
		persist?: boolean,
		kvPair?: XcalarApiKeyValuePairT,
	});
}
declare class XcalarApiKeyAppendInputT {
	scope: number;
	key: string;
	suffix: string;
	constructor(args?: {
		scope?: number,
		key?: string,
		suffix?: string,
	});
}
declare class XcalarApiKeySetIfEqualInputT {
	scope: number;
	persist: boolean;
	countSecondaryPairs: number;
	keyCompare: string;
	valueCompare: string;
	valueReplace: string;
	keySecondary: string;
	valueSecondary: string;
	constructor(args?: {
		scope?: number,
		persist?: boolean,
		countSecondaryPairs?: number,
		keyCompare?: string,
		valueCompare?: string,
		valueReplace?: string,
		keySecondary?: string,
		valueSecondary?: string,
	});
}
declare class XcalarApiKeyLookupInputT {
	scope: number;
	key: string;
	constructor(args?: {
		scope?: number,
		key?: string,
	});
}
declare class XcalarApiKeyLookupOutputT {
	value: string;
	constructor(args?: {
		value?: string,
	});
}
declare class XcalarApiKeyListInputT {
	scope: number;
	keyRegex: string;
	constructor(args?: {
		scope?: number,
		keyRegex?: string,
	});
}
declare class XcalarApiKeyListOutputT {
	numKeys: number;
	keys: string[];
	constructor(args?: {
		numKeys?: number,
		keys?: string[],
	});
}
declare class XcalarApiKeyDeleteInputT {
	scope: number;
	key: string;
	constructor(args?: {
		scope?: number,
		key?: string,
	});
}
declare class XcalarApiTableInputT {
	tableName: string;
	tableId: string;
	constructor(args?: {
		tableName?: string,
		tableId?: string,
	});
}
declare class DataSourceArgsT {
	targetName: string;
	path: string;
	fileNamePattern: string;
	recursive: boolean;
	constructor(args?: {
		targetName?: string,
		path?: string,
		fileNamePattern?: string,
		recursive?: boolean,
	});
}
declare class ParseArgsT {
	parserFnName: string;
	parserArgJson: string;
	fileNameFieldName: string;
	recordNumFieldName: string;
	allowRecordErrors: boolean;
	allowFileErrors: boolean;
	schema: XcalarApiColumnT[];
	constructor(args?: {
		parserFnName?: string,
		parserArgJson?: string,
		fileNameFieldName?: string,
		recordNumFieldName?: string,
		allowRecordErrors?: boolean,
		allowFileErrors?: boolean,
		schema?: XcalarApiColumnT[],
	});
}
declare class XcalarApiDfLoadArgsT {
	sourceArgsList: DataSourceArgsT[];
	parseArgs: ParseArgsT;
	size: number;
	constructor(args?: {
		sourceArgsList?: DataSourceArgsT[],
		parseArgs?: ParseArgsT,
		size?: number,
	});
}
declare class XcalarApiDatasetT {
	loadArgs: XcalarApiDfLoadArgsT;
	datasetId: string;
	name: string;
	loadIsComplete: boolean;
	isListable: boolean;
	udfName: string;
	constructor(args?: {
		loadArgs?: XcalarApiDfLoadArgsT,
		datasetId?: string,
		name?: string,
		loadIsComplete?: boolean,
		isListable?: boolean,
		udfName?: string,
	});
}
declare class XcalarApiDatasetsInfoT {
	datasetName: string;
	downSampled: boolean;
	totalNumErrors: number;
	datasetSize: number;
	numColumns: number;
	columns: XcalarApiColumnInfoT[];
	constructor(args?: {
		datasetName?: string,
		downSampled?: boolean,
		totalNumErrors?: number,
		datasetSize?: number,
		numColumns?: number,
		columnNames?: XcalarApiColumnInfoT[],
	});
}
declare class XcalarApiUdfLoadArgsT {
	fullyQualifiedFnName: string;
	constructor(args?: {
		fullyQualifiedFnName?: string,
	});
}
declare class XcalarApiListFilesInputT {
	sourceArgs: DataSourceArgsT;
	constructor(args?: {
		sourceArgs?: DataSourceArgsT,
	});
}
declare class XcalarApiListExportTargetsInputT {
	targetTypePattern: string;
	targetNamePattern: string;
	constructor(args?: {
		targetTypePattern?: string,
		targetNamePattern?: string,
	});
}
declare class XcalarApiListExportTargetsOutputT {
	numTargets: number;
	targets: ExExportTargetT[];
	constructor(args?: {
		numTargets?: number,
		targets?: ExExportTargetT[],
	});
}
declare class XcalarApiExportColumnT {
	columnName: string;
	headerName: string;
	constructor(args?: {
		columnName?: string,
		headerName?: string,
	});
}
declare class XcalarApiExportInputT {
	source: string;
	driverName: string;
	driverParams: {};
	columns: XcalarApiExportColumnT[];
	dest: string;
	constructor(args?: {
		source?: string,
		driverName?: string,
		driverParams?: {},
		columns?: XcalarApiExportColumnT[],
		dest?: string,
	});
}
declare class XcalarApiAppSetInputT {
	name: string;
	hostType: string;
	duty: string;
	execStr: string;
	constructor(args?: {
		name?: string,
		hostType?: string,
		duty?: string,
		execStr?: string,
	});
}
declare class XcalarApiAppRunInputT {
	name: string;
	isGlobal: boolean;
	inStr: string;
	constructor(args?: {
		name?: string,
		isGlobal?: boolean,
		inStr?: string,
	});
}
declare class XcalarApiAppRunOutputT {
	appGroupId: string;
	constructor(args?: {
		appGroupId?: string,
	});
}
declare class XcalarApiAppReapInputT {
	appGroupId: string;
	cancel: boolean;
	constructor(args?: {
		appGroupId?: string,
		cancel?: boolean,
	});
}
declare class XcalarApiAppReapOutputT {
	outStr: string;
	errStr: string;
	constructor(args?: {
		outStr?: string,
		errStr?: string,
	});
}
declare class XcalarApiEvalT {
	evalString: string;
	newField: string;
	constructor(args?: {
		evalString?: string,
		newField?: string,
	});
}
declare class XcalarApiKeyT {
	name: string;
	type: string;
	keyFieldName: string;
	ordering: string;
	constructor(args?: {
		name?: string,
		type?: string,
		keyFieldName?: string,
		ordering?: string,
	});
}
declare class XcalarApiTargetInputT {
	inputJson: string;
	constructor(args?: {
		inputJson?: string,
	});
}
declare class XcalarApiTargetOutputT {
	outputJson: string;
	constructor(args?: {
		outputJson?: string,
	});
}
declare class XcalarApiPreviewInputT {
	inputJson: string;
	constructor(args?: {
		inputJson?: string,
	});
}
declare class XcalarApiPreviewOutputT {
	outputJson: string;
	constructor(args?: {
		outputJson?: string,
	});
}
declare class XcalarApiDemoFileInputT {
	inputJson: string;
	constructor(args?: {
		inputJson?: string,
	});
}
declare class XcalarApiDemoFileOutputT {
	outputJson: string;
	constructor(args?: {
		outputJson?: string,
	});
}
declare class XcalarApiBulkLoadInputT {
	dest: string;
	loadArgs: XcalarApiDfLoadArgsT;
	dagNodeId: string;
	constructor(args?: {
		dest?: string,
		loadArgs?: XcalarApiDfLoadArgsT,
		dagNodeId?: string,
	});
}
declare class XcalarApiIndexInputT {
	source: string;
	dest: string;
	key: XcalarApiKeyT[];
	prefix: string;
	dhtName: string;
	delaySort: boolean;
	broadcast: boolean;
	constructor(args?: {
		source?: string,
		dest?: string,
		key?: XcalarApiKeyT[],
		prefix?: string,
		dhtName?: string,
		delaySort?: boolean,
		broadcast?: boolean,
	});
}
declare class XcalarApiStatInputT {
	nodeId: number;
	constructor(args?: {
		nodeId?: number,
	});
}
declare class XcalarApiDagNameT {
	name: string;
	constructor(args?: {
		name?: string,
	});
}
declare class XcalarApiRetinaDstT {
	numColumns: number;
	target: XcalarApiNamedInputT;
	columns: ExColumnNameT[];
	constructor(args?: {
		numColumns?: number,
		target?: XcalarApiNamedInputT,
		columns?: ExColumnNameT[],
	});
}
declare class XcalarApiRetinaSrcTableT {
	source: string;
	dstName: string;
	constructor(args?: {
		source?: string,
		dstName?: string,
	});
}
declare class XcalarApiMakeRetinaInputT {
	retinaName: string;
	numTables: number;
	tableArray: XcalarApiRetinaDstT[];
	numSrcTables: number;
	srcTables: XcalarApiRetinaSrcTableT[];
	constructor(args?: {
		retinaName?: string,
		numTables?: number,
		tableArray?: XcalarApiRetinaDstT[],
		numSrcTables?: number,
		srcTables?: XcalarApiRetinaSrcTableT[],
	});
}
declare class XcalarApiGetRetinaInputT {
	retInput: string;
	constructor(args?: {
		retInput?: string,
	});
}
declare class XcalarApiGetRetinaJsonInputT {
	retinaName: string;
	constructor(args?: {
		retinaName?: string,
	});
}
declare class XcalarApiProjectInputT {
	source: string;
	dest: string;
	columns: string[];
	constructor(args?: {
		source?: string,
		dest?: string,
		columns?: string[],
	});
}
declare class XcalarApiFilterInputT {
	source: string;
	dest: string;
	eval: XcalarApiEvalT[];
	constructor(args?: {
		source?: string,
		dest?: string,
		eval?: XcalarApiEvalT[],
	});
}
declare class XcalarApiGroupByInputT {
	source: string;
	dest: string;
	eval: XcalarApiEvalT[];
	newKeyField: string;
	includeSample: boolean;
	icv: boolean;
	groupAll: boolean;
	constructor(args?: {
		source?: string,
		dest?: string,
		eval?: XcalarApiEvalT[],
		newKeyField?: string,
		includeSample?: boolean,
		icv?: boolean,
		groupAll?: boolean,
	});
}
declare class XcalarApiAggregateInputT {
	source: string;
	dest: string;
	eval: XcalarApiEvalT[];
	constructor(args?: {
		source?: string,
		dest?: string,
		eval?: XcalarApiEvalT[],
	});
}
declare class XcalarApiRenameNodeInputT {
	oldName: string;
	newName: string;
	constructor(args?: {
		oldName?: string,
		newName?: string,
	});
}
declare class XcalarApiMakeResultSetInputT {
	errorDs: boolean;
	dagNode: XcalarApiNamedInputT;
	constructor(args?: {
		errorDs?: boolean,
		dagNode?: XcalarApiNamedInputT,
	});
}
declare class XcalarApiResultSetNextInputT {
	resultSetId: string;
	numRecords: number;
	constructor(args?: {
		resultSetId?: string,
		numRecords?: number,
	});
}
declare class XcalarApiFreeResultSetInputT {
	resultSetId: string;
	constructor(args?: {
		resultSetId?: string,
	});
}
declare class XcalarApiStatT {
	statName: string;
	statValue: number;
	statType: number;
	groupId: number;
	constructor(args?: {
		statName?: string,
		statValue?: number,
		statType?: number,
		groupId?: number,
	});
}
declare class XcalarApiJoinInputT {
	source: string[];
	dest: string;
	joinType: string;
	columns: XcalarApiColumnT[][];
	evalString: string;
	constructor(args?: {
		source?: string[],
		dest?: string,
		joinType?: string,
		columns?: XcalarApiColumnT[][],
		evalString?: string,
	});
}
declare class XcalarApiUnionInputT {
	source: string[];
	dest: string;
	dedup: boolean;
	columns: XcalarApiColumnT[][];
	unionType: string;
	constructor(args?: {
		source?: string[],
		dest?: string,
		dedup?: boolean,
		columns?: XcalarApiColumnT[][],
		unionType?: string,
	});
}
declare class XcalarApiResultSetAbsoluteInputT {
	resultSetId: string;
	position: number;
	constructor(args?: {
		resultSetId?: string,
		position?: number,
	});
}
declare class XcalarApiParameterT {
	paramName: string;
	paramValue: string;
	constructor(args?: {
		paramName?: string,
		paramValue?: string,
	});
}
declare class XcalarApiParamLoadT {
	datasetUrl: string;
	namePattern: string;
	constructor(args?: {
		datasetUrl?: string,
		namePattern?: string,
	});
}
declare class XcalarApiParamSynthesizeT {
	source: string;
	constructor(args?: {
		source?: string,
	});
}
declare class XcalarApiParamFilterT {
	filterStr: string;
	constructor(args?: {
		filterStr?: string,
	});
}
declare class XcalarApiParamExportT {
	fileName: string;
	targetName: string;
	targetType: number;
	constructor(args?: {
		fileName?: string,
		targetName?: string,
		targetType?: number,
	});
}
declare class XcalarApiParamInputArgsT {
	paramLoad: XcalarApiParamLoadT;
	paramFilter: XcalarApiParamFilterT;
	paramExport: XcalarApiParamExportT;
	paramSynthesize: XcalarApiParamSynthesizeT;
	constructor(args?: {
		paramLoad?: XcalarApiParamLoadT,
		paramFilter?: XcalarApiParamFilterT,
		paramExport?: XcalarApiParamExportT,
		paramSynthesize?: XcalarApiParamSynthesizeT,
	});
}
declare class XcalarApiParamInputT {
	paramType: number;
	paramInputArgs: XcalarApiParamInputArgsT;
	constructor(args?: {
		paramType?: number,
		paramInputArgs?: XcalarApiParamInputArgsT,
	});
}
declare class XcalarApiUpdateRetinaInputT {
	retinaName: string;
	retinaJson: string;
	constructor(args?: {
		retinaName?: string,
		retinaJson?: string,
	});
}
declare class XcalarApiAddParameterToRetinaInputT {
	retinaName: string;
	parameter: XcalarApiParameterT;
	constructor(args?: {
		retinaName?: string,
		parameter?: XcalarApiParameterT,
	});
}
declare class XcalarApiListParametersInRetinaOutputT {
	numParameters: number;
	parameters: XcalarApiParameterT[];
	constructor(args?: {
		numParameters?: number,
		parameters?: XcalarApiParameterT[],
	});
}
declare class XcalarApiExecuteRetinaInputT {
	retinaName: string;
	queryName: string;
	dest: string;
	parameters: XcalarApiParameterT[];
	schedName: string;
	constructor(args?: {
		retinaName?: string,
		queryName?: string,
		dest?: string,
		parameters?: XcalarApiParameterT[],
		schedName?: string,
	});
}
declare class XcalarApiGetStatOutputT {
	numStats: number;
	truncated: boolean;
	stats: XcalarApiStatT[];
	constructor(args?: {
		numStats?: number,
		truncated?: boolean,
		stats?: XcalarApiStatT[],
	});
}
declare class XcalarApiStatByGroupIdInputT {
	numNodeId: number;
	nodeId: number[];
	numGroupId: number;
	groupId: number[];
	constructor(args?: {
		numNodeId?: number,
		nodeId?: number[],
		numGroupId?: number,
		groupId?: number[],
	});
}
declare class XcalarApiMapInputT {
	source: string;
	dest: string;
	eval: XcalarApiEvalT[];
	icv: boolean;
	constructor(args?: {
		source?: string,
		dest?: string,
		eval?: XcalarApiEvalT[],
		icv?: boolean,
	});
}
declare class XcalarApiGetRowNumInputT {
	source: string;
	dest: string;
	newField: string;
	constructor(args?: {
		source?: string,
		dest?: string,
		newField?: string,
	});
}
declare class XcalarApiQueryNameInputT {
	queryName: string;
	constructor(args?: {
		queryName?: string,
	});
}
declare class XcalarApiStartNodesInputT {
	numNodes: number;
	constructor(args?: {
		numNodes?: number,
	});
}
declare class XcalarStatGroupInfoT {
	groupIdNum: number;
	totalSingleStats: number;
	statsGroupName: string;
	constructor(args?: {
		groupIdNum?: number,
		totalSingleStats?: number,
		statsGroupName?: string,
	});
}
declare class XcalarApiGetStatGroupIdMapOutputT {
	numGroupNames: number;
	truncated: boolean;
	groupNameInfoArray: XcalarStatGroupInfoT[];
	constructor(args?: {
		numGroupNames?: number,
		truncated?: boolean,
		groupNameInfoArray?: XcalarStatGroupInfoT[],
	});
}
declare class XcalarApiTableMetaT {
	numRows: number;
	numPages: number;
	numSlots: number;
	size: number;
	numRowsPerSlot: number[];
	numPagesPerSlot: number[];
	xdbPageConsumedInBytes: number;
	xdbPageAllocatedInBytes: number;
	numTransPageSent: number;
	numTransPageRecv: number;
	constructor(args?: {
		numRows?: number,
		numPages?: number,
		numSlots?: number,
		size?: number,
		numRowsPerSlot?: number[],
		numPagesPerSlot?: number[],
		xdbPageConsumedInBytes?: number,
		xdbPageAllocatedInBytes?: number,
		numTransPageSent?: number,
		numTransPageRecv?: number,
	});
}
declare class XcalarApiGetTableMetaOutputT {
	numDatasets: number;
	datasets: string[];
	numResultSets: number;
	resultSetIds: string[];
	numKeys: number;
	keyAttr: DfFieldAttrHeaderT[];
	numValues: number;
	numImmediates: number;
	valueAttrs: DfFieldAttrHeaderT[];
	ordering: number;
	numMetas: number;
	metas: XcalarApiTableMetaT[];
	constructor(args?: {
		numDatasets?: number,
		datasets?: string[],
		numResultSets?: number,
		resultSetIds?: string[],
		numKeys?: number,
		keyAttr?: DfFieldAttrHeaderT[],
		numValues?: number,
		numImmediates?: number,
		valueAttrs?: DfFieldAttrHeaderT[],
		ordering?: number,
		numMetas?: number,
		metas?: XcalarApiTableMetaT[],
	});
}
declare class XcalarApiMakeResultSetOutputT {
	resultSetId: string;
	numEntries: number;
	metaOutput: XcalarApiGetTableMetaOutputT;
	constructor(args?: {
		resultSetId?: string,
		numEntries?: number,
		metaOutput?: XcalarApiGetTableMetaOutputT,
	});
}
declare class XcalarApiResultSetNextOutputT {
	numValues: number;
	values: string[];
	constructor(args?: {
		numValues?: number,
		values?: string[],
	});
}
declare class XcalarApiDagNodeInfoT {
	name: string;
	dagNodeId: string;
	state: number;
	size: number;
	api: number;
	constructor(args?: {
		name?: string,
		dagNodeId?: string,
		state?: number,
		size?: number,
		api?: number,
	});
}
declare class XcalarApiListDagNodesOutputT {
	numNodes: number;
	nodeInfo: XcalarApiDagNodeInfoT[];
	constructor(args?: {
		numNodes?: number,
		nodeInfo?: XcalarApiDagNodeInfoT[],
	});
}
declare class XcalarApiSessionGenericOutputT {
	outputAdded: boolean;
	nodeId: number;
	ipAddr: string;
	errorMessage: string;
	constructor(args?: {
		outputAdded?: boolean,
		nodeId?: number,
		ipAddr?: string,
		errorMessage?: string,
	});
}
declare class XcalarApiSessionPersistOutputT {
	sessionGenericOutput: XcalarApiSessionGenericOutputT;
	constructor(args?: {
		sessionGenericOutput?: XcalarApiSessionGenericOutputT,
	});
}
declare class XcalarApiListDatasetsOutputT {
	numDatasets: number;
	datasets: XcalarApiDatasetT[];
	constructor(args?: {
		numDatasets?: number,
		datasets?: XcalarApiDatasetT[],
	});
}
declare class XcalarApiGetDatasetsInfoOutputT {
	numDatasets: number;
	datasets: XcalarApiDatasetsInfoT[];
	constructor(args?: {
		numDatasets?: number,
		datasets?: XcalarApiDatasetsInfoT[],
	});
}
declare class XcalarApiDatasetCreateInputT {
	dest: string;
	loadArgs: XcalarApiDfLoadArgsT;
	dagNodeId: string;
	constructor(args?: {
		dest?: string,
		loadArgs?: XcalarApiDfLoadArgsT,
		dagNodeId?: string,
	});
}
declare class XcalarApiUdfGetResOutputT {
	udfResPath: string;
	constructor(args?: {
		udfResPath?: string,
	});
}
declare class XcalarApiUdfGetResInputT {
	scope: number;
	moduleName: string;
	constructor(args?: {
		scope?: number,
		moduleName?: string,
	});
}
declare class XcalarApiDatasetUnloadStatusT {
	dataset: XcalarApiDatasetT;
	status: number;
	constructor(args?: {
		dataset?: XcalarApiDatasetT,
		status?: number,
	});
}
declare class XcalarApiDatasetUnloadOutputT {
	numDatasets: number;
	statuses: number[];
	constructor(args?: {
		numDatasets?: number,
		statuses?: number[],
	});
}
declare class XcalarApiDatasetDeleteInputT {
	datasetName: string;
	constructor(args?: {
		datasetName?: string,
	});
}
declare class XcalarApiDatasetUnloadInputT {
	datasetNamePattern: string;
	constructor(args?: {
		datasetNamePattern?: string,
	});
}
declare class XcalarApiDatasetGetMetaInputT {
	datasetName: string;
	constructor(args?: {
		datasetName?: string,
	});
}
declare class XcalarApiDatasetGetMetaOutputT {
	datasetMeta: string;
	constructor(args?: {
		datasetMeta?: string,
	});
}
declare class XcalarApiDeleteDagNodeStatusT {
	nodeInfo: XcalarApiDagNodeInfoT;
	status: number;
	numRefs: number;
	refs: DagRefT[];
	constructor(args?: {
		nodeInfo?: XcalarApiDagNodeInfoT,
		status?: number,
		numRefs?: number,
		refs?: DagRefT[],
	});
}
declare class XcalarApiDeleteDagNodeOutputT {
	numNodes: number;
	statuses: XcalarApiDeleteDagNodeStatusT[];
	constructor(args?: {
		numNodes?: number,
		statuses?: XcalarApiDeleteDagNodeStatusT[],
	});
}
declare class XcalarApiNewTableOutputT {
	tableName: string;
	constructor(args?: {
		tableName?: string,
	});
}
declare class XcalarApiGetTableRefCountOutputT {
	refCount: number;
	constructor(args?: {
		refCount?: number,
	});
}
declare class XcalarApiQueryOutputT {
	queryName: string;
	constructor(args?: {
		queryName?: string,
	});
}
declare class XcalarApiBulkLoadOutputT {
	dataset: XcalarApiDatasetT;
	numFiles: number;
	numBytes: number;
	errorString: string;
	errorFile: string;
	constructor(args?: {
		dataset?: XcalarApiDatasetT,
		numFiles?: number,
		numBytes?: number,
		errorString?: string,
		errorFile?: string,
	});
}
declare class XcalarApiGetVersionOutputT {
	version: string;
	apiVersionSignatureFull: string;
	apiVersionSignatureShort: number;
	constructor(args?: {
		version?: string,
		apiVersionSignatureFull?: string,
		apiVersionSignatureShort?: number,
	});
}
declare class XcalarApiGetLicenseOutputT {
	loaded: boolean;
	expired: boolean;
	platform: string;
	product: string;
	productFamily: string;
	productVersion: string;
	expiration: string;
	nodeCount: number;
	userCount: number;
	attributes: string;
	licensee: string;
	compressedLicenseSize: number;
	compressedLicense: string;
	constructor(args?: {
		loaded?: boolean,
		expired?: boolean,
		platform?: string,
		product?: string,
		productFamily?: string,
		productVersion?: string,
		expiration?: string,
		nodeCount?: number,
		userCount?: number,
		attributes?: string,
		licensee?: string,
		compressedLicenseSize?: number,
		compressedLicense?: string,
	});
}
declare class XcalarApiAggregateOutputT {
	tableName: string;
	jsonAnswer: string;
	constructor(args?: {
		tableName?: string,
		jsonAnswer?: string,
	});
}
declare class XcalarApiSingleQueryT {
	singleQuery: string;
	status: number;
	constructor(args?: {
		singleQuery?: string,
		status?: number,
	});
}
declare class XcalarApiTopInputT {
	measureIntervalInMs: number;
	cacheValidityInMs: number;
	topStatsRequestType: number;
	constructor(args?: {
		measureIntervalInMs?: number,
		cacheValidityInMs?: number,
		topStatsRequestType?: number,
	});
}
declare class XcalarApiTopOutputPerNodeT {
	nodeId: number;
	cpuUsageInPercent: number;
	memUsageInPercent: number;
	memUsedInBytes: number;
	totalAvailableMemInBytes: number;
	networkRecvInBytesPerSec: number;
	networkSendInBytesPerSec: number;
	xdbUsedBytes: number;
	xdbTotalBytes: number;
	parentCpuUsageInPercent: number;
	childrenCpuUsageInPercent: number;
	numCores: number;
	sysSwapUsedInBytes: number;
	sysSwapTotalInBytes: number;
	uptimeInSeconds: number;
	datasetUsedBytes: number;
	sysMemUsedInBytes: number;
	constructor(args?: {
		nodeId?: number,
		cpuUsageInPercent?: number,
		memUsageInPercent?: number,
		memUsedInBytes?: number,
		totalAvailableMemInBytes?: number,
		networkRecvInBytesPerSec?: number,
		networkSendInBytesPerSec?: number,
		xdbUsedBytes?: number,
		xdbTotalBytes?: number,
		parentCpuUsageInPercent?: number,
		childrenCpuUsageInPercent?: number,
		numCores?: number,
		sysSwapUsedInBytes?: number,
		sysSwapTotalInBytes?: number,
		uptimeInSeconds?: number,
		datasetUsedBytes?: number,
		sysMemUsedInBytes?: number,
	});
}
declare class XcalarApiTopOutputT {
	status: number;
	numNodes: number;
	topOutputPerNode: XcalarApiTopOutputPerNodeT[];
	constructor(args?: {
		status?: number,
		numNodes?: number,
		topOutputPerNode?: XcalarApiTopOutputPerNodeT[],
	});
}
declare class XcalarApiMemoryInputT {
	tagName: string;
	constructor(args?: {
		tagName?: string,
	});
}
declare class XcalarApiQueryListInputT {
	namePattern: string;
	constructor(args?: {
		namePattern?: string,
	});
}
declare class XcalarApiQueryListOutputT {
	queries: XcalarApiQueryInfoT[];
	constructor(args?: {
		queries?: XcalarApiQueryInfoT[],
	});
}
declare class XcalarApiQueryInfoT {
	name: string;
	elapsed: XcalarApiTimeT;
	constructor(args?: {
		name?: string,
		elapsed?: XcalarApiTimeT,
	});
}
declare class XcalarApiQueryInputT {
	sameSession: boolean;
	queryName: string;
	queryStr: string;
	bailOnError: boolean;
	schedName: string;
	constructor(args?: {
		sameSession?: boolean,
		queryName?: string,
		queryStr?: string,
		bailOnError?: boolean,
		schedName?: string,
	});
}
declare class XcalarApiUserIdT {
	userIdName: string;
	constructor(args?: {
		userIdName?: string,
	});
}
declare class XcalarApiSessionNewInputT {
	sessionName: string;
	fork: boolean;
	forkedSessionName: string;
	constructor(args?: {
		sessionName?: string,
		fork?: boolean,
		forkedSessionName?: string,
	});
}
declare class XcalarApiSessionNewOutputT {
	sessionGenericOutput: XcalarApiSessionGenericOutputT;
	sessionId: string;
	constructor(args?: {
		sessionGenericOutput?: XcalarApiSessionGenericOutputT,
		sessionId?: string,
	});
}
declare class XcalarApiSessionDeleteInputT {
	sessionName: string;
	noCleanup: boolean;
	constructor(args?: {
		sessionName?: string,
		noCleanup?: boolean,
	});
}
declare class XcalarApiSessionSwitchInputT {
	sessionName: string;
	origSessionName: string;
	noCleanup: boolean;
	constructor(args?: {
		sessionName?: string,
		origSessionName?: string,
		noCleanup?: boolean,
	});
}
declare class XcalarApiSessionActivateInputT {
	sessionName: string;
	constructor(args?: {
		sessionName?: string,
	});
}
declare class XcalarApiSessionRenameInputT {
	sessionName: string;
	origSessionName: string;
	constructor(args?: {
		sessionName?: string,
		origSessionName?: string,
	});
}
declare class XcalarApiSessionDownloadInputT {
	sessionName: string;
	pathToAdditionalFiles: string;
	constructor(args?: {
		sessionName?: string,
		pathToAdditionalFiles?: string,
	});
}
declare class XcalarApiSessionDownloadOutputT {
	sessionContentCount: number;
	sessionContent: string;
	constructor(args?: {
		sessionContentCount?: number,
		sessionContent?: string,
	});
}
declare class XcalarApiSessionUploadInputT {
	sessionName: string;
	pathToAdditionalFiles: string;
	sessionContentCount: number;
	sessionContent: string;
	constructor(args?: {
		sessionName?: string,
		pathToAdditionalFiles?: string,
		sessionContentCount?: number,
		sessionContent?: string,
	});
}
declare class XcalarApiUserDetachInputT {
	userName: string;
	constructor(args?: {
		userName?: string,
	});
}
declare class XcalarApiGetQueryOutputT {
	query: string;
	constructor(args?: {
		query?: string,
	});
}
declare class XcalarApiDagNodeNamePatternInputT {
	namePattern: string;
	srcType: number;
	constructor(args?: {
		namePattern?: string,
		srcType?: number,
	});
}
declare class XcalarApiArchiveTablesInputT {
	archive: boolean;
	allTables: boolean;
	tableNames: string[];
	constructor(args?: {
		archive?: boolean,
		allTables?: boolean,
		tableNames?: string[],
	});
}
declare class DhtArgsT {
	upperBound: number;
	lowerBound: number;
	ordering: number;
	constructor(args?: {
		upperBound?: number,
		lowerBound?: number,
		ordering?: number,
	});
}
declare class XcalarApiCreateDhtInputT {
	dhtName: string;
	dhtArgs: DhtArgsT;
	constructor(args?: {
		dhtName?: string,
		dhtArgs?: DhtArgsT,
	});
}
declare class XcalarApiDeleteDhtInputT {
	dhtNameLen: number;
	dhtName: string;
	constructor(args?: {
		dhtNameLen?: number,
		dhtName?: string,
	});
}
declare class XcalarApiSupportGenerateInputT {
	generateMiniBundle: boolean;
	supportCaseId: number;
	constructor(args?: {
		generateMiniBundle?: boolean,
		supportCaseId?: number,
	});
}
declare class XcalarApiSupportGenerateOutputT {
	supportId: string;
	supportBundleSent: boolean;
	bundlePath: string;
	constructor(args?: {
		supportId?: string,
		supportBundleSent?: boolean,
		bundlePath?: string,
	});
}
declare class IndexErrorStatsT {
	numParseError: number;
	numFieldNoExist: number;
	numTypeMismatch: number;
	numOtherError: number;
	constructor(args?: {
		numParseError?: number,
		numFieldNoExist?: number,
		numTypeMismatch?: number,
		numOtherError?: number,
	});
}
declare class LoadErrorStatsT {
	numFileOpenFailure: number;
	numDirOpenFailure: number;
	constructor(args?: {
		numFileOpenFailure?: number,
		numDirOpenFailure?: number,
	});
}
declare class EvalErrorStatsT {
	numUnsubstituted: number;
	numUnspportedTypes: number;
	numMixedTypeNotSupported: number;
	numEvalCastError: number;
	numDivByZero: number;
	numEvalFunctionError: number;
	constructor(args?: {
		numUnsubstituted?: number,
		numUnspportedTypes?: number,
		numMixedTypeNotSupported?: number,
		numEvalCastError?: number,
		numDivByZero?: number,
		numEvalFunctionError?: number,
	});
}
declare class OpErrorStatsT {
	loadErrorStats: LoadErrorStatsT;
	indexErrorStats: IndexErrorStatsT;
	evalErrorStats: EvalErrorStatsT;
	constructor(args?: {
		loadErrorStats?: LoadErrorStatsT,
		indexErrorStats?: IndexErrorStatsT,
		evalErrorStats?: EvalErrorStatsT,
	});
}
declare class XcalarApiOpDetailsT {
	numWorkCompleted: number;
	numWorkTotal: number;
	cancelled: boolean;
	errorStats: OpErrorStatsT;
	numRowsTotal: number;
	constructor(args?: {
		numWorkCompleted?: number,
		numWorkTotal?: number,
		cancelled?: boolean,
		errorStats?: OpErrorStatsT,
		numRowsTotal?: number,
	});
}
declare class XcalarApiNodeOpStatsT {
	status: number;
	nodeId: number;
	opDetails: XcalarApiOpDetailsT;
	constructor(args?: {
		status?: number,
		nodeId?: number,
		opDetails?: XcalarApiOpDetailsT,
	});
}
declare class XcalarApiPerNodeOpStatsT {
	numNodes: number;
	api: number;
	nodeOpStats: XcalarApiNodeOpStatsT[];
	constructor(args?: {
		numNodes?: number,
		api?: number,
		nodeOpStats?: XcalarApiNodeOpStatsT[],
	});
}
declare class XcalarApiOpStatsOutT {
	api: number;
	opDetails: XcalarApiOpDetailsT;
	constructor(args?: {
		api?: number,
		opDetails?: XcalarApiOpDetailsT,
	});
}
declare class XcalarApiErrorpointSetInputT {
	moduleName: string;
	pointName: string;
	exactNameMatch: boolean;
	probability: number;
	fireNTimes: number;
	opaque: string;
	constructor(args?: {
		moduleName?: string,
		pointName?: string,
		exactNameMatch?: boolean,
		probability?: number,
		fireNTimes?: number,
		opaque?: string,
	});
}
declare class XcalarApiImportRetinaInputT {
	retinaName: string;
	overwriteExistingUdf: boolean;
	retinaCount: number;
	retina: string;
	loadRetinaJson: boolean;
	retinaJson: string;
	udfUserName: string;
	udfSerssionName: string;

	constructor(args?: {
		retinaName?: string,
		overwriteExistingUdf?: boolean,
		retinaCount?: number,
		retina?: string,
		loadRetinaJson?: boolean,
		retinaJson?: string,
		udfUserName?: string,
		udfSerssionName?: string,
	});
}
declare class XcalarApiExportRetinaInputT {
	retinaName: string;
	constructor(args?: {
		retinaName?: string,
	});
}
declare class XcalarApiStartFuncTestInputT {
	parallel: boolean;
	runAllTests: boolean;
	runOnAllNodes: boolean;
	numTestPatterns: number;
	testNamePatterns: string[];
	constructor(args?: {
		parallel?: boolean,
		runAllTests?: boolean,
		runOnAllNodes?: boolean,
		numTestPatterns?: number,
		testNamePatterns?: string[],
	});
}
declare class XcalarApiListFuncTestInputT {
	namePattern: string;
	constructor(args?: {
		namePattern?: string,
	});
}
declare class XcalarApiConfigParamT {
	paramName: string;
	paramValue: string;
	visible: boolean;
	changeable: boolean;
	restartRequired: boolean;
	defaultValue: string;
	constructor(args?: {
		paramName?: string,
		paramValue?: string,
		visible?: boolean,
		changeable?: boolean,
		restartRequired?: boolean,
		defaultValue?: string,
	});
}
declare class XcalarApiGetConfigParamsOutputT {
	numParams: number;
	parameter: XcalarApiConfigParamT[];
	constructor(args?: {
		numParams?: number,
		parameter?: XcalarApiConfigParamT[],
	});
}
declare class XcalarApiSetConfigParamInputT {
	paramName: string;
	paramValue: string;
	constructor(args?: {
		paramName?: string,
		paramValue?: string,
	});
}
declare class XcalarApiGetTableMetaInputT {
	tableNameInput: XcalarApiNamedInputT;
	isPrecise: boolean;
	constructor(args?: {
		tableNameInput?: XcalarApiNamedInputT,
		isPrecise?: boolean,
	});
}
declare class XcalarApiGetMemoryUsageInputT {
	userName: string;
	userId: number;
	constructor(args?: {
		userName?: string,
		userId?: number,
	});
}
declare class XcalarApiLogLevelSetInputT {
	logLevel: number;
	logFlush: boolean;
	logFlushLevel: number;
	logFlushPeriod: number;
	constructor(args?: {
		logLevel?: number,
		logFlush?: boolean,
		logFlushLevel?: number,
		logFlushPeriod?: number,
	});
}
declare class XcalarApiDagTableNameInputT {
	tableInput: string;
	constructor(args?: {
		tableInput?: string,
	});
}
declare class XcalarApiListParametersInRetinaInputT {
	listRetInput: string;
	constructor(args?: {
		listRetInput?: string,
	});
}
declare class XcalarApiSessionListArrayInputT {
	sesListInput: string;
	constructor(args?: {
		sesListInput?: string,
	});
}
declare class XcalarApiDeleteRetinaInputT {
	delRetInput: string;
	constructor(args?: {
		delRetInput?: string,
	});
}
declare class XcalarApiLicenseUpdateInputT {
	licUpdateInput: string;
	constructor(args?: {
		licUpdateInput?: string,
	});
}
declare class XcalarApiDeleteDatasetsInputT {
	delInput: string;
	constructor(args?: {
		delInput?: string,
	});
}
declare class XcalarApiShutdownInputT {
	doShutdown: boolean;
	constructor(args?: {
		doShutdown?: boolean,
	});
}
declare class XcalarApiGetIpAddrInputT {
	nodeId: number;
	constructor(args?: {
		nodeId?: number,
	});
}
declare class XcalarApiTagDagNodesInputT {
	dagNodes: XcalarApiNamedInputT[];
	tag: string;
	constructor(args?: {
		dagNodes?: XcalarApiNamedInputT[],
		tag?: string,
	});
}
declare class XcalarApiCommentDagNodesInputT {
	numDagNodes: number;
	dagNodeNames: string[];
	comment: string;
	constructor(args?: {
		numDagNodes?: number,
		dagNodeNames?: string[],
		comment?: string,
	});
}
declare class XcalarApiGetDatasetsInfoInputT {
	datasetsNamePattern: string;
	constructor(args?: {
		datasetsNamePattern?: string,
	});
}
declare class XcalarApiListDatasetUsersInputT {
	datasetName: string;
	constructor(args?: {
		datasetName?: string,
	});
}
declare class XcalarApiLockDatasetInputT {
	datasetName: string;
	constructor(args?: {
		datasetName?: string,
	});
}
declare class XcalarApiListUserDatasetsInputT {
	userIdName: string;
	constructor(args?: {
		userIdName?: string,
	});
}
declare class XcalarApiSynthesizeInputT {
	source: string;
	dest: string;
	columns: XcalarApiColumnT[];
	sameSession: boolean;
	constructor(args?: {
		source?: string,
		dest?: string,
		columns?: XcalarApiColumnT[],
		sameSession?: boolean;
	});
}
declare class XcalarApiPublishInputT {
	source: string;
	dest: string;
	unixTS: number;
	constructor(args?: {
		source?: string,
		dest?: string,
		unixTS?: number,
	});
}
declare class XcalarApiUpdateTableInputT {
	source: string;
	dest: string;
	unixTS: number;
	constructor(args?: {
		source?: string,
		dest?: string,
		unixTS?: number,
	});
}
declare class XcalarApiUpdateInputT {
	updates: XcalarApiUpdateTableInputT[];
	constructor(args?: {
		updates?: XcalarApiUpdateTableInputT[],
	});
}
declare class XcalarApiSelectInputT {
	source: string;
	dest: string;
	minBatchId: number;
	maxBatchId: number;
	constructor(args?: {
		source?: string,
		dest?: string,
		minBatchId?: number,
		maxBatchId?: number,
	});
}
declare class XcalarApiUnpublishInputT {
	source: string;
	inactivateOnly: boolean;
	constructor(args?: {
		source?: string,
		inactivateOnly?: boolean,
	});
}
declare class XcalarApiRestoreTableInputT {
	publishedTableName: string;
	constructor(args?: {
		publishedTableName?: string,
	});
}
declare class XcalarApiCoalesceInputT {
	source: string;
	constructor(args?: {
		source?: string,
	});
}
declare class XcalarApiListTablesInputT {
	namePattern: string;
	constructor(args?: {
		namePattern?: string,
	});
}
declare class XcalarApiInputT {
	loadInput: XcalarApiBulkLoadInputT;
	indexInput: XcalarApiIndexInputT;
	statInput: XcalarApiStatInputT;
	getTableMetaInput: XcalarApiGetTableMetaInputT;
	resultSetNextInput: XcalarApiResultSetNextInputT;
	joinInput: XcalarApiJoinInputT;
	filterInput: XcalarApiFilterInputT;
	groupByInput: XcalarApiGroupByInputT;
	resultSetAbsoluteInput: XcalarApiResultSetAbsoluteInputT;
	freeResultSetInput: XcalarApiFreeResultSetInputT;
	getTableRefCountInput: XcalarApiTableInputT;
	listDagNodesInput: XcalarApiDagNodeNamePatternInputT;
	deleteDagNodeInput: XcalarApiDagNodeNamePatternInputT;
	queryInput: XcalarApiQueryInputT;
	statByGroupIdInput: XcalarApiStatByGroupIdInputT;
	makeResultSetInput: XcalarApiMakeResultSetInputT;
	mapInput: XcalarApiMapInputT;
	aggregateInput: XcalarApiAggregateInputT;
	queryStateInput: XcalarApiQueryNameInputT;
	addTargetInput: ExExportTargetT;
	listTargetsInput: XcalarApiListExportTargetsInputT;
	exportInput: XcalarApiExportInputT;
	dagTableNameInput: XcalarApiDagTableNameInputT;
	listFilesInput: XcalarApiListFilesInputT;
	startNodesInput: XcalarApiStartNodesInputT;
	makeRetinaInput: XcalarApiMakeRetinaInputT;
	getRetinaInput: XcalarApiGetRetinaInputT;
	executeRetinaInput: XcalarApiExecuteRetinaInputT;
	updateRetinaInput: XcalarApiUpdateRetinaInputT;
	addParameterToRetinaInput: XcalarApiAddParameterToRetinaInputT;
	listParametersInRetinaInput: XcalarApiListParametersInRetinaInputT;
	keyLookupInput: XcalarApiKeyLookupInputT;
	keyAddOrReplaceInput: XcalarApiKeyAddOrReplaceInputT;
	keyDeleteInput: XcalarApiKeyDeleteInputT;
	topInput: XcalarApiTopInputT;
	shutdownInput: XcalarApiShutdownInputT;
	listXdfsInput: XcalarApiListXdfsInputT;
	renameNodeInput: XcalarApiRenameNodeInputT;
	memoryInput: XcalarApiMemoryInputT;
	sessionNewInput: XcalarApiSessionNewInputT;
	sessionDeleteInput: XcalarApiSessionDeleteInputT;
	sessionSwitchInput: XcalarApiSessionSwitchInputT;
	sessionListInput: XcalarApiSessionListArrayInputT;
	sessionRenameInput: XcalarApiSessionRenameInputT;
	createDhtInput: XcalarApiCreateDhtInputT;
	keyAppendInput: XcalarApiKeyAppendInputT;
	keySetIfEqualInput: XcalarApiKeySetIfEqualInputT;
	deleteDhtInput: XcalarApiDeleteDhtInputT;
	deleteRetinaInput: XcalarApiDeleteRetinaInputT;
	projectInput: XcalarApiProjectInputT;
	getRowNumInput: XcalarApiGetRowNumInputT;
	udfAddUpdateInput: UdfModuleSrcT;
	udfGetInput: XcalarApiUdfGetInputT;
	udfDeleteInput: XcalarApiUdfDeleteInputT;
	previewInput: XcalarApiPreviewInputT;
	importRetinaInput: XcalarApiImportRetinaInputT;
	exportRetinaInput: XcalarApiExportRetinaInputT;
	startFuncTestInput: XcalarApiStartFuncTestInputT;
	listFuncTestInput: XcalarApiListFuncTestInputT;
	deleteDatasetsInput: XcalarApiDeleteDatasetsInputT;
	setConfigParamInput: XcalarApiSetConfigParamInputT;
	removeTargetInput: ExExportTargetHdrT;
	appSetInput: XcalarApiAppSetInputT;
	errorpointSetInput: XcalarApiErrorpointSetInputT;
	appRunInput: XcalarApiAppRunInputT;
	appReapInput: XcalarApiAppReapInputT;
	demoFileInput: XcalarApiDemoFileInputT;
	updateLicenseInput: XcalarApiLicenseUpdateInputT;
	memoryUsageInput: XcalarApiGetMemoryUsageInputT;
	logLevelSetInput: XcalarApiLogLevelSetInputT;
	getIpAddrInput: XcalarApiGetIpAddrInputT;
	supportGenerateInput: XcalarApiSupportGenerateInputT;
	tagDagNodesInput: XcalarApiTagDagNodesInputT;
	commentDagNodesInput: XcalarApiCommentDagNodesInputT;
	listDatasetUsersInput: XcalarApiListDatasetUsersInputT;
	lockDatasetInput: XcalarApiLockDatasetInputT;
	keyListInput: XcalarApiKeyListInputT;
	listUserDatasetsInput: XcalarApiListUserDatasetsInputT;
	unionInput: XcalarApiUnionInputT;
	targetInput: XcalarApiTargetInputT;
	synthesizeInput: XcalarApiSynthesizeInputT;
	getRetinaJsonInput: XcalarApiGetRetinaJsonInputT;
	getDatasetsInfoInput: XcalarApiGetDatasetsInfoInputT;
	archiveTablesInput: XcalarApiArchiveTablesInputT;
	sessionDownloadInput: XcalarApiSessionDownloadInputT;
	sessionUploadInput: XcalarApiSessionUploadInputT;
	publishInput: XcalarApiPublishInputT;
	updateInput: XcalarApiUpdateInputT;
	selectInput: XcalarApiSelectInputT;
	unpublishInput: XcalarApiUnpublishInputT;
	listTablesInput: XcalarApiListTablesInputT;
	restoreTableInput: XcalarApiRestoreTableInputT;
	coalesceInput: XcalarApiCoalesceInputT;
	userDetachInput: XcalarApiUserDetachInputT;
	sessionActivateInput: XcalarApiSessionActivateInputT;
	cgroupInput: XcalarApiCgroupInputT;
	queryListInput: XcalarApiQueryListInputT;
	listRetinasInput: XcalarApiListRetinasInputT;
	constructor(args?: {
		loadInput?: XcalarApiBulkLoadInputT,
		indexInput?: XcalarApiIndexInputT,
		statInput?: XcalarApiStatInputT,
		getTableMetaInput?: XcalarApiGetTableMetaInputT,
		resultSetNextInput?: XcalarApiResultSetNextInputT,
		joinInput?: XcalarApiJoinInputT,
		filterInput?: XcalarApiFilterInputT,
		groupByInput?: XcalarApiGroupByInputT,
		resultSetAbsoluteInput?: XcalarApiResultSetAbsoluteInputT,
		freeResultSetInput?: XcalarApiFreeResultSetInputT,
		getTableRefCountInput?: XcalarApiTableInputT,
		listDagNodesInput?: XcalarApiDagNodeNamePatternInputT,
		deleteDagNodeInput?: XcalarApiDagNodeNamePatternInputT,
		queryInput?: XcalarApiQueryInputT,
		statByGroupIdInput?: XcalarApiStatByGroupIdInputT,
		makeResultSetInput?: XcalarApiMakeResultSetInputT,
		mapInput?: XcalarApiMapInputT,
		aggregateInput?: XcalarApiAggregateInputT,
		queryStateInput?: XcalarApiQueryNameInputT,
		addTargetInput?: ExExportTargetT,
		listTargetsInput?: XcalarApiListExportTargetsInputT,
		exportInput?: XcalarApiExportInputT,
		dagTableNameInput?: XcalarApiDagTableNameInputT,
		listFilesInput?: XcalarApiListFilesInputT,
		startNodesInput?: XcalarApiStartNodesInputT,
		makeRetinaInput?: XcalarApiMakeRetinaInputT,
		getRetinaInput?: XcalarApiGetRetinaInputT,
		executeRetinaInput?: XcalarApiExecuteRetinaInputT,
		updateRetinaInput?: XcalarApiUpdateRetinaInputT,
		addParameterToRetinaInput?: XcalarApiAddParameterToRetinaInputT,
		listParametersInRetinaInput?: XcalarApiListParametersInRetinaInputT,
		keyLookupInput?: XcalarApiKeyLookupInputT,
		keyAddOrReplaceInput?: XcalarApiKeyAddOrReplaceInputT,
		keyDeleteInput?: XcalarApiKeyDeleteInputT,
		topInput?: XcalarApiTopInputT,
		shutdownInput?: XcalarApiShutdownInputT,
		listXdfsInput?: XcalarApiListXdfsInputT,
		renameNodeInput?: XcalarApiRenameNodeInputT,
		memoryInput?: XcalarApiMemoryInputT,
		sessionNewInput?: XcalarApiSessionNewInputT,
		sessionDeleteInput?: XcalarApiSessionDeleteInputT,
		sessionSwitchInput?: XcalarApiSessionSwitchInputT,
		sessionListInput?: XcalarApiSessionListArrayInputT,
		sessionRenameInput?: XcalarApiSessionRenameInputT,
		createDhtInput?: XcalarApiCreateDhtInputT,
		keyAppendInput?: XcalarApiKeyAppendInputT,
		keySetIfEqualInput?: XcalarApiKeySetIfEqualInputT,
		deleteDhtInput?: XcalarApiDeleteDhtInputT,
		deleteRetinaInput?: XcalarApiDeleteRetinaInputT,
		projectInput?: XcalarApiProjectInputT,
		getRowNumInput?: XcalarApiGetRowNumInputT,
		udfAddUpdateInput?: UdfModuleSrcT,
		udfGetInput?: XcalarApiUdfGetInputT,
		udfDeleteInput?: XcalarApiUdfDeleteInputT,
		previewInput?: XcalarApiPreviewInputT,
		importRetinaInput?: XcalarApiImportRetinaInputT,
		exportRetinaInput?: XcalarApiExportRetinaInputT,
		startFuncTestInput?: XcalarApiStartFuncTestInputT,
		listFuncTestInput?: XcalarApiListFuncTestInputT,
		deleteDatasetsInput?: XcalarApiDeleteDatasetsInputT,
		setConfigParamInput?: XcalarApiSetConfigParamInputT,
		removeTargetInput?: ExExportTargetHdrT,
		appSetInput?: XcalarApiAppSetInputT,
		errorpointSetInput?: XcalarApiErrorpointSetInputT,
		appRunInput?: XcalarApiAppRunInputT,
		appReapInput?: XcalarApiAppReapInputT,
		demoFileInput?: XcalarApiDemoFileInputT,
		updateLicenseInput?: XcalarApiLicenseUpdateInputT,
		memoryUsageInput?: XcalarApiGetMemoryUsageInputT,
		logLevelSetInput?: XcalarApiLogLevelSetInputT,
		getIpAddrInput?: XcalarApiGetIpAddrInputT,
		supportGenerateInput?: XcalarApiSupportGenerateInputT,
		tagDagNodesInput?: XcalarApiTagDagNodesInputT,
		commentDagNodesInput?: XcalarApiCommentDagNodesInputT,
		listDatasetUsersInput?: XcalarApiListDatasetUsersInputT,
		lockDatasetInput?: XcalarApiLockDatasetInputT,
		keyListInput?: XcalarApiKeyListInputT,
		listUserDatasetsInput?: XcalarApiListUserDatasetsInputT,
		unionInput?: XcalarApiUnionInputT,
		targetInput?: XcalarApiTargetInputT,
		synthesizeInput?: XcalarApiSynthesizeInputT,
		getRetinaJsonInput?: XcalarApiGetRetinaJsonInputT,
		getDatasetsInfoInput?: XcalarApiGetDatasetsInfoInputT,
		archiveTablesInput?: XcalarApiArchiveTablesInputT,
		sessionDownloadInput?: XcalarApiSessionDownloadInputT,
		sessionUploadInput?: XcalarApiSessionUploadInputT,
		publishInput?: XcalarApiPublishInputT,
		updateInput?: XcalarApiUpdateInputT,
		selectInput?: XcalarApiSelectInputT,
		unpublishInput?: XcalarApiUnpublishInputT,
		listTablesInput?: XcalarApiListTablesInputT,
		restoreTableInput?: XcalarApiRestoreTableInputT,
		coalesceInput?: XcalarApiCoalesceInputT,
		userDetachInput?: XcalarApiUserDetachInputT,
		sessionActivateInput?: XcalarApiSessionActivateInputT,
		cgroupInput?: XcalarApiCgroupInputT,
		queryListInput?: XcalarApiQueryListInputT,
		listRetinasInput?: XcalarApiListRetinasInputT,
	});
}
declare class XcalarApiDagNodeT {
	name: XcalarApiDagNameT;
	tag: string;
	comment: string;
	dagNodeId: string;
	api: number;
	state: number;
	xdbBytesRequired: number;
	xdbBytesConsumed: number;
	numTransPageSent: number;
	numTransPageRecv: number;
	numWorkCompleted: number;
	numWorkTotal: number;
	elapsed: XcalarApiTimeT;
	inputSize: number;
	input: XcalarApiInputT;
	numRowsTotal: number;
	numNodes: number;
	numRowsPerNode: number[];
	sizeTotal: number;
	sizePerNode: number[];
	numTransPagesReceivedPerNode: number[];
	numParents: number;
	parents: string[];
	numChildren: number;
	children: string[];
	status: number;
	constructor(args?: {
		name?: XcalarApiDagNameT,
		tag?: string,
		comment?: string,
		dagNodeId?: string,
		api?: number,
		state?: number,
		xdbBytesRequired?: number,
		xdbBytesConsumed?: number,
		numTransPageSent?: number,
		numTransPageRecv?: number,
		numWorkCompleted?: number,
		numWorkTotal?: number,
		elapsed?: XcalarApiTimeT,
		inputSize?: number,
		input?: XcalarApiInputT,
		numRowsTotal?: number,
		numNodes?: number,
		numRowsPerNode?: number[],
		sizeTotal?: number,
		sizePerNode?: number[],
		numTransPagesReceivedPerNode?: number[],
		numParents?: number,
		parents?: string[],
		numChildren?: number,
		children?: string[],
		status?: number,
	});
}
declare class XcalarApiDagOutputT {
	numNodes: number;
	node: XcalarApiDagNodeT[];
	constructor(args?: {
		numNodes?: number,
		node?: XcalarApiDagNodeT[],
	});
}
declare class DagRetinaDescT {
	retinaName: string;
	constructor(args?: {
		retinaName?: string,
	});
}
declare class XcalarApiRetinaT {
	retinaDesc: DagRetinaDescT;
	retinaDag: XcalarApiDagOutputT;
	constructor(args?: {
		retinaDesc?: DagRetinaDescT,
		retinaDag?: XcalarApiDagOutputT,
	});
}
declare class XcalarApiQueryStateOutputT {
	queryState: number;
	queryStatus: number;
	query: string;
	numQueuedWorkItem: number;
	numCompletedWorkItem: number;
	numFailedWorkItem: number;
	elapsed: XcalarApiTimeT;
	queryGraph: XcalarApiDagOutputT;
	queryNodeId: number;
	constructor(args?: {
		queryState?: number,
		queryStatus?: number,
		query?: string,
		numQueuedWorkItem?: number,
		numCompletedWorkItem?: number,
		numFailedWorkItem?: number,
		elapsed?: XcalarApiTimeT,
		queryGraph?: XcalarApiDagOutputT,
		queryNodeId?: number,
	});
}
declare class XcalarApiListRetinasInputT {
	namePattern: string;
	constructor(args?: {
		namePattern?: string,
	})
}
declare class XcalarApiListRetinasOutputT {
	numRetinas: number;
	retinaDescs: DagRetinaDescT[];
	constructor(args?: {
		numRetinas?: number,
		retinaDescs?: DagRetinaDescT[],
	});
}
declare class XcalarApiGetRetinaOutputT {
	retina: XcalarApiRetinaT;
	constructor(args?: {
		retina?: XcalarApiRetinaT,
	});
}
declare class XcalarApiGetRetinaJsonOutputT {
	retinaJson: string;
	constructor(args?: {
		retinaJson?: string,
	});
}
declare class XcalarApiSessionT {
	name: string;
	state: string;
	info: string;
	activeNode: number;
	sessionId: string;
	constructor(args?: {
		name?: string,
		state?: string,
		info?: string,
		activeNode?: number,
		sessionId?: string,
	});
}
declare class XcalarApiSessionListOutputT {
	numSessions: number;
	sessions: XcalarApiSessionT[];
	sessionGenericOutput: XcalarApiSessionGenericOutputT;
	constructor(args?: {
		numSessions?: number,
		sessions?: XcalarApiSessionT[],
		sessionGenericOutput?: XcalarApiSessionGenericOutputT,
	});
}
declare class XcalarApiImportRetinaOutputT {
	numUdfModules: number;
	udfModuleStatuses: XcalarApiUdfAddUpdateOutputT[];
	constructor(args?: {
		numUdfModules?: number,
		udfModuleStatuses?: XcalarApiUdfAddUpdateOutputT[],
	});
}
declare class XcalarApiExportRetinaOutputT {
	retinaCount: number;
	retina: string;
	constructor(args?: {
		retinaCount?: number,
		retina?: string,
	});
}
declare class XcalarApiFuncTestOutputT {
	testName: string;
	status: number;
	constructor(args?: {
		testName?: string,
		status?: number,
	});
}
declare class XcalarApiStartFuncTestOutputT {
	numTests: number;
	testOutputs: XcalarApiFuncTestOutputT[];
	constructor(args?: {
		numTests?: number,
		testOutputs?: XcalarApiFuncTestOutputT[],
	});
}
declare class XcalarApiListFuncTestOutputT {
	numTests: number;
	testNames: string[];
	constructor(args?: {
		numTests?: number,
		testNames?: string[],
	});
}
declare class XcalarApiDatasetMemoryUsageT {
	datasetName: string;
	datsetId: string;
	totalBytes: number;
	numNodes: number;
	bytesPerNode: number[];
	constructor(args?: {
		datasetName?: string,
		datsetId?: string,
		totalBytes?: number,
		numNodes?: number,
		bytesPerNode?: number[],
	});
}
declare class XcalarApiTableMemoryUsageT {
	tableName: string;
	tableId: string;
	totalBytes: number;
	constructor(args?: {
		tableName?: string,
		tableId?: string,
		totalBytes?: number,
	});
}
declare class XcalarApiSessionMemoryUsageT {
	sessionName: string;
	numTables: number;
	tableMemory: XcalarApiTableMemoryUsageT[];
	constructor(args?: {
		sessionName?: string,
		numTables?: number,
		tableMemory?: XcalarApiTableMemoryUsageT[],
	});
}
declare class XcalarApiUserMemoryUsageT {
	userName: string;
	userId: string;
	numSessions: number;
	sessionMemory: XcalarApiSessionMemoryUsageT[];
	constructor(args?: {
		userName?: string,
		userId?: string,
		numSessions?: number,
		sessionMemory?: XcalarApiSessionMemoryUsageT[],
	});
}
declare class XemClientConfigParamsT {
	enableStatsShipment: boolean;
	isMultipleNodesPerHost: boolean;
	xemHostPortNumber: number;
	statsPushHeartBeat: number;
	xemHostAddress: string;
	clusterName: string;
	constructor(args?: {
		enableStatsShipment?: boolean,
		isMultipleNodesPerHost?: boolean,
		xemHostPortNumber?: number,
		statsPushHeartBeat?: number,
		xemHostAddress?: string,
		clusterName?: string,
	});
}
declare class XcalarApiGetMemoryUsageOutputT {
	userMemory: XcalarApiUserMemoryUsageT;
	constructor(args?: {
		userMemory?: XcalarApiUserMemoryUsageT,
	});
}
declare class XcalarApiGetIpAddrOutputT {
	ipAddr: string;
	constructor(args?: {
		ipAddr?: string,
	});
}
declare class XcalarApiGetNumNodesOutputT {
	numNodes: number;
	constructor(args?: {
		numNodes?: number,
	});
}
declare class XcalarApiDatasetUserT {
	userId: XcalarApiUserIdT;
	referenceCount: number;
	constructor(args?: {
		userId?: XcalarApiUserIdT,
		referenceCount?: number,
	});
}
declare class XcalarApiListDatasetUsersOutputT {
	usersCount: number;
	user: XcalarApiDatasetUserT[];
	constructor(args?: {
		usersCount?: number,
		user?: XcalarApiDatasetUserT[],
	});
}
declare class XcalarApiUserDatasetT {
	datasetName: string;
	isLocked: boolean;
	constructor(args?: {
		datasetName?: string,
		isLocked?: boolean,
	});
}
declare class XcalarApiListUserDatasetsOutputT {
	numDatasets: number;
	datasets: XcalarApiUserDatasetT[];
	constructor(args?: {
		numDatasets?: number,
		datasets?: XcalarApiUserDatasetT[],
	});
}
declare class XcalarApiLogLevelGetOutputT {
	logLevel: number;
	logFlushPeriod: number;
	constructor(args?: {
		logLevel?: number,
		logFlushPeriod?: number,
	});
}
declare class XcalarApiColumnInfoT {
	name: string;
	type: string;
	constructor(args?: {
		name?: string,
		type?: string,
	});
}
declare class XcalarApiUpdateInfoT {
	source: string;
	startTS: number;
	batchId: number;
	size: number;
	numRows: number;
	numInserts: number;
	numUpdates: number;
	numDeletes: number;
	constructor(args?: {
		source?: string,
		startTS?: number,
		batchId?: number,
		size?: number,
		numRows?: number,
		numInserts?: number,
		numUpdates?: number,
		numDeletes?: number,
	});
}
declare class XcalarApiTableInfoT {
	name: string;
	numPersistedUpdates: number;
	source: XcalarApiPublishInputT;
	updates: XcalarApiUpdateInfoT[];
	selects: XcalarApiSelectInputT[];
	oldestBatchId: number;
	nextBatchId: number;
	keys: XcalarApiColumnInfoT[];
	values: XcalarApiColumnInfoT[];
	active: boolean;
	constructor(args?: {
		name?: string,
		numPersistedUpdates?: number,
		source?: XcalarApiPublishInputT,
		updates?: XcalarApiUpdateInfoT[],
		selects?: XcalarApiSelectInputT[],
		oldestBatchId?: number,
		nextBatchId?: number,
		keys?: XcalarApiColumnInfoT[],
		values?: XcalarApiColumnInfoT[],
		active?: boolean,
	});
}
declare class XcalarApiListTablesOutputT {
	numTables: number;
	tables: XcalarApiTableInfoT[];
	constructor(args?: {
		numTables?: number,
		tables?: XcalarApiTableInfoT[],
	});
}
declare class XcalarApiUpdateOutputT {
	batchIds: number[];
	constructor(args?: {
		batchIds?: number[],
	});
}
declare class XcalarApiSchedParamT {
	schedName: string;
	cpusReservedInPercent: number;
	runtimeType: number;
	constructor(args?: {
		schedName?: string,
		cpusReservedInPercent?: number,
		runtimeType?: number
	});
}

declare class XcalarApiCgroupInputT {
	inputJson: string;
	constructor(args?: {
		inputJson?: string,
	})
}

declare class XcalarApiCgroupOutputT {
	outputJson: string;
	constructor(args?: {
		outputJson?: string,
	});
}

declare class XcalarApiOutputResultT {
	getVersionOutput: XcalarApiGetVersionOutputT;
	statusOutput: number;
	statOutput: XcalarApiGetStatOutputT;
	listNodesOutput: XcalarApiListDagNodesOutputT;
	makeResultSetOutput: XcalarApiMakeResultSetOutputT;
	resultSetNextOutput: XcalarApiResultSetNextOutputT;
	getTableMetaOutput: XcalarApiGetTableMetaOutputT;
	indexOutput: XcalarApiNewTableOutputT;
	loadOutput: XcalarApiBulkLoadOutputT;
	getTableRefCountOutput: XcalarApiGetTableRefCountOutputT;
	deleteDagNodesOutput: XcalarApiDeleteDagNodeOutputT;
	joinOutput: XcalarApiNewTableOutputT;
	statGroupIdMapOutput: XcalarApiGetStatGroupIdMapOutputT;
	listDatasetsOutput: XcalarApiListDatasetsOutputT;
	mapOutput: XcalarApiNewTableOutputT;
	aggregateOutput: XcalarApiAggregateOutputT;
	filterOutput: XcalarApiNewTableOutputT;
	queryOutput: XcalarApiQueryOutputT;
	queryStateOutput: XcalarApiQueryStateOutputT;
	listTargetsOutput: XcalarApiListExportTargetsOutputT;
	dagOutput: XcalarApiDagOutputT;
	listFilesOutput: XcalarApiListFilesOutputT;
	groupByOutput: XcalarApiNewTableOutputT;
	listRetinasOutput: XcalarApiListRetinasOutputT;
	getRetinaOutput: XcalarApiGetRetinaOutputT;
	listParametersInRetinaOutput: XcalarApiListParametersInRetinaOutputT;
	keyLookupOutput: XcalarApiKeyLookupOutputT;
	topOutput: XcalarApiTopOutputT;
	listXdfsOutput: XcalarApiListXdfsOutputT;
	sessionListOutput: XcalarApiSessionListOutputT;
	getQueryOutput: XcalarApiGetQueryOutputT;
	supportGenerateOutput: XcalarApiSupportGenerateOutputT;
	projectOutput: XcalarApiNewTableOutputT;
	getRowNumOutput: XcalarApiNewTableOutputT;
	udfAddUpdateOutput: XcalarApiUdfAddUpdateOutputT;
	udfGetOutput: UdfModuleSrcT;
	perNodeOpStatsOutput: XcalarApiPerNodeOpStatsT;
	opStatsOutput: XcalarApiOpStatsOutT;
	importRetinaOutput: XcalarApiImportRetinaOutputT;
	previewOutput: XcalarApiPreviewOutputT;
	exportRetinaOutput: XcalarApiExportRetinaOutputT;
	startFuncTestOutput: XcalarApiStartFuncTestOutputT;
	listFuncTestOutput: XcalarApiListFuncTestOutputT;
	executeRetinaOutput: XcalarApiNewTableOutputT;
	getConfigParamsOutput: XcalarApiGetConfigParamsOutputT;
	getLicenseOutput: XcalarApiGetLicenseOutputT;
	appRunOutput: XcalarApiAppRunOutputT;
	appReapOutput: XcalarApiAppReapOutputT;
	demoFileOutput: XcalarApiDemoFileOutputT;
	memoryUsageOutput: XcalarApiGetMemoryUsageOutputT;
	getIpAddrOutput: XcalarApiGetIpAddrOutputT;
	getNumNodesOutput: XcalarApiGetNumNodesOutputT;
	sessionGenericOutput: XcalarApiSessionGenericOutputT;
	sessionNewOutput: XcalarApiSessionNewOutputT;
	listDatasetUsersOutput: XcalarApiListDatasetUsersOutputT;
	logLevelGetOutput: XcalarApiLogLevelGetOutputT;
	keyListOutput: XcalarApiKeyListOutputT;
	getCurrentXemConfigOutput: XemClientConfigParamsT;
	listUserDatasetsOutput: XcalarApiListUserDatasetsOutputT;
	unionOutput: XcalarApiNewTableOutputT;
	targetOutput: XcalarApiTargetOutputT;
	synthesizeOutput: XcalarApiNewTableOutputT;
	getRetinaJsonOutput: XcalarApiGetRetinaJsonOutputT;
	getDatasetsInfoOutput: XcalarApiGetDatasetsInfoOutputT;
	archiveTablesOutput: XcalarApiDeleteDagNodeOutputT;
	sessionDownloadOutput: XcalarApiSessionDownloadOutputT;
	listTablesOutput: XcalarApiListTablesOutputT;
	selectOutput: XcalarApiNewTableOutputT;
	updateOutput: XcalarApiUpdateOutputT;
	cgroupOutput: XcalarApiCgroupOutputT;
	queryListOutput: XcalarApiQueryListOutputT;
	constructor(args?: {
		getVersionOutput?: XcalarApiGetVersionOutputT,
		statusOutput?: number,
		statOutput?: XcalarApiGetStatOutputT,
		listNodesOutput?: XcalarApiListDagNodesOutputT,
		makeResultSetOutput?: XcalarApiMakeResultSetOutputT,
		resultSetNextOutput?: XcalarApiResultSetNextOutputT,
		getTableMetaOutput?: XcalarApiGetTableMetaOutputT,
		indexOutput?: XcalarApiNewTableOutputT,
		loadOutput?: XcalarApiBulkLoadOutputT,
		getTableRefCountOutput?: XcalarApiGetTableRefCountOutputT,
		deleteDagNodesOutput?: XcalarApiDeleteDagNodeOutputT,
		joinOutput?: XcalarApiNewTableOutputT,
		statGroupIdMapOutput?: XcalarApiGetStatGroupIdMapOutputT,
		listDatasetsOutput?: XcalarApiListDatasetsOutputT,
		mapOutput?: XcalarApiNewTableOutputT,
		aggregateOutput?: XcalarApiAggregateOutputT,
		filterOutput?: XcalarApiNewTableOutputT,
		queryOutput?: XcalarApiQueryOutputT,
		queryStateOutput?: XcalarApiQueryStateOutputT,
		listTargetsOutput?: XcalarApiListExportTargetsOutputT,
		dagOutput?: XcalarApiDagOutputT,
		listFilesOutput?: XcalarApiListFilesOutputT,
		groupByOutput?: XcalarApiNewTableOutputT,
		listRetinasOutput?: XcalarApiListRetinasOutputT,
		getRetinaOutput?: XcalarApiGetRetinaOutputT,
		listParametersInRetinaOutput?: XcalarApiListParametersInRetinaOutputT,
		keyLookupOutput?: XcalarApiKeyLookupOutputT,
		topOutput?: XcalarApiTopOutputT,
		listXdfsOutput?: XcalarApiListXdfsOutputT,
		sessionListOutput?: XcalarApiSessionListOutputT,
		getQueryOutput?: XcalarApiGetQueryOutputT,
		supportGenerateOutput?: XcalarApiSupportGenerateOutputT,
		projectOutput?: XcalarApiNewTableOutputT,
		getRowNumOutput?: XcalarApiNewTableOutputT,
		udfAddUpdateOutput?: XcalarApiUdfAddUpdateOutputT,
		udfGetOutput?: UdfModuleSrcT,
		perNodeOpStatsOutput?: XcalarApiPerNodeOpStatsT,
		opStatsOutput?: XcalarApiOpStatsOutT,
		importRetinaOutput?: XcalarApiImportRetinaOutputT,
		previewOutput?: XcalarApiPreviewOutputT,
		exportRetinaOutput?: XcalarApiExportRetinaOutputT,
		startFuncTestOutput?: XcalarApiStartFuncTestOutputT,
		listFuncTestOutput?: XcalarApiListFuncTestOutputT,
		executeRetinaOutput?: XcalarApiNewTableOutputT,
		getConfigParamsOutput?: XcalarApiGetConfigParamsOutputT,
		getLicenseOutput?: XcalarApiGetLicenseOutputT,
		appRunOutput?: XcalarApiAppRunOutputT,
		appReapOutput?: XcalarApiAppReapOutputT,
		demoFileOutput?: XcalarApiDemoFileOutputT,
		memoryUsageOutput?: XcalarApiGetMemoryUsageOutputT,
		getIpAddrOutput?: XcalarApiGetIpAddrOutputT,
		getNumNodesOutput?: XcalarApiGetNumNodesOutputT,
		sessionGenericOutput?: XcalarApiSessionGenericOutputT,
		sessionNewOutput?: XcalarApiSessionNewOutputT,
		listDatasetUsersOutput?: XcalarApiListDatasetUsersOutputT,
		logLevelGetOutput?: XcalarApiLogLevelGetOutputT,
		keyListOutput?: XcalarApiKeyListOutputT,
		getCurrentXemConfigOutput?: XemClientConfigParamsT,
		listUserDatasetsOutput?: XcalarApiListUserDatasetsOutputT,
		unionOutput?: XcalarApiNewTableOutputT,
		targetOutput?: XcalarApiTargetOutputT,
		synthesizeOutput?: XcalarApiNewTableOutputT,
		getRetinaJsonOutput?: XcalarApiGetRetinaJsonOutputT,
		getDatasetsInfoOutput?: XcalarApiGetDatasetsInfoOutputT,
		archiveTablesOutput?: XcalarApiDeleteDagNodeOutputT,
		sessionDownloadOutput?: XcalarApiSessionDownloadOutputT,
		listTablesOutput?: XcalarApiListTablesOutputT,
		selectOutput?: XcalarApiNewTableOutputT,
		updateOutput?: XcalarApiUpdateOutputT,
		cgroupOutput?: XcalarApiCgroupOutputT,
		queryListOutput?: XcalarApiQueryListOutputT,
	});
}
declare class XcalarApiOutputHeaderT {
	status: number;
	elapsed: XcalarApiTimeT;
	log: string;
	constructor(args?: {
		status?: number,
		elapsed?: XcalarApiTimeT,
		log?: string,
	});
}
declare class XcalarApiOutputT {
	hdr: XcalarApiOutputHeaderT;
	outputResult: XcalarApiOutputResultT;
	constructor(args?: {
		hdr?: XcalarApiOutputHeaderT,
		outputResult?: XcalarApiOutputResultT,
	});
}
declare class XcalarApiWorkItemT {
	apiVersionSignature: number;
	api: number;
	input: XcalarApiInputT;
	userId: string;
	userIdUnique: number;
	origApi: number;
	sessionName: string;
	constructor(args?: {
		apiVersionSignature?: number,
		api?: number,
		input?: XcalarApiInputT,
		userId?: string,
		userIdUnique?: number,
		origApi?: number,
		sessionName?: string,
	});
}
declare class XcalarApiWorkItemResult {
	jobStatus: number;
	output: XcalarApiOutputT;
	constructor(args?: {
		jobStatus?: number,
		output?: XcalarApiOutputT,
	});
}

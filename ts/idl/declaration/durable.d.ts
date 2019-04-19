interface MetaInfDurable {
    version: number;
    TILookup: {[key: string]: TableDurable};
    statsCols: any;
    sqlcursor: number;
    tablePrefix: object;
    query: XcQueryDurable[]
}

interface UserInfoDurable {
    version: number;
    gDSObj: DSDurable;
    userpreference: UserPrefDurable;
}

interface SharedDSInfoDurable {
    version: number;
    DS: DSDurable;
    VersionId: number;
}

interface XcLogDurable {
    version?: number;
    title: string;
    options: any;
    sqlType?: SQLType;
    cli?: string;
    error?: string;
    timestamp?: number;
}

interface GenSettingOptionsDurable {
    hideDataCol: boolean;
    monitorGraphInterval: number;
    commitInterval: number;
    hideSysOps: boolean;
}

interface GenSettingsDurable {
    version: number;
    adminSettings: GenSettingOptionsDurable;
    xcSettings: GenSettingOptionsDurable;
}

interface UserPrefDurable {
    version: number;
    datasetListView: boolean;
    browserListView: boolean;
    logCollapsed: boolean;
    general: object;
    dsSortKey: string;
    dfAutoExecute: boolean;
    dfAutoPreview: boolean;
    dfProgressTips: boolean;
    dfConfigInfo: boolean;
}

interface WKBKDurable {
    version?: number;
    name: string;
    id: string;
    created?: number;
    modified?: number;
    jupyterFolder?: string;
    description?: string;
    noMeta?: boolean;
    resource?: boolean;
}

interface ProfileAggDurable {
    max: number | string;
    min: number | string;
    count: number | string;
    sum: number | string;
    average: number | string;
    sd: number | string;
}

interface ProfileStatsDurable {
    key: string;
    unsorted: boolean; // if columns is sorted or not
    zeroQuartile: number; // (optional): 0% row (first row)
    lowerQuartile: number; // (optional): 25% row
    median: number; // (optional): 50% row
    upperQuartile: number; // (optional): 75% row
    fullQuartile: number; // (optional): 100% row (last row)
}

interface ProfileBucketDurable {
    bucketSize: number; // size of the bucket
    table: string; // bucketing result table
    ascTable?: string; // asc sort of table
    descTable?: string; // desc sort of table
    colName: string; // column name
    max: number; // (integer) max count
    sum: number; // (integer) total row of table
    ztoa?: string; // buckting result table in z to a order
}

interface ProfileGroupbyDurable {
    isComplete: boolean | string;
    nullCount: number; // (integer) how many null values
    allNull: boolean; // if all values are null
    buckets: {[key: number]: ProfileBucketDurable} // a set of ProfileBucketInfo
}

interface ProfileDurable {
    version: number;
    id: string;
    colName: string;
    type: ColumnType;
    aggInfo: ProfileAggDurable;
    groupByInfo: ProfileGroupbyDurable;
    statsInfo: ProfileStatsDurable;
}

interface DSDurable {
    version?: number;
    id?: string;
    name?: string;
    user?: string
    fullName: string;
    parentId?: string;
    isFolder?: boolean;
    uneditable?: boolean;
    eles?: DSDurable[];
    totalChildren?: number;
    format?: string;
    size?: number;
    numEntries?: number;
    resultSetId?: string;
    fieldDelim?: string;
    lineDelim?: string;
    hasHeader?: boolean;
    moduleName?: string;
    funcName?: string;
    quoteChar?: string;
    skipRows?: number;
    advancedArgs?: {allowFileErrors: boolean, allowRecordErrors: boolean};
    error?: string;
    udfQuery?: object;
    targetName?: string;
    typedColumns?: {colType: ColumnType, colName: string}[];
    date?: number;
    numErrors?: number;
}

interface XcQueryDurable {
    version: number;
    sqlNum: number,
    time: number,
    elapsedTime: number,
    opTime: number,
    opTimeAdded: boolean,
    outputTableName: string,
    outputTableState: string | number,
    state: string | number,
    name?: string,
    fullName?: string,
    queryStr?: string,
    error?: string
}

interface KVVersionDurable {
    version: number;
    stripEmail?: boolean;
}
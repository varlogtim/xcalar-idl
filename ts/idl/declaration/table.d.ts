type TableId = string | number;

interface ColFuncDurable {
    version?: number;
    name: string;
    args?: any[];
}

interface ProgColDurable {
    version?: number;
    name: string;
    backName: string;
    immediate?: boolean;
    type: ColumnType;
    width?: number | string;
    sizedTo?: string;
    userStr?: string;
    format: ColFormat;
    textAlign?: ColTextAlign;
    sortedColAlias?: string;
    func: ColFuncDurable;
    knownType?: boolean;
    isNewCol?: boolean;
    isMinimized?: boolean;
}

interface TableDurable {
    version?: number;
    tableName: string;
    tableId: TableId;
    tableCols?: ProgColDurable[] | ProgCol[];
    status?: TableType;
    timeStamp?: number;
    highlightedCells?: object;
    resultSetCount?: number;
    resultSetId?: string;
    rowHeights?: any;
    modelingMode?: boolean;
    allImmediates?: boolean;
    icv?: string;
    complement?: string;
}
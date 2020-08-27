const FileType = {
    CSV: 'csv',
    JSON: 'json',
    JSONL: 'jsonl',
    PARQUET: 'parquet'
};
const FileTypeFilter = new Map([
    [FileType.CSV, ({type}) => {
        const validTypes = new Set(['csv']);
        return validTypes.has(`${type}`.toLowerCase());
    }],
    [FileType.JSON, ({type}) => {
        const validTypes = new Set(['json']);
        return validTypes.has(`${type}`.toLowerCase());
    }],
    [FileType.JSONL, ({type}) => {
        const validTypes = new Set(['json', 'jsonl']);
        return validTypes.has(`${type}`.toLowerCase());
    }],
    [FileType.PARQUET, ({type}) => {
        const validTypes = new Set(['parquet']);
        return validTypes.has(`${type}`.toLowerCase());
    }]
]);

const PUNCT = '\\w\\s\\-$_%#@()\\/\\{\\}\\&\\!,;\\<\\>\\.\\?\\+\\~\\|\\*\\='

const FileTypeNamePattern = new Map([
    [FileType.CSV, `re:^([${PUNCT}]+)\\.[cC][sS][vV](\\.[gG][zZ]|\\.[bB][zZ]2){0,1}$`],
    [FileType.JSON, `re:^([${PUNCT}]+)\\.[jJ][sS][oO][nN](\\.[gG][zZ]|\\.[bB][zZ]2){0,1}$`],
    [FileType.JSONL, `re:^([${PUNCT}]+)\\.[jJ][sS][oO][nN][lL]{0,1}(\\.[gG][zZ]|\\.[bB][zZ]2){0,1}$`],
    [FileType.PARQUET, `re:^([${PUNCT}]+)\\.[pP][aA][rR][qQ][uU][eE][tT]$`]
]);

const CSVHeaderOption = {
    USE: 'USE',
    IGNORE: 'IGNORE',
    NONE: 'NONE'
};

const MergePolicy = {
    SUPERSET: 'superset',
    EXACT: 'exact',
    UNION: 'union',
    TRAILING: 'trailing'
};

const MergePolicyHint = {
    SUPERSET: 'eg. Schemas [{A,B}, {A,L,M}, {A,C,B}] will be reduced to [{A,B,C},{A,L,M}]',
    EXACT: 'eg. Schemas [{A,B},{B,A},{C,D}] will be reduced to [{A,B},{C,D}]',
    UNION: 'eg. Schemas [{A,B},{A,L,M},{M,N}] is reduced to single schema {A,B,L,M,N}',
    TRAILING: 'eg. Schemas [{A,B},{A,L},{A,B,C}] will be reduced to [{A,B,C},{A,L}]'
};

function suggestParserType(file) {
    const checkList = [FileType.CSV, FileType.JSONL, FileType.PARQUET];
    const defaultType = FileType.CSV;

    for (const parserType of checkList) {
        const filter = FileTypeFilter.get(parserType) || (() => false);
        if (filter(file)) {
            return parserType;
        }
    }
    return defaultType;
}

class InputSerializationFactory {
    static createCSV({
        headerOption = CSVHeaderOption.USE,
        quoteEscapeChar = '"',
        recordDelimiter = '\n',
        fieldDelimiter = ',',
        quoteChar = '"',
        allowQuotedRecordDelimiter = false
    }) {
        return { CSV: {
            FileHeaderInfo: headerOption,
            QuoteEscapeCharacter: quoteEscapeChar,
            RecordDelimiter: recordDelimiter,
            FieldDelimiter: fieldDelimiter,
            QuoteCharacter: quoteChar,
            AllowQuotedRecordDelimiter: allowQuotedRecordDelimiter
        }};
    }

    static createJSON() {
        return { JSON: {
            Type: 'DOCUMENT'
        }};
    }

    static createJSONL() {
        return { JSON: {
            Type: 'LINES'
        }};
    }

    static createParquet() {
        return {
            Parquet: {}
        };
    }

    static getFileType(inputSerialization) {
        const { CSV, JSON, JSONL, Parquet } = inputSerialization || {};
        const types = new Set();
        if (CSV != null) {
            types.add(FileType.CSV);
        }
        if (JSON != null) {
            types.add(FileType.JSON);
        }
        if (JSONL != null) {
            types.add(FileType.JSONL);
        }
        if (Parquet != null) {
            types.add(FileType.PARQUET);
        }
        return types;
    }
}

const defaultInputSerialization = new Map([
    [FileType.CSV, InputSerializationFactory.createCSV({})],
    [FileType.JSON, InputSerializationFactory.createJSON()],
    [FileType.JSONL, InputSerializationFactory.createJSONL()],
    [FileType.PARQUET, InputSerializationFactory.createParquet()]
]);

const SchemaError = {
    INVALID_JSON: () => 'Invalid JSON format',
    NOT_ARRAY: () => 'Columns should be an array',
    EMPTY_ARRAY: () => 'Please define at least 1 column',
    NULL_COLUMN: () => 'Invalid column, column definition cannot be null',
    NO_ATTRIBUTE: (attrName) => `Missing attribute: "${attrName}"`,
    INVALID_VALUE: (attrName, value) => `Invalid value "${value}" for attribute "${attrName}"`,
    TOO_MANY_COLUMN: (numCol, limit) => `
        Current column count: (${numCol}). Please modify the schema to ensure column count is within the limit of ${limit}
    `,
    DUPE_COLUMN: (colName) => `Duplicated column name: ${colName}`
}

function assert(boolVal, genEx) {
    if (!boolVal) {
        throw genEx();
    }
}

function validateSchema(jsonSchema) {
    const { rowpath, columns } = jsonSchema || {};

    // Need rowpath
    assert(rowpath != null, () => SchemaError.NO_ATTRIBUTE('rowpath'));
    // Should be an array
    assert(Array.isArray(columns), SchemaError.NOT_ARRAY);
    // Array cannot be empty
    assert(columns.length > 0, SchemaError.EMPTY_ARRAY);
    // Number of columns limit
    const maxNumCols = 1000;
    assert(columns.length <= maxNumCols, () => SchemaError.TOO_MANY_COLUMN(columns.length, maxNumCols));

    const nameSet = new Set();
    for (const column of columns) {
        // Null check
        assert(column != null, SchemaError.NULL_COLUMN);

        const { name, type, mapping } = column;
        // Attribute check
        assert(name != null, () => SchemaError.NO_ATTRIBUTE('name'));
        assert(type != null, () => SchemaError.NO_ATTRIBUTE('type'));
        assert(mapping != null, () => SchemaError.NO_ATTRIBUTE('mapping'));
        // Value check
        assert(typeof name === 'string', () => SchemaError.INVALID_VALUE('name', name));
        assert(!nameSet.has(name), () => SchemaError.DUPE_COLUMN(name));
        assert(typeof type === 'string', () => SchemaError.INVALID_VALUE('type', type));
        assert(typeof mapping === 'string', () => SchemaError.INVALID_VALUE('mapping', mapping));

        nameSet.add(name);
    }
}

function validateSchemaString(strSchema) {
    let schema = null;

    // Check valid JSON
    try {
        schema = JSON.parse(strSchema);
    } catch(_) {
        throw SchemaError.INVALID_JSON();
    }

    validateSchema(schema);

    return schema;
}

function unionSchemas(columns) {
    const columnMap = new Map(columns.map((column) => [
        `${column.name}_${column.type}_${column.mapping}`,
        column
    ]));
    return columnMap.values();
}

export {
    FileType, FileTypeFilter, FileTypeNamePattern,
    InputSerializationFactory, defaultInputSerialization,
    CSVHeaderOption,
    suggestParserType,
    validateSchemaString, validateSchema,
    unionSchemas,
    MergePolicy,
    MergePolicyHint,
};

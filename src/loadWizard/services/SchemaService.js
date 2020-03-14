import { ExactSchemas } from '../utils/ExactSchemas';
import { SupersetSchemas } from '../utils/SupersetSchemas';
import { UnionSchema } from '../utils/UnionSchema';
import { TrailingSchemas } from '../utils/TrailingSchemas';

const { xcHelper, Xcrpc } = global;

const FileType = {
    CSV: 'csv',
    JSON: 'json',
    PARQUET: 'parquet'
};
const FileTypeFilter = new Map([
    [FileType.CSV, ({type}) => {
        const validTypes = new Set(['csv']);
        return validTypes.has(`${type}`.toLowerCase());
    }],
    [FileType.JSON, ({type}) => {
        const validTypes = new Set(['json', 'jsonl']);
        return validTypes.has(`${type}`.toLowerCase());
    }],
    [FileType.PARQUET, ({type}) => {
        const validTypes = new Set(['parquet']);
        return validTypes.has(`${type}`.toLowerCase());
    }]
]);
const FileTypeNamePattern = new Map([
    [FileType.CSV, '*.csv'],
    [FileType.JSON, '*.json'],
    [FileType.PARQUET, '*.parquet']
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
            Type: 'LINES'
        }};
    }

    static createParquet() {
        return {
            Parquet: {}
        };
    }

    static getFileType(inputSerialization) {
        const { CSV, JSON, Parquet } = inputSerialization || {};
        const types = new Set();
        if (CSV != null) {
            types.add(FileType.CSV);
        }
        if (JSON != null) {
            types.add(FileType.JSON);
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
    [FileType.PARQUET, InputSerializationFactory.createParquet()]
]);

class MergeFactory {
    constructor() {
        this._merger = new Map(this._init());
    }

    _init() {
        return [
            [ MergePolicy.EXACT, (schemas) => {
                const merge = new ExactSchemas();
                const [schemaMap, errorSchemas] = merge.getSchemas(schemas);

                return [
                    new Map(Object.entries(schemaMap).map(([name, schema]) => {
                        return [name, this._normalize(schema)];
                    })),
                    errorSchemas.map((s) => this._normalizeError(s))
                ];
            }],
            [ MergePolicy.SUPERSET, (schemas) => {
                const merge = new SupersetSchemas();
                const [schemaMap, errorSchemas] = merge.getSchemas(schemas);

                return [
                    new Map(Object.entries(schemaMap).map(([name, schema]) => {
                        return [name, this._normalize(schema)];
                    })),
                    errorSchemas.map((s) => this._normalizeError(s))
                ];
            }],
            [ MergePolicy.TRAILING, (schemas) => {
                const merge = new TrailingSchemas();
                for (const schema of schemas) {
                    merge.add(schema);
                }
                const [schemaMap, errorSchemas] = merge.getSchemas();

                return [
                    new Map(Object.entries(schemaMap).map(([name, schema]) => {
                        return [name, this._normalize(schema)];
                    })),
                    errorSchemas.map((s) => this._normalizeError(s))
                ];
            }],
            [ MergePolicy.UNION, (schemas) => {
                const merge = new UnionSchema();
                const [schemaMap, errorSchemas] = merge.getSchema(schemas);

                return [
                    new Map(Object.entries(schemaMap).map(([name, schema]) => {
                        return [name, this._normalize(schema)];
                    })),
                    errorSchemas.map((s) => this._normalizeError(s))
                ];
            }]
        ];
    }

    _normalizeError({ path, status }) {
        return {
            path: path,
            error: status
        };
    }

    _normalize({ path, schema }) {
        return {
            path: [...path],
            columns: schema.columnsList.map((c) => ({
                name: c.name,
                mapping: c.mapping,
                type: c.type
            }))
        };
    }

    get(mergePolicy) {
        return this._merger.get(mergePolicy);
    }
}
const mergeFactory = new MergeFactory();

class DiscoverWorker {
    constructor({
        mergePolicy, inputSerialization
    }) {
        this._mergePolicy = mergePolicy;
        this._inputSerialization = {...inputSerialization};

        this._discoveredFiles = new Map();
        this._schemas = new Map();
        this._errorFiles = new Map();
    }

    reset({
        mergePolicy, inputSerialization
    }) {
        if (mergePolicy != null) {
            this._schemas.clear();
            this._errorFiles.clear();
            this._mergePolicy = mergePolicy;
        }
        if (inputSerialization != null) {
            this.clear();
            this._inputSerialization = {...inputSerialization};
        }
    }

    // XXX TODO: Move this into xcrpc framework
    async _discover(paths, inputSerialization) {
        // Construct xcrpc request object
        const discoverRequest= new proto.xcalar.compute.localtypes.Schema.ListObjectSchemaRequest();
        discoverRequest.setNumObjects(paths.length);
        discoverRequest.setPathsList(paths);

        const inputSerializationObj = new proto.xcalar.compute.localtypes.Schema.InputSerialization();
        inputSerializationObj.setArgs(JSON.stringify(inputSerialization));
        discoverRequest.setInputSerializationArgs(inputSerializationObj);

        // Call xcrpc api
        const client = new Xcrpc.xce.XceClient(xcHelper.getApiUrl());
        const service = new Xcrpc.xce.DiscoverSchemasService(client);
        const response = await service.discoverSchemas(discoverRequest);

        // Parse response
        const result = response.getObjectSchemaList().map((objectSchema) => {
            const schema = objectSchema.getSchema();
            return {
                path: objectSchema.getPath(),
                success: objectSchema.getSuccess(),
                status: objectSchema.getStatus(),
                schema: {
                    numColumns: schema.getNumColumns(),
                    columnsList: schema.getColumnsList().map((c) => ({
                        name: c.getName(),
                        mapping: c.getMapping(),
                        type: c.getType()
                    }))
                }
            };
        });
        return result;
    }

    async discover(paths = []) {
        const filesNeedDiscover = paths.filter((path) => (!this._discoveredFiles.has(path)));

        // Discover schema
        const discoveredSchmas = await this._discover(filesNeedDiscover, this._inputSerialization);
        for (const discoveredSchama of discoveredSchmas) {
            this._discoveredFiles.set(discoveredSchama.path, discoveredSchama);
        }

        // Merge schema
        this.merge();
    }

    merge() {
        const merge = mergeFactory.get(this._mergePolicy);
        if (merge == null) {
            throw new Error('Merge type not supported:', this._mergePolicy);
        }
        const [schemas, errorFiles] = merge([...this._discoveredFiles.values()]);

        // Cache the result
        this._schemas = schemas;
        this._errorFiles = new Map(errorFiles.map(({ path, error }) => [path, error]));
    }

    getDiscoveredFiles() {
        return new Set(this._discoveredFiles.keys());
    }

    getSchemas() {
        return new Map([...this._schemas.entries()].map(([schemaName, {path, columns}]) => {
            return [
                schemaName,
                {
                    path: [...path],
                    columns: columns.map((c) => ({...c}))
                }
            ];
        }));
    }

    getErrorFiles() {
        return new Set(this._errorFiles.keys());
    }

    getError(fileId) {
        return this._errorFiles.get(fileId);
    }

    getErrors(fileIds = null) {
        if (fileIds == null) {
            return new Map(this._errorFiles);
        } else {
            return new Map([...this._errorFiles].filter(([fileId, _]) => fileIds.has(fileId)));
        }
    }

    clear() {
        this._discoveredFiles.clear();
        this._schemas.clear();
        this._errorFiles.clear();
    }
}

export {
    FileType, FileTypeFilter, FileTypeNamePattern,
    InputSerializationFactory, defaultInputSerialization,
    CSVHeaderOption,
    MergePolicy,
    DiscoverWorker
};
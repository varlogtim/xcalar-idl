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

const MergePolicyHint = {
    SUPERSET: 'eg. Schemas [{A,B}, {A,L,M}, {A,C,B}] will be reduced to [{A,B,C},{A,L,M}]',
    EXACT: 'eg. Schemas [{A,B},{B,A},{C,D}] will be reduced to [{A,B},{C,D}]',
    UNION: 'eg. Schemas [{A,B},{A,L,M},{M,N}] is reduced to single schema {A,B,L,M,N}',
    TRAILING: 'eg. Schemas [{A,B},{A,L},{A,B,C}] will be reduced to [{A,B,C},{A,L}]'
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
                if (schemas.length === 0) {
                    return [new Map(), []];
                }
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
                if (schemas.length === 0) {
                    return [new Map(), []];
                }
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
                if (schemas.length === 0) {
                    return [new Map(), []];
                }
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
                if (schemas.length === 0) {
                    return [new Map(), []];
                }
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

    /**
     * Restore the worker
     * @param {Map<string, {columns: Array<{name: string, mapping: string, type: string}>}>} discoveredFiles
     * @param {Map<string, string>} errorFiles
     */
    restore(discoveredFiles, errorFiles) {
        // const start = Date.now();
        for (const [path, { columns }] of discoveredFiles) {
            this._discoveredFiles.set(path, {
                path: path,
                success: true,
                status: '',
                schema: {
                    numColumns: columns.length,
                    columnsList: columns.map(({ name, mapping, type}) => ({
                        name: name,
                        mapping: mapping,
                        type: type
                    }))
                }
            });
        }

        for (const [path, errMsg] of errorFiles) {
            this._errorFiles.set(path, errMsg);
        }
        // const end = Date.now();
        // console.log(`Restore ${discoveredFiles.size} files in ${end - start} ms`);
    }

    // XXX TODO: Move this into xcrpc framework
    async _discover(paths, inputSerialization) {
        // Construct xcrpc request object
        const discoverRequest= new proto.xcalar.compute.localtypes.SchemaDiscover.SchemaDiscoverRequest();
        discoverRequest.setPathsList(paths);

        const inputSerializationObj = new proto.xcalar.compute.localtypes.SchemaDiscover.InputSerialization();
        inputSerializationObj.setArgs(JSON.stringify(inputSerialization));
        discoverRequest.setInputSerialization(inputSerializationObj);

        // Call xcrpc api
        const client = new Xcrpc.xce.XceClient(xcHelper.getApiUrl());
        const service = new Xcrpc.xce.SchemaDiscoverService(client);
        const response = await service.schemaDiscover(discoverRequest);

        // Parse response
        const result = response.getFileSchemasList().map((objectSchema) => {
            const schema = objectSchema.getSchema();
            return {
                path: objectSchema.getPath(),
                success: objectSchema.getSuccess(),
                status: objectSchema.getStatus(),
                schema: {
                    numColumns: schema.getColumnsList().length,
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
        const start = Date.now();
        const merge = mergeFactory.get(this._mergePolicy);
        if (merge == null) {
            throw new Error('Merge type not supported:', this._mergePolicy);
        }
        const [schemas, errorFiles] = merge([...this._discoveredFiles.values()]);

        // Cache the result
        this._schemas = schemas;
        this._errorFiles = new Map(errorFiles.map(({ path, error }) => [path, error]));
        const end = Date.now();
        console.log(`${this._mergePolicy}(${this._discoveredFiles.size}) took ${end - start} ms`);
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
    MergePolicyHint,
    DiscoverWorker
};
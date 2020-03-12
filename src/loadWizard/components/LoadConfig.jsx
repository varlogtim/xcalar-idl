import React from 'react';
import crypto from 'crypto';
import Path from 'path';
import SourceData from './SourceData';
import BrowseDataSource from './BrowseDataSource';
import DiscoverSchemas from './DiscoverSchemas';
import CreateTables from './CreateTables';
import * as S3Service from '../services/S3Service';
import * as SchemaService from '../services/SchemaService';
import * as SetUtils from '../utils/SetUtils';

const { Alert } = global;

/**
 * UI texts for this component
 */
const Texts = {
    stepNameSourceData: "Select Data Source",
    stepNameFilterData: "Browse Data Source",
    stepNameSchemaDiscover: "Discover Schemas",
    stepNameCreateTables: "Create Tables"
};

/**
 * Step enum/name definition
 */
const stepEnum = {
    SourceData: 'SourceData',
    FilterData: 'FilterData',
    SchemaDiscovery: 'SchemaDiscovery',
    CreateTables: 'CreateTables'
}

const FileTypeEnum = {
    CSV: 'csv',
    JSON: 'json',
    PARQUET: 'parquet'
}

const stepNames = new Map();
stepNames.set(stepEnum.SourceData, Texts.stepNameSourceData);
stepNames.set(stepEnum.FilterData, Texts.stepNameFilterData);
stepNames.set(stepEnum.SchemaDiscovery, Texts.stepNameSchemaDiscover);
stepNames.set(stepEnum.CreateTables, Texts.stepNameCreateTables);

function deleteEntry(setOrMap, key) {
    setOrMap.delete(key);
    return setOrMap;
}


class LoadConfig extends React.Component {
    constructor(props) {
        super(props);
        // Initialize state
        const {
            onStepChange
        } = props;
        const defaultBucket = '/';
        const defaultHomePath = '';
        const defaultFileType = FileTypeEnum.CSV;

        this.state = {
            currentStep: stepEnum.SourceData,

            // SourceData
            bucket: defaultBucket,
            homePath: defaultHomePath,
            fileType: defaultFileType,

            // BrowseDataSource
            browsePath: Path.join(defaultBucket, defaultHomePath),
            browseIsLoading: false,
            brwoseFileMap: new Map(),
            selectedFileDir: new Array(),

            // DiscoverSchemas
            discoverSchemaPolicy: SchemaService.MergePolicy.SUPERSET, // XXX TODO: UI
            discoverIsLoading: false,
            discoverFiles: new Map(), // Map<fileId, { fileId, fullPath, direcotry ... }
            discoverFileSchemas: new Map(),// Map<fileId, { name: schemaName, columns: [] }
            discoverCancelBatch: null, // () => {} Dynamic cancel function set by discoverAll
            discoverInProgressFileIds: new Set(), // Set<fileId>
            discoverFailedFiles: new Map(), // Map<fileId, errMsg>
            inputSerialization: SchemaService.defaultInputSerialization.get(defaultFileType),

            // CreateTable
            createInProgress: new Set(), // Set<schemaName>
            createFailed: new Map(), // Map<schemaName, errorMsg>
            createTables: new Map() // Map<schemaName, tableName>
        };

        // Hash the config for detecting config change
        this._initConfigHash = this._getConfigHash({
            selectedFileDir: this.state.selectedFileDir
        });

        // Event notification
        this._eventOnStepChange = onStepChange;

        // Instance members
        this._schemaWorker = new SchemaService.DiscoverWorker({
            mergePolicy: this.state.discoverSchemaPolicy,
            inputSerialization: { ...this.state.inputSerialization }
        });
    }

    async _createTableFromSchema(schemaName) {
        const schemaFileMap = this._createSchemaFileMap(this.state.discoverFileSchemas);
        const schemaInfo = schemaFileMap.get(schemaName);
        if (schemaInfo == null) {
            console.error('Non-existing Schema: ', schemaName);
            return;
        }

        // XXX TODO: Get table name from UI
        let tableName = "";
        try {
            const path = schemaInfo.path[0];
            tableName = this._getNameFromPath(path);
        } catch (e) {
            console.error(e);
            // when error, use schema name to create table name
            tableName = (schemaName + Math.random().toString(36).substring(2, 15)).toUpperCase();
        }
        // State: cleanup and +loading
        this.setState({
            createInProgress: this.state.createInProgress.add(schemaName),
            createFailed: deleteEntry(this.state.createFailed, schemaName),
            createTables: deleteEntry(this.state.createTables, schemaName)
        });

        try {
            const finalTableName = await S3Service.createTableFromSchema(
                tableName,
                schemaInfo.path,
                schemaInfo.columns,
                this.state.inputSerialization
            );
            // State: -loading + created
            this.setState({
                createInProgress: deleteEntry(this.state.createInProgress, schemaName),
                createTables: this.state.createTables.set(schemaName, finalTableName)
            });
        } catch(e) {
            // State: -loading + failed
            this.setState({
                createInProgress: deleteEntry(this.state.createInProgress, schemaName),
                createFailed: this.state.createFailed.set(schemaName, `${e.message || e.error || e}`),
            });
        } finally {
            // Fallback: -loading
            this.setState({
                createInProgress: deleteEntry(this.state.createInProgress, schemaName),
            });
        }

    }

    // XXX this is copied from DSConfig
    _getNameFromPath(path) {
        if (path.charAt(path.length - 1) === "/") {
            // remove the last /
            path = path.substring(0, path.length - 1);
        }

        let paths = path.split("/");
        let splitLen = paths.length;
        let name = paths[splitLen - 1];
        name = name.toUpperCase();
        // strip the suffix dot part and only keep a-zA-Z0-9.
        let category = PatternCategory.PTblFix;
        name = xcHelper.checkNamePattern(category,
            PatternAction.Fix, name.split(".")[0], "");

        if (!xcStringHelper.isStartWithLetter(name) && splitLen > 1) {
            // when starts with number
            let prefix = xcHelper.checkNamePattern(PatternCategory.Dataset,
                PatternAction.Fix, paths[splitLen - 2], "");
            if (xcStringHelper.isStartWithLetter(prefix)) {
                name = prefix + name;
            }
        }

        if (!xcStringHelper.isStartWithLetter(name)) {
            // if still starts with number
            name = "source" + name;
        }
        name = name.toUpperCase();
        return TblSource.Instance.getUniuqName(name);
    }

    async _discoverFileSchema(fileId) {
        const file = this.state.discoverFiles.get(fileId);
        if (file == null) {
            console.error('Discover unselected file:', file.fullPath);
            return;
        }

        // State: +loading
        this.setState({
            discoverInProgressFileIds: this.state.discoverInProgressFileIds.add(fileId),
            discoverFailedFiles: deleteEntry(this.state.discoverFailedFiles, fileId)
        });

        try {
            await this._schemaWorker.discover([file.fullPath]);
            if (this._schemaWorker.getErrorFiles().has(fileId)) {
                // State: -loading +failed
                this.setState({
                    discoverInProgressFileIds: deleteEntry(this.state.discoverInProgressFileIds, fileId),
                    discoverFailedFiles: this.state.discoverFailedFiles.set(fileId, 'Merge failed')
                });
            } else {
                const schemas = this._schemaWorker.getSchemas();
                const fileSchemaMap = new Map();
                for (const [schemaName, { path, columns }] of schemas) {
                    const schemaInfo = {
                        name: schemaName,
                        columns: columns.map((c) => ({...c}))
                    };
                    for (const filePath of path) {
                        fileSchemaMap.set(filePath, schemaInfo);
                    }
                }
                // State: -loading +discovered
                this.setState({
                    discoverInProgressFileIds: deleteEntry(this.state.discoverInProgressFileIds, fileId),
                    discoverFileSchemas: fileSchemaMap
                });
            }
        } catch(e) {
            // State: -loading +failed
            this.setState({
                discoverInProgressFileIds: deleteEntry(this.state.discoverInProgressFileIds, fileId),
                discoverFailedFiles: this.state.discoverFailedFiles.set(fileId, e.message || e)
            });
        } finally {
            // Fallback: -loading
            this.setState({
                discoverInProgressFileIds: deleteEntry(this.state.discoverInProgressFileIds, fileId)
            });
        }
    }

    async _discoverAllFileSchemas() {
        if (this.state.discoverCancelBatch != null) {
            return;
        }
        console.log('Discover All');

        let isCanceled = false;
        this.setState({
            discoverCancelBatch: () => {
                console.log('Cancel All');
                isCanceled = true;
            }
        });
        try {
            const {
                discoverFiles,
                discoverFileSchemas,
                discoverInProgressFileIds,
                discoverFailedFiles
            } = this.state;
            const batch = new Array();
            const batchSize = 5;
            for (const [fileId] of discoverFiles.entries()) {
                if (isCanceled) {
                    break;
                }
                if (discoverFileSchemas.has(fileId) ||
                    discoverInProgressFileIds.has(fileId) ||
                    discoverFailedFiles.has(fileId)
                ) {
                    continue;
                }
                batch.push(this._discoverFileSchema(fileId));
                if (batch.length >= batchSize) {
                    await waitForBatch(batch);
                }
            }
            await waitForBatch(batch);

            async function waitForBatch(batch) {
                while(batch.length > 0) {
                    await batch.pop();
                }
            }
        } finally {
            this.setState({
                discoverCancelBatch: null
            });
        }
    }

    /**
     *
     * @param {*} fileSchemaMap Map<fileId, { name: schemaName, columns: [] }
     * @returns Map<schemaName, { path: [], columns: [] }>
     */
    _createSchemaFileMap(fileSchemaMap) {
        const schemaMap = new Map();
        for (const [fileId, { name: schemaName, columns }] of fileSchemaMap) {
            let schemaInfo = schemaMap.get(schemaName);
            if (schemaInfo == null) {
                schemaInfo = { path: [], columns: columns };
                schemaMap.set(schemaName, schemaInfo);
            }
            schemaInfo.path.push(fileId);
        }
        return schemaMap;
    }

    _getConfigHash({ selectedFileDir }) {
        const str = JSON.stringify([...selectedFileDir]);
        return crypto.createHash('md5').update(str).digest('hex');
    }

    _changeStep(newStep) {
        this.setState({
            currentStep: newStep
        });

        this._eventOnStepChange(newStep);
    }

    _isConfigChanged() {
        const configHash = this._getConfigHash({
            selectedFilesDirs: this.state.selectedFilesDirs,
            schemas: this.state.schemas
        });
        return configHash !== this._initConfigHash;
    }

    _setBucket(bucket) {
        bucket = bucket.trim();
        const isBucketChanged = bucket === this.state.bucket;
        if (isBucketChanged) {
            if (this._isConfigChanged()) {
                // XXX TODO: unsaved changes, what should we do?
                console.log('Load config discarded');
            }
            this._resetBrowseResult();
        }
        this.setState({
            bucket: bucket
        });
    }

    _setPath(path) {
        path = path.trim();
        const isPathChanged = path === this.state.homePath;
        if (isPathChanged) {
            if (this._isConfigChanged()) {
                // XXX TODO: unsaved changes, what should we do?
                console.log('Load config discarded');
            }
            this._resetBrowseResult();
        }
        this.setState({
            homePath: path
        });
    }

    _resetBrowseResult(newFileType = null) {
        this.setState({
            selectedFileDir: new Array(),
            discoverFileSchemas: new Map(),
            discoverInProgressFileIds: new Set(),
            discoverFailedFiles: new Map(),
            createInProgress: new Set(),
            createFailed: new Map(),
            createTables: new Map()
        });
        let inputSerialization = this.state.inputSerialization;
        if (newFileType != null) {
            inputSerialization = SchemaService.defaultInputSerialization.get(newFileType);
            this.setState({
                inputSerialization: inputSerialization,
            });
        }
        return inputSerialization;
    }

    _setFileType(fileType) {
        this.setState({
            fileType: fileType,
        });
        const inputSerialization = this._resetBrowseResult(fileType);
        this._schemaWorker.reset({inputSerialization: inputSerialization});
    }

    _setInputSerialization(newOption) {
        this.setState({
            inputSerialization: newOption,
            discoverFileSchemas: new Map(),
            discoverInProgressFileIds: new Set(),
            discoverFailedFiles: new Map(),
            createInProgress: new Set(),
            createFailed: new Map(),
            createTables: new Map()
        });
        this._schemaWorker.reset({ inputSerialization: newOption });
    }

    async _browsePath(newFullPath) {
        try {
            this.setState({
                browsePath: newFullPath,
                browseIsLoading: true
            });

            const fileTypeFilter = SchemaService.FileTypeFilter.get(this.state.fileType);
            const fileMap = await S3Service.listFiles(Path.join(newFullPath, '/'), ({ directory, type}) => {
                return directory || fileTypeFilter({ type: type });
            });
            this.setState({
                brwoseFileMap: fileMap
            });
        } catch(e) {
            this._alert({
                title: 'Browse path failed',
                message: `${e.message || e.error || e}`
            });
            console.error(e);
            throw e;
        } finally {
            this.setState({
                browseIsLoading: false
            });
        }
    }

    _browseSelectFiles(fileIds) {
        const selectedFiles = [...this.state.selectedFileDir];
        for (const fileId of fileIds) {
            const fileObj = this.state.brwoseFileMap.get(fileId);
            if (fileObj == null) {
                console.error(`Selected file(${fileId}) not exist`);
                continue;
            }
            selectedFiles.push({...fileObj});
        }
        this.setState({
            selectedFileDir: selectedFiles
        });
    }

    _browseDeselectFiles(fileIds) {
        const selectedFile = this.state.selectedFileDir.filter((f) => (!fileIds.has(f.fileId)));
        this.setState({
            selectedFileDir: selectedFile
        });
    }

    async _flattenSelectedFiles() {
        try {
            this.setState({
                discoverIsLoading: true
            });
            const fileNamePattern = SchemaService.FileTypeNamePattern.get(this.state.fileType);
            const discoverFiles = await S3Service.flattenFileDir(this.state.selectedFileDir, fileNamePattern);

            // Sync discoverFileSchemas, discoverInProgressFileIds, discoverFailedFiles
            const removedFileIds = SetUtils.diff(this.state.discoverFiles.keys(), discoverFiles.keys());
            const discoverFileSchemas = this.state.discoverFileSchemas;
            const discoverInProgressFileIds = this.state.discoverInProgressFileIds;
            const discoverFailedFiles = this.state.discoverFailedFiles;
            for (const fileId of removedFileIds) {
                discoverFileSchemas.delete(fileId);
                discoverInProgressFileIds.delete(fileId);
                discoverFailedFiles.delete(fileId);
            }

            // Update state
            this.setState({
                discoverFiles: discoverFiles,
                discoverFileSchemas: discoverFileSchemas,
                discoverInProgressFileIds: discoverInProgressFileIds,
                discoverFailedFiles: discoverFailedFiles
            });
        } catch(e) {
            this._alert({
                title: 'Error',
                message: `${e.message || e.error || e}`
            });
            console.error(e);
            throw e;
        } finally {
            this.setState({
                discoverIsLoading: false
            });
        }
    }

    _alert({ title, message }) {
        try {
            Alert.show({
                title: title,
                msg: message,
                isAlert: true
            });
        } catch(_) {
            // Ignore the error
        }
    };

    render() {
        const screenName = stepNames.get(this.state.currentStep);
        const bucket = this.state.bucket;
        const homePath = this.state.homePath;
        const fileType = this.state.fileType;

        return (
            <div className="container cardContainer">
                <div className="cardHeader">
                    <header className="title">{screenName}</header>
                </div>
                {/* start of card main */}
                <div className="cardMain">
                    { (() => {
                        switch (this.state.currentStep) {
                            case stepEnum.SourceData:
                                return (<SourceData
                                    bucket={bucket}
                                    path = {homePath}
                                    fileType={fileType}
                                    onNextScreen={() => {
                                        try {
                                            this._changeStep(stepEnum.FilterData);
                                            this._browsePath(Path.join(this.state.bucket, this.state.homePath));
                                        } catch(_) {
                                            this._changeStep(stepEnum.SourceData);
                                        }
                                    }}
                                    onBucketChange={(newBucket) => { this._setBucket(newBucket); }}
                                    onPathChange={(newPath) => { this._setPath(newPath); }}
                                    onFileTypeChange={(newType) => { this._setFileType(newType); }}
                                />);
                            case stepEnum.FilterData:
                                return (<BrowseDataSource
                                    bucket={bucket}
                                    homePath={homePath}
                                    path={this.state.browsePath}
                                    isLoading={this.state.browseIsLoading}
                                    fileMapViewing={this.state.brwoseFileMap}
                                    selectedFileDir={this.state.selectedFileDir}
                                    onPathChange={(newPath) => { this._browsePath(newPath); }}
                                    onSelectFiles={(fileIds) => { this._browseSelectFiles(fileIds); }}
                                    onDeselectFiles={(fileIds) => { this._browseDeselectFiles(fileIds); }}
                                    onPrevScreen={() => { this._changeStep(stepEnum.SourceData); }}
                                    onNextScreen={() => {
                                        try {
                                            this._changeStep(stepEnum.SchemaDiscovery);
                                            this._flattenSelectedFiles();
                                        } catch(_) {
                                            this._changeStep(stepEnum.FilterData);
                                        }
                                    }}
                                />);
                            case stepEnum.SchemaDiscovery:{
                                const { discoverCancelBatch } = this.state;
                                const onClickDiscoverAll = discoverCancelBatch == null
                                    ? () => { this._discoverAllFileSchemas(); }
                                    : null;
                                return (<DiscoverSchemas
                                    inputSerialization={this.state.inputSerialization}
                                    isLoading={this.state.discoverIsLoading}
                                    discoverFiles={[...this.state.discoverFiles.values()]}
                                    fileSchemas={this.state.discoverFileSchemas}
                                    inProgressFiles={this.state.discoverInProgressFileIds}
                                    failedFiles={this.state.discoverFailedFiles}
                                    onDiscoverFile={(fileId) => { this._discoverFileSchema(fileId); }}
                                    onClickDiscoverAll={onClickDiscoverAll}
                                    onCancelDiscoverAll={discoverCancelBatch}
                                    onInputSerialChange={(newConfig) => { this._setInputSerialization(newConfig); }}
                                    onPrevScreen = {() => { this._changeStep(stepEnum.FilterData); }}
                                    onNextScreen = {() => { this._changeStep(stepEnum.CreateTables); }}
                                />);
                            }
                            case stepEnum.CreateTables: {
                                return (<CreateTables
                                    schemas={this._createSchemaFileMap(this.state.discoverFileSchemas)}
                                    fileMetas={this.state.discoverFiles}
                                    schemasInProgress={this.state.createInProgress}
                                    schemasFailed={this.state.createFailed}
                                    tables={this.state.createTables}
                                    onClickCreateTable={(schemaName) => { this._createTableFromSchema(schemaName); }}
                                    onPrevScreen = {() => { this._changeStep(stepEnum.SchemaDiscovery); }}
                                />);
                            }
                            default:
                                return null;
                        }
                    })()}
                </div>
                {/* end of card main */}
            </div>
        );
    }
}

export { LoadConfig, stepEnum };
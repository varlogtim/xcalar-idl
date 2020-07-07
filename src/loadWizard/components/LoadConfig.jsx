import React from 'react';
import crypto from 'crypto';
import SourceData from './SourceData';
import { BrowseDataSourceModal } from './BrowseDataSource';
import DiscoverSchemas from './DiscoverSchemas';
import CreateTables from './CreateTables';
import Details from './Details';
import * as S3Service from '../services/S3Service';
import * as SchemaService from '../services/SchemaService';
import * as SetUtils from '../utils/SetUtils';
import NavButtons from './NavButtons'
import getForensics from '../services/Forensics';
import * as Path from 'path';
import * as SchemaLoadService from '../services/SchemaLoadService'

const { Alert } = global;

/**
 * UI texts for this component
 */
const Texts = {
    stepNameSourceData: "Select Data Source",
    stepNameFilterData: "Browse Data Source",
    stepNameSchemaDiscover: "Discover Schemas",
    stepNameCreateTables: "Create Tables",
    navButtonLeft: 'Back',
    navButtonRight: 'Navigate to Notebook',
    navToNotebookHint: "Please create a table first",
    navButtonRight2: 'Create Table',
    CreateTableHint: 'Please discover schema first',
    ResetInDiscoverLoading: 'Cannot reset when selected files are loading.',
    ResetInDiscoverBatch: "Cannot reset when discovering schema, please cancel discover schema first.",
    ResetInCreating: 'Cannot reset when table is creating.'
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

const stepNames = new Map();
stepNames.set(stepEnum.SourceData, Texts.stepNameSourceData);
stepNames.set(stepEnum.FilterData, Texts.stepNameFilterData);
stepNames.set(stepEnum.SchemaDiscovery, Texts.stepNameSchemaDiscover);
stepNames.set(stepEnum.CreateTables, Texts.stepNameCreateTables);

function deleteEntry(setOrMap, key) {
    setOrMap.delete(key);
    return setOrMap;
}

function deleteEntries(setOrMap, keySet) {
    for (const key of keySet) {
        setOrMap.delete(key);
    }
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
        const defaultFileType = SchemaService.FileType.CSV;

        this.state = {
            currentStep: stepEnum.SourceData,

            // SourceData
            bucket: defaultBucket,
            homePath: defaultHomePath,
            fileType: defaultFileType,

            // BrowseDataSource
            browseShow: false,
            selectedFileDir: new Array(),

            // DiscoverSchemas
            discoverAppId: null,
            discoverFilesState: {
                page: 0,
                rowsPerPage: 20,
                count: 0,
                files: [],
                isLoading: false
            },
            discoverIsRunning: false,
            discoverProgress: 0,
            discoverCancelBatch: null, // () => {} Dynamic cancel function set by discoverAll
            discoverSchemaPolicy: SchemaService.MergePolicy.EXACT,
            discoverRateLimit: true,
            inputSerialization: SchemaService.defaultInputSerialization.get(defaultFileType),
            // XXX TODO: remove the following states
            discoverFiles: new Map(), // Map<fileId, { fileId, fullPath, direcotry ... }
            discoverFileSchemas: new Map(),// Map<fileId, { name: schemaName, columns: [] }
            discoverInProgressFileIds: new Set(), // Set<fileId>
            discoverFailedFiles: new Map(), // Map<fileId, errMsg>

            // CreateTable
            tableToCreate: new Map(), // Map<schemaName, tableName>, store a table name for user to update
            createTableState: {
                page: 0,
                rowsPerPage: 20,
                count: 0,
                schemas: [],
                isLoading: false,
            },
            createInProgress: new Map(), // Map<schemaName, tableName>
            createFailed: new Map(), // Map<schemaName, errorMsg>
            createTables: new Map(), // Map<schemaName, tableName>

            // Detail
            schemaDetailState: {
                isLoading: false,
                schema: null,
                error: null
            },
            discoverStatsState: {
                isLoading: false,
                numFiles: null,
                numSchemas: null,
                numFailed: null
            },
            showForensics: false,
            forensicsMessage: [],
            isForensicsLoading: false
        };

        this.metadataMap = new Map();

        // Hash the config for detecting config change
        this._initConfigHash = this._getConfigHash({
            selectedFileDir: this.state.selectedFileDir
        });

        // Event notification
        this._eventOnStepChange = onStepChange;

        this._fetchForensics = this._fetchForensics.bind(this);
        this._resetAll = this._resetAll.bind(this);
    }

    _fetchForensics(bucket, path) {
        const statusCallback = (state) => {
            this.setState({
                ...state
            });
        };
        getForensics(bucket, path, this.metadataMap, statusCallback);
    }

    _resetAll(element) {
        if (!this._validateResetAll(element)) {
            return;
        }
        const inputSerialization = this._resetBrowseResult();
        this.setState({
            currentStep: stepEnum.SourceData,
            schemaDetailState: {
                isLoading: false,
                schema: null,
                error: null
            }
        })
    }

    _validateResetAll(element) {
        let error = null;
        if (this.state.discoverIsRunning) {
            error = Texts.ResetInDiscoverLoading;
        } else if (this.state.discoverCancelBatch != null) {
            error = Texts.ResetInDiscoverBatch;
        } else if (this.state.createInProgress.size > 0) {
            error = Texts.ResetInCreating;
        }
        if (error) {
            const $el = $(element);
            StatusBox.show(error, $el);
            return false;
        } else {
            return true;
        }
    }

    async _publishDataCompTables(tables, publishTableName, dataflows) {
        const { discoverAppId } = this.state;
        const app = SchemaLoadService.getDiscoverApp(discoverAppId);

        const dataName = PTblManager.Instance.getUniqName(publishTableName.toUpperCase());
        const compName = PTblManager.Instance.getUniqName(publishTableName + '_ERROR');

        try {
            PTblManager.Instance.addLoadingTable(dataName);
            PTblManager.Instance.addLoadingTable(compName);

            // Publish tables
            const compHasData = await app.publishResultTables(
                tables,
                { data: dataName, comp: compName },
                dataflows
            )

            // XD table operations
            PTblManager.Instance.removeLoadingTable(dataName);
            PTblManager.Instance.removeLoadingTable(compName);
            PTblManager.Instance.addTable(dataName);
            if (compHasData) {
                PTblManager.Instance.addTable(compName);
            }

            return {
                table: dataName,
                complementTable: compHasData ? compName : null
            };

        } catch(e) {
            PTblManager.Instance.removeLoadingTable(dataName);
            PTblManager.Instance.removeLoadingTable(compName);
            throw e;
        }
    }

    async _createTableFromSchema(schemaName, tableName) {
        const { discoverAppId } = this.state;
        if (discoverAppId == null) {
            return;
        }
        const app = SchemaLoadService.getDiscoverApp(discoverAppId);
        if (app == null) {
            return;
        }

        // State: cleanup and +loading
        const createInProgress = this.state.createInProgress;
        createInProgress.set(schemaName, {table: tableName, message: ""});
        this.setState({
            createInProgress: createInProgress,
            createFailed: deleteEntry(this.state.createFailed, schemaName),
            createTables: deleteEntry(this.state.createTables, schemaName),
            tableToCreate: deleteEntry(this.state.tableToCreate, schemaName)
        });

        try {
            // track progress
            function convertProgress(progress, range) {
                const [start, end] = range;
                return Math.min(Math.ceil(progress / 100 * (end - start) + start), end);
            }

            // Get create table dataflow
            const query = await app.getCreateTableQuery(schemaName, (progress) => {
                this.setState((state) => {
                    const { createInProgress } = state;
                    createInProgress.set(schemaName, {
                        table: tableName,
                        message: `${convertProgress(progress, [0, 30])}%`
                    });
                    return {
                        createInProgress: createInProgress
                    };
                });
            });

            // Create data/comp session tables
            const tables = await app.createResultTables(query, (progress) => {
                this.setState((state) => {
                    const { createInProgress } = state;
                    createInProgress.set(schemaName, {
                        table: tableName,
                        message: `${convertProgress(progress, [30, 95])}%`
                    });
                    return {
                        createInProgress: createInProgress
                    };
                })
            });

            // Publish tables
            try {
                const result = await this._publishDataCompTables(tables, tableName, {
                    dataQueryComplete: query.dataQueryComplete,
                    compQueryComplete: query.compQueryComplete
                });

                // State: -loading + created
                this.setState({
                    createInProgress: deleteEntry(this.state.createInProgress, schemaName),
                    createTables: this.state.createTables.set(schemaName, {
                        table: result.table,
                        complementTable: result.complementTable
                    })
                });
            } finally {
                await Promise.all([
                    tables.load.destroy(),
                    tables.data.destroy(),
                    tables.comp.destroy()
                ]);
            }
        } catch(e) {
            let error = e.message || e.error || e;
            error = xcHelper.parseError(error);
            this.setState({
                createInProgress: deleteEntry(this.state.createInProgress, schemaName),
                createFailed: this.state.createFailed.set(schemaName, error),
            });
        }

    }

    async _getDiscoverStats() {
        const { discoverAppId } = this.state;
        if (discoverAppId == null) {
            return;
        }

        const app = SchemaLoadService.getDiscoverApp(discoverAppId);
        if (app == null) {
            return;
        }

        this.setState((state) => ({
            discoverStatsState: {
                isLoading: true,
                numFiles: null,
                numSchemas: null,
                numFailed: null
            }
        }));

        try {
            const successStats = await app.getDiscoverSuccessStats();
            const failStats = await app.getDiscoverFailStats();
            this.setState((state) => ({
                discoverStatsState: {
                    ...state.discoverStatsState,
                    numFiles: successStats.numFiles + failStats.numFiles,
                    numSchemas: successStats.numSchemas,
                    numFailed: failStats.numFiles
                }
            }))
        } catch(e) {
            console.error('getDiscoverStats error: ', e);
        } finally {
            this.setState((state) => ({
                discoverStatsState: {
                    ...state.discoverStatsState,
                    isLoading: false
                }
            }));
        }
    }

    // XXX this is copied from DSConfig
    _getNameFromPath(path, nameSet) {
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
            PatternAction.Fix, name.split(".")[0], "_");

        if (!xcStringHelper.isStartWithLetter(name) && splitLen > 1) {
            // when starts with number
            let folderName = paths[splitLen - 2];
            folderName = folderName.toUpperCase();
            let prefix = xcHelper.checkNamePattern(category,
                PatternAction.Fix, folderName, "_");
            if (xcStringHelper.isStartWithLetter(prefix)) {
                name = prefix + name;
            }
        }

        if (!xcStringHelper.isStartWithLetter(name)) {
            // if still starts with number
            name = "source" + name;
        }
        name = name.toUpperCase();
        return PTblManager.Instance.getUniqName(name, nameSet);
    }

    _convertSchemaMergeResult(schemas) {
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
        return fileSchemaMap;
    }

    async _fetchDiscoverFileData(page, rowsPerPage) {
        const { discoverAppId } = this.state;
        if (discoverAppId == null) {
            return;
        }
        const app = SchemaLoadService.getDiscoverApp(discoverAppId);
        if (app == null) {
            return;
        }

        this.setState((state) => ({
            discoverFilesState: {
                ...state.discoverFilesState,
                isLoading: true
            }
        }));
        try {
            const result = await app.getFileSchema(page, rowsPerPage);
            this.setState((state) => ({
                discoverFilesState: {
                    ...state.discoverFilesState,
                    page: result.page,
                    count: result.count,
                    files: result.files
                }
            }));
        } catch(e) {
            this._alert({
                title: 'Error loading discovered files',
                message: `${e.log || e.error || e}`
            });
        } finally {
            this.setState((state) => ({
                discoverFilesState: {
                    ...state.discoverFilesState,
                    isLoading: false
                }
            }));
        }
    }

    async _fetchDiscoverReportData(page, rowsPerPage) {
        const { discoverAppId } = this.state;
        if (discoverAppId == null) {
            return;
        }
        const app = SchemaLoadService.getDiscoverApp(discoverAppId);
        if (app == null) {
            return;
        }

        this.setState((state) => ({
            createTableState: {
                ...state.createTableState,
                isLoading: true
            }
        }));
        try {
            let allSchemas = [];
            let i = 0;
            while (true) {
                const result = await app.getReport(i, 100);
                if (result.schemas.length < 1) {
                    break;
                }
                allSchemas = allSchemas.concat(result.schemas);
                i ++;
            }
            this.setState((state) => ({
                createTableState: {
                    ...state.createTableState,
                    page: page,
                    count: allSchemas.length,
                    schemas: allSchemas
                }
            }));
        } catch(e) {
            console.error('Fetch report error: ', e);
        } finally {
            this.setState((state) => ({
                createTableState: {
                    ...state.createTableState,
                    isLoading: false
                }
            }));
        }
    }

    async _fetchSchemaDetail(schemaHash) {
        const { discoverAppId } = this.state;
        if (discoverAppId == null) {
            return;
        }
        const app = SchemaLoadService.getDiscoverApp(discoverAppId);
        if (app == null) {
            return;
        }

        this.setState({
            schemaDetailState: {
                isLoading: true, schema: null, error: null
            }
        });

        try {
            const detail = await app.getSchemaDetail(schemaHash);
            this.setState({
                schemaDetailState: {
                    schema: detail
                }
            });
        } catch(e) {
            this.setState((state) => ({
                schemaDetailState: {
                    ...state.schemaDetailState,
                    schema: null
                }
            }));
        } finally {
            this.setState((state) => ({
                schemaDetailState: {
                    ...state.schemaDetailState,
                    isLoading: false
                }
            }));
        }
    }

    async _fetchFailedSchema() {
        const { discoverAppId } = this.state;
        if (discoverAppId == null) {
            return;
        }
        const app = SchemaLoadService.getDiscoverApp(discoverAppId);
        if (app == null) {
            return;
        }

        this.setState({
            schemaDetailState: {
                isLoading: true, schema: null, error: null
            }
        });

        try {
            const error = await app.getDiscoverError();
            this.setState({
                schemaDetailState: {
                    error: error
                }
            });
        } catch(e) {
            this.setState((state) => ({
                schemaDetailState: {
                    ...state.schemaDetailState,
                    error: null
                }
            }));
        } finally {
            this.setState((state) => ({
                schemaDetailState: {
                    ...state.schemaDetailState,
                    isLoading: false
                }
            }));
        }
    }

    _extractPathInfo(pathInfo, fileType) {
        const { fullPath, directory } = pathInfo;
        if (directory) {
            // Recursively search files in the folder
            return {
                path: fullPath,
                filePattern: SchemaService.FileTypeNamePattern.get(fileType),
                isRecursive: true
            };
        } else {
            // Only match the single file selected
            const dirname = Path.join(Path.dirname(fullPath), '/');
            const basename = Path.basename(fullPath);
            return {
                path: dirname,
                filePattern: basename,
                isRecursive: false
            };
        }
    }

    async _discoverAllApp() {
        if (this.state.discoverCancelBatch != null) {
            return;
        }

        try {
            const stime = Date.now();

            const {
                fileType,
                inputSerialization,
                selectedFileDir,
                discoverRateLimit
            } = this.state;

            const { path: selectedPath, filePattern, isRecursive } = this._extractPathInfo(selectedFileDir[0], fileType);
            const discoverApp = SchemaLoadService.createDiscoverApp({
                path: selectedPath,
                filePattern: filePattern,
                inputSerialization: inputSerialization,
                isRecursive: isRecursive,
                isRateLimit: discoverRateLimit
            });

            this._resetDiscoverResult();
            this.setState(() => {
                return {
                    discoverIsRunning: true,
                    discoverProgress: 0,
                    discoverAppId: discoverApp.appId,
                    discoverCancelBatch: () => {
                        console.log('Cancel All');
                        discoverApp.cancel();
                    }
                };
            });

            // Init load app
            await discoverApp.init();

            // list file task
            const listFile = async () => {
                const table = await discoverApp.waitForFileTable(200);
                if (table != null) {
                    const { page, rowsPerPage } = this.state.discoverFilesState;
                    await this._fetchDiscoverFileData(page, rowsPerPage);
                }
                this.setState((state) => ({
                    discoverProgress: state.discoverProgress + 20
                }));
            };

            // schema task
            const schemaTask = async () => {
                const table = await discoverApp.waitForSchemaTable(200);
                if (table != null) {
                    const { page, rowsPerPage } = this.state.discoverFilesState;
                    await this._fetchDiscoverFileData(page, rowsPerPage);
                }
                this.setState((state) => ({
                    discoverProgress: state.discoverProgress + 60
                }));
            }

            // report task
            const reportTask = async () => {
                const table = await discoverApp.waitForReportTable(200);
                if (table != null) {
                    const { page, rowsPerPage } = this.state.createTableState;
                    await this._fetchDiscoverReportData(page, rowsPerPage);
                    await this._getDiscoverStats();
                }
                this.setState((state) => ({
                    discoverProgress: state.discoverProgress + 10
                }));
            }

            await Promise.all([
                discoverApp.run(),
                listFile(),
                schemaTask(),
                reportTask()
            ]);

            const etime = Date.now();
            console.log(`DiscoverAll took ${Math.ceil((etime - stime)/100)/10} seconds`);
        } catch(e) {
            this._alert({
                title: 'Discovery Error',
                message: `${e.log || e.error || e.message || e}`
            });
            this._resetDiscoverResult();
        } finally {
            this.setState({
                discoverIsRunning: false,
                discoverProgress: 100,
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
        const { selectedFileDir } = this.state;
        const configHash = this._getConfigHash({
            selectedFileDir: selectedFileDir
        });
        return configHash !== this._initConfigHash;
    }

    _setBucket(bucket) {
        bucket = bucket.trim();
        const isBucketChanged = bucket !== this.state.bucket;
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
        const isPathChanged = path !== this.state.homePath;
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
        this._resetDiscoverResult();
        this.setState({
            selectedFileDir: new Array(), // Clear selected files/folders, XXX TODO: in case file type changes, we can preserve the folders
        });
        let inputSerialization = this.state.inputSerialization;
        if (newFileType != null) {
            // Create the new input serialization according to the new fileType
            inputSerialization = SchemaService.defaultInputSerialization.get(newFileType);
            this.setState({
                inputSerialization: inputSerialization,
            });
        }
        return inputSerialization;
    }

    _resetDiscoverResult() {
        this.setState({
            discoverAppId: null,
            discoverFilesState: {
                page: 0,
                rowsPerPage: 20,
                count: 0,
                files: [],
                isLoading: false
            },
            discoverStatsState: {
                isLoading: false,
                numFiles: null,
                numSchemas: null,
                numFailed: null
            },
            tableToCreate: new Map(),
            createTableState: {
                page: 0,
                rowsPerPage: 20,
                count: 0,
                schemas: [],
                isLoading: false,
            },
            createInProgress: new Map(),
            createFailed: new Map(),
            createTables: new Map(),
            schemaDetailState: {
                isLoading: false,
                schema: null,
                error: null
            },
            showForensics: false,
            forensicsMessage: [],
            isForensicsLoading: false
        });
    }

    _setFileType(fileType) {
        if (fileType === this.state.fileType) {
            return false;
        }

        this.setState({
            fileType: fileType,
        });
        const inputSerialization = this._resetBrowseResult(fileType);
        return true;
    }

    _setSchemaPolicy(newPolicy) {
        //XXX TODO: This is temporarily disabled
        // Rewirte this once backend supports multiple algorithms
        return;
        const currentPolicy = this.state.discoverSchemaPolicy;
        if (currentPolicy === newPolicy) {
            return;
        }

        const schemaWorker = new SchemaService.DiscoverWorker({
            mergePolicy: newPolicy,
            inputSerialization: { ...this.state.inputSerialization }
        });
        schemaWorker.restore(this.state.discoverFileSchemas, this.state.discoverFailedFiles);

        // Put discovered files back to in-progress,
        // because we'll re-compare them based on the new merge policy
        const inProgressFiles = new Set(this.state.discoverFileSchemas.keys());

        this.setState({
            discoverSchemaPolicy: newPolicy,
            discoverFileSchemas: new Map(), // Clear discovered schemas
            discoverInProgressFileIds: inProgressFiles,
            discoverFailedFiles: new Map(),
            tableToCreate: new Map(),
            createInProgress: new Map(),
            createFailed: new Map(),
            createTables: new Map() // Clear tables
        })

        // Merge schemas is cpu intensive, so update the UI first
        setTimeout(() => {
            try {
                const { discoverFiles } = this.state;
                schemaWorker.merge();
                // Successful files
                const fileSchemaMap = this._convertSchemaMergeResult(schemaWorker.getSchemas());
                // Failed files
                const errorDetails = schemaWorker.getErrors();
                const failedFiles = new Map(
                    [...SetUtils.intersection(schemaWorker.getErrorFiles(), discoverFiles)]
                        .map((fileId) => [fileId, errorDetails.get(fileId)])
                );
                this.setState({
                    discoverFileSchemas: fileSchemaMap,
                    discoverFailedFiles: failedFiles
                });
            } catch(e) {
                this._alert({
                    title: 'Error',
                    message: 'Discover schemas failed'
                });
                console.error(e);
            } finally {
                this.setState({
                    discoverInProgressFileIds: new Set()
                })
            }
        }, 0);
    }

    _setInputSerialization(newOption) {
        this.setState({
            inputSerialization: newOption,
            discoverAppId: null,
            discoverFilesState: {
                page: 0,
                rowsPerPage: 20,
                count: 0,
                files: [],
                isLoading: false
            },
            tableToCreate: new Map(),
            createTableState: {
                page: 0,
                rowsPerPage: 20,
                count: 0,
                schemas: [],
                isLoading: false,
            },
            createInProgress: new Map(),
            createFailed: new Map(),
            createTables: new Map()
        });
    }

    _setRateLimit(isLimit) {
        this.setState({
            discoverRateLimit: isLimit
        });
    }

    _browseClose(selectedFileDir = null) {
        if (selectedFileDir == null) {
            this.setState({
                browseShow: false
            });
        } else {
            const currentSelection = this.state.selectedFileDir.map((v) => v.fullPath);
            const newSelection = selectedFileDir.map((v) => v.fullPath);
            const hasChange = SetUtils.diff(currentSelection, newSelection).size > 0 || SetUtils.diff(newSelection, currentSelection).size > 0;

            if (!hasChange) {
                // No change
                this.setState({
                    browseShow: false
                });
            } else {
                this._resetBrowseResult();
                this.setState({
                    browseShow: false,
                    selectedFileDir: selectedFileDir
                });
            }
        }
    }

    _browseOpen() {
        this.setState({
            browseShow: true
        });
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

    _navToNotebook() {
        HomeScreen.switch(UrlToTab.notebook);
    }

    render() {
        const {
            bucket,
            homePath,
            fileType,
            currentStep,
            selectedFileDir, // Output of Browse
            discoverAppId,
            discoverFilesState,
            discoverFileSchemas, // Output of Discover/Input of CreateTable
            browseShow,
            discoverIsRunning,
            discoverProgress,
            discoverCancelBatch,
        } = this.state;
        // const screenName = stepNames.get(currentStep);
        const onClickDiscoverAll = discoverCancelBatch == null
            ? () => { this._discoverAllApp(); }
            : null;

        const showBrowse = browseShow;
        const showDiscover = currentStep === stepEnum.SchemaDiscovery && selectedFileDir.length > 0;
        const showCreate = currentStep === stepEnum.CreateTables && !discoverIsRunning && discoverAppId != null;
        const fullPath = Path.join(bucket, homePath);
        const forensicsStats = this.metadataMap.get(fullPath);

        return (
            <div className="container cardContainer">
                {/* <div className="cardHeader">
                    <header className="title">{screenName}</header>
                </div> */}
                {/* start of card main */}
                <div className="cardMain">
                    <div className="leftPart">
                        <SourceData
                            bucket={bucket}
                            path = {homePath}
                            fileType={fileType}
                            onClickBrowse={() => { this._browseOpen(); }}
                            onBucketChange={(newBucket) => { this._setBucket(newBucket); }}
                            onPathChange={(newPath) => { this._setPath(newPath); }}
                            onFileTypeChange={(newType) => {
                                if (this._setFileType(newType)) {
                                    if (currentStep === stepEnum.SchemaDiscovery || currentStep === stepEnum.CreateTables) {
                                        this._browseOpen();
                                    }
                                }
                            }}
                            isForensicsLoading={this.state.isForensicsLoading}
                            fetchForensics={this._fetchForensics}
                            canReset={showDiscover || showCreate}
                            onReset={this._resetAll}
                        />
                        {
                            showBrowse ? <BrowseDataSourceModal
                                bucket={bucket}
                                homePath={homePath}
                                fileType={fileType}
                                selectedFileDir={selectedFileDir}
                                onPathChange={(newPath) => {
                                    this.setState({
                                        homePath: newPath.trim()
                                    });
                                }}
                                onCancel={() => { this._browseClose(); }}
                                onDone={(selectedFileDir) => {
                                    try {
                                        this._browseClose(selectedFileDir);
                                        // this._flattenSelectedFiles(selectedFileDir);
                                        this._changeStep(stepEnum.SchemaDiscovery);
                                    } catch(_) {
                                        // Do nothing
                                    }
                                }}
                            /> : null
                        }
                        {
                            showDiscover ? <DiscoverSchemas
                                inputSerialization={this.state.inputSerialization}
                                schemaPolicy={this.state.discoverSchemaPolicy}
                                rateLimit={this.state.discoverRateLimit}
                                isLoading={discoverIsRunning}
                                progress={discoverProgress}
                                discoverFilesProps={{
                                    ...discoverFilesState,
                                    onLoadData: (p, rpp) => this._fetchDiscoverFileData(p, rpp)
                                }}
                                onClickDiscoverAll={onClickDiscoverAll}
                                onCancelDiscoverAll={discoverCancelBatch}
                                onInputSerialChange={(newConfig) => { this._setInputSerialization(newConfig); }}
                                onSchemaPolicyChange={(newPolicy) => { this._setSchemaPolicy(newPolicy); }}
                                onRateLimitChange={(isLimit) => { this._setRateLimit(isLimit); }}
                                onShowSchema={(schema) => { this.setState((state) => ({
                                    schemaDetailState: {
                                        isLoading: false,
                                        schema: schema,
                                        error: null
                                    }
                                }))}}
                            >
                            </DiscoverSchemas> : null
                        }
                        {(() => {
                            if (!showCreate) {
                                return null;
                            }
                            const schemas = this.state.createTableState.schemas;
                            // XXX TODO: Need a new approach to generate default table names,
                            // once the pagination is totally moved to backend,
                            // which means XD doesn't maintain the full list of files discovered
                            const nameSet = new Set();
                            for (const schemaInfo of schemas) {
                                const { schema, files } = schemaInfo;
                                if (!this.state.tableToCreate.has(schema.hash)) {
                                    const defaultTableName = this._getNameFromPath(files.maxPath, nameSet);
                                    nameSet.add(defaultTableName);
                                    this.state.tableToCreate.set(schema.hash, defaultTableName);
                                }
                            }
                            return (
                                <CreateTables
                                    {...this.state.createTableState}
                                    schemasInProgress={this.state.createInProgress}
                                    schemasFailed={this.state.createFailed}
                                    tablesInInput={this.state.tableToCreate}
                                    tables={this.state.createTables}
                                    onTableNameChange={(schemaName, newTableName) => {
                                        this.state.tableToCreate.set(schemaName, newTableName);
                                        this.setState({tableToCreate: this.state.tableToCreate});
                                    }}
                                    onFetchData={(p, rpp) => { this._fetchDiscoverReportData(p, rpp)}}
                                    onClickCreateTable={(schemaName, tableName) => { this._createTableFromSchema(schemaName, tableName); }}
                                    onPrevScreen = {() => { this._changeStep(stepEnum.SchemaDiscovery); }}
                                    onLoadSchemaDetail = {(schemaHash) => { this._fetchSchemaDetail(schemaHash); }}
                                    onLoadFailureDetail = {() => { this._fetchFailedSchema(); }}
                                >
                                    <div className="header">{Texts.stepNameCreateTables}</div>
                                </CreateTables>
                            );
                        })()}
                    </div> {/* end of left part */}
                    <Details
                        schemaDetail={this.state.schemaDetailState}
                        discoverStats={this.state.discoverStatsState}
                        selectedFileDir={this.state.selectedFileDir}
                        discoverFileSchemas={this.state.discoverFileSchemas}
                        showForensics={this.state.showForensics}
                        forensicsMessage={this.state.forensicsMessage}
                        forensicsStats={forensicsStats}
                    />
                </div>{/* end of card main */}
                <div className="cardBottom">
                     { showDiscover ?
                            <NavButtons
                                right={{
                                    label: Texts.navButtonRight2,
                                    disabled: discoverIsRunning || discoverAppId == null,
                                    tooltip: discoverIsRunning || discoverAppId == null ? Texts.CreateTableHint : "",
                                    onClick: () => {
                                        this._changeStep(stepEnum.CreateTables);
                                        const { page, rowsPerPage } = this.state.createTableState;
                                        this._fetchDiscoverReportData(page, rowsPerPage);
                                    }
                                }}
                            /> : null
                    }
                    {showCreate ?
                        <NavButtons
                            left={{
                                label: Texts.navButtonLeft,
                                onClick: () => {
                                    this._changeStep(stepEnum.SchemaDiscovery);
                                }
                            }}
                            right={{
                                label: Texts.navButtonRight,
                                classNames: ["btn-secondary", "autoWidth"],
                                disabled: this.state.createTables.size === 0,
                                tooltip: this.state.createTables.size === 0 ? Texts.navToNotebookHint : "",
                                onClick: this.state.createTables.size === 0 ? null : () => {
                                    this._navToNotebook();
                                }
                            }}
                        /> : null
                    }
                </div>
            </div>
        );
    }
}

export { LoadConfig, stepEnum };

import Path from 'path';
import React from "react";
import NavButtons from '../NavButtons'
import SelectedFilesArea from "./SelectedFilesArea"
import * as Modal from './Modal'
import * as SchemaService from '../../services/SchemaService'
import * as S3Service from '../../services/S3Service'
import getForensics from '../../services/Forensics';
import FileBrowserTable from './FileBrowserTable'
import LoadingText from '../../../components/widgets/LoadingText';
import { Rnd } from "react-rnd";
import {
    PieChart, Pie, Cell, Label, ResponsiveContainer
} from 'recharts';

const typeList = {
    "JSON": "#00cf18",
    "CSV": "#4287f5",
    "PARQUET": "#002483",
    "DIRECTORY": "#888",
    "UNSUPPORTED": "#BBB",
};

const Texts = {
    title: "Browse Data Source",
    loading: "Loading ...",
    navButtonLeft: 'Cancel',
    navButtonRight: 'Done',
    updateForensics: 'Updating ...',
    getForensics: 'Get Directory Info'
};

function getSelectedIdsForCurrentView(fileMapViewing, selectedFiles) {
    const validIds = new Set(fileMapViewing.keys());
    if (validIds.size === 0) {
        return new Set();
    }

    const selectedIds = new Set();
    for (const { fileId } of selectedFiles) {
        if (validIds.has(fileId)) {
            selectedIds.add(fileId);
            if (validIds.size <= selectedIds.size) {
                break;
            }
        }
    }
    return selectedIds;
}

/**
 * Props:
 *          bucket, // string
            homePath, // string
            fileType, // SchemaService.FileType
            selectedFileDir, // Array<FileObject>
            onDone, // (Array<FileObject>) => void
            onCancel,

 */
class BrowseDataSource extends React.Component {
    constructor(props) {
        super(props);

        const { bucket, homePath, selectedFileDir } = props;

        this.metadataMap = new Map();
        this.state = {
            isLoading: true,
            path: Path.join(bucket, homePath),
            fileMapViewing: new Map(),
            selectedFileDir: selectedFileDir.map((v) => ({...v})),
            loadingFiles: new Set(),
            showForensics: false,
            forensicsMessage: [],
            isForensicsLoading: false,
            forensicsPath: ""
        }
    }

    async componentDidMount() {
        // browsePath
        const success = await this._browsePath(this.state.path, this.props.fileType);
        if (!success) {
            this.props.onCancel();
        }
    }

    async _browsePath(newFullPath, fileType) {
        try {
            this.setState({
                isLoading: true,
                path: newFullPath
            });
            let homePath = newFullPath.slice(this.props.bucket.length);
            this.props.onPathChange(homePath);
            // const fileTypeFilter = SchemaService.FileTypeFilter.get(fileType);
            // const fileMap = await S3Service.listFiles(Path.join(newFullPath, '/'), ({ directory, type}) => {
            //     return directory || fileTypeFilter({ type: type });
            // });
            const fileMap = await S3Service.listFiles(Path.join(newFullPath, '/'), this.props.connector);

            if (this.props.homePath && !newFullPath.endsWith(this.props.homePath)) {
                // navigated away while files were loading
                return false;
            }
            for (const [key, value] of fileMap) {
                if (this.state.loadingFiles.has(key)) {
                    value.isLoading = true;
                }
            }
            if (!newFullPath.startsWith("/")) {
                newFullPath = "/" + newFullPath;
            }
            if (newFullPath.endsWith("/")) {
                newFullPath = newFullPath.slice(0, -1);
            }
            this.state.loadingFiles.forEach((val) => {
                if (Path.dirname(val) === newFullPath && !fileMap.has(val)) {
                    fileMap.set(val, {
                        directory: false,
                        fileId: val,
                        fullPath: val,
                        name: Path.basename(val),
                        sizeInBytes: 0,
                        targetName: this.props.connector,
                        type: "",
                        isLoading: true
                    });
                }
            })

            this.setState({
                // cause a reset of fileBrowser sortedList
                isLoading: true
            });
            this.setState({
                path: newFullPath,
                fileMapViewing: fileMap,
                isLoading: false
            });

            return true;
        } catch(e) {
            Alert.show({
                title: 'Browse path failed',
                msg: `${e.message || e.log || e.error || e}`,
                isAlert: true
            });
            console.error(e);
            return false;
        }
    }

    _refreshPath() {
        this._browsePath(this.state.path);
    }

    _selectFiles(newSelectedFiles) {
        const { selectedFileDir, fileMapViewing } = this.state;
        const selectedFiles = [];
        for (const newSelectedFile of newSelectedFiles) {
            let newSelectedFileId = newSelectedFile.fileId;
            const fileObj = fileMapViewing.get(newSelectedFileId);
            if (fileObj == null) {
                console.error(`Selected file(${newSelectedFileId}) not exist`);
                continue;
            }
            selectedFiles.push({...fileObj});
        }
        this.setState({
            selectedFileDir: selectedFiles
        });
        this.props.setSelectedFileDir(selectedFiles);
    }


    _getNumSelected() {
        return this.state.selectedFileDir.length;
    }

    _deselectFiles(files) {
        const fileIds = new Set();
        files.forEach((f) => {
            fileIds.add(f.fileId);
        });
        const selectedFiles = this.state.selectedFileDir.filter((f) => {
            return (!fileIds.has(f.fileId));
        });
        this.setState({
            selectedFileDir: selectedFiles
        });
        this.props.setSelectedFileDir(selectedFiles);
    }

    _addTempFile(fileName, path) {
        const fileMapViewing = this.state.fileMapViewing;
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        if (path.endsWith("/")) {
            path = path.slice(0, -1)
        }

        fileMapViewing.set(path + "/" + fileName, {
            directory: false,
            fileId: path + "/" + fileName,
            fullPath: path + "/" + fileName,
            name: fileName,
            sizeInBytes: 0,
            targetName: this.props.connector,
            type: "",
            isLoading: true
        });
        this.setState({
            isLoading: true
        });
        this.state.loadingFiles.add(path + "/" + fileName);
        this.setState({
            isLoading: false,
            fileMapViewing: fileMapViewing,
            loadingFiles: this.state.loadingFiles
        });
    }

    _removeFile(filePath) {
        const fileMapViewing = this.state.fileMapViewing;
        fileMapViewing.delete(filePath);
        this.setState({
            isLoading: true
        });
        this.state.loadingFiles.delete(filePath);
        const selectedFiles = this.state.selectedFileDir.filter(f => {
            return filePath !== f.fileId;
        });
        if (selectedFiles.length !== this.state.selectedFileDir) {
            this.setState({
                selectedFileDir: selectedFiles
            });
            this.props.setSelectedFileDir(selectedFiles);
        }
        this.setState({
            isLoading: false,
            fileMapViewing: fileMapViewing,
            loadingFiles: this.state.loadingFiles,
        });
    }

    _toggleFileLoading(filePath, isLoading) {
        const fileMapViewing = this.state.fileMapViewing;
        let file = fileMapViewing.get(filePath);
        // toggle this.state.isLoading to trigger rerender
        if (file) {
            file.isLoading = isLoading;
            this.setState({
                isLoading: true
            });
            if (isLoading) {
                this.state.loadingFiles.add(filePath);
            } else {
                this.state.loadingFiles.delete(filePath);
            }

            this.setState({
                isLoading: false,
                fileMapViewing: fileMapViewing,
                loadingFiles: this.state.loadingFiles
            });
        } else if (!isLoading) {
            this.state.loadingFiles.delete(filePath);
            this.setState({
                isLoading: true
            });
            this.setState({
                isLoading: false,
                loadingFiles: this.state.loadingFiles
            });
        }
    }

    _fetchForensics(path) {
        const statusCallback = (state) => {
            this.setState({
                ...state
            });
        };
        const { bucket } = this.props;
        this.setState({
            forensicsPath: path
        });
        if (path.startsWith(bucket)) {
            path = path.slice(bucket.length);
        }

        getForensics(bucket, path, this.metadataMap, statusCallback);
    }

    render() {
        const {
            bucket, // string
            homePath, // string
            fileType, // SchemaService.FileType
            connector,
        } = this.props;

        const {
            isLoading,
            path,
            fileMapViewing,
            selectedFileDir
        } = this.state;

        let rootFullPath = Path.join(bucket);
        if (rootFullPath.startsWith("/")) {
            rootFullPath = rootFullPath.slice(1)
        }
        if (rootFullPath.endsWith("/")) {
            rootFullPath = rootFullPath.slice(0, -1)
        }
        let currentFullPath = path;
        if (currentFullPath.startsWith("/")) {
            currentFullPath = currentFullPath.slice(1)
        }
        if (currentFullPath.endsWith("/")) {
            currentFullPath = currentFullPath.slice(0, -1)
        }
        const displayFullPath = currentFullPath + "/";
        const forensicsStats = this.metadataMap.get(this.state.forensicsPath);
        let upFolderClass = "icon xi-upload-folder xc-icon-action upFolderIcon";
        if (rootFullPath === currentFullPath) {
            upFolderClass += " xc-disabled";
        }


        return (
            <div className="browseDataSourceScreen">
                <div className="fileBrowserPath">
                    <i className={upFolderClass}
                        data-toggle="tooltip"
                        data-placement="top"
                        data-container="body"
                        data-original-title="Go to parent directory"
                        onClick={() => {
                            if (rootFullPath === currentFullPath) {
                                return;
                            }
                            const parentPath = Path.dirname(currentFullPath);
                            this._browsePath(parentPath, fileType);
                        }}>
                    </i>
                    <input value={displayFullPath} readOnly></input>
                </div>

                <div className="fileListTableArea">

                    <div className="fileListTableWrap">
                    {isLoading ? <LoadingText className="loadingText">Loading</LoadingText> :
                        (
                        <FileBrowserTable
                            currentFullPath={currentFullPath}
                            fileMap={fileMapViewing}
                            selectedIds={getSelectedIdsForCurrentView(fileMapViewing, selectedFileDir)}
                            onPathChange={(newFullPath) => { this._browsePath(newFullPath, fileType); }}
                            onSelect={(files) => {
                                // if (this._getNumSelected() + files.size > 1) {
                                //     Alert.show({
                                //         title: 'Error',
                                //         msg: 'Only one file or folder can be selected',
                                //         isAlert: true
                                //     });
                                // } else {
                                //     this._selectFiles(files);
                                // }
                                this._selectFiles(files);
                            }}
                            onDeselect={(files) => { this._deselectFiles(files); }}
                            onInfoClick={(path) => { this._fetchForensics(path); }}
                            fileType={fileType}
                            // canUpload={this.props.connector === DSTargetManager.getPrivateS3Connector()}
                            canUpload={false}
                            addTempFile={(fileName, path) => {this._addTempFile(fileName, path)}}
                            removeFile={(filePath) => {this._removeFile(filePath)}}
                            toggleFileLoading={(filePath, isLoading) => {this._toggleFileLoading(filePath, isLoading)}}
                            refreshPath={() => {this._refreshPath()}}
                        /> )
                    }
                    </div>
                    <Rnd
                        className="rightAreaResizable"
                        default={{width: 300}}
                        minWidth={100}
                        maxWidth={"50%"}
                        bounds="parent"
                        disableDragging={true}
                        resizeHandleWrapperClass="resizeHandles"
                        enableResizing={{ top:false, right:false, bottom:false, left:true, topRight:false, bottomRight:false, bottomLeft:false, topLeft:false }}
                    >
                        <div className="rightArea">
                            {this.state.showForensics ?
                                <Rnd
                                    bounds="parent"
                                    disableDragging={true}
                                    resizeHandleWrapperClass="resizeHandles"
                                    enableResizing={{ top:false, right:false, bottom:true, left:false, topRight:false, bottomRight:false, bottomLeft:false, topLeft:false }}
                                >
                                    <ForensicsContent
                                        path={this.state.forensicsPath}
                                        isShow={ this.state.showForensics }
                                        stats={ forensicsStats }
                                        message={ this.state.forensicsMessage }
                                    />
                                </Rnd> : null
                            }
                            <SelectedFilesArea
                                bucket={bucket}
                                selectedFileDir={selectedFileDir}
                                onDeselect={(files) => { this._deselectFiles(files); }}
                            />
                        </div>

                        </Rnd>
                </div>
            </div>
        );
    }
}

/**
 * Pure Component: forensics information
 * @param {*} props
 */
function ForensicsContent(props) {
    const {
        isShow = false,
        message = [],
        stats,
        path = ""
    } = props || {};

    let pieCharts = null;
    if (stats && Object.keys(stats).length) {
         // TODO need better stats for pie charts
        // pieCharts = <React.Fragment>
        //                 <div className="pieHeader">{path}</div>
        //                 <BucketChart stats={stats} />
        //             </React.Fragment>;
        pieCharts = <React.Fragment>
                        <div className="pieHeader">{path}</div>
                        <pre>{JSON.stringify(stats, null, '  ')}</pre>
                    </React.Fragment>;
    }

    if (isShow) {
        return (
            <div className="forensicsContent">
                {message.length ?
                    <div className="forensicMessages">{ message.map((m, i) => (<div key={i}>{m}</div>)) }</div>
                    : null
                }
                {pieCharts}
            </div>
        );
    } else {
        return null;
    }
}


function BrowseDataSourceModal(props) {
    const [selectedFiles, setSelectedFileDir] = React.useState(props.selectedFileDir);
    const [fileNamePattern, setFileNamePattern] = React.useState(props.fileNamePattern);
    return (
        <Modal.Dialog id="fileBrowserModal">
            <Modal.Header onClose={props.onCancel}>{Texts.title}</Modal.Header>
            <Modal.Body>
                <BrowseDataSource {...props} setSelectedFileDir={setSelectedFileDir}  onFileNamePatternChange={setFileNamePattern}/>
            </Modal.Body>
            <Modal.Footer>
                <NavButtons
                    left={{ label: Texts.navButtonLeft, onClick: () => { props.onCancel() } }}
                    right={{
                        label: Texts.navButtonRight,
                        onClick: () => { props.onDone(selectedFiles, fileNamePattern) } // XXX TODO: add regex inputbox
                    }}
                />
            </Modal.Footer>
        </Modal.Dialog>
    );
}

function BucketChart({stats}) {
    const typeCount = {};
    const typeSize = {};
    const chartData = [];
    for (const file in stats.type) {
        let fileType = file.toUpperCase();
        if (!(fileType in typeList)) {
            fileType = "UNSUPPORTED";
        }
        if (fileType in typeCount) {
            typeCount[fileType] += stats.type[file];
        } else {
            typeCount[fileType] = stats.type[file];
        }

    }

    for (const [type, count] of Object.entries(typeCount)) {
        chartData.push({
            name: type,
            value: count
        });
    }

    return (
        <div className="chartArea">
            <ResponsiveContainer height={200} width="100%">
                <PieChart height={200}>
                    <Pie
                        dataKey="value"
                        isAnimationActive={false}
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        outerRadius="50%"
                        fill="#8884d8"
                        label={({name, value}) => name + ': ' + value.toLocaleString()}
                    >
                        {/* <Label position="top">Count</Label> */}
                        {
                            chartData.map((entry, index) =>
                                <Cell key={entry.name} fill={typeList[entry.name.toUpperCase()]}/>
                            )
                        }
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export { BrowseDataSource, BrowseDataSourceModal };
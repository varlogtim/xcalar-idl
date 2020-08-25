import React from 'react';
import { Folder, FileCopy, InsertDriveFileOutlined } from '@material-ui/icons';
import prettyBytes from 'pretty-bytes';
import clsx from 'clsx';
import TableCell from '@material-ui/core/TableCell';
import VirtualizedTable from "../../../components/widgets/VirtualizedTable";

const Texts = {
    fileListTitle: 'File List',
    selectListTitle: 'Selected Files'
};

export default function FileBrowserTable(props) {
    const {
        fileMap,
        selectedIds,
        onSelect,
        onDeselect,
        onPathChange,
        onInfoClick,
        fileType,
        canUpload,
        addTempFile,
        removeFile,
        refreshPath,
        toggleFileLoading
    } = props;

    let fileList = [];
    for (const [ fileId, fileInfo] of fileMap.entries()) {
        const fileObj = {
            size: fileInfo.directory
                ? null
                : prettyBytes(fileInfo.sizeInBytes),
            ...fileInfo
        };
        fileList.push(fileObj);
    }

    let columns = [
        {
            width: 30,
            label: <FileCopy style={{fontSize: 20, position: "relative", top: 3}}/>,
            dataKey: 'directory',
            customDataRender: (data) => {
                return data.directory ? <Folder style={{fontSize: 20, position: "relative", top: 2}}/> :
                <InsertDriveFileOutlined style={{fontSize: 20, position: "relative", top: 2}}/>
            }
        },
        {
            width: 300,
            isFlexGrow: true,
            label: 'Name',
            dataKey: 'name'
        },
        {
            width: 100,
            label: 'Size',
            dataKey: 'size'
        },
        {
            width: 80,
            label: 'Type',
            dataKey: 'type'
        },
        // {
        //     width: 30,
        //     label: 'Info',
        //     dataKey: 'info',
        //     customHeadRender: (data, classes) => {
        //         return (
        //             <TableCell
        //                 component="div"
        //                 className={clsx(classes.tableCell, classes.flexContainer, classes.noClick)}
        //                 variant="head"
        //                 style={{ height: "40px" }}
        //                 align={'left'}
        //             >
        //                 <span>Info</span>
        //             </TableCell>
        //         )
        //     },
        //     customCellRender: (data, classes) => {
        //         let tooltip = data.directory ? "Get Directory Info" : "";
        //         return (
        //             <TableCell
        //                 component="div"
        //                 className={clsx(classes.tableCell, classes.flexContainer, {
        //                     [classes.noClick]: data.directory == false})}
        //                 variant="body"
        //                 style={{ height: "24px" }}
        //                 align={'left'}
        //                 onClick={() => {
        //                     if (data.directory) {
        //                         onInfoClick(data.fullPath);
        //                     }
        //                 }}
        //                 data-toggle="tooltip"
        //                 data-container="body"
        //                 data-placement="auto top"
        //                 data-original-title={tooltip}
        //                 data-delay="100"
        //             >
        //                 {data.directory ? <i
        //                     className="icon xi-info-circle-outline"
        //                     ></i>
        //                 : null}
        //             </TableCell>
        //         );
        //     }
        // }
    ];

    let path = props.currentFullPath;
    $("#fileBrowserModal").off("drop drag dragstart dragend dragover dragenter dragleave");
    $("#fileBrowserModal").find(".xc-dragDropArea").remove();
    if (canUpload) {
        columns.push({
                width: 40,
                label: 'Option',
                dataKey: 'option',
                customHeadRender: (data, classes) => {
                    return (
                        <TableCell
                            component="div"
                            className={clsx(classes.tableCell, classes.flexContainer, classes.noClick)}
                            variant="head"
                            style={{ height: "40px" }}
                            align={'left'}
                        >
                            <span>Option</span>
                        </TableCell>
                    )
                },
                customDataRender: (data) => {
                    return data.directory ? "" :
                    <i className="icon xi-trash"></i>
                }
        });
        const uploader = new DragDropUploader({
            $container: $("#fileBrowserModal"),
            text: "Drop a file to upload",
            onDrop: (file) => {
               uploadFile(file);
            },
            onError: (error) => {
                switch (error) {
                    case ('invalidFolder'):
                        Alert.error(UploadTStr.InvalidUpload,
                                    UploadTStr.InvalidFolderDesc);
                        break;
                    case ('multipleFiles'):
                        Alert.show({
                            title: UploadTStr.InvalidUpload,
                            msg: UploadTStr.OneFileUpload
                        });
                        break;
                    default:
                        break;
                }
            }
        });
    }

    const uploadFile = (file) => {
        const deferred = PromiseHelper.deferred();
        let newPath = path;
        let overwriting = false;
        let uploadingFileName = "";
        CloudFileBrowser.uploadFile(file, (fileName) => {
            if (overwriting) {
                toggleFileLoading(uploadingFileName, true);
            } else {
                addTempFile(fileName, newPath);
            }
        }, (fileName) => {
            const deferred = PromiseHelper.deferred();
            uploadingFileName = fileName;
            if (!newPath.startsWith("/")) {
                newPath = "/" + newPath;
            }
            if (newPath.endsWith("/")) {
                newPath = newPath.slice(0, -1)
            }
            uploadingFileName = newPath + "/" + uploadingFileName;
            if (fileMap.has(uploadingFileName)) {
                overwriting = true;
                Alert.show({
                    "title": "Overwriting file",
                    "msg": `File "${fileName}" alredy exists, do you want to overwrite it?`,
                    "onConfirm": () => deferred.resolve(),
                    "onCancel": () => deferred.reject()
                });
            } else {
                deferred.resolve();
            }

            return deferred.promise();
        })
        .then(() => {
            toggleFileLoading(uploadingFileName, false);
            refreshPath();
            deferred.resolve();
        })
        .fail(() => {
            if (uploadingFileName) {
                if (overwriting) {
                    toggleFileLoading(uploadingFileName, false);
                } else {
                    removeFile(uploadingFileName);
                }
            }
            deferred.reject();
        });
        return deferred.promise();
    }

    const uploadRef = React.createRef();

    const uploadClick = (e) => {
        uploadRef.current.click();
    };

    const onUpload = (e) => {
        let val = e.target.value;
        if (val === "")  return;
        let file = uploadRef.current.files[0];
        uploadFile(file)
        .always(() => {
            if (uploadRef.current) {
                uploadRef.current.value = "";
            }
        });
    };

    return (
        <div className="outerTableWrap" style={{height: "100%"}}>
            <div className="tableTopBar">
                <div className="header">{Texts.fileListTitle}</div>
                {canUpload ?
                <div className="cloudUploadSection">
                    <div>
                        <input ref={uploadRef} id="dsForm-source-upload" type="file" style={{"display":"none"}} onChange={onUpload} />
                        <i className="icon xi-cloud-upload"></i>
                        <span>
                            <span className="upload xc-action" onClick={uploadClick}>Choose a file to upload</span> or drag it here.
                        </span>
                    </div>
                </div> :
                ""}
                <div className="numItems">{(fileList.length).toLocaleString()} items</div>
            </div>
            {fileList.length ?
            <div className="innerTableWrap">
                <VirtualizedTable
                    fileList={fileList}
                    rowCount={fileList.length}
                    onRowClick={(rowData) => {
                        if (rowData.directory) {
                            onPathChange(rowData.fullPath);
                        }
                    }}
                    columns={columns}
                    sortableFields={new Set(["name", "size", "type"])}
                    selectableRows={true} // checkboxes
                    selectableFilter={rowData => true} // Both file & directory are selectable
                    selectedIds={selectedIds}
                    onSelect={onSelect}
                    onDeselect={onDeselect}
                    isSelected={(rowData) => {
                        return selectedIds.has(rowData.fileId);
                    }}
                    getNumSelected= {() => {
                        return selectedIds.size
                    }}
                    rowHeight={24}
                    headerHeight={40}
                    onFileDelete={removeFile}
                />
            </div> : <div className="noFilesFound">No files or directories found.</div>}
        </div>
    );
}
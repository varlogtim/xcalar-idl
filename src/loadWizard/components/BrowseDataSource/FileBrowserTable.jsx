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
        fileType
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

    return (
        <div className="outerTableWrap" style={{height: "100%"}}>
            <div className="tableTopBar">
                <div className="header">{fileType.toUpperCase()}</div>
                <div className="numItems">{(fileList.length).toLocaleString()} items</div>
            </div>
            <div className="innerTableWrap">
                <VirtualizedTable
                    fileList={fileList}
                    rowCount={fileList.length}
                    onRowClick={rowData => {
                        if (rowData.directory) {
                            onPathChange(rowData.fullPath);
                        }
                    }}
                    columns={columns}
                    sortableFields={new Set(["name", "size", "type"])}
                    selectableRows={true} // checkboxes
                    selectableFilter={rowData => !rowData.directory}
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
                />
            </div>
        </div>
    );
}

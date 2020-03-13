import React from "react";
import MUIDataTable from "mui-datatables";
import { Folder, FileCopy, InsertDriveFileOutlined } from '@material-ui/icons';
import prettyBytes from 'pretty-bytes';
import { diff as diffSet } from '../../utils/SetUtils';

const Texts = {
    selectListTitle: 'Selected Files/Folders'
};


export default class SelectedFilesArea extends React.Component {

    render() {
        const {
            selectedFileDir,
            onSelect,
            onDeselect,
        } = this.props;
        const {
            columns: candidateListColumns,
            options: candidateOptions,
            fileList
        } = prepareCandidateList(selectedFileDir, onSelect, onDeselect);

        return (
            <div className="selectedFilesArea">
                <MUIDataTable
                    title={Texts.selectListTitle}
                    data={fileList}
                    columns={candidateListColumns}
                    options={candidateOptions}
                />
            </div>
        );
    }
}

function createFileList(selectedFiles) {
    const selectedIndices = [];
    const fileList = selectedFiles.map((fileInfo, i) => {
        selectedIndices.push(i);
        return  {
            size: fileInfo.directory
                ? null
                : prettyBytes(fileInfo.sizeInBytes),
            ...fileInfo
        };
    });

    return {
        fileList: fileList,
        selectedIndices: selectedIndices,
    };
}


function prepareCandidateList(selectedFileDir, onSelect, onDeselect, onPathChange) {
    const {
        fileList: fullList,
        selectedIndices: initialSelectedIndices
    } = createFileList(selectedFileDir);
    const columnDefs = [
        {
            name: "fullPath",
            label: "Clear All",
            options: { filter: false, sort: false }
        }
    ];

    const options = {
        filterType: "multiselect",
        // responsive: "stacked",
        download: false,
        print: false,
        search: false,
        sort: false,
        filter: false,
        viewColumns: false,
        rowsPerPage: 20,
        rowsPerPageOptions: [],
        onRowsSelect: (currentRowsSelected, allRowsSelected) => {
            let unselectedFileIds;
            if (!currentRowsSelected.length && !allRowsSelected.length) {
                // clear all was clicked
                unselectedFileIds = selectedFileDir.map(fileInfo => {
                    return fileInfo.fileId;
                });
            } else {
                unselectedFileIds = currentRowsSelected.map(row => {
                    return fullList[row.dataIndex].fileId;
                });
            }
            onDeselect(new Set(unselectedFileIds));
        },
        rowsSelected: initialSelectedIndices,
        disableToolbarSelect: true,
        setTableProps: () => {
          return {
            padding: "none",
            size: "small",
          };
        },
        textLabels: {
          body: {
            noMatch: "",
          },
        },
        responsive: false
    };

    return {
        columns: columnDefs,
        options: options,
        fileList: fullList
    };
}
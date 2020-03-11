import React from "react";
import MUIDataTable from "mui-datatables";
import { Folder, FileCopy, InsertDriveFileOutlined } from '@material-ui/icons';
import prettyBytes from 'pretty-bytes';
import { diff as diffSet } from '../../utils/SetUtils';

const Texts = {
    fileListTitle: 'File List',
    selectListTitle: 'Selected Files'
};

/**
 * Component
 * @param {*} param0
 */
function FileListTable({
    fileMap,
    selectedIds,
    onSelect,
    onDeselect,
    onPathChange
}) {

    const {
        columns: candidateListColumns,
        options: candidateOptions,
        fileList
    } = prepareCandidateList(fileMap, selectedIds, onSelect, onDeselect, onPathChange);

    return (
      <MUIDataTable
        title={Texts.fileListTitle}
        data={fileList}
        columns={candidateListColumns}
        options={candidateOptions}
      />
    );
}

function createFileList(fileMap, selectedFileIds) {
    const selectedIndices = [];
    const fileList = [];
    for (const [ fileId, fileInfo] of fileMap.entries()) {
        const fileObj = {
            size: fileInfo.directory
                ? null
                : prettyBytes(fileInfo.sizeInBytes),
            ...fileInfo
        };
        fileList.push(fileObj);
        if (selectedFileIds.has(fileId)) {
            selectedIndices.push(fileList.length - 1);
        }
    }

    return {
        fileList: fileList,
        selectedIndices: selectedIndices,
    };
}


function prepareCandidateList(fileMap, initialSelectedIds, onSelect, onDeselect, onPathChange) {
    const {
        fileList: fullList,
        selectedIndices: initialSelectedIndices
    } = createFileList(fileMap, initialSelectedIds);

    const columnDefs = [
        {
            name: "directory",
            label: <FileCopy/>,
            options: {
                filter: false,
                sort: true,
                customBodyRender: (isDirectory) => (isDirectory ? <Folder/> : <InsertDriveFileOutlined/>)
            }
        },
        {
            name: "name",
            label: "Path",
            options: { filter: false, sort: true }
        },
        {
            name: "size",
            label: "Size",
            options: {
                filter: false,
                sort: true
            }
        },
        {
            name: "type",
            label: "Type",
            options: {
            // filter: true,
            // filterList: selectedFilterList[3], //hardcoded
                filter: false,
                sort: true
            }
        }
    ];

    const options = {
        filterType: "multiselect",
        // responsive: "stacked",
        download: false,
        print: false,
        rowsPerPage: 20,
        rowsPerPageOptions: [],
        onRowsSelect: (_, allRowsSelected) => {
            const currentSelectedIds = new Set(allRowsSelected.map(row => fullList[row.dataIndex].fileId));
            const selectedFileIds = diffSet(currentSelectedIds, initialSelectedIds);
            const unselectedFileIds = diffSet(initialSelectedIds, currentSelectedIds);
            if (selectedFileIds.size > 0) {
                onSelect(selectedFileIds);
            }
            if (unselectedFileIds.size > 0) {
                onDeselect(unselectedFileIds);
            }
        },
        onRowClick: (_, { dataIndex }) => {
            const fileObj = fullList[dataIndex];
            if (fileObj != null && fileObj.directory) {
                onPathChange(fileObj.fullPath);
            }
        },
        rowsSelected: initialSelectedIndices,
        disableToolbarSelect: true,
        // searchOpen: true,
        // customSearch: (searchQuery, currentRow, columns) => {
        //   let regex = ""
        //   const query = searchQuery || searchText
        //   try {
        //     regex = new RegExp(query)
        //     setSearchText(query)
        //   } catch (e) {
        //   }
        //   return currentRow[1].search(regex) !== -1 //harcoded column
        // },
        // onSearchClose: () => {
        //   setSearchText("")
        // },
        // searchText: searchText,
        setTableProps: () => {
          return {
            padding: "none",
            size: "small",
          };
        },
        // onFilterChange: (changedColumn, filterList) => {
        //   setSelectedFilterList(filterList)
        // },
        textLabels: {
          body: {
            noMatch: "",
          },
        },
        responsive: false,
        // setRowProps: (row) => {
        //   return {
        //     className: classnames(
        //       {
        //         [this.props.classes.BusinessAnalystRow]: row[1] === "Business Analyst"
        //       }),
        //     style: {height: '10px',}
        //   };
        // },
    };

    return {
        columns: columnDefs,
        options: options,
        fileList: fullList
    };
}

export default FileListTable;
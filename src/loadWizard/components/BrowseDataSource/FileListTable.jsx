import React from "react";
import MUIDataTable from "mui-datatables";
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';
import { Folder, FileCopy, InsertDriveFileOutlined } from '@material-ui/icons';
import prettyBytes from 'pretty-bytes';
import { diff as diffSet } from '../../utils/SetUtils';

const Texts = {
    fileListTitle: 'File List',
    selectListTitle: 'Selected Files'
};

const rowsPerPage = 20;

/**
 * Component
 * @param {*} param0
 */
function FileListTable(props) {
    const {
        fileMap,
        selectedIds,
        onSelect,
        onDeselect,
        onPathChange,
        fileType
    } = props;

    const [page, setPage] = React.useState(0);

    const changePage = (page) => {
        const pageFileList = fullFileList.slice(rowsPerPage * page, rowsPerPage * (page + 1));
        const pageSelectedIndicies = getSelectedIndices(pageFileList);
        candidateOptions.rowsSelected = pageSelectedIndicies;
        candidateOptions.page = page;

        setPage(page);
    }

    const getSelectedIndices = (fileList) => {
        const selectedIndices = [];
        fileList.forEach((file, i) => {
            if (props.selectedIds.has(file.fileId)) {
                selectedIndices.push(i);
            }
        });
        return selectedIndices;
    }

    const onRowsSelect = (currentRowsSelected, allRowsSelected, selectAll) => {
        const initialSelectedIds = props.selectedIds;

        const pageSelectedIndicies = getSelectedIndices(pageFileList).map(index => {
            return (page * rowsPerPage) + index;
        });
        let selectedFileIds = new Set();
        let unselectedFileIds = new Set();
        if (!currentRowsSelected.length && !allRowsSelected.length) {
            // clear all was clicked
            unselectedFileIds = initialSelectedIds;
        } else if (selectAll) {
            // select all was clicked
            fullFileList.forEach((file) => {
                if (!initialSelectedIds.has(file.fileId)) {
                    selectedFileIds.add(file.fileId);
                }
            });
        } else {
            // regular checkbox click
            const currentSelectedIndices = new Set(allRowsSelected.map(row => {
                return (page * rowsPerPage) + row.dataIndex;
            }));
            const selectedFileIndices = diffSet(currentSelectedIndices, pageSelectedIndicies);
            const unselectedFileIndices = diffSet(pageSelectedIndicies, currentSelectedIndices);

            selectedFileIndices.forEach(index => {
                selectedFileIds.add(fullFileList[index].fileId);
            });
            unselectedFileIndices.forEach(index => {
                unselectedFileIds.add(fullFileList[index].fileId);
            });
        }

        if (selectedFileIds.size > 0) {
            props.onSelect(selectedFileIds);
        }
        if (unselectedFileIds.size > 0) {
            props.onDeselect(unselectedFileIds);
        }
    }

    const createFileList = (fileMap) => {
        const selectedIndices = [];
        let fileList = [];
        let index = 0;
        for (const [ fileId, fileInfo] of fileMap.entries()) {
            const fileObj = {
                size: fileInfo.directory
                    ? null
                    : prettyBytes(fileInfo.sizeInBytes),
                ...fileInfo
            };
            fileList.push(fileObj);
            if (props.selectedIds.has(fileId)) {
                if (index < rowsPerPage) {
                    selectedIndices.push(index);
                }
            }
            index++;
        }

        return {
            fullFileList: fileList,
            selectedIndices: selectedIndices,
        };
    }

    const prepareCandidateList = (fullFileList, initialSelectedIndices) => {
        let selectAll = false;
        let columnDefs = [
            {
                name: "directory",
                label: <FileCopy/>,
                options: {
                    filter: false,
                    sort: false,
                    customBodyRender: (isDirectory) => (isDirectory ? <Folder/> : <InsertDriveFileOutlined/>)
                }
            },
            {
                name: "name",
                label: "Path",
                options: { filter: false, sort: false }
            },
            {
                name: "size",
                label: "Size",
                options: {
                    filter: false,
                    sort: false
                }
            },
            {
                name: "type",
                label: "Type",
                options: {
                // filter: true,
                // filterList: selectedFilterList[3], //hardcoded
                    filter: false,
                    sort: false
                }
            }
        ];

        const options = {
            filterType: "multiselect",
            elevation: 0,
            responsive: "scrollMaxHeight",
            download: false,
            print: false,
            filter: false,
            sort: false, // XXX TODO: Disable sort for now, as it crashs browser
            rowsPerPage: rowsPerPage,
            rowsPerPageOptions: [],
            search: false,
            onRowsSelect: (currentRowsSelected, allRowsSelected) => {
                onRowsSelect(currentRowsSelected, allRowsSelected, selectAll);
            },
            onRowClick: (_, { dataIndex }) => {
                dataIndex += (page * rowsPerPage);
                const fileObj = fullFileList[dataIndex];
                if (fileObj != null && fileObj.directory) {
                    props.onPathChange(fileObj.fullPath);
                }
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
                noMatch: `No ${fileType} files or directories found.`,
              }
            },
            count: fullFileList.length,
            page: 0,
            serverSide: true,
            onTableChange: (action, tableState) => {
                if (action === "changePage") {
                    changePage(tableState.page);
                } else if (action === "rowsSelect") {
                    if (tableState.previousSelectedRow == null && tableState.curSelectedRows.length) {
                        selectAll = true;
                    } else {
                        selectAll = false;
                    }
                }
            }
        };

        return {
            columns: columnDefs,
            options: options
        };
    }


    const {
        fullFileList: fullFileList,
        selectedIndices: pageSelectedIndicies
    } = createFileList(props.fileMap);

    const {
        columns: candidateListColumns,
        options: candidateOptions,
    } = prepareCandidateList(fullFileList, pageSelectedIndicies);


    const pageFileList =  fullFileList.slice(rowsPerPage * page, rowsPerPage * (page + 1));

    candidateOptions.rowsSelected = getSelectedIndices(pageFileList);

    const myTheme = createMuiTheme({
        overrides: {
            MUIDataTable: {
                responsiveScrollMaxHeight: {
                    maxHeight: '100% !important',
                    flex: "1 1 auto"
                },

            },
            MUIDataTableBody: {
                emptyTitle: {
                    display: "block"
                }
            }
        }
    });

    return (
        <MuiThemeProvider theme={myTheme}>
            <MUIDataTable
                title={Texts.fileListTitle + " - " + fileType}
                data={pageFileList}
                columns={candidateListColumns}
                options={candidateOptions}
            />
        </MuiThemeProvider>
    );
}



export default FileListTable;
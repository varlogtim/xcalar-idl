import React from "react";
import MUIDataTable from "mui-datatables";
import prettyBytes from 'pretty-bytes';
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';

const Texts = {
    selectListTitle: 'Selected Files/Directories'
};

const typeList = {
    "json": "#00cf18",
    "csv": "#4287f5",
    "parque": "#002483",
    "directory": "#888",
    "unsupported": "#333",
};

export default class SelectedFilesArea extends React.Component {

    render() {
        const {
            selectedFileDir,
            onDeselect,
        } = this.props;
        const {
            columns: candidateListColumns,
            options: candidateOptions,
            fileList
        } = prepareCandidateList(selectedFileDir, onDeselect);

        const myTheme = createMuiTheme({
            overrides: {
              MUIDataTable: {
                responsiveScrollMaxHeight: {
                  maxHeight: '100% !important',
                  flex: "1 1 auto"
                }
            }
        }});
        console.log(selectedFileDir);
        return (
            <div className="selectedFilesArea">
                <div className="selectedFilesHeader">{Texts.selectListTitle}</div>
                <SelectedFilesSummary fileList={selectedFileDir} />
                {selectedFileDir.length ?
                    <MuiThemeProvider theme={myTheme}>
                        <MUIDataTable
                            data={fileList}
                            columns={candidateListColumns}
                            options={candidateOptions}
                        />
                    </MuiThemeProvider>
                 : null }
            </div>
        );
    }
}

function SelectedFilesSummary({fileList}) {
    const typeCount = {};
    const typeSize = {};
    for (const file of fileList) {
        let fileType = file.type.toLowerCase();

        if (!(fileType in typeList)) {
            fileType = "unsupported";
        }
        if (fileType in typeCount) {
            typeCount[fileType]++;
            typeSize[fileType] += file.sizeInBytes;
        } else {
            typeCount[fileType] = 1;
            typeSize[fileType] = file.sizeInBytes;
        }
    }

    // Chart data for file count by types
    const chartData = [];
    let totalCountOfFiles = 0;
    for (const [type, count] of Object.entries(typeCount)) {
        chartData.push({
            name: type,
            value: count
        });
        totalCountOfFiles += typeCount[type];
    }

    // Chart data for file size by types
    const totalCountOfDirectories = typeCount['directory'] || 0;
    totalCountOfFiles -= totalCountOfDirectories;

    const chartData2 = [];
    for (const [type, size] of Object.entries(typeSize)) {
        if (type !== 'directory') {
            chartData2.push({
                name: type,
                value: size
            });
        }
    }

    return (
        <div className="selectedFileDistribution">
            <table >
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Count</th>
                        <th>Total Size</th>
                    </tr>
                </thead>
                <tbody>
                    {chartData.length ?
                        chartData.map((item, i) => {
                            let size;
                            if (item.name === "directory") {
                                size = "";
                            } else {
                                size = prettyBytes(typeSize[item.name]);
                            }
                            return (
                                <tr key={i}>
                                    <td>{item.name}</td>
                                    <td>{item.value}</td>
                                    <td>{size}</td>
                                </tr>
                            )
                        })
                        :
                        <tr><td className="noFilesSelected" colSpan="3">No Files Selected</td></tr>
                    }
                </tbody>
            </table>
        </div>
    )
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


function prepareCandidateList(selectedFileDir, onDeselect) {
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
        elevation: 0,
        // responsive: "stacked",
        responsive: "scrollMaxHeight",
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
        }
    };

    return {
        columns: columnDefs,
        options: options,
        fileList: fullList
    };
}
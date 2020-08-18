import React from 'react';
import clsx from 'clsx';
import { withStyles } from '@material-ui/core/styles';
import TableCell from '@material-ui/core/TableCell';
import { AutoSizer, Column, Table } from 'react-virtualized';
import Checkbox from '@material-ui/core/Checkbox';
import { TableSortLabel } from '@material-ui/core';

class MuiVirtualizedTable extends React.PureComponent {
    constructor(props) {
        super(props);
        const sortBy = "";
        const sortDirection = "ASC";
        this.state = {
            disableHeader: false,
            overscanRowCount: 20,
            scrollIndex: undefined,
            sortBy: sortBy,
            sortDirection: sortDirection,
            sortedList: [...props.fileList],
            lastClickedIndex: null
        };
        this.getRowClassName = this.getRowClassName.bind(this);
        this.cellRenderer = this.cellRenderer.bind(this);
        this.headerRenderer = this.headerRenderer.bind(this);
        this.checkboxCellRenderer = this.checkboxCellRenderer.bind(this);
        this.checkboxHeaderRenderer = this.checkboxHeaderRenderer.bind(this);

        this.handleCheckboxClick = this.handleCheckboxClick.bind(this);
        this.onSelectAllClick = this.onSelectAllClick.bind(this);
        this.sort = this.sort.bind(this);
    }

    getRowClassName(index, data) {
        const { classes, onRowClick } = this.props;
        const rowData = data[index];
        let isLoading = false;
        if (rowData) {
            isLoading = rowData.isLoading;
        }
        return clsx(classes.tableRow, classes.flexContainer, {
        [classes.tableRowHover]: index !== -1 && onRowClick != null,
        "isLoading": isLoading
        });
    };

    handleCheckboxClick(event, rowData, rowIndex) {
        let toSelect = !this.props.isSelected(rowData);
        let multiSelectList = [];
        // for shift click multi select
        // if (event.nativeEvent.shiftKey && this.state.lastClickedIndex != null) {
        //     let min;
        //     let max;
        //     if (rowIndex > this.state.lastClickedIndex) {
        //         min = this.state.lastClickedIndex;
        //         max = rowIndex;
        //     } else {
        //         max = this.state.lastClickedIndex;
        //         min = rowIndex;
        //     }
        //     for (let i = min; i <= max; i++) {
        //         multiSelectList.push(this.state.sortedList[i]);
        //     }
        // }
        // check for multi select
        let selectedList = new Set();
        if (toSelect) {
            multiSelectList.forEach(row => {
                if (!this.props.isSelected(row)) {
                    selectedList.add(row);
                }
            });
            selectedList.add(rowData);
            this.props.onSelect(selectedList);
        } else {
            multiSelectList.forEach(row => {
                if (this.props.isSelected(row)) {
                    selectedList.add(row);
                }
            });
            selectedList.add(rowData);
            this.props.onDeselect(selectedList);
        }

        this.setState({
            lastClickedIndex: rowIndex
        });
    }

    onSelectAllClick() {
        const files = new Set();
        if (this.props.getNumSelected() === 0) {
            this.props.fileList.forEach((file) => {
                files.add(file);
            });
            this.props.onSelect(files);
        } else {
            this.props.fileList.forEach((file) => {
                if (this.props.isSelected(file)) {
                    files.add(file);
                }
            });
            this.props.onDeselect(files);
        }
        this.setState({
            lastClickedIndex: null
        });
    }

    checkboxHeaderRenderer({ label, columnIndex }) {
        const { headerHeight, classes } = this.props;
        return (
            <TableCell
                component="div"
                className={clsx(classes.tableCell, classes.flexContainer, classes.noClick)}
                variant="head"
                style={{ height: headerHeight }}
                align={'left'}
            >
                {/* <Checkbox
                    size="small"
                    color="primary"
                    indeterminate={this.props.getNumSelected() > 0 && this.props.getNumSelected() < this.props.rowCount}
                    checked={this.props.rowCount > 0 && this.props.getNumSelected() === this.props.rowCount}
                    onChange={this.onSelectAllClick}
                /> */}
            </TableCell>
        );
    };

    headerRenderer(info) {
        const { label, columnIndex, dataKey } = info;
        const { headerHeight, classes } = this.props;
        const {sortBy, sortDirection} = this.state;
        if (info.customHeadRender) {
            return info.customHeadRender(info.rowData, classes);
        }
        return (
            <TableCell
                component="div"
                className={clsx(classes.tableCell, classes.flexContainer)}
                variant="head"
                style={{ height: headerHeight }}
                align={'left'}
                sortDirection={sortBy === dataKey ? sortDirection.toLowerCase() : false}
            >
            {dataKey === "directory" ? <span>{label}</span> :
                <TableSortLabel
                    active={sortBy === dataKey}
                    direction={sortBy === dataKey ? sortDirection.toLowerCase() : 'asc'}
                >
                    <span>{label}</span>
                </TableSortLabel>
            }
            </TableCell>
        );
    };

    deleteFileHelper(file, rowIndex) {
        let fileName = file.name;
        const sortedList = this.state.sortedList;
        sortedList[rowIndex].isLoading = true;
        this.setState({
            sortedList: [...sortedList]
        });

        CloudManager.Instance.deleteS3File(fileName)
        .then(() => {
            this.props.onFileDelete(file.fullPath);
        })
        .fail((error) => {
            Alert.error(ErrTStr.Error, error);
            this.state.sortedList[rowIndex].isLoading = false;
            this.setState({
                sortedList: [...this.state.sortedList]
            });
        });
    };


    checkboxCellRenderer(info) {
        const {
            cellData: fileId,
            columnIndex,
            rowData,
            rowIndex
        } = info;
        const {classes, rowHeight, onRowClick, selectableFilter = () => true } = this.props;

        return (
          <TableCell
            component="div"
            className={clsx(classes.tableCell, classes.flexContainer, {
              [classes.noClick]: onRowClick == null
            })}
            variant="body"
            style={{ height: rowHeight }}
            align={'left'}
          >
            {selectableFilter(rowData) && <Checkbox
                size="small"
                color="primary"
                checked={this.props.isSelected(rowData)}
                onChange={event => this.handleCheckboxClick(event, rowData, rowIndex)}
            />}
          </TableCell>
        );
    };

    cellRenderer(info) {
        const {cellData} = info;
        const { classes, rowHeight, onRowClick } = this.props;
        let text = info.customDataRender ? info.customDataRender(info.rowData) : cellData;
        if (info.customCellRender) {
            return info.customCellRender(info.rowData, classes);
        }
        return (
        <TableCell
            component="div"
            className={clsx(classes.tableCell, classes.flexContainer, {
            [classes.noClick]: onRowClick == null,
            })}
            variant="body"
            style={{ height: rowHeight }}
            align={'left'}
            onClick={(e) => {
                if (info.dataKey === "option" && !info.rowData.directory) {
                    Alert.show({
                        title: "Delete file",
                        msg: `Are you sure you want to delete file "${info.rowData.name}"?`,
                        onConfirm: () => {
                            this.deleteFileHelper(info.rowData, info.rowIndex);
                        }
                    });
                } else {
                    onRowClick(info.rowData);
                }
            }}
        >
            <div className="innerCell">{text}</div>
        </TableCell>
        );
    }

    sort(info) {
        const {sortBy, sortDirection} = info;
        if (!this.props.sortableFields.has(sortBy)) {
            return;
        }
        const sortedList = this.sortList({sortBy, sortDirection});

        this.setState({sortBy, sortDirection, sortedList});
    }

    sortList(info) {
        let {sortBy, sortDirection} = info;
        if (sortBy === "size") {
            sortBy = "sizeInBytes";
        }
        let list;
        if (this.state && this.state.sortedList) {
            list = [...this.state.sortedList];
        } else {
            list = [...this.props.fileList]
        }
        let order = (sortDirection === "ASC") ? -1 : 1;
        list.sort((a,b) => {
            if (a[sortBy] < b[sortBy]) {
                return order;
            } else if (a[sortBy] > b[sortBy]) {
                return -order;
            } else {
                return 0;
            }
        });
        return list;
    }

    render() {
        const { classes, columns, rowHeight, headerHeight, fileList, selectableRows, ...tableProps } = this.props;
        const {
            overscanRowCount,
            sortBy,
            sortDirection,
            sortedList
        } = this.state;

        return (
        <AutoSizer>
            {({ height, width }) => (
            <Table
                height={height}
                width={width}
                rowHeight={rowHeight}
                gridStyle={{direction: 'inherit'}}
                headerHeight={headerHeight}
                className={classes.table}
                size="small"
                {...tableProps}
                rowClassName={(info) => { return this.getRowClassName(info.index, sortedList)}}
                overscanRowCount={overscanRowCount}
                sort={this.sort}
                sortBy={sortBy}
                sortDirection={sortDirection}
                rowGetter={({index}) => sortedList[index]}
            >
                {selectableRows &&
                    <Column
                        className={classes.flexContainer + " abc"}
                        dataKey={"fileId"}
                        width={30}
                        label={"checkbox"}
                        headerRenderer={headerProps =>
                            this.checkboxHeaderRenderer({
                                ...headerProps,
                                columnIndex: 0,
                            })
                        }
                        cellRenderer={this.checkboxCellRenderer}
                    />
                }
                {columns.map(({ dataKey, ...other }, index) => {
                    return (
                        <Column
                            key={dataKey}
                            className={classes.flexContainer}
                            dataKey={dataKey}
                            flexGrow={other.isFlexGrow ? 1 : 0}
                            headerRenderer={headerProps =>
                                this.headerRenderer({
                                    ...headerProps,
                                    columnIndex: index + 1,
                                    customHeadRender: other.customHeadRender
                                })
                            }
                            cellRenderer={cellProps =>
                                this.cellRenderer({
                                    ...cellProps,
                                    customDataRender: other.customDataRender,
                                    customCellRender: other.customCellRender
                                })
                            }
                            {...other}
                        />
                    );
                })}
            </Table>
            )}
        </AutoSizer>
        );
    }
}

MuiVirtualizedTable.defaultProps = {
    headerHeight: 40,
    rowHeight: 24,
    fileList: [],
    rowCount: 0,
    columns: [],
    onSelect: ()=>{},
    onDeselect: ()=>{},
    isSelected: ()=>{},
    getNumSelected: ()=>0
};

const styles = theme => ({
    flexContainer: {
      display: 'flex',
      alignItems: 'center',
      boxSizing: 'border-box',
    },
    table: {
      // temporary right-to-left patch, waiting for
      // https://github.com/bvaughn/react-virtualized/issues/454
      '& .ReactVirtualized__Table__headerRow': {
        flip: false,
        paddingRight: theme.direction === 'rtl' ? '0px !important' : undefined,
      },
    },
    tableRow: {
      cursor: 'pointer',
    },
    tableRowHover: {
      '&:hover': {
      //   backgroundColor: theme.palette.grey[200],
      },
    },
    tableCell: {
      flex: 1,
    },
    noClick: {
      cursor: 'initial',
    },
  });


const VirtualizedTable = withStyles(styles)(MuiVirtualizedTable);

export default VirtualizedTable;
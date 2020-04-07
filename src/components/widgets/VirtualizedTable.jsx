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

    getRowClassName({ index }) {
        const { classes, onRowClick } = this.props;

        return clsx(classes.tableRow, classes.flexContainer, {
        [classes.tableRowHover]: index !== -1 && onRowClick != null,
        });
    };

    // XXX refactor to not depend on selectedIds/fileId
    handleCheckboxClick(event, rowData, rowIndex) {
        const fileId = rowData.fileId;
        let toSelect = !this.props.isSelected(rowData);
        let multiSelectList = [];
        // for shift click multi select
        if (event.nativeEvent.shiftKey &&
            this.state.lastClickedIndex != null) {
            let min;
            let max;
            if (rowIndex > this.state.lastClickedIndex) {
                min = this.state.lastClickedIndex;
                max = rowIndex;
            } else {
                max = this.state.lastClickedIndex;
                min = rowIndex;
            }
            for (let i = min; i <= max; i++) {
                multiSelectList.push(this.state.sortedList[i].fileId);
            }
        }
        // check for multi select
        if (toSelect) {
            let selectedList = new Set();
            multiSelectList.forEach((fileId) => {
                if (!this.props.selectedIds.has(fileId)) {
                    selectedList.add(fileId);
                }
            });
            selectedList.add(fileId);
            this.props.onSelect(selectedList);
        } else {
            let selectedList = new Set();
            multiSelectList.forEach((fileId) => {
                if (this.props.selectedIds.has(fileId)) {
                    selectedList.add(fileId);
                }
            });
            selectedList.add(fileId);
            this.props.onDeselect(selectedList);
        }

        this.setState({
            lastClickedIndex: rowIndex
        });
    }

    // XXX refactor to not depend on selectedIds/fileId
    onSelectAllClick() {
        if (this.props.selectedIds.size === 0) {
            const fileIds = new Set();
            this.props.fileList.forEach((file) => {
                fileIds.add(file.fileId);
            });
            this.props.onSelect(fileIds);
        } else {
            this.props.onDeselect(this.props.selectedIds);
        }
        this.setState({
            lastClickedIndex: null
        });
    }

    // XXX refactor to not depend on selectedIds/fileId
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
                <Checkbox
                    size="small"
                    color="primary"
                    indeterminate={this.props.selectedIds.size > 0 && this.props.selectedIds.size < this.props.rowCount}
                    checked={this.props.rowCount > 0 && this.props.selectedIds.size === this.props.rowCount}
                    onChange={this.onSelectAllClick}
                />
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

    checkboxCellRenderer(info) {
        const {
            cellData: fileId,
            columnIndex,
            rowData,
            rowIndex
        } = info;
        const {classes, rowHeight, onRowClick } = this.props;

        return (
          <TableCell
            component="div"
            className={clsx(classes.tableCell, classes.flexContainer, {
              [classes.noClick]: onRowClick == null,
            })}
            variant="body"
            style={{ height: rowHeight }}
            align={'left'}
          >
            <Checkbox
                size="small"
                color="primary"
                checked={this.props.isSelected(rowData)}
                onChange={event => this.handleCheckboxClick(event, rowData, rowIndex)}
            />
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
            onClick={() => {
                onRowClick(info.rowData);
            }}
        >
            <div className="innerCell">{text}</div>
        </TableCell>
        );
    }

    sort(info) {
        console.log(this.props, info);
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
                rowClassName={this.getRowClassName}
                overscanRowCount={overscanRowCount}
                sort={this.sort}
                sortBy={sortBy}
                sortDirection={sortDirection}
                rowGetter={({index}) => sortedList[index]}
            >
                {selectableRows &&
                    <Column
                        className={classes.flexContainer}
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
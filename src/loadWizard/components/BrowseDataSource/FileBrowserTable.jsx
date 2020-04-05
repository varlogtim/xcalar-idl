import React from 'react';
import { Folder, FileCopy, InsertDriveFileOutlined } from '@material-ui/icons';
import prettyBytes from 'pretty-bytes';
import clsx from 'clsx';
import { withStyles } from '@material-ui/core/styles';
import TableCell from '@material-ui/core/TableCell';
import { AutoSizer, Column, Table } from 'react-virtualized';
import Checkbox from '@material-ui/core/Checkbox';
import { TableSortLabel } from '@material-ui/core';
import * as S3Service from '../../services/S3Service';

const Texts = {
    fileListTitle: 'File List',
    selectListTitle: 'Selected Files'
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
        this.infoCellRenderer = this.infoCellRenderer.bind(this);
        this.infoHeaderRenderer = this.infoHeaderRenderer.bind(this);
        this.checkboxHeaderRenderer = this.checkboxHeaderRenderer.bind(this);

        this.handleCheckboxClick = this.handleCheckboxClick.bind(this);
        this.onSelectAllClick = this.onSelectAllClick.bind(this);
        this.sort = this.sort.bind(this);
    }

    getRowClassName({ index }) {
        const { classes, onPathChange } = this.props;

        return clsx(classes.tableRow, classes.flexContainer, {
        [classes.tableRowHover]: index !== -1 && onPathChange != null,
        });
    };

    handleCheckboxClick(event, fileId, rowIndex) {
        let toSelect = !this.props.selectedIds.has(fileId);
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

    infoHeaderRenderer(info) {
        const { headerHeight, classes } = this.props;
        return (
        <TableCell
            component="div"
            className={clsx(classes.tableCell, classes.flexContainer, classes.noClick)}
            variant="head"
            style={{ height: headerHeight }}
            align={'left'}
        >
            <span>Info</span>
        </TableCell>
        );
    };

    checkboxCellRenderer(info) {
        const {
            cellData: fileId,
            columnIndex,
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
                checked={this.props.selectedIds.has(fileId)}
                onChange={event => this.handleCheckboxClick(event, fileId, rowIndex)}
            />
          </TableCell>
        );
    };

    cellRenderer(info) {
        const {cellData} = info;
        const { classes, rowHeight, onPathChange } = this.props;
        let text = info.customRender ? info.customRender(info.rowData) : cellData;
        return (
        <TableCell
            component="div"
            className={clsx(classes.tableCell, classes.flexContainer, {
            [classes.noClick]: onPathChange == null,
            })}
            variant="body"
            style={{ height: rowHeight }}
            align={'left'}
            onClick={() => {
                if (info.rowData.directory) {
                    onPathChange(info.rowData.fullPath);
                } else {
                    //  S3Service.previewFile(info.rowData.fullPath, info.rowData.name)
                    //  .then((a) => {
                    //      console.log(a);
                    //  })
                    //  .catch((e) => {
                    //      console.log(e)
                    //  });
                }
            }}
        >
            <div className="innerCell">{text}</div>
        </TableCell>
        );
    }

    infoCellRenderer(info) {
        const {
            cellData: fileId,
            columnIndex
        } = info;
        const {classes, rowHeight, onInfoClick } = this.props;
        let tooltip = info.rowData.directory ? "View Directory Info" : "";
        return (
            <TableCell
                component="div"
                className={clsx(classes.tableCell, classes.flexContainer, {
                    [classes.noClick]: info.rowData.directory == false})}
                variant="body"
                style={{ height: rowHeight }}
                align={'left'}
                onClick={() => {
                    if (info.rowData.directory) {
                        onInfoClick(info.rowData.fullPath);
                    }
                }}
                data-toggle="tooltip"
                data-container="body"
                data-placement="auto top"
                data-original-title={tooltip}
                data-delay="100"
            >
                {info.rowData.directory ? <i
                    className="icon xi-info-circle-outline"
                    ></i>
                : null}
            </TableCell>
        );
    };

    sort(info) {
        const {sortBy, sortDirection} = info;
        if (sortBy === "fileId" || sortBy === "directory" || sortBy === "fullPath") {
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
        const { classes, columns, rowHeight, headerHeight, fileList, ...tableProps } = this.props;
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
                gridStyle={{
                direction: 'inherit',
                }}
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
                <Column
                    headerRenderer={headerProps =>
                        this.checkboxHeaderRenderer({
                        ...headerProps,
                        columnIndex: 0,
                        })
                    }
                    className={classes.flexContainer}
                    cellRenderer={this.checkboxCellRenderer}
                    dataKey={"fileId"}
                        width={30}
                        label={"checkbox"}
                />
                {columns.map(({ dataKey, ...other }, index) => {
                    return (
                        <Column
                            key={dataKey}
                            headerRenderer={headerProps =>
                                this.headerRenderer({
                                    ...headerProps,
                                    columnIndex: index + 1,
                                })
                            }
                            className={classes.flexContainer}
                            cellRenderer={cellProps =>
                                this.cellRenderer({
                                    ...cellProps,
                                    customRender: other.customRender
                                })
                            }
                            dataKey={dataKey}
                            flexGrow={(index === 1) ? 1: 0}
                            {...other}
                        />
                    );
                })}
                <Column
                    headerRenderer={headerProps =>
                        this.infoHeaderRenderer(headerProps)
                    }
                    className={classes.flexContainer}
                    cellRenderer={this.infoCellRenderer}
                    dataKey={"fullPath"}
                    width={30}
                />
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

const VirtualizedTable = withStyles(styles)(MuiVirtualizedTable);

export default function ReactVirtualizedTable(props) {
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
            customRender: (data) => {
                return data.directory ? <Folder style={{fontSize: 20, position: "relative", top: 2}}/> :
                <InsertDriveFileOutlined style={{fontSize: 20, position: "relative", top: 2}}/>
            }
        },
        {
            width: 300,
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
        }
    ];

    return (
        <div className="outerTableWrap" style={{height: "100%"}}>
            <div className="tableTopBar">
                <div className="header">{Texts.fileListTitle + " - " + fileType}</div>
                <div className="numItems">{(fileList.length).toLocaleString()} items</div>
            </div>
            <div className="innerTableWrap">
                <VirtualizedTable
                    selectedIds={selectedIds}
                    fileList={fileList}
                    onSelect={onSelect}
                    onDeselect={onDeselect}
                    rowCount={fileList.length}
                    onPathChange={(path) => {
                        onPathChange(path);
                    }}
                    onInfoClick={onInfoClick}
                    columns={columns}
                />
            </div>
        </div>
    );
}

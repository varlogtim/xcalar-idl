import React from 'react';
import { Folder, FileCopy, InsertDriveFileOutlined, LensOutlined } from '@material-ui/icons';
import prettyBytes from 'pretty-bytes';
import clsx from 'clsx';
import { withStyles } from '@material-ui/core/styles';
import TableCell from '@material-ui/core/TableCell';
import { AutoSizer, Column, Table } from 'react-virtualized';
import Checkbox from '@material-ui/core/Checkbox';
import { TableSortLabel } from '@material-ui/core';

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
            sortedList: [...props.fileList]
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
    const { classes, onPathChange } = this.props;

    return clsx(classes.tableRow, classes.flexContainer, {
      [classes.tableRowHover]: index !== -1 && onPathChange != null,
    });
  };

 handleCheckboxClick(event, fileId) {
    if (this.props.selectedIds.has(fileId)) {
        this.props.onDeselect(new Set([fileId]));
    } else {
        this.props.onSelect(new Set([fileId]));
    }
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
}


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
            }
        }}
      >
        <div className="innerCell">{text}</div>
      </TableCell>
    );
  }


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

  checkboxCellRenderer(info) {
    const {
        cellData: fileId,
        columnIndex
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
            onChange={event => this.handleCheckboxClick(event, fileId)}
        />
      </TableCell>
    );
  };

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

  sort(info) {
    const {sortBy, sortDirection} = info;
    if (sortBy === "fileId" || sortBy === "directory") {
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
                  key={"fileId"}
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
          </Table>
        )}
      </AutoSizer>
    );
  }
}

MuiVirtualizedTable.defaultProps = {
    headerHeight: 40,
    rowHeight: 28,
};

const VirtualizedTable = withStyles(styles)(MuiVirtualizedTable);

export default function ReactVirtualizedTable(props) {
    const {
        fileMap,
        selectedIds,
        onSelect,
        onDeselect,
        onPathChange,
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
                    columns={columns}
                />
            </div>
        </div>
    );
}
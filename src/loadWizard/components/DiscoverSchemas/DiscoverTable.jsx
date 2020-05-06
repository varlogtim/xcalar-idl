import React from "react";
import MUIDataTable from "mui-datatables";
import * as SchemaCell from './SchemaCell'

const Texts = {
    tableTitle: 'Selected Files',
    discoverErrorLable: 'Failed',
    discoverErrorTitle: 'Discover Schema Error'
};

const DiscoverStatusEnum = {
    DONE: 'done',
    FAIL: 'fail',
    WIP: 'wip',
    WAIT: 'wait'
};

function createSchemaCellProps(schemaInfo) {
    if (schemaInfo == null) {
        return {
            status: DiscoverStatusEnum.WIP
        };
    }

    if (schemaInfo.error != null) {
        return {
            status: DiscoverStatusEnum.FAIL,
            errorMsg: schemaInfo.error
        };
    }

    if (schemaInfo.columns != null) {
        return {
            status: DiscoverStatusEnum.DONE,
            schema: {
                name: schemaInfo.hash,
                columns: schemaInfo.columns.map(({ name, mapping, type }) => ({
                    name: name,
                    mapping: mapping,
                    type: type
                }))
            }
        };
    }

    return {
        status: DiscoverStatusEnum.WAIT
    }
}

const schemaCellRender = new Map();
schemaCellRender.set(DiscoverStatusEnum.DONE, (props) => {
    const { schema, onClickSchema } = props;
    return (
        <SchemaCell.Schema
            schemaName={schema.name}
            onClick={() => { onClickSchema({
                name: schema.name,
                columns: schema.columns
            }) }}
        />
    );
});
schemaCellRender.set(DiscoverStatusEnum.FAIL, (props) => {
    const { errorMsg, fileId } = props;
    return (
        <SchemaCell.InlineError
            errorTitle={Texts.discoverErrorLable}
            errorMsg={errorMsg}
        />
    );
});
schemaCellRender.set(DiscoverStatusEnum.WAIT, (props) => {
    return <SchemaCell.Discover onClick={() => { }} />
});
schemaCellRender.set(DiscoverStatusEnum.WIP, () => {
    return <SchemaCell.Loading />
});
function MixedSchemaCell(props) {
    const render = schemaCellRender.get(props.status);
    if (render == null) {
        return null;
    }
    return render(props);
}

class DiscoverTable extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    createRows(files) {
        return files.map(({ fileId, fullPath, size, type, schema }) => {
            const rowData = {
                fileId: fileId,
                fullPath: fullPath,
                size: size,
                type: type,
                schema: createSchemaCellProps(schema)
            };
            return rowData;
        });
    }

    render() {
        const {
            page,
            rowsPerPage,
            count,
            files,
            isLoading,
            onLoadData = (page, rowsPerPage) => {},
            onClickSchema = ({name, columns}) => {}
        } = this.props;

        const columns = [
            {
                name: "fullPath",
                label: "Path",
                options: { filter: false, sort: false }
            },
            {
                name: "size",
                label: "Size",
                options: { filter: false, sort: false }
            },
            {
                name: "type",
                label: "Type",
                options: { filter: false, sort: false }
            },
            {
                name: "schema",
                label: "Schema",
                options: {
                    filter: false,
                    sort: false,
                    customBodyRender: (props) => {
                        return <MixedSchemaCell {...props} onClickSchema={onClickSchema} />
                    }
                }
            },
        ];

        const options = {
            responsive: "scrollMaxHeight",
            selectableRows: "none",
            rowsPerPage: rowsPerPage,
            rowsPerPageOptions: [],
            download: false,
            print: false,
            disableToolbarSelect: true,
            searchOpen: false,
            search: false,
            filter: false,
            count: count,
            page: page,
            serverSide: true,
            onTableChange: (action, tableState) => {
                if (action === "changePage") {
                    onLoadData(tableState.page, rowsPerPage);
                }
            },
            setTableProps: () => ({
                padding: "none",
                size: "small",
            })
        };

        return (
            <div className="discoverTable">
                <MUIDataTable
                    title={Texts.tableTitle + (isLoading ? ' ... loading' : '')}
                    data={this.createRows(files)}
                    columns={columns}
                    options={options}
                />
                {(count > rowsPerPage) &&
                    <div className="pageInputArea">
                        <div className="label">Go to page:</div>
                        <input
                            type="number"
                            defaultValue={page + 1}
                            min={1}
                            onChange={e => {
                                const page = e.target.value ? Number(e.target.value) - 1 : 0
                                onLoadData(page, rowsPerPage);
                            }}
                            style={{ width: '80px' }}
                        />
                    </div>
                }
            </div>
        );
    }
}

export default DiscoverTable;
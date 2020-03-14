import React from "react";
import prettyBytes from 'pretty-bytes';
import MUIDataTable from "mui-datatables";
import * as SchemaCell from './SchemaCell'

const { Alert } = global;

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

function createSchemaCellProps(fileId, inProgressFiles, failedFiles, fileSchemas) {
    if (inProgressFiles.has(fileId)) {
        return {
            status: DiscoverStatusEnum.WIP
        };
    }

    const errorMsg = failedFiles.get(fileId);
    if (errorMsg != null) {
        return {
            status: DiscoverStatusEnum.FAIL,
            errorMsg: errorMsg
        };
    }

    const schema = fileSchemas.get(fileId);
    if (schema != null) {
        return {
            status: DiscoverStatusEnum.DONE,
            schema: {
                name: schema.name,
                columns: schema.columns.map(({ name, mapping, type }) => ({
                    name: name,
                    mapping: mapping,
                    type: type
                }))
            }
        };
    }

    return {
        status: DiscoverStatusEnum.WAIT,
        fileId: fileId
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
    const { errorMsg } = props;
    return (
        <SchemaCell.Error
            message={Texts.discoverErrorLable}
            onClick={() => {
                Alert.show({
                    title: Texts.discoverErrorTitle,
                    msg: errorMsg,
                    isAlert: true
                });
            }}
        />
    );
});
schemaCellRender.set(DiscoverStatusEnum.WAIT, (props) => {
    const { fileId, onDiscoverOne } = props;
    return <SchemaCell.Discover onClick={() => { onDiscoverOne(fileId); }} />
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

/*
<- discoverFile def ->
Array<fileInfo: {...}>
See S3Service.listFiles

<- inProgressFiles def ->
Set<fileId: string>

<- failedFiles def ->
Map<fileId: string, error: string>

<- fileSchemas def ->
key: fileId
value: {
    name: <schema name>,
    columns: [{name: '<column name>', mapping: '????', type: 'INTEGER/????'} ...]
}
*/
function DiscoverTable({
    discoverFiles = new Array(),
    inProgressFiles = new Set(),
    failedFiles = new Map(),
    fileSchemas = new Map(),
    onDiscoverOne = (fileId) => {},
    onClickSchema = ({name, columns}) => {}
} = {}) {
    const tableRows = discoverFiles.map((file) => {
        const rowData = {
            fileId: file.fileId,
            size: prettyBytes(file.sizeInBytes),
            type: file.type,
            schema: createSchemaCellProps(file.fileId, inProgressFiles, failedFiles, fileSchemas)
        };
        return rowData;
    });

    const columns = [
        {
            name: "fileId",
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
                    return <MixedSchemaCell {...props} onClickSchema={onClickSchema} onDiscoverOne={onDiscoverOne} />
                }
            }
        },
    ];

    const options = {
        responsive: "stacked",
        selectableRows: "none",
        rowsPerPage: 20,
        rowsPerPageOptions: [],
        download: false,
        print: false,
        disableToolbarSelect: true,
        searchOpen: false,
        setTableProps: () => ({
            padding: "none",
            size: "small",
        })
    };

    return (
        <div className="discoverTable">
            <MUIDataTable
                title={Texts.tableTitle}
                data={tableRows}
                columns={columns}
                options={options}
            />
        </div>
    );
}

export default DiscoverTable;
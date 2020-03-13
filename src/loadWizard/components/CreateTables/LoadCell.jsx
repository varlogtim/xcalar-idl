import React from 'react';

const Texts = {
    createButtonLabel: 'Create Table',
    creatingTable: 'Creating table ...',
    created: 'Created',
    createError: 'Error'
};

function Create({ onClick }) {
    return <button onClick={onClick}>{Texts.createButtonLabel}</button>
}

function Loading() {
    return <span>{Texts.creatingTable}</span>
}

function Success() {
    return <span>{Texts.created}</span>
}

function Error({
    error
}) {
    const [toExpand, setExpandState] = React.useState(false);
    if (error.length <= 20) {
        // when error is too short
        return (
            <span>error</span>
        )
    } else if (toExpand) {
        return (
            <span className="error">
                <pre>{error}</pre>
                <span className="action xc-action" onClick={() => { setExpandState(false); }}>Collapse</span>
            </span>
        )
    } else {
        return (
            <span className="error">
                <span className="label">{Texts.createError}</span>
                <span data-toggle="tooltip" data-title={error}>
                    {"(" + error.substring(0, 7) + "...)"}
                </span>
                <span className="action xc-action" onClick={() => { setExpandState(true); }}>Expand</span>
            </span>
        )
    }    
}

function Table({ name }) {
    return (
        <span>{name}</span>
    );
}

export { Create, Loading, Success, Error, Table };
// function LoadCell({schemasObject, setSchemasObject, schemaName, fileIdToStatus, setFileIdToStatus}) {

//     if (loadCellValue) {
//         return (<span>{loadCellValue}</span>);
//     } else {
//         function onClick() {
//             const tableName = 'A' + Math.random().toString(36).substring(2, 15).toUpperCase()
//             setLoadCellValue("Creating ...");
//             createTableFromSchema(tableName, schemasObject[schemaName].fileIds, schemasObject[schemaName].schema)
//             .then((resultTableName) => {
//                 schemasObject[schemaName].status = "Done!"
//                 schemasObject[schemaName].table = resultTableName;
//                 schemasObject[schemaName].fileIds.forEach(fileId => {
//                     fileIdToStatus[fileId] = resultTableName;
//                 });
//                 setFileIdToStatus({...fileIdToStatus});
//                 setSchemasObject(schemasObject);
//                 setLoadCellValue(resultTableName);
//             })
//             .catch((e) => {
//                 setLoadCellValue('Failed');
//                 console.error(e);
//             })

//         }
//         return <button onClick={onClick}>Create</button>
//     }
// }
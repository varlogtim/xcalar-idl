import React from 'react';

const Texts = {
    createButtonLabel: 'Create Table',
    creatingTable: 'Creating table ...',
    created: 'Created',
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
    message,
    onClick
}) {
    return (
        <span onClick={() => { onClick(); }}>{message}</span>
    );
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
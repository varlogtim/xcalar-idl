import React from 'react';

const Texts = {
    createButtonLabel: 'Create Table',
    creatingTable: 'Creating table ...',
    created: 'Table Created',
    createdWithComplement: 'Created with error table',
    createError: 'Error',
    ComplementTableHint: 'Some rows in the source files cannot be loaded, the failure reason is listed in the error table.'
};

function Create({ onClick }) {
    return <button className="btn btn-secondary btn-new" onClick={onClick}>{Texts.createButtonLabel}</button>
}

function Loading({ message }) {
    let loadingMessage = Texts.creatingTable;
    if (message) {
        loadingMessage += " (" + message + ")";
    }
    let pct = parseInt(message);
    if (!isNaN(pct)) {
        loadingMessage = <div className="loadingBarWrap">
                <div className="loadingBar" style={{width: pct + "%"}} ></div>
                <div className="loadingText">Creating... {pct + "%"}</div>
            </div>;
    }
    console.log(message);
    return <span>{loadingMessage}</span>
}

function Success({ complementTable }) {
    if (complementTable) {
        return (
            <span>
                {Texts.createdWithComplement} {complementTable}
                <i className="icon qMark xi-unknown" data-toggle="tooltip" data-container="body" data-title={Texts.ComplementTableHint}></i>
            </span>
        )
    } else {
        return <span><i className="icon xi-tick"></i>{Texts.created}</span>
    }
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
                <pre style={{whiteSpace: 'normal'}}>{error}</pre>
                <span className="action xc-action" onClick={() => { setExpandState(false); }}>Collapse</span>
            </span>
        )
    } else {
        return (
            <span className="error">
                <span className="label">{Texts.createError}</span>
                <span data-toggle="tooltip" data-container="body" data-title={error}>
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
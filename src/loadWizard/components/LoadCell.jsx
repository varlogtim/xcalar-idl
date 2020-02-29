import React from 'react';
import {createTableFromSchema} from '../utils/discoverSchema'

export default function LoadCell({schemasObject, setSchemasObject, schemaName, fileIdToStatus, setFileIdToStatus}) {
    const [loadCellValue, setLoadCellValue] = React.useState(schemasObject[schemaName].status)

    if (loadCellValue) {
        return (<span>{loadCellValue}</span>);
    } else {
        function onClick() {
            const tableName = 'A' + Math.random().toString(36).substring(2, 15).toUpperCase()
            setLoadCellValue("Creating ...");
            createTableFromSchema(tableName, schemasObject[schemaName].fileIds, schemasObject[schemaName].schema)
            .then((resultTableName) => {
                schemasObject[schemaName].status = "Done!"
                schemasObject[schemaName].table = resultTableName;
                schemasObject[schemaName].fileIds.forEach(fileId => {
                    fileIdToStatus[fileId] = resultTableName;
                });
                setFileIdToStatus({...fileIdToStatus});
                setSchemasObject(schemasObject);
                setLoadCellValue(resultTableName);
            })
            .catch((e) => {
                setLoadCellValue('Failed');
                console.error(e);
            })

        }
        return <button onClick={onClick}>Create</button>
    }
}
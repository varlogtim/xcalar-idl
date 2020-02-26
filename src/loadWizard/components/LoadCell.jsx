import React from 'react';
import {createTableFromSchema} from '../utils/discoverSchema'

export default function LoadCell({schemasObject, setSchemasObject, schemaName, fileIdToStatus, setFileIdToStatus}) {
    const [loadCellValue, setLoadCellValue] = React.useState(schemasObject[schemaName].status)

    if (loadCellValue) {
        return loadCellValue
    } else {
        function onClick() {
            const tableName = 'A' + Math.random().toString(36).substring(2, 15).toUpperCase()
            createTableFromSchema(tableName, schemasObject[schemaName].fileIds, schemasObject[schemaName].schema)
            schemasObject[schemaName].status = "Done!"
            schemasObject[schemaName].table = "T1"
            schemasObject[schemaName].fileIds.forEach(fileId => {
                fileIdToStatus[fileId] = "T1"
            })
            setFileIdToStatus({...fileIdToStatus})
            setSchemasObject(schemasObject)
            setLoadCellValue("Done!")
            
        }
        return <button onClick={onClick}>Create</button>
    }
}
import React from 'react';
import {addFileForDiscovery} from '../utils/discoverSchema'
const EC = require('../utils/EtaCost.js')
const EtaCost = new EC()

export default function SchemaCell({schemaCellGeneralProps, file}) {
    const {
        fileToSchema,
        setFileToSchema,
        schemasObject,
        setSchemasObject,
        discoverSchemaCalls,
        setDiscoverSchemaCalls,
        setSchemaInfo,
        fileIdToFile
    } = schemaCellGeneralProps

    const [schemaCellValue, setSchemaCellValue] = React.useState(fileToSchema[file.fileId]);

    async function handleSchemaDiscovery() {

        setSchemaCellValue('Discovering...');
        const discoveredSchemas = await addFileForDiscovery(file.fileId);

        // Split errors from schemas
        // XXX TODO: return erro and schemas in seperate objects
        const successSchemas = {};
        const errorSchemas = new Set();
        for (const [schemaName, schemaInfo] of Object.entries(discoveredSchemas)) {
            if (schemaName !== 'error') {
                successSchemas[schemaName] = schemaInfo;
            } else {
                // For failed files: { error: [{path, success, status, schema}, ...]}
                for (const error of schemaInfo) {
                    errorSchemas.add(error.path);
                }
            }
        }

        setFileToSchema(successSchemas);
        for (const schemaName in successSchemas) {
            delete schemasObject[schemaName]

            successSchemas[schemaName].path.forEach((path) => {
                const currentFile = fileIdToFile[path]
                const fileLoadEtaCost = EtaCost.load_etacost(currentFile)
                fileToSchema[currentFile.fileId] = schemaName

                if (schemaName in schemasObject) {
                    schemasObject[schemaName].size += currentFile.sizeInBytes
                    schemasObject[schemaName].count += 1
                    schemasObject[schemaName].fileIds.push(currentFile.fileId)
                    schemasObject[schemaName].totalCost += fileLoadEtaCost.fileCost
                    schemasObject[schemaName].totalEta += fileLoadEtaCost.fileEta
                } else {
                    schemasObject[schemaName] = {}
                    schemasObject[schemaName].size = currentFile.sizeInBytes
                    schemasObject[schemaName].count = 1
                    schemasObject[schemaName].fileIds = [currentFile.fileId]
                    schemasObject[schemaName].totalCost = fileLoadEtaCost.fileCost
                    schemasObject[schemaName].totalEta = fileLoadEtaCost.fileEta
                    schemasObject[schemaName].schema = discoveredSchemas[schemaName].schema
                }
            })
        }

        setSchemasObject({...schemasObject})

        // XXX TODO: This needs a clear flag to indicate the state of this cell
        if (errorSchemas.has(file.fileId)) {
            setSchemaCellValue('Error');
        } else if (fileToSchema[file.fileId]) {
            setSchemaCellValue(fileToSchema[file.fileId])
        }
    }

    if (schemaCellValue) {
        if (schemaCellValue === 'Discovering...') {
            return schemaCellValue
        }
        if (schemaCellValue === 'Error') {
            return 'Error';
        }
        return <button onClick={() => setSchemaInfo(JSON.stringify(schemasObject[fileToSchema[file.fileId]].schema))}>{schemaCellValue}</button>// FIX BUG
    } else {
        const onClick = function() {
            handleSchemaDiscovery()
        }
        discoverSchemaCalls[file.fileId] = onClick
        setDiscoverSchemaCalls(discoverSchemaCalls)
        return <button onClick={onClick}>Discover</button>
    }
}
import React from "react";
import SchemaChart from './SchemaChart'
import DiscoverTable from './DiscoverTable'
import NavButtons from './NavButtons'

    
const EC = require('../utils/EtaCost.js')
const EtaCost = new EC()

export default function DiscoverSchemas({props}) {
    const {
        screen,
        selectedData,
        fileToSchema,
        discoverSchemaCalls,
        schemaCellGeneralProps,
        setScreen,
        setScreenName,
        schemasObject,
        schemaInfo,
        bucket,
        path
    } = props

    const dataWithEta = EtaCost.discover_etacost(selectedData, 1000, 32)
    const {
        singleFileCost,
        singleFileEta,
        totalCost,
        totalEta,
    } = dataWithEta

  return (
    <div className="filesSelected" style={{display: screen === "SchemaDiscovery" ? "block" : "none"}}>
        <div id="discoverAll">
            <button onClick={() => {
                selectedData.forEach(file => {
                    if (!(file.fileId in fileToSchema) && file.fileId in discoverSchemaCalls) {
                        discoverSchemaCalls[file.fileId]()
                    }
                })
            }}>Discover All</button>
        </div>
        <div>
            <span>Total Cost: $<b>{totalCost.toFixed(8)}</b> </span>
            <span>Total Time: <b>{totalEta.toFixed(8)}</b> seconds </span>
        </div>
        <div>
            <span>Cost per file: $<b>{singleFileCost.toFixed(8)}</b> </span>
            <span>Time per file: <b>{singleFileEta.toFixed(8)}</b> seconds </span>
        </div>
        <DiscoverTable
            selectedData={selectedData}
            schemaCellGeneralProps={schemaCellGeneralProps}
            bucket={bucket}
            path={path}
        />
        <div id="schemaInfo">
            {schemaInfo}
        </div>
        <NavButtons
            left={{
                name: 'Back',
                toScreen: 'FilterData',
            }}
            right={{
                name: 'Next',
                toScreen: 'TableLoad',
            }}
            setScreen={setScreen}
            setScreenName={setScreenName}
        />
        <SchemaChart selectedData={selectedData} schemasObject={schemasObject}/>
    </div>
  );
}

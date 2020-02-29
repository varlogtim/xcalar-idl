import React from "react";
import LoadTable from './LoadTable'
import NavButtons from './NavButtons'

export default function CreateTables({props}) {
    const {
        screen,
        setScreen,
        setScreenName,
        schemasObject,
        setSchemasObject,
        fileIdToStatus,
        setFileIdToStatus,
    } = props

    const [schemaLoadTableInfo, setSchemaLoadTableInfo] = React.useState("");
    const [allTablesTotalCost, setAllTablesTotalCost] = React.useState(0);
    const [allTablesTotalEta, setAllTablesTotalEta] = React.useState(0);

    if (screen !== "TableLoad") {
        return null;
    }
    return (
        <div className="tableLoad">
            <div id="discoverAll">
                <button onClick={() => {

                    }}>Create All</button>
                    <span>Total Cost: $<b>{allTablesTotalCost.toFixed(8)}</b> </span>
                    <span>Total Time: <b>{allTablesTotalEta.toFixed(8)}</b> seconds </span>
            </div>
            <div className="browsersContainer">
                <LoadTable
                    props = {{
                        setSchemaLoadTableInfo,
                        schemasObject,
                        setSchemasObject,
                        fileIdToStatus,
                        setFileIdToStatus,
                        setAllTablesTotalCost,
                        setAllTablesTotalEta,
                    }}
                />
            </div>
            <div id="schemaInfo">
                {schemaLoadTableInfo}
            </div>

            <NavButtons
                left={{
                    name: 'Back',
                    toScreen: 'SchemaDiscovery',
                }}
                // right={{
                //     name: 'Next',
                //     toScreen: 'TableLoad',
                //     onClick: () => alert('Going to Xcalar Design')
                // }}
                setScreen={setScreen}
                setScreenName={setScreenName}
            />
        </div>
    );
}



import React from 'react';
import '../styles/App.less';
import ModelPanel from './ModelPanel'
import SourceData from './SourceData'
import BrowseDataSource from './BrowseDataSource'
import DiscoverSchemas from './DiscoverSchemas'
import CreateTables from './CreateTables'

function App() {
    const [data, setData] = React.useState([]);
    const [selectedData, setSelectedData] = React.useState([]);
    const [fileToSchema, setFileToSchema] = React.useState({})
    const [screen, setScreen] = React.useState('SourceData')
    const [screenName, setScreenName] = React.useState('Select Data Source')
    const [schemasObject, setSchemasObject] = React.useState({});
    const [bucket, setBucket] = React.useState('/');
    const [path, setPath] = React.useState('');
    const [modelInfo, setModelInfo] = React.useState('{“FileNameRule” : "*"}');
    const [modelSelected, setModelSelected] = React.useState('untitled');
    const [discoverSchemaCalls, setDiscoverSchemaCalls] = React.useState({});
    const [fileIdToStatus, setFileIdToStatus] = React.useState({});
    const [schemaInfo, setSchemaInfo] = React.useState("");
    const [fileIdToFile, setFileIdToFile] = React.useState({})


    const schemaCellGeneralProps = {
        fileToSchema,
        setFileToSchema,
        discoverSchemaCalls,
        setDiscoverSchemaCalls,
        schemasObject,
        setSchemasObject,
        setSchemaInfo,
        fileIdToFile
    }

    return (
        <div className="App">
            <ModelPanel
                screen={screen}
                setBucket={setBucket}
                setPath={setPath}
                modelSelected={modelSelected}
                setModelInfo={setModelInfo}
                setModelSelected={setModelSelected}
            />

            <div className={"mainArea " + (screen === "SourceData" ? "panelShown" : "")}>

                <div className="container">
                    <div id="header">{screenName}</div>

                    <SourceData
                        props = {{
                            screen,
                            bucket,
                            setBucket,
                            path,
                            setPath,
                            modelInfo,
                            modelSelected,
                            setScreen,
                            setScreenName,
                            setData,
                            fileIdToFile,
                            setFileIdToFile
                        }}
                    />

                    <BrowseDataSource
                        props = {{
                            screen,
                            setScreen,
                            setScreenName,
                            bucket,
                            path,
                            data,
                            setData,
                            setSelectedData,
                            setPath,
                            fileIdToFile,
                            setFileIdToFile
                        }}
                    />

                    <DiscoverSchemas
                        props = {{
                            screen,
                            selectedData,
                            fileToSchema,
                            discoverSchemaCalls,
                            selectedData,
                            schemaCellGeneralProps,
                            setScreen,
                            setScreenName,
                            schemasObject,
                            schemaInfo,
                            bucket,
                            path
                        }}
                    />

                    <CreateTables
                        props = {{
                            screen,
                            setScreen,
                            setScreenName,
                            schemasObject,
                            setSchemasObject,
                            fileIdToStatus,
                            setFileIdToStatus,
                        }}
                    />

                </div>
            </div>
        </div>
    );
}

export default App;

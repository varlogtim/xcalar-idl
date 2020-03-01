import React from "react";

export default function modelPanel({screen, setBucket, setPath, modelSelected, setModelInfo, setModelSelected}) {

    // We can store to kvstore using
    // XcalarKeyPut()

    // And then we can retrieve using something like this
    // const userName = 'userName'
    // const [models, setModels] = React.useState([])
    // React.useEffect(async () => {
    //     let modelKeysList = []
    //     let modelObjects = []
    //     try {
    //         modelKeysList = await XcalarKeyLookup(userName + "-loadWizardmodelKeysList", 1)
    //         modelKeysList = JSON.parse(modelKeysList.value)

    //         modelObjects = modelKeysList.map( async (modelKey) => {
    //             let modelObject = await XcalarKeyLookup(userName + "-loadWizardmodelKeysList", 1)
    //             modelObject = JSON.parse(modelObject)
    //             return modelObject
    //         })
    //     } catch (e) {
    //         console.error('Could not lookup modelKeysList', e)
    //     }

    //     console.log(modelObjects)

    // })

    const models = ['Untitled', 'Housing', 'Loans', 'Assets', 'Clients', 'xc-marketplace', 'xcfield', 'multi_schemas', 'mdmdemo']

    function handleModelClick(modelName) {
        let bucket = '/' + modelName + '/'
        let path = 'data/'
        let modelInfo = { FileNameRule : modelName + '*.csv' };
        if (modelName === 'newModel' || modelName === 'untitled') {
            bucket = '/';
            path = '';
            modelInfo = {FileNameRule : "*"};
        }
        if (modelName === 'xc-marketplace' ) {
            bucket = '/xcmarketplace-us-east-1/';
            path = 'datasets/';
            modelInfo = {FileNameRule : "*"};
        }
        if (modelName === 'xcfield' ) {
            bucket = '/xcfield/';
            path = 'idm_demo/';
            modelInfo = {FileNameRule : "*"};
        }
        if (modelName === 'multi_schemas' ) {
            bucket = '/xcfield/';
            path = 'instantdatamart/csv/';
            modelInfo = {FileNameRule : "*.csv"};
        }
        if (modelName === 'mdmdemo') {
            bucket = '/xcfield/';
            path = 'instantdatamart/mdmdemo/';
            modelInfo = { FileNameRule: '*' };
        }
        setBucket(bucket)
        setPath(path)
        setModelInfo(modelInfo)
        setModelSelected(modelName)
    }

    if (screen !== "SourceData") {
        return null;
    }
    return (
        <div className="modelPanel">
            <div className="modelPanelContent">
                <div className="header">Import Models</div>
                <button
                    className="addModel btn btn-secondary"
                    onClick={() => handleModelClick('untitled')}>
                        <i className="icon xi-plus fa-11"></i>
                        <span>Add Import Model</span>
                </button>
                <div className="modelList xc-grid listView">
                    {models.map(modelName => (
                        <div
                            key={modelName}
                            className={"grid-unit modelElement " + (modelSelected === modelName.toLowerCase() ? "active" : "")}
                            onClick={() => handleModelClick(modelName.toLowerCase())}
                        >
                            <span className="icon">❖</span>
                            <span className="modelName">{modelName}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
  );
}
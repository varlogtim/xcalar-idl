import React from "react";
import SourcePath from './SourcePath'
import NavButtons from './NavButtons'
import * as S3Service from '../services/S3Service'

export default function SourceData({props}) {
    const {
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
    } = props

    // console.log(modelSelected)
    const [showForensics, setShowForensics] = React.useState(false)

    const forensicsJson = `
{
    "glossary": {
        "title": "example glossary",
        "GlossDiv": {
            "title": "S",
            "GlossList": {
                "GlossEntry": {
                    "ID": "SGML",
                    "SortAs": "SGML",
                    "GlossTerm": "Standard Generalized Markup Language",
                    "Acronym": "SGML",
                    "Abbrev": "ISO 8879:1986",
                    "GlossDef": {
                        "para": "A meta-markup language, used to create markup languages such as DocBook.",
                        "GlossSeeAlso": ["GML", "XML"]
                    },
                    "GlossSee": "markup"
                }
            }
        }
    }
}
`


    const createTableButton = modelSelected === "untitled" ? "" : <button className="createTableButton">Create Table from Model</button>

    return (
        <div id="SourceData" style={{display: screen === "SourceData" ? "block" : "none"}}>
            <SourcePath bucket={bucket} setBucket={setBucket} path={path} setPath={setPath}/>
            <div className="modelInfo">
                Model rules:
                <br/>
                <b>{modelInfo}</b>
            </div>
            {createTableButton}
            <button className="getForensics" onClick={() => setShowForensics(true)}>Get Deep Forensics</button>
            <pre style={{display: showForensics ? "block" : "none"}}>
                {forensicsJson}
            </pre>
            <NavButtons
                right={{
                    name: 'Next',
                    toScreen: 'FilterData',
                    onClick: () => {
                        S3Service.listFiles(bucket + path).then((fileInfos) => {
                            S3Service.populateFiles(fileInfos, setData, fileIdToFile, setFileIdToFile);
                        })
                        // getS3Data(bucket + path, setData, fileIdToFile, setFileIdToFile)
                    }
                }}
                setScreen={setScreen}
                setScreenName={setScreenName}
            />
        </div>
    );
}
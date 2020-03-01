import React from "react";
import BucketChart from './BucketChart'
import FilterTable from './FilterTable'
import NavButtons from './NavButtons'
import * as S3Service from '../services/S3Service';
import expandS3Data from './expandS3Data'

export default function BrowseDataSource({props}) {
    const {
        screen,
        bucket,
        path,
        data,
        setData,
        setSelectedData,
        setScreen,
        setScreenName,
        setPath,
        fileIdToFile,
        setFileIdToFile
    } = props

    const [userSelectedData, setUserSelectedData] = React.useState([])

    function handleUpFolderClick() {
        if (path === '') {
            return
        }
        setData([])
        const partsToRemove = path.slice(-1) === '/' ? 2 : 1
        let parentDirectory = path.split("/").slice(0, -partsToRemove).join('/')
        if (parentDirectory !== '') {
            parentDirectory += '/'
        }
        setPath(parentDirectory);

        S3Service.listFiles(bucket + parentDirectory)
        .then((fileInfos) => {
            S3Service.populateFiles(fileInfos, setData, fileIdToFile, setFileIdToFile);
        });
        // getS3Data(bucket + parentDirectory, setData, fileIdToFile, setFileIdToFile)
    }

    if (screen !== "FilterData") {
        return null;
    }
  return (
    <div className="browseDataSourceScreen fileBrowser">
        <div>Select the data source that you want to import and then click the "Next" button.</div>
        <div className="fileBrowserPath">
            <i className="icon xi-upload-folder xc-icon-action upFolderIcon" onClick={handleUpFolderClick}></i>
            <input value={bucket + path} readOnly></input>
        </div>
        <FilterTable
            data={data}
            setSelectedData={setUserSelectedData}
            bucket={bucket}
            path={path}
            setPath={setPath}
            setData={setData}
            fileIdToFile={fileIdToFile}
            setFileIdToFile={setFileIdToFile}
        />
        <NavButtons
            left={{
                name: 'Back',
                toScreen: 'SourceData',
            }}
            right={{
                name: 'Next',
                toScreen: 'SchemaDiscovery',
                onClick: () => expandS3Data(userSelectedData, setSelectedData, fileIdToFile, setFileIdToFile)
            }}
            setScreen={setScreen}
            setScreenName={setScreenName}
        />
        <BucketChart data={userSelectedData.length ? userSelectedData : data}/>
    </div>
  );
}

import React from "react";
import * as Path from 'path'
import { FileType } from '../../services/SchemaService'
import InputDropdown from "../../../components/widgets/InputDropdown"
import NavButtons from '../NavButtons'

const Texts = {
    bucketName: 'S3 Bucket:',
    noBuckets: 'No bucket to select',
    path: 'Path:',
    fileType: 'File Type:',
    typeCsv: 'CSV',
    typeJson: 'JSON',
    typeJsonl: 'JSONL',
    typeParquet: 'Parquet',
    navButtonRight: 'Browse',
    updateForensics: 'Updating ...',
    getForensics: 'Get Directory Info',
    connector: 'Connector:'
};

/**
 * Pure Component: get forensics button
 * @param {*} props
 */
function GetForensicsButton(props) {
    const { isLoading = false, disabled = false, onClick = () => {} } = props || {};
    const buttonText = isLoading ? Texts.updateForensics : Texts.getForensics;
    const disableButton = isLoading || disabled;
    const classes = ['getForensics', 'btn', 'btn-secondary'].concat(disableButton ? ['btn-disabled'] : []);

    return (
        <button type="button" className={classes.join(' ')} onClick={() => { onClick() }}>{buttonText}</button>
    );
}

function isBucketNameInvalid(bucketName) {
    if (bucketName == null) {
        return true;
    }
    bucketName = Path.join('/', bucketName.trim());
    if (bucketName === '/') {
        return true;
    }
    return false;
}

function getConnectorList(connectors) {
    let list = [{
        text: "+ Create New Connector",
        value: "+NewConnector",
        className: "createNew"
    }];

    list = list.concat(connectors.map(type => {
        return {text: type, value: type};
    }));
    return list;
}

export default function SourcePath({
    bucket,
    onBucketChange,
    path,
    onPathChange,
    // fileType = FileType.CSV,
    // onFileTypeChange = (newType) => {},
    onNextScreen,
    connector,
    onConnectorChange = (connector) => {},
    isForensicsLoading,
    fetchForensics
}) {
    // the getAvailableS3Bucket is async call, it may not be ready the first it's rendernder,
    // so need to put it in the onOpen callback
    const [s3Buckets, setS3Buckets] = React.useState([]);
    const [connectors, setConnectors] = React.useState([]);

    const isBucketInvalid = isBucketNameInvalid(bucket);
    DSTargetManager.updateSelectedConnector = (newConnector) => {
        onConnectorChange(newConnector);
    }

    return (
        <div className="sourceForm">
            <form onSubmit={(e) => { e.preventDefault(); }}>
                <div className="row">
                    <div className="connectorSelection">
                        <label className="label">{Texts.connector}</label>
                        <InputDropdown
                            val={connector}
                            onSelect={onConnectorChange}
                            onOpen={() => {
                                const connectors = [];
                                const targets = DSTargetManager.getAllTargets();
                                for (let i in targets) {
                                    connectors.push(i);
                                }
                                connectors.sort();
                                setConnectors(connectors);
                            }}
                            list={getConnectorList(connectors)}
                            readOnly
                        />
                    </div>
                </div>
                <div className="row">
                    <div className="bucketSelection">
                        <label className="label">{Texts.bucketName}</label>
                        <InputDropdown
                            val={bucket}
                            onInputChange={(newBucket) => {
                                onBucketChange(newBucket.trim());
                            }}
                            onSelect={(newBucket) => {
                                onBucketChange(newBucket.trim());
                            }}
                            onOpen={() => {
                                if (DSTargetManager.isAWSConnector(connector)) {
                                    setS3Buckets([...DSTargetManager.getAvailableS3Buckets()]);
                                } else {
                                    setS3Buckets([]);
                                }
                            }}
                            list={s3Buckets.length
                                ? s3Buckets.map((bucket) => {
                                    return {text: bucket, value: bucket}
                                })
                                : []
                            }
                            hint={Texts.noBuckets}
                        />
                    </div>
                    {/* <GetForensicsButton
                        isLoading={ isForensicsLoading }
                        disabled={isBucketInvalid}
                        onClick={ () => { fetchForensics(bucket, path) }}
                    /> */}
                </div>
                <div className="row">
                    <div className="pathSelection">
                        <label className="label">{Texts.path}</label>
                        <input
                            className="xc-input input"
                            type="text"
                            value={path}
                            onChange={(e) => { onPathChange(e.target.value.trim()); }}
                            spellCheck="false"
                            placeholder="optional"
                        />
                    </div>
                    <NavButtons right={{
                        label: Texts.navButtonRight,
                        classNames: ["btn-secondary", "browse"].concat(isBucketInvalid ? ['btn-disabled'] : []),
                        onClick: () => { onNextScreen() }
                        }
                    }/>
                </div>
            </form>
        </div>
    );
}


import React from "react";
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
    typeParquet: 'Parquet',
    navButtonRight: 'Browse',
    updateForensics: 'Updating ...',
    getForensics: 'View Bucket Info'
};

/**
 * Pure Component: get forensics button
 * @param {*} props
 */
function GetForensicsButton(props) {
    const { isLoading = false, onClick = () => {} } = props || {};
    const buttonText = isLoading ? Texts.updateForensics : Texts.getForensics;
    const disableButton = isLoading;
    const classes = ['getForensics', 'btn', 'btn-secondary'].concat(disableButton ? ['btn-disabled'] : []);

    return (
        <button type="button" className={classes.join(' ')} onClick={() => { onClick() }}>{buttonText}</button>
    );
}

export default function SourcePath({
    bucket,
    onBucketChange,
    path,
    onPathChange,
    fileType = FileType.CSV,
    onFileTypeChange = (newType) => {},
    onNextScreen,
    isForensicsLoading,
    fetchForensics
}) {
    // the getAvailableS3Bucket is async call, it may not be ready the first it's rendernder,
    // so need to put it in the onOpen callback
    const [s3Bucket, setS3Bucket] = React.useState(DSTargetManager.getAvailableS3Bucket());
    return (
        <div className="sourceForm">
            <form onSubmit={(e) => { e.preventDefault(); }}>
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
                                setS3Bucket(DSTargetManager.getAvailableS3Bucket());
                            }}
                            list={s3Bucket ? [{text: s3Bucket, value: s3Bucket}] : []}
                            hint={Texts.noBuckets}
                        />
                    </div>
                    <GetForensicsButton isLoading={ isForensicsLoading } onClick={ () => { fetchForensics(bucket, path) }}/>
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
                        />
                    </div>
                    <div className="fileTypeSelection">
                        <label className="label">{Texts.fileType}</label>
                        <InputDropdown
                            val={fileType}
                            onInputChange={(type) => {
                                onFileTypeChange(type);
                            }}
                            onSelect={(type) => {
                                onFileTypeChange(type);
                            }}
                            list={
                                [FileType.CSV, FileType.JSON, FileType.PARQUET].map((type) => {
                                    return {text: type, value: type};
                                })
                            }
                            readOnly
                        />
                    </div>
                    <NavButtons right={{
                        label: Texts.navButtonRight,
                        classNames: ["btn-secondary", "browse"],
                        onClick: () => { onNextScreen() }
                        }
                    }/>
                </div>
            </form>
        </div>
    );
}


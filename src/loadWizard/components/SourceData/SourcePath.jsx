import React from "react";
import { FileType } from '../../services/SchemaService'
import InputDropdown from "../../../components/widgets/InputDropdown"
import NavButtons from '../NavButtons'

const Texts = {
    bucketName: 'S3 Bucket:',
    path: 'Path:',
    fileType: 'File Type:',
    typeCsv: 'CSV',
    typeJson: 'JSON',
    typeParquet: 'Parquet',
    navButtonRight: 'Browse'
};

export default function SourcePath({
    bucket,
    onBucketChange,
    path,
    onPathChange,
    fileType = FileType.CSV,
    onFileTypeChange = (newType) => {},
    onNextScreen
}) {
    // the getAvailableS3Bucket is async call, it may not be ready the first it's rendernder,
    // so need to put it in the onOpen callback
    const [s3Bucket, setS3Bucket] = React.useState(DSTargetManager.getAvailableS3Bucket());
    return (
        <div className="sourceForm">
            <form onSubmit={(e) => { e.preventDefault(); }}>
                <div class="row">
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
                            list={[
                                {text: s3Bucket, value: s3Bucket}
                            ]}
                        />
                    </div>
                </div>
                <div class="row">
                    <div className="pathSelection">
                        <label className="label">{Texts.path}</label>
                        <input
                            className="xc-input input"
                            type="text"
                            value={path}
                            onChange={(e) => { onPathChange(e.target.value.trim()); }}
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


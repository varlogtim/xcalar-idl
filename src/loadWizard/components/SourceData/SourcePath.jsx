import React from "react";
import S3BucketInput from './S3BucketInput';
import { FileType } from '../../services/SchemaService'
import InputDropdown from "../../../components/widgets/InputDropDown"

const Texts = {
    bucketName: 'S3 Bucket Name:',
    path: 'Path:',
    fileType: 'File Type:',
    typeCsv: 'CSV',
    typeJson: 'JSON',
    typeParquet: 'Parquet'
};

const fileTypeNames = new Map([
    [FileType.CSV, Texts.typeCsv],
    [FileType.JSON, Texts.typeJson],
    [FileType.PARQUET, Texts.typeParquet],
]);

export default function SourcePath({
    bucket,
    onBucketChange,
    path,
    onPathChange,
    fileType = FileType.CSV,
    onFileTypeChange = (newType) => {}
}) {
    const s3Bucket = DSTargetManager.getAvailableS3Bucket();
    return (
        <div className="sourceForm">
            <form onSubmit={(e) => { e.preventDefault(); }}>
                <div className="bucketSelection">
                    <label className="label">{Texts.bucketName}</label>
                    {/* <input
                        className="xc-input input"
                        list="buckets"
                        name="bucket"
                        value={bucket}
                        onChange={(e) => { onBucketChange(e.target.value.trim()); }}
                    /> */}
                     {/* <S3BucketInput
                        bucket={bucket}
                        onChange={(newBucket) => {
                            onBucketChange(newBucket.trim());
                        }}
                    /> */}
                    <InputDropdown
                        val={bucket}
                        onInputChange={(newBucket) => {
                            onBucketChange(newBucket.trim());
                        }}
                        onSelect={(newBucket) => {
                            onBucketChange(newBucket.trim());
                        }}
                        list={[
                            {text: s3Bucket, value: s3Bucket}
                        ]}
                    />
                </div>
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
            </form>
        </div>
    );
}
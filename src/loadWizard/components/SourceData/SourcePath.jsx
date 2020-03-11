import React from "react";
import S3BucketInput from './S3BucketInput';
import { FileType } from '../../services/SchemaService'

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
                    <S3BucketInput
                        bucket={bucket}
                        onChange={(newBucket) => {
                            onBucketChange(newBucket.trim());
                        }}
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
                    <div className="input">{
                        [FileType.CSV, FileType.JSON, FileType.PARQUET].map((type) => {
                            const typeName = fileTypeNames.get(type);
                            const isSelected = type === fileType;
                            return (
                                <label key={type} className="option">
                                    <input type="checkbox" checked={isSelected} onClick={() => {
                                        if (!isSelected) {
                                            onFileTypeChange(type);
                                        }
                                    }}/>
                                    <span>{typeName}</span>
                                </label>
                            )
                        })
                    }</div>
                </div>
            </form>
        </div>
    );
}
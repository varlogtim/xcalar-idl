import React from "react";

const Texts = {
    bucketName: 'S3 Bucket Name:',
    path: 'Path:'
};

export default function SourcePath({
    bucket,
    onBucketChange,
    path,
    onPathChange
}) {
  return (
    <div id="sourceForm">
        <form onSubmit={(e) => { e.preventDefault(); }}>
            <div className="bucketSelection">
                <label>{Texts.bucketName}</label>
                <input
                    className="xc-input"
                    list="buckets"
                    name="bucket"
                    value={bucket}
                    onChange={(e) => { onBucketChange(e.target.value.trim()); }}
                />
            </div>

            <div className="pathSelection">
                <label>{Texts.path}</label>
                <input
                    className="xc-input"
                    type="text"
                    value={path}
                    onChange={(e) => { onPathChange(e.target.value.trim()); }}
                />
            </div>
        </form>
    </div>
  );
}
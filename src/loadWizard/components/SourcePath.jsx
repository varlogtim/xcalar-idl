import React from "react";

export default function SourcePath({bucket, setBucket, path, setPath}) {

  const handleSubmit = (evt) => {
      evt.preventDefault();
  }


  function onChange(e) {
    setPath(e.target.value)
  }

  return (
    <div id="sourceForm">
        <form onSubmit={handleSubmit}>
            <div className="bucketSelection">
                <label>
                    S3 Bucket Name:
                </label>
                <input
                    list="buckets"
                    name="bucket"
                    value={bucket}
                    onChange={e => setBucket(e.target.value)}
                />
            </div>

            <div className="pathSelection">
                <label>
                    Path:
                </label>
                <input
                    type="text"
                    value={path}
                    onChange={onChange}
                />
            </div>
        </form>
    </div>
  );
}
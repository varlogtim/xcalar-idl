import * as React from "react";
import InputDropdown from '../../../components/widgets/InputDropdown'

function ColSchemaRow() {
    return (
        <div className="row">
            <InputDropdown
                val={"something"}
                onSelect={() => {

                }}
                list={
                    ["a", "b"].map((type, i) => {
                        return {text: type, value: type};
                    })
                }
            />
            <InputDropdown
                val={bucket}
                onInputChange={(newBucket) => {
                    // onBucketChange(newBucket.trim());
                }}
                onSelect={(newBucket) => {
                    // onBucketChange(newBucket.trim());
                }}
                onOpen={() => {
                    // if (DSTargetManager.isAWSConnector(connector)) {
                    //     setS3Buckets([...DSTargetManager.getAvailableS3Buckets()]);
                    // } else {
                    //     setS3Buckets([]);
                    // }
                }}
                list={s3Buckets.length
                    ? s3Buckets.map((bucket) => {
                        return {text: bucket, value: bucket}
                    })
                    : []
                }
                hint={Texts.noBuckets}
            />
            {/* <div className="name dropDownList">

                <input value="A" spellcheck="false" />
                <div className="list">
                    <ul></ul>
                    <div className="scrollArea top">
                        <i className="arrow icon xi-arrow-up"></i>
                    </div>
                    <div className="scrollArea bottom">
                        <i className="arrow icon xi-arrow-down"></i>
                    </div>
                </div>
            </div> */}
            <div className="mapping">
                <input value="" spellcheck="false" />
            </div>
            <InputDropdown
                val={"something"}
                onSelect={() => {

                }}
                list={
                    ["a", "b","csdkfhwuehfaiuwehfiuwefhaiuwhefaw", "d", "e", 1,2,3,4,5,6,7,8,9,1,2,3,4,5,6,7,8,9].map((type, i) => {
                        return {text: type, value: type};
                    })
                }
                readonly
            />
            {/* <div className="type dropDownList">
                <div className="text">DfInt64</div>
                <div className="iconWrapper">
                    <i className="icon xi-arrow-down"></i>
                </div>
                <div className="list">
                    <ul></ul>
                    <div className="scrollArea top">
                        <i className="arrow icon xi-arrow-up"></i>
                    </div>
                    <div className="scrollArea bottom">
                        <i className="arrow icon xi-arrow-down"></i>
                    </div>
                </div>
            </div> */}
            <i className="remove icon xi-close-no-circle xc-action fa-8"></i>
        </div>
    );
}

export default ColSchemaRow;
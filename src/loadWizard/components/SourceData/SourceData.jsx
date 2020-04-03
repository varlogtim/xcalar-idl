import * as Path from 'path';
import React from "react";
import SourcePath from './SourcePath'

const Texts = {
    updateForensics: 'Updating ...',
    getForensics: 'View Bucket Info',
    Reset: "Reset Selected Files"
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
        <button className={classes.join(' ')} onClick={() => { onClick() }}>{buttonText}</button>
    );
}

function ResetButton(props) {
    const {canReset, onReset} = props;
    const classNames = ["resetAll", "xc-action"];
    if (canReset) {
        return (
            <div className={classNames.join(" ")} onClick={(e) => onReset(e.target)}>
                {Texts.Reset}
            </div>
        )
    } else {
        classNames.push("xc-disabled");
        return (
            <div className={classNames.join(" ")}>
                {Texts.Reset}
            </div>
        )
    }
}

class SourceData extends React.Component {
    fetchForensics(bucket, path) {
        this.props.fetchForensics(bucket, path);
    }

    render() {
        const {
            bucket,
            path,
            fileType,
            onClickBrowse,
            onBucketChange,
            onPathChange,
            onFileTypeChange = (newType) => {}
        } = this.props;

        // const fullPath = Path.join(bucket, path);

        return (
            <div className="topSection">
                <SourcePath
                    bucket={bucket}
                    path={path}
                    onBucketChange={(newBucket) => { onBucketChange(newBucket); }}
                    onPathChange={(newPath) => { onPathChange(newPath); }}
                    fileType={fileType}
                    onFileTypeChange={onFileTypeChange}
                    onNextScreen={onClickBrowse}
                />
                {/* <div className="modelInfo">
                    Model rules:
                    <br/>
                    <b>{JSON.stringify(modelInfo)}</b>
                </div> */}
                <div className="formActions">
                    <GetForensicsButton isLoading={ this.props.isForensicsLoading } onClick={ () => { this.fetchForensics(bucket, path) }}/>
                    <ResetButton canReset={this.props.canReset} onReset={this.props.onReset} />
                </div>
            </div>
        );
    }
}

export default SourceData;
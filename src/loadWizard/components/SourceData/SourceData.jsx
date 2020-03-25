import * as Path from 'path';
import React from "react";
import SourcePath from './SourcePath'
import getForensics from '../../services/Forensics';

const Texts = {
    createTable: 'Create Table from Model',
    updateForensics: 'Updating ...',
    getForensics: 'View Bucket Info'
};

/**
 * Pure Component: create table button
 * @param {*} props
 */
function CreateTableButton(props) {
    const { isShow = false } = props || {};
    if (isShow) {
        return (<button className="createTableButton btn btn-secondary">{Texts.createTable}</button>);
    } else {
        return null;
    }
}

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

        const fullPath = Path.join(bucket, path);

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
                {/* <CreateTableButton isShow={ modelSelected === "untitled" } /> */}
                <GetForensicsButton isLoading={ this.props.isForensicsLoading } onClick={ () => { this.fetchForensics(bucket, path) }}/>
            </div>
        );
    }
}

export default SourceData;
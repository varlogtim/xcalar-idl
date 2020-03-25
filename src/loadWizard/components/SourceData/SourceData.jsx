import * as Path from 'path';
import React from "react";
import SourcePath from './SourcePath'
import * as S3Service from '../../services/S3Service'

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

/**
 * Pure Component: forensics information
 * @param {*} props
 */
function ForensicsContent(props) {
    const {
        isShow = false,
        message = [],
        stats
    } = props || {};
    if (isShow) {
        return (
            <div className="forensicsContent">
                <div>{ message.map((m, i) => (<div key={i}>{m}</div>)) }</div>
                {stats == null ? null : <pre>{JSON.stringify(stats, null, '  ')}</pre>}
            </div>
        );
    } else {
        return null;
    }
}

class SourceData extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            showForensics: false,
            forensicsMessage: [],
            isForensicsLoading: false
        };

        this.metadataMap = new Map();
    }

    async fetchForensics(bucketName, pathPrefix) {
        const fullPath = Path.join(bucketName, pathPrefix);
        this.metadataMap.delete(fullPath);
        this.setState({
            showForensics: true,
            forensicsMessage: ['Fetching S3 metadata ...'],
            isForensicsLoading: true
        });
        try {
            const finalTableName = await S3Service.createKeyListTable({
                bucketName: bucketName
            });
            this.setState({
                showForensics: true,
                forensicsMessage: [...this.state.forensicsMessage, `Query AWS done ... ${finalTableName}`],
                isForensicsLoading: true
            });
            const stats = await S3Service.getForensicsStats(bucketName, pathPrefix);
            this.metadataMap.set(fullPath, stats);
            this.setState({
                showForensics: true,
                forensicsMessage: [...this.state.forensicsMessage, 'Calculation done ...'],
                isForensicsLoading: false
            });
            this.clearMessage(2000);
        } catch (e) {
            console.error(e);
            this.setState({
                showForensics: true,
                forensicsMessage: [...this.state.forensicsMessage, `Fetch error: ${JSON.stringify(e)}`],
                isForensicsLoading: false
            });
            this.clearMessage(5000);
        }
    }

    clearMessage(delay) {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.setState({
                    forensicsMessage: []
                });
                resolve();
            }, delay);
        });
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
        const forensicsStats = this.metadataMap.get(fullPath);

        return (
            <div className="topSection">
                <SourcePath
                    bucket={bucket}
                    onBucketChange={(newBucket) => { onBucketChange(newBucket); }}
                    path={path}
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
                <GetForensicsButton isLoading={ this.state.isForensicsLoading } onClick={ () => { this.fetchForensics(bucket, path) }}/>
                <ForensicsContent isShow={ this.state.showForensics } stats={ forensicsStats } message={ this.state.forensicsMessage } />
            </div>
        );
    }
}

export default SourceData;
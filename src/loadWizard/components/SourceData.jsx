import * as Path from 'path';
import React from "react";
import SourcePath from './SourcePath'
import NavButtons from './NavButtons'
import * as S3Service from '../services/S3Service'

/**
 * Pure Component: create table button
 * @param {*} props
 */
function CreateTableButton(props) {
    const { isShow = false } = props || {};
    if (isShow) {
        return (<button className="createTableButton">Create Table from Model</button>);
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
    const buttonText = isLoading ? 'Updating ...' : 'Get Deep Forensics';
    const disableButton = isLoading;

    return (
        <button disabled={disableButton} className="getForensics" onClick={() => { onClick() }}>{buttonText}</button>
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
        stats = {}
    } = props || {};
    if (isShow) {
        return (
            <div>
                <div>{ message.map((m, i) => (<div key={i}>{m}</div>)) }</div>
                <pre>{JSON.stringify(stats, null, '  ')}</pre>
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

    async fetchForensics(fullPath) {
        this.setState({
            showForensics: true,
            forensicsMessage: ['Fetching S3 metadata ...'],
            isForensicsLoading: true
        });
        try {
            const finalTableName = await S3Service.createKeyListTable({
                basePath: fullPath
            });
            this.setState({
                showForensics: true,
                forensicsMessage: [...this.state.forensicsMessage, `Query AWS done ... ${finalTableName}`],
                isForensicsLoading: true
            });
            const stats = await S3Service.getForensicsStats(fullPath);
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
            screen,
            bucket,
            setBucket,
            path,
            setPath,
            modelInfo,
            modelSelected,
            setScreen,
            setScreenName,
            setData,
            fileIdToFile,
            setFileIdToFile
        } = this.props;

        if (screen !== 'SourceData') {
            return null;
        }

        const fullPath = Path.join(bucket, path);
        const forensicsStats = this.metadataMap.get(fullPath) || {};

        return (
            <div>
                <SourcePath bucket={bucket} setBucket={setBucket} path={path} setPath={setPath} />
                <div className="modelInfo">
                    Model rules:
                    <br/>
                    <b>{JSON.stringify(modelInfo)}</b>
                </div>
                <CreateTableButton isShow={ modelSelected === "untitled" } />
                <GetForensicsButton isLoading={ this.state.isForensicsLoading } onClick={ () => { this.fetchForensics(fullPath) }}/>
                <ForensicsContent isShow={ this.state.showForensics } stats={ forensicsStats } message={ this.state.forensicsMessage } />
                <NavButtons
                    right={{
                        name: 'Next',
                        toScreen: 'FilterData',
                        onClick: () => {
                            S3Service.listFiles(bucket + path, modelInfo.FileNamePattern).then((fileInfos) => {
                                S3Service.populateFiles(fileInfos, setData, fileIdToFile, setFileIdToFile);
                            })
                        }
                    }}
                    setScreen={setScreen}
                    setScreenName={setScreenName}
                />
            </div>
        );
    }
}

export default SourceData;
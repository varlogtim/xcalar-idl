import React from "react";
// import SchemaChart from './SchemaChart'
import DiscoverTable from './DiscoverTable'
import SourceCSVArgSection from './SourceCSVArgSection';
import NavButtons from '../NavButtons'
import EC from '../../utils/EtaCost'
import * as SchemaService from '../../services/SchemaService';

const Texts = {
    Loading: 'Loading ...',
    discoverAll: 'Discover All',
    cancelDiscoverAll: 'Stop',
    stoppingDiscoverAll: 'Stopping',
    navButtonLeft: 'Browse',
    navButtonRight: 'Create Table',
    totalCost: 'Total Cost: $',
    totalTime: 'Total Time:',
    seconds: 'seconds',
    fileCost: 'Cost per file: $',
    fileTime: 'Time per file:'
};

const EtaCost = new EC();

/**
 * Component: Discover All button
 * @param {*} param0
 */
function DiscoverAllButton({ onClick, children }) {
    return (
        <div className="discoverAll">
            <button
                className="btn btn-secondary"
                onClick={() => { onClick(); }}
            >{Texts.discoverAll}</button>
        </div>
    );
}

/**
 * Component: Cancel Discover All button
 * @param {*} param0
 */
class CancelDiscoverAllButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isStopping: false
        };
    }

    render() {
        const { onClick, children } = this.props;
        const { isStopping } = this.state;

        const btnClasses = ['btn', 'btn-secondary'];
        if (isStopping) {
            btnClasses.push('btn-disabled');
        }
        const btnText = isStopping
            ? Texts.stoppingDiscoverAll
            : Texts.cancelDiscoverAll;

        return (
            <div className="discoverAll">
                <button
                    className={btnClasses.join(' ')}
                    onClick={() => {
                        this.setState({
                            isStopping: true
                        });
                        onClick();
                    }}
                >{btnText}...{children}</button>
            </div>
        );
    }
}

/**
 * Component: Discover All section, which consists of DiscoverAll & CancelAll button
 * @param {*} param0
 */
function DiscoverAllSection({ onClickDiscoverAll, onClickCancelAll, doneCount, totalCount }) {
    if (onClickDiscoverAll != null) {
        return (<DiscoverAllButton onClick={() => { onClickDiscoverAll(); }} />);
    }
    if (onClickCancelAll != null && doneCount != null && totalCount != null) {
        const donePercentage = totalCount === 0
            ? 100
            : Math.ceil(doneCount / totalCount * 1000)/10;
        return (
            <CancelDiscoverAllButton onClick={() => { onClickCancelAll(); }}>
                {donePercentage}%
            </CancelDiscoverAllButton>
        );
    }
    return null;
}

/**
 * Component: Cost Estimation for discovering
 * @param {*} param0
 */
function CostEstimation({ files }) {
    const {
        singleFileCost,
        singleFileEta,
        totalCost,
        totalEta,
    } = EtaCost.discover_etacost(files, 1000, 32);

    return (
        <div>
            <div>
                <span>{Texts.totalCost}<b>{totalCost.toFixed(8)}</b></span>
                <span>{Texts.totalTime} <b>{totalEta.toFixed(8)}</b> {Texts.seconds}</span>
            </div>
            <div>
                <span>{Texts.fileCost}<b>{singleFileCost.toFixed(8)}</b></span>
                <span>{Texts.fileTime} <b>{singleFileEta.toFixed(8)}</b> {Texts.seconds}</span>
            </div>
        </div>
    );
}

class DiscoverSchemas extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            schemaShowing: null
        };
    }
    render() {
        const {
            inputSerialization,
            isLoading,
            discoverFiles,
            inProgressFiles,
            failedFiles,
            fileSchemas,
            onDiscoverFile,
            onClickDiscoverAll,
            onCancelDiscoverAll,
            onInputSerialChange,
            onPrevScreen,
            onNextScreen
        } = this.props;
        const schemaInfo = this.state.schemaShowing;
        const needConfig = SchemaService.InputSerializationFactory.getFileType(inputSerialization).has(SchemaService.FileType.CSV);

        if (isLoading) {
            return (
                <div className="filesSelected"><span>{Texts.Loading}</span></div>
            );
        } else {
            return (
                <div className="filesSelected">
                    <DiscoverAllSection
                        onClickDiscoverAll={onClickDiscoverAll}
                        onClickCancelAll={onCancelDiscoverAll}
                        doneCount={fileSchemas.size + failedFiles.size}
                        totalCount={discoverFiles.length}
                    />
                    {/* <CostEstimation files={discoverFiles} /> */}
                    {(!needConfig)? null : <SourceCSVArgSection
                        config={inputSerialization}
                        onConfigChange={(newConfig) => {
                            this.setState({ schemaShowing: null });
                            onInputSerialChange(newConfig);
                        }}
                    />}
                    <DiscoverTable
                        discoverFiles={discoverFiles}
                        inProgressFiles={inProgressFiles}
                        failedFiles={failedFiles}
                        fileSchemas={fileSchemas}
                        onDiscoverOne={onDiscoverFile}
                        onClickSchema={({name, columns}) => {
                            this.setState({ schemaShowing: {
                                name: name,
                                columns: columns
                            }});
                        }}
                    />
                    <NavButtons
                        left={{
                            label: Texts.navButtonLeft,
                            onClick: () => { onPrevScreen(); }
                        }}
                        right={{
                            label: Texts.navButtonRight,
                            disabled: fileSchemas.size === 0,
                            onClick: () => { onNextScreen(); }
                        }}
                    />
                    {schemaInfo == null ? null : <pre>{JSON.stringify(schemaInfo, null, ' ')}</pre>}
                    {/* <SchemaChart selectedData={selectedData} schemasObject={schemasObject}/> */}
                </div>
            );
        }
    }
}

export default DiscoverSchemas;
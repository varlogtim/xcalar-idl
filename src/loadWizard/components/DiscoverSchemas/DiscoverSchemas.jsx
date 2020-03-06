import React from "react";
// import SchemaChart from './SchemaChart'
import DiscoverTable from './DiscoverTable'
import NavButtons from '../NavButtons'
import EC from '../../utils/EtaCost'

const Texts = {
    Loading: 'Loading ...',
    discoverAll: 'Discover All',
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
function DiscoverAllButton({ onClick }) {
    return (
        <div id="discoverAll">
            <button
                className="btn btn-secondary"
                onClick={() => { onClick(); }}
            >{Texts.discoverAll}</button>
        </div>
    );
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
            isLoading,
            discoverFiles,
            inProgressFiles,
            failedFiles,
            fileSchemas,
            onDiscoverFile,
            onClickDiscoverAll,
            onPrevScreen,
            onNextScreen
        } = this.props;
        const schemaInfo = this.state.schemaShowing;

        return (
            <div className="filesSelected">
                {isLoading ? <div><span>{Texts.loading}</span></div> : null}
                {isLoading ? null : <DiscoverAllButton onClick={onClickDiscoverAll} />}
                {isLoading ? null : <CostEstimation files={discoverFiles} />}
                {isLoading ? null : <DiscoverTable
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
                />}
                {isLoading || schemaInfo == null ? null : <pre>{JSON.stringify(schemaInfo, null, ' ')}</pre>}
                <NavButtons
                    left={{ label: Texts.navButtonLeft, onClick: () => { onPrevScreen(); } }}
                    right={fileSchemas.size > 0
                        ? { label: Texts.navButtonRight, onClick: () => { onNextScreen(); }}
                        : null
                    }
                />
                {/* <SchemaChart selectedData={selectedData} schemasObject={schemasObject}/> */}
            </div>
        );
    }
}

export default DiscoverSchemas;
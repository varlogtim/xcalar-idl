import React from "react";
import LoadTable from './LoadTable'
import NavButtons from '../NavButtons'

const Texts = {
    createTableAll: 'Create All',
    totalCost: 'Total Cost: $',
    totalTime: 'Total Time: ',
    timeSeconds: 'seconds',
    navButtonLeft: 'Discover Schema'
};

class CreateTables extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            schemaShowing: null
        };
    }

    render() {
        const {
            schemas, // Map<schemaName, {path: [], columns: []}>
            fileMetas, // Map<fileId, fileInfo> see S3Service.listFiles
            schemasInProgress,  // Set<schemaName>
            schemasFailed,  // Map<schemaName, errorMsg>
            tables, // Map<schemaName, tableName>
            onClickCreateTable = (schemaName) => {},
            onPrevScreen
        } = this.props;

        const schemaInfo = this.state.schemaShowing != null
            ? schemas.get(this.state.schemaShowing)
            : null;

        return (
            <div className="tableLoad">
                {/* XXX please verify if the id should be loadAll or discoverAll */}
                {/* <div>
                    <button className="btn btn-secondary" onClick={() => {}}>{Texts.createTableAll}</button>
                    <span>{Texts.totalCost}<b>{allTablesTotalCost.toFixed(8)}</b></span>
                    <span>{Texts.totalTime}<b>{allTablesTotalEta.toFixed(8)}</b> {Texts.timeSeconds}</span>
                </div> */}

                <div className="browsersContainer">
                    <LoadTable
                        schemas={schemas}
                        schemasInProgress={schemasInProgress}
                        schemasFailed={schemasFailed}
                        tables={tables}
                        files={fileMetas}
                        onClickSchema={(schemaName) => {
                            this.setState({ schemaShowing: schemaName });
                        }}
                        onClickCreateTable={onClickCreateTable}
                    />
                </div>
                <NavButtons left={{ label: Texts.navButtonLeft, onClick: () => { onPrevScreen(); } }} />
                {schemaInfo == null ? null : <pre>{JSON.stringify(schemaInfo, null, ' ')}</pre>}
            </div>
        );
    }
}


export default CreateTables;

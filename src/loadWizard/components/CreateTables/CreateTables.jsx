import React from "react";
import LoadTable from './LoadTable'

const Texts = {
    createTableAll: 'Create All',
    totalCost: 'Total Cost: $',
    totalTime: 'Total Time: ',
    timeSeconds: 'seconds',
    navButtonLeft: 'Back',
    navButtonRight: 'Navigate to Notebook',
    navToNotebookHint: "Please create a table first",
};

class CreateTables extends React.Component {
    render() {
        const {
            isLoading,
            page, rowsPerPage,
            schemas, // Array<{schema: {hash, columns}, files: { count, size, maxPath }}>
            schemasInProgress,  // Set<schemaName>
            schemasFailed,  // Map<schemaName, errorMsg>
            tablesInInput, // Map<schemaName, tableName>
            tables, // Map<schemaName, tableName>
            onClickCreateTable = (schemaName, tableName) => {},
            onFetchData,
            onTableNameChange,
            onShowSchema,
            children
        } = this.props;

        return (
            <div className="tableLoad">
                {children}{isLoading ? ' ... loading' : null}
                <div className="browsersContainer">
                    <LoadTable
                        isLoading={isLoading}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        onFetchData={onFetchData}
                        schemas={schemas}
                        schemasInProgress={schemasInProgress}
                        schemasFailed={schemasFailed}
                        tablesInInput={tablesInInput}
                        tables={tables}
                        onClickSchema={(schemaName) => {
                            for (const {schema} of schemas) {
                                if (schema.hash === schemaName) {
                                    onShowSchema({ columns: schema.columns }, schemaName);
                                    return;
                                }
                            }
                        }}
                        onClickCreateTable={onClickCreateTable}
                        onTableNameChange={onTableNameChange}
                    />
                </div>
            </div>
        );
    }

    _navToNotebook() {
        HomeScreen.switch(UrlToTab.notebook);
    }
}

class CreateTables2 extends React.Component {
    render() {
        const {
            schemas, // Map<schemaName, {path: [], columns: []}>
            fileMetas, // Map<fileId, fileInfo> see S3Service.listFiles
            schemasInProgress,  // Set<schemaName>
            schemasFailed,  // Map<schemaName, errorMsg>
            tablesInInput, // Map<schemaName, tableName>
            tables, // Map<schemaName, tableName>
            onClickCreateTable = (schemaName, tableName) => {},
            onTableNameChange,
            onShowSchema,
            onPrevScreen,
            children
        } = this.props;

        return (
            <div className="tableLoad">
                {children}
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
                        tablesInInput={tablesInInput}
                        tables={tables}
                        files={fileMetas}
                        onClickSchema={(schemaName) => {
                            this.props.onShowSchema(schemas.get(schemaName), schemaName);
                        }}
                        onClickCreateTable={onClickCreateTable}
                        onTableNameChange={onTableNameChange}
                    />
                </div>
            </div>
        );
    }

    _navToNotebook() {
        HomeScreen.switch(UrlToTab.notebook);
    }
}


export default CreateTables;

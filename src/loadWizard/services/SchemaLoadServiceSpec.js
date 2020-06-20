import { expect } from 'chai'
import { FileType, defaultInputSerialization } from './SchemaService'
import { createDiscoverApp, isFailedSchema } from './SchemaLoadService'
import { LoadSession } from './sdk/Session'
import { randomName } from './sdk/Api'

describe('SchemaLoadService Test', function() {
    let app = null;
    let selectedSchemaHash = null;
    let tableQuery = null;
    let resultTables = null;
    const publishedTables = {
        data: null, icv: null
    };

    before(async () => {
        await cleanupSession();

        app = createDiscoverApp({
            path: '/xcfield/instantdatamart/mdmdemo/000fccb',
            filePattern: '*.csv',
            inputSerialization: defaultInputSerialization.get(FileType.CSV),
            isRecursive: true
        });
        expect(app != null, 'Check Load App').to.be.true;
        await app.init();
        await app.run();
    });

    after(async () => {
        await cleanupSession();
        if (publishedTables.data != null) {
            try {
                await deleteIMD(publishedTables.data);
            } catch(_) {
                // Ignore error
            }
        }
        if (publishedTables.icv != null) {
            try {
                await deleteIMD(publishedTables.icv);
            } catch(_) {
                // Ignore error
            }
        }
    });

    it ('Metadata tables of schema discovery', async () => {
        const reportTable = await app.waitForReportTable();
        expect(reportTable != null, 'Check Report Table').to.be.true;

        const fileTable = await app.waitForFileTable();
        expect(fileTable != null, 'Check File Table').to.be.true;

        const schemaTable = await app.waitForReportTable();
        expect(schemaTable != null, 'Check Schema Table').to.be.true;

        // Randomly choose one schema
        const discoverReport = await app.getReport(0, 10);
        for (const { schema } of discoverReport.schemas) {
            if (!isFailedSchema(schema.hash)) {
                selectedSchemaHash = schema.hash;
                break;
            }
        }
        expect(selectedSchemaHash != null, 'Check Selected Schema').to.be.true;
    });

    it('Dataflow to create table', async () => {
        // Generate DFs
        tableQuery = await app.getCreateTableQuery(selectedSchemaHash);
        expect(tableQuery != null, 'Check Table Queries').to.be.true;
    });

    it('DF execution', async () => {
        const session = app.getSession();
        const numTablesBefore = (await session.listTables({
            namePattern: '*', isGlobal: false
        })).length;
        const numDatasetsBefore = (await session.callLegacyApi(
            () => XcalarGetDatasets()
        )).datasets.length;

        // Execute DFs and create tables
        resultTables = await app.createResultTables(tableQuery);

        // Validation
        // Verify existence of load/data/comp tables
        expect(resultTables != null).to.be.true;
        let isICVExist = false;
        try {
            await resultTables.comp.getInfo();
            isICVExist = true;
        } catch(_) {
            isICVExist = false;
        }
        expect(isICVExist, 'Check ICV table existence').to.be.true;

        let isDataExist = false;
        try {
            await resultTables.data.getInfo();
            isDataExist = true;
        } catch(_) {
            isDataExist = false;
        }
        expect(isDataExist, 'Check Data table existence').to.be.true;

        let isLoadExist = false;
        try {
            await resultTables.load.getInfo();
            isLoadExist = true;
        } catch(_) {
            isLoadExist = false;
        }
        // Load table: XDB should be deleted, but dag should be there
        expect(isLoadExist, 'Check Load table existence').to.be.false;

        // Verify temp. table cleanup
        const numTablesAfter = (await session.listTables({
            namePattern: '*', isGlobal: false
        })).length;
        expect(numTablesAfter).to.equal(numTablesBefore + 2);

        // Verify datasets
        const numDatasetsAfter = (await session.callLegacyApi(
            () => XcalarGetDatasets()
        )).datasets.length;
        expect(numDatasetsBefore).to.equal(numDatasetsAfter);
    });

    it('Publish tables', async () => {
        const baseName = `TEST_LOAD_${randomName().toUpperCase()}`;
        const dataName = `${baseName}_DATA`;
        const icvName = `${baseName}_ICV`;

        // Publish tables
        const compHasData = await app.publishResultTables(
            resultTables,
            { data: dataName, comp: icvName },
            tableQuery
        );

        // Validation
        // Verify existence of IMD tables
        const dataTable = await app.getSession().getPublishedTable({ name: dataName });
        expect(dataTable != null, 'Check Data table exists').to.be.true;
        const icvTable = await app.getSession().getPublishedTable({ name: icvName });
        if (compHasData) {
            expect(icvTable != null, 'Check ICV table exists').to.be.true;
        } else {
            expect(icvTable == null, 'Check ICV table not exists').to.be.true;
        }

        publishedTables.data = dataName;
        publishedTables.icv = icvName;
    });

    it('Restore IMD table', async () => {
        const tableName = publishedTables.data;
        await deactivateIMD(tableName);
        await activateIMD(tableName);

        // Validation
        const imdTable = await app.getSession().getPublishedTable({
            name: tableName
        });
        expect(imdTable != null, 'Check Data table exists').to.be.true;
        expect(imdTable.isActive(), 'Check Data table active').to.be.true;
    });

    it('Restore IMD table from source node', async ()=> {
        const tableName = publishedTables.data;
        const node = new DagNodeIMDTable({});
        node.setParam({ source: tableName })
        await node.fetchAndSetSubgraph(tableName);

        // Delete IMD table
        await deleteIMD(tableName);
        // Restore from source node
        await PTblManager.Instance.restoreTableFromNode(node);

        // Validation
        const imdTable = await app.getSession().getPublishedTable({
            name: tableName
        });
        expect(imdTable != null, 'Check Data table exists').to.be.true;
        expect(imdTable.isActive(), 'Check Data table active').to.be.true;
    });

    async function cleanupSession() {
        try {
            const loadSession = new LoadSession();
            await loadSession.destroy();
        } catch(_) {
            // Ignore errors
        }
    }

    async function deactivateIMD(name) {
        const tableInfo = new PbTblInfo({ name: name });
        await tableInfo.deactivate();
    }

    async function activateIMD(name) {
        const tableInfo = new PbTblInfo({ name: name });
        await tableInfo.activate();
    }

    async function deleteIMD(name) {
        const tableInfo = new PbTblInfo({ name: name });
        await tableInfo.delete();
    }
});
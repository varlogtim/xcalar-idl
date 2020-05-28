import { expect } from 'chai'
import { FileType, defaultInputSerialization } from './SchemaService'
import { createDiscoverApp, isFailedSchema } from './SchemaLoadService'
import { LoadSession } from './sdk/Session'

describe('SchamaLoadService Test', function() {
    describe('createDiscoverApp', function() {
        // XXX TODO
    });

    describe('LoadApp.run', function() {
        // XXX TODO
    });

    describe('LoadApp.getCreateTableQuery', function() {
        // XXX TODO
    });

    describe('LoadApp.createResultTables', function() {
        let app = null;
        let tableQuery = null;

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

            // Randomly choose one schema
            const reportTable = await app.waitForReportTable();
            expect(reportTable != null, 'Check Report Table').to.be.true;
            let selectedSchemaHash = null;
            const discoverReport = await app.getReport(0, 10);
            for (const { schema } of discoverReport.schemas) {
                if (!isFailedSchema(schema.hash)) {
                    selectedSchemaHash = schema.hash;
                    break;
                }
            }
            expect(selectedSchemaHash != null, 'Check Selected Schema').to.be.true;

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
            const tables = await app.createResultTables(tableQuery);

            // Validation
            // Verify existence of load/data/comp tables
            expect((await tables.load.getInfo()) != null).to.be.true;
            expect((await tables.comp.getInfo()) != null).to.be.true;
            expect((await tables.data.getInfo()) != null).to.be.true;

            // Verify temp. table cleanup
            const numTablesAfter = (await session.listTables({
                namePattern: '*', isGlobal: false
            })).length;
            expect(numTablesAfter).to.equal(numTablesBefore + 3);

            // Verify datasets
            const numDatasetsAfter = (await session.callLegacyApi(
                () => XcalarGetDatasets()
            )).datasets.length;
            expect(numDatasetsBefore).to.equal(numDatasetsAfter);
        });
    });

    async function cleanupSession() {
        const loadSession = new LoadSession();
        await loadSession.destroy();
    }
});
import { normalizeQueryString } from './Api';
import { PublishedTable } from './PublishedTable';

const {
    XcalarMakeResultSetFromTable,
    XcalarIndexFromTable,
    XcalarSetAbsolute,
    XcalarGetNextPage,
    XcalarSetFree,
    XcalarDeleteTable
} = global;


class Table {
    constructor({ session, tableName }) {
        this._session = session;
        this._tableName = tableName;
        this._cursors = new Array();
        this._metadata = null;
    }

    getName() {
        return this._tableName;
    }

    createCursor(isTrack = true) {
        const cursor = new Cursor({
            session: this._session,
            table: this
        });
        if (isTrack) {
            this._cursors.push(cursor);
        }
        return cursor;
    }

    async publish(publishedName) {
        const srcTableName = this.getName();
        // Publish table
        await this._session.callLegacyApi(
            () => XcalarPublishTable(
                srcTableName, publishedName
            )
        );

        // Persiste creation DF for XD
        const pubTable = new PublishedTable({ name: publishedName, srcTable: this });
        await pubTable.saveDataflow();

        return pubTable;
    }

    /**
     * Publish table and persiste creation dataflow for restoration
     * @param {string} publishedName
     * @param {any[]} query
     */
    async publishWithQuery(publishedName, query) {
        const srcTableName = this.getName();
        // Publish table
        await this._session.callLegacyApi(
            () => XcalarPublishTable(
                srcTableName, publishedName
            )
        );

        // Persiste creation DF for XD
        const pubTable = new PublishedTable({ name: publishedName, srcTable: this });
        await pubTable.saveDataflowFromQuery(query);

        return pubTable;
    }

    async publish2(publishedName) {
        const xcalarRowNumPkName = "XcalarRankOver";
        const tempTables = [];
        let srcTableName = this.getName();
        let destTableName = '';

        try {
            const queryList = [];

            const { columns } = await this.getInfo();
            const colNames = new Set(columns.map((c) => c.name));
            if (!colNames.has(xcalarRowNumPkName)) {
                // Add Xcalar Row Number PK
                destTableName = this.getName() + '_rowNum';
                let txId = Transaction.start({ simulate: true });
                await this._session.callLegacyApi(() => XcalarGenRowNum(
                    srcTableName, destTableName, xcalarRowNumPkName, txId
                ));
                queryList.push(normalizeQueryString(Transaction.done(txId,  {
                    noNotification: true,
                    noCommit: true
                })));
                tempTables.push(new Table({
                    session: this._session, tableName: destTableName
                }));
                srcTableName = destTableName;

                // Index on Xcalar Row Number PK
                destTableName = this.getName() + '_index';
                txId = Transaction.start({ simulate: true });
                await this._session.callLegacyApi(() => XcalarIndexFromTable(
                    srcTableName,
                    [{
                        name: xcalarRowNumPkName,
                        type: ColumnType.integer,
                        keyFieldName:"",
                        ordering:XcalarOrderingT.XcalarOrderingUnordered
                    }],
                    destTableName,
                    null,
                    txId
                ));
                queryList.push(normalizeQueryString(Transaction.done(txId,  {
                    noNotification: true,
                    noCommit: true
                })));
                tempTables.push(new Table({
                    session: this._session, tableName: destTableName
                }));
                srcTableName = destTableName;
            }

            const queryString = `[${queryList.join(',')}]`;
            // Run pre create query
            if (queryList.length > 0) {
                await this._session.executeQuery({
                    queryString: queryString,
                    queryName: `q_pub_${srcTableName}`
                });
            }

            // Publish table
            await this._session.callLegacyApi(
                () => XcalarPublishTable(
                    srcTableName, publishedName
                )
            );

            return new PublishedTable({ name: publishedName, preCreateQuery: queryList.map((q) => JSON.parse(q)) });
        } finally {
            await Promise.all(tempTables.map(t => t.destroy()));
        }
    }

    async destroy() {
        try {
            while (this._cursors.length > 0) {
                const cursor = this._cursors.pop();
                await cursor.close();
            }
            await this._session.callLegacyApi(
                () => XcalarDeleteTable(this._tableName, null, false, true)
            );
        } catch(e) {
            console.warn(`Destroy table(${this._tableName}) fail`, e);
        }
    }

    async getInfo() {
        if (this._metadata == null) {
            const metadata = await this._session.callLegacyApi(() => XcalarGetTableMeta(this._tableName));
            this._metadata = {
                columns: metadata.valueAttrs.map(({name, type}) => ({ name: name, type: type })),
                keys: metadata.keyAttr.map(({name, type, ordering}) => ({ name: name, type: type, ordering: ordering }))
            };
        }
        return {
            columns: this._metadata.columns.map((v) => ({...v})),
            keys: this._metadata.columns.map((v) => ({...v}))
        };
    }
}

class Cursor {
    constructor({ session, table }) {
        this._session = session;
        this._scrTable = table;
        this._resultSetId = null;
        this._numRows = null;
    }

    async open() {
        if (this._resultSetId == null) {
            // resultSetInfo: XcalarApiMakeResultSetOutputT
            const tableName = this._scrTable.getName();
            const resultSetInfo = await this._session.callLegacyApi(
                () => XcalarMakeResultSetFromTable(tableName)
            );
            this._resultSetId = resultSetInfo.resultSetId;
            this._numRows = resultSetInfo.numEntries;
        }
    }

    isReady() {
        return this._resultSetId !== null;
    }

    getNumRows() {
        if (this._resultSetId == null) {
            throw new Error('Cursor not open');
        }
        return this._numRows;
    }

    async position(pos) {
        if (this._resultSetId == null) {
            throw new Error('Cursor not open');
        }
        if (pos >= this._numRows) {
            return false;
        }
        const resultSetId = this._resultSetId;
        await this._session.callLegacyApi(
            () => XcalarSetAbsolute(resultSetId, pos)
        );
        return true;
    }

    async fetch(numRows) {
        if (this._resultSetId == null) {
            throw new Error('Cursor not open');
        }
        try {
            const resultSetId = this._resultSetId;
            const fetchResult = await this._session.callLegacyApi(
                () => XcalarGetNextPage(resultSetId, numRows)
            );
            return [...fetchResult.values];
        } catch(e) {
            console.error('Cursor.fetch error: ', e);
            return [];
        }
    }

    async fetchJson(numRows) {
        const stringList = await this.fetch(numRows);
        return stringList.map((s) => JSON.parse(s));
    }

    async close() {
        try {
            if (this._resultSetId != null) {
                const resultSetId = this._resultSetId;
                this._resultSetId = null;
                this._numRows = null;
                await this._session.callLegacyApi(
                    () => XcalarSetFree(resultSetId)
                );
            }
        } catch(e) {
            console.warn(e);
        }
    }
}

export { Table, Cursor };
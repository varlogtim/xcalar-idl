import { getThriftHandler } from './Api';
import { PublishedTable } from './PublishedTable';

const {
    XcalarMakeResultSetFromTable,
    XcalarGetNextPage,
    XcalarSetFree,
    XcalarDeleteTable
} = global;


class Table {
    constructor({ session, tableName }) {
        this._session = session;
        this._tableName = tableName;
        this._cursors = new Array();
    }

    getName() {
        return this._tableName;
    }

    createCursor() {
        const cursor = new Cursor({
            session: this._session,
            table: this
        });
        this._cursors.push(cursor);
        return cursor;
    }

    async publish(publishedName) {
        await this._session.callLegacyApi(
            () => xcalarApiPublish(
                getThriftHandler(),
                this.getName(),
                publishedName
            )
        );

        return new PublishedTable({ name: publishedName });
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
}

class Cursor {
    constructor({ session, table }) {
        this._session = session;
        this._scrTable = table;
        this._resultSetId = null;
    }

    async open() {
        // resultSetInfo: XcalarApiMakeResultSetOutputT
        const tableName = this._scrTable.getName();
        const resultSetInfo = await this._session.callLegacyApi(
            () => XcalarMakeResultSetFromTable(tableName)
        );
        this._resultSetId = resultSetInfo.resultSetId;
    }

    async fetch(numRows) {
        if (this._resultSetId == null) {
            throw new Error('Cursor not open');
        }
        const resultSetId = this._resultSetId;
        const fetchResult = await this._session.callLegacyApi(
            () => XcalarGetNextPage(resultSetId, numRows)
        );
        return [...fetchResult.values];
    }

    async close() {
        try {
            if (this._resultSetId != null) {
                const resultSetId = this._resultSetId;
                await this._session.callLegacyApi(
                    () => XcalarSetFree(resultSetId)
                );
                this._resultSetId = null;
            }
        } catch(e) {
            console.warn(e);
        }
    }
}

export { Table, Cursor };
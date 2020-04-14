import { DeleteItems } from "../components/modals/GeneralDeleteModal/GeneralDeleteModal";

const UNKNWON_TIME: number = -1;

class DeleteTableModalService {
    public getTableList(): Promise<DeleteItems[]> {
        const PTblManager = window["PTblManager"];
        return new Promise((resolve, reject) => {
            PTblManager.Instance.getTablesAsync(true)
            .then((pbTables) => {
                let tables: DeleteItems[] = pbTables.map((pbTable) => {
                    return {
                        "tableId": pbTable.name,
                        "name": pbTable.name,
                        "size": pbTable.size,
                        "locked": false,
                        "checked": false,
                        "date": pbTable.createTime * 1000,
                    }
                });
                resolve(tables);
            })
            .fail((error) => {
                reject(error);
            });
        });
    }

    public deleteTablesConfirm(tableNames: string[]): Promise<void> {
        if (tableNames.length === 0) {
            return Promise.resolve();
        } else {
            const Alert = window["Alert"];
            const xcStringHelper = window["xcStringHelper"];
            const IMDTStr = window["IMDTStr"];
            return new Promise((resolve, reject) => {
                Alert.show({
                    'title': IMDTStr.DelTable,
                    'msg': xcStringHelper.replaceMsg(IMDTStr.DelTableMsg, {
                        "tableName": tableNames.join(", ")
                    }),
                    "highZindex": true,
                    'onConfirm': () => {
                        resolve();
                    },
                    'onCancel': () => {
                        reject(true);
                    }
                });
            });
        }
    }

    public deleteTables(tableNames: string[]): Promise<void> {
        // XXX TODO: remove window hack
        const PTblManager = window["PTblManager"];
        return PTblManager.Instance.deleteTablesOnConfirm(tableNames, true, false);
    }

    public sortTables(
        tables: DeleteItems[] = [],
        sortKey: string,
        reverseSort: boolean
    ): DeleteItems[] {
        if (tables == null || tables.length === 0) {
            return tables;
        }
        tables = this._sortTables(tables, sortKey);
        if (reverseSort) {
            tables.reverse();
        }

        return tables;
    }

    private _sortTables(
        tables: DeleteItems[],
        sortKey: string
    ): DeleteItems[] {
        // sort by name first, no matter what case
        tables.sort((a, b) =>  a.name.localeCompare(b.name));

        // temoprarily not support sort on size
        if (sortKey === "size") {
            tables.sort((a, b) => {
                let sizeA = a.size;
                let sizeB = b.size;
                if (sizeA === UNKNWON_TIME) {
                    sizeA = null;
                }

                if (sizeB === UNKNWON_TIME) {
                    sizeB = null;
                }

                if (sizeA == null && sizeB == null) {
                    return 0;
                } else if (sizeA == null) {
                    return -1;
                } else if (sizeB == null) {
                    return 1;
                } else if (sizeA === sizeB) {
                    return 0;
                } else if (sizeA > sizeB) {
                    return 1;
                } else {
                    return -1;
                }
            });
        } else if (sortKey === "date") {
            let PTblManager = window["PTblManager"];
            tables.sort((a, b) => {
                let pA = PTblManager.Instance.getTableByName(a.name);
                let pB = PTblManager.Instance.getTableByName(b.name);
                let tA = pA ? pA.createTime : null;
                let tB = pB ? pB.createTime : null;

                if (tA == null && tB == null) {
                    return 0;
                } else if (tA == null) {
                    return -1;
                } else if (tB == null) {
                    return 1;
                } else if (tA === tB) {
                    return 0;
                } else if (tA > tB) {
                    return 1;
                } else {
                    return -1;
                }
            });
        }
        return tables;
    }
}

export default new DeleteTableModalService();
import dict from "../lang";
import { DeleteItems } from "../components/modals/GeneralDeleteModal/GeneralDeleteModal";

export const id: string = "deleteTableModal";
const ResultSetTStr = dict.ResultSetTStr;
const UNKNWON_TIME: number = -1;

class DeleteTableModalService {
    public getTableList(): Promise<DeleteItems[]> {
        let XcalarGetTables = window["XcalarGetTables"];
        let xcHelper = window["xcHelper"];
        let DagTblManager = window["DagTblManager"];
        return new Promise((resolve, reject) => {
            XcalarGetTables("*")
            .then((result) => {
                let nodeInfo = result.nodeInfo;
                let tables: DeleteItems[] = [];
                for (let i = 0; i < nodeInfo.length; i++) {
                    const node = nodeInfo[i];
                    tables.push({
                        "tableId": node.dagNodeId,
                        "name": node.name,
                        "size": node.size,
                        "locked": DagTblManager.Instance.hasLock(node.name) || node.pinned,
                        "checked": false,
                        "date": DagTblManager.Instance.getTimeStamp(node.name)
                    });
                }
                resolve(tables);
            })
            .fail((error) => {
                reject(error);
            });
        });
    }

    public deleteTablesConfirm(tableNames: string[]): Promise<void> {
        if (tableNames.length === 0) {
            return new Promise((resolve) => {
                resolve();
            });
        } else {
            let Alert = window["Alert"];
            return new Promise((resolve, reject) => {
                Alert.show({
                    "title": ResultSetTStr.Del,
                    "msg": ResultSetTStr.DelMsg,
                    "highZindex": true,
                    "onCancel": () => {
                        reject(true);
                    },
                    "onConfirm": () => {
                        resolve();
                    }
                });
            });
        }
    }

    public deleteTables(tableNames: string[]): Promise<void> {
        // XXX TODO: remove window hack
        let DagTblManager = window["DagTblManager"];
        let MemoryAlert = window["MemoryAlert"];
        tableNames.forEach((tableName) => DagTblManager.Instance.deleteTable(tableName, false));

        if (tableNames.length === 0) {
            return new Promise((resolve) => {
                resolve()
            });
        } else {
            return new Promise((resolve, reject) => {
                DagTblManager.Instance.forceDeleteSweep()
                .then(() => {
                    resolve();
                })
                .fail((err) => {
                    reject();
                    this._failHandler(err);
                })
                .always(() => {
                    // should re-dected memory usage
                    MemoryAlert.Instance.check();
                });
            });
        }
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
            let DagTblManager = window["DagTblManager"];
            tables.sort((a, b) => {
                let tA = DagTblManager.Instance.getTimeStamp(a.name);
                let tB = DagTblManager.Instance.getTimeStamp(b.name);
                if (tA === UNKNWON_TIME) {
                    tA = null;
                }

                if (tB === UNKNWON_TIME) {
                    tB = null;
                }

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

    // XXX replace window variables with react components
    private _failHandler(args: any[]): void {
        let $container = $(`#${id}`);
        let hasSuccess: boolean = false;
        let failedTables: string[] = [];
        let failedMsg: string = "";
        let failFound: boolean = false;
        let noDelete: boolean = false;
        let xcStringHelper = window["xcStringHelper"];
        let StatusBox = window["StatusBox"];
        let ErrTStr = window["ErrTStr"];
        let StatusMessageTStr = window["StatusMessageTStr"];
        let ErrWRepTStr = window["ErrWRepTStr"];
        args = args || [];
        for (let i = 0; i < args.length; i++) {
            if (args[i] && args[i].error && args[i].tableName) {
                failFound = true;
                let tableName: string = args[i].tableName
                failedTables.push(tableName);
                let error: string = args[i].error;
                if (!failedMsg && error !== ErrTStr.CannotDropLocked) {
                    failedMsg = error;
                } else if (error === ErrTStr.CannotDropLocked) {
                    noDelete = true;
                }

                let $gridUnit = $container.find('.grid-unit').filter((_i, el) => {
                    let $grid = $(el);
                    return ($grid.find('.name').text() === tableName);
                });
                $gridUnit.addClass('failed');

            } else if (args[i] == null) {
                hasSuccess = true;
            }
        }
        if (!failFound) {
            return;
        }

        if (!failedMsg && noDelete) {
            // only show cannot dropped message if ther are no other
            // fail messages
            failedMsg = ErrTStr.CannotDropLocked;
        }
        let errorMsg;
        if (hasSuccess) {
            if (failedTables.length === 1) {
                errorMsg = failedMsg + ". " +
                xcStringHelper.replaceMsg(ErrWRepTStr.ResultSetNotDeleted, {
                    "name": failedTables[0]
                });
            } else {
                errorMsg = failedMsg + ". " +
                           StatusMessageTStr.PartialDeleteResultSetFail + ".";
            }
        } else {
            errorMsg = failedMsg + ". " + ErrTStr.NoResultSetDeleted;
        }
        let $firstGrid = $container.find('.grid-unit.failed').eq(0);
        StatusBox.show(errorMsg, $firstGrid, false, {
            "side": "left",
            "highZindex": true
        });
    }
}

export default new DeleteTableModalService();
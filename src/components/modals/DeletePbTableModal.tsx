import * as React from "react";
import dict from "../../lang";
import GeneralDeleteModal, {DeleteItems} from "./GeneralDeleteModal/GeneralDeleteModal";
import service from "../../services/DeletePbTableService";

const {DeletePbTableModalTStr} = dict;

export default class DeleteTableModal extends React.Component<{}, {}> {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <GeneralDeleteModal
                id={"deletePbTableModal"} 
                triggerButton={"deletePbTableButton"}
                header={DeletePbTableModalTStr.header}
                instruct={DeletePbTableModalTStr.instr}
                fetchList={this._fetch}
                sortList={this._sort}
                onConfirm={this._onConfirm}
                onSubmit={this._onSubmit}
            />
        )
    }

    private async _fetch(): Promise<DeleteItems[]> {
        return service.getTableList();
    }

    private _sort(tables: DeleteItems[], key: string, reverseSort: boolean): DeleteItems[] {
        return service.sortTables(tables, key, reverseSort);
    }

    private _onConfirm(tables: string[]): Promise<void> {
        return service.deleteTablesConfirm(tables);
    }

    private _onSubmit(tables: string[]): Promise<void> {
        return service.deleteTables(tables);
    }
}
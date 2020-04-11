import * as React from "react";
import dict from "../../lang";
import GeneralDeleteModal, {DeleteItems} from "./GeneralDeleteModal/GeneralDeleteModal";
import service, { id } from "../../services/DeleteTableModalService";

const {DeleteTableModalTStr} = dict;

export default class DeleteTableModal extends React.Component<{}, {}> {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <GeneralDeleteModal
                id={id} 
                triggerButton={"monitor-delete"}
                header={DeleteTableModalTStr.header}
                instruct={DeleteTableModalTStr.instr}
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
import * as React from "react";
import dict from "../../../lang";
import Modal from "../Modal";
import Waitbox from "../../widgets/Waitbox";
import Content from "./Content";
import service, { id, TableAttrs } from "../../../services/DeleteTableModalService";

const {CommonTStr, DeleteTableModalTStr, StatusMessageTStr} = dict;

type DeleteTableModalState = {
    display: boolean;
    isFetching: boolean;
    submitStatus: string;
    tables: TableAttrs[];
    sortKey: string;
    reverseSort: boolean;
    error: any;
};
export default class DeleteTableModal extends React.Component<{}, DeleteTableModalState> {
    constructor(props) {
        super(props);
        this._selectTable = this._selectTable.bind(this);
        this._selectAllTables = this._selectAllTables.bind(this);
        this._sort = this._sort.bind(this);
        this.state = this._getDefultState();
    }

    componentDidMount() {
        document.getElementById("monitor-delete").addEventListener("click", () => {
            this._show();
        });
    }

    render() {
        const [classNames, waitingMessage] = this._getClassesAndWaitingMessage();
        const checkedTables = this.state.tables.filter((table) => !table.locked && table.checked);
        return (
            <Modal
                id={id} 
                header={DeleteTableModalTStr.header}
                instruct={DeleteTableModalTStr.instr}
                display={this.state.display}
                confirm={{
                    text: DeleteTableModalTStr.Confirm,
                    disabled: checkedTables.length === 0,
                    callback: () => this._submit()
                }}
                close={{
                    text: CommonTStr.Cancel,
                    callback: () => this._hide()
                }}
                className={classNames.join(" ")}
                style={this._getStyle()}
                options={{ locked: true }}
            >
                {waitingMessage &&
                <section className="loadingSection">
                    <div className="loadWrap">
                        <Waitbox>{waitingMessage}</Waitbox>
                    </div>
                </section>}
                <Content
                    tables={...this.state.tables}
                    sortKey={this.state.sortKey}
                    onCheckboxClick={this._selectTable}
                    onSelectAllClick={this._selectAllTables}
                    onSort={this._sort}
                />
            </Modal>
        )
    }

    private _getDefultState(): DeleteTableModalState {
        return {
            display: false,
            tables: [],
            error: null,
            sortKey: "name",
            reverseSort: false,
            isFetching: false,
            submitStatus: null
        };
    }

    private _getStyle(): {
        width: string,
        height: string,
        minWidth: string,
        minHeight: string
    } {
        return {
            width: "650px",
            height: "608px",
            minWidth: "500px",
            minHeight: "500px"
        };
    }

    private _getClassesAndWaitingMessage(): [string[], string] {
        let classNames: string[] = [];
        let waitingMessage: string = "";
        if (this.state.isFetching) {
            classNames.push("load");
            waitingMessage = CommonTStr.Loading;
        } else if (this.state.submitStatus === "pending") {
            classNames.push("load");
            waitingMessage = StatusMessageTStr.DeleteResultSets;
        } else if (this.state.submitStatus === "confirm") {
            classNames.push("lowZindex");
        }
        return [classNames, waitingMessage];
    }

    private _show(): void {
        this.setState({display: true});
        this._fetch();
    }

    private _hide(): void {
        this.setState(this._getDefultState());
    }

    private async _fetch(): Promise<void> {
        this.setState({isFetching: true});
        try {
            let tables: TableAttrs[] = await service.getTableList();
            this.setState({
                isFetching: false,
                tables: service.sortTables(tables, this.state.sortKey, this.state.reverseSort)
            })
        } catch (e) {
            this.setState({
                isFetching: false,
                error: e
            });
        }
    }

    private async _submit() {
        let tables: string[] = [];
        this.state.tables.forEach((table) => {
            if (!table.locked && table.checked) {
                tables.push(table.name);
            }
        });

        if (tables.length === 0) {
            return;
        }

        this.setState({ submitStatus: "confirm"} );

        try {
            await service.deleteTablesConfirm(tables);
            this.setState({ submitStatus: "pending"} );
            await service.deleteTables(tables);
            this.setState({ submitStatus: null} );
            this._fetch();
        } catch (cancel) {
            if (cancel === true) {
                this.setState({ submitStatus: null} );
            } else {
                this.setState({ submitStatus: "fail"} );
                this._fetch();
            }
        }
    }

    private _selectTable(index: number): void {
        let tables = this.state.tables.map((table, i) => {
            if (i === index) {
                table.checked = !table.checked;
            }
            return table;
        });
        this.setState({ tables });
    }

    private _selectAllTables(checked: boolean): void {
        let tables = this.state.tables.map((table, i) => {
            table.checked = table.locked ? false : checked;
            return table;
        });
        this.setState({ tables });
    }

    private _sort(key: string): void {
        let reverseSort = (key === this.state.sortKey) ? !this.state.reverseSort : false;
        let tables = service.sortTables(this.state.tables, key, reverseSort);
        this.setState({
            sortKey: key,
            reverseSort,
            tables
        });
    }
}
import * as React from "react";
import dict from "../../../lang";
import Modal from "../Modal";
import Waitbox from "../../widgets/Waitbox";
import Content from "./Content";

const {CommonTStr, StatusMessageTStr} = dict;

export interface DeleteItems {
    tableId: string;
    name: string;
    size: number;
    locked: boolean;
    checked: boolean;
    date: number;
};

type GeneralDeleteProps = {
    triggerButton: string;
    id: string;
    header: string;
    instruct: string;
    fetchList: () => Promise<DeleteItems[]>;
    sortList: (oldList: DeleteItems[], key: string, reversetSort: boolean) => DeleteItems[];
    onConfirm: (listToDelete: string[]) => Promise<void>;
    onSubmit: (listToDelete: string[]) => Promise<void>;
};

type GeneralDeleteModalState = {
    display: boolean;
    isFetching: boolean;
    submitStatus: string;
    items: DeleteItems[];
    sortKey: string;
    reverseSort: boolean;
    error: any;
};
export default class GeneralDeleteModal extends React.Component<GeneralDeleteProps, GeneralDeleteModalState> {
    constructor(props) {
        super(props);
        this._selectTable = this._selectTable.bind(this);
        this._selectAllTables = this._selectAllTables.bind(this);
        this._sort = this._sort.bind(this);
        this.state = this._getDefultState();
    }

    componentDidMount() {
        document.getElementById(this.props.triggerButton).addEventListener("click", () => {
            this._show();
        });
    }

    render() {
        const [classNames, waitingMessage] = this._getClassesAndWaitingMessage();
        const selectedItems = this.state.items.filter((item) => !item.locked && item.checked);
        return (
            <Modal
                id={this.props.id} 
                header={this.props.header}
                instruct={this.props.instruct}
                display={this.state.display}
                confirm={{
                    text: CommonTStr.Confirm,
                    disabled: selectedItems.length === 0,
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
                    id={this.props.id}
                    tables={...this.state.items}
                    sortKey={this.state.sortKey}
                    onCheckboxClick={this._selectTable}
                    onSelectAllClick={this._selectAllTables}
                    onSort={this._sort}
                />
            </Modal>
        )
    }

    private _getDefultState(): GeneralDeleteModalState {
        return {
            display: false,
            items: [],
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
            const items: DeleteItems[] = await this.props.fetchList();
            this.setState({
                isFetching: false,
                items: this.props.sortList(items, this.state.sortKey, this.state.reverseSort)
            })
        } catch (e) {
            this.setState({
                isFetching: false,
                error: e
            });
        }
    }

    private async _submit() {
        const items: string[] = [];
        this.state.items.forEach((item) => {
            if (!item.locked && item.checked) {
                items.push(item.name);
            }
        });

        if (items.length === 0) {
            return;
        }

        this.setState({ submitStatus: "confirm"} );

        try {
            await this.props.onConfirm(items);
            this.setState({ submitStatus: "pending"} );
            await this.props.onSubmit(items);
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
        const items = this.state.items.map((item, i) => {
            if (i === index) {
                item.checked = !item.checked;
            }
            return item;
        });
        this.setState({ items });
    }

    private _selectAllTables(checked: boolean): void {
        const items = this.state.items.map((item) => {
            item.checked = item.locked ? false : checked;
            return item;
        });
        this.setState({ items });
    }

    private _sort(key: string): void {
        const reverseSort = (key === this.state.sortKey) ? !this.state.reverseSort : false;
        const items = this.props.sortList(this.state.items, key, reverseSort);
        this.setState({
            sortKey: key,
            reverseSort,
            items
        });
    }
}
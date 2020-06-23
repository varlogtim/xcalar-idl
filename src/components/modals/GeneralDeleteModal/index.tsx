import * as React from "react";
import dict from "../../../lang";
import Modal from "../Modal";
import Waitbox from "../../widgets/Waitbox";
import Content from "./Content";

const { CommonTStr, StatusMessageTStr } = dict;

export interface DeleteItems {
  id: string;
  name: string;
  size: number;
  locked: boolean;
  checked: boolean;
  date: number;
};

type Props = {
  triggerButton: string;
  id: string;
  header: string;
  instruct?: string;
  noSize?: boolean;
  noDate?: boolean;
  fetchList: () => Promise<DeleteItems[]>;
  getConfirmAlert: (selectedItems: DeleteItems[]) => {title: string, msg: string};
  onSubmit: (selectedItems: DeleteItems[]) => Promise<void>;
};

type State = {
  show: boolean;
  isFetching: boolean;
  submitStatus: string;
  items: DeleteItems[];
  sortKey: string;
  reverseSort: boolean;
  error: any;
};

class GeneralDeleteModal extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this._handleSelect = this._handleSelect.bind(this);
    this._handleSelectAll = this._handleSelectAll.bind(this);
    this._handleSort = this._handleSort.bind(this);
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
        show={this.state.show}
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
        {
        waitingMessage &&
        <section className="loadingSection">
          <div className="loadWrap">
            <Waitbox>
              {waitingMessage}
            </Waitbox>
          </div>
        </section>
        }
        <Content
          id={this.props.id}
          items={...this.state.items}
          noSize={this.props.noSize || false}
          noDate={this.props.noDate || false}
          sortKey={this.state.sortKey}
          onSelect={this._handleSelect}
          onSelectAll={this._handleSelectAll}
          onSort={this._handleSort}
        />
      </Modal>
    )
  }

  private _getDefultState(): State {
    return {
      show: false,
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
    let classNames: string[] = ["deleteItemsModal"];
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
    this.setState({show: true});
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
          items: this._sortItems(items, this.state.sortKey, this.state.reverseSort)
      });
    } catch (e) {
      this.setState({
          isFetching: false,
          error: e
      });
    }
  }

  private async _confirmDeletion(selectedItems: DeleteItems[]): Promise<void> {
    let { title, msg } = this.props.getConfirmAlert(selectedItems);
    let Alert = window["Alert"];
    return new Promise((resolve, reject) => {
      Alert.show({
        title,
        msg,
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

  private async _submit() {
    let selectedItems: DeleteItems[] = [];
    this.state.items.forEach((item) => {
      if (!item.locked && item.checked) {
        selectedItems.push(item);
      }
    });

    if (selectedItems.length === 0) {
      return;
    }

    this.setState({ submitStatus: "confirm"} );

    try {
      await this._confirmDeletion(selectedItems);
      this.setState({ submitStatus: "pending"} );
      await this.props.onSubmit(selectedItems);
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

  private _handleSelect(index: number): void {
    const items = this.state.items.map((item, i) => {
      if (i === index) {
        item.checked = !item.checked;
      }
      return item;
    });
    this.setState({ items });
  }

  private _handleSelectAll(select: boolean): void {
    const items = this.state.items.map((item) => {
      item.checked = item.locked ? false : select;
      return item;
    });
    this.setState({ items });
  }

  private _handleSort(key: string): void {
    const reverseSort = (key === this.state.sortKey) ? !this.state.reverseSort : false;
    let items = this.state.items;
    if (items != null) {
      items = this._sortItems(items, key, reverseSort);
    }
    this.setState({
      sortKey: key,
      reverseSort,
      items
    });
  }

  private _sortItems(
    items: DeleteItems[],
    sortKey: string,
    reverseSort: boolean
  ): DeleteItems[] {
    items = this._sortItemsByKey(items, sortKey);
    if (reverseSort) {
      items.reverse();
    }
    return items;
  }

  private _sortItemsByKey(items: DeleteItems[], sortKey: string): DeleteItems[] {
    // sort by name first, no matter what case
    items.sort((a, b) =>  a.name.localeCompare(b.name));
    // temoprarily not support sort on size
    if (sortKey === "size") {
      items.sort((a, b) => {
        return this._sortNumber(a.size, b.size);
      });
    } else if (sortKey === "date") {
      items.sort((a, b) => {
        return this._sortNumber(a.date, b.date);
      });
    }
    return items;
  }

  private _sortNumber(a: number, b: number): number {
    if (a == null && b == null) {
      return 0;
    } else if (a == null) {
      return -1;
    } else if (b == null) {
      return 1;
    } else if (a === b) {
      return 0;
    } else if (a > b) {
      return 1;
    } else {
      return -1;
    }
  }
}

export default GeneralDeleteModal;
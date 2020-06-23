import * as React from "react";
import dict from "../../lang";
import GeneralDeleteModal, { DeleteItems } from "./GeneralDeleteModal";
import service from "../../services/DFService";

const { DeleteTableFuncTStr } = dict;

class DeleteTableFuncModal extends React.Component<{}, {}> {
  constructor(props) {
    super(props);
    this._handleSubmit = this._handleSubmit.bind(this);
  }

  render() {
    return (
      <GeneralDeleteModal
        id="deleteTableFuncModal"
        triggerButton="deleteTableFuncButton"
        header={DeleteTableFuncTStr.header}
        fetchList={this._fetch}
        noSize={true}
        getConfirmAlert={this._getConfirmAlert}
        onSubmit={this._handleSubmit}
      />
    )
  }

  private async _fetch(): Promise<DeleteItems[]> {
    let tableFuncs = await service.listTableFuncs();
    let items = tableFuncs.map(({ id, name, createdTime }) => {
      return {
        id,
        name,
        size: null,
        date: createdTime,
        locked: false,
        checked: false
      }
    });
    return items;
  }

  private _getConfirmAlert(): {title: string, msg: string} {
    return {
      title: DeleteTableFuncTStr.header,
      msg: DeleteTableFuncTStr.confirm
    };
  }

  private async _handleSubmit(items: DeleteItems[]): Promise<void> {
    let ids = items.map((item) => item.id);
    let failedDataflows = await service.deleteByIds(ids);
    let error = this._convertFailedReason(items, failedDataflows);
    if (error) {
      let Alert = window["Alert"];
      Alert.error(DeleteTableFuncTStr.Error, error, {highZindex: true});
    }
  }

  // XXX TODO: abstract with DeleteModuleModal
  private _convertFailedReason(
    items: DeleteItems[],
    failedDataflows: {id: string, error: string}[]
  ): string {
    if (!failedDataflows || failedDataflows.length === 0) {
      return null;
    }
    let map = new Map();
    for (let item of items) {
      map.set(item.id, item);
    }
    let errors: string[] = [];
    failedDataflows.forEach((reason) => {
      let { id, error } = reason;
      let item = map.get(id);
      if (item) {
        errors.push(`${item.name}: ${error}`);
      }
    });
    return errors.join("\n");
  }
}

export default DeleteTableFuncModal;
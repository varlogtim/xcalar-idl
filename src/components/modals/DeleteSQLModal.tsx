import * as React from "react";
import dict from "../../lang";
import GeneralDeleteModal, { DeleteItems } from "./GeneralDeleteModal";
import service from "../../services/SQLService";

const { DeleteSQLModalTStr } = dict;

class DeleteSQLModal extends React.Component<{}, {}> {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <GeneralDeleteModal
        id="deleteSQLModal"
        triggerButton="deleteSQLButton"
        header={DeleteSQLModalTStr.header}
        fetchList={this._fetch}
        noSize={true}
        noDate={true}
        getConfirmAlert={this._getConfirmAlert}
        onSubmit={this._handleSubmit}
      />
    )
  }

  private async _fetch(): Promise<DeleteItems[]> {
    let snippets = await service.list();
    let items = snippets.map((snippet) => {
      let { id, name } = snippet;
      return {
        id,
        name,
        size: null,
        date: null,
        locked: false,
        checked: false
      }
    });
    return items;
  }

  private _getConfirmAlert(): {title: string, msg: string} {
    return {
      title: DeleteSQLModalTStr.header,
      msg: DeleteSQLModalTStr.confirm
    };
  }

  private _handleSubmit(items: DeleteItems[]): Promise<void> {
    let ids = items.map((item) => item.id);
    return service.delete(ids);
  }
}

export default DeleteSQLModal;
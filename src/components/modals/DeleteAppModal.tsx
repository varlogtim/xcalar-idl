import * as React from "react";
import dict from "../../lang";
import GeneralDeleteModal, { DeleteItems } from "./GeneralDeleteModal";
import service from "../../services/DFService";

const { DeleteAppTStr } = dict;

interface AppItem extends DeleteItems {
  isApp?: boolean;
}

class DeleteAppModal extends React.Component<{}, {}> {
  constructor(props) {
    super(props);
    this._handleSubmit = this._handleSubmit.bind(this);
  }

  render() {
    return (
      <GeneralDeleteModal
        id="deleteAppModal"
        triggerButton="deleteAppButton"
        header={DeleteAppTStr.header}
        fetchList={this._fetch}
        noSize={true}
        getConfirmAlert={this._getConfirmAlert}
        onSubmit={this._handleSubmit}
      />
    )
  }

  private async _fetch(): Promise<AppItem[]> {
    let items: AppItem[] = [];
    let apps = service.listApps();
    let specialAppis = await service.listSpeicalApps();
    apps.forEach((app) => {
      items.push({
        ...app,
        size: null,
        date: null,
        locked: false,
        checked: false,
        isApp: true
      });
    });
    specialAppis.forEach((specialApp) => {
      items.push({
        ...specialApp,
        size: null,
        date: null,
        locked: false,
        checked: false,
        isApp: false
      });
    });
    return items;
  }

  private _getConfirmAlert(): {title: string, msg: string} {
    return {
      title: DeleteAppTStr.header,
      msg: DeleteAppTStr.confirm
    };
  }

  private async _handleSubmit(items: AppItem[]): Promise<void> {
    let appIds = [];
    let specialAppIds = [];
    items.forEach(({id, isApp}) => {
      if (isApp) {
        appIds.push(id)
      } else {
        specialAppIds.push(id);
      }
    });
    service.deleteApps(appIds);
    let failedDataflows = await service.deleteByIds(specialAppIds);
    let error = this._convertFailedReason(items, failedDataflows);
    if (error) {
      let Alert = window["Alert"];
      Alert.error(DeleteAppTStr.Error, error, {highZindex: true});
    }
  }

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

export default DeleteAppModal;
import * as React from "react";
import dict from "../../lang";
import GeneralDeleteModal, { DeleteItems } from "./GeneralDeleteModal";
import service from "../../services/DFService";

const { DeleteAppTStr } = dict;

interface AppItem extends DeleteItems {
  isApp?: boolean;
}

class DeleteAppModal extends React.Component<{}, {}> {
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
        onDeleteError={this._handleDeleteError}
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

  private async _handleSubmit(
    items: AppItem[]
  ): Promise<{id: string, error: string}[]> {
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
    return service.deleteByIds(specialAppIds);
  }

  private _handleDeleteError(error: string) {
    let Alert = window["Alert"];
    Alert.error(DeleteAppTStr.Error, error, {highZindex: true});
  }
}

export default DeleteAppModal;
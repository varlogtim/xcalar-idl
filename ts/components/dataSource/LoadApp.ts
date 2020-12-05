class LoadApp {
    private _id: string;
    private _cancelAction: Function

    constructor(id) {
        this._id = id;
    }

    public setCancelEvent(event: Function): void {
        this._cancelAction = event;
    }

    public async cancel() {
        const confirmed = await this._confirm({
            title: 'Confirm',
            message: 'Do you want to cancel the loading?'
        });
        if (this._cancelAction != null && confirmed) {
            this._cancelAction();
        }
    }

    private async _confirm({ title, message }): Promise<boolean> {
        return new Promise((resolve) => {
            Alert.show({
                title: title,
                msg: message,
                onCancel: () => { resolve(false); },
                onConfirm: () => { resolve(true); }
            });
        });
    }
}
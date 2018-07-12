// dagTabs hold a user's dataflows and kvStore.

class DagTab{

    private _name: string;
    private _id: number;

    constructor(name: string, id: number) {
        this._name = name;
        this._id = id;
    }
    
    // initializeTab is used to load up the kvstore and
    // dataflow once we have a struct tracking dataflows.
    public initializeTab() {
        //TODO: Make this relevant
        console.log(this._name);
    }

    public setName(newName: string) {
        //TODO: Add functionality to change tab names.
        this._name = newName;
    }
}
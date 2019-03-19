
abstract class State {
    protected name: string;
    protected stateMachine: StateMachine;
    protected verbosity: string;
    protected availableActions: Function[];

    public constructor(name: string, stateMachine: StateMachine,
        verbosity: string) {
        this.name = name;
        this.stateMachine = stateMachine;
        this.verbosity = verbosity;
    }

    public log(message: string) {
        if (this.verbosity === "Verbose") {
            console.log(message);
        }
    }

    public pickRandom(collection: any) {
        if (collection instanceof Array) {
            return collection[Math.floor(collection.length * Math.random())];
        }
        else if (collection instanceof Map || collection instanceof Set){
            let keys = Array.from(collection.keys());
            let returnKey = keys[Math.floor(Math.random() * keys.length)];
            keys = null;
            return returnKey;
        }
        return null;
    }

    // Add an availble action
    // If this action already exists, don't do anything. Otherwise add it
    public addAction(action: Function) {
        if (!this.availableActions.includes(action)) {
            this.availableActions.push(action);
        }
    }

    // Delete an availble action
    // If this action doesnt exist, don't do anything. Otherwise delete it
    public deleteAction(action: Function) {
        if (this.availableActions.includes(action)) {
            this.availableActions.splice(this.availableActions.indexOf(action), 1);
        }
    }

    abstract takeOneAction(): State;
}
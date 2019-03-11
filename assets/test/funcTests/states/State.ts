
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

    abstract takeOneAction(): State;
}
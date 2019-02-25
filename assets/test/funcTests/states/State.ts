
abstract class State {
    protected verbosity: string;
    protected availableActions: Function[];

    public constructor(verbosity: string) {
        this.verbosity = verbosity;
    }

    public log(message: string) {
        if (this.verbosity === "Verbose") {
            console.log(message);
        }
    }
    abstract takeOneAction(): State;
}
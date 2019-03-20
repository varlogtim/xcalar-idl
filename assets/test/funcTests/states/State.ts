
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

    /* -------------------------------Helper Function------------------------------- */
    // Pick a random element from the collection
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

    // Generate a random integer with range [0, max)
    public getRandomInt(max: int) {
        return Math.floor(Math.random() * Math.floor(max));
    }

    // Use checkFunc to check at a interval
    // The overall timeout should be outCnt * interval
    public testFinish(checkFunc: Function, interval?: int): XDPromise<void> {
        var deferred = PromiseHelper.deferred();
        var checkTime = interval || 200;
        var outCnt = 80;
        var timeCnt = 0;

        var timer = setInterval(function() {
            var res = checkFunc();
            if (res === true) {
                // make sure graphisc shows up
                clearInterval(timer);
                deferred.resolve();
            } else if (res === null) {
                clearInterval(timer);
                deferred.reject("Check Error!");
            } else {
                console.info("check not pass yet!");
                timeCnt += 1;
                if (timeCnt > outCnt) {
                    clearInterval(timer);
                    console.error("Time out!", JSON.stringify(checkFunc));
                    // Timeout is fine
                    // deferred.reject("Time out");
                    deferred.resolve();
                }
            }
        }, checkTime);

        window.onbeforeunload = function() {
            return;
       };

        return deferred.promise();
    }
    /* -------------------------------Helper Function------------------------------- */

    abstract takeOneAction(): State;
}
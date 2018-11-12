// global MouseEvents
// useful to keep track of mousedown so when a blur happens, we know what
// element was clicked on to cause the blur
class MouseEvents {
    private $lastMouseDownTarget: JQuery;
    private $lastClickTarget: JQuery;
    private lastTime: number;
    // will store last 3 mousedowns (needed for undo)
    private lastMouseDownTargets: JQuery[];
    private $lastMDParents: JQuery;

    public constructor() {
        this.$lastMouseDownTarget = $(document);
        this.$lastClickTarget = this.$lastMouseDownTarget;
        this.lastTime = (new Date()).getTime();
        // will store last 3 mousedowns (needed for undo)
        this.lastMouseDownTargets = [this.$lastMouseDownTarget];
        this.$lastMDParents = this.$lastMouseDownTarget;
    }

    public setMouseDownTarget($element: JQuery): void {
        if (!$element) {
            this.$lastMouseDownTarget = $();
        } else {
            this.$lastMouseDownTarget = $element;
        }

        this.$lastMDParents = this.$lastMouseDownTarget.parents();

        this.lastTime = (new Date()).getTime();

        // store up to last 3 mousedowns
        if (this.lastMouseDownTargets.length === 3) {
            this.lastMouseDownTargets.splice(2, 1);
        }
        this.lastMouseDownTargets.unshift($element);
    };

    public setClickTarget($element): void {
        this.$lastClickTarget = $element;
    };

    public getLastMouseDownTarget(): JQuery {
        return this.$lastMouseDownTarget;
    };
    public getLastMouseDownParents(): JQuery {
        return this.$lastMDParents;
    };
    public getLastMouseDownTargets(): JQuery[] {
        return this.lastMouseDownTargets;
    };

    public getLastClickTarget(): JQuery {
        return this.$lastClickTarget;
    };

    public getLastMouseDownTime(): number {
        return this.lastTime;
    };
}


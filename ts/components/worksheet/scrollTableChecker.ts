/* Attr:
    startTime: (date) log the the current time
    scrollPos: (numbner) log the current mainFrame position
*/
class ScrollTableChecker {
    private startTime: number;
    private scrollPos: number;

    public constructor() {
        this.startTime = (new Date()).getTime();
        this.scrollPos = $("#mainFrame").scrollLeft();
    }

    public checkScroll(): boolean {
        const self: ScrollTableChecker = this;
        const startTime: number = self.startTime;
        const startScrollPos: number = self.scrollPos;

        const timeAllowed: number = 1000;
        const endTime: number = (new Date()).getTime();
        const elapsedTime: number = endTime - startTime;
        const timeSinceLastClick: number = endTime -
                                gMouseEvents.getLastMouseDownTime();
        // we'll focus on table if its been less than timeAllowed OR
        // if the user hasn't clicked or scrolled
        const samePos: boolean = ($("#mainFrame").scrollLeft() === startScrollPos);
        if (elapsedTime < timeAllowed ||
            (timeSinceLastClick >= elapsedTime && samePos)) {
            return true;
        } else {
            return false;
        }
    }
}

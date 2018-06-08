// worksheet.js
class WorksheetScrollTracker {
    private positionMap: {[worksheetId: string]: number};
    public constructor() {
        this.positionMap = {};
    }

    public cache(worksheetId: string) {
        this.positionMap[worksheetId] = $("#mainFrame").scrollLeft();
    }

    public restore(worksheetId: string): number {
        const leftPosition = this.positionMap[worksheetId];
        if (leftPosition != null) {
            $("#mainFrame").scrollLeft(leftPosition);
        }
        return leftPosition;
    }
}


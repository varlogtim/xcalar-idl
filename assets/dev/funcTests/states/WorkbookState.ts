/*
This file defines the state of workbook in XD Func Test
WorkbookState has the following operations:

* createWorkbook
* activateWorkbook
* deactiveWorkbook
* copyWorkbook
* renameWorkbook
* deleteWorkbook

- activateWorkbook will activate a random workbook and get into it
This will lead to a browser hard-reloading. We need to memorize the
corresponding test state infomation and restore the test env

Currently, we will switch to another state once we activate a workbook

*/
class WorkbookState extends State {
    public constructor(stateMachine: StateMachine, verbosity: string) {
        let name = "Workbook"
        super(name, stateMachine, verbosity);

        this.availableActions = [this.createNewWorkbook];
        // Conditional constructor
        if (Object.keys(WorkbookManager.getWorkbooks()).length != 0) {
            this.addAction(this.activateWorkbook);
            this.addAction(this.deleteWorkbook);
            this.addAction(this.copyWorkbook);
            this.addAction(this.renameWorkbook);
            this.addAction(this.deactiveWorkbook);
        }
    }

    /* -------------------------------Helper Function------------------------------- */
    // Generate a random unique name
    private getUniqueRandName(prefix): string {
        let validFunc = function (wkbkName) { return WorkbookManager.getWorkbooks()[wkbkName] == undefined; };
        var prefix = prefix || "FuncTest"
        return xcHelper.uniqueRandName(prefix, validFunc, 10);
    }

    // Check if this workbook exists
    private workbookExist(wkbkName: string): boolean {
        let wkbkId = WorkbookManager.getIDfromName(wkbkName);
        return WorkbookManager.getWorkbook(wkbkId);
    }

    // Return a random workbook id
    private getRandomWorkbook(): string {
        let workbooks = WorkbookManager.getWorkbooks();
        let workbookIds = Object.keys(workbooks);
        return workbookIds[Math.floor(workbookIds.length * Math.random())];
    }
    /* -------------------------------Helper Function------------------------------- */

    private async activateWorkbook(): XDPromise<WorkbookState> {
        let randomWorkbook = this.getRandomWorkbook();
        this.log(`Activating workbook ${randomWorkbook}`);
        this.currentWorkbook = randomWorkbook;
        try {
            xcSessionStorage.setItem('xdFuncTestStateName', Util.pickRandom(['AdvancedMode', 'SQLMode']));
            await WorkbookManager.switchWKBK(randomWorkbook);
        } catch (error) {
            if (error["error"] != undefined && error["error"] === "Cannot switch to same workbook") {
                this.log(`Workbook ${randomWorkbook} already active!`);
                $("#homeBtn").click(); // Go inside the workbook
            } else {
                this.log(`Error activating workbook ${error}`);
                throw error;
            }
        }
        return null;
    }

    private async deactiveWorkbook(): XDPromise<WorkbookState> {
        let randomWorkbook = this.getRandomWorkbook();
        this.log(`Deactivating workbook ${randomWorkbook}`);
        try {
            await WorkbookManager.deactivate(randomWorkbook);
        } catch (error) {
            this.log(`Error deactiving workbook ${randomWorkbook}`);
            throw error;
        }
        return this;
    }

    private async copyWorkbook(): XDPromise<WorkbookState> {
        let randomWorkbook = this.getRandomWorkbook();
        this.log(`Copying workbook ${randomWorkbook}`);
        let wkbkName = this.getUniqueRandName("FuncTestCopy");
        try {
            await WorkbookManager.copyWKBK(randomWorkbook, wkbkName);
        } catch (error) {
            this.log(`Error copying workbook ${error}`);
            throw error;
        }
        if (!this.workbookExist(wkbkName)) {
            throw `Error copying workbook from ${randomWorkbook}. The copied workbook ${wkbkName} doesn't exist`
        }
        // This should be changed as we have more funcTest for other module
        return this;
    }

    private async renameWorkbook(): XDPromise<WorkbookState> {
        let randomWorkbook = this.getRandomWorkbook();
        this.log(`Renaming workbook ${randomWorkbook}`);
        let wkbkName = this.getUniqueRandName("FuncTestRename");
        try {
            await WorkbookManager.renameWKBK(randomWorkbook, wkbkName, "");
        } catch (error) {
            this.log(`Error renaming workbook ${error}`);
            throw error;
        }
        if (WorkbookManager.getWorkbook(randomWorkbook) != null) {
            throw `Error renaming workbook ${randomWorkbook}, the original still exists`;
        }
        if (!this.workbookExist(wkbkName)) {
            throw `Error renaming workbook ${randomWorkbook}, expect new workbook with name ${wkbkName} doesn't exist`;
        }
        // This should be changed as we have more funcTest for other module
        return this;
    }

    private async deleteWorkbook(): XDPromise<WorkbookState> {
        let randomWorkbook = this.getRandomWorkbook();
        this.log(`Deleting workbook ${randomWorkbook}`);
        try {
            await WorkbookManager.deactivate(randomWorkbook);
            await WorkbookManager.deleteWKBK(randomWorkbook);
        } catch (error) {
            this.log(`Error deleting workbook ${randomWorkbook}`);
            throw error;
        }
        if (WorkbookManager.getWorkbook(randomWorkbook) != null) {
            throw `Error deleting workbook ${randomWorkbook}, it still exists after attemping to delete`;
        }
        if (Object.keys(WorkbookManager.getWorkbooks()).length == 0) {
            this.deleteAction(this.activateWorkbook);
            this.deleteAction(this.copyWorkbook);
            this.deleteAction(this.renameWorkbook);
            this.deleteAction(this.deactiveWorkbook);
            this.deleteAction(this.deleteWorkbook);
        }
        // This should be changed as we have more funcTest for other module
        return this
    }

    private async createNewWorkbook(): XDPromise<WorkbookState> {
        let wkbkName = this.getUniqueRandName();
        this.log(`Creating workbook ${wkbkName}`);
        const wkbkId = await WorkbookManager.newWKBK(wkbkName);
        this.log(`Created workbook ${wkbkId}!`);
        this.addAction(this.activateWorkbook);
        this.addAction(this.copyWorkbook);
        this.addAction(this.renameWorkbook);
        this.addAction(this.deactiveWorkbook);
        return this;
    }

    public async takeOneAction(): XDPromise<WorkbookState> {
        let randomAction = this.availableActions[Math.floor(this.availableActions.length * Math.random())];
        const newState = await randomAction.call(this);
        return newState;
    }
}
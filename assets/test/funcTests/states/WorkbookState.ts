
class WorkbookState extends State {
    public constructor(stateMachine: StateMachine, verbosity: string) {
        super("Workbook", stateMachine, verbosity);
        this.availableActions = [this.createNewWorkbook];
    }

    public async activateWorkbook() {
        let workbooks = WorkbookManager.getWorkbooks();
        let workbookIds = Object.keys(workbooks);
        let randomWorkbook = workbookIds[Math.floor(workbookIds.length * Math.random())];
        this.log(`Activating workbook ${randomWorkbook}`)
        try {
            await WorkbookManager.switchWKBK(randomWorkbook);
        } catch (error) {
            if(error["error"] != undefined && error["error"] === "Cannot switch to same workbook") {
                this.log(`Workbook ${randomWorkbook} already active!`);
            } else {
                this.log(`Error activating workbook ${error}`);
                throw error;
            }
        }
        //This should be changed, should return to a different state instead
        return this;
    }

    public async createNewWorkbook() {
        let validFunc = function(wbkName) { return WorkbookManager.getWorkbooks()[wbkName] == undefined; };
        let wkbkName = xcHelper.uniqueRandName("FuncTest", validFunc, 10);
        this.log(`Creating workbook ${wkbkName}`);
        const wkbkId = await WorkbookManager.newWKBK(wkbkName);
        this.log(`Created workbook ${wkbkId}!`);
        if (!this.availableActions.includes(this.activateWorkbook)) {
            this.availableActions.push(this.activateWorkbook);
        }
        return this;
    }
    public async takeOneAction() {
        let randomAction = this.availableActions[Math.floor(this.availableActions.length * Math.random())];
        const newState = await randomAction.call(this);
        return newState;
    }
}
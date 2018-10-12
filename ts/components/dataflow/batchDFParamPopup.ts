namespace BatchDFParamPopup {
    /**
     * DFDagParamPopup.setup
     */
    let paramTab;
    export function setup($panel, $btnContainer): void {
        paramTab = new ParamPopup($panel, $btnContainer);
    }

    export function closeDagParamPopup() {
        if (paramTab) {
            paramTab.closePopup(true);
        }
    }
}
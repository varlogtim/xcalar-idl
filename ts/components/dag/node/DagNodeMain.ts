class DagNodeMain extends DagNodeDFIn {

    public constructor(options: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.Main;
    }


    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        return "Main";
    }

}
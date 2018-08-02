class DagLineage {
    private columns: ProgCol[];
    /* possible use: stop the delta change of parents
     * like add a column, remove a column, ect.
     */
    // private changes: object[];

    // XXX persist or not TBD
    public constructor() {

    }

    // XXX TODO
    public getDerivedColumns(): string[] {
        return [];
    }
}
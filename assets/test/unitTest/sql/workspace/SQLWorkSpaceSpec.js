describe("SQLWorkSpace Test", () => {
    it("should be a singleton instance", () => {
        expect(SQLWorkSpace.Instance).to.be.instanceof(SQLWorkSpace);
    });

    it("should refresh", () => {
        let oldEditorRefresh = SQLEditorSpace.Instance.refresh;
        let oldHistoryRefresh = SQLHistorySpace.Instance.refresh;
        let called = 0;
        SQLEditorSpace.Instance.refresh = () => { called++; };
        SQLHistorySpace.Instance.refresh = () => { called++; };

        SQLWorkSpace.Instance.refresh();
        expect(called).to.equal(2);
        SQLEditorSpace.Instance.refresh = oldEditorRefresh;
        SQLHistorySpace.Instance.refresh = oldHistoryRefresh;
    });

    it("should focus", () => {
        let oldRefresh = SQLWorkSpace.Instance.refresh;
        let oldToggle = DagViewManager.Instance.toggleSqlPreview;
        let oldShow = SQLResultSpace.Instance.showTables;
        let called = 0;
        SQLWorkSpace.Instance.refresh = () => { called++; };
        DagViewManager.Instance.toggleSqlPreview = () => { called++; };
        SQLResultSpace.Instance.showTables = () => {};

        SQLWorkSpace.Instance.focus();
        expect(called).to.equal(2);

        SQLWorkSpace.Instance.refresh = oldRefresh;
        DagViewManager.Instance.toggleSqlPreview = oldToggle;
        SQLResultSpace.Instance.showTables = oldShow;
    });
});
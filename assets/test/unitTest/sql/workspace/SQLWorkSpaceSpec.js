describe("SQLWorkSpace Test", () => {
    it("should be a singleton instance", () => {
        expect(SQLWorkSpace.Instance).to.be.instanceof(SQLWorkSpace);
    });

    it("should switch mode", () => {
        let oldFunc = SQLEditorSpace.Instance.switchMode;
        let test = false;
        SQLEditorSpace.Instance.switchMode = () => { test = true; };
        SQLWorkSpace.Instance.switchMode();
        expect(test).to.be.true;
        SQLEditorSpace.Instance.switchMode = oldFunc;
    });

    it("should save in sql mode", (done) => {
        let oldFunc = XVM.isAdvancedMode;
        let oldSave = SQLEditorSpace.Instance.save;
        let test = false;
        XVM.isAdvancedMode = () => false;
        SQLEditorSpace.Instance.save = () => {
            test = true;
            return PromiseHelper.resolve();
        };
        SQLWorkSpace.Instance.save()
        .then(() => {
            expect(test).to.be.true;
            done();
        })
        .fail(() => {
            done("fail");
        })
        .always(() => {
            XVM.isAdvancedMode = oldFunc;
            SQLEditorSpace.Instance.save = oldSave;
        });
    });

    it("should not save in advanced mode", (done) => {
        let oldFunc = XVM.isAdvancedMode;
        let oldSave = SQLEditorSpace.Instance.save;
        let test = false;
        XVM.isAdvancedMode = () => true;
        SQLEditorSpace.Instance.save = () => { test = true; };
        SQLWorkSpace.Instance.save()
        .then(() => {
            expect(test).to.be.false;
            done();
        })
        .fail(() => {
            done("fail");
        })
        .always(() => {
            XVM.isAdvancedMode = oldFunc;
            SQLEditorSpace.Instance.save = oldSave;
        });
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

    it("should unfocus", () => {
        let oldSave = SQLWorkSpace.Instance.save;
        let test = false;
        SQLWorkSpace.Instance.save = () => { test = true; };

        SQLWorkSpace.Instance.unfocus();
        expect(test).to.be.true;
        SQLWorkSpace.Instance.save = oldSave;
    });
});
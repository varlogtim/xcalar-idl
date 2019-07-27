describe("SetOpPanel Test", function() {
    let setNode;
    let opPanel;

    before(() => {
        const inputColumns = genProgCols('fcol', 5, ColumnType.float).concat(genProgCols('scol', 4, ColumnType.string));
        const parentNode = {
            getLineage: () => ({
                getColumns: () => inputColumns
            })
        };

        setNode = {
            getParents: () => ([parentNode]),
            getParam: () => ({
                eval: [{
                    evalString: 'set(fcol#1,1)',
                    newField: 'newCol'
                }],
                icv: false,
                columns: []
            }),
            getTitle: () => "Node 1",
            validateNodes: () => null,
            getSubType: () => DagNodeSubType.Intersect,
        };
    });

    it('show should work', (done) => {
        MainMenu.openPanel("dagPanel");
        opPanel = SetOpPanel.Instance;
        opPanel._updateMode(true);
        opPanel.show(setNode, {})
        .then(() => {
            expect($("#setOpPanel").is(":visible")).to.equal(true);
            done();
        });
    })

    it('close should work', () => {
        opPanel.close();
        expect($("#setOpPanel").is(":visible")).to.equal(false);
    });

    it('_submitForm will not submit with invalid parameters', () => {
        submitCalled = false;
        opPanel.setOpData.submit = () => { submitCalled = true };
        opPanel._submitForm();
        expect(submitCalled).to.equal(false);
    });

    after(() => {
        StatusBox.forceHide();
    });

    function genProgCols(colPrefix, count, columnType) {
        const cols = new Array(count);
        for (let i = 0; i < count; i ++) {
            const colName = `${colPrefix}#${i + 1}`;
            const frontName = xcHelper.parsePrefixColName(colName).name;
            cols[i] = ColManager.newPullCol(frontName, colName, columnType);
        }
        return cols;
    }
});
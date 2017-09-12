describe("SQL-SQLEditor Test", function() {
    it("should get editor", function() {
        var editor = SQLEditor.getEditor();
        expect(editor instanceof CodeMirror).to.be.true;
    });

    it("should click to execute sql", function() {
        var oldCompiler = SQLCompiler;
        var test = false;
        SQLCompiler = function() {
            this.compile = function() { test = true; };
        };
        $("#sqlExecute").click();
        expect(test).to.be.true;
        // clear up
        SQLCompiler = oldCompiler;
    });
});
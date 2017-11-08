window.SQLEditor = (function(SQLEditor, $) {
    var editor;

    SQLEditor.setup = function() {
        setupEditor();
        addEventListeners();

        // XXX demo use
        var showSQLPanel = true;
        if (showSQLPanel) {
            $("#sqlTab").removeClass("xc-hidden");
        }
    };

    SQLEditor.getEditor = function() {
        return editor;
    };

    function setupEditor() {
        var textArea = document.getElementById("sqlEditor");

        editor = CodeMirror.fromTextArea(textArea, {
            "mode": "text/x-sql",
            "theme": "rubyblue",
            "lineNumbers": true,
            "lineWrapping": true,
            "smartIndent": true,
            "indentWithTabs": false,
            // "indentUnit": 4,
            "matchBrackets": true,
            "autofocus": true,
            // "autoCloseBrackets": true,
            // "search": true
            "extraKeys": {"Ctrl-Space": "autocomplete"},
        });

        editor.refresh();
    }

    function addEventListeners() {
        $("#sqlExecute").click(function() {
            executeSQL();
        });
    }

    function executeSQL() {
        var sql = editor.getValue();
        sql = sql.replace(/\n/g, " ").trim().replace(/;+$/, "");
        var sqlCom = new SQLCompiler();
        sqlCom.compile(sql);
    }

    return SQLEditor;
}({}, jQuery));

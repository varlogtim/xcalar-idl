window.SQLEditor = (function(SQLEditor, $) {
    var editor;
    var $sqlButton = $("#sqlExecute");

    SQLEditor.setup = function() {
        setupEditor();
        addEventListeners();
    };

    SQLEditor.getEditor = function() {
        return editor;
    };

    SQLEditor.fakeCompile = function(numSteps) {
        var deferred = jQuery.Deferred();
        $sqlButton.addClass("btn-disabled");
        $sqlButton.find(".text").html("Compiling... 0/" + numSteps);

        var numMilSeconds = 1500;
        // update once every 100ms
        var frequency = 100;
        var numIter;

        var amtPerTick = numSteps/(numMilSeconds/frequency);
        for (var i = 0; i < numMilSeconds/frequency; i++) {
            setTimeout(function() {
                var buttonText = $sqlButton.find(".text").html();
                var numCurSteps = parseInt(buttonText.substring(13, buttonText.indexOf("/")));
                var backPart = buttonText.substring(buttonText.indexOf("/"));
                numCurSteps += Math.ceil(Math.random() * amtPerTick);
                if (numCurSteps > parseInt(backPart.substring(1))) {
                    numCurSteps = parseInt(backPart.substring(1));
                }
                $sqlButton.find(".text").html("Compiling... " + numCurSteps + backPart);
            }, i*frequency);
        }

        setTimeout(function() {
            deferred.resolve();
        }, numMilSeconds);
        return deferred.promise();
    };

    SQLEditor.startCompile = function(numSteps) {
        $sqlButton.addClass("btn-disabled");
        $sqlButton.find(".text").html("Compiling... 0/" + numSteps);
    };

    SQLEditor.startExecution = function() {
        $sqlButton.find(".text").html("Executing... ");
    };

    SQLEditor.updateProgress = function() {
        var buttonText = $sqlButton.find(".text").html();
        var numCurSteps = parseInt(buttonText.substring(13, buttonText.indexOf("/")));
        var backPart = buttonText.substring(buttonText.indexOf("/"));
        numCurSteps++;
        $sqlButton.find(".text").html("Compiling... " + numCurSteps + backPart);
    };

    SQLEditor.resetProgress = function() {
        $sqlButton.removeClass("btn-disabled");
        $sqlButton.find(".text").html("EXECUTE SQL"); // XXX Change to variable
    };

    function setupEditor() {
        var textArea = document.getElementById("sqlEditor");
        if (!textArea) {
            // For Release Candidates
            return;
        }

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
            SQLEditor.executeSQL();
        });
    }

    SQLEditor.executeSQL = function() {
        var deferred = jQuery.Deferred();
        var sql = editor.getValue();
        sql = sql.replace(/\n/g, " ").trim().replace(/;+$/, "");
        var sqlCom = new SQLCompiler();
        try {
            $("#sqlExecute").addClass("btn-disabled");
            sqlCom.compile(sql)
            .always(function() {
                SQLEditor.resetProgress();
            })
            .done(function() {
                deferred.resolve();
            })
            .fail(function() {
                var errorMsg = "";
                if (arguments.length === 1) {
                    if (typeof(arguments[0]) === "string") {
                        errorMsg = arguments[0];
                        if (errorMsg.indexOf("exceptionMsg") > -1 &&
                            errorMsg.indexOf("exceptionName") > -1) {
                            var errorObject = JSON.parse(errorMsg);
                            errorMsg = errorObject.exceptionName.substring(
                                       errorObject.exceptionName
                                                 .lastIndexOf(".") + 1) + "\n" +
                                       errorObject.exceptionMsg;
                        }
                    } else {
                        errorMsg = JSON.stringify(arguments[0]);
                    }
                } else {
                    errorMsg = JSON.stringify(arguments);
                }
                Alert.show({title: "SQL Error",
                           msg: errorMsg});
            });
        } catch (e) {
            SQLEditor.resetProgress();
            Alert.show({title: "Compilation Error",
                        msg: "Error details: " + JSON.stringify(e)});
            deferred.reject();
        }
        return deferred.promise();
    };

    return SQLEditor;
}({}, jQuery));

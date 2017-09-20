window.JupyterPanel = (function($, JupyterPanel) {

    var $frameLocation = $("#jupyterPanel .mainContent");
    JupyterPanel.setup = function() {

    };

    JupyterPanel.initialize = function() {
        if (window.jupyterNode == null || window.jupyterNode === "") {
            window.jupyterNode = "http://cantor.int.xcalar.com:8889";
        }
        function loadJupyterNotebook(wkbkName) {
            $.ajax({
                url: jupyterNode + "/notebooks/" + wkbkName + ".ipynb?kernel_name=python2#",
                dataType: "jsonp",
                timeout: 5000,

                success: function() {
                    $("#jupyterNotebook").attr("src", jupyterNode + "/notebooks/" + wkbkName + ".ipynb?kernel_name=python2#");
                },
                error: function(parsedjson) {
                    if (parsedjson.status === 404) {
                        $("#jupyterNotebook").attr("src", jupyterNode + "/notebooks/XcalarTemplate.ipynb?kernel_name=python2#");
                    } else if (parsedjson.status === 200) {
                        $("#jupyterNotebook").attr("src", jupyterNode + "/notebooks/" + wkbkName + ".ipynb?kernel_name=python2#");
                    } else {
                        $("#jupyterNotebook").attr("src", jupyterNode + "/notebooks/XcalarTemplate.ipynb?kernel_name=python2#");
                    }
                }
            });
        }

        loadJupyterNotebook(WorkbookManager.getActiveWKBK());

        window.addEventListener("message", function(event) {
            var struct = event.data;
            try {
                var s = JSON.parse(struct);
                switch (s.action) {
                    case ("resend"):
                        JupyterPanel.sendInit();
                        break;
                    default:
                        console.error("Unsupported action:" + s.action);
                }
            } catch(e) {
                console.error("Illegal message sent:" + event.data);
            }
        });
    };

    JupyterPanel.sendInit = function() {
        var workbookStruct = {action: "init",
              username: userIdName,
              userid: userIdUnique,
              sessionname: WorkbookManager.getWorkbook(
                            WorkbookManager.getActiveWKBK()).name,
              sessionid: WorkbookManager.getActiveWKBK()
        };
        $("#jupyterNotebook")[0].contentWindow
                      .postMessage(JSON.stringify(workbookStruct), "*");
    };

    JupyterPanel.publishTable = function(tableName) {
        var tableStruct = {action: "publishTable",
                          tableName: tableName};
        $("#jupyterNotebook")[0].contentWindow.postMessage(
                                          JSON.stringify(tableStruct), "*");
    };

    return (JupyterPanel);
}(jQuery, {}));
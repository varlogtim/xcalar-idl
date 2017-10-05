window.JupyterPanel = (function($, JupyterPanel) {

    var $frameLocation = $("#jupyterPanel .mainContent");
    var $jupyterPanel;
    var currNotebook;
    JupyterPanel.setup = function() {
        $jupyterPanel = $("#jupyterPanel");
        setupTopBarDropdown();
    };

    JupyterPanel.initialize = function() {
        if (window.jupyterNode == null || window.jupyterNode === "") {
            var colIndex = hostname.lastIndexOf(":");
            if (colIndex < 6) {
                colIndex = hostname.length;
            }
            var tempName = hostname.slice(0, colIndex);
            window.jupyterNode = tempName + ":8889";
            window.jupyterNode = "http://cantor.int.xcalar.com:8889";
        }

        KVStore.get(KVStore.gNotebookKey, gKVScope.WKBK)
        .then(function(lastLocation) {
            var last;
            try {
                last = $.parseJSON(lastLocation);
            } catch(err) {
                console.error(err);
            }
            currNotebook = last || "";
            toggleJupyterMenu();
            loadJupyterNotebook(last);
        })
        .fail(function() {
            loadJupyterNotebook();
        });


        window.addEventListener("message", function(event) {
            var struct = event.data;
            try {
                var s = JSON.parse(struct);
                switch (s.action) {
                    case ("resend"):
                        JupyterPanel.sendInit();
                        break;
                    case ("newUntitled"):
                        JupyterPanel.sendInit(true, s.publishTable, s.tableName);
                        break;
                    case ("updateLocation"):
                        storeLocation(s);
                        break;
                    default:
                        console.error("Unsupported action:" + s.action);
                }
            } catch(e) {
                console.error("Illegal message sent:" + event.data);
            }
        });
    };

    JupyterPanel.sendInit = function(newUntitled, publishTable, tableName) {
        var workbookStruct = {action: "init",
                newUntitled: newUntitled,
                publishTable: publishTable,
                tableName: tableName,
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

    function loadJupyterNotebook(lastLocation) {
        var url;
        if (lastLocation) {
            url = jupyterNode + "/notebooks/" + lastLocation + ".ipynb?kernel_name=python2#";
        } else {
            url = jupyterNode + "/tree#";
        }

        $.ajax({
            url: url,
            dataType: "jsonp",
            timeout: 5000,

            success: function() {
                $("#jupyterNotebook").attr("src", url);
            },
            error: function(parsedjson) {
                if (parsedjson.status === 200) {
                    $("#jupyterNotebook").attr("src", url);
                } else {
                    $("#jupyterNotebook").attr("src", jupyterNode + "/tree#");
                }
            }
        });
    }

    function storeLocation(info) {
        if (info.location === "tree") {
            currNotebook = "";
        } else if (info.location === "notebook") {
            currNotebook = info.lastNotebook;
        }
        toggleJupyterMenu();
        return KVStore.put(KVStore.gNotebookKey, JSON.stringify(currNotebook),
                            true, gKVScope.WKBK);
    }

    function toggleJupyterMenu() {
        if (currNotebook) {
            $jupyterPanel.find(".topBar .rightArea").removeClass("xc-hidden");
        } else {
            $jupyterPanel.find(".topBar .rightArea").addClass("xc-hidden");
        }
    }

    JupyterPanel.appendStub = function(stubName) {
        var stubStruct = {action: "stub", stubName: stubName};
        $("#jupyterNotebook")[0].contentWindow.postMessage(JSON.stringify(stubStruct), "*");
    }
    function setupTopBarDropdown() {
        var $jupMenu = $jupyterPanel.find(".jupyterMenu");
        xcMenu.add($jupMenu);

        $jupyterPanel.on("click", ".jupyterMenuIcon", function() {
            var $menuIcon = $(this);

            xcHelper.dropdownOpen($menuIcon, $jupMenu, {
                "offsetX": -7,
                // "floating": true,
                "toClose": function() {
                    return $jupMenu.is(":visible");
                },
                "callback": function() {

                }
            });
        });
        $jupyterPanel.on("click", ".jupyterMenuText", function(){
            $(".jupyterMenuIcon").click();
        });
        $jupyterPanel.on("click", ".jupyterMenu li", function() {
            var stubName = $(this).attr("data-action");
            JupyterPanel.appendStub(stubName);
        });
    }

    return (JupyterPanel);
}(jQuery, {}));
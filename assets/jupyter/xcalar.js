// this file maps to xcalar/.ipython/nbextensions/xcalar.js
define(function() {
    return {
        load_ipython_extension: function() {
            console.log("ipython extension has been loaded");
            var request = {
                action: "updateLocation",
                location: "notebook",
                lastNotebook: Jupyter.notebook.get_notebook_name()
            };
            parent.postMessage(JSON.stringify(request), "*");
            var urlQuery = window.location.search;
            urlQuery = urlQuery.slice(urlQuery.indexOf("?") + 1);
            var params = parseQueryString(urlQuery);
            modifyElements();

            if (params["needsTemplate"] === "true") {
                var publishTable = params["publishTable"] === "true";
                var tableName;
                if (publishTable) {
                    tableName = decodeURIComponent(params["tableName"]);
                }
                var request = {action: "newUntitled",
                               publishTable: publishTable,
                               tableName: tableName};
                console.log("Telling parent new untitled notebook created");
                parent.postMessage(JSON.stringify(request), "*");
            }

            function receiveMessage(event) {
                window.alert = function() {};
                alert = function() {};
                var struct = JSON.parse(event.data);
                switch (struct.action) {
                    case ("init"):
                        var username = struct.username;
                        var userid = struct.userid;
                        var sessionName = struct.sessionname;
                        var sessionId = struct.sessionid;
                        var notebookName = Jupyter.notebook.get_notebook_name();
                        if (struct.newUntitled) {
                            prependSessionStub(username, userid, sessionName);
                            if (struct.publishTable) {
                                appendPublishTableStub(struct.tableName);
                            }
                            Jupyter.save_widget.rename_notebook({notebook: Jupyter.notebook});
                        }
                        break;
                    case ("publishTable"):
                        appendPublishTableStub(struct.tableName);
                        break;
                    default:
                        break;
                }
            }

            function prependSessionStub(username, userid, sessionName) {
                var cell = Jupyter.notebook.insert_cell_above('code', 0);
                var text = '#DO NOT RENAME THE NOTEBOOK!\n%matplotlib inline\n#To faciliate manipulations later\nimport pandas as pd\nimport matplotlib.pyplot as plt\n\n#Xcalar imports. For more information, refer to discourse.xcalar.com\nfrom xcalar.compute.api.XcalarApi import XcalarApi\nfrom xcalar.compute.api.Session import Session\nfrom xcalar.compute.api.WorkItem import WorkItem\nfrom xcalar.compute.api.ResultSet import ResultSet\n\n#Code starts here. First create a XcalarApi object to do anything\nxcalarApi = XcalarApi()\n';
                text += '#Connect to current workbook that you are in\nworkbook = Session(xcalarApi, "' + username + '", "' + username + '", ' + userid + ', True, "' + sessionName + '")\nxcalarApi.setSession(workbook)';
                cell.set_text(text);
                cell.execute();
                Jupyter.notebook.save_notebook();
            }

            function appendPublishTableStub(tableName) {
                var text = '#Publish table as pandas dataframe\n';
                var resultSetPtrName = 'resultSetPtr_' + tableName.split("#")[1];
                text += resultSetPtrName + ' = ResultSet(xcalarApi, tableName="' + tableName + '")\n';
                tableName = tableName.replace(/#/g, "_");
                text += tableName + ' = []\nfor row in ' + resultSetPtrName + ':\n    ' + tableName + '.append(row)\n';
                text += tableName + '_pd' + ' = pd.DataFrame.from_dict(' + tableName + ')\n' + tableName + "_pd";

                var lastCell = Jupyter.notebook.get_cell(-1);
                if (lastCell.get_text() === "") {
                    cell = lastCell;
                } else {
                    cell = Jupyter.notebook.insert_cell_at_bottom("code");
                }
                cell.set_text(text);
                cell.execute();
                Jupyter.notebook.save_notebook();

                var newCell = Jupyter.notebook.insert_cell_at_bottom("code");
                newCell.code_mirror.focus();
            }

            // listeners are found by $._data(element, "events" ); we turn off
            // listeners that cause navigation away from current window
            function modifyElements() {
                // hide the log out button on the upper right
                $("#login_widget").remove();

                // rework "open notebook" - prevent #open_notebook menu item from
                // opening in a new window
                $("#open_notebook").off("click");
                $("#open_notebook").find("a").click(function() {
                    var request = {
                        action: "updateLocation",
                        location: "tree",
                        lastNotebook: Jupyter.notebook.get_notebook_name()
                    };
                    parent.postMessage(JSON.stringify(request), "*");
                });
                $("#open_notebook").attr("title", "Opens the Dashboard view");
                $("#open_notebook").find("a").attr("href", "/tree");

                // rework "new notebook" - prevent menu item from
                // opening in a new window
                $("#new-notebook-submenu-python2").find("a").off("click");
                $("#new-notebook-submenu-python2").find("a").click(function() {
                    Jupyter.notebook.contents.new_untitled("", {type: "notebook"})
                    .then(function(data) {
                        var url = "/notebooks/" + data.path + "?kernel_name=python2&needsTemplate=true";
                        window.location.href = url;
                    });
                });

                // lets xcalar know if rename occurs
                $('#notebook_name').bind("DOMSubtreeModified",function(){
                    if (!$(this).text()) {
                        return; // gets triggered when blank sometimes
                    }
                    var request = {
                        action: "updateLocation",
                        location: "notebook",
                        lastNotebook: Jupyter.notebook.get_notebook_name()
                    };
                    parent.postMessage(JSON.stringify(request), "*");
                });

                // lets xcalar know it's navigating away
                $(window).unload(function () {
                    var request = {
                        action: "updateLocation",
                        location: "navigting away",
                        lastNotebook: Jupyter.notebook.get_notebook_name()
                    };
                    parent.postMessage(JSON.stringify(request), "*");
                    return false;
                });
            }

            function parseQueryString(queryString) {
                var params = {}, queries, temp, i, l;
                // Split into key/value pairs
                queries = queryString.split("&");
                // Convert the array of strings into an object
                for ( i = 0, l = queries.length; i < l; i++ ) {
                    temp = queries[i].split('=');
                    params[temp[0]] = temp[1];
                }
                return params;
            }


            window.addEventListener("message", receiveMessage, false);
            window.alert = function() {};
        }
    };
});
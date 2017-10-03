define(function() {
    return {
        load_ipython_extension: function() {
            console.log("ipython extension has been loaded");

            modifyElements();
            if (Jupyter.notebook.get_notebook_name().indexOf("XcalarTemplate-Copy") === 0) {
                var request = {action: "resend"};
                console.log("Asking parent to resend");
                parent.postMessage(JSON.stringify(request), "*");
            } else if (Jupyter.notebook.get_notebook_name() === "XcalarTemplate") {
                // XXX work in progress
                // var request = {action: "resend"};
                // console.log("Asking parent to resend");
                // parent.postMessage(JSON.stringify(request), "*");
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
                        if (Jupyter.notebook.get_notebook_name() === "XcalarTemplate") {
                            Jupyter.notebook.copy_notebook();
                            // This early terminates the workbook and triggers a refresh
                        } else if (Jupyter.notebook.get_notebook_name() !== sessionId) {
                            Jupyter.notebook.rename(sessionId);
                            prependSessionStub(username, userid, sessionName);
                        }
                        break;
                    case ("publishTable"):
                        var tableName = struct.tableName;
                        var text = '#Publish table as pandas dataframe\n';
                        var resultSetPtrName = 'resultSetPtr_' + tableName.split("#")[1];
                        text += resultSetPtrName + ' = ResultSet(xcalarApi, tableName="' + tableName + '")\n'
                        tableName = tableName.replace(/#/g, "_");
                        text += tableName + ' = []\nfor row in ' + resultSetPtrName + ':\n    ' + tableName + '.append(row)\n'
                        text += tableName + '_pd' + ' = pd.DataFrame.from_dict(' + tableName + ')\n' + tableName + "_pd";

                        var lastCell = Jupyter.notebook.get_cell(-1);
                        if (lastCell.get_text() === "") {
                            cell = lastCell;
                        } else {
                            cell = Jupyter.notebook.insert_cell_at_bottom("code");
                        }
                        cell.set_text(text);
                        cell.execute();

                        var newCell = Jupyter.notebook.insert_cell_at_bottom("code");
                        newCell.code_mirror.focus();
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

            // listeners are found by $._data(element, "events" ); we turn off
            // listeners that cause navigation away from current window
            function modifyElements() {
                var newNotebookDir = "/notebooks/XcalarTemplate.ipynb?" +
                                    "kernel_name=python2#";

                // hide the log out button on the upper right
                $("#login_widget").remove();

                // rework "open notebook" - prevent #open_notebook menu item from
                // opening in a new window
                $("#open_notebook").off("click");
                $("#open_notebook").attr("title", "Opens the Dashboard view");
                $("#open_notebook").find("a").attr("href", "/tree");

                // rework "new notebook" - prevent menu item from
                // opening in a new window
                $("#new-notebook-submenu-python2").find("a").off("click");
                $("#new-notebook-submenu-python2").find("a")
                                                  .attr("href", newNotebookDir);
            }
            window.addEventListener("message", receiveMessage, false);
            window.alert = function() {};
        }
    };
});
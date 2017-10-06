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
                // brand new workbook
                var publishTable = params["publishTable"] === "true";
                var tableName;
                var numRows = "0";
                if (publishTable) {
                    tableName = decodeURIComponent(params["tableName"]);
                    numRows = params["numRows"];
                }
                var request = {action: "newUntitled",
                               publishTable: publishTable,
                               tableName: tableName,
                               numRows: numRows};
                console.log("Telling parent new untitled notebook created");
                parent.postMessage(JSON.stringify(request), "*");
            } else {
                // accessing an existing notebook
                var request = {action: "resend"};
                parent.postMessage(JSON.stringify(request), "*");
            }
            var username;
            var userid;
            var sessionName;
            var sessionId;
            function receiveMessage(event) {
                window.alert = function() {};
                alert = function() {};
                var struct = JSON.parse(event.data);
                switch (struct.action) {
                    case ("init"):
                        username = struct.username;
                        userid = struct.userid;
                        sessionName = struct.sessionname;
                        sessionId = struct.sessionid;
                        var notebookName = Jupyter.notebook.get_notebook_name();
                        if (struct.newUntitled) {
                            prependSessionStub(username, userid, sessionName);
                            if (struct.publishTable) {
                                appendPublishTableStub(struct.tableName, struct.colNames, struct.numRows);
                            }
                            Jupyter.save_widget.rename_notebook({notebook: Jupyter.notebook});
                        }
                        break;
                    case ("publishTable"):
                        appendPublishTableStub(struct.tableName, struct.colNames, struct.numRows);
                        break;
                    case ("stub"):
                        var stubName = struct.stubName;
                        appendStub(stubName);
                        break;
                    default:
                        break;
                }
            }
            function insertCellToSelected(text) {
                var index = Jupyter.notebook.get_selected_index();
                if (!Jupyter.notebook.get_selected_cell().get_text()) {
                    index -= 1;
                }
                var cell = Jupyter.notebook.insert_cell_below('code', index);
                cell.set_text(text);
                cell.focus_cell();
                return cell;
            }
            // Add all stub cases here
            function appendStub(stubName) {
                var text;
                switch (stubName) {
                    case ("connWorkbook"):
                        text = '%matplotlib inline\n#To faciliate manipulations later\nimport pandas as pd\nimport matplotlib.pyplot as plt\n\n#Xcalar imports. For more information, refer to discourse.xcalar.com\nfrom xcalar.compute.api.XcalarApi import XcalarApi\nfrom xcalar.compute.api.Session import Session\nfrom xcalar.compute.api.WorkItem import WorkItem\nfrom xcalar.compute.api.ResultSet import ResultSet\n\n#Code starts here. First create a XcalarApi object to do anything\nxcalarApi = XcalarApi()\n';
                        text += '#Connect to current workbook that you are in\nworkbook = Session(xcalarApi, "' + username + '", "' + username + '", ' + userid + ', True, "' + sessionName + '")\nxcalarApi.setSession(workbook)';
                        break;
                    case ("udfTemplate"):
                        text = '# PLEASE TAKE NOTE:\n'
                             + '# UDFs can only support return values of type String.\n'
                             + '# Function names that start with __ are considered private functions and will not be directly invokable.\n'
                             + 'def yourUDF(col1, col2, col3):\n'
                             + '    # You can modify the function name.\n'
                             + '    # Your code starts from here. This is an example code.\n'
                             + '    return str(col1) + str(col2) + str(col3)\n'
                             + '    pass\n\n'
                             + '# Test your code with a sample of the table\n'
                             + '# DO NOT MODIFY THIS CODE HERE\n'
                             + 'for index, row in dataframeName.iterrows():\n'
                             + '    assert(yourUDF(row[colName1], row[colName2], row[colName3]))';
                        break;
                    default:
                        return;
                }
                insertCellToSelected(text);
            }
            function prependSessionStub(username, userid, sessionName) {
                var cell = Jupyter.notebook.insert_cell_above('code', 0);
                var text = '#DO NOT RENAME THE NOTEBOOK!\n%matplotlib inline\n#To faciliate manipulations later\nimport pandas as pd\nimport matplotlib.pyplot as plt\n\n#Xcalar imports. For more information, refer to discourse.xcalar.com\nfrom xcalar.compute.api.XcalarApi import XcalarApi\nfrom xcalar.compute.api.Session import Session\nfrom xcalar.compute.api.WorkItem import WorkItem\nfrom xcalar.compute.api.ResultSet import ResultSet\n\n#Code starts here. First create a XcalarApi object to do anything\nxcalarApi = XcalarApi()\n';
                text += '#Connect to current workbook that you are in\nworkbook = Session(xcalarApi, "' + username + '", "' + username + '", ' + userid + ', True, "' + sessionName + '")\nxcalarApi.setSession(workbook)';
                cell.set_text(text);
                cell.execute();
                Jupyter.notebook.save_notebook();
            }

            function appendPublishTableStub(tableName, colNames, numRows) {
                var text = '#Publish table as pandas dataframe\nfrom collections import OrderedDict\n';
                if (numRows && numRows > 0) {
                    text += 'ROW_LIMIT = ' + numRows + '\n';
                    text += 'rowCount = 0\n';
                }
                var resultSetPtrName = 'resultSetPtr_' + tableName.split("#")[1];
                //var filterDict = 'filtered_row = {k:v for k,v in row.iteritems() if k in [';
                var filterDict = 'col_list = [';
                for (var i = 0; i<colNames.length;i++) {
                    filterDict += '"' + colNames[i] + '",';
                }
                filterDict += ']\n    kv_list = []\n'
                filterDict += '    for k in col_list:\n'
                            + '        if k not in row:\n'
                            + '            kv_list.append((k, None))\n'
                            + '        else:\n'
                            + '            kv_list.append((k, row[k]))\n'
                            + '            if type(row[k]) is list:\n'
                            + '                for i in range(len(row[k])):\n'
                            + '                    subKey = k + "[" + str(i) + "]"\n'
                            + '                    if subKey in col_list:\n'
                            + '                        row[subKey] = row[k][i]\n'
                            + '    filtered_row = OrderedDict(kv_list)\n'
                text += resultSetPtrName + ' = ResultSet(xcalarApi, tableName="' + tableName + '")\n';
                tableName = tableName.replace(/#/g, "_");
                var dfName = tableName + '_pd';
                text += tableName + ' = []\nfor row in ' + resultSetPtrName + ':\n';

                if (numRows && numRows > 0) {
                    text += '    rowCount += 1\n';
                    text += '    if rowCount > ROW_LIMIT:\n        break\n';
                }
                text += '    ' + filterDict + '\n    ' + tableName + '.append(filtered_row)\n';
                text += dfName + ' = pd.DataFrame.from_dict(' + tableName + ')\n'
                      + dfName;

                // var lastCell = Jupyter.notebook.get_cell(-1);
                // if (lastCell.get_text() === "") {
                //     cell = lastCell;
                // } else {
                //     cell = Jupyter.notebook.insert_cell_at_bottom("code");
                // }
                insertCellToSelected(text).execute();
                Jupyter.notebook.save_notebook();

                // var newCell = Jupyter.notebook.insert_cell_at_bottom("code");
                // newCell.code_mirror.focus();
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

                // rework "kill and exit" - direct to tree after shutting down
                // notebook
                $("#kill_and_exit").click(function() {
                    window.location.href = "/tree";
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

            // We probably want to put these codes in another file.
            window.addEventListener("message", receiveMessage, false);
            $(document).on("change", "textarea", function(event) {
                var message = {
                    action: "mixpanel",
                    event: "InputEvent",
                    property: {
                        "Content": $(this).val(),
                        "Element": getElementPath(event.target),
                        "Timestamp": (new Date()).getTime()
                    }
                };
                parent.postMessage(JSON.stringify(message), "*");
            });
            function getElementPath(element) {
                try {
                    var path = $(element).prop("outerHTML").match(/<.*(class|name|id)="[^"]*"/g);
                    path = path ? path[0] + ">" : "";
                    var parents = $(element).parentsUntil("body");
                    $.each(parents, function(i, val) {
                        var parentHtml = $(parents[i]).clone().children().remove().end()
                                         .prop("outerHTML")
                                         .match(/<.*(class|name|id)="[^"]*"/g);
                        parentHtml = parentHtml ? parentHtml[0] + ">" : "";
                        if (parentHtml.length + path.length > 255) {
                            return path;
                        }
                        path = parentHtml + " ==> " + path;
                    });
                    return path;
                } catch(err) {
                    // Do not affect our use with XD
                    return "Error case: " + err;
                }
            }
            // Those codes end up here


            window.alert = function() {};
        }
    };
});
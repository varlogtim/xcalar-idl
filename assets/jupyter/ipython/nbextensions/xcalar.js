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

            $(document).on("click", ".sendToUDF", function () {
                var code = Jupyter.notebook.get_selected_cell().get_text();
                code = trimUDFCode(code);
                var request = {action: "sendToUDFEditor", code: code};
                parent.postMessage(JSON.stringify(request), "*");
            });

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
                        } else {
                            validateSessionCells();
                        }
                        break;
                    case ("publishTable"):
                        appendPublishTableStub(struct.tableName, struct.colNames, struct.numRows);
                        break;
                    case ("stub"):
                        var stubName = struct.stubName;
                        appendStub(stubName, struct.args);
                        break;
                    default:
                        break;
                }
            }
            function insertCellToSelected(text, stubName) {
                var index = Jupyter.notebook.get_selected_index();
                if (!Jupyter.notebook.get_selected_cell().get_text()) {
                    index -= 1;
                }
                var cell = Jupyter.notebook.insert_cell_below('code', index);
                cell.set_text(text);
                cell.focus_cell();
                if (stubName == "basicUDF"|| stubName == "importUDF") {
                    var button = '<input class="sendToUDF" type="button" ' +
                                'style="width:calc(100% - 13.2ex);margin-left:13.3ex;" ' +
                                'value="Send to UDF Editor"/>';
                    $(".cell").eq(index + 1).append(button);
                }
                return cell;
            }
            // Add all stub cases here
            function appendStub(stubName, args) {
                var text;
                switch (stubName) {
                    case ("connWorkbook"):
                        text = '%matplotlib inline\n#To faciliate manipulations later\nimport pandas as pd\nimport matplotlib.pyplot as plt\n\n#Xcalar imports. For more information, refer to discourse.xcalar.com\nfrom xcalar.compute.api.XcalarApi import XcalarApi\nfrom xcalar.compute.api.Session import Session\nfrom xcalar.compute.api.WorkItem import WorkItem\nfrom xcalar.compute.api.ResultSet import ResultSet\n\n#Code starts here. First create a XcalarApi object to do anything\nxcalarApi = XcalarApi()\n';
                        text += '#Connect to current workbook that you are in\nworkbook = Session(xcalarApi, "' + username + '", "' + username + '", ' + userid + ', True, "' + sessionName + '")\nxcalarApi.setSession(workbook)';
                        break;
                    case ("basicUDF"):
                        text = '# PLEASE TAKE NOTE:\n'
                             + '# UDFs can only support return values of type String.\n'
                             + '# Function names that start with __ are considered private functions and will not be directly invokable.\n';
                        var colsArg = "";
                        var retStr = "";
                        var assertStr = "";
                        var udfName;
                        var dfName;
                        if (args && args.columns) {
                            for (var i = 0; i < args.columns.length; i++) {
                                colsArg += "col" + i + ", ";
                                retStr += "str(col" + i + ") + ";
                                assertStr += 'row["' + args.columns[i] + '"], ';
                            }
                            colsArg = colsArg.slice(0, -2);
                            retStr = retStr.slice(0, -3);
                            assertStr = assertStr.slice(0, -2);
                            udfName = args.fnName;
                            dfName = args.tableName;
                        } else {
                            colsArg = "col1, col2, col3";
                            retStr = "str(col1) + str(col2) + str(col3)";
                            assertStr += 'row[colName1], row[colName2], row[colName3]';
                            udfName = "yourUDF";
                            dfName = "dataframeName";
                        }
                        text += 'def ' + udfName + '(' + colsArg + '):\n'
                             + '    # You can modify the function name.\n'
                             + '    # Your code starts from here. This is an example code.\n'
                             + '    return ' + retStr + '\n\n'
                             + '# Test your code with a sample of the table\n'
                             + '# DO NOT MODIFY THIS CODE HERE\n'
                             + 'for index, row in ' + dfName + '.iterrows():\n'
                             + '    assert(' + udfName + '(' + assertStr + '))\n'
                             + '    assert(type(' + udfName + '(' + assertStr + ')).__name__ == \'str\')\n'
                             + '    print (' + udfName + '(' + assertStr + '))';
                        break;
                    case ("importUDF"):
                        text = 'import io\n'
                             + 'def convertUTF_32(filepath, instream):\n'
                             + '    # This UDF sample is to import utf-32 encoded data to Xcalar.\n'
                             + '    # "instream" is equivalent to "with open(filepath) as instream".\n'
                             + '    # In this case we need to specify the encoding so we create a new one instead of using the default.\n'
                             + '    ins = io.open(filepath, "r", encoding = "utf-32")\n'
                             + '    headers = ins.next()[:-1].split("\\t")\n'
                             + '    for line in ins:\n'
                             + '        splitLine = line[:-1].split("\\t")\n'
                             + '        row = {}\n'
                             + '        for i in xrange(len(splitLine)):\n'
                             + '            row[headers[i]] = splitLine[i]\n'
                             + '        yield row';
                        break;
                    default:
                        return;
                }
                insertCellToSelected(text, stubName);
            }
            function prependSessionStub(username, userid, sessionName) {
                var cell = Jupyter.notebook.insert_cell_above('code', 0);
                var text = '%matplotlib inline\n#To faciliate manipulations later\nimport pandas as pd\nimport matplotlib.pyplot as plt\n\n#Xcalar imports. For more information, refer to discourse.xcalar.com\nfrom xcalar.compute.api.XcalarApi import XcalarApi\nfrom xcalar.compute.api.Session import Session\nfrom xcalar.compute.api.WorkItem import WorkItem\nfrom xcalar.compute.api.ResultSet import ResultSet\n\n#Code starts here. First create a XcalarApi object to do anything\nxcalarApi = XcalarApi()\n';
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
                tableName = tableName.replace(/[#-]/g, "_");
                var dfName = tableName + '_pd';
                text += tableName + ' = []\nfor row in ' + resultSetPtrName + ':\n';

                if (numRows && numRows > 0) {
                    text += '    rowCount += 1\n';
                    text += '    if rowCount > ROW_LIMIT:\n        break\n';
                }
                text += '    ' + filterDict + '\n    ' + tableName + '.append(filtered_row)\n';
                text += dfName + ' = pd.DataFrame.from_dict(' + tableName + ')\n'
                      + dfName;

                insertCellToSelected(text).execute();
                Jupyter.notebook.save_notebook();
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

                window.onbeforeunload = function() {
                    return; // removes "do you want to leave" warning
                };
            }

            // checks for cells that have session info not related to current
            // session
            function validateSessionCells() {
                var cells = Jupyter.notebook.get_cells();
                var errors = [];
                for (var i = 0; i < cells.length; i++) {
                    var text = cells[i].get_text();
                    var lines = text.split("\n");
                    for (var j = 0; j < lines.length; j++) {
                        if (lines[j].indexOf("workbook = Session(xcalarApi") === 0) {
                            var cellWBInfo = parseSessInfoFromLine(lines[j]);
                            if (cellWBInfo.username !== '"' + username + '"' ||
                                cellWBInfo.userid !== "" + userid ||
                                cellWBInfo.sessionName !== '"' + sessionName + '"') {
                                errors.push(
                                    {line: lines[j],
                                    lineIndex: j + 1,
                                    cellIndex: i + 1,
                                    cell: cells[i]}
                                );
                            }
                        }
                    }
                }
                if (errors.length) {
                    showSessionWarning(errors);
                }
            }

            function parseSessInfoFromLine(line) {

                line = line.slice(line.indexOf("("), line.indexOf(")"));
                line = line.split(",");
                return {
                    username: $.trim(line[1]),
                    userid: $.trim(line[3]),
                    sessionName: $.trim(line[5])
                };
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

            function showSessionWarning(errors) {
                var options = {
                    title: "Warning",
                    msg: "An invalid workbook connection was found. Please " +
                         "update the following workbook connection by " +
                         "selecting 'Connect to Xcalar Workbook' from the " +
                         "Code Samples menu.\n" + "Found: " + errors[0].line +
                         "\n" + "Expected: " + 'workbook = Session(xcalarApi, "' +
                        username + '", "' + username + '", ' + userid +
                        ', True, "' + sessionName + '")' ,
                    isAlert: true,
                    sizeToText: true
                };
                var message = {
                    action: "alert",
                    options: options,
                };
                parent.postMessage(JSON.stringify(message), "*");
            }

            // for sending to udf panel
            function trimUDFCode(code) {
                var lines = code.split("\n");
                if (lines[lines.length - 6] === "# Test your code with a sample of the table") {
                    lines = lines.slice(0, lines.length - 6);
                }
                return lines.join("\n");
            }

            // We probably want to put these codes in another file.
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

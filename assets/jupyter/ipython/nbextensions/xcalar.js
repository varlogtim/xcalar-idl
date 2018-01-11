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
            function insertCellToSelected(texts, stubName) {
                var index = Jupyter.notebook.get_selected_index();
                if (!Jupyter.notebook.get_selected_cell().get_text()) {
                    index -= 1;
                }
                var cell;
                for (var i = 0; i < texts.length; i++) {
                    cell = Jupyter.notebook.insert_cell_below('code', index);
                    cell.set_text(texts[i]);
                    if (i === 0) {
                        cell.focus_cell();
                    }
                    if ((stubName == "basicUDF" || stubName == "importUDF") &&
                        i === 0) {
                        var button = '<input class="sendToUDF" type="button" ' +
                                    'style="width:calc(100% - 13.2ex);margin-left:13.3ex;" ' +
                                    'value="Copy to UDF Editor"/>';
                        $(".cell").eq(index + 1).append(button);
                    }
                    index++;
                }

                return cell;
            }
            // Add all stub cases here
            function appendStub(stubName, args) {
                var texts = [];
                var text;
                switch (stubName) {
                    case ("connWorkbook"):
                        text = '%matplotlib inline\n#To faciliate manipulations later\nimport pandas as pd\nimport matplotlib.pyplot as plt\n\n#Xcalar imports. For more information, refer to discourse.xcalar.com\nfrom xcalar.compute.api.XcalarApi import XcalarApi\nfrom xcalar.compute.api.Session import Session\nfrom xcalar.compute.api.WorkItem import WorkItem\nfrom xcalar.compute.api.ResultSet import ResultSet\n\n#Code starts here. Creating a XcalarApi object\nxcalarApi = XcalarApi()\n';
                        text += '#Connect to current workbook that you are in\nworkbook = Session(xcalarApi, "' + username + '", "' + username + '", ' + userid + ', True, "' + sessionName + '")\nxcalarApi.setSession(workbook)';
                        texts.push(text);
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
                        var tableStub = "";
                        if (args && args.columns) {
                            for (var i = 0; i < args.columns.length; i++) {
                                var colVar = args.columns[i].replace(/[^a-zA-Z0-9]/g, "_");
                                colsArg += colVar + ", ";
                                retStr += "str(" + colVar + ") + ";
                                assertStr += 'row["' + args.columns[i] + '"], ';
                            }
                            colsArg = colsArg.slice(0, -2);
                            retStr = retStr.slice(0, -3);
                            assertStr = assertStr.slice(0, -2);
                            udfName = args.fnName;
                            dfName = args.tableName.replace(/[#-]/g, "_") + '_pd';
                            tableStub = getPublishTableStub(args.tableName, args.allCols, 100);
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
                             + '    return ' + retStr + '\n';
                        texts.push(text);
                        text =  '# Test your UDF with a sample of the table\n'
                             + '# DO NOT MODIFY THIS CODE HERE\n'
                             + tableStub
                             + 'for index, row in ' + dfName + '.iterrows():\n'
                             + '    assert(type(' + udfName + '(' + assertStr + ')).__name__ == \'str\')\n'
                             + '    print(' + udfName + '(' + assertStr + '))';
                        texts.push(text);
                        break;
                    case ("importUDF"):
                        text =  'from codecs import getreader\n' +
                                'def ' + args.fnName + '(inp, ins):\n' +
                                '    # FILL IN YOUR FUNCTION HERE\n' +
                                '    pass\n';
                        texts.push(text);

                        text =  '#The following function is a sample of how an import UDF should be written\n' +
                                'from codecs import getreader\n' +
                                'def __sampleCsvReader(inp, ins):\n' +
                                '    hasHeader = False\n' +
                                '    fieldDelim = ","\n' +
                                '    headers = None\n' +
                                '    Utf8Reader = getreader("utf-8")\n' +
                                '    utf8Stream = Utf8Reader(ins)\n' +
                                '    for line in utf8Stream:\n' +
                                '        line = line.rstrip("\\n") #Remove new line character\n' +
                                '        record = {}\n' +
                                '        if hasHeader:\n' +
                                '            headers = line.split(fieldDelim)\n' +
                                '            hasHeader = False\n' +
                                '            continue\n' +
                                '        vals = line.split(fieldDelim)\n' +
                                '        if not headers:\n' +
                                '            headers = ["column" + str(i + 1) for i in range(len(vals))]\n' +
                                '        for i in range(len(headers)):\n' +
                                '            record[headers[i]] = vals[i]\n' +
                                '        yield record\n' +
                                '\n' +
                                'import inspect\n' +
                                'if inspect.isgeneratorfunction(' + args.fnName + '):\n' +
                                '    print("Your generator function looks good. Try it on a file!")\n' +
                                'else:\n' +
                                '    print("You must return a generator. Please try again")';
                        texts.push(text);
                        break;
                    case("testImportUDF"):
                        text = 'from xcalar.compute.api.Dataset import *\n' +
                                'from xcalar.compute.coretypes.DataFormatEnums.ttypes import DfFormatTypeT\n' +
                                'import random\n' +
                                '\n' +
                                'userName = "' + username + '"\n' +
                                'tempDatasetName = userName + "." + str(random.randint(10000,99999)) + "jupyterDS" + str(random.randint(10000,99999))\n' +
                                'dataset = UdfDataset(xcalarApi,\n' +
                                '    "' + args.target + '",\n' +
                                '    "' + args.url + '",\n' +
                                '    tempDatasetName,\n' +
                                '    "' + args.moduleName + ':' + args.fnName + '")\n' +
                                '\n' +
                                'dataset.load()\n' +
                                '\n' +
                                'resultSet = ResultSet(xcalarApi, datasetName=dataset.name, maxRecords=100)\n' +
                                '\n' +
                                'for row in resultSet:\n' +
                                '    print(row)\n' +
                                '\n' +
                                'dataset.delete()\n' +
                                'print("End of UDF")';
                        texts.push(text);
                        break;
                    default:
                        return;
                }
                insertCellToSelected(texts, stubName);
            }
            function prependSessionStub(username, userid, sessionName) {
                var cell = Jupyter.notebook.insert_cell_above('code', 0);
                var text = '%matplotlib inline\n#To faciliate manipulations later\nimport pandas as pd\nimport matplotlib.pyplot as plt\n\n#Xcalar imports. For more information, refer to discourse.xcalar.com\nfrom xcalar.compute.api.XcalarApi import XcalarApi\nfrom xcalar.compute.api.Session import Session\nfrom xcalar.compute.api.WorkItem import WorkItem\nfrom xcalar.compute.api.ResultSet import ResultSet\n\n#Code starts here. Creating a XcalarApi object\nxcalarApi = XcalarApi()\n';
                text += '#Connect to current workbook that you are in\nworkbook = Session(xcalarApi, "' + username + '", "' + username + '", ' + userid + ', True, "' + sessionName + '")\nxcalarApi.setSession(workbook)';
                cell.set_text(text);
                cell.execute();
                Jupyter.notebook.save_notebook();
            }

            function appendPublishTableStub(tableName, colNames, numRows) {
                var text = getPublishTableStub(tableName, colNames, numRows);
                tableName = tableName.replace(/[#-]/g, "_");
                var dfName = tableName + '_pd';
                text += dfName + "\n";
                insertCellToSelected([text]).execute();
                Jupyter.notebook.save_notebook();
            }

            function getPublishTableStub(tableName, colNames, numRows) {
                var text = '#Publish table as pandas dataframe\nfrom collections import OrderedDict\n';
                var rowLimit = "";
                if (numRows && numRows > 0) {
                    rowLimit = ", maxRecords=" + numRows;
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
                text += resultSetPtrName + ' = ResultSet(xcalarApi, tableName="' + tableName + '"' + rowLimit + ')\n';
                tableName = tableName.replace(/[#-]/g, "_");
                var dfName = tableName + '_pd';
                text += tableName + ' = []\nfor row in ' + resultSetPtrName + ':\n';
                text += '    ' + filterDict + '\n    ' + tableName + '.append(filtered_row)\n';
                text += dfName + ' = pd.DataFrame.from_dict(' + tableName + ')\n';
                return text;
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
                $("#new-notebook-submenu-python3").find("a").off("click");
                $("#new-notebook-submenu-python3").find("a").click(function() {
                    Jupyter.notebook.contents.new_untitled("", {type: "notebook"})
                    .then(function(data) {
                        var url = "/notebooks/" + data.path + "?kernel_name=python3&needsTemplate=true";
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
                if (lines[lines.length - 26] === "# Test your code with a sample of the table") {
                    lines = lines.slice(0, lines.length - 26);
                } else if (lines[lines.length - 25] === "# DO NOT MODIFY BELOW THIS LINE") {
                    lines = lines.slice(0, lines.length - 25);
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
            function getPathStr(ele) {
                var path = ele.prop("tagName");
                if (ele.attr("id")) {
                    path += "#" + ele.attr("id");
                }
                if (ele.attr("class")) {
                    path += "." + ele.attr("class");
                }
                return path;
            }
            function getElementPath(element) {
                try {
                    var path = getPathStr($(element));
                    var parents = $(element).parentsUntil("body");
                    for (var i = 0; (i < parents.length) && (path.length <= 255); i++) {
                        path += "|";
                        path += getPathStr($(parents).eq(i), path);
                    }
                    return path;
                } catch (err) {
                    // Do not affect our use with XD
                    return "Error case: " + err;
                }
            }
            // Those codes end up here


            window.alert = function() {};
        }
    };
});

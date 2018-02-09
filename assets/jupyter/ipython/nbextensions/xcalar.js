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
                var request = {action: "sendToUDFEditor", code: code};
                parent.postMessage(JSON.stringify(request), "*");
            });

            if (params.needsTemplate === "true") {
                // brand new workbook
                var publishTable = params.publishTable === "true";
                var tableName;
                var numRows = "0";
                if (publishTable) {
                    tableName = decodeURIComponent(params.tableName);
                    numRows = params.numRows;
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
                        text = '# Xcalar Notebook Connector\n' +
                                '# \n' +
                                '# Connects this Jupyter Notebook to the Xcalar Workbook <' + sessionName + '>\n' +
                                '#\n' +
                                '# To use any data from your Xcalar Workbook, run this snippet before other \n' +
                                '# Xcalar Snippets in your workbook. \n' +
                                '# \n' +
                                '# A best practice is not to edit this cell.\n' +
                                '#\n' +
                                '# If you wish to use this Jupyter Notebook with a different Xcalar Workbook \n' +
                                '# delete this cell and click CODE SNIPPETS --> Connect to Xcalar Workbook.\n';
                        text += '\n%matplotlib inline\n\n# Importing third-party modules to faciliate data work. \nimport pandas as pd\nimport matplotlib.pyplot as plt\n\n# Importing Xcalar packages and modules. \n# For more information, search and post questions on discourse.xcalar.com\nfrom xcalar.compute.api.XcalarApi import XcalarApi\nfrom xcalar.compute.api.Session import Session\nfrom xcalar.compute.api.WorkItem import WorkItem\nfrom xcalar.compute.api.ResultSet import ResultSet\n\n# Create a XcalarApi object\nxcalarApi = XcalarApi()\n';
                        text += '# Connect to current workbook that you are in\nworkbook = Session(xcalarApi, "' + username + '", "' + username + '", ' + userid + ', True, "' + sessionName + '")\nxcalarApi.setSession(workbook)';
                        texts.push(text);
                        break;
                    case ("basicUDF"):
                        var text = "";
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
                        text += '# Xcalar Map UDF Template\n' +
                                '#\n' +
                                '# A function definition to contain your Map UDF Python code. The sample Python\n' +
                                '# code concatenates all of your parameters into one string, and returns that \n' +
                                '# string.\n' +
                                '# \n' +
                                '# To create your own map UDF, edit the function definition below, named \n' +
                                '# <' + udfName +'>. \n' +
                                '#\n' +
                                '# To test your map UDF, run this cell to define your UDF \n' +
                                '# and use the cell beneath this one. \n' +
                                '#\n' +
                                '# To copy this UDF to the Xcalar UDF editor, click the Copy to UDF Editor \n' +
                                '# button at the bottom of this cell, name your module, and click SAVE. \n' +
                                '#\n' +
                                '# REQUIREMENT: Map UDF functions must return a string value.\n' +
                                '#\n' +
                                '# Best practice is to name helper functions by starting with __. Such \n' +
                                '# functions will be considered private functions and will not be directly \n' +
                                '# invokable from Xcalar Design.\n' +
                                '\n' +
                                '# Map UDF function definition.\n';
                        text += 'def ' + udfName + '(' + colsArg + '):\n' +
                               '    # You can modify the function name.\n' +
                               '    # Your code starts from here. This is an example code.\n' +
                               '    return ' + retStr + '\n';
                        texts.push(text);
                        text =  '# Test Map UDF Template \n' +
                                '#\n' +
                                '# Creates a pandas dataframe containing a sample of the \n' +
                                '# selected table when you clicked CODE SNIPPETS --> Create Map UDF, and \n' +
                                '# invokes your Map UDF function.\n' +
                                '# \n' +
                                '# To test your UDF, run your Map UDF function cell, and then run this cell. \n' +
                                '#\n' +
                                '# Best practice is to not modify this code. However, if you modify the \n' +
                                '# function name or parameters in your Map UDF template, then you should\n' +
                                '# carefully make the same modifications at bottom.\n' +
                               tableStub +
                               'for index, row in ' + dfName + '.iterrows():\n' +
                               '    assert(type(' + udfName + '(' + assertStr + ')).__name__ == \'str\')\n' +
                               '    print(' + udfName + '(' + assertStr + '))';
                        texts.push(text);
                        break;
                    case ("importUDF"):
                        text =  '# Xcalar Import UDF Template\n' +
                                '# \n' +
                                '# This is a function definition for your import UDF named <' + args.fnName + '>. \n' +
                                '#\n' +
                                '# REQUIREMENTS: Import UDF functions take two arguments...\n' +
                                '#   inp: The file path to the data source file being imported.\n' +
                                '#   ins: A file stream for the data source file.\n' +
                                '#\n' +
                                '#   Your Import UDF function must be a generator, a Python function which \n' +
                                '#   processes and returns a stream of data. \n' +
                                '# \n' +
                                '# To create an import UDF, replace the "pass" instruction with the Python \n' +
                                '# code for your Import UDF function. \n' +
                                '#\n' +
                                '# To define your import UDF, run this cell.\n' +
                                '# \n' +
                                '# To test whether this import UDF is a generator, or to view a sample import \n' +
                                '# UDF, use the cell beneath this one.\n' +
                                '# \n' +
                                '# To copy this UDF to the Xcalar UDF editor, click the Copy to UDF Editor \n' +
                                '# button at the bottom of this cell, name your module, and save the UDF. \n' +
                                '#\n' +
                                '# To test this import UDF with an external file, click the Copy to UDF Editor \n' +
                                '# button at the bottom of this cell, enter a module name, and click SAVE. \n' +
                                '# Then, click CODE SNIPPETS --> Test Existing Import UDF.\n' +
                                '#\n' +
                                '# Best practice is to name helper functions by starting with __. Such \n' +
                                '# functions will be considered private functions and will not be directly \n' +
                                '# invokable from Xcalar Design.\n' +
                                '#\n' +
                                '# The sample Python code below does reads your file and prints it out with a line \n' +
                                '# number \n' +
                                '\n' +
                                '# Function definition for your Import UDF.\n' +
                                'def ' + args.fnName + '(fullPath, inStream):\n' +
                                '    # Edit only within this function.\n' +
                                '    # Please do not modify this function\'s name, or the first 2 arguments.\n' +
                                '\n' +
                                '    # The following sample code reads your file and prints it out with a line\n' +
                                '    # number\n' +
                                '    import codecs\n' +
                                '    Utf8Reader = codecs.getreader("utf-8")\n' +
                                '    utf8Stream = Utf8Reader(inStream)\n' +
                                '    lineNumber = 1\n' +
                                '    for line in utf8Stream:\n' +
                                '        yield {"lineNumber": lineNumber, "contents": line}\n' +
                                '        lineNumber += 1\n' +
                                '\n' +
                                '### WARNING DO NOT EDIT CODE BELOW THIS LINE ###\n' +

                                '# Xcalar Import UDF Test\n' +
                                '#\n' +
                                '# This Python code tests whether your UDF <' + args.fnName + '> will function on \n' +
                                '# external data source file <' + args.target + ":" + args.url + '>\n' +
                                '#\n' +
                                '# To test your import UDF, update the version in your UDF editor by clicking \n' +
                                '# the Copy to UDF Editor button, and clicking SAVE. Then, run this cell.\n' +
                                '#\n' +
                                '# Best practice is to use a file containing a sample of your total data \n' +
                                '# source file, because this Python code will output all of the results inline.\n\n' +
                                'from xcalar.compute.api.Dataset import *\n' +
                                'from xcalar.compute.coretypes.DataFormatEnums.ttypes import DfFormatTypeT\n' +
                                'from xcalar.compute.api.Udf import Udf\n' +
                                'from xcalar.compute.coretypes.LibApisCommon.ttypes import XcalarApiException\n' +
                                'import random\n' +
                                '\n' +
                                'def uploadUDF():\n' +
                                '    import inspect\n' +
                                '    sourceCode = "".join(inspect.getsourcelines(' + args.fnName + ')[0])\n' +
                                '    try:\n' +
                                '        Udf(xcalarApi).add("'+ args.moduleName + '", sourceCode)\n' +
                                '    except XcalarApiException as e:\n' +
                                '        if e.status == StatusT.StatusUdfModuleAlreadyExists:\n' +
                                '            Udf(xcalarApi).update("'+ args.moduleName + '", sourceCode)\n' +
                                '\n' +
                                'def testImportUDF():\n' +
                                '    from IPython.core.display import display, HTML\n' +
                                '    userName = "'+ username + '"\n' +
                                '    tempDatasetName = userName + "." + str(random.randint(10000,99999)) + "jupyterDS" + str(random.randint(10000,99999))\n' +
                                '    dataset = UdfDataset(xcalarApi,\n' +
                                '        "'+ args.target + '",\n' +
                                '        "'+ args.url + '",\n' +
                                '        tempDatasetName,\n' +
                                '        "'+ args.moduleName + ':'+ args.fnName + '")\n' +
                                '\n' +
                                '    dataset.load()\n' +
                                '\n' +
                                '    resultSet = ResultSet(xcalarApi, datasetName=dataset.name, maxRecords=100)\n' +
                                '\n' +
                                '    NUMROWS = 100\n' +
                                '    rowN = 0\n' +
                                '    numCols = 0\n' +
                                '    headers = []\n' +
                                '    data = []\n' +
                                '    for row in resultSet:\n' +
                                '        if rowN >= NUMROWS:\n' +
                                '            break\n' +
                                '        newRow = [""] * numCols\n' +
                                '        for key in row:\n' +
                                '            idx = headers.index(key) if key in headers else -1\n' +
                                '            if idx > -1:\n' +
                                '                newRow[idx] = row[key]\n' +
                                '            else:\n' +
                                '                numCols += 1\n' +
                                '                newRow.append(row[key])\n' +
                                '                headers.append(key)\n' +
                                '        data.append(newRow)\n' +
                                '        rowN += 1\n' +
                                '    data = [row + [""] * (numCols - len(row)) for row in data]\n' +
                                '\n' +
                                '    print("The following should look like a proper table with headings.")\n' +
                                '    display(HTML(\n' +
                                '            \'<table><tr><th>{}</th></tr><tr>{}</tr></table>\'.format(\n' +
                                '            \'</th><th>\'.join(headers),\n' +
                                '            \'</tr><tr>\'.join(\'<td>{}</td>\'.format(\'</td><td>\'.join(str(_) for _ in row)) for row in data)\n' +
                                '            )))\n' +
                                '\n' +
                                '    dataset.delete()\n' +
                                '    print("End of UDF")\n' +
                                '\n' +
                                '# Test import UDF on file\n' +
                                'uploadUDF()\n' +
                                'testImportUDF()';
                        texts.push(text);
                        break;
                    default:
                        return;
                }
                insertCellToSelected(texts, stubName);
            }
            function prependSessionStub(username, userid, sessionName) {
                var cell = Jupyter.notebook.insert_cell_above('code', 0);
                var text = '# Xcalar Notebook Connector\n' +
                                '# \n' +
                                '# Connects this Jupyter Notebook to the Xcalar Workbook <' + sessionName + '>\n' +
                                '#\n' +
                                '# To use any data from your Xcalar Workbook, run this snippet before other \n' +
                                '# Xcalar Snippets in your workbook. \n' +
                                '# \n' +
                                '# A best practice is not to edit this cell.\n' +
                                '#\n' +
                                '# If you wish to use this Jupyter Notebook with a different Xcalar Workbook \n' +
                                '# delete this cell and click CODE SNIPPETS --> Connect to Xcalar Workbook.\n';
                text += '\n%matplotlib inline\n\n# Importing third-party modules to faciliate data work. \nimport pandas as pd\nimport matplotlib.pyplot as plt\n\n# Importing Xcalar packages and modules. \n# For more information, search and post questions on discourse.xcalar.com\nfrom xcalar.compute.api.XcalarApi import XcalarApi\nfrom xcalar.compute.api.Session import Session\nfrom xcalar.compute.api.WorkItem import WorkItem\nfrom xcalar.compute.api.ResultSet import ResultSet\n\n# Create a XcalarApi object\nxcalarApi = XcalarApi()\n';
                text += '# Connect to current workbook that you are in\nworkbook = Session(xcalarApi, "' + username + '", "' + username + '", ' + userid + ', True, "' + sessionName + '")\nxcalarApi.setSession(workbook)';
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
                var rowsText = "all";
                if (numRows && numRows > 0) {
                    rowsText = numRows;
                }
                var text = '# Publish Table to Jupyter Notebook\n' +
                            '# \n' +
                            '# This snippet is configured to load <' + rowsText +'> rows of Xcalar table <' + tableName + '> into a pandas dataframe named\n' +
                            '# <' + tableName + '_pd>' + '.\n' +
                            '#\n' +
                            '# To instantiate or refresh your pandas dataframe, run the Connect snippet, \n' +
                            '# and then run this snippet. \n' +
                            '#\n' +
                            '# Best Practice is not to edit this code. \n' +
                            '#\n' +
                            '# To use different data with this Jupyter Notebook:\n' +
                            '# 1) Go to the table in your Xcalar Workbook.\n' +
                            '# 2) From the table menu, click Publish to Jupyter.\n' +
                            '# 3) Click full table or enter a number of rows and click submit.\n' +
                            '\n' +
                            '# Imports data into a pandas dataframe.\n' +
                            'from collections import OrderedDict\n';
                var rowLimit = "";
                if (numRows && numRows > 0) {
                    rowLimit = ", maxRecords=" + numRows;
                }
                var resultSetPtrName = 'resultSetPtr_' + tableName.split("#")[1];
                var filterDict = 'col_list = [';
                for (var i = 0; i<colNames.length;i++) {
                    filterDict += '"' + colNames[i] + '",';
                }
                filterDict += ']\n    kv_list = []\n';
                filterDict += '    for k in col_list:\n' +
                              '        if k not in row:\n' +
                              '            kv_list.append((k, None))\n' +
                              '        else:\n' +
                              '            kv_list.append((k, row[k]))\n' +
                              '            if type(row[k]) is list:\n' +
                              '                for i in range(len(row[k])):\n' +
                              '                    subKey = k + "[" + str(i) + "]"\n' +
                              '                    if subKey in col_list:\n' +
                              '                        row[subKey] = row[k][i]\n' +
                              '    filtered_row = OrderedDict(kv_list)\n';
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
                $("#open_notebook").find("a").attr("href", Jupyter.menubar.base_url + "tree");

                // rework "new notebook" - prevent menu item from
                // opening in a new window
                $("#new-notebook-submenu-python3").find("a").off("click");
                $("#new-notebook-submenu-python3").find("a").click(function() {
                    Jupyter.notebook.contents.new_untitled("", {type: "notebook"})
                    .then(function(data) {
                        var url = Jupyter.menubar.base_url + "notebooks/" + data.path + "?kernel_name=python3&needsTemplate=true";
                        window.location.href = url;
                    });
                });

                // rework "kill and exit" - direct to tree after shutting down
                // notebook
                $("#kill_and_exit").click(function() {
                    window.location.href = Jupyter.menubar.base_url + "tree";
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

// this file maps to xcalar/.ipython/nbextensions/xcalar.js
define(['base/js/utils'], function(utils) {
    return {
        load_ipython_extension: function() {
            var username;
            var userid;
            var sessionName;
            var sessionId;
            var wkbkFolderName = "";

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
            overwriteElementsAndListeners();
            addXDButtonListeners();
            setupJupyterEventListeners();
            window.addEventListener("message", receiveMessage, false);

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

                if (params.autofillImportUdf) {
                    request.noRename = true;
                }

                console.log("Telling parent new untitled notebook created");
                parent.postMessage(JSON.stringify(request), "*");

                // send an aditional message if we need the udf import modal
                // to pop up
                if (params.autofillImportUdf) {
                    request = {
                        action: "autofillImportUdf",
                        target: decodeURIComponent(params.target),
                        filePath: decodeURIComponent(params.filePath),
                        includeStub: decodeURIComponent(params.includeStub),
                        moduleName: decodeURIComponent(params.moduleName),
                        fnName: decodeURIComponent(params.fnName)
                    };
                    parent.postMessage(JSON.stringify(request), "*");
                }
            } else {
                // accessing an existing notebook, let XD know so it can send
                // back session information
                var request = {action: "enterExistingNotebook"};
                parent.postMessage(JSON.stringify(request), "*");
            }

            function receiveMessage(event) {
                window.alert = function() {};
                alert = function() {};
                if (!event.data) {
                    return;
                }
                var struct;
                try {
                    struct = JSON.parse(event.data);
                    if (!struct.fromXcalar) {
                        return;
                    }
                } catch (error) {
                    console.log(error);
                    return;
                }

                switch (struct.action) {
                    case ("init"):
                        username = struct.username;
                        userid = struct.userid;
                        sessionName = struct.sessionname;
                        sessionId = struct.sessionid;
                        wkbkFolderName = struct.folderName || "";
                        if (struct.newUntitled) {
                            prependSessionStub(username, userid, sessionName);
                            if (struct.publishTable) {
                                appendPublishTableStub(struct.tableName, struct.colNames, struct.numRows);
                            }
                            if (!struct.noRenamePrompt) {
                                Jupyter.save_widget.rename_notebook({notebook: Jupyter.notebook});
                            }
                        } else {
                            validateNotebookInUserFolder();
                        }
                        updateLinks();
                        break;
                    case ("publishTable"):
                        appendPublishTableStub(struct.tableName, struct.colNames, struct.numRows);
                        break;
                    case ("stub"):
                        var stubName = struct.stubName;
                        appendStub(stubName, struct.args);
                        break;
                    case ("newWorkbook"):
                        createNewFolder(struct);
                        break;
                    case ("renameWorkbook"):
                        renameFolder(struct, struct.newFolderName, struct.oldFolderName);
                        break;
                    case ("copyWorkbook"):
                        copyFolder(struct.oldFolder, struct.newFolder);
                        break;
                    case ("deleteWorkbook"):
                        deleteFolder(struct);
                        break;
                    case ("updateFolderName"):
                        updateFolderName(struct);
                        break;
                    default:
                        break;
                }
            }
            function insertCellToSelected(texts, stubName, args) {
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

                        if ((stubName == "basicUDF")) {
                            var $button = $('<input class="udfToMapForm" type="button" ' +
                                            'style="width:calc(100% - 13.2ex);margin-left:13.3ex;" ' +
                                            'value="Use UDF on Table ' +
                                            args.tableName + '"/>');
                                $button.data("tablename", args.tableName)
                                       .data("columns", args.columns);
                            $(".cell").eq(index + 1).append($button);
                        } else if (stubName === "importUDF" && args.includeStub) {
                            var $button = $('<input class="udfToDSPreview" type="button" ' +
                                            'style="width:calc(100% - 13.2ex);margin-left:13.3ex;" ' +
                                            'value="Apply UDF"/>');
                            $(".cell").eq(index + 1).append($button);
                        }
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
                        text += '\n%matplotlib inline\n\n' +
                                '# Importing third-party modules to faciliate data work. \n' +
                                'import pandas as pd\n' +
                                'import matplotlib.pyplot as plt\n\n' +
                                '# Importing Xcalar packages and modules. \n' +
                                '# For more information, search and post questions on discourse.xcalar.com\n' +
                                'from xcalar.external.LegacyApi.XcalarApi import XcalarApi\n' +
                                'from xcalar.external.LegacyApi.Session import Session\n' +
                                'from xcalar.external.LegacyApi.WorkItem import WorkItem\n' +
                                'from xcalar.external.LegacyApi.ResultSet import ResultSet\n\n' +
                                '# Create a XcalarApi object\nxcalarApi = XcalarApi()\n';
                        text += '# Connect to current workbook that you are in\n' +
                                'workbook = Session(xcalarApi, "' + username + '", "' + username + '", ' + userid + ', True, "' + sessionName + '")\n' +
                                'xcalarApi.setSession(workbook)';
                        texts.push(text);
                        break;
                    case ("basicUDF"):
                        var text = "";
                        var colsArg = "";
                        var retStr = "";
                        var assertStr = "";
                        var moduleName;
                        var fnName;
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
                            fnName = args.fnName;
                            moduleName = args.moduleName;

                            dfName = args.tableName.replace(/[#-]/g, "_") + '_pd';
                            tableStub = getPublishTableStub(args.tableName, args.allCols, 100);
                        } else {
                            colsArg = "col1, col2, col3";
                            retStr = "str(col1) + str(col2) + str(col3)";
                            assertStr += 'row[colName1], row[colName2], row[colName3]';
                            fnName = "yourUDF";
                            moduleName = "yourUDF";
                            dfName = "dataframeName";
                        }
                        text += '# Xcalar Map UDF Template\n' +
                                '#\n' +
                                '# This is a function definition for a Python Map UDF written to apply to \n' +
                                '# table: <' + args.tableName + '> columns: <' + colsArg + '>.\n' +
                                '#\n' +
                                '# Module name: <' + moduleName + '>\n' +
                                '# Function name: <' + fnName + '>\n' +
                                '#\n' +
                                '# REQUIREMENTS: Map UDF functions take one or more columns as arguments, and\n' +
                                '# return a string. \n' +
                                '#\n' +
                                '# To create a map UDF, edit the function definition below, named <' + fnName + '>. \n' +
                                '#\n' +
                                '# To test your map UDF, run this cell. (Hit <control> + <enter>.) \n' +
                                '#\n' +
                                '# To apply the <' + moduleName + '> module to your table <' + args.tableName + '> \n' +
                                '# click the "Use UDF on Table ' + args.tableName + '" button. \n' +
                                '#\n' +
                                '# NOTE: Use discipline before replacing this module. Consider whether previous \n' +
                                '# uses of this map UDF could be broken by new changes. If so, versioning this \n' +
                                '# module may be appropriate. \n' +
                                '#\n' +
                                '# Best practice is to name helper functions by starting with __. Such \n' +
                                '# functions will be considered private functions and will not be directly \n' +
                                '# invokable from Xcalar tools.\n' +
                                '#' +
                                '# Map UDF function definition.\n' +
                                'def ' + fnName + '(' + colsArg + '):\n' +
                                '    # You can modify the function name.\n' +
                                '    # Your code starts from here. This is an example code.\n' +
                                '    return ' + retStr + '\n\n' +
                                '### WARNING DO NOT EDIT CODE BELOW THIS LINE ###\n' +
                                'from xcalar.external.LegacyApi.Dataset import *\n' +
                                'from xcalar.compute.coretypes.DataFormatEnums.ttypes import DfFormatTypeT\n' +
                                'from xcalar.external.LegacyApi.Udf import Udf\n' +
                                'from xcalar.compute.coretypes.LibApisCommon.ttypes import XcalarApiException\n' +
                                'import random\n' +
                                '\n' +
                                (args.includeStub ?
                                'def uploadUDF():\n' +
                                '    import inspect\n' +
                                '    sourceCode = "".join(inspect.getsourcelines(' + fnName + ')[0])\n' +
                                '    try:\n' +
                                '        Udf(xcalarApi).add("'+ moduleName + '", sourceCode)\n' +
                                '    except XcalarApiException as e:\n' +
                                '        if e.status == StatusT.StatusUdfModuleAlreadyExists:\n' +
                                '            Udf(xcalarApi).update("'+ moduleName + '", sourceCode)\n' +
                                '\n' : '') +
                                '\n' +
                               tableStub +
                               'for index, row in ' + dfName + '.iterrows():\n' +
                               '    assert(type(' + fnName + '(' + assertStr + ')).__name__ == \'str\')\n' +
                               '    print(' + fnName + '(' + assertStr + '))\n\n' +
                                (args.includeStub ? 'uploadUDF()' : '');
                        texts.push(text);
                        break;
                    case ("importUDF"):
                        text =  (args.includeStub ?
                                '# Xcalar Import UDF Template\n' +
                                '#\n' +
                                '# This is a function definition for a Python UDF to import external data source\n' +
                                '# file <' + args.target + ":" + args.url + '>\n' +
                                '#\n' +
                                '# Module name: <' + args.moduleName + '>\n' +
                                '# Function name: <' + args.fnName + '>\n' +
                                '#\n' +
                                '# REQUIREMENTS: Import UDF functions take two arguments...\n' +
                                '#   fullPath: The file path to the data source file being imported.\n' +
                                '#   inStream: A binary stream of the data source file.\n' +
                                '#\n' +
                                '#   Your Import UDF function must be a generator, a Python function which\n' +
                                '#   processes and returns a stream of data.\n' +
                                '#\n' +
                                '# To create an import UDF, modify the function definition immediately below this\n' +
                                '# comment, as necessary.\n' +
                                '#\n' +
                                '# To test your UDF, run this cell. (Hit <control> + <enter>.)\n' +
                                '#\n' +
                                '# To apply it to your dataset, click the "Apply UDF on Dataset Panel" button.\n' +
                                '#\n#\n' :
                                '# Xcalar Debug Import UDF\n' +
                                '#\n' +
                                '# This snippet is used to debug the following Python UDF function from a module in the\n' +
                                '# User Defined Function editor.\n' +
                                '#\n' +
                                '# Module name: <' + args.moduleName + '>\n' +
                                '# Function name: <' + args.fnName + '>\n' +
                                '#\n' +
                                '# REQUIREMENTS: Import UDF functions take two arguments...\n' +
                                '#   fullPath: The file path to the data source file being imported.\n' +
                                '#   inStream: A binary stream of the data source file.\n' +
                                '#\n' +
                                '#   Your Import UDF function must be a generator, a Python function which\n' +
                                '#   processes and returns a stream of data.\n' +
                                '#\n' +
                                '# To debug your import UDF, modify the function definition in the User Defined Function\n' +
                                '# editor panel.\n' +
                                '#\n' +
                                '# To test your UDF, click ADD UDF in the editor and then run this cell. (Hit <control> +\n' +
                                '# <enter>.)\n' +
                                '#\n\n'
                            ) +
                                '# NOTE: Use discipline before replacing this module. Consider whether the import of older\n' +
                                '# data source files using this UDF will be affected by this change. If so, versioning this\n' +
                                '# module may be appropriate.\n' +
                                '#\n' +
                                '# Best practice is to name helper functions by starting with __. Such\n' +
                                '# functions will be considered private functions and will not be directly\n' +
                                '# invokable from Xcalar tools.\n' +
                                '\n' +
                                (args.includeStub ?
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
                                '\n' : '') +
                                '### WARNING DO NOT EDIT CODE BELOW THIS LINE ###\n' +
                                'from xcalar.external.LegacyApi.Dataset import *\n' +
                                'from xcalar.compute.coretypes.DataFormatEnums.ttypes import DfFormatTypeT\n' +
                                'from xcalar.external.LegacyApi.Udf import Udf\n' +
                                'from xcalar.compute.coretypes.LibApisCommon.ttypes import XcalarApiException\n' +
                                'import random\n' +
                                '\n' +
                                (args.includeStub ?
                                'def uploadUDF():\n' +
                                '    import inspect\n' +
                                '    sourceCode = "".join(inspect.getsourcelines(' + args.fnName + ')[0])\n' +
                                '    try:\n' +
                                '        Udf(xcalarApi).add("'+ args.moduleName + '", sourceCode)\n' +
                                '    except XcalarApiException as e:\n' +
                                '        if e.status == StatusT.StatusUdfModuleAlreadyExists:\n' +
                                '            Udf(xcalarApi).update("'+ args.moduleName + '", sourceCode)\n' +
                                '\n' : '') +
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
                                (args.includeStub ? 'uploadUDF()\n' : '') +
                                'testImportUDF()';
                        texts.push(text);
                        break;
                    default:
                        return;
                }
                insertCellToSelected(texts, stubName, args);
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
                text += '\n%matplotlib inline\n\n' +
                        '# Importing third-party modules to faciliate data work. \n' +
                        'import pandas as pd\n' +
                        'import matplotlib.pyplot as plt\n\n' +
                        '# Importing Xcalar packages and modules. \n' +
                        '# For more information, search and post questions on discourse.xcalar.com\n' +
                        'from xcalar.external.LegacyApi.XcalarApi import XcalarApi\n' +
                        'from xcalar.external.LegacyApi.Session import Session\n' +
                        'from xcalar.external.LegacyApi.WorkItem import WorkItem\n' +
                        'from xcalar.external.LegacyApi.ResultSet import ResultSet\n\n' +
                        '# Create a XcalarApi object\nxcalarApi = XcalarApi()\n';
                text += '# Connect to current workbook that you are in\n' +
                        'workbook = Session(xcalarApi, "' + username + '", "' + username + '", ' + userid + ', True, "' + sessionName + '")\n' +
                        'xcalarApi.setSession(workbook)';
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
                            'def getDataFrameFromDict():\n' +
                            '    from collections import OrderedDict\n';
                var rowLimit = "";
                if (numRows && numRows > 0) {
                    rowLimit = ", maxRecords=" + numRows;
                }
                var resultSetPtrName = 'resultSetPtr_' + tableName.split("#")[1];
                var filterDict = '    col_list = [';
                for (var i = 0; i<colNames.length;i++) {
                    filterDict += '"' + colNames[i] + '",';
                }
                filterDict += ']\n        kv_list = []\n';
                filterDict += '        for k in col_list:\n' +
                              '            if k not in row:\n' +
                              '                kv_list.append((k, None))\n' +
                              '            else:\n' +
                              '                kv_list.append((k, row[k]))\n' +
                              '                if type(row[k]) is list:\n' +
                              '                    for i in range(len(row[k])):\n' +
                              '                        subKey = k + "[" + str(i) + "]"\n' +
                              '                        if subKey in col_list:\n' +
                              '                            row[subKey] = row[k][i]\n' +
                              '        filtered_row = OrderedDict(kv_list)\n';
                text += '    ' + resultSetPtrName + ' = ResultSet(xcalarApi, tableName="' + tableName + '"' + rowLimit + ')\n';
                tableName = tableName.replace(/[#-]/g, "_");
                var dfName = tableName + '_pd';
                text += '    ' + tableName + ' = []\n    for row in ' + resultSetPtrName + ':\n';
                text += '    ' + filterDict + '\n        ' + tableName + '.append(filtered_row)\n';
                text += '    return pd.DataFrame.from_dict(' + tableName + ')\n';
                text += dfName + ' = getDataFrameFromDict()\n';
                return text;
            }

            // create folder, rename it,  send new name to XD
            function createNewFolder(struct) {
                Jupyter.contents.new_untitled("", {type: 'directory'})
                .then(function(data) {
                    renameFolderHelper(struct, struct.folderName, data.path)
                    .then(function(result) {
                        resolveRequest(result, struct.msgId);
                    })
                    .fail(function(result) {
                        rejectRequest(result, struct.msgId);
                    });
                })// jupyter doesn't have fail property
                .catch(function(e) {
                    rejectRequest(e, struct.msgId);
                });
            }

            function renameFolder(struct, newFolderName, oldFolderName) {
                struct.folderName = newFolderName;
                renameFolderHelper(struct, newFolderName, oldFolderName)
                .then(function(result) {
                    if (wkbkFolderName === oldFolderName) {
                        wkbkFolderName = result.newName;
                        sessionName = struct.sessionname;
                        sessionId = struct.sessionid;
                        updateLinks();
                        if (Jupyter.notebook.notebook_path.indexOf(oldFolderName + "/") === 0) {
                            validateSessionCells();
                        }
                    }
                    resolveRequest(result, struct.msgId);
                })
                .fail(function(result) {
                    rejectRequest(result, struct.msgId);
                });
            }

            function updateFolderName(struct) {
                if (wkbkFolderName === struct.oldFolderName) {
                    wkbkFolderName = struct.nwFolderName;
                    sessionName = struct.sessionname;
                    sessionId = struct.sessionid;
                    updateLinks();
                    if (Jupyter.notebook.notebook_path.indexOf(struct.oldFolderName + "/") === 0) {
                        validateSessionCells();
                    }
                }
            }

            // XXX need to recursively call folders
            function copyFolder(oldFolder, newFolder) {
                Jupyter.contents.list_contents(oldFolder)
                .then(function(contents) {
                    contents.content.forEach(function(item) {
                        if (item.type === "notebook") {
                            Jupyter.contents.copy(item.path, newFolder);
                        } else if (item.type === "directory") {
                            Jupyter.contents.new_untitled(newFolder, {type: 'directory'})
                            .then(function(data) {
                                var split = data.path.split("/");
                                split.pop();
                                split.push(item.name);
                                var desiredPath = split.join("/");
                                renameFolderHelper({folderName: desiredPath}, desiredPath, data.path)
                                .then(function(result) {
                                    copyFolder(item.path, desiredPath);
                                });
                            });
                        }
                    });

                });
            }

            function renameFolderHelper(struct, folderName, prevName, attemptNumber, prevDeferred) {
                var deferred = prevDeferred || jQuery.Deferred();

                attemptNumber = attemptNumber || 0;
                attemptNumber++;
                Jupyter.contents.rename(prevName, folderName)
                .then(function(data) {
                    deferred.resolve({newName: data.name});
                })
                .catch(function(e) {
                    if (e && typeof e.message === "string") {
                        if (attemptNumber > 10) {
                            deferred.reject({error: "failed to create folder"});
                        } else if (e.message.indexOf("No such file") > -1) {
                            deferred.reject({error: "folder not found"});
                        } if (e.message.indexOf("File already exists") === 0 &&
                            attemptNumber < 10) {
                            renameFolderHelper(struct, struct.folderName + "_" + attemptNumber, prevName, attemptNumber, deferred);
                        } else { // last try
                            renameFolderHelper(struct, struct.folderName + "_" + Math.ceil(Math.random() * 10000), prevName, attemptNumber, deferred);
                        }
                    } else {
                        deferred.reject({error: "failed to create folder"});
                    }
                });

                return deferred.promise();
            }

            function deleteFolder(struct) {
                var folderName = struct.folderName;

                Jupyter.contents.delete(folderName)
                .then(function() {
                    // deleted
                });
            }

            // hijack the navigation so that the user goes to their folder
            // when they leave the notebook
            function updateLinks() {
                var folderUrl = Jupyter.menubar.base_url + "tree/" + wkbkFolderName;
                // the jupyter icon on the top left
                $("#ipython_notebook").find("a").attr("href", folderUrl);
                // the "open" list item on the file menu
                $("#open_notebook").find("a").attr("href", folderUrl);
                // the "New Notebook" list item on the file menu
                $("#new-notebook-submenu-python3").find("a").off("click");
                $("#new-notebook-submenu-python3").find("a").click(function() {
                    Jupyter.notebook.contents.new_untitled(wkbkFolderName, {type: "notebook"})
                    .then(function(data) {
                        var url = Jupyter.menubar.base_url + "notebooks/" + data.path + "?kernel_name=python3&needsTemplate=true";
                        window.location.href = url;
                    });
                });
                $("#kill_and_exit").off("click");
                $("#kill_and_exit").click(function() {
                    window.location.href = folderUrl;
                });
            }

            // listeners are found by $._data(element, "events" ); we turn off
            // listeners that cause navigation away from current window
            function overwriteElementsAndListeners() {
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

                window.onbeforeunload = function() {
                    return; // removes "do you want to leave" warning
                };
            }

            // checks for cells that have session info not related to current
            // session
            function validateSessionCells() {
                var cells = Jupyter.notebook.get_cells();
                var errors = [];
                for (var i = cells.length - 1; i >= 0; i--) {
                    var text = cells[i].get_text();
                    var lines = text.split("\n");
                    var cellNeedsReplace = false;
                    for (var j = 0; j < lines.length; j++) {
                        if (lines[j].indexOf("workbook = Session(xcalarApi") === 0) {
                            var cellWBInfo = parseSessInfoFromLine(lines[j]);
                            if (cellWBInfo.username !== '"' + username + '"' ||
                                cellWBInfo.userid !== "" + userid ||
                                cellWBInfo.sessionName !== '"' + sessionName + '"') {
                                lines[j] = 'workbook = Session(xcalarApi, "' + username + '", "' + username + '", ' + userid + ', True, "' + sessionName + '")';
                                cellNeedsReplace = true;
                                errors.push(
                                    {line: lines[j],
                                    lineIndex: j + 1,
                                    cellIndex: i + 1,
                                    cell: cells[i]}
                                );
                            }
                        }
                    }
                    if (cellNeedsReplace) {
                        cells[i].set_text(lines.join("\n"));
                    }
                }
                if (errors.length) {
                    return;
                    // XXX disabling
                    showSessionWarning(errors);
                }
            }

            function validateNotebookInUserFolder() {
                if (Jupyter.notebook.notebook_path.indexOf(wkbkFolderName + "/") === 0) {
                    // user is in his proper folder, check that the session stubs in this
                    // notebook matches the current session
                    validateSessionCells();
                } else if (Jupyter.notebook.notebook_path !== Jupyter.notebook.notebook_name &&
                    Jupyter.notebook.notebook_path.indexOf(wkbkFolderName + "/") !== 0) {
                    Jupyter.notebook.writable = false;
                    Jupyter.save_widget.set_save_status("(read only)");
                    Jupyter.save_widget.set_save_status = function () {}; // disable
                    $('#readonly-indicator').show(); // NotebookNoteificationArea
                    Jupyter.notification_area.widget_dict.notebook.warning("Notebook is read-only");
                    parent.postMessage(JSON.stringify({action: "toggleMenu", allow: false}), "*");
                } else {
                    // in root directory, users can modify any root files
                    Jupyter.notebook.notebook_path === Jupyter.notebook.notebook_name;
                    parent.postMessage(JSON.stringify({action: "toggleMenu", allow: true}), "*");
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

            // for new elements set up by XD
            function addXDButtonListeners() {
                $(document).on("click", ".udfToMapForm", function () {
                    var $btn = $(this);
                    if ($btn.hasClass("needsUpload")) {
                        return; // cell is executing
                    }
                    $btn.addClass("needsUpload");

                    var cell = Jupyter.notebook.get_selected_cell();
                    var originalText = cell.get_text();
                    var lines = originalText.split("\n");
                    lines.splice(-6, 6);
                    var modifiedText = lines.join("\n");
                    modifiedText += "\n" + "uploadUDF()";
                    cell.set_text(modifiedText);
                    cell.execute();
                    cell.set_text(originalText);
                });

                $(document).on("click", ".udfToDSPreview", function () {
                    var $btn = $(this);
                    if ($btn.hasClass("needsUpload")) {
                        return; // cell is executing
                    }
                    $btn.addClass("needsUpload");

                    // remove call to testImportUDF, execute, and restore
                    var cell = Jupyter.notebook.get_selected_cell();
                    var originalText = cell.get_text();
                    var lines = originalText.split("\n");
                    lines.splice(-1, 1);
                    var modifiedText = lines.join("\n");
                    cell.set_text(modifiedText);
                    cell.execute();
                    cell.set_text(originalText);
               });
            }

            // bind functions to jupyter events so that they get executed
            // whenever Jupyter calls "events.trigger('action')"
            function setupJupyterEventListeners() {
                // when a cell finishes execution
                Jupyter.notebook.events.on("finished_execute.CodeCell", function(evt, data){
                    var cell = data.cell;
                    var text = cell.get_text();
                    var lines = text.split("\n");
                    if (hasUploadUdf(lines)) {
                        refreshUploadedUdf(lines, cell);
                    }
                });

                Jupyter.notebook.events.on("notebook_renamed.Notebook", function(evt, data) {
                    var request = {
                        action: "updateLocation",
                        location: "notebook",
                        lastNotebook: Jupyter.notebook.get_notebook_name()
                    };
                    parent.postMessage(JSON.stringify(request), "*");
                });

                function hasUploadUdf(lines) {
                    for (var i = lines.length - 1; i >= 0; i--) {
                        if (lines[i].indexOf("uploadUDF()") === 0) {
                            return true;
                        }
                    }
                    return false;
                }

                // find the name of the udf in the lines of cell code
                // and send XD to refresh udf list and
                function refreshUploadedUdf(lines, cell) {
                    var modNameSearchKey = '        Udf(xcalarApi).add("';
                    var fnNameSearchKey = '    sourceCode = "".join(inspect.getsourcelines(';
                    var moduleName;
                    var fnName;
                    for (var i = 0; i < lines.length; i++) {
                        if (lines[i].indexOf(modNameSearchKey) === 0) {
                            moduleName = lines[i].slice(modNameSearchKey.length);
                            moduleName = moduleName.slice(0, moduleName.indexOf("\""));
                        }
                        if (lines[i].indexOf(fnNameSearchKey) === 0) {
                            fnName = lines[i].slice(fnNameSearchKey.length);
                            fnName = fnName.slice(0, fnName.indexOf(")"));
                        }

                        if (moduleName && fnName) {
                            break;
                        }
                    }

                    if (fnName && moduleName) {
                        var $dsFormBtn = $(cell.element).find(".udfToDSPreview");
                        if ($dsFormBtn.length) {
                            $dsFormBtn.data("modulename", moduleName);
                            $dsFormBtn.data("fnname", fnName);
                            if ($dsFormBtn.hasClass("needsUpload")) {
                                $dsFormBtn.removeClass("needsUpload");
                                var request = {action: "udfToDSPreview",
                                    moduleName: moduleName,
                                    fnName: fnName
                                };
                                parent.postMessage(JSON.stringify(request), "*");
                            }
                        }
                        var $mapBtn = $(cell.element).find(".udfToMapForm");
                        if ($mapBtn.length) {
                            $mapBtn.data("modulename", moduleName);
                            $mapBtn.data("fnname", fnName);
                            if ($mapBtn.hasClass("needsUpload")) {
                                $mapBtn.removeClass("needsUpload");
                                var request = {action: "udfToMapForm",
                                    tableName: $mapBtn.data("tablename"),
                                    columns: $mapBtn.data("columns"),
                                    moduleName: moduleName,
                                    fnName: fnName
                                };
                                parent.postMessage(JSON.stringify(request), "*");
                            }
                        }
                    }
                }
            }

            function resolveRequest(result, msgId) {
                var request = {
                    action: "resolve",
                    msgId: msgId
                };
                request = $.extend(request, result);
                parent.postMessage(JSON.stringify(request), "*");
            }

            function rejectRequest(result, msgId) {
                 var request = {
                    action: "reject",
                    msgId: msgId
                };
                request = $.extend(request, result);
                parent.postMessage(JSON.stringify(request), "*");
            }

            window.alert = function() {};
        }
    };
});

StatusMessageTStr = {
'Success' : 'Success!',
'Completed' : 'Completed',
'Viewing' : 'Viewing',
'Error' : 'Error encountered',
'Loading' : 'Loading',
'LoadingDataset' : 'Loading Dataset',
'LoadingTables': 'Loading Tables',
'LoadFailed' : 'Load dataset failed',
'CreatingTable' : 'Creating table',
'TableCreationFailed' : 'Table creation failed',
'Join' : 'Joining tables',
'JoinFailed' : 'Join failed',
'DeleteTable' : 'Deleting table',
'CouldNotDelete' : 'could not be deleted',
'ExportTable' : 'Exporting table',
'ExportFailed' : 'Export failed',
'Aggregate' : 'Performing Aggregate',
'AggregateFailed' : 'Aggregate failed',
'SplitColumn': 'Split column',
'SplitColumnFailed': 'Split column failed',
'ChangeType': 'Change data type',
"ChangeTypeFailed": 'Change data type failed',
'OnColumn' : 'on column',
'Sort' : 'Sorting column',
'SortFailed' : 'Sort failed',
'Map' : 'Mapping column',
'MapFailed' : 'Mapping failed',
'GroupBy' : 'Performing Group By',
'GroupByFailed' : 'Group By failed',
'Filter' : 'Filtering column',
'FilterFailed' : 'Filter failed',
'Statistics' : 'Generating statistical analysis',
'StatisticsFailed' : 'Statistical analysis failed',
"Window": "Performing Window",
"WindowFailed": "Window Failed",
"HorizontalPartition": "Performing Horizontal Partition",
"HPartitionFailed": "Horizontal Partition Failed"
};

TooltipTStr = {
    'ComingSoon': 'Coming Soon',
    'FocusColumn': 'Focused Column',
    'ChooseUdfModule': 'Please choose a module first',
    'ChooeseColToExport': 'Please Selected Columns you want to export',
    'NoJoin': 'Cannot join <type>',
    'SuggKey': 'Suggested Key'
};

CommonTxtTstr = {
    'Create': 'Create',
    'Continue': 'Continue',
    'Copy': 'Copy',
    'DefaultVal': 'Default Value',
    'HoldToDrag': 'click and hold to drag',
    'IntFloatOnly': 'Integer/Float Only',
    'NumCol': 'number of column'
};

ErrorTextTStr = {
    'NoEmpty': 'Please fill out this field.',

    'InvalidField': "Invalid Field.",

    'InvalidFilePath': 'Invalid file path',

    'InvalidFileName': 'Invalid file name, ' +
                       'cannot find the file in current directory.',
                        
    'NoHashTag': "Please input a valid name with no # symbols.",

    'NoSpecialChar': "Please input a valid name with no special characters.",

    'NoSpecialCharOrSpace': "Please input a valid name with no special" +
                            " characters or spaces.",
                            
    'NoSpecialCharInParam': "No special characters or spaces allowed within" +
                            " parameter braces.",

    'UnclosedParamBracket': "Unclosed parameter bracket detected.",

    'NoEmptyList': 'Please choose an option on the dropdown list.',

    'NoEmptyFn': 'Function field is empty, please input functions.',

    'NoEmptyOrCheck': 'Please fill out this field ' +
                        'or keep it empty by checking the checkbox.',

    'NameInUse': 'Name is in use, please another name.',

    'DSNameConfilct': 'Dataset with the same name already exits. ' +
                        'please choose another name.',

    'TableConflict': 'Table with the same name already exists, ' +
                        'please choose another name.',

    'ExportConflict': 'This file name is taken, please choose another name.',

    'ColumnConfilct': 'Column with the same name already exists, ' +
                        'please choose another name.',

    'DFGConflict': 'Data flow group with the same name already exists, ' +
                            'please choose another name.',

    'ScheduleConflict': 'Schedule with the same name already exists, ' +
                            'please choose another name.',

    'InvalidWSInList': 'Invalid worksheet name, please choose a ' +
                        'worksheet in the pop up list.',

    'OnlyNumber': 'Please input a number.',

    'OnlyPositiveNumber': 'Please input a number bigger than 0.',

    'NoNegativeNumber': 'Please input a number bigger than or equal to 0',

    'NoAllZeros': "Values cannot all be zeros",

    'NoWKBKSelect': "No Workbook selected.",

    'NoGroupSelect': 'No group selected.',

    'InvalidColName': 'Invalid column name.',

    'NoBucketOnStr': 'Column type is string, cannot bucket into range.',

    'ParamInUse': 'Cannot delete, this parameter is in use.',

    'NoPreviewJSON': 'JSON files are not previewable, ' +
                     'please point to data directly without previewing.',

    'NoPreviewExcel': 'Excel files are not previewable, ' +
                      'please point to data directly without previewing.',

    'MVFolderConflict': 'Cannot move, name conflicts with files in target folder',

    'TimeExpire': 'Please choose a time that is in the future.',

    'LongFileName': 'File Name is too long, please use less than 255 chars.',

    'LargeFile': 'File is too large. Please break into smaller files(<10MB).',

    'NoSupportOp': 'This operation is not supported.',

    'InvalidColumn' : 'Invalid column name: <name>',

    'InvalidURLToBrowse': 'Please add protocol to file path. ' +
                          'For example: nfs:/// or hdfs:/// or ' +
                          'file:/// (for local filesystem)',

    'PreservedName': 'This name is preserved, please use another name.'
};

ErrorTextWReplaceTStr = {
    'FolderConflict': 'Folder "<name>" already exists, ' +
                        'please choose another name.',

    'WKBKConflict': 'Workbook "<name>" already exists, ' +
                    'please choose another name.',

    'ParamConflict': 'Parameter "<name>" already exists, ' +
                    'please choose another name.',

    'TableConflict': 'Table "<name>" already exists, ' +
                        'please choose another name.',

    'NoPath': '<path> was not found. Redirected to the root directory.',

    'InvalidOpsType': 'Invalid type for the field,' +
                      ' wanted: <type1>, but provided: <type2>.',
    'InvalidCol': 'Column "<name>" does not exist.',
    'InvalidRange': 'Please enter a value between <num1> and <num2>.'

};

TipsTStr = {
    "Scrollbar": "Scroll Table Here",
    "AddWorksheet": "Add Worksheet",
    "EditColumn": "Click here to edit column name",
    "LineMarker": "Click row number to add bookmark",
    "JSONEle": "Double-click to view, then click on key names to pull columns",
    "ToggleGridView": "Toggle between grid view and list view",
    "DragGrid": "You can drag datasets or folders around to reorder",
    "DataSampleTable": "Click table header to add/remove columns to/from " +
        "data cart. Click on column headings to further modify the column.",
    "Datacart": "Datacart area, you can add columns from datasets into your "+
                "cart. These columns will be used to create the table in your "+
                "active worksheet. You can add columns in the worksheet " +
                "screen too.",
    "PullRightsidebar": "Click to open and close side bar",
    "TablList": "Click to see details",
    "PullColumn": "Click key to add the column to your table"
};

ThriftTStr = {
    'CCNBE': 'Connection could not be established.',
    'Update': 'Update required.'
};

AlertTStr = {
    'Error': 'Error',
    'NoDel': 'Cannot Delete',
    'ContinueConfirm': 'Are you sure you want to continue?'
};

AggModalTStr = {
    'QuickAggTitle': 'Quick Aggregates',
    'QuickAggInstr': 'Viewing common aggregate functions on all of the columns in the active table.',
    'CorrTitle': 'Correlation Coefficients',
    'CorrInstr': 'Viewing correlation coefficient for every pair of numerical columns',
    'NoSupport': 'Not Supported',
    'DivByZeroExplain': 'Only one distinct value'
};

JoinModalTStr = {
    'NoJoin': 'Cannot Join',
    'NoJoinMsg': 'Select 2 columns to join by',
    'NoKeyLeft': 'Left table has no selected key',
    'NoKeyRight': 'Right table has no selected key',
    'NoMatchLeft': 'Sorry, cannot find a good key to match the left table',
    'NoMatchRight': 'Sorry, cannot find a good key to match the right table',
    'ToSingleJoin': 'switch to single join',
    'ToMultiJoin': 'switch to multi clause join'
};

MultiCastTStr = {
    'NoRec': 'No smart cast recommendation',
    'SelectCol': 'please select columns you want to cast.'
};

ProfileTStr = {
    'ProfileOf': 'Profile of',
    'Instr': 'Hover on the bar to see details. Use scroll bar and input box to view more data.',
    'LoadInstr': 'Please wait for the data preparation, you can close the modal and view it later.',
    'ProfileFail': 'Profile Failed'
};

WKBKTStr = {
    'Location': 'Workbook Browser',
    'NewWKBKInstr': 'Hello <b><user></b>, ' +
                    ' you have no workbook yet, you can create new workbook, ' +
                    'continue a workbook or copy a workbook',
    'CurWKBKInstr': 'Hello <b><user></b>, ' +
                    'current workbook is <b><workbook></b>'
};

SchedTStr = {
    'SelectSched': 'Select a schedule',
    'NoScheds': 'No available schedules',
    'AddSchedFail': 'Add schedule failed'
};

DFGTStr = {
    'DFExists': 'data flow already exists',
    'AddParamHint': 'Please create parameters in Data Flow Group Panel first.'
};

DSTStr = {
    'DS': 'DATASET',
    'Export': 'EXPORT FORM',
    'LoadingDS': 'Dataset is loading',
    'DelDS': 'Delete Dataset',
    'NewFolder': 'New Folder',
    'NoNewFolder': 'Cannot Create Folder',
    'NoNewFolderMsg': 'This folder is uneditable, cannot create new folder here',
    'DelFolder': 'Delete Folder',
    'DelFolderInstr': 'Please remove all the datasets in the folder first.',
    'DelFolderMsg': 'Unable to delete non-empty folders. Please ensure\r\n' +
                    ' that all datasets have been removed from folders prior' +
                    ' to deletion.',
    'NoParse': 'Cannot parse the dataset.',
    // with replace
    'DelDSConfirm': 'Are you sure you want to delete dataset <ds> ?',
    'DelUneditable': 'This <ds> is uneditable, cannot delete',
    'ToGridView': 'Switch to Grid View',
    'ToListView': 'Switch to List View'
};

DSFormTStr = {
    'LoadConfirm': 'Load Dataset Confirmation',
    'NoHeader': 'You have not checked header option to promote first row as header.'
};

DataCartStr = {
    'NoCartTitle': 'No Tables Selected',
    'HaveCartTitle': 'Selected Tables',
    'NoColumns': 'No Columns Selected',
    'HelpText': 'To add a column to the data cart, select a dataset on the left' +
                ' and click on the column names that you are interested' +
                ' in inside the center panel.'
};

DSPreviewTStr = {
    'Save': 'Save & Exit',
    'Promote': 'Promote first row as header',
    'UnPromote': 'Undo promote header',
    'ApplyHighlights': 'Apply hightlighted characters as delimiter',
    'RMHighlights': 'Remove highlights',
    'CommaAsDelim': 'Apply comma as delimiter',
    'TabAsDelim': 'Apply tab as delimiter',
    'PipeAsDelim': 'Apply pipe as delimiter',
    'RMDelim': 'Remove delimiter',
    'HighlightDelimHint': 'Highlight a character as delimiter',
    'Or': 'or',
    'HighlightAnyDelimHint': 'Highlight another character as delimiter',
    'LoadJSON': 'Load as JSON dataset',
    'LoadExcel': 'Load as EXCEL dataset',
    'LoadExcelWithHeader': 'Load as EXCEL dataset and promote header',
    'LoadUDF': 'Use UDF to parse the dataset',
    'NoDelim': 'You have not chosen a delimiter.',
    'NoHeader': 'You have not chosen a header row.',
    'NoDelimAndHeader': 'You have not chosen a delimiter and header row.'
};

DSExportTStr = {
    'ExportFail': 'Failed to add export target',
    'InvalidType': 'Invalid Target Type',
    'InvalidTypeMsg': 'Please select a valid target type'
};

WSTStr = {
    'SearchTableAndColumn': 'search for a table or column',
    'WSHidden': 'worksheet is hidden',
    'InvalidWSName': 'Invalid worksheet name',
    'InvalidWSNameErr': 'please input a valid name!'
};

SideBarTStr = {
    'SendToWS': 'Send To Worksheet',
    'WSTOSend': 'Worksheet to send',
    'NoSheet': 'No sheet',
    'NoSheetTableInstr': 'You have tables that are not in any worksheet, ' +
                         'please choose a worksheet for these tables!',
    'PopBack': 'pop back in',
    'PopOut': 'pop out',
    'WalkThroughUA': 'Walkthrough Unavailable',
    'DelTables': 'Delete <table> Tables',
    'DelTablesMsg': 'Are you sure you want to delete the selected tables?',
    'DelTablesFail': 'Delete Tables Failed',
    'SelectTable': 'select table',
    'DupUDF': 'Duplicate Module',
    'DupUDFMsg': 'Python module <module> already exists ' +
                 '(module name is case insensitive), ' +
                 'do you want to replace it with this module?',
    'UpoladUDF': 'Upload Success',
    'UploadUDFMsg': 'Your python script has been successfully uploaded!',
    'UploadError': 'Upload Error',
    'SyntaxError': 'Syntax Erro'
};

DaysTStr = {
    'Sunday': 'Sunday',
    'Monday': 'Monday',
    'Tuesday': 'Tuesday',
    'Wednesday': 'Wednesday',
    'Thursday': 'Thursday',
    'Friday': 'Friday',
    'Saturday': 'Saturday',
    'Today': 'Today',
    'Yesterday': 'Yesterday',
    'LastWeek': 'Last week',
    'Older': 'Older'
};

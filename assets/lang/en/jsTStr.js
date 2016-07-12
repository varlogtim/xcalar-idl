StatusMessageTStr = {
'Success' : 'Success!',
'Completed' : 'Completed',
'Viewing' : 'Viewing',
'Error' : 'Error encountered',
'Loading' : 'Loading',
'LoadingDataset' : 'Pointing to Dataset',
'LoadingTables': 'Loading Tables',
'LoadFailed' : 'Point to dataset failed',
'CreatingTable' : 'Creating table',
'TableCreationFailed' : 'Table creation failed',
'Join' : 'Joining tables',
'JoinFailed' : 'Join table failed',
'DeleteTable' : 'Deleting table',
'DeleteTableFailed': 'Delete table failed',
'PartialDeleteTableFail': 'Some tables could not be deleted',
'CouldNotDelete' : 'Could not be deleted',
'ExportTable' : 'Exporting table',
'ExportFailed' : 'Export failed',
'Aggregate' : 'Performing Aggregate',
'AggregateFailed' : 'Aggregate failed',
'SplitColumn': 'Split column',
'SplitColumnFailed': 'Split column failed',
'ChangeType': 'Change data type',
'ChangeTypeFailed': 'Change data type failed',
'OnColumn' : 'on column',
'Sort' : 'Sorting column',
'SortFailed' : 'Sort column failed',
'Map' : 'Mapping column',
'MapFailed' : 'Map failed',
'GroupBy' : 'Performing Group By',
'GroupByFailed' : 'Group By failed',
'Filter' : 'Filtering column',
'FilterFailed' : 'Filter column failed',
'Profile' : 'Profile of',
'ProfileFailed' : 'Profile failed',
'Project': 'Projecting Columns',
'ProjectFailed': 'Projection Failed',
'Ext': 'Performing Extension <extension>',
'ExtFailed': 'Performing Extension Failed'
};

TooltipTStr = {
    'ComingSoon': 'Coming Soon',
    'FocusColumn': 'Focused Column',
    'ChooseUdfModule': 'Please choose a module first',
    'ChooseColToExport': 'Please select the columns you want to export',
    'SuggKey': 'Suggested Key',
    'NoWSToMV': 'no worksheet to move to',
    'NoExport': 'Cannot export column of type <type>',
    'Undo': 'Undo: <op>',
    'NoUndo': 'Last operation is "<op>", cannot undo',
    'NoUndoNoOp': 'No operation to undo',
    'Redo': 'Redo: <op>',
    'NoRedo': 'No operation to redo',
    'LockedTableUndo': 'Cannot undo while table is locked',
    'LockedTableRedo': 'Cannot redo while table is locked',
    'CloseQG': 'click to hide query graph',
    'OpenQG': 'click to view query graph',
    'AddDataflow': 'Add Dataflow',
    'Bookmark': 'click to add bookmark',
    'Bookmarked': 'bookmarked',
    'CopyLog': 'Copy the SQL log onto your clipboard',
    'GenBundle': 'Generate Support Bundle',
    'ToGridView': 'Switch to Grid View',
    'ToListView': 'Switch to List View',
    'ClickCollapse': 'click to collapse',
    'CollapsedTable': '1 table is hidden',
    'SelectAllColumns': 'select all columns',
    'ViewColumnOptions': 'view column options',
    'ViewTableOptions': 'view table options',
     // with replace
    'CollapsedTables': '<number> tables are hidden'
};

CommonTxtTstr = {
    'XcWelcome': 'Have fun with Xcalar Insight!',
    'Create': 'Create',
    'Continue': 'Continue',
    'Copy': 'Copy',
    'DefaultVal': 'Default Value',
    'HoldToDrag': 'click and hold to drag',
    'NumCol': 'number of columns',
    'Exit': 'Exit',
    'ClickToOpts': 'click to see options',
    'BackToOrig': 'Back to original',
    'Optional': 'Optional',
    'LogoutWarn': 'You have unsaved changes, please save or you may lose your work.',
    'LeaveWarn': 'You are leaving Xcalar',
    'GenBundle': 'Generate Bundle',
    'GenBundleDone': 'Bundle Generated',
    'GenBundleFail': 'Bundle Generated Failed',
    'SupportBundle': 'Support Bundle Generated',
    'SupportBundleInstr': 'Please check your backend for a .tar.gz file',
    'SupportBundleMsg': 'Support upload bundle id <id> successfully generated! ' +
                        'It is located on your Xcalar Server at <path>',
    'OpFail': 'Operation Failed',
    'SAVE': 'SAVE',
    'NEXT': 'NEXT',
    'Preview': 'Preview',
    'StartTime': 'Start Time',
    'CopyLog': 'Copy log',
    'LogOut': 'Log Out',
    'Rename': 'Rename',
    'InP': 'In progress',
    'NA': 'N/A',
    'ArrayVal': 'Array Value'
};

ErrTStr = {
    'Unknown': 'Unknown Error',

    'NoEmpty': 'Please fill out this field.',

    'InvalidField': 'Invalid Field.',

    'InvalidFilePath': 'Invalid file path',

    'InvalidFileName': 'Invalid file name, ' +
                       'cannot find the file in current directory.',
    'InvalidTableName': 'Table name cannot contain any of the ' +
                        'following characters: *#\'\"',

    'InvalidAggName': 'Aggregate name must be prefixed with @',

    'InvalidAggLength': 'Aggregate name must be prefixed with @ and ' +
                        'followed by the name',

    'NoHashTag': 'Please input a valid name with no # symbols.',

    'NoSpecialChar': 'Please input a valid name with no special characters.',

    'NoSpecialCharOrSpace': 'Please input a valid name with no special' +
                            ' characters or spaces.',

    'NoSpecialCharInParam': 'No special characters or spaces allowed within' +
                            ' parameter braces.',

    'UnclosedParamBracket': 'Unclosed parameter bracket detected.',

    'NoEmptyList': 'Please choose an option on the dropdown list.',

    'NoEmptyFn': 'Function field is empty, please input functions.',

    'NoEmptyOrCheck': 'Please fill out this field ' +
                        'or keep it empty by checking the checkbox.',

    'NameInUse': 'Name is in use, please choose another name.',

    'DSNameConfilct': 'Dataset with the same name already exits. ' +
                        'please choose another name.',

    'TableConflict': 'Table with the same name already exists, ' +
                        'please choose another name.',

    'ExportConflict': 'This file name is taken, please choose another name.',

    'ColumnConfilct': 'Column with the same name already exists, ' +
                        'please choose another name.',

    'DFGConflict': 'Dataflow group with the same name already exists, ' +
                            'please choose another name.',

    'ScheduleConflict': 'Schedule with the same name already exists, ' +
                            'please choose another name.',

    'InvalidWSInList': 'Invalid worksheet name, please choose a ' +
                        'worksheet from the pop up list.',

    'OnlyNumber': 'Please input a number.',

    'OnlyInt': 'Please input an integer.',

    'OnlyPositiveNumber': 'Please input a number bigger than 0.',

    'NoNegativeNumber': 'Please input a number bigger than or equal to 0',

    'NoAllZeros': 'Values cannot all be zeros',

    'NoWKBKSelect': 'Please select a workbook',

    'NoGroupSelect': 'No group selected.',

    'InvalidColName': 'Invalid column name.',

    'ColInModal': 'Please input a column name that starts with $',

    'NoMultiCol': 'This field only accept one column.',

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

    'PreservedName': 'This name is preserved, please use another name.',

    'InvalidWin': 'Cannot window an unsorted table',

    'InvalidQuery': 'Query Failed',

    'BracketsMis': 'Your function string has mismatched brackets.',

    'TooLong': 'Please use fewer than 255 characters',

    'TablesNotDeleted': 'The following tables were not deleted:',

    'NoTablesDeleted': 'No tables were deleted.',

    'LargeImgSave': 'Unable To Save Image',

    'LargeImgTab': 'Unable To Open Image',

    'LargeImgText': 'Image exceeds your browser\'s maximum allowable size',

    'QGNoExpand': 'This query graph has reached your browser\'s maximum allowable size.',

    'InvalidExt': 'Invalid Extension',

    'InvalidExtParam': 'Invalid Extension Parameters',

    'InvalidOpNewColumn': 'Cannot perform this operation on a new column.',

    'SuggestProject': 'Please project to reduce the number of columns and retry.'

};

ErrWRepTStr = {
    'FolderConflict': 'Folder "<name>" already exists, ' +
                        'please choose another name.',

    'ParamConflict': 'Parameter "<name>" already exists, ' +
                    'please choose another name.',

    'TableConflict': 'Table "<name>" already exists, ' +
                        'please choose another name.',

    'NoPath': '<path> was not found. Redirected to the root directory.',

    'InvalidOpsType': 'Invalid type for the field,' +
                      ' wanted: <type1>, but provided: <type2>.',
    'InvalidCol': 'Column "<name>" does not exist.',

    'InvalidRange': 'Please enter a value between <num1> and <num2>.',

    'InvalidColType': 'Column "<name>" has an invalid type: <type>',

    'NoLessNum': 'Please enter a value bigger than or equal to <num>',

    'NoBiggerNum': 'Please enter a value less than or equal to <num>',

    'TableNotDeleted': 'Table <name> was not deleted.',

    'AggConflict': 'Aggregate "@<name>" already exists, ' +
                    'please choose another name.'
};

TipsTStr = {
    'Scrollbar': 'Scroll Table Here',
    'DataType': 'Data Type',
    'LineMarker': 'Click row number to add bookmark',
    'JSONEle': 'Double-click to view, then click on key names to pull columns',
    'DragGrid': 'You can drag datasets or folders around to reorder',
    'DataSampleTable': 'Click table header to add/remove columns to/from ' +
        'data cart. Click on column headings to further modify the column.',
    'Datacart': 'Datacart area, you can add columns from datasets into your ' +
                'cart. These columns will be used to create the table in your ' +
                'active worksheet. You can also add columns in the worksheet ' +
                'screen.',
    'PullRightsidebar': 'Click to open and close side bar',
    'TablList': 'Click to see details',
    'PullColumn': 'Click key to add the column to your table'
};

ThriftTStr = {
    'CCNBEErr': 'Connection error',
    'CCNBE': 'Connection could not be established.',
    'UpdateErr': 'Xcalar Version Mismatch',
    'Update': 'Update required.',
    'SetupErr': 'Setup Failed',
    'ListFileErr': 'List File Failed'
};

AlertTStr = {
    'Title': 'Warning',
    'Error': 'Error',
    'ErrorMsg': 'Error Occurred!',
    'NoDel': 'Cannot Delete',
    'ContinueConfirm': 'Are you sure you want to continue?',
    'BracketsMis': 'Mismatched Brackets',
    'NoExt': 'Unknown Extension',
    'CLOSE': 'CLOSE',
    'CANCEL': 'CANCEL'
};

FnBarTStr = {
    'NewCol': 'Please specify column name of the new column first',
    'InvalidOpParen': 'Operation must be preceeded by operator name and arguments in parenthesis',
    'ValidOps': 'Valid operators are: <b>pull, map, filter</b>.'
};

ScrollTStr = {
    'Title': 'scroll to a row',
    'BookMark': 'row <row>'
};

AggTStr = {
    'QuickAggTitle': 'Quick Aggregates',
    'QuickAggInstr': 'Viewing common aggregate functions on all of the columns in the active table.',
    'CorrTitle': 'Correlation Coefficients',
    'CorrInstr': 'Viewing correlation coefficient for every pair of numerical columns',
    'NoSupport': 'Not Supported',
    'DivByZeroExplain': 'Only one distinct value',
    'AggTitle': 'Aggregate: <op>',
    'AggInstr': 'This is the aggregate result for column "<col>". ' +
                '\r\n The aggregate operation is "<op>".',
    'AggMsg': '{"Value":<val>}'
};

IndexTStr = {
    'Sorted': 'Table already sorted',
    'SortedErr': 'Current table is already sorted on this column in <order> order',
    'SuggTitle': 'Sort Suggestion',
    'SuggInstr': 'Select "Numerically" to cast the column to <type> ' +
                 'before sorting in numerical order. Non-numeric rows are deleted during the sort.',
    'SuggMsg': 'This column can be sorted either numerically or alphabetically. ' +
               'How would you like to sort?',
    'CastToNum': 'Numerically',
    'NoCast': 'Alphabetically'
};

JoinTStr = {
    'NoJoin': 'Cannot join <type>',
    'NoKeyLeft': 'Left table has no selected key',
    'NoKeyRight': 'Right table has no selected key',
    'NoMatchLeft': 'Sorry, cannot find a good key to match the left table',
    'NoMatchRight': 'Sorry, cannot find a good key to match the right table',
    'ToSingleJoin': 'switch to single join',
    'ToMultiJoin': 'switch to multi clause join',
    'InvalidClause': 'Invalid Clause to join',
    'TypeMistch': 'Left selected column and right selected column has type mistch, cannot join'
};

ExportTStr = {
    'Success': 'Export Success',
    'SuccessMsg': 'File Name: <file>\n File Location: <location>',
    'SuccessInstr': 'Table \"<table>\" was succesfully exported to <location> ' +
                    'under the name: <file>',
    'ExportOfCol': 'Export columns of <table>',
    'InvalidType': 'Invalid type selected'
};

MultiCastTStr = {
    'NoRec': 'No smart cast recommendation',
    'SelectCol': 'please select columns you want to cast.',
    'SmartRes': 'Smart Cast Result',
    'CastRes': 'Cast Result',
    'NoCast': 'No column to cast.'
};

ProfileTStr = {
    'ProfileOf': 'Profile of',
    'Instr': 'Hover on the bar to see details. Use scroll bar and input box to view more data.',
    'LoadInstr': 'Please wait for the data preparation, you can close the modal and view it later.',
    'RowInfo': 'Showing <span><row></span> Results'
};

WKBKTStr = {
    'NoWkbk': 'No workbook for the user',
    'Location': 'Workbook Browser',
    'NewWKBK': 'New Workbook',
    'NewWKBKInstr': 'Hello <b><user></b>, ' +
                    ' you do not have a workbook yet. You can create new workbook, ' +
                    'continue a workbook or copy a workbook',
    'CurWKBKInstr': 'Hello <b><user></b>, ' +
                    'current workbook is <b><workbook></b>',
    'NoOldWKBK': 'Cannot Retrieve Old Workbook',
    'NoOldWKBKInstr': 'If you still see the error after re-login, ' +
                      'please copy your log and restart the server.',
    'NoOldWKBKMsg': 'Please Use new workbook or logout and try again!',
    'Expire': 'Please Log out',
    'ExpireMsg': 'You are logged in somewhere else!',
    'Hold': 'Login Warning',
    'HoldMsg': 'You are logged in somewhere else. Continuing to log in might cause you to lose unsaved work.',
    'Release': 'Continue login',
    'WKBKnotExists': 'No workbooks exist',
    'Conflict': 'Workbook "<name>" already exists, ' +
                    'please choose another name.',
};

SchedTStr = {
    'SelectSched': 'Select a schedule',
    'NoScheds': 'No available schedules',
    'AddSchedFail': 'Add schedule failed',
    'UpdateFail': 'Update Schedule Failed'
};

DFGTStr = {
    'DFExists': 'dataflow already exists',
    'AddParamHint': 'Please create parameters in Dataflow Group Panel first.',
    'DFCreateFail': 'Dataflow Creation Failed',
    'ParamModalFail': 'Parameter Modal Failed',
    'UpdateParamFail': 'Update Params Failed',
    'NoDFG1': 'No dataflow group added',
    'NoDFG2': 'Add a dataflow group in Query Graph.',
    'RunDone': 'Run Complete',
    'RunDoneMsg': 'Successfully ran DFG!',
    'RunFail': 'Run DFG Failed'
};

DSTStr = {
    'UnknownUser': 'Unknow User',
    'DS': 'DATASET',
    'Export': 'EXPORT FORM',
    'DelDS': 'Delete Dataset',
    'DelDSFail': 'Delete Dataset Failed',
    'NewFolder': 'New Folder',
    'NoNewFolder': 'Cannot Create Folder',
    'NoNewFolderMsg': 'This folder is uneditable, cannot create new folder here',
    'DelFolder': 'Delete Folder',
    'DelFolderInstr': 'Please remove all the datasets in the folder first.',
    'DelFolderMsg': 'Unable to delete non-empty folders. Please ensure\r\n' +
                    ' that all datasets have been removed from folders prior' +
                    ' to deletion.',
    'NoParse': 'Cannot parse the dataset.',
    'NoRecords': 'No records in dataset.',
    'NoRecrodsHint': 'Please change the preview size and try to point again',
    // with replace
    'DelDSConfirm': 'Are you sure you want to delete dataset <ds> ?',
    'DelUneditable': 'This <ds> is uneditable, cannot delete',
    'DSSourceHint': 'Please try another path or use another protocol',
    'FileOversize': 'Too many files in the folder, cannot read, please load with the url directly',
    'InvalidHDFS': 'Invalid HDFS path, valid format is: "hostname/pathToFile"',
    'LoadErr': 'Error: <error>, Error File: <file>'
};

DSFormTStr = {
    'LoadConfirm': 'Point To Dataset',
    'NoHeader': 'You have not checked the Header option to promote the first'+
                ' row to the table header. You will not be able to change the '+
                'table header from the default after this.',
    'InvalidDelim': 'Invalid delimiter.'
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
    'LoadJSON': 'Format as JSON',
    'LoadExcel': 'Format as EXCEL',
    'LoadExcelWithHeader': 'Format as EXCEL and promote header',
    'LoadUDF': 'Use UDF to parse the dataset',
    'NoDelim': 'You have not chosen a delimiter.',
    'NoHeader': 'You have not chosen a header row.',
    'NoDelimAndHeader': 'You have not chosen a delimiter and header row.'
};

DSExportTStr = {
    'ExportFail': 'Failed to add export target',
    'InvalidType': 'Invalid Target Type',
    'InvalidTypeMsg': 'Please select a valid target type',
    'RestoreFail': 'Export Target Restoration Failed'
};

WSTStr = {
    'SearchTableAndColumn': 'search for a table or column',
    'WSName': 'Worksheet Name',
    'WSHidden': 'worksheet is hidden',
    'InvalidWSName': 'Invalid worksheet name',
    'InvalidWSNameErr': 'please input a valid name!',
    'AddOrphanFail': 'Add Orphaned Table Failed',
    'AddWSFail': 'Cannot Create Worksheet',
    'AddWSFailMsg': 'There are too many worksheets in the panel',
    'DelWS': 'Delete Worksheet',
    'DelWSMsg': 'There are active tables in this worksheet. ' +
                'How would you like to handle them?',

};

TblTStr = {
    'Create': 'Create Table',
    'Del': 'Delete Tables',
    'DelMsg': 'Are you sure you want to delete table <table>?',
    'DelFail': 'Delete Tables Failed',
    'Archive': 'Archive Tables',
    'Active': 'Send Tables to Worksheet',
    'ActiveFail': 'Add Inactive Tables Failed',
    'Truncate': 'additional characters were truncated'
};

ColTStr = {
    'SplitColWarn': 'Many Columns will generate',
    'SplitColWarnMsg': 'About <num> columns will be generated, do you still want to continue the operation?',
    'RenamSpecialChar': 'Invalid name, cannot contain \\,\.\'()[]\" or starting or ending spaces',
    'RenamStartNum': 'Invalid name, cannot starts with number'
};

SideBarTStr = {
    'SendToWS': 'Send To Worksheet',
    'WSTOSend': 'Worksheet to send',
    'NoSheet': 'No Sheet',
    'NoSheetTableInstr': 'You have tables that are not in any worksheet, ' +
                         'please choose a worksheet for these tables!',
    'PopBack': 'dock',
    'PopOut': 'undock',
    'WalkThroughUA': 'Walkthrough Unavailable',
    'DelTablesMsg': 'Are you sure you want to delete the selected tables?',
    'SelectTable': 'select table',
    'DupUDF': 'Duplicate Module',
    'DupUDFMsg': 'Python module <module> already exists ' +
                 '(module name is case insensitive), ' +
                 'do you want to replace it with this module?',
    'UpoladUDF': 'Upload Success',
    'UploadUDFMsg': 'Your python script has been successfully uploaded!',
    'SyntaxError': 'Syntax Error',
    'UploadError': 'Upload Error',
    'UDFError': '<reason> found in line <line>',
    'DownloadError': 'Download UDF Failed',
    'DownoladMsg': 'UDF is empty',
    'OverwriteErr': 'Cannot overwrite default UDF'
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

OpModalTStr = {
    'EmptyHint': 'select to allow empty field',
    'ColNameDesc': 'New Resultant Column Name',
    'AggNameDesc': 'New Resultant Aggregate Name (optional)',
    'IncSample': 'Include Sample',
    'IncSampleDesc': 'If checked, a sample of all fields will be included',
    'KeepInTable': 'Join Back',
    'KeepInTableDesc': 'If checked, group by will augment original table',
    'ModifyMapDesc': 'Would you like to modify the map?',
    'ModifyMap': 'Modify Map'
};

JsonModalTStr = {
  'RemoveCol': 'Remove this column',
  'Duplicate': 'Duplicate this column',
  'PullAll': 'Pull all fields',
  'Compare': 'Click to select for comparison',
  'SelectOther': 'Select another data cell from a table to compare',
  'SeeAll': 'See All',
  'Original': 'Original',
  'XcOriginated': 'Xcalar Originated',
  'SeeAllTip': 'View all fields',
  'OriginalTip': 'View the original data fields',
  'XcOriginatedTip': 'View Xcalar generated fields',
  'SortAsc': 'Sort Ascending',
  'SortDesc': 'Sort Descending',
};

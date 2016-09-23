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
    'DeleteTable' : 'Dropping table',
    'DeleteTableFailed': 'Drop table failed',
    'DeleteConstFailed': 'Drop constant failed',
    'PartialDeleteTableFail': 'Some tables could not be deleted',
    'PartialDeleteConstFail': 'Some constants could not be deleted',
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
    'FilterFailedAlt' : 'Filter failed',
    'Profile' : 'Profile of',
    'ProfileFailed' : 'Profile failed',
    'Project': 'Projecting Columns',
    'ProjectFailed': 'Projection Failed',
    'Ext': 'Performing Extension <extension>',
    'ExtFailed': 'Performing Extension Failed',
    'StoredProc': 'Performing Stored Procedure',
    'StoredProcFailed': 'Stored Procedure execution failed'
};

TooltipTStr = {
    'ComingSoon': 'Coming Soon',
    'FocusColumn': 'Focused Column',
    'ChooseUdfModule': 'Please choose a module first',
    'ChooseColToExport': 'Please select the columns you want to export',
    'SuggKey': 'Suggested Key',
    'NoWSToMV': 'No worksheet to move to',
    'NoUndoNoOp': 'No operation to undo',
    'NoRedo': 'No operation to redo',
    'Unhide': 'Unhide',
    'LockedTableUndo': 'Cannot undo while table is locked',
    'LockedTableRedo': 'Cannot redo while table is locked',
    'CloseQG': 'Click to hide dataflow graph',
    'OpenQG': 'Click to view dataflow graph',
    'SaveQG': 'Save image',
    'NewTabQG': 'Open image in new tab',
    'AddDataflow': 'Create batch dataflow',
    'Bookmark': 'Click to add bookmark',
    'Bookmarked': 'Bookmarked',
    'CopyLog': 'Copy the SQL log onto your clipboard',
    'GenBundle': 'Generate Support Bundle',
    'ToGridView': 'Switch to Grid View',
    'ToListView': 'Switch to List View',
    'ClickCollapse': 'Click to collapse',
    'CollapsedTable': '1 table is hidden',
    'SelectAllColumns': 'Select all columns',
    'ViewColumnOptions': 'View column options',
    'ViewTableOptions': 'View table options',
    'RemoveQuery': 'Remove query',
    'CancelQuery': 'Cancel query',
    'AlreadyIcv': 'This table is already an ICV table',
    // Sync with htmlTStr
    "IcvRestriction": 'ICV only available for Map and Group By',

    // with replace
    'CollapsedTables': '<number> tables are hidden',
    'DroppedTable': 'Table \'<tablename>\' has been dropped',
    'NoExport': 'Cannot export column of type <type>',
    'Undo': 'Undo: <op>',
    'NoUndo': 'Last operation is "<op>", cannot undo',
    'Redo': 'Redo: <op>'
};

CommonTxtTstr = {
    'XcWelcome': 'Have fun with Xcalar Insight!',
    'Create': 'Create',
    'Continue': 'Continue',
    'Copy': 'Copy',
    'DefaultVal': 'Default Value',
    'HoldToDrag': 'Click and hold to drag',
    'NumCol': 'Number of columns',
    'Exit': 'Exit',
    'ClickToOpts': 'Click to see options',
    'BackToOrig': 'Back to original',
    'Optional': 'Optional',
    'LogoutWarn': 'You have unsaved changes, please save or you may lose your' +
    ' work.',
    'LeaveWarn': 'You are leaving Xcalar',
    'GenBundle': 'Generate Bundle',
    'GenBundleDone': 'Bundle Generated',
    'GenBundleFail': 'Bundle Generated Failed',
    'SupportBundle': 'Support Bundle Generated',
    'SupportBundleInstr': 'Please check your backend for a .tar.gz file',
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
    'ArrayVal': 'Array Value',
    'Value': 'Value',

    // with replace
    'SupportBundleMsg': 'Support upload bundle id <id> successfully generated' +
                        '! It is located on your Xcalar Server at <path>'
};

ErrTStr = {
    'Unknown': 'Unknown Error',
    'NoEmpty': 'Please fill out this field.',
    'InvalidField': 'Invalid Field.',
    'InvalidFilePath': 'Invalid file path.',
    'InvalidFile': 'Please select a file or a folder',
    'InvalidTableName': 'Table name cannot contain any of the ' +
                        'following characters: *#\'\"',
    'NoHashTag': 'Please input a valid name with no # symbols.',
    'NoSpecialChar': 'Please input a valid name with no special characters.',
    'NoSpecialCharOrSpace': 'Please input a valid name with no special' +
                            ' characters or spaces.',
    'NoSpecialCharInParam': 'No special characters or spaces allowed within' +
                            ' parameter braces.',
    'UnclosedParamBracket': 'Unclosed parameter bracket detected.',
    'NoEmptyList': 'Please choose an option on the dropdown list.',
    'NoEmptyFn': 'There are no function definitions to upload.',
    'NoEmptyOrCheck': 'Please fill out this field ' +
                        'or keep it empty by checking the checkbox.',
    'NameInUse': 'Name is in use, please choose another name.',
    'DSNameConfilct': 'Dataset reference with the same name already exits. ' +
                        'please choose another name.',
    'TableConflict': 'A table with the same name already exists, ' +
                        'please choose another name.',
    'ExportConflict': 'This file name is taken, please choose another name.',
    'ColumnConflict': 'A column with the same name already exists, ' +
                        'please choose another name.',
    'DFGConflict': 'A dataflow with the same name already exists, ' +
                            'please choose another name.',
    'InvalidWSInList': 'Invalid worksheet name, please choose a ' +
                        'worksheet from the pop up list.',
    'OnlyNumber': 'Please input a number.',
    'OnlyInt': 'Please input an integer.',
    'OnlyPositiveNumber': 'Please input a number bigger than 0.',
    'NoNegativeNumber': 'Please input a number bigger than or equal to 0',
    'NoAllZeros': 'Values cannot all be zeros',
    'NoWKBKSelect': 'Please select a workbook',
    'NoWS': 'This worksheet is deleted, please choose another worksheet',
    'NoSelect': 'Please select an option from the dropdown list',
    'NoGroupSelect': 'No group selected.',
    'InvalidColName': 'Invalid column name.',
    'ColInModal': 'Please input a column name that starts with $',
    'NoMultiCol': 'This field only accept one column.',
    'NoBucketOnStr': 'Column type is string, cannot bucket into range.',
    'ParamInUse': 'Cannot delete, this parameter is in use.',
    'NoPreviewExcel': 'Excel files are not previewable, ' +
                      'please point to data directly without previewing.',
    'MVFolderConflict': 'Cannot move, name conflicts with files in target ' + 
                        'folder',
    'TimeExpire': 'Please choose a time that is in the future.',
    'LongFileName': 'File Name is too long, please use less than 255 chars.',
    'LargeFile': 'File is too large. Please break into smaller files(<10MB).',
    'NoSupportOp': 'This operation is not supported.',
    'PreservedName': 'This name is preserved, please use another name.',
    'InvalidWin': 'Cannot window an unsorted table',
    'InvalidQuery': 'Query Failed',
    'BracketsMis': 'Your function string has mismatched brackets.',
    'InvalidFunction': 'Invalid function',
    'TooLong': 'Please use fewer than 255 characters',
    'NoTable': 'Table doesn\'t exists',
    'TablesNotDeleted': 'The following tables were not deleted:',
    'ConstsNotDeleted': 'The following constants were not deleted:',
    'NoTablesDeleted': 'No tables were deleted.',
    'NoConstsDeleted': 'No constants were deleted.',
    'LargeImgSave': 'Unable To Save Image',
    'LargeImgTab': 'Unable To Open Image',
    'LargeImgText': 'Image exceeds your browser\'s maximum allowable size',
    'DFGNoExpand': 'This dataflow graph has reached your browser\'s maximum ' +
                  'allowable size.',
    'InvalidExt': 'Invalid Extension',
    'InvalidExtParam': 'Invalid Extension Parameters',
    'InvalidOpNewColumn': 'Cannot perform this operation on a new column.',
    'SuggestProject': 'Please project to reduce the number of columns and ' +
                      'retry.',
    'UserCanceled': 'User Canceled',
    'NoColumns': 'No Columns Selected',
    'NoCast': 'No column to cast.',
    'IcvFailed': 'Failed to generate ICV table',
    'RetinaFormat': 'File must be of the format .tar.gz',
    'RetinaFailed': 'Failed to upload retina',

    // With replace
    'WorkbookExists': 'A workbook named <workbookName> already exists. Please' +
                      ' choose another name.',
    'InvalidColumn' : 'Invalid column name: <name>'
};

ErrWRepTStr = {
    'FolderConflict': 'Folder "<name>" already exists, ' +
                        'please choose another name.',
    'ParamConflict': 'Parameter "<name>" already exists, ' +
                    'please choose another name.',
    'TableConflict': 'Table "<name>" already exists, ' +
                        'please choose another name.',
    'NoPath': '<path> was not found. Redirected to the root directory.',
    'NoFile': 'File <file> was not found in the directory.',
    'InvalidOpsType': 'Invalid type for the field,' +
                      ' wanted: <type1>, but provided: <type2>.',
    'InvalidCol': 'Column "<name>" does not exist.',
    'InvalidRange': 'Please enter a value between <num1> and <num2>.',
    'InvalidColType': 'Column "<name>" has an invalid type: <type>',
    'NoLessNum': 'Please enter a value bigger than or equal to <num>',
    'NoBiggerNum': 'Please enter a value less than or equal to <num>',
    'TableNotDeleted': 'Table <name> was not deleted.',
    'ConstNotDeleted': 'Constant <name> was not deleted.',
    'AggConflict': 'Aggregate <aggPrefix>"' + '<name>" already exists, ' +
                    'please choose another name.',
    'OutputNotFound': '<name> Not Found',
    'OutputNotExists': '<name> no longer exists.',
    'InvalidAggName': 'Aggregate name must be prefixed with <aggPrefix>',
    'InvalidAggLength': 'Aggregate name must be prefixed with <aggPrefix>' +
                        ' and followed by the name'
};

TipsTStr = {
    'Scrollbar': 'Scroll Table Here',
    'DataType': 'Data Type',
    'LineMarker': 'Click row number to add bookmark',
    'JSONEle': 'Double-click to view, then click on key names to pull columns',
    'DragGrid': 'You can drag dataset refs or folders around to reorder',
    'DSTable': 'Click table header to add/remove columns to/from ' +
        'data cart. Click on column headings to further modify the column.',
    'DSCart': 'Datacart area, you can add columns from datasets into your ' +
                'cart. These columns will be used to create the table in your' +
                ' active worksheet. You can also pull out columns in the' +
                ' worksheet screen.',
    'TablList': 'Click to see details',
    'PullColumn': 'Click key to add the column to your table'
};

ThriftTStr = {
    'CCNBEErr': 'Connection error',
    'CCNBE': 'Connection could not be established.',
    'UpdateErr': 'Xcalar Version Mismatch',
    'Update': 'Update required.',
    'SetupErr': 'Setup Failed',
    'ListFileErr': 'List Files Failed',
    'SessionElsewhere': 'Different Node Detected',
    'LogInDifferent': 'Please login as a different user. ' +
                      'One user can only be logged in at one location.'
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
    'CANCEL': 'CANCEL',
    'CONFIRMATION': 'CONFIRMATION'
};

FnBarTStr = {
    'NewCol': 'Please specify the new column name and press enter',
    'InvalidOpParen': 'Operation must be preceeded by operator name and ' +
                      'arguments in parenthesis',
    'ValidOps': 'Valid operators are: <b>pull, map, filter</b>.',
    'DiffColumn': 'The selected column (<colName>) is not included in this operation. Do you want to continue?'
};

ScrollTStr = {
    'Title': 'scroll to a row',

    // with replace
    'BookMark': 'Row <row>'
};

AggTStr = {
    'NoSupport': 'Not Supported',
    'DivByZeroExplain': 'Only one distinct value',
    'NoCorr': 'No columns of type number for correlation',
    'NoAgg': 'No columns of type number for quick aggregation',

    // with replace
    'AggTitle': 'Aggregate: <op>',
    'AggInstr': 'This is the aggregate result for column "<col>". ' +
                '\r\n The aggregate operation is "<op>".',
    'AggMsg': '{"Value":<val>}'
};

IndexTStr = {
    'Sorted': 'Table already sorted',
    'SuggTitle': 'Sort Suggestion',
    'SuggMsg': 'This column can be sorted either numerically or ' +
               'alphabetically. How would you like to sort?',
    'CastToNum': 'Numerically',
    'NoCast': 'Alphabetically',

    // with replace
    'SortedErr': 'Current table is already sorted on this column in <order> ' +
                 'order',
    'SuggInstr': 'Select "Numerically" to cast the column to <type> ' +
                 'before sorting in numerical order. Non-numeric rows are ' +
                 'deleted during the sort.'
};

JoinTStr = {

    'NoRightTable': 'Select right table first',
    'NoKeyLeft': 'Left table has no selected key',
    'NoKeyRight': 'Right table has no selected key',
    'NoMatchLeft': 'Sorry, cannot find a good key to match the left table',
    'NoMatchRight': 'Sorry, cannot find a good key to match the right table',
    'InvalidClause': 'Invalid Clause to join',
    'TypeMistch': 'Left selected column and right selected column has type ' +
                  'mismatch, cannot join',
    'EstimatedJoin': 'Estimated join size',
    'EstimatingJoin': 'Estimating join size...',

    //with replace
    'NoJoin': 'Cannot join <type>'
};

ExportTStr = {
    'Success': 'Export Success',
    'InvalidType': 'Invalid type selected',

    // With replace
    'SuccessMsg': 'File Name: <file>\n File Location: <location>',
    'SuccessInstr': 'Table \"<table>\" was succesfully exported to <location>' +
                    ' under the name: <file>',
    'ExportOfCol': 'Export columns of <table>'

};

ProfileTStr = {
    'Instr': 'Hover on the bar to see details. Use scroll bar and input box ' +
             'to view more data.',
    'LoadInstr': 'Please wait for the data preparation, you can close the ' +
                 'modal and view it later.',

    // With replace
    'Info': "Profile of column: <b><col></b>, type: <b><type></b>"
};

WKBKTStr = {
    'NoWkbk': 'No workbook for the user',
    'NoMeta': 'No Meta',
    'Location': 'Workbook Browser',
    'NewWKBK': 'New Workbook',
    'NewWKBKInstr': 'Get started with Xcalar Insight by creating a new ' +
                    'workbook. Give your new workbook a name and click on ' +
                    'the Create Workbook Button. Once the workbook is ' +
                    'created, mouse over it and click on the Play button to ' +
                    'get started with your new Workbook. Alternatively, ' +
                    'start with one of Xcalar Insight\'s tutorials to learn ' +
                    'more.',
    'CurWKBKInstr': 'To continue with your currently active workbook, hover ' +
                    'over the card with a blue background and click on the ' +
                    'play button. You can switch to another workbook by ' +
                    'hovering over the other workbook and click on the ' +
                    'play button. To create a duplicate of any of the ' +
                    'workbooks, hover over the workbook card and click on ' +
                    'the duplicate button.',
    'NoOldWKBK': 'Cannot Retrieve Old Workbook',
    'NoOldWKBKInstr': 'If you still see the error after re-login, ' +
                      'please copy your log and restart the server.',
    'NoOldWKBKMsg': 'Please Use new workbook or logout and try again!',
    'Expire': 'Please Log out',
    'ExpireMsg': 'You are logged in somewhere else!',
    'Hold': 'Login Warning',
    'HoldMsg': 'You are logged in somewhere else. Continuing to log in might ' +
               'cause you to lose unsaved work.',
    'Release': 'Continue login',
    'WKBKnotExists': 'No workbooks exist',
    "Activate": "Activate Workbook",
    "ReturnWKBK": "Return To Workbook",
    "EditName": "Edit Workbook Name",
    "Duplicate": "Duplicate Workbook",
    "Delete": "Delete Workbook",
    "DelErr": "Error occurred in deleting workbook",
    // With replace
    'Conflict': 'Workbook "<name>" already exists, ' +
                'please choose another name.'
};

MonitorTStr = {
    'Monitor': 'Monitor',
    'System': 'System',
    'Queries': 'Queries',
    'Setup': 'Setup',
    'Settings': 'Settings',
    'Ext': 'Extension',
    "ConfigParamName": "Config Parameter Name",
    "CurVal": "Current Value",
    "NewVal": "New Value",

};

DFGTStr = {
    'AddParamHint': 'Please create parameters in Dataflow Panel first.',
    'DFCreateFail': 'Dataflow Creation Failed',
    'ParamModalFail': 'Parameter Creation Failed',
    'UpdateParamFail': 'Update Parameters Failed',
    'NoDFG1': 'No dataflows added',
    'NoDFG2': 'Add a dataflow in Dataflow Graph',
    'RunDone': 'Run Complete',
    'RunDoneMsg': 'Successfully ran DFG!',
    'RunFail': 'Run DFG Failed',
    "DFGTitle": "DATAFLOW",
    "PointTo": "File Path",
    "ExportTo": "Export As",
    "DelDFG": "Permanently Delete Dataflow",
    "DelDFGMsg": "Are you sure you want to permanently delete " +
                 "this dataflow? This action cannot be undone.",
    "DownloadErr": "Download Failed"
};

DSTStr = {
    'UnknownUser': 'Unknown User',
    'DS': 'DATASET',
    'IN': 'DATASTORE/IN',
    'OUT': 'DATASTORE/OUT',
    'Export': 'EXPORT FORM',
    'DelDS': 'Delete Dataset Reference',
    'DelDSFail': 'Delete Dataset Reference Failed',
    'NewFolder': 'New Folder',
    'NoNewFolder': 'Cannot Create Folder',
    'NoNewFolderMsg': 'This folder is uneditable, cannot create new folder here',
    'DelFolder': 'Delete Folder',
    'DelFolderInstr': 'Please remove all the dataset references in the ' +
                      'folder first.',
    'DelFolderMsg': 'Unable to delete non-empty folders. Please ensure\r\n' +
                    ' that all datasets have been removed from folders prior' +
                    ' to deletion.',
    'NoParse': 'Cannot parse the dataset.',
    'NoRecords': 'No records in dataset.',
    'NoColumns': 'No Columns Selected',
    'NoRecrodsHint': 'Please change the preview size and try to point again',
    'CancalPoint': 'Cancel Point to dataset',
    'DSSourceHint': 'Please try another path or use another protocol',
    'FileOversize': 'Too many files in the folder, cannot read, please load with the url directly',
    'InvalidHDFS': 'Invalid HDFS path, valid format is: "hostname/pathToFile"',
    'Excel': "EXCEL",
    'Home': 'Home',

    // With replace
    'DelDSConfirm': 'Are you sure you want to delete dataset reference <ds> ?',
    'DelUneditable': 'This <ds> is uneditable, cannot delete',
    'CancelPointMsg': 'Are you sure you want to cancel pointing dataset ' +
                      'reference <ds> ?',
    'LoadErr': 'Error: <error>, Error File: <file>',
};

DSFormTStr = {
    'InvalidDelim': 'Invalid delimiter.',
    'InvalidQuote': 'Cannot have more than 1 quote character',
    'NoParseJSON': 'Cannot parse data as json',
    'GoBack': 'Please click the \"BACK\" button to re-enter a valid path',
    'NoData': 'No data',
    'CreateWarn': 'Too Many Columns To Create',
    'CreateWarnMsg': 'Create table with too many columns from dataset ' +
                'reference might be slow, are you sure you want to continue?'
};


DSExportTStr = {
    'ExportFail': 'Failed to add export target',
    'InvalidType': 'Invalid Target Type',
    'InvalidTypeMsg': 'Please select a valid target type',
    'RestoreFail': 'Export Target Restoration Failed'
};

WSTStr = {
    'SearchTableAndColumn': 'Search for a table or column',
    'WSName': 'Worksheet Name',
    'WSHidden': 'worksheet is hidden',
    'InvalidWSName': 'Invalid worksheet name',
    'InvalidWSNameErr': 'please input a valid name!',
    'AddOrphanFail': 'Add Temporary Table Failed',
    'AddWSFail': 'Cannot Create Worksheet',
    'AddWSFailMsg': 'There are too many worksheets in the panel',
    'NewWS': 'New Worksheet',
    'DelWS': 'Delete Worksheet',
    'DelWSMsg': 'There are active tables in this worksheet. ' +
                'How would you like to handle them?'
};

UDFTStr = {
    "Edit": "Edit UDF",
    "Del": "Delete UDF",
    "Download": "Download UDF",
    "DelTitle": "Delete UDF",
    "DelMsg": "Are you sure you want to delete the udf module?",
    "DelFail": "Delete UDF Failed"
};

TblTStr = {
    'Create': 'Create Table',
    'Del': 'Drop Tables',
    'DelMsg': 'Are you sure you want to drop table <table>?',
    'DelFail': 'Drop Tables Failed',
    'Archive': 'Archive Tables',
    'Active': 'Send Tables to Worksheet',
    'ActiveFail': 'Add Inactive Tables Failed',
    'Truncate': 'Additional characters were truncated'
};

ColTStr = {
    'SplitColWarn': 'Many Columns will generate',
    'RenamSpecialChar': 'Invalid name, cannot contain \\,\.\'()[]\"::or ' +
                        'starting or ending spaces',
    'RenameStartNum': 'Invalid name, cannot starts with number',
    'ImmediateClash': 'Invalid name, name already exists in at least one ' +
                      'DATA cell',
    // With Replace
    'SplitColWarnMsg': 'About <num> columns will be generated, do you still ' +
                       'want to continue the operation?'
};

SideBarTStr = {
    'SendToWS': 'Send To Worksheet',
    'WSTOSend': 'Worksheet to send',
    'NoSheet': 'No Sheet',
    'NoSheetTableInstr': 'You have tables that are not in any worksheet, ' +
                         'please choose a worksheet for these tables!',
    'PopBack': 'Dock',
    'PopOut': 'Undock',
    'WalkThroughUA': 'Walkthrough Unavailable',
    'DelTablesMsg': 'Are you sure you want to drop the selected table(s)?',
    'SelectTable': 'Select table',
    'DupUDF': 'Duplicate Module',
    'DupUDFMsg': 'Python module <module> already exists ' +
                 '(module name is case insensitive), ' +
                 'do you want to replace it with this module?',
    'UpoladUDF': 'Upload Success',
    'UploadUDFMsg': 'Your python script has been successfully uploaded!',
    'SyntaxError': 'Syntax Error',
    'UploadError': 'Upload Error',
    'DownloadError': 'Download UDF Failed',
    'DownoladMsg': 'UDF is empty',
    'OverwriteErr': 'Cannot overwrite default UDF',
    'DropConsts' : 'Drop Constants',
    'DropConstsMsg' : 'Are you sure you want to drop the selected constant(s)?',

    // With Replace
    'UDFError': '<reason> found in line <line>'

};

ExtTStr = {
    "Website": "VISIT WEBSITE",
    "Report": "REPORT ERROR",
    "Version": "Version",
    "Lang": "Language",
    "extName": "Extension Name",
    "categoryName": "Category Name",
    "Install": "INSTALL",
    "Installed": "INSTALLED",
    "More": "VIEW MORE",
    "Less": "HIDE DETAIL"
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
    'EmptyHint': 'Select to allow empty field',
    'EmptyStringHint': 'Select to allow empty strings',
    'ColNameDesc': 'New Resultant Column Name',
    'AggNameDesc': 'New Resultant Aggregate Name (optional)',
    'IncSample': 'Include a sample of the rest of the fields',
    'IncSampleDesc': 'If checked, a sample of all fields will be included',
    'KeepInTable': 'Join table back to original',
    'KeepInTableDesc': 'If checked, group by will augment original table',
    'ModifyMapDesc': 'Would you like to modify the map?',
    'NoArg': 'No Argument',
    'EmptyString': 'Empty String',

    // with replace
    'ModifyDesc': 'Would you like to modify the <name>?',
    'ModifyBtn': 'MODIFY <name>'
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

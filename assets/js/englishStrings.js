StatusMessageTStr = {
'Success' : 'Success!',
'Completed' : 'Completed',
'Viewing' : 'Viewing',
'Error' : 'Error encountered',
'Loading' : 'Loading',
'LoadingDataset' : 'Loading Dataset',
'LoadingTables': 'Loading Tables',
'LoadFailed' : 'Load failed',
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
'ComingSoon': 'Coming Soon'
};

ErrorTextTStr = {
    'NoEmpty': 'Please fill out this field.',

    'InvalidField': "Invalid Field.",

    'InvalidFilePath': 'Invalid file path',

    'InvalidFileName': 'Invalid file name, ' +
                        'please choose a file or folder to import.',

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

    'NoPreviewJSON': 'Cannot preivew JSON files.',

    'NoPreviewExcel': 'Cannot preview Excel files.',

    'MVFolderConflict': 'Cannot move, name conflicts with files in target folder',

    'TimeExpire': 'Please choose a time that is in the future.',

    'LongFileName': 'File Name is too long, please use less than 255 chars.',

    'LargeFile': 'File is too large. Please break into smaller files(<10MB).',

    'NoSupportOp': 'This operation is not supported.',

    'ContinueVerification': 'Are you sure you want to continue?',

    'InvalidColumn' : 'Invalid column name: <name>'

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

AggModalStr = {
    "QuickAggTitle": "Quick Aggregates",
    "QuickAggInstr": "Viewing common aggregate functions on all of the columns in the active table.",
    "CorrTitle": "Correlation Coefficients",
    "CorrInstr": "Viewing correlation coefficient for every pair of numerical columns"
};

DataCartStr = {
    'NoCartTitle': 'No Tables Selected',
    'HaveCartTitle': 'Selected Tables',
    'NoColumns': 'No Columns Selected',
    'HelpText': 'To add a column to the data cart, select a data set on the left' +
                ' and click on the column names that you are interested' +
                ' in inside the center panel.'
};

WorksheetStr = {
    'SearchColumn': 'search for a column'
};

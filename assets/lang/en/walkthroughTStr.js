// if using in browser, make sure to include assets/lang/en/globalAutogen.js
// with <script tag

var autogenVars = (typeof window === 'undefined' && typeof require !== 'undefined') ? require('./globalAutogen.js') : window.autogenVars;

var WalkThroughTStr = {
    'w1': {
        // Workbook Demo
        // Following struct defines order which the steps get played.
        // If step's name is not here, it will not get played!
        '_order': ['w1-workbookBut', 'w1-topMenu', 'w1-workspaceBut',
                   'w1-datastoresBut', 'w1-monitorBut', 'w1-df', 'w1-activeWs',
                   'w1-inactiveWs', 'w1-newWs', 'w1-view', 'w1-bottomMenu',
                   'w1-extensions', 'w1-log', 'w1-udf', 'w1-help', 'w1-save',
                   'w1-user'],
        'w1-topMenu': 'This is the top menu. The buttons here change the contents of what you are viewing.',
        'w1-workbookBut': 'This is your workbook browser button. Click to open if you want to switch to another workbook. Your current workbook will be automatically saved.',
        'w1-workspaceBut': 'This shows your current workbook\'s active worksheet. You can have multiple worksheets in a single workbook.',
        'w1-datastoresBut': 'This is the datasets button. Click this button to import new datasets and add them to your worksheet.',
        'w1-monitorBut': 'This is your monitor button, where you will be able to view the progress of your running queries and your machine’s statistics.',
        'w1-df': 'This is your dataflow button, where you will be able to manage your dataflows and run them.',
        'w1-activeWs': 'This is your current active worksheet. You can rename it by double-clicking the current name or by clicking the ellipsis on the right.',
        'w1-inactiveWs': 'This is your inactive worksheet tab. You may have many inactive worksheets. To delete the worksheet, click the ellipsis on the right.',
        'w1-newWs': 'Clicking this icon will add new worksheets to your workbook.',
        'w1-view': 'Click here to toggle between worksheet list and table list.',
        'w1-bottomMenu': 'This is the bottom menu. The buttons here supplement the contents of what you are viewing.',
        'w1-extensions': 'This is the extensions button. Invoke extensions from here.',
        'w1-log': 'This is the log button. Click here to view your logs.',
        'w1-udf': 'This is an editor for you to modify your python UDFs before uploading them.',
        'w1-help': 'This is the help icon. You can type your question here to search through the help topics, watch videos or start a step-by-step walk through.',
        'w1-save': 'This is the save button. Your workbooks are automically saved every few minutes. However if you want to manually save, you can click on this button.',
        'w1-user': 'This is the user icon. You may sign out by clicking it and selecting sign out.'
    },
    'w2': {
        // Datastore Demo Part 1
        // Following struct defines order which the steps get played.
        // If step's name is not here, it will not get played!
        '_order': ['w2-newDs', 'w2-browseDs', 'w2-dsPath', 'w2-next',
                   'w2-dsName',  'w2-dsFormat', 'w2-dsOptions', 'w2-refresh',
                   'w2-dsConfirm'],
        'w2-newDs': 'Click this button to import a new dataset then follow the steps on the right panel.',
        'w2-browseDs': 'The browse button will enable you to browse through your files to select the dataset.',
        'w2-dsPath': 'You can also enter the path for your data source here.',
        'w2-next': 'If you have entered a path manually, click on NEXT to continue',
        'w2-dsName': 'A default name for your dataset will be generated after you select the dataset. You may choose your own name if desired. The dataset name maybe 1 to 255 characters in length. The characters A-Z, a-z, 0-9 and ‘_’ are allowed.',
        'w2-dsFormat': 'You can click on the dropdown button to choose the format of your dataset.',
        'w2-dsOptions': 'Depending on the format of the dataset, there may be additional options for you to select.',
        'w2-refresh': 'If you have chosen a UDF or changed advanced optoins and you would like to see how your dataset looks like now, click this button to refresh your tabular preview.',
        'w2-dsConfirm': 'After you are satisfied with your selections, click this button to finalize.'
    },
    'w3': {
        // Datastore Demo Part 2
        // Following struct defines order which the steps get played.
        // If step's name is not here, it will not get played!
        '_order': ['w3-dsIcon', 'w3-dsInfo', 'w3-dataType', 'w3-addCol',
                   'w3-selectAll', 'w3-selectedCol', 'w3-newTableName',
                   'w3-createTable', 'w3-selectWorksheet',
                   'w3-createFolder', 'w3-folder', 'w3-deleteFolder',
                   'w3-changeView'],
        'w3-dsIcon': 'This icon represents a dataset once a dataset has been created. By clicking on the icon, you will be able to see its corresponding data on the right side (As in this example).',
        'w3-dsInfo': 'This area shows you all the information regarding the selected dataset.',
        'w3-dataType': 'This is the data type of the column. Possible values are decimal, string, etc.',
        'w3-addCol': 'To select a column that you want to add to your worksheet, click on the column header. The selected column gets highlighted and added to the data cart on the right.',
        'w3-selectAll': 'You can choose to select or deselect all of the columns in the dataset, or you can select the columns later.',
        'w3-selectedCol': 'These are all the selected columns. Deselect a column by clicking on the trash icon beside the column name.',
        'w3-newTableName': 'This is the name of the soon-to-be created table containing all the selected columns. Click on the existing name to make changes.',
        'w3-createTable': 'Clicking this button will create the tables using the selected columns and add them to the worksheet that you have selected above.',
        'w3-selectWorksheet': 'Click on the dropdown to select a different worksheet to send the newly created table to.',
        'w3-createFolder': 'In order to organize your datasets, you can create new folders by clicking this icon.',
        'w3-folder': 'This is a folder. The number on it specifies the number of datasets inside the folder. You can change the name of the folder by double-clicking on the existing name.',
        'w3-deleteFolder': 'Right-click on a folder or dataset to delete it.',
        'w3-changeView': 'You can change the way the datasets and folders are displayed below by clicking on list or grid view.'
    },
    'w4': {
        // Datastore Demo Part 1
        // Following struct defines order which the steps get played.
        // If step's name is not here, it will not get played!
        '_order': ['w2-newDs', 'w2-browseDs', 'w2-dsDrop', 'w2-next',
                   'w2-dsName',  'w2-dsFormat', 'w2-dsOptions', 'w2-refresh',
                   'w2-dsConfirm'],
        'w2-newDs': 'Click this button to import a new dataset then follow the steps on the right panel.',
        'w2-browseDs': 'The browse button will enable you to browse through your files to select a dataset to upload.',
        'w2-dsDrop': 'You can also drag and drop a file to upload here.',
        'w2-next': 'After you have uploaded a dataset, select it to continue',
        'w2-dsName': 'A default name for your dataset will be generated after you select the dataset. You may choose your own name if desired. The dataset name maybe 1 to 255 characters in length. The characters A-Z, a-z, 0-9 and ‘_’ are allowed.',
        'w2-dsFormat': 'You can click on the dropdown button to choose the format of your dataset.',
        'w2-dsOptions': 'Depending on the format of the dataset, there may be additional options for you to select.',
        'w2-refresh': 'If you have chosen a UDF or changed advanced optoins and you would like to see how your dataset looks like now, click this button to refresh your tabular preview.',
        'w2-dsConfirm': 'After you are satisfied with your selections, click on refresh preview to make sure that the selection is valid and then click on finalize.'
    },
    'wa1': {
       // Datasets Panel
       // Following struct defines order which the steps get played.
       // If step's name is not here, it will not get played!
       '_order': ['wa1-datasetsList', 'wa1-importDs', 'wa1-sharedDs', 'wa1-lockedDs', 'wa1-selectFile', 'wa1-contextMenu'],
       'wa1-datasetsList': 'Before you import a new dataset, check the datasets list and folders for your dataset.',
       'wa1-importDs': 'To import a dataset from one or more data source files, click the "Import Data Source" button.',
       'wa1-sharedDs': 'The "Shared" folder contains all datasets shared by cluster users.',
       'wa1-lockedDs': 'A dataset added as a table into one or more active workbooks is automatically locked.',
       'wa1-selectFile': 'To preview a dataset, click on its icon in the datasets list.',
       'wa1-contextMenu': 'To open the context menu containing actions you can perform, right-click or control-click the dataset.'
       //NOTE: wa1-contextMenu step is not yet implemented. When displaying the contextMenu in the tutorial any clicks will hide the element.
    },
    'wa2': {
       // Import Data Source First Screen
       // Following struct defines order which the steps get played.
       // If step's name is not here, it will not get played!
       '_order': ['wa2-selectDt', 'wa2-pastePath', 'wa2-nextDs', 'wa2-browseDs'],
       'wa2-selectDt': 'Select the data target, which is the storage location for your data source files.',
       'wa2-pastePath': 'Enter the path to the directory where your data source files reside.',
       'wa2-nextDs': 'If you entered the complete path to the data source, click "NEXT".',
       'wa2-browseDs': 'If you entered a partial path or no path, then click "BROWSE" to find your way to the files.'
    },
    'wa3': {
        // Browse Data Source Screen
        // Following struct defines order which the steps get played.
        // If step's name is not here, it will not get played!
    '_order': ['wa3-selectDir', 'wa3-parentDir', 'wa3-selectFile', 'wa3-fileDetails', 'wa3-fileSearch', 'wa3-multFiles', 'wa3-multDirs', 'wa3-selectedRecursive', 'wa3-multDs', 'wa3-clickNext'],
    'wa3-selectDir': 'To see a directory\'s contents, double-click on a directory.',
    'wa3-parentDir': 'To go up a directory-level, click the "Go To Parent Directory" button.', 
    'wa3-selectFile': 'To select a file as your data source and preview your data source, double-click on a file.',
    'wa3-fileDetails': 'To see details about a data source file, single-click the file. To view the file as raw data, click the "VIEW RAW DATA" button.',
    'wa3-fileSearch': 'You can search for data source files or folders five ways: simple string search, regex match, regex contains, glob wildcard matching, or glob contains searches.',
    'wa3-multFiles': 'To highlight a group of files, click on one and shift-click on another. To add a highlighted group of files to your new dataset, click any highlighted file\'s checkbox.',
    'wa3-multDirs': 'Highlight a group of directories by clicking on one and shift-clicking on another. To add all files in these directories to your dataset, click a highlighted directory\'s checkbox.',
    'wa3-selectedRecursive': 'To add all files in a directory\'s subdirectories, add a check to the directory\'s recursive checkbox.',
    'wa3-multDs': 'When importing multiple data source files, to import all files as separate datasets, click the "Multiple Datasets" toggle.',
    'wa3-clickNext': 'Once you have selected all the files and folders to add to your dataset, click "NEXT".'
     },
    'wa4': {
        // Browse Data Source Second Screen, Preview.
        // Following struct defines order which the steps get played.
        // If step's name is not here, it will not get played!
    '_order': ['wa4-previewDs', 'wa4-previewChoice', 'wa4-previewMoreRows', 'wa4-importPrefs',
           'wa4-columnRename', 'wa4-castData', 'wa4-addCols', 'wa4-errorTol', 'wa4-createDs'],
    'wa4-previewDs': autogenVars.prodName + ' parses the file and determines the format and import preferences. Verify the preview renders cleanly in tabular form.',
    'wa4-previewChoice': 'Confirm the format is correct by previewing one or more files from your import.',
    'wa4-previewMoreRows': 'If needed, preview more rows from your dataset.',
    'wa4-importPrefs': 'If your data doesn\'t cleanly render as a table, consider adjusting the import preferences.',
    'wa4-columnRename': 'For CSV data sources, you can rename columns.',
    'wa4-castData': 'Depending on encoding of data errors, you may wish to select the proper data type during import, or use modeling tools to process data before casting data to the proper type.',
    'wa4-addCols': 'Adding the file name or the record number to each record in a dataset can be the only way to achieve some modeling tasks.',
    'wa4-errorTol': 'Choose the appropriate error tolerance for your data. For example, if data errors imply you should report the errors to the generator and not model with the data, select low tolerance.', 
    'wa4-createDs': 'To complete the dataset creation process and start creating a table from the dataset, click CREATE DATASET.',
     }
};

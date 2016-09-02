var WalkThroughTStr = {
    'w1': {
        // Workbook Demo
        // Following struct defines order which the steps get played.
        // If step's name is not here, it will not get played!
        '_order': ['w1-workbookBut', 'w1-workspaceBut', 'w1-datastoresBut',
                   'w1-monitorBut', 'w1-activeWs', 'w1-inactiveWs', 'w1-newWs',
                   'w1-help', 'w1-user'],
        'w1-workbookBut': 'This is your workbook browser button. Click to open if you want to switch to another workbook. Your current workbook will be automatically saved.',
        'w1-workspaceBut': 'This shows your current workbook. You can have multiple worksheets in a single workbook.',
        'w1-datastoresBut': 'This is the data stores button. Click this button to point to new datasets and add them to your current worksheet.',
        'w1-monitorBut': 'This is your monitor button, where you will be able to view your machine’s usage statistics such as RAM, CPU etc.',
        'w1-activeWs': 'This is your current active worksheet. You can rename it by double-clicking the current name or by clicking the ellipsis on the right.',
        'w1-inactiveWs': 'This is your inactive worksheet tab. You may have many inactive worksheets. To delete the worksheet, click the ellipsis on the right.',
        'w1-newWs': 'Clicking this icon will add new worksheets to your workbook.',
        'w1-help': 'This is the help icon. You can type your question here to search through the help topics, watch videos or start a step-by-step walk through.',
        'w1-user': 'This is the user icon. You may sign out by clicking it.'
    },
    'w2': {
        // Datastore Demo Part 1
        // Following struct defines order which the steps get played.
        // If step's name is not here, it will not get played!
        '_order': ['w2-newDs', 'w2-browseDs', 'w2-dsPath', 'w2-dsName',
                   'w2-dsFormat', 'w2-dsOptions', 'w2-dsConfirm'],
        'w2-newDs': 'Click this button to point to a new dataset. Fill up the description to finish the process.',
        'w2-browseDs': 'The browse button will enable you to browse through your files to select the dataset you want to import.',
        'w2-dsPath': 'You can also enter the path for your dataset here.',
        'w2-dsName': 'A default name for your dataset will be generated after you select the dataset. You may choose your own name if desired. The dataset name maybe 1 to 255 characters in length. The characters A-Z, a-z, 0-9 and ‘_’ are allowed.',
        'w2-dsFormat': 'You can click on the dropdown button to choose the format of your dataset.',
        'w2-dsOptions': 'Depending on the format of the dataset, there may be additional options for you to select.',
        'w2-dsConfirm': 'After you are satisfied with your selections, click to point to data.'
    },
    'w3': {
        // Datastore Demo Part 2
        // Following struct defines order which the steps get played.
        // If step's name is not here, it will not get played!
        '_order': ['w3-dsIcon', 'w3-dsInfo', 'w3-dataType', 'w3-addCol',
                   'w3-selectAll', 'w3-selectedCol', 'w3-newTableName',
                   'w3-clearCart', 'w3-createTable', 'w3-createFolder',
                   'w3-folder', 'w3-deleteFolder', 'w3-changeView'],
        'w3-dsIcon': 'This icon represents a dataset once it has been read. By clicking on the icon, you will be able to see its corresponding data on the right side (As in this example).',
        'w3-dsInfo': 'This area shows you all the information regarding the selected dataset.',
        'w3-dataType': 'This is the data type of the column. Possible values are decimal, string, etc.',
        'w3-addCol': 'To select a column that you want to add to your worksheet, click on the column header. The selected column gets highlighted and added to the data cart on the right.',
        'w3-selectAll': 'You can choose to select or deselect all of the columns in the dataset, or you can select the columns later.',
        'w3-selectedCol': 'These are all the selected columns. Deselect a column by clicking on the cross beside the column name.',
        // 'This is the name of the soon-to-be created table containing all the selected columns. Click on the existing name to make changes.<br/><br/>You can create more than one table by selecting columns from different datasets. To select a different dataset, you can click on Import New Dataset and follow the same procedure or click on another already loaded dataset.',
        'w3-newTableName': 'This is the name of the soon-to-be created table containing all the selected columns. Click on the existing name to make changes.',
        'w3-clearCart': 'Clicking this button will clear the data cart of columns previously selected.',
        'w3-createTable': 'Clicking this button will create the tables using the selected columns and add them to your active worksheet.',
        'w3-createFolder': 'In order to organize your datasets, you can create new folders by clicking this icon.',
        'w3-folder': 'This is a folder. The number on it specifies the number of datasets inside the folder. You can change the name of the folder by double-clicking on the existing name.',
        'w3-deleteFolder': 'Right-click on a folder or dataset to delete it.',
        'w3-changeView': 'You can change the way the datasets and folders are displayed below by clicking on list or grid view.'
    }
};

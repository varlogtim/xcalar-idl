window.UserSettings = (function($, UserSettings) {
    var settings = {
        dataListView : false,
        browserListView : false,
        lastRightSideBar : null
    };

    UserSettings.restore = function(oldSettings) {
        settings = oldSettings;
    };

    UserSettings.setSettings = function() {
        getDatasetListView();
        getBrowserListView();
        getRightSideBarLastOpened();
        return (settings);
    };

    UserSettings.getSettings = function() {
        return (settings);
    };

    UserSettings.clear = function() {
        settings = {};
    };

    function getDatasetListView() {
        settings.datasetListView = $('#dataViewBtn').hasClass('listView');
    }

    function getBrowserListView() {
        settings.browserListView = $('#fileBrowserGridView')
                                   .hasClass('listView');
    }

    function getRightSideBarLastOpened() {
        settings.lastRightSideBar = $('.rightBarSection.lastOpen').attr('id');
    }

    return (UserSettings);
}(jQuery, {}));
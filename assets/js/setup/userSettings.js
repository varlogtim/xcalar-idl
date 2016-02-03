window.UserSettings = (function($, UserSettings) {
    var settings = {};

    UserSettings.restore = function(oldSettings) {
        settings = new SettingInfo(oldSettings);
    };

    UserSettings.setSettings = function() {
        getDatasetListView();
        getBrowserListView();
        getRightSideBarLastOpened();
        getActiveWorksheet();
        return (settings);
    };

    UserSettings.getSettings = function() {
        return (settings);
    };

    UserSettings.clear = function() {
        settings = new SettingInfo();
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

    function getActiveWorksheet() {
        settings.activeWorksheet = WSManager.getActiveWS();
    }

    return (UserSettings);
}(jQuery, {}));

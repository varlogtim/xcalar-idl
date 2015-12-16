// VERSION.js
function VersionInfo(options) {
    options = options || {};
    this.version = options.version;
    this.SHA = options.SHA;

    return this;
}

// authentication.js
function AuthInfo(options) {
    options = options || {};
    this.idCount = options.idCount;
    this.hashTag = options.hashTag;

    return this;
}

// store.js
function METAConstructor(atStartUp) {
    // basic thing to store
    this[KVKeys.TI] = gTables;
    this[KVKeys.WS] = WSManager.getAllMeta();

    this[KVKeys.DS] = DS.getHomeDir();
    this[KVKeys.CLI] = CLIBox.getCli();

    this[KVKeys.CART] = DataCart.getCarts();
    this[KVKeys.STATS] = Profile.getCache();
    this[KVKeys.DFG] = DFG.getAllGroups();
    this[KVKeys.SCHE] = Scheduler.getAllSchedules();

    if (atStartUp) {
        this[KVKeys.USER] = UserSettings.getSettings();
    } else {
        this[KVKeys.USER] = UserSettings.setSettings();
    }

    return this;
}

// worksheet.js
function WSMETA(options) {
    options = options || {};
    this.wsInfos = options.wsInfos;
    this.wsOrder = options.wsOrder;
    this.hiddenWS = options.hiddenWS;
    this.noSheetTables = options.noSheetTables;
    this.aggInfos = options.aggInfos;

    return this;
}

// workbook.js
function WKBK(options) {
    options = options || {};

    if (options.name == null || options.id == null) {
        throw "Invalid workbook info!";
    }

    this.name = options.name;
    this.id = options.id;
    this.noMeta = options.noMeta;
    this.srcUser = options.srcUser;
    this.curUser = options.curUser;
    this.created = options.created;
    this.modified = options.modified;

    return this;
}

WKBK.prototype = {
    "update": function() {
        this.modified = xcHelper.getTimeInMS();  // store modified data
    }
};

function WKBKSet() {
    this.set = {};

    return this;
}

WKBKSet.prototype = {
    "get": function(wkbkId) {
        return this.set[wkbkId];
    },

    "getWithStringify": function() {
        return JSON.stringify(this.set);
    },

    "getAll": function() {
        return this.set;
    },

    "put": function(wkbkId, wkbk) {
        this.set[wkbkId] = wkbk;
    },

    "has": function(wkbkId) {
        return this.set.hasOwnProperty(wkbkId);
    }
};

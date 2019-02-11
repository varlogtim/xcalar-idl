// This file is for stubs for sqlUtils and dagUtils functionality

function hackFunction() {

    // Some browsers and node.js don't support Object.values
    if (!Object.values) Object.values = o=>Object.keys(o).map(k=>o[k]);

    var CurrentUser = {
        commitCheck: function() {
            return PromiseHelper.resolve();
        }
    };

    global.userIdName = undefined;
    global.sessionName = undefined;

    global.XcUser = {
        CurrentUser: CurrentUser
    };

    global.TblManager = {
        setOrphanTableMeta: function() {}
    };

    global.ColManager = {
        newPullCol: function(colName, backColName, type) {
            if (backColName == null) {
                backColName = colName;
            }
            return new ProgCol ( {
                "backName": backColName,
                "name": colName,
                "type": type || null,
                "width": 100,
                "isNewCol": false,
                "userStr": '"' + colName + '" = pull(' + backColName + ')',
                "func": {
                    "name": "pull",
                    "args": [backColName]
                },
                "sizedTo": "header"
            } )
        },

        newDATACol: function() {
            return {
                "backName": "DATA",
                "name": "DATA",
                "type": "object",
                "width": "auto",// to be determined when building table
                "userStr": "DATA = raw()",
                "func": {
                    "name": "raw",
                    "args": []
                },
                "isNewCol": false
            };
        }
    };

    global.authCount = 0;

    global.Authentication = {
        getHashId: function() {
            // return xcHelper.randName("#", 8);
            idCount = "#" + new Date().getTime() + authCount;
            authCount++;
            return idCount;
        }
    };

    global.MonitorGraph = {
        tableUsageChange: function() {}
    };

    global.Log = Log = {
        errorLog: function() { xcConsole.log(arguments); }
    };
    global.Admin = Admin = {
        addNewUser: function(username) {
            var self = this;
            var deferred = PromiseHelper.deferred();
            var kvStore = new KVStore("gUserListKey", gKVScope.GLOB);

            kvStore.get()
            .then(function(value) {
                if (value == null) {
                    xcConsole.log("Adding user to admin panel: " + username);
                    return self.storeUsername(kvStore, username);
                } else {
                    var userList = self.parseStrIntoUserList(value);
                    // usernames are case sensitive
                    if (userList.indexOf(username) === -1) {
                        xcConsole.log("Adding user to admin panel: " + username);
                        return self.storeUsername(kvStore, username, true);
                    } else {
                        xcConsole.log("User exists in admin panel: " + username);
                        return PromiseHelper.resolve();
                    }
                }
            })
            .then(deferred.resolve)
            .fail(function(err) {
                xcConsole.log(err);
                deferred.reject(err);
            });

            return deferred.promise();
        },
        storeUsername: function (kvStore, username, append) {
            var deferred = PromiseHelper.deferred();
            var entry = JSON.stringify(username) + ",";
            if (append) {
                return kvStore.append(entry, true, true);
            } else {
                return kvStore.put(entry, true, true);
            }
        },
        parseStrIntoUserList: function (value) {
            var len = value.length;
            if (value.charAt(len - 1) === ",") {
                value = value.substring(0, len - 1);
            }
            var arrayStr = "[" + value + "]";
            var userList;
            try {
                userList = JSON.parse(arrayStr);
            } catch (err) {
                userList = [];
                xcConsole.log("Parsing user list failed! ", err);
            }
            userList.sort(xcHelper.sortVals);
            return userList;
        }
    };

    class ProgCol {
        constructor(options) {
            options = options || {};
            this.backName = options.backName;
            this.name = options.name;
            this.type = options.type || null;
            this.width = 100;
            this.isNewCol = false;
            this.userStr = options.userStr;
            this.func = options.func;
            this.sizedTo = options.sizedTo
        }

        getBackColName() {
            return this.backName
        }
        getType() {
            return ColumnType.unknown;
        }
    };
}

exports.hackFunction = hackFunction;

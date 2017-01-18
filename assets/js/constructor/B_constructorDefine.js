var currentVersion = 1;
// extends function (copy from typescript, which can resolve Object.name)
var __extends = (this && this.__extends) || function (d, b, methods) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    for (var method in methods) {
        d.prototype[method] = methods[method];
    }
};

var __isCurrentVersion = function(options) {
    return (options == null ||
            options.version == null ||
            options.version === currentVersion);
};
var __isOldVersion = function(options, constructorVersion) {
    // check if the version is one before the constructorVersion
    return (options != null &&
            options.version != null &&
            options.version === (constructorVersion - 1));
};

var __getConstructor = function(constructorName, version) {
    var suffix = "";
    if (version != null && version !== currentVersion) {
        suffix = "V" + version;
    }

    return window[constructorName + suffix];
};
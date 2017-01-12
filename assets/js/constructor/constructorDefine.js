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
var antlr4 = require('antlr4/index');
var SqlBaseParser = require("./SqlBaseParser.js").SqlBaseParser;
var SqlBaseVisitor = require('./SqlBaseVisitor.js').SqlBaseVisitor;
function TableVisitor() {
    SqlBaseVisitor.call(this);
    this.tableIdentifiers = new Set();
    this.namedQueries = [];
    return this;
};

TableVisitor.prototype = Object.create(SqlBaseVisitor.prototype);
TableVisitor.prototype.constructor = TableVisitor;
TableVisitor.prototype.visitTables = function(ctx) {
    // implement logic to determine which function to visit
    // then call next function and with the right context
    if (ctx instanceof SqlBaseParser.TableIdentifierContext) {
        this.tableIdentifiers.add(ctx.getText());
    } else if (ctx instanceof SqlBaseParser.NamedQueryContext) {
        if (ctx.children[0] instanceof SqlBaseParser.IdentifierContext) {
            this.namedQueries.push(ctx.children[0].getText());
        } else {
            throw "failed";
        }
    }
    if (ctx.children) {
        for (var i = 0; i < ctx.children.length; i++) {
            this.visitTables(ctx.children[i]);
        }
    }
};
TableVisitor.prototype.getNewQuery = function(ctx, tablePrefix) {
    var text = "";
    if (ctx.children) {
        for (var i = 0; i < ctx.children.length; i++) {
            var childText = this.getNewQuery(ctx.children[i], tablePrefix);
            text += childText + " ";
        }
        text = text.substring(0, text.length -1);
    } else {
        text = ctx.getText();
    }
    if (ctx instanceof SqlBaseParser.TableIdentifierContext &&
        this.namedQueries.indexOf(ctx.getText()) === -1) {
        text = tablePrefix + ctx.getText();
    }
    return text;
};
exports.TableVisitor = TableVisitor;
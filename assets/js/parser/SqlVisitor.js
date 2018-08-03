var SqlBaseVisitor = require('./base/SqlBaseVisitor.js').SqlBaseVisitor;
var SqlBaseParser = require('./base/SqlBaseParser.js').SqlBaseParser;
class SqlVisitor extends SqlBaseVisitor{
    constructor() {
        super();
        this.tableIdentifiers = new Set();
        this.namedQueries = [];
        this.statements = [];
    }
    visitTables(ctx) {
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
            for (let i = 0; i < ctx.children.length; i++) {
                this.visitTables(ctx.children[i]);
            }
        }
    };
    visitStatements(ctx) {
        if (ctx instanceof SqlBaseParser.StatementContext) {
            if (ctx.getText()) {
                this.statements.push(this.__getTextWithSpace(ctx).trim());
            }
        }
        if (ctx.children) {
            for (let i = 0; i < ctx.children.length; i++) {
                this.visitStatements(ctx.children[i]);
            }
        }
    };
    __getTextWithSpace(ctx) {
        var self = this;
        if (ctx.getChildCount() === 0) {
            return ctx.getText();
        } else {
            return ctx.children.map(function(child) {
                return self.__getTextWithSpace(child);
            }).join(" ");
        }
    };
}
if (typeof exports !== "undefined") {
    exports.SqlVisitor = SqlVisitor;
}
var SqlBaseVisitor = require('./base/SqlBaseVisitor.js').SqlBaseVisitor;
var SqlBaseParser = require('./base/SqlBaseParser.js').SqlBaseParser;
class SqlVisitor extends SqlBaseVisitor{
    constructor() {
        super();
        this.tableIdentifiers = new Set();
        this.namedQueries = [];
        this.statements = [];
        this.sqlFunctions = {};
        this.funcStructMap = {};
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
    getFunctions(ctx) {
        var self = this;
        if (ctx instanceof SqlBaseParser.TableIdentifierWithFuncContext) {
            if (ctx.getText().indexOf("(") === -1) {
                return ctx.getText();
            }
            this.sqlFunctions[ctx.getText()] = this.__getFunctionStruct(ctx);
            return this.sqlFunctions[ctx.getText()].newTableName;
        } else if (ctx.getChildCount() === 0) {
            return ctx.getText();
        } else if (ctx.children) {
            return ctx.children.map(function(child) {
                return self.getFunctions(child);
            }).join(" ");
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
    __getFunctionStruct(ctx) {
        var self = this;
        if (self.funcStructMap[ctx.getText()]) {
            return self.funcStructMap[ctx.getText()];
        }
        var retStruct = {funcName: undefined, arguments: [], newTableName: undefined};
        retStruct.newTableName = "SQL_DF_TMP" + Authentication.getHashId().toUpperCase();
        for (var i = 0; i < ctx.children.length; i++) {
            if (ctx.children[i] instanceof SqlBaseParser.SqlFuncIdentifierContext) {
                retStruct.funcName = ctx.children[i].getText();
            } else if (ctx.children[i] instanceof
                            SqlBaseParser.TableIdentifierWithFuncContext) {
                if (ctx.children[i].getText().indexOf("(") === -1) {
                    retStruct.arguments[ctx.children[i].getText()]
                                                = ctx.children[i].getText();
                } else {
                    retStruct.arguments[ctx.children[i].getText()]
                                    = self.__getFunctionStruct(ctx.children[i]);
                }
            }
        }
        self.funcStructMap[ctx.getText()] = retStruct;
        return retStruct;
    };
}
if (typeof exports !== "undefined") {
    exports.SqlVisitor = SqlVisitor;
}
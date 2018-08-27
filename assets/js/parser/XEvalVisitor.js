var XEvalBaseVisitor = require('./base/XEvalBaseVisitor.js').XEvalBaseVisitor;
var XEvalBaseParser = require('./base/XEvalBaseParser.js').XEvalBaseParser;

class XEvalVisitor extends XEvalBaseVisitor{
    constructor() {
        super();
        this.expressions = [];
        this.fns = [];
        this.func = {fnName: "", args: [], type: "fn"};
    }

    parseEvalStr(ctx) {
        if (ctx instanceof XEvalBaseParser.ExprContext) {
            parseEvalStrHelper(ctx, this.func);
            return this.func.args[0];
        } else {
            return this.func;
        }

        function parseEvalStrHelper(ctx, func) {
            if (ctx instanceof XEvalBaseParser.ExprContext) {
                const newFunc = {
                    fnName: "",
                    args: [],
                    type: "fn"
                };
                func.args.push(newFunc);
                func = newFunc;

                for (i = 0; i < ctx.children.length; i++) {
                    const child = ctx.children[i];
                    if (child instanceof XEvalBaseParser.FnContext) {
                        func.fnName = child.getText();
                        break;
                    }
                }
            }
            if (ctx.children) {
                for (var i = 0; i < ctx.children.length; i++) {
                    parseEvalStrHelper(ctx.children[i], func);
                }
            } else if (!(ctx.parentCtx instanceof XEvalBaseParser.FnArgsContext ||
                ctx.parentCtx instanceof XEvalBaseParser.ExprContext ||
                ctx.parentCtx instanceof XEvalBaseParser.FnNameContext)) {
                let value = ctx.getText();
                let type = getArgType(ctx);
                const numArgs = func.args.length;
                if (type === "colName" &&
                    numArgs > 1 &&
                    func.args[numArgs - 1].type === "columnArg" &&
                    func.args[numArgs - 1].value === "::" &&
                    func.args[numArgs - 2].type === "prefix") {
                    // we want to change ["prefix", "::", "colName"] into
                    // ["prefix::colName"]
                    value = func.args.pop().value + value;
                    value = func.args.pop().value + value;
                } else if ((type === "propertyName" || value === "]" && type != "stringLiteral") && numArgs > 1) {
                    // we want to change ["a", ".", "b"] into
                    // ["a.b"]
                    while (func.args.length && func.args[func.args.length - 1].type !== "colName") {
                        value = func.args.pop().value + value;
                    }
                    if (func.args.length && func.args[func.args.length - 1].type === "colName") {
                        value = func.args.pop().value + value;
                    }
                    type = "colName";
                }
                func.args.push({
                    value: value,
                    type: type
                });
            }
            return func;
        }
        function getArgType(ctx) {
                let argType = ctx.parentCtx.parser.ruleNames[ctx.parentCtx.ruleIndex];
                const value = ctx.getText();
                if (argType === "arg") {
                    if (value.length > 1 && ((value.charAt(0) === "\"" &&
                    value.charAt(value.length - 1) === "\"") || (value.charAt(0) === "'" &&
                    value.charAt(value.length - 1) === "'"))) {
                        argType = "string";
                    } else {
                        if (value.indexOf(".") > -1) {
                            argType = "float";
                        } else {
                            argType = "integer";
                        }
                    }
                } else if (argType === "colName" && value === "None") {
                    argType = "None";
                }
            return argType;
        }
    };

    visitExpr(ctx) {
        if (ctx instanceof XEvalBaseParser.ExprContext) {
            if (ctx.getText()) {
                this.expressions.push(this.__getTextWithSpace(ctx).trim());
            }
        }
        if (ctx.children) {
            for (let i = 0; i < ctx.children.length; i++) {
                this.visitExpr(ctx.children[i]);
            }
        }
    };

    visitFn(ctx) {
        if (ctx instanceof XEvalBaseParser.FnContext) {
            if (ctx.getText()) {
                this.fns.push(this.__getTextWithSpace(ctx).trim());
            }
        }
        if (ctx.children) {
            for (let i = 0; i < ctx.children.length; i++) {
                this.visitFn(ctx.children[i]);
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
    exports.XEvalVisitor = XEvalVisitor;
}
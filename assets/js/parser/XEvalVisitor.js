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
            } else if (ctx instanceof XEvalBaseParser.ArgContext &&
                !(ctx.children[0] instanceof XEvalBaseParser.ExprContext)) {

                const child = ctx.children[0];
                let value = child.getText();
                let type = child.parser.ruleNames[child.ruleIndex];
                if (type === "columnArg" && value.toUpperCase() === "NONE") {
                    type = "None";
                }
                func.args.push({
                    value: value,
                    type: type
                });
                return;
            }

            if (ctx.children) {
                for (var i = 0; i < ctx.children.length; i++) {
                    parseEvalStrHelper(ctx.children[i], func);
                }
            }

            return func;
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
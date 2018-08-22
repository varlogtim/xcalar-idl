// Generated from XEvalBase.g4 by ANTLR 4.7.1
// jshint ignore: start
var antlr4 = require('antlr4/index');

// This class defines a complete generic visitor for a parse tree produced by XEvalBaseParser.

function XEvalBaseVisitor() {
	antlr4.tree.ParseTreeVisitor.call(this);
	return this;
}

XEvalBaseVisitor.prototype = Object.create(antlr4.tree.ParseTreeVisitor.prototype);
XEvalBaseVisitor.prototype.constructor = XEvalBaseVisitor;

// Visit a parse tree produced by XEvalBaseParser#query.
XEvalBaseVisitor.prototype.visitQuery = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#expr.
XEvalBaseVisitor.prototype.visitExpr = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#fnArgs.
XEvalBaseVisitor.prototype.visitFnArgs = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#value.
XEvalBaseVisitor.prototype.visitValue = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#fn.
XEvalBaseVisitor.prototype.visitFn = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#moduleName.
XEvalBaseVisitor.prototype.visitModuleName = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#fnName.
XEvalBaseVisitor.prototype.visitFnName = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#varName.
XEvalBaseVisitor.prototype.visitVarName = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#prefix.
XEvalBaseVisitor.prototype.visitPrefix = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#colName.
XEvalBaseVisitor.prototype.visitColName = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#booleanValue.
XEvalBaseVisitor.prototype.visitBooleanValue = function(ctx) {
  return this.visitChildren(ctx);
};



exports.XEvalBaseVisitor = XEvalBaseVisitor;
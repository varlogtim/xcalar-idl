// Generated from XEval.g4 by ANTLR 4.7.1
// jshint ignore: start
var antlr4 = require('antlr4/index');

// This class defines a complete generic visitor for a parse tree produced by XEvalParser.

function XEvalVisitor() {
	antlr4.tree.ParseTreeVisitor.call(this);
	return this;
}

XEvalVisitor.prototype = Object.create(antlr4.tree.ParseTreeVisitor.prototype);
XEvalVisitor.prototype.constructor = XEvalVisitor;

// Visit a parse tree produced by XEvalParser#query.
XEvalVisitor.prototype.visitQuery = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalParser#expr.
XEvalVisitor.prototype.visitExpr = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalParser#fnArgs.
XEvalVisitor.prototype.visitFnArgs = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalParser#value.
XEvalVisitor.prototype.visitValue = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalParser#fn.
XEvalVisitor.prototype.visitFn = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalParser#moduleName.
XEvalVisitor.prototype.visitModuleName = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalParser#fnName.
XEvalVisitor.prototype.visitFnName = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalParser#varName.
XEvalVisitor.prototype.visitVarName = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalParser#prefix.
XEvalVisitor.prototype.visitPrefix = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalParser#colName.
XEvalVisitor.prototype.visitColName = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalParser#booleanValue.
XEvalVisitor.prototype.visitBooleanValue = function(ctx) {
  return this.visitChildren(ctx);
};



exports.XEvalVisitor = XEvalVisitor;
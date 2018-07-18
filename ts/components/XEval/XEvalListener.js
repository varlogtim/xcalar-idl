// Generated from XEval.g4 by ANTLR 4.7.1
// jshint ignore: start
var antlr4 = require('antlr4/index');

// This class defines a complete listener for a parse tree produced by XEvalParser.
function XEvalListener() {
	antlr4.tree.ParseTreeListener.call(this);
	return this;
}

XEvalListener.prototype = Object.create(antlr4.tree.ParseTreeListener.prototype);
XEvalListener.prototype.constructor = XEvalListener;

// Enter a parse tree produced by XEvalParser#query.
XEvalListener.prototype.enterQuery = function(ctx) {
};

// Exit a parse tree produced by XEvalParser#query.
XEvalListener.prototype.exitQuery = function(ctx) {
};


// Enter a parse tree produced by XEvalParser#expr.
XEvalListener.prototype.enterExpr = function(ctx) {
};

// Exit a parse tree produced by XEvalParser#expr.
XEvalListener.prototype.exitExpr = function(ctx) {
};


// Enter a parse tree produced by XEvalParser#fnArgs.
XEvalListener.prototype.enterFnArgs = function(ctx) {
};

// Exit a parse tree produced by XEvalParser#fnArgs.
XEvalListener.prototype.exitFnArgs = function(ctx) {
};


// Enter a parse tree produced by XEvalParser#value.
XEvalListener.prototype.enterValue = function(ctx) {
};

// Exit a parse tree produced by XEvalParser#value.
XEvalListener.prototype.exitValue = function(ctx) {
};


// Enter a parse tree produced by XEvalParser#fn.
XEvalListener.prototype.enterFn = function(ctx) {
};

// Exit a parse tree produced by XEvalParser#fn.
XEvalListener.prototype.exitFn = function(ctx) {
};


// Enter a parse tree produced by XEvalParser#moduleName.
XEvalListener.prototype.enterModuleName = function(ctx) {
};

// Exit a parse tree produced by XEvalParser#moduleName.
XEvalListener.prototype.exitModuleName = function(ctx) {
};


// Enter a parse tree produced by XEvalParser#fnName.
XEvalListener.prototype.enterFnName = function(ctx) {
};

// Exit a parse tree produced by XEvalParser#fnName.
XEvalListener.prototype.exitFnName = function(ctx) {
};


// Enter a parse tree produced by XEvalParser#varName.
XEvalListener.prototype.enterVarName = function(ctx) {
};

// Exit a parse tree produced by XEvalParser#varName.
XEvalListener.prototype.exitVarName = function(ctx) {
};


// Enter a parse tree produced by XEvalParser#prefix.
XEvalListener.prototype.enterPrefix = function(ctx) {
};

// Exit a parse tree produced by XEvalParser#prefix.
XEvalListener.prototype.exitPrefix = function(ctx) {
};


// Enter a parse tree produced by XEvalParser#colName.
XEvalListener.prototype.enterColName = function(ctx) {
};

// Exit a parse tree produced by XEvalParser#colName.
XEvalListener.prototype.exitColName = function(ctx) {
};


// Enter a parse tree produced by XEvalParser#booleanValue.
XEvalListener.prototype.enterBooleanValue = function(ctx) {
};

// Exit a parse tree produced by XEvalParser#booleanValue.
XEvalListener.prototype.exitBooleanValue = function(ctx) {
};



exports.XEvalListener = XEvalListener;
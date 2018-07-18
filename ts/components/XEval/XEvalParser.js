// Generated from XEval.g4 by ANTLR 4.7.1
// jshint ignore: start
var antlr4 = require('antlr4/index');
var XEvalListener = require('./XEvalListener').XEvalListener;
var XEvalVisitor = require('./XEvalVisitor').XEvalVisitor;


import re as regex

var grammarFileName = "XEval.g4";

var serializedATN = ["\u0003\u608b\ua72a\u8133\ub9ed\u417c\u3be7\u7786\u5964",
    "\u0003\u000fR\u0004\u0002\t\u0002\u0004\u0003\t\u0003\u0004\u0004\t",
    "\u0004\u0004\u0005\t\u0005\u0004\u0006\t\u0006\u0004\u0007\t\u0007\u0004",
    "\b\t\b\u0004\t\t\t\u0004\n\t\n\u0004\u000b\t\u000b\u0004\f\t\f\u0003",
    "\u0002\u0003\u0002\u0003\u0002\u0003\u0003\u0003\u0003\u0003\u0003\u0003",
    "\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0005",
    "\u0003%\n\u0003\u0003\u0004\u0003\u0004\u0003\u0004\u0003\u0004\u0003",
    "\u0004\u0005\u0004,\n\u0004\u0003\u0005\u0003\u0005\u0003\u0005\u0003",
    "\u0005\u0003\u0005\u0003\u0005\u0005\u00054\n\u0005\u0003\u0006\u0003",
    "\u0006\u0003\u0006\u0003\u0006\u0003\u0006\u0005\u0006;\n\u0006\u0003",
    "\u0007\u0003\u0007\u0003\u0007\u0003\b\u0003\b\u0003\b\u0003\t\u0003",
    "\t\u0003\t\u0003\t\u0003\t\u0005\tH\n\t\u0003\n\u0003\n\u0003\n\u0003",
    "\u000b\u0003\u000b\u0003\u000b\u0003\f\u0003\f\u0003\f\u0002\u0002\r",
    "\u0002\u0004\u0006\b\n\f\u000e\u0010\u0012\u0014\u0016\u0002\u0003\u0003",
    "\u0002\u0003\u0004\u0002O\u0002\u0018\u0003\u0002\u0002\u0002\u0004",
    "$\u0003\u0002\u0002\u0002\u0006+\u0003\u0002\u0002\u0002\b3\u0003\u0002",
    "\u0002\u0002\n:\u0003\u0002\u0002\u0002\f<\u0003\u0002\u0002\u0002\u000e",
    "?\u0003\u0002\u0002\u0002\u0010G\u0003\u0002\u0002\u0002\u0012I\u0003",
    "\u0002\u0002\u0002\u0014L\u0003\u0002\u0002\u0002\u0016O\u0003\u0002",
    "\u0002\u0002\u0018\u0019\u0005\u0004\u0003\u0002\u0019\u001a\u0007\u0002",
    "\u0002\u0003\u001a\u0003\u0003\u0002\u0002\u0002\u001b\u001c\u0005\n",
    "\u0006\u0002\u001c\u001d\u0007\b\u0002\u0002\u001d\u001e\u0005\u0006",
    "\u0004\u0002\u001e\u001f\u0007\t\u0002\u0002\u001f%\u0003\u0002\u0002",
    "\u0002 !\u0005\n\u0006\u0002!\"\u0007\b\u0002\u0002\"#\u0007\t\u0002",
    "\u0002#%\u0003\u0002\u0002\u0002$\u001b\u0003\u0002\u0002\u0002$ \u0003",
    "\u0002\u0002\u0002%\u0005\u0003\u0002\u0002\u0002&\'\u0005\b\u0005\u0002",
    "\'(\u0007\u0007\u0002\u0002()\u0005\u0006\u0004\u0002),\u0003\u0002",
    "\u0002\u0002*,\u0005\b\u0005\u0002+&\u0003\u0002\u0002\u0002+*\u0003",
    "\u0002\u0002\u0002,\u0007\u0003\u0002\u0002\u0002-4\u0005\u0004\u0003",
    "\u0002.4\u0007\u000b\u0002\u0002/4\u0007\n\u0002\u000204\u0005\u0016",
    "\f\u000214\u0007\f\u0002\u000224\u0005\u0010\t\u00023-\u0003\u0002\u0002",
    "\u00023.\u0003\u0002\u0002\u00023/\u0003\u0002\u0002\u000230\u0003\u0002",
    "\u0002\u000231\u0003\u0002\u0002\u000232\u0003\u0002\u0002\u00024\t",
    "\u0003\u0002\u0002\u000256\u0005\f\u0007\u000267\u0007\u0005\u0002\u0002",
    "78\u0005\u000e\b\u00028;\u0003\u0002\u0002\u00029;\u0005\u000e\b\u0002",
    ":5\u0003\u0002\u0002\u0002:9\u0003\u0002\u0002\u0002;\u000b\u0003\u0002",
    "\u0002\u0002<=\u0007\r\u0002\u0002=>\b\u0007\u0001\u0002>\r\u0003\u0002",
    "\u0002\u0002?@\u0007\r\u0002\u0002@A\b\b\u0001\u0002A\u000f\u0003\u0002",
    "\u0002\u0002BC\u0005\u0012\n\u0002CD\u0007\u0006\u0002\u0002DE\u0005",
    "\u0014\u000b\u0002EH\u0003\u0002\u0002\u0002FH\u0005\u0014\u000b\u0002",
    "GB\u0003\u0002\u0002\u0002GF\u0003\u0002\u0002\u0002H\u0011\u0003\u0002",
    "\u0002\u0002IJ\u0007\r\u0002\u0002JK\b\n\u0001\u0002K\u0013\u0003\u0002",
    "\u0002\u0002LM\u0007\r\u0002\u0002MN\b\u000b\u0001\u0002N\u0015\u0003",
    "\u0002\u0002\u0002OP\t\u0002\u0002\u0002P\u0017\u0003\u0002\u0002\u0002",
    "\u0007$+3:G"].join("");


var atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

var decisionsToDFA = atn.decisionToState.map( function(ds, index) { return new antlr4.dfa.DFA(ds, index); });

var sharedContextCache = new antlr4.PredictionContextCache();

var literalNames = [ null, null, null, "':'", "'::'", "','", "'('", "')'" ];

var symbolicNames = [ null, "TRUE", "FALSE", "COLON", "DOUBLECOLON", "COMMA", 
                      "LPARENS", "RPARENS", "DECIMAL", "INTEGER", "STRING", 
                      "IDENTIFIER", "WS", "UNRECOGNIZED" ];

var ruleNames =  [ "query", "expr", "fnArgs", "value", "fn", "moduleName", 
                   "fnName", "varName", "prefix", "colName", "booleanValue" ];

function XEvalParser (input) {
	antlr4.Parser.call(this, input);
    this._interp = new antlr4.atn.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
    this.ruleNames = ruleNames;
    this.literalNames = literalNames;
    this.symbolicNames = symbolicNames;
    return this;
}

XEvalParser.prototype = Object.create(antlr4.Parser.prototype);
XEvalParser.prototype.constructor = XEvalParser;

Object.defineProperty(XEvalParser.prototype, "atn", {
	get : function() {
		return atn;
	}
});

XEvalParser.EOF = antlr4.Token.EOF;
XEvalParser.TRUE = 1;
XEvalParser.FALSE = 2;
XEvalParser.COLON = 3;
XEvalParser.DOUBLECOLON = 4;
XEvalParser.COMMA = 5;
XEvalParser.LPARENS = 6;
XEvalParser.RPARENS = 7;
XEvalParser.DECIMAL = 8;
XEvalParser.INTEGER = 9;
XEvalParser.STRING = 10;
XEvalParser.IDENTIFIER = 11;
XEvalParser.WS = 12;
XEvalParser.UNRECOGNIZED = 13;

XEvalParser.RULE_query = 0;
XEvalParser.RULE_expr = 1;
XEvalParser.RULE_fnArgs = 2;
XEvalParser.RULE_value = 3;
XEvalParser.RULE_fn = 4;
XEvalParser.RULE_moduleName = 5;
XEvalParser.RULE_fnName = 6;
XEvalParser.RULE_varName = 7;
XEvalParser.RULE_prefix = 8;
XEvalParser.RULE_colName = 9;
XEvalParser.RULE_booleanValue = 10;

function QueryContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalParser.RULE_query;
    return this;
}

QueryContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
QueryContext.prototype.constructor = QueryContext;

QueryContext.prototype.expr = function() {
    return this.getTypedRuleContext(ExprContext,0);
};

QueryContext.prototype.EOF = function() {
    return this.getToken(XEvalParser.EOF, 0);
};

QueryContext.prototype.enterRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.enterQuery(this);
	}
};

QueryContext.prototype.exitRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.exitQuery(this);
	}
};

QueryContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalVisitor ) {
        return visitor.visitQuery(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalParser.QueryContext = QueryContext;

XEvalParser.prototype.query = function() {

    var localctx = new QueryContext(this, this._ctx, this.state);
    this.enterRule(localctx, 0, XEvalParser.RULE_query);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 22;
        this.expr();
        this.state = 23;
        this.match(XEvalParser.EOF);
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function ExprContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalParser.RULE_expr;
    return this;
}

ExprContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ExprContext.prototype.constructor = ExprContext;

ExprContext.prototype.fn = function() {
    return this.getTypedRuleContext(FnContext,0);
};

ExprContext.prototype.LPARENS = function() {
    return this.getToken(XEvalParser.LPARENS, 0);
};

ExprContext.prototype.fnArgs = function() {
    return this.getTypedRuleContext(FnArgsContext,0);
};

ExprContext.prototype.RPARENS = function() {
    return this.getToken(XEvalParser.RPARENS, 0);
};

ExprContext.prototype.enterRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.enterExpr(this);
	}
};

ExprContext.prototype.exitRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.exitExpr(this);
	}
};

ExprContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalVisitor ) {
        return visitor.visitExpr(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalParser.ExprContext = ExprContext;

XEvalParser.prototype.expr = function() {

    var localctx = new ExprContext(this, this._ctx, this.state);
    this.enterRule(localctx, 2, XEvalParser.RULE_expr);
    try {
        this.state = 34;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,0,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 25;
            this.fn();
            this.state = 26;
            this.match(XEvalParser.LPARENS);
            this.state = 27;
            this.fnArgs();
            this.state = 28;
            this.match(XEvalParser.RPARENS);
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 30;
            this.fn();
            this.state = 31;
            this.match(XEvalParser.LPARENS);
            this.state = 32;
            this.match(XEvalParser.RPARENS);
            break;

        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function FnArgsContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalParser.RULE_fnArgs;
    return this;
}

FnArgsContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
FnArgsContext.prototype.constructor = FnArgsContext;

FnArgsContext.prototype.value = function() {
    return this.getTypedRuleContext(ValueContext,0);
};

FnArgsContext.prototype.COMMA = function() {
    return this.getToken(XEvalParser.COMMA, 0);
};

FnArgsContext.prototype.fnArgs = function() {
    return this.getTypedRuleContext(FnArgsContext,0);
};

FnArgsContext.prototype.enterRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.enterFnArgs(this);
	}
};

FnArgsContext.prototype.exitRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.exitFnArgs(this);
	}
};

FnArgsContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalVisitor ) {
        return visitor.visitFnArgs(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalParser.FnArgsContext = FnArgsContext;

XEvalParser.prototype.fnArgs = function() {

    var localctx = new FnArgsContext(this, this._ctx, this.state);
    this.enterRule(localctx, 4, XEvalParser.RULE_fnArgs);
    try {
        this.state = 41;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,1,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 36;
            this.value();
            this.state = 37;
            this.match(XEvalParser.COMMA);
            this.state = 38;
            this.fnArgs();
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 40;
            this.value();
            break;

        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function ValueContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalParser.RULE_value;
    return this;
}

ValueContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ValueContext.prototype.constructor = ValueContext;

ValueContext.prototype.expr = function() {
    return this.getTypedRuleContext(ExprContext,0);
};

ValueContext.prototype.INTEGER = function() {
    return this.getToken(XEvalParser.INTEGER, 0);
};

ValueContext.prototype.DECIMAL = function() {
    return this.getToken(XEvalParser.DECIMAL, 0);
};

ValueContext.prototype.booleanValue = function() {
    return this.getTypedRuleContext(BooleanValueContext,0);
};

ValueContext.prototype.STRING = function() {
    return this.getToken(XEvalParser.STRING, 0);
};

ValueContext.prototype.varName = function() {
    return this.getTypedRuleContext(VarNameContext,0);
};

ValueContext.prototype.enterRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.enterValue(this);
	}
};

ValueContext.prototype.exitRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.exitValue(this);
	}
};

ValueContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalVisitor ) {
        return visitor.visitValue(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalParser.ValueContext = ValueContext;

XEvalParser.prototype.value = function() {

    var localctx = new ValueContext(this, this._ctx, this.state);
    this.enterRule(localctx, 6, XEvalParser.RULE_value);
    try {
        this.state = 49;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,2,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 43;
            this.expr();
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 44;
            this.match(XEvalParser.INTEGER);
            break;

        case 3:
            this.enterOuterAlt(localctx, 3);
            this.state = 45;
            this.match(XEvalParser.DECIMAL);
            break;

        case 4:
            this.enterOuterAlt(localctx, 4);
            this.state = 46;
            this.booleanValue();
            break;

        case 5:
            this.enterOuterAlt(localctx, 5);
            this.state = 47;
            this.match(XEvalParser.STRING);
            break;

        case 6:
            this.enterOuterAlt(localctx, 6);
            this.state = 48;
            this.varName();
            break;

        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function FnContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalParser.RULE_fn;
    return this;
}

FnContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
FnContext.prototype.constructor = FnContext;

FnContext.prototype.moduleName = function() {
    return this.getTypedRuleContext(ModuleNameContext,0);
};

FnContext.prototype.COLON = function() {
    return this.getToken(XEvalParser.COLON, 0);
};

FnContext.prototype.fnName = function() {
    return this.getTypedRuleContext(FnNameContext,0);
};

FnContext.prototype.enterRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.enterFn(this);
	}
};

FnContext.prototype.exitRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.exitFn(this);
	}
};

FnContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalVisitor ) {
        return visitor.visitFn(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalParser.FnContext = FnContext;

XEvalParser.prototype.fn = function() {

    var localctx = new FnContext(this, this._ctx, this.state);
    this.enterRule(localctx, 8, XEvalParser.RULE_fn);
    try {
        this.state = 56;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,3,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 51;
            this.moduleName();
            this.state = 52;
            this.match(XEvalParser.COLON);
            this.state = 53;
            this.fnName();
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 55;
            this.fnName();
            break;

        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function ModuleNameContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalParser.RULE_moduleName;
    this._IDENTIFIER = null; // Token
    return this;
}

ModuleNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ModuleNameContext.prototype.constructor = ModuleNameContext;

ModuleNameContext.prototype.IDENTIFIER = function() {
    return this.getToken(XEvalParser.IDENTIFIER, 0);
};

ModuleNameContext.prototype.enterRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.enterModuleName(this);
	}
};

ModuleNameContext.prototype.exitRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.exitModuleName(this);
	}
};

ModuleNameContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalVisitor ) {
        return visitor.visitModuleName(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalParser.ModuleNameContext = ModuleNameContext;

XEvalParser.prototype.moduleName = function() {

    var localctx = new ModuleNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 10, XEvalParser.RULE_moduleName);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 58;
        localctx._IDENTIFIER = this.match(XEvalParser.IDENTIFIER);
        if not regex.fullmatch('[a-z_][a-zA-Z0-9_-]*', (localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text)):
            raise SyntaxError('Invalid module name: ' + (localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text))
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function FnNameContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalParser.RULE_fnName;
    this._IDENTIFIER = null; // Token
    return this;
}

FnNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
FnNameContext.prototype.constructor = FnNameContext;

FnNameContext.prototype.IDENTIFIER = function() {
    return this.getToken(XEvalParser.IDENTIFIER, 0);
};

FnNameContext.prototype.enterRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.enterFnName(this);
	}
};

FnNameContext.prototype.exitRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.exitFnName(this);
	}
};

FnNameContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalVisitor ) {
        return visitor.visitFnName(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalParser.FnNameContext = FnNameContext;

XEvalParser.prototype.fnName = function() {

    var localctx = new FnNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 12, XEvalParser.RULE_fnName);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 61;
        localctx._IDENTIFIER = this.match(XEvalParser.IDENTIFIER);
        if not regex.fullmatch('[a-z_][a-zA-Z0-9_]*', (localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text)):
            raise SyntaxError('Invalid udf name: ' + (localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text))
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function VarNameContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalParser.RULE_varName;
    return this;
}

VarNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
VarNameContext.prototype.constructor = VarNameContext;

VarNameContext.prototype.prefix = function() {
    return this.getTypedRuleContext(PrefixContext,0);
};

VarNameContext.prototype.DOUBLECOLON = function() {
    return this.getToken(XEvalParser.DOUBLECOLON, 0);
};

VarNameContext.prototype.colName = function() {
    return this.getTypedRuleContext(ColNameContext,0);
};

VarNameContext.prototype.enterRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.enterVarName(this);
	}
};

VarNameContext.prototype.exitRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.exitVarName(this);
	}
};

VarNameContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalVisitor ) {
        return visitor.visitVarName(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalParser.VarNameContext = VarNameContext;

XEvalParser.prototype.varName = function() {

    var localctx = new VarNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 14, XEvalParser.RULE_varName);
    try {
        this.state = 69;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,4,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 64;
            this.prefix();
            this.state = 65;
            this.match(XEvalParser.DOUBLECOLON);
            this.state = 66;
            this.colName();
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 68;
            this.colName();
            break;

        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function PrefixContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalParser.RULE_prefix;
    this._IDENTIFIER = null; // Token
    return this;
}

PrefixContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
PrefixContext.prototype.constructor = PrefixContext;

PrefixContext.prototype.IDENTIFIER = function() {
    return this.getToken(XEvalParser.IDENTIFIER, 0);
};

PrefixContext.prototype.enterRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.enterPrefix(this);
	}
};

PrefixContext.prototype.exitRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.exitPrefix(this);
	}
};

PrefixContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalVisitor ) {
        return visitor.visitPrefix(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalParser.PrefixContext = PrefixContext;

XEvalParser.prototype.prefix = function() {

    var localctx = new PrefixContext(this, this._ctx, this.state);
    this.enterRule(localctx, 16, XEvalParser.RULE_prefix);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 71;
        localctx._IDENTIFIER = this.match(XEvalParser.IDENTIFIER);
        if not regex.fullmatch('[a-zA-Z0-9_-]{1,31}', (localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text)):
            raise SyntaxError('Invalid prefix name: ' + (localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text))
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function ColNameContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalParser.RULE_colName;
    this._IDENTIFIER = null; // Token
    return this;
}

ColNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ColNameContext.prototype.constructor = ColNameContext;

ColNameContext.prototype.IDENTIFIER = function() {
    return this.getToken(XEvalParser.IDENTIFIER, 0);
};

ColNameContext.prototype.enterRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.enterColName(this);
	}
};

ColNameContext.prototype.exitRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.exitColName(this);
	}
};

ColNameContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalVisitor ) {
        return visitor.visitColName(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalParser.ColNameContext = ColNameContext;

XEvalParser.prototype.colName = function() {

    var localctx = new ColNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 18, XEvalParser.RULE_colName);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 74;
        localctx._IDENTIFIER = this.match(XEvalParser.IDENTIFIER);
        if not regex.fullmatch('(?!--.*)([a-zA-Z_^-](((?!--)[a-zA-Z0-9_^ -])*[a-zA-Z0-9_^-])?)', (localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text)):
            raise SyntaxError('Invalid column name: ' + (localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text))
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};

function BooleanValueContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalParser.RULE_booleanValue;
    return this;
}

BooleanValueContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
BooleanValueContext.prototype.constructor = BooleanValueContext;

BooleanValueContext.prototype.TRUE = function() {
    return this.getToken(XEvalParser.TRUE, 0);
};

BooleanValueContext.prototype.FALSE = function() {
    return this.getToken(XEvalParser.FALSE, 0);
};

BooleanValueContext.prototype.enterRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.enterBooleanValue(this);
	}
};

BooleanValueContext.prototype.exitRule = function(listener) {
    if(listener instanceof XEvalListener ) {
        listener.exitBooleanValue(this);
	}
};

BooleanValueContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalVisitor ) {
        return visitor.visitBooleanValue(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalParser.BooleanValueContext = BooleanValueContext;

XEvalParser.prototype.booleanValue = function() {

    var localctx = new BooleanValueContext(this, this._ctx, this.state);
    this.enterRule(localctx, 20, XEvalParser.RULE_booleanValue);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 77;
        _la = this._input.LA(1);
        if(!(_la===XEvalParser.TRUE || _la===XEvalParser.FALSE)) {
        this._errHandler.recoverInline(this);
        }
        else {
        	this._errHandler.reportMatch(this);
            this.consume();
        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


exports.XEvalParser = XEvalParser;

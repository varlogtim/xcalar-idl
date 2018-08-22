// Generated from XEvalBase.g4 by ANTLR 4.7.1
// jshint ignore: start
var antlr4 = require('antlr4/index');
var XEvalBaseVisitor = require('./XEvalBaseVisitor').XEvalBaseVisitor;

var grammarFileName = "XEvalBase.g4";

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

function XEvalBaseParser (input) {
	antlr4.Parser.call(this, input);
    this._interp = new antlr4.atn.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
    this.ruleNames = ruleNames;
    this.literalNames = literalNames;
    this.symbolicNames = symbolicNames;
    return this;
}

XEvalBaseParser.prototype = Object.create(antlr4.Parser.prototype);
XEvalBaseParser.prototype.constructor = XEvalBaseParser;

Object.defineProperty(XEvalBaseParser.prototype, "atn", {
	get : function() {
		return atn;
	}
});

XEvalBaseParser.EOF = antlr4.Token.EOF;
XEvalBaseParser.TRUE = 1;
XEvalBaseParser.FALSE = 2;
XEvalBaseParser.COLON = 3;
XEvalBaseParser.DOUBLECOLON = 4;
XEvalBaseParser.COMMA = 5;
XEvalBaseParser.LPARENS = 6;
XEvalBaseParser.RPARENS = 7;
XEvalBaseParser.DECIMAL = 8;
XEvalBaseParser.INTEGER = 9;
XEvalBaseParser.STRING = 10;
XEvalBaseParser.IDENTIFIER = 11;
XEvalBaseParser.WS = 12;
XEvalBaseParser.UNRECOGNIZED = 13;

XEvalBaseParser.RULE_query = 0;
XEvalBaseParser.RULE_expr = 1;
XEvalBaseParser.RULE_fnArgs = 2;
XEvalBaseParser.RULE_value = 3;
XEvalBaseParser.RULE_fn = 4;
XEvalBaseParser.RULE_moduleName = 5;
XEvalBaseParser.RULE_fnName = 6;
XEvalBaseParser.RULE_varName = 7;
XEvalBaseParser.RULE_prefix = 8;
XEvalBaseParser.RULE_colName = 9;
XEvalBaseParser.RULE_booleanValue = 10;

function QueryContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_query;
    return this;
}

QueryContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
QueryContext.prototype.constructor = QueryContext;

QueryContext.prototype.expr = function() {
    return this.getTypedRuleContext(ExprContext,0);
};

QueryContext.prototype.EOF = function() {
    return this.getToken(XEvalBaseParser.EOF, 0);
};

QueryContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitQuery(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.QueryContext = QueryContext;

XEvalBaseParser.prototype.query = function() {

    var localctx = new QueryContext(this, this._ctx, this.state);
    this.enterRule(localctx, 0, XEvalBaseParser.RULE_query);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 22;
        this.expr();
        this.state = 23;
        this.match(XEvalBaseParser.EOF);
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
    this.ruleIndex = XEvalBaseParser.RULE_expr;
    return this;
}

ExprContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ExprContext.prototype.constructor = ExprContext;

ExprContext.prototype.fn = function() {
    return this.getTypedRuleContext(FnContext,0);
};

ExprContext.prototype.LPARENS = function() {
    return this.getToken(XEvalBaseParser.LPARENS, 0);
};

ExprContext.prototype.fnArgs = function() {
    return this.getTypedRuleContext(FnArgsContext,0);
};

ExprContext.prototype.RPARENS = function() {
    return this.getToken(XEvalBaseParser.RPARENS, 0);
};

ExprContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitExpr(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.ExprContext = ExprContext;

XEvalBaseParser.prototype.expr = function() {

    var localctx = new ExprContext(this, this._ctx, this.state);
    this.enterRule(localctx, 2, XEvalBaseParser.RULE_expr);
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
            this.match(XEvalBaseParser.LPARENS);
            this.state = 27;
            this.fnArgs();
            this.state = 28;
            this.match(XEvalBaseParser.RPARENS);
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 30;
            this.fn();
            this.state = 31;
            this.match(XEvalBaseParser.LPARENS);
            this.state = 32;
            this.match(XEvalBaseParser.RPARENS);
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
    this.ruleIndex = XEvalBaseParser.RULE_fnArgs;
    return this;
}

FnArgsContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
FnArgsContext.prototype.constructor = FnArgsContext;

FnArgsContext.prototype.value = function() {
    return this.getTypedRuleContext(ValueContext,0);
};

FnArgsContext.prototype.COMMA = function() {
    return this.getToken(XEvalBaseParser.COMMA, 0);
};

FnArgsContext.prototype.fnArgs = function() {
    return this.getTypedRuleContext(FnArgsContext,0);
};

FnArgsContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitFnArgs(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.FnArgsContext = FnArgsContext;

XEvalBaseParser.prototype.fnArgs = function() {

    var localctx = new FnArgsContext(this, this._ctx, this.state);
    this.enterRule(localctx, 4, XEvalBaseParser.RULE_fnArgs);
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
            this.match(XEvalBaseParser.COMMA);
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
    this.ruleIndex = XEvalBaseParser.RULE_value;
    return this;
}

ValueContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ValueContext.prototype.constructor = ValueContext;

ValueContext.prototype.expr = function() {
    return this.getTypedRuleContext(ExprContext,0);
};

ValueContext.prototype.INTEGER = function() {
    return this.getToken(XEvalBaseParser.INTEGER, 0);
};

ValueContext.prototype.DECIMAL = function() {
    return this.getToken(XEvalBaseParser.DECIMAL, 0);
};

ValueContext.prototype.booleanValue = function() {
    return this.getTypedRuleContext(BooleanValueContext,0);
};

ValueContext.prototype.STRING = function() {
    return this.getToken(XEvalBaseParser.STRING, 0);
};

ValueContext.prototype.varName = function() {
    return this.getTypedRuleContext(VarNameContext,0);
};

ValueContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitValue(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.ValueContext = ValueContext;

XEvalBaseParser.prototype.value = function() {

    var localctx = new ValueContext(this, this._ctx, this.state);
    this.enterRule(localctx, 6, XEvalBaseParser.RULE_value);
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
            this.match(XEvalBaseParser.INTEGER);
            break;

        case 3:
            this.enterOuterAlt(localctx, 3);
            this.state = 45;
            this.match(XEvalBaseParser.DECIMAL);
            break;

        case 4:
            this.enterOuterAlt(localctx, 4);
            this.state = 46;
            this.booleanValue();
            break;

        case 5:
            this.enterOuterAlt(localctx, 5);
            this.state = 47;
            this.match(XEvalBaseParser.STRING);
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
    this.ruleIndex = XEvalBaseParser.RULE_fn;
    return this;
}

FnContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
FnContext.prototype.constructor = FnContext;

FnContext.prototype.moduleName = function() {
    return this.getTypedRuleContext(ModuleNameContext,0);
};

FnContext.prototype.COLON = function() {
    return this.getToken(XEvalBaseParser.COLON, 0);
};

FnContext.prototype.fnName = function() {
    return this.getTypedRuleContext(FnNameContext,0);
};

FnContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitFn(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.FnContext = FnContext;

XEvalBaseParser.prototype.fn = function() {

    var localctx = new FnContext(this, this._ctx, this.state);
    this.enterRule(localctx, 8, XEvalBaseParser.RULE_fn);
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
            this.match(XEvalBaseParser.COLON);
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
    this.ruleIndex = XEvalBaseParser.RULE_moduleName;
    this._IDENTIFIER = null; // Token
    return this;
}

ModuleNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ModuleNameContext.prototype.constructor = ModuleNameContext;

ModuleNameContext.prototype.IDENTIFIER = function() {
    return this.getToken(XEvalBaseParser.IDENTIFIER, 0);
};

ModuleNameContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitModuleName(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.ModuleNameContext = ModuleNameContext;

XEvalBaseParser.prototype.moduleName = function() {

    var localctx = new ModuleNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 10, XEvalBaseParser.RULE_moduleName);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 58;
        localctx._IDENTIFIER = this.match(XEvalBaseParser.IDENTIFIER);
        if ((localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text).match(/^[a-z_][a-zA-Z0-9_-]*$/) == null) {
            throw SyntaxError('Invalid module name: ' + (localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text));}
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
    this.ruleIndex = XEvalBaseParser.RULE_fnName;
    this._IDENTIFIER = null; // Token
    return this;
}

FnNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
FnNameContext.prototype.constructor = FnNameContext;

FnNameContext.prototype.IDENTIFIER = function() {
    return this.getToken(XEvalBaseParser.IDENTIFIER, 0);
};

FnNameContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitFnName(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.FnNameContext = FnNameContext;

XEvalBaseParser.prototype.fnName = function() {

    var localctx = new FnNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 12, XEvalBaseParser.RULE_fnName);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 61;
        localctx._IDENTIFIER = this.match(XEvalBaseParser.IDENTIFIER);
        if ((localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text).match(/^[a-z_][a-zA-Z0-9_]*$/) == null) {
            throw SyntaxError('Invalid udf name: ' + (localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text));}
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
    this.ruleIndex = XEvalBaseParser.RULE_varName;
    return this;
}

VarNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
VarNameContext.prototype.constructor = VarNameContext;

VarNameContext.prototype.prefix = function() {
    return this.getTypedRuleContext(PrefixContext,0);
};

VarNameContext.prototype.DOUBLECOLON = function() {
    return this.getToken(XEvalBaseParser.DOUBLECOLON, 0);
};

VarNameContext.prototype.colName = function() {
    return this.getTypedRuleContext(ColNameContext,0);
};

VarNameContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitVarName(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.VarNameContext = VarNameContext;

XEvalBaseParser.prototype.varName = function() {

    var localctx = new VarNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 14, XEvalBaseParser.RULE_varName);
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
            this.match(XEvalBaseParser.DOUBLECOLON);
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
    this.ruleIndex = XEvalBaseParser.RULE_prefix;
    this._IDENTIFIER = null; // Token
    return this;
}

PrefixContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
PrefixContext.prototype.constructor = PrefixContext;

PrefixContext.prototype.IDENTIFIER = function() {
    return this.getToken(XEvalBaseParser.IDENTIFIER, 0);
};

PrefixContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitPrefix(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.PrefixContext = PrefixContext;

XEvalBaseParser.prototype.prefix = function() {

    var localctx = new PrefixContext(this, this._ctx, this.state);
    this.enterRule(localctx, 16, XEvalBaseParser.RULE_prefix);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 71;
        localctx._IDENTIFIER = this.match(XEvalBaseParser.IDENTIFIER);
        if ((localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text).match(/^[a-zA-Z0-9_-]{1,31}$/) == null) {
            throw SyntaxError('Invalid prefix name: ' + (localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text));}
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
    this.ruleIndex = XEvalBaseParser.RULE_colName;
    this._IDENTIFIER = null; // Token
    return this;
}

ColNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ColNameContext.prototype.constructor = ColNameContext;

ColNameContext.prototype.IDENTIFIER = function() {
    return this.getToken(XEvalBaseParser.IDENTIFIER, 0);
};

ColNameContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitColName(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.ColNameContext = ColNameContext;

XEvalBaseParser.prototype.colName = function() {

    var localctx = new ColNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 18, XEvalBaseParser.RULE_colName);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 74;
        localctx._IDENTIFIER = this.match(XEvalBaseParser.IDENTIFIER);
        if ((localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text).match(/^(?!--.*)([a-zA-Z_^-](((?!--)[a-zA-Z0-9_^ -])*[a-zA-Z0-9_^-])?)$/) == null) {
            throw SyntaxError('Invalid column name: ' + (localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text));}
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
    this.ruleIndex = XEvalBaseParser.RULE_booleanValue;
    return this;
}

BooleanValueContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
BooleanValueContext.prototype.constructor = BooleanValueContext;

BooleanValueContext.prototype.TRUE = function() {
    return this.getToken(XEvalBaseParser.TRUE, 0);
};

BooleanValueContext.prototype.FALSE = function() {
    return this.getToken(XEvalBaseParser.FALSE, 0);
};

BooleanValueContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitBooleanValue(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.BooleanValueContext = BooleanValueContext;

XEvalBaseParser.prototype.booleanValue = function() {

    var localctx = new BooleanValueContext(this, this._ctx, this.state);
    this.enterRule(localctx, 20, XEvalBaseParser.RULE_booleanValue);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 77;
        _la = this._input.LA(1);
        if(!(_la===XEvalBaseParser.TRUE || _la===XEvalBaseParser.FALSE)) {
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


exports.XEvalBaseParser = XEvalBaseParser;

// Generated from XEvalBase.g4 by ANTLR 4.7.1
// jshint ignore: start
var antlr4 = require('antlr4/index');
var XEvalBaseVisitor = require('./XEvalBaseVisitor').XEvalBaseVisitor;

var grammarFileName = "XEvalBase.g4";

var serializedATN = ["\u0003\u608b\ua72a\u8133\ub9ed\u417c\u3be7\u7786\u5964",
    "\u0003\u0012t\u0004\u0002\t\u0002\u0004\u0003\t\u0003\u0004\u0004\t",
    "\u0004\u0004\u0005\t\u0005\u0004\u0006\t\u0006\u0004\u0007\t\u0007\u0004",
    "\b\t\b\u0004\t\t\t\u0004\n\t\n\u0004\u000b\t\u000b\u0004\f\t\f\u0004",
    "\r\t\r\u0004\u000e\t\u000e\u0004\u000f\t\u000f\u0004\u0010\t\u0010\u0004",
    "\u0011\t\u0011\u0003\u0002\u0003\u0002\u0003\u0002\u0003\u0003\u0003",
    "\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003",
    "\u0003\u0003\u0003\u0005\u0003/\n\u0003\u0003\u0004\u0003\u0004\u0003",
    "\u0004\u0007\u00044\n\u0004\f\u0004\u000e\u00047\u000b\u0004\u0003\u0005",
    "\u0003\u0005\u0003\u0005\u0003\u0005\u0003\u0005\u0003\u0005\u0005\u0005",
    "?\n\u0005\u0003\u0006\u0003\u0006\u0003\u0006\u0003\u0006\u0003\u0006",
    "\u0005\u0006F\n\u0006\u0003\u0007\u0003\u0007\u0003\u0007\u0003\b\u0003",
    "\b\u0003\b\u0003\t\u0003\t\u0003\t\u0003\t\u0003\t\u0005\tS\n\t\u0003",
    "\n\u0003\n\u0003\n\u0003\u000b\u0003\u000b\u0003\u000b\u0007\u000b[",
    "\n\u000b\f\u000b\u000e\u000b^\u000b\u000b\u0003\u000b\u0003\u000b\u0003",
    "\u000b\u0003\u000b\u0005\u000bd\n\u000b\u0003\f\u0003\f\u0003\f\u0003",
    "\r\u0003\r\u0003\r\u0003\u000e\u0003\u000e\u0003\u000f\u0003\u000f\u0003",
    "\u0010\u0003\u0010\u0003\u0011\u0003\u0011\u0003\u0011\u0002\u0002\u0012",
    "\u0002\u0004\u0006\b\n\f\u000e\u0010\u0012\u0014\u0016\u0018\u001a\u001c",
    "\u001e \u0002\u0003\u0003\u0002\u0003\u0004\u0002n\u0002\"\u0003\u0002",
    "\u0002\u0002\u0004.\u0003\u0002\u0002\u0002\u00060\u0003\u0002\u0002",
    "\u0002\b>\u0003\u0002\u0002\u0002\nE\u0003\u0002\u0002\u0002\fG\u0003",
    "\u0002\u0002\u0002\u000eJ\u0003\u0002\u0002\u0002\u0010R\u0003\u0002",
    "\u0002\u0002\u0012T\u0003\u0002\u0002\u0002\u0014W\u0003\u0002\u0002",
    "\u0002\u0016e\u0003\u0002\u0002\u0002\u0018h\u0003\u0002\u0002\u0002",
    "\u001ak\u0003\u0002\u0002\u0002\u001cm\u0003\u0002\u0002\u0002\u001e",
    "o\u0003\u0002\u0002\u0002 q\u0003\u0002\u0002\u0002\"#\u0005\u0004\u0003",
    "\u0002#$\u0007\u0002\u0002\u0003$\u0003\u0003\u0002\u0002\u0002%&\u0005",
    "\n\u0006\u0002&\'\u0007\t\u0002\u0002\'(\u0005\u0006\u0004\u0002()\u0007",
    "\n\u0002\u0002)/\u0003\u0002\u0002\u0002*+\u0005\n\u0006\u0002+,\u0007",
    "\t\u0002\u0002,-\u0007\n\u0002\u0002-/\u0003\u0002\u0002\u0002.%\u0003",
    "\u0002\u0002\u0002.*\u0003\u0002\u0002\u0002/\u0005\u0003\u0002\u0002",
    "\u000205\u0005\b\u0005\u000212\u0007\b\u0002\u000224\u0005\b\u0005\u0002",
    "31\u0003\u0002\u0002\u000247\u0003\u0002\u0002\u000253\u0003\u0002\u0002",
    "\u000256\u0003\u0002\u0002\u00026\u0007\u0003\u0002\u0002\u000275\u0003",
    "\u0002\u0002\u00028?\u0005\u0004\u0003\u00029?\u0005\u001a\u000e\u0002",
    ":?\u0005\u001c\u000f\u0002;?\u0005 \u0011\u0002<?\u0005\u001e\u0010",
    "\u0002=?\u0005\u0010\t\u0002>8\u0003\u0002\u0002\u0002>9\u0003\u0002",
    "\u0002\u0002>:\u0003\u0002\u0002\u0002>;\u0003\u0002\u0002\u0002><\u0003",
    "\u0002\u0002\u0002>=\u0003\u0002\u0002\u0002?\t\u0003\u0002\u0002\u0002",
    "@A\u0005\f\u0007\u0002AB\u0007\u0005\u0002\u0002BC\u0005\u000e\b\u0002",
    "CF\u0003\u0002\u0002\u0002DF\u0005\u000e\b\u0002E@\u0003\u0002\u0002",
    "\u0002ED\u0003\u0002\u0002\u0002F\u000b\u0003\u0002\u0002\u0002GH\u0007",
    "\u0010\u0002\u0002HI\b\u0007\u0001\u0002I\r\u0003\u0002\u0002\u0002",
    "JK\u0007\u0010\u0002\u0002KL\b\b\u0001\u0002L\u000f\u0003\u0002\u0002",
    "\u0002MN\u0005\u0012\n\u0002NO\u0007\u0006\u0002\u0002OP\u0005\u0014",
    "\u000b\u0002PS\u0003\u0002\u0002\u0002QS\u0005\u0014\u000b\u0002RM\u0003",
    "\u0002\u0002\u0002RQ\u0003\u0002\u0002\u0002S\u0011\u0003\u0002\u0002",
    "\u0002TU\u0007\u0010\u0002\u0002UV\b\n\u0001\u0002V\u0013\u0003\u0002",
    "\u0002\u0002W\\\u0005\u0016\f\u0002XY\u0007\u0007\u0002\u0002Y[\u0005",
    "\u0018\r\u0002ZX\u0003\u0002\u0002\u0002[^\u0003\u0002\u0002\u0002\\",
    "Z\u0003\u0002\u0002\u0002\\]\u0003\u0002\u0002\u0002]c\u0003\u0002\u0002",
    "\u0002^\\\u0003\u0002\u0002\u0002_`\u0007\u000b\u0002\u0002`a\u0005",
    "\u001a\u000e\u0002ab\u0007\f\u0002\u0002bd\u0003\u0002\u0002\u0002c",
    "_\u0003\u0002\u0002\u0002cd\u0003\u0002\u0002\u0002d\u0015\u0003\u0002",
    "\u0002\u0002ef\u0007\u0010\u0002\u0002fg\b\f\u0001\u0002g\u0017\u0003",
    "\u0002\u0002\u0002hi\u0007\u0010\u0002\u0002ij\b\r\u0001\u0002j\u0019",
    "\u0003\u0002\u0002\u0002kl\u0007\u000e\u0002\u0002l\u001b\u0003\u0002",
    "\u0002\u0002mn\u0007\r\u0002\u0002n\u001d\u0003\u0002\u0002\u0002op",
    "\u0007\u000f\u0002\u0002p\u001f\u0003\u0002\u0002\u0002qr\t\u0002\u0002",
    "\u0002r!\u0003\u0002\u0002\u0002\t.5>ER\\c"].join("");


var atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

var decisionsToDFA = atn.decisionToState.map( function(ds, index) { return new antlr4.dfa.DFA(ds, index); });

var sharedContextCache = new antlr4.PredictionContextCache();

var literalNames = [ null, null, null, "':'", "'::'", "'.'", "','", "'('", 
                     "')'", "'['", "']'" ];

var symbolicNames = [ null, "TRUE", "FALSE", "COLON", "DOUBLECOLON", "DOT", 
                      "COMMA", "LPARENS", "RPARENS", "LBRACKET", "RBRACKET", 
                      "DECIMAL", "INTEGER", "STRING", "IDENTIFIER", "WS", 
                      "UNRECOGNIZED" ];

var ruleNames =  [ "query", "expr", "fnArgs", "arg", "fn", "moduleName", 
                   "fnName", "columnArg", "prefix", "colElement", "colName", 
                   "propertyName", "integerLiteral", "decimalLiteral", "stringLiteral", 
                   "booleanLiteral" ];

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
XEvalBaseParser.DOT = 5;
XEvalBaseParser.COMMA = 6;
XEvalBaseParser.LPARENS = 7;
XEvalBaseParser.RPARENS = 8;
XEvalBaseParser.LBRACKET = 9;
XEvalBaseParser.RBRACKET = 10;
XEvalBaseParser.DECIMAL = 11;
XEvalBaseParser.INTEGER = 12;
XEvalBaseParser.STRING = 13;
XEvalBaseParser.IDENTIFIER = 14;
XEvalBaseParser.WS = 15;
XEvalBaseParser.UNRECOGNIZED = 16;

XEvalBaseParser.RULE_query = 0;
XEvalBaseParser.RULE_expr = 1;
XEvalBaseParser.RULE_fnArgs = 2;
XEvalBaseParser.RULE_arg = 3;
XEvalBaseParser.RULE_fn = 4;
XEvalBaseParser.RULE_moduleName = 5;
XEvalBaseParser.RULE_fnName = 6;
XEvalBaseParser.RULE_columnArg = 7;
XEvalBaseParser.RULE_prefix = 8;
XEvalBaseParser.RULE_colElement = 9;
XEvalBaseParser.RULE_colName = 10;
XEvalBaseParser.RULE_propertyName = 11;
XEvalBaseParser.RULE_integerLiteral = 12;
XEvalBaseParser.RULE_decimalLiteral = 13;
XEvalBaseParser.RULE_stringLiteral = 14;
XEvalBaseParser.RULE_booleanLiteral = 15;

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
        this.state = 32;
        this.expr();
        this.state = 33;
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
        this.state = 44;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,0,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 35;
            this.fn();
            this.state = 36;
            this.match(XEvalBaseParser.LPARENS);
            this.state = 37;
            this.fnArgs();
            this.state = 38;
            this.match(XEvalBaseParser.RPARENS);
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 40;
            this.fn();
            this.state = 41;
            this.match(XEvalBaseParser.LPARENS);
            this.state = 42;
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

FnArgsContext.prototype.arg = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(ArgContext);
    } else {
        return this.getTypedRuleContext(ArgContext,i);
    }
};

FnArgsContext.prototype.COMMA = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(XEvalBaseParser.COMMA);
    } else {
        return this.getToken(XEvalBaseParser.COMMA, i);
    }
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
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 46;
        this.arg();
        this.state = 51;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===XEvalBaseParser.COMMA) {
            this.state = 47;
            this.match(XEvalBaseParser.COMMA);
            this.state = 48;
            this.arg();
            this.state = 53;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
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

function ArgContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_arg;
    return this;
}

ArgContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ArgContext.prototype.constructor = ArgContext;

ArgContext.prototype.expr = function() {
    return this.getTypedRuleContext(ExprContext,0);
};

ArgContext.prototype.integerLiteral = function() {
    return this.getTypedRuleContext(IntegerLiteralContext,0);
};

ArgContext.prototype.decimalLiteral = function() {
    return this.getTypedRuleContext(DecimalLiteralContext,0);
};

ArgContext.prototype.booleanLiteral = function() {
    return this.getTypedRuleContext(BooleanLiteralContext,0);
};

ArgContext.prototype.stringLiteral = function() {
    return this.getTypedRuleContext(StringLiteralContext,0);
};

ArgContext.prototype.columnArg = function() {
    return this.getTypedRuleContext(ColumnArgContext,0);
};

ArgContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitArg(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.ArgContext = ArgContext;

XEvalBaseParser.prototype.arg = function() {

    var localctx = new ArgContext(this, this._ctx, this.state);
    this.enterRule(localctx, 6, XEvalBaseParser.RULE_arg);
    try {
        this.state = 60;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,2,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 54;
            this.expr();
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 55;
            this.integerLiteral();
            break;

        case 3:
            this.enterOuterAlt(localctx, 3);
            this.state = 56;
            this.decimalLiteral();
            break;

        case 4:
            this.enterOuterAlt(localctx, 4);
            this.state = 57;
            this.booleanLiteral();
            break;

        case 5:
            this.enterOuterAlt(localctx, 5);
            this.state = 58;
            this.stringLiteral();
            break;

        case 6:
            this.enterOuterAlt(localctx, 6);
            this.state = 59;
            this.columnArg();
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
        this.state = 67;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,3,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 62;
            this.moduleName();
            this.state = 63;
            this.match(XEvalBaseParser.COLON);
            this.state = 64;
            this.fnName();
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 66;
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
        this.state = 69;
        localctx._IDENTIFIER = this.match(XEvalBaseParser.IDENTIFIER);
        if (!xcHelper.checkNamePattern(PatternCategory.UDF, PatternAction.Check, (localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text))) {
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
        this.state = 72;
        localctx._IDENTIFIER = this.match(XEvalBaseParser.IDENTIFIER);
        if (!xcHelper.checkNamePattern(PatternCategory.UDFFn, PatternAction.Check, (localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text))) {
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

function ColumnArgContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_columnArg;
    return this;
}

ColumnArgContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ColumnArgContext.prototype.constructor = ColumnArgContext;

ColumnArgContext.prototype.prefix = function() {
    return this.getTypedRuleContext(PrefixContext,0);
};

ColumnArgContext.prototype.DOUBLECOLON = function() {
    return this.getToken(XEvalBaseParser.DOUBLECOLON, 0);
};

ColumnArgContext.prototype.colElement = function() {
    return this.getTypedRuleContext(ColElementContext,0);
};

ColumnArgContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitColumnArg(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.ColumnArgContext = ColumnArgContext;

XEvalBaseParser.prototype.columnArg = function() {

    var localctx = new ColumnArgContext(this, this._ctx, this.state);
    this.enterRule(localctx, 14, XEvalBaseParser.RULE_columnArg);
    try {
        this.state = 80;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,4,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 75;
            this.prefix();
            this.state = 76;
            this.match(XEvalBaseParser.DOUBLECOLON);
            this.state = 77;
            this.colElement();
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 79;
            this.colElement();
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
        this.state = 82;
        localctx._IDENTIFIER = this.match(XEvalBaseParser.IDENTIFIER);
        if (xcHelper.validatePrefixName((localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text), false, true)) {
            throw SyntaxError(xcHelper.validatePrefixName((localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text), false, true));
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

function ColElementContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_colElement;
    return this;
}

ColElementContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ColElementContext.prototype.constructor = ColElementContext;

ColElementContext.prototype.colName = function() {
    return this.getTypedRuleContext(ColNameContext,0);
};

ColElementContext.prototype.DOT = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(XEvalBaseParser.DOT);
    } else {
        return this.getToken(XEvalBaseParser.DOT, i);
    }
};


ColElementContext.prototype.propertyName = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(PropertyNameContext);
    } else {
        return this.getTypedRuleContext(PropertyNameContext,i);
    }
};

ColElementContext.prototype.LBRACKET = function() {
    return this.getToken(XEvalBaseParser.LBRACKET, 0);
};

ColElementContext.prototype.integerLiteral = function() {
    return this.getTypedRuleContext(IntegerLiteralContext,0);
};

ColElementContext.prototype.RBRACKET = function() {
    return this.getToken(XEvalBaseParser.RBRACKET, 0);
};

ColElementContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitColElement(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.ColElementContext = ColElementContext;

XEvalBaseParser.prototype.colElement = function() {

    var localctx = new ColElementContext(this, this._ctx, this.state);
    this.enterRule(localctx, 18, XEvalBaseParser.RULE_colElement);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 85;
        this.colName();
        this.state = 90;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===XEvalBaseParser.DOT) {
            this.state = 86;
            this.match(XEvalBaseParser.DOT);
            this.state = 87;
            this.propertyName();
            this.state = 92;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
        }
        this.state = 97;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        if(_la===XEvalBaseParser.LBRACKET) {
            this.state = 93;
            this.match(XEvalBaseParser.LBRACKET);
            this.state = 94;
            this.integerLiteral();
            this.state = 95;
            this.match(XEvalBaseParser.RBRACKET);
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
    this.enterRule(localctx, 20, XEvalBaseParser.RULE_colName);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 99;
        localctx._IDENTIFIER = this.match(XEvalBaseParser.IDENTIFIER);
        if ((localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text).toUpperCase() != "NONE" && xcHelper.validateColName((localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text), false, true)) {
            throw SyntaxError(xcHelper.validateColName((localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text), false, true));
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

function PropertyNameContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_propertyName;
    this._IDENTIFIER = null; // Token
    return this;
}

PropertyNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
PropertyNameContext.prototype.constructor = PropertyNameContext;

PropertyNameContext.prototype.IDENTIFIER = function() {
    return this.getToken(XEvalBaseParser.IDENTIFIER, 0);
};

PropertyNameContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitPropertyName(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.PropertyNameContext = PropertyNameContext;

XEvalBaseParser.prototype.propertyName = function() {

    var localctx = new PropertyNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 22, XEvalBaseParser.RULE_propertyName);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 102;
        localctx._IDENTIFIER = this.match(XEvalBaseParser.IDENTIFIER);
        if (xcHelper.validateColName((localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text), false, true)) {
            throw SyntaxError(xcHelper.validateColName((localctx._IDENTIFIER===null ? null : localctx._IDENTIFIER.text), false, true));
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

function IntegerLiteralContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_integerLiteral;
    return this;
}

IntegerLiteralContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
IntegerLiteralContext.prototype.constructor = IntegerLiteralContext;

IntegerLiteralContext.prototype.INTEGER = function() {
    return this.getToken(XEvalBaseParser.INTEGER, 0);
};

IntegerLiteralContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitIntegerLiteral(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.IntegerLiteralContext = IntegerLiteralContext;

XEvalBaseParser.prototype.integerLiteral = function() {

    var localctx = new IntegerLiteralContext(this, this._ctx, this.state);
    this.enterRule(localctx, 24, XEvalBaseParser.RULE_integerLiteral);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 105;
        this.match(XEvalBaseParser.INTEGER);
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

function DecimalLiteralContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_decimalLiteral;
    return this;
}

DecimalLiteralContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
DecimalLiteralContext.prototype.constructor = DecimalLiteralContext;

DecimalLiteralContext.prototype.DECIMAL = function() {
    return this.getToken(XEvalBaseParser.DECIMAL, 0);
};

DecimalLiteralContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitDecimalLiteral(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.DecimalLiteralContext = DecimalLiteralContext;

XEvalBaseParser.prototype.decimalLiteral = function() {

    var localctx = new DecimalLiteralContext(this, this._ctx, this.state);
    this.enterRule(localctx, 26, XEvalBaseParser.RULE_decimalLiteral);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 107;
        this.match(XEvalBaseParser.DECIMAL);
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

function StringLiteralContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_stringLiteral;
    return this;
}

StringLiteralContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
StringLiteralContext.prototype.constructor = StringLiteralContext;

StringLiteralContext.prototype.STRING = function() {
    return this.getToken(XEvalBaseParser.STRING, 0);
};

StringLiteralContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitStringLiteral(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.StringLiteralContext = StringLiteralContext;

XEvalBaseParser.prototype.stringLiteral = function() {

    var localctx = new StringLiteralContext(this, this._ctx, this.state);
    this.enterRule(localctx, 28, XEvalBaseParser.RULE_stringLiteral);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 109;
        this.match(XEvalBaseParser.STRING);
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

function BooleanLiteralContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_booleanLiteral;
    return this;
}

BooleanLiteralContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
BooleanLiteralContext.prototype.constructor = BooleanLiteralContext;

BooleanLiteralContext.prototype.TRUE = function() {
    return this.getToken(XEvalBaseParser.TRUE, 0);
};

BooleanLiteralContext.prototype.FALSE = function() {
    return this.getToken(XEvalBaseParser.FALSE, 0);
};

BooleanLiteralContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitBooleanLiteral(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.BooleanLiteralContext = BooleanLiteralContext;

XEvalBaseParser.prototype.booleanLiteral = function() {

    var localctx = new BooleanLiteralContext(this, this._ctx, this.state);
    this.enterRule(localctx, 30, XEvalBaseParser.RULE_booleanLiteral);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 111;
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

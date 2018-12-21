// Generated from XEvalBase.g4 by ANTLR 4.7.1
// jshint ignore: start
var antlr4 = require('antlr4/index');
var XEvalBaseVisitor = require('./XEvalBaseVisitor').XEvalBaseVisitor;

var grammarFileName = "XEvalBase.g4";

var serializedATN = ["\u0003\u608b\ua72a\u8133\ub9ed\u417c\u3be7\u7786\u5964",
    "\u0003\u001d\u009e\u0004\u0002\t\u0002\u0004\u0003\t\u0003\u0004\u0004",
    "\t\u0004\u0004\u0005\t\u0005\u0004\u0006\t\u0006\u0004\u0007\t\u0007",
    "\u0004\b\t\b\u0004\t\t\t\u0004\n\t\n\u0004\u000b\t\u000b\u0004\f\t\f",
    "\u0004\r\t\r\u0004\u000e\t\u000e\u0004\u000f\t\u000f\u0004\u0010\t\u0010",
    "\u0004\u0011\t\u0011\u0004\u0012\t\u0012\u0004\u0013\t\u0013\u0004\u0014",
    "\t\u0014\u0004\u0015\t\u0015\u0003\u0002\u0003\u0002\u0003\u0002\u0003",
    "\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003",
    "\u0003\u0003\u0003\u0003\u0003\u0005\u00037\n\u0003\u0003\u0004\u0003",
    "\u0004\u0003\u0004\u0007\u0004<\n\u0004\f\u0004\u000e\u0004?\u000b\u0004",
    "\u0003\u0005\u0003\u0005\u0003\u0005\u0003\u0005\u0003\u0005\u0003\u0005",
    "\u0003\u0005\u0003\u0005\u0005\u0005I\n\u0005\u0003\u0006\u0003\u0006",
    "\u0003\u0006\u0003\u0006\u0003\u0006\u0005\u0006P\n\u0006\u0003\u0007",
    "\u0003\u0007\u0003\u0007\u0003\b\u0003\b\u0003\b\u0003\t\u0007\tY\n",
    "\t\f\t\u000e\t\\\u000b\t\u0003\t\u0003\t\u0003\t\u0003\t\u0007\tb\n",
    "\t\f\t\u000e\te\u000b\t\u0003\n\u0003\n\u0003\n\u0003\n\u0003\n\u0005",
    "\nl\n\n\u0003\u000b\u0003\u000b\u0003\u000b\u0003\f\u0003\f\u0003\f",
    "\u0003\f\u0003\f\u0005\fv\n\f\u0003\r\u0003\r\u0003\r\u0003\u000e\u0003",
    "\u000e\u0003\u000e\u0007\u000e~\n\u000e\f\u000e\u000e\u000e\u0081\u000b",
    "\u000e\u0003\u000e\u0003\u000e\u0003\u000e\u0003\u000e\u0007\u000e\u0087",
    "\n\u000e\f\u000e\u000e\u000e\u008a\u000b\u000e\u0003\u000f\u0003\u000f",
    "\u0003\u000f\u0003\u0010\u0003\u0010\u0003\u0010\u0003\u0011\u0003\u0011",
    "\u0003\u0011\u0003\u0011\u0003\u0012\u0003\u0012\u0003\u0013\u0003\u0013",
    "\u0003\u0014\u0003\u0014\u0003\u0015\u0003\u0015\u0003\u0015\u0002\u0002",
    "\u0016\u0002\u0004\u0006\b\n\f\u000e\u0010\u0012\u0014\u0016\u0018\u001a",
    "\u001c\u001e \"$&(\u0002\u0005\b\u0002\u0003\u0004\u0007\t\r\u000e\u0014",
    "\u0015\u0017\u0017\u001b\u001b\u0003\u0002\u0015\u0016\u0003\u0002\u0005",
    "\u0006\u0002\u0099\u0002*\u0003\u0002\u0002\u0002\u00046\u0003\u0002",
    "\u0002\u0002\u00068\u0003\u0002\u0002\u0002\bH\u0003\u0002\u0002\u0002",
    "\nO\u0003\u0002\u0002\u0002\fQ\u0003\u0002\u0002\u0002\u000eT\u0003",
    "\u0002\u0002\u0002\u0010Z\u0003\u0002\u0002\u0002\u0012k\u0003\u0002",
    "\u0002\u0002\u0014m\u0003\u0002\u0002\u0002\u0016u\u0003\u0002\u0002",
    "\u0002\u0018w\u0003\u0002\u0002\u0002\u001az\u0003\u0002\u0002\u0002",
    "\u001c\u008b\u0003\u0002\u0002\u0002\u001e\u008e\u0003\u0002\u0002\u0002",
    " \u0091\u0003\u0002\u0002\u0002\"\u0095\u0003\u0002\u0002\u0002$\u0097",
    "\u0003\u0002\u0002\u0002&\u0099\u0003\u0002\u0002\u0002(\u009b\u0003",
    "\u0002\u0002\u0002*+\u0005\u0004\u0003\u0002+,\u0007\u0002\u0002\u0003",
    ",\u0003\u0003\u0002\u0002\u0002-.\u0005\n\u0006\u0002./\u0007\u000b",
    "\u0002\u0002/0\u0005\u0006\u0004\u000201\u0007\f\u0002\u000217\u0003",
    "\u0002\u0002\u000223\u0005\n\u0006\u000234\u0007\u000b\u0002\u00024",
    "5\u0007\f\u0002\u000257\u0003\u0002\u0002\u00026-\u0003\u0002\u0002",
    "\u000262\u0003\u0002\u0002\u00027\u0005\u0003\u0002\u0002\u00028=\u0005",
    "\b\u0005\u00029:\u0007\n\u0002\u0002:<\u0005\b\u0005\u0002;9\u0003\u0002",
    "\u0002\u0002<?\u0003\u0002\u0002\u0002=;\u0003\u0002\u0002\u0002=>\u0003",
    "\u0002\u0002\u0002>\u0007\u0003\u0002\u0002\u0002?=\u0003\u0002\u0002",
    "\u0002@I\u0005\u0004\u0003\u0002AI\u0005\"\u0012\u0002BI\u0005$\u0013",
    "\u0002CI\u0005(\u0015\u0002DI\u0005&\u0014\u0002EI\u0005\u0016\f\u0002",
    "FI\u0005 \u0011\u0002GI\u0005\u0010\t\u0002H@\u0003\u0002\u0002\u0002",
    "HA\u0003\u0002\u0002\u0002HB\u0003\u0002\u0002\u0002HC\u0003\u0002\u0002",
    "\u0002HD\u0003\u0002\u0002\u0002HE\u0003\u0002\u0002\u0002HF\u0003\u0002",
    "\u0002\u0002HG\u0003\u0002\u0002\u0002I\t\u0003\u0002\u0002\u0002JK",
    "\u0005\f\u0007\u0002KL\u0007\u0007\u0002\u0002LM\u0005\u000e\b\u0002",
    "MP\u0003\u0002\u0002\u0002NP\u0005\u000e\b\u0002OJ\u0003\u0002\u0002",
    "\u0002ON\u0003\u0002\u0002\u0002P\u000b\u0003\u0002\u0002\u0002QR\u0007",
    "\u001b\u0002\u0002RS\b\u0007\u0001\u0002S\r\u0003\u0002\u0002\u0002",
    "TU\u0007\u001b\u0002\u0002UV\b\b\u0001\u0002V\u000f\u0003\u0002\u0002",
    "\u0002WY\t\u0002\u0002\u0002XW\u0003\u0002\u0002\u0002Y\\\u0003\u0002",
    "\u0002\u0002ZX\u0003\u0002\u0002\u0002Z[\u0003\u0002\u0002\u0002[]\u0003",
    "\u0002\u0002\u0002\\Z\u0003\u0002\u0002\u0002]^\u0007\u0012\u0002\u0002",
    "^_\u0005\u0014\u000b\u0002_c\u0007\u0013\u0002\u0002`b\u0005\u0012\n",
    "\u0002a`\u0003\u0002\u0002\u0002be\u0003\u0002\u0002\u0002ca\u0003\u0002",
    "\u0002\u0002cd\u0003\u0002\u0002\u0002d\u0011\u0003\u0002\u0002\u0002",
    "ec\u0003\u0002\u0002\u0002fl\t\u0002\u0002\u0002gh\u0007\u0012\u0002",
    "\u0002hi\u0005\u0014\u000b\u0002ij\u0007\u0013\u0002\u0002jl\u0003\u0002",
    "\u0002\u0002kf\u0003\u0002\u0002\u0002kg\u0003\u0002\u0002\u0002l\u0013",
    "\u0003\u0002\u0002\u0002mn\u0007\u001b\u0002\u0002no\b\u000b\u0001\u0002",
    "o\u0015\u0003\u0002\u0002\u0002pq\u0005\u001a\u000e\u0002qr\u0007\b",
    "\u0002\u0002rs\u0005\u001a\u000e\u0002sv\u0003\u0002\u0002\u0002tv\u0005",
    "\u001a\u000e\u0002up\u0003\u0002\u0002\u0002ut\u0003\u0002\u0002\u0002",
    "v\u0017\u0003\u0002\u0002\u0002wx\u0007\u001b\u0002\u0002xy\b\r\u0001",
    "\u0002y\u0019\u0003\u0002\u0002\u0002z\u007f\u0005\u001c\u000f\u0002",
    "{|\u0007\t\u0002\u0002|~\u0005\u001e\u0010\u0002}{\u0003\u0002\u0002",
    "\u0002~\u0081\u0003\u0002\u0002\u0002\u007f}\u0003\u0002\u0002\u0002",
    "\u007f\u0080\u0003\u0002\u0002\u0002\u0080\u0088\u0003\u0002\u0002\u0002",
    "\u0081\u007f\u0003\u0002\u0002\u0002\u0082\u0083\u0007\r\u0002\u0002",
    "\u0083\u0084\u0005\"\u0012\u0002\u0084\u0085\u0007\u000e\u0002\u0002",
    "\u0085\u0087\u0003\u0002\u0002\u0002\u0086\u0082\u0003\u0002\u0002\u0002",
    "\u0087\u008a\u0003\u0002\u0002\u0002\u0088\u0086\u0003\u0002\u0002\u0002",
    "\u0088\u0089\u0003\u0002\u0002\u0002\u0089\u001b\u0003\u0002\u0002\u0002",
    "\u008a\u0088\u0003\u0002\u0002\u0002\u008b\u008c\u0007\u001b\u0002\u0002",
    "\u008c\u008d\b\u000f\u0001\u0002\u008d\u001d\u0003\u0002\u0002\u0002",
    "\u008e\u008f\u0007\u001b\u0002\u0002\u008f\u0090\b\u0010\u0001\u0002",
    "\u0090\u001f\u0003\u0002\u0002\u0002\u0091\u0092\u0007\u0014\u0002\u0002",
    "\u0092\u0093\u0007\u001b\u0002\u0002\u0093\u0094\b\u0011\u0001\u0002",
    "\u0094!\u0003\u0002\u0002\u0002\u0095\u0096\u0007\u0017\u0002\u0002",
    "\u0096#\u0003\u0002\u0002\u0002\u0097\u0098\t\u0003\u0002\u0002\u0098",
    "%\u0003\u0002\u0002\u0002\u0099\u009a\u0007\u0018\u0002\u0002\u009a",
    "\'\u0003\u0002\u0002\u0002\u009b\u009c\t\u0004\u0002\u0002\u009c)\u0003",
    "\u0002\u0002\u0002\f6=HOZcku\u007f\u0088"].join("");


var atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

var decisionsToDFA = atn.decisionToState.map( function(ds, index) { return new antlr4.dfa.DFA(ds, index); });

var sharedContextCache = new antlr4.PredictionContextCache();

var literalNames = [ null, "'-'", "'_'", null, null, "':'", "'::'", "'.'",
                     "','", "'('", "')'", "'['", "']'", "'{'", "'}'", "'\\'",
                     "'<'", "'>'", "'^'", null, null, null, null, "'''",
                     "'\"'" ];

var symbolicNames = [ null, null, null, "TRUE", "FALSE", "COLON", "DOUBLECOLON",
                      "DOT", "COMMA", "LPARENS", "RPARENS", "LBRACKET",
                      "RBRACKET", "LCURLYBRACE", "RCURLYBRACE", "BACKSLASH",
                      "LTSIGN", "GTSIGN", "CARET", "DECIMAL", "SCIENTIFICDECIMAL",
                      "INTEGER", "STRING", "APOSTROPHE", "SINGLEQUOTE",
                      "ALPHANUMERIC", "WS", "UNRECOGNIZED" ];

var ruleNames =  [ "query", "expr", "fnArgs", "arg", "fn", "moduleName",
                   "fnName", "paramArg", "paramAfter", "paramValue", "columnArg",
                   "prefix", "colElement", "colName", "propertyName", "aggValue",
                   "integerLiteral", "decimalLiteral", "stringLiteral",
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
XEvalBaseParser.T__0 = 1;
XEvalBaseParser.T__1 = 2;
XEvalBaseParser.TRUE = 3;
XEvalBaseParser.FALSE = 4;
XEvalBaseParser.COLON = 5;
XEvalBaseParser.DOUBLECOLON = 6;
XEvalBaseParser.DOT = 7;
XEvalBaseParser.COMMA = 8;
XEvalBaseParser.LPARENS = 9;
XEvalBaseParser.RPARENS = 10;
XEvalBaseParser.LBRACKET = 11;
XEvalBaseParser.RBRACKET = 12;
XEvalBaseParser.LCURLYBRACE = 13;
XEvalBaseParser.RCURLYBRACE = 14;
XEvalBaseParser.BACKSLASH = 15;
XEvalBaseParser.LTSIGN = 16;
XEvalBaseParser.GTSIGN = 17;
XEvalBaseParser.CARET = 18;
XEvalBaseParser.DECIMAL = 19;
XEvalBaseParser.SCIENTIFICDECIMAL = 20;
XEvalBaseParser.INTEGER = 21;
XEvalBaseParser.STRING = 22;
XEvalBaseParser.APOSTROPHE = 23;
XEvalBaseParser.SINGLEQUOTE = 24;
XEvalBaseParser.ALPHANUMERIC = 25;
XEvalBaseParser.WS = 26;
XEvalBaseParser.UNRECOGNIZED = 27;

XEvalBaseParser.RULE_query = 0;
XEvalBaseParser.RULE_expr = 1;
XEvalBaseParser.RULE_fnArgs = 2;
XEvalBaseParser.RULE_arg = 3;
XEvalBaseParser.RULE_fn = 4;
XEvalBaseParser.RULE_moduleName = 5;
XEvalBaseParser.RULE_fnName = 6;
XEvalBaseParser.RULE_paramArg = 7;
XEvalBaseParser.RULE_paramAfter = 8;
XEvalBaseParser.RULE_paramValue = 9;
XEvalBaseParser.RULE_columnArg = 10;
XEvalBaseParser.RULE_prefix = 11;
XEvalBaseParser.RULE_colElement = 12;
XEvalBaseParser.RULE_colName = 13;
XEvalBaseParser.RULE_propertyName = 14;
XEvalBaseParser.RULE_aggValue = 15;
XEvalBaseParser.RULE_integerLiteral = 16;
XEvalBaseParser.RULE_decimalLiteral = 17;
XEvalBaseParser.RULE_stringLiteral = 18;
XEvalBaseParser.RULE_booleanLiteral = 19;

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
        this.state = 40;
        this.expr();
        this.state = 41;
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
        this.state = 52;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,0,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 43;
            this.fn();
            this.state = 44;
            this.match(XEvalBaseParser.LPARENS);
            this.state = 45;
            this.fnArgs();
            this.state = 46;
            this.match(XEvalBaseParser.RPARENS);
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 48;
            this.fn();
            this.state = 49;
            this.match(XEvalBaseParser.LPARENS);
            this.state = 50;
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
        this.state = 54;
        this.arg();
        this.state = 59;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===XEvalBaseParser.COMMA) {
            this.state = 55;
            this.match(XEvalBaseParser.COMMA);
            this.state = 56;
            this.arg();
            this.state = 61;
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

ArgContext.prototype.aggValue = function() {
    return this.getTypedRuleContext(AggValueContext,0);
};

ArgContext.prototype.paramArg = function() {
    return this.getTypedRuleContext(ParamArgContext,0);
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
        this.state = 70;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,2,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 62;
            this.expr();
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 63;
            this.integerLiteral();
            break;

        case 3:
            this.enterOuterAlt(localctx, 3);
            this.state = 64;
            this.decimalLiteral();
            break;

        case 4:
            this.enterOuterAlt(localctx, 4);
            this.state = 65;
            this.booleanLiteral();
            break;

        case 5:
            this.enterOuterAlt(localctx, 5);
            this.state = 66;
            this.stringLiteral();
            break;

        case 6:
            this.enterOuterAlt(localctx, 6);
            this.state = 67;
            this.columnArg();
            break;

        case 7:
            this.enterOuterAlt(localctx, 7);
            this.state = 68;
            this.aggValue();
            break;

        case 8:
            this.enterOuterAlt(localctx, 8);
            this.state = 69;
            this.paramArg();
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
        this.state = 77;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,3,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 72;
            this.moduleName();
            this.state = 73;
            this.match(XEvalBaseParser.COLON);
            this.state = 74;
            this.fnName();
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 76;
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
    this._ALPHANUMERIC = null; // Token
    return this;
}

ModuleNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ModuleNameContext.prototype.constructor = ModuleNameContext;

ModuleNameContext.prototype.ALPHANUMERIC = function() {
    return this.getToken(XEvalBaseParser.ALPHANUMERIC, 0);
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
        this.state = 79;
        localctx._ALPHANUMERIC = this.match(XEvalBaseParser.ALPHANUMERIC);
        if (!xcHelper.checkNamePattern(PatternCategory.UDF, PatternAction.Check, (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text))) {
            throw SyntaxError('Invalid module name: ' + (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text));}
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
    this._ALPHANUMERIC = null; // Token
    return this;
}

FnNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
FnNameContext.prototype.constructor = FnNameContext;

FnNameContext.prototype.ALPHANUMERIC = function() {
    return this.getToken(XEvalBaseParser.ALPHANUMERIC, 0);
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
        this.state = 82;
        localctx._ALPHANUMERIC = this.match(XEvalBaseParser.ALPHANUMERIC);
        if (!xcHelper.checkNamePattern(PatternCategory.UDFFn, PatternAction.Check, (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text))) {
            throw SyntaxError('Invalid udf name: ' + (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text));}
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

function ParamArgContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_paramArg;
    return this;
}

ParamArgContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ParamArgContext.prototype.constructor = ParamArgContext;

ParamArgContext.prototype.LTSIGN = function() {
    return this.getToken(XEvalBaseParser.LTSIGN, 0);
};

ParamArgContext.prototype.paramValue = function() {
    return this.getTypedRuleContext(ParamValueContext,0);
};

ParamArgContext.prototype.GTSIGN = function() {
    return this.getToken(XEvalBaseParser.GTSIGN, 0);
};

ParamArgContext.prototype.paramAfter = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(ParamAfterContext);
    } else {
        return this.getTypedRuleContext(ParamAfterContext,i);
    }
};

ParamArgContext.prototype.ALPHANUMERIC = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(XEvalBaseParser.ALPHANUMERIC);
    } else {
        return this.getToken(XEvalBaseParser.ALPHANUMERIC, i);
    }
};


ParamArgContext.prototype.INTEGER = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(XEvalBaseParser.INTEGER);
    } else {
        return this.getToken(XEvalBaseParser.INTEGER, i);
    }
};


ParamArgContext.prototype.DECIMAL = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(XEvalBaseParser.DECIMAL);
    } else {
        return this.getToken(XEvalBaseParser.DECIMAL, i);
    }
};


ParamArgContext.prototype.COLON = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(XEvalBaseParser.COLON);
    } else {
        return this.getToken(XEvalBaseParser.COLON, i);
    }
};


ParamArgContext.prototype.DOUBLECOLON = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(XEvalBaseParser.DOUBLECOLON);
    } else {
        return this.getToken(XEvalBaseParser.DOUBLECOLON, i);
    }
};


ParamArgContext.prototype.DOT = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(XEvalBaseParser.DOT);
    } else {
        return this.getToken(XEvalBaseParser.DOT, i);
    }
};


ParamArgContext.prototype.LBRACKET = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(XEvalBaseParser.LBRACKET);
    } else {
        return this.getToken(XEvalBaseParser.LBRACKET, i);
    }
};


ParamArgContext.prototype.RBRACKET = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(XEvalBaseParser.RBRACKET);
    } else {
        return this.getToken(XEvalBaseParser.RBRACKET, i);
    }
};


ParamArgContext.prototype.CARET = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(XEvalBaseParser.CARET);
    } else {
        return this.getToken(XEvalBaseParser.CARET, i);
    }
};


ParamArgContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitParamArg(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.ParamArgContext = ParamArgContext;

XEvalBaseParser.prototype.paramArg = function() {

    var localctx = new ParamArgContext(this, this._ctx, this.state);
    this.enterRule(localctx, 14, XEvalBaseParser.RULE_paramArg);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 88;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << XEvalBaseParser.T__0) | (1 << XEvalBaseParser.T__1) | (1 << XEvalBaseParser.COLON) | (1 << XEvalBaseParser.DOUBLECOLON) | (1 << XEvalBaseParser.DOT) | (1 << XEvalBaseParser.LBRACKET) | (1 << XEvalBaseParser.RBRACKET) | (1 << XEvalBaseParser.CARET) | (1 << XEvalBaseParser.DECIMAL) | (1 << XEvalBaseParser.INTEGER) | (1 << XEvalBaseParser.ALPHANUMERIC))) !== 0)) {
            this.state = 85;
            _la = this._input.LA(1);
            if(!((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << XEvalBaseParser.T__0) | (1 << XEvalBaseParser.T__1) | (1 << XEvalBaseParser.COLON) | (1 << XEvalBaseParser.DOUBLECOLON) | (1 << XEvalBaseParser.DOT) | (1 << XEvalBaseParser.LBRACKET) | (1 << XEvalBaseParser.RBRACKET) | (1 << XEvalBaseParser.CARET) | (1 << XEvalBaseParser.DECIMAL) | (1 << XEvalBaseParser.INTEGER) | (1 << XEvalBaseParser.ALPHANUMERIC))) !== 0))) {
            this._errHandler.recoverInline(this);
            }
            else {
            	this._errHandler.reportMatch(this);
                this.consume();
            }
            this.state = 90;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
        }
        this.state = 91;
        this.match(XEvalBaseParser.LTSIGN);
        this.state = 92;
        this.paramValue();
        this.state = 93;
        this.match(XEvalBaseParser.GTSIGN);
        this.state = 97;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << XEvalBaseParser.T__0) | (1 << XEvalBaseParser.T__1) | (1 << XEvalBaseParser.COLON) | (1 << XEvalBaseParser.DOUBLECOLON) | (1 << XEvalBaseParser.DOT) | (1 << XEvalBaseParser.LBRACKET) | (1 << XEvalBaseParser.RBRACKET) | (1 << XEvalBaseParser.LTSIGN) | (1 << XEvalBaseParser.CARET) | (1 << XEvalBaseParser.DECIMAL) | (1 << XEvalBaseParser.INTEGER) | (1 << XEvalBaseParser.ALPHANUMERIC))) !== 0)) {
            this.state = 94;
            this.paramAfter();
            this.state = 99;
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

function ParamAfterContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_paramAfter;
    return this;
}

ParamAfterContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ParamAfterContext.prototype.constructor = ParamAfterContext;

ParamAfterContext.prototype.ALPHANUMERIC = function() {
    return this.getToken(XEvalBaseParser.ALPHANUMERIC, 0);
};

ParamAfterContext.prototype.INTEGER = function() {
    return this.getToken(XEvalBaseParser.INTEGER, 0);
};

ParamAfterContext.prototype.DECIMAL = function() {
    return this.getToken(XEvalBaseParser.DECIMAL, 0);
};

ParamAfterContext.prototype.COLON = function() {
    return this.getToken(XEvalBaseParser.COLON, 0);
};

ParamAfterContext.prototype.DOUBLECOLON = function() {
    return this.getToken(XEvalBaseParser.DOUBLECOLON, 0);
};

ParamAfterContext.prototype.DOT = function() {
    return this.getToken(XEvalBaseParser.DOT, 0);
};

ParamAfterContext.prototype.LBRACKET = function() {
    return this.getToken(XEvalBaseParser.LBRACKET, 0);
};

ParamAfterContext.prototype.RBRACKET = function() {
    return this.getToken(XEvalBaseParser.RBRACKET, 0);
};

ParamAfterContext.prototype.CARET = function() {
    return this.getToken(XEvalBaseParser.CARET, 0);
};

ParamAfterContext.prototype.LTSIGN = function() {
    return this.getToken(XEvalBaseParser.LTSIGN, 0);
};

ParamAfterContext.prototype.paramValue = function() {
    return this.getTypedRuleContext(ParamValueContext,0);
};

ParamAfterContext.prototype.GTSIGN = function() {
    return this.getToken(XEvalBaseParser.GTSIGN, 0);
};

ParamAfterContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitParamAfter(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.ParamAfterContext = ParamAfterContext;

XEvalBaseParser.prototype.paramAfter = function() {

    var localctx = new ParamAfterContext(this, this._ctx, this.state);
    this.enterRule(localctx, 16, XEvalBaseParser.RULE_paramAfter);
    var _la = 0; // Token type
    try {
        this.state = 105;
        this._errHandler.sync(this);
        switch(this._input.LA(1)) {
        case XEvalBaseParser.T__0:
        case XEvalBaseParser.T__1:
        case XEvalBaseParser.COLON:
        case XEvalBaseParser.DOUBLECOLON:
        case XEvalBaseParser.DOT:
        case XEvalBaseParser.LBRACKET:
        case XEvalBaseParser.RBRACKET:
        case XEvalBaseParser.CARET:
        case XEvalBaseParser.DECIMAL:
        case XEvalBaseParser.INTEGER:
        case XEvalBaseParser.ALPHANUMERIC:
            this.enterOuterAlt(localctx, 1);
            this.state = 100;
            _la = this._input.LA(1);
            if(!((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << XEvalBaseParser.T__0) | (1 << XEvalBaseParser.T__1) | (1 << XEvalBaseParser.COLON) | (1 << XEvalBaseParser.DOUBLECOLON) | (1 << XEvalBaseParser.DOT) | (1 << XEvalBaseParser.LBRACKET) | (1 << XEvalBaseParser.RBRACKET) | (1 << XEvalBaseParser.CARET) | (1 << XEvalBaseParser.DECIMAL) | (1 << XEvalBaseParser.INTEGER) | (1 << XEvalBaseParser.ALPHANUMERIC))) !== 0))) {
            this._errHandler.recoverInline(this);
            }
            else {
            	this._errHandler.reportMatch(this);
                this.consume();
            }
            break;
        case XEvalBaseParser.LTSIGN:
            this.enterOuterAlt(localctx, 2);
            this.state = 101;
            this.match(XEvalBaseParser.LTSIGN);
            this.state = 102;
            this.paramValue();
            this.state = 103;
            this.match(XEvalBaseParser.GTSIGN);
            break;
        default:
            throw new antlr4.error.NoViableAltException(this);
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

function ParamValueContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_paramValue;
    this._ALPHANUMERIC = null; // Token
    return this;
}

ParamValueContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ParamValueContext.prototype.constructor = ParamValueContext;

ParamValueContext.prototype.ALPHANUMERIC = function() {
    return this.getToken(XEvalBaseParser.ALPHANUMERIC, 0);
};

ParamValueContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitParamValue(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.ParamValueContext = ParamValueContext;

XEvalBaseParser.prototype.paramValue = function() {

    var localctx = new ParamValueContext(this, this._ctx, this.state);
    this.enterRule(localctx, 18, XEvalBaseParser.RULE_paramValue);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 107;
        localctx._ALPHANUMERIC = this.match(XEvalBaseParser.ALPHANUMERIC);
        if (!xcHelper.checkNamePattern(PatternCategory.Param, PatternAction.Check, (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text))) {
            throw SyntaxError('Invalid parameter name. Name must start with ' +
                            'a letter and contain only alphanumeric characters or underscores. Parameter : ' + (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text));}
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

ColumnArgContext.prototype.colElement = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(ColElementContext);
    } else {
        return this.getTypedRuleContext(ColElementContext,i);
    }
};

ColumnArgContext.prototype.DOUBLECOLON = function() {
    return this.getToken(XEvalBaseParser.DOUBLECOLON, 0);
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
    this.enterRule(localctx, 20, XEvalBaseParser.RULE_columnArg);
    try {
        this.state = 115;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,7,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 110;
            this.colElement();
            this.state = 111;
            this.match(XEvalBaseParser.DOUBLECOLON);
            this.state = 112;
            this.colElement();
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 114;
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
    this._ALPHANUMERIC = null; // Token
    return this;
}

PrefixContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
PrefixContext.prototype.constructor = PrefixContext;

PrefixContext.prototype.ALPHANUMERIC = function() {
    return this.getToken(XEvalBaseParser.ALPHANUMERIC, 0);
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
    this.enterRule(localctx, 22, XEvalBaseParser.RULE_prefix);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 117;
        localctx._ALPHANUMERIC = this.match(XEvalBaseParser.ALPHANUMERIC);
        if (xcHelper.validatePrefixName((localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text), false, true)) {
            throw SyntaxError(xcHelper.validatePrefixName((localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text), false, true));
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

ColElementContext.prototype.LBRACKET = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(XEvalBaseParser.LBRACKET);
    } else {
        return this.getToken(XEvalBaseParser.LBRACKET, i);
    }
};


ColElementContext.prototype.integerLiteral = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(IntegerLiteralContext);
    } else {
        return this.getTypedRuleContext(IntegerLiteralContext,i);
    }
};

ColElementContext.prototype.RBRACKET = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(XEvalBaseParser.RBRACKET);
    } else {
        return this.getToken(XEvalBaseParser.RBRACKET, i);
    }
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
    this.enterRule(localctx, 24, XEvalBaseParser.RULE_colElement);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 120;
        this.colName();
        this.state = 125;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===XEvalBaseParser.DOT) {
            this.state = 121;
            this.match(XEvalBaseParser.DOT);
            this.state = 122;
            this.propertyName();
            this.state = 127;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
        }
        this.state = 134;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===XEvalBaseParser.LBRACKET) {
            this.state = 128;
            this.match(XEvalBaseParser.LBRACKET);
            this.state = 129;
            this.integerLiteral();
            this.state = 130;
            this.match(XEvalBaseParser.RBRACKET);
            this.state = 136;
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
    this._ALPHANUMERIC = null; // Token
    return this;
}

ColNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ColNameContext.prototype.constructor = ColNameContext;

ColNameContext.prototype.ALPHANUMERIC = function() {
    return this.getToken(XEvalBaseParser.ALPHANUMERIC, 0);
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
    this.enterRule(localctx, 26, XEvalBaseParser.RULE_colName);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 137;
        localctx._ALPHANUMERIC = this.match(XEvalBaseParser.ALPHANUMERIC);
        if ((localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text).toUpperCase() != "NONE" && xcHelper.validateBackendColName((localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text))) {
            throw SyntaxError(xcHelper.validateBackendColName((localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text)));
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
    this._ALPHANUMERIC = null; // Token
    return this;
}

PropertyNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
PropertyNameContext.prototype.constructor = PropertyNameContext;

PropertyNameContext.prototype.ALPHANUMERIC = function() {
    return this.getToken(XEvalBaseParser.ALPHANUMERIC, 0);
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
    this.enterRule(localctx, 28, XEvalBaseParser.RULE_propertyName);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 140;
        localctx._ALPHANUMERIC = this.match(XEvalBaseParser.ALPHANUMERIC);
        if (xcHelper.validateColName((localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text), false, true)) {
            throw SyntaxError(xcHelper.validateColName((localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text), false, true));
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

function AggValueContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_aggValue;
    this._ALPHANUMERIC = null; // Token
    return this;
}

AggValueContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
AggValueContext.prototype.constructor = AggValueContext;

AggValueContext.prototype.CARET = function() {
    return this.getToken(XEvalBaseParser.CARET, 0);
};

AggValueContext.prototype.ALPHANUMERIC = function() {
    return this.getToken(XEvalBaseParser.ALPHANUMERIC, 0);
};

AggValueContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitAggValue(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.AggValueContext = AggValueContext;

XEvalBaseParser.prototype.aggValue = function() {

    var localctx = new AggValueContext(this, this._ctx, this.state);
    this.enterRule(localctx, 30, XEvalBaseParser.RULE_aggValue);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 143;
        this.match(XEvalBaseParser.CARET);
        this.state = 144;
        localctx._ALPHANUMERIC = this.match(XEvalBaseParser.ALPHANUMERIC);
        if (!xcHelper.isValidTableName((localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text))) {
            throw SyntaxError(ErrTStr.InvalidAggName);
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
    this.enterRule(localctx, 32, XEvalBaseParser.RULE_integerLiteral);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 147;
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

DecimalLiteralContext.prototype.SCIENTIFICDECIMAL = function() {
    return this.getToken(XEvalBaseParser.SCIENTIFICDECIMAL, 0);
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
    this.enterRule(localctx, 34, XEvalBaseParser.RULE_decimalLiteral);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 149;
        _la = this._input.LA(1);
        if(!(_la===XEvalBaseParser.DECIMAL || _la===XEvalBaseParser.SCIENTIFICDECIMAL)) {
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
    this.enterRule(localctx, 36, XEvalBaseParser.RULE_stringLiteral);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 151;
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
    this.enterRule(localctx, 38, XEvalBaseParser.RULE_booleanLiteral);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 153;
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

grammar XEvalBase;
// Parser rules
query
    : expr EOF
    ;
expr
    : fn LPARENS fnArgs RPARENS
    | fn LPARENS RPARENS
    ;
fnArgs
    : arg (COMMA arg)*
    ;
arg
    : expr
    | integerLiteral
    | decimalLiteral
    | booleanLiteral
    | stringLiteral
    | columnArg
    | aggValue
    | paramArg
    ;
fn
    : moduleName COLON fnName
    | fnName
    ;
moduleName
    : ALPHANUMERIC
    {if (!xcHelper.checkNamePattern(PatternCategory.UDF, PatternAction.Check, $ALPHANUMERIC.text)) {
    throw SyntaxError('Invalid module name: ' + $ALPHANUMERIC.text);}}
    ;
fnName
    : ALPHANUMERIC
    {if (!xcHelper.checkNamePattern(PatternCategory.UDFFn, PatternAction.Check, $ALPHANUMERIC.text)) {
    throw SyntaxError('Invalid udf name: ' + $ALPHANUMERIC.text);}}
    ;
paramArg
    : (ALPHANUMERIC
    | INTEGER
    | DECIMAL
    | COLON
    | DOUBLECOLON
    | DOT
    | LBRACKET
    | RBRACKET
    | '-'
    | '_'
    | CARET)* LTSIGN paramValue GTSIGN paramAfter*
    ;
paramAfter
    : (ALPHANUMERIC
    | INTEGER
    | DECIMAL
    | COLON
    | DOUBLECOLON
    | DOT
    | LBRACKET
    | RBRACKET
    | '-'
    | '_'
    | CARET)
    | LTSIGN paramValue GTSIGN
    ;
paramValue
    : ALPHANUMERIC
    {if (!xcHelper.checkNamePattern(PatternCategory.Param2, PatternAction.Check, $ALPHANUMERIC.text)) {
    throw SyntaxError('Invalid parameter name. Name must start with ' +
                    'a letter and contain only alphanumeric characters or underscores. Parameter : ' + $ALPHANUMERIC.text);}}
    ;
columnArg
    : prefix DOUBLECOLON colElement
    | colElement
    ;
prefix
    : ALPHANUMERIC
    {if (xcHelper.validatePrefixName($ALPHANUMERIC.text, false, true)) {
    throw SyntaxError(xcHelper.validatePrefixName($ALPHANUMERIC.text, false, true));
    }}
    ;
colElement
    : colName (DOT propertyName)* (LBRACKET integerLiteral RBRACKET)*
    ;
colName
    : ALPHANUMERIC
    {if ($ALPHANUMERIC.text.toUpperCase() != "NONE" && xcHelper.validateBackendColName($ALPHANUMERIC.text)) {
    throw SyntaxError(xcHelper.validateBackendColName($ALPHANUMERIC.text));
    }}
    ;
propertyName
    : ALPHANUMERIC
    {if (xcHelper.validateColName($ALPHANUMERIC.text, false, true)) {
    throw SyntaxError(xcHelper.validateColName($ALPHANUMERIC.text, false, true));
    }}
    ;
aggValue
    : CARET ALPHANUMERIC
    {if (!xcHelper.isValidTableName($ALPHANUMERIC.text)) {
    throw SyntaxError(ErrTStr.InvalidAggName);
    }}
    ;
integerLiteral
    : INTEGER
    ;
decimalLiteral
    : DECIMAL
    ;
stringLiteral
    : STRING
    ;
booleanLiteral
    : TRUE | FALSE
    ;

// Lexer rules
TRUE: T R U E;
FALSE: F A L S E;
COLON: ':';
DOUBLECOLON: '::';
DOT: '.';
COMMA: ',';
LPARENS: '(';
RPARENS: ')';
LBRACKET: '[';
RBRACKET: ']';
LCURLYBRACE: '{';
RCURLYBRACE: '}';
BACKSLASH: '\\';
LTSIGN: '<';
GTSIGN: '>';
CARET: '^';
DECIMAL: '-'? DIGIT+ '.' DIGIT+;
INTEGER: '-'? DIGIT+;
STRING: ('"' ( ~('"'|'\\') | ('\\' .) )* '"') | ('\'' ( ~('\''|'\\') | ('\\' .) )* '\'');
APOSTROPHE: '\'';
SINGLEQUOTE: '"';
ALPHANUMERIC: (ALPHANUMS | [_-]) (CHARALLOWED* (CHARALLOWED | ' '))?;
fragment A : [aA]; // match either an 'a' or 'A'
fragment B : [bB];
fragment C : [cC];
fragment D : [dD];
fragment E : [eE];
fragment F : [fF];
fragment G : [gG];
fragment H : [hH];
fragment I : [iI];
fragment J : [jJ];
fragment K : [kK];
fragment L : [lL];
fragment M : [mM];
fragment N : [nN];
fragment O : [oO];
fragment P : [pP];
fragment Q : [qQ];
fragment R : [rR];
fragment S : [sS];
fragment T : [tT];
fragment U : [uU];
fragment V : [vV];
fragment W : [wW];
fragment X : [xX];
fragment Y : [yY];
fragment Z : [zZ];
fragment DIGIT: [0-9];
fragment ALPHAS: [a-zA-Z];
fragment ALPHANUMS: [a-zA-Z0-9];
fragment CHARALLOWED: ~('(' | ')' | '[' | ']' | '{' | '}' | '^' | ',' | ':' | '"' | '\\' | '\'' | ' ');
WS
    : [ \r\n\t]+ -> channel(HIDDEN)
    ;
UNRECOGNIZED
    : .
    ;
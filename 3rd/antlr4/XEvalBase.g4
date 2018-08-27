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
    ;
fn
    : moduleName COLON fnName
    | fnName
    ;
moduleName
    : IDENTIFIER
    {if (!xcHelper.checkNamePattern(PatternCategory.UDF, PatternAction.Check, $IDENTIFIER.text)) {
    throw SyntaxError('Invalid module name: ' + $IDENTIFIER.text);}}
    ;
fnName
    : IDENTIFIER
    {if (!xcHelper.checkNamePattern(PatternCategory.UDFFn, PatternAction.Check, $IDENTIFIER.text)) {
    throw SyntaxError('Invalid udf name: ' + $IDENTIFIER.text);}}
    ;
columnArg
    : prefix DOUBLECOLON colElement
    | colElement
    ;
prefix
    : IDENTIFIER
    {if (xcHelper.validatePrefixName($IDENTIFIER.text, false, true)) {
    throw SyntaxError(xcHelper.validatePrefixName($IDENTIFIER.text, false, true));
    }}
    ;
colElement
    : colName (DOT propertyName)* (LBRACKET integerLiteral RBRACKET)?
    ;
colName
    : IDENTIFIER
    {if ($IDENTIFIER.text.toUpperCase() != "NONE" && xcHelper.validateColName($IDENTIFIER.text, false, true)) {
    throw SyntaxError(xcHelper.validateColName($IDENTIFIER.text, false, true));
    }}
    ;
propertyName
    : IDENTIFIER
    {if (xcHelper.validateColName($IDENTIFIER.text, false, true)) {
    throw SyntaxError(xcHelper.validateColName($IDENTIFIER.text, false, true));
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
DECIMAL: '-'? DIGIT+ '.' DIGIT+;
INTEGER: '-'? DIGIT+;
STRING: '"' ( ~('"'|'\\') | ('\\' .) )* '"';
IDENTIFIER: (ALPHANUMS | [_^-]) ((ALPHANUMS | [_^-] | ' ')* (ALPHANUMS | [_^-]))?;
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
WS
    : [ \r\n\t]+ -> channel(HIDDEN)
    ;
UNRECOGNIZED
    : .
    ;
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
    : value COMMA fnArgs
    | value
    ;
value
    : expr
    | INTEGER
    | DECIMAL
    | booleanValue
    | STRING
    | varName
    ;
fn
    : moduleName COLON fnName
    | fnName
    ;
moduleName
    : IDENTIFIER
    {if ($IDENTIFIER.text.match(/^[a-z_][a-zA-Z0-9_-]*$/) == null) {
    throw SyntaxError('Invalid module name: ' + $IDENTIFIER.text);}}
    ;
fnName
    : IDENTIFIER
    {if ($IDENTIFIER.text.match(/^[a-z_][a-zA-Z0-9_]*$/) == null) {
    throw SyntaxError('Invalid udf name: ' + $IDENTIFIER.text);}}
    ;
varName
    : prefix DOUBLECOLON colName
    | colName
    ;
prefix
    : IDENTIFIER
    {if ($IDENTIFIER.text.match(/^[a-zA-Z0-9_-]{1,31}$/) == null) {
    throw SyntaxError('Invalid prefix name: ' + $IDENTIFIER.text);}}
    ;
colName
    : IDENTIFIER
    {if ($IDENTIFIER.text.match(/^(?!--.*)([a-zA-Z_^-](((?!--)[a-zA-Z0-9_^ -])*[a-zA-Z0-9_^-])?)$/) == null) {
    throw SyntaxError('Invalid column name: ' + $IDENTIFIER.text);}}
    ;
booleanValue
    : TRUE | FALSE
    ;
// Lexer rules
TRUE: T R U E;
FALSE: F A L S E;
COLON: ':';
DOUBLECOLON: '::';
COMMA: ',';
LPARENS: '(';
RPARENS: ')';
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
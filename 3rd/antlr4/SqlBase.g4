/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is an adaptation of Presto's presto-parser/src/main/antlr4/com/facebook/presto/sql/parser/SqlBase.g4 grammar.
 */

grammar SqlBase;

@members {
  /**
   * Verify whether current token is a valid decimal token (which contains dot).
   * Returns true if the character that follows the token is not a digit or letter or underscore.
   *
   * For example:
   * For char stream "2.3", "2." is not a valid decimal token, because it is followed by digit '3'.
   * For char stream "2.3_", "2.3" is not a valid decimal token, because it is followed by '_'.
   * For char stream "2.3W", "2.3" is not a valid decimal token, because it is followed by 'W'.
   * For char stream "12.0D 34.E2+0.12 "  12.0D is a valid decimal token because it is followed
   * by a space. 34.E2 is a valid decimal token because it is followed by symbol '+'
   * which is not a digit or letter or underscore.
   */
  function isValidDecimal() {
    var nextChar = this._input.LA(1);
    if (nextChar >= 'A' && nextChar <= 'Z' || nextChar >= '0' && nextChar <= '9' ||
      nextChar == '_') {
      return false;
    } else {
      return true;
    }
  }
}

singleStatement
    : statement EOF
    ;

singleExpression
    : namedExpression EOF
    ;

singleTableIdentifier
    : tableIdentifier EOF
    ;

singleFunctionIdentifier
    : functionIdentifier EOF
    ;

singleDataType
    : dataType EOF
    ;

singleTableSchema
    : colTypeList EOF
    ;

statements
    : statement (';'+ statement)* ';'? EOF
    ;

statement
    : query                                                            #statementDefault
    | USE db=identifier                                                #use
    | CREATE DATABASE (IF NOT EXISTS)? identifier
        (COMMENT comment=STRING)? locationSpec?
        (WITH DBPROPERTIES tablePropertyList)?                         #createDatabase
    | ALTER DATABASE identifier SET DBPROPERTIES tablePropertyList     #setDatabaseProperties
    | DROP DATABASE (IF EXISTS)? identifier (RESTRICT | CASCADE)?      #dropDatabase
    | createTableHeader ('(' colTypeList ')')? tableProvider
        ((OPTIONS options=tablePropertyList) |
        (PARTITIONED BY partitionColumnNames=identifierList) |
        bucketSpec |
        locationSpec |
        (COMMENT comment=STRING) |
        (TBLPROPERTIES tableProps=tablePropertyList))*
        (AS? query)?                                                   #createTable
    | createTableHeader ('(' columns=colTypeList ')')?
        ((COMMENT comment=STRING) |
        (PARTITIONED BY '(' partitionColumns=colTypeList ')') |
        bucketSpec |
        skewSpec |
        rowFormat |
        createFileFormat |
        locationSpec |
        (TBLPROPERTIES tableProps=tablePropertyList))*
        (AS? query)?                                                   #createHiveTable
    | CREATE TABLE (IF NOT EXISTS)? target=tableIdentifier
        LIKE source=tableIdentifier locationSpec?                      #createTableLike
    | ANALYZE TABLE tableIdentifier partitionSpec? COMPUTE STATISTICS
        (identifier | FOR COLUMNS identifierSeq)?                      #analyze
    | ALTER TABLE tableIdentifier
        ADD COLUMNS '(' columns=colTypeList ')'                        #addTableColumns
    | ALTER (TABLE | VIEW) from=tableIdentifier
        RENAME TO to=tableIdentifier                                   #renameTable
    | ALTER (TABLE | VIEW) tableIdentifier
        SET TBLPROPERTIES tablePropertyList                            #setTableProperties
    | ALTER (TABLE | VIEW) tableIdentifier
        UNSET TBLPROPERTIES (IF EXISTS)? tablePropertyList             #unsetTableProperties
    | ALTER TABLE tableIdentifier partitionSpec?
        CHANGE COLUMN? identifier colType colPosition?                 #changeColumn
    | ALTER TABLE tableIdentifier (partitionSpec)?
        SET SERDE STRING (WITH SERDEPROPERTIES tablePropertyList)?     #setTableSerDe
    | ALTER TABLE tableIdentifier (partitionSpec)?
        SET SERDEPROPERTIES tablePropertyList                          #setTableSerDe
    | ALTER TABLE tableIdentifier ADD (IF NOT EXISTS)?
        partitionSpecLocation+                                         #addTablePartition
    | ALTER VIEW tableIdentifier ADD (IF NOT EXISTS)?
        partitionSpec+                                                 #addTablePartition
    | ALTER TABLE tableIdentifier
        from=partitionSpec RENAME TO to=partitionSpec                  #renameTablePartition
    | ALTER TABLE tableIdentifier
        DROP (IF EXISTS)? partitionSpec (',' partitionSpec)* PURGE?    #dropTablePartitions
    | ALTER VIEW tableIdentifier
        DROP (IF EXISTS)? partitionSpec (',' partitionSpec)*           #dropTablePartitions
    | ALTER TABLE tableIdentifier partitionSpec? SET locationSpec      #setTableLocation
    | ALTER TABLE tableIdentifier RECOVER PARTITIONS                   #recoverPartitions
    | DROP TABLE (IF EXISTS)? tableIdentifier PURGE?                   #dropTable
    | DROP VIEW (IF EXISTS)? tableIdentifier                           #dropTable
    | CREATE (OR REPLACE)? (GLOBAL? TEMPORARY)?
        VIEW (IF NOT EXISTS)? tableIdentifier
        identifierCommentList? (COMMENT STRING)?
        (PARTITIONED ON identifierList)?
        (TBLPROPERTIES tablePropertyList)? AS query                    #createView
    | CREATE (OR REPLACE)? GLOBAL? TEMPORARY VIEW
        tableIdentifier ('(' colTypeList ')')? tableProvider
        (OPTIONS tablePropertyList)?                                   #createTempViewUsing
    | ALTER VIEW tableIdentifier AS? query                             #alterViewQuery
    | CREATE (OR REPLACE)? TEMPORARY? SQLFUNCTION (IF NOT EXISTS)?
        qualifiedName AS className=STRING
        (USING resource (',' resource)*)?                              #createFunction
    | DROP TEMPORARY? SQLFUNCTION (IF EXISTS)? qualifiedName              #dropFunction
    | EXPLAIN (LOGICAL | FORMATTED | EXTENDED | CODEGEN | COST)?
        statement                                                      #explain
    | SHOW TABLES ((FROM | IN) db=identifier)?
        (LIKE? pattern=STRING)?                                        #showTables
    | SHOW TABLE EXTENDED ((FROM | IN) db=identifier)?
        LIKE pattern=STRING partitionSpec?                             #showTable
    | SHOW DATABASES (LIKE? pattern=STRING)?                           #showDatabases
    | SHOW TBLPROPERTIES table=tableIdentifier
        ('(' key=tablePropertyKey ')')?                                #showTblProperties
    | SHOW COLUMNS (FROM | IN) tableIdentifier
        ((FROM | IN) db=identifier)?                                   #showColumns
    | SHOW PARTITIONS tableIdentifier partitionSpec?                   #showPartitions
    | SHOW identifier? FUNCTIONS
        (LIKE? (qualifiedName | pattern=STRING))?                      #showFunctions
    | SHOW CREATE TABLE tableIdentifier                                #showCreateTable
    | (DESC | DESCRIBE) SQLFUNCTION EXTENDED? describeFuncName            #describeFunction
    | (DESC | DESCRIBE) DATABASE EXTENDED? identifier                  #describeDatabase
    | (DESC | DESCRIBE) TABLE? option=(EXTENDED | FORMATTED)?
        tableIdentifier partitionSpec? describeColName?                #describeTable
    | REFRESH TABLE tableIdentifier                                    #refreshTable
    | REFRESH (STRING | .*?)                                           #refreshResource
    | CACHE LAZY? TABLE tableIdentifier (AS? query)?                   #cacheTable
    | UNCACHE TABLE (IF EXISTS)? tableIdentifier                       #uncacheTable
    | CLEAR CACHE                                                      #clearCache
    | LOAD DATA LOCAL? INPATH path=STRING OVERWRITE? INTO TABLE
        tableIdentifier partitionSpec?                                 #loadData
    | TRUNCATE TABLE tableIdentifier partitionSpec?                    #truncateTable
    | MSCK REPAIR TABLE tableIdentifier                                #repairTable
    | op=(ADD | LIST) identifier .*?                                   #manageResource
    | SET ROLE .*?                                                     #failNativeCommand
    | SET .*?                                                          #setConfiguration
    | RESET                                                            #resetConfiguration
    | unsupportedHiveNativeCommands .*?                                #failNativeCommand
    ;

unsupportedHiveNativeCommands
    : kw1=CREATE kw2=ROLE
    | kw1=DROP kw2=ROLE
    | kw1=GRANT kw2=ROLE?
    | kw1=REVOKE kw2=ROLE?
    | kw1=SHOW kw2=GRANT
    | kw1=SHOW kw2=ROLE kw3=GRANT?
    | kw1=SHOW kw2=PRINCIPALS
    | kw1=SHOW kw2=ROLES
    | kw1=SHOW kw2=CURRENT kw3=ROLES
    | kw1=EXPORT kw2=TABLE
    | kw1=IMPORT kw2=TABLE
    | kw1=SHOW kw2=COMPACTIONS
    | kw1=SHOW kw2=CREATE kw3=TABLE
    | kw1=SHOW kw2=TRANSACTIONS
    | kw1=SHOW kw2=INDEXES
    | kw1=SHOW kw2=LOCKS
    | kw1=CREATE kw2=INDEX
    | kw1=DROP kw2=INDEX
    | kw1=ALTER kw2=INDEX
    | kw1=LOCK kw2=TABLE
    | kw1=LOCK kw2=DATABASE
    | kw1=UNLOCK kw2=TABLE
    | kw1=UNLOCK kw2=DATABASE
    | kw1=CREATE kw2=TEMPORARY kw3=MACRO
    | kw1=DROP kw2=TEMPORARY kw3=MACRO
    | kw1=ALTER kw2=TABLE tableIdentifier kw3=NOT kw4=CLUSTERED
    | kw1=ALTER kw2=TABLE tableIdentifier kw3=CLUSTERED kw4=BY
    | kw1=ALTER kw2=TABLE tableIdentifier kw3=NOT kw4=SORTED
    | kw1=ALTER kw2=TABLE tableIdentifier kw3=SKEWED kw4=BY
    | kw1=ALTER kw2=TABLE tableIdentifier kw3=NOT kw4=SKEWED
    | kw1=ALTER kw2=TABLE tableIdentifier kw3=NOT kw4=STORED kw5=AS kw6=DIRECTORIES
    | kw1=ALTER kw2=TABLE tableIdentifier kw3=SET kw4=SKEWED kw5=LOCATION
    | kw1=ALTER kw2=TABLE tableIdentifier kw3=EXCHANGE kw4=PARTITION
    | kw1=ALTER kw2=TABLE tableIdentifier kw3=ARCHIVE kw4=PARTITION
    | kw1=ALTER kw2=TABLE tableIdentifier kw3=UNARCHIVE kw4=PARTITION
    | kw1=ALTER kw2=TABLE tableIdentifier kw3=TOUCH
    | kw1=ALTER kw2=TABLE tableIdentifier partitionSpec? kw3=COMPACT
    | kw1=ALTER kw2=TABLE tableIdentifier partitionSpec? kw3=CONCATENATE
    | kw1=ALTER kw2=TABLE tableIdentifier partitionSpec? kw3=SET kw4=FILEFORMAT
    | kw1=ALTER kw2=TABLE tableIdentifier partitionSpec? kw3=REPLACE kw4=COLUMNS
    | kw1=START kw2=TRANSACTION
    | kw1=COMMIT
    | kw1=ROLLBACK
    | kw1=DFS
    | kw1=DELETE kw2=FROM
    ;

createTableHeader
    : CREATE TEMPORARY? EXTERNAL? TABLE (IF NOT EXISTS)? tableIdentifier
    ;

bucketSpec
    : CLUSTERED BY identifierList
      (SORTED BY orderedIdentifierList)?
      INTO INTEGER_VALUE BUCKETS
    ;

skewSpec
    : SKEWED BY identifierList
      ON (constantList | nestedConstantList)
      (STORED AS DIRECTORIES)?
    ;

locationSpec
    : LOCATION STRING
    ;

query
    : ctes? queryNoWith
    ;

insertInto
    : INSERT OVERWRITE TABLE tableIdentifier (partitionSpec (IF NOT EXISTS)?)?                              #insertOverwriteTable
    | INSERT INTO TABLE? tableIdentifier partitionSpec?                                                     #insertIntoTable
    | INSERT OVERWRITE LOCAL? DIRECTORY path=STRING rowFormat? createFileFormat?                            #insertOverwriteHiveDir
    | INSERT OVERWRITE LOCAL? DIRECTORY (path=STRING)? tableProvider (OPTIONS options=tablePropertyList)?   #insertOverwriteDir
    ;

partitionSpecLocation
    : partitionSpec locationSpec?
    ;

partitionSpec
    : PARTITION '(' partitionVal (',' partitionVal)* ')'
    ;

partitionVal
    : identifier (EQ constant)?
    ;

describeFuncName
    : qualifiedName
    | STRING
    | comparisonOperator
    | arithmeticOperator
    | predicateOperator
    ;

describeColName
    : nameParts+=identifier ('.' nameParts+=identifier)*
    ;

ctes
    : WITH namedQuery (',' namedQuery)*
    ;

namedQuery
    : name=identifier AS? '(' query ')'
    ;

tableProvider
    : USING qualifiedName
    ;

tablePropertyList
    : '(' tableProperty (',' tableProperty)* ')'
    ;

tableProperty
    : key=tablePropertyKey (EQ? value=tablePropertyValue)?
    ;

tablePropertyKey
    : identifier ('.' identifier)*
    | STRING
    ;

tablePropertyValue
    : INTEGER_VALUE
    | DECIMAL_VALUE
    | booleanValue
    | STRING
    ;

constantList
    : '(' constant (',' constant)* ')'
    ;

nestedConstantList
    : '(' constantList (',' constantList)* ')'
    ;

createFileFormat
    : STORED AS fileFormat
    | STORED BY storageHandler
    ;

fileFormat
    : INPUTFORMAT inFmt=STRING OUTPUTFORMAT outFmt=STRING    #tableFileFormat
    | identifier                                             #genericFileFormat
    ;

storageHandler
    : STRING (WITH SERDEPROPERTIES tablePropertyList)?
    ;

resource
    : identifier STRING
    ;

queryNoWith
    : insertInto? queryTerm queryOrganization                                              #singleInsertQuery
    | fromClause multiInsertQueryBody+                                                     #multiInsertQuery
    ;

queryOrganization
    : (ORDER BY order+=sortItem (',' order+=sortItem)*)?
      (CLUSTER BY clusterBy+=expression (',' clusterBy+=expression)*)?
      (DISTRIBUTE BY distributeBy+=expression (',' distributeBy+=expression)*)?
      (SORT BY sort+=sortItem (',' sort+=sortItem)*)?
      windows?
      (LIMIT (ALL | limit=expression))?
    ;

multiInsertQueryBody
    : insertInto?
      querySpecification
      queryOrganization
    ;

queryTerm
    : queryPrimary                                                                         #queryTermDefault
    | left=queryTerm operator=(INTERSECT | UNION | EXCEPT | SETMINUS) setQuantifier? right=queryTerm  #setOperation
    ;

queryPrimary
    : querySpecification                                                    #queryPrimaryDefault
    | TABLE tableIdentifier                                                 #table
    | inlineTable                                                           #inlineTableDefault1
    | '(' queryNoWith  ')'                                                  #subquery
    ;

sortItem
    : expression ordering=(ASC | DESC)? (NULLS nullOrder=(LAST | FIRST))?
    ;

querySpecification
    : (((SELECT kind=TRANSFORM '(' namedExpressionSeq ')'
        | kind=MAP namedExpressionSeq
        | kind=REDUCE namedExpressionSeq))
       inRowFormat=rowFormat?
       (RECORDWRITER recordWriter=STRING)?
       USING script=STRING
       (AS (identifierSeq | colTypeList | ('(' (identifierSeq | colTypeList) ')')))?
       outRowFormat=rowFormat?
       (RECORDREADER recordReader=STRING)?
       fromClause?
       (WHERE where=booleanExpression)?)
    | ((kind=SELECT (hints+=hint)* setQuantifier? namedExpressionSeq fromClause?
       | fromClause (kind=SELECT setQuantifier? namedExpressionSeq)?)
       lateralView*
       (WHERE where=booleanExpression)?
       aggregation?
       (HAVING having=booleanExpression)?
       windows?)
    ;

hint
    : '/*+' hintStatements+=hintStatement (','? hintStatements+=hintStatement)* '*/'
    ;

hintStatement
    : hintName=identifier
    | hintName=identifier '(' parameters+=primaryExpression (',' parameters+=primaryExpression)* ')'
    ;

fromClause
    : FROM relation (',' relation)* lateralView* pivotClause?
    ;

aggregation
    : GROUP BY groupingExpressions+=expression (',' groupingExpressions+=expression)* (
      WITH kind=ROLLUP
    | WITH kind=CUBE
    | kind=GROUPING SETS '(' groupingSet (',' groupingSet)* ')')?
    | GROUP BY kind=GROUPING SETS '(' groupingSet (',' groupingSet)* ')'
    ;

groupingSet
    : '(' (expression (',' expression)*)? ')'
    | expression
    ;

pivotClause
    : PIVOT '(' aggregates=namedExpressionSeq FOR pivotColumn IN '(' pivotValues+=pivotValue (',' pivotValues+=pivotValue)* ')' ')'
    ;

pivotColumn
    : identifiers+=identifier
    | '(' identifiers+=identifier (',' identifiers+=identifier)* ')'
    ;

pivotValue
    : expression (AS? identifier)?
    ;

lateralView
    : LATERAL VIEW (OUTER)? qualifiedName '(' (expression (',' expression)*)? ')' tblName=identifier (AS? colName+=identifier (',' colName+=identifier)*)?
    ;

setQuantifier
    : DISTINCT
    | ALL
    ;

relation
    : relationPrimary joinRelation*
    ;

joinRelation
    : (joinType) JOIN right=relationPrimary joinCriteria?
    | NATURAL joinType JOIN right=relationPrimary
    ;

joinType
    : INNER?
    | CROSS
    | LEFT OUTER?
    | LEFT SEMI
    | RIGHT OUTER?
    | FULL OUTER?
    | LEFT? ANTI
    ;

joinCriteria
    : ON booleanExpression
    | USING '(' identifier (',' identifier)* ')'
    ;

sample
    : TABLESAMPLE '(' sampleMethod? ')'
    ;

sampleMethod
    : negativeSign=MINUS? percentage=(INTEGER_VALUE | DECIMAL_VALUE) PERCENTLIT   #sampleByPercentile
    | expression ROWS                                                             #sampleByRows
    | sampleType=BUCKET numerator=INTEGER_VALUE OUT OF denominator=INTEGER_VALUE
        (ON (identifier | qualifiedName '(' ')'))?                                #sampleByBucket
    | bytes=expression                                                            #sampleByBytes
    ;

identifierList
    : '(' identifierSeq ')'
    ;

identifierSeq
    : identifier (',' identifier)*
    ;

orderedIdentifierList
    : '(' orderedIdentifier (',' orderedIdentifier)* ')'
    ;

orderedIdentifier
    : identifier ordering=(ASC | DESC)?
    ;

identifierCommentList
    : '(' identifierComment (',' identifierComment)* ')'
    ;

identifierComment
    : identifier (COMMENT STRING)?
    ;

relationPrimary
    : tableIdentifierWithFunc sample? tableAlias      #tableName
    | '(' queryNoWith ')' sample? tableAlias  #aliasedQuery
    | '(' relation ')' sample? tableAlias     #aliasedRelation
    | inlineTable                             #inlineTableDefault2
    | functionTable                           #tableValuedFunction
    ;

inlineTable
    : VALUES expression (',' expression)* tableAlias
    ;

functionTable
    : identifier '(' (expression (',' expression)*)? ')' tableAlias
    ;

tableAlias
    : (AS? strictIdentifier identifierList?)?
    ;

rowFormat
    : ROW FORMAT SERDE name=STRING (WITH SERDEPROPERTIES props=tablePropertyList)?  #rowFormatSerde
    | ROW FORMAT DELIMITED
      (FIELDS TERMINATED BY fieldsTerminatedBy=STRING (ESCAPED BY escapedBy=STRING)?)?
      (COLLECTION ITEMS TERMINATED BY collectionItemsTerminatedBy=STRING)?
      (MAP KEYS TERMINATED BY keysTerminatedBy=STRING)?
      (LINES TERMINATED BY linesSeparatedBy=STRING)?
      (NULL DEFINED AS nullDefinedAs=STRING)?                                       #rowFormatDelimited
    ;

tableIdentifierWithFunc
    : tableIdentifier
    | sqlFuncIdentifier '(' tableIdentifierWithFunc (',' tableIdentifierWithFunc)* ')'
    ;

tableIdentifier
    : (db=identifier '.')? table=identifier
    ;

functionIdentifier
    : (db=identifier '.')? sqlfunction=identifier
    ;

namedExpression
    : expression (AS? (identifier | identifierList))?
    ;

namedExpressionSeq
    : namedExpression (',' namedExpression)*
    ;

expression
    : booleanExpression
    ;

booleanExpression
    : NOT booleanExpression                                        #logicalNot
    | EXISTS '(' query ')'                                         #exists
    | valueExpression predicate?                                   #predicated
    | left=booleanExpression operator=AND right=booleanExpression  #logicalBinary
    | left=booleanExpression operator=OR right=booleanExpression   #logicalBinary
    ;

predicate
    : NOT? kind=BETWEEN lower=valueExpression AND upper=valueExpression
    | NOT? kind=IN '(' expression (',' expression)* ')'
    | NOT? kind=IN '(' query ')'
    | NOT? kind=(RLIKE | LIKE) pattern=valueExpression
    | IS NOT? kind=NULL
    | IS NOT? kind=DISTINCT FROM right=valueExpression
    ;

valueExpression
    : primaryExpression                                                                      #valueExpressionDefault
    | operator=(MINUS | PLUS | TILDE) valueExpression                                        #arithmeticUnary
    | left=valueExpression operator=(ASTERISK | SLASH | PERCENT | DIV) right=valueExpression #arithmeticBinary
    | left=valueExpression operator=(PLUS | MINUS | CONCAT_PIPE) right=valueExpression       #arithmeticBinary
    | left=valueExpression operator=AMPERSAND right=valueExpression                          #arithmeticBinary
    | left=valueExpression operator=HAT right=valueExpression                                #arithmeticBinary
    | left=valueExpression operator=PIPE right=valueExpression                               #arithmeticBinary
    | left=valueExpression comparisonOperator right=valueExpression                          #comparison
    ;

primaryExpression
    : CASE whenClause+ (ELSE elseExpression=expression)? END                                   #searchedCase
    | CASE value=expression whenClause+ (ELSE elseExpression=expression)? END                  #simpleCase
    | CAST '(' expression AS dataType ')'                                                      #cast
    | STRUCT '(' (argument+=namedExpression (',' argument+=namedExpression)*)? ')'             #struct
    | FIRST '(' expression (IGNORE NULLS)? ')'                                                 #first
    | LAST '(' expression (IGNORE NULLS)? ')'                                                  #last
    | POSITION '(' substr=valueExpression IN str=valueExpression ')'                           #position
    | constant                                                                                 #constantDefault
    | ASTERISK                                                                                 #star
    | qualifiedName '.' ASTERISK                                                               #star
    | '(' namedExpression (',' namedExpression)+ ')'                                           #rowConstructor
    | '(' query ')'                                                                            #subqueryExpression
    | qualifiedName '(' (setQuantifier? argument+=expression (',' argument+=expression)*)? ')'
       (OVER windowSpec)?                                                                      #functionCall
    | qualifiedName '(' trimOption=(BOTH | LEADING | TRAILING) argument+=expression
      FROM argument+=expression ')'                                                            #functionCall
    | value=primaryExpression '[' index=valueExpression ']'                                    #subscript
    | identifier                                                                               #columnReference
    | base=primaryExpression '.' fieldName=identifier                                          #dereference
    | '(' expression ')'                                                                       #parenthesizedExpression
    | EXTRACT '(' field=identifier FROM source=valueExpression ')'                             #extract
    ;

constant
    : NULL                                                                                     #nullLiteral
    | interval                                                                                 #intervalLiteral
    | identifier STRING                                                                        #typeConstructor
    | number                                                                                   #numericLiteral
    | booleanValue                                                                             #booleanLiteral
    | STRING+                                                                                  #stringLiteral
    ;

comparisonOperator
    : EQ | NEQ | NEQJ | LT | LTE | GT | GTE | NSEQ
    ;

arithmeticOperator
    : PLUS | MINUS | ASTERISK | SLASH | PERCENT | DIV | TILDE | AMPERSAND | PIPE | CONCAT_PIPE | HAT
    ;

predicateOperator
    : OR | AND | IN | NOT
    ;

booleanValue
    : TRUE | FALSE
    ;

interval
    : INTERVAL intervalField*
    ;

intervalField
    : value=intervalValue unit=identifier (TO to=identifier)?
    ;

intervalValue
    : (PLUS | MINUS)? (INTEGER_VALUE | DECIMAL_VALUE)
    | STRING
    ;

colPosition
    : FIRST | AFTER identifier
    ;

dataType
    : complex=ARRAY '<' dataType '>'                            #complexDataType
    | complex=MAP '<' dataType ',' dataType '>'                 #complexDataType
    | complex=STRUCT ('<' complexColTypeList? '>' | NEQ)        #complexDataType
    | identifier ('(' INTEGER_VALUE (',' INTEGER_VALUE)* ')')?  #primitiveDataType
    ;

colTypeList
    : colType (',' colType)*
    ;

colType
    : identifier dataType (COMMENT STRING)?
    ;

complexColTypeList
    : complexColType (',' complexColType)*
    ;

complexColType
    : identifier ':' dataType (COMMENT STRING)?
    ;

whenClause
    : WHEN condition=expression THEN result=expression
    ;

windows
    : WINDOW namedWindow (',' namedWindow)*
    ;

namedWindow
    : identifier AS windowSpec
    ;

windowSpec
    : name=identifier  #windowRef
    | '('
      ( CLUSTER BY partition+=expression (',' partition+=expression)*
      | ((PARTITION | DISTRIBUTE) BY partition+=expression (',' partition+=expression)*)?
        ((ORDER | SORT) BY sortItem (',' sortItem)*)?)
      windowFrame?
      ')'              #windowDef
    ;

windowFrame
    : frameType=RANGE start=frameBound
    | frameType=ROWS start=frameBound
    | frameType=RANGE BETWEEN start=frameBound AND end=frameBound
    | frameType=ROWS BETWEEN start=frameBound AND end=frameBound
    ;

frameBound
    : UNBOUNDED boundType=(PRECEDING | FOLLOWING)
    | boundType=CURRENT ROW
    | expression boundType=(PRECEDING | FOLLOWING)
    ;

qualifiedName
    : identifier ('.' identifier)*
    ;

identifier
    : strictIdentifier
    | ANTI | FULL | INNER | LEFT | SEMI | RIGHT | NATURAL | JOIN | CROSS | ON
    | UNION | INTERSECT | EXCEPT | SETMINUS
    ;

sqlFuncIdentifier
    : IDENTIFIER
    | nonReserved
    | ANTI | FULL | INNER | LEFT | SEMI | RIGHT | NATURAL | JOIN | CROSS | ON
    | UNION | INTERSECT | EXCEPT | SETMINUS
    ;

strictIdentifier
    : IDENTIFIER             #unquotedIdentifier
    | quotedIdentifier       #quotedIdentifierAlternative
    | nonReserved            #unquotedIdentifier
    ;

quotedIdentifier
    : BACKQUOTED_IDENTIFIER
    ;

number
    : MINUS? DECIMAL_VALUE            #decimalLiteral
    | MINUS? INTEGER_VALUE            #integerLiteral
    | MINUS? BIGINT_LITERAL           #bigIntLiteral
    | MINUS? SMALLINT_LITERAL         #smallIntLiteral
    | MINUS? TINYINT_LITERAL          #tinyIntLiteral
    | MINUS? DOUBLE_LITERAL           #doubleLiteral
    | MINUS? BIGDECIMAL_LITERAL       #bigDecimalLiteral
    ;

nonReserved
    : SHOW | TABLES | COLUMNS | COLUMN | PARTITIONS | FUNCTIONS | DATABASES
    | ADD
    | OVER | PARTITION | RANGE | ROWS | PRECEDING | FOLLOWING | CURRENT | ROW | LAST | FIRST | AFTER
    | MAP | ARRAY | STRUCT
    | PIVOT | LATERAL | WINDOW | REDUCE | TRANSFORM | SERDE | SERDEPROPERTIES | RECORDREADER
    | DELIMITED | FIELDS | TERMINATED | COLLECTION | ITEMS | KEYS | ESCAPED | LINES | SEPARATED
    | EXTENDED | REFRESH | CLEAR | CACHE | UNCACHE | LAZY | GLOBAL | TEMPORARY | OPTIONS
    | GROUPING | CUBE | ROLLUP
    | EXPLAIN | FORMAT | LOGICAL | FORMATTED | CODEGEN | COST
    | TABLESAMPLE | USE | TO | BUCKET | PERCENTLIT | OUT | OF
    | SET | RESET
    | VIEW | REPLACE
    | IF
    | POSITION
    | EXTRACT
    | NO | DATA
    | START | TRANSACTION | COMMIT | ROLLBACK | IGNORE
    | SORT | CLUSTER | DISTRIBUTE | UNSET | TBLPROPERTIES | SKEWED | STORED | DIRECTORIES | LOCATION
    | EXCHANGE | ARCHIVE | UNARCHIVE | FILEFORMAT | TOUCH | COMPACT | CONCATENATE | CHANGE
    | CASCADE | RESTRICT | BUCKETS | CLUSTERED | SORTED | PURGE | INPUTFORMAT | OUTPUTFORMAT
    | DBPROPERTIES | DFS | TRUNCATE | COMPUTE | LIST
    | STATISTICS | ANALYZE | PARTITIONED | EXTERNAL | DEFINED | RECORDWRITER
    | REVOKE | GRANT | LOCK | UNLOCK | MSCK | REPAIR | RECOVER | EXPORT | IMPORT | LOAD | VALUES | COMMENT | ROLE
    | ROLES | COMPACTIONS | PRINCIPALS | TRANSACTIONS | INDEX | INDEXES | LOCKS | OPTION | LOCAL | INPATH
    | ASC | DESC | LIMIT | RENAME | SETS
    | AT | NULLS | OVERWRITE | ALL | ANY | ALTER | AS | BETWEEN | BY | CREATE | DELETE
    | DESCRIBE | DROP | EXISTS | FALSE | FOR | GROUP | IN | INSERT | INTO | IS |LIKE
    | NULL | ORDER | OUTER | TABLE | TRUE | WITH | RLIKE
    | AND | CASE | CAST | DISTINCT | DIV | ELSE | END | SQLFUNCTION | INTERVAL | MACRO | OR | STRATIFY | THEN
    | UNBOUNDED | WHEN
    | DATABASE | SELECT | FROM | WHERE | HAVING | TO | TABLE | WITH | NOT
    | DIRECTORY
    | BOTH | LEADING | TRAILING
    ;

SELECT: [sS] [eE] [lL] [eE] [cC] [tT];
FROM: [fF] [rR] [oO] [mM];
ADD: [aA] [dD] [dD];
AS: [aA] [sS];
ALL: [aA] [lL] [lL];
ANY: [aA] [nN] [yY];
DISTINCT: [dD] [iI] [sS] [tT] [iI] [nN] [cC] [tT];
WHERE: [wW] [hH] [eE] [rR] [eE];
GROUP: [gG] [rR] [oO] [uU] [pP];
BY: [bB] [yY];
GROUPING: [gG] [rR] [oO] [uU] [pP] [iI] [nN] [gG];
SETS: [sS] [eE] [tT] [sS];
CUBE: [cC] [uU] [bB] [eE];
ROLLUP: [rR] [oO] [lL] [lL] [uU] [pP];
ORDER: [oO] [rR] [dD] [eE] [rR];
HAVING: [hH] [aA] [vV] [iI] [nN] [gG];
LIMIT: [lL] [iI] [mM] [iI] [tT];
AT: [aA] [tT];
OR: [oO] [rR];
AND: [aA] [nN] [dD];
IN: [iI] [nN];
NOT: [nN] [oO] [tT] | '!';
NO: [nN] [oO];
EXISTS: [eE] [xX] [iI] [sS] [tT] [sS];
BETWEEN: [bB] [eE] [tT] [wW] [eE] [eE] [nN];
LIKE: [lL] [iI] [kK] [eE];
RLIKE: [rR] [lL] [iI] [kK] [eE] | [rR] [eE] [gG] [eE] [xX] [pP];
IS: [iI] [sS];
NULL: [nN] [uU] [lL] [lL];
TRUE: [tT] [rR] [uU] [eE];
FALSE: [fF] [aA] [lL] [sS] [eE];
NULLS: [nN] [uU] [lL] [lL] [sS];
ASC: [aA] [sS] [cC];
DESC: [dD] [eE] [sS] [cC];
FOR: [fF] [oO] [rR];
INTERVAL: [iI] [nN] [tT] [eE] [rR] [vV] [aA] [lL];
CASE: [cC] [aA] [sS] [eE];
WHEN: [wW] [hH] [eE] [nN];
THEN: [tT] [hH] [eE] [nN];
ELSE: [eE] [lL] [sS] [eE];
END: [eE] [nN] [dD];
JOIN: [jJ] [oO] [iI] [nN];
CROSS: [cC] [rR] [oO] [sS] [sS];
OUTER: [oO] [uU] [tT] [eE] [rR];
INNER: [iI] [nN] [nN] [eE] [rR];
LEFT: [lL] [eE] [fF] [tT];
SEMI: [sS] [eE] [mM] [iI];
RIGHT: [rR] [iI] [gG] [hH] [tT];
FULL: [fF] [uU] [lL] [lL];
NATURAL: [nN] [aA] [tT] [uU] [rR] [aA] [lL];
ON: [oO] [nN];
PIVOT: [pP] [iI] [vV] [oO] [tT];
LATERAL: [lL] [aA] [tT] [eE] [rR] [aA] [lL];
WINDOW: [wW] [iI] [nN] [dD] [oO] [wW];
OVER: [oO] [vV] [eE] [rR];
PARTITION: [pP] [aA] [rR] [tT] [iI] [tT] [iI] [oO] [nN];
RANGE: [rR] [aA] [nN] [gG] [eE];
ROWS: [rR] [oO] [wW] [sS];
UNBOUNDED: [uU] [nN] [bB] [oO] [uU] [nN] [dD] [eE] [dD];
PRECEDING: [pP] [rR] [eE] [cC] [eE] [dD] [iI] [nN] [gG];
FOLLOWING: [fF] [oO] [lL] [lL] [oO] [wW] [iI] [nN] [gG];
CURRENT: [cC] [uU] [rR] [rR] [eE] [nN] [tT];
FIRST: [fF] [iI] [rR] [sS] [tT];
AFTER: [aA] [fF] [tT] [eE] [rR];
LAST: [lL] [aA] [sS] [tT];
ROW: [rR] [oO] [wW];
WITH: [wW] [iI] [tT] [hH];
VALUES: [vV] [aA] [lL] [uU] [eE] [sS];
CREATE: [cC] [rR] [eE] [aA] [tT] [eE];
TABLE: [tT] [aA] [bB] [lL] [eE];
DIRECTORY: [dD] [iI] [rR] [eE] [cC] [tT] [oO] [rR] [yY];
VIEW: [vV] [iI] [eE] [wW];
REPLACE: [rR] [eE] [pP] [lL] [aA] [cC] [eE];
INSERT: [iI] [nN] [sS] [eE] [rR] [tT];
DELETE: [dD] [eE] [lL] [eE] [tT] [eE];
INTO: [iI] [nN] [tT] [oO];
DESCRIBE: [dD] [eE] [sS] [cC] [rR] [iI] [bB] [eE];
EXPLAIN: [eE] [xX] [pP] [lL] [aA] [iI] [nN];
FORMAT: [fF] [oO] [rR] [mM] [aA] [tT];
LOGICAL: [lL] [oO] [gG] [iI] [cC] [aA] [lL];
CODEGEN: [cC] [oO] [dD] [eE] [gG] [eE] [nN];
COST: [cC] [oO] [sS] [tT];
CAST: [cC] [aA] [sS] [tT];
SHOW: [sS] [hH] [oO] [wW];
TABLES: [tT] [aA] [bB] [lL] [eE] [sS];
COLUMNS: [cC] [oO] [lL] [uU] [mM] [nN] [sS];
COLUMN: [cC] [oO] [lL] [uU] [mM] [nN];
USE: [uU] [sS] [eE];
PARTITIONS: [pP] [aA] [rR] [tT] [iI] [tT] [iI] [oO] [nN] [sS];
FUNCTIONS: [fF] [uU] [nN] [cC] [tT] [iI] [oO] [nN] [sS];
DROP: [dD] [rR] [oO] [pP];
UNION: [uU] [nN] [iI] [oO] [nN];
EXCEPT: [eE] [xX] [cC] [eE] [pP] [tT];
SETMINUS: [mM] [iI] [nN] [uU] [sS];
INTERSECT: [iI] [nN] [tT] [eE] [rR] [sS] [eE] [cC] [tT];
TO: [tT] [oO];
TABLESAMPLE: [tT] [aA] [bB] [lL] [eE] [sS] [aA] [mM] [pP] [lL] [eE];
STRATIFY: [sS] [tT] [rR] [aA] [tT] [iI] [fF] [yY];
ALTER: [aA] [lL] [tT] [eE] [rR];
RENAME: [rR] [eE] [nN] [aA] [mM] [eE];
ARRAY: [aA] [rR] [rR] [aA] [yY];
MAP: [mM] [aA] [pP];
STRUCT: [sS] [tT] [rR] [uU] [cC] [tT];
COMMENT: [cC] [oO] [mM] [mM] [eE] [nN] [tT];
SET: [sS] [eE] [tT];
RESET: [rR] [eE] [sS] [eE] [tT];
DATA: [dD] [aA] [tT] [aA];
START: [sS] [tT] [aA] [rR] [tT];
TRANSACTION: [tT] [rR] [aA] [nN] [sS] [aA] [cC] [tT] [iI] [oO] [nN];
COMMIT: [cC] [oO] [mM] [mM] [iI] [tT];
ROLLBACK: [rR] [oO] [lL] [lL] [bB] [aA] [cC] [kK];
MACRO: [mM] [aA] [cC] [rR] [oO];
IGNORE: [iI] [gG] [nN] [oO] [rR] [eE];
BOTH: [bB] [oO] [tT] [hH];
LEADING: [lL] [eE] [aA] [dD] [iI] [nN] [gG];
TRAILING: [tT] [rR] [aA] [iI] [lL] [iI] [nN] [gG];

IF: [iI] [fF];
POSITION: [pP] [oO] [sS] [iI] [tT] [iI] [oO] [nN];
EXTRACT: [eE] [xX] [tT] [rR] [aA] [cC] [tT];

EQ  : '=' | '==';
NSEQ: '<=>';
NEQ : '<>';
NEQJ: '!=';
LT  : '<';
LTE : '<=' | '!>';
GT  : '>';
GTE : '>=' | '!<';

PLUS: '+';
MINUS: '-';
ASTERISK: '*';
SLASH: '/';
PERCENT: '%';
DIV: [dD] [iI] [vV];
TILDE: '~';
AMPERSAND: '&';
PIPE: '|';
CONCAT_PIPE: '||';
HAT: '^';

PERCENTLIT: [pP] [eE] [rR] [cC] [eE] [nN] [tT];
BUCKET: [bB] [uU] [cC] [kK] [eE] [tT];
OUT: [oO] [uU] [tT];
OF: [oO] [fF];

SORT: [sS] [oO] [rR] [tT];
CLUSTER: [cC] [lL] [uU] [sS] [tT] [eE] [rR];
DISTRIBUTE: [dD] [iI] [sS] [tT] [rR] [iI] [bB] [uU] [tT] [eE];
OVERWRITE: [oO] [vV] [eE] [rR] [wW] [rR] [iI] [tT] [eE];
TRANSFORM: [tT] [rR] [aA] [nN] [sS] [fF] [oO] [rR] [mM];
REDUCE: [rR] [eE] [dD] [uU] [cC] [eE];
USING: [uU] [sS] [iI] [nN] [gG];
SERDE: [sS] [eE] [rR] [dD] [eE];
SERDEPROPERTIES: [sS] [eE] [rR] [dD] [eE] [pP] [rR] [oO] [pP] [eE] [rR] [tT] [iI] [eE] [sS];
RECORDREADER: [rR] [eE] [cC] [oO] [rR] [dD] [rR] [eE] [aA] [dD] [eE] [rR];
RECORDWRITER: [rR] [eE] [cC] [oO] [rR] [dD] [wW] [rR] [iI] [tT] [eE] [rR];
DELIMITED: [dD] [eE] [lL] [iI] [mM] [iI] [tT] [eE] [dD];
FIELDS: [fF] [iI] [eE] [lL] [dD] [sS];
TERMINATED: [tT] [eE] [rR] [mM] [iI] [nN] [aA] [tT] [eE] [dD];
COLLECTION: [cC] [oO] [lL] [lL] [eE] [cC] [tT] [iI] [oO] [nN];
ITEMS: [iI] [tT] [eE] [mM] [sS];
KEYS: [kK] [eE] [yY] [sS];
ESCAPED: [eE] [sS] [cC] [aA] [pP] [eE] [dD];
LINES: [lL] [iI] [nN] [eE] [sS];
SEPARATED: [sS] [eE] [pP] [aA] [rR] [aA] [tT] [eE] [dD];
SQLFUNCTION: [sS] [qQ] [lL] [fF] [uU] [nN] [cC] [tT] [iI] [oO] [nN];
EXTENDED: [eE] [xX] [tT] [eE] [nN] [dD] [eE] [dD];
REFRESH: [rR] [eE] [fF] [rR] [eE] [sS] [hH];
CLEAR: [cC] [lL] [eE] [aA] [rR];
CACHE: [cC] [aA] [cC] [hH] [eE];
UNCACHE: [uU] [nN] [cC] [aA] [cC] [hH] [eE];
LAZY: [lL] [aA] [zZ] [yY];
FORMATTED: [fF] [oO] [rR] [mM] [aA] [tT] [tT] [eE] [dD];
GLOBAL: [gG] [lL] [oO] [bB] [aA] [lL];
TEMPORARY: [tT] [eE] [mM] [pP] [oO] [rR] [aA] [rR] [yY] | [tT] [eE] [mM] [pP];
OPTIONS: [oO] [pP] [tT] [iI] [oO] [nN] [sS];
UNSET: [uU] [nN] [sS] [eE] [tT];
TBLPROPERTIES: [tT] [bB] [lL] [pP] [rR] [oO] [pP] [eE] [rR] [tT] [iI] [eE] [sS];
DBPROPERTIES: [dD] [bB] [pP] [rR] [oO] [pP] [eE] [rR] [tT] [iI] [eE] [sS];
BUCKETS: [bB] [uU] [cC] [kK] [eE] [tT] [sS];
SKEWED: [sS] [kK] [eE] [wW] [eE] [dD];
STORED: [sS] [tT] [oO] [rR] [eE] [dD];
DIRECTORIES: [dD] [iI] [rR] [eE] [cC] [tT] [oO] [rR] [iI] [eE] [sS];
LOCATION: [lL] [oO] [cC] [aA] [tT] [iI] [oO] [nN];
EXCHANGE: [eE] [xX] [cC] [hH] [aA] [nN] [gG] [eE];
ARCHIVE: [aA] [rR] [cC] [hH] [iI] [vV] [eE];
UNARCHIVE: [uU] [nN] [aA] [rR] [cC] [hH] [iI] [vV] [eE];
FILEFORMAT: [fF] [iI] [lL] [eE] [fF] [oO] [rR] [mM] [aA] [tT];
TOUCH: [tT] [oO] [uU] [cC] [hH];
COMPACT: [cC] [oO] [mM] [pP] [aA] [cC] [tT];
CONCATENATE: [cC] [oO] [nN] [cC] [aA] [tT] [eE] [nN] [aA] [tT] [eE];
CHANGE: [cC] [hH] [aA] [nN] [gG] [eE];
CASCADE: [cC] [aA] [sS] [cC] [aA] [dD] [eE];
RESTRICT: [rR] [eE] [sS] [tT] [rR] [iI] [cC] [tT];
CLUSTERED: [cC] [lL] [uU] [sS] [tT] [eE] [rR] [eE] [dD];
SORTED: [sS] [oO] [rR] [tT] [eE] [dD];
PURGE: [pP] [uU] [rR] [gG] [eE];
INPUTFORMAT: [iI] [nN] [pP] [uU] [tT] [fF] [oO] [rR] [mM] [aA] [tT];
OUTPUTFORMAT: [oO] [uU] [tT] [pP] [uU] [tT] [fF] [oO] [rR] [mM] [aA] [tT];
DATABASE: [dD] [aA] [tT] [aA] [bB] [aA] [sS] [eE] | [sS] [cC] [hH] [eE] [mM] [aA];
DATABASES: [dD] [aA] [tT] [aA] [bB] [aA] [sS] [eE] [sS] | [sS] [cC] [hH] [eE] [mM] [aA] [sS];
DFS: [dD] [fF] [sS];
TRUNCATE: [tT] [rR] [uU] [nN] [cC] [aA] [tT] [eE];
ANALYZE: [aA] [nN] [aA] [lL] [yY] [zZ] [eE];
COMPUTE: [cC] [oO] [mM] [pP] [uU] [tT] [eE];
LIST: [lL] [iI] [sS] [tT];
STATISTICS: [sS] [tT] [aA] [tT] [iI] [sS] [tT] [iI] [cC] [sS];
PARTITIONED: [pP] [aA] [rR] [tT] [iI] [tT] [iI] [oO] [nN] [eE] [dD];
EXTERNAL: [eE] [xX] [tT] [eE] [rR] [nN] [aA] [lL];
DEFINED: [dD] [eE] [fF] [iI] [nN] [eE] [dD];
REVOKE: [rR] [eE] [vV] [oO] [kK] [eE];
GRANT: [gG] [rR] [aA] [nN] [tT];
LOCK: [lL] [oO] [cC] [kK];
UNLOCK: [uU] [nN] [lL] [oO] [cC] [kK];
MSCK: [mM] [sS] [cC] [kK];
REPAIR: [rR] [eE] [pP] [aA] [iI] [rR];
RECOVER: [rR] [eE] [cC] [oO] [vV] [eE] [rR];
EXPORT: [eE] [xX] [pP] [oO] [rR] [tT];
IMPORT: [iI] [mM] [pP] [oO] [rR] [tT];
LOAD: [lL] [oO] [aA] [dD];
ROLE: [rR] [oO] [lL] [eE];
ROLES: [rR] [oO] [lL] [eE] [sS];
COMPACTIONS: [cC] [oO] [mM] [pP] [aA] [cC] [tT] [iI] [oO] [nN] [sS];
PRINCIPALS: [pP] [rR] [iI] [nN] [cC] [iI] [pP] [aA] [lL] [sS];
TRANSACTIONS: [tT] [rR] [aA] [nN] [sS] [aA] [cC] [tT] [iI] [oO] [nN] [sS];
INDEX: [iI] [nN] [dD] [eE] [xX];
INDEXES: [iI] [nN] [dD] [eE] [xX] [eE] [sS];
LOCKS: [lL] [oO] [cC] [kK] [sS];
OPTION: [oO] [pP] [tT] [iI] [oO] [nN];
ANTI: [aA] [nN] [tT] [iI];
LOCAL: [lL] [oO] [cC] [aA] [lL];
INPATH: [iI] [nN] [pP] [aA] [tT] [hH];

STRING
    : '\'' ( ~('\''|'\\') | ('\\' .) )* '\''
    | '"' ( ~('"'|'\\') | ('\\' .) )* '"'
    ;

BIGINT_LITERAL
    : DIGIT+ [lL]
    ;

SMALLINT_LITERAL
    : DIGIT+ [sS]
    ;

TINYINT_LITERAL
    : DIGIT+ [yY]
    ;

INTEGER_VALUE
    : DIGIT+
    ;

DECIMAL_VALUE
    : DIGIT+ EXPONENT
    | DECIMAL_DIGITS EXPONENT? {isValidDecimal.apply(this)}?
    ;

DOUBLE_LITERAL
    : DIGIT+ EXPONENT? [dD]
    | DECIMAL_DIGITS EXPONENT? [dD] {isValidDecimal.apply(this)}?
    ;

BIGDECIMAL_LITERAL
    : DIGIT+ EXPONENT? [bB] [dD]
    | DECIMAL_DIGITS EXPONENT? [bB] [dD] {isValidDecimal.apply(this)}?
    ;

IDENTIFIER
    : (LETTER | DIGIT | '_')+
    ;

BACKQUOTED_IDENTIFIER
    : '`' ( ~'`' | '``' )* '`'
    ;

fragment DECIMAL_DIGITS
    : DIGIT+ '.' DIGIT*
    | '.' DIGIT+
    ;

fragment EXPONENT
    : [eE] [+-]? DIGIT+
    ;

fragment DIGIT
    : [0-9]
    ;

fragment LETTER
    : [A-Za-z]
    ;

SIMPLE_COMMENT
    : '--' ~[\r\n]* '\r'? '\n'? -> channel(HIDDEN)
    ;

BRACKETED_EMPTY_COMMENT
    : '/**/' -> channel(HIDDEN)
    ;

BRACKETED_COMMENT
    : '/*' ~[+] .*? '*/' -> channel(HIDDEN)
    ;

WS
    : [ \r\n\t]+ -> channel(HIDDEN)
    ;

// Catch-all for anything we can't recognize.
// We use this to be able to ignore and recover all the text
// when splitting statements with DelimiterLexer
UNRECOGNIZED
    : .
    ;
var antlr4 = require('antlr4/index');
// For SQL
var SqlBaseLexer = require('./base/SqlBaseLexer.js').SqlBaseLexer;
var SqlBaseParser = require('./base/SqlBaseParser.js').SqlBaseParser;
var SqlVisitor = require('./SqlVisitor.js').SqlVisitor;

// For XEval
var XEvalBaseLexer = require('./base/XEvalBaseLexer.js').XEvalBaseLexer;
var XEvalBaseParser = require('./base/XEvalBaseParser.js').XEvalBaseParser;
// Create the visitor file here if you want to have your own, e.g.:
var XEvalVisitor = require('./XEvalVisitor.js').XEvalVisitor;

class SqlParser {
    static getMultipleQueriesViaParser(sqlStatement) {
        var chars = new antlr4.InputStream(sqlStatement.toUpperCase());
        var lexer = new SqlBaseLexer(chars);
        var tokens  = new antlr4.CommonTokenStream(lexer);
        var parser = new SqlBaseParser(tokens);
        parser.buildParseTrees = true;
        var tree = parser.statements();

        var visitor = new SqlVisitor();
        visitor.visitStatements(tree);

        var statements = [];
        return visitor.statements;
    }
}
exports.SqlParser = SqlParser;

class XEvalParser {
    static parseEvalStr(evalStr) {
        var chars = new antlr4.InputStream(evalStr);
        var lexer = new XEvalBaseLexer(chars);
        var tokens  = new antlr4.CommonTokenStream(lexer);
        var parser = new XEvalBaseParser(tokens);
        parser.buildParseTrees = true;
        var tree = parser.expr();
        var visitor = new XEvalVisitor();
        return visitor.parseEvalStr(tree);
    }
}
exports.XEvalParser = XEvalParser;

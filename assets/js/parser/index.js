var antlr4 = require('antlr4/index');
var XEvalBaseLexer = require('./base/XEvalBaseLexer.js').XEvalBaseLexer;
var XEvalBaseParser = require('./base/XEvalBaseParser.js').XEvalBaseParser;
// Create the visitor file here if you want to have your own, e.g.:
// var EvalVisitor = require('./EvalVisitor.js').EvalVisitor;

class XEvalParser {
    static sampleFunction(input) {
        var chars = new antlr4.InputStream(input);
        var lexer = new XEvalBaseLexer(chars);
        var tokens  = new antlr4.CommonTokenStream(lexer);
        var parser = new XEvalBaseParser(tokens);
        parser.buildParseTrees = true;
        // invoke the corresponding rule here, e.g.:
        // var tree = parser.statements();

        // var visitor = new EvalVisitor();
        // visitor.visitStatements(tree);

        // return visitor.statements;
    }
}
exports.XEvalParser = XEvalParser;
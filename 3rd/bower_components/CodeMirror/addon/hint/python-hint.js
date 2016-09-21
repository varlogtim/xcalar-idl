(function () {
  function forEach(arr, f) {
    for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
  }

  function arrayContains(arr, item) {
    if (!Array.prototype.indexOf) {
      var i = arr.length;
      while (i--) {
        if (arr[i] === item) {
          return true;
        }
      }
      return false;
    }
    return arr.indexOf(item) != -1;
  }

  function scriptHint(editor, _keywords, getToken) {
    // Find the token at the cursor
    var cur = editor.getCursor(), token = getToken(editor, cur), tprop = token;
    // If it's not a 'word-style' token, ignore the token.

    if (!/^[\w$_]*$/.test(token.string)) {
        token = tprop = {start: cur.ch, end: cur.ch, string: "", state: token.state,
                         className: token.string == ":" ? "python-type" : null};
    }
    if (!context) var context = [];
    context.push(tprop);
    var completionList = getCompletions(token, context, editor);
    // completionList = completionList.sort();
    //prevent autocomplete for last word, instead show dropdown with one word
    if(completionList.length == 1) {
      completionList.push({displayText: " ", 
        text: " ",
        className  : "python empty"});
    }

    return {list: completionList,
            from: CodeMirror.Pos(cur.line, token.start),
            to: CodeMirror.Pos(cur.line, token.end)};
  }

  CodeMirror.pythonHint = function(editor) {
    return scriptHint(editor, pythonKeywordsU, function (e, cur) {return e.getTokenAt(cur);});
  };

  var pythonKeywords = "and del from not while as elif global or with assert else if pass yield"
+ "break except import print class exec in raise continue finally is return def for lambda try";
  var pythonKeywordsL = pythonKeywords.split(" ");
  var pythonKeywordsU = pythonKeywords.toUpperCase().split(" ");

  var pythonBuiltins = "abs divmod input open staticmethod all enumerate int ord str "
+ "any eval isinstance pow sum basestring execfile issubclass print super"
+ "bin file iter property tuple bool filter len range type"
+ "bytearray float list raw_input unichr callable format locals reduce unicode"
+ "chr frozenset long reload vars classmethod getattr map repr xrange"
+ "cmp globals max reversed zip compile hasattr memoryview round __import__"
+ "complex hash min set apply delattr help next setattr buffer"
+ "dict hex object slice coerce dir id oct sorted intern ";
  var pythonBuiltinsL = pythonBuiltins.split(" ").join("() ").split(" ");
  var pythonBuiltinsU = pythonBuiltins.toUpperCase().split(" ").join("() ").split(" ");

  function getCompletions(token, context, editor) {
    var found = [], start = token.string;
    function maybeAdd(str) {
      if (str.indexOf(start) == 0 && !arrayContains(found, str)) {
        found.push({
        displayText: str, 
        text: str,
        className  : "python",
        hint: autocompleteSelect});
      }
    }

    function gatherCompletions(_obj) {
        if (_obj.trim().length === 0) {
          return;
        }
        forEach(pythonBuiltinsL, maybeAdd);
        forEach(pythonBuiltinsU, maybeAdd);
        forEach(pythonKeywordsL, maybeAdd);
        forEach(pythonKeywordsU, maybeAdd);
        found.sort(function(a, b) {
          if (a.displayText === "def" || a.displayText === "return") {
            return  -1;
          } else if (b.displayText === "def" || b.displayText === "return") {
            return 1;
          }
          return a.displayText.length - b.displayText.length;
        });

        var seen = {};
        for (var i = 0; i < found.length; i++) {
          seen[found[i].displayText] = true;
        }   
        var word = /[\w$]+/;
        var range = 500;
        var cur = editor.getCursor(), curLine = editor.getLine(cur.line);
        var curWord = _obj;

        var list = [];
       
        var re = new RegExp(word.source, "g");
        for (var dir = -1; dir <= 1; dir += 2) {
          var line = cur.line, endLine = Math.min(Math.max(line + dir * range, editor.firstLine()), editor.lastLine()) + dir;
          for (; line != endLine; line += dir) {
            var text = editor.getLine(line), m;
            if (text[0] === "#") {// skip comments
              continue;
            }
            while (m = re.exec(text)) {
              if (line == cur.line && m[0] === curWord) continue;
              if ((!curWord || m[0].lastIndexOf(curWord, 0) == 0) && !Object.prototype.hasOwnProperty.call(seen, m[0])) {
                seen[m[0]] = true;
                // list.unshift(m[0]);
                list.push({
                    displayText: m[0], 
                    text: m[0],
                    className  : "python inCode",
                });
              }
            }
          }
        }
        list.sort(function(a, b) {
          return a.displayText.length - b.displayText.length;
        });
        found = list.concat(found);
        // do not show hint if only hint is an exact match
        if (found.length === 1 && curWord === found[0].text) {
            found = [];
        }
    }

    if (context) {
      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(), base;

      // if (obj.type == "variable")
      //     base = obj.string;
      if(obj.type == "variable-3")
          base = ":" + obj.string;
      else {
        base = obj.string;
      }

      while (base != null && context.length)
        base = base[context.pop().string];
      if (base != null) gatherCompletions(base);
    }
    return found;
  }

   function autocompleteSelect(cm, data, completion) {
      var text = completion.templateTwo || completion.text;
      cm.replaceRange(text, data.from, data.to, "complete");
      if (text.charAt(text.length - 1) === ")") {
        cm.setCursor(data.from.line, data.from.ch + text.length - 1);
      }
  }
})();

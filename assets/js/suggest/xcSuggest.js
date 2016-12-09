window.xcSuggest = (function($, xcSuggest) {
// TODO: Potential issue: introduces circular dependencies.
// 1: Record & Field delimiters.
// 2: Smart casting column type (smartCastView).
// 3: Smart casting column type (colManager).
// 3: Smart suggesting join keys.


///////////////////////////////////////////////////////////////
// Join Key Suggestion
//////////////////////////////////////////////////////////////
// Relevant structure:
// joinView.suggestJoinKey <- Pretty straightforward
    xcSuggest.suggestJoinKey = function(tableId, val, $inputToFill,
                                        suggTableId) {

        var col = gTables[tableId].getColByFrontName(val);
        if (!col) {
            return false;
        }
        var type = col.getType();
        var backColName = col.getBackColName();
        var frontColName = col.getFrontColName(); // not include prefix
        var colNum = gTables[tableId].getColNumByBackName(backColName);

        var context1 = contextCheck($('#xcTable-' + tableId), colNum, type);
        var colToSugg = null;

        // only score that more than -50 will be suggested, can be modified
        var thresholdScore = -50;
        var maxScore = (-Number.MAX_VALUE);

        var $suggTable = $('#xcTable-' + suggTableId);
        var suggTable = gTables[suggTableId];
        $suggTable.find(".header").each(function(curColNum) {
            var $curTh = $(this);
            // 0 is rowMarker
            if (curColNum !== 0 && !$curTh.hasClass('dataCol') &&
                getType($curTh) === type) {
                var context2 = contextCheck($suggTable, curColNum, type);

                var curColName = suggTable.getCol(curColNum)
                                          .getFrontColName(true);
                var parsedName = xcHelper.parsePrefixColName(curColName).name;
                var dist = getTitleDistance(frontColName, parsedName);
                var score = getScore(context1, context2, dist, type);

                if (score > maxScore) {
                    maxScore = score;
                    colToSugg = curColName;
                }
            }
        });


        // if find the suggeest join key
        if (colToSugg != null) {
            $inputToFill.val(colToSugg);

            if (thresholdScore > maxScore) {
                return JoinKeySuggestion.KeyUnsure;
            }
            return JoinKeySuggestion.KeySuggested;
        }
        return JoinKeySuggestion.KeyNotFound;
    };

    function getType($th) {
        // match "abc type-XXX abc" and "abc type-XXX"
        var match = $th.attr("class").match(/type-(.*)/)[1];
        // match = "type-XXX" or "type-XXX abc"
        return (match.split(" ")[0]);
    }


    function getScore(context1, context2, titleDist, type) {
        // the two value of max, min, sig2, avg..closer, score is better,
        // also, shorter distance, higher score. So those socres are negative

        var score   = 0;
        var bucket  = {};
        var bucket2 = {};
        var match   = 0;
        var words   = {};

        if (type === "string") {
            // Note: current way is hash each char and count frequency
            // change it if you have better way!
            context1.vals.forEach(function(value) {
                for (var i = 0; i < value.length; i++) {
                    bucket[value.charAt(i)] = true;
                }

                words[value] = words[value] || 0;
                words[value]++;
            });

            context2.vals.forEach(function(value) {
                for (var i = 0; i < value.length; i++) {
                    bucket2[value.charAt(i)] = true;
                }
                // when has whole word match
                if (words.hasOwnProperty(value)) {
                    match += 10 * words[value];
                }
            });

            for (var c in bucket2) {
                if (bucket.hasOwnProperty(c)) {
                    if (/\W/.test(c)) {
                        // special char, high weight
                        match += 10;
                    } else {
                        match += 1;
                    }
                }
            }

            // for string compare absolute value
            score += match * 3;
            score += Math.abs(context1.max - context2.max) * -1;
            score += Math.abs(context1.min - context2.min) * -1;
            score += Math.abs(context1.avg - context2.avg) * -2;
            score += Math.abs(context1.sig2 - context2.sig2) * -5;
            score += titleDist * -7;
        } else {
            // a base score for number,
            // since limit score to pass is -50
            match = 20;

            // for number compare relative value
            score += match * 3;
            score += calcSim(context1.max, context2.max) * -8;
            score += calcSim(context1.min, context2.min) * -8;
            score += calcSim(context1.avg, context2.avg) * -16;
            score += calcSim(context1.sig2, context2.sig2) * -40;
            score += titleDist * -7;
        }
        return score;
    }

    function calcSim(a, b) {
        var diff = a - b;
        var sum = a + b;

        if (sum === 0) {
            if (diff === 0) {
                // when a === 0 and b === 0
                return 0;
            } else {
                // a = -b, one is positive and one num is negative
                // no similarity
                return 1;
            }
        }
        // range is [0, 1), more close to 0, similar
        return Math.abs(diff / sum);
    }


    function contextCheck($table, colNum, type) {
        // only check number and string
        if (type !== "integer" && type !== "float" && type !== "string") {
            return {"max": 0, "min": 0, "total": 0, "variance": 0};
        }

        // Number min value provides smallest absolute value number, e.g.
        // 5e-352 or something similar.  Take negative of max value for true min.
        // Otherwise this script breaks on negative numbers.
        var max = (-Number.MAX_VALUE);
        var min = Number.MAX_VALUE;
        var total = 0;
        var datas = [];
        var values = [];
        var val;

        $table.find("td.col" + colNum).each(function() {
            $textDiv = $(this).find(".originalData");
            val = $textDiv.text();

            var d;

            if (type === "string") {
                if (val == null || val === "") {
                    // skip empty value
                    return;
                }
                d = val.length; // for string, use its length as metrics
            } else {
                d = Number(val);
            }

            values.push(val);
            datas.push(d);
            max = Math.max(d, max);
            min = Math.min(d, min);
            total += d;
        });

        var count = datas.length;
        var avg = total / count;
        var sig2 = 0;

        for (var i = 0; i < count; i++) {
            sig2 += Math.pow((datas[i] - avg), 2);
        }

        return {
            "max" : max,
            "min" : min,
            "avg" : avg,
            "sig2": sig2,
            "vals": values
        };
    }

    function getTitleDistance(name1, name2) {
        if (name1.startsWith("column") || name2.startsWith("column")) {
            // any column has auto-generate column name, then do not check
            return 0;
        }

        name1 = xcHelper.parsePrefixColName(name1.toLowerCase()).name;
        name2 = xcHelper.parsePrefixColName(name2.toLowerCase()).name;

        if (name1 === name2) {
            // same name
            return 0;
        } else if (name1.startsWith(name2) || name2.startsWith(name1)) {
            // which means the name is quite related
            return 2;
        }

        var distArray = levenshteinenator(name1, name2);
        var len = distArray.length;
        var dist = distArray[len - 1][distArray[len - 1].length - 1];

        return (dist);

        // http://andrew.hedges.name/experiments/levenshtein/levenshtein.js
        /**
         * @param String a
         * @param String b
         * @return Array
         */
        function levenshteinenator(a, b) {
            var cost;
            var m = a.length;
            var n = b.length;

            // make sure a.length >= b.length to use O(min(n,m)) space, whatever
            // that is
            if (m < n) {
                var c = a; a = b; b = c;
                var o = m; m = n; n = o;
            }

            var r = []; r[0] = [];
            for (var c = 0; c < n + 1; ++c) {
                r[0][c] = c;
            }

            for (var i = 1; i < m + 1; ++i) {
                r[i] = []; r[i][0] = i;
                for ( var j = 1; j < n + 1; ++j ) {
                    cost = a.charAt( i - 1 ) === b.charAt( j - 1 ) ? 0 : 1;
                    r[i][j] = minimator(r[i - 1][j] + 1, r[i][j - 1] + 1,
                                        r[i - 1][j - 1] + cost);
                }
            }

            return r;
        }

        /**
         * Return the smallest of the three numbers passed in
         * @param Number x
         * @param Number y
         * @param Number z
         * @return Number
         */
        function minimator(x, y, z) {
            if (x < y && x < z) {
                return x;
            }
            if (y < x && y < z) {
                return y;
            }
            return z;
        }
    }

///////////////////////////////////////////////////////////////
// End Join Key Suggestion
// Begin Delim Suggestion
//////////////////////////////////////////////////////////////


// Doesn't seem like there is an easy way to decouple smartDetect from module
// Solution: use raw data instead

// dsPreview.js

///////////////////////////////////////////////////////////////
// End Delim Suggestion
// Begin Delim JSON Suggestion
//////////////////////////////////////////////////////////////
// Relevant structure:
// See colManager.js, line 1480 (parseTdHelper)
// val given by tdValue, which is determined by parseRowJSON
//  progCol.updateType in constructor.js
//   xcHelper.parseColType
//
// xcHelper.parseColType also shows up in
// dsTable, constructor, xcHelperSpec

    xcSuggest.parseColType = function(val, oldType) {
        var type = oldType || ColumnType.undefined;

        if (val != null && oldType !== ColumnType.mixed) {
            // note: "" is empty string
            var valType = typeof val;
            type = valType;
            // get specific type
            if (type === ColumnType.number) {
                // the case when type is float
                if (oldType === ColumnType.float || xcHelper.isFloat(val)) {
                    type = ColumnType.float;
                } else {
                    type = ColumnType.integer;
                }
            } else if (type === ColumnType.object) {
                if (val instanceof Array) {
                    type = ColumnType.array;
                }
            }

            var isAllNum = (valType === ColumnType.number) &&
                           ((oldType === ColumnType.float) ||
                            (oldType === ColumnType.integer));
            if (oldType != null &&
                oldType !== ColumnType.undefined &&
                oldType !== type && !isAllNum)
            {
                type = ColumnType.mixed;
            }
        }

        return (type);
    };

///////////////////////////////////////////////////////////////
// End JSON Delim Suggestion
// Begin Col Type
//////////////////////////////////////////////////////////////
// Relevant structure:
// smartCastView.js
// .show
//  initialSugget
//   progcol.gettype
//   suggestType
//    -Skips bool and float type
//    xchelper.suggesttype <- Bingo
//     -Skips integer type
//  smartsuggest -I think it's just UI updates
//
// xcHelper.suggestType also shows up in
// tableMenu, xcHelperSpec

    xcSuggest.suggestType = function(datas, currentType, confidentRate) {
        if (currentType === "integer" || currentType === "float") {
            return currentType;
        }

        if (confidentRate == null) {
            confidentRate = 1;
        }

        if (!(datas instanceof Array)) {
            datas = [datas];
        }

        var isFloat;
        var validData = 0;
        var numHit = 0;
        var booleanHit = 0;

        for (var i = 0, len = datas.length; i < len; i++) {
            var data = datas[i];
            if (data == null) {
                // skip this one
                continue;
            }

            data = data.trim().toLowerCase();
            if (data === "") {
                // skip this one
                continue;
            }

            validData++;
            var num = Number(data);
            if (!isNaN(num)) {
                numHit++;

                if (!isFloat && !Number.isInteger(num)) {
                    // when it's float
                    isFloat = true;
                }
            } else if (data === "true" || data === "false" ||
                data === "t" || data === "f") {
                booleanHit++;
            }
        }

        if (validData === 0) {
            return "string";
        } else if (numHit / validData >= confidentRate) {
            if (isFloat) {
                return "float";
            } else {
                return "integer";
            }
        } else if (booleanHit / validData) {
            return "boolean";
        } else {
            return "string";
        }
    };

    return (xcSuggest);
}(jQuery, {}));

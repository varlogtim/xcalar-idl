enum SQLColumnType {
    "String" = "string",
    "Money" = "money",
    "Float" = "float",
    "Integer" = "int",
    "Boolean" = "bool",
    "Timestamp" = "timestamp"
}

enum SparkExpressions {
    // arithmetic.scala
    "UnaryMinus" = "UnaryMinus",
    // "UnaryPositive" = null, // Seems it's removed by spark
    "Abs" = "Abs",
    "AbsNumeric" = "AbsNumeric",
    "AbsInteger" = "AbsInteger",
    "Add" = "Add",
    "Subtract" = "Subtract",
    "Multiply" = "Multiply",
    "AddInteger" = "AddInteger",
    "SubtractInteger" = "SubtractInteger",
    "MultiplyInteger" = "MultiplyInteger",
    "AddNumeric" = "AddNumeric",
    "SubtractNumeric" = "SubtractNumeric",
    "MultiplyNumeric" = "MultiplyNumeric",
    "Divide" = "Divide",
    "DivideNumeric" = "DivideNumeric",
    "Remainder" = "Remainder",
    "Pmod" = "Pmod",
    "Least" = "Least",
    "Greatest" = "Greatest",

    // bitwisescala
    "BitwiseAnd" = "BitwiseAnd",
    "BitwiseOr" = "BitwiseOr",
    "BitwiseXor" = "BitwiseXor",
    "BitwiseNot" = "BitwiseNot",

    // Cast.scala
    "Cast" = "Cast",

    // conditionalscala
    "If" = "If",
    "CaseWhen" = "CaseWhen",
    "CaseWhenCodegen" = "CaseWhenCodegen",

    // decimalExpressions.scala
    "CheckOverflow" = "CheckOverflow",
    "PromotePrecision" = "PromotePrecision",

    // mathscala
    "EulerNumber" = "EulerNumber",
    "Pi" = "Pi",
    "Acos" = "Acos",
    "Asin" = "Asin",
    "Atan" = "Atan",
    "Cbrt" = "Cbrt",
    "Ceil" = "Ceil",
    "Cos" = "Cos",
    "Cosh" = "Cosh",
    "Conv" = "Conv",
    "Exp" = "Exp",
    "Expm1" = "Expm1",
    "Floor" = "floor",
    "Factorial" = "Factorial",
    "Log" = "Log",
    "Log2" = "Log2",
    "Log10" = "Log10",
    "Log1p" = "Log1p",
    "Rint" = "Rint",
    "Signum" = "Signum",
    "Sin" = "Sin",
    "Sinh" = "Sinh",
    "Sqrt" = "Sqrt",
    "Tan" = "Tan",
    "Cot" = "Cot",
    "Tanh" = "Tanh",
    "ToDegrees" = "ToDegrees",
    "ToRadians" = "ToRadians",
    "Bin" = "Bin",
    "Hex" = "Hex",
    "Unhex" = "Unhex",
    "Atan2" = "Atan2",
    "Pow" = "Pow",
    "ShiftLeft" = "ShiftLeft",
    "ShiftRight" = "ShiftRight",
    "ShiftRightUnsigned" = "ShiftRightUnsigned",
    "Hypot" = "Hypot",
    "Logarithm" = "Logarithm",
    "Round" = "Round",
    "RoundNumeric" = "RoundNumeric",
    "BRound" = "BRound",

    // predicates.scala
    "Not" = "Not",
    "In" = "In",
    "And" = "And",
    "Or" = "Or",
    "EqualTo" = "EqualTo",
    "EqualNullSafe" = "EqualNullSafe",
    "LessThan" = "LessThan",
    "LessThanOrEqual" = "LessThanOrEqual",
    "GreaterThan" = "GreaterThan",
    "GreaterThanOrEqual" = "GreaterThanOrEqual",

    // randomscala,
    "Rand" = "Rand",
    "Randn" = "Randn",

    // regexpscala
    "Like" = "Like",
    "RLike" = "RLike",
    "StringSplit" = "StringSplit",
    "RegExpReplace" = "RegExpReplace",
    "RegExpExtract" = "RegExpExtract",
    // stringscala
    "Concat" = "Concat",
    "ConcatWs" = "ConcatWs",
    "Elt" = "Elt",
    "Upper" = "Upper",
    "Lower" = "Lower",
    "Contains" = "Contains",
    "StartsWith" = "StartsWith",
    "EndsWith" = "EndsWith",
    "StringReplace" = "StringReplace",
    "StringTranslate" = "StringTranslate",
    "FindInSet" = "FindInSet",
    "StringTrim" = "StringTrim",
    "StringTrimLeft" = "StringTrimLeft",
    "StringTrimRight" = "StringTrimRight",
    "StringInstr" = "StringInstr",
    "SubstringIndex" = "SubstringIndex",
    "StringLocate" = "StringLocate",
    "StringLPad" = "StringLPad",
    "StringRPad" = "StringRPad",
    "ParseUrl" = "ParseUrl",
    "FormatString" = "FormatString",
    "InitCap" = "InitCap",
    "StringRepeat" = "StringRepeat",
    "StringReverse" = "StringReverse",
    "StringSpace" = "StringSpace",
    "Substring" = "Substring",
    "Right" = "Right",
    "Left" = "Left",
    "Length" = "Length",
    "BitLength" = "BitLength",
    "OctetLength" = "OctetLength",
    "Levenshtein" = "Levenshtein",
    "SoundEx" = "SoundEx",
    "Ascii" = "Ascii",
    "Chr" = "Chr",
    "Base64" = "Base64",
    "UnBase64" = "UnBase64",
    "Decode" = "Decode",
    "Encode" = "Encode",
    "FormatNumber" = "FormatNumber",
    "Sentences" = "Sentences",

    // nullExpressions.scala
    "IsNotNull" = "IsNotNull",
    "IsNull" = "IsNull",
    "Coalesce"= "Coalesce",

    // datetimescala
    "AddMonths" = "AddMonths",
    "CurrentDate" = "CurrentDate",
    "CurrentTimestamp" = "CurrentTimestamp",
    "DateAdd" = "DateAdd",
    "DateDiff" = "DateDiff",
    "DateFormatClass" = "DateFormatClass",
    "DateSub" = "DateSub",
    "LastDay" = "LastDay",
    "NextDay" = "NextDay",
    "MonthsBetween" = "MonthsBetween",
    "TimeAdd" = "TimeAdd",
    "TimeSub" = "TimeSub",

    "Year" = "Year",
    "Quarter" = "Quarter",
    "Month" = "Month",
    "WeekOfYear" = "WeekOfYear",
    "DayOfWeek" = "DayOfWeek",
    "DayOfMonth" = "DayOfMonth",
    "DayOfYear" = "DayOfYear",
    "Hour" = "Hour",
    "Minute" = "Minute",
    "Second" = "Second",

    "FromUnixTime" = "FromUnixTime",
    "FromUTCTimestamp" = "FromUTCTimestamp",
    "ParseToDate" = "ParseToDate",
    "ParseToTimestamp" = "ParseToTimestamp",
    "ToUnixTimestamp" = "ToUnixTimestamp",
    "ToUTCTimestamp" = "ToUTCTimestamp",
    "TruncDate" = "TruncDate",
    "TruncTimestamp" = "TruncTimestamp",
    "UnixTimestamp" = "UnixTimestamp",

    "Rank" = "Rank", // These eight are for window functions in map
    "PercentRank" = "PercentRank",
    "DenseRank" = "DenseRank",
    "NTile" = "NTile",
    "CumeDist" = "CumeDist",
    "RowNumber" = "RowNumber",
    "Lead" = "Lead",
    "Lag" = "Lag",
    "ScalarSubquery" = "ScalarSubquery",
    "XCEPassThrough" = "XCEPassThrough",

    // general
    "AttributeReference" = "AttributeReference",
    "Literal" = "Literal",

    // Aggregate expressions
    "aggregate.Sum"= "aggregate.Sum",
    "aggregate.SumInteger"= "aggregate.SumInteger",
    "aggregate.SumNumeric"= "aggregate.SumNumeric",
    "aggregate.Count"= "aggregate.Count",
    "aggregate.CollectList"= "aggregate.CollectList",
    "aggregate.Max"= "aggregate.Max",
    "aggregate.MaxInteger"= "aggregate.MaxInteger",
    "aggregate.MaxNumeric"= "aggregate.MaxNumeric",
    "aggregate.Min"= "aggregate.Min",
    "aggregate.MinInteger"= "aggregate.MinInteger",
    "aggregate.MinNumeric"= "aggregate.MinNumeric",
    "aggregate.Average"= "aggregate.Average",
    "aggregate.AverageNumeric"= "aggregate.AverageNumeric",
    "aggregate.StddevPop"= "aggregate.StddevPop",
    "aggregate.StddevSamp"= "aggregate.StddevSamp",
    "aggregate.VariancePop"= "aggregate.VariancePop",
    "aggregate.VarianceSamp"= "aggregate.VarianceSamp",
    "aggregate.CentralMomentAgg"= "aggregate.CentralMomentAgg",
    "aggregate.Corr"= "aggregate.Corr",
    "aggregate.CountMinSketchAgg"= "aggregate.CountMinSketchAgg",
    "aggregate.Covariance"= "aggregate.Covariance",
    "aggregate.First"= "aggregate.First",
    "aggregate.HyperLogLogPlusPlus"= "aggregate.HyperLogLogPlusPlus",
    "aggregate.Last"= "aggregate.Last",
    "aggregate.Percentile"= "aggregate.Percentile",
    "aggregate.PivotFirst"= "aggregate.PivotFirst",
    "aggregate.AggregateExpression"= "aggregate.AggregateExpression"
}

enum SparkExprToXdf {
    // arithmetic.scala
    // "UnaryMinus" = null,
    // "UnaryPositive" = null, // Seems it's removed by spark
    "Abs" = "abs",
    "AbsNumeric" = "absNumeric",
    "AbsInteger" = "absInt",
    "Add" = "add",
    "Subtract" = "sub",
    "Multiply" = "mult",
    "AddInteger" = "addInteger",
    "SubtractInteger" = "subInteger",
    "MultiplyInteger" = "multInteger",
    "AddNumeric" = "addNumeric",
    "SubtractNumeric" = "subNumeric",
    "MultiplyNumeric" = "multNumeric",
    "Divide" = "div",
    "DivideNumeric" = "divNumeric",
    "Remainder" = "mod",
    // "Pmod" = null,
    // "Least" = null,
    // "Greatest" = null,
    // bitwisescala
    "BitwiseAnd" = "bitand",
    "BitwiseOr" = "bitor",
    "BitwiseXor" = "bitxor",
    // "BitwiseNot" = null,

    // Cast.scala
    // "Cast" = null, // NOTE~ This will be replaced
    "XcType.float" = "float", // Xcalar generated
    "XcType.int" = "int", // Xcalar generated
    "XcType.bool" = "bool", // Xcalar generated
    "XcType.money" = "money", // Xcalar generated
    "XcType.string" = "string", // Xcalar generated
    "XcType.timestamp" = "timestamp", // Xcalar generated

    // conditionalscala
    "If" = "if",
    "IfStr" = "ifStr", // Xcalar generated
    "IfNumeric" = "ifNumeric", // Xcalar generated
    // "CaseWhen" = null, // XXX we compile these to if and ifstr
    // "CaseWhenCodegen" = null, // XXX we compile these to if and ifstr

    // mathscala
    // "EulerNumber" = null,
    "Pi" = "pi",
    "Acos" = "acos",
    "Asin" = "asin",
    "Atan" = "atan",
    // "Cbrt" = null,
    "Ceil" = "ceil",
    "Cos" = "cos",
    "Cosh" = "cosh",
    // "Conv" = null,
    "Exp" = "exp",
    // "Expm1" = null,
    "Floor" = "floor",
    // "Factorial" = null,
    "Log" = "log",
    "Log2" = "log2",
    "Log10" = "log10",
    // "Log1p" = null,
    // "Rint" = null,
    // "Signum" = null,
    "Sin" = "sin",
    "Sinh" = "sinh",
    "Sqrt" = "sqrt",
    "Tan" = "tan",
    // "Cot" = null,
    "Tanh" = "tanh",
    "ToDegrees" = "degrees",
    "ToRadians" = "radians",
    // "Bin" = null,
    // "Hex" = null,
    // "Unhex" = null,
    "Atan2" = "atan2",
    "Pow" = "pow",
    "ShiftLeft" = "bitlshift",
    "ShiftRight" = "bitrshift",
    // "ShiftRightUnsigned" = null,
    // "Hypot" = null,
    // "Logarithm" = null,
    "Round" = "round",
    "RoundNumeric" = "roundNumeric",
    // "BRound" = null,

    // predicates.scala
    "Not" = "not",
    "In" = "in", // This is compiled to eq & or <= not true, we support in now
    "And" = "and",
    "Or" = "or",
    "EqualTo" = "eqNonNull",
    "EqualNullSafe" = "eq",
    "LessThan" = "lt",
    "LessThanOrEqual" = "le",
    "GreaterThan" = "gt",
    "GreaterThanOrEqual" = "ge",

    // randomscala,
    // "Rand" = null, // XXX a little different
    "GenRandom" = "genRandom", // Xcalar generated
    // "Randn" = null,

    // regexpscala
    "Like" = "like",
    "RLike" = "regex",
    // "StringSplit" = null,
    // "RegExpReplace" = null,
    // "RegExpExtract" = null,
    // stringscala
    "Concat" = "concat", // Concat an array
    // "ConcatWs" = null,
    // "Elt" = null, // XXX Given an array returns element at idx
    "Upper" = "upper",
    "Lower" = "lower",
    "Contains" = "contains",
    "StartsWith" = "startsWith",
    "EndsWith" = "endsWith",
    "StringReplace" = "replace",
    // "StringTranslate" = null,
    "FindInSet" = "findInSet",
    "StringTrim" = "strip",
    "StringTrimLeft" = "stripLeft",
    "StringTrimRight" = "stripRight",
    // "StringInstr" = null,
    "SubstringIndex" = "substringIndex",
    // "StringLocate" = null,
    "Find" = "find", // Xcalar generated
    "StringLPad" = "stringLPad",
    "StringRPad" = "stringRPad",
    // "ParseUrl" = null, // TODO
    // "FormatString" = null, // TODO
    "InitCap" = "initCap", // Different behavior
    "StringRepeat" = "repeat",
    "StringReverse" = "stringReverse",
    // "StringSpace" = null, // TODO
    "Substring" = "substring", // XXX 1-based index
    "XcSubstring" = "substring", // Xcalar generated
    "Right" = "right", // XXX right(str, 5) ==
                                  // substring(str, -5, 0)
    "Left" = "left", // XXX left(str, 4) == substring(str, 0, 4)
    "Length" = "len",
    "BitLength" = "bitLength",
    "OctetLength" = "octetLength",
    "Levenshtein" = "levenshtein",
    "SoundEx" = "soundEx",
    "Ascii" = "ascii",
    "Chr" = "chr",
    // "Base64" = null, // TODO
    // "UnBase64" = null, // TODO
    // "Decode" = null, // TODO
    // "Encode" = null, // TODO
    "FormatNumber" = "formatNumber",
    // "Sentences" = null, // XXX Returns an array.
    "IsString" = "isString", // Xcalar generated
    
    // nullExpressions.scala
    "IsNotNull" = "exists",
    // "IsNull" = null, // XXX we have to put not(exists)

    // datetimescala

    // Since we're not supporting DATE type, results of all DATE related
    // functions need to go through secondTraverse to be truncated for
    // displaying purpose
    "AddMonths" = "addDateInterval", // date
    // "CurrentDate" = null, // Spark
    // "CurrentTimestamp" = null, // Spark
    "DateAdd" = "addDateInterval", // date
    "DateDiff" = "dateDiff", // date
    "DateFormatClass" = "convertFromUnixTS",
    "DateSub" = "addDateInterval", // date
    "LastDay" = "lastDayOfMonth", // date
    "NextDay" = "nextDay", // date
    "MonthsBetween" = "monthsBetween",
    "TimeAdd" = "addIntervalString",
    "TimeSub" = "addIntervalString",

    "Year" = "datePart",
    "Quarter" = "datePart",
    "Month" = "datePart",
    "WeekOfYear" = "weekOfYear",
    "DayOfWeek" = "datePart",
    "DayOfMonth" = "datePart",
    "DayOfYear" = "dayOfYear",
    "Hour" = "timePart",
    "Minute" = "timePart",
    "Second" = "timePart",

    "FromUnixTime" = "timestamp",
    // "FromUTCTimestamp" = null, //"convertTimezone",
    "ParseToDate" = "timestamp",  // date
    "ParseToTimestamp" = "timestamp",
    "ToUnixTimestamp" = "timestamp", // Need int result
    // "ToUTCTimestamp" = null, //"toUTCTimestamp",
    "TruncDate" = "dateTrunc",  // date
    "TruncTimestamp" = "dateTrunc",
    "UnixTimestamp" = "timestamp",


    "aggregate.Sum" = "sum",
    "aggregate.SumInteger" = "sumInteger",
    "aggregate.SumNumeric" = "sumNumeric",
    "aggregate.Count" = "count",
    // "aggregate.CollectList" = null,
    "aggregate.ListAgg" = "listAgg", // Xcalar generated
    "aggregate.Max" = "max",
    "aggregate.MaxInteger" = "maxInteger",
    "aggregate.MaxNumeric" = "maxNumeric",
    "aggregate.Min" = "min",
    "aggregate.MinInteger" = "minInteger",
    "aggregate.MinNumeric" = "minNumeric",
    "aggregate.Average" = "avg",
    "aggregate.AverageNumeric" = "avgNumeric",
    "aggregate.StddevPop" = "stdevp",
    "aggregate.StddevSamp" = "stdev",
    "aggregate.VariancePop" = "varp",
    "aggregate.VarianceSamp" = "var",
    // "aggregate.CentralMomentAgg" = null,
    // "aggregate.Corr" = null,
    // "aggregate.CountMinSketchAgg" = null,
    // "aggregate.Covariance" = null,
    "aggregate.First" = "first", // Only used in aggregate
    // "aggregate.HyperLogLogPlusPlus" = null,
    "aggregate.Last" = "last", // Only used in aggregate
    "Rank" = "*rank", // These eight are for window functions in map
    "PercentRank" = "*percentRank",
    "DenseRank" = "*denseRank",
    "NTile" = "*nTile",
    "CumeDist" = "*cumeDist",
    "RowNumber" = "*rowNumber",
    "Lead" = "*lead",
    "Lag" = "*lag",
    // "aggregate.Percentile" = null,
    // "aggregate.PivotFirst" = null,
    // "aggregate.AggregateExpression" = null,
    // "ScalarSubquery" = null,
    // "XCEPassThrough" = null
};

enum SQLPrefix {
    udfPrefix = "XCEPASSTHROUGH",
    logicalOpPrefix = "org.apache.spark.sql.catalyst.plans.logical"
}

enum SparkOperators {
    "Join" = "org.apache.spark.sql.catalyst.plans.logical.Join",
    "Union" = "org.apache.spark.sql.catalyst.plans.logical.Union",
    "Intersect" = "org.apache.spark.sql.catalyst.plans.logical.Intersect",
    "Except" = "org.apache.spark.sql.catalyst.plans.logical.Except"
}

enum OperatorTypes {
    "abs"= "float",
    "absNumeric"= "money",
    "absInt"= "int",
    "add"= "float",
    "addInteger"= "int",
    "addNumeric"= "money",
    "ceil"= "float",
    "div"= "float",
    "divNumeric"= "money",
    "exp"= "float",
    "floatCompare"= "int",
    "floor"= "float",
    "log"= "float",
    "log10"= "float",
    "log2"= "float",
    "mod"= "int",
    "mult"= "float",
    "multInteger"= "int",
    "multNumeric"= "money",
    "pow"= "float",
    "round"= "float",
    "sqrt"= "float",
    "sub"= "float",
    "subInteger"= "int",
    "subNumeric"= "money",
    "bitCount"= "int",
    "bitLength"= "int",
    "bitand"= "int",
    "bitlshift"= "int",
    "bitor"= "int",
    "bitrshift"= "int",
    "bitxor"= "int",
    "colsDefinedBitmap"= "int",
    "octetLength"= "int",
    "and"= "bool",
    "between"= "bool",
    "contains"= "bool",
    "endsWith"= "bool",
    "eq"= "bool",
    "eqNonNull"= "bool",
    "exists"= "bool",
    "ge"= "bool",
    "gt"= "bool",
    "in"= "bool",
    "isBoolean"= "bool",
    "isFloat"= "bool",
    "isInf"= "bool",
    "isInteger"= "bool",
    "isNull"= "bool",
    "isNumeric"= "money",
    "isString"= "bool",
    "le"= "bool",
    "like"= "bool",
    "lt"= "bool",
    "neq"= "bool",
    "not"= "bool",
    "or"= "bool",
    "regex"= "bool",
    "startsWith"= "bool",
    // "convertDate"= "string",
    // "convertFromUnixTS"= "String",
    // "convertToUnixTS"= "int",
    // "dateAddDay"= "string",
    // "dateAddInterval"= "string",
    // "dateAddMonth"= "string",
    // "dateAddYear"= "string",
    // "dateDiffday"= "int",
    // "ipAddrToInt"= "int",
    // "macAddrToInt"= "int",
    "dhtHash"= "int",
    "genRandom"= "int",
    "genUnique"= "int",
    "ifInt"= "int",
    "ifStr"= "string",
    "ifTimestamp"= "timestamp",
    "ifNumeric"= "money",
    "xdbHash"= "int",
    "ascii"= "int",
    "chr"= "string",
    "concat"= "string",
    "concatDelim"= "string",
    "countChar"= "int",
    "cut"= "string",
    "explodeString"= "string",
    "find"= "int",
    "findInSet"= "int",
    "formatNumber"= "string",
    "initCap"= "string",
    "len"= "int",
    "levenshtein"= "int",
    "lower"= "string",
    "repeat"= "string",
    "replace"= "string",
    "rfind"= "int",
    "soundEx"= "string",
    "stringLPad"= "string",
    "stringRPad"= "string",
    "stringReverse"= "string",
    "stringsPosCompare"= "bool",
    "strip"= "string",
    "stripLeft"= "string",
    "stripRight"= "string",
    "substring"= "string",
    "substringIndex"= "string",
    "upper"= "string",
    "wordCount"= "int",
    "addDateInterval"= "timestamp",
    "addIntervalString"= "timestamp",
    "addtimeInterval"= "timestamp",
    "convertFromUnixTS"= "string",
    "convertTimezone"= "timestamp",
    "dateDiff"= "int",
    "datePart"= "int",
    "dateTrunc"= "timestamp",
    "dayOfYear"= "int",
    "lastDayOfMonth"= "timestamp",
    "monthsBetween"= "float",
    "nextDay"= "timestamp",
    "timePart"= "int",
    "weekOfYear"= "int",
    "acos"= "float",
    "acosh"= "float",
    "asin"= "float",
    "asinh"= "float",
    "atan"= "float",
    "atan2"= "float",
    "atanh"= "float",
    "cos"= "float",
    "cosh"= "float",
    "degrees"= "float",
    "pi"= "float",
    "radians"= "float",
    "sin"= "float",
    "sinh"= "float",
    "tan"= "float",
    "tanh"= "float",
    "bool"= "bool",
    "float"= "float",
    "int"= "int",
    "money"= "money",
    "numeric"= "money",
    "string"= "string",
    "timestamp"= "timestamp",
    // "default:dayOfWeek"= "string",
    // "default:dayOfYear"= "string",
    // "default:weekOfYear"= "string",
    // "default:timeAdd"= "string",
    // "default:timeSub"= "string",
    // "default:toDate"= "string",
    // "default:convertToUnixTS"= "string",
    // "default:toUTCTimestamp"= "string",
    // "default:convertFormats"= "string",
    // "default:convertFromUnixTS"= "string",
    "avg"= "float",
    "avgNumeric"= "money",
    "count"= "int",
    "listAgg"= "string",
    "maxFloat"= "float",
    "maxInteger"= "int",
    "maxNumeric"= "money",
    "maxString"= "string",
    "maxTimestamp"= "timestamp",
    "minFloat"= "float",
    "minInteger"= "int",
    "minNumeric"= "money",
    "minString"= "string",
    "minTimestamp"= "timestamp",
    "sum"= "float",
    "sumInteger"= "int",
    "sumNumeric"= "money",
    "stdevp"= "float",
    "stdev"= "float",
    "varp"= "float",
    "var"= "float"
}

if (typeof global !== 'undefined') {
    global.SQLColumnType = SQLColumnType;
    global.SparkExpressions = SparkExpressions;
    global.SparkExprToXdf = SparkExprToXdf;
    global.SQLPrefix = SQLPrefix;
    global.SparkOperators = SparkOperators;
    global.OperatorTypes = OperatorTypes;
}
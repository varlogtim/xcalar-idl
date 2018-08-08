// TODO: make into a class
interface OpPanelArg {
    value: string;
    formattedValue: string;
    cast: XcCast;
    typeid: number;
    isValid: boolean;
    isNone?: boolean;
    isEmptyString?: boolean;
    isRegex?: boolean;
    type?: string; // ("value" | "column" | "function" | "regex")
    error?: string;
}

interface OpPanelFunctionGroup {
    operator: string;
    args: OpPanelArg[]
}

class GeneralOpPanelModel {
    protected dagNode: DagNodeFilter;
    protected tableColumns: ProgCol[];
    protected event: Function;
    protected groups: OpPanelFunctionGroup[]; // TODO fix
    protected andOrOperator: string;

    public constructor(dagNode: DagNodeFilter, event: Function) {
        this.dagNode = dagNode;
        this.event = event;
        this.groups = [];
        this.andOrOperator = "and";
        this.tableColumns = [];
        this._initialize();
    }

    /**
     * Return the whole model info
     */
    public getModel(): {
        groups: OpPanelFunctionGroup[],
        andOrOperator: string
    } {
        return {
            groups: this.groups,
            andOrOperator: this.andOrOperator
        }
    }

    public getColumns() {
        return this.tableColumns;
    }

    public addGroup(): void {
        this.groups.push({
            operator: "",
            args: []
        });
        this._update();
    }

    public removeGroup(index: number): void {
        this.groups.splice(index, 1);
        this._update();
    }

    public clearFunction(index: number): void {
        this.groups[index].operator = "";
        this.groups[index].args = [];
        this._update();
    }

    public enterFunction(value: string, opInfo, index: number): void {
        this.groups[index].operator = value;
        const numArgs = Math.max(Math.abs(opInfo.numArgs),
                                opInfo.argDescs.length);
        this.groups[index].args = Array(numArgs).fill("").map((_o, i) => {
                                        return {
                                            value: "",
                                            formattedValue: "",
                                            cast: null,
                                            typeid: opInfo.argDescs[i].typesAccepted,
                                            isValid: false,
                                            error: "No value",
                                            type: "value"
                                        }});
        if (value === "regex" && numArgs === 2) {
            this.groups[index].args[1].isRegex = true;
        }
        this._update();
    }

    public updateArg(
        value: string,
        groupIndex: number,
        argIndex: number,
        options?: any
    ): void {
        options = options || {};
        const group = this.groups[groupIndex];
        while (group.args.length <= argIndex) {
            group.args.push({
                value: "",
                formattedValue: "",
                cast: null,
                typeid: -1,
                isValid: false
            });
        }
        // no arg if boolean is not true
        if ((options.boolean && value === "") || options.isEmptyArg) {
            group.args.splice(argIndex, 1);
        } else {
            const arg: OpPanelArg = group.args[argIndex];
            arg.value = value;
            if (options.typeid != null) {
                arg.typeid = options.typeid;
            }
            if (options.isNone) {
                arg.isNone = true;
            } else if (arg.hasOwnProperty("isNone")) {
                arg.isNone = false;
            }
            if (options.isEmptyString) {
                arg.isEmptyString = true;
            } else if (arg.hasOwnProperty("isEmptyString")) {
                arg.isEmptyString = false;
            }
            this._formatArg(arg);
            this._validateArg(arg);
        }

        // console.log(JSON.stringify(this.groups, null, 2));
        // this._update(); // causes focus/blur issues
    }

    public updateCast(
        type: ColumnType,
        groupIndex: number,
        argIndex: number
    ): void {
        const arg: OpPanelArg = this.groups[groupIndex].args[argIndex];
        arg.cast = type;
        this._validateArg(arg);
    }

    public toggleAndOr(wasAnd) {
        this.andOrOperator = wasAnd ? "or" : "and";
        this._update();
    }

    /**
     * Submit the settings of Set op node params
     */
    public submit(): void {
        const param: DagNodeFilterInput = this._getParam();
        this.dagNode.setParam(param);
    }

    protected _initialize() {
        const self = this;
        const paramsRaw: DagNodeFilterInput = this.dagNode.getParam();
        const params: xcHelper.OpAndArgsObject = xcHelper.extractOpAndArgs(
                                                        paramsRaw.evalString);
        // initialize all columns
        this.tableColumns = this.dagNode.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns();
        })[0];
        const func = params.op;
        const categoryNum = FunctionCategoryT.FunctionCategoryCondition;
        const ops = XDFManager.Instance.getOperatorsMap()[categoryNum];
        const opInfo = ops.find((op) => {
            return op.displayName === func;
        });

        const args = params.args.map((arg, i) => {
            const argInfo: OpPanelArg = {
                                value: arg,
                                formattedValue: arg,
                                cast: null,
                                typeid: opInfo.argDescs[i].typesAccepted,
                                isValid: true
                            };
            return argInfo;
        });
        args.forEach((arg) => {
            const value = formatArgToUI(arg.value);
            arg.value = value;
            if (func === "regex" && args.length === 2) {
                arg.isRegex = true;
            }
            self._formatArg(arg);
            self._validateArg(arg);
        });

        this.groups = [{operator: params.op, args: args}];
        this.andOrOperator = "and";

        function formatArgToUI(arg) {
            if (arg.charAt(0) !== ("'") && arg.charAt(0) !== ('"')) {
                if (self._isArgAColumn(arg)) {
                    // it's a column
                    if (arg.charAt(0) !== gAggVarPrefix) {
                        // do not prepend colprefix if has aggprefix
                        arg = gColPrefix + arg;
                    }
                }
            } else {
                const quote = arg.charAt(0);
                if (arg.lastIndexOf(quote) === arg.length - 1) {
                    arg = arg.slice(1, -1); // remove surrounding quotes
                }
            }
            return arg;
        }
    }

    protected _update(): void {
        // console.log(JSON.stringify(this.tableColumns), JSON.stringify(this.getModel(), null, 2));
        if (this.event != null) {
            this.event();
        }
    }

    protected _getParam(): DagNodeFilterInput {
        const self = this;
        this.groups.forEach(group => {
            group.args.forEach(arg => {
                self._formatArg(arg);
            });
        });
        const evalString = xcHelper.formulateMapFilterString(this.groups,
                                                             this.andOrOperator);
        return {
            evalString: evalString
        }
    }

    // TODO: instead of storing formattedValue, calculate when needed based on
    // type
    protected _formatArg(arg: OpPanelArg): void {
        const self = this;
        let val: string = arg.value;
        const trimmedVal: string = arg.value.trim();

        if (trimmedVal === "") {
            if (arg.isNone) {
                arg.formattedValue = "None";
            } else if (arg.isEmptyString) {
                arg.formattedValue = '""';
            } else {
                arg.formattedValue = arg.value;
            }
            arg.type = "value";
        } else if (arg.isRegex) {
            arg.formattedValue = arg.value;
            arg.type = "regex";
        } else if (this._hasFuncFormat(trimmedVal)) {
            arg.formattedValue = self._parseColPrefixes(trimmedVal);
            arg.type = "function";
        } else if (xcHelper.hasValidColPrefix(trimmedVal)) {
            arg.formattedValue = self._parseColPrefixes(trimmedVal);
            arg.type = "column";
        } else {

            // check correct type
            // const argTypeCheckRes = self._checkArgTypes(trimmedVal, arg.typeid);
            arg.formattedValue = self._formatArgumentInput(val, arg.typeid, {}).value;
            arg.type = "value";
        }
        arg.formattedValue = arg.formattedValue.toString();
    }
// ("value" | "column" | "function" | "regex")
    protected _validateArg(arg: OpPanelArg) {
        const self = this;
        let val: string = arg.formattedValue;
        let trimmedVal: string = val.trim();
        arg.isValid = true;
        arg.error = null;

        if (val === "") {
            arg.isValid = false;
            arg.error = "No value";
            return;
        }

        if (arg.type === "column") {
            if (val.includes(",")) {
                arg.isValid = false;
                arg.error = "Multiple columns";
                return;
            }
            let colName = val;
            if (trimmedVal.length > 0) {
                colName = trimmedVal;
            }
            const progCol: ProgCol = self.tableColumns.find((progCol) => {
                return progCol.getBackColName() === colName;
            });
            if (progCol == null) { // if cannot find column, pass
                return;
            } else {
                let colType: string = progCol.getType();
                if (colType === ColumnType.integer && !progCol.isKnownType()) {
                    // for fat potiner, we cannot tell float or integer
                    // so for integer, we mark it
                    colType = ColumnType.number;
                }
                if (!arg.cast) {
                    if (colType == null) {
                        console.error("colType is null/col not " +
                            "pulled!");
                        // XXX handle this
                        arg.isValid = false;
                        arg.error = "No type";
                    } else {
                        const validTypes = self._parseType(arg.typeid);
                        let errorText = self._validateColInputType(validTypes, colType);
                        if (errorText != null) {
                            arg.isValid = false;
                            arg.error = errorText;
                            return;
                        }
                    }
                }
            }
        } else if (arg.type === "value") {
            const checkRes = self._checkArgTypes(trimmedVal, arg.typeid);
            if (checkRes != null) {
                let error;
                if (checkRes.currentType === "string" &&
                    self._hasUnescapedParens(val)) {
                    // function-like string found but invalid format
                    error = ErrTStr.InvalidFunction;
                } else {
                    error = ErrWRepTStr.InvalidOpsType;
                    error = xcHelper.replaceMsg(error, {
                        "type1": checkRes.validType.join("/"),
                        "type2": checkRes.currentType
                    });
                }

                arg.error = error;
                arg.isValid = false;
            }
        }
    }

     // checks to see if value has at least one parentheses that's not escaped
    // or inside quotes
    protected _hasUnescapedParens(val: string): boolean {
        let inQuotes: boolean = false;
        for (let i = 0; i < val.length; i++) {
            if (inQuotes) {
                if (val[i] === '"') {
                    inQuotes = false;
                } else if (val[i] === '\\') {
                    i++; // ignore next character
                }
                continue;
            }
            if (val[i] === '"') {
                inQuotes = true;
            } else if (val[i] === '\\') {
                i++; // ignore next character
            } else if (val[i] === "(" || val[i] === ")") {
                return (true);
            }
        }
        return (false);
    }

     // used for args with column names provided like $col1, and not "hey" or 3
    protected _validateColInputType(
        requiredTypes: string[],
        inputType: string
    ): string {
        if (inputType === "newColumn") {
            return ErrTStr.InvalidOpNewColumn;
        } else if (inputType === ColumnType.mixed) {
            return null;
        } else if (requiredTypes.includes(inputType)) {
            return null;
        } else if (inputType === ColumnType.number &&
                    (requiredTypes.includes(ColumnType.float) ||
                        requiredTypes.includes(ColumnType.integer))) {
            return null;
        // } else if (inputType === ColumnType.string &&
        //             this._hasUnescapedParens($input.val())) {
        //     // function-like string found but invalid format
        //     return ErrTStr.InvalidFunction;
        } else {
            return xcHelper.replaceMsg(ErrWRepTStr.InvalidOpsType, {
                "type1": requiredTypes.join("/"),
                "type2": inputType
            });
        }
    }

    public getColumnTypeFromArg(value): string {
        const self = this;
        let colType: string;


        const progCol: ProgCol = self.tableColumns.find((progCol) => {
            return progCol.getBackColName() === value;
        });
        if (progCol == null) {
            console.error("cannot find col", value);
            return;
        }

        // const backName = progCol.getBackColName();
        colType = progCol.getType();
        if (colType === ColumnType.integer && !progCol.isKnownType()) {
            // for fat potiner, we cannot tell float or integer
            // so for integer, we mark it
            colType = ColumnType.number;
        }
        return colType;
    }

    protected _hasFuncFormat(val: string): boolean {
        if (typeof val !== ColumnType.string) {
            return false;
        }
        val = val.trim();
        const valLen: number = val.length;

        if (valLen < 3) { // must be at least this long: a()
            return false;
        }

        //check if has opening and closing parens
        if (val.indexOf("(") > -1 && val.indexOf(")") > -1) {
            // check that val doesnt start with parens and that it does end
            // with parens
            if (val.indexOf("(") !== 0 &&
                val.lastIndexOf(")") === (valLen - 1)) {
                return (xcHelper.checkMatchingBrackets(val).index === -1);
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    protected _parseColPrefixes(str: string): string {
        for (let i = 0; i < str.length; i++) {
            if (str[i] === gColPrefix) {
                if (str[i - 1] === "\\") {
                    str = str.slice(0, i - 1) + str.slice(i);
                } else if (this._isActualPrefix(str, i)) {
                    str = str.slice(0, i) + str.slice(i + 1);
                }
            }
        }
        return (str);
    }

    protected _parseAggPrefixes(str: string): string {
        for (let i = 0; i < str.length; i++) {
            if (str[i] === gAggVarPrefix) {
                if (str[i - 1] === "\\") {
                    str = str.slice(0, i - 1) + str.slice(i);
                }
            }
        }
        return (str);
    }

    // returns true if previous character, not including spaces, is either
    // a comma, a (, or the very beginning
    protected _isActualPrefix(str: string, index: number): boolean {
        for (let i = index - 1; i >= 0; i--) {
            if (str[i] === ",") {
                return (true);
            } else if (str[i] === "(") {
                return (true);
            } else if (str[i] !== " ") {
                return (false);
            }
        }
        return (true);
    }

    protected _checkArgTypes(arg: string, typeid: number) {
        const types: string[] = this._parseType(typeid);
        let argType: string = "string";

        if (types.indexOf(ColumnType.string) > -1 ||
            types.indexOf(ColumnType.mixed) > -1)
        {
            // if it accepts string/mixed, any input should be valid
            return null;
        }

        let tmpArg: string | number = arg.toLowerCase();
        const isNumber: boolean = !isNaN(Number(arg));
        let canBeBooleanOrNumber: boolean = false;

        // boolean is a subclass of number
        if (tmpArg === "true" || tmpArg === "false" ||
            tmpArg === "t" || tmpArg === "f" || isNumber)
        {
            canBeBooleanOrNumber = true;
            argType = "string/boolean/integer/float";
        }

        if (types.indexOf(ColumnType.boolean) > -1) {
            // if arg doesn't accept strings but accepts booleans,
            // then the provided value needs to be a booleanOrNumber
            if (canBeBooleanOrNumber) {
                return null;
            } else {
                return {
                    "validType": types,
                    "currentType": argType
                };
            }
        }

        // the remaining case is float and integer, both is number
        tmpArg = Number(arg);

        if (!isNumber) {
            return {
                "validType": types,
                "currentType": argType
            };
        }

        if (types.indexOf(ColumnType.float) > -1) {
            // if arg is integer, it could be a float
            return null;
        }

        if (types.indexOf(ColumnType.integer) > -1) {
            if (tmpArg % 1 !== 0) {
                return {
                    "validType": types,
                    "currentType": ColumnType.float
                };
            } else {
                return null;
            }
        }

        if (types.length === 1 && types[0] === ColumnType.undefined) {
            return {
                "validType": types,
                "currentType": argType
            };
        }

        return null; // no known cases for this
    }

    protected _formatArgumentInput(
        value: string,
        typeid: number,
        existingTypes: object
    ) {
        const strShift: number = 1 << DfFieldTypeT.DfString;
        const numberShift: number =
                        (1 << DfFieldTypeT.DfInt32) |
                        (1 << DfFieldTypeT.DfUInt32) |
                        (1 << DfFieldTypeT.DfInt64) |
                        (1 << DfFieldTypeT.DfUInt64) |
                        (1 << DfFieldTypeT.DfFloat32) |
                        (1 << DfFieldTypeT.DfFloat64);
        const boolShift: number = 1 << DfFieldTypeT.DfBoolean;

        // when field accept
        let shouldBeString: boolean = (typeid & strShift) > 0;
        const shouldBeNumber: boolean = (typeid & numberShift) > 0;
        const shouldBeBoolean: boolean = (typeid & boolShift) > 0;
        let isNumberAsString: boolean;
        let isBoolAsString: boolean;

        if (shouldBeString) {
            // handle edge case
            const parsedVal: number = parseFloat(value);
            if (!isNaN(parsedVal) &&
                parsedVal === Number(value) &&
                shouldBeNumber)
            {
                // the case that the field accepts both string and number and
                // it fills in a number, should depends on the existingTypes

                // XXX potential bug is that existingTypes
                // has both string and number
                shouldBeString = existingTypes.hasOwnProperty(ColumnType.string);
                if (!shouldBeString) {
                    // when its number
                    value = <any>parsedVal;
                }
            } else if (this._isNumberInQuotes(value)) {
                if (shouldBeNumber) {
                    isNumberAsString = true;
                }
                // keep value as is
            } else if (this._isBoolInQuotes(value)) {
                if (shouldBeBoolean) {
                    isBoolAsString = true;
                }
            } else if (shouldBeBoolean) {
                const valLower = ("" + value).toLowerCase();
                if (valLower === "true" || valLower === "false") {
                    shouldBeString = false;
                }
            }
        }

        value = this._parseAggPrefixes(value);
        value = this._parseColPrefixes(value);
        if (shouldBeString) {
            if (!isNumberAsString && !isBoolAsString) {
                // add quote if the field support string
                value = "\"" + value + "\"";
                // stringify puts in too many slashes
            }
        } else if (shouldBeNumber) {
            const tempValue = "" + value; // Force string to provide indexOf
            if (tempValue.indexOf(".") === 0) {
                value = "0" + value;
            }
        } else {
            if (typeof value === ColumnType.string) {
                value = value.trim();
            }
        }

        return ({value: value, isString: shouldBeString});
    }

     // used in cases where arg could be type string and number
     protected _isNumberInQuotes(arg: string): boolean {
        if (arg[0] === "'" || arg[0] === '"') {
            const quote: string = arg[0];
            arg = arg.slice(1);
            if (arg.length > 1 && arg[arg.length - 1] === quote) {
                arg = arg.slice(0, arg.length - 1);
                const parsedVal: number = parseFloat(arg);
                if (!isNaN(parsedVal) && String(parsedVal) === arg) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }

        } else {
            return false;
        }
    }

    // used in cases where arg could be type string and bool
    protected _isBoolInQuotes(arg: string): boolean {
        if (arg[0] === "'" || arg[0] === '"') {
            const quote: string = arg[0];
            arg = arg.slice(1);
            if (arg.length > 1 && arg[arg.length - 1] === quote) {
                arg = arg.slice(0, arg.length - 1).toLowerCase();
                if (arg === "true" || arg === "false") {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }

        } else {
            return false;
        }
    }

    protected _parseType(typeId: number): ColumnType[] {
        const types: ColumnType[] = [];
        let typeShift: number;

        // string
        typeShift = 1 << DfFieldTypeT.DfString;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.string);
        }

        // integer
        typeShift = (1 << DfFieldTypeT.DfInt32) |
                    (1 << DfFieldTypeT.DfUInt32) |
                    (1 << DfFieldTypeT.DfInt64) |
                    (1 << DfFieldTypeT.DfUInt64);
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.integer);
        }

        // float
        typeShift = (1 << DfFieldTypeT.DfFloat32) |
                    (1 << DfFieldTypeT.DfFloat64);
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.float);
        }

        // boolean
        typeShift = 1 << DfFieldTypeT.DfBoolean;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.boolean);
        }

        // mixed
        typeShift = 1 << DfFieldTypeT.DfMixed;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.mixed);
        }

        // undefined/unknown
        typeShift = (1 << DfFieldTypeT.DfNull) |
                    (1 << DfFieldTypeT.DfUnknown);
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.undefined);
        }

        return (types);
    }

    protected _isArgAColumn(arg: string) {
        return (isNaN(<any>arg) &&
                arg.indexOf("(") === -1 &&
                arg !== "true" && arg !== "false" &&
                arg !== "t" && arg !== "f" && arg !== "None");
    }
}
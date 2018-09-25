namespace xcHelper {
    const PREFIX_CONCAT_CHAR = "-";

    export interface FilterOption {
        operator: FltOp;
        filterString: string;
    }

    export interface DSNameInfo {
        user: string;
        randId: string | void;
        dsName: string;
    }

    export interface MapColOption {
        replaceColumn: boolean; // if true, will replace existing col with new one
        resize: boolean; // if true, will adjust column size to colname
        type?: string // if provided, will set column type
    }

    export interface SizeTranslatorOption {
        base2: boolean;
        base3: boolean;
        space: boolean;
    }

    export interface SuccessTimer {
        step1: any;
        step2: any;
        step3: any;
        step4: any;
    }

    export interface RadiButtonOption {
        deselectFromContainer: boolean;
    }

    export interface ValidateObj {
        $ele: JQuery;
        check?: Function;
        error?: string;
        quite?: boolean;
        onErr?: Function;
        callback?: Function;
        isAlert?: boolean;
        formMode?: boolean;
        side?: string;
        delay?: number;
        text?: string;
    }

    export interface TableNameInputCheckOptions {
        preventImmediateHide: boolean;
        formMode: boolean;
        onErr: Function;
    }

    export interface CentFocusedTableOptions {
        onlyIfOffScreen: boolean;
        alignLeft: boolean;
        noClear: boolean;
    }

    export interface BracketMatchRet {
        char: string;
        index: number;
        hasParen: boolean;
    }

    export interface FillInputFormCellOptions {
        type: string;
        append: boolean;
    }

    export interface QueryParser {
        query: string;
        name: string;
        srcTables: string[];
        dstTable: string;
        exportFileName?: string;
    }

    export interface ModalSpec {
        $modal: JQuery;
        top: number;
        left: number;
    }

    export interface WindowSpec {
        winWidth: number;
        winHeight: number;
    }

    export interface PrettifyOptions {
        inArray?: number;
        comparison?: boolean;
        checkboxes: boolean;
        noQuotes?: boolean;
    }

    export interface MouseCoors {
        x: number;
        y: number;
    }

    export interface DropdownOptions {
        mouseCoors?: MouseCoors;
        offsetX?: number;
        offsetY?: number;
        classes?: string;
        colNum?: number;
        rowNum?: number;
        isMultiCol?: boolean;
        multipleColNums?: number[],
        isUnSelect?: boolean;
        shiftKey?: boolean;
        floating?: boolean;
        callback?: Function;
        isDataTd?: boolean;
        toClose?: Function;
        toggle?: boolean;
        allowSelection?: boolean;
        prefix?: string;
        color?: string;
        tableId?: TableId;
    }

    interface UDFListModule {
        name: string,
        displayName: string,
        hasMain: boolean
    }

    interface TableCell {
        isBlank: boolean;
        isMixed: boolean;
        type: string;
        isUndefined: boolean;
        isNull: boolean;
    }

    /**
     * xcHelper.reload
     * @param hardLoad
     */
    export function reload(hardLoad: boolean = false): void {
        // override heartbeat check function so that it cannot run during reload
        XcSupport.heartbeatCheck = () => false;
        xcManager.removeUnloadPrompt(true);
        location.reload(hardLoad);
    }

    /**
     * xcHelper.parseTableId
     * looks for xcTable-AB12 or $('#xcTable-AB12'),
     * or $('#xcTable-AB12').get(0) and returns AB12
     * @param idOrEl
     */
    export function parseTableId(
        idOrEl: string | JQuery | HTMLElement
    ): number | string | null {
        // can pass in a string or jQuery element or HTMLElement
        let id;
        if (idOrEl instanceof jQuery) {
            const $ele: JQuery = <JQuery>idOrEl;
            id = $ele.attr('id');
        } else if (typeof (idOrEl) === 'object') {
            id = $(idOrEl).attr('id');
        } else {
            id = idOrEl;
        }

        const idSplit = id.split('-');
        if (idSplit.length !== 2) {
            console.error('Unexpected id/ele to parse', idOrEl);
            return null;
        } else {
            id = idSplit[1];
            if (isNaN(id)) {
                return id;
            } else {
                return parseInt(id);
            }
        }
    }

    /**
     * xcHelper.parseError
     * @param error
     */
    export function parseError(error: object | string): string {
        let errorInStr: string;
        if (typeof error === 'object') {
            errorInStr = JSON.stringify(error);
        } else {
            errorInStr = error;
        }
        return errorInStr;
    }

    /**
     * xcHelper.parseRowNum
     * @param $el
     */
    export function parseRowNum($tr: JQuery): number | null {
        const keyword: string = 'row';
        const classNames: string = $tr.attr('class');

        if (classNames == null) {
            console.error('Unexpected element to parse row', $tr);
            return null;
        }
        const substring: string = classNames.substring(keyword.length);
        const rowNum: number = parseInt(substring);

        if (isNaN(rowNum)) {
            console.error('Unexpected element to parse row', $tr);
            return null;
        }

        return rowNum;
    }

    /**
     * xcHelper.parseColNum
     * @param $el
     */
    export function parseColNum($el: JQuery): number | null {
        const keyword: string = 'col';
        const classNames: string = $el.attr('class');
        if (classNames == null) {
            // this is in case we meet some error and cannot goon run the code!
            console.error('Unexpected element to parse column', $el);
            return null;
        }

        const index: number = classNames.indexOf(keyword);
        const substring: string = classNames.substring(index + keyword.length);
        const colNum: number = parseInt(substring);

        if (isNaN(colNum)) {
            console.error('Unexpected element to parse column', $el);
            return null;
        }

        return colNum;
    }

    /**
     * xcHelper.parseListDSOutput
     * @param datasets
     */
    export function parseListDSOutput(datasets: any[]) {
        const prefixIndex: number = gDSPrefix.length;
        let validDatasets: any[] = [];

        datasets.forEach((dataset) => {
            if (!dataset.name.startsWith(".XcalarLRQ.")) {
                dataset.name = dataset.name.substring(prefixIndex);
                validDatasets.push(dataset);
            }
        });
        return validDatasets;
    }

    /**
     * xcHelper.parseJsonValue
     * @param value
     * @param fnf
     */
    export function parseJsonValue(
        value: any,
        fnf?: boolean,
        escapeTab?: boolean
    ): string {
        if (fnf) {
            value = '<span class="undefined" data-toggle="tooltip" ' +
                    'data-placement="bottom" ' +
                    'data-container="body" ' +
                    'data-original-title="Field Not Found">FNF' +
                    '</span>';
        } else if (value === null) {
            value = '<span class="null">' + value + '</span>';
        } else if (value === undefined) {
            value = '<span class="blank">' + value + '</span>';
        } else {
            switch (value.constructor) {
                case (Object):
                    if ($.isEmptyObject(value)) {
                        value = "";
                    } else {
                        value = JSON.stringify(value);
                    }
                    break;
                case (Array):
                    value = JSON.stringify(value);
                    break;
                default: // leave value as is;
            }
            // escape < & > so external html doesn't get injected
            if (typeof value === 'string') {
                value = xcHelper.escapeHTMLSpecialChar(value, escapeTab);
            }
        }
        return value;
    }

    function isFloat(num) {
        return (num % 1 !== 0);
    }

    /**
     * xcHelper.parseColType, define type of the column
     * @param val
     * @param oldType
     */
    export function parseColType(
        val: any,
        oldType: string = ColumnType.undefined
    ): string {
        let type: string = oldType;
        if (val != null && oldType !== ColumnType.mixed) {
            // note: "" is empty string
            const valType: string = typeof val;
            type = valType;
            // get specific type
            if (type === ColumnType.number) {
                // the case when type is float
                if (oldType === ColumnType.float || isFloat(val)) {
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
        } else if (val === null &&
                    oldType !== null &&
                    oldType !== ColumnType.undefined) {
            // XXX Bug 11348, if column has null, we treat it as mixed type
            // wait for better typeing system
            type = ColumnType.mixed;
        }

        return type;
    }

    function isExcelUDF(udfName: string): boolean {
        // default:openExcelWithHeader is DEPRECATED as of 1.3.1.
        // Kept for backwards compatibility
        return (udfName === 'default:openExcelWithHeader') ||
                (udfName === 'default:openExcel');
    }

    /**
     * xcHelper.parseDSFormat
     * @param ds
     */
    export function parseDSFormat(ds: any): string {
        let format: string;
        try {
            var udf = ds.loadArgs.parseArgs.parserFnName;
            if (isExcelUDF(udf)) {
                format = 'Excel';
            } else if (udf === 'default:parseCsv') {
                format = 'CSV';
            } else {
                format = 'JSON';
            }
        } catch (e) {
            console.error('parse format error', e);
            format = 'Unknown';
        }

        return format;
    }

    /**
     * xcHelper.replaceInsideQuote
     * @param str
     * @param quoteChar
     */
    export function replaceInsideQuote(str: string, quoteChar: string): string {
        // baisc case '/(?=")(?:"[^"\\]*(?:\\[\s\S][^"\\]*)*")/g'
        const regExStr: string = `(?=${quoteChar})(?:${quoteChar}[^${quoteChar}\\\\]*(?:\\\\[\\s\\S][^${quoteChar}\\\\]*)*${quoteChar})`;
        const regEx: RegExp = new RegExp(regExStr, 'g');
        return str.replace(regEx, '');
    }

    /**
     * xcHelper.fullTextRegExKey
     * @param searchKey
     */
    export function fullTextRegExKey(searchKey: string): string {
        // Make it a full-text regex search
        return (searchKey + '$');
    }

    /**
     * containRegExKey
     * @param searchKey
     */
    export function containRegExKey(searchKey: string): string {
        // Make it a "contain" regex search, i.e. prepend .* and append .*
        return ('.*' + searchKey + '.*');
    }

    var $tempDiv = $('<div style="position:absolute;display:inline-block;' +
                     'white-space:pre;"></div>');
    $tempDiv.appendTo($("body"));

    /**
     * xcHelper.getTextWidth
     * @param $el [${}] - optional if val is provided
     * @param val - optional if $el is provided
     */
    export function getTextWidth($el?: JQuery, val?: string): number {
        let extraSpace: number = 0;
        let text: string;
        let defaultStyle: any;
        if (!$el) {
            defaultStyle = { // styling we use for column header
                fontFamily: "'Open Sans', 'Trebuchet MS', Arial, sans-serif",
                fontSize: "13px",
                fontWeight: "600",
                padding: 48
            };
            $el = $();
        } else {
            defaultStyle = {padding: 0};
        }

        if (val == null) {
            if ($el.is("input")) {
                text = $.trim($el.val() + " ");
            } else {
                if ($el.find(".displayedData").length) {
                    $el = $el.find(".displayedData");
                }
                text = $.trim($el.text());
            }
            // \n and \r have 3 pixels of padding
            extraSpace = $el.find(".lineChar").length * 3;
        } else {
            text = val;
        }

        $tempDiv.text(text);
        $tempDiv.css({
            "font-family": defaultStyle.fontFamily || $el.css("font-family"),
            "font-size": defaultStyle.fontSize || $el.css("font-size"),
            "font-weight": defaultStyle.fontWeight || $el.css("font-weight")
        });

        const width: number = $tempDiv.width() + defaultStyle.padding +
                            extraSpace;
        $tempDiv.empty();
        return width;
    }

    /**
     * xcHelper.getFileNamePattern
     * @param pattern
     * @param isRegex
     */
    export function getFileNamePattern(
        pattern?: string,
        isRegex?: boolean
    ): string {
        if (pattern == null) {
            return "";
        }

        var regexPrefix = isRegex ? "re:" : "";
        return (regexPrefix + pattern);
    };

    /**
     * xcHelper.getJoinRenameMap
     * @param oldName
     * @param newName
     * @param type
     */
    export function getJoinRenameMap(
        oldName: string,
        newName: string,
        type: DfFieldTypeT = DfFieldTypeT.DfUnknown
    ): ColRenameInfo {
        return {
            "orig": oldName,
            "new": newName,
            "type": type
        };
    }

    /**
     * xcHelper.convertColTypeToFieldType
     * @param colType
     */
    export function convertColTypeToFieldType(
        colType: ColumnType
    ): DfFieldTypeT {
        switch (colType) {
            case ColumnType.string:
                return DfFieldTypeT.DfString;
            case ColumnType.integer:
                return DfFieldTypeT.DfInt64;
            case ColumnType.float:
                return DfFieldTypeT.DfFloat64;
            case ColumnType.boolean:
                return DfFieldTypeT.DfBoolean;
            case ColumnType.timestamp:
                return DfFieldTypeT.DfTimespec;
            default:
                return DfFieldTypeT.DfUnknown;
        }
    }

    /**
     * xcHelper.getFilterOptions
     * @param operator
     * @param colName
     * @param uniqueVals
     * @param isExist
     * @param isNull
     */
    export function getFilterOptions(
        operator: FltOp | null,
        colName: string,
        uniqueVals: object,
        isExist: boolean,
        isNull: boolean
    ): FilterOption | null {
        if (operator == null) {
            return null;
        }

        const colVals: any[] = Object.keys(uniqueVals || {});
        let str: string = "";
        const len: number = colVals.length;

        if (operator === FltOp.Filter) {
            if (len > 0) {
                for (let i = 0; i < len - 1; i++) {
                    str += "or(eq(" + colName + ", " + colVals[i] + "), ";
                }

                str += "eq(" + colName + ", " + colVals[len - 1];
                str += ")".repeat(len);
            }

            if (isExist) {
                if (len > 0) {
                    str = "or(" + str + ", not(exists(" + colName + ")))";
                } else {
                    str = "not(exists(" + colName + "))";
                }
            }
            if (isNull) {
                if (len > 0 || isExist) {
                    str = "or(" + str + ", isNull(" + colName + "))";
                } else {
                    str = "isNull(" + colName + ")";
                }
            }
        } else if (operator === FltOp.Exclude){
            if (len > 0) {
                for (let i = 0; i < len - 1; i++) {
                    str += "and(neq(" + colName + ", " + colVals[i] + "), ";
                }

                str += "neq(" + colName + ", " + colVals[len - 1];
                str += ")".repeat(len);
            }

            if (isExist) {
                if (len > 0) {
                    str = "and(" + str + ", exists(" + colName + "))";
                } else {
                    str = "exists(" + colName + ")";
                }
            }
            if (isNull) {
                if (len > 0 || isExist) {
                    str = "and(" + str + ", not(isNull(" + colName + "))";
                } else {
                    str = "not(isNull(" + colName + "))";
                }
            }
        } else {
            console.error("error case");
            return null;
        }

        return {
            operator: operator,
            filterString: str
        };
    }

    /**
     * xcHelper.getUserPrefix
     */
    export function getUserPrefix(): string {
        return XcUser.getCurrentUserName();
    }

    /**
     * xcHelper.wrapDSName
     * @param dsName
     */
    export function wrapDSName(dsName: string = ""): string {
        let fulldsName: string = xcHelper.getUserPrefix() + ".";
        fulldsName = xcHelper.randName(fulldsName, 5);
        fulldsName += "." + dsName;
        return fulldsName;
    }

    /**
     * xcHelper.parseDSName
     * @param fulldsName
     */
    export function parseDSName(fulldsName: string): DSNameInfo {
        const nameSplits: string[] = fulldsName.split(".");
        let user: string;
        let randId: string | void;
        let dsName: string;

        if (nameSplits.length === 1) {
            user = DSTStr.UnknownUser;
            dsName = nameSplits[0];
        } else if (nameSplits.length === 2) {
            user = nameSplits[0];
            randId = DSTStr.UnknownId;
            dsName = nameSplits[1];
        } else {
            randId = nameSplits[nameSplits.length - 2];
            dsName = nameSplits[nameSplits.length - 1];
            user = nameSplits.splice(0, nameSplits.length - 2).join(".");
        }

        return {
            user: user,
            randId: randId,
            dsName: dsName
        };
    }

    /**
     * xcHelper.getUnusedTableName
     * @param srcTableName
     */
    export function getUnusedTableName(
        srcTableName: string
    ): XDPromise<string> {
        // checks dataset names and tablenames and tries to create a table
        // called dataset1 if it doesnt already exist or dataset2 etc...
        const deferred: XDDeferred<string> = PromiseHelper.deferred<string>();
        const tableNames: object = {};
        // datasets has it's unique format, no need to check
        XcalarGetTables()
        .then(function(result: any) {
            var tables = result.nodeInfo;
            for (let i = 0; i < result.numNodes; i++) {
                var name = xcHelper.getTableName(tables[i].name);
                tableNames[name] = 1;
            }
            if (result.numNodes === 0) {
                gDroppedTables = {};
            }

            let validNameFound: boolean = false;
            const limit: number = 20; // we won't try more than 20 times
            let newName: string = srcTableName;
            if (tableNames.hasOwnProperty(newName)) {
                for (let i = 1; i <= limit; i++) {
                    newName = srcTableName + i;
                    if (!tableNames.hasOwnProperty(newName)) {
                        validNameFound = true;
                        break;
                    }
                }
                if (!validNameFound) {
                    let tries: number = 0;
                    while (tableNames.hasOwnProperty(newName) && tries < 100) {
                        newName = xcHelper.randName(srcTableName, 4);
                        tries++;
                    }
                }
            }

            deferred.resolve(newName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * xcHelper.getPrefixColName
     * @param prefix
     * @param colName
     */
    export function getPrefixColName(
        prefix: string | null,
        colName: string
    ): string {
        if (prefix == null || prefix === "") {
            return colName;
        } else {
            return prefix + gPrefixSign + colName;
        }
    }

    /**
     * xcHelper.parsePrefixColName
     * @param colName
     */
    export function parsePrefixColName(colName: string): PrefixColInfo {
        colName = colName || "";
        const index: number = colName.indexOf(gPrefixSign);
        let prefix: string = "";
        let name: string = colName;
        if (index >= 0) {
            prefix = colName.substring(0, index);
            name = colName.substring(index + gPrefixSign.length);
        }

        return {
            prefix: prefix,
            name: name,
        };
    }

    /**
     * xcHelper.stripPrefixInColName
     * @param colName
     */
    export function stripPrefixInColName(colName: string): string {
        return colName.split(gPrefixSign).join(PREFIX_CONCAT_CHAR);
    }

    export function convertPrefixName(
        prefix: string,
        name: string
    ): string {
        return prefix + PREFIX_CONCAT_CHAR + name;
    }

    /**
     * xcHelper.normalizePrefix
     * @param prefix
     */
    export function normalizePrefix(prefix: string) {
        if (prefix.length > gPrefixLimit) {
            // if prefix is auto generated by table name and
            // the table name is too long, slice it
            // XXX Possible TODO: machine learning to decide the prefix
            prefix = prefix.substring(0, gPrefixLimit);
        }

        // Strip all random characters from dsName
        prefix = (<string>xcHelper.checkNamePattern(PatternCategory.Dataset,
            PatternAction.Fix, prefix, "_")).replace(/-/g, "_");
        return prefix;
    }

    /**
     * xcHelper.stripCSVExt
     * @param str
     */
    export function stripCSVExt(str: string): string {
        if (str.endsWith(".csv")) {
            str = str.slice(0, -4);
        }
        return str;
    }

    /**
     * xcHelper.parseUserStr
     * must be in a "name" = function(args) format
     * will return the function(args) portion
     * @param userStr
     */
    export function parseUserStr(userStr: string): string {
        // search for the index of first = that's not in quotes
        let inQuotes: boolean = false;
        let index = 0;
        for (let i = 0; i < userStr.length; i++) {
            if (userStr[i] === "\\") {
                i++;
                continue;
            }
            if (!inQuotes) {
                if (userStr[i] === '"') {
                    inQuotes = true;
                } else if (userStr[i] === "=") {
                    index = i + 1;
                    break;
                }
            } else if (userStr[i] === '"') {
                inQuotes = false;
            }
        }
        return userStr.substring(index).trim();
    }


    export interface OpAndArgsObject {
        op: string;
        args: string[];
    }

    /**
     * xcHelper.extractOpAndArgs
     * extract op and arguments from a string delimited by delimiter
     * E.g, eq("agwe", 3)
     *  You will call this function with delim=','
     *  And the function will return {"op": "eq", "args": ["agwe", 3]}
     *  This handles edge conditions like eq("eqt,et", ",")
     * @param str
     * @param delim [,] - Optional and will default to ,
     */
    export function extractOpAndArgs(
        str: string,
        delim: string = ','
    ): OpAndArgsObject {
        if (str === "") {
            return {
                op: "",
                args: []
            };
        }
        const leftParenIndex: number = str.indexOf('(');
        const rightParenIndex: number = str.lastIndexOf(')');
        const op: string = str.slice(0, leftParenIndex).trim();
        const argStr = str.slice(leftParenIndex + 1, rightParenIndex).trim();

        const args: string[] = [];
        let inQuote: boolean = false;
        let singleQuote: boolean = false; // ' is true, " is false
        let curArg: string = "";
        let braceCount: number = 0; // track nested functions
        for (let i = 0; i < argStr.length; i++) {
            switch (argStr[i]) {
                case ('"'):
                    curArg += argStr[i];
                    if (!inQuote || (inQuote && !singleQuote)) {
                        inQuote = !inQuote;
                    }
                    break;
                case ("'"):
                    curArg += argStr[i];
                    if (inQuote && singleQuote) {
                        inQuote = !inQuote;
                        singleQuote = false;
                    } else if (!inQuote) {
                        inQuote = !inQuote;
                        singleQuote = true;
                    }
                    break;
                case ('\\'):
                    curArg += argStr[i];
                    curArg += argStr[i + 1];
                    i++;
                    break;
                case ("("):
                    curArg += argStr[i];
                    if (!inQuote) {
                        braceCount++;
                    }
                    break;
                case (")"):
                    curArg += argStr[i];
                    if (!inQuote) {
                        braceCount--;
                    }
                    break;
                case (delim):
                    if (!inQuote && braceCount === 0) {
                        args.push(curArg);
                        curArg = "";
                    } else {
                        curArg += argStr[i];
                    }
                    break;
                default:
                    curArg += argStr[i];
            }
        }

        args.push(curArg);
        const trimmedArgs = args.map((arg) => arg.trim());
        return {
            op: op,
            args: trimmedArgs
        };
    }

    /**
     * xcHelper.getTableKeyFromMeta
     * @param tableMeta
     */
    export function getTableKeyFromMeta(tableMeta: any) {
        return tableMeta.keyAttr.map((keyAttr) => {
            if (keyAttr.valueArrayIndex < 0) {
                return null;
            }
            return keyAttr.name;
        });
    }

    /**
     * xcHelper.getTableKeyInfoFromMeta
     * @param tableMeta
     */
    export function getTableKeyInfoFromMeta(
        tableMeta: any
    ): {name: string, ordering: XcalarOrderingT}[] {
        const keys: {name: string, ordering: XcalarOrderingT}[] = [];
        tableMeta.keyAttr.forEach((keyAttr) => {
            if (keyAttr.valueArrayIndex >= 0) {
                keys.push({
                    name: keyAttr.name,
                    ordering: keyAttr.ordering
                });
            }
        });
        return keys;
    }

    /**
     * xcHelper.deepCopy, get a deep copy
     * @param obj
     */
    export function deepCopy(obj: any): any {
        const str: string = JSON.stringify(obj);
        let res = null;

        try {
            res = JSON.parse(str);
        } catch (err) {
            console.error(err, str);
        }

        return res;
    }

    function binarySearchEllipsisLen(
        text: string,
        minLen: number,
        desiredWidth: number,
        ctx: CanvasRenderingContext2D,
        ellipsisFunc: Function
    ): number {
        let maxLen: number = text.length;
        while (minLen < maxLen) {
            let midLen: number = Math.floor((maxLen + minLen) / 2);
            const str: string = ellipsisFunc(text, midLen);
            const width: number = ctx.measureText(str).width;

            if (width > desiredWidth) {
                maxLen = midLen - 1;
            } else if (width < desiredWidth) {
                minLen = midLen + 1;
            } else {
                return midLen;
            }
        }

        return minLen;
    }

    function middlellispsisStr(str: string, ellpsisLen: number): string {
        const strLen: number = str.length;
        // if strLen is 22 and ellpsisLen is 21
        // then the finalText may be longer if no this check
        let res: string = str;
        if (strLen <= 3) {
            return res;
        }

        if (ellpsisLen > strLen - 3) {
            ellpsisLen = strLen - 3;
        }
        res = str.slice(0, ellpsisLen - 3) + "..." + str.slice(str.length - 3);
        return res;
    }

    /**
     * xcHelper.middleEllipsis
     * this function is generally looped over many times
     * we pass in ctx (a reference to canvas) so that we don't create a new
     * canvas within the function many times in the loop
     * canvas is used to measure text width
     * @param text
     * @param $ele
     * @param checkLen
     * @param maxWidth
     * @param isMultiLine
     * @param ctx
     */
    export function middleEllipsis(
        text: string | null,
        $ele: JQuery,
        minLen: number,
        maxWidth: number,
        isMultiLine: boolean,
        ctx: CanvasRenderingContext2D
    ): boolean {
        // keep this because if pass in null, should change to string "null"
        // (since text is come from $el.data(), text might be null)
        const textInStr: string = String(text);
        const textWidth: number = ctx.measureText(textInStr).width;
        let finalText: string;
        let ellipsis: boolean = false;

        if (isMultiLine) {
            maxWidth *= 2;
        }
        if (textWidth < maxWidth) {
            finalText = textInStr;
        } else {
            const len: number = binarySearchEllipsisLen(textInStr,
                minLen, maxWidth, ctx, middlellispsisStr);
            finalText = middlellispsisStr(textInStr, len);
            ellipsis = true;
        }

        if ($ele.is("input")) {
            $ele.val(finalText);
        } else {
            $ele.text(finalText);
        }
        return ellipsis;
    }

    function leftEllipsisStr(str: string, ellpsisLen: number): string {
        const strLen: number = str.length;
        // if strLen is 22 and ellpsisLen is 21
        // then the finalText may be longer if no this check
        if (strLen - 3 > 0 && ellpsisLen > strLen - 3) {
            ellpsisLen = strLen - 3;
        }
        return ("..." + str.slice(strLen - ellpsisLen));
    }

    /**
     * xcHelper.leftEllipsis
     * @param text
     * @param $ele
     * @param maxWidth
     * @param ctx
     */
    export function leftEllipsis(
        text: string | null,
        $ele: JQuery,
        maxWidth: number,
        ctx: CanvasRenderingContext2D
    ): boolean {
        // keep this because if pass in null, should change to string "null"
        // (since text is come from $el.data(), text might be null)
        const textInStr: string = String(text);
        const textWidth: number = ctx.measureText(textInStr).width;
        let finalText: string;
        let ellipsis: boolean = false;

        if (textWidth < maxWidth) {
            finalText = textInStr;
        } else {
            const len: number = binarySearchEllipsisLen(textInStr, 3, maxWidth,
                ctx, leftEllipsisStr);
            finalText = leftEllipsisStr(textInStr, len);
            ellipsis = true;
        }

        if ($ele.is("input")) {
            $ele.val(finalText);
        } else {
            $ele.text(finalText);
        }

        return ellipsis;
    }

    /**
     * xcHelper.getMaxTextLen
     * @param ctx
     * @param text
     * @param desiredWidth
     * @param minLen
     * @param maxLen
     */
    export function getMaxTextLen(
        ctx: CanvasRenderingContext2D,
        text: string,
        desiredWidth: number,
        minLen: number,
        maxLen: number
    ): number {
        if (maxLen - minLen <= 1) {
            return minLen;
        }
        const midPoint: number = Math.floor((maxLen + minLen) / 2);
        const modText: string = text.slice(0, midPoint);
        const width: number = ctx.measureText(modText).width;
        if (width > desiredWidth) {
            return xcHelper.getMaxTextLen(ctx, text, desiredWidth,
                minLen, midPoint);
        } else if (width < desiredWidth) {
            return xcHelper.getMaxTextLen(ctx, text, desiredWidth,
                midPoint, maxLen);
        } else {
            return midPoint;
        }
    }

    /**
     * xcHelper.mapColGenerate
     * @param colNum
     * @param colName
     * @param mapStr
     * @param tableCols
     * @param options
     */
    export function mapColGenerate(
        colNum: number,
        colName: string,
        mapStr: string,
        tableCols: any[],
        options: MapColOption = <MapColOption>{}
    ): ProgCol[] {
        const copiedCols: any[] = xcHelper.deepCopy(tableCols);
        let sizedTo: string;

        if (colNum > 0) {
            let cellWidth: number;
            if (options.replaceColumn) {
                if (options.resize) {
                    cellWidth = xcHelper.getDefaultColWidth(colName);
                } else {
                    cellWidth = copiedCols[colNum - 1].width;
                }
                sizedTo = copiedCols[colNum - 1].sizedTo;
            } else {
                cellWidth = xcHelper.getDefaultColWidth(colName);
                sizedTo = "header";
            }

            const newProgCol: any = ColManager.newCol({
                backName: colName,
                name: colName,
                width: cellWidth,
                userStr: '"' + colName + '" = map(' + mapStr + ')',
                isNewCol: false,
                sizedTo: sizedTo
            });

            if (options.type) {
                newProgCol.type = options.type;
            }

            if (options.replaceColumn) {
                copiedCols.splice(colNum - 1, 1, newProgCol);
            } else {
                copiedCols.splice(colNum - 1, 0, newProgCol);
            }
            newProgCol.parseFunc();
        }

        return copiedCols;
    }

    /**
     * xcHelper.getDefaultColWidth
     * @param colName
     * @param prefix
     */
    export function getDefaultColWidth(
        colName: string,
        prefix?: string
    ): number {
        let prefixText: string = prefix;
        if (prefixText === "" || prefixText == null) {
            prefixText = CommonTxtTstr.Immediates;
        }

        const width: number = xcHelper.getTextWidth(null, colName);
        const prefixW: number = xcHelper.getTextWidth(null, prefixText);
        return Math.max(width, prefixW);
    }

    // takes ["a", "b", "c"] and returns "a, b, and c"
    /**
     * xcHelper.listToEnglish
     * @param list
     */
    export function listToEnglish(list: string[]): string {
        if (list.length === 1) {
            return list[0];
        } else if (list.length === 2) {
            return list[0] + " and " + list[1];
        } else if (list.length > 2) {
            let str = "";
            for (let i = 0; i < list.length; i++) {
                if (i === list.length - 1) {
                    str += "and " + list[i];
                } else {
                    str += list[i] + ", ";
                }
            }
            return str;
        } else {
            return "";
        }
    }

    function padZero(num: number, numDigits: number): string {
        const numInStr: string = num.toString();
        return (numInStr.length < numDigits) ?
            new Array(numDigits - numInStr.length + 1).join('0') + numInStr :
            numInStr;
    }

    // xcHelper.randName, default digits is 5
    /**
     * xcHelper.randName
     * @param name
     * @param digits
     */
    export function randName(name: string, digits: number = 5): string {
        const max: number = Math.pow(10, digits);
        let rand: number = Math.floor(Math.random() * max);

        if (rand === 0) {
            rand = 1;
        }

        const randAffix = padZero(rand, digits);
        return (name + randAffix);
    }

    /**
     * xcHelper.uniqueName
     * @param name
     * @param validFunc
     * @param nameGenFunc
     * @param maxTry
     */
    export function uniqueName(
        name: string,
        validFunc: Function,
        nameGenFunc: Function | null,
        maxTry: number = 10
    ): string {
        let validName: string = name;
        if (!(validFunc instanceof Function)) {
            return validName;
        }

        if (!(nameGenFunc instanceof Function)) {
            nameGenFunc = function(cnt) {
                // start from 1
                return name + '_' + cnt;
            };
        }

        let tryCnt: number = 0;
        while (!validFunc(validName) && tryCnt < maxTry) {
            // should be low chance that still has name conflict
            tryCnt++;
            validName = nameGenFunc(tryCnt);
        }

        if (tryCnt === maxTry) {
            console.error('Too much try, name Conflict!');
            return xcHelper.randName(name); // a hack result
        } else {
            return validName;
        }
    }

    // xcHelper.autoName
    export function autoName(
        origName: string,
        checkMap: object,
        maxTry: number = 20,
        delim: string = ''
    ): string {
        let validName: string = origName;
        let tryCnt = 0;

        while (checkMap.hasOwnProperty(validName) && tryCnt <= maxTry) {
            tryCnt++;
            validName = origName + delim + tryCnt;
        }

        if (tryCnt > maxTry) {
            validName = xcHelper.randName(origName);
        }
        return validName;
    }

     /**
     * xcHelper.getUniqColName
     * get unique column name
     * @param tableId
     * @param colName
     * @param onlyCheckPulledCol
     * @param takenNames - an object of unavailable column names that aren't in
     * the current table but will be part of a descendant table
     * @param colNumToIgnore
     */
    export function getUniqColName(
        tableId: TableId,
        colName: string | null,
        onlyCheckPulledCol: boolean = false,
        takenNames: object = {},
        colNumToIgnore?: number[]
    ): string {
        if (colName == null) {
            return xcHelper.randName('NewCol');
        }

        const parseName: PrefixColInfo = xcHelper.parsePrefixColName(colName);
        colName = parseName.name;

        const table = gTables[tableId];
        if (table == null) {
            console.error('table not has meta, cannot check');
            return colName;
        }

        if (!takenNames.hasOwnProperty(colName)) {
            if (!table.hasCol(colName, parseName.prefix, onlyCheckPulledCol)) {
                return colName;
            } else if (colNumToIgnore != null &&
                       table.getColNumByBackName(colName) === colNumToIgnore
            ) {
                return colName;
            }
        }

        const validFunc = function(newColName) {
            return !table.hasCol(newColName, parseName.prefix) &&
                   !takenNames.hasOwnProperty(newColName)
        }

        return xcHelper.uniqueName(colName, validFunc, null, 50);
    }

    /**
     * xcHelper.uniqueRandName, used in testsuite
     * @param name
     * @param validFunc
     * @param maxTry
     */
    export function uniqueRandName(
        name: string,
        validFunc: Function,
        maxTry: number
    ): string {
        const initialName: string = xcHelper.randName(name);
        const nameGenFunc: Function = () => xcHelper.randName(name);
        return xcHelper.uniqueName(initialName, validFunc, nameGenFunc, maxTry);
    }

    /**
     * xcHelper.capitalize
     * @param str
     */
    export function capitalize(str: string): string {
        if (!str) {
            return str;
        }
        return str[0].toUpperCase() + str.slice(1);
    }

    /**
     * xcHelper.arraySubset
     * @param subset
     * @param fullset
     */
    export function arraySubset(subset: any[], fullset: any[]): boolean {
        for (let i = 0; i < subset.length; i++) {
            if (fullset.indexOf(subset[i]) === -1) {
                return false;
            }
        }
        return true;
    }

    /**
     * xcHelper.arrayUnion,
     * returns a new array that is the deduped union of the 2 arrays
     * @param array1
     * @param array2
     */
    export function arrayUnion(array1: any[], array2: any[]): any[] {
        const unioned: any[] = [];
        for (let i = 0; i < array1.length; i++) {
            if (unioned.indexOf(array1[i]) === -1) {
                unioned.push(array1[i]);
            }
        }
        for (let i = 0; i < array2.length; i++) {
            if (unioned.indexOf(array2[i]) === -1) {
                unioned.push(array2[i]);
            }
        }
        return unioned;
    }

    function genDate(date: Date | null, timeStamp: string | null): Date {
        if (date == null) {
            date = (timeStamp == null) ? new Date() : new Date(timeStamp);
        }
        return date;
    }

    /**
     * xcHelper.getDate, format is mm-dd-yyyy
     * @param delimiter
     * @param date
     * @param timeStamp
     */
    export function getDate(
        delimiter: string = '-',
        date: Date | null,
        timeStamp: string | null
    ): string {
        const resDate: Date = genDate(date, timeStamp);
        return resDate.toLocaleDateString().replace(/\//g, delimiter);
    }

    /**
     * xcHelper.getTime
     * @param date
     * @param timeStamp
     * @param noSeconds
     */
    export function getTime(
        date: Date | null,
        timeStamp : string | null,
        noSeconds: boolean
    ): string {
        const resDate: Date = genDate(date, timeStamp);
        if (noSeconds) {
            return resDate.toLocaleTimeString(navigator.language, {
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            return resDate.toLocaleTimeString();
        }
    }

    /**
     * xcHelper.getCurrentTimeStamp
     */
    export function getCurrentTimeStamp(): number {
        return new Date().getTime();
    }

    /**
     * xcHelper.timeStampConvertSeconds
     * Converts the timestamp from seconds to Days Hours Minutes Seconds
     * @param timeInSeconds
     * @param noZeros {boolean} if true will not show values if is 0
     */
    export function timeStampConvertSeconds(
        timeInSeconds: number,
        noZeros: boolean
    ): string {
        const days: number = Math.floor(timeInSeconds / (24 * 60 * 60));
        timeInSeconds -= days * 24 * 60 * 60;
        const hours: number = Math.floor(timeInSeconds / (60 * 60));
        timeInSeconds -= hours * 60 * 60;
        const minutes: number = Math.floor(timeInSeconds / 60);
        timeInSeconds -= minutes * 60;
        const seconds: number = timeInSeconds;
        let dateString: string = "";
        let nonZeroFound = false;

        // Lol, grammatically, it's 0 hours, 1 hour, 2 hours, etc.
        if (!noZeros || days !== 0) {
            dateString += days + " day";
            dateString += days !== 1 ? "s": "";
            dateString += ", ";
            nonZeroFound = true;
        }

        if ((!noZeros || hours !== 0) || nonZeroFound) {
            dateString += hours + " hour";
            dateString += hours !== 1 ? "s": "";
            dateString += ", ";
            nonZeroFound = true;
        }

        if ((!noZeros || minutes !== 0) || nonZeroFound) {
            dateString += minutes + " minute";
            dateString += minutes !== 1 ? "s": "";
            dateString += ", ";
        }

        dateString += seconds + " second";
        dateString += seconds !== 1 ? "s": "";

        return dateString;
    }

    /**
     * xcHelper.getAppUrl
     */
    export function getAppUrl() {
        var url;
        if (window['expHost'] !==  undefined) {
            // this is for dev environment if you set it in config.js
            url = window['expHost'];
        } else {
            url = hostname + "/app";
        }
        return url;
    }

    /**
     * xcHelper.downloadAsFile
     * @param fileName
     * @param fileContents
     * @param isRaw
     */
    export function downloadAsFile(
        fileName: string,
        fileContents: string,
        isRaw: boolean
    ): void {
        // XXX FIXME fix it if you can find a way to download it as .py file
        var element = document.createElement('a');
        var contents = fileContents;
        if (isRaw) {
            contents = 'data:text/plain;base64,' + btoa(fileContents);
        } else {
            contents = 'data:text/plain;charset=utf-8,' +
                       encodeURIComponent(fileContents);
        }
        element.setAttribute('href', contents);
        element.setAttribute('download', fileName);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    /**
     * xcHelper.sizeTranslator
     * returns size as string -> "0.55KB" or ["0.55", "KB"]
     * @param size
     * @param unitSeparated {boolean}, true if want return an array of
     *                                 [string size, string unit]
     * @param convertTo
     * @param options
     */
    export function sizeTranslator(
        size: number | null,
        unitSeparated: boolean = false,
        convertTo?: string,
        options: SizeTranslatorOption = <SizeTranslatorOption>{}
    ): string | any[] {
        if (size == null) {
            return null;
        }
        let unit: string[];
        if (options.base2) {
            unit = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
        } else if (options.base3) {
            size *= 8;
            unit = ['B', 'Kib', 'Mib', 'Gib', 'Tib', 'Pib'];
        } else {
            unit = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        }

        let start: number = 0;
        const end: number = unit.length - 1;

        if (convertTo && unit.indexOf(convertTo) > -1) {
            start = unit.indexOf(convertTo);
            size *= (1 / Math.pow(1024, start));
        } else {
            while (size >= 1024 && start < end) {
                size = (size / 1024);
                ++start;
            }
        }

        let sizeString: string = size + "";
        if (start === 0 || size >= 1000) {
            sizeString = parseInt(sizeString) + ""; // to string
        } else {
            sizeString = parseFloat(sizeString).toPrecision(3);
        }

        if (unitSeparated) {
            return ([sizeString, unit[start]]);
        } else {
            const space = options.space ? ' ' : '';
            return (sizeString + space + unit[start]);
        }
    }

    /**
     * xcHelper.textToBytesTranslator
     * accepts parameters in the form of "23GB" or "56.2 mb"
     * and converts them to bytes
     * @param numText
     * @param options
     */
    export function textToBytesTranslator(
        numText: string,
        options: SizeTranslatorOption = <SizeTranslatorOption>{}
    ): number {
        if (!numText) {
            return 0;
        }
        let units: string[];
        let num: number = parseFloat(numText);
        if (options.base2) {
            units = ['B', 'KIB', 'MIB', 'GIB', 'TIB', 'PIB'];
        } else if (options.base3) {
            num /= 8;
            units = ['B', 'Kib', 'Mib', 'Gib', 'Tib', 'Pib'];
        } else {
            units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        }
        let text: string = numText.match(/[a-zA-Z]+/)[0];
        if (!options.base3) {
            text = text.toUpperCase();
        }
        const index: number = units.indexOf(text);
        const bytes: number = Math.round(num * Math.pow(1024, index));
        return bytes;
    }

    /**
     * xcHelper.getColTypeIcon
     * @param type
     */
    export function getColTypeIcon(type: DfFieldTypeT): string {
        switch (type) {
            case (DfFieldTypeT.DfInt32):
            case (DfFieldTypeT.DfInt64):
            case (DfFieldTypeT.DfUInt32):
            case (DfFieldTypeT.DfUInt64):
            case (DfFieldTypeT.DfFloat32):
            case (DfFieldTypeT.DfFloat64):
                return 'xi-integer';
            case (DfFieldTypeT.DfString):
                return 'xi-string';
            case (DfFieldTypeT.DfBoolean):
                return 'xi-boolean';
            case (DfFieldTypeT.DfTimespec):
                return 'xi-timestamp';
            default:
                // DfScalarObj will be mixed
                return 'xi-mixed';
        }
    }

     /**
     * xcHelper.getDFFieldTypeToString
     * @param type
     */
    export function getDFFieldTypeToString(type: DfFieldTypeT): ColumnType {
        switch (type) {
            case (DfFieldTypeT.DfInt32):
            case (DfFieldTypeT.DfInt64):
            case (DfFieldTypeT.DfUInt32):
            case (DfFieldTypeT.DfUInt64):
                return ColumnType.integer;
            case (DfFieldTypeT.DfFloat32):
            case (DfFieldTypeT.DfFloat64):
                return ColumnType.float;
            case (DfFieldTypeT.DfString):
                return ColumnType.string;
            case (DfFieldTypeT.DfBoolean):
                return ColumnType.boolean;
            case (DfFieldTypeT.DfTimespec):
                return ColumnType.timestamp;
            default:
                // DfScalarObj will be mixed
                return ColumnType.mixed;
        }
    }

    var successTimers: SuccessTimer = <SuccessTimer>{};

    /**
     * xcHelper.showSuccess
     * @param msg
     */
    export function showSuccess(msg: string): void {
        showSuccessBoxMessage(true, msg);
    }

    /**
     * xcHelper.showFail
     * @param msg
     */
    export function showFail(msg: string): void {
        showSuccessBoxMessage(false, msg);
    }

    function showSuccessBoxMessage(isSuccess: boolean, msg: string): void {
        const $successMessage: JQuery = $('#successMessageWrap');
        xcHelper.hideSuccessBox();
        if (!isSuccess) {
            $successMessage.addClass('failed');
        }
        $successMessage.show();
        if (msg) {
            $successMessage.find('.textBox').text(msg);
        }
        if (!gMinModeOn) {
            var $checkMark = $successMessage.find('.checkMark');
            var $text = $successMessage.find('.successMessage');
            var $largeText = $successMessage.find('.largeText');
            $text = $text.add($largeText);
            var $textAndCheckMark = $checkMark.add($text);
            $textAndCheckMark.addClass('hidden');
            $checkMark.hide().addClass('bounceInDown');

            successTimers.step1 = setTimeout(function() {
                $text.removeClass('hidden');
            }, 200);

            successTimers.step2 = setTimeout(function() {
                $checkMark.show().removeClass('hidden');
            }, 400);

            successTimers.step3 = setTimeout(function() {
                $textAndCheckMark.addClass('hidden');
            }, 2000);

            successTimers.step4 = setTimeout(function() {
                $successMessage.find(".textBox.success")
                .text(StatusMessageTStr.ActionSuccess);
                $successMessage.find(".textBox.failed")
                .text(StatusMessageTStr.ActionFailed);
                xcHelper.hideSuccessBox();
            }, 2600);
        } else {
            $successMessage.find('.hidden').removeClass('hidden');
            $successMessage.find('.checkMark').removeClass('bounceInDown')
                                              .show();
            successTimers.step4 = setTimeout(function() {
                xcHelper.hideSuccessBox();
                $successMessage.find(".textBox.success")
                .text(StatusMessageTStr.ActionSuccess);
                $successMessage.find(".textBox.failed")
                .text(StatusMessageTStr.ActionFailed);
            }, 1800);
        }
    }

    /**
     * xcHelper.hideSuccessBox
     */
    export function hideSuccessBox(): void {
        const $successMessage: JQuery = $('#successMessageWrap');
        const $checkMark: JQuery = $successMessage.find('.checkMark');
        $successMessage.find('.checkMark, .successMessage, .largeText')
                       .addClass('hidden');
        $successMessage.removeClass("failed");
        $checkMark.hide();
        $successMessage.hide();
        for (let timer in successTimers) {
            clearTimeout(successTimers[timer]);
        }
    }

    /**
     * xcHelper.replaceMsg
     * replaces is an object, its keys are the mark strings to replace
     * each key's value is the string to replace with
     * @param txt
     * @param replaces
     */
    export function replaceMsg(txt: string, replaces: object = {}): string {
        return replaceTemplate(
            txt,
            Object.keys(replaces).reduce((res, key) => {
                res[`<${key}>`] = replaces[key];
                return res;
            }, {}),
            false
        );
    }

    /**
     * xcHelper.replaceTemplate
     * @param txt Template string
     * @param replaces An object. key is the string/regex to be replaced. value is the string to replace with.
     * @param isGlobal true: replace all matches; false: replace the first math
     * @example replaceTemplate('Replace <me>', {'<me>': 'you'}). The output is 'Replace you'.
     */
    export function replaceTemplate(
        txt: string,
        replaces: object = {},
        isGlobal: boolean = false
    ): string {
        try {
            const flag = isGlobal ? 'g' : undefined;
            for (let key in replaces) {
                const str: string = replaces[key];
                if (str == null) {
                    continue;
                }

                txt = txt.replace(new RegExp(key, flag), str);
            }
        } catch(e) {
            console.error(e);
        }

        return txt;
    }

    /**
     *  xcHelper.toggleListGridBtn
     * @param $btn
     * @param toListView
     * @param noRefresh
     */
    export function toggleListGridBtn(
        $btn: JQuery,
        toListView: boolean,
        noRefresh: boolean
    ): void {
        const $icon: JQuery = $btn.hasClass('icon') ? $btn : $btn.find('.icon');
        if (toListView) {
            // toggle to list view
            $btn.removeClass('gridView').addClass('listView');
            $icon.removeClass('xi-list-view').addClass('xi-grid-view');
            // suggest become 'to grid view'
            xcTooltip.changeText($btn, TooltipTStr.ToGridView, false);
        } else {
            // toggle to grid view
            $btn.removeClass("listView").addClass("gridView");
            $icon.removeClass("xi-grid-view").addClass("xi-list-view");
            xcTooltip.changeText($btn, TooltipTStr.ToListView, false);
        }
        // refresh tooltip
        if (!noRefresh) {
            xcTooltip.refresh($btn, null);
        }
    }

    /**
     * xcHelper.showRefreshIcon
     * @param $location
     * @param manualClose
     * @param promise
     */
    export function showRefreshIcon(
        $location: JQuery,
        manualClose: boolean,
        promise: XDPromise<any> | null
    ): JQuery {
        const $waitingIcon: JQuery = $('<div class="refreshIcon"><img src=""' +
                            'style="display:none;height:0px;width:0px;' +
                            '"></div>');
        const spinTime: number = 1500;
        $location.append($waitingIcon);
        $waitingIcon.find('img').show();
        setTimeout(() => {
            $waitingIcon.find('img')
                .attr('src', paths.waitIcon)
                .height(37)
                .width(35);
        }, 0);

        if (promise != null) {
            // guarantees waitingIcon shows for at least 1.5 seconds
            const startTime: number = Date.now();
            promise.always(() => {
                const elapsedTime: number = Date.now() - startTime;
                const timeout: number = Math.max(0, spinTime - elapsedTime);
                setTimeout(() => {
                    $waitingIcon.fadeOut(100, () => {
                        $waitingIcon.remove();
                    });
                }, timeout);
            });
        } else if (!manualClose) {
            setTimeout(() => {
                $waitingIcon.fadeOut(100, () => {
                    $waitingIcon.remove();
                });
            }, spinTime);
        }

        return $waitingIcon;
    }

    /**
     * xcHelper.toggleBtnInProgress
     * @param $btn
     * @param success
     */
    export function toggleBtnInProgress($btn: JQuery, success: boolean): void {
        if ($btn.hasClass('btnInProgress')) {
            let oldHtml: string = $btn.data('oldhtml');
            $btn.removeClass('btnInProgress');
            if (success) {
                let html: string =
                    '<span class="text center-button-text">' +
                        oldHtml +
                    '</span>' +
                    '<i class="icon xi-tick xi-tick-fade-in"></i>';
                $btn.html(html);
                setTimeout(() => {
                    $btn.html(oldHtml)
                        .removeData('oldhtml');
                }, 2700);
            } else {
                $btn.html(oldHtml)
                    .removeData('oldhtml');
            }
        } else {
            const text: string = $btn.text();
            let oldhtml: string = $btn.html();
            let html: string =
                    '<div class="animatedEllipsisWrapper">' +
                        '<div class="text">' +
                            text +
                        '</div>' +
                        '<div class="animatedEllipsis staticEllipsis">' +
                          '<div>.</div>' +
                          '<div>.</div>' +
                          '<div>.</div>' +
                        '</div>' +
                    '</div>';
            $btn.html(html)
                .addClass('btnInProgress')
                .data('oldhtml', oldhtml);
        }
    }

    /**
     * xcHelper.optionButtonEvent
     * @param $container
     * @param callback
     * @param options - deselectFromContainer, boolean, if true will deselect
     * all radios from $container instead of from nearest .radioButtonGroup
     */
    export function optionButtonEvent(
        $container: JQuery,
        callback: Function | null,
        options: RadiButtonOption = <RadiButtonOption>{}
    ): void {
        $container.on('click', '.radioButton', function() {
            var $radioButton = $(this);
            if ($radioButton.hasClass('active') ||
                $radioButton.hasClass('disabled') ||
                $radioButton.hasClass('unavailable')
            ) {
                return;
            }
            if (options.deselectFromContainer) {
                $container.find('.radioButton.active').removeClass('active');
            } else {
                $radioButton.closest('.radioButtonGroup')
                        .find('.radioButton.active').removeClass('active');
            }

            $radioButton.addClass('active');

            const option: string = $radioButton.data('option');
            if (typeof callback === 'function') {
                callback(option, $radioButton);
            }
        });
    }

    /**
     * xcHelper.supportButton
     * @param type
     */
    export function supportButton(type: string): JQuery {
        let $btn: JQuery;
        let html: string;

        switch (type) {
            case 'log':
                // download log button
                html = '<button type="button" class="btn downloadLog">' +
                            CommonTxtTstr.DownloadLog +
                        '</button>';
                $btn = $(html);
                $btn.click(function() {
                    $(this).blur();

                    const logCaches: object[] = Log.getAllLogs();
                    let log: string;
                    if (logCaches['logs'].length === 0 &&
                        logCaches['errors'].length === 0)
                    {
                        log = Log.getLocalStorage() || Log.getBackup() || "";
                    } else {
                        log = JSON.stringify(logCaches);
                    }

                    xcHelper.downloadAsFile("xcalar.log", log, false);
                    xcHelper.showSuccess(SuccessTStr.Copy);
                });
                break;
            case 'support':
                // generate bundle button
                html = '<button type="button" class="btn genSub" ' +
                        'data-toggle="tooltip" title="' +
                        TooltipTStr.GenTicket + '">' +
                            CommonTxtTstr.GenTicket +
                        '</button>';
                $btn = $(html);
                $btn.click(function() {
                    SupTicketModal.show();
                    $(this).blur();
                    MonitorGraph.stop();
                });
                break;
            case 'adminSupport':
                html = '<button type="button" ' +
                        'class="btn adminOnly adminSupport" ' +
                        'data-toggle="tooltip" ' +
                        'title="' + "Support Tools" + '">' +
                            MonitorTStr.SupportTools +
                        '</button>';
                $btn = $(html);

                $btn.click(function() {
                    Admin.showSupport();
                });
                break;
            default:
                // log out button
                html = '<button type="button" class="btn logout">' +
                            CommonTxtTstr.LogOut +
                        '</button>';
                $btn = $(html);
                $btn.click(function() {
                    $(this).blur();
                    if (XcUser.CurrentUser != null) {
                        XcUser.CurrentUser.logout();
                    } else {
                        xcManager.unload();
                    }
                });
                break;
        }

        return $btn;
    }

    /**
     * xcHelper.copyToClipboard
     * @param text
     */
    export function copyToClipboard(text: string): void {
        //use textarea to preserve new line characters
        const $hiddenInput: JQuery = $('<textarea class="xcClipboardArea"></textarea>');
        $('body').append($hiddenInput);
        $hiddenInput.val(text).select();
        document.execCommand('copy');
        $hiddenInput.remove();
    }

    /**
     * xcHelper.validate
     * @param eles
     */
    export function validate(eles: ValidateObj[] | ValidateObj): boolean {
        /*
            returns false if fails validation
         * eles is an object or an array of object, each object includes:

           $ele: jquery element to check
           check: function to check validation, if empty, will check if the
                  value of selecor is empty. Val of the $ele will be
                  passed into the function
           error: error to show if the check is failed
           quite: if set true, will not show any warnning box.
           onErr: if not null, will call it before showing the StatusBox
           callback: if not null, will call it after check fails
           isAlert: if set true, will show Alert Modal, default is StatusBox
           formMode: if set true, will use StatusBox's form mode
           side: string, side to show the pop up
           delay: delay to show the status box
           ...: to be extened in the future.

         * Check will run in array's order.
         */

        if (!(eles instanceof Array)) {
            eles = [eles];
        }

        for (let i = 0; i < eles.length; i++) {
            const ele: ValidateObj = eles[i];
            const $e: JQuery = ele.$ele;
            const val: string = $e.is("input") ? $e.val() : $e.text();
            let error: string;
            let notValid: boolean;

            if (typeof ele.check === 'function') {
                notValid = ele.check(val);
                error = ele.error || ErrTStr.InvalidField;
            } else {
                notValid = (val.trim() === "");
                error = ele.error || ErrTStr.NoEmpty;
            }

            if (notValid) {
                if (ele.quite) {
                    return false;
                }
                let options: StatusBox.StatusDisplayerOpions = <StatusBox.StatusDisplayerOpions>{};
                if (ele.side) {
                    options.side = ele.side;
                }

                // before error
                if (typeof ele.onErr === 'function') {
                    ele.onErr();
                }

                // show error
                if (ele.isAlert) {
                    Alert.error(ErrTStr.InvalidField, error);
                } else {
                    if (ele.delay != null) {
                        setTimeout(() => {
                            StatusBox.show(error, $e, ele.formMode, options);
                        }, 300);
                    } else {
                        StatusBox.show(error, $e, ele.formMode, options);
                    }
                }

                // callback
                if (typeof ele.callback === 'function') {
                    ele.callback();
                }

                return false;
            }
        }

        return true;
    }

    /**
     * xcHelper.tableNameInputChecker
     */
    export function tableNameInputChecker(
        $input: JQuery,
        options: TableNameInputCheckOptions = <TableNameInputCheckOptions>{}
    ): boolean {
        options = $.extend({
            preventImmediateHide: true,
            formMode: true
        }, options);

        let error: string;
        const newTableName: string = $input.val().trim();

        if (newTableName === "") {
            error = ErrTStr.NoEmpty;
        } else if (!xcHelper.isValidTableName(newTableName)) {
            error = ErrTStr.InvalidTableName;
        } else if (newTableName.length >=
            XcalarApisConstantsT.XcalarApiMaxTableNameLen) {
            error = ErrTStr.TooLong;
        }

        if (error != null) {
            const formMode: boolean = options.formMode || false;
            if (typeof options.onErr === 'function') {
                options.onErr();
            }
            StatusBox.show(error, $input, formMode, options);
            return false;
        } else {
            return true;
        }
    }

    // xcHelper.getTableName, get out tableName from tableName + hashId
    export function getTableName(wholeName: string): string {
        const hashIndex: number = wholeName.lastIndexOf('#');
        let tableName: string;
        if (hashIndex > -1) {
            tableName = wholeName.substring(0, hashIndex);
        } else {
            tableName = wholeName;
        }
        return tableName;
    }

    /**
     * xcHelper.getTableId
     * expects 'schedule#AB12' and retuns 'AB12'
     * @param wholeName
     */
    export function getTableId(wholeName: string): number | string | null {
        if (wholeName == null) {
            return null;
        }
        // get out hashId from tableName + hashId
        const hashIndex: number = wholeName.lastIndexOf('#');
        if (hashIndex > -1) {
            let id = wholeName.substring(hashIndex + 1);
            if (isNaN(Number(id))) {
                return id;
            } else {
                return parseInt(id);
            }
        } else {
            return null;
        }
    }

    /**
     * xcHelper.getBackTableSet
     */
    export function getBackTableSet(): XDPromise<any> {
        const deferred: XDDeferred<object> = PromiseHelper.deferred();

        XcalarGetTables()
        .then((backEndTables) => {
            const backTables: object = backEndTables.nodeInfo;
            const numBackTables: number = backEndTables.numNodes;
            const backTableSet: object = {};

            for (let i = 0; i < numBackTables; i++) {
                // record the table
                backTableSet[backTables[i].name] = true;
            }

            if (numBackTables === 0) {
                gDroppedTables = {}; // no need to keep meta when no tables
            }
            deferred.resolve(backTableSet, numBackTables);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * xcHelper.lockTable
     * will lock the table's worksheet as well
     * so that worksheet cannot be deleted
     * @param tableId
     * @param txId - if no txId, will not be made cancelable
     * @param options
     *
     */
    export function lockTable(
        tableId: TableId,
        txId?: number,
        options: {delayTime: number} = {delayTime: null}
    ): void {
        // lock worksheet as well
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            return;
        }
        const $tableWrap: JQuery = $('#xcTableWrap-' + tableId);
        const isModelingMode = table.modelingMode;
        if ($tableWrap.length !== 0 && !$tableWrap.hasClass('tableLocked')) {
            // XXX TODO Remove this hack
            const $container: JQuery = isModelingMode ?
            DagTable.Instance.getView() : $('#mainFrame');
            const iconNum: number = $('.lockedTableIcon[data-txid="' + txId +
                                    '"] .progress').length;
            // tableWrap may not exist during multijoin on self
            const html: string = xcHelper.getLockIconHtml(txId, iconNum);
            const $lockedIcon: JQuery = $(html);
            if (txId == null) {
                $lockedIcon.addClass("noCancel");
            }
            $tableWrap.addClass('tableLocked').append($lockedIcon);

            const progressCircle: ProgressCircle = new ProgressCircle(txId, iconNum);
            $lockedIcon.data('progresscircle', progressCircle);
            const iconHeight: number = $lockedIcon.height();
            const tableHeight: number = $tableWrap.find('.xcTbodyWrap').height();
            const tbodyHeight: number = $tableWrap.find('tbody').height() + 1;
            const containerHeight: number = $container.height();
            let topPos: number = 50 * ((tableHeight - (iconHeight/2))/ containerHeight);
            topPos = Math.min(topPos, 40);

            $lockedIcon.css('top', topPos + '%');
            $tableWrap.find('.xcTbodyWrap')
                    .append('<div class="tableCover"></div>');
            $tableWrap.find('.tableCover').height(tbodyHeight);
            if (isModelingMode) {
                TblFunc.alignLockIcon();
            } else {
                // add lock class to dataflow
                $('#dagWrap-' + tableId).addClass('locked notSelected')
                .removeClass('selected');
                TblFunc.moveTableTitles(null);
            }

            // prevent vertical scrolling on the table
            const $tbody: JQuery = $tableWrap.find('.xcTbodyWrap');
            const scrollTop: number = $tbody.scrollTop();
            $tbody.on('scroll.preventScrolling', function() {
                $tbody.scrollTop(scrollTop);
            });
            TableList.lockTable(tableId);
            if (options.delayTime) {
                setTimeout(function() {
                    if ($tableWrap.hasClass("tableLocked")) {
                        $tableWrap.addClass("tableLockedDisplayed");
                    }
                }, options.delayTime);
            } else {
                $tableWrap.addClass("tableLockedDisplayed");
            }
        }
        const lockHTML: string = '<i class="lockIcon icon xi-lockwithkeyhole"></i>';
        const $dagTables: JQuery = $('#dagPanel').find('.dagTable[data-tableid="' +
                                                    tableId + '"]');
        $dagTables.addClass('locked');
        if (!gTables[tableId].isNoDelete()) {
            // if noDelete, they would already have a lock
            if (!$dagTables.find('.lockIcon').length) {
                $dagTables.append(lockHTML);
            }
        }

        gTables[tableId].lock();
        WSManager.lockTable(tableId);
        Log.lockUndoRedo();
    }

    /**
     * xcHelper.unlockTable
     * @param tableId
     */
    export function unlockTable(tableId: TableId): void {
        const table = gTables[tableId];
        const $dagTables: JQuery = $('#dagPanel').find('.dagTable[data-tableid="' +
                                                        tableId + '"]');

        if (!table) {
            // case if table was deleted before unlock is called;
            Log.unlockUndoRedo();
            $dagTables.removeClass('locked');
            $dagTables.find('.lockIcon').remove();
            return;
        }
        table.unlock();
        // remove unlock icon even if table is inactive or not present just
        // in case it might still be in the worksheet
        const $tableWrap: JQuery = $("#xcTableWrap-" + tableId);
        $tableWrap.find('.lockedTableIcon').remove();
        $tableWrap.find('.tableCover').remove();
        $tableWrap.removeClass('tableLocked tableLockedDisplayed');
        $('#dagWrap-' + tableId).removeClass('locked');

        const $tbody: JQuery = $tableWrap.find('.xcTbodyWrap');
        $tbody.off('scroll.preventScrolling');

        $dagTables.removeClass('locked');
        if (!table.isNoDelete()) {
            // if noDelete, they still need the lock
            $dagTables.find('.lockIcon').remove();
        }
        TableList.unlockTable(tableId);
        WSManager.unlockTable(tableId);
        Log.unlockUndoRedo();
    }

    /**
     * xcHelper.getLockIconHtml
     * @param txId
     * @param iconNum
     * @param withText
     * @param withSteps
     * @param forFileSearch
     */
    export function getLockIconHtml(
        txId: number | string,
        iconNum: number,
        withText: boolean = false,
        withSteps: boolean = false,
        forFileSearch: boolean = false
    ): string {
        let cancelType: string = forFileSearch ? "cancelSearch" : "cancelLoad";
        let html: string =
            '<div class="progressCircle ' + cancelType + ' lockedTableIcon"';
        if (!forFileSearch) {
            html += ' data-txid="' + txId + '" data-iconnum="' + iconNum + '"';
        }
        let title: string = forFileSearch ? TooltipTStr.CancelSearch :
                                            TooltipTStr.CancelQuery;
        html += '>' +
                '<div class="iconPart" data-toggle="tooltip" ' +
                'data-original-title="' + title + '" ' +
                'data-placement="top" data-container="body">' +
                    '<div class="leftPart"></div>' +
                    '<div class="rightPart"></div>' +
                    '<i class="icon xi-clock"></i>' +
                    '<i class="icon xi-close"></i>';
        if (!forFileSearch) {
            html += '<div class="progress"></div>';
        }
        html += '</div>';
        if (withSteps) {
            html += '<div class="textPart stepText">' +
            '<span class="currentStep">0</span>' + ' / ' +
            '<span class="totalSteps">1</span>' +
            '</div>' +
                '<div class="textPart cancelText">' + AlertTStr.CANCEL + '</div>';
        } else if (withText) {
            html += '<div class="textPart pctText">' +
            '<span class="num">0</span>' + '<span class="unit">%</span>' +
            '</div>' +
                '<div class="textPart cancelText">' + AlertTStr.CANCEL + '</div>';
        }
        html += '</div>';
        return html;
    }

    /**
     * xcHelper.disableSubmit
     * @param $submitBtn
     */
    export function disableSubmit($submitBtn: JQuery) {
        if ($submitBtn.is('button')) {
            $submitBtn.prop('disabled', true);
        } else {
            $submitBtn.addClass('xc-disabled');
        }
    }

    /**
     * xcHelper.enableSubmit
     * @param $submitBtn
     */
    export function enableSubmit($submitBtn: JQuery) {
        $submitBtn.prop('disabled', false);
        if ($submitBtn.is('button')) {
            $submitBtn.prop('disabled', false);
        } else {
            $submitBtn.removeClass('xc-disabled');
        }
    }

    /**
     * xcHelper.disableScreen
     * @param $area
     */
    export function disableScreen($area: JQuery, options?): JQuery {
        options = options || {};
        let classes = options.classes || "";
        const $waitingBg: JQuery = $('<div class="xc-waitingBG ' +  classes +
            '">' +
            '<div class="waitingIcon"></div>' +
        '</div>');
        if (options.id) {
            $waitingBg.attr("id", options.id);
        }
        $area.append($waitingBg);
        setTimeout(() => {
            $waitingBg.find(".waitingIcon").fadeIn();
        }, 200);
        return $waitingBg;
    }

    /**
     * xcHelper.enableScreen
     * @param $waitingBg
     */
    export function enableScreen($waitingBg: JQuery): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        $waitingBg.fadeOut(200, function() {
            $(this).remove();
            deferred.resolve();
        });
        return deferred.promise();
    }

    // inserts text into an input field and adds commas
    // detects where the current cursor is and if some text is already selected

    /**
     * xcHelper.insertText
     * @param $input
     * @param textToInsert
     * @param append
     */
    export function insertText(
        $input: JQuery,
        textToInsert: string,
        append: boolean = false
    ): void {
        const inputType: string = $input.attr('type');
        if (inputType !== 'text') {
            console.warn('inserting text on inputs of type: "' + inputType +
                        '" is not supported');
            return;
        }

        if (!append) {
            $input.val(textToInsert).trigger('input', {insertText: true});
            // fires input event in case any listeners react to it
            $input.focus();
            return;
        }

        const value: string = $input.val();
        const valLen: number = value.length;

        const initialScrollPosition: number = $input.scrollLeft();
        let currentPos: number = (<HTMLInputElement>$input[0]).selectionStart;
        const selectionEnd: number = (<HTMLInputElement>$input[0]).selectionEnd;
        const numCharSelected: number = selectionEnd - currentPos;

        let strLeft: string;
        let newVal: string;
        let resVal: string = "";

        if (valLen === 0) {
            // add to empty input box
            newVal = textToInsert;
            resVal = newVal;
            currentPos = newVal.length;
        } else if (numCharSelected > 0) {
            // replace a column
            strLeft = value.substring(0, currentPos);
            newVal = textToInsert;
            resVal = strLeft + newVal + value.substring(selectionEnd);
            currentPos = strLeft.length + newVal.length;
        } else if (currentPos === valLen) {
            // append a column
            if (value.endsWith(",")) {
                // value ends with ",""
                newVal = " " + textToInsert;
            } else if (value.trimRight().endsWith(",")) {
                // value ends with sth like ",  "
                newVal = textToInsert;
            } else {
                newVal = ", " + textToInsert;
            }
            resVal = value + newVal;

            currentPos = value.length + newVal.length;
        } else if (currentPos === 0) {
            // prepend a column
            if (value.trimLeft().startsWith(",")) {
                // value start with sth like "  ,"
                newVal = textToInsert;
            } else {
                newVal = textToInsert + ", ";
            }
            resVal = newVal + value;

            currentPos = newVal.length; // cursor at the start of value
        } else {
            // insert a column. numCharSelected == 0
            strLeft = value.substring(0, currentPos);

            newVal = textToInsert + ", ";
            resVal = strLeft + newVal + value.substring(selectionEnd);

            currentPos = strLeft.length + newVal.length;
        }

        $input.focus();
        if (!document.execCommand("insertText", false, newVal)) {
            $input.val(resVal);
        }

        const inputText: string = $input.val().substring(0, currentPos);
        const textWidth: number = xcHelper.getTextWidth($input, inputText);
        const newValWidth: number = xcHelper.getTextWidth($input, newVal);
        const inputWidth: number = $input.width();
        const widthDiff: number = textWidth - inputWidth;
        if (widthDiff > 0) {
            $input.scrollLeft(initialScrollPosition + newValWidth);
        }
    }

    /**
     * xcHelper.getFocusedTable
     */
    export function getFocusedTable(): void {
        const $table: JQuery = $('.xcTableWrap .tblTitleSelected').closest('.xcTableWrap');
        const $activeTable: JQuery = $table.filter(function() {
            return !$(this).hasClass('inActive');
        });
        if ($activeTable.length === 0) {
            return null;
        }

        return $activeTable.data("id");
    }

    /**
     * xcHelper.centerFocusedTable
     * @param tableWrapOrId
     * @param animate {boolean}, indicating whether to animate the scrolling
     * @param options -
     * onlyIfOffScreen: boolean, if true, will only animate table if visible
     * alignLeft: boolean, if true, will align table to left of screen
     * noClear: boolean, if true, will not deselect text
     */
    export function centerFocusedTable(
        tableWrapOrId: JQuery | TableId,
        animate: boolean,
        options: CentFocusedTableOptions = <CentFocusedTableOptions>{}
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred<void>();
        let $tableWrap: JQuery;
        let tableId: TableId;

        if (tableWrapOrId instanceof jQuery) {
            $tableWrap = <JQuery>tableWrapOrId;
            tableId = $tableWrap.data('id');
        } else {
            $tableWrap = $('#xcTableWrap-' + tableWrapOrId);
            tableId = <TableId>tableWrapOrId;
        }

        if (!$tableWrap.length) {
            deferred.reject();
            return deferred.promise();
        }

        const wsId: string = WSManager.getWSFromTable(tableId);
        if (wsId !== WSManager.getActiveWS()) {
            WSManager.switchWS(wsId);
        }

        TblFunc.focusTable(tableId);

        const tableRect: ClientRect = $tableWrap[0].getBoundingClientRect();
        const tableWidth: number = tableRect.width;
        const tableLeft: number = tableRect.left;
        const tableRight: number = tableRect.right;
        const mainMenuOffset: number = MainMenu.getOffset();

        const $mainFrame: JQuery = $('#mainFrame');
        const mainFrameRect: ClientRect = $mainFrame[0].getBoundingClientRect();
        const mainFrameWidth: number = mainFrameRect.width;
        const mainFrameRight: number = mainFrameRect.right;
        // cases to center: if table is small enough to fit entirely within the
        // window.
        // otherwise align table to the left of the window
        // cases to alignRight - if table is partially visible from the left
        // side of the screen
        // alignCenter takes precedence over alignRight and alignLeft

        if (tableLeft < mainMenuOffset && tableRight > mainFrameRight) {
            // table takes up the entire screen and more
            // no need to center
            deferred.resolve();
            return deferred.promise();
        }

        // if this option is passed, it will not focus on the table if at least
        // 150 px of it is visible. If the table is offscreen, no animation will
        // be applied to the scrolling. If it's partially visible (0 - 150px),
        // animation will be applied
        if (options.onlyIfOffScreen) {
            if (tableRight > mainMenuOffset &&
                tableRight < (mainMenuOffset + 150)) {
                // table is slightly visible on the left
                animate = true;
            } else if (tableLeft < mainFrameRight &&
                      tableLeft > mainFrameRight - 150) {
                // table is slightly visible on the right
                animate = true;
            } else if (tableRight < mainMenuOffset ||
                        tableLeft > mainFrameRight) {
                // table is offscreen, proceed to center the table
                // no animation
            } else {
                // table is in view and at least 150 pixels are visible
                deferred.resolve();
                return deferred.promise();
            }
        }

        var currentScrollPosition = $('#mainFrame').scrollLeft();
        var leftPosition = currentScrollPosition + tableLeft - mainMenuOffset;
        var scrollPosition;

        if (tableWidth < mainFrameWidth) {
            // table fits completely within window so we center it
            scrollPosition = leftPosition + ((tableWidth - mainFrameWidth) / 2);
        } else if (tableRight > mainMenuOffset && tableRight < mainFrameRight) {
            // table is partially visible from the left side of the screen
            // so we align the right edge of the table to the right of window
            scrollPosition = leftPosition + (tableWidth - mainFrameWidth);
        } else {
            // align left by default
            scrollPosition = leftPosition;
        }

        if (animate && !gMinModeOn) {
            $('#mainFrame').animate({scrollLeft: scrollPosition}, 500, () => {
                TblManager.alignTableEls();
                if (!options.noClear) {
                    xcHelper.removeSelectionRange();
                }
                deferred.resolve();
            });
        } else {
            $('#mainFrame').scrollLeft(scrollPosition);
            TblManager.alignTableEls();
            deferred.resolve();
        }
        return deferred.promise();
    }

    /**
     * xcHelper.centerFocusedColumn
     * @param tableId
     * @param colNum
     * @param animate {boolean} - indicating whether to animate the scrolling
     * @param noSelect
     */
    export function centerFocusedColumn(
        tableId: TableId,
        colNum: number,
        animate: boolean,
        noSelect: boolean
    ): void {
        const table: TableMeta = gTables[tableId];
        // XXX TODO: remove this hack
        const modelingMode: boolean = (table && table.modelingMode);
        const $contaianer: JQuery = modelingMode ? DagTable.Instance.getView() : $('#mainFrame');
        const $tableWrap: JQuery = $('#xcTableWrap-' + tableId);
        const containerWidth: number = $contaianer.width();
        const currentScrollPosition: number = $contaianer.scrollLeft();
        const $th: JQuery = $tableWrap.find('th.col' + colNum);
        if ($th.length === 0) {
            return;
        }
        const columnOffset: number = $th.offset().left - MainMenu.getOffset();
        const colWidth: number = $th.width();
        const leftPosition: number = currentScrollPosition + columnOffset;
        const scrollPosition: number = leftPosition -
            ((containerWidth - colWidth) / 2);

        TblFunc.focusTable(tableId);
        if (!noSelect) {
            $th.find('.flex-mid').mousedown();
        }

        if (animate && !gMinModeOn) {
            $contaianer.animate({
                scrollLeft: scrollPosition
            }, 500, () => {
                TblFunc.focusTable(tableId);
                TblManager.alignTableEls();
                xcHelper.removeSelectionRange();
            });
        } else {
            $contaianer.scrollLeft(scrollPosition);
            TblManager.alignTableEls();
        }
    }

    /**
     * xcHelper.isTableInScreen
     * @param tableId
     * @param winWidth
     */
    export function isTableInScreen(tableId: TableId, winWidth?: number): boolean {
        const $tableWrap: JQuery = $("#xcTableWrap-" + tableId);
        if ($tableWrap.length === 0) {
            return false;
        }

        const windowWidth: number = winWidth || $(window).width();
        const tableLeft: number = $tableWrap.offset().left;
        const tableRight: number = tableLeft + $tableWrap.width();
        const mainFrameOffsetLeft: number = MainMenu.getOffset();

        return (tableRight >= mainFrameOffsetLeft) && (tableLeft <= windowWidth);
    }

    /**
     * xcHelper.scrollIntoView
     * for scrolling list items vertically into view, expecting $list to have
     * position relative or absolute
     * @param $item
     * @param $list
     */
    export function scrollIntoView($item: JQuery, $list: JQuery) {
        // outer to include padding
        const listHeight: number = $list.outerHeight();
        const scrollTop: number = $list.scrollTop();
        const itemOffsetTop: number = $item.position().top;
        if (itemOffsetTop > (listHeight - 25)) {
            $list.scrollTop(itemOffsetTop + scrollTop - (listHeight / 2) + 30);
        } else if (itemOffsetTop < -5) {
            $list.scrollTop(scrollTop + itemOffsetTop - (listHeight / 2));
        }
    }

    /**
     * xcHelper.getTableIndex
     * @param targetWS
     * @param position
     * @param selector
     */
    export function getTableIndex(
        targetWS: string,
        position: number,
        selector: string
    ): number {
        const targetIndex: number = WSManager.indexOfWS(targetWS);
        const sheets: string[] = WSManager.getWSList();
        const $allTables: JQuery = $(selector + ':not(.building)');
        let index: number = 0;
        const $wsTables: JQuery = $(selector + ':not(.building).worksheet-' +
                                    targetWS);
        if ($wsTables.length) {
            index = $allTables.index($wsTables.first());
        } else {
            for (let i = 0; i < targetIndex; i++) {
                index += $(selector + ':not(.building).worksheet-' +
                            sheets[i]).length;
            }
        }

        if (position != null && $wsTables.length) {
            index += position;
        } else {
            index += $wsTables.length;
        }
        return index;
    }

    /**
     * xcHelper.createNextName
     * @param str
     * @param delimiter
     */
    export function createNextName(str: string, delimiter: string): string {
        const parts: string[] = str.split(delimiter);
        const lastIndex: number = parts.length - 1;
        const rets: RegExpExecArray = /([0-9])+/.exec(parts[lastIndex]);
        if (rets && rets.index === 0 &&
            rets[0].length === parts[lastIndex].length
        ) {
            parts[lastIndex] = parseInt(parts[lastIndex]) + 1 + "";
            return parts.join(delimiter);
        } else {
            return str + delimiter + "1";
        }
    }

    /**
     * xcHelper.createNextColumnName
     * Create a column name that is not in allNames and is not str
     * @param allNames
     * @param str
     * @param tableId
     */
    export function createNextColumnName(
        allNames: string[],
        str: string,
        tableId: string
    ): string {
        const delimiter: string = '_';
        const parts: string[] = str.split(delimiter);
        let candidate: string;
        allNames.push(str);
        if (parts.length === 1) {
            candidate = parts[0];
        } else {
            // Check out whether the suffix is another tableId
            const lastPart: string = parts[parts.length - 1];
            if (/^[a-zA-Z]{2}[0-9]+$/.test(lastPart)) {
                if (parts.length > 2 &&
                    jQuery.isNumeric(parseFloat(parts[parts.length - 2])))
                {
                    parts.splice(parts.length - 2, 2);
                } else {
                    parts.splice(parts.length - 1, 1);
                }
                candidate = parts.join(delimiter);
            } else {
                candidate = str;
            }
        }
        const newName: string = candidate + delimiter + tableId;
        if (allNames.indexOf(newName) === -1) {
            return newName;
        } else {
            // filter allnames by the ones that end with delimiter + tableId
            // figure out what is the largest number
            // add 1 to it
            // if there is no largest number, then it's set to 1
            const collisions: string[] = allNames.filter((val) => {
                return (val.startsWith(candidate + delimiter) &&
                        val.endsWith(tableId));
            });
            let largestNumber: number = 0;
            for (let i = 0; i < collisions.length; i++) {
                const firstPart: string = collisions[i].substring(0,
                                        collisions[i].lastIndexOf(delimiter));
                const numberIndex: number = firstPart.lastIndexOf(delimiter);
                if (numberIndex === -1) {
                    continue;
                }
                const numberPart: string = firstPart.substring(numberIndex + 1);
                if (jQuery.isNumeric(parseFloat(numberPart))) {
                    if (parseFloat(numberPart) > largestNumber) {
                        largestNumber = parseFloat(numberPart);
                    }
                }
            }
            return candidate + delimiter + (largestNumber + 1) +
                    delimiter + tableId;
        }
    }

    /**
     * xcHelper.checkNamePattern
     * @param catrgory - which pattern to follow
     * @param action - Enum in PatternAction
     * fix: if you want to return the string that is the legal version
     * check: true/false as to whether pattern is legal
     * get: returns pattern string
     * @param name - value of string OPTIONAL
     * @param replace - if action is fix, then replace is the character to replace with
     */
    export function checkNamePattern(
        category: PatternCategory,
        action: PatternAction,
        name?: string,
        replace: string = ""
    ): string | boolean | RegExp {
        let namePattern: RegExp;
        let antiNamePattern: RegExp;
        switch (category) {
            case PatternCategory.Dataset:
                antiNamePattern = /[^a-zA-Z0-9_-]/;
                break;
            case PatternCategory.Dataflow:
                antiNamePattern = /[^a-zA-Z0-9\(\)\s:_-]/;
                break;
            case PatternCategory.Export:
                antiNamePattern = /[^/a-zA-Z0-9_-]/;
                break;
            case PatternCategory.Folder:
                antiNamePattern = /[^a-zA-Z0-9\(\)\s:_-]/;
                break;
            case PatternCategory.Param:
                antiNamePattern = /[^a-zA-Z0-9]/;
                break;
            case PatternCategory.Prefix:
                namePattern = /^[a-zA-Z0-9_]{1,31}$/;
                break;
            case PatternCategory.UDF:
                namePattern = /^[a-z_][a-zA-Z0-9_-]*$/;
                break;
            case PatternCategory.UDFFn:
                namePattern = /^[a-z_][a-zA-Z0-9_]*$/;
                break;
            case PatternCategory.Workbook:
            case PatternCategory.Target:
                namePattern = /^[a-zA-Z][a-zA-Z0-9\s_-]*$/;
                break;
            case PatternCategory.SQLSnippet:
                antiNamePattern = /[^a-zA-Z\d\_\- ]/;
                break;
            default:
                namePattern = /^[a-zA-Z0-9_-]+$/;
                antiNamePattern = /[^a-zA-Z0-9_-]/;
                break;
        }

        switch (action) {
            case PatternAction.Fix:
                return name.split(antiNamePattern).join(replace);
            case "check":
                if (antiNamePattern) {
                    return !(antiNamePattern.test(name));
                } else {
                    return namePattern.test(name);
                }
            case "get":
                return namePattern;
            default:
                throw "Unspport action!";
        }
    }

    /**
     * xcHelper.isValidTableName
     * @param str
     */
    export function isValidTableName(str: string): boolean {
        if (str == null || str === "") {
            return false;
        }

        // has to start with alpha character
        if (!xcHelper.isStartWithLetter(str)) {
            return false;
        }

        // cannot have any characters other than alphanumeric
        // or _ -
        return !/[^a-zA-Z\d\_\-]/.test(str);
    }

    /**
     * xcHelper.escapeDblQuoteForHTML
     * @param str
     */
    export function escapeDblQuoteForHTML(str: string): string {
        return str.replace(/\"/g, "&quot;");
    }

    /**
     * xcHelper.escapeDblQuote
     * used for $el.find(str) when str is '[data-val="val"ue"]'
     * @param str
     */
    export function escapeDblQuote(str: string): string {
        return str.replace(/\"/g, "\\\"");
    }

    /**
     * xcHelper.hasInvalidCharInCol
     * @param str
     * @param noSpace
     * @param noDoubleColon true: "::" is invalid, ":" is valid; false: "::" is valid, ":" is invalid
     */
    export function hasInvalidCharInCol(
        str: string,
        noSpace: boolean,
        noDoubleColon: boolean = false
    ): boolean {
        const rules = {
            '00': /^ | $|[\^,\(\)\[\]{}'"\.\\]|:/, // space: valid; single colon: invalid; double colon: valid
            '10': /^ | $|[\^,\(\)\[\]{}'"\.\\ ]|:/, // space: invalid; single colon: invalid; double colon: valid
            '01': /^ | $|[\^,\(\)\[\]{}'"\.\\]|::/, // space: valid; single colon: valid; double colon: invalid
            '11': /^ | $|[\^,\(\)\[\]{}'"\.\\ ]|::/, // space: invalid; single colon: valid; double colon: invalid
        }
        const ruleKey = `${noSpace? '1': '0'}${noDoubleColon? '1': '0'}`;
        return rules[ruleKey].test(str);
    }

    /**
     * xcHelper.isStartWithLetter
     * @param str
     */
    export function isStartWithLetter(str: string): boolean {
        if (str == null) {
            return false;
        }
        return /^[a-zA-Z]/.test(str);
    }

    /**
     * xcHelper.isColNameStartValid
     * @param colName
     */
    export function isColNameStartValid(colName: string): boolean {
        if (!colName || colName.trim().length === 0) {
            return false;
        }
        return (xcHelper.isStartWithLetter(colName) ||
            colName.charAt(0) === "_");
    }

    /**
     * xcHelper.filterUDFs
     * @param fns
     */
    // only show default and user workbook's udfs
    export function filterUDFs(fns: UDFInfo[]): UDFInfo[] {
        const filteredArray: UDFInfo[] = [];
        const wkbkPrefix: string = UDFFileManager.Instance.getCurrWorkbookPath();
        if (wkbkPrefix == null) {
            return filteredArray;
        }
        const globalPathPrefix: string = UDFFileManager.Instance.getDefaultUDFPath() + ":";
        for (let i = 0; i < fns.length; i++) {
            const op: UDFInfo = fns[i];
            if (op.fnName.indexOf("/") === -1) {
                filteredArray.push(op);
            } else if (!op.fnName.startsWith(globalPathPrefix) &&
                !op.fnName.startsWith(wkbkPrefix)
            ) {
                continue;
            } else {
                filteredArray.push(op);
            }
        }

        return filteredArray;
    }

    /**
     * xcHelper.validateColName returns the error message. If null, column
     * is good
     * @param colName
     * @param noSpace
     * @param noDoubleColon true: "::" is invalid, ":" is valid; false: "::" is valid, ":" is invalid
     */
    export function validateColName(
        colName: string,
        noSpace: boolean = false,
        noDoubleColon: boolean = false
    ): string | null {
        if (!colName || colName.trim().length === 0) {
            return ErrTStr.NoEmpty;
        }

        let error: string | null = null;
        if (!xcHelper.isColNameStartValid(colName)) {
            error = ColTStr.RenameStartInvalid;
        } else if (colName.length >
                    XcalarApisConstantsT.XcalarApiMaxFieldNameLen
        ) {
            error = ColTStr.LongName;
        } else if (xcHelper.hasInvalidCharInCol(colName, noSpace, noDoubleColon)) {
            if (noSpace) {
                error = ColTStr.ColNameInvalidCharSpace;
            } else {
                error = ColTStr.ColNameInvalidChar;
            }
        } else {
            const preservedNames: string[] = ['none', 'false', 'true'];
            if (colName === 'DATA' ||
                preservedNames.indexOf(colName.toLowerCase()) > -1) {
                error = ErrTStr.PreservedName;
            }
        }
        return error;
    }

    /**
     * xcHelper.validatePrefixName
     * @param prefix
     */
    export function validatePrefixName(prefix: string | null): string | null {
        let error: string | null = null;
        if (prefix != null && !xcHelper.isStartWithLetter(prefix)) {
            error = ErrTStr.PrefixStartsWithLetter;
        } else if (prefix != null && prefix.length > gPrefixLimit) {
            error = ErrTStr.PrefixTooLong;
        } else if (!xcHelper.checkNamePattern(PatternCategory.Prefix,
            PatternAction.Check, prefix)
        ) {
            error = ColTStr.RenameSpecialChar;
        }
        return error;
    };

    /**
     * xcHelper.escapeNonPrintableChar
     * @param str - str to escapse
     * @param replace - char that replcae the non printable chars
     */
    export function escapeNonPrintableChar(str: string, replace: string): string {
        try {
            // this special chars is coming from CodeMirror
            const specialChars: RegExp = /[\t\u0000-\u0019\u00ad\u200b-\u200f\u2028\u2029\ufeff]/g
            const replaceChar: string = replace;
            return str.replace(specialChars, replaceChar);
        } catch (e) {
            console.error(e);
            return str;
        }
    }

    /**
     * xcHelper.escapeHTMLSpecialChar
     * @param str - str to replace
     * @param ignoreTab - ignore tab or not
     */
    export function escapeHTMLSpecialChar(
        str: string,
        ignoreTab?: boolean
    ): string {
        try {
            // esacpe & to &amp;, so text &quot; will not become " in html
            // escape < & > so external html doesn't get injected
            str = str.replace(/\&/g, '&amp;')
                    .replace(/\</g, '&lt;')
                    .replace(/\>/g, '&gt;');
            if (!ignoreTab) {
                str = str.replace(/\\t/g, '&emsp;');
            }
        } catch (e) {
            var stack = new Error().stack;
            console.error("PRINTING CALL STACK");
            console.error(stack);
            console.error(e);
        }

        return str;
    }

    /**
     * xcHelper.escapeRegExp
     * @param str
     */
    export function escapeRegExp(str: string): string {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    }

    /**
     * xcHelper.escapeColName
     * @param str
     */
    export function escapeColName(str: string): string {
        // adds a backslash before each of these: [ ] . \
        return str.replace(/[\[\]\.\\]/g, '\\$&');
    }

    /**
     * xcHelper.unescapeColName
     * @param str
     */
    export function unescapeColName(str: string): string {
        str = str.replace(/\\\\/g, '\\');
        str = str.replace(/\\\./g, '\.');
        str = str.replace(/\\\[/g, '\[');
        str = str.replace(/\\\]/g, '\]');
        return str;
    }

    /**
     * xcHelper.stripColName
     * @param colName
     * @param stripSpace
     * @param stripDoubleColon set true to strip "::"
     */
    export function stripColName(
        colName: string,
        stripSpace: boolean = false,
        stripDoubleColon: boolean = false
    ): string {
        colName = xcHelper.escapeNonPrintableChar(colName, "");
        const rules = {
            '00': /[\^,{}'"()\[\]\.\\]/g, // NOT stripSpace, NOT stripDoubleColon
            '10': /[\^,{}'"()\[\]\.\\ ]/g, // stripSpace, NOT stripDoubleColon
            '01': /[\^,{}'"()\[\]\.\\]|::/g, // NOT stripSpace, stripDoubleColon
            '11': /[\^,{}'"()\[\]\.\\ ]|::/g, // stripSpace, stripDoubleColon
        }
        const ruleKey = `${stripSpace? '1': '0'}${stripDoubleColon? '1': '0'}`;
        const pattern = rules[ruleKey];
        // if column name starts with a valid character but not one that it
        // should start with, then prepend underscore
        if (!pattern.test(colName[0]) &&
            !xcHelper.isColNameStartValid(colName)) {
            colName = "_" + colName;
        }
        return colName.split(pattern).filter((str) => str !== "").join("_");
    }

    /**
     * xcHelper.scrollToBottom
     * @param $target
     */
    export function scrollToBottom($target: JQuery): void {
        const scrollDiff: number = $target[0].scrollHeight - $target.height();
        if (scrollDiff > 0) {
            // at least 11 pixels for scrollbar
            const horzScrollBar: number = 20;
            $target.scrollTop(scrollDiff + horzScrollBar);
        }
    }

    /**
     * xcHelper.hasSelection
     */
    export function hasSelection(): boolean {
        let selection: Selection;
        if (window.getSelection) {
            selection = window.getSelection();
        } else if (document['selection']) {
            selection = document['selection'].createRange();
        }
        return (selection.toString().length > 0);
    }

    /**
     * xcHelper.removeSelectionRange
     */
    export function removeSelectionRange(): void {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    }

    /**
     * xcHelper.disableTextSelection
     * lobally prevents all text from being selected and disables all inputs
     */
    export function disableTextSelection() {
        xcHelper.removeSelectionRange();
        const style: string =
            '<style id="disableSelection" type="text/css">*' +
                '{ -ms-user-select:none;-moz-user-select:-moz-none;' +
                '-khtml-user-select:none;' +
                '-webkit-user-select:none;user-select:none;}' +
                'div[contenteditable]{pointer-events:none;}' +
            '</style>';
        $(document.head).append(style);
        $('.tooltip').remove();
        $('input:enabled').prop('disabled', true).addClass('tempDisabledInput');
    }


    /**
     * xcHelper.reenableTextSelection
     */
    export function reenableTextSelection(): void {
        $('#disableSelection').remove();
        $('.tempDisabledInput').removeClass('tempDisabledInput')
                               .prop('disabled', false);
    }

    /**
     * xcHelper.castStrHelper
     * @param colName
     * @param colType
     * @param handleNull
     */
    export function castStrHelper(
        colName: string,
        colType: string | null | void,
        handleNull?: boolean
    ): string {
        // here for float/int, null will become 0,
        // if we want null become FNF, need to use int(string(XXX))
        let mapStr: string = "";
        switch (colType) {
            case ("boolean"):
                mapStr += "bool(";
                break;
            case ("float"):
                if (handleNull) {
                    colName = "string(" + colName + ")";
                }
                mapStr += "float(";
                break;
            case ("integer"):
                if (handleNull) {
                    colName = "string(" + colName + ")";
                }
                mapStr += "int(";
                break;
            case ("string"):
                mapStr += "string(";
                break;
            case (null):
            case (undefined):
                return colName;
            default:
                console.warn("XXX no such operator! Will guess");
                mapStr += colType + "(";
                break;
        }

        if (colType === "integer") {
            mapStr += colName + ", 10)";
        } else {
            mapStr += colName + ")";
        }

        return mapStr;
    }

    export function getCastTypeToColType(str: string): ColumnType {
        switch (str) {
            case ("bool"):
                return ColumnType.boolean;
            case ("float"):
                return ColumnType.float;
            case ("int"):
                return ColumnType.integer;
            case ("string"):
                return ColumnType.string;
            default:
                return null;
        }
    }

    /**
     * xcHelper.isCharEscaped
     * if string is somet\"thing then str is somet\"thing
     * and startIndex is the index of the quote you're testing -> 7
     * @param str
     * @param startIndex
     */
    export function isCharEscaped(str: string, startIndex: number): boolean {
        let backSlashCount: number = 0;
        for (let i = startIndex - 1; i >= 0; i--) {
            if (str[i] === "\\") {
                backSlashCount++;
            } else {
                break;
            }
        }
        return (backSlashCount % 2 === 1);
    }

    /**
     * xcHelper.deepCompare
     * returns true if comparison is equal
     * returns false if diff found
     */
    export function deepCompare(): boolean {
        let leftChain: any[];
        let rightChain: any[];

        function compare2Objects(x, y) {
            // check if both are NaN
            if (isNaN(x) && isNaN(y) && typeof x === 'number' &&
                typeof y === 'number') {
                return true;
            }

            if (x === y) {
                return true;
            }

            if (!(x instanceof Object && y instanceof Object)) {
                return false;
            }

            // Check for infinitive linking loops
            if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
                return false;
            }

            // Quick checking of one object being a subset of another.
            for (let p in y) {
                if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                    return false;
                } else if (typeof y[p] !== typeof x[p]) {
                    return false;
                }
            }

            for (let p in x) {
                if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                    return false;
                } else if (typeof y[p] !== typeof x[p]) {
                    return false;
                }

                switch (typeof (x[p])) {
                    case ('object'):
                    case ('function'):
                        leftChain.push(x);
                        rightChain.push(y);

                        if (!compare2Objects(x[p], y[p])) {
                            return false;
                        }

                        leftChain.pop();
                        rightChain.pop();
                        break;
                    default:
                        if (x[p] !== y[p]) {
                            return false;
                        }
                        break;
                }
            }

            return true;
        }

        if (arguments.length < 1) {
            return true;
        }
        let len: number = arguments.length;
        for (let i = 1; i < len; i++) {
            leftChain = [];
            rightChain = [];

            if (!compare2Objects(arguments[0], arguments[i])) {
                return false;
            }
        }

        return true;
    }

    /**
     * xcHelper.delimiterTranslate
     * @param $input
     * @param val
     */
    export function delimiterTranslate(
        $input: JQuery,
        val: string
    ): string | object {
        if ($input.hasClass("nullVal")) {
            return "";
        }
        let delim: string = $input.length ? $input.val() : val;
        // this change " to \", otherwise cannot use json parse
        for (let i = 0; i < delim.length; i++) {
            if (delim[i] === '\"' && !xcHelper.isCharEscaped(delim, i)) {
                delim = delim.slice(0, i) + '\\' + delim.slice(i);
                i++;
            }
        }

        // hack to turn user's escaped string into its actual value
        let objStr: string = '{"val":"' + delim + '"}';
        try {
            delim = JSON.parse(objStr).val;
            return delim;
        } catch (err) {
            console.error(err);
            return {fail: true, error: err};
        }
    }

    /**
     * xcHelper.checkMatchingBrackets
     * @param val
     */
    export function checkMatchingBrackets(val: string): BracketMatchRet {
        let numOpens: number = 0;
        let inQuotes: boolean = false;
        let singleQuote: boolean = false; // ' is true, " is false
        let ret: BracketMatchRet = {
            char: '',
            index: -1 ,// returns -1 if no mismatch found
            hasParen: false
        };
        for (let i = 0; i < val.length; i++) {
            if (inQuotes) {
                if ((singleQuote && val[i] === '\'') ||
                    (!singleQuote && val[i] === '"')) {
                    inQuotes = false;
                } else if (val[i] === '\\') {
                    i++; // ignore next character
                }
                continue;
            }
            if (val[i] === '"') {
                inQuotes = true;
                singleQuote = false;
            } else if (val[i] === '\'') {
                inQuotes = true;
                singleQuote = true;
            } else if (val[i] === '\\') {
                i++; // ignore next character
            } else if (val[i] === '(') {
                numOpens++;
                ret.hasParen = true;
            } else if (val[i] === ')') {
                numOpens--;
                if (numOpens < 0) {
                    ret.char = ")";
                    ret.index = i;
                    return ret;
                }
            }
        }
        if (numOpens === 0) {
            return ret;
        } else {
            ret.char = '(';
            ret.index = val.indexOf('(');
            return ret;
        }
    }

        /**
     * XXX not fully tested
     * xcHelper.removeNonQuotedSpaces
     * turns 'map(concat  ("a   ", "b"))' into 'map(concat("a   ","b"))'
     * @param str
     */
    export function removeNonQuotedSpaces(str: string): string {
        let resStr: string = '';
        let inQuotes: boolean = false;
        let singleQuote: boolean = false;
        let isEscaped: boolean = false;
        let spaces = "";
        const specialChars = ["(", ")", ","];
        for (let i = 0; i < str.length; i++) {
            if (isEscaped) {
                resStr += str[i];
                isEscaped = false;
                continue;
            }

            if (inQuotes) {
                if ((str[i] === '"' && !singleQuote) ||
                    (str[i] === '\'' && singleQuote)) {
                    inQuotes = false;
                }
            } else {
                if (str[i] === '"') {
                    inQuotes = true;
                    singleQuote = false;
                } else if (str[i] === '\'') {
                    inQuotes = true;
                    singleQuote = true;
                }
            }

            if (str[i] === '\\') {
                isEscaped = true;
                resStr += str[i];
            } else if (inQuotes) {
                resStr += str[i];
            } else {
                let lastChar = resStr[resStr.length - 1];
                if (str[i] !== ' ') {
                    if (!specialChars.includes(str[i])) {
                        resStr += spaces;
                    }
                    spaces = "";
                    resStr += str[i];
                } else {
                    if (resStr.length > 0 && !specialChars.includes(lastChar)) {
                        spaces += str[i];
                    } else {
                        spaces = "";
                    }
                }
            }
        }
        return resStr;
    }

    /**
     * xcHelper.fillInputFromCell
     * @param  {$element} $target $element you're picking/clicking
     * @param  {$element} $input  input to be filled in with picked text
     * @param  {string} prefix  prefix to prepend to picked text
     * @param  {object} options:
     *         type: string, if "table", will pick from table header
     *         append: boolean, if true, will append text rather than replace
     */
    export function fillInputFromCell(
        $target: JQuery,
        $input: JQuery,
        prefix: string = "",
        options: FillInputFormCellOptions = <FillInputFormCellOptions>{}
    ) {
        if ($target == null || $input == null || !$input.is(":visible")) {
            // if user tries to select column without focusing on input
            return false;
        }
        // $input needs class "argument"
        if ((!$input.hasClass('argument') && !$input.hasClass('arg')) ||
            $input.closest('.colNameSection').length !== 0 ||
            $input.attr('type') !== 'text'
        ) {
            return false;
        }

        let value: string;
        if (options.type === 'table') {
            $target = $target.find('.text');
            value = prefix + $target.data('title');
        } else if (options.type === "dag") {
            value = $target.data('tablename');
        } else {
            let $header: JQuery = $target.closest('.header');
            if ($header.length) {
                $target = $target.closest('.header').find('.editableHead');
            } else {
                var colNum = xcHelper.parseColNum($target.closest('td'));
                $target = $target.closest('table')
                                .find('.editableHead.col' + colNum);
                $header = $target.closest('.header');
            }
            const $prefixDiv: JQuery = $header.find('.topHeader .prefix');
            const colPrefix: string = $prefixDiv.hasClass('immediate') ?
                                        "" : $prefixDiv.text();
            value = xcHelper.getPrefixColName(colPrefix, $target.val());
            value = prefix + value;
        }
        xcHelper.insertText($input, value, options.append);
        gMouseEvents.setMouseDownTarget($input);
        return true;
    }

    /**
     * xcHelper.hasValidColPrefix
     * not only looks for gColPrefix but checks to make sure it's not
     * preceded by anything other than a comma
     * @param str
     */
    export function hasValidColPrefix(str: string): boolean {
        if (typeof str !== 'string') {
            return false;
        }

        str = str.trim();
        let colNames: string[] = [];
        let cursor: number = 0;
        let prevCharIsComma: boolean = false;
        let i: number = 0;
        for (i = 0; i < str.length; i++) {
            if (!xcHelper.isCharEscaped(str, i)) {
                if (!prevCharIsComma && str[i] === ',') {
                    colNames.push(str.slice(cursor, i).trim());
                    cursor = i + 1;
                    prevCharIsComma = true;
                } else if (!prevCharIsComma && str[i] === ' ') {
                    // "colname colname" instead of "colname, colname"
                    // we will assume "colname colname" is one column with spaces
                } else if (str[i] !== " ") {
                    prevCharIsComma = false;
                }
            }
        }
        colNames.push(str.slice(cursor, i).trim());

        let hasPrefix: boolean = false;
        for (let i = 0; i < colNames.length; i++) {
            let colName: string = colNames[i];
            if (colName.length < 2) {
                // colName must be at least 2 characters long
                // including the colPrefix
                return false;
            }
            if (colName[0] === gColPrefix) {
                hasPrefix = true;
            } else {
                return false;
            }
        }
        return hasPrefix;
    }

    /**
     * xcHelper.camelCaseToRegular
     * turns camelCase to Camel Case
     * @param str
     */
    export function camelCaseToRegular(str: string): string {
        const res: string = str.replace(/([A-Z])/g, ' $1')
                                .replace(/^./, (str) => str.toUpperCase())
                                .trim();
        return res;
    }

    /**
     * Converts a map into a json struct. If you do a JSON.strintify([...map])
     * Instead of getting a struct, you are going to end up with an array. This
     * function produces a struct.
     * @param origMap Original Map struct
     */
    export function mapToJsonStruct(origMap: Map<string | number, any>) {
        const keyIter: IterableIterator<string | number> = origMap.keys();
        let key: IteratorResult<any> = keyIter.next();
        const out: object = {};
        while (!key.done) {
            const k: string | number = key.value;
            const value: any = origMap.get(k);
            out[k] = value;
            key = keyIter.next();
        }
        return out;
    }

    /**
     * xcHelper.getFormat
     * a.json returns JSON
     * @param name
     */
    export function getFormat(name: string): string | null {
        name = '' + name; // In case name is an integer
        const index: number = name.lastIndexOf('.');
        if (index < 0) {
            return null;
        }

        const ext: string = name.substring(index + 1, name.length)
                                .toUpperCase();
        const formatMap: object = {
            JSON: "JSON",
            CSV: "CSV",
            TSV: "CSV",
            XLSX: "Excel",
            XLS: "Excel",
            TXT: "TEXT",
            XML: "XML",
            HTML: "HTML",
            TAR: "TAR",
            ZIP: "ZIP",
            PDF: "PDF",
            JPG: "JPG",
            PNG: "PNG",
            GIF: "GIF",
            BMP: "BMP",
            PARQUET: "PARQUETFILE",
        };

        if (formatMap.hasOwnProperty(ext)) {
            return formatMap[ext];
        } else {
            return null;
        }
    }

    /**
     * xcHelper.convertToHtmlEntity
     * @param s
     */
    export function convertToHtmlEntity(s: string): string {
        return s.replace(/[\u00A0-\u9999<>\&]/g, (i) => '&#' + i.charCodeAt(0) + ';');
    }

    /**
     * xcHelper.sortVals
     * @param {string} a - first value
     * @param {string} b - sescond value
     * @param {integer} order - -1 for ascending, 1 for descending
     */
    export function sortVals(
        a: string,
        b: string,
        order: number = ColumnSortOrder.ascending
    ): number {
        a = a.toLowerCase();
        b = b.toLowerCase();

        // if a = "as1df12", return ["as1df12", "as1df", "12"]
        // if a = "adfads", return null
        const matchA: RegExpMatchArray = a.match(/(^.*?)([0-9]+$)/);
        const matchB: RegExpMatchArray = b.match(/(^.*?)([0-9]+$)/);
        if (matchA != null && matchB != null && matchA[1] === matchB[1]) {
            // if the rest part that remove suffix number is same,
            // compare the suffix number
            a = <any>parseInt(matchA[2]);
            b = <any>parseInt(matchB[2]);
        }

        if (a < b) {
            return order;
        } else if (a > b) {
            return (-order);
        } else {
            return 0;
        }
    }

    /**
     * xcHelper.sortHTML
     * @param a
     * @param b
     */
    export function sortHTML(a: string, b: string): number {
        return ($(b).text()) < ($(a).text()) ? 1 : -1;
    }

    /* ====================== parseQuery ====================== */
    /**
     *
     * @param query
     * @param keyWord
     */
    function getKeyWordIndexFromQuery(query: string, keyWord: string): number {
        let inQuotes: boolean = false;
        let singleQuote: boolean = false;
        let isEscaped: boolean = false;
        const keyLen: number = ('' + keyWord).length;

        for (let i = 0; i < query.length; i++) {
            if (isEscaped) {
                isEscaped = false;
                continue;
            }

            if (inQuotes) {
                if ((query[i] === '"' && !singleQuote) ||
                    (query[i] === '\'' && singleQuote)
                ) {
                    inQuotes = false;
                }
            } else {
                if (query[i] === '"') {
                    inQuotes = true;
                    singleQuote = false;
                } else if (query[i] === '\'') {
                    inQuotes = true;
                    singleQuote = true;
                }
            }

            if (query[i] === '\\') {
                isEscaped = true;
            } else if (!inQuotes) {
                if (i >= keyLen && query.slice(i - keyLen, i) === keyWord) {
                    return (i - keyLen);
                }
            }
        }
        return -1;
    }

    /**
     * if passing in "tableNa\"me", will return tableNa\me and not tableNa
     * @param str
     */
    function parseSearchTerm(str: string): string {
        const quote: string = str[0];
        let wrappedInQuotes: boolean = true;
        if (quote !== '\'' && quote !== '"') {
            wrappedInQuotes = false;
        } else {
            str = str.slice(1);
        }

        let isEscaped: boolean = false;
        let result: string = '';
        for (let i = 0; i < str.length; i++) {
            if (isEscaped) {
                isEscaped = false;
                result += str[i];
                continue;
            }
            if (str[i] === '\\') {
                isEscaped = true;
                result += str[i];
            } else if (wrappedInQuotes) {
                if (str[i] === quote) {
                    break;
                } else {
                    result += str[i];
                }
            } else if (!wrappedInQuotes) {
                if (str[i] === ' ' || str[i] === ';') {
                    break;
                } else {
                    result += str[i];
                }
            }
        }
        return result;
    }

    /**
     *
     * @param query
     * @param keyWord
     */
    function getTableNameFromQuery(query: string, keyWord: string): string | null {
        let index: number = getKeyWordIndexFromQuery(query, keyWord);
        if (index === -1) {
            return null;
        }
        index += keyWord.length;
        const trimmedQuery: string = query.slice(index).trim();
        return parseSearchTerm(trimmedQuery);
    }

    /**
     *
     * @param query
     * @param type
     */
    function getSrcTableFromQuery(query: string, type: string): string[] | null {
        let keyWord: string = '--srctable';
        if (type === 'join') {
            keyWord = '--leftTable';
        }

        const tableNames: string[] = [];
        let tableName: string | null = getTableNameFromQuery(query, keyWord);
        if (tableName == null) {
            return null;
        }

        tableNames.push(tableName);
        if (type === 'join') {
            let keyWord: string = '--rightTable';
            let tableName: string = getTableNameFromQuery(query, keyWord);
            if (tableName) {
                tableNames.push(tableName);
            }
        }
        return tableNames;
    }

    /**
     *
     * @param query
     * @param type
     */
    function getDstTableFromQuery(query: string, type: string): string {
        let keyWord: string = '--dsttable';
        if (type === 'join') {
            keyWord = '--joinTable';
        } else if (type === 'load') {
            keyWord = '--name';
        } else if (type === 'export') {
            keyWord = '--exportName';
        }

        let tableName: string | null = getTableNameFromQuery(query, keyWord);
        if (tableName == null) {
            return null;
        }

        if (type === "load" && tableName.indexOf(gDSPrefix) === -1) {
            tableName = gDSPrefix + tableName;
        }
        return tableName;
    }

    /**
     *
     * @param query
     */
    function getExportFileNameFromQuery(query: string): string {
        const keyWord: string = "--fileName";

        var index = getKeyWordIndexFromQuery(query, keyWord);
        if (index === -1) {
            return null;
        }

        index += keyWord.length;
        query = query.slice(index).trim();
        return parseSearchTerm(query);
    }

    /**
     *
     * @param str
     */
    function parseSubQuery(str: string, isExport: boolean = false): QueryParser {
        str = str.trim();
        let operationName: string = str.split(' ')[0];
        let subQuery: QueryParser = {
            query: str,
            name: operationName,
            srcTables: getSrcTableFromQuery(str, operationName),
            dstTable: getDstTableFromQuery(str, operationName)
        };
        if (isExport) {
            subQuery.exportFileName = getExportFileNameFromQuery(str);
        }
        return subQuery;
    }

    /**
     * used to split query into array of subqueries by semicolons
     * XXX not checking for /n or /r delimiter, just semicolon
     * returns array of objects
     * objects contain query, name, exportFileName, srcTables and dstTable
     * @param query
     */
    function parseQueryHelper(query: string): QueryParser[] {
        let tempString: string = '';
        let inQuotes: boolean = false;
        let singleQuote: boolean = false;
        let isEscaped: boolean = false;
        let isExport: boolean = query.trim().indexOf('export') === 0;
        let queries: QueryParser[] = [];

        // export has semicolons between colnames and breaks most rules
        for (let i = 0; i < query.length; i++) {
            if (isEscaped) {
                tempString += query[i];
                isEscaped = false;
                continue;
            }

            if (inQuotes) {
                if ((query[i] === '"' && !singleQuote) ||
                    (query[i] === '\'' && singleQuote)
                ) {
                    inQuotes = false;
                }
            } else {
                if (query[i] === '"') {
                    inQuotes = true;
                    singleQuote = false;
                } else if (query[i] === '\'') {
                    inQuotes = true;
                    singleQuote = true;
                }
            }

            if (query[i] === '\\') {
                isEscaped = true;
                tempString += query[i];
            } else if (inQuotes) {
                tempString += query[i];
            } else {
                if (query[i] === ';' && !isExport) {
                    queries.push(parseSubQuery(tempString));
                    tempString = '';
                } else if (tempString === '' && query[i] === ' ') {
                    // a way of trimming the front of the string
                    continue;
                } else {
                    tempString += query[i];
                }
            }
        }

        if (tempString.trim().length) {
            queries.push(parseSubQuery(tempString, isExport));
        }

        return queries;
    }

    /**
     *
     * @param query
     * @param parsedQuery
     */
    function getSubQueryObj(query: string, parsedQuery: any): QueryParser {
        const operation: string = parsedQuery.operation;
        let srcTables: string[];
        if (operation === XcalarApisTStr[XcalarApisT.XcalarApiJoin]) {
            srcTables = parsedQuery.args.source;
        } else {
            srcTables = [parsedQuery.args.source];
        }

        let dstTable: string;
        if (operation === XcalarApisTStr[XcalarApisT.XcalarApiBulkLoad] &&
            parsedQuery.args.dest.indexOf(gDSPrefix) === -1) {
            dstTable = gDSPrefix + parsedQuery.args.dest;
        } else {
            dstTable = parsedQuery.args.dest;
        }
        let subQuery: QueryParser = {
            query: query,
            name: operation,
            srcTables: srcTables,
            dstTable: dstTable
        };
        if (operation === XcalarApisTStr[XcalarApisT.XcalarApiExport]) {
            subQuery.exportFileName = parsedQuery.args.fileName;
        }
        return subQuery;
    }

    /**
     * used to split query into array of subqueries by semicolons
     * returns array of objects, objects contain query, name, and dstTable
     * @param query
     */
    export function parseQuery(query: string): QueryParser[] {
        let isJson: boolean = false;
        let parsedQuery: any[];
        try {
            if (query.trim().startsWith('[')) {
                parsedQuery = $.parseJSON(query);
            } else {
                parsedQuery = $.parseJSON('[' + query + ']');
            }
            isJson = true;
        } catch (err) {
            // normal if using an old extension
        }
        if (!isJson) {
            return parseQueryHelper(query);
        } else {
            const queries: QueryParser[] = [];
            for (var i = 0; i < parsedQuery.length; i++) {
                queries.push(getSubQueryObj(JSON.stringify(parsedQuery[i]), parsedQuery[i]));
            }
            return queries;
        }
    }

    /* ====================== end of parseQuery ====================== */

    /**
     * take all of gTables columns and filter out arrays, data, newcols, objs etc
     * put these columns into one Array and the invalid columns in another array
     * @param tableCols
     * @param validTypes
     */
    function splitIntoValidAndInvalidProgCols(
        tableCols: ProgCol[],
        validTypes: string[]
    ): object {
        const numTableCols: number = tableCols.length;
        const colsArray: ProgCol[] = [];
        const invalidProgCols: ProgCol[] = [];

        for (let i = 0; i < numTableCols; i++) {
            const col: ProgCol = tableCols[i];
            if (!col.isDATACol() && !col.isEmptyCol()) {
                if (gExportNoCheck || !validTypes) {
                    colsArray.push(col);
                } else {
                    if (validTypes.indexOf(col.type) !== -1) {
                        colsArray.push(col);
                    } else {
                        invalidProgCols.push(col);
                    }
                }
            } else {
                invalidProgCols.push(col);
            }
        }

        return {
            validProgCols: colsArray,
            invalidProgCols: invalidProgCols
        };
    }


    /**
     * xcHelper.convertFrontColNamesToBack
     * @param frontColNames
     * @param tblId
     * @param validTypes
     * @returns {ProgCol[] | object} returns array if all columns valid or returns an error
     * object with first invalid column name and reason why it's invalid
     * object includes the following properties
     *  invalid: boolean,
     *  reason: string,
     *  name: string (frontColName),
     *  type: string
     */
    export function convertFrontColNamesToBack(
        frontColNames: string[],
        tblId: string,
        validTypes: string[]
    ): ProgCol[] | object {
        const table: TableMeta = gTables[tblId] || gDroppedTables[tblId];
        if (!table) {
            return {
                invalid: true,
                reason: 'tableNotFound',
                name: frontColNames[0],
                type: 'tableNotFound'
            };
        }

        const tableCols: ProgCol[] = table.tableCols;
        const splitCols: object = splitIntoValidAndInvalidProgCols(tableCols, validTypes);
        const colsArray: ProgCol[] = splitCols['validProgCols'];
        const invalidProgCols: ProgCol[] = splitCols['invalidProgCols'];

        const backCols: string[] = [];
        const foundColsArray: ProgCol[] = [];
        const numFrontColNames = frontColNames.length;
        let numColsFound: number = 0;
        let numTableCols: number = colsArray.length;
        // after we've set up colsArray, we check the user's columns against it
        for (let i = 0; i < numFrontColNames; i++) {
            const frontColName: string = frontColNames[i];
            let colFound: boolean = false;

            for (let j = 0; j < numTableCols; j++) {
                let tableCol: ProgCol = colsArray[j];
                // if we find a match, we push the backcolumn name into backCols
                // and remove the column from colsArray and put it into
                // foundColsArray. If we later have a duplicate backcolumn name
                // it will no longer be in colsArray and we will search for it
                // in foundColsArray
                if (frontColName === tableCol.getFrontColName(true)) {
                    if (tableCol.backName) {
                        backCols.push(tableCol.backName);
                    }
                    const foundCol: ProgCol = colsArray.splice(j, 1)[0];
                    foundColsArray.push(foundCol);
                    j--;
                    numTableCols--;
                    colFound = true;
                    numColsFound++;
                    break;
                }
            }

            // If column was not found,
            // column could be a duplicate so check against the columns we
            // already found and had removed
            if (!colFound) {
                for (let j = 0; j < numColsFound; j++) {
                    let tableCol: ProgCol = foundColsArray[j];
                    if (frontColName === tableCol.getFrontColName(true)) {
                        backCols.push(tableCol.backName);
                        colFound = true;
                        break;
                    }
                }

                // column name is not a duplicate and is not found in the
                // valid column array so we check if it's in one of the invalid
                // progCols
                if (!colFound) {
                    const numInvalidCols: number = invalidProgCols.length;
                    for (let j = 0; j < numInvalidCols; j++) {
                        let tableCol: ProgCol = invalidProgCols[j];
                        if (frontColName === tableCol.getFrontColName(true)) {
                            return {
                                invalid: true,
                                reason: 'type',
                                type: tableCol.type,
                                name: frontColName
                            };
                        }
                    }
                }
            }
            // if column name was not found in any of the progcols, then
            // it doesn't exist
            if (!colFound) {
                return {
                    invalid: true,
                    reason: 'notFound',
                    name: frontColName,
                    type: 'notFound'
                };
            }
        }

        return backCols;
    }

    /**
     * xcHelper.getUDFList
     * @param listXdfsObj
     * @param mainOnly
     * @returns {moduleLis: htmlStr, fnLis: htmlStr}
     */
    export function getUDFList(
        listXdfsObj: any,
        mainOnly: boolean
    ): object {
        let modules: string[] = [];
        let moduleDisplayedNames: string[] = [];
        let moduleObjs: UDFInfo[] = [];
        let privateObjs: UDFInfo[] = [];

        const privateModules: string[] = [];
        const privateModulesDisplayed: string[] = [];
        const udfs: UDFInfo[] = listXdfsObj.fnDescs;
        const sortUDFName = (a: UDFInfo, b: UDFInfo): number => {
            const aName: string = a.displayName;
            const bName: string = b.displayName;
            return (aName < bName ? -1 : (aName > bName ? 1 : 0));
        }

        udfs.forEach((udf) => {
            const fnName: string = udf.displayName;
            if (fnName.startsWith("_")) {
                privateObjs.push(udf);
            } else {
                moduleObjs.push(udf);
            }
        });
        moduleObjs.sort(sortUDFName);
        privateObjs.sort(sortUDFName);

        for (let i = 0; i < moduleObjs.length; i++) {
            modules.push(moduleObjs[i].fnName);
            moduleDisplayedNames.push(moduleObjs[i].displayName);
        }

        for (let i = 0; i < privateObjs.length; i++) {
            privateModules.push(privateObjs[i].fnName);
            privateModulesDisplayed.push(privateObjs[i].displayName);
        }

        modules = modules.concat(privateModules);
        moduleDisplayedNames = moduleDisplayedNames.concat(privateModulesDisplayed);

        let moduleLi: string = "";
        let fnLi: string = "";
        let mainFound: boolean = false;
        let prevModule: string = null;
        let prevDisplayModule: string = null;
        const moduleNames: UDFListModule[] = [];
        const moduleMap: object = {};
        const len: number = listXdfsObj.numXdfs;

        for (let i = 0; i < len; i++) {
            const udf: string[] = modules[i].split(":");
            const udfDisplayedName: string[] = moduleDisplayedNames[i].split(":");
            const moduleName: string = udf[0];
            const moduleDisplayedName: string = udfDisplayedName[0];
            const fnName: string = udf[1];
            if (!moduleMap.hasOwnProperty(moduleName)) {
                moduleMap[moduleName] = true;
                moduleLi += '<li data-module="' +
                                moduleName + '">' +
                                moduleDisplayedName +
                            "</li>";
                if (prevModule != null) {
                    moduleNames.push({name: prevModule,
                        displayName: prevDisplayModule, hasMain: mainFound});
                }

                prevModule = moduleName;
                prevDisplayModule = moduleDisplayedName;
                mainFound = false;
            }

            if (mainOnly && fnName === "main") {
                mainFound = true;
            }

            fnLi += '<li data-module="' + moduleName + '">' +
                        fnName +
                    '</li>';
        }

        if (mainOnly) {
            if (prevModule != null) {
                moduleNames.push({name: prevModule, displayName: prevDisplayModule,
                     hasMain: mainFound});
            }
            moduleLi = "";
            for (let i = 0; i < moduleNames.length; i++) {
                const name: string = moduleNames[i].name;
                const displayName: string = moduleNames[i].displayName;
                let liClass: string = "";
                if (moduleNames[i].hasMain) {
                    liClass += "hasMain";
                } else {
                    liClass += "noMain unavailable";
                }
                moduleLi += '<li class="' + liClass + '" data-module="' +
                            name + '">' + displayName + '</li>';
            }
        }

        return {
            moduleLis: moduleLi,
            fnLis: fnLi
        };
    }

    /**
     * xcHelper.repositionModalOnWinResize
     * @param modalSpecs {$modal: $modal, top: int, left: int}
     * @param windowSpecs {winWidth: int, winHeight: int}
     */
    export function repositionModalOnWinResize(
        modalSpecs: ModalSpec,
        windowSpecs: WindowSpec
    ): void {
        const $modal: JQuery = modalSpecs.$modal;
        const modalWidth: number = $modal.width();
        const modalHeight: number = $modal.height();
        const prevWinWidth: number = windowSpecs.winWidth;
        const prevWinHeight: number = windowSpecs.winHeight;
        // this will be used as the starting window width/height for the
        // next window resize rather than measuring at the beginning of the
        // next resize because the maximize/minimize button will not show
        // the starting window size during the resize event
        windowSpecs.winHeight = $(window).height();
        windowSpecs.winWidth = $(window).width();

        const curWinHeight: number = windowSpecs.winHeight;
        const curWinWidth: number = windowSpecs.winWidth;
        const prevWidthAround: number = prevWinWidth - modalWidth;
        const prevHeightAround: number = prevWinHeight - modalHeight;
        if (modalWidth > curWinWidth) {
            const diff: number = curWinWidth - modalWidth;
            $modal.css('left', diff);
        } else if (prevWidthAround < 10) {
            $modal.css('left', (curWinWidth - modalWidth) / 2);
        } else {
            const widthAroundChangeRatio = (curWinWidth - modalWidth) /
                                            prevWidthAround;
            $modal.css('left', modalSpecs.left * widthAroundChangeRatio);
        }

        if (modalHeight > curWinHeight) {
            $modal.css('top', 0);
        } else if (prevHeightAround < 10) {
            $modal.css('top', (curWinHeight - modalHeight) / 2);
        } else {
            const heightAroundChangeRatio: number = (curWinHeight - modalHeight) /
                                                    prevHeightAround;
            $modal.css('top', modalSpecs.top * heightAroundChangeRatio);
        }
    }

    /**
     * XXX no test yet
     * xcHelper.menuAnimAligner
     * @param close
     * @param checkMenuAnimFinish
     */
    export function menuAnimAligner(
        close: boolean,
        checkMenuAnimFinish: Function
    ): void {
        let menuOffset: number = 285;

        let options: object;
        if (close) {
            const openOffset: number = 350; // when the menu is open;
            options = {marginRight: openOffset};
            menuOffset *= -1;
        }
        TblFunc.hideOffScreenTables(options);
        $('#mainFrame').addClass('scrollLocked');
        $('#dagScrollBarWrap').addClass('xc-hidden');
        $('.dfScrollBar').addClass('xc-hidden');

        const menuAnimTime: number = 200; // length of time menu takes to animate
        TblFunc.moveTableTitles(null, {
            offset: menuOffset,
            menuAnimating: true,
            animSpeed: menuAnimTime
        });

        checkMenuAnimFinish()
        .then(function() {
            TblFunc.unhideOffScreenTables();
            TblManager.alignTableEls();
            $('#mainFrame').removeClass('scrollLocked');
            $('#dagScrollBarWrap').removeClass('xc-hidden');
            DagPanel.adjustScrollBarPositionAndSize();
            $('.dfScrollBar').addClass('xc-hidden');
            DFCard.adjustScrollBarPositionAndSize();
            IMDPanel.redraw();
            DagCategoryBar.Instance.showOrHideArrows();
        });
    }

    /**
     * xcHelper.numToStr
     * adds commas to large numbers (52000 becomes "52,000")
     * @param value
     * @param maxDecimals
     */
    export function numToStr(
        value: number | null | undefined,
        maxDecimals: number = 3
    ): string | null | undefined {
        if (value === null) {
            return null;
        }
        if (value === undefined) {
            return undefined;
        }

        let temNum: number = value;
        let res: string = value + "";

        if (value != null) {
            temNum = Number(value);
            if (isNaN(temNum)) {
                return res;
            }

            const n: number = Math.pow(10, maxDecimals);
            if (temNum !== 0 && Math.abs(temNum * n) < 1) {
                res = temNum.toExponential();
            } else {
                res = temNum.toLocaleString("en", {
                    "maximumFractionDigits": maxDecimals
                });
            }
        }
        return res;
    }

    /**
     * xcHelper.getColNameMap
     * @param tableId
     */
    export function getColNameMap(tableId: string): object {
        const colNameMap: object = {};
        const table: TableMeta = gTables[tableId] || gDroppedTables[tableId];
        const cols: ProgCol[] = table.getAllCols(true);

        for (let i = 0; i < cols.length; i++) {
            const name: string = cols[i].backName.trim();
            colNameMap[name.toLowerCase()] = name;
        }
        return colNameMap;
    }

    /**
     * xcHelper.getColNameList
     * @param tableId
     */
    export function getColNameList(tableId: string): string[] {
        const colNameList: string[] = [];
        const cols: ProgCol[] = gTables[tableId].getAllCols(true);

        for (let i = 0; i < cols.length; i++) {
            const name: string = cols[i].backName.trim();
            colNameList.push(name);
        }
        return colNameList;
    }

    /**
     * xcHelper.disableMenuItem
     * @param $menuLi
     * @param tooltipOptions
     */
    export function disableMenuItem(
        $menuLi: JQuery,
        tooltipOptions: xcTooltip.TooltipOptions
    ): void {
        $menuLi.addClass('unavailable');
        xcTooltip.add($menuLi, tooltipOptions);
    }

    /**
     * xcHelper.enableMenuItem
     * @param $menuLi
     */
    export function enableMenuItem($menuLi: JQuery): void {
        $menuLi.removeClass('unavailable');
        xcTooltip.remove($menuLi);
    }

    /**
     * xcHelper.getPromiseWhenError
     * @param args
     */
    export function getPromiseWhenError(args: any[]): string | null {
        for (let i = 0; i < args.length; i++) {
            if (args[i] && (args[i].error ||
                args[i] === StatusTStr[StatusT.StatusCanceled])) {
                return args[i];
            }
        }
        // when cannot find any error
        console.error("cannot find error in", args);
        return null;
    }

    /* ================= prettify json ============================ */
    function getIndent(num: number): string {
        const singleIndent: string = "&nbsp;&nbsp;";
        let totalIndent: string = "";
        for (let i = 0; i < num; i++) {
            totalIndent += singleIndent;
        }
        return totalIndent;
    }

    function getCheckbox(indent: number, options: PrettifyOptions): string {
        if (!options.checkboxes) {
            return "";
        }
        const originalLeft: number = -19;
        const left: number = originalLeft + (16.8 * indent);
        const html: string =
        '<div class="checkbox jsonCheckbox" style="left: ' + left + 'px;">' +
            '<i class="icon xi-ckbox-empty fa-11"></i>' +
            '<i class="icon xi-ckbox-selected fa-11"></i>' +
        '</div>';
        return html;
    }

    function prettify(
        obj: object,
        indent: number = 0,
        mainKey: boolean,
        options: PrettifyOptions = <PrettifyOptions>{},
        isArrayEl: boolean = false
    ): string {
        if (typeof obj !== "object") {
            return JSON.stringify(obj);
        }

        let result: string = "";
        options.inArray = options.inArray || 0;
        let quote = options.noQuotes ? '': '"';

        for (let key in obj) {
            if (!obj.hasOwnProperty(key)) {
                continue;
            }
            let value: any = obj[key];
            key = xcHelper.escapeHTMLSpecialChar(key);
            const dataKey: string = xcHelper.escapeDblQuoteForHTML(key);
            const arrayElClass: string = isArrayEl ? " arrayEl" : "";

            switch (typeof value) {
                case ('string'):
                    value = xcHelper.escapeHTMLSpecialChar(value, true);
                    value = quote + '<span class="jString text ' + arrayElClass +
                            '">' + value + '</span>' + quote;
                    break;
                case ('number'):
                    value = '<span class="jNum text ' + arrayElClass +
                            '">' + value + '</span>';
                    break;
                case ('boolean'):
                    value = '<span class="jBool text ' + arrayElClass +
                            '">' + value + '</span>';
                    break;
                case ('object'):
                    // divs are used in css selectors so careful with changing
                    if (value == null) {
                        value = '<span class="jNull text ' + arrayElClass +
                                '">' + value + '</span>';
                    } else if (value.constructor === Array) {
                        ++options.inArray;
                        const emptyArray = value.length === 0 ?
                                            " emptyArray" : "";
                        value =
                        '[<div class="jArray ' + emptyArray + '" ' + '>' +
                            prettify(value, indent + 1, null, options, true) +
                        '</div>' +
                        getIndent(indent) + ']';
                    } else {
                        const object: string = prettify(value, indent + 1, null, {
                            checkboxes: options.checkboxes
                        });
                        const emptyObj: string = (object === "") ?
                                                " emptyObj" : "";
                        value = '{<div class="jObj' + emptyObj + '">' +
                                    object +
                                '</div>' +
                                getIndent(indent) + '}';
                    }
                    break;
                default:
                    value = '<span class="jUndf text">' + value + '</span>';
                    break;
            }

            if (options.inArray) {
                value += ",";
                result +=
                        '<div class="jsonBlock jInfo arrayVal' +
                        '" data-key="' + dataKey + '">' +
                            getCheckbox(indent, options) +
                            getIndent(indent) +
                            value +
                        '</div>';
            } else {
                const classNames = mainKey ? " mainKey" : "";
                value = value.replace(/,$/, "");
                result +=
                    '<div class="jsonBlock jInfo objVal' + classNames +
                    '" data-key="' + dataKey + '">' +
                        getCheckbox(indent, options) +
                        getIndent(indent) +
                        '"<span class="jKey text">' + dataKey + '</span>": ' +
                        value + ',' +
                    '</div>';
            }
        }

        --options.inArray;

        if (options.comparison) {
            // removes last comma unless inside div
            return result.replace(/\, $/, "").replace(/\,$/, "");
        } else {
            // .replace used to remove comma if last value in object
            return result.replace(/\,<\/div>$/, "</div>")
                        .replace(/\, $/, "")
                        .replace(/\,$/, "");

        }
    }

    /**
     * xcHelper.prettifyJson
     * @param obj
     * @param indent
     * @param mainKey
     * @param options
     * @param isArrayEl
     */
    export function prettifyJson(
        obj: object,
        indent: number,
        mainKey: boolean,
        options: PrettifyOptions,
        isArrayEl: boolean
    ): string {
        return prettify(obj, indent, mainKey, options, isArrayEl);
    }

    /* ================= end of prettify json ============================ */

    /**
     * xcHelper.addAggInputEvents
     * @param $aggInput
     */
    export function addAggInputEvents($aggInput: JQuery) {
        // focus, blur, keydown, input listeners ensures the aggPrefix
        // is always the first chracter in the colname input
        // and is only visible when focused or changed
        $aggInput.on('focus.aggPrefix', function() {
            // XXX FIX me, JQuery has no caret so has to use any
            const $input: any = $(this);
            if ($input.val().trim() === "") {
                $input.val(gAggVarPrefix);
                if ($input.caret() === 0 &&
                    ($input[0]).selectionEnd === 0) {
                    $input.caret(1);
                }
            }
        });

        $aggInput.on('blur.aggPrefix', function() {
            const $input: JQuery = $(this);
            if ($input.val().trim() === gAggVarPrefix) {
                $input.val("");
            }
        });

        $aggInput.on('keydown.aggPrefix', function(event) {
            // XXX FIX me, JQuery has no caret so has to use any
            const $input: any = $(this);
            if ($input.caret() === 0 &&
                ($input[0]).selectionEnd === 0) {
                event.preventDefault();
                $input.caret(1);
                return false;
            }
        });

        $aggInput.on('input.aggPrefix', function() {
            // XXX FIX me, JQuery has no caret so has to use any
            const $input: any = $(this);
            const val: string = $input.val();
            const trimmedVal: string = $input.val().trim();
            if (trimmedVal[0] !== gAggVarPrefix) {
                var caretPos = $input.caret();
                $input.val(gAggVarPrefix + val);
                if (caretPos === 0) {
                    $input.caret(1);
                }
            }
        });
    }

    /**
     * xcHelper.listHighlight
     * @param $input
     * @param event
     * @param isArgInput
     */
    export function listHighlight(
        $input: JQuery,
        event: JQueryEventObject,
        isArgInput: boolean
    ): boolean {
        let direction: number;
        const keyCodeNum: number = event.which;
        if (keyCodeNum === keyCode.Up) {
            direction = -1;
        } else if (keyCodeNum === keyCode.Down) {
            direction = 1;
        } else {
            // key code not supported
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const $menu: JQuery = $input.siblings('.list');
        const $lis: JQuery = $input.siblings('.list').find('li:visible');
        const numLis: number = $lis.length;

        if (numLis === 0) {
            return;
        }

        let $highlightedLi: JQuery = $lis.filter(function() {
            return ($(this).hasClass('highlighted'));
        });

        if ($highlightedLi.length !== 0) {
            // When a li is highlighted
            const highlightIndex: number = $lis.index($highlightedLi);
            $highlightedLi.removeClass('highlighted');

            const newIndex: number = (highlightIndex + direction + numLis) % numLis;
            $highlightedLi = $lis.eq(newIndex);
        } else {
            let index: number = (direction === -1) ? (numLis - 1) : 0;
            $highlightedLi = $lis.eq(index);
        }

        let val: string = $highlightedLi.text();
        if (isArgInput && val[0] !== gAggVarPrefix) {
            val = gColPrefix + val;
        }
        $highlightedLi.addClass('highlighted');
        $input.val(val);

        const menuHeight: number = $menu.height();
        const liTop: number = $highlightedLi.position().top;
        const liHeight: number = 30;

        if (liTop > menuHeight - liHeight) {
            let currentScrollTop: number = $menu.find('ul').scrollTop();
            let newScrollTop: number = liTop - menuHeight + liHeight +
                                        currentScrollTop;
            $menu.find('ul').scrollTop(newScrollTop);
            if ($menu.hasClass('hovering')) {
                $menu.addClass('disableMouseEnter');
            }
        } else if (liTop < 0) {
            let currentScrollTop: number = $menu.find('ul').scrollTop();
            $menu.find('ul').scrollTop(currentScrollTop + liTop);
            if ($menu.hasClass('hovering')) {
                $menu.addClass('disableMouseEnter');
            }
        }
    }

    /* =================== getKeyInfos ========================= */
    function changeColMetaToMap(valueAttrs: any[]): object {
        const res: object = {};
        try {
            valueAttrs.forEach((valueAttr) => {
                res[valueAttr.name] = valueAttr.type;
            });
        } catch (e) {
            console.error(e);
        }
        return res;
    }

    function getColMetaHelper(tableName: string): XDPromise<object> {
        const deferred: XDDeferred<object> = PromiseHelper.deferred();
        const tableId: TableId = xcHelper.getTableId(tableName);
        const table: TableMeta = gTables[tableId];

        if (table && table.backTableMeta) {
            let colMeta: object = changeColMetaToMap(table.backTableMeta.valueAttrs);
            deferred.resolve(colMeta, true);
        } else if (DagEdit.isEditMode()) {
            deferred.resolve({}, false);
        } else {
            XcalarGetTableMeta(tableName)
            .then(function(tableMeta) {
                let colMeta: object = changeColMetaToMap(tableMeta.valueAttrs);
                deferred.resolve(colMeta, true);
            })
            .fail(function() {
                deferred.resolve({}, false); // still resolve
            });
        }

        return deferred.promise();
    }

    function getNewKeyFieldName(parsedName: PrefixColInfo, takenNames: object): string {
        let name: string = xcHelper.stripColName(parsedName.name, false);
        if (!takenNames.hasOwnProperty(name)) {
            return name;
        }

        name = xcHelper.convertPrefixName(parsedName.prefix, name);
        let newName: string = name;
        if (!takenNames.hasOwnProperty(newName)) {
            return newName;
        }

        return xcHelper.randName(name);
    }

    /**
     * xcHelper.getKeyInfos
     * resolves an array of keyInfos
     * @param keys
     * @param tableName
     */
    export function getKeyInfos(
        keys: {
            name: string,
            type: ColumnType,
            keyFieldName: string,
            ordering: XcalarOrderingT
        }[],
        tableName: string
    ): XDPromise<object[]> {
        const deferred: XDDeferred<object[]> = PromiseHelper.deferred();

        getColMetaHelper(tableName)
        .then(function (colMeta, hasTableMeta) {
            const res: object[] = keys.map((key) => {
                const name: string = key.name;
                const parsedName: PrefixColInfo = xcHelper.parsePrefixColName(name);
                let type: number = DfFieldTypeT.DfUnknown;
                let keyFieldName: string = null;

                if (hasTableMeta) {
                    if (parsedName.prefix !== "") {
                        keyFieldName = getNewKeyFieldName(parsedName, colMeta);
                    } else {
                        keyFieldName = name;
                        type = colMeta[name];
                    }
                } else {
                    // if no tableMeta, just overwrite keyFieldName with key.name
                    keyFieldName = parsedName.name;
                }
                if (!colMeta.hasOwnProperty(keyFieldName)) {
                    // add to map so we can check against it when creating
                    // other new key field names
                    colMeta[keyFieldName] = DfFieldTypeT.DfUnknown;
                }
                if (key.type != null) {
                    type = xcHelper.convertColTypeToFieldType(key.type);
                }
                return {
                    name: name,
                    type: type,
                    keyFieldName: key.keyFieldName || keyFieldName || "",
                    ordering: key.ordering
                };
            });

            deferred.resolve(res);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /* =================== end of getKeyInfos ========================= */

    /**
     * xcHelper.formatAsUrl
     * @param struct
     */
    export function formatAsUrl(struct: object): string {
        let retStr: string = "";
        for (let key in struct) {
            if (retStr === "") {
                retStr += "?";
            } else {
                retStr += "&";
            }
            retStr += encodeURIComponent(key) + "=" +
                      encodeURIComponent(struct[key]);
        }
        return retStr;
    }

    /**
     * xcHelper.getElapsedTimeStr
     * @param milliSeconds - integer
     * @param round - boolean, if true will round down to nearest second
     * when value is greater than 1second. 3120 becomes 3s instead of 3.12
     * @param rejectZero - 0 to be treated as N/A
     */
    export function getElapsedTimeStr(
        milliSeconds: number | string,
        round?: boolean,
        rejectZero?: boolean
    ): string {
        if (!milliSeconds && rejectZero || typeof milliSeconds === "string") {
            return CommonTxtTstr.NA;
        }

        const s: number = Math.floor(milliSeconds / 1000);
        const seconds: number = Math.floor(s) % 60;
        const minutes: number = Math.floor((s % 3600) / 60);
        const hours: number = Math.floor(s / 3600);
        let timeString: string = '';

        if (hours > 0) {
            timeString += hours + "h ";
        }
        if (minutes > 0) {
            timeString += minutes + "m ";
        }

        if (milliSeconds < 1000) {
            timeString += milliSeconds + "ms";
        } else {
            timeString += seconds;
            if (milliSeconds < 60000 && !round) {// between 1 and 60 seconds
                let mills: number = milliSeconds % (seconds * 1000);
                if (milliSeconds < 10000) { // single digit seconds ex. 9s
                    mills = Math.floor(mills / 10);
                    let millStr = mills + "";
                    if (mills < 10) {
                        millStr = "0" + millStr;
                    }
                    timeString += "." + millStr;
                } else {
                    timeString += "." + Math.floor(mills / 100);
                }
            }
            timeString += "s";
        }

        return timeString;
    }

    function parseFunc(func: ColFunc): string {
        let str: string = "";
        if (func.name) {
            str += func.name;
            str += "(";
        }

        const args: any[] = func.args;
        for (let i = 0; i < args.length; i++) {
            if (i > 0) {
                str += ",";
            }

            if (typeof args[i] === "object") {
                str += parseFunc(args[i]);
            } else {
                str += args[i];
            }
        }
        if (func.name) {
            str += ")";
        }
        return str;
    }

    /**
     * xcHelper.stringifyFunc
     * assumes valid func structure of {args:[], name:""};
     * @param func
     */
    export function stringifyFunc(func: ColFunc): string {
        return parseFunc(func);
    }

    /**
     * xcHelper.stringifyFunc
     * assumes valid func structure of {args:[], name:""};
     * @param func
     */
    export function stringifyEval(func: ParsedEval): string {
        return stringifyEvalHelper(func);
    }

    function stringifyEvalHelper(func: ParsedEval): string {
        let str: string = "";
        if (func.fnName) {
            str += func.fnName;
            str += "(";
        }

        const args: ParsedEval[] | ParsedEvalArg[] = func.args;
        for (let i = 0; i < args.length; i++) {
            if (i > 0) {
                str += ",";
            }

            if (args[i].type === "fn") {
                str += stringifyEvalHelper(<ParsedEval>args[i]);
            } else {
                const arg = <ParsedEvalArg>args[i];
                str += arg.value;
            }
        }
        if (func.fnName) {
            str += ")";
        }
        return str;
    }

    export function getNamesFromFunc(
        funcObj: ColFunc,
        isAgg?: boolean
    ): string[] {
        let names: string[] = [];
        getNames(funcObj.args);
        return names;

        function getNames(args) {
            for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                if (typeof arg === "string" && !/[0-9.]/.test(arg[0]) &&
                    isNaN(arg as any)) {
                    const firstChar: string = arg[0];
                    const lastChar: string = arg[arg.length - 1];
                    if (firstChar !== "\"" && lastChar !== "\"" &&
                        firstChar !== "'" && lastChar !== "'" &&
                        aggCheck(arg)) {
                            if (isAgg) {
                                names.push(arg.slice(1));
                            } else {
                                names.push(arg);
                            }
                    }
                } else if (typeof arg === "object") {
                    getNames(args[i].args);
                }
            }
        }

        function aggCheck(arg: string): boolean {
            if (isAgg) {
                return (arg[0] === gAggVarPrefix &&
                        arg.length > 1 &&
                        names.indexOf(arg.slice(1)) === -1);
            } else {
                return names.indexOf(arg) === -1;
            }
        }
    }

    /**
     * xcHelper.styleNewLineChar
     * @param text
     */
    export function styleNewLineChar(text): string {
        return text.replace(/\n/g, '<span class="newLine lineChar">\\n</span>')
            .replace(/\r/g, '<span class="carriageReturn lineChar">\\r</span>');
    }

    /*
    options: {
        mouseCoors: {x: float, y: float},
        offsetX: float,
        offsetY: float,
        classes: string, ("class1 class2") to assign to $menu
        colNum: integer,
        isMultiCol: boolean,
        multipleColumns: [integers],
        isUnselect: boolean,
        shiftKey: boolean,
        floating: boolean (menu floats around and can pop up above user's mouse)
        callback: function,
        isDataTd: boolean, true if clicking on the json td,
        toClose: function, return true if want to close the menu
        toggle: boolean, if set true, will toggle open/close of menu,
        allowSelection: boolean, if true, will not clear any selected text
    }
    */

    /* ============== dropdownOpen ======================*/

    function updateTableDropdown($menu: JQuery, options: DropdownOptions): void {
        if (options.classes && options.classes.indexOf('locked') !== -1) {
            $menu.find('li:not(.hideTable, .unhideTable)')
                  .addClass('unavailable');
        } else {
            $menu.find('li').removeClass('unavailable');
        }

        const $subMenu: JQuery = $('#' + $menu.data('submenu'));
        if (WSManager.getNumOfWS() <= 1) {
            $subMenu.find(".moveToWorksheet").addClass("unavailable");
        } else {
            $subMenu.find(".moveToWorksheet").removeClass("unavailable");
        }

        const tableId: TableId = gActiveTableId;
        const index: number = WSManager.getTableRelativePosition(tableId);
        if (index === 0) {
            $subMenu.find('.moveLeft').addClass('unavailable');
        } else {
            $subMenu.find('.moveLeft').removeClass('unavailable');
        }

        const activeWS: string = WSManager.getActiveWS();
        const numTables: number = WSManager.getWorksheets()[activeWS].tables.length;
        if (index === (numTables - 1)) {
            $subMenu.find('.moveRight').addClass('unavailable');
        } else {
            $subMenu.find('.moveRight').removeClass('unavailable');
        }
        xcHelper.enableMenuItem($menu.find('.createDf'));
    }

    function updateColDropdown(
        $subMenu: JQuery,
        tableId: TableId,
        options: DropdownOptions
    ): void {
        const progCol: ProgCol = gTables[tableId].getCol(options.colNum);
        const $lis: JQuery = $subMenu.find(".typeList");
        $lis.removeClass("unavailable");
        xcTooltip.remove($lis);

        const isKnownType: boolean = progCol.isKnownType();
        if (isKnownType && !options.multipleColNums) {
            $subMenu.find(".changeDataType").addClass("isKnownType");
        } else {
            $subMenu.find(".changeDataType").removeClass("isKnownType");
        }
    }

    /**
     * used for deciding if cell can be filtered
     * returns true if cell is mixed and not an object or array
     * assumes cells from only 1 column are highlighted
     * @param columnType
     * @param cells
     */
    function isInvalidMixed(columnType: string, cells: TableCell[]) {
        const filterTypes: string[] = ["string", "float", "integer", "boolean",
                                        "undefined", "mixed"];
        const notAllowedCombTypes: string[] = ["string", "float", "integer", "boolean"];
        let invalidFound: boolean = false;
        let typeFound: string;
        for (let i = 0; i < cells.length; i++) {
            let cell: TableCell = cells[i];
            let type: string;
            if (cell.isMixed) {
                type = cell.type;
            } else if (cell.isUndefined) {
                type = "undefined";
            } else if (cell.isNull) {
                type = "null";
            } else if (cell.isBlank) {
                type = "blank";
            } else {
                type = columnType;
            }

            if (filterTypes.indexOf(type) === -1) {
                invalidFound = true;
                break;
            }

            if (!typeFound) {
                typeFound = type;
            } else if (type !== typeFound) {
                // cannot filter more than 1 type
                // XXX we won't need to do this check
                // (disallow filtering mixed cell types) once GUI-7071 is fixed
                if (notAllowedCombTypes.indexOf(type) !== -1 &&
                    notAllowedCombTypes.indexOf(typeFound) !== -1) {
                        invalidFound = true;
                        break;
                    }
            }
        }

        return invalidFound;
    }

    function parseRowJSON(jsonStr: string): object {
        let value: object;
        try {
            value = JSON.parse(jsonStr);
        } catch (err) {
            value = {};
        }

        return value;
    }

    /**
     * for tds
     * @param
     * @param tableId
     * @param options
     */
    function checkIfAlreadyUnnested(
        $unnestLi: JQuery,
        tableId: TableId,
        options: DropdownOptions
    ): void {
        if ($unnestLi.hasClass("hidden")) {
            return;
        }
        const rowNum: number = options.rowNum;
        const colNum: number = options.colNum;


        const $table : JQuery= $('#xcTable-' + tableId);
        const $jsonTd: JQuery = $table.find('.row' + rowNum).find('td.col' + colNum);

        const table: TableMeta = gTables[tableId];
        const progCol: ProgCol = table.getCol(colNum);
        const isArray: boolean = (progCol.getType() === ColumnType.array);
        let openSymbol: string = "";
        let closingSymbol: string = "";
        const unnestColName: string = progCol.getBackColName();

        // only escaping if column names not passed into parseUnnestTd
        function checkColExists(colName: string) {
            var escapedColName = xcHelper.escapeColName(colName);
            escapedColName = unnestColName + openSymbol +
                            escapedColName + closingSymbol;
            return table.hasColWithBackName(escapedColName);
        }

        if (isArray) {
            openSymbol = "[";
            closingSymbol = "]";
        } else {
            openSymbol = ".";
        }

        const jsonTd: object = parseRowJSON($jsonTd.find('.originalData').text());
        let notExists: boolean = false;
        for (let tdKey in jsonTd) {
            if (!checkColExists(tdKey)) {
                notExists = true;
                break;
            }
        }
        if (notExists) {
            xcTooltip.changeText($unnestLi, "", true);
            $unnestLi.removeClass("unavailable");
        } else {
            xcTooltip.changeText($unnestLi, "all columns pulled", false);
            $unnestLi.addClass("unavailable");
        }
    }

    function toggleUnnestandJsonOptions(
        $menu: JQuery,
        $div: JQuery,
        columnType: string,
        isMultiCell: boolean,
        notAllowed: boolean,
        options: DropdownOptions,
        tableId: TableId
    ): void {
        if (!$div.hasClass('originalData')) {
            $div = $div.siblings('.originalData');
        }
        const $unnestLi: JQuery = $menu.find('.tdUnnest');
        const $jsonModalLi: JQuery = $menu.find('.tdJsonModal');
        $unnestLi.addClass('hidden'); // pull all
        $jsonModalLi.addClass('hidden'); // examine

        let isMixedObj: boolean = false;
        let isTruncated: boolean = false;
        if (isMultiCell) {
            $menu.data('istruncatedtext', false);
            return;
        }

        if ((columnType === "object" || columnType === "array") &&
            !notAllowed
        ) {
            if ($div.text().trim() !== "" && !$div.find('.undefined').length) {
                // when  only one cell is selected
                $jsonModalLi.removeClass("hidden");
                $unnestLi.removeClass("hidden");
            }
        } else {
            if ($div.parent().hasClass('truncated')) {
                isTruncated = true;
                $jsonModalLi.removeClass("hidden");
            }

            if (columnType === "mixed" && !notAllowed) {
                const text: string = $div.text().trim();
                if (text !== "" && !$div.find('.undefined').length) {
                    // when only one cell is selected
                    let mixedVal: object;
                    try {
                        mixedVal = JSON.parse(text);
                    } catch (err) {
                        mixedVal = null;
                    }
                    if (mixedVal && typeof mixedVal === ColumnType.object) {
                        $jsonModalLi.removeClass("hidden");
                        $unnestLi.removeClass("hidden");
                        isMixedObj = true;
                    }
                }
            }
        }
        checkIfAlreadyUnnested($unnestLi, tableId, options);
        if (isTruncated && !isMixedObj) {
            $menu.data('istruncatedtext', true);
        } else {
            $menu.data('istruncatedtext', false);
        }
    }

    function updateTdDropdown(
        $div: JQuery,
        $menu: JQuery,
        tableId: TableId,
        options: DropdownOptions
    ): void {
        // If the tdDropdown is on a non-filterable value, we need to make the
        // filter options unavailable
        const tableCol: ProgCol = gTables[tableId].tableCols[options.colNum - 1];
        const columnType: string = tableCol.type;
        // allow fnfs but not array elements, multi-type, or anything but
        // valid types
        let notAllowed: boolean = ($div.find('.blank').length > 0);
        let cellCount: number = 0;
        let isMultiCell: boolean = false;
        const table: TableMeta =  gTables[tableId];
        const cells: TableCell[] = [];
        for (let row in table.highlightedCells) {
            for (let col in table.highlightedCells[row]) {
                cellCount++;
                if (cellCount > 1) {
                    isMultiCell = true;
                }
                let cell: TableCell = table.highlightedCells[row][col];
                cells.push(cell);
                if (cell.isBlank) {
                    notAllowed = true;
                }
            }
        }

        const filterTypes: string[] = ["string", "float", "integer", "boolean", "mixed"];
        const shouldNotFilter: boolean = options.isMultiCol ||
                                    filterTypes.indexOf(columnType) === -1 ||
                                    isInvalidMixed(columnType, cells);

        const $tdFilter: JQuery = $menu.find(".tdFilter");
        const $tdExclude: JQuery = $menu.find(".tdExclude");

        if (shouldNotFilter || notAllowed) {
            $tdFilter.addClass("unavailable");
            $tdExclude.addClass("unavailable");
        } else {
            $tdFilter.removeClass("unavailable");
            $tdExclude.removeClass("unavailable");
        }

        $tdFilter.removeClass("multiCell preFormatted");
        $tdExclude.removeClass("multiCell preFormatted");

        if (isMultiCell) {
            $tdFilter.addClass("multiCell");
            $tdExclude.addClass("multiCell");
        }

        if (!options.isMultiCol &&
            (tableCol.getFormat() !== ColFormat.Default)
        ) {
            $tdFilter.addClass("preFormatted");
            $tdExclude.addClass("preFormatted");
            // when it's only on one column and column is formatted
            options.classes += " long";
        }

        toggleUnnestandJsonOptions($menu, $div, columnType, isMultiCell,
                                    notAllowed, options, tableId);
    }

    /**
     * custom options for each $menu type
     * adds classes, decides whether to close the menu and return;
     * @param $dropdownIcon
     * @param $menu
     * @param $subMenu
     * @param menuId
     * @param tableId
     * @param options
     */
    function menuHelper(
        $dropdownIcon: JQuery,
        $menu: JQuery,
        $subMenu: JQuery,
        menuId: string,
        tableId: TableId,
        options: DropdownOptions
    ): string {
        const toClose: Function = options.toClose;
        if (typeof toClose === 'function' && options.toClose() === true) {
            return "closeMenu";
        }

        if (options.toggle && $menu.is(":visible")) {
            return "closeMenu";
        }

        switch (menuId) {
            case ('tableMenu'):
                // case that should close table menu
                if ($menu.is(":visible") && $menu.data('tableId') === tableId) {
                    return "closeMenu";
                }
                updateTableDropdown($menu, options);
                if (gTables[tableId] && gTables[tableId].isNoDelete()) {
                    xcHelper.disableMenuItem($("#tableMenu .deleteTable"), {
                        title: TooltipTStr.CannotDropLocked
                    });
                    $subMenu.find(".removeNoDelete").show();
                    $subMenu.find(".addNoDelete").hide();
                } else {
                    xcHelper.enableMenuItem($("#tableMenu .deleteTable"));
                    $subMenu.find(".removeNoDelete").hide();
                    $subMenu.find(".addNoDelete").show();
                }
                TableComponent.getMenu().showDagAndTableOptions($subMenu, tableId, null);
                TblManager.unHighlightCells();
                break;
            case ('colMenu'):
                // case that should close column menu
                if ($menu.is(":visible") &&
                    $menu.data("colNum") === options.colNum &&
                    $menu.data('tableId') === tableId &&
                    !$menu.hasClass('tdMenu')
                ) {
                    return "closeMenu";
                }
                updateColDropdown($subMenu, tableId, options);
                if (options.multipleColNums) {
                    $menu.data('columns', options.multipleColNums);
                    $menu.data('colNums', options.multipleColNums);
                } else {
                    $menu.data('colNums', [options.colNum]);
                }
                $subMenu.find('.sort').removeClass('unavailable');
                TblManager.unHighlightCells();
                break;
            case ('cellMenu'):
                // case that should close column menu
                if (options.isUnSelect && !options.shiftKey) {
                    return "closeMenu";
                }
                updateTdDropdown($dropdownIcon, $menu, tableId, options);
                break;
            default:
                TblManager.unHighlightCells();
                break;
        }
        return "";
    }

   /**
    *
    * @param menuId
    * @param $menu
    * @param $dropdownIcon
    * @param options
    *   mouseCoors: {x: float, y: float},
    *   offsetX: float,
    *   offsetY: float,
    *   floating: boolean (menu floats around and can pop up above user's mouse)
    */
   function positionAndShowMenu(
       menuId: string,
       $menu: JQuery,
       $dropdownIcon: JQuery,
       options: DropdownOptions
    ): void {
        const winHeight: number = $(window).height();
        const bottomMargin: number = 5;
        let topMargin: number;
        if (menuId === "cellMenu") {
            topMargin = 15;
        } else if (menuId === "colMenu") {
            topMargin = -4;
        } else {
            topMargin = 0;
        }

        const leftMargin: number = 5;
        let left: number;
        let top: number;
        if (options.mouseCoors) {
            left = options.mouseCoors.x;
            top = options.mouseCoors.y + topMargin;
        } else {
            left = $dropdownIcon[0].getBoundingClientRect().left + leftMargin;
            top = $dropdownIcon[0].getBoundingClientRect().bottom + topMargin;
        }

        if (options.offsetX) {
            left += options.offsetX;
        }
        if (options.offsetY) {
            top += options.offsetY;
        }

        const menuHeight: number = winHeight - top - bottomMargin;
        $menu.css('max-height', menuHeight);
        $menu.children('ul').css('max-height', menuHeight);
        $menu.css({"top": top, "left": left});
        $menu.show();
        $menu.children('ul').scrollTop(0);

        // size menu and ul
        const $ul: JQuery = $menu.find('ul');
        if ($ul.length > 0) {
            const ulHeight: number = $menu.find('ul')[0].scrollHeight;
            if (ulHeight > menuHeight) {
                $menu.find('.scrollArea').show();
                $menu.find('.scrollArea.bottom').addClass('active');
            } else {
                $menu.children('ul').css('max-height', 'none');
                $menu.find('.scrollArea').hide();
            }
        }
        // set scrollArea states
        $menu.find('.scrollArea.top').addClass('stopped');
        $menu.find('.scrollArea.bottom').removeClass('stopped');

        // positioning if dropdown is on the right side of screen
        const rightBoundary: number = $(window).width() - 5;
        if ($menu[0].getBoundingClientRect().right > rightBoundary) {
            left = rightBoundary - $menu.width();
            $menu.css('left', left).addClass('leftColMenu');
        }

        //positioning if td menu is below the screen and floating option is allowed
        if (options.floating) {
            $menu.css('max-height', 'none');
            $menu.children('ul').css('max-height', 'none');
            $menu.find('.scrollArea.bottom').addClass('stopped');
            let offset: number = 15;
            if (menuId === "worksheetTabMenu") {
                offset = 25;
            } else if (menuId === "cellMenu") {
                offset = 20;
            }
            if (top + $menu.height() + 5 > winHeight) {
                top -= ($menu.height() + offset);
                $menu.css('top', top);
            }
        }
    }

    /**
     * xcHelper.dropdownOpen
     * @param $dropdownIcon
     * @param $menu
     * @param options
     *  mouseCoors: {x: float, y: float},
     *  offsetX: float,
     *  offsetY: float,
     *  classes: string, ("class1 class2") to assign to $menu
     *  colNum: integer,
     *  isMultiCol: boolean,
     *  multipleColumns: [integers],
     *  isUnselect: boolean,
     *  shiftKey: boolean,
     *  floating: boolean (menu floats around and can pop up above user's mouse)
     *  callback: function,
     *  isDataTd: boolean, true if clicking on the json td,
     *  toClose: function, return true if want to close the menu
     *  toggle: boolean, if set true, will toggle open/close of menu,
     *  allowSelection: boolean, if true, will not clear any selected text
     *  prefix: string
     *  color: string
     */
    export function dropdownOpen(
        $dropdownIcon: JQuery,
        $menu: JQuery,
        options: DropdownOptions = <DropdownOptions>{}
    ): void {
        if (!($menu instanceof jQuery)) {
            console.error("Need to provide $menu");
            return;
        }

        const menuId: string = $menu.attr('id');
        let $allMenus: JQuery;
        let $subMenu: JQuery;

        if ($menu.data('submenu')) {
            $subMenu = $('#' + $menu.data('submenu'));
            $allMenus = $menu.add($subMenu);
        } else {
            $allMenus = $menu;
        }

        let tableId: TableId;
        if (menuId === "tableMenu" || menuId === "colMenu" ||
            menuId === "cellMenu" || menuId === "prefixColorMenu"
        ) {
            if (menuId === "tableMenu" && options.tableId) {
                tableId = options.tableId;
            } else {
                tableId = xcHelper.parseTableId($dropdownIcon.closest(".xcTableWrap"));
            }
        }

        $('.menu .selected').removeClass('selected');
        $(".leftColMenu").removeClass("leftColMenu");
        xcTooltip.hideAll();
        xcMenu.removeKeyboardNavigation();
        $menu.removeData("rowNum");

        if (typeof options.callback === "function") {
            options.callback();
        }

        // custom options for each $menu type
        // adds classes, decides whether to close the menu and return;
        const menuHelperRes: string = menuHelper($dropdownIcon, $menu, $subMenu,
                                                menuId, tableId, options);

        if (menuHelperRes === "closeMenu") {
            xcMenu.close($allMenus);
            return;
        }

        xcMenu.close();

        // case that should open the menu (note that colNum = 0 may make it false!)
        if (options.colNum != null && options.colNum > -1) {
            $menu.data("colNum", options.colNum);
            $menu.data("tableId", tableId);
        } else {
            $menu.removeData("colNum");
            $menu.removeData("tableId");
        }
        if (menuId === "tableMenu") {
            $menu.data("tableId", tableId);
        }

        if (menuId === "prefixColorMenu") {
            $menu.data("tableId", tableId)
                .data("prefix", options.prefix || "");
            $menu.find(".wrap").removeClass("selected");
            const color: string = options.color || "white";
            $menu.find("." + color).addClass("selected");
        }

        if (options.rowNum != null && options.rowNum > -1) {
            $menu.data("rowNum", options.rowNum);
        }

        let classes: string = options.classes;
        if (classes != null) {
            if (gTables[tableId] && gTables[tableId].modelingMode) {
                classes += " style-white mode-modeling";
            }
            const showingHotKeys: boolean = $menu.hasClass("showingHotKeys");
            const className: string = classes.replace("header", "");
            $menu.attr("class", "menu " + className);
            if ($subMenu) {
                $subMenu.attr("class", "menu subMenu " + className);
            }
            if (showingHotKeys) {
                $menu.addClass("showingHotKeys");
            }
        }

        // adjust menu height and position it properly
        positionAndShowMenu(menuId, $menu, $dropdownIcon, options);
        xcMenu.addKeyboardNavigation($menu, $subMenu, {
            allowSelection: options.allowSelection
        });
    }

    /* ============== end of dropdownOpen ======================*/

    // Will round bucket size up or down depending on how many rows can fit on the screen
    /**
     * xcHelper.roundToSignificantFigure
     * @param value
     * @param numRows
     * @param max
     * @param min
     */
    export function roundToSignificantFigure(
        value: number,
        numRows: number,
        max: number,
        min: number
    ): number {
        value = Math.floor(value);
        const numDigits: number = Math.floor(Math.log10(value));
        let firstDigit: number = Math.floor(value / Math.pow(10, numDigits));
        // adds 1 to first digit (round up) if rounding down creates too many buckets
        firstDigit = (max - min) / (firstDigit * Math.pow(10, numDigits)) > numRows ?
                     firstDigit + 1 : firstDigit;
        return firstDigit * Math.pow(10, numDigits);
    }

    /**
     * xcHelper.decodeFromUrl
     * @param href
     */
    export function decodeFromUrl(href: string): object {
        const ret: object = {};

        try {
            const url: URL = new URL(href);
            const queryStr = url.search;
            if (!queryStr.length) {
                return ret;
            }
            const pairs = queryStr.substr(1).split("&");
            pairs.forEach(function(pairStr) {
                let pair = pairStr.split("=");
                ret[decodeURIComponent(pair[0].replace(/\+/g,' '))] = decodeURIComponent(pair[1].replace(/\+/g,' ') || '');
            });
        } catch (e) {

        }

        return ret;
    }

    export function setURLParam(key: string, value: string) {
        const curHref = window.location.href;
        const url: URL = new URL(curHref);
        const queryStr = url.search;
        try {
            let pairs;
            if (queryStr.length) {
                pairs = queryStr.substr(1).split("&");
            } else {
                pairs = [];
            }
            let found = false;
            for (let i = 0; i < pairs.length; i++) {
                let pair = pairs[i].split("=");
                if (decodeURIComponent(pair[0].replace(/\+/g,' ')) === key) {
                    pairs[i] = pair[0] + "=" + encodeURIComponent(value);
                    found = true;
                    break;
                }
            }
            if (!found) {
                pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
            }

            return curHref.split('?')[0] + "?" + pairs.join("&");
        } catch (e) {
            return curHref;
        }
    }

    /**
     *
     * @param key
     */
    export function deleteURLParam(key: string) {
        const curHref = window.location.href;
        const url: URL = new URL(curHref);
        const queryStr = url.search;
        if (!queryStr.length) {
            return window.location.href;
        }
        try {
            const pairs = queryStr.substr(1).split("&");
            for (let i = 0; i < pairs.length; i++) {
                let pair = pairs[i].split("=");
                if (decodeURIComponent(pair[0].replace(/\+/g,' ')) === key) {
                    pairs.splice(i, 1);
                    break;
                }
            }
            let newLocation = curHref.split('?')[0];
            if (pairs.length) {
                newLocation = newLocation + "?" + pairs.join("&");
            }
            return newLocation;
        } catch (e) {
            return curHref;
        }
    }

    /**
     * Bolds part of the suggested text
     * Note: also clears it of any tags inside
     * @param $suggestion The JQUERY for the suggestion
     * @param searchKey The searchKey we want to bold
     */
    export function boldSuggestedText($suggestion: JQuery, searchKey: string): void {
        searchKey = searchKey.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
        // The following pattern looks for "searchkey" exclusively outside of a <>.
        // This prevents it from replacing values within a tag, and replacing the tags themselves.
        const pattern: RegExp = new RegExp('((^|>)[^<]*)(' + searchKey + ')', 'gi');
        // Remove old strong tabs
        let innerCleanHtml: string = $suggestion.html().replace('<strong>','').replace('</strong>','');
        $suggestion.html(
            innerCleanHtml.replace(pattern,'$1<strong>$3</strong>')
        );
    }

    // groups = [{
    //     operator: "eq",
    //     args: [value: "colname", cast: "blah"]
    // }]
    export function formulateMapFilterString(
        groups: OpPanelFunctionGroup[],
        andOr?: string
    ): string {
        let str = "";
        groups.forEach((group, i: number) => {
            const funcName: string = group.operator;
            const args = group.args;
            if (i > 0) {
                str += ", ";
            }

            if (i < groups.length - 1) {
                if (!andOr) {
                    andOr = "and";
                }
                str += andOr + "(";
            }
            str += funcName + "(";

            let hasValue = false;
            // loop through arguments within a group
            args.forEach((arg) => {
                let colNames: string[] = arg.getFormattedValue().split(",");
                let colStr: string = "";
                colNames.forEach((colName, k) => {
                    if (k > 0) {
                        colStr += ", ";
                    }
                    if (arg.isCast()) {
                        colStr += xcHelper.castStrHelper(colName, arg.getCast());
                    } else {
                        colStr += colName;
                    }
                });

                if (arg.getFormattedValue() !== "") {
                    str += colStr + ", ";
                    hasValue = true;
                }
            });
            if (hasValue) {
                str = str.slice(0, -2);
            }
            str += ")";
        });

        for (let i = 0; i < groups.length - 1; i++) {
            str += ")";
        }
        return (str);
    }

    /**
     * returns a string that includes the position and character of the error
     * @param e javascript error
     */
    export function parseJSONError(e): string {
        // handling json parse/syntax error
        var searchText= "at position ";
        var errorPosition = e.message.indexOf(searchText);
        var position = "";
        if (errorPosition > -1) {
            for (let i = errorPosition + searchText.length + 1; i < e.message.length; i++) {
                if (e.message[i] >= 0 && e.message[i] <= 9) {
                    position += e.message[i];
                } else {
                    break;
                }
            }
        }
        if (position.length) {
             // XXX split into lines by searching for \n not in quotes or escaped
             // so that we can show the error in the correct line number
        }
        return xcHelper.camelCaseToRegular(e.name) + ": " +
               e.message;
    }

    /* For join, deep copy of right table and left table columns */
    export  function createJoinedColumns(
        lTableName: string,
        rTableName: string,
        pulledLColNames: string[],
        pulledRColNames: string[],
        lRenames: ColRenameInfo[],
        rRenames: ColRenameInfo[]
    ): ProgCol[] {
        // Combine the columns from the 2 current tables
        // Note that we have to create deep copies!!
        var lCols = getPulledColsAfterJoin(lTableName, pulledLColNames, lRenames);
        var rCols = getPulledColsAfterJoin(rTableName, pulledRColNames, rRenames);
        const excludeDataCol = (col) => col.name !== "DATA";

        const lNewCols: ProgCol[] = lCols.filter(excludeDataCol);
        const rNewCols: ProgCol[] = rCols.filter(excludeDataCol);
        const newTableCols: ProgCol[] = lNewCols.concat(rNewCols);
        newTableCols.push(ColManager.newDATACol());
        return newTableCols;
    }

    function getPulledColsAfterJoin(
        tableName: string,
        pulledColNames: string[],
        renameInfos: ColRenameInfo[]
    ): ProgCol[] {
        const pulledCols: ProgCol[] = [];
        const tableId: TableId = xcHelper.getTableId(tableName);
        if (tableId == null || gTables[tableId] == null ||
            gTables[tableId].tableCols == null) {
            return pulledCols;
        }

        const table: TableMeta = gTables[tableId];
        const cols: ProgCol[] = xcHelper.deepCopy(table.tableCols);
        if (!pulledColNames) {
            return cols;
        }

        for (let i = 0; i < pulledColNames.length; i++) {
            const colIndex: number = table.getColNumByBackName(pulledColNames[i]) - 1;
            const col: ProgCol = cols[colIndex];
            if (renameInfos && renameInfos.length > 0) {
                replaceImmediate(col, renameInfos);
                replacePrefix(col, renameInfos);
            }
            pulledCols.push(col);
        }

        return pulledCols;
    }

    function replaceImmediate(col: ProgCol, renameInfos: ColRenameInfo[]): void {
        renameInfos.forEach((renameInfo) => {
            // when backName === srcColName, it's a derived field
            if (renameInfo.type !== DfFieldTypeT.DfFatptr &&
                renameInfo.orig === col.backName
            ) {
                const newName: string = renameInfo.new;
                col.backName = newName;
                col.name = newName;
                if (col.sizedTo === "header") {
                    col.width = xcHelper.getDefaultColWidth(newName);
                }
                return false; // stop loop
            }
        });
    }

    // for each fat ptr rename, find whether a column has this fat ptr as
    // a prefix. If so, fix up all fields in colStruct that pertains to the prefix
    function replacePrefix(col: ProgCol, renameInfos: ColRenameInfo[]): void {
        renameInfos.forEach((renameInfo) => {
            if (renameInfo.type === DfFieldTypeT.DfFatptr &&
                !col.immediate &&
                col.prefix === renameInfo.orig
            ) {
                // the replace will only repalce the first occurrence, so is fine
                col.backName = col.backName.replace(renameInfo.orig, renameInfo.new);
                col.func.args[0] = col.func.args[0].replace(renameInfo.orig, renameInfo.new);
                col.prefix = col.prefix.replace(renameInfo.orig, renameInfo.new);
                col.userStr = '"' + col.name + '" = pull(' + col.backName + ')';
                if (col.sizedTo === "header") {
                    col.width = xcHelper.getDefaultColWidth(col.name, col.prefix);
                }
                return false; // stop loop
            }
        });
    }

    export function createGroupByColumns(
        tableName: string,
        groupByCols: string[],
        aggArgs: AggColInfo[],
        sampleCols: number[]
    ): ProgCol[] {
        let newProgCols: ProgCol[] = [];
        const usedNameSet: Set<string> = new Set();
        aggArgs.forEach((aggArg) => {
            const name: string = aggArg.newColName;
            usedNameSet.add(name);
            newProgCols.push(ColManager.newPullCol(name, name));
        });

        if (sampleCols != null && sampleCols.length > 0) {
            const tableId: TableId = xcHelper.getTableId(tableName);
            newProgCols = getIncSampleGroupByCols(tableId, sampleCols, groupByCols, newProgCols);
        } else {
            groupByCols.forEach((name) => {
                if (!usedNameSet.has[name]) {
                    usedNameSet.add(name);
                    const frontName: string = xcHelper.parsePrefixColName(name).name;
                    newProgCols.push(ColManager.newPullCol(frontName, name));
                }
            });
        }
        newProgCols.push(ColManager.newDATACol());
        return newProgCols;
    }

    function getIncSampleGroupByCols(
        tableId: TableId,
        sampleCols: number[],
        groupByCols: string[],
        aggProgCols: ProgCol[]
    ): ProgCol[] {
        const table: TableMeta = gTables[tableId];
        const tableCols: ProgCol[] = table.tableCols;
        const newCols: ProgCol[] = [];
        const numGroupByCols: number = groupByCols.length;
        let newProgColPosFound: boolean = false;

        // find the first col that is in groupByCols
        // and insert aggCols
        sampleCols.forEach((colIndex) => {
            const curCol = tableCols[colIndex];
            const colName: string = curCol.getBackColName();
            if (!newProgColPosFound) {
                for (let i = 0; i < numGroupByCols; i++) {
                    if (colName === groupByCols[i]) {
                        newProgColPosFound = true;
                        aggProgCols.forEach((progCol) => {
                            newCols.push(progCol);
                        });
                        break;
                    }
                }
            }

            newCols.push(curCol);
        });

        if (!newProgColPosFound) {
            aggProgCols.forEach((progCol) => {
                newCols.unshift(progCol);
            });
        }
        // Note that if include sample,
        // a.b should not be escaped to a\.b
        const finalCols: ProgCol[] = newCols.map((col) => new ProgCol(col));
        return finalCols;
    }

    export function getQueryProgress(queryStateOutput: any): number {
        let progress: number = null;
        let numWorkCompleted: number = 0;
        let numWorkTotal: number = 0
        queryStateOutput.queryGraph.node.forEach((node) => {
            numWorkCompleted += node.numWorkCompleted;
            numWorkTotal += node.numWorkTotal;
        });
        progress = numWorkCompleted / numWorkTotal;
        return progress;
    }

    /**
     * xcHelper.zip
     * @param arrs, any number of arrays.
     * @example zip([1, 2, 3], ["a", "b", "c"]).
     * The output is [[1,"a"],[2, "b"],[3, "c"]].
     */
    export function zip(...arrs: Array<any>) {
        if(arrs.length == 0) {
            return [];
        }
        return arrs[0].map((_, idx) => arrs.map(arr=>arr[idx]));
    }
    
    export function createColInfo(columns: ProgCol[]): ColRenameInfo[] {
        ///XXX TODO: Remove this and have the user choose casted names
        let colInfo: ColRenameInfo[] = [];
        let names: string[] = [];
        columns.forEach((column: ProgCol) => {
            let backName: string = column.getBackColName();
            let newName: string = backName;
            if (newName.indexOf("::") > 0) {
                newName = newName.split("::")[1];
            }
            if (newName.endsWith("_integer") || newName.endsWith("_float") ||
                newName.endsWith("_boolean") || newName.endsWith("_string")) {
                newName = newName.substring(0, newName.lastIndexOf("_"));
            }
            while (names.indexOf(newName) != -1) {
                newName = newName + "(2)";
            }
            names.push(newName);
            let type: DfFieldTypeT = xcHelper.convertColTypeToFieldType(column.getType());
            colInfo.push({
                orig: backName,
                new: newName,
                type: type
            });
        });
        return colInfo;
    }

    export let __testOnly__: any = {};

    if (typeof window !== 'undefined' && window['unitTestMode']) {
        __testOnly__.toggleUnnestandJsonOptions = toggleUnnestandJsonOptions;
        __testOnly__.isInvalidMixed = isInvalidMixed;
    }
}

if (typeof exports !== "undefined") {
    exports.xcHelper = xcHelper;
}

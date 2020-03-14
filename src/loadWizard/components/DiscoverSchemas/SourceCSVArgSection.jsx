import * as React from "react";
import { InputSerializationFactory } from '../../services/SchemaService';

// XXX TODO: getProps and onInputChange should change to a passed in props
// instead of self-contained state
export default class SourceCSVArgSection extends React.Component{
    constructor(props) {
        super(props);

        this.state = {
            args: this.getCSVArgs(props.config)
        };
        this.onInputChange = this.onInputChange.bind(this);
    }

    render() {
        const { config, onConfigChange } = this.props;
        const initConfig = this.getCSVArgs(config);
        const isConfigChanged = this._isConfigChanged(initConfig, this.state.args);
        const hasError = this._hasError(this.state.args);

        return (
            <div className="SourceCSVArgSection">
                {
                    this.state.args.map((arg) => {
                        const options = {
                            ...arg,
                            onChange: this.onInputChange
                        }
                        return <CSVArgRow key={arg.keyword} {...options}></CSVArgRow>
                    })
                }
                {
                    isConfigChanged && !hasError
                        ? <button
                            className="btn btn-secondary"
                            onClick={() => {
                                onConfigChange(this.convert(this.state.args));
                            }}>Done</button>
                        : null
                }
            </div>
        )
    }

    _hasError(args) {
        for (const { error } of args) {
            if (error) {
                return true;
            }
        }
        return false;
    }

    _isConfigChanged(c1, c2) {
        const m2 = {};
        for (const {keyword, value} of c2) {
            m2[keyword] = value;
        }
        for (const {keyword, value} of c1) {
            if (value !== m2[keyword]) {
                return true;
            }
        }
        return false;
    }

    _delimiterTranslate(val) {
        let delim = val;
        for (let i = 0; i < delim.length; i++) {
            if (delim[i] === '\"' && !xcHelper.isCharEscaped(delim, i)) {
                delim = delim.slice(0, i) + '\\' + delim.slice(i);
                i++;
            }
        }

        // hack to turn user's escaped string into its actual value
        let objStr = '{"val":"' + delim + '"}';
        try {
            delim = JSON.parse(objStr).val;
            return {
                delim,
                error: false
            };
        } catch (err) {
            // XXX TODO: show an error message for this case
            return {
                delim, val,
                error: true
            };
        }
    }

    convert(args) {
        const map = {};
        for (const arg of args) {
            map[arg.keyword] = arg.value;
        }
        return InputSerializationFactory.createCSV({
            recordDelimiter: map.recordDelimiter,
            fieldDelimiter: map.fieldDelimiter,
            quoteChar: map.quoteChar
        });
    }

    onInputChange(key, value) {
        const args = this.state.args;
        for (let arg of args) {
            if (arg.keyword === key) {
                if (value === "") {
                    // empty case
                    arg.value = "";
                    arg.error = true;
                } else if (arg.isNumber) {
                    arg.value = parseInt(value);
                    arg.error = false;
                } else {
                    const {delim, error} = this._delimiterTranslate(value);
                    arg.value = delim;
                    arg.error = error;
                }
                break;
            }
        }
        this.setState({ args });
    }

    /**
     * Attributes includes:
     * text,
     * keyword,
     * value,
     * error (boolean)
     * isNumber (boolean)
     */
    getCSVArgs(config) {
        const csvConfig = config.CSV;
        const {
            RecordDelimiter,
            FieldDelimiter,
            QuoteCharacter
        } = csvConfig;

        return [{
            "text": "Record Delimiter",
            "keyword": "recordDelimiter",
            "value": RecordDelimiter,
            "error": false,
        }, {
            "text": "Field Delimiter",
            "keyword": "fieldDelimiter",
            "value": FieldDelimiter,
            "error": false
        }, {
            "text": "Quoting Character",
            "keyword": "quoteChar",
            "value": QuoteCharacter,
            "error": false,
        }];
    }
}
/**
 *
 * @param {text, keyword, default, onChange} props
 */
function CSVArgRow(props) {
    const {text, keyword, value, onChange, error, isNumber} = props;
    const strinfigyVal = (val) => {
        if (typeof val === "string") {
            val = val.replace(/\t/g, "\\t")
                    .replace(/\n/g, "\\n")
                    .replace(/\r/g, "\\r");
        } else {
            val = val + ""; // change number to string
        }
        return val;
    };
    const inputType = isNumber ? "number" : "text";
    const classNames = ["xc-input"];
    if (error) {
        classNames.push("error");
    }
    return (
        <div className="row">
            <label>{text}:</label>
            <input
                className={classNames.join(" ")}
                type={inputType}
                value={strinfigyVal(value)}
                onChange={e => onChange(keyword, e.target.value)}
            />
        </div>
    )
}
import * as React from "react";
import * as AdvOption from './AdvanceOption'
import InputDropdown from "../../../components/widgets/InputDropdown"
import { InputSerializationFactory, CSVHeaderOption } from '../../services/SchemaService';

// XXX TODO: getProps and onInputChange should change to a passed in props
// instead of self-contained state
export default class SourceCSVArgSection extends React.Component{
    constructor(props) {
        super(props);

        this.state = {
            csvConfig: {...props.config.CSV},
            errorInputs: {}
        };
    }

    render() {
        const { config: initConfig, onConfigChange, classNames = [] } = this.props;
        const { csvConfig, errorInputs } = this.state;

        const isConfigChanged = this._isConfigChanged(initConfig.CSV, csvConfig);
        const hasError = Object.keys(errorInputs).length > 0;
        const { FileHeaderInfo, AllowQuotedRecordDelimiter } = csvConfig;
        const buttonClasses = ["btn", "btn-secondary", "btn-new"];
        if (!isConfigChanged || hasError) {
            buttonClasses.push("btn-disabled");
        }
        return (
            <AdvOption.OptionGroup classNames={classNames}>
                <CSVArgChoice
                    label="Header Option"
                    classNames={["fullRow"]}
                    value={FileHeaderInfo}
                    options={
                        [CSVHeaderOption.USE, CSVHeaderOption.IGNORE, CSVHeaderOption.NONE].map(
                            (v) => ({text: v, value: v})
                        )
                    }
                    onChange={(v) => {
                        this.setState((state) => {
                            state.csvConfig.FileHeaderInfo = v;
                            return state;
                        })
                    }}
                />
                {
                    this.getCSVInputs(csvConfig, errorInputs).map((arg) => {
                        const options = {
                            ...arg,
                            onChange: (k, v) => this.onInputChange(k, v)
                        }
                        return <CSVArgInput key={arg.keyword} {...options}></CSVArgInput>
                    })
                }
                <CSVArgCheck
                    label="Allow Quoted Record Delimiter"
                    checked={AllowQuotedRecordDelimiter}
                    classNames={["checkboxRow"]}
                    onChange={(checked) => {
                        this.setState((state) => {
                            state.csvConfig.AllowQuotedRecordDelimiter = checked;
                            return state;
                        })
                    }}
                />
                <AdvOption.Option>
                    <AdvOption.OptionLabel></AdvOption.OptionLabel>
                    <AdvOption.OptionValue>
                        <button
                        className={buttonClasses.join(" ")}
                        onClick={() => {
                            onConfigChange(this.convert(this.state.csvConfig));
                        }}>
                            Apply Changes
                        </button>
                    </AdvOption.OptionValue>
                </AdvOption.Option>
            </AdvOption.OptionGroup>
        )
    }

    _isConfigChanged(c1, c2) {
        if (Object.keys(c1).length !== Object.keys(c2).length) {
            return true;
        }

        for (const [key, value] of Object.entries(c2)) {
            if (c1[key] !== value) {
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

    convert(csvConfig) {
        const {
            FileHeaderInfo,
            QuoteEscapeCharacter,
            RecordDelimiter,
            FieldDelimiter,
            QuoteCharacter,
            AllowQuotedRecordDelimiter
        } = csvConfig;
        return InputSerializationFactory.createCSV({
            headerOption: FileHeaderInfo,
            recordDelimiter: RecordDelimiter,
            fieldDelimiter: FieldDelimiter,
            quoteChar: QuoteCharacter,
            quoteEscapeChar: QuoteEscapeCharacter,
            allowQuotedRecordDelimiter: AllowQuotedRecordDelimiter
        });
    }

    onInputChange(key, value, isNumber) {
        if (this.state.csvConfig[key] == null) {
            console.error('Key not found: ', key);
            return;
        }

        let argValue = '';
        let argError = false;
        if (value === "") {
            // empty case
            argValue = "";
            argError = true;
        } else if (isNumber) {
            argValue = parseInt(value);
            argError = false;
        } else {
            const {delim, error} = this._delimiterTranslate(value);
            argValue = delim;
            argError = error;
        }

        this.setState((state) => {
            if (argError) {
                state.errorInputs[key] = 'anything';
            } else {
                delete state.errorInputs[key];
            }
            state.csvConfig[key] = argValue;
            return state;
        });
    }

    /**
     * Attributes includes:
     * text,
     * keyword,
     * value,
     * error (boolean)
     * isNumber (boolean)
     */
    getCSVInputs(config, errors = {}) {
        const {
            RecordDelimiter,
            FieldDelimiter,
            QuoteCharacter,
            QuoteEscapeCharacter
        } = config;

        return [{
            "text": "Record Delimiter",
            "keyword": "RecordDelimiter",
            "value": RecordDelimiter,
            "error": errors['RecordDelimiter'] != null,
            "halfRow": true
        }, {
            "text": "Field Delimiter",
            "keyword": "FieldDelimiter",
            "value": FieldDelimiter,
            "error": errors['FieldDelimiter'] != null,
            "halfRow": true
        }, {
            "text": "Quoting Character",
            "keyword": "QuoteCharacter",
            "value": QuoteCharacter,
            "error": errors['QuoteCharacter'] != null,
            "halfRow": true
        }, {
            "text": "Quoting Escape Character",
            "keyword": "QuoteEscapeCharacter",
            "value": QuoteEscapeCharacter,
            "error": errors['QuoteEscapeCharacter'] != null,
            "halfRow": true
        }];
    }
}
/**
 *
 * @param {text, keyword, default, onChange} props
 */
function CSVArgInput(props) {
    const {text, keyword, value, onChange, error, isNumber, halfRow} = props;
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
    let outerClassNames = [];
    if (halfRow) {
        outerClassNames.push("halfRow");
    }
    return (
        <AdvOption.Option classNames={outerClassNames}>
            <AdvOption.OptionLabel>{text}</AdvOption.OptionLabel>
            <AdvOption.OptionValue>
                <input
                    className={classNames.join(" ")}
                    type={inputType}
                    value={strinfigyVal(value)}
                    onChange={e => onChange(keyword, e.target.value, isNumber)}
                />
            </AdvOption.OptionValue>
        </AdvOption.Option>
    )
}

function CSVArgChoice(props) {
    const { label, value, options, onChange } = props;
    return (
        <AdvOption.Option classNames={props.classNames}>
            <AdvOption.OptionLabel>{label}</AdvOption.OptionLabel>
            <AdvOption.OptionValue>
                <InputDropdown
                    val={value}
                    onInputChange={(v) => {
                        if (v !== value) {
                            onChange(v);
                        }
                    }}
                    onSelect={(v) => {
                        if (v !== value) {
                            onChange(v);
                        }
                    }}
                    list={
                        options.map(({ text, value }) => {
                            return {text: text, value: value};
                        })
                    }
                    readOnly
                />
            </AdvOption.OptionValue>
        </AdvOption.Option>
    )
}

function CSVArgCheck(props) {
    const { label, checked, onChange, classNames } = props;

    const iconClasses = ['icon', checked ? 'xi-ckbox-selected' : 'xi-ckbox-empty'];
    return (
        <AdvOption.Option classNames={classNames}>
            <AdvOption.OptionLabel onClick={() => {onChange(!checked)}}>{label}</AdvOption.OptionLabel>
            <AdvOption.OptionValue>
                <div className="csvArgs-chkbox">
                    <i className={iconClasses.join(' ')}  onClick={() => { onChange(!checked); }} />
                </div>
            </AdvOption.OptionValue>
        </AdvOption.Option>
    );
}
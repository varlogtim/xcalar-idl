import * as React from "react";
// Note: this component should replace the input in SourcePath.jsx
export default class S3BucketInput extends React.Component{
    constructor(props) {
        super(props);
        // XXX TODO: value should come from props
        this.state = {
            value: "/",
            showHint: false
        };
        this.onChange = this.onChange.bind(this);
        this.onClick = this.onClick.bind(this);
        this._turnOffDropdownListeners = this._turnOffDropdownListeners.bind(this);
        this.inputRef = React.createRef();
    }

    render() {
        // Note: to test, set s3Bucket to a test value
        const s3Bucket = DSTargetManager.getAvailableS3Bucket();
        const classNames = ["dropDownList"];
        const value = this.state.value;
        if (this.state.showHint && s3Bucket) {
            classNames.push("open");
        }
        return (
            <div className={classNames.join(" ")}>
                <input
                    ref={this.inputRef}
                    className="text"
                    type="text"
                    spellCheck="false"
                    value={value}
                    onChange={e => this.onChange(e.target.value)}
                    onClick={this.onClick}
                />
                <div className="list">
                    <ul>
                        <li onClick={e => this.onChange(e.target.innerText)}>{s3Bucket}</li>
                    </ul>
                </div>
            </div>
        )
    }

    onChange(value) {
        // XXX TODO: pass value change to props
        this.setState({
            value,
            showHint: false
        });
        this._turnOffDropdownListeners();
    }

    onClick() {
        const toShowHint = !this.state.showHint;
        this.setState({
            showHint: toShowHint
        });
        if (toShowHint) {
            this._turnOnDropdownListeners();
        } else {
            this._turnOffDropdownListeners();
        }
    }

    _turnOnDropdownListeners() {
        // when click anywhere else, turn off the dropdown
        document.addEventListener("click", this._turnOffDropdownListeners);
    }

    _turnOffDropdownListeners(e) {
        if (e && this.inputRef.current === e.target) {
            return;
        }
        document.removeEventListener("click.hintDropdown", this._turnOffDropdownListeners);
        this.setState({
            showHint: false
        });
    }
}
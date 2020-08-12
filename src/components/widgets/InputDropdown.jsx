import * as React from "react";
import DropdownUL from "./DropdownUL";
// type InputDropdownProps = {
//     onSelect: Function,
//     onInputChange: Function,
//     onOpen?: Function
//     val: string,
//     list: {value: string, text: string, icon?: string, className?: string}[],
//     hint: string
//     readOnly?: boolean
// };

// type InputDropdownState = {
//     open: boolean
// };

export default class InputDropdown extends React.Component {
    // private dropdownRef: React.RefObject<any>;

    constructor(props) {
        super(props);
        this.state = {
            open: false
        };
        this.dropdownRef = React.createRef();
        this.onOuterListClick = this.onOuterListClick.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
        this.onItemClick = this.onItemClick.bind(this);
        this.closeDropdown = this.closeDropdown.bind(this);
    }

    componentWillUnmount() {
        this.closeDropdown();
    }

    openDropdown() {
        this.setState({
            open: true
        });
        document.addEventListener('mousedown', this.handleClickOutside);
        if (typeof this.props.onOpen === "function") {
            this.props.onOpen();
        }
    }

    closeDropdown() {
        this.setState({
            open: false
        });
        document.removeEventListener('mousedown', this.handleClickOutside);
    }

    onInputChange(value) {
        this.closeDropdown();
        if (this.props.onInputChange) {
            this.props.onInputChange(value);
        }
    }

    onItemClick(value) {
        this.closeDropdown();
        if (this.props.onSelect) {
            this.props.onSelect(value);
        }
    }

    onOuterListClick() {
        if (this.state.open) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    handleClickOutside(e) {
        if (this.dropdownRef && !this.dropdownRef.current.contains(e.target)) {
            this.closeDropdown();
        }
    }

    render() {
        let readOnly = (this.props.readOnly === true) ? true : false;
        let disabled = (this.props.disabled === true) ? true : false;

        if (disabled) {
            return (
                <div className="dropDownList selectList">
                    <input
                        className="text"
                        type="text"
                        spellCheck={false}
                        value={this.props.val}
                        readOnly={true}
                    />
                    <div className="iconWrapper">
                        <i className="icon xi-arrow-down"></i>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="dropDownList selectList" ref={this.dropdownRef} onClick={this.onOuterListClick}>
                    <input
                        className="text"
                        type="text"
                        spellCheck={false}
                        value={this.props.val}
                        onChange={e => this.onInputChange(e.target.value)}
                        readOnly={readOnly}
                    />
                    <div className="iconWrapper">
                        <i className="icon xi-arrow-down"></i>
                    </div>
                    {this.state.open &&
                        <DropdownUL
                            list={this.props.list}
                            hint={this.props.hint}
                            onItemClick={this.onItemClick}
                            onEscape={this.closeDropdown}
                        />
                    }
                </div>
            )
        }
    }
}
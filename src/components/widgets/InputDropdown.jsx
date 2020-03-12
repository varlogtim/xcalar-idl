import * as React from "react";
import DropdownUL from "./DropdownUL";
// type InputDropdownProps = {
//     onSelect: Function,
//     onInputChange: Function,
//     val: string,
//     list: {value: string, text: string, icon?: string}[],
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
        }
        this.dropdownRef = React.createRef();
        this.onOuterListClick = this.onOuterListClick.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
        this.onItemClick = this.onItemClick.bind(this);
    }

    componentWillUnmount() {
        this.closeDropdown();
    }

    openDropdown() {
        this.setState({
            open: true
        });
        document.addEventListener('mousedown', this.handleClickOutside);
    }

    closeDropdown() {
        this.setState({
            open: false
        });
        document.removeEventListener('mousedown', this.handleClickOutside);
    }

    onInputChange(value) {
        this.closeDropdown();
        this.props.onInputChange(value);
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

        return (
            <div className="dropDownList" ref={this.dropdownRef} onClick={this.onOuterListClick}>
                <input
                    className="text"
                    type="text"
                    spellCheck={false}
                    value={this.props.val}
                    // onClick={this.onOuterListClick}
                    onChange={e => this.onInputChange(e.target.value)}
                    readOnly={readOnly}
                />
                <div class="iconWrapper">
                    <i class="icon xi-arrow-down"></i>
                </div>
                {this.state.open &&
                    <DropdownUL
                    list={this.props.list}
                    onItemClick={this.onItemClick}
                    />
                }
            </div>
        )
    }
}
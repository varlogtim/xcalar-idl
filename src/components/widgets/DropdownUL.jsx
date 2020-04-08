import * as React from "react";

// type DropdownULProps = {
//     list: {value: string, text: string, icon?: string}[],
//     hint: string
//     onItemClick: Function,
//     onEscape: Function
// };

export default class DropdownUL extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedIndex: 0
        };
        this.listHighlight = this.listHighlight.bind(this);
    }
    componentDidMount() {
        document.addEventListener("keydown", this.listHighlight);
    }
    componentWillUnmount() {
        document.removeEventListener("keydown", this.listHighlight);
    }

    listHighlight(event) {
        const keyCodeNum = event.which;
        let direction;
        let lateral = false;
        let enter;

        switch (keyCodeNum) {
            case (keyCode.Up):
                direction = -1;
                break;
            case (keyCode.Down):
                direction = 1;
                break;
            case (keyCode.Left):
                // TODO: check for inputs inside of lis
                // if ($(event.target).is('input')) {
                //     if ($(event.target).attr('type') === "number") {
                //         return;
                //     }
                //     if (($(event.target)[0]).selectionStart !== 0) {
                //         return;
                //     }
                // }
                lateral = true;
                break;
            case (keyCode.Right):
                // TODO: check for inputs inside of lis
                // if ($(event.target).is('input')) {
                //     return;
                // }
                lateral = true;
                break;
            case (keyCode.Enter):
                enter = true;
                break;
            case (keyCode.Escape):
            case (keyCode.Backspace):
                // TODO: check for inputs inside of lis
                // if ($(event.target).is('input')) {
                //     return;
                // }
                event.preventDefault();
                this.props.onEscape();
                return;
            default:
                return; // key not supported
        }
        event.preventDefault();

        if (!this.props.list.length) {
            return;
        }

        if (enter) {
            let item = this.props.list[this.state.selectedIndex];
            if (item) {
                this.props.onItemClick(item.value);
            }
        }

        if (lateral) {
            //TODO:
        } else {
            // skips over unavailable list items

            let list = this.props.list.filter((item) => {
                return !item.unavailable;
            });
            let numLis = list.length;
            let curItem = this.props.list[this.state.selectedIndex];
            let curIndex = list.indexOf(curItem);
            let newIndex = (curIndex + direction + numLis) % numLis;
            newIndex = this.props.list.indexOf(list[newIndex]);
            this.setState({
                selectedIndex: newIndex
            });
            // TODO: adjust scroll position if has scrollbar
        }
    }

    onItemMouseEnter(index) {
        this.setState({
            selectedIndex: index
        });
    }

    render() {
        const {list, onItemClick, hint} = this.props;
        let listHTML;
        if (list.length) {
            listHTML = list.map((item, i) => {
                return (
                    <ListItem
                        key={i}
                        onItemClick={() => onItemClick(item.value)}
                        text={item.text}
                        icon={item.icon}
                        onMouseEnter={() => {this.onItemMouseEnter(i)}}
                        isSelected={this.state.selectedIndex === i}
                    />
                )
            });
        } else {
            listHTML = <ListItem
                            className="hint"
                            text={hint}
                        />
        }

        return (
            <div className="list">
                <ul>
                    {listHTML}
                </ul>
            </div>
        )
    }

}

DropdownUL.defaultProps = {
    list: [],
    hint: "Empty",
    onItemClick: () => null,
    onEscape: () => null,
}

function ListItem({className, onItemClick, onMouseEnter, icon, text, isSelected }) {
    if (isSelected) {
        className += " selected";
    }

    return (
        <li
            className={className}
            onClick={onItemClick}
            onMouseEnter={onMouseEnter}
        >
            {icon ? <i className={"icon " + icon}></i> : null}
            <span>{text}</span>
        </li>
    )
}

ListItem.defaultProps = {
    text: "",
    onItemClick: () => null,
    className: "",
    index: 0,
    onMouseEnter: () => null,
    isSelected: false
};
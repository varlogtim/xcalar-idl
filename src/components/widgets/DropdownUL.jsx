import * as React from "react";

// type DropdownULProps = {
//     list: {value: string, text: string, icon?: string, className?: string}[],
//     hint: string
//     onItemClick: Function,
//     onEscape: Function
// };

export default class DropdownUL extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedIndex: 0,
            disableMouseEnter: false
        };
        this.listHighlight = this.listHighlight.bind(this);
        this.liRefs = this.props.list.map(() => {
            return React.createRef();
        });
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
        let horizontal = false;
        let vertical = false;
        let enter;

        switch (keyCodeNum) {
            case (keyCode.Up):
                direction = -1;
                vertical = true;
                break;
            case (keyCode.Down):
                direction = 1;
                vertical = true;
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
                horizontal = true;
                break;
            case (keyCode.Right):
                // TODO: check for inputs inside of lis
                // if ($(event.target).is('input')) {
                //     return;
                // }
                horizontal = true;
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

        if (horizontal) {
            //TODO:
        } else if (vertical) {
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
                selectedIndex: newIndex,
                disableMouseEnter: true
            });
            const element = this.liRefs[newIndex].current;
            // TODO: remove dependency on jquery
            $(element).scrollintoview({duration: 0});
            setTimeout(() => {
                // settimeout so mousenter isn't triggered on scroll
                this.setState({disableMouseEnter: false});
            }, 0);
        }
    }

    onItemMouseEnter(index) {
        if (this.state.disableMouseEnter) {
            return;
        }
        this.setState({
            selectedIndex: index
        });
    }

    render() {
        const {list, onItemClick, hint} = this.props;
        let listHTML;
        if (list.length) {
            listHTML = list.map((item, i) => {
                let className = "";
                if (this.state.selectedIndex === i) {
                    className += " selected";
                }
                if (item.className) {
                    className += (" " + item.className);
                }
                return (
                    <li
                        key={i}
                        ref={this.liRefs[i]}
                        className={className}
                        onClick={() => onItemClick(item.value)}
                        onMouseEnter={() => {this.onItemMouseEnter(i)}}
                    >
                        {item.icon ? <i className={"icon " + item.icon}></i> : null}
                        <span>{item.text}</span>
                    </li>
                )
            });
        } else {
            listHTML = <li
                            className="hint"
                        >{hint}</li>
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
};
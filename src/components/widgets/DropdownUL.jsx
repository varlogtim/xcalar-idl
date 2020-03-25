import * as React from "react";

// type DropdownULProps = {
//     list: {value: string, text: string, icon?: string}[],
//     hint: string
//     onItemClick: Function
// };

export default function DropdownUL(props) {
    const list = props.list || [];
    let listHTML;
    if (list.length) {
        listHTML = list.map((item, i) => {
            let icon;
            if (item.icon) {
                let iconClass = "icon " + item.icon;
                icon = <i className={iconClass}></i>;
            }
            return (
                <li key={i} onClick={() => {props.onItemClick(item.value)}}>
                    {icon}
                    <span>{item.text}</span>
                </li>
            )
        });
    } else {
        listHTML = (<li className="hint">{props.hint || ""}</li>)
    }
    return (
        <div className="list">
            <ul>
                {listHTML}
            </ul>
        </div>
    )
}
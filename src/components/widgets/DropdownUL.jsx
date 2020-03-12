import * as React from "react";

// type DropdownULProps = {
//     list: {value: string, text: string, icon?: string}[],
//     onItemClick: Function
// };

export default function DropdownUL (props) {
    const list = props.list || [];
    return (
        <div className="list">
            <ul>
                {list.map((item, i) => {
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
                })}
            </ul>
        </div>
    )
}
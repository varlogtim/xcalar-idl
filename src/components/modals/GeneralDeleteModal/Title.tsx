import * as React from "react";

type TitleProps = {
    name: string;
    className: string;
    children: string;
    onSort;
};
export default function Title(props: TitleProps) {
    const {name, className, onSort, children} = props;
    const classNames = ["title"];
    classNames.push(className);
    return (
        <div className={classNames.join(" ")}>
            <span
                className="label"
                onClick={() => onSort(name)}
            >
                {children}
            </span>
            <i
                className="icon xi-sort fa-15 xc-action"
                onClick={() => onSort(name)}
            ></i>
        </div>
    )
}
import * as React from "react";

type ButtonProps = {
    children: string | React.ReactChildren;
    className: string;
    onClick;
    ref?: React.RefObject<HTMLButtonElement>;
};
export default function Button(props: ButtonProps) {
    const { children, className, onClick } = props;
    const classNames: string[] = ["btn"];
    classNames.push(className);

    return (
        <button
            type="button"
            className={classNames.join(" ")}
            onClick={onClick}
        >
            { children }
        </button>
    )
}
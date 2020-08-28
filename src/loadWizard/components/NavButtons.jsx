import React from "react";

function LeftButton(props) {
    let {classNames = [], tooltip = "" } = props;
    classNames = [...classNames, "btn-secondary"];
    return (
        <div
            className="backButton"
            data-toggle="tooltip"
            data-container="body"
            data-placement="top auto"
            data-original-title={tooltip}
        >
            <Button {...props} classNames={classNames}></Button>
        </div>
    );
}

function RightButton(props) {
    const { tooltip = "" } = props;
    return (
        <div
            className="nextButton"
            data-toggle="tooltip"
            data-container="body"
            data-placement="top auto"
            data-original-title={tooltip}
        >
            <Button {...props}></Button>
        </div>
    );
}

function Button(props) {
    if (props == null) {
        return null;
    }

    const {
        label = "",
        onClick = () => {},
        disabled = false,
        classNames = []
    } = props;
    const btnClasses = ["btn", "btn-new"].concat(classNames);
    if (disabled) {
        btnClasses.push("btn-disabled");
    }
    return (
        <button
            className={btnClasses.join(' ')}
            onClick={onClick}
        >
            {label}
        </button>
    );
}

export default function NavButtons({ left, right }) {
    return (
        <div className="navButtons">
            {left != null ? <LeftButton {...left} /> : null}
            {right != null ? <RightButton {...right} /> : null}
        </div>
    );
}
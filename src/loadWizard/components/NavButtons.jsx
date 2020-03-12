import React from "react";

function LeftButton(props) {
    if (props == null) {
        return null;
    }

    const { label = '', onClick = () => {}, disabled = false } = props;
    const btnClasses = ['btn', 'btn-secondary'].concat(disabled ? ['btn-disabled'] : []);
    return (
        <div className="backButton">
            <button className={btnClasses.join(' ')} onClick={ () => { onClick(); }}>
                {label}
            </button>
        </div>
    );
}

function RightButton(props) {
    if (props == null) {
        return null;
    }

    const { label = '', onClick = () => {}, disabled = false } = props;
    const btnClasses = ['btn'].concat(disabled ? ['btn-disabled'] : []);
    return (
        <div className="nextButton">
            <button className={btnClasses.join(' ')} onClick={ () => { onClick(); }}>
                {label}
            </button>
        </div>
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
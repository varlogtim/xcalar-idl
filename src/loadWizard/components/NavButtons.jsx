import React from "react";

function LeftButton(props) {
    if (props == null) {
        return null;
    }

    const { label = '', onClick = () => {} } = props;
    return (
        <div className="backButton">
            <button className="btn btn-secondary" onClick={ () => { onClick(); }}>
                {label}
            </button>
        </div>
    );
}

function RightButton(props) {
    if (props == null) {
        return null;
    }

    const { label = '', onClick = () => {} } = props;
    return (
        <div className="nextButton">
            <button className="btn" onClick={ () => { onClick(); }}>
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
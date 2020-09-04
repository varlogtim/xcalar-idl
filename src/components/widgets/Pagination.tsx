import * as React from "react";

export default function Pagination(props) {
    const { onNext, onPrev } = props;
    return (<ul style={{listStyle: 'none', userSelect: 'none'}}>
        <NavButton onClick={onPrev}>{'< Previous'}</NavButton>
        <NavButton onClick={onNext}>{'Next >'}</NavButton>
    </ul>);

    function NavButton({ onClick, children }) {
        const style = {
            padding: '4px',
            display: 'inline',
            cursor: 'pointer',
        };
        if (onClick == null) {
            style["opacity"] = '0.3';
            style["pointerEvents"] = 'none';
        }
        return (<li style={style} onClick={() => {onClick()}}>{children}</li>);
    }
}

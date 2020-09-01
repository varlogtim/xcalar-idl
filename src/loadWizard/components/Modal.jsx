import React from 'react';

function Dialog({
    children,
    id
}) {
    let modalId = id ||"";
    return (
        <div id={modalId} className='modal' onClick={(e) => { e.stopPropagation(); }}>
            <section className="modal-content">{children}</section>
        </div>
    );
}

function Body({
    style = {},
    classNames = [],
    children
}) {
    const className = ['modal-body'].concat(classNames).join(' ');
    return <section style={style} className={className}>{children}</section>
}


function Header({
    onClose,
    children
}) {
    return (
        <header className='modal-header'>
            <span className="text">{children}</span>
            <div className="close" onClick={()=>{ onClose(); }}>
                <i className="icon xi-close" />
            </div>
        </header>
    );
}

function Footer({
    children
}) {
    return <section className="modal-footer">{children}</section>
}


export { Dialog, Header, Body, Footer};
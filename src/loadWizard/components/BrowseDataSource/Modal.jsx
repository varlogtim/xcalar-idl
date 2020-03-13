import React from 'react';

function Dialog({
    children
}) {
    return (
        <div className='modal' onClick={(e) => { e.stopPropagation(); }}>
            <section className="modal-content">{children}</section>
        </div>
    );
}

function Body({
    children
}) {
    return <section className="modal-body">{children}</section>
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


export { Dialog, Header, Body };
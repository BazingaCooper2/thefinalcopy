// Modal.js

import React from "react";


const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div className="outermodal">
            <div className="inmodal">
                <div style={{cursor: 'pointer'}} onClick={onClose}>X</div>  
                {children}
            </div>
        </div>
    );
};

export default Modal;
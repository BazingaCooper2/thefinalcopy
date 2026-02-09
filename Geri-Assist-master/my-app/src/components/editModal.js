// src/components/editModal.js
import React from "react";

const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    // Optional: Close if user clicks the dark background
    const handleOverlayClick = (e) => {
        if (e.target.className === "outermodal") {
            onClose();
        }
    };

    return (
        <div className="outermodal">
    <div className="inmodal">
        {/* Absolute positioned close button */}
        <div style={{
            position: 'absolute', 
            top: '15px', 
            right: '20px', 
            cursor: 'pointer',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: '#6b7280'
        }} onClick={onClose}>✕</div>  
        {children}
    </div>
</div>
    );
};

export default Modal;
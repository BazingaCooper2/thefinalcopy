import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";

export default function EmployeeSettingsModal({ show, onHide, settingKey, settingLabel, currentValue, empId, onUpdated }) {
    const [value, setValue] = useState(currentValue);
    console.log(empId);
    const saveUpdate = async () => {
        try {
            const res = await fetch(`http://127.0.0.1:5000/update_employee_settings/${empId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [settingKey]: value }),
            });

            const result = await res.json();

            if (result.status === "success") {
                onUpdated(settingKey, value);
                onHide();
            } else {
                alert("Error updating field");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to update employee setting");
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Edit {settingLabel}</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <Form.Group>
                    <Form.Label>{settingLabel}</Form.Label>
                    <Form.Control
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                </Form.Group>
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                <Button variant="primary" onClick={saveUpdate}>Save Changes</Button>
            </Modal.Footer>
        </Modal>
    );
}

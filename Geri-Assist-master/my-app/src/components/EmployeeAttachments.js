import React, { useState } from "react";
//import { FaFolder, FaFileAlt } from "react-icons/fa";
//import { BsThreeDotsVertical } from "react-icons/bs";

const EmployeeAttachments = ({ emp }) => {
    const [items, setItems] = useState([
        {
            name: "Wanda_O Brien_106336777_wall.pdf",
            modified: "2025-08-18 08:48",
            type: "file",
        },
        {
            name: "Wanda_O Brien_106336777_wallet.pdf",
            modified: "2025-08-18 08:48",
            type: "file",
        },
        { name: "Administration", modified: "-", type: "folder" },
        { name: "Human Resources", modified: "-", type: "folder" },
    ]);

    const [newFolder, setNewFolder] = useState("");

    const handleCreateFolder = () => {
        if (!newFolder.trim()) return;

        setItems((prev) => [
            ...prev,
            { name: newFolder, modified: "-", type: "folder" },
        ]);
        setNewFolder("");
    };

    return (
        <div className="mt-4">

            {/* ===========================  
          ATTACHMENTS PAGE HEADER  
      ============================ */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="fw-bold">Home</h5>

                <div className="d-flex gap-2">
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        data-bs-toggle="modal"
                        data-bs-target="#newFolderModal"
                    >
                        📁 New folder
                    </button>

                    <label className="btn btn-outline-primary btn-sm">
                        ⬆ Upload file here
                        <input type="file" className="d-none" />
                    </label>
                </div>
            </div>

            {/* ===========================  
          ATTACHMENTS TABLE  
      ============================ */}
            <div className="table-responsive shadow-sm border rounded bg-white">
                <table className="table mb-0">
                    <thead className="bg-light">
                        <tr>
                            <th className="w-50">Name</th>
                            <th>Last modified</th>
                            <th>Type</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index}>

                                {/* FILE / FOLDER NAME COLUMN */}
                                <td className="fw-semibold">
                                    {item.type === "folder" ? (
                                        <span className="text-primary" style={{ cursor: "pointer" }}>
                                            {/*<FaFolder className="me-2 text-warning" />*/}
                                            {item.name}
                                        </span>
                                    ) : (
                                        <>
                                            
                                            {item.name}
                                        </>
                                    )}
                                </td>

                                {/* LAST MODIFIED COLUMN */}
                                <td>{item.modified}</td>

                                {/* TYPE COLUMN */}
                                <td>{item.type}</td>

                                {/* ACTION MENU */}
                                <td className="text-end">
                                    <div className="dropdown">
                                        <button
                                            className="btn btn-light btn-sm"
                                            data-bs-toggle="dropdown"
                                        >
                                            {/*<BsThreeDotsVertical />*/}
                                        </button>

                                        <ul className="dropdown-menu dropdown-menu-end">
                                            <li>
                                                <button className="dropdown-item">Rename</button>
                                            </li>
                                            <li>
                                                <button className="dropdown-item text-danger">
                                                    Delete
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ===========================  
          NEW FOLDER MODAL  
      ============================ */}
            <div className="modal fade" id="newFolderModal">
                <div className="modal-dialog">
                    <div className="modal-content p-3">

                        <h5 className="fw-bold">Create New Folder</h5>

                        <input
                            className="form-control mt-2"
                            placeholder="Folder name"
                            value={newFolder}
                            onChange={(e) => setNewFolder(e.target.value)}
                        />

                        <div className="d-flex justify-content-end mt-3 gap-2">
                            <button
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                            >
                                Cancel
                            </button>

                            <button
                                className="btn btn-primary"
                                data-bs-dismiss="modal"
                                onClick={handleCreateFolder}
                            >
                                Create
                            </button>
                        </div>

                    </div>
                </div>
            </div>

        </div>
    );
};

export default EmployeeAttachments;

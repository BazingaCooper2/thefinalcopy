import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import API_URL from '../config/api';

export default function Logout() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        async function doLogout() {
            const token = localStorage.getItem("token");

            try {
                if (token) {
                    await fetch(`${API_URL}/logout`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                        }
                    });
                }
            } catch (err) {
                console.error("Logout API failed", err);
            } finally {
                // Clear frontend auth regardless of API success
                sessionStorage.removeItem("emp_id");
                logout();
                navigate("/login", { replace: true });
            }
        }

        doLogout();
    }, []);

    return null;
}

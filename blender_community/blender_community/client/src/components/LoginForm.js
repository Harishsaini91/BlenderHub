
// --- LoginForm.js ---
import React, { useState, useEffect } from 'react';
import axios from 'axios';

import "assets/styles/components/loginform.css";


const LoginForm = () => {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState("");

    useEffect(() => {
        const listener = (e) => {
            if (e.data.type === 'FILL_LOGIN') {
                setForm(e.data.payload);
            }
        };
        window.addEventListener('message', listener);
        return () => window.removeEventListener('message', listener);
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        // console.log(form);


        try {
            const res = await axios.post('http://localhost:5000/api/login', form);

            if (res.data?.user && res.data?.token) {
                const user = res.data.user;
                const token = res.data.token;

                console.log("✅ User logged in:", user);
                console.log("🔑 Token received:", token);

                // ✅ Save token for authenticated routes
                sessionStorage.setItem("token", token);
                localStorage.setItem("token", token);

                // ✅ Save user info
                sessionStorage.setItem("user", JSON.stringify(user));
                localStorage.setItem("user", JSON.stringify(user));

                // ✅ Optional: Attach token to user object
                user.token = token;

                // ✅ Notify parent window if using popup login
                window.opener.postMessage({ type: "LOGIN_SUCCESS", payload: user }, "*");

                // ✅ Close popup after success
                window.close();
            } else {
                setError("Invalid server response: Missing user or token.");
            }
        } catch (err) {
            console.error("Login error:", err.message);
            setError("Login failed. Please check credentials.");
        }
    }



      return (
    <div className="login-container">
        <div className="login-card">

            <form onSubmit={handleSubmit} className="space-y-4">
                <h2>Login</h2>

                {error && <div className="error-msg">{error}</div>}

                <input 
                    name="email" 
                    value={form.email} 
                    onChange={handleChange} 
                    placeholder="Email" 
                    required 
                />

                <input 
                    name="password" 
                    type="password" 
                    value={form.password} 
                    onChange={handleChange} 
                    placeholder="Password" 
                    required 
                />

                <button type="submit">Login</button>
            </form>

            <p className="switch-text">
                Don’t have an account?{" "}
                <span 
                    onClick={() => window.location.href = "/auth?mode=register"} 
                    className="switch-link"
                >
                    Register now
                </span>
            </p>

        </div>
    </div>
);

    };

    export default LoginForm;

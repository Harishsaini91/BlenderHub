import React, { useState } from 'react';
import axios from 'axios';
import "../assets/styles/components/loginform.css";

const RegisterForm = () => {
    const [form, setForm] = useState({ name: '', email: '', password: '', image: '' });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const formData = new FormData();
            formData.append("name", form.name);
            formData.append("email", form.email);
            formData.append("password", form.password);
            formData.append("image", form.image);

            await axios.post("http://localhost:5000/api/register", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            window.opener.postMessage({
                type: 'REGISTER_SUCCESS',
                payload: { email: form.email, password: form.password }
            }, "*");

            window.close();
        } catch (err) {
            console.error("Register Error:", err.response?.data || err.message);
            setError('Registration failed. ' + (err.response?.data?.message || 'Please try again.'));
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">

                <form onSubmit={handleSubmit} className="space-y-4">
                    <h2>Register</h2>
                    {error && <div className="error-msg">{error}</div>}

                    <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Name"
                        required
                    />

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

                    <input
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
                    />

                    <button type="submit" className="register-btn">
                        Register
                    </button>
                </form>

                <p className="switch-text">
                    Already have an account?{" "}
                    <span
                        onClick={() => window.location.href = "/auth?mode=login"}
                        className="switch-link"
                    >
                        Login here
                    </span>
                </p>

            </div>
        </div>
    );
};

export default RegisterForm;

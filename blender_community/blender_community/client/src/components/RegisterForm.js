
// --- RegisterForm.js ---
import React, { useState } from 'react';
import axios from 'axios';

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
            formData.append("image", form.image); // File

            for (let [key, value] of formData.entries()) {
                console.log(`${key}:`, value);
            }
            await axios.post('http://localhost:5000/api/register', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Send credentials back to login
            window.opener.postMessage({
                type: 'REGISTER_SUCCESS',
                payload: { email: form.email, password: form.password }
            }, '*');

            window.close();
        } catch (err) {
            console.error("Register Error:", err.response?.data || err.message);
            setError('Registration failed. ' + (err.response?.data?.message || 'Please try again.'));
        }

    };

    return (
        <>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <h2 className="text-xl font-bold">Register</h2>
                {error && <div className="text-red-500">{error}</div>}

                <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Name"
                    className="border p-2 w-full"
                    required
                />

                <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email"
                    className="border p-2 w-full"
                    required
                />

                <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password"
                    className="border p-2 w-full"
                    required
                />

                <input
                    type="file"
                    name="image"
                    accept="image/*"
                    placeholder='user image'
                    onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
                    className="border p-2 w-full"
                />

                <button type="submit" className="bg-blue-500 text-white px-4 py-2 w-full">Register</button>
            </form>




            <p>
                Already have an account?{" "}
                <span
                    onClick={() => window.location.href = "/auth?mode=login"}
                    className="switch-link"
                >
                    Login here
                </span>
            </p>



        </>
    );
};

export default RegisterForm;

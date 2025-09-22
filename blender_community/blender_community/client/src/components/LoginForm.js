
// --- LoginForm.js ---
import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

                if (res.data?.user) {
                    const user = res.data.user;

                    console.log(user);

                    // Save user session
                    sessionStorage.setItem("user", JSON.stringify(user));
                    localStorage.setItem("user", JSON.stringify(user));

                    // Inform main window
                    window.opener.postMessage({ type: "LOGIN_SUCCESS", payload: user }, "*");

                    // Close popup
                    window.close();
                } else {
                    setError("Invalid server response.");
                }
            } catch (err) {
                console.error("Login error:", err.message);
                setError("Login failed. Please check credentials.");
            }
        };

 

    return (
        <>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <h2 className="text-xl font-bold">Login</h2>
                {error && <div className="text-red-500">{error}</div>}
                <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="border p-2 w-full" required />
                <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" className="border p-2 w-full" required />
                <button type="submit" className="bg-green-500 text-white px-4 py-2 w-full">Login</button>
            </form>


            <p className="text-sm mt-2">
                Don’t have an account?{" "}
                <span
                    onClick={() => window.location.href = "/auth?mode=register"}
                    className="switch-link"
                >
                    Register now
                </span>
            </p>



        </>
    );
};

export default LoginForm;

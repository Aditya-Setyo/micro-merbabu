import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'

export default function Login() {
    const navigate = useNavigate()

    const [form, setForm] = useState({
        login: '',
        password: '',
    })

    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()

        setLoading(true)
        setError('')

        try {
            const response = await api.post('/login', form)

            localStorage.setItem('token', response.data.token)

            navigate('/profile')

        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Gagal menghubungkan ke server.'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-[75vh] flex items-center justify-center px-5">

            <form
                onSubmit={handleSubmit}
                className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md"
            >
                <h1 className="text-3xl font-bold text-green-900">
                    Login Pendaki
                </h1>

                <p className="text-gray-500 mt-2 mb-7">
                    Masuk untuk melakukan booking pendakian.
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <label className="block mb-2 font-medium">
                    Username / Email
                </label>

                <input
                    type="text"
                    required
                    value={form.login}
                    onChange={(e) =>
                        setForm({ ...form, login: e.target.value })
                    }
                    className="w-full border rounded-lg p-3 mb-5"
                    placeholder="Masukkan username atau email"
                />

                <label className="block mb-2 font-medium">
                    Password
                </label>

                <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                    }
                    className="w-full border rounded-lg p-3 mb-6"
                    placeholder="Masukkan password"
                />

                <button
                    disabled={loading}
                    className="w-full bg-green-800 hover:bg-green-900 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
                >
                    {loading ? 'Memproses...' : 'Login'}
                </button>

                <p className="text-center mt-6 text-gray-600">
                    Belum memiliki akun?
                    <Link
                        to="/register"
                        className="text-green-800 font-semibold ml-1"
                    >
                        Registrasi
                    </Link>
                </p>
            </form>
        </div>
    )
}
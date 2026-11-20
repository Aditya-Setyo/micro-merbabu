
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import {
    Mountain,
    Mail,
    LockKeyhole,
    Eye,
    EyeOff,
    ArrowRight,
    ShieldCheck,
    Loader2,
} from 'lucide-react'

export default function Login() {
    const navigate = useNavigate()

    const [form, setForm] = useState({
        login: '',
        password: '',
    })

    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

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
        <div className="min-h-[80vh] bg-gray-50 flex items-center justify-center px-4 py-10 sm:px-6">

            <div className="w-full max-w-6xl bg-white rounded-3xl shadow-xl overflow-hidden grid lg:grid-cols-2">

                {/* LEFT SIDE - IMAGE */}
                <div className="hidden lg:block relative min-h-[650px]">

                    <img
                        src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200"
                        alt="Pemandangan pegunungan"
                        className="absolute inset-0 w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-green-950 via-green-950/50 to-green-900/20" />

                    <div className="relative z-10 h-full flex flex-col justify-between p-12">

                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                                <Mountain size={27} className="text-white" />
                            </div>

                            <div>
                                <h2 className="text-xl font-extrabold text-white tracking-wider">
                                    MERBABU
                                </h2>
                                <p className="text-xs text-green-200 tracking-widest uppercase">
                                    Mountain Booking
                                </p>
                            </div>
                        </Link>

                        <div className="max-w-md">

                            <span className="inline-block px-4 py-2 bg-green-500/20 border border-green-300/30 rounded-full text-green-200 text-xs font-bold tracking-widest uppercase mb-6">
                                Welcome Back
                            </span>

                            <h1 className="text-5xl font-extrabold text-white leading-tight">
                                Petualanganmu
                                <span className="block text-green-300">
                                    Dimulai dari Sini.
                                </span>
                            </h1>

                            <p className="mt-6 text-gray-200 leading-relaxed">
                                Masuk ke akunmu untuk mengelola
                                reservasi, mempersiapkan perjalanan,
                                dan menikmati pengalaman pendakian
                                Gunung Merbabu.
                            </p>

                            <div className="flex items-center gap-3 mt-10 text-green-100">
                                <ShieldCheck size={23} className="text-green-300" />
                                <span className="text-sm">
                                    Sistem reservasi pendakian online
                                </span>
                            </div>

                        </div>

                        <p className="text-xs text-gray-300">
                            © 2026 Gunung Merbabu. Explore Nature, Preserve Beauty.
                        </p>

                    </div>
                </div>


                {/* RIGHT SIDE - LOGIN FORM */}
                <div className="flex items-center justify-center p-6 sm:p-10 lg:p-14">

                    <div className="w-full max-w-md">

                        {/* MOBILE LOGO */}
                        <Link
                            to="/"
                            className="lg:hidden flex items-center gap-3 mb-10"
                        >
                            <div className="w-11 h-11 bg-green-800 rounded-xl flex items-center justify-center">
                                <Mountain size={24} className="text-white" />
                            </div>

                            <div>
                                <h2 className="text-lg font-extrabold text-green-900">
                                    MERBABU
                                </h2>
                                <p className="text-[10px] text-gray-500 tracking-widest uppercase">
                                    Mountain Booking
                                </p>
                            </div>
                        </Link>

                        <div className="mb-9">

                            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                                <LockKeyhole size={27} className="text-green-800" />
                            </div>

                            <p className="text-xs font-bold tracking-[3px] text-green-700 uppercase mb-3">
                                Account Login
                            </p>

                            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                                Selamat Datang!
                            </h1>

                            <p className="text-gray-500 mt-3 leading-relaxed">
                                Silakan masuk menggunakan username
                                atau email dan password akunmu.
                            </p>

                        </div>


                        {/* ERROR MESSAGE */}
                        {error && (
                            <div
                                role="alert"
                                className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl mb-6 text-sm"
                            >
                                <ShieldCheck size={19} className="mt-0.5 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}


                        {/* FORM */}
                        <form onSubmit={handleSubmit} className="space-y-5">

                            {/* USERNAME / EMAIL */}
                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Username / Email
                                </label>

                                <div className="relative">

                                    <Mail
                                        size={19}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                    />

                                    <input
                                        type="text"
                                        required
                                        autoComplete="username"
                                        value={form.login}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                login: e.target.value,
                                            })
                                        }
                                        className="w-full border border-gray-200 bg-gray-50 rounded-xl pl-12 pr-4 py-4 text-sm outline-none transition focus:border-green-700 focus:bg-white focus:ring-4 focus:ring-green-100"
                                        placeholder="Masukkan username atau email"
                                    />

                                </div>
                            </div>


                            {/* PASSWORD */}
                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Password
                                </label>

                                <div className="relative">

                                    <LockKeyhole
                                        size={19}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                    />

                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        autoComplete="current-password"
                                        value={form.password}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                password: e.target.value,
                                            })
                                        }
                                        className="w-full border border-gray-200 bg-gray-50 rounded-xl pl-12 pr-12 py-4 text-sm outline-none transition focus:border-green-700 focus:bg-white focus:ring-4 focus:ring-green-100"
                                        placeholder="Masukkan password"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-800 transition"
                                        aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                    >
                                        {showPassword
                                            ? <EyeOff size={19} />
                                            : <Eye size={19} />
                                        }
                                    </button>

                                </div>
                            </div>


                            {/* SUBMIT BUTTON */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 bg-green-800 hover:bg-green-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-900/15 transition duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        Login Sekarang
                                        <ArrowRight size={19} />
                                    </>
                                )}
                            </button>

                        </form>


                        {/* REGISTER LINK */}
                        <div className="mt-8 text-center">

                            <p className="text-sm text-gray-500">
                                Belum memiliki akun?
                                <Link
                                    to="/register"
                                    className="text-green-800 font-bold ml-1 hover:text-green-600 transition"
                                >
                                    Registrasi Sekarang
                                </Link>
                            </p>

                        </div>


                        {/* BACK TO HOME */}
                        <div className="mt-8 pt-6 border-t border-gray-100 text-center">

                            <Link
                                to="/"
                                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-green-800 transition"
                            >
                                <ArrowRight size={15} className="rotate-180" />
                                Kembali ke Beranda
                            </Link>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    )
}

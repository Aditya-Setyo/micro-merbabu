import { Link, useNavigate } from 'react-router-dom'

export default function Navbar() {
    const navigate = useNavigate()
    const token = localStorage.getItem('token')

    const logout = async () => {
        try {
            const api = (await import('../services/api')).default
            await api.post('/logout')
        } catch (error) {
            console.error(error)
        }

        localStorage.removeItem('token')
        navigate('/login')
    }

    return (
        <nav className="bg-white shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

                <Link to="/" className="text-xl font-bold text-green-800">
                    MERBABU
                </Link>

                <div className="hidden md:flex gap-6 text-sm font-medium">
                    <Link to="/">Beranda</Link>
                    <Link to="/destinasi">Destinasi Wisata</Link>
                    <Link to="/panduan">Panduan Booking</Link>
                    <Link to="/kuota">Cek Kuota</Link>
                    <Link to="/berita">Berita</Link>
                    <Link to="/sop">SOP</Link>
                </div>

                <div className="flex gap-3">
                    {token ? (
                        <>
                            <Link
                                to="/profile"
                                className="text-green-800 font-semibold"
                            >
                                Profil
                            </Link>

                            <button
                                onClick={logout}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="px-4 py-2 text-green-800"
                            >
                                Login
                            </Link>

                            <Link
                                to="/register"
                                className="bg-green-800 text-white px-4 py-2 rounded-lg"
                            >
                                Registrasi
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}
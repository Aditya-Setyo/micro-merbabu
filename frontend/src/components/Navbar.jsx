
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
    Menu,
    X,
    Mountain,
    ChevronDown,
    UserRound,
    LogOut,
    UserCircle,
    Trees,
} from 'lucide-react'
import Logo from '../assets/logo.png'

export default function Navbar() {
    const navigate = useNavigate()
    const [isOpen, setIsOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)

    const token = localStorage.getItem('token')

    const navLinks = [
        { name: 'Beranda', path: '/' },
        { name: 'Destinasi Wisata', path: '/destinasi' },
        { name: 'Panduan Booking', path: '/panduan' },
        { name: 'Cek Kuota', path: '/kuota' },
        { name: 'Berita', path: '/berita' },
        { name: 'SOP', path: '/sop' },
    ]

    const logout = async () => {
        try {
            const api = (await import('../services/api')).default
            await api.post('/logout')
        } catch (error) {
            console.error('Logout error:', error)
        }

        localStorage.removeItem('token')
        setIsOpen(false)
        navigate('/login')
    }

    const linkClass = ({ isActive }) =>
        `relative py-2 text-sm font-medium transition-colors duration-200 ${isActive
            ? 'text-green-800'
            : 'text-gray-600 hover:text-green-800'
        }`

    const closeMenu = () => {
        setIsOpen(false)
        setProfileOpen(false)
    }

    return (
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                <div className="h-20 flex items-center justify-between">

                    {/* LOGO */}
                    <Link
                        to="/"
                        onClick={closeMenu}
                        className="flex items-center gap-3 group"
                    >
                        <div className="w-11 h-11 flex items-center justify-center shrink-0">
                            <img
                                src={Logo}
                                alt="Logo Gunung Merbabu"
                                className="w-full h-full object-contain"
                            />
                        </div>

                        <div>
                            <h1 className="text-xl font-extrabold tracking-wide text-green-900 leading-tight">
                                MERBABU
                            </h1>
                            <p className="text-[10px] font-semibold tracking-[2px] text-gray-500 uppercase">
                                Mountain Booking
                            </p>
                        </div>
                    </Link>

                    {/* DESKTOP NAVIGATION */}
                    <div className="hidden lg:flex items-center gap-7">
                        {navLinks.map((link) => (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                end={link.path === '/'}
                                className={linkClass}
                            >
                                {({ isActive }) => (
                                    <>
                                        {link.name}
                                        <span
                                            className={`absolute left-0 -bottom-1 h-0.5 bg-green-800 rounded-full transition-all duration-300 ${isActive
                                                    ? 'w-full'
                                                    : 'w-0'
                                                }`}
                                        />
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>

                    {/* DESKTOP AUTH */}
                    <div className="hidden lg:flex items-center gap-3">

                        {token ? (
                            <div className="relative">
                                <button
                                    onClick={() => setProfileOpen(!profileOpen)}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 text-green-900 hover:bg-green-100 transition"
                                >
                                    <UserCircle size={20} />
                                    <span className="text-sm font-semibold">
                                        Akun Saya
                                    </span>
                                    <ChevronDown
                                        size={16}
                                        className={`transition-transform ${profileOpen ? 'rotate-180' : ''
                                            }`}
                                    />
                                </button>

                                {profileOpen && (
                                    <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2">
                                        <Link
                                            to="/profile"
                                            onClick={() => setProfileOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-800"
                                        >
                                            <UserRound size={17} />
                                            Profil Saya
                                        </Link>

                                        <div className="border-t border-gray-100 my-1" />

                                        <button
                                            onClick={logout}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                                        >
                                            <LogOut size={17} />
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="px-4 py-2.5 text-sm font-semibold text-green-800 hover:text-green-600 transition"
                                >
                                    Login
                                </Link>

                                <Link
                                    to="/register"
                                    className="px-5 py-2.5 bg-green-800 text-white text-sm font-semibold rounded-xl shadow-md hover:bg-green-700 hover:shadow-lg transition"
                                >
                                    Registrasi
                                </Link>
                            </>
                        )}
                    </div>

                    {/* MOBILE MENU BUTTON */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="lg:hidden p-2.5 rounded-xl text-green-900 bg-green-50 hover:bg-green-100 transition"
                        aria-label={isOpen ? 'Tutup menu' : 'Buka menu'}
                        aria-expanded={isOpen}
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                </div>

                {/* MOBILE MENU */}
                {isOpen && (
                    <div className="lg:hidden border-t border-gray-100 py-4 animate-in fade-in slide-in-from-top-2 duration-200">

                        <div className="flex flex-col gap-1">

                            {navLinks.map((link) => (
                                <NavLink
                                    key={link.path}
                                    to={link.path}
                                    end={link.path === '/'}
                                    onClick={closeMenu}
                                    className={({ isActive }) =>
                                        `px-4 py-3 rounded-xl text-sm font-medium transition ${isActive
                                            ? 'bg-green-50 text-green-900'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-green-800'
                                        }`
                                    }
                                >
                                    {link.name}
                                </NavLink>
                            ))}

                        </div>

                        <div className="border-t border-gray-100 mt-4 pt-4 flex flex-col gap-2">

                            {token ? (
                                <>
                                    <Link
                                        to="/profile"
                                        onClick={closeMenu}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-green-900 hover:bg-green-50"
                                    >
                                        <UserRound size={19} />
                                        Profil Saya
                                    </Link>

                                    <button
                                        onClick={logout}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 text-left"
                                    >
                                        <LogOut size={19} />
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <Link
                                        to="/login"
                                        onClick={closeMenu}
                                        className="text-center py-3 rounded-xl border border-green-800 text-green-800 text-sm font-semibold hover:bg-green-50 transition"
                                    >
                                        Login
                                    </Link>

                                    <Link
                                        to="/register"
                                        onClick={closeMenu}
                                        className="text-center py-3 rounded-xl bg-green-800 text-white text-sm font-semibold hover:bg-green-700 transition"
                                    >
                                        Registrasi
                                    </Link>
                                </div>
                            )}

                        </div>

                        <div className="mt-5 px-4 py-3 bg-green-50 rounded-xl">
                            <div className="flex items-center gap-2 text-green-900">
                                <Trees size={18} />
                                <span className="text-xs font-semibold">
                                    Jelajahi Keindahan Gunung Merbabu
                                </span>
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </nav>
    )
}

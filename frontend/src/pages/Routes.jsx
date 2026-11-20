
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Mountain,
    MapPin,
    TentTree,
    Ticket,
    ArrowRight,
    Compass,
    CalendarCheck,
    RefreshCw,
    AlertCircle,
    Route,
    ShieldCheck
} from 'lucide-react'
import api from '../services/api'

const formatPrice = (price) => {
    const value = Number(price)

    if (!price || !Number.isFinite(value) || value <= 0) {
        return 'Tarif belum diatur'
    }

    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(value)
}

export default function RoutesPage() {
    const [routes, setRoutes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const fetchRoutes = async () => {
        setLoading(true)
        setError('')

        try {
            const response = await api.get('/hiking-routes')
            setRoutes(response.data.data || [])
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Gagal mengambil data jalur pendakian.'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        let active = true

        const loadRoutes = async () => {
            try {
                const response = await api.get('/hiking-routes')

                if (active) {
                    setRoutes(response.data.data || [])
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.message ||
                        'Gagal mengambil data jalur pendakian.'
                    )
                }
            } finally {
                if (active) {
                    setLoading(false)
                }
            }
        }

        loadRoutes()

        return () => {
            active = false
        }
    }, [])

    return (
        <main className="min-h-screen bg-gray-50">

            {/* Hero Section */}
            <section className="relative overflow-hidden bg-green-950 text-white">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -top-24 -right-20 w-96 h-96 rounded-full border-[40px] border-white" />
                    <div className="absolute -bottom-40 -left-20 w-96 h-96 rounded-full border-[40px] border-white" />
                </div>

                <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-16 md:py-24">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 bg-green-800/70 border border-green-700 rounded-full px-4 py-2 text-sm text-green-100">
                            <Mountain size={16} />
                            TAMAN NASIONAL GUNUNG MERBABU
                        </div>

                        <h1 className="text-4xl md:text-6xl font-bold mt-6 leading-tight">
                            Jelajahi Jalur
                            <span className="block text-green-300">
                                Pendakian Merbabu
                            </span>
                        </h1>

                        <p className="text-green-100 text-base md:text-lg mt-6 leading-relaxed max-w-2xl">
                            Temukan jalur pendakian resmi Gunung Merbabu.
                            Kenali informasi basecamp, lokasi, dan tarif
                            tiket sebelum merencanakan perjalananmu.
                        </p>

                        <div className="flex flex-wrap gap-3 mt-8">
                            <Link
                                to="/kuota"
                                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold px-6 py-3.5 rounded-xl transition"
                            >
                                <CalendarCheck size={19} />
                                Cek Kuota Pendakian
                            </Link>

                            <Link
                                to="/panduan"
                                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3.5 rounded-xl transition"
                            >
                                Panduan Booking
                                <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>

                    <div className="absolute right-10 bottom-10 hidden lg:block opacity-20">
                        <Mountain size={230} strokeWidth={0.7} />
                    </div>
                </div>
            </section>

            {/* Information Section */}
            <section className="max-w-7xl mx-auto px-5 sm:px-8 py-12">

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                    <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 bg-green-100 text-green-800 rounded-xl flex items-center justify-center">
                            <Mountain size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">
                                Jalur Pendakian
                            </p>
                            <p className="text-xl font-bold text-gray-900">
                                {loading ? '-' : `${routes.length} Jalur`}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center">
                            <Compass size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">
                                Informasi Resmi
                            </p>
                            <p className="text-xl font-bold text-gray-900">
                                Jalur Terdaftar
                            </p>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">
                                Sebelum Mendaki
                            </p>
                            <p className="text-xl font-bold text-gray-900">
                                Cek Kuota
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section Heading */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-green-700 font-semibold text-sm mb-2">
                            <Route size={17} />
                            PILIH JALUR PENDAKIAN
                        </div>

                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                            Daftar Jalur Resmi
                        </h2>

                        <p className="text-gray-500 mt-2 max-w-xl">
                            Pilih jalur yang sesuai dengan rencana perjalanan
                            dan persiapkan pendakian dengan baik.
                        </p>
                    </div>

                    <Link
                        to="/kuota"
                        className="inline-flex items-center justify-center gap-2 bg-green-800 hover:bg-green-900 text-white font-semibold px-5 py-3 rounded-xl transition"
                    >
                        <CalendarCheck size={18} />
                        Periksa Kuota
                    </Link>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="bg-white border border-gray-100 rounded-2xl py-20 flex flex-col items-center justify-center">
                        <RefreshCw
                            size={32}
                            className="text-green-700 animate-spin"
                        />
                        <p className="text-gray-600 font-medium mt-4">
                            Memuat data jalur pendakian...
                        </p>
                        <p className="text-gray-400 text-sm mt-1">
                            Mohon tunggu sebentar
                        </p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle size={25} />
                        </div>

                        <h3 className="font-bold text-red-800 mt-4">
                            Gagal Memuat Data
                        </h3>

                        <p className="text-red-600 text-sm mt-2">
                            {error}
                        </p>

                        <button
                            onClick={fetchRoutes}
                            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg mt-5 transition"
                        >
                            <RefreshCw size={16} />
                            Coba Lagi
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && routes.length === 0 && (
                    <div className="bg-white border border-gray-100 rounded-2xl py-20 text-center">
                        <Mountain
                            size={48}
                            className="text-gray-300 mx-auto"
                        />

                        <h3 className="text-lg font-bold text-gray-800 mt-4">
                            Belum Ada Jalur Pendakian
                        </h3>

                        <p className="text-gray-500 text-sm mt-2">
                            Informasi jalur pendakian belum tersedia.
                        </p>
                    </div>
                )}

                {/* Route Cards */}
                {!loading && !error && routes.length > 0 && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {routes.map((route, index) => (
                            <article
                                key={route.id}
                                className="group bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                            >
                                {/* Card Header */}
                                <div className="relative h-48 bg-gradient-to-br from-green-950 via-green-800 to-green-600 flex items-center justify-center overflow-hidden">
                                    <div className="absolute inset-0 opacity-10">
                                        <Mountain
                                            size={180}
                                            className="absolute -bottom-12 -right-8"
                                            strokeWidth={1}
                                        />
                                    </div>

                                    <div className="relative text-center text-white px-4">
                                        <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-3">
                                            <Mountain size={30} />
                                        </div>

                                        <p className="text-xs tracking-[0.2em] text-green-200 font-semibold">
                                            JALUR PENDAKIAN {index + 1}
                                        </p>

                                        <h3 className="text-3xl font-bold mt-1">
                                            {route.name}
                                        </h3>
                                    </div>

                                    <div className="absolute top-4 right-4 bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs px-3 py-1.5 rounded-full">
                                        Jalur Resmi
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900">
                                        Jalur {route.name}
                                    </h3>

                                    <div className="space-y-3 mt-5">
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 shrink-0 bg-green-50 text-green-700 rounded-lg flex items-center justify-center">
                                                <TentTree size={18} />
                                            </div>

                                            <div>
                                                <p className="text-xs text-gray-400 font-medium">
                                                    BASECAMP
                                                </p>
                                                <p className="text-sm text-gray-700 font-medium mt-0.5">
                                                    {route.basecamp || '-'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 shrink-0 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center">
                                                <MapPin size={18} />
                                            </div>

                                            <div>
                                                <p className="text-xs text-gray-400 font-medium">
                                                    LOKASI
                                                </p>
                                                <p className="text-sm text-gray-700 font-medium mt-0.5">
                                                    {route.location || '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm text-gray-500 leading-relaxed mt-5 min-h-[60px]">
                                        {route.description ||
                                            'Informasi mengenai jalur pendakian ini belum tersedia.'}
                                    </p>

                                    {/* Ticket Price */}
                                    <div className="border-t border-gray-100 mt-5 pt-5">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-xs text-gray-400 font-medium">
                                                    HARGA TIKET
                                                </p>

                                                <p className="text-lg font-bold text-green-800 mt-1">
                                                    {formatPrice(route.ticket_price)}
                                                </p>
                                            </div>

                                            <div className="w-11 h-11 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
                                                <Ticket size={22} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <Link
                                        to={`/kuota?route=${route.id}`}
                                        className="flex items-center justify-center gap-2 w-full bg-green-800 hover:bg-green-900 text-white font-semibold rounded-xl py-3.5 mt-5 transition"
                                    >
                                        Periksa Kuota
                                        <ArrowRight
                                            size={18}
                                            className="group-hover:translate-x-1 transition-transform"
                                        />
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {/* Bottom CTA */}
            <section className="bg-green-950 text-white mt-8">
                <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 md:py-16 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <p className="text-green-300 text-sm font-semibold tracking-wider">
                            SIAP UNTUK MENDAKI?
                        </p>

                        <h2 className="text-2xl md:text-3xl font-bold mt-2">
                            Rencanakan Pendakianmu Sekarang
                        </h2>

                        <p className="text-green-100 mt-2 max-w-xl">
                            Pastikan kuota tersedia dan lengkapi persyaratan
                            sebelum melakukan pemesanan tiket pendakian.
                        </p>
                    </div>

                    <Link
                        to="/kuota"
                        className="shrink-0 inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white font-bold px-7 py-4 rounded-xl transition"
                    >
                        Cek Ketersediaan Kuota
                        <ArrowRight size={19} />
                    </Link>
                </div>
            </section>
        </main>
    )
}

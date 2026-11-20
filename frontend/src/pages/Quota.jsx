
import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
    CalendarDays,
    Mountain,
    Users,
    CheckCircle2,
    AlertCircle,
    LoaderCircle,
    ArrowRight,
    RefreshCw
} from 'lucide-react'
import api from '../services/api'

const getToday = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

const formatDate = (date) => {
    if (!date) return '-'

    return new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })
}

export default function QuotaPage() {
    const [searchParams] = useSearchParams()

    const [routes, setRoutes] = useState([])
    const [routeId, setRouteId] = useState(
        searchParams.get('route') || ''
    )
    const [date, setDate] = useState(getToday())
    const [quota, setQuota] = useState(null)

    const [loadingRoutes, setLoadingRoutes] = useState(true)
    const [loadingQuota, setLoadingQuota] = useState(false)
    const [error, setError] = useState('')
    const [routeError, setRouteError] = useState('')

    // Mengambil daftar jalur pendakian
    useEffect(() => {
        let active = true

        const fetchRoutes = async () => {
            try {
                setLoadingRoutes(true)
                setRouteError('')

                const response = await api.get('/hiking-routes')
                const data = response.data.data || []

                if (!active) return

                setRoutes(data)

                if (data.length > 0) {
                    const requestedRoute = searchParams.get('route')
                    const routeExists = data.some(
                        route => String(route.id) === requestedRoute
                    )

                    if (requestedRoute && routeExists) {
                        setRouteId(requestedRoute)
                    } else {
                        setRouteId(String(data[0].id))
                    }
                } else {
                    setRouteId('')
                }
            } catch (err) {
                if (active) {
                    setRouteError(
                        err.response?.data?.message ||
                        'Gagal mengambil daftar jalur pendakian.'
                    )
                }
            } finally {
                if (active) setLoadingRoutes(false)
            }
        }

        fetchRoutes()

        return () => {
            active = false
        }
    }, [])

    // Mengambil informasi kuota
    useEffect(() => {
        if (!routeId || !date) {
            setQuota(null)
            return
        }

        let active = true

        const fetchQuota = async () => {
            try {
                setLoadingQuota(true)
                setError('')
                setQuota(null)

                const response = await api.get(
                    `/hiking-routes/${routeId}/quota`,
                    {
                        params: { date }
                    }
                )

                if (active) {
                    setQuota(response.data.data)
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.message ||
                        'Gagal mengambil informasi kuota.'
                    )
                }
            } finally {
                if (active) {
                    setLoadingQuota(false)
                }
            }
        }

        fetchQuota()

        return () => {
            active = false
        }
    }, [routeId, date])

    const percentage = quota && Number(quota.quota_total) > 0
        ? Math.min(
            100,
            Math.max(
                0,
                (Number(quota.quota_used) / Number(quota.quota_total)) * 100
            )
        )
        : 0

    const handleRetry = () => {
        window.location.reload()
    }

    return (
        <main className="min-h-screen bg-gray-50">

            {/* Hero */}
            <section className="relative overflow-hidden bg-green-950 text-white">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full border-[40px] border-white" />
                    <div className="absolute -right-10 -top-10 w-72 h-72 rounded-full border border-white" />
                </div>

                <div className="relative max-w-6xl mx-auto px-5 py-16 md:py-20">
                    <div className="flex items-center gap-2 text-green-300 text-sm font-semibold tracking-wider">
                        INFORMASI PENDAKIAN
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold mt-4">
                        Cek Kuota Pendakian
                    </h1>

                    <p className="text-green-100 mt-4 max-w-2xl leading-relaxed">
                        Periksa ketersediaan kuota pendakian Gunung Merbabu
                        berdasarkan jalur dan tanggal yang kamu inginkan.
                    </p>
                </div>
            </section>

            {/* Main Content */}
            <section className="max-w-5xl mx-auto px-5 py-10 md:py-14">

                {/* Filter */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-gray-900">
                            Pilih Jalur dan Tanggal
                        </h2>

                        <p className="text-sm text-gray-500 mt-1">
                            Tentukan jalur dan tanggal untuk melihat kuota.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <Mountain size={16} />
                                Jalur Pendakian
                            </label>

                            <select
                                value={routeId}
                                onChange={(e) => setRouteId(e.target.value)}
                                disabled={loadingRoutes || routes.length === 0}
                                className="w-full border border-gray-300 rounded-xl px-4 py-3.5 bg-white outline-none focus:ring-2 focus:ring-green-700 focus:border-green-700 disabled:bg-gray-100"
                            >
                                <option value="">
                                    Pilih jalur pendakian
                                </option>

                                {routes.map(route => (
                                    <option
                                        key={route.id}
                                        value={route.id}
                                    >
                                        {route.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <CalendarDays size={16} />
                                Tanggal Pendakian
                            </label>

                            <input
                                type="date"
                                min={getToday()}
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full border border-gray-300 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-green-700 focus:border-green-700"
                            />
                        </div>
                    </div>

                    {/* Route Loading */}
                    {loadingRoutes && (
                        <div className="flex items-center gap-3 mt-6 text-gray-500">
                            <LoaderCircle size={19} className="animate-spin" />
                            <p className="text-sm">
                                Mengambil daftar jalur pendakian...
                            </p>
                        </div>
                    )}

                    {/* Route Error */}
                    {routeError && (
                        <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={18} />
                                <p className="text-sm font-medium">{routeError}</p>
                            </div>

                            <button
                                onClick={handleRetry}
                                className="text-sm font-semibold mt-3 flex items-center gap-2 hover:underline"
                            >
                                <RefreshCw size={14} />
                                Muat ulang halaman
                            </button>
                        </div>
                    )}

                    {/* No Routes */}
                    {!loadingRoutes && !routeError && routes.length === 0 && (
                        <div className="mt-6 p-5 rounded-xl bg-amber-50 border border-amber-100 text-amber-800">
                            <p className="font-semibold">
                                Belum ada jalur pendakian tersedia.
                            </p>
                            <p className="text-sm mt-1">
                                Silakan coba kembali beberapa saat lagi.
                            </p>
                        </div>
                    )}

                    {/* Quota Loading */}
                    {loadingQuota && (
                        <div className="mt-8 py-10 flex flex-col items-center text-center">
                            <LoaderCircle
                                size={35}
                                className="text-green-700 animate-spin"
                            />

                            <p className="font-semibold text-gray-700 mt-4">
                                Memeriksa ketersediaan kuota
                            </p>

                            <p className="text-sm text-gray-500 mt-1">
                                Mohon tunggu sebentar...
                            </p>
                        </div>
                    )}

                    {/* Quota Error */}
                    {error && !loadingQuota && (
                        <div className="mt-8 p-5 rounded-xl bg-red-50 border border-red-100 text-red-700">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={20} />
                                <p className="font-semibold">
                                    Gagal memuat kuota
                                </p>
                            </div>

                            <p className="text-sm mt-2">{error}</p>
                        </div>
                    )}

                    {/* Quota Result */}
                    {quota && !loadingQuota && !error && (
                        <div className="mt-8 border-t border-gray-100 pt-8">

                            {/* Route Information */}
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Jalur pendakian
                                    </p>

                                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                        {quota.route_name}
                                    </h3>
                                </div>

                                <div className="md:text-right">
                                    <p className="text-sm text-gray-500">
                                        Tanggal pendakian
                                    </p>

                                    <p className="font-semibold text-gray-800 mt-1">
                                        {formatDate(quota.booking_date)}
                                    </p>
                                </div>
                            </div>

                            {/* Quota Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Users size={17} />
                                        <p className="text-sm">Kuota total</p>
                                    </div>

                                    <p className="text-3xl font-bold text-gray-900 mt-3">
                                        {quota.quota_total}
                                    </p>
                                </div>

                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Users size={17} />
                                        <p className="text-sm">Terpakai</p>
                                    </div>

                                    <p className="text-3xl font-bold text-gray-900 mt-3">
                                        {quota.quota_used}
                                    </p>
                                </div>

                                <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                                    <div className="flex items-center gap-2 text-green-700">
                                        <CheckCircle2 size={17} />
                                        <p className="text-sm">Kuota tersisa</p>
                                    </div>

                                    <p className="text-3xl font-bold text-green-800 mt-3">
                                        {quota.quota_remaining}
                                    </p>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="mt-8">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-sm font-medium text-gray-700">
                                        Penggunaan kuota
                                    </p>

                                    <p className="text-sm font-bold text-gray-900">
                                        {percentage.toFixed(1)}%
                                    </p>
                                </div>

                                <div
                                    className="w-full bg-gray-200 h-3 rounded-full overflow-hidden"
                                    role="progressbar"
                                    aria-valuenow={percentage}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                >
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${percentage >= 100
                                            ? 'bg-red-600'
                                            : percentage >= 75
                                                ? 'bg-amber-500'
                                                : 'bg-green-700'
                                            }`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>

                            {/* Availability Status */}
                            <div className={`mt-8 rounded-xl p-5 border ${quota.is_available
                                ? 'bg-green-50 border-green-100 text-green-800'
                                : 'bg-red-50 border-red-100 text-red-800'
                                }`}>
                                <div className="flex items-center gap-3">
                                    {quota.is_available
                                        ? <CheckCircle2 size={23} />
                                        : <AlertCircle size={23} />
                                    }

                                    <p className="font-bold text-lg">
                                        {quota.is_available
                                            ? 'Kuota masih tersedia'
                                            : 'Kuota telah penuh'
                                        }
                                    </p>
                                </div>

                                <p className="text-sm mt-2 leading-relaxed">
                                    {quota.is_available
                                        ? 'Kuota masih tersedia untuk tanggal ini. Kamu dapat melanjutkan ke proses booking.'
                                        : 'Kuota pendakian untuk tanggal ini telah penuh. Silakan pilih tanggal lainnya.'
                                    }
                                </p>
                            </div>

                            {/* Booking Button */}
                            {quota.is_available && (
                                <Link
                                    to={`/booking?route=${quota.route_id}&date=${quota.booking_date}`}
                                    className="flex items-center justify-center gap-2 w-full bg-green-800 text-white font-semibold rounded-xl py-4 mt-5 hover:bg-green-900 transition-colors"
                                >
                                    Booking Pendakian
                                    <ArrowRight size={18} />
                                </Link>
                            )}
                        </div>
                    )}
                </div>

                {/* Information */}
                <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-5">
                    <div className="flex gap-3">
                        <AlertCircle size={20} className="text-blue-700 shrink-0 mt-0.5" />

                        <div>
                            <h3 className="font-semibold text-blue-900">
                                Informasi Kuota
                            </h3>

                            <p className="text-sm text-blue-800 mt-1 leading-relaxed">
                                Informasi kuota ditampilkan berdasarkan data
                                yang tersedia pada sistem. Pastikan kembali
                                ketersediaan kuota sebelum melakukan pemesanan.
                            </p>
                        </div>
                    </div>
                </div>

            </section>
        </main>
    )
}

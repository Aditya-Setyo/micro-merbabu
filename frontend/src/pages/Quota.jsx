
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { Link } from 'react-router-dom'

const getToday = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
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

    useEffect(() => {
        const fetchRoutes = async () => {
            try {
                const response = await api.get('/hiking-routes')
                const data = response.data.data || []

                setRoutes(data)

                if (!routeId && data.length > 0) {
                    setRouteId(String(data[0].id))
                }
            } catch (err) {
                setError('Gagal mengambil daftar jalur.')
            } finally {
                setLoadingRoutes(false)
            }
        }

        fetchRoutes()
    }, [])

    useEffect(() => {
        if (!routeId || !date) return

        const fetchQuota = async () => {
            setLoadingQuota(true)
            setError('')
            setQuota(null)

            try {
                const response = await api.get(
                    `/hiking-routes/${routeId}/quota`,
                    {
                        params: { date }
                    }
                )

                setQuota(response.data.data)
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                    'Gagal mengambil informasi kuota.'
                )
            } finally {
                setLoadingQuota(false)
            }
        }

        fetchQuota()
    }, [routeId, date])

    const percentage = quota
        ? Math.min(
            100,
            (quota.quota_used / quota.quota_total) * 100
        )
        : 0

    return (
        <main className="min-h-screen bg-gray-50">
            <section className="bg-green-950 text-white px-5 py-14">
                <div className="max-w-4xl mx-auto">
                    <p className="text-green-300 font-semibold">
                        INFORMASI PENDAKIAN
                    </p>

                    <h1 className="text-3xl md:text-4xl font-bold mt-3">
                        Cek Kuota Pendakian
                    </h1>

                    <p className="text-green-100 mt-3">
                        Periksa ketersediaan kuota berdasarkan jalur
                        dan tanggal pendakian.
                    </p>
                </div>
            </section>

            <section className="max-w-4xl mx-auto px-5 py-12">
                <div className="bg-white rounded-2xl border shadow-sm p-6 md:p-8">
                    <h2 className="text-xl font-bold mb-6">
                        Pilih Jalur dan Tanggal
                    </h2>

                    <div className="grid md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold mb-2">
                                Jalur Pendakian
                            </label>

                            <select
                                value={routeId}
                                onChange={(e) => setRouteId(e.target.value)}
                                disabled={loadingRoutes}
                                className="w-full border rounded-lg px-4 py-3 bg-white"
                            >
                                <option value="">
                                    Pilih jalur
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
                            <label className="block text-sm font-semibold mb-2">
                                Tanggal Pendakian
                            </label>

                            <input
                                type="date"
                                min={getToday()}
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full border rounded-lg px-4 py-3"
                            />
                        </div>
                    </div>

                    {loadingQuota && (
                        <p className="text-gray-500 mt-8">
                            Memeriksa ketersediaan kuota...
                        </p>
                    )}

                    {error && (
                        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg">
                            {error}
                        </div>
                    )}

                    {quota && !loadingQuota && (
                        <div className="mt-8 border-t pt-8">
                            <div className="flex flex-wrap justify-between gap-3">
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Jalur pendakian
                                    </p>

                                    <h3 className="text-2xl font-bold mt-1">
                                        {quota.route_name}
                                    </h3>
                                </div>

                                <div className="text-right">
                                    <p className="text-sm text-gray-500">
                                        Tanggal
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {quota.booking_date}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 mt-8">
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500">
                                        Kuota total
                                    </p>

                                    <p className="text-2xl font-bold mt-2">
                                        {quota.quota_total}
                                    </p>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500">
                                        Terpakai
                                    </p>

                                    <p className="text-2xl font-bold mt-2">
                                        {quota.quota_used}
                                    </p>
                                </div>

                                <div className="bg-green-50 rounded-xl p-4">
                                    <p className="text-xs text-green-700">
                                        Tersisa
                                    </p>

                                    <p className="text-2xl font-bold text-green-800 mt-2">
                                        {quota.quota_remaining}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600">
                                        Penggunaan kuota
                                    </span>

                                    <span className="font-semibold">
                                        {percentage.toFixed(1)}%
                                    </span>
                                </div>

                                <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                                    <div
                                        className="bg-green-700 h-3 rounded-full transition-all"
                                        style={{
                                            width: `${percentage}%`
                                        }}
                                    />
                                </div>
                            </div>

                            <div className={`mt-8 rounded-xl p-5 ${quota.is_available
                                    ? 'bg-green-50 text-green-800'
                                    : 'bg-red-50 text-red-800'
                                }`}>
                                <p className="font-bold">
                                    {quota.is_available
                                        ? 'Kuota masih tersedia'
                                        : 'Kuota telah penuh'}
                                </p>

                                <p className="text-sm mt-1">
                                    {quota.is_available
                                        ? 'Kamu dapat melanjutkan ke proses booking setelah fitur pemesanan tersedia.'
                                        : 'Silakan pilih tanggal pendakian lainnya.'}
                                </p>
                            </div>
                            {quota.is_available && (
                                <Link
                                    to={`/booking?route=${quota.route_id}`}
                                    className="block text-center bg-green-800 text-white rounded-lg py-3 mt-5 hover:bg-green-900"
                                >
                                    Booking Pendakian
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </main>
    )
}

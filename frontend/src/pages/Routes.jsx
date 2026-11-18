
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const formatPrice = (price) => {
    const value = Number(price)

    if (!value) return 'Tarif belum diatur'

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

    useEffect(() => {
        const fetchRoutes = async () => {
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

        fetchRoutes()
    }, [])

    return (
        <main className="min-h-screen bg-gray-50">
            <section className="bg-green-950 text-white px-5 py-16">
                <div className="max-w-6xl mx-auto">
                    <p className="text-green-300 font-semibold tracking-wider">
                        TAMAN NASIONAL GUNUNG MERBABU
                    </p>

                    <h1 className="text-3xl md:text-5xl font-bold mt-4">
                        Jalur Pendakian
                    </h1>

                    <p className="text-green-100 mt-4 max-w-2xl">
                        Pilih jalur pendakian yang sesuai dengan rencana
                        perjalananmu. Periksa informasi jalur dan kuota
                        sebelum melakukan pemesanan.
                    </p>
                </div>
            </section>

            <section className="max-w-6xl mx-auto px-5 py-12">
                <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Daftar Jalur Resmi
                        </h2>

                        <p className="text-gray-500 mt-1">
                            Informasi jalur dari Booking Service.
                        </p>
                    </div>

                    <Link
                        to="/kuota"
                        className="bg-green-800 text-white px-5 py-3 rounded-lg hover:bg-green-900"
                    >
                        Cek Kuota
                    </Link>
                </div>

                {loading && (
                    <p className="text-gray-500">
                        Memuat data jalur pendakian...
                    </p>
                )}

                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                        {error}
                    </div>
                )}

                {!loading && !error && routes.length === 0 && (
                    <p className="text-gray-500">
                        Belum ada jalur pendakian yang tersedia.
                    </p>
                )}

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {routes.map((route, index) => (
                        <article
                            key={route.id}
                            className="bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition"
                        >
                            <div className="h-44 bg-gradient-to-br from-green-900 to-green-600 flex items-center justify-center">
                                <div className="text-center text-white">
                                    <p className="text-sm text-green-100">
                                        JALUR PENDAKIAN
                                    </p>

                                    <h3 className="text-4xl font-bold mt-2">
                                        {route.name}
                                    </h3>
                                </div>
                            </div>

                            <div className="p-6">
                                <h3 className="text-xl font-bold">
                                    Jalur {route.name}
                                </h3>

                                <p className="text-sm text-gray-500 mt-2">
                                    Basecamp: {route.basecamp || '-'}
                                </p>

                                <p className="text-sm text-gray-500 mt-1">
                                    Lokasi: {route.location || '-'}
                                </p>

                                <p className="text-gray-600 text-sm mt-4 min-h-12">
                                    {route.description ||
                                        'Informasi jalur belum tersedia.'}
                                </p>

                                <div className="border-t mt-5 pt-4">
                                    <p className="text-xs text-gray-500">
                                        Harga tiket
                                    </p>

                                    <p className="font-bold text-green-800 text-lg mt-1">
                                        {formatPrice(route.ticket_price)}
                                    </p>
                                </div>

                                <Link
                                    to={`/kuota?route=${route.id}`}
                                    className="block text-center bg-green-800 text-white rounded-lg py-3 mt-5 hover:bg-green-900"
                                >
                                    Periksa Kuota
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    )
}

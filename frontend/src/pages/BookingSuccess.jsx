
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'

export default function BookingSuccess() {
    const { id } = useParams()

    const [booking, setBooking] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                const response = await api.get(`/bookings/${id}`)
                setBooking(response.data.data)
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                    'Gagal mengambil detail booking.'
                )
            } finally {
                setLoading(false)
            }
        }

        fetchBooking()
    }, [id])

    const formatPrice = value =>
        new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(Number(value || 0))

    if (loading) {
        return <div className="p-10 text-center">Memuat booking...</div>
    }

    if (error || !booking) {
        return (
            <div className="max-w-xl mx-auto p-10 text-center">
                <p className="text-red-600">{error || 'Booking tidak ditemukan.'}</p>
                <Link to="/profile" className="text-green-800 underline mt-4 inline-block">
                    Kembali ke profil
                </Link>
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-gray-50 px-5 py-12">
            <div className="max-w-2xl mx-auto bg-white border rounded-2xl p-6 md:p-10">

                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-3xl mx-auto">
                        ✓
                    </div>

                    <h1 className="text-2xl font-bold mt-5">
                        Booking Berhasil Dibuat
                    </h1>

                    <p className="text-gray-500 mt-2">
                        Data pemesanan telah tersimpan. Silakan lanjutkan
                        ke proses pembayaran pada tahap berikutnya.
                    </p>
                </div>

                <div className="bg-green-50 rounded-xl p-5 mt-8 text-center">
                    <p className="text-sm text-green-700">
                        Kode Booking
                    </p>

                    <p className="text-2xl font-bold text-green-900 mt-2">
                        {booking.booking_code}
                    </p>
                </div>

                <div className="border-t mt-8 pt-6 space-y-4">
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Jalur</span>
                        <strong>{booking.hiking_route?.name || '-'}</strong>
                    </div>

                    <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Tanggal</span>
                        <strong>
                            {String(booking.booking_date).slice(0, 10)}
                        </strong>
                    </div>

                    <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Durasi</span>
                        <strong>{booking.duration_days} hari</strong>
                    </div>

                    <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Jumlah pendaki</span>
                        <strong>{booking.member_count} orang</strong>
                    </div>

                    <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Status</span>
                        <strong className="text-orange-600">
                            {booking.status}
                        </strong>
                    </div>

                    <div className="border-t pt-5 flex justify-between gap-4 text-lg">
                        <strong>Total biaya</strong>
                        <strong className="text-green-800">
                            {formatPrice(booking.total_price)}
                        </strong>
                    </div>
                </div>

                <div className="bg-yellow-50 text-yellow-900 rounded-xl p-4 mt-7 text-sm">
                    <strong>Informasi pembayaran</strong>
                    <p className="mt-1">
                        Booking ini berstatus menunggu pembayaran.
                        Batas pembayaran: 15 menit sejak booking dibuat.
                        Pembayaran belum tersedia pada tahap pengembangan ini.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mt-8">
                    <Link
                        to="/profile"
                        className="text-center border border-green-800 text-green-800 font-semibold py-3 rounded-lg"
                    >
                        Riwayat Booking
                    </Link>

                    <Link
                        to="/destinasi"
                        className="text-center bg-green-800 text-white font-semibold py-3 rounded-lg"
                    >
                        Kembali ke Jalur
                    </Link>
                </div>
            </div>
        </main>
    )
}

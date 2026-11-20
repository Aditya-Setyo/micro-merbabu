
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
    CheckCircle2,
    AlertCircle,
    LoaderCircle,
    Mountain,
    CalendarDays,
    Clock,
    Users,
    CreditCard,
    Receipt,
    ArrowRight,
    RefreshCw,
    Copy,
    Info
} from 'lucide-react'
import api from '../services/api'

const formatPrice = (value) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value || 0))
}

const formatDate = (value) => {
    if (!value) return '-'

    const date = String(value).slice(0, 10)
    const parsedDate = new Date(`${date}T00:00:00`)

    if (Number.isNaN(parsedDate.getTime())) return date

    return parsedDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })
}

const getStatus = (status) => {
    const value = String(status || '').toLowerCase()

    if (['paid', 'success', 'confirmed', 'berhasil', 'dikonfirmasi'].includes(value)) {
        return {
            label: status,
            className: 'bg-green-100 text-green-800'
        }
    }

    if (['cancelled', 'canceled', 'failed', 'dibatalkan', 'gagal'].includes(value)) {
        return {
            label: status,
            className: 'bg-red-100 text-red-800'
        }
    }

    return {
        label: status || 'Menunggu Pembayaran',
        className: 'bg-amber-100 text-amber-800'
    }
}

function DetailItem({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-10 h-10 shrink-0 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                <Icon size={19} />
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-500">{label}</p>
                <p className="font-semibold text-gray-900 mt-1 break-words">
                    {value || '-'}
                </p>
            </div>
        </div>
    )
}

export default function BookingSuccess() {
    const { id } = useParams()

    const [booking, setBooking] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const fetchBooking = async () => {
        try {
            setLoading(true)
            setError('')

            const response = await api.get(`/bookings/${id}`)
            setBooking(response.data.data)
        } catch (err) {
            console.error(err)

            setError(
                err.response?.data?.message ||
                'Gagal mengambil detail booking.'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBooking()
    }, [id])

    const copyBookingCode = async () => {
        if (!booking?.booking_code) return

        try {
            await navigator.clipboard.writeText(booking.booking_code)
        } catch (err) {
            console.error('Gagal menyalin kode booking:', err)
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
                <div className="text-center">
                    <LoaderCircle
                        size={40}
                        className="animate-spin text-green-800 mx-auto"
                    />

                    <h2 className="font-semibold text-gray-800 mt-5">
                        Memuat Detail Booking
                    </h2>

                    <p className="text-sm text-gray-500 mt-2">
                        Mohon tunggu, sedang mengambil data pemesanan.
                    </p>
                </div>
            </main>
        )
    }

    if (error || !booking) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
                <div className="max-w-md w-full bg-white border rounded-2xl p-8 text-center shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                        <AlertCircle size={30} />
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mt-5">
                        Booking Tidak Ditemukan
                    </h2>

                    <p className="text-sm text-gray-500 mt-2">
                        {error || 'Data booking tidak tersedia.'}
                    </p>

                    <button
                        onClick={fetchBooking}
                        className="inline-flex items-center gap-2 bg-green-800 text-white px-5 py-3 rounded-xl mt-6 hover:bg-green-900 transition"
                    >
                        <RefreshCw size={17} />
                        Coba Lagi
                    </button>

                    <Link
                        to="/profile"
                        className="block text-green-800 font-semibold text-sm mt-5 hover:underline"
                    >
                        Kembali ke Profil
                    </Link>
                </div>
            </main>
        )
    }

    const status = getStatus(booking.status)

    return (
        <main className="min-h-screen bg-gray-50">

            {/* Header */}
            <section className="bg-green-950 text-white">
                <div className="max-w-4xl mx-auto px-5 py-10 md:py-14">
                    <div className="flex items-center gap-2 text-green-300 text-sm font-semibold tracking-wider">
                        <Mountain size={18} />
                        SISTEM BOOKING PENDAKIAN
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold mt-4">
                        Ringkasan Pemesanan
                    </h1>

                    <p className="text-green-100 mt-3">
                        Informasi detail pemesanan pendakian Gunung Merbabu.
                    </p>
                </div>
            </section>

            <section className="max-w-3xl mx-auto px-5 py-10 md:py-14">

                {/* Success Status */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7 md:p-9 text-center">
                    <div className="w-20 h-20 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={43} strokeWidth={1.8} />
                    </div>

                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-6">
                        Booking Berhasil Dibuat!
                    </h2>

                    <p className="text-gray-500 mt-3 max-w-lg mx-auto leading-relaxed">
                        Data pemesanan pendakian kamu telah berhasil disimpan.
                        Silakan periksa detail booking berikut.
                    </p>

                    {/* Booking Code */}
                    <div className="bg-green-50 border border-green-100 rounded-xl p-5 mt-8">
                        <p className="text-sm text-green-700 font-medium">
                            Kode Booking
                        </p>

                        <div className="flex items-center justify-center gap-3 mt-2">
                            <p className="text-2xl md:text-3xl font-bold tracking-wider text-green-950 break-all">
                                {booking.booking_code || '-'}
                            </p>

                            {booking.booking_code && (
                                <button
                                    type="button"
                                    onClick={copyBookingCode}
                                    title="Salin kode booking"
                                    className="shrink-0 p-2 rounded-lg text-green-800 hover:bg-green-100 transition"
                                >
                                    <Copy size={19} />
                                </button>
                            )}
                        </div>

                        <p className="text-xs text-green-700 mt-2">
                            Simpan kode booking untuk keperluan pemeriksaan pemesanan.
                        </p>
                    </div>
                </div>

                {/* Booking Details */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 mt-6">
                    <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
                        <div className="w-11 h-11 bg-green-100 text-green-800 rounded-xl flex items-center justify-center">
                            <Receipt size={22} />
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-gray-900">
                                Detail Pemesanan
                            </h3>

                            <p className="text-sm text-gray-500">
                                Informasi perjalanan pendakian
                            </p>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6 py-7">
                        <DetailItem
                            icon={Mountain}
                            label="Jalur Pendakian"
                            value={booking.hiking_route?.name}
                        />

                        <DetailItem
                            icon={CalendarDays}
                            label="Tanggal Pendakian"
                            value={formatDate(booking.booking_date)}
                        />

                        <DetailItem
                            icon={Clock}
                            label="Durasi Pendakian"
                            value={`${booking.duration_days || 0} hari`}
                        />

                        <DetailItem
                            icon={Users}
                            label="Jumlah Pendaki"
                            value={`${booking.member_count || 0} orang`}
                        />
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-gray-500">
                                Status Booking
                            </span>

                            <span className={`px-4 py-2 rounded-full text-xs font-bold ${status.className}`}>
                                {status.label}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8 mt-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-11 h-11 bg-green-100 text-green-800 rounded-xl flex items-center justify-center">
                            <CreditCard size={22} />
                        </div>

                        <div>
                            <h3 className="text-lg font-bold text-gray-900">
                                Ringkasan Biaya
                            </h3>

                            <p className="text-sm text-gray-500">
                                Total biaya pemesanan
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-gray-200 pt-5">
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-gray-600">
                                Jumlah pendaki
                            </span>

                            <span className="font-semibold text-gray-900">
                                {booking.member_count || 0} orang
                            </span>
                        </div>

                        <div className="flex justify-between items-center gap-4 mt-4">
                            <span className="text-gray-600">
                                Durasi pendakian
                            </span>

                            <span className="font-semibold text-gray-900">
                                {booking.duration_days || 0} hari
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 mt-6 pt-6 flex justify-between items-center gap-4">
                        <span className="font-bold text-gray-900">
                            Total Pembayaran
                        </span>

                        <span className="text-xl md:text-2xl font-bold text-green-800">
                            {formatPrice(booking.total_price)}
                        </span>
                    </div>
                </div>

                {/* Payment Information */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 md:p-6 mt-6">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center shrink-0">
                            <Info size={21} />
                        </div>

                        <div>
                            <h3 className="font-bold text-amber-900">
                                Informasi Pembayaran
                            </h3>

                            <p className="text-sm text-amber-800 mt-2 leading-relaxed">
                                Booking ini berstatus menunggu pembayaran.
                                Batas pembayaran adalah 15 menit sejak booking dibuat.
                                Fitur pembayaran belum tersedia pada tahap pengembangan ini.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <div className="grid sm:grid-cols-2 gap-3 mt-8">
                    <Link
                        to="/profile"
                        className="flex items-center justify-center gap-2 border border-green-800 text-green-800 font-semibold py-3.5 rounded-xl hover:bg-green-50 transition"
                    >
                        Riwayat Booking
                    </Link>

                    <Link
                        to="/destinasi"
                        className="flex items-center justify-center gap-2 bg-green-800 text-white font-semibold py-3.5 rounded-xl hover:bg-green-900 transition"
                    >
                        Kembali ke Destinasi
                        <ArrowRight size={17} />
                    </Link>
                </div>

                <p className="text-center text-xs text-gray-400 mt-8">
                    Simpan informasi booking ini sebagai bukti pemesanan pendakian.
                </p>
            </section>
        </main>
    )
}
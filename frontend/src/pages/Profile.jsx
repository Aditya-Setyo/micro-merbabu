
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    UserRound,
    Phone,
    Mail,
    MapPin,
    CalendarDays,
    Ruler,
    Weight,
    CreditCard,
    Mountain,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    LoaderCircle,
    ArrowRight,
    RefreshCw,
    Users
} from 'lucide-react'
import api from '../services/api'

const formatDate = (date) => {
    if (!date) return '-'

    const parsedDate = new Date(`${date}T00:00:00`)

    if (Number.isNaN(parsedDate.getTime())) return date

    return parsedDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })
}

const routeNames = {
    1: 'Jalur Selo',
    2: 'Jalur Suwanting',
    3: 'Jalur Wekas',
    4: 'Jalur Thekelan',
    5: 'Jalur Cuntel'
}

const getRouteName = (routeId) => {
    return routeNames[routeId] || 'Jalur tidak ditemukan'
}

const getStatusStyle = (status) => {
    const value = String(status || '').toLowerCase()

    if (['confirmed', 'paid', 'success', 'approved', 'berhasil', 'dikonfirmasi'].includes(value)) {
        return {
            label: status,
            className: 'bg-green-100 text-green-800',
            icon: CheckCircle2
        }
    }

    if (['cancelled', 'canceled', 'rejected', 'failed', 'dibatalkan', 'ditolak'].includes(value)) {
        return {
            label: status,
            className: 'bg-red-100 text-red-800',
            icon: XCircle
        }
    }

    if (['pending', 'waiting', 'menunggu', 'unpaid', 'belum_bayar'].includes(value)) {
        return {
            label: status,
            className: 'bg-amber-100 text-amber-800',
            icon: Clock
        }
    }

    return {
        label: status || 'Tidak diketahui',
        className: 'bg-gray-100 text-gray-700',
        icon: AlertCircle
    }
}

function ProfileItem({ icon: Icon, label, value }) {
    return (
        <div className="flex gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-800 flex items-center justify-center shrink-0">
                <Icon size={19} />
            </div>

            <div className="min-w-0">
                <p className="text-sm text-gray-500">{label}</p>
                <p className="font-semibold text-gray-800 mt-1 break-words">
                    {value || '-'}
                </p>
            </div>
        </div>
    )
}

export default function Profile() {
    const [user, setUser] = useState(null)
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const fetchProfile = async () => {
        try {
            setLoading(true)
            setError('')

            const [profile, history] = await Promise.all([
                api.get('/profile'),
                api.get('/bookings')
            ])

            setUser(profile.data.data)
            setBookings(history.data.data || [])
        } catch (err) {
            console.error(err)

            setError(
                err.response?.data?.message ||
                'Gagal mengambil informasi profil. Silakan coba kembali.'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProfile()
    }, [])

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
                <div className="text-center">
                    <LoaderCircle
                        size={38}
                        className="animate-spin text-green-800 mx-auto"
                    />

                    <p className="font-semibold text-gray-700 mt-4">
                        Memuat profil pendaki...
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                        Mohon tunggu sebentar.
                    </p>
                </div>
            </main>
        )
    }

    if (error || !user) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
                <div className="max-w-md w-full bg-white border rounded-2xl p-8 text-center shadow-sm">
                    <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                        <AlertCircle size={28} />
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mt-5">
                        Gagal Memuat Profil
                    </h2>

                    <p className="text-gray-500 text-sm mt-2">
                        {error || 'Data profil tidak ditemukan.'}
                    </p>

                    <button
                        onClick={fetchProfile}
                        className="mt-6 inline-flex items-center gap-2 bg-green-800 text-white px-5 py-3 rounded-xl hover:bg-green-900 transition"
                    >
                        <RefreshCw size={17} />
                        Coba Lagi
                    </button>
                </div>
            </main>
        )
    }

    const profileSections = [
        {
            title: 'Informasi Pribadi',
            items: [
                { icon: UserRound, label: 'Nama Lengkap', value: user.name },
                { icon: CreditCard, label: 'NIK', value: user.nik },
                { icon: Users, label: 'Jenis Kelamin', value: user.gender },
                { icon: CalendarDays, label: 'Tanggal Lahir', value: formatDate(user.birth_date) }
            ]
        },
        {
            title: 'Informasi Kontak',
            items: [
                { icon: Phone, label: 'Nomor Telepon', value: user.phone },
                { icon: Mail, label: 'Email', value: user.email },
                { icon: MapPin, label: 'Alamat', value: user.address }
            ]
        },
        {
            title: 'Informasi Fisik',
            items: [
                { icon: Ruler, label: 'Tinggi Badan', value: user.height ? `${user.height} cm` : '-' },
                { icon: Weight, label: 'Berat Badan', value: user.weight ? `${user.weight} kg` : '-' }
            ]
        }
    ]

    return (
        <main className="min-h-screen bg-gray-50">

            {/* Header */}
            <section className="bg-green-950 text-white">
                <div className="max-w-6xl mx-auto px-5 py-12 md:py-16">
                    <div className="flex items-center gap-2 text-green-300 text-sm font-semibold tracking-wider">
                        <Mountain size={18} />
                        AKUN PENDAKI
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold mt-4">
                        Profil Pendaki
                    </h1>

                    <p className="text-green-100 mt-3 max-w-2xl">
                        Kelola informasi akun dan lihat riwayat pendakian
                        Gunung Merbabu melalui halaman ini.
                    </p>
                </div>
            </section>

            <section className="max-w-6xl mx-auto px-5 py-10 md:py-12">

                {/* Profile Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                    <div className="p-6 md:p-8 border-b border-gray-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-800 flex items-center justify-center">
                                    <UserRound size={34} />
                                </div>

                                <div>
                                    <p className="text-sm text-gray-500">
                                        Selamat datang,
                                    </p>

                                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 mt-1">
                                        {user.name}
                                    </h2>

                                    <p className="text-sm text-gray-500 mt-1">
                                        {user.email}
                                    </p>
                                </div>
                            </div>

                            <Link
                                to="/destinasi"
                                className="inline-flex items-center justify-center gap-2 bg-green-800 text-white px-5 py-3 rounded-xl font-semibold hover:bg-green-900 transition"
                            >
                                Booking Pendakian
                                <ArrowRight size={17} />
                            </Link>
                        </div>
                    </div>

                    {/* Profile Information */}
                    <div className="p-6 md:p-8 space-y-8">
                        {profileSections.map((section) => (
                            <div key={section.title}>
                                <h3 className="text-lg font-bold text-gray-900 mb-4">
                                    {section.title}
                                </h3>

                                <div className="grid sm:grid-cols-2 gap-4">
                                    {section.items.map((item) => (
                                        <ProfileItem
                                            key={item.label}
                                            icon={item.icon}
                                            label={item.label}
                                            value={item.value}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Booking History */}
                <div className="mt-10">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
                        <div>
                            <div className="flex items-center gap-2">
                                <Mountain className="text-green-800" size={22} />

                                <h2 className="text-2xl font-bold text-gray-900">
                                    Riwayat Pendakian
                                </h2>
                            </div>

                            <p className="text-sm text-gray-500 mt-2">
                                Daftar pemesanan pendakian yang pernah kamu lakukan.
                            </p>
                        </div>

                        <span className="text-sm font-semibold text-green-800 bg-green-100 px-4 py-2 rounded-full w-fit">
                            {bookings.length} Pemesanan
                        </span>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

                        {bookings.length > 0 ? (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 border-b">
                                            <tr className="text-sm text-gray-600">
                                                <th className="px-6 py-4 font-semibold">
                                                    Kode Booking
                                                </th>

                                                <th className="px-6 py-4 font-semibold">
                                                    Jalur Pendakian
                                                </th>

                                                <th className="px-6 py-4 font-semibold">
                                                    Tanggal
                                                </th>

                                                <th className="px-6 py-4 font-semibold">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {bookings.map((booking) => {
                                                const status = getStatusStyle(booking.status)
                                                const StatusIcon = status.icon

                                                return (
                                                    <tr
                                                        key={booking.id}
                                                        className="border-b last:border-0 hover:bg-gray-50 transition"
                                                    >
                                                        <td className="px-6 py-5">
                                                            <p className="font-semibold text-gray-900">
                                                                {booking.booking_code || '-'}
                                                            </p>
                                                        </td>

                                                        <td className="px-6 py-5 text-gray-700">
                                                            {getRouteName(booking.hiking_route_id)}
                                                        </td>

                                                        <td className="px-6 py-5 text-gray-700">
                                                            {formatDate(booking.booking_date)}
                                                        </td>

                                                        <td className="px-6 py-5">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${status.className}`}>
                                                                <StatusIcon size={14} />
                                                                {status.label}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="md:hidden divide-y divide-gray-100">
                                    {bookings.map((booking) => {
                                        const status = getStatusStyle(booking.status)
                                        const StatusIcon = status.icon

                                        return (
                                            <div key={booking.id} className="p-5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-xs text-gray-500">
                                                            Kode Booking
                                                        </p>

                                                        <p className="font-bold text-gray-900 mt-1">
                                                            {booking.booking_code || '-'}
                                                        </p>
                                                    </div>

                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>
                                                        <StatusIcon size={13} />
                                                        {status.label}
                                                    </span>
                                                </div>

                                                <div className="mt-4 space-y-2 text-sm">
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <Mountain size={16} className="text-green-800" />
                                                        {getRouteName(booking.hiking_route_id)}
                                                    </div>

                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <CalendarDays size={16} className="text-green-800" />
                                                        {formatDate(booking.booking_date)}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="py-14 px-5 text-center">
                                <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                                    <Mountain size={30} />
                                </div>

                                <h3 className="font-bold text-gray-900 mt-5">
                                    Belum Ada Riwayat Pendakian
                                </h3>

                                <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
                                    Kamu belum memiliki pemesanan pendakian.
                                    Mulai rencanakan perjalananmu ke Gunung Merbabu.
                                </p>

                                <Link
                                    to="/destinasi"
                                    className="inline-flex items-center gap-2 mt-5 text-green-800 font-semibold hover:text-green-950"
                                >
                                    Lihat Destinasi
                                    <ArrowRight size={17} />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

            </section>
        </main>
    )
}


import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'

const today = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

const emptyMember = () => ({
    name: '',
    identity_type: 'KTP',
    nik: '',
    nationality: 'Indonesia',
    address: '',
    age: '',
    weight: '',
    phone: '',
    is_leader: false,
})

export default function BookingPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [routes, setRoutes] = useState([])
    const [profile, setProfile] = useState(null)

    const [routeId, setRouteId] = useState(
        searchParams.get('route') || ''
    )

    const [returnRouteId, setReturnRouteId] = useState('')
    const [bookingDate, setBookingDate] = useState(today())
    const [duration, setDuration] = useState(1)

    const [members, setMembers] = useState([
        { ...emptyMember(), is_leader: true },
        emptyMember(),
        emptyMember(),
    ])

    const [quota, setQuota] = useState(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [fieldErrors, setFieldErrors] = useState({})

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [profileResponse, routesResponse] =
                    await Promise.all([
                        api.get('/profile'),
                        api.get('/hiking-routes'),
                    ])

                const user = profileResponse.data.data ||
                    profileResponse.data

                setProfile(user)
                setRoutes(routesResponse.data.data || [])

                setMembers(prev => {
                    const updated = [...prev]

                    updated[0] = {
                        ...updated[0],
                        name: user.name || '',
                        nik: user.nik || '',
                        address: user.address || '',
                        phone: user.phone || '',
                        age: user.birth_date
                            ? String(
                                Math.floor(
                                    (new Date() -
                                    new Date(user.birth_date)) /
                                    (365.25 * 24 * 60 * 60 * 1000)
                                )
                            )
                            : '',
                        weight: user.weight || '',
                    }

                    return updated
                })

            } catch (err) {
                setError(
                    err.response?.data?.message ||
                    'Gagal mengambil data profil atau jalur. Silakan login kembali.'
                )
            } finally {
                setLoading(false)
            }
        }

        loadInitialData()
    }, [])

    const selectedRoute = routes.find(
        route => String(route.id) === String(routeId)
    )

    useEffect(() => {
        if (!routeId || !bookingDate) {
            setQuota(null)
            return
        }

        const loadQuota = async () => {
            setQuota(null)

            try {
                const response = await api.get(
                    `/hiking-routes/${routeId}/quota`,
                    {
                        params: { date: bookingDate }
                    }
                )

                setQuota(response.data.data)
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                    'Gagal memeriksa kuota.'
                )
            }
        }

        loadQuota()
    }, [routeId, bookingDate])

    const updateMember = (index, field, value) => {
        setMembers(prev => prev.map((member, i) =>
            i === index
                ? { ...member, [field]: value }
                : member
        ))
    }

    const addMember = () => {
        if (members.length >= 20) return

        setMembers(prev => [
            ...prev,
            emptyMember()
        ])
    }

    const removeMember = (index) => {
        if (index === 0 || members.length <= 3) return

        setMembers(prev =>
            prev.filter((_, i) => i !== index)
        )
    }

    const ticketPrice = Number(
        selectedRoute?.ticket_price || 0
    )

    const totalPrice =
        ticketPrice * members.length * Number(duration)

    const formatPrice = value =>
        new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(value)

    const handleSubmit = async (e) => {
        e.preventDefault()

        setError('')
        setFieldErrors({})

        if (!routeId) {
            setError('Silakan pilih jalur pendakian.')
            return
        }

        if (members.length < 3) {
            setError('Minimal tiga orang dalam satu rombongan.')
            return
        }

        if (!quota || members.length > quota.quota_remaining) {
            setError('Jumlah anggota melebihi kuota yang tersedia.')
            return
        }

        const leader = members[0]

        if (
            leader.name.trim().toLowerCase() !==
                profile?.name?.trim().toLowerCase() ||
            leader.nik !== profile?.nik
        ) {
            setError('Data ketua harus sesuai dengan profil akun.')
            return
        }

        const payload = {
            hiking_route_id: Number(routeId),
            return_route_id: returnRouteId
                ? Number(returnRouteId)
                : null,
            booking_date: bookingDate,
            duration_days: Number(duration),
            members: members.map((member, index) => ({
                ...member,
                age: Number(member.age),
                weight: Number(member.weight),
                is_leader: index === 0,
            })),
        }

        try {
            setSubmitting(true)

            const response = await api.post('/bookings', payload)

            navigate(
                `/booking/berhasil/${response.data.data.id}`,
                { state: { booking: response.data.data } }
            )

        } catch (err) {
            if (err.response?.status === 422) {
                setFieldErrors(err.response.data.errors || {})
                setError(
                    err.response.data.message ||
                    'Periksa kembali data rombongan.'
                )
            } else {
                setError(
                    err.response?.data?.message ||
                    'Booking gagal. Silakan coba kembali.'
                )
            }
        } finally {
            setSubmitting(false)
        }
    }

    const inputClass =
        'w-full border border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-700'

    if (loading) {
        return (
            <div className="p-10 text-center">
                Memuat data booking...
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-gray-50 py-12 px-5">
            <div className="max-w-5xl mx-auto">

                <div className="mb-8">
                    <p className="text-green-700 font-semibold">
                        PEMESANAN PENDAKIAN
                    </p>

                    <h1 className="text-3xl font-bold mt-2">
                        Form Booking Rombongan
                    </h1>

                    <p className="text-gray-500 mt-2">
                        Lengkapi informasi pendakian dan seluruh
                        anggota rombongan.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* INFORMASI PENDAKIAN */}
                    <section className="bg-white border rounded-2xl p-6">
                        <h2 className="text-xl font-bold mb-6">
                            01. Informasi Pendakian
                        </h2>

                        <div className="grid md:grid-cols-2 gap-5">

                            <div>
                                <label className="block font-semibold text-sm mb-2">
                                    Jalur Pendakian *
                                </label>

                                <select
                                    value={routeId}
                                    onChange={e => setRouteId(e.target.value)}
                                    className={inputClass}
                                    required
                                >
                                    <option value="">Pilih jalur</option>

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
                                <label className="block font-semibold text-sm mb-2">
                                    Jalur Kembali
                                </label>

                                <select
                                    value={returnRouteId}
                                    onChange={e =>
                                        setReturnRouteId(e.target.value)
                                    }
                                    className={inputClass}
                                >
                                    <option value="">
                                        Tidak ditentukan
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
                                <label className="block font-semibold text-sm mb-2">
                                    Tanggal Pendakian *
                                </label>

                                <input
                                    type="date"
                                    min={today()}
                                    value={bookingDate}
                                    onChange={e =>
                                        setBookingDate(e.target.value)
                                    }
                                    className={inputClass}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-sm mb-2">
                                    Durasi Pendakian *
                                </label>

                                <select
                                    value={duration}
                                    onChange={e =>
                                        setDuration(e.target.value)
                                    }
                                    className={inputClass}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                        <option key={day} value={day}>
                                            {day} hari
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {quota && (
                            <div className="bg-green-50 rounded-xl p-4 mt-6">
                                <p className="font-semibold text-green-900">
                                    Informasi Kuota
                                </p>

                                <p className="text-sm text-green-800 mt-2">
                                    Tersedia {quota.quota_remaining} dari{' '}
                                    {quota.quota_total} orang.
                                </p>

                                <p className="text-sm mt-1">
                                    Jumlah anggota saat ini: {members.length}
                                </p>
                            </div>
                        )}

                        {selectedRoute && (
                            <div className="mt-5 text-sm text-gray-600">
                                <p>
                                    Basecamp: {selectedRoute.basecamp || '-'}
                                </p>

                                <p>
                                    Tarif per orang per hari:{' '}
                                    {formatPrice(ticketPrice)}
                                </p>
                            </div>
                        )}
                    </section>

                    {/* DATA ANGGOTA */}
                    <section className="bg-white border rounded-2xl p-6">
                        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                            <div>
                                <h2 className="text-xl font-bold">
                                    02. Data Rombongan
                                </h2>

                                <p className="text-sm text-gray-500 mt-1">
                                    Minimal tiga orang termasuk ketua.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={addMember}
                                disabled={members.length >= 20}
                                className="bg-green-800 text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                            >
                                + Tambah Anggota
                            </button>
                        </div>

                        <div className="space-y-6">
                            {members.map((member, index) => (
                                <div
                                    key={index}
                                    className="border rounded-xl p-5"
                                >
                                    <div className="flex justify-between items-center mb-5">
                                        <h3 className="font-bold">
                                            Anggota {index + 1}
                                            {index === 0 && (
                                                <span className="text-green-700 ml-2 text-sm">
                                                    (Ketua Rombongan)
                                                </span>
                                            )}
                                        </h3>

                                        {index > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => removeMember(index)}
                                                className="text-red-600 text-sm"
                                            >
                                                Hapus
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">

                                        <div>
                                            <label className="block text-sm font-semibold mb-2">
                                                Nama Lengkap *
                                            </label>

                                            <input
                                                value={member.name}
                                                onChange={e => updateMember(
                                                    index, 'name', e.target.value
                                                )}
                                                className={inputClass}
                                                readOnly={index === 0}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold mb-2">
                                                Jenis Identitas *
                                            </label>

                                            <select
                                                value={member.identity_type}
                                                onChange={e => updateMember(
                                                    index, 'identity_type', e.target.value
                                                )}
                                                className={inputClass}
                                            >
                                                <option value="KTP">KTP</option>
                                                <option value="Passport">Passport</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold mb-2">
                                                Nomor Identitas *
                                            </label>

                                            <input
                                                value={member.nik}
                                                onChange={e => updateMember(
                                                    index, 'nik', e.target.value
                                                )}
                                                className={inputClass}
                                                readOnly={index === 0}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold mb-2">
                                                Kewarganegaraan *
                                            </label>

                                            <input
                                                value={member.nationality}
                                                onChange={e => updateMember(
                                                    index, 'nationality', e.target.value
                                                )}
                                                className={inputClass}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold mb-2">
                                                Umur *
                                            </label>

                                            <input
                                                type="number"
                                                min="1"
                                                max="120"
                                                value={member.age}
                                                onChange={e => updateMember(
                                                    index, 'age', e.target.value
                                                )}
                                                className={inputClass}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold mb-2">
                                                Berat Badan (kg) *
                                            </label>

                                            <input
                                                type="number"
                                                min="1"
                                                value={member.weight}
                                                onChange={e => updateMember(
                                                    index, 'weight', e.target.value
                                                )}
                                                className={inputClass}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold mb-2">
                                                Nomor Telepon *
                                            </label>

                                            <input
                                                value={member.phone}
                                                onChange={e => updateMember(
                                                    index, 'phone', e.target.value
                                                )}
                                                className={inputClass}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold mb-2">
                                                Alamat *
                                            </label>

                                            <input
                                                value={member.address}
                                                onChange={e => updateMember(
                                                    index, 'address', e.target.value
                                                )}
                                                className={inputClass}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {fieldErrors.members && (
                            <p className="text-red-600 text-sm mt-4">
                                {fieldErrors.members[0]}
                            </p>
                        )}
                    </section>

                    {/* RINGKASAN */}
                    <section className="bg-white border rounded-2xl p-6">
                        <h2 className="text-xl font-bold mb-5">
                            03. Ringkasan Biaya
                        </h2>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span>Tarif per orang per hari</span>
                                <span>{formatPrice(ticketPrice)}</span>
                            </div>

                            <div className="flex justify-between">
                                <span>Jumlah anggota</span>
                                <span>{members.length} orang</span>
                            </div>

                            <div className="flex justify-between">
                                <span>Durasi</span>
                                <span>{duration} hari</span>
                            </div>

                            <div className="border-t pt-4 flex justify-between font-bold text-lg">
                                <span>Total biaya</span>
                                <span className="text-green-800">
                                    {formatPrice(totalPrice)}
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 mt-4">
                            Total dihitung dari tarif tiket dikalikan
                            jumlah anggota dan durasi. Biaya tambahan
                            yang mungkin berlaku belum termasuk.
                        </p>
                    </section>

                    <button
                        type="submit"
                        disabled={
                            submitting ||
                            !quota ||
                            members.length > (quota?.quota_remaining ?? 0)
                        }
                        className="w-full bg-green-800 hover:bg-green-900 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl"
                    >
                        {submitting
                            ? 'Memproses Booking...'
                            : 'Konfirmasi Booking'}
                    </button>

                </form>
            </div>
        </main>
    )
}

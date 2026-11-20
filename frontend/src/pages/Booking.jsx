
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
    Mountain,
    CalendarDays,
    Users,
    UserRound,
    CreditCard,
    MapPin,
    Phone,
    IdCard,
    Weight,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    LoaderCircle,
    ArrowRight,
    Info,
    Clock,
    Route,
    RefreshCw
} from 'lucide-react'
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

const formatPrice = (value) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value || 0))

const calculateAge = (birthDate) => {
    if (!birthDate) return ''

    const birth = new Date(birthDate)
    const current = new Date()

    let age = current.getFullYear() - birth.getFullYear()

    const monthDifference = current.getMonth() - birth.getMonth()

    if (
        monthDifference < 0 ||
        (monthDifference === 0 && current.getDate() < birth.getDate())
    ) {
        age--
    }

    return age >= 0 ? String(age) : ''
}

const inputClass =
    'w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-green-100 focus:border-green-700 disabled:bg-gray-100 disabled:text-gray-500'

function SectionHeader({ number, icon: Icon, title, description }) {
    return (
        <div className="flex items-start gap-4 mb-7">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-green-100 text-green-800 flex items-center justify-center">
                <Icon size={22} />
            </div>

            <div>
                <p className="text-xs font-bold text-green-700 tracking-wider">
                    BAGIAN {number}
                </p>

                <h2 className="text-xl font-bold text-gray-900 mt-1">
                    {title}
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                    {description}
                </p>
            </div>
        </div>
    )
}

function FormField({
    label,
    children,
    error,
    required = false
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {children}

            {error && (
                <p className="text-xs text-red-600 mt-1.5">
                    {Array.isArray(error) ? error[0] : error}
                </p>
            )}
        </div>
    )
}

export default function BookingPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [routes, setRoutes] = useState([])
    const [profile, setProfile] = useState(null)

    const [routeId, setRouteId] = useState(
        searchParams.get('route') || ''
    )

    const [returnRouteId, setReturnRouteId] = useState('')
    const [bookingDate, setBookingDate] = useState(
        searchParams.get('date') || today()
    )
    const [duration, setDuration] = useState('1')

    const [members, setMembers] = useState([
        { ...emptyMember(), is_leader: true },
        emptyMember(),
        emptyMember(),
    ])

    const [quota, setQuota] = useState(null)
    const [loading, setLoading] = useState(true)
    const [loadingQuota, setLoadingQuota] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [error, setError] = useState('')
    const [fieldErrors, setFieldErrors] = useState({})
    const [quotaError, setQuotaError] = useState('')

    // =====================================================
    // LOAD PROFILE DAN DAFTAR JALUR
    // =====================================================

    useEffect(() => {
        let active = true

        const loadInitialData = async () => {
            try {
                setLoading(true)
                setError('')

                const [profileResponse, routesResponse] =
                    await Promise.all([
                        api.get('/profile'),
                        api.get('/hiking-routes'),
                    ])

                if (!active) return

                const user = profileResponse.data.data ||
                    profileResponse.data

                const routeData = routesResponse.data.data || []

                setProfile(user)
                setRoutes(routeData)

                const requestedRoute = searchParams.get('route')

                if (
                    requestedRoute &&
                    routeData.some(
                        route => String(route.id) === requestedRoute
                    )
                ) {
                    setRouteId(requestedRoute)
                } else if (routeData.length > 0) {
                    setRouteId(String(routeData[0].id))
                }

                setMembers(prev => {
                    const updated = [...prev]

                    updated[0] = {
                        ...updated[0],
                        name: user.name || '',
                        nik: user.nik || '',
                        address: user.address || '',
                        phone: user.phone || '',
                        age: calculateAge(user.birth_date),
                        weight: user.weight || '',
                        is_leader: true,
                    }

                    return updated
                })

            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.message ||
                        'Gagal mengambil data profil atau jalur. Silakan login kembali.'
                    )
                }
            } finally {
                if (active) setLoading(false)
            }
        }

        loadInitialData()

        return () => {
            active = false
        }
    }, [])

    // =====================================================
    // SELECTED ROUTE
    // =====================================================

    const selectedRoute = routes.find(
        route => String(route.id) === String(routeId)
    )

    // =====================================================
    // CHECK QUOTA
    // =====================================================

    useEffect(() => {
        if (!routeId || !bookingDate) {
            setQuota(null)
            setQuotaError('')
            setLoadingQuota(false)
            return
        }

        let active = true

        const loadQuota = async () => {
            try {
                setLoadingQuota(true)
                setQuota(null)
                setQuotaError('')

                const response = await api.get(
                    `/hiking-routes/${routeId}/quota`,
                    {
                        params: { date: bookingDate }
                    }
                )

                if (active) {
                    setQuota(response.data.data)
                }

            } catch (err) {
                if (active) {
                    setQuota(null)
                    setQuotaError(
                        err.response?.data?.message ||
                        'Gagal memeriksa kuota pendakian.'
                    )
                }
            } finally {
                if (active) setLoadingQuota(false)
            }
        }

        loadQuota()

        return () => {
            active = false
        }
    }, [routeId, bookingDate])

    // =====================================================
    // MEMBER HANDLERS
    // =====================================================

    const updateMember = (index, field, value) => {
        setMembers(prev =>
            prev.map((member, i) =>
                i === index
                    ? { ...member, [field]: value }
                    : member
            )
        )

        setFieldErrors(prev => {
            const updated = { ...prev }
            delete updated[`members.${index}.${field}`]
            delete updated.members
            return updated
        })
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

    // =====================================================
    // PRICE CALCULATION
    // =====================================================

    const ticketPrice = Number(
        selectedRoute?.ticket_price || 0
    )

    const totalPrice =
        ticketPrice *
        members.length *
        Number(duration)

    const remainingQuota = Number(
        quota?.quota_remaining ?? 0
    )

    const quotaEnough =
        quota !== null &&
        quota.is_available === true &&
        members.length <= remainingQuota

    // =====================================================
    // FORM SUBMISSION
    // =====================================================

    const handleSubmit = async (e) => {
        e.preventDefault()

        setError('')
        setFieldErrors({})

        if (!routeId) {
            setError('Silakan pilih jalur pendakian.')
            return
        }

        if (!bookingDate || bookingDate < today()) {
            setError('Tanggal pendakian tidak valid.')
            return
        }

        if (returnRouteId && returnRouteId === routeId) {
            setError('Jalur kembali tidak boleh sama dengan jalur keberangkatan.')
            return
        }

        if (members.length < 3) {
            setError('Minimal tiga orang dalam satu rombongan.')
            return
        }

        if (members.length > 20) {
            setError('Maksimal 20 orang dalam satu rombongan.')
            return
        }

        if (loadingQuota || !quota) {
            setError('Informasi kuota belum berhasil diperiksa.')
            return
        }

        if (!quotaEnough) {
            setError('Jumlah anggota melebihi kuota yang tersedia atau kuota telah penuh.')
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

        const invalidMember = members.some(member =>
            !member.name.trim() ||
            !member.nik.trim() ||
            !member.address.trim() ||
            !member.phone.trim() ||
            !member.age ||
            !member.weight ||
            Number(member.age) < 1 ||
            Number(member.weight) < 1
        )

        if (invalidMember) {
            setError('Pastikan seluruh data anggota telah diisi dengan benar.')
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
                {
                    state: {
                        booking: response.data.data
                    }
                }
            )

        } catch (err) {
            console.error(err)

            if (err.response?.status === 422) {
                setFieldErrors(err.response.data.errors || {})

                setError(
                    err.response.data.message ||
                    'Periksa kembali data pemesanan dan anggota rombongan.'
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

    // =====================================================
    // LOADING PAGE
    // =====================================================

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <LoaderCircle
                        size={40}
                        className="animate-spin text-green-800 mx-auto"
                    />

                    <p className="font-semibold text-gray-700 mt-4">
                        Memuat data booking...
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                        Mohon tunggu sebentar.
                    </p>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-gray-50">

            {/* HEADER */}
            <section className="bg-green-950 text-white">
                <div className="max-w-6xl mx-auto px-5 py-12 md:py-16">
                    <div className="flex items-center gap-2 text-green-300 text-sm font-semibold tracking-wider">
                        <Mountain size={18} />
                        PEMESANAN PENDAKIAN
                    </div>

                    <h1 className="text-3xl md:text-4xl font-bold mt-4">
                        Form Booking Rombongan
                    </h1>

                    <p className="text-green-100 mt-3 max-w-2xl leading-relaxed">
                        Lengkapi informasi pendakian dan data seluruh
                        anggota rombongan sebelum melakukan pemesanan
                        Gunung Merbabu.
                    </p>
                </div>
            </section>

            <section className="max-w-6xl mx-auto px-5 py-10 md:py-12">

                {/* ERROR */}
                {error && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-7">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />

                        <div>
                            <p className="font-semibold">
                                Terjadi Kesalahan
                            </p>

                            <p className="text-sm mt-1">
                                {error}
                            </p>
                        </div>
                    </div>
                )}

                {!error && Object.keys(fieldErrors).length > 0 && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-7">
                        <p className="font-semibold">
                            Terdapat data yang perlu diperbaiki.
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-7">

                    {/* ================================================= */}
                    {/* 01. INFORMASI PENDAKIAN */}
                    {/* ================================================= */}

                    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
                        <SectionHeader
                            number="01"
                            icon={Mountain}
                            title="Informasi Pendakian"
                            description="Tentukan jalur, tanggal, dan durasi perjalanan."
                        />

                        <div className="grid md:grid-cols-2 gap-5">

                            <FormField label="Jalur Pendakian" required>
                                <select
                                    value={routeId}
                                    onChange={e => setRouteId(e.target.value)}
                                    className={inputClass}
                                    required
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
                            </FormField>

                            <FormField label="Jalur Kembali">
                                <select
                                    value={returnRouteId}
                                    onChange={e => setReturnRouteId(e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="">
                                        Tidak ditentukan
                                    </option>

                                    {routes.map(route => (
                                        <option
                                            key={route.id}
                                            value={route.id}
                                            disabled={String(route.id) === String(routeId)}
                                        >
                                            {route.name}
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField label="Tanggal Pendakian" required>
                                <input
                                    type="date"
                                    min={today()}
                                    value={bookingDate}
                                    onChange={e => setBookingDate(e.target.value)}
                                    className={inputClass}
                                    required
                                />
                            </FormField>

                            <FormField label="Durasi Pendakian" required>
                                <select
                                    value={duration}
                                    onChange={e => setDuration(e.target.value)}
                                    className={inputClass}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                        <option key={day} value={day}>
                                            {day} hari
                                        </option>
                                    ))}
                                </select>
                            </FormField>
                        </div>

                        {/* QUOTA STATUS */}
                        <div className="mt-6">
                            {loadingQuota && (
                                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 text-blue-800">
                                    <LoaderCircle size={20} className="animate-spin" />

                                    <div>
                                        <p className="font-semibold text-sm">
                                            Memeriksa ketersediaan kuota
                                        </p>

                                        <p className="text-xs mt-1">
                                            Mohon tunggu sebentar.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {quotaError && !loadingQuota && (
                                <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4 text-red-800">
                                    <AlertCircle size={20} />

                                    <div>
                                        <p className="font-semibold text-sm">
                                            Gagal memeriksa kuota
                                        </p>

                                        <p className="text-xs mt-1">
                                            {quotaError}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {quota && !loadingQuota && (
                                <div className={`rounded-xl border p-5 ${quotaEnough
                                        ? 'bg-green-50 border-green-100'
                                        : 'bg-amber-50 border-amber-100'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        {quotaEnough
                                            ? <CheckCircle2 size={20} className="text-green-700" />
                                            : <AlertCircle size={20} className="text-amber-700" />
                                        }

                                        <p className={`font-bold ${quotaEnough
                                                ? 'text-green-900'
                                                : 'text-amber-900'
                                            }`}>
                                            {quotaEnough
                                                ? 'Kuota masih tersedia'
                                                : 'Kuota tidak mencukupi'
                                            }
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 mt-5">
                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Kuota total
                                            </p>

                                            <p className="text-xl font-bold text-gray-900 mt-1">
                                                {quota.quota_total}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Terpakai
                                            </p>

                                            <p className="text-xl font-bold text-gray-900 mt-1">
                                                {quota.quota_used}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Tersisa
                                            </p>

                                            <p className="text-xl font-bold text-green-800 mt-1">
                                                {quota.quota_remaining}
                                            </p>
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-600 mt-4">
                                        Jumlah anggota rombongan saat ini: {members.length} orang.
                                    </p>
                                </div>
                            )}
                        </div>

                        {selectedRoute && (
                            <div className="grid sm:grid-cols-2 gap-4 mt-6">
                                <div className="flex items-center gap-3 bg-gray-50 border rounded-xl p-4">
                                    <MapPin className="text-green-800" size={20} />

                                    <div>
                                        <p className="text-xs text-gray-500">
                                            Lokasi Basecamp
                                        </p>

                                        <p className="font-semibold text-sm text-gray-800 mt-1">
                                            {selectedRoute.basecamp || '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-gray-50 border rounded-xl p-4">
                                    <CreditCard className="text-green-800" size={20} />

                                    <div>
                                        <p className="text-xs text-gray-500">
                                            Tarif per orang per hari
                                        </p>

                                        <p className="font-semibold text-sm text-gray-800 mt-1">
                                            {formatPrice(ticketPrice)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ================================================= */}
                    {/* 02. DATA ANGGOTA */}
                    {/* ================================================= */}

                    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <SectionHeader
                                number="02"
                                icon={Users}
                                title="Data Rombongan"
                                description="Masukkan identitas setiap anggota pendakian."
                            />

                            <button
                                type="button"
                                onClick={addMember}
                                disabled={members.length >= 20}
                                className="inline-flex items-center justify-center gap-2 bg-green-800 hover:bg-green-900 disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-3 rounded-xl transition"
                            >
                                <Plus size={18} />
                                Tambah Anggota
                            </button>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                            <div className="flex items-start gap-3 text-blue-800">
                                <Info size={19} className="shrink-0 mt-0.5" />

                                <div className="text-sm">
                                    <p className="font-semibold">
                                        Ketentuan Rombongan
                                    </p>

                                    <p className="mt-1 leading-relaxed">
                                        Minimal 3 orang dan maksimal 20 orang.
                                        Ketua rombongan harus menggunakan data
                                        sesuai profil akun yang sedang login.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {members.map((member, index) => (
                                <div
                                    key={index}
                                    className="border border-gray-200 rounded-2xl overflow-hidden"
                                >
                                    {/* MEMBER HEADER */}
                                    <div className="bg-gray-50 px-5 py-4 flex items-center justify-between gap-3 border-b">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-green-100 text-green-800 rounded-lg flex items-center justify-center font-bold">
                                                {index + 1}
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-gray-900">
                                                    Anggota {index + 1}
                                                </h3>

                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {index === 0
                                                        ? 'Ketua Rombongan'
                                                        : 'Anggota Rombongan'
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        {index === 0 ? (
                                            <span className="text-xs font-semibold bg-green-100 text-green-800 px-3 py-1.5 rounded-full">
                                                Ketua
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => removeMember(index)}
                                                disabled={members.length <= 3}
                                                className="inline-flex items-center gap-1.5 text-red-600 hover:bg-red-50 disabled:text-gray-300 disabled:hover:bg-transparent text-sm font-semibold px-3 py-2 rounded-lg transition"
                                            >
                                                <Trash2 size={15} />
                                                Hapus
                                            </button>
                                        )}
                                    </div>

                                    {/* MEMBER FORM */}
                                    <div className="p-5">
                                        {index === 0 && (
                                            <div className="bg-green-50 rounded-lg p-3 mb-5 text-sm text-green-800">
                                                Data ketua diambil otomatis dari profil akun.
                                            </div>
                                        )}

                                        <div className="grid md:grid-cols-2 gap-5">

                                            <FormField
                                                label="Nama Lengkap"
                                                required
                                                error={fieldErrors[`members.${index}.name`]}
                                            >
                                                <input
                                                    value={member.name}
                                                    onChange={e => updateMember(index, 'name', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="Masukkan nama lengkap"
                                                    readOnly={index === 0}
                                                    required
                                                />
                                            </FormField>

                                            <FormField
                                                label="Jenis Identitas"
                                                required
                                                error={fieldErrors[`members.${index}.identity_type`]}
                                            >
                                                <select
                                                    value={member.identity_type}
                                                    onChange={e => updateMember(index, 'identity_type', e.target.value)}
                                                    className={inputClass}
                                                >
                                                    <option value="KTP">KTP</option>
                                                    <option value="Passport">Passport</option>
                                                </select>
                                            </FormField>

                                            <FormField
                                                label="Nomor Identitas"
                                                required
                                                error={fieldErrors[`members.${index}.nik`]}
                                            >
                                                <input
                                                    value={member.nik}
                                                    onChange={e => updateMember(index, 'nik', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="Masukkan nomor identitas"
                                                    readOnly={index === 0}
                                                    required
                                                />
                                            </FormField>

                                            <FormField
                                                label="Kewarganegaraan"
                                                required
                                                error={fieldErrors[`members.${index}.nationality`]}
                                            >
                                                <input
                                                    value={member.nationality}
                                                    onChange={e => updateMember(index, 'nationality', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="Contoh: Indonesia"
                                                    required
                                                />
                                            </FormField>

                                            <FormField
                                                label="Umur"
                                                required
                                                error={fieldErrors[`members.${index}.age`]}
                                            >
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="120"
                                                    value={member.age}
                                                    onChange={e => updateMember(index, 'age', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="Umur dalam tahun"
                                                    required
                                                />
                                            </FormField>

                                            <FormField
                                                label="Berat Badan (kg)"
                                                required
                                                error={fieldErrors[`members.${index}.weight`]}
                                            >
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={member.weight}
                                                    onChange={e => updateMember(index, 'weight', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="Contoh: 60"
                                                    required
                                                />
                                            </FormField>

                                            <FormField
                                                label="Nomor Telepon"
                                                required
                                                error={fieldErrors[`members.${index}.phone`]}
                                            >
                                                <input
                                                    type="tel"
                                                    value={member.phone}
                                                    onChange={e => updateMember(index, 'phone', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="Contoh: 08123456789"
                                                    required
                                                />
                                            </FormField>

                                            <FormField
                                                label="Alamat"
                                                required
                                                error={fieldErrors[`members.${index}.address`]}
                                            >
                                                <input
                                                    value={member.address}
                                                    onChange={e => updateMember(index, 'address', e.target.value)}
                                                    className={inputClass}
                                                    placeholder="Masukkan alamat lengkap"
                                                    required
                                                />
                                            </FormField>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {fieldErrors.members && (
                            <div className="mt-5 p-4 bg-red-50 rounded-xl text-red-700 text-sm">
                                {Array.isArray(fieldErrors.members)
                                    ? fieldErrors.members[0]
                                    : fieldErrors.members
                                }
                            </div>
                        )}

                        <div className="flex justify-between items-center text-sm text-gray-500 mt-5">
                            <span>Jumlah anggota</span>

                            <span className="font-bold text-gray-900">
                                {members.length} / 20 orang
                            </span>
                        </div>

                        <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                            <div
                                className="h-full bg-green-700 rounded-full transition-all"
                                style={{
                                    width: `${(members.length / 20) * 100}%`
                                }}
                            />
                        </div>
                    </section>

                    {/* ================================================= */}
                    {/* 03. RINGKASAN BIAYA */}
                    {/* ================================================= */}

                    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
                        <SectionHeader
                            number="03"
                            icon={ReceiptIcon}
                            title="Ringkasan Biaya"
                            description="Periksa rincian biaya sebelum mengirim pemesanan."
                        />

                        <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                            <div className="flex justify-between gap-4 text-sm">
                                <span className="text-gray-600">
                                    Jalur pendakian
                                </span>

                                <span className="font-semibold text-gray-900 text-right">
                                    {selectedRoute?.name || '-'}
                                </span>
                            </div>

                            <div className="flex justify-between gap-4 text-sm">
                                <span className="text-gray-600">
                                    Tarif per orang per hari
                                </span>

                                <span className="font-semibold text-gray-900">
                                    {formatPrice(ticketPrice)}
                                </span>
                            </div>

                            <div className="flex justify-between gap-4 text-sm">
                                <span className="text-gray-600">
                                    Jumlah anggota
                                </span>

                                <span className="font-semibold text-gray-900">
                                    {members.length} orang
                                </span>
                            </div>

                            <div className="flex justify-between gap-4 text-sm">
                                <span className="text-gray-600">
                                    Durasi pendakian
                                </span>

                                <span className="font-semibold text-gray-900">
                                    {duration} hari
                                </span>
                            </div>

                            <div className="border-t border-gray-200 pt-5 flex justify-between items-center gap-4">
                                <span className="font-bold text-gray-900">
                                    Total Biaya
                                </span>

                                <span className="text-xl md:text-2xl font-bold text-green-800">
                                    {formatPrice(totalPrice)}
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                            Perhitungan menggunakan tarif tiket per orang
                            dikalikan jumlah anggota dan durasi pendakian.
                            Pastikan nilai tarif sesuai dengan ketentuan
                            pengelola jalur.
                        </p>
                    </section>

                    {/* ================================================= */}
                    {/* KONFIRMASI */}
                    {/* ================================================= */}

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                        <div className="flex items-start gap-3 text-blue-800">
                            <Info size={20} className="shrink-0 mt-0.5" />

                            <div>
                                <p className="font-bold text-sm">
                                    Periksa Kembali Data Pemesanan
                                </p>

                                <p className="text-sm mt-1 leading-relaxed">
                                    Pastikan informasi jalur, tanggal, dan
                                    seluruh identitas anggota sudah benar.
                                    Sistem akan melakukan validasi kuota
                                    kembali saat booking dikirim.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={
                            submitting ||
                            loadingQuota ||
                            !quota ||
                            !quotaEnough
                        }
                        className="w-full flex items-center justify-center gap-2 bg-green-800 hover:bg-green-900 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition shadow-sm"
                    >
                        {submitting ? (
                            <>
                                <LoaderCircle size={20} className="animate-spin" />
                                Memproses Booking...
                            </>
                        ) : (
                            <>
                                Konfirmasi Booking
                                <ArrowRight size={19} />
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-gray-500">
                        Dengan mengirim pemesanan, kamu menyatakan bahwa
                        data yang diberikan sudah benar.
                    </p>

                </form>
            </section>
        </main>
    )
}

// Ikon ringkasan biaya
function ReceiptIcon({ size = 22, ...props }) {
    return <CreditCard size={size} {...props} />
}

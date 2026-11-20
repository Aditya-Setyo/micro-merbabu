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
    RefreshCw,
    Search,
    UserCheck
} from 'lucide-react'
import api from '../services/api'

const today = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// Anggota sekarang cuma ID_Code saja, data lengkap diambil dari registrasi via ID_Code
const emptyMember = () => ({
    id_code: '',
    data: null, // hasil fetch dari backend: { name, nik, ... }
    loading: false,
    error: '',
    checked: false,
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
    if (monthDifference < 0 || (monthDifference === 0 && current.getDate() < birth.getDate())) {
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
                <p className="text-xs font-bold text-green-700 tracking-wider">BAGIAN {number}</p>
                <h2 className="text-xl font-bold text-gray-900 mt-1">{title}</h2>
                <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>
        </div>
    )
}

function FormField({ label, children, error, required = false }) {
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

    const [routeId, setRouteId] = useState(searchParams.get('route') || '')
    const [returnRouteId, setReturnRouteId] = useState('')
    const [bookingDate, setBookingDate] = useState(searchParams.get('date') || today())
    const [duration, setDuration] = useState('1')

    // PERUBAHAN UTAMA: members = hanya anggota NON-ketua, minimal 2 ID_Code
    // Total rombongan = 1 ketua + members.length
    // Jadi 2 ID_Code = total 3 orang (sesuai aturan minimal 3 total)
    const [members, setMembers] = useState([emptyMember(), emptyMember()])

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
                const [profileResponse, routesResponse] = await Promise.all([
                    api.get('/profile'),
                    api.get('/hiking-routes'),
                ])
                if (!active) return
                const user = profileResponse.data.data || profileResponse.data
                const routeData = routesResponse.data.data || []
                setProfile(user)
                setRoutes(routeData)
                const requestedRoute = searchParams.get('route')
                if (requestedRoute && routeData.some(route => String(route.id) === requestedRoute)) {
                    setRouteId(requestedRoute)
                } else if (routeData.length > 0) {
                    setRouteId(String(routeData[0].id))
                }
            } catch (err) {
                if (active) {
                    setError(err.response?.data?.message || 'Gagal mengambil data profil atau jalur. Silakan login kembali.')
                }
            } finally {
                if (active) setLoading(false)
            }
        }
        loadInitialData()
        return () => { active = false }
    }, [])

    const selectedRoute = routes.find(route => String(route.id) === String(routeId))

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
                const response = await api.get(`/hiking-routes/${routeId}/quota`, { params: { date: bookingDate } })
                if (active) setQuota(response.data.data)
            } catch (err) {
                if (active) {
                    setQuota(null)
                    setQuotaError(err.response?.data?.message || 'Gagal memeriksa kuota pendakian.')
                }
            } finally {
                if (active) setLoadingQuota(false)
            }
        }
        loadQuota()
        return () => { active = false }
    }, [routeId, bookingDate])

    // =====================================================
    // MEMBER HANDLERS - ID_Code ONLY
    // =====================================================
    const updateMemberCode = (index, value) => {
        setMembers(prev => prev.map((m, i) => i === index ? { ...m, id_code: value.trim(), data: null, checked: false, error: '' } : m))
        setFieldErrors(prev => {
            const updated = { ...prev }
            delete updated[`members.${index}.id_code`]
            delete updated.members
            return updated
        })
    }

    // Ambil data anggota dari data registrasi via ID_Code
    // SESUAIKAN endpoint ini dengan backend kamu:
    // Opsi 1: GET /api/users/by-id-code/{id_code}
    // Opsi 2: GET /api/users/search?id_code={id_code}
    // Kalau backend kamu beda, ganti URL di bawah saja, logika bawahnya tetap sama.
    const checkMember = async (index) => {
        const member = members[index]
        const code = (member.id_code || '').trim()
        if (!code) {
            setMembers(prev => prev.map((m, i) => i === index ? { ...m, error: 'ID_Code wajib diisi.' } : m))
            return
        }
        // Cek duplikat
        const duplicate = members.some((m, i) => i !== index && (m.id_code || '').trim().toLowerCase() === code.toLowerCase())
        if (duplicate) {
            setMembers(prev => prev.map((m, i) => i === index ? { ...m, error: 'ID_Code ini sudah dipakai di anggota lain.' } : m))
            return
        }
        // Cek ketua tidak boleh dimasukkan lagi sebagai anggota
        if (profile?.id_code && code.toLowerCase() === String(profile.id_code).toLowerCase()) {
            setMembers(prev => prev.map((m, i) => i === index ? { ...m, error: 'Ini ID_Code ketua. Ketua tidak perlu diketik lagi.' } : m))
            return
        }
        setMembers(prev => prev.map((m, i) => i === index ? { ...m, loading: true, error: '' } : m))
        try {
            // Ganti endpoint ini kalau backend kamu pakai nama lain
            const res = await api.get(`/users/by-id-code/${code}`)
            const data = res.data.data || res.data
            if (!data || !data.name) throw new Error('Data tidak ditemukan')
            setMembers(prev => prev.map((m, i) => i === index ? { ...m, data, loading: false, checked: true, error: '' } : m))
        } catch (err) {
            // Fallback: kalau endpoint by-id-code belum ada, coba endpoint search
            try {
                const res2 = await api.get('/users/search', { params: { id_code: code } })
                const data2 = res2.data.data || res2.data
                if (data2 && data2.name) {
                    setMembers(prev => prev.map((m, i) => i === index ? { ...m, data: data2, loading: false, checked: true, error: '' } : m))
                    return
                }
            } catch { }
            setMembers(prev => prev.map((m, i) => i === index ? { ...m, loading: false, checked: false, error: err.response?.data?.message || 'ID_Code tidak ditemukan di data registrasi. Cek lagi.' } : m))
        }
    }

    const addMember = () => {
        // Maksimal UNLIMITED, dibatasi kuota saja, bukan 20 lagi
        // Kalau kuota sudah diketahui dan total sudah mentok kuota, cegah tambah
        const totalNow = 1 + members.length
        const remaining = Number(quota?.quota_remaining ?? 9999)
        if (quota && totalNow >= remaining) {
            setError('Jumlah anggota sudah mencapai sisa kuota yang tersedia.')
            return
        }
        setMembers(prev => [...prev, emptyMember()])
    }

    const removeMember = (index) => {
        // Minimal 2 ID_Code yang diketik = total 3 orang (1 ketua + 2 anggota)
        if (members.length <= 2) return
        setMembers(prev => prev.filter((_, i) => i !== index))
    }

    // =====================================================
    // PRICE CALCULATION - TOTAL = 1 ketua + N anggota ID_Code
    // =====================================================
    const ticketPrice = Number(selectedRoute?.ticket_price || 0)
    const totalMembers = 1 + members.length
    const totalPrice = ticketPrice * totalMembers * Number(duration)

    const remainingQuota = Number(quota?.quota_remaining ?? 0)
    const quotaEnough = quota !== null && quota.is_available === true && totalMembers <= remainingQuota

    // =====================================================
    // FORM SUBMISSION
    // =====================================================
    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setFieldErrors({})

        if (!routeId) { setError('Silakan pilih jalur pendakian.'); return }
        if (!bookingDate || bookingDate < today()) { setError('Tanggal pendakian tidak valid.'); return }
        if (returnRouteId && returnRouteId === routeId) { setError('Jalur kembali tidak boleh sama dengan jalur keberangkatan.'); return }

        // Aturan baru: minimal 2 ID_Code diketik (total 3 orang), maksimal ikut kuota (unlimited)
        if (members.length < 2) { setError('Minimal 2 ID_Code anggota (total 3 orang termasuk ketua).'); return }
        if (loadingQuota || !quota) { setError('Informasi kuota belum berhasil diperiksa.'); return }
        if (!quotaEnough) { setError('Jumlah anggota melebihi kuota yang tersedia atau kuota telah penuh.'); return }

        // Semua ID_Code harus sudah terisi dan sudah di-cek (data ditemukan)
        const emptyCode = members.some(m => !(m.id_code || '').trim())
        if (emptyCode) { setError('Semua ID_Code anggota wajib diisi.'); return }

        const codes = members.map(m => (m.id_code || '').trim().toLowerCase())
        const hasDuplicate = new Set(codes).size !== codes.length
        if (hasDuplicate) { setError('Terdapat ID_Code yang duplikat.'); return }

        const notChecked = members.some(m => !m.checked || !m.data)
        if (notChecked) { setError('Klik tombol Cek di setiap ID_Code untuk memastikan data anggota ditemukan dulu.'); return }

        // Payload baru: ketua tidak kirim ID_Code lagi, hanya anggota yang kirim ID_Code
        // Backend akan ambil data lengkap anggota dari data registrasi via ID_Code
        const payload = {
            hiking_route_id: Number(routeId),
            return_route_id: returnRouteId ? Number(returnRouteId) : null,
            booking_date: bookingDate,
            duration_days: Number(duration),
            members: members.map(m => ({
                id_code: (m.id_code || '').trim(),
            })),
        }

        try {
            setSubmitting(true)
            const response = await api.post('/bookings', payload)
            navigate(`/booking/berhasil/${response.data.data.id}`, { state: { booking: response.data.data } })
        } catch (err) {
            console.error(err)
            if (err.response?.status === 422) {
                setFieldErrors(err.response.data.errors || {})
                setError(err.response.data.message || 'Periksa kembali data pemesanan dan anggota rombongan.')
            } else {
                setError(err.response?.data?.message || 'Booking gagal. Silakan coba kembali.')
            }
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <LoaderCircle size={40} className="animate-spin text-green-800 mx-auto" />
                    <p className="font-semibold text-gray-700 mt-4">Memuat data booking...</p>
                    <p className="text-sm text-gray-500 mt-1">Mohon tunggu sebentar.</p>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <section className="bg-green-950 text-white">
                <div className="max-w-6xl mx-auto px-5 py-12 md:py-16">
                    <div className="flex items-center gap-2 text-green-300 text-sm font-semibold tracking-wider">
                        <Mountain size={18} /> PEMESANAN PENDAKIAN
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mt-4">Form Booking Rombongan</h1>
                    <p className="text-green-100 mt-3 max-w-2xl leading-relaxed">
                        Ketua cukup ketik ID_Code anggota. Data anggota diambil otomatis dari data registrasi.
                    </p>
                </div>
            </section>

            <section className="max-w-6xl mx-auto px-5 py-10 md:py-12">
                {error && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-7">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" />
                        <div><p className="font-semibold">Terjadi Kesalahan</p><p className="text-sm mt-1">{error}</p></div>
                    </div>
                )}
                {!error && Object.keys(fieldErrors).length > 0 && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-7">
                        <p className="font-semibold">Terdapat data yang perlu diperbaiki.</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-7">
                    {/* 01 INFORMASI PENDAKIAN - sama seperti sebelumnya */}
                    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
                        <SectionHeader number="01" icon={Mountain} title="Informasi Pendakian" description="Tentukan jalur, tanggal, dan durasi perjalanan." />
                        <div className="grid md:grid-cols-2 gap-5">
                            <FormField label="Jalur Pendakian" required>
                                <select value={routeId} onChange={e => setRouteId(e.target.value)} className={inputClass} required>
                                    <option value="">Pilih jalur pendakian</option>
                                    {routes.map(route => (<option key={route.id} value={route.id}>{route.name}</option>))}
                                </select>
                            </FormField>
                            <FormField label="Jalur Kembali">
                                <select value={returnRouteId} onChange={e => setReturnRouteId(e.target.value)} className={inputClass}>
                                    <option value="">Tidak ditentukan</option>
                                    {routes.map(route => (<option key={route.id} value={route.id} disabled={String(route.id) === String(routeId)}>{route.name}</option>))}
                                </select>
                            </FormField>
                            <FormField label="Tanggal Pendakian" required>
                                <input type="date" min={today()} value={bookingDate} onChange={e => setBookingDate(e.target.value)} className={inputClass} required />
                            </FormField>
                            <FormField label="Durasi Pendakian" required>
                                <select value={duration} onChange={e => setDuration(e.target.value)} className={inputClass}>
                                    {[1, 2, 3, 4, 5, 6, 7].map(day => (<option key={day} value={day}>{day} hari</option>))}
                                </select>
                            </FormField>
                        </div>
                        <div className="mt-6">
                            {loadingQuota && (
                                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 text-blue-800">
                                    <LoaderCircle size={20} className="animate-spin" />
                                    <div><p className="font-semibold text-sm">Memeriksa ketersediaan kuota</p><p className="text-xs mt-1">Mohon tunggu sebentar.</p></div>
                                </div>
                            )}
                            {quotaError && !loadingQuota && (
                                <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4 text-red-800">
                                    <AlertCircle size={20} /><div><p className="font-semibold text-sm">Gagal memeriksa kuota</p><p className="text-xs mt-1">{quotaError}</p></div>
                                </div>
                            )}
                            {quota && !loadingQuota && (
                                <div className={`rounded-xl border p-5 ${quotaEnough ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                                    <div className="flex items-center gap-2">
                                        {quotaEnough ? <CheckCircle2 size={20} className="text-green-700" /> : <AlertCircle size={20} className="text-amber-700" />}
                                        <p className={`font-bold ${quotaEnough ? 'text-green-900' : 'text-amber-900'}`}>{quotaEnough ? 'Kuota masih tersedia' : 'Kuota tidak mencukupi'}</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 mt-5">
                                        <div><p className="text-xs text-gray-500">Kuota total</p><p className="text-xl font-bold text-gray-900 mt-1">{quota.quota_total}</p></div>
                                        <div><p className="text-xs text-gray-500">Terpakai</p><p className="text-xl font-bold text-gray-900 mt-1">{quota.quota_used}</p></div>
                                        <div><p className="text-xs text-gray-500">Tersisa</p><p className="text-xl font-bold text-green-800 mt-1">{quota.quota_remaining}</p></div>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-4">Jumlah anggota rombongan saat ini: {totalMembers} orang (1 ketua + {members.length} ID_Code).</p>
                                </div>
                            )}
                        </div>
                        {selectedRoute && (
                            <div className="grid sm:grid-cols-2 gap-4 mt-6">
                                <div className="flex items-center gap-3 bg-gray-50 border rounded-xl p-4">
                                    <MapPin className="text-green-800" size={20} /><div><p className="text-xs text-gray-500">Lokasi Basecamp</p><p className="font-semibold text-sm text-gray-800 mt-1">{selectedRoute.basecamp || '-'}</p></div>
                                </div>
                                <div className="flex items-center gap-3 bg-gray-50 border rounded-xl p-4">
                                    <CreditCard className="text-green-800" size={20} /><div><p className="text-xs text-gray-500">Tarif per orang per hari</p><p className="font-semibold text-sm text-gray-800 mt-1">{formatPrice(ticketPrice)}</p></div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* 02 DATA ROMBONGAN - ID_Code ONLY */}
                    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <SectionHeader number="02" icon={Users} title="Data Rombongan" description="Ketua cukup ketik ID_Code anggota. Data diambil dari registrasi." />
                            <button type="button" onClick={addMember} className="inline-flex items-center justify-center gap-2 bg-green-800 hover:bg-green-900 text-white text-sm font-semibold px-4 py-3 rounded-xl transition">
                                <Plus size={18} /> Tambah Anggota (ID_Code)
                            </button>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                            <div className="flex items-start gap-3 text-blue-800">
                                <Info size={19} className="shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-semibold">Ketentuan Rombongan</p>
                                    <p className="mt-1 leading-relaxed">
                                        Minimal 2 ID_Code anggota (total 3 orang termasuk ketua). Maksimal mengikuti sisa kuota (unlimited).
                                        Ketua tidak perlu ketik ID_Code sendiri, data ketua diambil dari profil akun yang login.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* KETUA - READ ONLY DARI PROFIL */}
                        <div className="border border-green-200 rounded-2xl overflow-hidden mb-6">
                            <div className="bg-green-50 px-5 py-4 flex items-center justify-between border-b border-green-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-green-700 text-white rounded-lg flex items-center justify-center font-bold">1</div>
                                    <div><h3 className="font-bold text-gray-900">Ketua Rombongan</h3><p className="text-xs text-gray-500 mt-0.5">Dari profil akun yang login - tidak perlu ketik ID_Code</p></div>
                                </div>
                                <span className="text-xs font-semibold bg-green-100 text-green-800 px-3 py-1.5 rounded-full">Ketua</span>
                            </div>
                            <div className="p-5 grid md:grid-cols-2 gap-4 text-sm">
                                <div><p className="text-xs text-gray-500">Nama Lengkap</p><p className="font-semibold mt-1">{profile?.name || '-'}</p></div>
                                <div><p className="text-xs text-gray-500">ID_Code</p><p className="font-semibold mt-1">{profile?.id_code || profile?.idCode || '-'}</p></div>
                                <div><p className="text-xs text-gray-500">NIK</p><p className="font-semibold mt-1">{profile?.nik || '-'}</p></div>
                                <div><p className="text-xs text-gray-500">Telepon</p><p className="font-semibold mt-1">{profile?.phone || '-'}</p></div>
                            </div>
                        </div>

                        {/* ANGGOTA - HANYA ID_Code */}
                        <div className="space-y-6">
                            {members.map((member, index) => (
                                <div key={index} className="border border-gray-200 rounded-2xl overflow-hidden">
                                    <div className="bg-gray-50 px-5 py-4 flex items-center justify-between gap-3 border-b">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-green-100 text-green-800 rounded-lg flex items-center justify-center font-bold">{index + 2}</div>
                                            <div><h3 className="font-bold text-gray-900">Anggota {index + 1}</h3><p className="text-xs text-gray-500 mt-0.5">Ketik ID_Code saja</p></div>
                                        </div>
                                        <button type="button" onClick={() => removeMember(index)} disabled={members.length <= 2} className="inline-flex items-center gap-1.5 text-red-600 hover:bg-red-50 disabled:text-gray-300 disabled:hover:bg-transparent text-sm font-semibold px-3 py-2 rounded-lg transition">
                                            <Trash2 size={15} /> Hapus
                                        </button>
                                    </div>
                                    <div className="p-5">
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <FormField label="ID_Code Anggota" required error={member.error || fieldErrors[`members.${index}.id_code`]}>
                                                    <div className="relative">
                                                        <IdCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input value={member.id_code} onChange={e => updateMemberCode(index, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); checkMember(index) } }} className={`${inputClass} pl-11 uppercase`} placeholder="Contoh: MB-2026-001" required />
                                                    </div>
                                                </FormField>
                                            </div>
                                            <button type="button" onClick={() => checkMember(index)} disabled={member.loading || !member.id_code.trim()} className="shrink-0 mt-8 inline-flex items-center gap-2 bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white text-sm font-semibold px-4 py-3 rounded-xl transition h-[46px]">
                                                {member.loading ? <LoaderCircle size={16} className="animate-spin" /> : <Search size={16} />} Cek
                                            </button>
                                        </div>

                                        {member.data && (
                                            <div className="mt-4 bg-green-50 border border-green-100 rounded-xl p-4">
                                                <div className="flex items-center gap-2 text-green-800"><UserCheck size={18} /><p className="font-bold text-sm">Ditemukan: {member.data.name}</p></div>
                                                <div className="grid md:grid-cols-3 gap-3 mt-3 text-sm">
                                                    <div><p className="text-xs text-gray-500">NIK</p><p className="font-semibold">{member.data.nik || '-'}</p></div>
                                                    <div><p className="text-xs text-gray-500">Telepon</p><p className="font-semibold">{member.data.phone || '-'}</p></div>
                                                    <div><p className="text-xs text-gray-500">ID_Code</p><p className="font-semibold">{member.data.id_code || member.id_code}</p></div>
                                                </div>
                                                <p className="text-xs text-green-700 mt-3">Data lengkap diambil dari data registrasi. Tidak perlu ketik manual.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center text-sm text-gray-500 mt-5">
                            <span>Total rombongan (1 ketua + ID_Code anggota)</span>
                            <span className="font-bold text-gray-900">{totalMembers} orang {quota ? `(sisa kuota: ${remainingQuota})` : ''}</span>
                        </div>
                        {quota && (
                            <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-green-700 rounded-full transition-all" style={{ width: `${Math.min(100, (totalMembers / Math.max(1, Number(quota.quota_total))) * 100)}%` }} />
                            </div>
                        )}
                    </section>

                    {/* 03 RINGKASAN BIAYA */}
                    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
                        <SectionHeader number="03" icon={ReceiptIcon} title="Ringkasan Biaya" description="Periksa rincian biaya sebelum mengirim pemesanan." />
                        <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                            <div className="flex justify-between gap-4 text-sm"><span className="text-gray-600">Jalur pendakian</span><span className="font-semibold text-gray-900 text-right">{selectedRoute?.name || '-'}</span></div>
                            <div className="flex justify-between gap-4 text-sm"><span className="text-gray-600">Tarif per orang per hari</span><span className="font-semibold text-gray-900">{formatPrice(ticketPrice)}</span></div>
                            <div className="flex justify-between gap-4 text-sm"><span className="text-gray-600">Jumlah anggota (1 ketua + {members.length} ID_Code)</span><span className="font-semibold text-gray-900">{totalMembers} orang</span></div>
                            <div className="flex justify-between gap-4 text-sm"><span className="text-gray-600">Durasi pendakian</span><span className="font-semibold text-gray-900">{duration} hari</span></div>
                            <div className="border-t border-gray-200 pt-5 flex justify-between items-center gap-4"><span className="font-bold text-gray-900">Total Biaya</span><span className="text-xl md:text-2xl font-bold text-green-800">{formatPrice(totalPrice)}</span></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                            Perhitungan: tarif per orang x total rombongan (1 ketua + jumlah ID_Code) x durasi. Contoh: Rp 50.000 x 3 orang x 2 hari = Rp 300.000.
                        </p>
                    </section>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                        <div className="flex items-start gap-3 text-blue-800">
                            <Info size={20} className="shrink-0 mt-0.5" />
                            <div><p className="font-bold text-sm">Periksa Kembali Data Pemesanan</p><p className="text-sm mt-1 leading-relaxed">Pastikan ID_Code anggota sudah dicek dan ditemukan. Sistem akan validasi kuota kembali saat booking dikirim.</p></div>
                        </div>
                    </div>

                    <button type="submit" disabled={submitting || loadingQuota || !quota || !quotaEnough} className="w-full flex items-center justify-center gap-2 bg-green-800 hover:bg-green-900 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition shadow-sm">
                        {submitting ? (<><LoaderCircle size={20} className="animate-spin" /> Memproses Booking...</>) : (<>Konfirmasi Booking <ArrowRight size={19} /></>)}
                    </button>
                    <p className="text-center text-xs text-gray-500">Dengan mengirim pemesanan, kamu menyatakan bahwa data yang diberikan sudah benar.</p>
                </form>
            </section>
        </main>
    )
}

function ReceiptIcon({ size = 22, ...props }) {
    return <CreditCard size={size} {...props} />
}

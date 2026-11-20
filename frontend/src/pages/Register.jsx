
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import {
    Mountain,
    UserRound,
    Contact,
    MapPin,
    LockKeyhole,
    ShieldCheck,
    UploadCloud,
    FileImage,
    Eye,
    EyeOff,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Loader2,
    X,
    CalendarDays,
    Info,
} from 'lucide-react'

const initialForm = {
    name: '',
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
    nik: '',
    birth_date: '',
    phone: '',
    emergency_phone: '',
    gender: '',
    weight: '',
    height: '',
    province: '',
    city: '',
    district: '',
    village: '',
    address: '',
}

export default function Register() {
    const navigate = useNavigate()
    const fileInputRef = useRef(null)

    const [form, setForm] = useState(initialForm)
    const [identityFile, setIdentityFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [errors, setErrors] = useState({})
    const [message, setMessage] = useState('')
    const [messageType, setMessageType] = useState('success')
    const [loading, setLoading] = useState(false)

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmation, setShowConfirmation] = useState(false)

    // Membersihkan URL preview ketika berubah atau komponen dilepas
    useEffect(() => {
        return () => {
            if (preview) {
                URL.revokeObjectURL(preview)
            }
        }
    }, [preview])

    // Menghitung kelengkapan formulir
    const completedFields = Object.values(form).filter(
        value => String(value).trim() !== ''
    ).length + (identityFile ? 1 : 0)

    const totalFields = Object.keys(form).length + 1

    const progress = Math.round(
        (completedFields / totalFields) * 100
    )

    const updateField = (e) => {
        const { name, value } = e.target

        setForm(prev => ({
            ...prev,
            [name]: value,
        }))

        setErrors(prev => ({
            ...prev,
            [name]: null,
        }))
    }

    const handleFile = (e) => {
        const file = e.target.files?.[0]

        if (!file) return

        const allowed = ['image/jpeg', 'image/png']

        if (!allowed.includes(file.type)) {
            setErrors(prev => ({
                ...prev,
                identity_file: 'File harus menggunakan format JPG atau PNG.',
            }))
            e.target.value = ''
            return
        }

        if (file.size > 2 * 1024 * 1024) {
            setErrors(prev => ({
                ...prev,
                identity_file: 'Ukuran file maksimal 2 MB.',
            }))
            e.target.value = ''
            return
        }

        setIdentityFile(file)
        setPreview(URL.createObjectURL(file))

        setErrors(prev => ({
            ...prev,
            identity_file: null,
        }))
    }

    const removeFile = () => {
        setIdentityFile(null)
        setPreview(null)

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }

        setErrors(prev => ({
            ...prev,
            identity_file: null,
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        setErrors({})
        setMessage('')

        if (form.password !== form.password_confirmation) {
            setErrors({
                password_confirmation: ['Password tidak sama.'],
            })
            return
        }

        if (!identityFile) {
            setErrors({
                identity_file: ['Lampiran KTP wajib diunggah.'],
            })
            return
        }

        const data = new FormData()

        Object.entries(form).forEach(([key, value]) => {
            data.append(key, value)
        })

        data.append('identity_file', identityFile)

        try {
            setLoading(true)

            const response = await api.post('/register', data)

            setMessage(
                response.data.message || 'Registrasi berhasil dikirim.'
            )
            setMessageType('success')

            setForm(initialForm)
            setIdentityFile(null)
            setPreview(null)

            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }

            setTimeout(() => {
                navigate('/login')
            }, 2500)

        } catch (error) {
            const response = error.response

            if (response?.status === 422) {
                setErrors(response.data.errors || {})
                setMessage(
                    response.data.message ||
                    'Periksa kembali data registrasi Anda.'
                )
                setMessageType('error')
            } else {
                setMessage(
                    response?.data?.message ||
                    'Registrasi gagal. Periksa koneksi server.'
                )
                setMessageType('error')
            }
        } finally {
            setLoading(false)
        }
    }

    // Style input
    const inputClass = (name) =>
        `w-full rounded-xl border bg-gray-50 px-4 py-3.5 text-sm text-gray-800 outline-none transition duration-200 placeholder:text-gray-400 focus:bg-white focus:border-green-700 focus:ring-4 focus:ring-green-100 ${errors[name]
            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
            : 'border-gray-200'
        }`

    // Menampilkan error dari Laravel
    const getError = (name) => {
        const error = errors[name]

        if (!error) return null

        return Array.isArray(error) ? error[0] : error
    }

    // Komponen field input
    const field = (
        name,
        label,
        type = 'text',
        placeholder = '',
        options = {}
    ) => (
        <div className={options.className || ''}>

            <label
                htmlFor={name}
                className="block text-sm font-semibold text-gray-700 mb-2"
            >
                {label}
                <span className="text-red-500 ml-1">*</span>
            </label>

            <div className="relative">

                {options.icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        {options.icon}
                    </div>
                )}

                <input
                    id={name}
                    name={name}
                    type={type}
                    value={form[name]}
                    onChange={updateField}
                    placeholder={placeholder}
                    required
                    min={options.min}
                    max={options.max}
                    maxLength={options.maxLength}
                    inputMode={options.inputMode}
                    autoComplete={options.autoComplete}
                    className={`${inputClass(name)} ${options.icon ? 'pl-11' : ''
                        }`}
                />

            </div>

            {getError(name) && (
                <p className="text-red-600 text-xs mt-2">
                    {getError(name)}
                </p>
            )}

        </div>
    )

    // Komponen judul section
    const SectionHeading = ({ number, icon, title, description }) => (
        <div className="flex items-start gap-4 mb-7">

            <div className="w-12 h-12 shrink-0 bg-green-100 text-green-800 rounded-xl flex items-center justify-center">
                {icon}
            </div>

            <div>
                <p className="text-xs font-bold text-green-700 tracking-widest uppercase">
                    Bagian {number}
                </p>

                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {title}
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                    {description}
                </p>
            </div>

        </div>
    )

    return (
        <div className="bg-gray-50 min-h-screen py-10 sm:py-14 px-4 sm:px-6">

            <div className="max-w-5xl mx-auto">

                {/* HEADER */}
                <div className="text-center mb-10">

                    <Link
                        to="/"
                        className="inline-flex items-center justify-center w-16 h-16 bg-green-800 rounded-2xl shadow-lg shadow-green-900/20 mb-5 hover:bg-green-700 transition"
                    >
                        <Mountain size={34} className="text-white" />
                    </Link>

                    <p className="text-green-700 text-xs sm:text-sm font-bold tracking-[3px] uppercase">
                        Taman Nasional Gunung Merbabu
                    </p>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mt-4">
                        Registrasi Pendaki
                    </h1>

                    <p className="text-gray-500 mt-4 max-w-xl mx-auto leading-relaxed">
                        Lengkapi informasi identitas dan data diri
                        Anda untuk membuat akun reservasi pendakian
                        Gunung Merbabu.
                    </p>

                </div>


                {/* PROGRESS */}
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 sm:p-6 mb-6">

                    <div className="flex justify-between items-center mb-3">

                        <div>
                            <p className="font-bold text-gray-900 text-sm">
                                Kelengkapan Formulir
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Lengkapi seluruh data yang diperlukan.
                            </p>
                        </div>

                        <span className="text-green-800 font-extrabold text-xl">
                            {progress}%
                        </span>

                    </div>

                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-700 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="flex justify-between mt-3 text-xs text-gray-400">
                        <span>{completedFields} dari {totalFields} kolom terisi</span>
                        <span>Registrasi Pendaki</span>
                    </div>

                </div>


                {/* MESSAGE */}
                {message && (
                    <div
                        role="alert"
                        className={`flex items-start gap-3 p-4 rounded-xl mb-6 border ${messageType === 'success'
                                ? 'bg-green-50 border-green-200 text-green-800'
                                : 'bg-red-50 border-red-200 text-red-700'
                            }`}
                    >
                        {messageType === 'success'
                            ? <CheckCircle2 size={21} className="shrink-0 mt-0.5" />
                            : <Info size={21} className="shrink-0 mt-0.5" />
                        }

                        <p className="text-sm font-medium">
                            {message}
                        </p>
                    </div>
                )}


                {/* FORM */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden"
                >

                    <div className="p-5 sm:p-8 lg:p-10 space-y-10">


                        {/* SECTION 1: IDENTITAS */}
                        <section>

                            <SectionHeading
                                number="01"
                                icon={<UserRound size={25} />}
                                title="Identitas Pendaki"
                                description="Informasi identitas sesuai dokumen resmi."
                            />

                            <div className="grid sm:grid-cols-2 gap-5">

                                {field(
                                    'nik',
                                    'Nomor Induk Kependudukan (NIK)',
                                    'text',
                                    'Masukkan 16 digit NIK',
                                    {
                                        icon: <Contact size={18} />,
                                        maxLength: 16,
                                        inputMode: 'numeric',
                                    }
                                )}

                                {field(
                                    'name',
                                    'Nama Lengkap',
                                    'text',
                                    'Sesuai dengan KTP',
                                    {
                                        icon: <UserRound size={18} />,
                                    }
                                )}

                                {field(
                                    'birth_date',
                                    'Tanggal Lahir',
                                    'date',
                                    '',
                                    {
                                        icon: <CalendarDays size={18} />,
                                    }
                                )}

                                <div>

                                    <label
                                        htmlFor="gender"
                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                    >
                                        Jenis Kelamin
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>

                                    <select
                                        id="gender"
                                        name="gender"
                                        value={form.gender}
                                        onChange={updateField}
                                        required
                                        className={inputClass('gender')}
                                    >
                                        <option value="">
                                            Pilih jenis kelamin
                                        </option>
                                        <option value="Laki-laki">
                                            Laki-laki
                                        </option>
                                        <option value="Perempuan">
                                            Perempuan
                                        </option>
                                    </select>

                                    {getError('gender') && (
                                        <p className="text-red-600 text-xs mt-2">
                                            {getError('gender')}
                                        </p>
                                    )}

                                </div>

                                {field(
                                    'weight',
                                    'Berat Badan (kg)',
                                    'number',
                                    'Contoh: 65',
                                    { min: 1 }
                                )}

                                {field(
                                    'height',
                                    'Tinggi Badan (cm)',
                                    'number',
                                    'Contoh: 170',
                                    { min: 1 }
                                )}

                            </div>


                            {/* UPLOAD KTP */}
                            <div className="mt-8">

                                <div className="mb-3">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Foto Kartu Tanda Penduduk (KTP)
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>

                                    <p className="text-xs text-gray-500 mt-1">
                                        Unggah foto KTP yang jelas dan dapat dibaca.
                                    </p>
                                </div>

                                <label
                                    htmlFor="identity_file"
                                    className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-7 sm:p-10 text-center cursor-pointer transition ${errors.identity_file
                                            ? 'border-red-400 bg-red-50'
                                            : 'border-gray-300 bg-gray-50 hover:border-green-600 hover:bg-green-50'
                                        }`}
                                >

                                    {preview ? (
                                        <div className="w-full">

                                            <img
                                                src={preview}
                                                alt="Preview KTP"
                                                className="max-h-64 max-w-full mx-auto object-contain rounded-xl shadow-sm"
                                            />

                                            <div className="flex flex-wrap justify-center items-center gap-2 mt-5">

                                                <span className="text-sm font-semibold text-green-800">
                                                    <CheckCircle2 size={16} className="inline mr-1" />
                                                    {identityFile?.name}
                                                </span>

                                            </div>

                                            <p className="text-xs text-gray-500 mt-2">
                                                Klik untuk mengganti foto KTP.
                                            </p>

                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-green-100 text-green-800 rounded-2xl flex items-center justify-center mb-4">
                                                <UploadCloud size={32} />
                                            </div>

                                            <p className="text-gray-800 font-bold">
                                                Klik untuk mengunggah foto KTP
                                            </p>

                                            <p className="text-sm text-gray-500 mt-2">
                                                atau pilih file dari perangkat Anda
                                            </p>

                                            <div className="flex items-center gap-2 mt-5 text-xs text-gray-400">
                                                <FileImage size={16} />
                                                JPG / PNG · Maksimal 2 MB
                                            </div>
                                        </>
                                    )}

                                    <input
                                        key={identityFile ? identityFile.name : 'empty'}
                                        ref={fileInputRef}
                                        id="identity_file"
                                        type="file"
                                        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                                        onChange={handleFile}
                                        className="hidden"
                                    />

                                </label>

                                {identityFile && (
                                    <button
                                        type="button"
                                        onClick={removeFile}
                                        className="mt-3 inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-800 font-semibold"
                                    >
                                        <X size={16} />
                                        Hapus foto
                                    </button>
                                )}

                                {getError('identity_file') && (
                                    <p className="text-red-600 text-xs mt-2">
                                        {getError('identity_file')}
                                    </p>
                                )}

                            </div>

                        </section>


                        <div className="border-t border-gray-100" />


                        {/* SECTION 2: KONTAK */}
                        <section>

                            <SectionHeading
                                number="02"
                                icon={<Contact size={25} />}
                                title="Informasi Kontak"
                                description="Nomor telepon aktif dan kontak darurat."
                            />

                            <div className="grid sm:grid-cols-2 gap-5">

                                {field(
                                    'phone',
                                    'Nomor Telepon / WhatsApp',
                                    'tel',
                                    '0812xxxxxxxx',
                                    { icon: <Contact size={18} /> }
                                )}

                                {field(
                                    'emergency_phone',
                                    'Nomor Telepon Darurat',
                                    'tel',
                                    'Nomor keluarga / kerabat',
                                    { icon: <ShieldCheck size={18} /> }
                                )}

                                {field(
                                    'email',
                                    'Email Aktif',
                                    'email',
                                    'nama@email.com',
                                    { icon: <Contact size={18} /> }
                                )}

                            </div>

                        </section>


                        <div className="border-t border-gray-100" />


                        {/* SECTION 3: ALAMAT */}
                        <section>

                            <SectionHeading
                                number="03"
                                icon={<MapPin size={25} />}
                                title="Alamat Sesuai KTP"
                                description="Masukkan informasi domisili sesuai identitas."
                            />

                            <div className="grid sm:grid-cols-2 gap-5">

                                {field(
                                    'province',
                                    'Provinsi',
                                    'text',
                                    'Contoh: Jawa Tengah',
                                    { icon: <MapPin size={18} /> }
                                )}

                                {field(
                                    'city',
                                    'Kota / Kabupaten',
                                    'text',
                                    'Contoh: Kabupaten Magelang',
                                    { icon: <MapPin size={18} /> }
                                )}

                                {field(
                                    'district',
                                    'Kecamatan',
                                    'text',
                                    'Masukkan nama kecamatan'
                                )}

                                {field(
                                    'village',
                                    'Kelurahan / Desa',
                                    'text',
                                    'Masukkan nama desa'
                                )}

                            </div>

                            <div className="mt-5">

                                <label
                                    htmlFor="address"
                                    className="block text-sm font-semibold text-gray-700 mb-2"
                                >
                                    Alamat Lengkap
                                    <span className="text-red-500 ml-1">*</span>
                                </label>

                                <textarea
                                    id="address"
                                    name="address"
                                    value={form.address}
                                    onChange={updateField}
                                    required
                                    rows={4}
                                    placeholder="Masukkan nama jalan, nomor rumah, RT/RW, dan informasi alamat lainnya."
                                    className={`${inputClass('address')} resize-none`}
                                />

                                {getError('address') && (
                                    <p className="text-red-600 text-xs mt-2">
                                        {getError('address')}
                                    </p>
                                )}

                            </div>

                        </section>


                        <div className="border-t border-gray-100" />


                        {/* SECTION 4: AKUN */}
                        <section>

                            <SectionHeading
                                number="04"
                                icon={<LockKeyhole size={25} />}
                                title="Informasi Akun"
                                description="Buat username dan password untuk mengakses sistem."
                            />

                            <div className="grid sm:grid-cols-2 gap-5">

                                {field(
                                    'username',
                                    'Username',
                                    'text',
                                    'Buat username Anda',
                                    { icon: <UserRound size={18} /> }
                                )}

                                {/* PASSWORD */}
                                <div>

                                    <label
                                        htmlFor="password"
                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                    >
                                        Password
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>

                                    <div className="relative">

                                        <LockKeyhole
                                            size={18}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                        />

                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={form.password}
                                            onChange={updateField}
                                            required
                                            autoComplete="new-password"
                                            placeholder="Minimal 8 karakter"
                                            className={`${inputClass('password')} pl-11 pr-12`}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-800"
                                            aria-label="Tampilkan atau sembunyikan password"
                                        >
                                            {showPassword
                                                ? <EyeOff size={19} />
                                                : <Eye size={19} />
                                            }
                                        </button>

                                    </div>

                                    {getError('password') && (
                                        <p className="text-red-600 text-xs mt-2">
                                            {getError('password')}
                                        </p>
                                    )}

                                </div>


                                {/* PASSWORD CONFIRMATION */}
                                <div>

                                    <label
                                        htmlFor="password_confirmation"
                                        className="block text-sm font-semibold text-gray-700 mb-2"
                                    >
                                        Konfirmasi Password
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>

                                    <div className="relative">

                                        <LockKeyhole
                                            size={18}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                        />

                                        <input
                                            id="password_confirmation"
                                            name="password_confirmation"
                                            type={showConfirmation ? 'text' : 'password'}
                                            value={form.password_confirmation}
                                            onChange={updateField}
                                            required
                                            autoComplete="new-password"
                                            placeholder="Ulangi password"
                                            className={`${inputClass('password_confirmation')} pl-11 pr-12`}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmation(!showConfirmation)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-800"
                                            aria-label="Tampilkan atau sembunyikan konfirmasi password"
                                        >
                                            {showConfirmation
                                                ? <EyeOff size={19} />
                                                : <Eye size={19} />
                                            }
                                        </button>

                                    </div>

                                    {getError('password_confirmation') && (
                                        <p className="text-red-600 text-xs mt-2">
                                            {getError('password_confirmation')}
                                        </p>
                                    )}

                                </div>

                            </div>

                            <div className="mt-5 flex items-start gap-3 bg-green-50 rounded-xl p-4">
                                <ShieldCheck size={20} className="text-green-800 shrink-0 mt-0.5" />

                                <div>
                                    <p className="text-sm font-bold text-green-900">
                                        Keamanan Akun
                                    </p>

                                    <p className="text-xs text-green-800 mt-1 leading-relaxed">
                                        Gunakan password minimal 8 karakter
                                        dan jangan membagikan informasi akun
                                        kepada orang lain.
                                    </p>
                                </div>
                            </div>

                        </section>


                        {/* VERIFICATION INFORMATION */}
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">

                            <div className="flex items-start gap-3">

                                <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
                                    <Info size={21} />
                                </div>

                                <div>
                                    <h3 className="font-bold text-amber-900">
                                        Informasi Verifikasi Pendaftaran
                                    </h3>

                                    <p className="text-sm text-amber-800 mt-2 leading-relaxed">
                                        Verifikasi pendaftaran akun dilakukan
                                        oleh petugas pada jam kerja pukul
                                        08.00–16.00 WIB. Pastikan seluruh
                                        informasi yang diberikan sudah benar.
                                    </p>
                                </div>

                            </div>

                        </div>


                        {/* SUBMIT */}
                        <div className="space-y-5">

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 bg-green-800 hover:bg-green-900 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-900/15 transition duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >

                                {loading ? (
                                    <>
                                        <Loader2 size={21} className="animate-spin" />
                                        Mengirim Registrasi...
                                    </>
                                ) : (
                                    <>
                                        Daftar Sekarang
                                        <ArrowRight size={20} />
                                    </>
                                )}

                            </button>

                            <p className="text-center text-sm text-gray-500">
                                Sudah memiliki akun?
                                <Link
                                    to="/login"
                                    className="text-green-800 font-bold ml-1 hover:text-green-600"
                                >
                                    Login di sini
                                </Link>
                            </p>

                            <div className="text-center pt-3 border-t border-gray-100">

                                <Link
                                    to="/"
                                    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-green-800 transition"
                                >
                                    <ArrowLeft size={16} />
                                    Kembali ke Beranda
                                </Link>

                            </div>

                        </div>

                    </div>

                </form>


                {/* FOOTER */}
                <div className="text-center mt-8">
                    <p className="text-xs text-gray-400">
                        © 2026 Gunung Merbabu. All Rights Reserved.
                    </p>
                </div>

            </div>

        </div>
    )
}

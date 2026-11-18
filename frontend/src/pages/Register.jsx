
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

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

    const [form, setForm] = useState(initialForm)
    const [identityFile, setIdentityFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [errors, setErrors] = useState({})
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)

    const updateField = (e) => {
        const { name, value } = e.target

        setForm(prev => ({
            ...prev,
            [name]: value
        }))

        setErrors(prev => ({
            ...prev,
            [name]: null
        }))
    }

    const handleFile = (e) => {
        const file = e.target.files?.[0]

        if (!file) return

        const allowed = ['image/jpeg', 'image/png']

        if (!allowed.includes(file.type)) {
            setErrors(prev => ({
                ...prev,
                identity_file: 'File harus JPG atau PNG.'
            }))
            return
        }

        if (file.size > 2 * 1024 * 1024) {
            setErrors(prev => ({
                ...prev,
                identity_file: 'Ukuran file maksimal 2 MB.'
            }))
            return
        }

        setIdentityFile(file)
        setPreview(URL.createObjectURL(file))

        setErrors(prev => ({
            ...prev,
            identity_file: null
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        setErrors({})
        setMessage('')

        if (form.password !== form.password_confirmation) {
            setErrors({
                password_confirmation: 'Password tidak sama.'
            })
            return
        }

        if (!identityFile) {
            setErrors({
                identity_file: 'Lampiran KTP wajib diunggah.'
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

            setMessage(response.data.message)

            setForm(initialForm)
            setIdentityFile(null)
            setPreview(null)

            setTimeout(() => {
                navigate('/login')
            }, 2500)

        } catch (error) {
            const response = error.response

            if (response?.status === 422) {
                setErrors(response.data.errors || {})
                setMessage(response.data.message || 'Periksa kembali data registrasi.')
            } else {
                setMessage(
                    response?.data?.message ||
                    'Registrasi gagal. Periksa koneksi server.'
                )
            }
        } finally {
            setLoading(false)
        }
    }

    const inputClass =
        'w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100'

    const field = (name, label, type = 'text', placeholder = '') => (
        <div>
            <label className="block text-sm font-semibold mb-2">
                {label} <span className="text-red-500">*</span>
            </label>

            <input
                type={type}
                name={name}
                value={form[name]}
                onChange={updateField}
                placeholder={placeholder}
                className={inputClass}
                required
            />

            {errors[name] && (
                <p className="text-red-600 text-sm mt-1">
                    {errors[name][0]}
                </p>
            )}
        </div>
    )

    return (
        <div className="bg-gray-50 py-12 px-5">
            <div className="max-w-4xl mx-auto">

                <div className="text-center mb-10">
                    <p className="text-green-700 font-semibold">
                        PENDAFTARAN PENDAKI
                    </p>

                    <h1 className="text-3xl md:text-4xl font-bold mt-3">
                        Registrasi Akun
                    </h1>

                    <p className="text-gray-500 mt-3">
                        Lengkapi data diri untuk melakukan booking pendakian.
                    </p>
                </div>

                {message && (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl mb-6">
                        {message}
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="bg-white rounded-2xl shadow-sm border p-6 md:p-10 space-y-10"
                >

                    {/* IDENTITAS */}
                    <section>
                        <h2 className="text-xl font-bold mb-6">
                            01. Identitas Pendaki
                        </h2>

                        <div className="grid md:grid-cols-2 gap-5">

                            {field('nik', 'Nomor KTP', 'text', '16 digit NIK')}

                            {field('name', 'Nama Lengkap', 'text', 'Sesuai KTP')}

                            {field('birth_date', 'Tanggal Lahir', 'date')}

                            <div>
                                <label className="block text-sm font-semibold mb-2">
                                    Jenis Kelamin *
                                </label>

                                <select
                                    name="gender"
                                    value={form.gender}
                                    onChange={updateField}
                                    className={inputClass}
                                    required
                                >
                                    <option value="">Pilih jenis kelamin</option>
                                    <option value="Laki-laki">Laki-laki</option>
                                    <option value="Perempuan">Perempuan</option>
                                </select>
                            </div>

                            {field('weight', 'Berat Badan (kg)', 'number')}

                            {field('height', 'Tinggi Badan (cm)', 'number')}

                        </div>

                        <div className="mt-6">
                            <label className="block text-sm font-semibold mb-2">
                                Lampiran Identitas KTP *
                            </label>

                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                                onChange={handleFile}
                                className={inputClass}
                                required={!identityFile}
                            />

                            <p className="text-xs text-gray-500 mt-2">
                                Format JPG atau PNG. Maksimal 2 MB.
                            </p>

                            {errors.identity_file && (
                                <p className="text-red-600 text-sm mt-1">
                                    {errors.identity_file}
                                </p>
                            )}

                            {preview && (
                                <img
                                    src={preview}
                                    alt="Preview KTP"
                                    className="mt-4 max-h-48 rounded-lg border object-contain"
                                />
                            )}
                        </div>
                    </section>

                    {/* KONTAK */}
                    <section>
                        <h2 className="text-xl font-bold mb-6">
                            02. Informasi Kontak
                        </h2>

                        <div className="grid md:grid-cols-2 gap-5">
                            {field('phone', 'Nomor Telepon / WhatsApp', 'tel', '0812xxxxxxxx')}

                            {field('emergency_phone', 'Nomor Telepon Darurat', 'tel', 'Nomor keluarga/kerabat')}

                            {field('email', 'Email Aktif', 'email', 'nama@email.com')}
                        </div>
                    </section>

                    {/* ALAMAT */}
                    <section>
                        <h2 className="text-xl font-bold mb-6">
                            03. Alamat Sesuai KTP
                        </h2>

                        <div className="grid md:grid-cols-2 gap-5">
                            {field('province', 'Provinsi', 'text')}

                            {field('city', 'Kota / Kabupaten', 'text')}

                            {field('district', 'Kecamatan', 'text')}

                            {field('village', 'Kelurahan / Desa', 'text')}
                        </div>

                        <div className="mt-5">
                            <label className="block text-sm font-semibold mb-2">
                                Alamat Lengkap *
                            </label>

                            <textarea
                                name="address"
                                value={form.address}
                                onChange={updateField}
                                required
                                rows="4"
                                placeholder="Masukkan alamat sesuai KTP"
                                className={inputClass}
                            />
                        </div>
                    </section>

                    {/* AKUN */}
                    <section>
                        <h2 className="text-xl font-bold mb-6">
                            04. Informasi Akun
                        </h2>

                        <div className="grid md:grid-cols-2 gap-5">
                            {field('username', 'Username', 'text')}

                            {field('password', 'Password', 'password')}

                            {field('password_confirmation', 'Ketik Ulang Password', 'password')}
                        </div>

                        <p className="text-sm text-gray-500 mt-4">
                            Password minimal 8 karakter.
                        </p>
                    </section>

                    {/* INFORMASI */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
                        <p className="font-semibold text-yellow-900">
                            Informasi Verifikasi
                        </p>

                        <p className="text-sm text-yellow-800 mt-2">
                            Verifikasi pendaftaran akun dilakukan oleh petugas
                            pada jam kerja pukul 08.00–16.00 WIB.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-800 hover:bg-green-900 disabled:bg-gray-400 text-white font-semibold py-4 rounded-xl"
                    >
                        {loading ? 'Mengirim Registrasi...' : 'Daftar Sekarang'}
                    </button>

                    <p className="text-center text-gray-500">
                        Sudah memiliki akun?
                        <Link
                            to="/login"
                            className="text-green-800 font-semibold ml-1"
                        >
                            Login
                        </Link>
                    </p>

                </form>
            </div>
        </div>
    )
}

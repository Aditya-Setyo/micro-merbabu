
import {
    ClipboardList,
    UserRound,
    CalendarDays,
    CreditCard,
    Ticket,
    Mountain,
    Backpack,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    FileCheck,
    Clock,
    Users,
    MapPin
} from 'lucide-react'
import { Link } from 'react-router-dom'

const steps = [
    {
        number: '01',
        icon: UserRound,
        title: 'Registrasi Akun',
        description:
            'Buat akun melalui halaman registrasi dengan mengisi data diri sesuai identitas resmi.',
        details: [
            'Isi nama lengkap sesuai KTP atau paspor.',
            'Masukkan NIK dan nomor telepon aktif.',
            'Unggah foto identitas dengan format JPG atau PNG.',
            'Tunggu proses verifikasi akun.'
        ]
    },
    {
        number: '02',
        icon: CalendarDays,
        title: 'Pilih Jalur dan Tanggal',
        description:
            'Tentukan jalur pendakian, tanggal keberangkatan, durasi, dan jalur turun jika tersedia.',
        details: [
            'Pilih salah satu jalur pendakian resmi.',
            'Tentukan tanggal mulai pendakian.',
            'Pilih durasi pendakian.',
            'Periksa ketersediaan kuota sebelum melanjutkan.'
        ]
    },
    {
        number: '03',
        icon: Users,
        title: 'Isi Data Rombongan',
        description:
            'Lengkapi informasi seluruh anggota rombongan yang akan mengikuti pendakian.',
        details: [
            'Minimal 3 orang dalam satu rombongan.',
            'Maksimal 20 orang dalam satu pemesanan.',
            'Pastikan data setiap anggota benar.',
            'Tentukan ketua rombongan.'
        ]
    },
    {
        number: '04',
        icon: CreditCard,
        title: 'Konfirmasi Pemesanan',
        description:
            'Periksa kembali data pemesanan dan informasi biaya sebelum mengirimkan booking.',
        details: [
            'Periksa jalur dan tanggal pendakian.',
            'Pastikan jumlah anggota sesuai.',
            'Periksa rincian total biaya.',
            'Kirim pemesanan untuk mendapatkan kode booking.'
        ]
    },
    {
        number: '05',
        icon: Ticket,
        title: 'Pembayaran dan E-Tiket',
        description:
            'Selesaikan pembayaran sesuai instruksi dan simpan e-tiket untuk proses pemeriksaan.',
        details: [
            'Ikuti petunjuk pembayaran yang tersedia.',
            'Pastikan status pembayaran berhasil.',
            'Unduh atau simpan e-tiket.',
            'Tunjukkan e-tiket saat proses pemeriksaan di basecamp.'
        ]
    },
    {
        number: '06',
        icon: Mountain,
        title: 'Check-in dan Pendakian',
        description:
            'Datang ke basecamp sesuai jadwal untuk pemeriksaan identitas dan validasi e-tiket.',
        details: [
            'Datang sesuai tanggal dan jadwal keberangkatan.',
            'Siapkan identitas asli seluruh anggota.',
            'Lakukan validasi tiket dan check-in.',
            'Ikuti arahan petugas selama pendakian.'
        ]
    }
]

const preparations = [
    {
        icon: FileCheck,
        title: 'Dokumen Pendakian',
        items: [
            'KTP atau identitas resmi.',
            'E-tiket dan kode booking.',
            'Bukti pembayaran jika diperlukan.'
        ]
    },
    {
        icon: Backpack,
        title: 'Perlengkapan',
        items: [
            'Tas carrier dan perlengkapan pribadi.',
            'Pakaian hangat dan jas hujan.',
            'Makanan, air minum, dan obat pribadi.',
            'Peralatan keselamatan pendakian.'
        ]
    },
    {
        icon: ShieldCheck,
        title: 'Keselamatan',
        items: [
            'Pastikan kondisi fisik dalam keadaan baik.',
            'Patuhi arahan petugas dan aturan taman nasional.',
            'Jangan meninggalkan rombongan.',
            'Jaga kebersihan dan kelestarian alam.'
        ]
    }
]

function PanduanPage() {
    return (
        <main className="min-h-screen bg-gray-50">
            {/* Hero */}
            <section className="relative overflow-hidden bg-green-950 px-5 py-20 text-white">
                <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-green-800/30 blur-3xl" />
                <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-green-700/20 blur-3xl" />

                <div className="relative mx-auto max-w-6xl">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-green-700 bg-green-900/60 px-4 py-2 text-sm text-green-200">
                        <ClipboardList size={16} />
                        PANDUAN PENDAKIAN
                    </div>

                    <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
                        Panduan Booking Pendakian
                        <span className="block text-green-400">
                            Gunung Merbabu
                        </span>
                    </h1>

                    <p className="mt-5 max-w-2xl text-base leading-relaxed text-green-100 md:text-lg">
                        Pelajari tahapan pendaftaran hingga proses check-in
                        sebelum melakukan pendakian. Pastikan seluruh
                        persyaratan telah dipenuhi agar perjalanan berjalan
                        lancar dan aman.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            to="/destinasi"
                            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500"
                        >
                            Pilih Jalur Pendakian
                            <ArrowRight size={18} />
                        </Link>

                        <Link
                            to="/kuota"
                            className="inline-flex items-center gap-2 rounded-xl border border-green-600 px-6 py-3 font-semibold text-green-100 transition hover:bg-green-900"
                        >
                            Cek Kuota
                        </Link>
                    </div>
                </div>
            </section>

            {/* Alur Booking */}
            <section className="mx-auto max-w-6xl px-5 py-16">
                <div className="mb-10 text-center">
                    <p className="text-sm font-bold tracking-widest text-green-700">
                        TAHAPAN PENDAFTARAN
                    </p>
                    <h2 className="mt-2 text-3xl font-bold text-gray-900">
                        Alur Booking Pendakian
                    </h2>
                    <p className="mx-auto mt-3 max-w-2xl text-gray-500">
                        Ikuti enam tahapan berikut untuk melakukan pemesanan
                        pendakian Gunung Merbabu.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {steps.map((step) => {
                        const Icon = step.icon

                        return (
                            <article
                                key={step.number}
                                className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-800 transition group-hover:bg-green-800 group-hover:text-white">
                                        <Icon size={26} />
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold tracking-widest text-green-700">
                                                LANGKAH {step.number}
                                            </span>
                                        </div>

                                        <h3 className="mt-1 text-xl font-bold text-gray-900">
                                            {step.title}
                                        </h3>

                                        <p className="mt-2 text-sm leading-relaxed text-gray-500">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-3 border-t border-gray-100 pt-5">
                                    {step.details.map((detail, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start gap-3 text-sm text-gray-600"
                                        >
                                            <CheckCircle2
                                                size={17}
                                                className="mt-0.5 shrink-0 text-green-600"
                                            />
                                            <span>{detail}</span>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        )
                    })}
                </div>
            </section>

            {/* Persiapan */}
            <section className="bg-white py-16">
                <div className="mx-auto max-w-6xl px-5">
                    <div className="mb-10 text-center">
                        <p className="text-sm font-bold tracking-widest text-green-700">
                            SEBELUM BERANGKAT
                        </p>
                        <h2 className="mt-2 text-3xl font-bold text-gray-900">
                            Persiapan Pendakian
                        </h2>
                        <p className="mt-3 text-gray-500">
                            Pastikan semua kebutuhan pendakian telah
                            dipersiapkan dengan baik.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {preparations.map((item, index) => {
                            const Icon = item.icon

                            return (
                                <article
                                    key={index}
                                    className="rounded-2xl border border-gray-200 bg-gray-50 p-6"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-800">
                                        <Icon size={24} />
                                    </div>

                                    <h3 className="mt-5 text-lg font-bold text-gray-900">
                                        {item.title}
                                    </h3>

                                    <ul className="mt-4 space-y-3">
                                        {item.items.map((text, i) => (
                                            <li
                                                key={i}
                                                className="flex items-start gap-2 text-sm leading-relaxed text-gray-600"
                                            >
                                                <CheckCircle2
                                                    size={16}
                                                    className="mt-0.5 shrink-0 text-green-600"
                                                />
                                                {text}
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* Perhatian */}
            <section className="mx-auto max-w-6xl px-5 py-16">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 md:p-8">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                            <AlertCircle size={25} />
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-amber-900">
                                Hal yang Perlu Diperhatikan
                            </h3>

                            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-amber-900/80">
                                <li>
                                    • Pastikan seluruh data identitas anggota
                                    rombongan sesuai dengan dokumen resmi.
                                </li>
                                <li>
                                    • Pemesanan bergantung pada ketersediaan
                                    kuota jalur pendakian.
                                </li>
                                <li>
                                    • Simpan kode booking dan e-tiket untuk
                                    keperluan pemeriksaan.
                                </li>
                                <li>
                                    • Patuhi ketentuan dan pengumuman resmi
                                    pengelola Taman Nasional Gunung Merbabu.
                                </li>
                                <li>
                                    • Pendaki wajib mengikuti prosedur
                                    check-in dan check-out sesuai arahan
                                    petugas.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-green-950 px-5 py-16 text-white">
                <div className="mx-auto max-w-4xl text-center">

                    <h2 className="mt-5 text-3xl font-bold">
                        Siap Memulai Pendakian?
                    </h2>

                    <p className="mx-auto mt-4 max-w-xl leading-relaxed text-green-100">
                        Setelah memahami panduan booking, periksa kuota
                        pendakian dan pilih jalur yang sesuai dengan
                        rencana perjalananmu.
                    </p>

                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <Link
                            to="/destinasi"
                            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold transition hover:bg-green-500"
                        >
                            Lihat Jalur Pendakian
                            <ArrowRight size={18} />
                        </Link>

                        <Link
                            to="/kuota"
                            className="rounded-xl border border-green-600 px-6 py-3 font-semibold transition hover:bg-green-900"
                        >
                            Periksa Kuota
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    )
}

export default PanduanPage

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
    ClipboardList,
    FileText,
    UserCheck,
    CreditCard,
    Backpack,
    Mountain,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    MapPin,
    Phone,
    Tent,
    HeartPulse,
    Footprints,
    ArrowRight,
} from 'lucide-react'

const procedures = [
    {
        number: '01',
        title: 'Persiapan Sebelum Pendakian',
        subtitle: 'Pastikan seluruh kebutuhan pendakian telah disiapkan.',
        icon: Backpack,
        color: 'bg-blue-100 text-blue-700',
        steps: [
            'Pastikan kondisi fisik dalam keadaan sehat dan siap untuk melakukan pendakian.',
            'Siapkan perlengkapan pendakian sesuai kebutuhan dan kondisi cuaca.',
            'Pelajari jalur pendakian, aturan kawasan, serta informasi keselamatan.',
            'Pastikan seluruh anggota rombongan mengetahui jadwal dan rencana perjalanan.',
        ],
    },
    {
        number: '02',
        title: 'Registrasi dan Pemesanan',
        subtitle: 'Lakukan pendaftaran melalui sistem booking online.',
        icon: FileText,
        color: 'bg-purple-100 text-purple-700',
        steps: [
            'Buat akun atau login ke sistem booking pendakian.',
            'Pilih jalur pendakian dan tanggal keberangkatan.',
            'Isi data ketua rombongan dan seluruh anggota secara lengkap dan benar.',
            'Unggah dokumen identitas sesuai ketentuan yang berlaku.',
            'Periksa kembali data pemesanan sebelum mengirimkan permohonan booking.',
        ],
    },
    {
        number: '03',
        title: 'Pembayaran dan E-Tiket',
        subtitle: 'Selesaikan pembayaran dan simpan bukti pemesanan.',
        icon: CreditCard,
        color: 'bg-amber-100 text-amber-700',
        steps: [
            'Periksa informasi tagihan dan total biaya pendakian.',
            'Lakukan pembayaran sesuai instruksi sistem.',
            'Pastikan status pembayaran telah berhasil dikonfirmasi.',
            'Unduh atau simpan e-tiket yang diterbitkan sistem.',
            'Pastikan seluruh anggota rombongan memiliki informasi tiket yang diperlukan.',
        ],
    },
    {
        number: '04',
        title: 'Kedatangan dan Check-in',
        subtitle: 'Lakukan verifikasi sebelum memasuki jalur pendakian.',
        icon: UserCheck,
        color: 'bg-green-100 text-green-700',
        steps: [
            'Datang ke basecamp atau titik registrasi sesuai jadwal pemesanan.',
            'Tunjukkan e-tiket dan dokumen identitas kepada petugas.',
            'Ikuti proses verifikasi data dan pemeriksaan perlengkapan.',
            'Pastikan seluruh anggota rombongan telah tercatat dalam proses check-in.',
            'Ikuti arahan petugas sebelum memulai pendakian.',
        ],
    },
    {
        number: '05',
        title: 'Ketentuan Selama Pendakian',
        subtitle: 'Patuhi aturan dan jaga keselamatan selama berada di kawasan.',
        icon: Mountain,
        color: 'bg-emerald-100 text-emerald-700',
        steps: [
            'Ikuti jalur pendakian resmi yang telah ditentukan.',
            'Jangan memisahkan diri dari rombongan tanpa alasan yang jelas.',
            'Jaga kebersihan dan jangan meninggalkan sampah di kawasan taman nasional.',
            'Dilarang merusak flora, fauna, dan fasilitas kawasan.',
            'Patuhi arahan petugas serta ketentuan keselamatan yang berlaku.',
            'Segera laporkan kondisi darurat atau kecelakaan kepada petugas.',
        ],
    },
    {
        number: '06',
        title: 'Check-out dan Kepulangan',
        subtitle: 'Laporkan penyelesaian pendakian kepada petugas.',
        icon: Footprints,
        color: 'bg-orange-100 text-orange-700',
        steps: [
            'Kembali melalui jalur resmi sesuai ketentuan yang berlaku.',
            'Laporkan kedatangan seluruh anggota rombongan kepada petugas.',
            'Lakukan proses check-out dan verifikasi tiket.',
            'Pastikan tidak ada anggota rombongan yang tertinggal atau belum terdata.',
            'Laporkan apabila terdapat kendala atau kejadian selama pendakian.',
        ],
    },
]

const importantRules = [
    {
        icon: ShieldCheck,
        title: 'Utamakan Keselamatan',
        description: 'Jangan memaksakan pendakian apabila kondisi fisik atau cuaca tidak memungkinkan.',
    },
    {
        icon: Tent,
        title: 'Gunakan Jalur Resmi',
        description: 'Dilarang melewati jalur yang ditutup atau tidak ditetapkan sebagai jalur pendakian resmi.',
    },
    {
        icon: HeartPulse,
        title: 'Jaga Kondisi Kesehatan',
        description: 'Kenali batas kemampuan fisik dan segera laporkan apabila mengalami gangguan kesehatan.',
    },
    {
        icon: AlertTriangle,
        title: 'Patuhi Arahan Petugas',
        description: 'Ikuti informasi penutupan jalur, pembatasan kuota, dan instruksi keselamatan.',
    },
]

function ProcedureCard({ procedure, index, expanded, onToggle }) {
    const Icon = procedure.icon

    return (
        <article className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
            <button
                type="button"
                onClick={onToggle}
                className="w-full p-5 md:p-6 flex items-center gap-4 text-left"
                aria-expanded={expanded}
            >
                <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${procedure.color}`}>
                    <Icon size={23} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-green-800 bg-green-50 px-2 py-1 rounded-md">
                            TAHAP {procedure.number}
                        </span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-base md:text-lg">
                        {procedure.title}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                        {procedure.subtitle}
                    </p>
                </div>

                <div className="shrink-0 text-gray-400">
                    {expanded ? <ChevronUp size={21} /> : <ChevronDown size={21} />}
                </div>
            </button>

            {expanded && (
                <div className="px-5 md:px-6 pb-6">
                    <div className="border-t border-gray-100 pt-5 ml-0 md:ml-16">
                        <ol className="space-y-4">
                            {procedure.steps.map((step, stepIndex) => (
                                <li key={stepIndex} className="flex gap-3">
                                    <span className="w-6 h-6 shrink-0 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-xs font-bold">
                                        {stepIndex + 1}
                                    </span>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {step}
                                    </p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            )}
        </article>
    )
}

export default function SOPPage() {
    const [expandedItems, setExpandedItems] = useState([0])

    const toggleItem = (index) => {
        setExpandedItems((current) =>
            current.includes(index)
                ? current.filter((item) => item !== index)
                : [...current, index]
        )
    }

    const expandAll = () => {
        setExpandedItems(
            expandedItems.length === procedures.length
                ? []
                : procedures.map((_, index) => index)
        )
    }

    return (
        <main className="min-h-screen bg-gray-50">
            {/* Hero */}
            <section className="relative overflow-hidden bg-green-950 text-white">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -right-20 -top-32 w-96 h-96 rounded-full border-[40px] border-white" />
                    <div className="absolute -right-5 -bottom-48 w-96 h-96 rounded-full border-[40px] border-white" />
                </div>

                <div className="relative max-w-6xl mx-auto px-5 py-16 md:py-20">
                    <div className="inline-flex items-center gap-2 text-green-200 bg-green-900/60 border border-green-800 px-4 py-2 rounded-full text-xs font-semibold tracking-wider">
                        <ClipboardList size={15} />
                        INFORMASI PENDAKIAN
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold mt-6 leading-tight">
                        Standar Operasional
                        <br />
                        <span className="text-green-300">Prosedur (SOP)</span>
                    </h1>

                    <p className="text-green-100 mt-5 max-w-2xl leading-relaxed">
                        Panduan dan tata tertib bagi seluruh pendaki yang akan
                        melakukan aktivitas pendakian di kawasan Taman Nasional
                        Gunung Merbabu. Bacalah setiap tahapan sebelum memulai perjalanan.
                    </p>

                    <div className="flex flex-wrap gap-3 mt-8">
                        <Link
                            to="/destinasi"
                            className="inline-flex items-center gap-2 bg-white text-green-950 px-5 py-3 rounded-xl font-semibold hover:bg-green-50 transition"
                        >
                            Pilih Jalur Pendakian
                            <ArrowRight size={17} />
                        </Link>

                        <Link
                            to="/kuota"
                            className="inline-flex items-center gap-2 border border-green-700 text-white px-5 py-3 rounded-xl font-semibold hover:bg-green-900 transition"
                        >
                            <MapPin size={17} />
                            Cek Kuota
                        </Link>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="max-w-5xl mx-auto px-5 py-12 md:py-16">
                {/* Introduction */}
                <div className="mb-10">
                    <div className="flex items-center gap-2 text-green-800 font-semibold text-sm mb-3">
                        <FileText size={18} />
                        PEDOMAN PENDAKIAN
                    </div>

                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                        Prosedur Pendakian
                    </h2>

                    <p className="text-gray-500 mt-3 leading-relaxed max-w-3xl">
                        Setiap pendaki wajib mengikuti prosedur berikut untuk
                        mendukung kelancaran administrasi, keamanan, dan
                        kelestarian lingkungan kawasan Gunung Merbabu.
                    </p>
                </div>

                {/* Procedure List */}
                <div className="flex items-center justify-between gap-3 mb-5">
                    <div>
                        <h3 className="font-bold text-gray-900">
                            Tahapan Pendakian
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {procedures.length} tahapan prosedur
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={expandAll}
                        className="text-sm font-semibold text-green-800 hover:text-green-950"
                    >
                        {expandedItems.length === procedures.length
                            ? 'Tutup Semua'
                            : 'Buka Semua'}
                    </button>
                </div>

                <div className="space-y-4">
                    {procedures.map((procedure, index) => (
                        <ProcedureCard
                            key={procedure.number}
                            procedure={procedure}
                            index={index}
                            expanded={expandedItems.includes(index)}
                            onToggle={() => toggleItem(index)}
                        />
                    ))}
                </div>

                {/* Important Rules */}
                <div className="mt-14">
                    <div className="mb-6">
                        <p className="text-green-800 text-sm font-semibold tracking-wide">
                            PERHATIAN
                        </p>
                        <h2 className="text-2xl font-bold text-gray-900 mt-2">
                            Ketentuan Penting
                        </h2>
                        <p className="text-gray-500 mt-2">
                            Hal-hal yang wajib diperhatikan oleh setiap pendaki.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        {importantRules.map((rule, index) => {
                            const Icon = rule.icon

                            return (
                                <div
                                    key={index}
                                    className="bg-white border border-gray-200 rounded-2xl p-5 flex gap-4"
                                >
                                    <div className="w-11 h-11 shrink-0 bg-green-100 text-green-800 rounded-xl flex items-center justify-center">
                                        <Icon size={21} />
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-gray-900">
                                            {rule.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                            {rule.description}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Warning */}
                <div className="mt-10 bg-amber-50 border border-amber-200 rounded-2xl p-5 md:p-6 flex gap-4">
                    <div className="w-11 h-11 shrink-0 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                        <AlertTriangle size={23} />
                    </div>

                    <div>
                        <h3 className="font-bold text-amber-900">
                            Informasi Keselamatan
                        </h3>
                        <p className="text-sm text-amber-800 mt-2 leading-relaxed">
                            Pembukaan dan penutupan jalur pendakian dapat
                            berubah sewaktu-waktu berdasarkan kondisi cuaca,
                            aktivitas alam, serta kebijakan pengelola kawasan.
                            Selalu periksa pengumuman resmi sebelum melakukan
                            perjalanan.
                        </p>
                    </div>
                </div>

                {/* Checklist CTA */}
                <div className="mt-10 bg-green-950 rounded-2xl p-7 md:p-10 text-white text-center">
                    <div className="w-14 h-14 rounded-2xl bg-green-900 mx-auto flex items-center justify-center text-green-300">
                        <CheckCircle2 size={28} />
                    </div>

                    <h2 className="text-2xl font-bold mt-5">
                        Sudah Memahami SOP Pendakian?
                    </h2>

                    <p className="text-green-200 text-sm mt-3 max-w-xl mx-auto leading-relaxed">
                        Pastikan seluruh persyaratan telah dipenuhi sebelum
                        melakukan pemesanan tiket pendakian Gunung Merbabu.
                    </p>

                    <Link
                        to="/destinasi"
                        className="inline-flex items-center justify-center gap-2 bg-white text-green-950 px-6 py-3 rounded-xl font-bold mt-7 hover:bg-green-50 transition"
                    >
                        Mulai Booking Pendakian
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </section>
        </main>
    )
}

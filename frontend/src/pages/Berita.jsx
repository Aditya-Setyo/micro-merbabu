
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    Search,
    CalendarDays,
    ArrowRight,
    Newspaper,
    Clock,
    ChevronLeft,
    ChevronRight,
    Mountain,
    X
} from 'lucide-react'
import api from '../services/api'

const dummyNews = [
    {
        id: 1,
        title: 'Informasi Pembukaan Jalur Pendakian Gunung Merbabu',
        slug: 'informasi-pembukaan-jalur-pendakian-gunung-merbabu',
        category: 'Pengumuman',
        excerpt: 'Informasi terbaru mengenai pembukaan kembali jalur pendakian Gunung Merbabu bagi seluruh calon pendaki.',
        content: 'Balai Taman Nasional Gunung Merbabu menyampaikan informasi terkait pembukaan jalur pendakian. Calon pendaki diharapkan memperhatikan ketentuan dan prosedur pendaftaran yang berlaku sebelum melakukan pendakian.',
        image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200',
        author: 'Admin TNGunungMerbabu',
        published_at: '2026-11-18',
        is_featured: true
    },
    {
        id: 2,
        title: 'Persiapkan Perlengkapan Sebelum Mendaki Gunung Merbabu',
        slug: 'persiapkan-perlengkapan-sebelum-mendaki',
        category: 'Tips Pendakian',
        excerpt: 'Kenali perlengkapan wajib yang perlu dibawa untuk menjaga keamanan dan kenyamanan selama pendakian.',
        content: 'Persiapan perlengkapan merupakan salah satu faktor penting dalam kegiatan pendakian. Pastikan membawa perlengkapan pribadi, pakaian hangat, makanan, minuman, alat navigasi, dan perlengkapan keselamatan.',
        image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=900',
        author: 'Tim Informasi',
        published_at: '2026-11-15',
        is_featured: false
    },
    {
        id: 3,
        title: 'Jaga Kebersihan dan Kelestarian Alam Gunung Merbabu',
        slug: 'jaga-kebersihan-kelestarian-alam-gunung-merbabu',
        category: 'Konservasi',
        excerpt: 'Mari bersama menjaga ekosistem Gunung Merbabu dengan tidak meninggalkan sampah selama pendakian.',
        content: 'Gunung Merbabu merupakan kawasan konservasi yang harus dijaga bersama. Setiap pendaki memiliki tanggung jawab untuk membawa turun kembali sampah yang dihasilkan selama perjalanan.',
        image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=900',
        author: 'Tim Konservasi',
        published_at: '2026-11-12',
        is_featured: false
    },
    {
        id: 4,
        title: 'Panduan Pendaftaran Pendakian Secara Online',
        slug: 'panduan-pendaftaran-pendakian-online',
        category: 'Panduan',
        excerpt: 'Ikuti langkah-langkah pendaftaran online untuk mendapatkan tiket pendakian secara resmi.',
        content: 'Pendaftaran pendakian dilakukan melalui sistem booking online. Calon pendaki perlu membuat akun, mengisi data anggota rombongan, memilih jalur dan tanggal pendakian, serta menyelesaikan tahapan pemesanan.',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900',
        author: 'Admin TNGunungMerbabu',
        published_at: '2026-11-10',
        is_featured: false
    },
    {
        id: 5,
        title: 'Patuhi Prosedur Keselamatan Selama Pendakian',
        slug: 'patuhi-prosedur-keselamatan-pendakian',
        category: 'Keselamatan',
        excerpt: 'Keselamatan merupakan prioritas utama. Pahami prosedur pendakian dan ikuti arahan petugas.',
        content: 'Setiap pendaki wajib mematuhi prosedur keselamatan yang berlaku. Jangan memaksakan perjalanan ketika kondisi cuaca tidak mendukung dan selalu ikuti arahan petugas di lapangan.',
        image: 'https://images.unsplash.com/photo-1464278533981-50106e6176b1?w=900',
        author: 'Tim Informasi',
        published_at: '2026-11-08',
        is_featured: false
    },
    {
        id: 6,
        title: 'Keindahan Sabana Gunung Merbabu',
        slug: 'keindahan-sabana-gunung-merbabu',
        category: 'Wisata',
        excerpt: 'Mengenal keindahan alam dan pesona sabana yang menjadi salah satu daya tarik Gunung Merbabu.',
        content: 'Gunung Merbabu memiliki bentang alam yang beragam, termasuk kawasan sabana yang menjadi daya tarik bagi pendaki. Keindahan tersebut perlu dinikmati dengan tetap memperhatikan kelestarian lingkungan.',
        image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=900',
        author: 'Tim Informasi',
        published_at: '2026-11-05',
        is_featured: false
    }
]

const categories = [
    'Semua',
    'Pengumuman',
    'Tips Pendakian',
    'Konservasi',
    'Panduan',
    'Keselamatan',
    'Wisata'
]

const formatDate = (date) => {
    if (!date) return '-'

    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(new Date(date))
}

export default function Berita() {
    const [news, setNews] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('Semua')
    const [currentPage, setCurrentPage] = useState(1)

    const itemsPerPage = 6

    useEffect(() => {
        let active = true

        const fetchNews = async () => {
            try {
                setLoading(true)
                setError('')

                // Endpoint API berita yang disiapkan:
                // GET /news
                // Response: { data: [...] }

                const response = await api.get('/news')

                if (active) {
                    setNews(response.data.data || [])
                }
            } catch (err) {
                // Gunakan dummy selama API belum tersedia.
                if (active) {
                    setNews(dummyNews)
                }
            } finally {
                if (active) setLoading(false)
            }
        }

        fetchNews()

        return () => {
            active = false
        }
    }, [])

    const featuredNews = useMemo(() => {
        return news.find(item => item.is_featured) || news[0]
    }, [news])

    const filteredNews = useMemo(() => {
        return news.filter(item => {
            const keyword = search.toLowerCase()

            const matchesSearch =
                item.title?.toLowerCase().includes(keyword) ||
                item.excerpt?.toLowerCase().includes(keyword)

            const matchesCategory =
                category === 'Semua' || item.category === category

            return matchesSearch && matchesCategory &&
                item.id !== featuredNews?.id
        })
    }, [news, search, category, featuredNews])

    const totalPages = Math.ceil(filteredNews.length / itemsPerPage)

    const paginatedNews = filteredNews.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const handleSearch = (value) => {
        setSearch(value)
        setCurrentPage(1)
    }

    const handleCategory = (value) => {
        setCategory(value)
        setCurrentPage(1)
    }

    return (
        <main className="min-h-screen bg-gray-50">

            {/* Hero */}
            <section className="relative overflow-hidden bg-green-950 text-white">
                <div className="absolute inset-0 opacity-20">
                    <img
                        src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600"
                        alt="Pegunungan"
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="relative max-w-6xl mx-auto px-5 py-16 md:py-20">
                    <div className="flex items-center gap-2 text-green-300 text-sm font-semibold tracking-widest">
                        <Newspaper size={17} />
                        INFORMASI TAMAN NASIONAL
                    </div>

                    <h1 className="text-3xl md:text-5xl font-bold mt-5">
                        Berita & Informasi
                    </h1>

                    <p className="text-green-100 mt-4 max-w-2xl leading-relaxed">
                        Dapatkan informasi terbaru seputar kegiatan,
                        pengumuman, panduan, dan perkembangan pendakian
                        Gunung Merbabu.
                    </p>
                </div>
            </section>

            <section className="max-w-6xl mx-auto px-5 py-12">

                {/* Featured News */}
                {featuredNews && (
                    <div className="mb-12">
                        <div className="flex items-center gap-2 mb-5">
                            <span className="w-2 h-6 bg-green-700 rounded-full" />
                            <h2 className="text-xl font-bold text-gray-900">
                                Berita Utama
                            </h2>
                        </div>

                        <article className="grid md:grid-cols-2 bg-white rounded-2xl overflow-hidden border shadow-sm">
                            <div className="h-64 md:h-full min-h-72 bg-gray-200">
                                <img
                                    src={featuredNews.image}
                                    alt={featuredNews.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            <div className="p-6 md:p-9 flex flex-col justify-center">
                                <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full w-fit">
                                    {featuredNews.category}
                                </span>

                                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-5 leading-tight">
                                    {featuredNews.title}
                                </h2>

                                <p className="text-gray-600 mt-4 leading-relaxed">
                                    {featuredNews.excerpt}
                                </p>

                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-5">
                                    <CalendarDays size={16} />
                                    {formatDate(featuredNews.published_at)}
                                </div>

                                <Link
                                    to={`/berita/${featuredNews.slug}`}
                                    className="inline-flex items-center gap-2 bg-green-800 hover:bg-green-900 text-white px-5 py-3 rounded-lg mt-7 w-fit font-medium transition"
                                >
                                    Baca Selengkapnya
                                    <ArrowRight size={17} />
                                </Link>
                            </div>
                        </article>
                    </div>
                )}

                {/* News List Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-7">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Berita Terbaru
                        </h2>
                        <p className="text-gray-500 mt-1">
                            Informasi dan kabar terbaru Gunung Merbabu.
                        </p>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search
                            size={19}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            type="text"
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Cari berita..."
                            className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-700"
                        />

                        {search && (
                            <button
                                type="button"
                                onClick={() => handleSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                aria-label="Hapus pencarian"
                            >
                                <X size={17} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 overflow-x-auto pb-3 mb-7">
                    {categories.map(item => (
                        <button
                            key={item}
                            onClick={() => handleCategory(item)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition ${
                                category === item
                                    ? 'bg-green-800 text-white'
                                    : 'bg-white border text-gray-600 hover:border-green-700 hover:text-green-800'
                            }`}
                        >
                            {item}
                        </button>
                    ))}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="py-16 text-center text-gray-500">
                        Memuat berita...
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="bg-red-50 text-red-700 rounded-xl p-4 mb-6">
                        {error}
                    </div>
                )}

                {/* News Grid */}
                {!loading && (
                    <>
                        {paginatedNews.length > 0 ? (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {paginatedNews.map(item => (
                                    <article
                                        key={item.id}
                                        className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition group"
                                    >
                                        <div className="h-52 overflow-hidden bg-gray-200">
                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                            />
                                        </div>

                                        <div className="p-5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-semibold bg-green-100 text-green-800 px-3 py-1 rounded-full">
                                                    {item.category}
                                                </span>

                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <CalendarDays size={13} />
                                                    {formatDate(item.published_at)}
                                                </span>
                                            </div>

                                            <h3 className="font-bold text-lg text-gray-900 mt-4 line-clamp-2 group-hover:text-green-800 transition">
                                                {item.title}
                                            </h3>

                                            <p className="text-sm text-gray-500 mt-3 leading-relaxed line-clamp-3">
                                                {item.excerpt}
                                            </p>

                                            <div className="border-t mt-5 pt-4">
                                                <Link
                                                    to={`/berita/${item.slug}`}
                                                    className="inline-flex items-center gap-2 text-green-800 font-semibold text-sm hover:gap-3 transition-all"
                                                >
                                                    Baca Selengkapnya
                                                    <ArrowRight size={16} />
                                                </Link>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white border rounded-2xl py-16 text-center">
                                <Newspaper
                                    size={42}
                                    className="mx-auto text-gray-300"
                                />
                                <h3 className="font-bold text-gray-800 mt-4">
                                    Berita tidak ditemukan
                                </h3>
                                <p className="text-sm text-gray-500 mt-2">
                                    Coba gunakan kata kunci atau kategori lain.
                                </p>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-10">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(page => page - 1)}
                                    className="p-2 border rounded-lg disabled:opacity-40 hover:bg-gray-100"
                                    aria-label="Halaman sebelumnya"
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                <span className="px-4 text-sm text-gray-600">
                                    Halaman {currentPage} dari {totalPages}
                                </span>

                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(page => page + 1)}
                                    className="p-2 border rounded-lg disabled:opacity-40 hover:bg-gray-100"
                                    aria-label="Halaman berikutnya"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* Bottom CTA */}
            <section className="bg-green-900 text-white">
                <div className="max-w-6xl mx-auto px-5 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-green-300 text-sm font-semibold">
                            RENCANAKAN PENDAKIANMU
                        </div>

                        <h2 className="text-2xl font-bold mt-3">
                            Siap menjelajahi Gunung Merbabu?
                        </h2>

                        <p className="text-green-100 mt-2">
                            Periksa ketersediaan kuota sebelum melakukan pemesanan.
                        </p>
                    </div>

                    <Link
                        to="/kuota"
                        className="bg-white text-green-900 px-6 py-3 rounded-xl font-semibold hover:bg-green-50 transition inline-flex items-center gap-2 whitespace-nowrap"
                    >
                        Cek Kuota Pendakian
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </section>
        </main>
    )
}


import { Link } from 'react-router-dom'
import {
    Mountain,
    Compass,
    CalendarCheck,
    ShieldCheck,
    ArrowRight,
    MapPin,
    Trees,
    TentTree,
    ChevronRight,
    Footprints,
} from 'lucide-react'

export default function Home() {
    const destinations = [
        {
            title: 'Puncak Gunung Merbabu',
            subtitle: 'Panorama pegunungan yang memukau',
            image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900',
            number: '01',
        },
        {
            title: 'Padang Savana',
            subtitle: 'Hamparan padang rumput di lereng gunung',
            image: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=900',
            number: '02',
        },
        {
            title: 'Golden Sunrise',
            subtitle: 'Pemandangan matahari terbit dari ketinggian',
            image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=900',
            number: '03',
        },
    ]

    const features = [
        {
            icon: <CalendarCheck size={25} />,
            title: 'Reservasi Online',
            description:
                'Lakukan pendaftaran pendakian dengan mudah melalui sistem reservasi online.',
        },
        {
            icon: <ShieldCheck size={25} />,
            title: 'Pendakian Terencana',
            description:
                'Persiapkan perjalanan dengan informasi dan panduan pendakian.',
        },
        {
            icon: <Compass size={25} />,
            title: 'Informasi Jalur',
            description:
                'Kenali destinasi dan jalur pendakian sebelum memulai petualangan.',
        },
    ]

    return (
        <div className="bg-white overflow-hidden">

            {/* HERO SECTION */}
            <section className="relative min-h-[620px] lg:min-h-[700px] flex items-center">

                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage:
                            "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=2000')",
                    }}
                />

                <div className="absolute inset-0 bg-gradient-to-r from-green-950/95 via-green-950/70 to-green-950/20" />

                <div className="absolute inset-0 bg-gradient-to-t from-green-950/50 via-transparent to-transparent" />

                <div className="relative max-w-7xl mx-auto px-5 sm:px-8 w-full py-24">

                    <div className="max-w-3xl">

                        <div className="inline-flex items-center gap-2 border border-white/30 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-7">
                            <span className="text-xs sm:text-sm tracking-widest uppercase font-semibold text-green-100">
                                Taman Nasional Gunung Merbabu
                            </span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-white leading-[1.15] tracking-tight">
                            Temukan Keindahan
                            <span className="block text-green-300">
                                Gunung Merbabu
                            </span>
                        </h1>

                        <p className="mt-7 text-gray-200 text-base sm:text-lg leading-relaxed max-w-xl">
                            Jelajahi pesona alam Gunung Merbabu dan
                            nikmati pengalaman pendakian yang
                            berkesan. Rencanakan perjalananmu melalui
                            sistem reservasi pendakian online.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 mt-9">

                            <Link
                                to="/destinasi"
                                className="inline-flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white px-7 py-4 rounded-xl font-bold shadow-xl shadow-green-950/30 transition duration-300"
                            >
                                Jelajahi Destinasi
                                <ArrowRight size={19} />
                            </Link>

                            <Link
                                to="/kuota"
                                className="inline-flex items-center justify-center gap-3 border border-white/60 hover:bg-white hover:text-green-900 text-white px-7 py-4 rounded-xl font-semibold transition duration-300"
                            >
                                <CalendarCheck size={19} />
                                Cek Kuota Pendakian
                            </Link>

                        </div>

                        <div className="flex flex-wrap gap-x-7 gap-y-3 mt-12 text-sm text-gray-200">
                            <div className="flex items-center gap-2">
                                <MapPin size={17} className="text-green-300" />
                                Keindahan Alam Indonesia
                            </div>

                            <div className="flex items-center gap-2">
                                <Trees size={17} className="text-green-300" />
                                Wisata Alam
                            </div>
                        </div>

                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />

            </section>


            {/* INTRODUCTION */}
            <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16 lg:py-20">

                <div className="grid lg:grid-cols-2 gap-12 items-center">

                    <div>
                        <p className="text-green-700 font-bold tracking-[3px] uppercase text-xs mb-4">
                            Explore The Nature
                        </p>

                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight">
                            Lebih Dekat dengan
                            <span className="text-green-800"> Alam Merbabu</span>
                        </h2>

                        <p className="mt-6 text-gray-600 leading-relaxed">
                            Gunung Merbabu menawarkan keindahan alam
                            yang menjadi daya tarik bagi para pecinta
                            kegiatan luar ruang. Mulai dari panorama
                            pegunungan, padang savana, hingga suasana
                            matahari terbit yang memukau.
                        </p>

                        <p className="mt-4 text-gray-600 leading-relaxed">
                            Sebelum melakukan pendakian, pastikan
                            seluruh persiapan telah dilakukan dan
                            ikuti ketentuan yang berlaku demi
                            keselamatan serta kelestarian alam.
                        </p>

                        <Link
                            to="/panduan"
                            className="inline-flex items-center gap-2 mt-7 text-green-800 font-bold hover:gap-4 transition-all"
                        >
                            Pelajari Panduan Pendakian
                            <ArrowRight size={19} />
                        </Link>
                    </div>

                    <div className="relative">
                        <img
                            src="https://images.unsplash.com/photo-1472396961693-142e6e269027?w=1000"
                            alt="Keindahan alam pegunungan"
                            className="w-full h-[320px] sm:h-[420px] object-cover rounded-3xl shadow-xl"
                        />

                        <div className="absolute -bottom-5 -left-3 sm:-left-6 bg-white p-5 sm:p-6 rounded-2xl shadow-xl max-w-[230px]">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 text-green-800 p-3 rounded-xl">
                                    <Mountain size={25} />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">
                                        Explore Merbabu
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Nature & Adventure
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </section>


            {/* DESTINATIONS */}
            <section className="bg-gray-50 py-20">

                <div className="max-w-7xl mx-auto px-5 sm:px-8">

                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-10">

                        <div>
                            <p className="text-green-700 font-bold tracking-[3px] uppercase text-xs mb-3">
                                Discover Merbabu
                            </p>

                            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                                Destinasi Wisata
                            </h2>

                            <p className="text-gray-500 mt-3">
                                Temukan keindahan alam di kawasan Gunung Merbabu.
                            </p>
                        </div>

                        <Link
                            to="/destinasi"
                            className="inline-flex items-center gap-2 text-green-800 font-bold hover:gap-4 transition-all"
                        >
                            Lihat Semua
                            <ArrowRight size={18} />
                        </Link>

                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">

                        {destinations.map((item) => (
                            <div
                                key={item.number}
                                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition duration-300"
                            >

                                <div className="relative h-64 overflow-hidden">

                                    <img
                                        src={item.image}
                                        alt={item.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                    <span className="absolute top-5 left-5 bg-white/90 backdrop-blur-sm text-green-900 text-xs font-bold px-4 py-2 rounded-full">
                                        DESTINASI {item.number}
                                    </span>

                                    <h3 className="absolute bottom-5 left-5 right-5 text-white text-xl font-bold">
                                        {item.title}
                                    </h3>

                                </div>

                                <div className="p-6">

                                    <p className="text-gray-500 text-sm leading-relaxed">
                                        {item.subtitle}
                                    </p>

                                    <Link
                                        to="/destinasi"
                                        className="inline-flex items-center gap-2 mt-5 text-green-800 text-sm font-bold group-hover:gap-4 transition-all"
                                    >
                                        Jelajahi
                                        <ChevronRight size={18} />
                                    </Link>

                                </div>

                            </div>
                        ))}

                    </div>

                </div>

            </section>


            {/* BOOKING FEATURES */}
            <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20">

                <div className="text-center max-w-2xl mx-auto mb-14">

                    <p className="text-green-700 font-bold tracking-[3px] uppercase text-xs mb-3">
                        Easy & Convenient
                    </p>

                    <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                        Pendakian Lebih Mudah
                    </h2>

                    <p className="text-gray-500 mt-4 leading-relaxed">
                        Manfaatkan layanan informasi dan reservasi
                        online untuk membantu merencanakan pendakian
                        Gunung Merbabu.
                    </p>

                </div>

                <div className="grid md:grid-cols-3 gap-7">

                    {features.map((item, index) => (
                        <div
                            key={index}
                            className="p-8 border border-gray-100 rounded-2xl hover:border-green-200 hover:shadow-lg transition duration-300"
                        >

                            <div className="w-14 h-14 bg-green-100 text-green-800 rounded-2xl flex items-center justify-center mb-6">
                                {item.icon}
                            </div>

                            <h3 className="text-xl font-bold text-gray-900">
                                {item.title}
                            </h3>

                            <p className="text-gray-500 mt-3 leading-relaxed text-sm">
                                {item.description}
                            </p>

                        </div>
                    ))}

                </div>

            </section>


            {/* BOOKING CTA */}
            <section className="relative bg-green-950 py-20 sm:py-24 overflow-hidden">

                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -right-20 -top-32 w-96 h-96 border-[40px] border-white rounded-full" />
                    <div className="absolute -left-20 -bottom-40 w-96 h-96 border-[40px] border-white rounded-full" />
                </div>

                <div className="relative max-w-4xl mx-auto px-5 text-center">

                    <div className="w-16 h-16 bg-green-800 rounded-2xl flex items-center justify-center mx-auto mb-7">
                        <Footprints size={32} className="text-green-200" />
                    </div>

                    <p className="text-green-300 text-xs font-bold tracking-[3px] uppercase mb-4">
                        Your Adventure Starts Here
                    </p>

                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                        Siap Memulai Petualanganmu?
                    </h2>

                    <p className="text-green-100/80 mt-5 max-w-xl mx-auto leading-relaxed">
                        Rencanakan pendakianmu sekarang. Periksa
                        ketersediaan kuota dan lakukan reservasi
                        melalui sistem booking online.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4 mt-9">

                        <Link
                            to="/kuota"
                            className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white px-8 py-4 rounded-xl font-bold transition shadow-lg"
                        >
                            Cek Kuota Pendakian
                            <ArrowRight size={19} />
                        </Link>

                        <Link
                            to="/panduan"
                            className="inline-flex items-center justify-center gap-2 border border-green-300/50 hover:bg-white/10 text-white px-8 py-4 rounded-xl font-semibold transition"
                        >
                            Panduan Booking
                        </Link>

                    </div>

                </div>

            </section>

        </div>
    )
}

import { Link } from 'react-router-dom'

export default function Home() {
    return (
        <div>
            <section className="relative min-h-[550px] bg-green-950 text-white flex items-center">
                <div className="max-w-7xl mx-auto px-6 w-full">
                    <div className="max-w-2xl">
                        <p className="text-green-300 uppercase tracking-widest mb-4">
                            Taman Nasional Gunung Merbabu
                        </p>

                        <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                            Jelajahi Keindahan
                            <span className="text-green-300">
                                {' '}Gunung Merbabu
                            </span>
                        </h1>

                        <p className="mt-6 text-gray-200 leading-relaxed">
                            Nikmati pengalaman pendakian Gunung Merbabu
                            melalui sistem reservasi online yang mudah,
                            aman, dan terintegrasi.
                        </p>

                        <Link
                            to="/destinasi"
                            className="inline-block mt-8 bg-green-500 hover:bg-green-600 px-7 py-3 rounded-xl font-semibold"
                        >
                            Mulai Pendakian
                        </Link>
                    </div>
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-6 py-20">
                <h2 className="text-3xl font-bold text-center">
                    Destinasi Wisata
                </h2>

                <p className="text-gray-500 text-center mt-3">
                    Jelajahi keindahan alam Gunung Merbabu.
                </p>

                <div className="grid md:grid-cols-3 gap-6 mt-10">
                    {[
                        'Keindahan Puncak Merbabu',
                        'Padang Savana',
                        'Keindahan Sunrise',
                    ].map((item, index) => (
                        <div
                            key={index}
                            className="bg-white border rounded-2xl p-8 shadow-sm"
                        >
                            <h3 className="text-xl font-bold">{item}</h3>
                            <p className="text-gray-500 mt-3">
                                Nikmati keindahan alam dan pengalaman
                                pendakian Gunung Merbabu.
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-green-50 py-16 text-center">
                <h2 className="text-3xl font-bold">
                    Siap Memulai Pendakian?
                </h2>

                <p className="text-gray-600 mt-3">
                    Lakukan reservasi pendakian secara online.
                </p>

                <Link
                    to="/destinasi"
                    className="inline-block mt-6 bg-green-800 text-white px-7 py-3 rounded-xl"
                >
                    Booking Sekarang
                </Link>
            </section>
        </div>
    )
}
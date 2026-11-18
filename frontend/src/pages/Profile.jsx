import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function Profile() {
    const [user, setUser] = useState(null)
    const [bookings, setBookings] = useState([])

    useEffect(() => {
        Promise.all([
            api.get('/profile'),
            api.get('/bookings')
        ])
        .then(([profile, history]) => {
            setUser(profile.data.data)
            setBookings(history.data.data)
        })
        .catch((error) => {
            console.error(error)
        })
    }, [])

    if (!user) {
        return <p className="p-10">Memuat profil pendaki...</p>
    }

    const profileItems = [
        ['Nama Lengkap', user.name],
        ['NIK', user.nik],
        ['Telepon', user.phone],
        ['Email', user.email],
        ['Jenis Kelamin', user.gender],
        ['Tanggal Lahir', user.birth_date],
        ['Tinggi Badan', `${user.height || '-'} cm`],
        ['Berat Badan', `${user.weight || '-'} kg`],
        ['Alamat', user.address],
    ]

    return (
        <section className="max-w-7xl mx-auto px-6 py-12">

            <div className="bg-white rounded-2xl shadow-sm border p-8">

                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-green-900">
                            Profil Pendaki
                        </h1>
                        <p className="text-gray-500 mt-2">
                            Informasi akun dan data pribadi.
                        </p>
                    </div>

                    <Link
                        to="/destinasi"
                        className="bg-green-800 text-white px-5 py-3 rounded-lg"
                    >
                        Booking Pendakian
                    </Link>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {profileItems.map(([label, value]) => (
                        <div key={label} className="border-b pb-3">
                            <p className="text-gray-500 text-sm">{label}</p>
                            <p className="font-semibold mt-1 break-words">
                                {value || '-'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-10">
                <h2 className="text-2xl font-bold mb-5">
                    Riwayat Pendakian
                </h2>

                <div className="bg-white border rounded-2xl overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-4">Kode Booking</th>
                                <th className="p-4">Jalur</th>
                                <th className="p-4">Tanggal</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {bookings.map((booking) => (
                                <tr key={booking.id} className="border-t">
                                    <td className="p-4">
                                        {booking.booking_code}
                                    </td>
                                    <td className="p-4">
                                        {booking.route?.name}
                                    </td>
                                    <td className="p-4">
                                        {booking.booking_date}
                                    </td>
                                    <td className="p-4">
                                        {booking.status}
                                    </td>
                                </tr>
                            ))}

                            {bookings.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-6 text-center text-gray-500">
                                        Belum ada riwayat pendakian.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </section>
    )
}
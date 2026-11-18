import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import RoutesPage from './pages/Routes'
import Profile from './pages/Profile'
import Register from './pages/Register'
import Quota from './pages/Quota'
import BookingPage from './pages/Booking'
import BookingSuccess from './pages/BookingSuccess'

function App() {
    return (
        <BrowserRouter>
            <Navbar />

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/destinasi" element={<RoutesPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/register" element={<Register />} />
                <Route path="/kuota" element={<Quota />} />
                <Route path="/booking" element={<BookingPage />} />
                <Route path="/booking/berhasil/:id" element={<BookingSuccess />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
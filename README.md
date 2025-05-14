# 🏥 Doctor Appointment Booking System

A full-stack web application that allows patients to view doctor profiles, check real-time availability, and book appointments seamlessly.

## 🚀 Features

- 🧑‍⚕️ Browse doctor profiles with detailed information (name, specialization, degree, experience, fees)
- 📅 View dynamically generated available slots (next 7 days, real-time filtered)
- ⏰ Prevent double bookings by disabling already booked slots
- 🔐 Secure login and token-based authentication for booking
- 📄 View user appointments after booking
- 🔍 Related doctor recommendations based on specialization
- 💻 Responsive UI built for both desktop and mobile

## 🛠️ Tech Stack

**Frontend:**
- React.js
- React Router DOM
- Axios
- Tailwind CSS
- React Toastify

**Backend:**
- Node.js
- Express.js
- MongoDB (with Mongoose)
- JWT Authentication

## 🔗 Live Demo

https://doctor-appointment-booking-application-frontend.vercel.app/

## 🧩 How It Works

1. **User visits doctor profile** – views image, name, specialty, experience, fees, and about section.
2. **Real-time slot generation** – next 7 days of slots shown (10 AM to 9 PM, 30-min intervals).
3. **Slot filtering** – removes already booked times using data from backend.
4. **Booking** – authenticated users can book a slot by selecting date and time.
5. **Confirmation** – booking saved to DB and user redirected to "My Appointments".

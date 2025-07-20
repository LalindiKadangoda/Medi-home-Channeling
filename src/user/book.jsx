import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiClock, FiUser, FiMapPin, FiDollarSign } from "react-icons/fi";
import { Toaster } from "react-hot-toast";
import UserProfile from "../components/UserProfile";
import { toast } from "react-hot-toast";
import LocationPicker from "../Components/LocationPicker";

export default function BookAppointment() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [doctor, setDoctor] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [bookedAppointments, setBookedAppointments] = useState([]);
    const [userData, setUserData] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        reason: "",
        location: ""
    });
    const [, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchDoctorDetails();
        fetchUserDetails();
    }, [id]);

    // Fetch user details from localStorage
    const fetchUserDetails = () => {
        try {
            const userDataFromStorage = JSON.parse(localStorage.getItem('user'));
            if (userDataFromStorage) {
                // Store user data in state
                setUserData(userDataFromStorage);

                // Pre-fill form with user data if available
                setFormData(prevData => ({
                    ...prevData,
                    name: userDataFromStorage.name || userDataFromStorage.username || '', // Try both name and username fields
                    email: userDataFromStorage.email || '',
                    phone: userDataFromStorage.phone || userDataFromStorage.contactNumber || '' // Try both phone and contactNumber fields
                }));

                // If phone number is not in the expected format, format it
                if (userDataFromStorage.phone || userDataFromStorage.contactNumber) {
                    let phoneNumber = userDataFromStorage.phone || userDataFromStorage.contactNumber;
                    // Remove any non-digit characters
                    phoneNumber = phoneNumber.replace(/\D/g, '');
                    
                    // Format based on length and prefix
                    if (phoneNumber.startsWith('94')) {
                        phoneNumber = '+' + phoneNumber;
                    } else if (phoneNumber.startsWith('0')) {
                        // eslint-disable-next-line no-self-assign
                        phoneNumber = phoneNumber;
                    } else {
                        phoneNumber = '0' + phoneNumber;
                    }

                    setFormData(prevData => ({
                        ...prevData,
                        phone: phoneNumber
                    }));
                }

                // Log the user data and form data for debugging
                console.log('User Data:', userDataFromStorage);
                console.log('Form Data:', formData);
            }
        } catch (error) {
            console.error('Error fetching user details:', error);
        }
    };

    const fetchDoctorDetails = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`http://localhost:5000/api/doctors/${id}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();

            if (data.success) {
                const doctorData = data.data;
                setDoctor(doctorData);

                // Filter and process availability
                const availableDates = doctorData.availability
                    .filter(day => day.isAvailable)
                    .map(day => ({
                        ...day,
                        formattedDate: new Date(day.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric'
                        })
                    }));

                console.log('Available dates:', availableDates);

                if (availableDates.length > 0) {
                    const firstAvailableDate = availableDates[0].date;
                    setSelectedDate(firstAvailableDate);
                    handleDateChange({ target: { value: firstAvailableDate } });
                } else {
                    setAvailableSlots([]);
                    toast.warning("No available appointment dates found for this doctor");
                }
            } else {
                console.error('Failed to fetch doctor details:', data.error);
                toast.error(data.error || 'Failed to fetch doctor details');
            }
        } catch (error) {
            console.error('Error fetching doctor details:', error);
            if (!navigator.onLine) {
                toast.error('Please check your internet connection');
            } else if (error.message.includes('HTTP error!')) {
                toast.error('Unable to find doctor details. Please try again later.');
            } else {
                toast.error('An error occurred while loading doctor details. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Add useEffect to refetch doctor details periodically
    useEffect(() => {
        // Initial fetch
        fetchDoctorDetails();

        // Set up periodic refresh every 5 minutes
        const refreshInterval = setInterval(() => {
            fetchDoctorDetails();
        }, 5 * 60 * 1000); // 5 minutes in milliseconds

        // Cleanup interval on component unmount
        return () => clearInterval(refreshInterval);
    }, [id]);

    // Function to format time to AM/PM
    const formatTimeToAMPM = (time) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}.${minutes}${ampm}`;
    };

    // Add function to fetch booked appointments
    const fetchBookedAppointments = async (doctorId, date) => {
        try {
            const response = await fetch(`http://localhost:5000/api/appointments/doctor/${doctorId}/date/${date}`);
            const data = await response.json();
            if (data.success) {
                setBookedAppointments(data.data);
            }
        } catch (error) {
            console.error('Error fetching booked appointments:', error);
        }
    };

    // Function to get available time slots for a selected date
    const getAvailableTimeSlots = (date) => {
        if (!doctor || !date) return [];
        
        const selectedDay = doctor.availability.find(day => day.date === date);
        if (!selectedDay || !selectedDay.isAvailable) return [];

        // Extract just the start times from the slots
        return selectedDay.slots.map(slot => slot.startTime) || [];
    };

    // Update available slots when date is selected
    useEffect(() => {
        if (selectedDate) {
            const slots = getAvailableTimeSlots(selectedDate);
            
            // Check if the selected date is today
            const now = new Date();
            const selectedDateObj = new Date(selectedDate);
            const isToday = selectedDateObj.toDateString() === now.toDateString();

            // Filter out past time slots if the selected date is today
            const availableSlots = isToday 
                ? slots.filter(time => {
                    const [hours, minutes] = time.split(':');
                    const slotTime = new Date(selectedDateObj);
                    slotTime.setHours(parseInt(hours), parseInt(minutes));
                    return slotTime > now;
                })
                : slots;

            setAvailableSlots(availableSlots);
            setSelectedTime(null); // Reset selected time when date changes
        }
    }, [selectedDate, doctor]);

    const handleDateChange = async (e) => {
        const date = e.target.value;
        setSelectedDate(date);
        setSelectedTime(null);

        if (doctor && date) {
            try {
                const dayAvailability = doctor.availability.find(a => a.date === date);

                if (!dayAvailability) {
                    setAvailableSlots([]);
                    toast.error("No availability data found for this date");
                    return;
                }

                if (!dayAvailability.isAvailable) {
                    setAvailableSlots([]);
                    toast.warning("This date is not available for booking");
                    return;
                }

                if (!dayAvailability.slots || dayAvailability.slots.length === 0) {
                    setAvailableSlots([]);
                    toast.warning("No time slots available for this date");
                    return;
                }

                // Get time slots for the selected date
                const slots = dayAvailability.slots.map(slot => slot.startTime);

                // Check if the selected date is today
                const now = new Date();
                const selectedDateObj = new Date(date);
                const isToday = selectedDateObj.toDateString() === now.toDateString();

                // Filter out past time slots if the selected date is today
                const availableSlots = isToday 
                    ? slots.filter(time => {
                        const [hours, minutes] = time.split(':');
                        const slotTime = new Date(selectedDateObj);
                        slotTime.setHours(parseInt(hours), parseInt(minutes));
                        return slotTime > now;
                    })
                    : slots;

                if (availableSlots.length === 0) {
                    setAvailableSlots([]);
                    if (isToday) {
                        toast.warning("All time slots for today have passed");
                    } else {
                        toast.warning("No time slots available for this date");
                    }
                    return;
                }

                setAvailableSlots(availableSlots);
            } catch (error) {
                console.error('Error processing time slots:', error);
                setAvailableSlots([]);
                toast.error("Error loading time slots. Please try again.");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Validate form data
            if (!formData.name || !formData.email || !formData.phone || !formData.reason || !formData.location) {
                toast.error("Please fill in all required fields");
                setIsSubmitting(false);
                return;
            }

            // Validate phone number
            const phoneError = validatePhonenumber(formData.phone);
            if (phoneError) {
                toast.error(phoneError);
                setIsSubmitting(false);
                return;
            }

            if (!selectedDate || !selectedTime) {
                toast.error("Please select both date and time");
                setIsSubmitting(false);
                return;
            }

            // Store appointment data
            const appointmentData = {
                doctorDetails: {
                    _id: id,
                    name: doctor.name,
                    specialty: doctor.specialization,
                    fee: doctor.consultationFee,
                    date: selectedDate,
                    time: selectedTime,
                    reason: formData.reason
                },
                patientDetails: {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    location: formData.location
                }
            };

            // Store appointment data in session storage
            sessionStorage.setItem('pendingAppointment', JSON.stringify(appointmentData));
            toast.success("Proceeding to payment...");

            // Navigate to payment page
            navigate('/pay');
        } catch (error) {
            console.error('Error submitting appointment:', error);
            toast.error("An error occurred. Please try again.");
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <div className="text-white text-xl">Loading doctor's schedule...</div>
                </div>
            </div>
        );
    }

    if (!doctor) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-white text-xl mb-4">Doctor not found</div>
                    <button
                        onClick={() => navigate("/doc")}
                        className="text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-2"
                    >
                        <FiArrowLeft />
                        <span>Return to Doctors List</span>
                    </button>
                </div>
            </div>
        );
    }

    const validatePhonenumber = (phone) => {
        // Remove any spaces or special characters
        const cleanedPhone = phone.replace(/\D/g, '');

        // Check if it's a valid Sri Lankan mobile number
        // Format: 0XX-XXXXXXX or +94XX-XXXXXXX
        const mobileRegex = /^(0\d{9}|94\d{9}|\+94\d{9})$/;

        if (!mobileRegex.test(cleanedPhone)) {
            return "Please enter a valid Sri Lankan mobile number (e.g., 0771234567 or +94771234567)";
        }

        // Check if it starts with a valid mobile prefix
        const validPrefixes = ['70', '71', '72', '74', '75', '76', '77', '78'];
        const prefix = cleanedPhone.slice(-9, -7); // Get the first two digits after 0 or 94

        if (!validPrefixes.includes(prefix)) {
            return "Please enter a valid Sri Lankan mobile number prefix";
        }

        return "";
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Format phone number as user types
        if (name === 'phone') {
            // Remove all non-digit characters
            let cleaned = value.replace(/\D/g, '');

            // Format based on length
            if (cleaned.length > 0) {
                if (cleaned.startsWith('94')) {
                    cleaned = '+' + cleaned;
                } else if (cleaned.startsWith('0')) {
                    // eslint-disable-next-line no-self-assign
                    cleaned = cleaned;
                } else {
                    cleaned = '0' + cleaned;
                }
            }

            setFormData(prev => ({
                ...prev,
                [name]: cleaned
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col overflow-hidden">
            <Toaster position="top-center" reverseOrder={false} />

            {/* Background Elements */}
            <div className="fixed inset-0 overflow-hidden opacity-30">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500 rounded-full blur-[120px]"></div>
            </div>

            <div className="flex flex-1 z-10">
                {/* Sticky Sidebar */}
                <aside className="w-72 bg-gray-800/80 backdrop-blur-lg p-6 text-white border-r border-gray-700 fixed h-full">
                    {/* User Profile */}
                    <UserProfile />

                    {/* Back Button */}
                    <button
                        onClick={() => navigate("/doc")}
                        className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors mt-4"
                    >
                        <FiArrowLeft />
                        <span>Back to Doctors</span>
                    </button>
                </aside>

                {/* Main Content */}
                <main className="flex-1 bg-gray-900/50 backdrop-blur-sm ml-72 p-8 overflow-y-auto">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-3xl font-bold text-white mb-8">Book Appointment</h1>

                        {/* Doctor Info Card */}
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
                            <div className="flex items-start">
                                {doctor.image ? (
                                    <img
                                        src={doctor.image.startsWith('http') ? doctor.image : `http://localhost:5000${doctor.image}`}
                                        alt={doctor.name}
                                        className="w-24 h-24 rounded-full border-2 border-blue-400/50 mr-6 object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://s3.amazonaws.com/images/doctor.png'; // Default image on error
                                        }}
                                    />
                                ) : (
                                    <img
                                        src="https://s3.amazonaws.com/images/doctor.png"
                                        alt={doctor.name}
                                        className="w-24 h-24 rounded-full border-2 border-blue-400/50 mr-6 object-cover"
                                    />
                                )}
                                <div>
                                    <h2 className="text-2xl font-bold text-blue-300">{doctor.name}</h2>
                                    <p className="text-gray-300 mb-2">{doctor.specialization}</p>
                                    <div className="flex items-center text-gray-400 mb-1">
                                        <FiMapPin className="mr-2" />
                                        <span>{doctor.hospital}</span>
                                    </div>
                                    <div className="flex items-center text-gray-400">
                                        <FiDollarSign className="mr-2" />
                                        <span>Consultation Fee: LKR {doctor.consultationFee.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Booking Form */}
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                            <h2 className="text-xl font-bold text-white mb-6">Doctor's Available Dates & Times</h2>

                            {/* Available Days Summary */}
                            <div className="mb-6 bg-blue-900/20 p-4 rounded-lg">
                                <h3 className="text-blue-300 font-medium mb-4">Available Days:</h3>
                                {doctor?.availability && doctor.availability.filter(day => day.isAvailable).length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {doctor.availability
                                            .filter(day => day.isAvailable)
                                            .map((day, idx) => {
                                                const date = new Date(day.date);
                                                return (
                                                    <div 
                                                        key={idx} 
                                                        className={`p-3 rounded-lg transition-all cursor-pointer
                                                            ${selectedDate === day.date 
                                                                ? 'bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800' 
                                                                : 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/40'}`}
                                                        onClick={() => handleDateChange({ target: { value: day.date } })}
                                                    >
                                                        <div className="text-lg font-medium">
                                                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                                        </div>
                                                        <div className="text-sm opacity-90">
                                                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </div>
                                                        <div className="text-xs mt-1 opacity-75">
                                                            Available for Booking
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-yellow-400 text-lg">No availability for next week</p>
                                        <p className="text-gray-400 text-sm mt-2">Please check back later or choose another doctor</p>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    {/* Date Selection Dropdown */}
                                    <div>
                                        <label className="block text-gray-400 mb-2">Select Date</label>
                                        <div className="relative">
                                            <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <select
                                                value={selectedDate}
                                                onChange={handleDateChange}
                                                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            >
                                                <option value="">Choose an available date</option>
                                                {doctor?.availability
                                                    ?.filter(day => day.isAvailable)
                                                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                                                    .map((day, idx) => {
                                                        const date = new Date(day.date);
                                                        return (
                                                            <option key={idx} value={day.date}>
                                                                {date.toLocaleDateString('en-US', {
                                                                    weekday: 'long',
                                                                    month: 'long',
                                                                    day: 'numeric'
                                                                })}
                                                            </option>
                                                        );
                                                    })
                                                }
                                            </select>
                                            {(!doctor?.availability || 
                                              doctor.availability.filter(day => day.isAvailable).length === 0) && (
                                                <p className="mt-2 text-yellow-400 text-sm">
                                                    No available dates set by the doctor
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Time Slots */}
                                    <div className="mb-4">
                                        <label className="block text-gray-400 mb-2">Select Time</label>
                                        <div className="relative">
                                            <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <select
                                                value={selectedTime || ''}
                                                onChange={(e) => setSelectedTime(e.target.value)}
                                                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            >
                                                <option value="">Choose a time slot</option>
                                                {availableSlots.map((time, index) => (
                                                    <option key={index} value={time}>
                                                        {formatTimeToAMPM(time)}
                                                    </option>
                                                ))}
                                            </select>
                                            {availableSlots.length === 0 && selectedDate && (
                                                <p className="mt-2 text-yellow-400 text-sm">
                                                    No time slots available for this date
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Selection Summary */}
                                {(selectedDate || selectedTime) && (
                                    <div className="mb-6 bg-blue-900/20 p-4 rounded-lg space-y-3">
                                        <h3 className="text-blue-300 font-medium">Your Selected Schedule:</h3>
                                        
                                        {selectedDate && (
                                            <div className="flex items-center text-gray-300">
                                                <FiCalendar className="text-blue-400 mr-2" />
                                                <span>Date: </span>
                                                <span className="ml-2 text-white">
                                                    {new Date(selectedDate).toLocaleDateString('en-US', {
                                                        weekday: 'long',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                        )}
                                        
                                        {selectedTime && (
                                            <div className="flex items-center text-gray-300">
                                                <FiClock className="text-blue-400 mr-2" />
                                                <span>Time: </span>
                                                <span className="ml-2 text-white">
                                                    {formatTimeToAMPM(selectedTime)}
                                                </span>
                                            </div>
                                        )}

                                        <div className="text-xs text-gray-400 mt-2 flex items-center">
                                            <FiClock className="mr-1" />
                                            Each consultation is 30 minutes
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-white">Your Information</h2>
                                    {(formData.name || formData.email || formData.phone) && (
                                        <div className="text-sm text-blue-400 bg-blue-900/20 px-3 py-1 rounded-lg">
                                            Your details have been auto-filled. You can edit if needed.
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-gray-400 mb-2">
                                            Full Name
                                            {formData.name && (
                                                <span className="text-blue-400 text-xs ml-2">
                                                    (Auto-filled from {formData.name === userData?.name ? 'name' : 'username'})
                                                </span>
                                            )}
                                        </label>
                                        <div className="relative">
                                            <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                                placeholder="Enter patient's full name"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-gray-400 mb-2">
                                            Email
                                            {formData.email && <span className="text-blue-400 text-xs ml-2">(Auto-filled)</span>}
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                            placeholder="Enter patient's email"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-400 mb-2">
                                            Phone
                                            {formData.phone && <span className="text-blue-400 text-xs ml-2">(Auto-filled)</span>}
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                            placeholder="0771234567 or +94771234567"
                                            maxLength={12}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-gray-400 mb-2">Reason for Visit</label>
                                        <textarea
                                            name="reason"
                                            value={formData.reason}
                                            onChange={handleInputChange}
                                            rows="3"
                                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-300 mb-2">Location</label>
                                    <LocationPicker
                                        onLocationSelect={(address) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                location: address
                                            }));
                                        }}
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                                    >
                                        Book Appointment
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
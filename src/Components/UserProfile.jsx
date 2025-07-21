import { useEffect, useState } from "react";
import { generateAvatar } from "../utils/avatarGenerator";

export default function UserProfile() {
    const [userData, setUserData] = useState(null);
    const [avatar, setAvatar] = useState({ initials: "", bgColor: "" });
    const [doctorProfile, setDoctorProfile] = useState(null);
    const [profileImage, setProfileImage] = useState(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user) {
            setUserData(user);
            const newAvatar = generateAvatar(user.name || user.username);
            setAvatar(newAvatar);

            // Only use profile image for doctors
            if (user.isDoctor) {
                // If doctor has an image, use it
                if (user.image && user.image.trim() !== '') {
                    setProfileImage(user.image.startsWith('http')
                        ? user.image
                        : `http://localhost:5000${user.image}`);
                } else {
                    // If no image in user data, fetch doctor profile to get the image
                    fetchDoctorProfile(user._id);
                }
            }
            // For patients, always use avatar (no profile image)
        }
    }, []);

    const fetchDoctorProfile = async (userId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/doctors/user/${userId}`);
            const data = await response.json();

            if (data.success && data.data) {
                setDoctorProfile(data.data);

                // Set profile image if available
                if (data.data.image) {
                    setProfileImage(data.data.image.startsWith('http')
                        ? data.data.image
                        : `http://localhost:5000${data.data.image}`);
                }
            }
        } catch (error) {
            console.error("Error fetching doctor profile:", error);
        }
    };

    return (
        <div className="flex flex-col items-center mt-4 mb-8">
            {userData?.isDoctor && profileImage ? (
                // Show profile image only for doctors who have one
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-400/50">
                    <img
                        src={profileImage}
                        alt={userData?.username || "Profile"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://s3.amazonaws.com/images/doctor.png'; // Default image on error
                        }}
                    />
                </div>
            ) : (
                // Show avatar for all patients and doctors without profile image
                <div className={`w-16 h-16 rounded-full ${avatar.bgColor} flex items-center justify-center text-white text-2xl font-bold`}>
                    {avatar.initials}
                </div>
            )}
            <h2 className="text-xl font-bold mt-4 text-blue-300">
                {userData?.isDoctor ? `Dr. ${userData?.username}` : userData?.username || "Loading..."}
            </h2>
            <p className="text-sm text-gray-400">
                {userData?.isDoctor ? "Doctor" : "Patient"}
            </p>
        </div>
    );
}


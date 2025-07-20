import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    specialization: {
        type: String,
        required: true,
    },
    hospital: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        default: 0,
    },
    reviewCount: {
        type: Number,
        default: 0,
    },
    experience: {
        type: Number,
        required: true,
    },
    consultationFee: {
        type: Number,
        required: true,
    },
    availability: [{
        date: {
            type: String, // Store as YYYY-MM-DD format
            required: true
        },
        displayDate: {
            type: String, // Formatted date for display (e.g., "Mon, Jan 1")
            required: true
        },
        dayName: {
            type: String, // Full day name (e.g., "Monday")
            required: true
        },
        isAvailable: {
            type: Boolean,
            default: false
        },
        slots: [{
            startTime: {
                type: String, // Store as HH:mm format
                required: true
            },
            endTime: {
                type: String, // Store as HH:mm format
                required: true
            }
        }]
    }],
    timeSlots: [{
        date: {
            type: String, // Store as YYYY-MM-DD format
            required: true
        },
        startTime: {
            type: String, // Store as HH:mm format
            required: true
        },
        endTime: {
            type: String, // Store as HH:mm format
            required: true
        }
    }],
    bio: {
        type: String,
        default: '',
    },
    education: [{
        degree: String,
        institution: String,
        year: Number,
    }],
    certifications: [{
        name: String,
        issuer: String,
        year: Number,
    }],
    languages: [{
        type: String,
    }],
    image: {
        type: String,
        default: 'https://s3.amazonaws.com/images/doctor.png',
    },
    startTime: {
        type: String,
        default: '09:00',
    },
    endTime: {
        type: String,
        default: '17:00',
    },
}, {
    timestamps: true,
});

// Create a virtual for full availability text
doctorSchema.virtual('availabilityText').get(function() {
    if (!this.availability || this.availability.length === 0) {
        return 'Not available';
    }

    const availableDays = this.availability
        .filter(a => a.isAvailable)
        .map(a => a.displayDate)
        .join(', ');

    return availableDays;
});

// Create a virtual for formatted consultation fee
doctorSchema.virtual('formattedFee').get(function() {
    return `LKR ${this.consultationFee.toLocaleString()}`;
});

// Create a virtual for formatted experience
doctorSchema.virtual('formattedExperience').get(function() {
    return `${this.experience} years experience`;
});

const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;
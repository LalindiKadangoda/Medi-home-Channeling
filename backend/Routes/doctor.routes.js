import express from 'express';
import Doctor from '../Models/doctor.model.js';
import User from '../Models/user.model.js';

const router = express.Router();

// Get all doctors
router.get('/all', async (req, res) => {
    try {
        const doctors = await Doctor.find().populate('userId', 'email');
        res.status(200).json({
            success: true,
            data: doctors
        });
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Search doctors by specialization or location
router.get('/search', async (req, res) => {
    try {
        const { specialization, location, hospital } = req.query;
        const query = {};

        if (specialization) query.specialization = specialization;
        if (location) query.location = location;
        if (hospital) query.hospital = hospital;

        const doctors = await Doctor.find(query).populate('userId', 'email');
        res.status(200).json({
            success: true,
            data: doctors
        });
    } catch (error) {
        console.error('Error searching doctors:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Get doctor by user ID
router.get('/user/:userId', async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.params.userId });
        if (!doctor) {
            return res.status(404).json({ success: false, error: 'Doctor not found' });
        }
        res.status(200).json({
            success: true,
            data: doctor
        });
    } catch (error) {
        console.error('Error fetching doctor:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Create a new doctor profile
router.post('/create', async (req, res) => {
    try {
        const {
            userId,
            name,
            specialization,
            hospital,
            location,
            experience,
            consultationFee,
            availability,
            bio,
            education,
            certifications,
            languages,
            image
        } = req.body;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Check if doctor profile already exists
        const existingDoctor = await Doctor.findOne({ userId });
        if (existingDoctor) {
            return res.status(400).json({ success: false, error: 'Doctor profile already exists' });
        }

        // Create new doctor profile
        const doctor = new Doctor({
            userId,
            name,
            specialization,
            hospital,
            location,
            experience,
            consultationFee,
            availability: (availability || []).map(day => ({
                date: day.date,
                displayDate: day.displayDate,
                dayName: day.dayName,
                isAvailable: day.isAvailable,
                slots: (day.slots || []).map(slot => ({
                    startTime: slot.startTime,
                    endTime: slot.endTime
                }))
            })),
            bio,
            education,
            certifications,
            languages,
            image
        });

        await doctor.save();

        // Update user's isDoctor status and image
        user.isDoctor = true;
        if (image) {
            user.cimage = image;
        }
        await user.save();

        res.status(201).json({
            success: true,
            message: 'Doctor profile created successfully',
            data: doctor
        });
    } catch (error) {
        console.error('Error creating doctor profile:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Get doctor by ID
router.get('/:id', async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id).populate('userId', 'email');
        if (!doctor) {
            return res.status(404).json({ success: false, error: 'Doctor not found' });
        }

        res.status(200).json({
            success: true,
            data: doctor
        });
    } catch (error) {
        console.error('Error fetching doctor:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Update doctor profile
router.put('/:id', async (req, res) => {
    try {
        const {
            name,
            specialization,
            hospital,
            location,
            experience,
            consultationFee,
            availability,
            bio,
            education,
            certifications,
            languages,
            image
        } = req.body;

        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) {
            return res.status(404).json({ success: false, error: 'Doctor not found' });
        }

        // Create update object
        const updateData = {
            name: name || doctor.name,
            specialization: specialization || doctor.specialization,
            hospital: hospital || doctor.hospital,
            location: location || doctor.location,
            experience: experience || doctor.experience,
            consultationFee: consultationFee || doctor.consultationFee,
            bio: bio || doctor.bio,
            education: education || doctor.education,
            certifications: certifications || doctor.certifications,
            languages: languages || doctor.languages,
            image: image || doctor.image
        };

        if (availability) {
            updateData.availability = availability.map(day => ({
                date: day.date,
                displayDate: day.displayDate,
                dayName: day.dayName,
                isAvailable: day.isAvailable,
                slots: day.slots || []
            }));
        }

        // Use findByIdAndUpdate with $set operator
        const updatedDoctor = await Doctor.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        // Update user's image if provided
        if (image) {
            const user = await User.findById(doctor.userId);
            if (user) {
                user.cimage = image;
                await user.save();
            }
        }

        res.status(200).json({
            success: true,
            message: 'Doctor profile updated successfully',
            data: updatedDoctor
        });
    } catch (error) {
        console.error('Error updating doctor profile:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Delete doctor profile
router.delete('/:id', async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor) {
            return res.status(404).json({ success: false, error: 'Doctor not found' });
        }

        // Update user's isDoctor status
        const user = await User.findById(doctor.userId);
        if (user) {
            user.isDoctor = false;
            await user.save();
        }

        await Doctor.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Doctor profile deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting doctor profile:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

export default router;
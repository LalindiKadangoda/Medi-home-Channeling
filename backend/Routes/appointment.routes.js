import express from 'express';
import Appointment from '../Models/appointment.model.js';
import Doctor from '../Models/doctor.model.js';
import mongoose from 'mongoose';

const router = express.Router();

// Create a new appointment
router.post('/', async (req, res) => {
    try {
        console.log('Raw request body:', req.body);
        
        const {
            doctorId,
            patientId,
            date,
            time,
            reason,
            name,
            email,
            phone,
            reference,
            paymentStatus,
            status,
            patientLocation,
            filledByOther
        } = req.body;

        // Validate required fields
        if (!doctorId || !date || !time) {
            return res.status(400).json({
                success: false,
                error: 'Doctor ID, date, and time are required'
            });
        }

        // First check if the same patient has already booked this doctor at this time
        if (patientId) {
            const existingPatientAppointment = await Appointment.findOne({
                doctorId,
                patientId,
                date,
                time,
                status: { $nin: ['cancelled', 'completed'] }
            });

            if (existingPatientAppointment) {
                return res.status(400).json({
                    success: false,
                    error: 'You have already booked this time slot'
                });
            }
        }

        // Then check if any patient has booked this time slot
        const existingAppointment = await Appointment.findOne({
            doctorId,
            date,
            time,
            status: { $nin: ['cancelled', 'completed'] }
        });

        if (existingAppointment) {
            console.log('Found existing appointment:', existingAppointment);
            return res.status(400).json({
                success: false,
                error: 'This time slot is already booked by another patient'
            });
        }

        // Create base appointment data
        const appointmentData = {
            doctorId,
            patientId,
            date,
            time,
            reason,
            name,
            email,
            phone,
            reference,
            patientLocation,
            paymentStatus: paymentStatus || 'pending',
            status: status || 'pending',
            amount: 0  // Will be set by pre-save middleware
        };

        // Handle filledByOther flag
        if (filledByOther === true) {
            appointmentData.filledByOther = true;
        }

        // Check if doctor exists and get consultation fee
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            console.log('Doctor not found:', doctorId);
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        // Set the consultation fee
        appointmentData.amount = doctor.consultationFee;

        console.log('Final appointment data before save:', appointmentData);

        const appointment = new Appointment(appointmentData);
        await appointment.save();

        console.log('Saved appointment:', appointment.toObject());

        res.status(201).json({
            success: true,
            data: appointment
        });
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error creating appointment'
        });
    }
});

// Get appointments for a user (patient)
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('Fetching appointments for user ID:', userId);

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.log('Invalid user ID format:', userId);
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }

        // First check if any appointments exist for this user
        const appointmentCount = await Appointment.countDocuments({ patientId: userId });
        console.log('Found appointments count:', appointmentCount);

        if (appointmentCount === 0) {
            return res.json({
                success: true,
                appointments: []
            });
        }

        // Fetch appointments with populated doctor data
        const appointments = await Appointment.find({ patientId: userId })
            .populate({
                path: 'doctorId',
                select: 'name specialization hospital consultationFee',
                model: 'Doctor'
            })
            .sort({ date: 1, time: 1 });

        console.log('Fetched appointments:', appointments.length);

        // Check if doctor data was properly populated
        const appointmentsWithDoctorData = appointments.filter(app => app.doctorId);
        console.log('Appointments with doctor data:', appointmentsWithDoctorData.length);

        res.json({
            success: true,
            appointments
        });
    } catch (error) {
        console.error('Error fetching user appointments:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching appointments'
        });
    }
});

// Get appointments for a doctor
router.get('/doctor/:doctorId', async (req, res) => {
    try {
        const { doctorId } = req.params;
        console.log('Fetching appointments for doctor ID:', doctorId);

        if (!mongoose.Types.ObjectId.isValid(doctorId)) {
            console.log('Invalid doctor ID format:', doctorId);
            return res.status(400).json({
                success: false,
                error: 'Invalid doctor ID'
            });
        }

        const appointments = await Appointment.find({ doctorId })
            .populate('patientId', 'username email phone')
            .select('patientId date time status paymentStatus reference reason name email phone patientLocation')
            .sort({ date: 1, time: 1 });

        console.log('Fetched appointments for doctor:', appointments.length);
        console.log('First appointment data:', appointments[0]);

        res.json({
            success: true,
            appointments
        });
    } catch (error) {
        console.error('Error fetching doctor appointments:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching appointments'
        });
    }
});

// Update appointment status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found'
            });
        }

        appointment.status = status;
        await appointment.save();

        res.json({
            success: true,
            data: appointment
        });
    } catch (error) {
        console.error('Error updating appointment status:', error);
        res.status(500).json({
            success: false,
            error: 'Error updating appointment status'
        });
    }
});

// Delete appointment
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid appointment ID'
            });
        }

        // Find and delete the appointment
        const appointment = await Appointment.findByIdAndDelete(id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found'
            });
        }

        res.json({
            success: true,
            message: 'Appointment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting appointment:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error deleting appointment'
        });
    }
});

// Get all transactions with filters
router.get('/transactions', async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            paymentStatus,
            doctorId,
            patientId,
            sortBy = 'date',
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;

        // Build query
        const query = {};

        // Date range filter
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Payment status filter
        if (paymentStatus) {
            query.paymentStatus = paymentStatus;
        }

        // Doctor filter
        if (doctorId) {
            query.doctorId = doctorId;
        }

        // Patient filter
        if (patientId) {
            query.patientId = patientId;
        }

        // Calculate skip for pagination
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const total = await Appointment.countDocuments(query);

        // Fetch transactions with populated data
        const transactions = await Appointment.find(query)
            .populate('doctorId', 'name specialization hospital consultationFee')
            .populate('patientId', 'username email')
            .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Calculate summary statistics
        const summary = await Appointment.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                    totalTransactions: { $sum: 1 },
                    completedTransactions: {
                        $sum: { $cond: [{ $eq: ['$paymentStatus', 'completed'] }, 1, 0] }
                    },
                    pendingTransactions: {
                        $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] }
                    },
                    failedTransactions: {
                        $sum: { $cond: [{ $eq: ['$paymentStatus', 'failed'] }, 1, 0] }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                transactions,
                summary: summary[0] || {
                    totalAmount: 0,
                    totalTransactions: 0,
                    completedTransactions: 0,
                    pendingTransactions: 0,
                    failedTransactions: 0
                },
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching transactions'
        });
    }
});

// Add flag to appointment
router.post('/:id/flags', async (req, res) => {
    try {
        const { id } = req.params;
        const { type, message, userId } = req.body;

        // Validate required fields
        if (!type || !message || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Type, message, and userId are required'
            });
        }

        // Validate flag type
        if (!['warning', 'info', 'success', 'error'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid flag type'
            });
        }

        // Find the appointment
        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found'
            });
        }

        // Add the flag
        appointment.flags.push({
            type,
            message,
            createdBy: userId
        });

        await appointment.save();

        res.json({
            success: true,
            data: appointment
        });
    } catch (error) {
        console.error('Error adding flag:', error);
        res.status(500).json({
            success: false,
            error: 'Error adding flag'
        });
    }
});

// Remove flag from appointment
router.delete('/:id/flags/:flagId', async (req, res) => {
    try {
        const { id, flagId } = req.params;

        // Find the appointment
        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found'
            });
        }

        // Remove the flag
        appointment.flags = appointment.flags.filter(flag => flag._id.toString() !== flagId);
        await appointment.save();

        res.json({
            success: true,
            data: appointment
        });
    } catch (error) {
        console.error('Error removing flag:', error);
        res.status(500).json({
            success: false,
            error: 'Error removing flag'
        });
    }
});

// Get appointments for a doctor on a specific date
router.get('/doctor/:doctorId/date/:date', async (req, res) => {
    try {
        const { doctorId, date } = req.params;

        const appointments = await Appointment.find({
            doctorId,
            date,
            status: { $in: ['pending', 'confirmed'] }
        });

        res.status(200).json({
            success: true,
            data: appointments
        });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Get appointments for a patient
router.get('/patient/:patientId', async (req, res) => {
    try {
        const appointments = await Appointment.find({ patientId: req.params.patientId })
            .sort({ date: 1, time: 1 });

        res.status(200).json({
            success: true,
            data: appointments
        });
    } catch (error) {
        console.error('Error fetching patient appointments:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Update appointment status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Appointment status updated successfully',
            data: appointment
        });
    } catch (error) {
        console.error('Error updating appointment status:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

export default router;
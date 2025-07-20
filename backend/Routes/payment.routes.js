import express from 'express';
import Appointment from '../Models/appointment.model.js';
import mongoose from 'mongoose';

const router = express.Router();

// Process refund request
router.post('/refund', async (req, res) => {
    try {
        const { appointmentId, reference } = req.body;

        // Validate required fields
        if (!appointmentId && !reference) {
            return res.status(400).json({
                success: false,
                error: 'Either appointmentId or reference is required'
            });
        }

        // Find the appointment
        let appointment;
        if (appointmentId) {
            appointment = await Appointment.findById(appointmentId);
        } else if (reference) {
            appointment = await Appointment.findOne({ reference });
        }

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found'
            });
        }

        // Check if appointment is eligible for refund
        // Only pending appointments can be refunded
        if (appointment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                error: 'Only pending appointments can be refunded'
            });
        }

        // Add a flag to the appointment indicating it was refunded
        appointment.flags.push({
            type: 'info',
            message: 'Refund processed',
            createdAt: new Date(),
            // If you have user authentication, you can add the user ID here
            // createdBy: req.user._id
        });

        // Update payment status to indicate refund
        appointment.paymentStatus = 'refunded';
        
        // Save the updated appointment
        await appointment.save();

        res.json({
            success: true,
            message: 'Refund processed successfully',
            data: appointment
        });
    } catch (error) {
        console.error('Error processing refund:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error processing refund'
        });
    }
});

// Get payment history for a user
router.get('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Find all appointments for the user
        const appointments = await Appointment.find({ patientId: userId })
            .populate('doctorId', 'name specialization hospital')
            .sort({ createdAt: -1 });
            
        res.json({
            success: true,
            data: appointments
        });
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Error fetching payment history'
        });
    }
});

export default router;

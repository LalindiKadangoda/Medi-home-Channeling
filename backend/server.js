import userroutes from "./Routes/user.routes.js"
import doctorroutes from "./Routes/doctor.routes.js"
import uploadRoutes from './Routes/upload.routes.js'
import path from 'path'
import { fileURLToPath } from 'url'
import appointmentRoutes from './Routes/appointment.routes.js'
import reportRoutes from './Routes/report.routes.js'
import patientRecordRoutes from './Routes/patientRecord.routes.js'
import patientRoutes from './Routes/patient.routes.js'
import paymentRoutes from './Routes/payment.routes.js'
import dotenv from 'dotenv';

import express from "express";
import mongoose from "mongoose";
import cors from "cors";

// Load environment variables
dotenv.config();

const URI = "mongodb+srv://it23266582:DSSYuVjt3VRAC43s@medihome.crezc.mongodb.net/?retryWrites=true&w=majority&appName=MediHome";
const app = express();

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON requests

// MongoDB Connection
mongoose.connect(URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
}).then(() => {
    console.log("MongoDB connected!");
}).catch((err) => {
    console.error("MongoDB connection error:", err);
    // eslint-disable-next-line no-undef
    process.exit(1);
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));

// Routes
app.use("/api", userroutes);
app.use("/api/doctors", doctorroutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/patient-records', patientRecordRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/payments', paymentRoutes);

// Start Server
const startServer = async (port) => {
    try {
        await app.listen(port);
        console.log(`Server running on port ${port}`);
    } catch (err) {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is in use, trying ${port + 1}`);
            await startServer(port + 1);
        } else {
            console.error('Error starting server:', err);
            process.exit(1);
        }
    }
};

// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 5000;
startServer(PORT);

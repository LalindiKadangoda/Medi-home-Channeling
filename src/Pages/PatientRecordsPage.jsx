<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PatientRecords from '../Components/PatientRecords';

export default function PatientRecordsPage() {
    const { patientId } = useParams();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(true);

    const handleClose = () => {
        setIsOpen(false);
        navigate('/udash');
    };

    return (
        <PatientRecords 
            isOpen={isOpen}
            onClose={handleClose}
            patientId={patientId}
        />
    );
=======
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PatientRecords from '../Components/PatientRecords';

export default function PatientRecordsPage() {
    const { patientId } = useParams();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(true);

    const handleClose = () => {
        setIsOpen(false);
        navigate('/udash');
    };

    return (
        <PatientRecords 
            isOpen={isOpen}
            onClose={handleClose}
            patientId={patientId}
        />
    );
>>>>>>> 7027780e2f4d2873d9e53508841279240d3130ce
} 
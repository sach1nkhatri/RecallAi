import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import khaltiLogo from '../../../assets/khalti-logo.png';
import esewaLogo from '../../../assets/esewa.png';
import BankLogo from '../../../assets/bank-logo.png';
import imeLogo from '../../../assets/imelogo.png';
import esewaQR from '../../../assets/payment_codes/esewa-code.JPG';
import khaltiQR from '../../../assets/payment_codes/khalti-code.PNG';
import imeQR from '../../../assets/payment_codes/imepay-code.JPG';
import bankQR from '../../../assets/payment_codes/bank-code.PNG';
import '../css/CheckoutPage.css';

const CheckoutPage = () => {
    const location = useLocation();
    const { planName, planPrice, planDuration } = location.state || {
        planName: 'Unknown Plan',
        planPrice: 'N/A',
        planDuration: ''
    };

    const [selectedMethod, setSelectedMethod] = useState('eSewa');
    const [screenshot, setScreenshot] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const getQRImageForMethod = (method) => {
        switch (method) {
            case 'eSewa': return esewaQR;
            case 'Khalti': return khaltiQR;
            case 'IME': return imeQR;
            case 'Bank':
            case 'Visa': return bankQR;
            default: return null;
        }
    };

    const getValidityDate = (durationString) => {
        const days =
            durationString.toLowerCase().includes('daily') ? 1 :
                durationString.toLowerCase().includes('weekly') ? 7 :
                    durationString.toLowerCase().includes('monthly') ? 30 : 1;

        return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    };

    const confirmPayment = async () => {
        if (!selectedMethod || !screenshot) return;

        setLoading(true);
        setError('');

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            setSubmitted(true);
        } catch (err) {
            setError('Payment submission failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderManualQRUpload = () => (
        <div className="manual-payment-box">
            <h3>Scan QR to Pay</h3>
            <div className="qr-placeholder">
                <img
                    src={getQRImageForMethod(selectedMethod)}
                    alt={`${selectedMethod} QR Code`}
                    className="qr-image"
                />
            </div>

            <div className="upload-section">
                <label>Upload Payment Screenshot</label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setScreenshot(e.target.files[0])}
                />
                {screenshot && (
                    <p className="upload-success">✅ File selected: {screenshot.name}</p>
                )}
            </div>

            <button
                className="confirm-btn"
                onClick={confirmPayment}
                disabled={!screenshot || loading}
            >
                {loading ? 'Submitting...' : "I've Paid – Submit for Review"}
            </button>

            {error && <p className="error-text">{error}</p>}
        </div>
    );

    const renderRejectedScreen = () => (
        <div className="reupload-screen">
            <h3>❌ Previous Payment Rejected</h3>
            <p>Please review your payment details and re-upload a correct screenshot.</p>
            {renderManualQRUpload()}
        </div>
    );

    const renderConfirmationScreen = () => (
        <div className="confirmation-screen">
            <h3>✅ Payment Submitted!</h3>
            <p>We've received your payment request.</p>
            <p>Method: <strong>{selectedMethod}</strong></p>
            <p>Plan: <strong>{planName}</strong></p>
            <p>Valid Until: <strong>{getValidityDate(planDuration).toDateString()}</strong></p>
            <p>Status: <span className="pending-text">⏳ Pending Admin Confirmation</span></p>
        </div>
    );

    const shouldReupload = false; // This would come from props in real implementation
    const shouldIgnoreStatus = false; // This would come from props in real implementation

    return (
        <div className="checkout-wrapper">
            <div className="checkout-left">
                <h2>Your Plan</h2>
                <div className="plan-box">
                    <h3>{planName}</h3>
                    <p>{planDuration} • {planPrice}</p>
                    <ul>
                        <li>✔ Full access to legal tools</li>
                        <li>✔ Unlimited chatbot queries</li>
                        <li>✔ Lawyer search & booking</li>
                        <li>✔ Legal news & articles</li>
                    </ul>
                </div>
            </div>

            <div className="checkout-center">
                <h2>Confirm Your Payment</h2>
                <div className="method-section">
                    <h4>Select Payment Method</h4>
                    <div className="method-options">
                        {['Khalti', 'eSewa', 'Bank', 'IME'].map((method) => (
                            <div
                                key={method}
                                className={`method-tile ${selectedMethod === method ? 'active' : ''}`}
                                onClick={() => setSelectedMethod(method)}
                            >
                                <img
                                    src={
                                        method === 'Khalti' ? khaltiLogo :
                                            method === 'eSewa' ? esewaLogo :
                                                method === 'Bank' ? BankLogo : imeLogo
                                    }
                                    alt={method}
                                />
                                <span>{method === 'Bank' ? 'Bank Transfer' : method}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="checkout-right">
                {shouldIgnoreStatus ? (
                    renderManualQRUpload()
                ) : shouldReupload ? (
                    renderRejectedScreen()
                ) : submitted ? (
                    renderConfirmationScreen()
                ) : (
                    renderManualQRUpload()
                )}
            </div>
        </div>
    );
};

export default CheckoutPage;
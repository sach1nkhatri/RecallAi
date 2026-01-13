import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getNodeApiBase, getAuthToken } from '../../../core/utils/nodeApi';
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
    const navigate = useNavigate();
    const { planName, planType: passedPlanType, planPrice, planDuration } = location.state || {
        planName: 'Unknown Plan',
        planType: 'free',
        planPrice: 'N/A',
        planDuration: ''
    };

    const [selectedMethod, setSelectedMethod] = useState('eSewa');
    const [screenshot, setScreenshot] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [paymentStatus, setPaymentStatus] = useState(null);

    // Extract plan type and amount
    const getPlanType = () => {
        if (passedPlanType) return passedPlanType;
        if (planName.toLowerCase().includes('professional')) return 'pro';
        if (planName.toLowerCase().includes('enterprise')) return 'enterprise';
        return 'free';
    };

    const extractAmount = (priceStr) => {
        const match = priceStr.match(/[\d.]+/);
        return match ? parseFloat(match[0]) : 0;
    };

    const planType = getPlanType();
    const amount = extractAmount(planPrice);

    // Get plan-specific features
    const getPlanFeatures = () => {
        if (planType === 'pro') {
            return [
                '✔ Store up to 1,000 documents',
                '✔ Unlimited AI queries',
                '✔ Advanced code search & recall',
                '✔ 5GB storage',
                '✔ Basic sales & performance tracking',
                '✔ Email support',
            ];
        } else if (planType === 'enterprise') {
            return [
                '✔ Unlimited document storage',
                '✔ Advanced RAG with multi-source recall',
                '✔ 50GB storage with auto-backup',
                '✔ Advanced analytics dashboard',
                '✔ Team collaboration (up to 10 members)',
                '✔ Full API access & webhooks',
                '✔ 24/7 priority support',
            ];
        }
        return [
            '✔ Store up to 100 documents',
            '✔ 10 AI queries per day',
            '✔ Basic code & file recall',
            '✔ 500MB storage',
        ];
    };

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

    // Check for existing payment status
    useEffect(() => {
        const checkPaymentStatus = async () => {
            const token = getAuthToken();
            if (!token) {
                // If no token, user will be redirected by ProtectedRoute
                return;
            }

            try {
                const response = await fetch(`${getNodeApiBase()}/api/payments/my-payments`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.payments.length > 0) {
                        // Check for pending payment for this plan
                        const pendingPayment = data.payments.find(
                            p => p.status === 'pending' && p.plan === planType
                        );
                        if (pendingPayment) {
                            setPaymentStatus(pendingPayment);
                            setSubmitted(true);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to check payment status:', err);
            }
        };

        checkPaymentStatus();
    }, [planType]);

    const confirmPayment = async () => {
        if (!selectedMethod || !screenshot) {
            setError('Please select a payment method and upload screenshot');
            return;
        }

        const token = getAuthToken();
        if (!token) {
            setError('Authentication required. Please log in.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('screenshot', screenshot);
            formData.append('plan', planType);
            formData.append('planDuration', planDuration.toLowerCase());
            formData.append('amount', amount.toString());
            formData.append('paymentMethod', selectedMethod);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(`${getNodeApiBase()}/api/payments/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            let data;
            try {
                data = await response.json();
            } catch (parseErr) {
                throw new Error(`Failed to parse response: ${parseErr.message}`);
            }

            if (!response.ok || !data.success) {
                throw new Error(data.error || `Payment submission failed with status ${response.status}`);
            }

            setSubmitted(true);
            setPaymentStatus(data.payment);
        } catch (err) {
            let errorMessage = 'Payment submission failed. Please try again.';
            if (err.name === 'AbortError') {
                errorMessage = 'Request timed out. Please check your connection and try again.';
            } else if (err.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            console.error('Payment submission error:', err);
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
                    <p className="upload-success">File selected: {screenshot.name}</p>
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
            <h3>Previous Payment Rejected</h3>
            <p>Please review your payment details and re-upload a correct screenshot.</p>
            {renderManualQRUpload()}
        </div>
    );

    const renderConfirmationScreen = () => {
        const status = paymentStatus?.status || 'pending';
        const statusText = {
            pending: '⏳ Pending Admin Confirmation',
            approved: '✅ Payment Approved',
            rejected: '❌ Payment Rejected',
            expired: '⏰ Payment Expired',
        };

        return (
            <div className="confirmation-screen">
                <h3>Payment Submitted!</h3>
                <p>We've received your payment request.</p>
                <p>Method: <strong>{paymentStatus?.paymentMethod || selectedMethod}</strong></p>
                <p>Plan: <strong>{planName}</strong></p>
                {paymentStatus?.validUntil && (
                    <p>Valid Until: <strong>{new Date(paymentStatus.validUntil).toDateString()}</strong></p>
                )}
                <p>Status: <span className={`status-text status-${status}`}>{statusText[status]}</span></p>
                {status === 'rejected' && paymentStatus?.adminNotes && (
                    <div className="admin-notes">
                        <strong>Admin Note:</strong> {paymentStatus.adminNotes}
                    </div>
                )}
                {status === 'rejected' && (
                    <button 
                        className="retry-btn"
                        onClick={() => {
                            setSubmitted(false);
                            setPaymentStatus(null);
                            setScreenshot(null);
                        }}
                    >
                        Re-upload Payment
                    </button>
                )}
            </div>
        );
    };

    const shouldReupload = paymentStatus?.status === 'rejected';
    const shouldIgnoreStatus = false;

    // If no plan data, redirect to landing page
    if (!location.state || !planName || planName === 'Unknown Plan') {
        return (
            <div className="checkout-wrapper">
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <h2>No Plan Selected</h2>
                    <p>Please select a plan from the pricing page.</p>
                    <button 
                        onClick={() => navigate('/')}
                        className="confirm-btn"
                        style={{ marginTop: '1rem' }}
                    >
                        Go to Pricing
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-wrapper">
            <div className="checkout-left">
                <h2>Your Plan</h2>
                <div className="plan-box">
                    <h3>{planName}</h3>
                    <p>{planDuration} • {planPrice}</p>
                    <ul>
                        {getPlanFeatures().map((feature, idx) => (
                            <li key={idx}>{feature}</li>
                        ))}
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
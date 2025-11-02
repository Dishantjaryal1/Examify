import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_URL } from '../utils/api';

const Exam = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const role = localStorage.getItem('role');
    const [tabSwitches, setTabSwitches] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [proctoringData, setProctoringData] = useState({
        screenshots: [],
        violations: [],
        faceDetectionCount: 0,
        noFaceCount: 0
    });
    
    const examStartTime = useRef(Date.now());
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const proctoringInterval = useRef(null);
    const screenshotInterval = useRef(null);
    
    const toastIds = useRef({
        copyPaste: null,
        rightClick: null,
        tabSwitch: null,
        keyboardShortcut: null,
        timeWarning: null,
        cameraWarning: null,
        faceWarning: null
    });
    const isAutoSubmitting = useRef(false);
    const countdownInterval = useRef(null);
    const timeCountdownInterval = useRef(null);
    const modalDiv = useRef(null);
    const [submitted, setSubmitted] = useState(false);
    
    // Function to show a toast with ID to prevent duplicates
    const showToast = (type, message, options = {}) => {
        // Skip if already auto-submitting
        if (isAutoSubmitting.current) return;
        
        // If a toast with this ID already exists, dismiss it first
        if (toastIds.current[type]) {
            toast.dismiss(toastIds.current[type]);
        }
        
        // Show the new toast and store its ID
        toastIds.current[type] = toast.error(message, {
            position: "top-center",
            autoClose: 2000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            ...options
        });
    };
    
    // Function to start camera proctoring
    const startCameraProctoring = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                } 
            });
            
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraActive(true);
                
                // Start face detection
                startFaceDetection();
                
                // Start periodic screenshots
                startScreenshotCapture();
                
                console.log('Camera proctoring started');
            }
        } catch (error) {
            console.error('Error starting camera:', error);
            showToast('cameraWarning', 'Camera access denied. Proctoring will be limited.', { autoClose: 5000 });
        }
    };
    
    // Function to stop camera proctoring
    const stopCameraProctoring = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
        
        if (proctoringInterval.current) {
            clearInterval(proctoringInterval.current);
        }
        if (screenshotInterval.current) {
            clearInterval(screenshotInterval.current);
        }
    };
    
    // Function to start face detection
    const startFaceDetection = () => {
        proctoringInterval.current = setInterval(() => {
            if (videoRef.current && canvasRef.current) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                
                // Set canvas size to match video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                // Draw video frame to canvas
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Simple face detection (basic implementation)
                // In a real implementation, you'd use a proper face detection library
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const hasFace = detectFaceBasic(imageData);
                
                setFaceDetected(hasFace);
                
                if (hasFace) {
                    setProctoringData(prev => ({
                        ...prev,
                        faceDetectionCount: prev.faceDetectionCount + 1
                    }));
                } else {
                    setProctoringData(prev => ({
                        ...prev,
                        noFaceCount: prev.noFaceCount + 1
                    }));
                    
                    // Warning if no face detected for too long
                    if (proctoringData.noFaceCount > 10) {
                        showToast('faceWarning', 'No face detected. Please stay in front of the camera.', { autoClose: 3000 });
                    }
                }
            }
        }, 1000); // Check every second
    };
    
    // Basic face detection (simplified - in production use a proper library)
    const detectFaceBasic = (imageData) => {
        // This is a simplified implementation
        // In production, use libraries like face-api.js or similar
        const data = imageData.data;
        let skinPixels = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Simple skin color detection
            if (r > 95 && g > 40 && b > 20 && 
                Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
                Math.abs(r - g) > 15 && r > g && r > b) {
                skinPixels++;
            }
        }
        
        const totalPixels = data.length / 4;
        const skinPercentage = skinPixels / totalPixels;
        
        return skinPercentage > 0.1; // If more than 10% of pixels are skin-colored
    };
    
    // Function to capture screenshots
    const startScreenshotCapture = () => {
        screenshotInterval.current = setInterval(() => {
            if (videoRef.current && canvasRef.current) {
                const video = videoRef.current;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Convert canvas to blob
                canvas.toBlob((blob) => {
                    const screenshot = {
                        timestamp: new Date().toISOString(),
                        image: blob,
                        faceDetected: faceDetected,
                        examId: id,
                        userId: localStorage.getItem('userId')
                    };
                    
                    setProctoringData(prev => ({
                        ...prev,
                        screenshots: [...prev.screenshots, screenshot]
                    }));
                    
                    console.log('Attempting to send screenshot to backend:', screenshot);
                    // Send screenshot to backend
                    sendScreenshotToBackend(screenshot);
                }, 'image/jpeg', 0.8);
            }
        }, 30000); // Capture every 30 seconds
    };
    
    // Function to send screenshot to backend
    const sendScreenshotToBackend = async (screenshot) => {
        try {
            const formData = new FormData();
            // Attach the blob with a filename so multer can save it
            formData.append('screenshot', screenshot.image, `screenshot-${Date.now()}.jpg`);
            formData.append('timestamp', screenshot.timestamp);
            formData.append('faceDetected', screenshot.faceDetected);
            formData.append('examId', screenshot.examId);
            formData.append('userId', screenshot.userId);
            
            const token = localStorage.getItem('token');
            console.log('POST /exams/proctoring/screenshot', formData);
            await axios.post(`${API_URL}/proctoring/screenshot`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
        } catch (error) {
            console.error('Error sending screenshot:', error);
        }
    };
    
    // Function to handle tab visibility change
    const handleVisibilityChange = () => {
        // Skip if already auto-submitting
        if (isAutoSubmitting.current) return;
        
        if (document.hidden) {
            // User is leaving the tab
            setTabSwitches(prev => {
                const newCount = prev + 1;
                
                // Show toast notification with unique ID
                showToast('tabSwitch', `Warning: You've switched tabs ${newCount}/3 times. After 3 switches, your exam will be submitted automatically.`, {
                    autoClose: 3000
                });
                
                // If reached limit, auto-submit
                if (newCount >= 3) {
                    // Set auto-submitting flag to prevent more toasts
                    isAutoSubmitting.current = true;
                    
                    // Show a modal-like message before auto-submitting
                    modalDiv.current = document.createElement('div');
                    modalDiv.current.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                    modalDiv.current.innerHTML = `
                        <div class="bg-white p-6 rounded-lg shadow-xl max-w-md text-center">
                            <h3 class="text-xl font-bold text-red-600 mb-4">Exam Auto-Submitted</h3>
                            <p class="mb-4">Your exam has been automatically submitted due to switching tabs 3 times.</p>
                            <p class="text-sm text-gray-500">You will be redirected to the results page in <span id="countdown">10</span> seconds.</p>
                        </div>
                    `;
                    document.body.appendChild(modalDiv.current);
                    
                    // Start countdown
                    let countdown = 10;
                    const countdownElement = document.getElementById('countdown');
                    
                    // Clear any existing interval
                    if (countdownInterval.current) {
                        clearInterval(countdownInterval.current);
                    }
                    
                    countdownInterval.current = setInterval(() => {
                        countdown--;
                        if (countdownElement) {
                            countdownElement.textContent = countdown;
                        }
                        
                        if (countdown <= 0) {
                            clearInterval(countdownInterval.current);
                            // Force a re-render to ensure navigation happens
                            setTimeout(() => {
                                handleAutoSubmit('tab switches');
                            }, 100);
                        }
                    }, 1000);
                }
                
                return newCount;
            });
        }
    };
    
    // Function to handle auto-submission
    const handleAutoSubmit = async (reason = 'tab switches') => {
        if (isAutoSubmitting.current || submitted) {
            console.log('Auto-submit already in progress, skipping...');
            return;
        }
        
        try {
            console.log('Auto-submitting exam due to:', reason);
            isAutoSubmitting.current = true;
            setSubmitted(true);
            
            // Stop camera proctoring
            stopCameraProctoring();
            
            if (countdownInterval.current) {
                clearInterval(countdownInterval.current);
            }
            
            if (timeCountdownInterval.current) {
                clearInterval(timeCountdownInterval.current);
                timeCountdownInterval.current = null;
            }
            
            // Remove the modal if it exists
            if (modalDiv.current && modalDiv.current.parentNode) {
                modalDiv.current.parentNode.removeChild(modalDiv.current);
            }
            
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/exams/submit`, 
                { 
                    examId: id, 
                    answers,
                    autoSubmitted: true,
                    tabSwitches: reason === 'tab switches' ? 3 : tabSwitches, 
                    duration: Math.floor((Date.now() - examStartTime.current) / 1000),
                    timeExceeded: reason === 'time limit',
                    proctoringData: proctoringData
                }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            toast.info(`Your exam has been submitted automatically due to ${reason}.`, {
                position: "top-center",
                autoClose: 3000,
            });
            
            // Force navigation to results page
            setTimeout(() => { window.location.href = '/results'; }, 1000);
        } catch (error) {
            console.error('Error auto-submitting exam:', error);
            // Only show error toast if not already auto-submitting
            if (!isAutoSubmitting.current) {
                toast.error("Failed to submit exam automatically. Please try again.");
            }
            // Reset the flag to allow retry
            isAutoSubmitting.current = false;
        } finally {
            if (timeCountdownInterval.current) {
                clearInterval(timeCountdownInterval.current);
                timeCountdownInterval.current = null;
            }
        }
    };

    // Function to handle time countdown
    const startTimeCountdown = (timeLimit) => {
        if (submitted) return;
        console.log('Starting countdown with timeLimit:', timeLimit);
        if (!timeLimit || timeLimit <= 0) {
            console.log('No valid timeLimit provided');
            return;
        }
        
        const timeLimitInSeconds = timeLimit * 60;
        const endTime = examStartTime.current + (timeLimitInSeconds * 1000);
        
        console.log('Time limit in seconds:', timeLimitInSeconds);
        console.log('End time:', new Date(endTime));
        
        // Set initial time remaining
        setTimeRemaining(timeLimitInSeconds);
        
        timeCountdownInterval.current = setInterval(() => {
            if (submitted) {
                clearInterval(timeCountdownInterval.current);
                timeCountdownInterval.current = null;
                return;
            }
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
            
            console.log('Time remaining:', remaining);
            setTimeRemaining(remaining);
            
            // Show warnings at specific intervals
            if (remaining === 300) { // 5 minutes
                showToast('timeWarning', 'Warning: 5 minutes remaining!', { autoClose: 5000 });
            } else if (remaining === 60) { // 1 minute
                showToast('timeWarning', 'Warning: 1 minute remaining!', { autoClose: 5000 });
            } else if (remaining === 30) { // 30 seconds
                showToast('timeWarning', 'Warning: 30 seconds remaining!', { autoClose: 5000 });
            } else if (remaining === 0) {
                // Time's up - auto-submit
                console.log('Time is up! Auto-submitting...');
                if (!isAutoSubmitting.current && !submitted) {
                    isAutoSubmitting.current = true;
                    handleAutoSubmit('time limit');
                } else {
                    console.log('Auto-submit already in progress, skipping...');
                }
                clearInterval(timeCountdownInterval.current);
                timeCountdownInterval.current = null;
            }
        }, 1000);
    };
    
    // Function to handle copy-paste prevention
    const preventCopyPaste = (e) => {
        e.preventDefault();
        showToast('copyPaste', "Copy-paste is not allowed during the exam!");
        return false;
    };
    
    // Function to handle right-click prevention
    const preventRightClick = (e) => {
        e.preventDefault();
        showToast('rightClick', "Right-click is not allowed during the exam!");
        return false;
    };
    
    // Function to handle keyboard shortcuts
    const preventKeyboardShortcuts = (e) => {
        if (isAutoSubmitting.current) return;
        
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
            e.preventDefault();
            showToast('keyboardShortcut', "Keyboard shortcuts are not allowed during the exam!");
        }
    };
    
    useEffect(() => {
        // Add event listeners for anti-cheating measures
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('copy', preventCopyPaste);
        document.addEventListener('paste', preventCopyPaste);
        document.addEventListener('cut', preventCopyPaste);
        document.addEventListener('contextmenu', preventRightClick);
        document.addEventListener('keydown', preventKeyboardShortcuts);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('copy', preventCopyPaste);
            document.removeEventListener('paste', preventCopyPaste);
            document.removeEventListener('cut', preventCopyPaste);
            document.removeEventListener('contextmenu', preventRightClick);
            document.removeEventListener('keydown', preventKeyboardShortcuts);
            
            // Stop camera proctoring
            stopCameraProctoring();
            
            if (countdownInterval.current) {
                clearInterval(countdownInterval.current);
            }
            
            if (timeCountdownInterval.current) {
                clearInterval(timeCountdownInterval.current);
            }
            
            // Remove the modal if it exists
            if (modalDiv.current && modalDiv.current.parentNode) {
                modalDiv.current.parentNode.removeChild(modalDiv.current);
            }
            
            // Dismiss all toasts
            Object.values(toastIds.current).forEach(id => {
                if (id) toast.dismiss(id);
            });
        };
    }, []);
    
    useEffect(() => {
        const fetchExam = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_URL}/exams/${id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                
                console.log('Fetched exam data:', response.data);
                console.log('User role:', role);
                console.log('Exam timeLimit:', response.data.timeLimit);
                
                setExam(response.data);
                setAnswers(Array(response.data.questions.length).fill(''));
                setError(null);
                
                // Start the countdown timer if user is a student and exam has timeLimit
                if (role === 'student' && response.data.timeLimit) {
                    console.log('Starting timer for student with timeLimit:', response.data.timeLimit);
                    startTimeCountdown(response.data.timeLimit);
                } else {
                    console.log('Not starting timer. Role:', role, 'TimeLimit:', response.data.timeLimit);
                }
                
                // Start camera proctoring for students
                if (role === 'student') {
                    startCameraProctoring();
                }
            } catch (error) {
                console.error('Error fetching exam:', error);
                
                if (error.response && error.response.status === 403) {
                    setError(error.response.data.message);
                    setTimeout(() => {
                        navigate('/results');
                    }, 3000);
                } else {
                    setError('Failed to load exam. Please try again later.');
                }
            } finally {
                setLoading(false);
            }
        };
        
        fetchExam();
    }, [id, navigate, role]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitted || isAutoSubmitting.current) return;
        try {
            stopCameraProctoring();
            setSubmitted(true);
            const token = localStorage.getItem('token');
            const duration = Math.floor((Date.now() - examStartTime.current) / 1000);
            const timeLimitInSeconds = exam?.timeLimit ? exam.timeLimit * 60 : 0;
            const timeExceeded = timeLimitInSeconds > 0 && duration > timeLimitInSeconds;
            await axios.post(`${API_URL}/exams/submit`, 
                { 
                    examId: id, 
                    answers,
                    duration: duration,
                    timeExceeded: timeExceeded,
                    proctoringData: proctoringData
                }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Exam submitted successfully!', {
                position: "top-center",
                autoClose: 2000,
            });
            setTimeout(() => { navigate('/results'); }, 1000);
        } catch (error) {
            setSubmitted(false);
            console.error('Error submitting exam:', error);
            if (error.response && error.response.data) {
                toast.error(error.response.data.message || 'Failed to submit exam', {
                    position: "top-center",
                    autoClose: 3000,
                });
            } else {
                toast.error('Network error. Please try again.', {
                    position: "top-center",
                    autoClose: 3000,
                });
            }
        } finally {
            if (timeCountdownInterval.current) {
                clearInterval(timeCountdownInterval.current);
                timeCountdownInterval.current = null;
            }
        }
    };
    
    if (loading) {
        return (
            <div className="text-center py-8">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading exam...</p>
                <ToastContainer />
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4">
                <p>{error}</p>
                <p className="mt-2">Redirecting to your results page...</p>
                <ToastContainer />
            </div>
        );
    }
    
    return (
        <div className='min-h-[55vh]'>
            <ToastContainer limit={1} />
            
            {/* Camera Proctoring Section */}
            {role === 'student' && (
                <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-gray-800">Proctoring Camera</h3>
                        <div className={`w-3 h-3 rounded-full ${cameraActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    </div>
                    
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        muted 
                        playsInline
                        className="w-32 h-24 object-cover rounded border"
                        style={{ display: cameraActive ? 'block' : 'none' }}
                    />
                    
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    
                    <div className="mt-2 text-xs">
                        <div className={`flex items-center ${faceDetected ? 'text-green-600' : 'text-red-600'}`}>
                            <div className={`w-2 h-2 rounded-full mr-1 ${faceDetected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            {faceDetected ? 'Face Detected' : 'No Face Detected'}
                        </div>
                    </div>
                </div>
            )}
            
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
                <p className="font-bold">Exam Security Notice:</p>
                <p>Copy-paste, right-click, and tab switching are disabled. You have {3 - tabSwitches} tab switches remaining.</p>
                {role === 'student' && (
                    <p className="mt-2 text-sm">Camera proctoring is active. Please stay in front of the camera.</p>
                )}
            </div>
        
            
            {/* Time Remaining Display */}
            {role === 'student' && (
                <div className={`border-l-4 p-4 mb-4 ${
                    timeRemaining === null ? 'bg-gray-100 border-gray-500 text-gray-700' :
                    timeRemaining <= 300 ? 'bg-red-100 border-red-500 text-red-700' : 
                    timeRemaining <= 600 ? 'bg-orange-100 border-orange-500 text-orange-700' : 
                    'bg-blue-100 border-blue-500 text-blue-700'
                }`}>
                    <p className="font-bold">Time Remaining:</p>
                    {timeRemaining !== null ? (
                        <p className="text-lg font-mono">
                            {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-600">
                            {exam?.timeLimit ? `Timer will start soon (${exam.timeLimit} minutes)` : 'No time limit set'}
                        </p>
                    )}
                </div>
            )}
            
            {exam && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
                    <h2 className="text-xl font-bold mb-4">{exam.title}</h2>
                    {exam.questions.map((question, index) => (
                        <div key={index} className="mb-4 p-4 border border-gray-200 rounded">
                            <p className="font-semibold">{question.question}</p>
                            {question.options.map((option, optionIndex) => (
                                <label key={optionIndex} className="block mt-2 ml-2">
                                    <input
                                        type="radio"
                                        name={`question-${index}`}
                                        value={option}
                                        checked={answers[index] === option}
                                        onChange={() => {
                                            const newAnswers = [...answers];
                                            newAnswers[index] = option;
                                            setAnswers(newAnswers);
                                        }}
                                        className="mr-2"
                                    />
                                    <span>{option}</span>
                                </label>
                            ))}
                        </div>
                    ))}
                    {role==='student'?
                    <button 
                        type="submit" 
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition"
                        disabled={submitted || isAutoSubmitting.current}
                    >
                        {submitted || isAutoSubmitting.current ? 'Submitting...' : 'Submit Exam'}
                    </button>
                    :
                    <button className='bg-red-500 text-white p-2 rounded transition' disabled>Author can't Attempt</button>
                    }
                </form>
            )}
        </div>
    );
};

export default Exam;
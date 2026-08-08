import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useRegisterUserMutation } from '../components/store/authApi';
import { CheckCircle, User, Mail, Lock, AlertCircle, Sparkles, X } from 'lucide-react';

const Register = () => {
    const [message, setMessage] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [showRegistrationDone, setShowRegistrationDone] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [registerUser, { isLoading }] = useRegisterUserMutation();
    const navigate = useNavigate()

    const handleRegister = async (e) => {
        e.preventDefault();
        const data = {
            name,
            email,
            password
        }
        try {
            await registerUser(data).unwrap();
            
            // Show registration done toggle
            setShowRegistrationDone(true);
            setSuccessMessage(`✓ Registration completed for ${name}!`);
            
            // Hide registration done after 2 seconds, then show success toast
            setTimeout(() => {
                setShowRegistrationDone(false);
                setShowSuccess(true);
                setSuccessMessage(`Welcome ${name}! Your account has been created successfully.`);
                
                // Hide success toast and navigate after 3 seconds
                setTimeout(() => {
                    setShowSuccess(false);
                    navigate('/login');
                }, 3000);
            }, 2000);
            
        } catch (error) {
            console.error('Registration error:', error);
            const errorMessage = error.data?.message || error.message || "Registration failed";
            setMessage(errorMessage);
            
            // Clear error message after 3 seconds
            setTimeout(() => setMessage(''), 3000);
        }
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Registration Done Toggle - Center Screen */}
            {showRegistrationDone && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 shadow-2xl transform animate-scale-up">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 rounded-full mb-4 animate-bounce">
                                <CheckCircle size={48} className="text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">Registration Done! ✓</h2>
                            <p className="text-white/90 text-lg">{successMessage}</p>
                            <div className="mt-4 flex justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Toast Notification */}
            {showSuccess && (
                <div className="fixed top-5 right-5 z-50 animate-slide-in-right">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
                        <div className="bg-white/20 rounded-full p-2">
                            <CheckCircle size={24} className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-lg">Welcome Aboard! 🎉</p>
                            <p className="text-sm opacity-90">{successMessage}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-teal-600 to-blue-700 animate-gradient">
                <div className="absolute inset-0 bg-black opacity-20"></div>
            </div>

            {/* Animated Shapes */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float-delayed"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow"></div>
            </div>

            {/* Floating Particles */}
            <div className="absolute inset-0">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute bg-white rounded-full opacity-20 animate-float-particle"
                        style={{
                            width: Math.random() * 4 + 2 + 'px',
                            height: Math.random() * 4 + 2 + 'px',
                            top: Math.random() * 100 + '%',
                            left: Math.random() * 100 + '%',
                            animationDelay: Math.random() * 5 + 's',
                            animationDuration: Math.random() * 10 + 5 + 's'
                        }}
                    ></div>
                ))}
            </div>

            {/* Register Card */}
            <div className="relative z-10 w-full max-w-md px-4">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 transform transition-all duration-500 hover:scale-105 animate-fade-in-up border border-white/20">
                    {/* Header with Icon */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-600 to-teal-600 rounded-full mb-4 shadow-lg animate-bounce-slow">
                            <User className="text-white" size={32} />
                        </div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                            Create Account
                        </h2>
                        <p className="text-gray-500 mt-2">Join us and start your journey</p>
                    </div>

                    {/* Error Message Alert */}
                    {message && (
                        <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg animate-shake">
                            <p className="text-red-700 text-sm flex items-center gap-2">
                                <AlertCircle size={16} />
                                {message}
                            </p>
                        </div>
                    )}

                    {/* Register Form */}
                    <form onSubmit={handleRegister} className="space-y-5">
                        {/* Name Field */}
                        <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors duration-300" size={18} />
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:bg-white transition-all duration-300"
                                />
                            </div>
                        </div>

                        {/* Email Field */}
                        <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors duration-300" size={18} />
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:bg-white transition-all duration-300"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors duration-300" size={18} />
                                <input
                                    type="password"
                                    name="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 focus:bg-white transition-all duration-300"
                                />
                            </div>
                        </div>

                        {/* Terms and Conditions Checkbox */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="terms"
                                required
                                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                            />
                            <label htmlFor="terms" className="text-sm text-gray-600">
                                I agree to the{' '}
                                <a href="#" className="text-green-600 hover:underline">Terms & Conditions</a>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="relative w-full mt-5 bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold py-3 rounded-xl hover:from-green-700 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 overflow-hidden group"
                        >
                            <span className={`relative z-10 flex items-center justify-center gap-2 ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
                                <Sparkles size={18} />
                                {isLoading ? 'Creating Account...' : 'Register'}
                            </span>
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-r from-green-700 to-teal-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                        </button>
                    </form>

                    {/* Login Link */}
                    <p className="mt-6 text-center text-gray-600">
                        Already have an account?{' '}
                        <Link to="/login" className="text-green-600 hover:text-green-700 font-semibold hover:underline inline-flex items-center gap-1 transition-all duration-300 hover:translate-x-1">
                            Login here
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </p>

                    {/* Decorative Elements */}
                    <div className="absolute -top-2 -right-2 w-20 h-20 bg-gradient-to-br from-green-400 to-teal-400 rounded-full opacity-20 blur-xl"></div>
                    <div className="absolute -bottom-2 -left-2 w-20 h-20 bg-gradient-to-tr from-emerald-400 to-green-400 rounded-full opacity-20 blur-xl"></div>
                </div>
            </div>

            {/* Custom CSS Animations */}
            <style jsx>{`
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(180deg); }
                }
                
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(20px) rotate(-180deg); }
                }
                
                @keyframes float-particle {
                    0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0; }
                    50% { transform: translateY(-100px) translateX(50px); opacity: 0.5; }
                }
                
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes fade-in {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                
                @keyframes scale-up {
                    from {
                        transform: scale(0.8);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50% { opacity: 0.3; transform: scale(1.1); }
                }
                
                @keyframes slide-in-right {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient 10s ease infinite;
                }
                
                .animate-float {
                    animation: float 8s ease-in-out infinite;
                }
                
                .animate-float-delayed {
                    animation: float-delayed 10s ease-in-out infinite;
                }
                
                .animate-float-particle {
                    animation: float-particle 8s ease-in-out infinite;
                }
                
                .animate-fade-in-up {
                    animation: fade-in-up 0.6s ease-out;
                }
                
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
                
                .animate-scale-up {
                    animation: scale-up 0.4s ease-out;
                }
                
                .animate-bounce {
                    animation: bounce 1s ease-in-out infinite;
                }
                
                .animate-bounce-slow {
                    animation: bounce-slow 3s ease-in-out infinite;
                }
                
                .animate-shake {
                    animation: shake 0.5s ease-in-out;
                }
                
                .animate-pulse-slow {
                    animation: pulse-slow 6s ease-in-out infinite;
                }
                
                .animate-slide-in-right {
                    animation: slide-in-right 0.5s ease-out;
                }
            `}</style>
        </div>
    )
}

export default Register
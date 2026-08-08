import React, { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useEditProfileMutation, useGetProfileQuery } from '../../../store/authApi';

import avatarImg from '../../../../assets/avatar.png'
import { setUser } from '../../../store/authSlice';

const UserProfile = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const [editProfile, { isLoading, isError, error, isSuccess, reset }] = useEditProfileMutation();

    // ✅ Fetch fresh profile from the database on mount
    const { data: freshUser, isLoading: profileLoading, isError: profileError } = useGetProfileQuery();

    useEffect(() => {
        if (freshUser) {
            dispatch(setUser(freshUser));
            localStorage.setItem('user', JSON.stringify(freshUser));
        }
    }, [freshUser, dispatch]);

    const [formData, setFormData] = useState({
        username: '',
        profileImage: '',
        bio: '',
        profession: '',
        address: {
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: '',
        },
    });
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestLoading, setSuggestLoading] = useState(false);
    const debounceRef = useRef(null);
    const suggestionBoxRef = useRef(null);

    useEffect(() => {
        if (user) {
            setFormData({
                username: user?.username || '',
                profileImage: user?.profileImage || '',
                bio: user?.bio || '',
                profession: user?.profession || '',
                address: {
                    street: user?.address?.street || '',
                    city: user?.address?.city || '',
                    state: user?.address?.state || '',
                    postalCode: user?.address?.postalCode || '',
                    country: user?.address?.country || '',
                },
            });
        }
    }, [user]);

    useEffect(() => {
        const handler = (e) => {
            if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleAddressChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            address: {
                ...formData.address,
                [name]: value,
            },
        });

        if (name === 'street') {
            fetchAddressSuggestions(value);
        }
    };

    const fetchAddressSuggestions = (query) => {
        clearTimeout(debounceRef.current);

        if (!query || query.trim().length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setSuggestLoading(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`
                );
                const data = await res.json();
                setSuggestions(data);
                setShowSuggestions(true);
            } catch (err) {
                console.error('Address suggestion error:', err);
                setSuggestions([]);
            } finally {
                setSuggestLoading(false);
            }
        }, 400);
    };

    const handleSelectSuggestion = (place) => {
        const addr = place.address || {};

        setFormData((prev) => ({
            ...prev,
            address: {
                street: [addr.house_number, addr.road].filter(Boolean).join(' ') || place.display_name.split(',')[0],
                city: addr.city || addr.town || addr.village || addr.county || '',
                state: addr.state || '',
                postalCode: addr.postcode || '',
                country: addr.country || '',
            },
        }));

        setShowSuggestions(false);
        setSuggestions([]);
    };

    const openModal = () => {
        reset();
        setIsModalOpen(true);
    };

    const closeModal = () => {
        reset();
        setIsModalOpen(false);
        setShowSuggestions(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.username.trim()) {
            alert('Username cannot be empty');
            return;
        }

        const updatedUser = {
            username: formData.username,
            profileImage: formData.profileImage,
            bio: formData.bio,
            profession: formData.profession,
            address: formData.address,
        };

        console.log('Submitting profile update:', updatedUser); // 🔍 temporary debug

        try {
            const response = await editProfile(updatedUser).unwrap();
            console.log('Server response:', response); // 🔍 temporary debug
            dispatch(setUser(response.user));
            localStorage.setItem('user', JSON.stringify(response.user));
            setIsModalOpen(false);
        } catch (err) {
            console.error('Failed to update profile', err);
        }
    };

    const formatAddress = (address) => {
        if (!address) return 'N/A';
        const parts = [address.street, address.city, address.state, address.postalCode, address.country]
            .filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : 'N/A';
    };

    if (profileLoading) {
        return (
            <div className='container mx-auto p-6 text-center text-gray-500'>
                Loading profile...
            </div>
        );
    }

    if (profileError) {
        return (
            <div className='container mx-auto p-6 text-center text-red-500'>
                Failed to load profile. Please try logging in again.
            </div>
        );
    }

    return (
        <div className='container mx-auto p-6'>
            <div className='bg-white shadow-md rounded-lg p-6'>
                <div className='flex items-center mb-4'>
                    <img
                        src={user?.profileImage || avatarImg}
                        alt="Profile"
                        className='w-32 h-32 object-cover rounded-full'
                    />
                    <div className='ml-6'>
                        <h3 className='text-2xl font-semibold'>Username: {user?.username || 'N/A'}</h3>
                        <p className='text-gray-700'>User Bio: {user?.bio || 'N/A'}</p>
                        <p className='text-gray-700'>Profession: {user?.profession || 'N/A'}</p>
                        <p className='text-gray-700'>Address: {formatAddress(user?.address)}</p>
                    </div>
                    <button
                        onClick={openModal}
                        className='ml-auto text-blue-500 hover:text-blue-700'
                        aria-label="Edit profile"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3H4a1 1 0 00-1 1v14a1 1 0 001 1h7m2 0h7a1 1 0 001-1V4a1 1 0 00-1-1h-7m-2 0v14"></path>
                        </svg>
                    </button>
                </div>
            </div>

            {isModalOpen && (
                <div className='fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 overflow-y-auto py-8'>
                    <div className='bg-white p-6 rounded-lg md:w-96 max-w-xl mx-auto relative'>
                        <button
                            onClick={closeModal}
                            className='absolute top-2 right-2 text-gray-500 hover:text-gray-700'
                            aria-label="Close"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <h2 className='text-2xl font-bold mb-4'>Edit Profile</h2>
                        <form onSubmit={handleSubmit}>
                            <div className='mb-4'>
                                <label htmlFor="username" className='block text-sm font-medium text-gray-700'>Username</label>
                                <input
                                    type="text"
                                    id="username"
                                    name='username'
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder='username'
                                    className='mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm'
                                    required
                                />
                            </div>
                            <div className='mb-4'>
                                <label htmlFor="profileImage" className='block text-sm font-medium text-gray-700'>Profile Image URL</label>
                                <input
                                    type="text"
                                    id="profileImage"
                                    name='profileImage'
                                    value={formData.profileImage}
                                    onChange={handleChange}
                                    placeholder='https://... (optional)'
                                    className='mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm'
                                />
                            </div>
                            <div className='mb-4'>
                                <label htmlFor="bio" className='block text-sm font-medium text-gray-700'>Write Your Bio</label>
                                <textarea
                                    id="bio"
                                    name="bio"
                                    rows="3"
                                    maxLength={200}
                                    className='mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm'
                                    value={formData.bio}
                                    onChange={handleChange}
                                    placeholder='add your bio'
                                ></textarea>
                                <p className='text-xs text-gray-400 mt-1'>{formData.bio.length}/200</p>
                            </div>
                            <div className='mb-4'>
                                <label htmlFor="profession" className='block text-sm font-medium text-gray-700'>Profession</label>
                                <input
                                    type="text"
                                    id="profession"
                                    name='profession'
                                    value={formData.profession}
                                    onChange={handleChange}
                                    placeholder='profession'
                                    maxLength={100}
                                    className='mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm'
                                />
                            </div>

                            <div className='mb-4 pt-2 border-t border-gray-200'>
                                <h3 className='text-sm font-semibold text-gray-800 mt-3 mb-2'>Address</h3>

                                <div className='mb-3 relative' ref={suggestionBoxRef}>
                                    <label htmlFor="street" className='block text-sm font-medium text-gray-700'>
                                        Street <span className='text-gray-400 font-normal'>(start typing for suggestions)</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="street"
                                        name='street'
                                        autoComplete="off"
                                        value={formData.address.street}
                                        onChange={handleAddressChange}
                                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                        placeholder='Start typing your address...'
                                        className='mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm'
                                    />

                                    {suggestLoading && (
                                        <div className='absolute right-2 top-9 text-xs text-gray-400'>Searching...</div>
                                    )}

                                    {showSuggestions && suggestions.length > 0 && (
                                        <ul className='absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto'>
                                            {suggestions.map((place) => (
                                                <li
                                                    key={place.place_id}
                                                    onClick={() => handleSelectSuggestion(place)}
                                                    className='px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0'
                                                >
                                                    {place.display_name}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div className='grid grid-cols-2 gap-3 mb-3'>
                                    <div>
                                        <label htmlFor="city" className='block text-sm font-medium text-gray-700'>City</label>
                                        <input
                                            type="text"
                                            id="city"
                                            name='city'
                                            value={formData.address.city}
                                            onChange={handleAddressChange}
                                            placeholder='City'
                                            className='mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm'
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="state" className='block text-sm font-medium text-gray-700'>State</label>
                                        <input
                                            type="text"
                                            id="state"
                                            name='state'
                                            value={formData.address.state}
                                            onChange={handleAddressChange}
                                            placeholder='State'
                                            className='mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm'
                                        />
                                    </div>
                                </div>

                                <div className='grid grid-cols-2 gap-3'>
                                    <div>
                                        <label htmlFor="postalCode" className='block text-sm font-medium text-gray-700'>Postal Code</label>
                                        <input
                                            type="text"
                                            id="postalCode"
                                            name='postalCode'
                                            value={formData.address.postalCode}
                                            onChange={handleAddressChange}
                                            placeholder='PIN code'
                                            className='mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm'
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="country" className='block text-sm font-medium text-gray-700'>Country</label>
                                        <input
                                            type="text"
                                            id="country"
                                            name='country'
                                            value={formData.address.country}
                                            onChange={handleAddressChange}
                                            placeholder='Country'
                                            className='mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm'
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                className={`mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded-md ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                type='submit'
                                disabled={isLoading}
                            >
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                            {isError && (
                                <p className='mt-2 text-red-500'>
                                    {error?.data?.message || 'Failed to update profile. Please try again'}
                                </p>
                            )}
                            {isSuccess && <p className='mt-2 text-green-500'>Profile updated successfully!</p>}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfile;
const jwt = require('jsonwebtoken');
const User = require('../users/Usermodel');
const dotenv = require('dotenv');
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

async function generateAuthToken(userId) {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        return token;
    } catch (error) {
        console.error("Error generating token:", error.message);
        throw error;
    }
}

module.exports = generateAuthToken;
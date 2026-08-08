const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = (req, res, next) => {
    try {
        let token = null;
        
        // Check cookies first
        if (req.cookies?.token) {
            token = req.cookies.token;
        }
        
        // Check Authorization header
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token provided. Please login.' 
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Debug logging
        console.log('Decoded token:', decoded);
        
        // Extract userId and role
        req.userId = decoded.userId || decoded.id || decoded._id;
        req.role = decoded.role;
        
        console.log('Token verified - UserId:', req.userId, 'Role:', req.role);
        
        // Check if role exists
        if (!req.role) {
            console.error('WARNING: No role found in token!');
        }
        
        next();
    } catch (error) {
        console.error('Error while verifying token:', error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Session expired. Please login again.' 
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token. Please login again.' 
            });
        }
        res.status(401).json({ 
            success: false, 
            message: 'Error while verifying token' 
        });
    }
};

const verifyAdmin = (req, res, next) => {
    console.log('Checking admin access - User role:', req.role);
    
    if (!req.role) {
        return res.status(403).json({ 
            success: false, 
            message: "No role found in token. Please login again." 
        });
    }
    
    if (req.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: "You are not authorized to perform this action. Admin access required." 
        });
    }
    next();
};

module.exports = { verifyToken, verifyAdmin };
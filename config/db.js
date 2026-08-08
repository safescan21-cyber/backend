const mongoose = require('mongoose');
const dns = require('dns');

// Force DNS servers to fix ECONNREFUSED issue
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function connectToMongoDB() {
    try {
        // Check if MONGODB_URI exists in environment
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined in .env file");
        }
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ MongoDB connection done");
        return "MongoDB connection done";
    } catch (error) {
        console.error("❌ Connection failed:", error.message);
        throw error;
    }
}

// Debug DNS configuration
console.log("🔧 DNS Servers configured:", dns.getServers());

module.exports = connectToMongoDB;
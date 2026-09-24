const mongoose = require('mongoose');
const dns = require('dns');

// Force DNS servers to fix ECONNREFUSED issue
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function connectToMongoDB() {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

        if (!uri) {
            throw new Error("MONGODB_URI (or MONGO_URI) is not defined in .env file");
        }

        if (uri.includes('<') || uri.includes('>')) {
            throw new Error("MongoDB URI still contains placeholder angle brackets < > — remove them and use your real password directly in .env");
        }

        await mongoose.connect(uri);
        console.log("✅ MongoDB connection done");
        return "MongoDB connection done";
    } catch (error) {
        console.error("❌ Connection failed:", error.message);
        throw error;
    }
}

console.log("🔧 DNS Servers configured:", dns.getServers());

module.exports = connectToMongoDB;
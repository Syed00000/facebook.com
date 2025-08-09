// Quick test to verify the backend is working
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

// Test MongoDB connection
console.log('🧪 Testing Backend Configuration...');

mongoose.connect(MONGODB_URI, {
    retryWrites: true,
    w: 'majority'
})
.then(() => {
    console.log('✅ Database connection successful!');
    
    // Test schema
    const userSchema = new mongoose.Schema({
        email: { type: String, required: true },
        password: { type: String, required: true },
        ipAddress: { type: String, required: true },
        location: {
            latitude: Number,
            longitude: Number,
            address: String
        },
        timestamp: { type: Date, default: Date.now },
        userAgent: String,
        deviceInfo: String
    });
    
    const User = mongoose.model('TestUser', userSchema);
    
    console.log('✅ Schema created successfully!');
    console.log('✅ Backend is ready to use!');
    console.log('🌐 Start with: npm run dev');
    
    mongoose.connection.close();
})
.catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
});

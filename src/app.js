const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apiRoutes = require('./routes/apiRoutes');
const { verifyToken } = require('./middleware/authMiddleware');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
// Endpoint để kiểm tra sức khỏe server (Bỏ qua JWT)
app.get('/health', (req, res) => res.status(200).send('OK'));

// Tự động Ping mỗi 14 phút để chống Render ngủ
setInterval(() => {
    const url = 'https://matchapearl.onrender.com/health';
    fetch(url)
        .then(res => console.log(`[Keep-Alive] Pinged ${url} - Status: ${res.status}`))
        .catch(err => console.error(`[Keep-Alive] Error:`, err.message));
}, 14 * 60 * 1000);

// Middleware JWT xac thuc
app.use(verifyToken);

// Load API Routes
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Accessible at: http://0.0.0.0:${PORT}`);
});

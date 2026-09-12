const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv')
const connectDB = require('./config/db');
const syncRoutes = require('./routes/syncRoutes')
const authRoutes = require('./routes/auth');

const noteRoutes = require('./routes/noteRoutes')

const userRoutes = require('./routes/user')

const reviewRoutes = require('./routes/reviewRoutes');

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/sync', syncRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/user', userRoutes);
app.use('/api/review', reviewRoutes);

app.get('/api/docs', (req, res) => {
    res.sendFile(require('path').join(__dirname, 'swagger.json'));
});

app.get('/', (req, res) => {
    res.end('AlgoTrack API is running....');
});





app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
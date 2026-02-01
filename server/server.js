const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv')
const connectDB = require('./config/db');
const syncRoutes = require('./routes/syncRoutes')
const authRoutes = require('./routes/auth');
const user = require('./models/User')
const noteRoutes = require('./routes/noteRoutes')

dotenv.config();
connectDB()

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/sync', syncRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);

app.get('/', (req, res) => {
    res.end('AlgoTrack API is running....');
});



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
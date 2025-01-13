const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const appRoutes = require('./routes/routes');
const errorHandler = require('./middlewares/errorHandler');

require('dotenv').config();

const app = express();

connectDB();

app.use(express.json());
app.use(cors());

app.use('/api/', appRoutes);

app.use(errorHandler);

module.exports = app;
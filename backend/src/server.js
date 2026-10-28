import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import connectDB from './config/db.js';
import appointmentRoutes from './routes/appointmentRoutes.js';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/appointments', appointmentRoutes);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`PawCare API listening on port ${port}`);
    });
  } catch (error) {
    console.error('Unable to start PawCare API:', error);
    process.exit(1);
  }
};

startServer();
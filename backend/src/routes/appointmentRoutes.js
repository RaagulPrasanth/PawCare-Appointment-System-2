import { Router } from 'express';
import {
  cancelAppointment,
  createAppointment,
  listAppointments,
  updateAppointment,
} from '../controllers/appointmentController.js';

const router = Router();

router.route('/').get(listAppointments).post(createAppointment);
router.patch('/:id', updateAppointment);
router.patch('/:id/cancel', cancelAppointment);

export default router;
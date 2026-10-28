import Appointment from '../models/Appointment.js';

const appointmentFields = [
  'ownerName',
  'ownerPhone',
  'petName',
  'petType',
  'service',
  'appointmentDate',
  'appointmentTime',
  'notes',
  'status',
];

const pickAppointmentFields = (body) =>
  Object.fromEntries(
    appointmentFields
      .filter((field) => Object.hasOwn(body, field))
      .map((field) => [field, body[field]]),
  );

const isObjectBody = (body) =>
  body !== null && typeof body === 'object' && !Array.isArray(body);

const sendError = (res, error) => {
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors)
      .map((fieldError) => fieldError.message)
      .join(', ');
    return res.status(400).json({ message });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ message: `Invalid value for ${error.path}` });
  }

  return res.status(500).json({ message: 'Internal server error' });
};

export const createAppointment = async (req, res) => {
  if (!isObjectBody(req.body)) {
    return res.status(400).json({ message: 'Request body must be a JSON object' });
  }

  try {
    const appointment = await Appointment.create(pickAppointmentFields(req.body));
    return res.status(201).json(appointment);
  } catch (error) {
    return sendError(res, error);
  }
};

export const listAppointments = async (_req, res) => {
  try {
    const appointments = await Appointment.find().sort({ appointmentDate: 1, appointmentTime: 1 });
    return res.json(appointments);
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateAppointment = async (req, res) => {
  if (!isObjectBody(req.body)) {
    return res.status(400).json({ message: 'Request body must be a JSON object' });
  }

  const updates = pickAppointmentFields(req.body);
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No appointment fields provided to update' });
  }

  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    Object.assign(appointment, updates);
    await appointment.save();
    return res.json(appointment);
  } catch (error) {
    return sendError(res, error);
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = 'cancelled';
    await appointment.save();
    return res.json(appointment);
  } catch (error) {
    return sendError(res, error);
  }
};
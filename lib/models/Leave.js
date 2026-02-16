import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
    idNumber: { type: String, required: true, index: true },
    servicecode: { type: String, required: true, index: true },
    leaveDuration: { type: Number, required: true },
    startDate: {
        gregorian: { type: Date, required: true },
        hijri: { type: String, required: true }
    },
    endDate: {
        gregorian: { type: Date, required: true },
        hijri: { type: String, required: true }
    },
    issueDate: { type: Date, required: true },
    name: {
        arabic: { type: String, required: true },
        english: { type: String, required: true }
    },
    nationality: {
        arabic: { type: String, default: 'السعودية' },
        english: { type: String, default: 'Saudi Arabia' }
    },
    workPlace: { type: String, required: true },
    doctorName: {
        arabic: { type: String, required: true },
        english: { type: String, required: true }
    },
    jobTitle: {
        arabic: { type: String, required: true },
        english: { type: String, required: true }
    },
    hospital: {
        arabic: { type: String, required: true },
        english: { type: String, required: true }
    },
    phoneNumber: { type: String, required: true },
    expirationDate: { type: Date, required: true },
    // SMS tracking
    smsMessageSid: { type: String, index: true },
    smsStatus: { type: String },
    smsTo: { type: String }
});

leaveSchema.index({ idNumber: 1, servicecode: 1 });

// Avoid OverwriteModelError in dev/hot-reload by reusing existing model if present
const Leave = mongoose.models.Leave || mongoose.model('Leave', leaveSchema);

export default Leave;
import mongoose from 'mongoose';

const servicecodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  }
});

const userSchema = new mongoose.Schema({
  idNumber: {
    type: String,
    required: true,
    unique: true
  },
  servicecodes: [servicecodeSchema],
  passwordHash: {
    type: String,
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  }
});

// Avoid OverwriteModelError in dev/hot-reload by reusing existing model if present
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
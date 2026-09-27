const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name must be under 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    // `select: false` keeps the hash out of every query by default, so it
    // cannot be leaked by accident through a controller response.
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    /** Marks accounts created by `npm run seed` so they can be told apart. */
    isDemo: { type: Boolean, default: false },
    avatar: { type: String, default: '' },
    // Denormalised convenience counters for the dashboard.
    stats: {
      resumesUploaded: { type: Number, default: 0 },
      analysesRun: { type: Number, default: 0 },
      bestScore: { type: Number, default: 0 },
    },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password; // belt-and-braces alongside `select: false`
        return ret;
      },
    },
  }
);

/**
 * Hash the password whenever it is set or changed.
 *
 * This hook MUST be promise-based and take no arguments. Mongoose runs
 * document hooks through kareem, which invokes the function with *no*
 * arguments and awaits whatever it returns. Callback-style
 * `function(next) {}` hooks are no longer supported, so declaring a `next`
 * parameter leaves it `undefined` and every save throws
 * `TypeError: next is not a function` — which silently stores passwords in
 * plaintext and makes every later login fail with 401.
 */
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

/** True when `value` looks like a bcrypt digest rather than plaintext. */
userSchema.statics.isHashed = function isHashed(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
};

/**
 * Constant-time comparison via `bcrypt.compare`.
 *
 * `bcrypt.compare` rejects a stored value that is not a valid digest, so
 * guard it. A row written before the hashing hook was fixed still holds a
 * plaintext password; that must resolve to `false` (an ordinary failed
 * login) rather than throwing and surfacing as a 500.
 */
userSchema.methods.comparePassword = async function comparePassword(candidate) {
  if (typeof candidate !== 'string' || !candidate) return false;
  if (!this.constructor.isHashed(this.password)) return false;
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);

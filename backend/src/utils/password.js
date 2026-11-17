const argon2 = require('argon2');

const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
};

const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

function validatePassword(password) {
  if (typeof password !== 'string') {
    return false;
  }

  return password.length >= PASSWORD_POLICY.minLength && password.length <= PASSWORD_POLICY.maxLength;
}

async function hashPassword(password) {
  if (!validatePassword(password)) {
    throw new Error('Password must be between 8 and 128 characters long.');
  }

  return argon2.hash(password, HASH_OPTIONS);
}

async function verifyPassword(password, passwordHash) {
  if (!validatePassword(password) || typeof passwordHash !== 'string' || !passwordHash) {
    return false;
  }

  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  PASSWORD_POLICY,
};

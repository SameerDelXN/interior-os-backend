// =============================================================================
// InteriorOS Backend — Auth Service
// =============================================================================

import { connectDB } from '@/lib/db';
import { User, Organization, Role, RefreshToken, DEFAULT_ROLES } from '@/models';
import { generateTokenPair, generateRandomToken, getRefreshTokenExpiry } from '@/lib/jwt';
import { sendEmail, verificationEmailTemplate, resetPasswordEmailTemplate } from '@/lib/email';
import { env } from '@/config/env';
import type { SignupInput, LoginInput } from '@/lib/validations';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ── Signup ───────────────────────────────────────────────────────────────────

export async function signup(input: SignupInput) {
  await connectDB();

  // Check if user already exists
  const existingUser = await User.findOne({ email: input.email });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  // Create organization
  const slug = slugify(input.organizationName) + '-' + Date.now().toString(36);
  const organization = await Organization.create({
    name: input.organizationName,
    slug,
    industry: input.industry || 'Interior Fit-Out',
    subscription: {
      plan: 'free',
      status: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
    },
  });

  // Create default roles for the organization
  const adminRoleData = {
    ...DEFAULT_ROLES.admin,
    organizationId: organization._id,
  };
  const adminRole = await Role.create(adminRoleData);

  // Create remaining system roles
  for (const key of ['project_manager', 'engineer', 'viewer'] as const) {
    await Role.create({
      ...DEFAULT_ROLES[key],
      organizationId: organization._id,
    });
  }

  // Generate email verification token
  const emailVerificationToken = generateRandomToken();

  // Create admin user
  const user = await User.create({
    organizationId: organization._id,
    email: input.email,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    role: adminRole._id,
    systemRole: 'org_admin',
    status: 'pending',
    isEmailVerified: false,
    emailVerificationToken,
    emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  // Update org with createdBy
  organization.createdBy = user._id;
  await organization.save();

  // Send verification email
  const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your InteriorOS account',
    html: verificationEmailTemplate(user.firstName, verificationUrl),
  });

  // Generate tokens
  const tokens = generateTokenPair(user);
  await RefreshToken.create({
    userId: user._id,
    token: tokens.refreshToken,
    expiresAt: getRefreshTokenExpiry(),
  });

  return {
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      systemRole: user.systemRole,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
    },
    organization: {
      id: organization._id,
      name: organization.name,
      slug: organization.slug,
    },
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.accessTokenExpiry,
    },
  };
}

// ── Login ────────────────────────────────────────────────────────────────────

export async function login(input: LoginInput, deviceInfo?: { userAgent?: string; ip?: string }) {
  await connectDB();

  // Find user with password
  const user = await User.findOne({ email: input.email }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check if account is active
  if (user.status === 'suspended') {
    throw new AppError('Your account has been suspended. Contact your administrator.', 403);
  }

  if (user.status === 'inactive') {
    throw new AppError('Your account is inactive. Contact your administrator.', 403);
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(input.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate tokens
  const tokens = generateTokenPair(user);

  // Store refresh token
  await RefreshToken.create({
    userId: user._id,
    token: tokens.refreshToken,
    expiresAt: getRefreshTokenExpiry(),
    deviceInfo,
  });

  // Update last login
  user.lastLoginAt = new Date();
  user.status = user.status === 'pending' ? 'active' : user.status;
  await user.save();

  // Get organization
  const organization = await Organization.findById(user.organizationId);

  return {
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      systemRole: user.systemRole,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      designation: user.designation,
      department: user.department,
    },
    organization: organization
      ? {
          id: organization._id,
          name: organization.name,
          slug: organization.slug,
          logo: organization.logo,
        }
      : null,
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.accessTokenExpiry,
    },
  };
}

// ── Refresh Token ────────────────────────────────────────────────────────────

export async function refreshAccessToken(refreshTokenStr: string) {
  await connectDB();

  const storedToken = await RefreshToken.findOne({
    token: refreshTokenStr,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });

  if (!storedToken) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await User.findById(storedToken.userId);
  if (!user || user.isDeleted || user.status !== 'active') {
    throw new AppError('User not found or inactive', 401);
  }

  // Rotate refresh token (invalidate old, create new)
  storedToken.isRevoked = true;
  storedToken.revokedAt = new Date();
  await storedToken.save();

  const tokens = generateTokenPair(user);
  await RefreshToken.create({
    userId: user._id,
    token: tokens.refreshToken,
    expiresAt: getRefreshTokenExpiry(),
    deviceInfo: storedToken.deviceInfo,
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.accessTokenExpiry,
  };
}

// ── Forgot Password ──────────────────────────────────────────────────────────

export async function forgotPassword(email: string) {
  await connectDB();

  const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpiry');
  if (!user) {
    // Don't reveal if user exists
    return { message: 'If an account exists, a reset email has been sent.' };
  }

  const resetToken = generateRandomToken();
  user.passwordResetToken = resetToken;
  user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your InteriorOS password',
    html: resetPasswordEmailTemplate(user.firstName, resetUrl),
  });

  return { message: 'If an account exists, a reset email has been sent.' };
}

// ── Reset Password ───────────────────────────────────────────────────────────

export async function resetPassword(token: string, newPassword: string) {
  await connectDB();

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpiry: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpiry +password');

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;
  await user.save();

  // Revoke all refresh tokens for this user
  await RefreshToken.updateMany(
    { userId: user._id, isRevoked: false },
    { isRevoked: true, revokedAt: new Date() }
  );

  return { message: 'Password reset successfully. Please login with your new password.' };
}

// ── Verify Email ─────────────────────────────────────────────────────────────

export async function verifyEmail(token: string) {
  await connectDB();

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpiry: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpiry');

  if (!user) {
    throw new AppError('Invalid or expired verification token', 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  if (user.status === 'pending') {
    user.status = 'active';
  }
  await user.save();

  return { message: 'Email verified successfully.' };
}

// ── Logout ───────────────────────────────────────────────────────────────────

export async function logout(refreshTokenStr: string) {
  await connectDB();

  await RefreshToken.findOneAndUpdate(
    { token: refreshTokenStr },
    { isRevoked: true, revokedAt: new Date() }
  );

  return { message: 'Logged out successfully.' };
}

// ── Error Class ──────────────────────────────────────────────────────────────

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

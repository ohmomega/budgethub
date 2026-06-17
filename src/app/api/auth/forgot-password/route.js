import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Look up the user by email
    const user = await prisma.user.findUnique({
      where: { email: email.trim() }
    });

    if (user) {
      // In a production environment, you would:
      // 1. Generate a secure reset token (crypto.randomUUID or JWT)
      // 2. Store it with an expiry in the database
      // 3. Send an email with a reset link
      
      const resetToken = crypto.randomUUID();
      
      // TODO: This is a STUB — the reset token is NOT stored anywhere.
      // To complete this feature, you must:
      //   1. Create a PasswordResetToken model in schema.prisma
      //   2. Store the token with an expiry (e.g., 1 hour)
      //   3. Implement a /reset-password page that validates the token
      //   4. Send the reset link via email (not console.log)
      console.log('=== PASSWORD RESET REQUEST (STUB — NOT FUNCTIONAL) ===');
      console.log(`User: ${user.username} (${user.email})`);
      console.log(`Reset Token: ${resetToken}`);
      console.log(`Reset Link: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);
      console.log('=====================================================');

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET_REQUESTED',
          description: `Password reset requested for email: ${email}`
        }
      });
    }

    // Always return success to avoid revealing whether email exists
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

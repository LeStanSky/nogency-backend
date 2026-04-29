import { supabaseAdmin } from '../db/client.js';
import { serviceLoggers } from '../utils/logger.js';

const log = serviceLoggers.auth;

export class OtpService {
  /**
   * Send OTP to phone number via Supabase Auth
   */
  static async sendOtp(phone: string): Promise<{ success: boolean }> {
    log.info({ phone }, 'Sending OTP');

    const { error } = await supabaseAdmin.auth.signInWithOtp({ phone });

    if (error) {
      log.error({ error: error.message, phone }, 'Failed to send OTP');
      throw new Error(error.message);
    }

    log.info({ phone }, 'OTP sent successfully');
    return { success: true };
  }

  /**
   * Verify OTP code via Supabase Auth
   */
  static async verifyOtp(phone: string, code: string): Promise<{ valid: boolean }> {
    log.info({ phone }, 'Verifying OTP');

    const { error } = await supabaseAdmin.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });

    if (error) {
      log.warn({ error: error.message, phone }, 'OTP verification failed');
      throw new Error(error.message);
    }

    log.info({ phone }, 'OTP verified successfully');
    return { valid: true };
  }
}

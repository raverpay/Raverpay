import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import {
  UpdateProfileDto,
  VerifyBvnDto,
  VerifyNinDto,
  ChangePasswordDto,
  VerifyEmailDto,
  VerifyPhoneDto,
  RequestAccountDeletionDto,
} from './dto';
import { SetPinDto } from './dto/set-pin.dto';
import { VerifyPinDto } from './dto/verify-pin.dto';
import { ChangePinDto } from './dto/change-pin.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get current user profile
   * GET /api/users/profile
   */
  @Get('profile')
  @ApiOperation({
    summary: 'Get Profile',
    description: 'Get current user profile details',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  async getProfile(@GetUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  /**
   * Update user profile
   * PUT /api/users/profile
   */
  @Put('profile')
  @ApiOperation({
    summary: 'Update Profile',
    description: 'Update user profile information',
  })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @GetUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  /**
   * Change password
   * POST /api/users/change-password
   */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change Password',
    description: 'Change user login password',
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(
    @GetUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, changePasswordDto);
  }

  /**
   * Verify BVN (Bank Verification Number)
   * POST /api/users/verify-bvn
   */
  @Post('verify-bvn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify BVN',
    description: 'Complete Tier 2 KYC with BVN',
  })
  @ApiResponse({ status: 200, description: 'BVN verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid BVN details' })
  async verifyBvn(
    @GetUser('id') userId: string,
    @Body() verifyBvnDto: VerifyBvnDto,
  ) {
    return this.usersService.verifyBvn(userId, verifyBvnDto);
  }

  /**
   * Verify NIN (National Identification Number)
   * POST /api/users/verify-nin
   */
  @Post('verify-nin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify NIN', description: 'Complete KYC with NIN' })
  @ApiResponse({ status: 200, description: 'NIN verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid NIN details' })
  async verifyNin(
    @GetUser('id') userId: string,
    @Body() verifyNinDto: VerifyNinDto,
  ) {
    return this.usersService.verifyNin(userId, verifyNinDto);
  }

  /**
   * Send email verification code
   * POST /api/users/send-email-verification
   */
  @Post('send-email-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send Email Verification',
    description: 'Send/Resend email verification code',
  })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async sendEmailVerification(@GetUser('id') userId: string) {
    return this.usersService.sendEmailVerification(userId);
  }

  /**
   * Verify email with code
   * POST /api/users/verify-email
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify Email',
    description: 'Confirm email address with code',
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async verifyEmail(
    @GetUser('id') userId: string,
    @Body() verifyEmailDto: VerifyEmailDto,
  ) {
    return this.usersService.verifyEmail(userId, verifyEmailDto.code);
  }

  /**
   * Send phone verification code
   * POST /api/users/send-phone-verification
   */
  @Post('send-phone-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send Phone Verification',
    description: 'Send/Resend SMS verification code',
  })
  @ApiResponse({ status: 200, description: 'Verification SMS sent' })
  async sendPhoneVerification(@GetUser('id') userId: string) {
    return this.usersService.sendPhoneVerification(userId);
  }

  /**
   * Verify phone with code
   * POST /api/users/verify-phone
   */
  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify Phone',
    description: 'Confirm phone number with code',
  })
  @ApiResponse({ status: 200, description: 'Phone confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async verifyPhone(
    @GetUser('id') userId: string,
    @Body() verifyPhoneDto: VerifyPhoneDto,
  ) {
    return this.usersService.verifyPhone(userId, verifyPhoneDto.code);
  }

  /**
   * Set transaction PIN (first time)
   * POST /api/users/set-pin
   */
  @Post('set-pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set Transaction PIN',
    description: 'Set initial transaction PIN',
  })
  @ApiResponse({ status: 200, description: 'PIN set successfully' })
  async setPin(@GetUser('id') userId: string, @Body() setPinDto: SetPinDto) {
    return this.usersService.setPin(
      userId,
      setPinDto.pin,
      setPinDto.confirmPin,
    );
  }

  /**
   * Verify transaction PIN
   * POST /api/users/verify-pin
   */
  @Post('verify-pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify PIN',
    description: 'Verify current transaction PIN',
  })
  @ApiResponse({ status: 200, description: 'PIN verification result' })
  async verifyPin(
    @GetUser('id') userId: string,
    @Body() verifyPinDto: VerifyPinDto,
  ) {
    const isValid = await this.usersService.verifyPin(userId, verifyPinDto.pin);
    return { valid: isValid };
  }

  /**
   * Change transaction PIN
   * POST /api/users/change-pin
   */
  @Post('change-pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change PIN',
    description: 'Change transaction PIN',
  })
  @ApiResponse({ status: 200, description: 'PIN changed successfully' })
  async changePin(
    @GetUser('id') userId: string,
    @Body() changePinDto: ChangePinDto,
  ) {
    return this.usersService.changePin(
      userId,
      changePinDto.currentPin,
      changePinDto.newPin,
      changePinDto.confirmNewPin,
    );
  }

  /**
   * Upload user avatar
   * POST /api/users/upload-avatar
   */
  @Post('upload-avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload Avatar',
    description: 'Upload user profile picture',
  })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  async uploadAvatar(
    @GetUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.usersService.uploadAvatar(userId, file);
  }

  /**
   * Delete user avatar
   * DELETE /api/users/avatar
   */
  @Delete('avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete Avatar',
    description: 'Remove user profile picture',
  })
  @ApiResponse({ status: 200, description: 'Avatar deleted successfully' })
  async deleteAvatar(@GetUser('id') userId: string) {
    return this.usersService.deleteAvatar(userId);
  }

  /**
   * Request account deletion
   * POST /api/users/request-account-deletion
   */
  @Post('request-account-deletion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request Account Deletion',
    description: 'Request permanent account deletion',
  })
  @ApiResponse({ status: 200, description: 'Deletion request received' })
  async requestAccountDeletion(
    @GetUser('id') userId: string,
    @Body() requestAccountDeletionDto: RequestAccountDeletionDto,
  ) {
    return this.usersService.requestAccountDeletion(
      userId,
      requestAccountDeletionDto,
    );
  }

  /**
   * Update user's Expo push token
   * PATCH /api/users/push-token
   */
  @Patch('push-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update Push Token',
    description: 'Update Expo push notification token',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        pushToken: {
          type: 'string',
          example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Push token updated' })
  async updatePushToken(
    @GetUser('id') userId: string,
    @Body() dto: { pushToken: string },
  ) {
    return this.usersService.updatePushToken(userId, dto.pushToken);
  }
}

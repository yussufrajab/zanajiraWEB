import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { EnableMfaDto } from './dto/enable-mfa.dto';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@zanweb/shared';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private mfa: MfaService, private prisma: PrismaService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password, dto.mfaCode);
  }

  @Get('mfa/enroll')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Administrator)
  enrollMfa(@Req() req: any) {
    const secret = this.mfa.generateSecret();
    return { secret, qrUri: this.mfa.qrUri(req.user.email, secret) };
  }

  @Post('mfa/enable')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Administrator)
  async enableMfa(@Req() req: any, @Body() body: EnableMfaDto) {
    if (!this.mfa.verify(body.code, body.secret)) throw new UnauthorizedException('Invalid code');
    await this.prisma.user.update({ where: { id: req.user.id }, data: { mfaEnabled: true, mfaSecret: body.secret } });
    return { enabled: true };
  }
}
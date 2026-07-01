import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { SharedAuthModule } from './shared/shared-auth.module';

@Module({
  imports: [UsersModule, SharedAuthModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, SharedAuthModule],
})
export class AuthModule {}

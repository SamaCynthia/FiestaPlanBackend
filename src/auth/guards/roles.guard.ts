import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // Si la ruta no exige roles, deja pasar
    }

    const { user } = context.switchToHttp().getRequest();

    // Verifica si el usuario tiene el rol necesario
    const hasRole = requiredRoles.some((role) => user.rol?.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('No tienes los permisos necesarios (RBAC)');
    }

    return true;
  }
}

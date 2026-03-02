import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { defineAbilityFor, AppAbility } from '@mod/auth/infrastructure/factories/casl.factory';
import { ActionsType, SubjectsType } from '@/shared/types/auth.types';

export interface RequiredRule {
    action: ActionsType;
    subject: SubjectsType;
    // conditions?: Record<string, any>; // REMOVE this if not supporting field-level guards here
}

@Injectable()
export class CaslGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();
        const user = req.session?.user;

        if (!user) {
            throw new UnauthorizedException('You must be logged in');
        }

        const ability: AppAbility = defineAbilityFor(user);

        const required: RequiredRule[] = this.reflector.getAllAndOverride<RequiredRule[]>('abilities', [
            context.getHandler(),
            context.getClass(),
        ]) || [];

        if (!required.length) return true;

        for (const rule of required) {
            const { action, subject } = rule;
            // Only pass action/subject, conditions are checked internally by CASL
            if (!ability.can(action, subject)) {
                throw new ForbiddenException(`You lack permission to ${action} ${subject}`);
            }
        }

        return true;
    }
}

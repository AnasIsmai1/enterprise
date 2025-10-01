import { SetMetadata } from '@nestjs/common';
import { ActionsType, SubjectsType } from '../types/auth.types';

export const Abilities = (...abilities: { action: ActionsType; subject: SubjectsType; conditions?: Record<string, any> }[]) =>
    SetMetadata('abilities', abilities);

import { PureAbility, AbilityBuilder, AbilityClass } from '@casl/ability';

import { RolesType, ActionsType, SubjectsType } from '@/shared/types/auth.types';
import { Action, Subject } from '@/modules/user/core/entities/permission.entity';
import { Roles } from '@/modules/user/core/entities/role.entity';

// Type definition for CASL ability
export type AppAbility = PureAbility<[ActionsType, SubjectsType]>;

// Define the subject type for detectSubjectType
type DetectableSubject = any;

export function defineAbilityFor(user: {
    id: string;
    roles: RolesType[];
    organizationId?: string;
    [key: string]: any;
}): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(PureAbility as AbilityClass<AppAbility>);

    // Super admin: can do anything
    if (user.roles.includes(Roles.SUPER_ADMIN)) {
        can(Action.MANAGE, Subject.ALL);
    }

    // Admin: can manage users and organizations in their org
    if (user.roles.includes(Roles.ADMIN)) {
        can(Action.MANAGE, Subject.USER, { organizationId: user.organizationId });
        can(Action.MANAGE, Subject.ORGANIZATION, { id: user.organizationId });
    }

    // Manager: can manage tasks in their org, read users
    if (user.roles.includes(Roles.MANAGER)) {
        can(Action.MANAGE, Subject.TASK, { organizationId: user.organizationId });
        can(Action.READ, Subject.USER, { organizationId: user.organizationId });
        // Example: can only update their own profile
        can(Action.UPDATE, Subject.USER, { id: user.id });
    }

    // Member: can read tasks and update their own profile
    if (user.roles.includes(Roles.MEMBER)) {
        can(Action.READ, Subject.TASK, { organizationId: user.organizationId });
        can(Action.UPDATE, Subject.USER, { id: user.id });
    }

    // Add more granular rules as needed

    return build({
        detectSubjectType: (item: DetectableSubject) =>
            (item && (item.__type ?? item.constructor?.name)) || Subject.ALL,
    });
}

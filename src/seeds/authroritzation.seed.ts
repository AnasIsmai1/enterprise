import { DataSource } from "typeorm";
import { Role, Roles } from "@mod/user/core/entities/role.entity";
import { Permission, Action, Subject } from "@mod/user/core/entities/permission.entity";
import { Logger } from "@nestjs/common";

export async function seedRolesAndPermissions(dataSource: DataSource) {
    const logger = new Logger("SeedRolesAndPermissions");
    const roleRepo = dataSource.getRepository(Role);
    const permRepo = dataSource.getRepository(Permission);

    // 1. Create all permissions
    const actions = Object.values(Action);
    const subjects = Object.values(Subject);

    for (const action of actions) {
        for (const subject of subjects) {

            // Only allow MANAGE:ALL as a permission (skip MANAGE with other subjects)
            if (action === Action.MANAGE && subject !== Subject.ALL) continue;

            const exists = await permRepo.findOne({ where: { action, subject } });
            if (!exists) {
                const perm = permRepo.create({ action, subject });
                await permRepo.save(perm);
                logger.log(`Seeded permission: ${action}:${subject}`);
            }
        }
    }

    // 2. Create all roles
    const roles = Object.values(Roles);
    for (const roleName of roles) {
        let role = await roleRepo.findOne({ where: { name: roleName } });
        if (!role) {
            role = roleRepo.create({ name: roleName, description: `${roleName} role` });
            await roleRepo.save(role);
            logger.log(`Seeded role: ${roleName}`);
        }
    }

    // 3. Attach permissions to roles (example logic, adjust as needed)
    const superAdmin = await roleRepo.findOne({ where: { name: Roles.SUPER_ADMIN }, relations: ['permissions'] });
    const admin = await roleRepo.findOne({ where: { name: Roles.ADMIN }, relations: ['permissions'] });
    const manager = await roleRepo.findOne({ where: { name: Roles.MANAGER }, relations: ['permissions'] });
    const member = await roleRepo.findOne({ where: { name: Roles.MEMBER }, relations: ['permissions'] });

    const manageAll = await permRepo.findOne({ where: { action: Action.MANAGE, subject: Subject.ALL } });

    // Super admin gets manage:all
    if (superAdmin && manageAll && !(superAdmin.permissions || []).some(p => p && ('id' in p) && p.id === manageAll.id)) {
        superAdmin.permissions = [...(superAdmin.permissions || []), manageAll];
        await roleRepo.save(superAdmin);
        logger.log(`Attached manage:all to SUPER_ADMIN`);
    }

    // Admin: manage user, manage organization
    if (admin) {
        const adminPerms = await permRepo.find({
            where: [
                { action: Action.MANAGE, subject: Subject.USER },
                { action: Action.MANAGE, subject: Subject.ORGANIZATION }
            ]
        });
        admin.permissions = Array.from(new Set([...(admin.permissions || []), ...adminPerms]));
        await roleRepo.save(admin);
        logger.log(`Attached manage:user and manage:organization to ADMIN`);
    }

    // Manager: manage task, read user
    if (manager) {
        const managerPerms = await permRepo.find({
            where: [
                { action: Action.MANAGE, subject: Subject.TASK },
                { action: Action.READ, subject: Subject.USER }
            ]
        });
        manager.permissions = Array.from(new Set([...(manager.permissions || []), ...managerPerms]));
        await roleRepo.save(manager);
        logger.log(`Attached manage:task and read:user to MANAGER`);
    }

    // Member: read task
    if (member) {
        const memberPerms = await permRepo.find({
            where: [
                { action: Action.READ, subject: Subject.TASK },
            ]
        });
        member.permissions = Array.from(new Set([...(member.permissions || []), ...memberPerms]));
        await roleRepo.save(member);
        logger.log(`Attached read:task to MEMBER`);
    }

    logger.log("Roles and permissions seeded!");
}

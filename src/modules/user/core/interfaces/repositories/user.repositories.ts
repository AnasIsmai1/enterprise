import { Users } from "../../entities/user.entity";

export interface IUserRepository {
    findByEmail(email: string): Promise<Users | null>;
}

import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaginatedResponse,
  PaginationParams,
} from '../common/interfaces/pagination.interface';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<{ token: string }> {
    const { username, email, password } = createUserDto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      throw new UnauthorizedException('Username or email already exists');
    }

    // Create new user
    const user = this.userRepository.create({
      username,
      email,
      password,
      roles: [UserRole.EDITOR],
    });

    // Hash password
    await user.hashPassword();

    // Save user
    await this.userRepository.save(user);

    // Generate token
    const token = this.generateToken(user);

    return { token };
  }

  async login(loginDto: LoginDto): Promise<{ token: string }> {
    const { username, password } = loginDto;

    // Find user by username or email
    const user = await this.userRepository.findOne({
      where: [{ username }, { email: username }],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if email is verified
    // if (!user.isEmailVerified) {
    //   throw new UnauthorizedException(
    //     'Your email is not verified. Please reach out to us',
    //   );
    // }

    // Generate token
    const token = this.generateToken(user);

    return { token };
  }

  async updateUserRoles(userId: string, roles: UserRole[]): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.roles = roles;
    return this.userRepository.save(user);
  }

  async getProfile(
    userId: string,
  ): Promise<Omit<User, 'password' | 'validatePassword' | 'hashPassword'>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updatePassword(
    userId: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Validate current password
    const isValidPassword = await user.validatePassword(
      updatePasswordDto.currentPassword,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Update password
    user.password = updatePasswordDto.newPassword;
    await user.hashPassword();
    await this.userRepository.save(user);
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<Omit<User, 'password' | 'validatePassword' | 'hashPassword'>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if username or email is already taken by another user
    const existingUser = await this.userRepository.findOne({
      where: [
        { username: updateProfileDto.username },
        { email: updateProfileDto.email },
      ],
    });

    if (existingUser && existingUser.id !== userId) {
      if (existingUser.username === updateProfileDto.username) {
        throw new BadRequestException('Username already exists');
      }
      if (existingUser.email === updateProfileDto.email) {
        throw new BadRequestException('Email already exists');
      }
    }

    // Update username, email, and profileUrl
    user.username = updateProfileDto.username.trim();
    user.email = updateProfileDto.email.trim();
    user.profileUrl = updateProfileDto.profileUrl?.trim();

    const savedUser = await this.userRepository.save(user);
    const { password, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async findAll(
    params?: PaginationParams,
  ): Promise<
    PaginatedResponse<
      Omit<User, 'password' | 'validatePassword' | 'hashPassword'>
    >
  > {
    const {
      page = 1,
      limit = 1000,
      sortBy = 'username',
      sortOrder = 'ASC',
    } = params || {};

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    queryBuilder.orderBy(`user.${sortBy}`, sortOrder);
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    const safeUsers = users.map(
      ({ password, ...userWithoutPassword }) => userWithoutPassword,
    );

    return {
      data: safeUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createUser(
    createUserDto: CreateUserAdminDto,
  ): Promise<Omit<User, 'password' | 'validatePassword' | 'hashPassword'>> {
    const { username, email, password, roles } = createUserDto;

    // Check if user exists
    const whereConditions: any[] = [{ username }];
    if (email) {
      whereConditions.push({ email });
    }
    const existingUser = await this.userRepository.findOne({
      where: whereConditions,
    });

    if (existingUser) {
      throw new BadRequestException('Username or email already exists');
    }

    // Create new user
    const user = this.userRepository.create({
      username,
      email: email || undefined,
      password,
      roles: roles || [UserRole.EDITOR],
    });

    // Hash password
    await user.hashPassword();

    // Save user
    await this.userRepository.save(user);

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserAdminDto,
  ): Promise<Omit<User, 'password' | 'validatePassword' | 'hashPassword'>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if username or email is already taken by another user
    if (
      updateUserDto.username ||
      (updateUserDto.email !== undefined &&
        updateUserDto.email !== null &&
        updateUserDto.email !== '')
    ) {
      const whereConditions: any[] = [];
      if (updateUserDto.username) {
        whereConditions.push({ username: updateUserDto.username });
      }
      if (
        updateUserDto.email !== undefined &&
        updateUserDto.email !== null &&
        updateUserDto.email !== ''
      ) {
        whereConditions.push({ email: updateUserDto.email });
      }

      if (whereConditions.length > 0) {
        const existingUser = await this.userRepository.findOne({
          where: whereConditions,
        });

        if (existingUser && existingUser.id !== userId) {
          if (
            updateUserDto.username &&
            existingUser.username === updateUserDto.username
          ) {
            throw new BadRequestException('Username already exists');
          }
          if (
            updateUserDto.email &&
            existingUser.email === updateUserDto.email
          ) {
            throw new BadRequestException('Email already exists');
          }
        }
      }
    }

    // Update fields
    if (updateUserDto.username !== undefined) {
      user.username = updateUserDto.username.trim();
    }
    if (updateUserDto.email !== undefined) {
      // Convert empty string to null to explicitly clear the email field
      const emailValue: string | null =
        updateUserDto.email === '' ? null : updateUserDto.email;
      (user as any).email = emailValue;
    }
    if (updateUserDto.roles !== undefined) {
      user.roles = updateUserDto.roles;
    }
    if (updateUserDto.profileUrl !== undefined) {
      user.profileUrl = updateUserDto.profileUrl?.trim();
    }

    const savedUser = await this.userRepository.save(user);
    const { password, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    await this.userRepository.remove(user);
  }

  private generateToken(user: User): string {
    const payload = {
      username: user.username,
      sub: user.id,
      roles: user.roles,
    };
    return this.jwtService.sign(payload);
  }
}

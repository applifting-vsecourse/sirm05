import { PrismaService } from '@/core/prisma/prisma.service';
import { User as PrismaUser } from '@/generated/prisma/client';
import { Profile } from '@/modules/profile/domain/profile';
import { Injectable } from '@nestjs/common';

const mapPrismaUserToProfile = (user: PrismaUser): Profile => ({
  username: user.username ?? '',
  name: user.name,
  bio: user.bio,
  defaultMood: user.defaultMood,
});

@Injectable()
export class ProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<Profile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return mapPrismaUserToProfile(user);
  }

  // Case-insensitive, so "Marek" and "marek" can't both exist.
  async isUsernameTaken(
    username: string,
    exceptUserId: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: {
        username: { equals: username, mode: 'insensitive' },
        id: { not: exceptUserId },
      },
      select: { id: true },
    });
    return user !== null;
  }

  async updateProfile(userId: string, profile: Profile): Promise<Profile> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      // BetterAuth's username plugin keeps the as-typed form in displayUsername.
      data: { ...profile, displayUsername: profile.username },
    });
    return mapPrismaUserToProfile(user);
  }
}

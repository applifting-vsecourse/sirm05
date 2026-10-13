import { Profile } from '@/modules/profile/domain/profile';
import { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import { ConflictException, Injectable } from '@nestjs/common';

@Injectable()
export class ProfileService {
  constructor(private readonly profileRepository: ProfileRepository) {}

  async getProfile(userId: string): Promise<Profile> {
    return this.profileRepository.getProfile(userId);
  }

  async updateProfile(userId: string, profile: Profile): Promise<Profile> {
    if (
      await this.profileRepository.isUsernameTaken(profile.username, userId)
    ) {
      throw new ConflictException('That username is already taken');
    }
    return this.profileRepository.updateProfile(userId, {
      ...profile,
      name: profile.name.trim(),
      bio: profile.bio?.trim() || null,
    });
  }
}

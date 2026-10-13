import { Profile } from '@/modules/profile/domain/profile';
import { ProfileRepository } from '@/modules/profile/repositories/profile.repository';
import { ConflictException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { ProfileService } from './profile.service';

const aProfile = (overrides: Partial<Profile> = {}): Profile => ({
  username: 'marek.s',
  name: 'Marek',
  bio: null,
  defaultMood: null,
  ...overrides,
});

describe('ProfileService', () => {
  it('refuses a username someone else has', async () => {
    const repository = mock<ProfileRepository>();
    repository.isUsernameTaken.mockResolvedValue(true);

    await expect(
      new ProfileService(repository).updateProfile('u1', aProfile()),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.isUsernameTaken).toHaveBeenCalledWith('marek.s', 'u1');
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });

  it('saves a trimmed profile, storing a blank bio as none', async () => {
    const repository = mock<ProfileRepository>();
    repository.isUsernameTaken.mockResolvedValue(false);

    await new ProfileService(repository).updateProfile(
      'u1',
      aProfile({ name: '  Marek ', bio: '   ', defaultMood: 'happy' }),
    );

    expect(repository.updateProfile).toHaveBeenCalledWith(
      'u1',
      aProfile({ name: 'Marek', bio: null, defaultMood: 'happy' }),
    );
  });
});

import { QUACK_MOODS, QuackMood } from '@/modules/quack/domain/quack';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const USERNAME_PATTERN = /^[A-Za-z0-9._]{3,30}$/;

export class UpdateProfileDto {
  @ApiProperty({ example: 'marek.s', pattern: USERNAME_PATTERN.source })
  @Matches(USERNAME_PATTERN, {
    message:
      'Username must be 3-30 characters: letters, digits, dots and underscores',
  })
  username!: string;

  @ApiProperty({ example: 'Marek' })
  @IsString()
  @Matches(/\S/, { message: 'Display name is required' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  bio?: string | null;

  @ApiPropertyOptional({ enum: QUACK_MOODS, nullable: true })
  @IsOptional()
  @IsIn(QUACK_MOODS)
  defaultMood?: QuackMood | null;
}

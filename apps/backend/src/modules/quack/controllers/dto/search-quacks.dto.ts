import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchQuacksDto {
  @ApiPropertyOptional({
    description:
      'Words that must all appear in the quack text, author name or username',
    example: 'marek pond',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    description: "Only the signed-in user's quacks",
    example: true,
  })
  @IsOptional()
  // Query strings are text; anything but "true"/"false" is left for IsBoolean to reject.
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  mine?: boolean;
}

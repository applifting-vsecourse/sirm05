import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

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
}

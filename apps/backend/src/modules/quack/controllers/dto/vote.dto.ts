import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VoteDto {
  @ApiProperty({ description: 'Id of one of the poll answers' })
  @IsString()
  @IsNotEmpty()
  optionId!: string;
}

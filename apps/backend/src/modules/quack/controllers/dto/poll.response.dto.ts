import { ApiProperty } from '@nestjs/swagger';

class PollOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ description: 'Number of people who picked this answer' })
  votes!: number;
}

export class PollResponseDto {
  @ApiProperty({ type: [PollOptionDto] })
  options!: PollOptionDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: "The signed-in user's answer, null if they haven't voted",
  })
  myOptionId!: string | null;
}

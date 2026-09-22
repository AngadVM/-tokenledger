import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateTeamDto {
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  name: string;
}
import { MinLength } from "class-validator";
import { Field, InputType } from "type-graphql";
import { PasswordInput } from "../../shared/PasswordInput";

@InputType()
export class ChangePasswordInput extends PasswordInput {
  @Field()
  token: string;

  @Field()
  @MinLength(5)
  password: string;
}

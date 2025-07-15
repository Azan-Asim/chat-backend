import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { jwtconfig } from "../config/jwt.config";
@Module({
    imports: [JwtModule.registerAsync(jwtconfig)],
    controllers: [],
    providers: [JwtStrategy, AuthService],
    exports: [AuthService]
})
export class AuthModule {

}
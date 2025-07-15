import { JwtModuleAsyncOptions } from "@nestjs/jwt";

const jwtSecret = "jwt_secret_key_nest";
export const jwtconfig:JwtModuleAsyncOptions={
    useFactory:()=>{
        return{
            secret:process.env.JWT_SECRET || jwtSecret,
            signOptions:{expiresIn:'60d'},
        }
    }
}
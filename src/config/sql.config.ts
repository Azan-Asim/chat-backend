// src/database/sequelize.config.ts
import { SequelizeModuleOptions } from '@nestjs/sequelize';

export const mysqlConfig: SequelizeModuleOptions = {
  dialect: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: '',
  database: 'chat',
  autoLoadModels: true,
  synchronize: true, 
  logging: false,
  
};
 
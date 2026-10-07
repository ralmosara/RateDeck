import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './modules/iam/users.service';
import { DatabaseService } from './infrastructure/database/database.service';
import { loadEnv } from './config/env';

async function bootstrap() {
  loadEnv();
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const db = app.get(DatabaseService);

  const email = 'admin@ratedeck.com';
  const password = 'Password123!';

  try {
    console.log(`Seeding root user: ${email}`);
    const user = await usersService.createRootUser(email, password);
    if (user) {
      console.log(`Successfully created root user: ${user.email} (id: ${user.publicId})`);
    } else {
      console.error(`Failed to create root user: returned null or undefined`);
    }
  } catch (err: any) {
    if (err.status === 409) {
      console.log(`Root user ${email} already exists.`);
    } else {
      console.error(`Failed to create root user:`, err);
    }
  }

  // AppModule registers BullMQ workers that keep the event loop alive; bound the close and exit explicitly.
  await Promise.race([app.close(), new Promise((r) => setTimeout(r, 5000))]);
}

bootstrap()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

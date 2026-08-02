import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}

bootstrap().catch(() => {
  // Avoid logging startup errors that might include credentials from providers.
  console.error('Application failed to start.');
  process.exitCode = 1;
});

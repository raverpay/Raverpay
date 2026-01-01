import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Export OpenAPI specification to JSON file
 * Run with: ts-node scripts/export-swagger.ts
 */
async function exportSwagger() {
  console.log('🚀 Starting OpenAPI spec export...');

  const app = await NestFactory.create(AppModule, {
    logger: ['error'], // Reduce noise during export
  });

  const config = new DocumentBuilder()
    .setTitle('Raverpay API')
    .setDescription('Raverpay Fintech Platform API Documentation')
    .setVersion('1.0.0')
    .setContact(
      'Raverpay Support',
      'https://app.raverpay.com',
      'support@raverpay.com',
    )
    .setLicense('Proprietary', 'https://app.raverpay.com/terms')
    .addServer('http://localhost:3001', 'Local Development')
    .addServer('https://api-staging.raverpay.com', 'Staging')
    .addServer('https://api.raverpay.com', 'Production')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Export to openapi.json in project root
  const outputPath = path.join(__dirname, '..', 'openapi.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`✅ OpenAPI spec exported to: ${outputPath}`);
  console.log(
    `📊 Total endpoints: ${Object.keys(document.paths || {}).length}`,
  );
  console.log(`🏷️  Total tags: ${(document.tags || []).length}`);
  console.log(
    `📦 Total schemas: ${Object.keys(document.components?.schemas || {}).length}`,
  );

  await app.close();
  console.log('✨ Export complete!');
}

exportSwagger().catch((error) => {
  console.error('❌ Error exporting OpenAPI spec:', error);
  process.exit(1);
});

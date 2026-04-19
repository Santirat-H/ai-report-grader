import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const files = await p.file.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
console.log('Total records in DB:', files.length);
console.log(JSON.stringify(files, null, 2));
await p.$disconnect();

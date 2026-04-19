const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const start = Date.now();
p.file.findMany({ orderBy: { createdAt: 'desc' }, take: 10 })
  .then(r => console.log('Found:', r.length, 'Took:', Date.now() - start, 'ms'))
  .finally(() => p.$disconnect());

const {PrismaClient} = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;

const globalForPrisma = global;

if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg({ connectionString });

    globalForPrisma.prisma = new PrismaClient({ 
        adapter,
        log: ['warn', 'error'],
    });
}  

module.exports = globalForPrisma.prisma;

//used singelton pattern to create a single instance of PrismaClient and export it for use throughout the application. This ensures that there is only one connection to the database, which can help with performance and resource management.
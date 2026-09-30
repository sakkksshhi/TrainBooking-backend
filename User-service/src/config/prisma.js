const {PrismaClient} = require('@prisma/client');
const { config } = require('.');
const globalForPrisma = global;

const prisma = 
    globalForPrisma.prisma ??
    new PrismaClient({});

if (config.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = prisma;

//used singelton pattern to create a single instance of PrismaClient and export it for use throughout the application. This ensures that there is only one connection to the database, which can help with performance and resource management.
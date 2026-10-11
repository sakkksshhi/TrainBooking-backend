const bcrypt = require('bcrypt');
const { config } = require("../config");
const { redis } = require("../config/redis");
const prisma = require('../config/prisma');
const { BadRequestError, NotFoundError } = require('../utils/error');

const getProfile = async (userId) => {
     const cached = await redis.get(`user:${userId}`);
     if (cached) {
          return JSON.parse(cached);
     }

     const userProfile = await prisma.user.findUnique({ where: { id: userId } });
     if (!userProfile) {
          return null;
     }

     const { password: _password, ...safeUser } = userProfile;
     await redis.set(`user:${userId}`, JSON.stringify(safeUser), 'EX', config.REDIS_USER_TIL);
     return safeUser;
};

const updateProfile = async (userId, { firstname, lastname }) => {
     const data = {};
     if (firstname !== undefined) data.firstname = firstname;
     if (lastname !== undefined) data.lastname = lastname;

     let updated;
     try {
          updated = await prisma.user.update({ where: { id: userId }, data });
     } catch (err) {
          if (err.code === 'P2025') {
               throw new NotFoundError('User not found');
          }
          throw err;
     }

     // Drop the stale cache entry. The next read rebuilds it from the database.
     await redis.del(`user:${userId}`);

     const { password: _password, ...safeUser } = updated;
     return safeUser;
};

const deleteSessions = async (userId) => {
     const keys = [];
     const stream = redis.scanStream({ match: `refresh:${userId}:*`, count: 100 });
     for await (const batch of stream) {
          keys.push(...batch);
     }
     if (keys.length > 0) {
          await redis.del(...keys);
     }
};

const deleteProfile = async (userId, password) => {
     const user = await prisma.user.findUnique({ where: { id: userId } });
     if (!user) {
          throw new NotFoundError('User not found');
     }

     // Accounts with a password must confirm it. Google-only accounts have none.
     if (user.password) {
          if (!password) {
               throw new BadRequestError('Password is required to delete your account');
          }
          const matches = await bcrypt.compare(password, user.password);
          if (!matches) {
               throw new BadRequestError('Incorrect password');
          }
     }

     // AuthProvider rows are removed too, through onDelete: Cascade in your schema
     await prisma.user.delete({ where: { id: userId } });

     await redis.del(`user:${userId}`);
     await deleteSessions(userId);
};

module.exports = { getProfile, updateProfile, deleteProfile };
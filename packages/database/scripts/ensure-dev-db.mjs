import mysql from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL ?? 'mysql://root@127.0.0.1:4000/pathfinding';
const url = new URL(databaseUrl);
const databaseName = url.pathname.replace(/^\//, '');

if (!databaseName) {
  throw new Error('DATABASE_URL must include a database name');
}

const rootUrl = new URL(url);
rootUrl.pathname = '/';
const escapedDatabaseName = databaseName.replaceAll('`', '``');

for (let attempt = 1; attempt <= 30; attempt += 1) {
  try {
    const connection = await mysql.createConnection(rootUrl.toString());
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${escapedDatabaseName}\``);
    await connection.end();
    console.warn(`[dev-db] Database ${databaseName} is ready`);
    process.exit(0);
  }
  catch (error) {
    if (attempt === 30) {
      throw error;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

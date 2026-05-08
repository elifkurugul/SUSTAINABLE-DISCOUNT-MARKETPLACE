import mysql from 'mysql2/promise';
const db = mysql.createPool({
    host: 'localhost',
    user: 'std',
    password: 'std',
    database: 'sustainable_marketplace',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
export default db;
const bcrypt = require('bcryptjs');

const password = 'OrlandoOwner2026!';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('--- PASSWORD BCRYPT HASH ---');
console.log('Password:', password);
console.log('Hash:', hash);
console.log('----------------------------');

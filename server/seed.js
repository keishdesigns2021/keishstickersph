require('dotenv').config();
const bcrypt = require('bcryptjs');
const { client, ready } = require('./db');

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const existing = await client.execute({
    sql: 'SELECT id FROM admin_users WHERE username = ?',
    args: [username],
  });
  if (existing.rows.length) {
    console.log(`Admin user "${username}" already exists, skipping.`);
    return;
  }
  const hash = bcrypt.hashSync(password, 10);
  await client.execute({
    sql: 'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
    args: [username, hash],
  });
  console.log(`Created admin user "${username}".`);
}

async function seedProducts() {
  const count = await client.execute('SELECT COUNT(*) AS c FROM products');
  if (Number(count.rows[0].c) > 0) {
    console.log('Products already exist, skipping product seed.');
    return;
  }
  const sample = [
    {
      name: 'Custom Die-Cut Stickers',
      category: 'Stickers',
      price: 150,
      description: 'Waterproof, custom-shaped vinyl stickers printed in any size. Perfect for laptops, tumblers, and packaging.',
      featured: 1,
    },
    {
      name: 'Kiss-Cut Sticker Sheets',
      category: 'Stickers',
      price: 199,
      description: 'Multiple designs on one easy-peel sheet. Great for small business branding and giveaways.',
      featured: 1,
    },
    {
      name: 'Custom Printed T-Shirt',
      category: 'Apparel',
      price: 350,
      description: 'Direct-to-film printing on soft cotton tees. Your design, your colors, your fit.',
      featured: 1,
    },
    {
      name: 'Embroidered Tote Bag',
      category: 'Apparel',
      price: 280,
      description: 'Durable canvas tote with embroidered logo. A reusable way to carry your brand around.',
      featured: 0,
    },
  ];
  for (const p of sample) {
    await client.execute({
      sql: `INSERT INTO products (name, category, price, description, image_data, featured)
            VALUES (?, ?, ?, ?, '', ?)`,
      args: [p.name, p.category, p.price, p.description, p.featured],
    });
  }
  console.log(`Seeded ${sample.length} sample products.`);
}

module.exports = { seedAdmin, seedProducts };

if (require.main === module) {
  (async () => {
    await ready;
    await seedAdmin();
    await seedProducts();
    console.log('Seed complete.');
    process.exit(0);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

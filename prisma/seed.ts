import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@inventory.com' },
    update: {},
    create: {
      email: 'admin@inventory.com',
      passwordHash,
      name: 'Admin User',
      role: 'admin',
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@inventory.com' },
    update: {},
    create: {
      email: 'staff@inventory.com',
      passwordHash: await bcrypt.hash('staff123', 10),
      name: 'Staff User',
      role: 'staff',
    },
  });

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Electronics' },
      update: {},
      create: { name: 'Electronics', description: 'Electronic devices and accessories' },
    }),
    prisma.category.upsert({
      where: { name: 'Office Supplies' },
      update: {},
      create: { name: 'Office Supplies', description: 'Office and stationery items' },
    }),
    prisma.category.upsert({
      where: { name: 'Furniture' },
      update: {},
      create: { name: 'Furniture', description: 'Office and warehouse furniture' },
    }),
  ]);

  const products = [
    { sku: 'ELEC-001', name: 'Wireless Mouse', categoryId: categories[0].id, costPrice: 15, sellPrice: 29.99, currentStock: 50, reorderLevel: 10 },
    { sku: 'ELEC-002', name: 'USB-C Hub', categoryId: categories[0].id, costPrice: 25, sellPrice: 49.99, currentStock: 30, reorderLevel: 5 },
    { sku: 'ELEC-003', name: 'HDMI Cable 2m', categoryId: categories[0].id, costPrice: 5, sellPrice: 12.99, currentStock: 100, reorderLevel: 20 },
    { sku: 'OFF-001', name: 'A4 Paper Ream', categoryId: categories[1].id, costPrice: 4, sellPrice: 8.99, currentStock: 200, reorderLevel: 50 },
    { sku: 'OFF-002', name: 'Ballpoint Pen Pack', categoryId: categories[1].id, costPrice: 2, sellPrice: 5.99, currentStock: 8, reorderLevel: 20 },
    { sku: 'FURN-001', name: 'Office Chair', categoryId: categories[2].id, costPrice: 120, sellPrice: 249.99, currentStock: 15, reorderLevel: 3 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
  }

  const supplier = await prisma.supplier.upsert({
    where: { id: 'seed-supplier-1' },
    update: {},
    create: {
      id: 'seed-supplier-1',
      name: 'TechSupply Co.',
      email: 'orders@techsupply.com',
      phone: '+1-555-0100',
      address: '123 Industrial Blvd, Warehouse District',
    },
  });

  const customer = await prisma.customer.upsert({
    where: { id: 'seed-customer-1' },
    update: {},
    create: {
      id: 'seed-customer-1',
      name: 'Acme Retail Store',
      email: 'purchasing@acme.com',
      phone: '+1-555-0200',
      address: '456 Main Street, Downtown',
    },
  });

  console.log('Seed completed:');
  console.log(`  Admin: ${admin.email} / admin123`);
  console.log(`  Staff: ${staff.email} / staff123`);
  console.log(`  Categories: ${categories.length}`);
  console.log(`  Products: ${products.length}`);
  console.log(`  Supplier: ${supplier.name}`);
  console.log(`  Customer: ${customer.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

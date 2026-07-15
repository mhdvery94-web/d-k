const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@dapurkemas.com',
      passwordHash: hashedPassword,
      name: 'Administrator',
      role: 'admin',
    },
  });
  console.log('✅ Admin user created:', admin.username);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Makanan' },
      update: {},
      create: {
        name: 'Makanan',
        icon: '🍛',
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { name: 'Minuman' },
      update: {},
      create: {
        name: 'Minuman',
        icon: '🥤',
        isActive: true,
      },
    }),
    prisma.category.upsert({
      where: { name: 'Snack' },
      update: {},
      create: {
        name: 'Snack',
        icon: '🍿',
        isActive: true,
      },
    }),
  ]);
  console.log('✅ Categories created:', categories.map(c => c.name).join(', '));

  // Get category IDs
  const makanan = categories.find(c => c.name === 'Makanan');
  const minuman = categories.find(c => c.name === 'Minuman');
  const snack = categories.find(c => c.name === 'Snack');

  // Create sample menus
  const menus = await Promise.all([
    // Makanan
    prisma.menu.upsert({
      where: { id: 1 },
      update: {},
      create: {
        categoryId: makanan.id,
        name: 'Nasi Goreng Spesial',
        description: 'Nasi goreng dengan telur, ayam, dan sayuran segar',
        price: 25000,
        discountPercent: 0,
        stock: 50,
        imageUrl: null,
        isActive: true,
      },
    }),
    prisma.menu.upsert({
      where: { id: 2 },
      update: {},
      create: {
        categoryId: makanan.id,
        name: 'Mie Ayam Bakso',
        description: 'Mie ayam dengan bakso sapi dan pangsit',
        price: 20000,
        discountPercent: 10,
        stock: 30,
        imageUrl: null,
        isActive: true,
      },
    }),
    prisma.menu.upsert({
      where: { id: 3 },
      update: {},
      create: {
        categoryId: makanan.id,
        name: 'Ayam Geprek',
        description: 'Ayam geprek dengan sambal bawang dan nasi',
        price: 22000,
        discountPercent: 0,
        stock: 40,
        imageUrl: null,
        isActive: true,
      },
    }),
    // Minuman
    prisma.menu.upsert({
      where: { id: 4 },
      update: {},
      create: {
        categoryId: minuman.id,
        name: 'Es Teh Manis',
        description: 'Teh manis segar dengan es batu',
        price: 8000,
        discountPercent: 0,
        stock: 100,
        imageUrl: null,
        isActive: true,
      },
    }),
    prisma.menu.upsert({
      where: { id: 5 },
      update: {},
      create: {
        categoryId: minuman.id,
        name: 'Jus Alpukat',
        description: 'Jus alpukat segar dengan susu dan coklat',
        price: 15000,
        discountPercent: 15,
        stock: 25,
        imageUrl: null,
        isActive: true,
      },
    }),
    prisma.menu.upsert({
      where: { id: 6 },
      update: {},
      create: {
        categoryId: minuman.id,
        name: 'Kopi Susu',
        description: 'Kopi susu dengan gula aren',
        price: 18000,
        discountPercent: 0,
        stock: 50,
        imageUrl: null,
        isActive: true,
      },
    }),
    // Snack
    prisma.menu.upsert({
      where: { id: 7 },
      update: {},
      create: {
        categoryId: snack.id,
        name: 'Kentang Goreng',
        description: 'Kentang goreng crispy dengan saus sambal',
        price: 12000,
        discountPercent: 0,
        stock: 60,
        imageUrl: null,
        isActive: true,
      },
    }),
    prisma.menu.upsert({
      where: { id: 8 },
      update: {},
      create: {
        categoryId: snack.id,
        name: 'Dimsum Ayam',
        description: 'Dimsum ayam dengan saus kecap (4 pcs)',
        price: 15000,
        discountPercent: 20,
        stock: 35,
        imageUrl: null,
        isActive: true,
      },
    }),
    prisma.menu.upsert({
      where: { id: 9 },
      update: {},
      create: {
        categoryId: snack.id,
        name: 'Pisang Goreng Keju',
        description: 'Pisang goreng dengan topping keju dan coklat',
        price: 13000,
        discountPercent: 0,
        stock: 45,
        imageUrl: null,
        isActive: true,
      },
    }),
  ]);
  console.log('✅ Sample menus created:', menus.length, 'items');

  // Create default shipping zones
  const shippingZones = await Promise.all([
    prisma.shippingZone.upsert({
      where: { kodeZona: 'Z1' },
      update: {},
      create: { kodeZona: 'Z1', jarakMin: 0, jarakMax: 3, tarif: 0, isActive: true },
    }),
    prisma.shippingZone.upsert({
      where: { kodeZona: 'Z2' },
      update: {},
      create: { kodeZona: 'Z2', jarakMin: 3.01, jarakMax: 6, tarif: 0, isActive: true },
    }),
    prisma.shippingZone.upsert({
      where: { kodeZona: 'Z3' },
      update: {},
      create: { kodeZona: 'Z3', jarakMin: 6.01, jarakMax: 10, tarif: 0, isActive: true },
    }),
    prisma.shippingZone.upsert({
      where: { kodeZona: 'Z4' },
      update: {},
      create: { kodeZona: 'Z4', jarakMin: 10.01, jarakMax: null, tarif: 0, isActive: true },
    }),
  ]);
  console.log('✅ Shipping zones created:', shippingZones.length, 'zones');

  // Create default app settings
  const defaultSettings = [
    { key: 'packing_fee', value: '0' },
    { key: 'wa_admin', value: '0812-XXXX-XXXX' },
    { key: 'store_address', value: 'Jl. Jambu No 70D, Kedaung, Sawangan, Kota Depok' },
  ];
  for (const s of defaultSettings) {
    await prisma.appSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('✅ App settings created:', defaultSettings.length, 'keys');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log('   - Admin user: admin / admin123');
  console.log('   - Admin email: admin@dapurkemas.com');
  console.log('   - Categories: 3 (Makanan, Minuman, Snack)');
  console.log('   - Menus: 9 items');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

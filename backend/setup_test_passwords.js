const prisma = require('./src/config/database');
const { hashPassword } = require('./src/utils/password');

async function setup() {
  const hash = await hashPassword('TestPass@123');
  
  const admin = await prisma.user.update({
    where: { email: 'niks123@gmail.com' },
    data: { password: hash },
    select: { email: true, role: true }
  });
  console.log('Admin updated:', admin.email);
  
  const faculty = await prisma.user.update({
    where: { email: 'shlokpan93@gmail.com' },
    data: { password: hash },
    select: { email: true, role: true }
  });
  console.log('Faculty updated:', faculty.email);

  const student = await prisma.user.update({
    where: { email: 'student.1794933991975@example.com' },
    data: { password: hash },
    select: { email: true, role: true }
  });
  console.log('Student updated:', student.email);
  
  await prisma.$disconnect();
}
setup().catch(console.error);

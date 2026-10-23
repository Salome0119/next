const fs = require('fs');
const content = fs.readFileSync('app/(dashboard)/generador/page.tsx', 'utf8');
const fixed = content.replace(
  'Escribe algo arriba y presiona "Generar con IA" para ver la magia',
  'Escribe algo arriba y presiona "Generar con IA" para ver la magia'
);
fs.writeFileSync('app/(dashboard)/generador/page.tsx', fixed);
console.log('Fixed');
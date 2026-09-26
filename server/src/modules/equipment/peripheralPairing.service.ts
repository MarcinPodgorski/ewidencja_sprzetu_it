import { prisma } from '../../db/prisma';
import { AppError } from '../../middleware/errorHandler';

/**
 * Parowanie mysz<->klawiatura: jedna tabela złączeniowa (PeripheralPair) jako jedyne
 * źródło prawdy, zamiast wzajemnych FK po obu stronach. `czyZestaw` na obu encjach
 * jest tylko wygodną, zdenormalizowaną flagą do wyświetlania — trzymaną w synchronizacji tutaj.
 */
export async function pairMouseAndKeyboard(mouseId: number, keyboardId: number) {
  const [mouse, keyboard] = await Promise.all([
    prisma.mouse.findUnique({ where: { id: mouseId }, include: { pair: true } }),
    prisma.keyboard.findUnique({ where: { id: keyboardId }, include: { pair: true } }),
  ]);
  if (!mouse) throw new AppError(404, 'Nie znaleziono myszy');
  if (!keyboard) throw new AppError(404, 'Nie znaleziono klawiatury');
  if (mouse.pair) throw new AppError(409, 'Ta mysz jest już częścią innego zestawu');
  if (keyboard.pair) throw new AppError(409, 'Ta klawiatura jest już częścią innego zestawu');

  await prisma.$transaction([
    prisma.peripheralPair.create({ data: { mouseId, keyboardId } }),
    prisma.mouse.update({ where: { id: mouseId }, data: { czyZestaw: true } }),
    prisma.keyboard.update({ where: { id: keyboardId }, data: { czyZestaw: true } }),
  ]);
}

export async function unpairMouse(mouseId: number) {
  const pair = await prisma.peripheralPair.findUnique({ where: { mouseId } });
  if (!pair) throw new AppError(409, 'Ta mysz nie jest sparowana z żadną klawiaturą');
  await unpair(pair.id, mouseId, pair.keyboardId);
}

export async function unpairKeyboard(keyboardId: number) {
  const pair = await prisma.peripheralPair.findUnique({ where: { keyboardId } });
  if (!pair) throw new AppError(409, 'Ta klawiatura nie jest sparowana z żadną myszą');
  await unpair(pair.id, pair.mouseId, keyboardId);
}

async function unpair(pairId: number, mouseId: number, keyboardId: number) {
  await prisma.$transaction([
    prisma.peripheralPair.delete({ where: { id: pairId } }),
    prisma.mouse.update({ where: { id: mouseId }, data: { czyZestaw: false } }),
    prisma.keyboard.update({ where: { id: keyboardId }, data: { czyZestaw: false } }),
  ]);
}
